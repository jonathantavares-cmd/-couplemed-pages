/**
 * CoupleMed — Cloudflare Worker (AI Tutor backend + Static Assets)
 * Rota POST /tutor → chama OpenAI
 * Todo o restante → serve arquivos de ./public/
 */

const SYSTEM_PROMPTS = {
  socratico: `Você é um tutor socrático de USMLE Step 1, especialista em imunologia, cardiologia, hematologia e clínica médica.
NUNCA revele a resposta completa de imediato. Guie o aluno com perguntas intermediárias e pistas graduais até ele construir o raciocínio.
Só explique o mecanismo completo depois que o aluno tentar responder pelo menos uma vez.
Responda no idioma indicado pelo aluno (padrão: português), mantendo termos técnicos em inglês entre parênteses quando relevante para o vocabulário do exame.`,

  nbme: `Você é um redator de itens do comitê NBME criando questões estilo USMLE Step 1.
Ao gerar uma questão:
1. Escreva um caso clínico em parágrafo único (idade, sexo, queixa, história, exame físico, sinais vitais, exames).
2. Formule a pergunta pedindo o "melhor próximo passo" ou "diagnóstico mais provável".
3. Ofereça 5 alternativas plausíveis (A-E), com pelo menos 1 distratora de alto nível.
4. NÃO revele a resposta imediatamente. Espere a resposta do aluno.
5. Depois da resposta, explique o mecanismo fisiopatológico da correta E por que cada alternativa errada falha.
Priorize conteúdo de alto rendimento: imunologia, cardiologia, hematologia, farmacologia, patologia.
Responda no idioma indicado pelo aluno (padrão: português), termos técnicos em inglês entre parênteses.`,

  caso: `Você conduz uma discussão de caso clínico no estilo PBL (Problem-Based Learning).
Apresente o caso de forma progressiva, faça perguntas sobre hipóteses diagnósticas,
peça justificativa fisiopatológica antes de confirmar ou refutar hipóteses.
Responda no idioma indicado pelo aluno (padrão: português), com profundidade adequada a estudante de medicina do 6º semestre.`,

  erro: `Você ajuda o aluno a entender por que errou uma questão de USMLE.
Peça para o aluno colar a questão e a alternativa que ele escolheu.
Identifique se o erro foi: falha de conceito, erro de leitura da vinheta, confusão entre mecanismos parecidos, ou armadilha de alternativa.
Explique a "regra de prova" (takeaway memorável) ao final.
Responda no idioma indicado pelo aluno (padrão: português).`,

  anki: `Você transforma o conteúdo estudado na conversa em flashcards no formato "pergunta :: resposta"
(frente e verso separados por " :: "; exatamente um card por linha).
Esse formato é importado diretamente pelo módulo Flashcards da plataforma CoupleMed.
Foque em alto rendimento para USMLE Step 1. Não adicione numeração, títulos ou explicações fora do formato pedido.`
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* ---------- rota AI Tutor ---------- */
    if (url.pathname === '/tutor') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
      }
      if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

      if (!env.OPENAI_API_KEY) return json({ error: 'OPENAI_API_KEY não configurada no Cloudflare' }, 500);

      let body;
      try { body = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }

      const { pergunta, historico, modo } = body;
      if (!pergunta || typeof pergunta !== 'string') return json({ error: "Campo 'pergunta' é obrigatório" }, 400);
      if (pergunta.length > 6000) return json({ error: 'Pergunta muito longa (máx. 6000 caracteres)' }, 400);

      const historicoSeguro = (Array.isArray(historico) ? historico : [])
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map(m => ({ role: m.role, content: m.content.slice(0, 6000) }))
        .slice(-16);

      const systemPrompt = SYSTEM_PROMPTS[modo] || SYSTEM_PROMPTS.socratico;

      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            max_tokens: 900,
            messages: [
              { role: 'system', content: systemPrompt },
              ...historicoSeguro,
              { role: 'user', content: pergunta }
            ]
          })
        });

        if (!resp.ok) {
          const errText = await resp.text();
          return json({ error: 'Erro na API da OpenAI', detail: errText.slice(0, 500) }, 502);
        }

        const data = await resp.json();
        const resposta = data.choices?.[0]?.message?.content || 'Sem resposta.';
        return json({ resposta });
      } catch (err) {
        return json({ error: 'Erro interno', detail: String(err) }, 500);
      }
    }

    /* ---------- rotas de AUTENTICAÇÃO (v53) ---------- */
    if (url.pathname === '/api/login'  || url.pathname === '/api/logout' ||
        url.pathname === '/api/me'     || url.pathname === '/api/users'  ||
        url.pathname.startsWith('/api/users/')) {
      return handleAuth(request, env, url);
    }

    /* ---------- rota de SINCRONIZAÇÃO entre aparelhos (D1) ---------- */
    if (url.pathname.startsWith('/api/state')) {
      return handleState(request, env, url);
    }

    /* ---------- rotas QBank (D1) ---------- */
    if (url.pathname.startsWith('/api/qbank')) {
      return handleQBank(request, env, url);
    }

    /* ---------- rotas Notebook (R2 — imagens dos cadernos) ---------- */
    if (url.pathname.startsWith('/api/notebook')) {
      return handleNotebook(request, env, url);
    }

    /* ---------- rotas Library 3 (R2 — PDFs) ---------- */
    if (url.pathname.startsWith('/api/library3')) {
      return handleLibrary3(request, env, url);
    }

    /* ---------- arquivos estáticos (public/) ---------- */
    return env.ASSETS.fetch(request);
  }
};

