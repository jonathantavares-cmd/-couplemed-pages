/* CoupleMed — Narrador de conteúdo (player + destaque que acompanha a leitura)
   ============================================================================
   Barra de narração usada pelas TRÊS libraries. Como a toolbar das Libraries 1 e
   3 é literalmente a mesma (mesmas classes .l3r-*, mesmo CSS — ver o cabeçalho de
   library1-reader.js), o narrador também é um só: quem quiser narração chama
   CMNarrator.open() passando de onde vem o texto. A Library 2 herda de graça
   quando o leitor dela existir.

   COMO O DESTAQUE FICA SINCRONIZADO
   O áudio é gravado antes (tools/narration.js) frase por frase e colado num
   arquivo só, com uma tabela de tempos ao lado: cada frase tem `start` e `end` em
   segundos. Tocando esse arquivo, o `timeupdate` diz o instante atual, a tabela
   diz qual frase é essa, e o destaque vai para ela. Por isso funciona igual em
   qualquer navegador (inclusive Safari/iPhone) e continua exato quando o usuário
   muda a velocidade ou arrasta a barra — não há estimativa em lugar nenhum.

   Se o áudio gravado não existir (tópico recém-incluído, ou uma seleção solta de
   texto), cai para o sintetizador do próprio aparelho (speechSynthesis): a
   qualidade é menor e o destaque passa a ser por frase falada, mas nada trava.

   O DESTAQUE NÃO TOCA O DOM. Os leitores já reescrevem o innerHTML do conteúdo
   para aplicar marcação de texto e busca; se o narrador embrulhasse frases em
   <span>, as duas coisas se atropelariam. Em vez disso, ele mede os retângulos
   da frase (Range.getClientRects) e desenha por cima, numa camada própria.
   ============================================================================ */
