/* ============================================================================
   CoupleMed — cm-sync.js  (v52)
   Sincronização de estado entre aparelhos (Mac / iPad / iPhone).

   O PROBLEMA
     Até a v51 todo o progresso vivia em localStorage. localStorage é preso a um
     navegador em um aparelho. Três aparelhos = três cópias que nunca se falam.

   A SOLUÇÃO
     Esta camada NÃO reescreve nenhum módulo. Ela se coloca por baixo deles:
       1. Antes de qualquer script do app rodar, PUXA o estado do servidor
          e o escreve no localStorage local.
       2. Intercepta localStorage.setItem/removeItem e EMPURRA toda alteração
          de volta ao servidor (com debounce).
       3. Só então carrega site.js, qbank.js, flashcards.js, notebook.js...
          Eles continuam lendo localStorage e não sabem que nada mudou.

     Resultado: o localStorage vira um CACHE do servidor, não a fonte da verdade.
     O motor SM-2, o SEED do QBank e o modelo de passadas ficam intocados.

   CONFLITOS
     Resolução last-write-wins por chave, arbitrada pelo updated_at (ms).
     Cada chave é um blob JSON inteiro (ex.: todo o QBank em `qb`). Logo, se o
     MESMO usuário responder questões em DOIS aparelhos ao mesmo tempo, o último
     a gravar sobrescreve o outro. Para um casal estudando em um aparelho por vez
     isso é seguro. Estudo simultâneo na mesma conta não é suportado.
============================================================================ */
(function () {
  'use strict';

  var API      = '/api/state';
  var PREFIX   = 'couplemed_';
  var CLEAN_FLAG = 'couplemed_sync_clean_v52';   // marca do reset "começar limpo"
  var PUSH_DEBOUNCE_MS = 1200;
  var PULL_TIMEOUT_MS  = 6000;

  /* Chaves que SINCRONIZAM (nome já sem o prefixo e sem o _uid do final). */
  var SYNCED = ['qb','qb_unlock','fc','streak','time','prefs','last_access','access_count',
                'nb','notes','notebook','tutor_chat','lib3hl'];

  /* Chaves globais, iguais para todos os usuários. */
  var SHARED = ['couplemed_fc_shared', 'couplemed_share_feed'];

  /* Deliberadamente NÃO sincronizadas — são de aparelho, não de usuário:
       couplemed_lang_current_*     idioma da sessão atual
       couplemed_i18n_content_cache_* cache de tradução
       couplemed_transition_deck_*  frase da tela de transição
       couplemed_backup_*           backups locais
       couplemed_nb_reset_v*        flags de migração
       couplemed_qbank_*_total      valores derivados
       couplemed_user_custom_*      credenciais (ver nota no handoff)
       couplemed_user_blocked_*     bloqueio (idem)                          */

  /* ---------- identidade do usuário ----------------------------------------
     v52: vinha do ?u= da URL — ou seja, do próprio cliente.
     v53: vem de GET /api/me, que lê o cookie de sessão assinado. O ?u= ainda
     existe para os links internos, mas não decide mais nada. Se ele divergir da
     sessão, a sessão vence.                                                  */
  var USER = new URLSearchParams(location.search).get('u')
          || sessionStorage.getItem('couplemed_active_user') || 'guest1';

  function gotoLogin() { location.replace('index.html'); }

  function fetchMe() {
    return withTimeout(fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }), PULL_TIMEOUT_MS)
      .then(function (r) {
        if (r.status === 401) { gotoLogin(); throw new Error('unauthenticated'); }
        if (r.status === 503) throw new Error('server-not-configured');
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (me) {
        USER = me.uid;                                    // fonte de verdade
        sessionStorage.setItem('couplemed_active_user', me.uid);
        var c = {}; try { c = JSON.parse(rawGet('couplemed_users_cache')) || {}; } catch (e) {}
        c[me.uid] = { displayName: me.displayName, login: me.login, role: me.role, blocked: false };
        rawSet('couplemed_users_cache', JSON.stringify(c));
        if (me.role !== 'admin') return me;
        // admin precisa da lista completa para o painel de usuários
        return fetch('/api/users', { credentials: 'same-origin', cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) {
            if (d && d.users) {
              var all = {};
              d.users.forEach(function (u) {
                all[u.uid] = { displayName: u.display_name, login: u.login, role: u.role, blocked: !!u.blocked };
              });
              rawSet('couplemed_users_cache', JSON.stringify(all));
            }
            return me;
          })
          .catch(function () { return me; });
      });
  }

  /* ---------- referências originais, antes de qualquer patch ----------------
     Atenção: NÃO dá para fazer `localStorage.setItem = fn`. O objeto Storage
     tem um setter de propriedades nomeadas — atribuir ali só grava um ITEM
     chamado "setItem" e o método original continua intacto. O patch tem que ser
     em Storage.prototype, com guarda para não afetar o sessionStorage.        */
  var LS    = window.localStorage;
  var PROTO = Object.getPrototypeOf(LS);          // Storage.prototype

  var protoSet = PROTO.setItem;
  var protoGet = PROTO.getItem;
  var protoDel = PROTO.removeItem;

  var rawSet = function (k, v) { return protoSet.call(LS, k, v); };
  var rawGet = function (k)    { return protoGet.call(LS, k); };
  var rawDel = function (k)    { return protoDel.call(LS, k); };

  /* ---------- mapeamento chave local <-> chave do servidor ---------- */
  // 'couplemed_qb_john'        -> { bucket:'john',    k:'qb' }
  // 'couplemed_qb_unlock_john' -> { bucket:'john',    k:'qb_unlock' }
  // 'couplemed_fc_shared'      -> { bucket:'_shared', k:'fc_shared' }
  function toServer(localKey) {
    if (SHARED.indexOf(localKey) !== -1) {
      return { bucket: '_shared', k: localKey.slice(PREFIX.length) };
    }
    if (localKey.indexOf(PREFIX) !== 0) return null;
    var suffix = '_' + USER;
    if (localKey.slice(-suffix.length) !== suffix) return null;
    var k = localKey.slice(PREFIX.length, localKey.length - suffix.length);
    return SYNCED.indexOf(k) !== -1 ? { bucket: USER, k: k } : null;
  }

  function toLocal(bucket, k) {
    return bucket === '_shared' ? PREFIX + k : PREFIX + k + '_' + USER;
  }

  function isSynced(localKey) { return toServer(localKey) !== null; }

  /* ---------- fila de escritas pendentes (sobrevive a offline/reload) -------- */
  var QUEUE_KEY = 'couplemed_sync_queue_' + USER;

  function readQueue() {
    try { return JSON.parse(rawGet(QUEUE_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeQueue(q) { rawSet(QUEUE_KEY, JSON.stringify(q)); }

  /* ---------- TRAVA DE SEGURANÇA ----------------------------------------
     `pullOk` só vira true depois que o servidor respondeu e o estado dele foi
     aplicado no localStorage. Antes disso, NADA é enfileirado para subir.

     Por quê: sem rede, qbank.js inicializa um banco VAZIO e chama save().
     Se isso virasse uma escrita pendente, ao voltar a rede o blob vazio subiria
     com carimbo novo e apagaria o progresso real no servidor. Perder o que foi
     feito offline é ruim; apagar o que já estava salvo é inaceitável.

     Consequência assumida: em modo local o aparelho lê e escreve normalmente,
     mas o que for feito ali não sobe. Ao recarregar com rede, ele adota o
     estado do servidor.                                                   */
  var pullOk = false;

  function enqueue(localKey, value, deleted) {
    if (!pullOk) return;
    var m = toServer(localKey);
    if (!m) return;
    var q = readQueue();
    q[m.bucket + '\u0000' + m.k] = {
      bucket: m.bucket, k: m.k,
      v: deleted ? null : value,
      deleted: deleted ? 1 : 0,
      updated_at: Date.now()
    };
    writeQueue(q);
    schedulePush();
  }

  /* ---------- indicador visual discreto ---------- */
  var pill;
  function ensurePill() {
    if (pill) return pill;
    pill = document.createElement('div');
    pill.style.cssText =
      'position:fixed;left:14px;bottom:14px;z-index:9999;font:600 12px/1.2 system-ui,sans-serif;' +
      'padding:8px 12px;border-radius:999px;background:#12203a;color:#cfe0ff;' +
      'border:1px solid #2a4472;box-shadow:0 4px 14px rgba(0,0,0,.35);' +
      'opacity:0;transition:opacity .25s ease;pointer-events:none;max-width:70vw';
    (document.body || document.documentElement).appendChild(pill);
    return pill;
  }
  function say(msg, opts) {
    opts = opts || {};
    var el = ensurePill();
    el.textContent = msg;
    el.style.opacity = '1';
    el.style.pointerEvents = opts.click ? 'auto' : 'none';
    el.style.cursor = opts.click ? 'pointer' : 'default';
    el.onclick = opts.click || null;
    if (opts.fade !== false && !opts.click) {
      clearTimeout(el._t);
      el._t = setTimeout(function () { el.style.opacity = '0'; }, opts.ms || 1600);
    }
  }

  /* ---------- rede ---------- */
  function withTimeout(promise, ms) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(new Error('timeout')); }, ms);
      promise.then(function (v) { clearTimeout(t); res(v); },
                   function (e) { clearTimeout(t); rej(e); });
    });
  }

  function pull() {
    // O ?user= sumiu: o servidor descobre quem somos pelo cookie.
    return withTimeout(fetch(API + '?shared=1',
        { credentials: 'same-origin', cache: 'no-store' }), PULL_TIMEOUT_MS)
      .then(function (r) {
        if (r.status === 401) { gotoLogin(); throw new Error('unauthenticated'); }
        if (r.status === 503) throw new Error('d1-off');
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      });
  }

  function push() {
    var q = readQueue();
    var items = Object.keys(q).map(function (kk) { return q[kk]; });
    if (!items.length) return Promise.resolve({ ok: true, empty: true });

    return withTimeout(fetch(API, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: items })
    }), PULL_TIMEOUT_MS).then(function (r) {
      if (r.status === 401) { gotoLogin(); throw new Error('unauthenticated'); }
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then(function (res) {
      // Só limpa da fila o que o servidor confirmou com o MESMO updated_at.
      var cur = readQueue();
      items.forEach(function (it) {
        var kk = it.bucket + '\u0000' + it.k;
        if (cur[kk] && cur[kk].updated_at === it.updated_at) delete cur[kk];
      });
      writeQueue(cur);
      return res;
    });
  }

  var pushTimer = null;
  function schedulePush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      push().then(function (r) { if (!r.empty) say('Sincronizado'); })
            .catch(function () { say('Offline — salvo neste aparelho', { ms: 2400 }); });
    }, PUSH_DEBOUNCE_MS);
  }

  /* ---------- aplicar estado do servidor no localStorage ---------- */
  function applyServerState(rows) {
    var changed = [];
    rows.forEach(function (row) {
      var lk = toLocal(row.bucket, row.k);
      var before = rawGet(lk);
      if (row.deleted) {
        if (before !== null) { rawDel(lk); changed.push(lk); }
      } else if (before !== row.v) {
        rawSet(lk, row.v);
        changed.push(lk);
      }
    });
    return changed;
  }

  /* ---------- "começar limpo": zera o aparelho na primeira vez ---------- */
  function cleanOnce() {
    if (rawGet(CLEAN_FLAG)) return;
    var doomed = [];
    for (var i = 0; i < LS.length; i++) {
      var k = LS.key(i);
      if (k && isSynced(k)) doomed.push(k);
    }
    doomed.forEach(rawDel);
    rawDel(QUEUE_KEY);
    rawSet(CLEAN_FLAG, new Date().toISOString());
  }

  /* ---------- patch do localStorage (via Storage.prototype) ---------- */
  function installPatch() {
    PROTO.setItem = function (k, v) {
      protoSet.call(this, k, v);
      if (this === LS && isSynced(k)) enqueue(k, String(v), false);
    };
    PROTO.removeItem = function (k) {
      protoDel.call(this, k);
      if (this === LS && isSynced(k)) enqueue(k, null, true);
    };
  }

  /* ---------- re-checar ao voltar o foco ---------- */
  function watchFocus() {
    var busy = false;
    function check() {
      if (busy || document.hidden) return;
      busy = true;
      push().catch(function () {})
        .then(pull)
        .then(function (data) {
          var changed = applyServerState(data.state || []);
          // Recuperação: se o boot caiu em modo local e a rede voltou, um pull
          // bem-sucedido rearma a sincronização — mas só depois de o estado do
          // servidor ter sido adotado, nunca antes.
          if (!pullOk) { pullOk = true; say('Sincronização restabelecida'); }
          // Nunca recarrega sozinho: o usuário pode estar no meio de uma questão.
          if (changed.length) {
            say('Atualizado em outro aparelho — toque para recarregar', {
              fade: false,
              click: function () { location.reload(); }
            });
          }
        })
        .catch(function () {})
        .then(function () { busy = false; });
    }
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
  }

  /* ---------- carregar os scripts do app, em ordem, DEPOIS do pull ---------- */
  function loadAppScripts() {
    var scripts = (window.CM_APP_SCRIPTS || []);
    return scripts.reduce(function (chain, src) {
      return chain.then(function () {
        return new Promise(function (res, rej) {
          var s = document.createElement('script');
          s.src = src;
          s.async = false;
          s.onload = res;
          s.onerror = function () { rej(new Error('falhou: ' + src)); };
          document.body.appendChild(s);
        });
      });
    }, Promise.resolve());
  }

  /* ============================ BOOT ============================ */
  var booted = false;
  function boot(mode) {
    if (booted) return;
    booted = true;
    installPatch();
    watchFocus();
    window.CM_SYNC = { user: USER, mode: mode, push: push, pull: pull, isSynced: isSynced };
    loadAppScripts().catch(function (e) { console.error('[cm-sync]', e); });
  }

  // 1) quem sou eu (cookie)  2) limpeza única  3) pendências  4) pull  5) app
  fetchMe()
    .then(function () { cleanOnce(); })
    .then(push)
    .catch(function (e) {
      if (e && e.message === 'unauthenticated') throw e;   // já redirecionou
      /* offline / servidor fora: segue com o cache local */
    })
    .then(pull)
    .then(function (data) {
      applyServerState(data.state || []);
      pullOk = true;            // a partir daqui é seguro empurrar
      boot('sync');
    })
    .catch(function (err) {
      if (err && err.message === 'unauthenticated') return;   // indo para o login
      // Servidor fora, D1 não ligado, ou sem rede: o site funciona igual à v51,
      // só que sem sincronizar. Nada quebra, nada se perde.
      console.warn('[cm-sync] modo local —', err && err.message);
      cleanOnce();
      boot('local');
      say('Modo local — sem sincronização', { ms: 3000 });
    });
})();