/* ==========================================================================
   AUTENTICAÇÃO (v53)

   Antes: a senha era comparada dentro do navegador, no site.js. Ou seja, as
   senhas verdadeiras precisavam estar no arquivo — e o arquivo é público.

   Agora: a senha só existe como hash PBKDF2-SHA256 na tabela `users`. O
   servidor confere e devolve um cookie de sessão assinado com HMAC. O
   /api/state passa a ler a identidade DESSE cookie e ignora o ?user=.

   ⚠️ SESSION_SECRET é obrigatório:
        npx wrangler secret put SESSION_SECRET
      (qualquer texto longo e aleatório; trocá-lo desloga todo mundo)
   ========================================================================== */

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;   // 30 dias
const COOKIE = 'cm_session';

const enc = new TextEncoder();
const b64u = {
  from: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
                  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  to: (s) => Uint8Array.from(
        atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
};

/* Comparação em tempo constante: um `===` vazaria, pelo tempo de resposta,
   quantos bytes iniciais do hash o atacante já acertou. */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function pbkdf2(password, saltBytes, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' }, key, 256);
  return new Uint8Array(bits);
}

async function verifyPassword(password, row) {
  const salt = Uint8Array.from(atob(row.salt), c => c.charCodeAt(0));
  const want = Uint8Array.from(atob(row.pass_hash), c => c.charCodeAt(0));
  const got = await pbkdf2(password, salt, row.iterations);
  return timingSafeEqual(got, want);
}

async function hashPassword(password, iterations = 50000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const dk = await pbkdf2(password, salt, iterations);
  const b64 = (u8) => btoa(String.fromCharCode(...u8));
  return { pass_hash: b64(dk), salt: b64(salt), iterations };
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signSession(uid, secret) {
  const payload = b64u.from(enc.encode(JSON.stringify({ uid, exp: Date.now() + SESSION_TTL_MS })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload));
  return payload + '.' + b64u.from(sig);
}

async function readSession(request, env) {
  if (!env.SESSION_SECRET) return null;
  const raw = (request.headers.get('Cookie') || '')
    .split(';').map(s => s.trim())
    .find(s => s.startsWith(COOKIE + '='));
  if (!raw) return null;

  const token = raw.slice(COOKIE.length + 1);
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;

  /* Tudo daqui para baixo é dado hostil. Um cookie com base64 inválido faz o
     atob() lançar exceção — sem este try, a rota devolveria 500 em vez de 401,
     e qualquer um derrubaria a API mandando lixo no cookie. */
  try {
    const payload = token.slice(0, dot);
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(env.SESSION_SECRET),
      b64u.to(token.slice(dot + 1)), enc.encode(payload));
    if (!ok) return null;                     // assinatura inválida ou forjada

    const data = JSON.parse(new TextDecoder().decode(b64u.to(payload)));
    if (!data.uid || !data.exp || Date.now() > data.exp) return null;
    return data;
  } catch { return null; }
}

function cookieHeader(value, maxAgeSec) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

/* Carrega o usuário da sessão e revalida o bloqueio a cada requisição:
   bloquear alguém precisa surtir efeito na hora, não só no próximo login. */
async function currentUser(request, env) {
  const s = await readSession(request, env);
  if (!s) return null;
  const row = await env.QBANK_DB.prepare(
    'SELECT uid, login, display_name, role, blocked FROM users WHERE uid = ?'
  ).bind(s.uid).first();
  if (!row || row.blocked) return null;
  return row;
}

async function handleAuth(request, env, url) {
  const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra }
  });

  if (!env.QBANK_DB) return json({ error: 'D1 not bound', dbReady: false }, 503);
  if (!env.SESSION_SECRET) {
    return json({ error: 'SESSION_SECRET ausente. Rode: wrangler secret put SESSION_SECRET' }, 503);
  }

  const path = url.pathname;

  /* ---------------- POST /api/login ---------------- */
  if (path === '/api/login' && request.method === 'POST') {
    let body; try { body = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
    const login = String(body.login || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!login || !password) return json({ error: 'invalid' }, 400);

    const row = await env.QBANK_DB.prepare(
      'SELECT * FROM users WHERE login = ?').bind(login).first();

    // Mesma resposta para login inexistente e senha errada: não revelamos
    // quais logins existem.
    if (!row || !(await verifyPassword(password, row))) {
      return json({ error: 'invalid_credentials' }, 401);
    }
    if (row.blocked) return json({ error: 'blocked' }, 403);

    const token = await signSession(row.uid, env.SESSION_SECRET);
    return json(
      { ok: true, uid: row.uid, displayName: row.display_name, role: row.role },
      200,
      { 'Set-Cookie': cookieHeader(token, SESSION_TTL_MS / 1000) }
    );
  }

  /* ---------------- POST /api/logout ---------------- */
  if (path === '/api/logout' && request.method === 'POST') {
    return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0) });
  }

  /* ---------------- GET /api/me ---------------- */
  if (path === '/api/me' && request.method === 'GET') {
    const me = await currentUser(request, env);
    if (!me) return json({ error: 'unauthenticated' }, 401);
    return json({ ok: true, uid: me.uid, login: me.login, displayName: me.display_name, role: me.role });
  }

  /* ---------------- GET /api/users  (só admin) ---------------- */
  if (path === '/api/users' && request.method === 'GET') {
    const me = await currentUser(request, env);
    if (!me) return json({ error: 'unauthenticated' }, 401);
    if (me.role !== 'admin') return json({ error: 'forbidden' }, 403);
    const { results } = await env.QBANK_DB.prepare(
      'SELECT uid, login, display_name, role, blocked FROM users ORDER BY uid').all();
    return json({ ok: true, users: results || [] });
  }

  /* ---------------- POST /api/users/update ----------------
     Admin altera qualquer um. Usuário comum só altera a si mesmo.
     newPassword em branco = mantém a senha atual.                        */
  if (path === '/api/users/update' && request.method === 'POST') {
    const me = await currentUser(request, env);
    if (!me) return json({ error: 'unauthenticated' }, 401);

    let body; try { body = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
    const uid = String(body.uid || '');
    if (uid !== me.uid && me.role !== 'admin') return json({ error: 'forbidden' }, 403);

    const target = await env.QBANK_DB.prepare('SELECT * FROM users WHERE uid = ?').bind(uid).first();
    if (!target) return json({ error: 'not_found' }, 404);

    const displayName = String(body.displayName || target.display_name).trim();
    const login = String(body.login || target.login).trim().toLowerCase();
    const newPassword = String(body.newPassword || '');

    if (!displayName || !login) return json({ error: 'invalid' }, 400);
    if (newPassword && newPassword.length < 6) return json({ error: 'password_too_short' }, 400);

    // login duplicado pertencendo a outro usuário
    const clash = await env.QBANK_DB.prepare(
      'SELECT uid FROM users WHERE login = ? AND uid != ?').bind(login, uid).first();
    if (clash) return json({ error: 'login_taken' }, 409);

    let sql, args;
    if (newPassword) {
      const h = await hashPassword(newPassword, target.iterations || 50000);
      sql = `UPDATE users SET display_name=?, login=?, pass_hash=?, salt=?, iterations=?, updated_at=? WHERE uid=?`;
      args = [displayName, login, h.pass_hash, h.salt, h.iterations, Date.now(), uid];
    } else {
      sql = `UPDATE users SET display_name=?, login=?, updated_at=? WHERE uid=?`;
      args = [displayName, login, Date.now(), uid];
    }
    await env.QBANK_DB.prepare(sql).bind(...args).run();
    return json({ ok: true, passwordChanged: !!newPassword });
  }

  /* ---------------- POST /api/users/blocked  (só admin) ---------------- */
  if (path === '/api/users/blocked' && request.method === 'POST') {
    const me = await currentUser(request, env);
    if (!me) return json({ error: 'unauthenticated' }, 401);
    if (me.role !== 'admin') return json({ error: 'forbidden' }, 403);

    let body; try { body = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
    const uid = String(body.uid || '');
    if (uid === me.uid) return json({ error: 'cannot_block_self' }, 400);

    await env.QBANK_DB.prepare('UPDATE users SET blocked=?, updated_at=? WHERE uid=?')
      .bind(body.blocked ? 1 : 0, Date.now(), uid).run();
    return json({ ok: true });
  }

  return json({ error: 'Not Found' }, 404);
}

/**
 * Sincronização de estado entre aparelhos (tabela user_state em D1).
 *
 *   GET  /api/state?user=<uid>&shared=1
 *        → { state: [ {bucket, k, v, deleted, updated_at}, ... ] }
 *
 *   POST /api/state
 *        body: { user, updates: [ {bucket, k, v, deleted, updated_at}, ... ] }
 *        → { ok:true, applied:<n> }
 *
 * Resolução de conflito: last-write-wins por chave, arbitrado por updated_at
 * (epoch em ms, gerado pelo cliente). Uma gravação mais ANTIGA nunca sobrescreve
 * uma mais NOVA — é isso que impede um aparelho que ficou horas offline de
 * ressuscitar dados velhos por cima do progresso recente.
 *
 * Sem D1 vinculado → 503 { dbReady:false }. O frontend cai em modo local e o
 * site continua funcionando exatamente como na v51.
 *
 * ⚠️ SEM AUTENTICAÇÃO. Quem souber a URL consegue ler e escrever o estado de
 *    qualquer usuário da allowlist. Ver a seção de segurança no handoff.
 */
/* v53 — A allowlist saiu de cena. Quem pode escrever é decidido pela sessão
   assinada, e os usuários vivem na tabela `users`. Criar um usuário novo agora
   é um INSERT no D1, não uma edição de constante em dois arquivos. */

async function handleState(request, env, url) {
  /* v53 — sem CORS aberto. O cookie é HttpOnly e de mesma origem; um
     Access-Control-Allow-Origin:'*' nem sequer funcionaria com credenciais,
     e só serviria para convidar chamadas de fora. */
  const cors = { 'Vary': 'Cookie' };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const reply = (obj, status = 200) => new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors }
  });

  const db = env.QBANK_DB;
  if (!db) {
    return reply({ error: 'D1 not bound', dbReady: false, mode: 'localStorage-fallback' }, 503);
  }

  /* v53 — A IDENTIDADE VEM DO COOKIE ASSINADO, NUNCA DA URL.
     Na v52 esta rota aceitava ?user=john de qualquer um. O parâmetro pode até
     continuar chegando na query string, mas é ignorado: `me.uid` é a única
     fonte de verdade. É esta função que tranca a porta. */
  const me = await currentUser(request, env);
  if (!me) return reply({ error: 'unauthenticated' }, 401);
  const user = me.uid;

  try {
    /* ---------------- PULL ---------------- */
    if (request.method === 'GET') {
      const buckets = url.searchParams.get('shared') === '1' ? [user, '_shared'] : [user];
      const marks = buckets.map(() => '?').join(',');
      const { results } = await db.prepare(
        `SELECT user_id AS bucket, k, v, deleted, updated_at
           FROM user_state WHERE user_id IN (${marks})`
      ).bind(...buckets).all();

      return reply({ ok: true, dbReady: true, state: results || [] });
    }

    /* ---------------- PUSH ---------------- */
    if (request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return reply({ error: 'JSON inválido' }, 400); }

      // body.user é deliberadamente ignorado — vem do cliente, logo não é confiável.
      const updates = Array.isArray(body.updates) ? body.updates : [];
      if (!updates.length) return reply({ ok: true, applied: 0 });
      if (updates.length > 64) return reply({ error: 'lote grande demais' }, 413);

      const stmts = [];
      for (const u of updates) {
        // Um usuário só escreve no próprio balde ou no balde compartilhado.
        if (u.bucket !== user && u.bucket !== '_shared') continue;
        if (typeof u.k !== 'string' || !/^[a-z0-9_]{1,40}$/.test(u.k)) continue;

        const ts = Number(u.updated_at);
        if (!Number.isFinite(ts) || ts <= 0) continue;

        const del = u.deleted ? 1 : 0;
        const val = del ? null : String(u.v ?? '');
        if (val !== null && val.length > 2_000_000) {
          return reply({ error: `chave '${u.k}' excede 2MB` }, 413);
        }

        // Upsert com guarda de recência: só sobrescreve se for mais novo.
        stmts.push(db.prepare(
          `INSERT INTO user_state (user_id, k, v, updated_at, deleted)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id, k) DO UPDATE SET
             v          = excluded.v,
             updated_at = excluded.updated_at,
             deleted    = excluded.deleted
           WHERE excluded.updated_at > user_state.updated_at`
        ).bind(u.bucket, u.k, val, ts, del));
      }

      if (stmts.length) await db.batch(stmts);
      return reply({ ok: true, applied: stmts.length });
    }

    return reply({ error: 'Method Not Allowed' }, 405);
  } catch (err) {
    return reply({ error: 'D1 error', detail: String(err) }, 500);
  }
}

