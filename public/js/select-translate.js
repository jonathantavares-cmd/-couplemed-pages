/* CoupleMed — Tradução por SELEÇÃO de texto (site inteiro)
   ─────────────────────────────────────────────────────────
   Funcionalidade: ao selecionar qualquer palavra, frase ou trecho em qualquer
   página da plataforma, aparece um balão "Traduzir" perto da seleção (no mesmo
   espírito da opção "copiar" do sistema). Ao clicar:
     • Detecta automaticamente o idioma do trecho (EN ou PT);
     • Traduz para o idioma oposto (EN→PT ou PT→EN);
     • Mostra a tradução num popover com botão de copiar e fechar.

   Integração com o padrão do projeto:
     • Usa window.CMI18N.translateText quando disponível (app.html), aproveitando
       o MESMO banco persistente de traduções (localStorage) e as mesmas proteções
       contra respostas ruins da API.
     • Em páginas que não carregam o CMI18N (ex.: index.html), possui um fallback
       interno que usa a MESMA chave de cache ('couplemed_i18n_content_cache_v1')
       e o MESMO formato de chave (targetLang + '::' + texto) — ou seja, o banco
       de traduções é compartilhado e cresce com o uso em todo o site.
     • Módulo 100% autocontido: injeta o próprio CSS, não altera nenhum outro
       arquivo JS/CSS e não interfere em nenhuma funcionalidade existente.
*/
(function(){
  'use strict';

  /* ───────────────────────── config / constantes ───────────────────────── */
  const TRANSLATE_API = 'https://api.mymemory.translated.net/get';
  const CACHE_KEY = 'couplemed_i18n_content_cache_v1'; // mesmo banco do CMI18N
  const CHUNK = 480;
  const MAX_SELECTION = 4000; // limite de segurança para seleções gigantes

  const BAD_TRANSLATION_PATTERNS = [
    /select two distinct languages/i,
    /invalid (source|target) language/i,
    /must be a valid language pair/i,
    /is an invalid target language/i,
    /is an invalid source language/i,
    /mymemory warning/i,
    /quota.*exceeded/i,
    /no translation/i,
  ];
  function isBadTranslation(out){
    if(!out || typeof out!=='string') return true;
    return BAD_TRANSLATION_PATTERNS.some(re=>re.test(out));
  }

  /* rótulos da UI do balão, seguindo o idioma ativo do site */
  const L = {
    en: { translate:'Translate', copy:'Copy', copied:'Copied!', close:'Close', loading:'Translating…', error:'Translation unavailable. Try again.' },
    pt: { translate:'Traduzir', copy:'Copiar', copied:'Copiado!', close:'Fechar', loading:'Traduzindo…', error:'Tradução indisponível. Tente novamente.' }
  };
  function uiLang(){ return document.documentElement.lang === 'pt-BR' ? 'pt' : 'en'; }

  /* ─────────────── fallback de tradução (mesmo banco do CMI18N) ─────────── */
  let bank = null;
  function loadBank(){
    if(bank) return bank;
    try{ bank = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
    catch(e){ bank = {}; }
    return bank;
  }
  let saveTimer = null;
  function saveBankDebounced(){
    if(saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(()=>{
      try{ localStorage.setItem(CACHE_KEY, JSON.stringify(loadBank())); }catch(e){}
    }, 300);
  }
  function bankKey(text, targetLang){ return targetLang + '::' + text; }

  async function translateChunkFallback(text, targetLang, sourceLang){
    const url = `${TRANSLATE_API}?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    try{
      const resp = await fetch(url);
      const data = await resp.json();
      const out = data && data.responseData && data.responseData.translatedText;
      return (out && !isBadTranslation(out)) ? out : null;
    }catch(e){ return null; }
  }
  async function translateTextFallback(text, targetLang, sourceLang){
    const cached = loadBank()[bankKey(text, targetLang)];
    if(cached) return cached;
    let out;
    if(text.length <= CHUNK){
      out = await translateChunkFallback(text, targetLang, sourceLang);
      if(out === null) return null;
    } else {
      const parts = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
      const chunks = []; let cur = '';
      parts.forEach(p=>{
        if((cur+p).length > CHUNK){ if(cur) chunks.push(cur); cur = p; }
        else cur += p;
      });
      if(cur) chunks.push(cur);
      const pieces = [];
      for(const c of chunks){
        const piece = await translateChunkFallback(c, targetLang, sourceLang);
        if(piece === null) return null;
        pieces.push(piece);
      }
      out = pieces.join(' ');
    }
    loadBank()[bankKey(text, targetLang)] = out;
    saveBankDebounced();
    return out;
  }

  /* usa o motor oficial do site quando existir; senão, o fallback compartilhado */
  async function doTranslate(text, targetLang, sourceLang){
    const CM = window.CMI18N;
    if(CM && typeof CM.translateText === 'function'){
      const out = await CM.translateText(text, targetLang, sourceLang);
      // CMI18N devolve o texto original em caso de falha; tratamos igualdade
      // exata como "sem tradução" apenas quando os idiomas diferem.
      if(out && out !== text) return out;
      // pode ser palavra idêntica nos dois idiomas (ex.: "normal") — aceita
      if(out === text && text.length <= 40) return out;
      return out === text ? null : out;
    }
    return translateTextFallback(text, targetLang, sourceLang);
  }

  /* ─────────────── detecção automática do idioma do trecho ─────────────── */
  function detectLang(t){
    if(/[ãõçáéíóúâêôàÃÕÇÁÉÍÓÚÂÊÔÀ]/.test(t)) return 'pt';
    const ptHits = (t.match(/\b(que|não|nao|para|com|uma|um|dos|das|mais|como|por|isso|está|esta|são|sao|você|voce|também|tambem|ser|tem|foi|pela|pelo|seu|sua|ou|em|de|da|do|no|na|os|as|é|paciente|anos|qual|mostra|seguinte)\b/gi)||[]).length;
    const enHits = (t.match(/\b(the|and|of|to|in|is|that|with|for|are|was|which|this|from|has|have|not|but|his|her|he|she|patient|most|likely|following|shows|year|old|what|a|an|on|at|by)\b/gi)||[]).length;
    if(ptHits === 0 && enHits === 0) return 'en'; // conteúdo do site é criado em inglês
    return ptHits > enHits ? 'pt' : 'en';
  }

  /* ───────────────────────────── CSS injetado ───────────────────────────── */
  const css = `
  .cm-sel-bubble{
    position:fixed; z-index:99999; display:flex; align-items:center; gap:6px;
    background:#0d1b32; color:#eaf2ff; border:1px solid rgba(120,170,255,.35);
    border-radius:999px; padding:6px 12px; font:600 13px/1.2 'Segoe UI',system-ui,sans-serif;
    box-shadow:0 6px 22px rgba(0,0,0,.45); cursor:pointer; user-select:none;
    -webkit-user-select:none; transition:transform .12s ease, opacity .12s ease;
    opacity:0; transform:translateY(4px) scale(.96); pointer-events:none;
  }
  .cm-sel-bubble.cm-on{ opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }
  .cm-sel-bubble:hover{ background:#14264a; }
  .cm-sel-bubble svg{ width:14px; height:14px; flex:none; }
  .cm-sel-pop{
    position:fixed; z-index:99999; max-width:min(440px, calc(100vw - 24px));
    background:#0d1b32; color:#eaf2ff; border:1px solid rgba(120,170,255,.35);
    border-radius:14px; padding:12px 14px; font:400 14px/1.5 'Segoe UI',system-ui,sans-serif;
    box-shadow:0 10px 34px rgba(0,0,0,.5);
    opacity:0; transform:translateY(4px); pointer-events:none;
    transition:transform .12s ease, opacity .12s ease;
  }
  .cm-sel-pop.cm-on{ opacity:1; transform:translateY(0); pointer-events:auto; }
  .cm-sel-pop-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:6px; }
  .cm-sel-pop-dir{ font:700 11px/1 'Segoe UI',system-ui,sans-serif; letter-spacing:.08em; color:#8fb7ff; text-transform:uppercase; }
  .cm-sel-pop-actions{ display:flex; gap:6px; }
  .cm-sel-pop-btn{
    background:rgba(120,170,255,.12); color:#cfe0ff; border:1px solid rgba(120,170,255,.3);
    border-radius:8px; padding:3px 9px; font:600 12px/1.2 'Segoe UI',system-ui,sans-serif; cursor:pointer;
  }
  .cm-sel-pop-btn:hover{ background:rgba(120,170,255,.22); }
  .cm-sel-pop-body{ max-height:40vh; overflow:auto; white-space:pre-wrap; word-break:break-word; }
  .cm-sel-pop-body.cm-loading{ color:#9db6de; font-style:italic; }
  body.light-theme .cm-sel-bubble, body.light-theme .cm-sel-pop{
    background:#ffffff; color:#12233f; border-color:rgba(30,80,160,.25);
    box-shadow:0 8px 26px rgba(20,50,110,.22);
  }
  body.light-theme .cm-sel-bubble:hover{ background:#f0f5ff; }
  body.light-theme .cm-sel-pop-dir{ color:#2e63c9; }
  body.light-theme .cm-sel-pop-btn{ background:rgba(46,99,201,.08); color:#2e63c9; border-color:rgba(46,99,201,.3); }
  body.light-theme .cm-sel-pop-btn:hover{ background:rgba(46,99,201,.16); }
  body.light-theme .cm-sel-pop-body.cm-loading{ color:#5b74a0; }
  @media (max-width:640px){
    .cm-sel-bubble{ padding:8px 14px; font-size:14px; }
    .cm-sel-pop{ max-width:calc(100vw - 16px); }
  }`;

  /* ─────────────────────────── elementos da UI ──────────────────────────── */
  let bubble = null, pop = null, currentText = '', hideTimer = null;

  function ensureUI(){
    if(bubble) return;
    const style = document.createElement('style');
    style.id = 'cmSelTranslateCss';
    style.textContent = css;
    document.head.appendChild(style);

    bubble = document.createElement('button');
    bubble.type = 'button';
    bubble.className = 'cm-sel-bubble';
    bubble.setAttribute('aria-label','Translate selection');
    bubble.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'+
      '<path d="M3 5h8M7 3v2M5.5 5c.6 3.2 2.7 6 5.5 7.6M10 5c-.8 3.6-3.3 6.6-6.5 8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'+
      '<path d="M13 19l4-9 4 9M14.3 16.4h5.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
      '<span class="cm-sel-bubble-label"></span>';
    document.body.appendChild(bubble);

    pop = document.createElement('div');
    pop.className = 'cm-sel-pop';
    pop.setAttribute('role','dialog');
    pop.innerHTML =
      '<div class="cm-sel-pop-head">'+
        '<span class="cm-sel-pop-dir"></span>'+
        '<span class="cm-sel-pop-actions">'+
          '<button type="button" class="cm-sel-pop-btn" data-act="copy"></button>'+
          '<button type="button" class="cm-sel-pop-btn" data-act="close">✕</button>'+
        '</span>'+
      '</div>'+
      '<div class="cm-sel-pop-body"></div>';
    document.body.appendChild(pop);

    /* clique no balão = traduzir */
    bubble.addEventListener('mousedown', e=>e.preventDefault()); // preserva a seleção
    bubble.addEventListener('click', onTranslateClick);

    pop.querySelector('[data-act="close"]').addEventListener('click', hidePop);
    pop.querySelector('[data-act="copy"]').addEventListener('click', ()=>{
      const t = pop.querySelector('.cm-sel-pop-body').textContent || '';
      const btn = pop.querySelector('[data-act="copy"]');
      const done = ()=>{ btn.textContent = L[uiLang()].copied; setTimeout(()=>{ btn.textContent = L[uiLang()].copy; }, 1400); };
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(t).then(done).catch(done);
      } else {
        try{
          const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta);
          ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        }catch(e){}
        done();
      }
    });
  }

  function hideBubble(){ if(bubble) bubble.classList.remove('cm-on'); }
  function hidePop(){ if(pop) pop.classList.remove('cm-on'); }

  function placeAt(el, rect){
    const margin = 8;
    el.style.left = '0px'; el.style.top = '0px';
    el.classList.add('cm-on');
    const w = el.offsetWidth, h = el.offsetHeight;
    let x = rect.left + rect.width/2 - w/2;
    let y = rect.top - h - margin;
    if(y < margin) y = rect.bottom + margin;               // sem espaço acima → mostra abaixo
    x = Math.max(margin, Math.min(x, window.innerWidth - w - margin));
    y = Math.max(margin, Math.min(y, window.innerHeight - h - margin));
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  }

  function selectionInfo(){
    const sel = window.getSelection && window.getSelection();
    if(!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const text = String(sel.toString() || '').trim();
    if(!text || text.length < 2) return null;
    /* ignora seleção dentro do próprio balão/popover */
    const anchor = sel.anchorNode && (sel.anchorNode.nodeType===1 ? sel.anchorNode : sel.anchorNode.parentElement);
    if(anchor && (anchor.closest('.cm-sel-bubble') || anchor.closest('.cm-sel-pop'))) return null;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if(!rect || (rect.width === 0 && rect.height === 0)) return null;
    return { text: text.slice(0, MAX_SELECTION), rect };
  }

  function onSelectionSettled(){
    ensureUI();
    const info = selectionInfo();
    if(!info){ hideBubble(); return; }
    currentText = info.text;
    hidePop();
    bubble.querySelector('.cm-sel-bubble-label').textContent = L[uiLang()].translate;
    placeAt(bubble, info.rect);
  }

  async function onTranslateClick(){
    const info = selectionInfo();
    const text = (info && info.text) || currentText;
    if(!text) { hideBubble(); return; }
    const rect = (info && info.rect) || bubble.getBoundingClientRect();
    hideBubble();

    const src = detectLang(text);
    const tgt = src === 'en' ? 'pt' : 'en';
    const dirLabel = (src === 'en' ? 'EN → PT' : 'PT → EN');

    const body = pop.querySelector('.cm-sel-pop-body');
    pop.querySelector('.cm-sel-pop-dir').textContent = dirLabel;
    pop.querySelector('[data-act="copy"]').textContent = L[uiLang()].copy;
    body.classList.add('cm-loading');
    body.textContent = L[uiLang()].loading;
    placeAt(pop, rect);

    const out = await doTranslate(text, tgt, src);
    body.classList.remove('cm-loading');
    if(out){
      body.textContent = out;
    } else {
      body.classList.add('cm-loading');
      body.textContent = L[uiLang()].error;
    }
    /* reposiciona após o conteúdo real (altura mudou) */
    placeAt(pop, rect);
  }

  /* ───────────────────────────── listeners ─────────────────────────────── */
  function scheduleCheck(){
    if(hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(onSelectionSettled, 180);
  }
  document.addEventListener('mouseup', scheduleCheck);
  document.addEventListener('touchend', scheduleCheck);
  document.addEventListener('keyup', e=>{
    /* seleção via teclado (Shift+setas) */
    if(e.shiftKey || e.key==='Shift') scheduleCheck();
  });
  document.addEventListener('selectionchange', ()=>{
    const sel = window.getSelection && window.getSelection();
    if(!sel || sel.isCollapsed){ hideBubble(); }
  });
  document.addEventListener('mousedown', e=>{
    if(pop && !pop.contains(e.target) && bubble && !bubble.contains(e.target)) hidePop();
  });
  window.addEventListener('scroll', ()=>{ hideBubble(); hidePop(); }, true);
  window.addEventListener('resize', ()=>{ hideBubble(); hidePop(); });

  /* exposto para depuração/testes */
  window.CMSelectTranslate = { detectLang };
})();