(function(){
  'use strict';

  const S = window.CMNarrationShared;
  if (!S){ console.error('[cm-narrator] cm-narration-shared.js precisa ser carregado antes.'); return; }

  const CSS_HREF = '/css/cm-narrator.css?v=1';
  const AUDIO_API = '/api/narration/audio/';
  const LS_PREFS  = 'couplemed_narrator_prefs';

  const uiLang = () => document.documentElement.lang === 'pt-BR' ? 'pt' : 'en';
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

  const T = {
    en: { narrate:'Listen', title:'Narration', play:'Play', pause:'Pause', back10:'Back 10 seconds',
          fwd10:'Forward 10 seconds', settings:'Settings', close:'Close narration',
          speed:'Playback speed', voice:'Narrator voice', language:'Narration language',
          scope:'What to read', scopeAll:'Entire page', scopeSel:'Selected text only',
          loading:'Preparing narration…', noAudioTitle:'Using this device’s voice',
          noAudio:'The recorded narration for this topic is not available yet, so your device’s built-in voice is reading it.',
          unsupported:'This browser cannot narrate text.', female:'female', male:'male',
          selEmpty:'Select some text on the page first.', of:'of', en:'English', pt:'Portuguese' },
    pt: { narrate:'Ouvir', title:'Narração', play:'Reproduzir', pause:'Pausar', back10:'Voltar 10 segundos',
          fwd10:'Avançar 10 segundos', settings:'Configurações', close:'Fechar narração',
          speed:'Velocidade de reprodução', voice:'Voz do narrador', language:'Idioma da narração',
          scope:'O que narrar', scopeAll:'Conteúdo inteiro', scopeSel:'Somente o texto selecionado',
          loading:'Preparando a narração…', noAudioTitle:'Usando a voz deste aparelho',
          noAudio:'A narração gravada deste tópico ainda não está disponível, então a voz do próprio aparelho está lendo.',
          unsupported:'Este navegador não consegue narrar texto.', female:'feminina', male:'masculina',
          selEmpty:'Selecione um trecho do texto primeiro.', of:'de', en:'Inglês', pt:'Português' }
  };
  const t = k => (T[uiLang()] || T.en)[k];

  const ICON = {
    play:  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 5.5h3.2v13H7zm6.8 0H17v13h-3.2z" fill="currentColor"/></svg>',
    back:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M11.5 5.5a6.5 6.5 0 1 1-6.4 7.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M8.4 2.9 5 5.9l3.4 2.7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fwd:   '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M12.5 5.5a6.5 6.5 0 1 0 6.4 7.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M15.6 2.9 19 5.9l-3.4 2.7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    gear:  '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="3.1" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.6v2.1M12 18.3v2.1M4.6 12H2.5M21.5 12h-2.1M6.8 6.8 5.3 5.3M18.7 18.7l-1.5-1.5M17.2 6.8l1.5-1.5M5.3 18.7l1.5-1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    speed: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M4.5 16a8 8 0 1 1 15 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 15.5 15.8 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    wave:  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M3 12h1.6M7 8.5v7M10.4 5.5v13M13.8 8v8M17.2 10v4M20.6 11.4v1.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    globe: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.4" stroke="currentColor" stroke-width="1.7"/><path d="M3.6 12h16.8M12 3.6c2.4 2.3 2.4 14 0 16.8-2.4-2.8-2.4-14.5 0-16.8Z" stroke="currentColor" stroke-width="1.7"/></svg>',
    scope: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M4.5 6.5h15M4.5 11h15M4.5 15.5h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };

  /* ------------------------------------------------------------ preferências --
     Voz, velocidade e escopo seguem o usuário entre tópicos e entre libraries —
     quem escolheu o Tom a 1,25x não quer reescolher em cada página. */
  function loadPrefs(){
    try{
      const p = JSON.parse(localStorage.getItem(LS_PREFS) || '{}');
      return { rate: p.rate || 1, voice: p.voice || {}, scope: p.scope === 'selection' ? 'selection' : 'all' };
    }catch(e){ return { rate:1, voice:{}, scope:'all' }; }
  }
  function savePrefs(p){ try{ localStorage.setItem(LS_PREFS, JSON.stringify(p)); }catch(e){} }

  function ensureStylesheet(){
    if (document.getElementById('cmNarratorCss')) return;
    const link = document.createElement('link');
    link.id = 'cmNarratorCss'; link.rel = 'stylesheet'; link.href = CSS_HREF;
    document.head.appendChild(link);
  }

  /* ============================================================================
     CASAMENTO FRASE ↔ DOM
     Recebe a lista de frases (que veio junto do áudio) e acha cada uma dentro do
     elemento de conteúdo, devolvendo um Range por frase. Faz por texto
     normalizado, e não por índice, porque o texto na tela nem sempre é idêntico
     ao gravado: o leitor pode ter inserido o bloco "Create Test" no meio, o
     usuário pode ter marcado um trecho (o que quebra os nós de texto em vários),
     e as entidades HTML viram caracteres. Buscar o texto normalizado, avançando
     um cursor, resolve tudo isso de uma vez.
     ========================================================================== */
  function buildTextIndex(rootEl){
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        // não narra o que não é conteúdo: a própria barra, scripts, e o bloco de teste
        for (let p = node.parentNode; p && p !== rootEl; p = p.parentNode){
          const tag = p.nodeName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
          if (p.classList && (p.classList.contains('cm-nar') || p.classList.contains('cm-nar-skip'))) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let norm = '';
    const map = [];                       // map[i] = { node, offset } do i-ésimo char normalizado
    for (let node = walker.nextNode(); node; node = walker.nextNode()){
      const raw = node.nodeValue;
      for (let k = 0; k < raw.length; k++){
        const c = S.normalizeForMatch(raw[k]);
        if (!c) continue;                 // espaço/pontuação/acento: fora do índice
        norm += c;
        for (let z = 0; z < c.length; z++) map.push({ node, offset: k });
      }
    }
    return { norm, map };
  }

  function matchSentencesToDom(rootEl, sentences){
    const { norm, map } = buildTextIndex(rootEl);
    const ranges = new Array(sentences.length).fill(null);
    let cursor = 0;

    sentences.forEach((sent, i) => {
      const needle = S.normalizeForMatch(sent);
      if (!needle) return;
      let at = norm.indexOf(needle, cursor);
      // se não achou daqui pra frente, tenta do começo (conteúdo reordenado)
      if (at < 0) at = norm.indexOf(needle);
      // frase longa que sofreu edição: tenta casar só o começo dela
      if (at < 0 && needle.length > 40) at = norm.indexOf(needle.slice(0, 40), cursor);
      if (at < 0) return;

      const from = map[at], to = map[Math.min(at + needle.length - 1, map.length - 1)];
      if (!from || !to) return;
      try{
        const r = document.createRange();
        r.setStart(from.node, from.offset);
        r.setEnd(to.node, to.offset + 1);
        ranges[i] = r;
        cursor = at + needle.length;
      }catch(e){}
    });

    return ranges;
  }

  /* Frases que a SELEÇÃO do usuário cobre — para o modo "somente o selecionado". */
  function sentencesInSelection(ranges){
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const selRange = sel.getRangeAt(0);
    const hits = [];
    ranges.forEach((r, i) => {
      if (!r) return;
      try{
        // interseção: começa antes do fim da seleção E termina depois do começo dela
        if (r.compareBoundaryPoints(Range.START_TO_END, selRange) > 0 &&
            r.compareBoundaryPoints(Range.END_TO_START, selRange) < 0) hits.push(i);
      }catch(e){}
    });
    return hits.length ? hits : null;
  }

  /* ============================================================================
     CAMADA DE DESTAQUE — desenha retângulos por cima do texto, sem tocar no DOM.
     Os retângulos ficam posicionados em relação ao container que rola, então
     acompanham a rolagem sozinhos, sem recalcular a cada scroll.
     ========================================================================== */
  function Highlighter(contentEl){
    const layer = document.createElement('div');
    layer.className = 'cm-nar-layer cm-nar-skip';
    layer.setAttribute('aria-hidden','true');
    const host = contentEl;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(layer);

    let current = null;

    function draw(range){
      layer.textContent = '';
      current = range;
      if (!range) return;
      const base = host.getBoundingClientRect();
      const rects = Array.from(range.getClientRects()).filter(r => r.width > 0.5 && r.height > 0.5);
      for (const r of rects){
        const d = document.createElement('div');
        d.className = 'cm-nar-mark';
        d.style.left   = (r.left - base.left + host.scrollLeft) + 'px';
        d.style.top    = (r.top  - base.top  + host.scrollTop)  + 'px';
        d.style.width  = r.width  + 'px';
        d.style.height = r.height + 'px';
        layer.appendChild(d);
      }
    }

    function scrollIntoView(range){
      if (!range) return;
      const rects = range.getClientRects();
      if (!rects.length) return;
      const r = rects[0];
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // só rola quando a frase saiu da faixa confortável de leitura
      if (r.top < 90 || r.bottom > vh - 120){
        const target = r.top + window.scrollY - Math.max(120, vh * 0.32);
        window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
      }
    }

    return {
      set(range, doScroll){ draw(range); if (doScroll) scrollIntoView(range); },
      redraw(){ if (current) draw(current); },
      clear(){ layer.textContent = ''; current = null; },
      destroy(){ try{ layer.remove(); }catch(e){} current = null; }
    };
  }

  /* ============================================================================
     O PLAYER
     ========================================================================== */
  let active = null;

  function close(){
    if (!active) return;
    const a = active; active = null;
    try{ a.abort.abort(); }catch(e){}
    try{ a.audio && (a.audio.pause(), a.audio.removeAttribute('src'), a.audio.load()); }catch(e){}
    try{ window.speechSynthesis && window.speechSynthesis.cancel(); }catch(e){}
    try{ a.hl && a.hl.destroy(); }catch(e){}
    try{ a.bar && a.bar.remove(); }catch(e){}
    if (a.cfg && typeof a.cfg.onClose === 'function') { try{ a.cfg.onClose(); }catch(e){} }
  }

  function isOpen(){ return !!active; }

  /* cfg = {
       host,        // onde a barra é inserida (a barra vira o 1º filho)
       contentEl,   // elemento que contém o texto a narrar (e onde o destaque é desenhado)
       scopeKey,    // 'lib1/<subject>/<topic>' — define o caminho do áudio no R2
       title,       // texto mostrado na barra
       lang,        // idioma atual do conteúdo
       langs,       // idiomas com áudio disponível: ['en','pt'] (Library 3: ['en'])
       sentences,   // OPCIONAL: frases já conhecidas (o gerador usou as mesmas)
       onLangChange // OPCIONAL: chamado quando o usuário troca o idioma na config
     } */
  function open(cfg){
    if (!cfg || !cfg.host || !cfg.contentEl) return null;
    close();
    ensureStylesheet();

    const prefs = loadPrefs();
    const langs = (cfg.langs && cfg.langs.length) ? cfg.langs : ['en'];
    const lang  = langs.includes(cfg.lang) ? cfg.lang : langs[0];

    const st = {
      cfg, lang, langs,
      voice: S.resolveVoice(lang, prefs.voice[lang]),
      rate: prefs.rate, scope: prefs.scope,
      ranges: [], table: [], idx: -1,
      mode: null,            // 'audio' | 'speech'
      audio: null, abort: new AbortController(),
      hl: Highlighter(cfg.contentEl),
      bar: null, el: {},
      selIdx: null           // índices das frases quando o escopo é "seleção"
    };
    active = st;

    renderBar(st);
    prepare(st);
    return { close, isOpen };
  }

  /* --------------------------------------------------------------- a barra --- */
  function renderBar(st){
    const bar = document.createElement('div');
    bar.className = 'cm-nar cm-nar-skip';
    bar.setAttribute('role','group');
    bar.setAttribute('aria-label', t('title'));
    bar.innerHTML = `
      <button type="button" class="cm-nar-ic" data-act="back10" title="${esc(t('back10'))}" aria-label="${esc(t('back10'))}">${ICON.back}</button>
      <button type="button" class="cm-nar-play" data-act="toggle" title="${esc(t('play'))}" aria-label="${esc(t('play'))}">${ICON.play}</button>
      <button type="button" class="cm-nar-ic" data-act="fwd10" title="${esc(t('fwd10'))}" aria-label="${esc(t('fwd10'))}">${ICON.fwd}</button>
      <div class="cm-nar-mid">
        <div class="cm-nar-label" data-el="label">${esc(st.cfg.title || t('title'))}</div>
        <div class="cm-nar-seekrow">
          <input type="range" class="cm-nar-seek" data-el="seek" min="0" max="1000" value="0"
                 aria-label="${esc(t('title'))}" />
          <span class="cm-nar-time" data-el="time">0:00/0:00</span>
        </div>
      </div>
      <button type="button" class="cm-nar-ic" data-act="settings" title="${esc(t('settings'))}" aria-label="${esc(t('settings'))}" aria-expanded="false">${ICON.gear}</button>
      <button type="button" class="cm-nar-ic" data-act="close" title="${esc(t('close'))}" aria-label="${esc(t('close'))}">✕</button>
      <div class="cm-nar-panel" data-el="panel" hidden></div>
      <div class="cm-nar-note" data-el="note" hidden></div>`;

    st.cfg.host.insertBefore(bar, st.cfg.host.firstChild);
    st.bar = bar;
    st.el = {
      play:  bar.querySelector('[data-act="toggle"]'),
      label: bar.querySelector('[data-el="label"]'),
      seek:  bar.querySelector('[data-el="seek"]'),
      time:  bar.querySelector('[data-el="time"]'),
      panel: bar.querySelector('[data-el="panel"]'),
      note:  bar.querySelector('[data-el="note"]'),
      gear:  bar.querySelector('[data-act="settings"]')
    };

    const sig = { signal: st.abort.signal };
    bar.addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'toggle')   togglePlay(st);
      if (act === 'back10')   seekBy(st, -10);
      if (act === 'fwd10')    seekBy(st, +10);
      if (act === 'close')    close();
      if (act === 'settings') togglePanel(st);
    }, sig);

    st.el.seek.addEventListener('input', () => {
      const frac = st.el.seek.value / 1000;
      if (st.mode === 'audio' && st.audio && isFinite(st.audio.duration)){
        st.audio.currentTime = frac * st.audio.duration;
      } else if (st.mode === 'speech'){
        // sem áudio real não há linha do tempo: mapeia a barra para a frase
        const list = activeList(st);
        jumpToSentence(st, Math.floor(frac * Math.max(1, list.length)));
      }
    }, sig);

    // a camada de destaque é medida em pixels: se a janela muda de tamanho ou a
    // fonte do leitor muda, os retângulos precisam ser redesenhados
    window.addEventListener('resize', () => st.hl.redraw(), sig);
    document.addEventListener('click', e => {
      if (!st.el.panel.hidden && !st.bar.contains(e.target)) closePanel(st);
    }, sig);
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !st.el.panel.hidden){ closePanel(st); return; }
      if (e.key === 'Escape') close();
    }, sig);
  }

  /* -------------------------------------------------- painel de configurações -- */
  function togglePanel(st){ st.el.panel.hidden ? openPanel(st) : closePanel(st); }
  function closePanel(st){ st.el.panel.hidden = true; st.el.gear.setAttribute('aria-expanded','false'); }

  function openPanel(st){
    const rows = [];

    rows.push(`<div class="cm-nar-panel-head">${ICON.gear}<strong>${esc(t('settings'))}</strong></div>`);

    // velocidade
    rows.push(`<div class="cm-nar-row"><span class="cm-nar-row-k">${ICON.speed}${esc(t('speed'))}</span>
      <span class="cm-nar-chips">${S.RATES.map(r =>
        `<button type="button" class="cm-nar-chip${r===st.rate?' cm-nar-chip-on':''}" data-rate="${r}">${String(r).replace('.',',')}x</button>`
      ).join('')}</span></div>`);

    // voz (do idioma da narração)
    rows.push(`<div class="cm-nar-row"><span class="cm-nar-row-k">${ICON.wave}${esc(t('voice'))}</span>
      <span class="cm-nar-chips">${S.voicesFor(st.lang).map(v =>
        `<button type="button" class="cm-nar-chip${v.id===st.voice.id?' cm-nar-chip-on':''}" data-voice="${esc(v.id)}">${esc(v.label)}<i>${esc(t(v.gender==='f'?'female':'male'))}</i></button>`
      ).join('')}</span></div>`);

    // idioma da narração — só aparece quando há mais de um
    if (st.langs.length > 1){
      rows.push(`<div class="cm-nar-row"><span class="cm-nar-row-k">${ICON.globe}${esc(t('language'))}</span>
        <span class="cm-nar-chips">${st.langs.map(l =>
          `<button type="button" class="cm-nar-chip${l===st.lang?' cm-nar-chip-on':''}" data-lang="${esc(l)}">${esc(t(l))}</button>`
        ).join('')}</span></div>`);
    }

    // escopo
    rows.push(`<div class="cm-nar-row"><span class="cm-nar-row-k">${ICON.scope}${esc(t('scope'))}</span>
      <span class="cm-nar-chips">
        <button type="button" class="cm-nar-chip${st.scope==='all'?' cm-nar-chip-on':''}" data-scope="all">${esc(t('scopeAll'))}</button>
        <button type="button" class="cm-nar-chip${st.scope==='selection'?' cm-nar-chip-on':''}" data-scope="selection">${esc(t('scopeSel'))}</button>
      </span></div>`);

    st.el.panel.innerHTML = rows.join('');
    st.el.panel.hidden = false;
    st.el.gear.setAttribute('aria-expanded','true');

    st.el.panel.querySelectorAll('[data-rate]').forEach(b => b.addEventListener('click', () => {
      setRate(st, parseFloat(b.dataset.rate)); openPanel(st);
    }, { signal: st.abort.signal }));

    st.el.panel.querySelectorAll('[data-voice]').forEach(b => b.addEventListener('click', () => {
      setVoice(st, b.dataset.voice); openPanel(st);
    }, { signal: st.abort.signal }));

    st.el.panel.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
      setLang(st, b.dataset.lang); openPanel(st);
    }, { signal: st.abort.signal }));

    st.el.panel.querySelectorAll('[data-scope]').forEach(b => b.addEventListener('click', () => {
      setScope(st, b.dataset.scope); openPanel(st);
    }, { signal: st.abort.signal }));
  }

  function persist(st){
    const p = loadPrefs();
    p.rate = st.rate; p.scope = st.scope;
    p.voice = p.voice || {}; p.voice[st.lang] = st.voice.id;
    savePrefs(p);
  }

  function setRate(st, rate){
    st.rate = clamp(rate, 0.5, 3);
    if (st.audio) st.audio.playbackRate = st.rate;
    persist(st);
  }

  function setVoice(st, id){
    const v = S.findVoice(st.lang, id);
    if (!v || v.id === st.voice.id) return;
    st.voice = v; persist(st);
    const wasPlaying = playing(st);
    const at = st.idx;
    prepare(st, { resumeAt: at, autoplay: wasPlaying });
  }

  function setLang(st, lang){
    if (!st.langs.includes(lang) || lang === st.lang) return;
    st.lang = lang;
    st.voice = S.resolveVoice(lang, loadPrefs().voice[lang]);
    persist(st);
    // o leitor troca o conteúdo visível para o mesmo idioma (senão o destaque
    // apontaria para um texto que não é o que está sendo falado)
    if (typeof st.cfg.onLangChange === 'function'){ try{ st.cfg.onLangChange(lang); }catch(e){} }
    prepare(st, { autoplay: playing(st) });
  }

  function setScope(st, scope){
    st.scope = scope; persist(st);
    if (scope === 'selection'){
      const hits = sentencesInSelection(st.ranges);
      if (!hits){ note(st, t('selEmpty')); st.scope = 'all'; persist(st); return; }
      st.selIdx = hits;
      note(st, null);
      jumpToSentence(st, 0);
    } else {
      st.selIdx = null;
      note(st, null);
    }
    updateTime(st);
  }

  function note(st, msg, title){
    if (!msg){ st.el.note.hidden = true; st.el.note.textContent = ''; return; }
    st.el.note.hidden = false;
    st.el.note.innerHTML = (title ? `<strong>${esc(title)}</strong> ` : '') + esc(msg);
  }

  /* ------------------------------------------------------------- preparação --- */
  /* Busca o áudio gravado + tabela de tempos. Se não houver, prepara o fallback
     com a voz do aparelho. `resumeAt` retoma na mesma frase (troca de voz). */
  async function prepare(st, opt){
    opt = opt || {};
    st.mode = null;
    st.hl.clear();
    setPlayIcon(st, false);
    note(st, null);
    st.el.label.textContent = st.cfg.title || t('title');
    st.el.time.textContent = t('loading');

    // `base` já termina sem extensão: os dois arquivos (.json com os tempos e .m4a com
    // o áudio) só diferem nela.
    const base = AUDIO_API + S.narrationKey(st.cfg.scopeKey, st.lang, st.voice.id, 'x').replace(/\.x$/, '');
    let data = null;
    try{
      const res = await fetch(base + '.json', { signal: st.abort.signal });
      if (res.ok) data = await res.json();
    }catch(e){ if (e.name === 'AbortError') return; }
    if (active !== st) return;

    const sentences = (data && Array.isArray(data.sentences) && data.sentences.length)
      ? data.sentences.map(s => s.text)
      : (st.cfg.sentences || []);

    st.table  = (data && data.sentences) || sentences.map((text,i)=>({ i, text, start:null, end:null }));
    st.ranges = matchSentencesToDom(st.cfg.contentEl, sentences);

    if (data){
      st.mode = 'audio';
      const audio = st.audio || new Audio();
      st.audio = audio;
      audio.preload = 'auto';
      audio.src = base + '.m4a';
      audio.playbackRate = st.rate;
      bindAudio(st, audio);
    } else {
      st.mode = 'speech';
      if (!('speechSynthesis' in window)){ note(st, t('unsupported')); st.el.time.textContent = '—'; return; }
      note(st, t('noAudio'), t('noAudioTitle'));
    }

    if (st.scope === 'selection'){
      const hits = sentencesInSelection(st.ranges);
      st.selIdx = hits || null;
      if (!hits) st.scope = 'all';
    }

    st.idx = -1;
    updateTime(st);
    if (typeof opt.resumeAt === 'number' && opt.resumeAt >= 0) jumpToSentence(st, listPos(st, opt.resumeAt));
    if (opt.autoplay) play(st);
  }

  /* A lista de frases que está tocando: todas, ou só as da seleção. */
  function activeList(st){
    return st.selIdx ? st.selIdx : st.table.map((_,i)=>i);
  }
  function listPos(st, sentenceIdx){
    const list = activeList(st);
    const p = list.indexOf(sentenceIdx);
    return p < 0 ? 0 : p;
  }

  /* -------------------------------------------------------- modo 1: áudio ---- */
  function bindAudio(st, audio){
    const sig = { signal: st.abort.signal };
    audio.addEventListener('loadedmetadata', () => updateTime(st), sig);
    audio.addEventListener('timeupdate', () => {
      if (active !== st) return;
      syncHighlightFromTime(st);
      updateTime(st);
      // no modo seleção, para quando passa do fim do último trecho selecionado
      if (st.selIdx){
        const last = st.table[st.selIdx[st.selIdx.length-1]];
        if (last && last.end != null && audio.currentTime >= last.end - 0.02) pause(st);
      }
    }, sig);
    audio.addEventListener('ended', () => { setPlayIcon(st, false); st.hl.clear(); st.idx = -1; updateTime(st); }, sig);
    audio.addEventListener('play',  () => setPlayIcon(st, true),  sig);
    audio.addEventListener('pause', () => setPlayIcon(st, false), sig);
    audio.addEventListener('error', () => {
      // o áudio existia no índice mas não abriu: continua funcionando com a voz local
      if (active !== st) return;
      st.mode = 'speech';
      note(st, t('noAudio'), t('noAudioTitle'));
      updateTime(st);
    }, sig);
  }

  function syncHighlightFromTime(st){
    const now = st.audio.currentTime;
    let found = -1;
    // busca binária: a tabela está ordenada por tempo
    let lo = 0, hi = st.table.length - 1;
    while (lo <= hi){
      const mid = (lo + hi) >> 1, s = st.table[mid];
      if (s.start == null){ lo = mid + 1; continue; }
      if (now < s.start) hi = mid - 1;
      else if (now > s.end) lo = mid + 1;
      else { found = mid; break; }
    }
    if (found < 0) found = clamp(lo - 1, 0, st.table.length - 1);
    if (found === st.idx) return;
    st.idx = found;
    st.hl.set(st.ranges[found] || null, true);
    highlightLabel(st, found);
  }

  /* ------------------------------------------- modo 2: voz do aparelho ------- */
  function speakFrom(st, pos){
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const list = activeList(st);
    st.speechPos = clamp(pos, 0, list.length - 1);
    st.speechStop = false;

    const pickSystemVoice = () => {
      const want = st.lang === 'pt' ? /^pt(-|_)?BR/i : /^en(-|_)?US/i;
      const all = synth.getVoices() || [];
      // tenta a voz de mesmo nome (no Mac do usuário existe de verdade), senão
      // qualquer voz do idioma certo
      const byName = all.find(v => v.name && v.name.toLowerCase().startsWith(st.voice.label.toLowerCase()));
      return byName || all.find(v => want.test(v.lang || '')) || all.find(v => (v.lang||'').slice(0,2) === st.lang) || null;
    };

    const step = () => {
      if (active !== st || st.speechStop) return;
      const list2 = activeList(st);
      if (st.speechPos >= list2.length){ setPlayIcon(st, false); st.hl.clear(); st.idx = -1; return; }
      const sIdx = list2[st.speechPos];
      const item = st.table[sIdx];
      st.idx = sIdx;
      st.hl.set(st.ranges[sIdx] || null, true);
      highlightLabel(st, sIdx);
      updateTime(st);

      const u = new SpeechSynthesisUtterance(S.speakable(item.text, st.lang));
      u.lang = st.lang === 'pt' ? 'pt-BR' : 'en-US';
      u.rate = clamp(st.rate, 0.1, 10);
      const v = pickSystemVoice(); if (v) u.voice = v;
      u.onend = () => { if (active === st && !st.speechStop){ st.speechPos++; step(); } };
      u.onerror = () => { if (active === st && !st.speechStop){ st.speechPos++; step(); } };
      st.utter = u;
      synth.speak(u);
    };

    setPlayIcon(st, true);
    // getVoices() costuma vir vazio no primeiro acesso
    if (!(synth.getVoices() || []).length){
      synth.addEventListener('voiceschanged', step, { once:true });
      setTimeout(step, 250);
    } else step();
  }

  /* ------------------------------------------------------------- controles --- */
  function playing(st){
    if (st.mode === 'audio') return !!(st.audio && !st.audio.paused && !st.audio.ended);
    if (st.mode === 'speech') return !!(window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused);
    return false;
  }

  function play(st){
    if (st.mode === 'audio' && st.audio){
      if (st.selIdx && st.idx < 0){ const f = st.table[st.selIdx[0]]; if (f && f.start != null) st.audio.currentTime = f.start; }
      st.audio.playbackRate = st.rate;
      const p = st.audio.play();
      if (p && p.catch) p.catch(()=>{});
      return;
    }
    if (st.mode === 'speech'){
      const synth = window.speechSynthesis;
      if (synth && synth.paused && synth.speaking){ synth.resume(); setPlayIcon(st, true); return; }
      speakFrom(st, st.speechPos != null ? st.speechPos : 0);
    }
  }

  function pause(st){
    if (st.mode === 'audio' && st.audio){ st.audio.pause(); return; }
    if (st.mode === 'speech'){
      const synth = window.speechSynthesis;
      if (synth){ try{ synth.pause(); }catch(e){ st.speechStop = true; synth.cancel(); } }
      setPlayIcon(st, false);
    }
  }

  function togglePlay(st){ playing(st) ? pause(st) : play(st); }

  function seekBy(st, secs){
    if (st.mode === 'audio' && st.audio && isFinite(st.audio.duration)){
      st.audio.currentTime = clamp(st.audio.currentTime + secs, 0, st.audio.duration);
      syncHighlightFromTime(st);
      return;
    }
    // sem linha do tempo real, 10 s ≈ uma frase
    const list = activeList(st);
    const cur = st.speechPos != null ? st.speechPos : 0;
    jumpToSentence(st, clamp(cur + (secs > 0 ? 1 : -1), 0, Math.max(0, list.length - 1)));
  }

  function jumpToSentence(st, pos){
    const list = activeList(st);
    const p = clamp(pos, 0, Math.max(0, list.length - 1));
    const sIdx = list[p];
    if (sIdx == null) return;

    if (st.mode === 'audio' && st.audio){
      const s = st.table[sIdx];
      if (s && s.start != null){ st.audio.currentTime = s.start; syncHighlightFromTime(st); }
      return;
    }
    const wasPlaying = playing(st);
    st.speechPos = p;
    st.idx = sIdx;
    st.hl.set(st.ranges[sIdx] || null, true);
    highlightLabel(st, sIdx);
    updateTime(st);
    if (wasPlaying) speakFrom(st, p);
  }

  /* ------------------------------------------------------------------ UI ----- */
  function setPlayIcon(st, isPlaying){
    if (!st.el.play) return;
    st.el.play.innerHTML = isPlaying ? ICON.pause : ICON.play;
    st.el.play.title = isPlaying ? t('pause') : t('play');
    st.el.play.setAttribute('aria-label', st.el.play.title);
    st.bar.classList.toggle('cm-nar-playing', !!isPlaying);
  }

  /* Mostra na barra o começo da frase que está sendo lida — o usuário enxerga o
     que está sendo narrado mesmo se rolou a página para outro lugar. */
  function highlightLabel(st, sIdx){
    const s = st.table[sIdx];
    const txt = s && s.text ? s.text : '';
    st.el.label.textContent = txt ? (txt.length > 96 ? txt.slice(0,96) + '…' : txt) : (st.cfg.title || t('title'));
  }

  const mmss = s => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s/60), r = Math.floor(s%60);
    return m + ':' + String(r).padStart(2,'0');
  };

  function updateTime(st){
    if (st.mode === 'audio' && st.audio && isFinite(st.audio.duration) && st.audio.duration > 0){
      const cur = st.audio.currentTime, dur = st.audio.duration;
      st.el.time.textContent = mmss(cur) + '/' + mmss(dur);
      if (document.activeElement !== st.el.seek) st.el.seek.value = Math.round((cur/dur)*1000);
      return;
    }
    if (st.mode === 'speech'){
      const list = activeList(st);
      const pos = (st.speechPos != null ? st.speechPos : 0) + 1;
      st.el.time.textContent = pos + ' ' + t('of') + ' ' + list.length;
      if (document.activeElement !== st.el.seek) st.el.seek.value = Math.round((pos/Math.max(1,list.length))*1000);
      return;
    }
    st.el.time.textContent = '0:00/0:00';
  }

  /* ============================================================================
     REFRESH — o leitor reescreveu o conteúdo
     Os leitores substituem o innerHTML do artigo para aplicar marcação de texto,
     destacar resultados de busca ou trocar o tamanho da fonte. Isso invalida duas
     coisas de uma vez: os Range das frases (os nós de texto antigos morreram) e a
     própria camada de destaque (era filha do artigo). Então o reader chama isto
     depois de re-renderizar, e a narração continua de onde estava — sem reiniciar
     o áudio, que é o que o usuário menos quer no meio de uma frase.
     ========================================================================== */
  function refresh(){
    const st = active;
    if (!st) return;
    const sentences = st.table.map(s => s.text);

    try{ st.hl.destroy(); }catch(e){}
    st.hl = Highlighter(st.cfg.contentEl);
    st.ranges = matchSentencesToDom(st.cfg.contentEl, sentences);

    if (st.selIdx){
      // a seleção do usuário não sobrevive a um innerHTML novo: volta pro texto todo
      st.selIdx = null;
      st.scope = 'all';
      persist(st);
    }
    if (st.idx >= 0) st.hl.set(st.ranges[st.idx] || null, false);
  }

  /* Idioma que o narrador está falando agora. O leitor consulta isto para não
     reabrir o narrador quando a troca de idioma partiu do próprio painel dele
     (senão viraria um laço: painel → leitor → reabre narrador → …). */
  function currentLang(){ return active ? active.lang : null; }

  window.CMNarrator = { open, close, isOpen, refresh, currentLang, T, label: () => t('narrate') };
})();