/**
 * Router do QBank sobre Cloudflare D1 (binding esperado: env.QBANK_DB).
 * Enquanto o D1 não estiver ligado no wrangler.toml, todas as rotas respondem
 * 503 com dbReady:false — o frontend detecta isso e continua em localStorage.
 * Isso deixa o backend "preparado" sem quebrar o site atual.
 *
 * Endpoints implementados (referência às Partes do prompt mestre):
 *   GET  /api/qbank/health                       → status do banco
 *   GET  /api/qbank/questions?system=&...         → Parte 2 (pool p/ Create Test)
 *   GET  /api/qbank/questions/:id/history?user=   → Parte 4.5 (indicador colorido)
 *   POST /api/qbank/attempts                       → Parte 3/4 (registra tentativa, imutável)
 *   GET  /api/qbank/analytics/pass-comparison?user=       → Parte 4.4
 *   GET  /api/qbank/analytics/root-cause-breakdown?user=  → Parte 5.3
 */
async function handleQBank(request, env, url) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
  const path = url.pathname.replace(/^\/api\/qbank/, '') || '/';
  const db = env.QBANK_DB; // binding D1

  if (path === '/health' || path === '/') {
    return reply({ ok: true, dbReady: !!db, mode: db ? 'd1' : 'localStorage-fallback' });
  }
  if (!db) {
    // Backend preparado, mas D1 ainda não vinculado → frontend usa localStorage.
    return reply({ error: 'D1 not bound', dbReady: false, hint: 'Configure [[d1_databases]] no wrangler.toml e rode wrangler d1 execute com schema.sql' }, 503);
  }

  try {
    // ---- Parte 2: pool de questões para Create Test ----
    if (path === '/questions' && request.method === 'GET') {
      const p = url.searchParams;
      const where = [], bind = [];
      if (p.get('system'))     { where.push('system_id = ?');     bind.push(p.get('system')); }
      if (p.get('discipline')) { where.push('discipline_id = ?'); bind.push(p.get('discipline')); }
      if (p.get('category'))   { where.push('category_id = ?');   bind.push(p.get('category')); }
      if (p.get('difficulty')) { where.push('difficulty_level = ?'); bind.push(p.get('difficulty')); }
      const sql = 'SELECT * FROM questions' + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' LIMIT 500';
      const { results } = await db.prepare(sql).bind(...bind).all();
      return reply({ questions: results });
    }

    // ---- Parte 4.5: histórico de uma questão (indicador colorido) ----
    let m = path.match(/^\/questions\/([^/]+)\/history$/);
    if (m && request.method === 'GET') {
      const user = url.searchParams.get('user');
      const { results } = await db.prepare(
        'SELECT status, is_correct, pass_number, created_at FROM attempts WHERE user_id=? AND question_id=? ORDER BY created_at ASC'
      ).bind(user, m[1]).all();
      return reply({ history: results });
    }

    // ---- Parte 3/4: registrar tentativa (INSERT-only, nunca sobrescreve) ----
    if (path === '/attempts' && request.method === 'POST') {
      const b = await request.json();
      // Parte 4.1: pass_number calculado por attempts anteriores.
      const prior = await db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE user_id=? AND question_id=?')
        .bind(b.user_id, b.question_id).first();
      const n = (prior?.n ?? 0);
      const pass_number = n === 0 ? 1 : n === 1 ? 2 : n === 2 ? 3 : 99;
      const id = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO attempts (id,user_id,question_id,test_id,pass_number,selected_option,is_correct,status,time_spent_seconds,mode,flagged,strikethrough_options,root_cause_tag)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(id, b.user_id, b.question_id, b.test_id ?? null, pass_number, b.selected_option ?? null,
             b.is_correct ?? null, b.status, b.time_spent_seconds ?? 0, b.mode, b.flagged ? 1 : 0,
             JSON.stringify(b.strikethrough_options ?? []), b.root_cause_tag ?? null).run();
      return reply({ id, pass_number });
    }

    // ---- Parte 4.4: comparação por pass_number × system ----
    if (path === '/analytics/pass-comparison' && request.method === 'GET') {
      const user = url.searchParams.get('user');
      const { results } = await db.prepare(
        `SELECT pass_number, system_id,
                ROUND(100.0*SUM(is_correct)/COUNT(*),1) AS pct, COUNT(*) AS total
         FROM attempts WHERE user_id=? AND status!='omitted'
         GROUP BY pass_number, system_id`
      ).bind(user).all();
      return reply({ passComparison: results });
    }

    // ---- Parte 5.3: distribuição de causa-raiz ----
    if (path === '/analytics/root-cause-breakdown' && request.method === 'GET') {
      const user = url.searchParams.get('user');
      const { results } = await db.prepare(
        `SELECT root_cause_tag AS tag, COUNT(*) AS n FROM attempts
         WHERE user_id=? AND root_cause_tag IS NOT NULL GROUP BY root_cause_tag ORDER BY n DESC`
      ).bind(user).all();
      return reply({ rootCause: results });
    }

    return reply({ error: 'Not found' }, 404);
  } catch (err) {
    return reply({ error: 'D1 error', detail: String(err) }, 500);
  }
}

/**
 * Router do Notebook sobre Cloudflare R2 (binding esperado: env.NB_STORAGE).
 * Armazena as imagens coladas/enviadas nas notas do módulo Notebooks.
 * Enquanto o R2 não estiver vinculado no wrangler.toml, o upload responde 503
 * com r2Ready:false — o frontend detecta e usa base64 no localStorage como
 * fallback automático (mesmo padrão "preparado sem quebrar" do QBank/D1).
 *
 * Endpoints:
 *   GET    /api/notebook/health        → status do storage
 *   POST   /api/notebook/upload        → FormData {file, user} → {ok,key,url}
 *   GET    /api/notebook/img/<key>     → serve a imagem (cache imutável de 1 ano)
 *   DELETE /api/notebook/img/<key>     → remove a imagem (limpeza ao excluir nota)
 */
async function handleNotebook(request, env, url) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
  const path = url.pathname.replace(/^\/api\/notebook/, '') || '/';
  const bucket = env.NB_STORAGE; // binding R2

  if (path === '/health' || path === '/') {
    return reply({ ok: true, r2Ready: !!bucket, mode: bucket ? 'r2' : 'base64-fallback' });
  }

  // ---- servir imagem: GET /img/<key> ----
  if (path.startsWith('/img/') && request.method === 'GET') {
    if (!bucket) return reply({ error: 'R2 not bound', r2Ready: false }, 503);
    const key = decodeURIComponent(path.slice(5));
    if (!key.startsWith('nb/')) return reply({ error: 'Invalid key' }, 400);
    const obj = await bucket.get(key);
    if (!obj) return reply({ error: 'Not found' }, 404);
    return new Response(obj.body, {
      headers: {
        'Content-Type': (obj.httpMetadata && obj.httpMetadata.contentType) || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // ---- upload: POST /upload (FormData: file, user) ----
  if (path === '/upload' && request.method === 'POST') {
    if (!bucket) {
      return reply({ error: 'R2 not bound', r2Ready: false, hint: 'Crie o bucket "couplemed-notebook" no painel Cloudflare (R2) e confira o [[r2_buckets]] no wrangler.toml' }, 503);
    }
    let form;
    try { form = await request.formData(); } catch { return reply({ error: 'FormData inválido' }, 400); }
    const file = form.get('file');
    const user = String(form.get('user') || 'anon').replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || 'anon';
    if (!file || typeof file === 'string') return reply({ error: "Campo 'file' é obrigatório" }, 400);
    if (!/^image\//.test(file.type || '')) return reply({ error: 'Apenas imagens são aceitas' }, 415);
    if (file.size > 8 * 1024 * 1024) return reply({ error: 'Imagem muito grande (máx. 8MB)' }, 413);
    const ext = ((file.type || '').split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin';
    const key = `nb/${user}/${crypto.randomUUID()}.${ext}`;
    try {
      await bucket.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
      return reply({ ok: true, key, url: '/api/notebook/img/' + key });
    } catch (err) {
      return reply({ error: 'R2 error', detail: String(err) }, 500);
    }
  }

  // ---- exclusão: DELETE /img/<key> ----
  if (path.startsWith('/img/') && request.method === 'DELETE') {
    if (!bucket) return reply({ error: 'R2 not bound', r2Ready: false }, 503);
    const key = decodeURIComponent(path.slice(5));
    if (!key.startsWith('nb/')) return reply({ error: 'Invalid key' }, 400);
    try { await bucket.delete(key); } catch (err) { return reply({ error: 'R2 error', detail: String(err) }, 500); }
    return reply({ ok: true });
  }

  return reply({ error: 'Not found' }, 404);
}

/**
 * Router da Library 3 sobre Cloudflare R2 (binding esperado: env.LIB3_STORAGE).
 * Somente leitura: os PDFs são enviados via wrangler CLI, não pelo site.
 *
 * Endpoints:
 *   GET /api/library3/pdf/<key>  → serve o PDF (cache imutável de 1 ano, inline no navegador)
 */
async function handleLibrary3(request, env, url) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
  const path = url.pathname.replace(/^\/api\/library3/, '') || '/';
  const bucket = env.LIB3_STORAGE;

  if (path === '/health' || path === '/') {
    return reply({ ok: true, r2Ready: !!bucket });
  }

  if (path.startsWith('/pdf/') && request.method === 'GET') {
    if (!bucket) return reply({ error: 'R2 not bound', r2Ready: false }, 503);
    const key = decodeURIComponent(path.slice(5));
    if (!key.startsWith('lib3/')) return reply({ error: 'Invalid key' }, 400);
    const obj = await bucket.get(key);
    if (!obj) return reply({ error: 'Not found' }, 404);
    const filename = key.split('/').pop();
    return new Response(obj.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // ---- upload multipart p/ arquivos grandes (>300MiB, além do limite do wrangler CLI) ----
  // Gate por segredo (env.LIB3_ADMIN_SECRET) — usado manualmente via script, não pelo site.
  if (path.startsWith('/admin/')) {
    if (!bucket) return reply({ error: 'R2 not bound', r2Ready: false }, 503);
    if (!env.LIB3_ADMIN_SECRET || request.headers.get('X-Admin-Secret') !== env.LIB3_ADMIN_SECRET) {
      return reply({ error: 'Unauthorized' }, 401);
    }
    if (path === '/admin/mpu-init' && request.method === 'POST') {
      const { key } = await request.json();
      if (!key || !key.startsWith('lib3/')) return reply({ error: 'Invalid key' }, 400);
      const upload = await bucket.createMultipartUpload(key);
      return reply({ ok: true, key, uploadId: upload.uploadId });
    }
    if (path === '/admin/mpu-part' && request.method === 'PUT') {
      const key = url.searchParams.get('key');
      const uploadId = url.searchParams.get('uploadId');
      const partNumber = Number(url.searchParams.get('partNumber'));
      if (!key || !uploadId || !partNumber) return reply({ error: 'Missing key/uploadId/partNumber' }, 400);
      const upload = bucket.resumeMultipartUpload(key, uploadId);
      const part = await upload.uploadPart(partNumber, request.body);
      return reply({ ok: true, partNumber, etag: part.etag });
    }
    if (path === '/admin/mpu-complete' && request.method === 'POST') {
      const { key, uploadId, parts } = await request.json();
      if (!key || !uploadId || !Array.isArray(parts)) return reply({ error: 'Missing key/uploadId/parts' }, 400);
      const upload = bucket.resumeMultipartUpload(key, uploadId);
      await upload.complete(parts);
      return reply({ ok: true });
    }
    if (path === '/admin/mpu-abort' && request.method === 'POST') {
      const { key, uploadId } = await request.json();
      const upload = bucket.resumeMultipartUpload(key, uploadId);
      await upload.abort();
      return reply({ ok: true });
    }
  }

  return reply({ error: 'Not found' }, 404);
}
