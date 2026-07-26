/* CoupleMed — Library 1: leitor de PÁGINA embutido
   ============================================================================
   Abre um tópico da Library 1 DENTRO do site, como página de conteúdo (HTML),
   com a MESMA toolbar da Library 3 (mesmas classes .l3r-*, mesmo CSS) — regra
   do usuário (2026-07-25): toda modificação feita na toolbar de uma Library
   tem de ser feita na outra também. Por isso este arquivo reaproveita
   `public/css/library3-reader.css` inteiro e só acrescenta o que é específico
   de "modo página" em `public/css/library1-reader.css`.

   Diferença essencial para a Library 3:
     - Library 3 = PDF (arquivo pronto), NÃO traduz — só tradução por seleção.
     - Library 1 = página, com o conteúdo gravado nos DOIS idiomas (EN + PT).
       O material de origem vem em inglês e é gravado já traduzido, então a
       troca de idioma é instantânea (nenhuma chamada de tradução ao vivo).
     - Download disponível nos dois idiomas (EN e PT), como HTML autocontido.

   Por não ser PDF, a barra troca o que é específico de arquivo paginado:
     - navegação de página (‹ 1 de N ›)  →  não existe (página única, rolagem)
     - zoom de canvas (%)                →  tamanho da fonte (A− / A+)
     - download do PDF                   →  download EN / PT

   Conteúdo: window.LIBRARY1_CONTENT[folderSlug][topicSlug] = {en:{...},pt:{...}}
   carregado SOB DEMANDA de /js/library1-content/<folderSlug>.js quando o
   tópico é aberto (nunca tudo de uma vez — são 1.838 tópicos).
   Ver LIBRARY1_ADD_CONTENT.md para o fluxo de inclusão do material.
   ============================================================================ */
(function(){
  'use strict';

  const SHARED_CSS  = '/css/library3-reader.css?v=5';   // toolbar compartilhada com a Library 3
  const PAGE_CSS    = '/css/library1-reader.css?v=2';   // específico do modo página
  const CONTENT_DIR = '/js/library1-content/';

  /* ONDE A MÍDIA MORA — ponto único de virada.
     Hoje a mídia é servida do próprio site (pasta public/assets/library1/). Quando o volume
     exigir (ver `node tools/library1-assets.js report`), basta definir
       window.LIBRARY1_ASSET_BASE = '/api/library1/img/lib1/'
     antes deste script para tudo passar a vir do R2, sem tocar em nenhum conteúdo — os
     registros guardam só a CHAVE relativa (<subject>/<topic>/<arquivo>.webp), nunca a URL. */
  const ASSET_BASE = window.LIBRARY1_ASSET_BASE || '/assets/library1/';
  const assetUrl = key => /^(https?:)?\/\//.test(key) || key.startsWith('/') ? key : ASSET_BASE + key;

  const uiLang = () => document.documentElement.lang === 'pt-BR' ? 'pt' : 'en';
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const currentUser = () => new URLSearchParams(location.search).get('u') || 'guest';
  const slugify = s => String(s||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

  /* Mesmas cores e ícones da Library 3 — se mudarem lá, mudar aqui junto. */
  const HL_COLORS = [
    { id:'yellow', v:'#FFE600' },
    { id:'green',  v:'#4CFF6B' },
    { id:'blue',   v:'#00D6FF' },
    { id:'pink',   v:'#FF3EC9' }
  ];
  const ERASER_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M18.7 13.1 11 20.8H6.3l-3.5-3.5a2 2 0 0 1 0-2.8l9-9a2 2 0 0 1 2.8 0l4.1 4.1a2 2 0 0 1 0 2.8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M12.7 10.4 18 15.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M6.3 20.8h12.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
  const CURSOR_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M5 3.5 19 10l-6.1 2.2L10.4 19 5 3.5Z" fill="currentColor"/>
  </svg>`;
  const MARKER_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="m6 16 8.7-11a1.8 1.8 0 0 1 2.6-.2l1.8 1.5a1.8 1.8 0 0 1 .2 2.6L10.5 20H6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m13.2 7 4 3.2M4 20h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

  const T = {
    en: { loading:'Loading…', loadError:'This topic has no content yet.',
          download:'Download', downloadEn:'Download (English)', downloadPt:'Download (Portuguese)',
          search:'Search in this page…', of:'of', hl:'Highlight', flashcard:'Flashcard',
          notebook:'Notebook', notes:'Notes', back:'Back', customColor:'Custom color',
          eraserToggle:'Eraser options', eraserClick:'Click a highlight to remove it',
          undo:'Undo', redo:'Redo', more:'More tools', colors:'Colors',
          fontSmaller:'Smaller text', fontBigger:'Bigger text', language:'Language', close:'Close',
          empty:'Content for this topic has not been added yet.',
          emptyHint:'It will appear here as soon as the material is included.' },
    pt: { loading:'Carregando…', loadError:'Este tópico ainda não tem conteúdo.',
          download:'Baixar', downloadEn:'Baixar (Inglês)', downloadPt:'Baixar (Português)',
          search:'Buscar nesta página…', of:'de', hl:'Marcar', flashcard:'Flashcard',
          notebook:'Notebook', notes:'Notes', back:'Voltar', customColor:'Cor personalizada',
          eraserToggle:'Opções de borracha', eraserClick:'Clique numa marcação pra apagar',
          undo:'Desfazer', redo:'Refazer', more:'Mais ferramentas', colors:'Cores',
          fontSmaller:'Diminuir texto', fontBigger:'Aumentar texto', language:'Idioma', close:'Fechar',
          empty:'O conteúdo deste tópico ainda não foi incluído.',
          emptyHint:'Ele aparecerá aqui assim que o material for adicionado.' }
  };
  const t = k => T[uiLang()][k];

  /* ---------------------------- carregamento de recursos ---------------------------- */
  function ensureStylesheet(id, href){
    const existing = document.getElementById(id);
    if(existing) return existing.dataset.loaded==='1' ? Promise.resolve() : new Promise(res=>{
      existing.addEventListener('load', ()=>res(), {once:true});
      existing.addEventListener('error', ()=>res(), {once:true});
    });
    return new Promise(res=>{
      const link = document.createElement('link');
      link.id = id; link.rel = 'stylesheet'; link.href = href;
      link.addEventListener('load', ()=>{ link.dataset.loaded='1'; res(); }, {once:true});
      link.addEventListener('error', ()=>{ link.dataset.loaded='1'; res(); }, {once:true});
      document.head.appendChild(link);
    });
  }

  // Um arquivo por Subject (ver LIBRARY1_ADD_CONTENT.md §5) — carregado só quando
  // um tópico daquele Subject é aberto pela primeira vez.
  const contentPromises = {};
  function loadSubjectContent(folderSlug){
    if(contentPromises[folderSlug]) return contentPromises[folderSlug];
    contentPromises[folderSlug] = new Promise(res=>{
      const s = document.createElement('script');
      s.src = CONTENT_DIR + folderSlug + '.js';
      s.addEventListener('load', ()=>res(true), {once:true});
      s.addEventListener('error', ()=>res(false), {once:true});  // sem conteúdo ainda = estado válido
      document.head.appendChild(s);
    });
    return contentPromises[folderSlug];
  }

  function lookupContent(folderSlug, topicSlug){
    const all = window.LIBRARY1_CONTENT || {};
    const subject = all[folderSlug];
    return subject ? (subject[topicSlug] || null) : null;
  }

  /* ---------------------------- estado ---------------------------- */
  let activeReader = null;
  function destroyActive(){
    if(!activeReader) return;
    try{ closeLightbox(activeReader); }catch(e){}
    try{ activeReader.uiAbort && activeReader.uiAbort.abort(); }catch(e){}
    activeReader = null;
  }

  function itemName(it, lang){ return (lang==='pt' && it && it.ptName) ? it.ptName : (it ? it.name : ''); }

  /* ---------------------------- abertura ---------------------------- */
  function open(hostEl, topic, folder, onBack){
    const folderSlug = slugify(folder.name);
    const topicSlug  = slugify(topic.name);
    const sameTopic = activeReader && activeReader.topicSlug===topicSlug && activeReader.folderSlug===folderSlug;

    const r = sameTopic ? activeReader : {
      hostEl, topic, folder, onBack, folderSlug, topicSlug,
      lang: uiLang(),   // segue o idioma global do site desde a abertura
      fontScale: 1,
      actions: [], redoActions: [],
      hlColor: HL_COLORS[0].v,
      eraseMode: null,
      searchHits: [], searchIdx: -1
    };
    r.hostEl = hostEl; r.onBack = onBack; r.topic = topic; r.folder = folder;
    activeReader = r;

    Promise.all([
      ensureStylesheet('l3rReaderCss', SHARED_CSS),
      ensureStylesheet('l1rReaderCss', PAGE_CSS)
    ]).then(()=>{
      renderSkeleton(r);
      setLoading(r, true);
      return loadSubjectContent(folderSlug);
    }).then(()=>{
      if(activeReader!==r) return;
      r.content = lookupContent(folderSlug, topicSlug);
      r.actions = loadHighlights(r);
      setLoading(r, false);
      renderArticle(r);
    });
  }

  /* ---------------------------- esqueleto / toolbar ----------------------------
     Espelha a toolbar da Library 3 (library3-reader.js, renderSkeleton). Mesmas
     classes .l3r-* de propósito: o CSS é literalmente o mesmo arquivo, então
     qualquer ajuste visual feito lá vale aqui automaticamente. O que muda é só
     o grupo da direita da barra de baixo (idioma + tamanho de fonte no lugar de
     página + zoom), porque página não é PDF paginado.
  ------------------------------------------------------------------------------ */
  function renderSkeleton(r){
    try{ r.uiAbort && r.uiAbort.abort(); }catch(e){}
    r.uiAbort = new AbortController();
    const lang = uiLang();
    const title = `${esc(itemName(r.folder, lang))} · ${esc(itemName(r.topic, lang))}`;

    r.hostEl.innerHTML = `
      <div class="l3r l1r" id="l1rRoot">
        <div class="l3r-toolbar">
          <button type="button" class="l3r-back" id="l1rBack">‹ ${esc(t('back'))}</button>
          <div class="l3r-title" id="l1rTitle">${title}</div>
          <div class="l3r-group l3r-search">
            <input type="text" id="l1rSearchInput" placeholder="${esc(t('search'))}" />
            <span id="l1rSearchCount" class="l3r-searchcount"></span>
          </div>
          <div class="l3r-group l1r-dl-group">
            <button type="button" class="l3r-btn l3r-download l1r-dl" id="l1rDownloadEn" title="${esc(t('downloadEn'))}">⬇ EN</button>
            <button type="button" class="l3r-btn l3r-download l1r-dl" id="l1rDownloadPt" title="${esc(t('downloadPt'))}">⬇ PT</button>
          </div>
        </div>
        <div class="l3r-body">
          <div class="l3r-toolbar l3r-toolbar-bottom">
            <div class="l3r-group l3r-marktools">
              <button type="button" class="l3r-ic l3r-highlighter" id="l1rHighlightBtn" aria-label="${esc(t('hl'))}" title="${esc(t('hl'))}">${MARKER_SVG}</button>
              ${HL_COLORS.map(c=>`<button type="button" class="l3r-swatch" data-color="${c.v}" style="background:${c.v}" title="${esc(t('hl'))}"></button>`).join('')}
              <button type="button" class="l3r-swatch l3r-swatch-add" id="l1rCustomColorBtn" title="${esc(t('customColor'))}">+</button>
              <input type="color" id="l1rCustomColor" class="l3r-custom-color-input" value="#ff8a3d" tabindex="-1" aria-hidden="true" />
              <span class="l3r-marktools-sep"></span>
              <button type="button" class="l3r-ic l3r-eraser" id="l1rEraserToggleBtn" aria-label="${esc(t('eraserToggle'))}" title="${esc(t('eraserToggle'))}">${ERASER_SVG}</button>
              <span class="l3r-erase-menu" id="l1rEraseMenu">
                <button type="button" class="l3r-ic l3r-erase-click" id="l1rEraserClickBtn" aria-label="${esc(t('eraserClick'))}" title="${esc(t('eraserClick'))}">${CURSOR_SVG}</button>
              </span>
              <span class="l3r-marktools-sep"></span>
              <button type="button" class="l3r-ic" id="l1rUndo" aria-label="${esc(t('undo'))}" title="${esc(t('undo'))}">←</button>
              <button type="button" class="l3r-ic" id="l1rRedo" aria-label="${esc(t('redo'))}" title="${esc(t('redo'))}">→</button>
              <span class="l3r-marktools-sep"></span>
              <button type="button" class="l3r-btn l3r-marktools-btn" id="l1rNotebookBtn"><i>N</i>${esc(t('notebook'))}</button>
              <button type="button" class="l3r-btn l3r-marktools-btn" id="l1rNotesBtn"><i>≣</i>${esc(t('notes'))}</button>
              <button type="button" class="l3r-btn l3r-marktools-btn" id="l1rFlashcardBtn"><i>F</i>${esc(t('flashcard'))}</button>
            </div>
            <div class="l3r-group l3r-zoom">
              <button type="button" class="l3r-ic" id="l1rFontDown" aria-label="${esc(t('fontSmaller'))}" title="${esc(t('fontSmaller'))}">A−</button>
              <span id="l1rFontLabel">100%</span>
              <button type="button" class="l3r-ic" id="l1rFontUp" aria-label="${esc(t('fontBigger'))}" title="${esc(t('fontBigger'))}">A+</button>
            </div>
          </div>
          <div class="l1r-pagewrap" id="l1rPageWrap">
            <div class="l3r-loading" id="l1rLoading">${esc(t('loading'))}</div>
            <article class="l1r-article" id="l1rArticle"></article>
          </div>
        </div>
      </div>`;

    r.el = {
      root: r.hostEl.querySelector('#l1rRoot'),
      loading: r.hostEl.querySelector('#l1rLoading'),
      article: r.hostEl.querySelector('#l1rArticle'),
      searchInput: r.hostEl.querySelector('#l1rSearchInput'),
      searchCount: r.hostEl.querySelector('#l1rSearchCount'),
      fontLabel: r.hostEl.querySelector('#l1rFontLabel'),
      eraseMenu: r.hostEl.querySelector('#l1rEraseMenu'),
      eraserToggleBtn: r.hostEl.querySelector('#l1rEraserToggleBtn'),
      eraserClickBtn: r.hostEl.querySelector('#l1rEraserClickBtn'),
      highlightBtn: r.hostEl.querySelector('#l1rHighlightBtn'),
      undoBtn: r.hostEl.querySelector('#l1rUndo'),
      redoBtn: r.hostEl.querySelector('#l1rRedo')
    };

    const on = (sel, ev, fn) => {
      const el = r.hostEl.querySelector(sel);
      if(el) el.addEventListener(ev, fn, { signal: r.uiAbort.signal });
    };

    on('#l1rBack','click', ()=>{ destroyActive(); if(r.onBack) r.onBack(); });

    /* ---- idioma: segue o tradutor GLOBAL do site ----
       O conteúdo não tem botão de idioma próprio: ele obedece às bandeiras do topo, como
       todo o resto do site. `setLang()` (site.js) dispara 'couplemed:langchange' ao trocar,
       e aqui a página inteira — texto, imagens, figuras e tabelas — troca junto, na hora,
       porque as duas versões já estão gravadas (nenhuma tradução ao vivo). */
    window.addEventListener('couplemed:langchange', e=>{
      const lang = (e.detail && e.detail.lang) || uiLang();
      setLang(r, lang);
    }, { signal: r.uiAbort.signal });

    /* ---- tamanho da fonte (equivalente ao zoom do PDF) ---- */
    on('#l1rFontDown','click', ()=> setFontScale(r, r.fontScale-0.1));
    on('#l1rFontUp','click',   ()=> setFontScale(r, r.fontScale+0.1));

    /* ---- download EN / PT ---- */
    on('#l1rDownloadEn','click', ()=> downloadArticle(r,'en'));
    on('#l1rDownloadPt','click', ()=> downloadArticle(r,'pt'));

    /* ---- busca no texto da página ---- */
    let searchTimer = null;
    on('#l1rSearchInput','input', ()=>{
      clearTimeout(searchTimer);
      searchTimer = setTimeout(()=> runSearch(r, r.el.searchInput.value), 300);
    });
    on('#l1rSearchInput','keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); e.shiftKey ? searchStep(r,-1) : searchStep(r,1); }
    });

    /* ---- marcação ---- */
    r.hostEl.querySelectorAll('.l3r-swatch[data-color]').forEach(btn=>{
      btn.addEventListener('mousedown', e=>e.preventDefault(), { signal: r.uiAbort.signal });
      btn.addEventListener('click', ()=>{
        r.hlColor = btn.dataset.color;
        r.hostEl.querySelectorAll('.l3r-swatch[data-color]').forEach(x=>x.classList.toggle('l3r-swatch-active', x===btn));
        addHighlightFromSelection(r, btn.dataset.color);
      }, { signal: r.uiAbort.signal });
    });
    const customInput = r.hostEl.querySelector('#l1rCustomColor');
    on('#l1rCustomColorBtn','click', ()=> customInput && customInput.click());
    if(customInput) customInput.addEventListener('change', ()=>{
      r.hlColor = customInput.value;
      addHighlightFromSelection(r, customInput.value);
    }, { signal: r.uiAbort.signal });

    on('#l1rHighlightBtn','click', ()=> addHighlightFromSelection(r, r.hlColor));

    on('#l1rEraserToggleBtn','click', ()=>{
      const open = r.el.eraseMenu.classList.toggle('l3r-erase-menu-open');
      if(!open) setEraseMode(r, null);
    });
    on('#l1rEraserClickBtn','click', ()=> setEraseMode(r, r.eraseMode==='click' ? null : 'click'));

    on('#l1rUndo','click', ()=> undo(r));
    on('#l1rRedo','click', ()=> redo(r));

    /* ---- enviar seleção para Notebook / Notes / Flashcard (mesmo ?prefill= da Library 3) ---- */
    on('#l1rNotebookBtn','click',  ()=> sendSelectionTo(r,'notebook'));
    on('#l1rNotesBtn','click',     ()=> sendSelectionTo(r,'notes'));
    on('#l1rFlashcardBtn','click', ()=> sendSelectionTo(r,'flashcard'));

    /* ---- clique no artigo: apagar marcação (borracha), referência ou imagem ---- */
    r.el.article.addEventListener('click', e=>{
      if(r.eraseMode==='click'){
        const mark = e.target.closest && e.target.closest('.l1r-hl');
        if(mark){ removeHighlight(r, mark.dataset.hlId); return; }
      }
      // referência inline no texto: "image 1", "figure 2", "table 3"
      const ref = e.target.closest && e.target.closest('[data-ref]');
      if(ref){ e.preventDefault(); openLightbox(r, ref.dataset.ref); return; }
      // a página não mostra imagem aberta; só a referência abre (regra do usuário)
    }, { signal: r.uiAbort.signal });

    updateFontLabel(r);
    updateHistoryButtons(r);
  }

  /* ---------------------------- imagem ampliada (lightbox) ----------------------------
     O material da Library 1 vem de prints e traz muita figura que é conteúdo de verdade
     (diagramas, algoritmos, fotos clínicas, tabelas em imagem). No original elas moram num
     painel lateral e são abertas clicando na referência do texto ("image 1", "figure 2") —
     aqui é igual, e o lightbox sempre mostra a versão do IDIOMA CORRENTE. Trocar EN/PT com
     a imagem aberta troca a imagem na hora.
     Fecha com clique fora, com o ✕ ou com Esc; ‹ › andam entre os itens do mesmo grupo.
  ------------------------------------------------------------------------------------- */
  function assetList(r, kind){
    const all = (r.content && r.content.assets) || {};
    return Object.keys(all)
      .filter(k => !kind || all[k].kind === kind)
      .sort((a,b) => (all[a].n||0) - (all[b].n||0));
  }
  // Devolve {src, alt} já com a URL resolvida (a chave crua vira caminho do site ou do R2).
  function assetSrc(r, refKey, lang){
    const a = (r.content && r.content.assets && r.content.assets[refKey]) || null;
    if(!a) return null;
    const v = a[lang] || a.en || a.pt || null;
    if(!v) return null;
    return { src: assetUrl(v.key || v.src), alt: v.alt || '' };
  }

  function openLightbox(r, refKey){
    const a = (r.content && r.content.assets && r.content.assets[refKey]) || null;
    if(!a) return;
    closeLightbox(r);
    const box = document.createElement('div');
    box.className = 'l1r-lightbox';
    box.innerHTML = `
      <button type="button" class="l1r-lb-close" aria-label="${esc(t('close'))}" title="${esc(t('close'))}">✕</button>
      <button type="button" class="l1r-lb-nav l1r-lb-prev" data-lb-nav="-1" aria-label="prev">‹</button>
      <button type="button" class="l1r-lb-nav l1r-lb-next" data-lb-nav="1" aria-label="next">›</button>
      <img alt="" /><figcaption></figcaption>`;
    box.addEventListener('click', e=>{
      const nav = e.target.closest('[data-lb-nav]');
      if(nav){ stepLightbox(r, Number(nav.dataset.lbNav)); return; }
      if(e.target===box || e.target.closest('.l1r-lb-close')) closeLightbox(r);
    });
    document.body.appendChild(box);
    r.lightbox = box;
    r.lightboxKey = refKey;
    paintLightbox(r);
    if(!r.lbKeyHandler){
      r.lbKeyHandler = e=>{
        if(!r.lightbox) return;
        if(e.key==='Escape') closeLightbox(r);
        else if(e.key==='ArrowRight') stepLightbox(r, 1);
        else if(e.key==='ArrowLeft')  stepLightbox(r, -1);
      };
      document.addEventListener('keydown', r.lbKeyHandler);
    }
  }
  // Repinta com o idioma corrente — é o que faz a imagem trocar junto com o texto.
  function paintLightbox(r){
    if(!r.lightbox || !r.lightboxKey) return;
    const a = r.content.assets[r.lightboxKey];
    const v = assetSrc(r, r.lightboxKey, r.lang);
    if(!v) return;
    const img = r.lightbox.querySelector('img');
    img.setAttribute('src', v.src);
    img.setAttribute('alt', v.alt || '');
    const cap = r.lightbox.querySelector('figcaption');
    cap.textContent = v.alt || '';
    cap.hidden = !v.alt;
    const group = assetList(r, a.kind);
    const many = group.length > 1;
    r.lightbox.querySelectorAll('.l1r-lb-nav').forEach(b=> b.hidden = !many);
  }
  function stepLightbox(r, dir){
    if(!r.lightboxKey) return;
    const a = r.content.assets[r.lightboxKey];
    const group = assetList(r, a.kind);
    const i = group.indexOf(r.lightboxKey);
    if(i < 0 || group.length < 2) return;
    r.lightboxKey = group[(i + dir + group.length) % group.length];
    paintLightbox(r);
  }
  function closeLightbox(r){
    if(r.lightbox && r.lightbox.parentNode) r.lightbox.parentNode.removeChild(r.lightbox);
    r.lightbox = null;
    r.lightboxKey = null;
    if(r.lbKeyHandler){ document.removeEventListener('keydown', r.lbKeyHandler); r.lbKeyHandler = null; }
  }

  function setLoading(r, on, error){
    if(!r.el || !r.el.loading) return;
    r.el.loading.hidden = !on && !error;
    if(error){ r.el.loading.hidden=false; r.el.loading.textContent = error; r.el.loading.classList.add('l3r-loading-error'); }
    else { r.el.loading.textContent = t('loading'); r.el.loading.classList.remove('l3r-loading-error'); }
  }

  /* ---------------------------- idioma ---------------------------- */
  function setLang(r, lang){
    if(r.lang===lang) return;
    r.lang = lang;
    renderSkeletonLabels(r);   // rótulos da própria toolbar
    renderArticle(r);          // texto + imagens/figuras/tabelas embutidas
    paintLightbox(r);          // imagem aberta troca de idioma junto com o texto
  }
  // Só os rótulos da toolbar; não remonta a barra (perderia o estado das ferramentas).
  function renderSkeletonLabels(r){
    const lang = r.lang;
    const set = (sel, txt) => { const el = r.hostEl.querySelector(sel); if(el) el.textContent = txt; };
    set('#l1rBack', '‹ ' + T[lang].back);
    set('#l1rTitle', `${itemName(r.folder, lang)} · ${itemName(r.topic, lang)}`);
    const si = r.hostEl.querySelector('#l1rSearchInput');
    if(si) si.setAttribute('placeholder', T[lang].search);
    set('#l1rNotebookBtn', T[lang].notebook);
    set('#l1rNotesBtn', T[lang].notes);
    set('#l1rFlashcardBtn', T[lang].flashcard);
    // os <i> dos botões são reescritos pelo textContent acima — repõe o marcador
    const ic = { l1rNotebookBtn:'N', l1rNotesBtn:'≣', l1rFlashcardBtn:'F' };
    Object.entries(ic).forEach(([id, ch])=>{
      const b = r.hostEl.querySelector('#'+id);
      if(b && !b.querySelector('i')) b.insertAdjacentHTML('afterbegin', `<i>${ch}</i>`);
    });
  }

  /* ---------------------------- fonte ---------------------------- */
  function setFontScale(r, s){
    r.fontScale = Math.min(1.8, Math.max(0.7, Math.round(s*100)/100));
    if(r.el && r.el.article) r.el.article.style.fontSize = (r.fontScale*100)+'%';
    updateFontLabel(r);
  }
  function updateFontLabel(r){
    if(r.el && r.el.fontLabel) r.el.fontLabel.textContent = Math.round(r.fontScale*100)+'%';
  }

  /* ---------------------------- render do artigo ---------------------------- */
  function articleBody(r, lang){
    if(!r.content) return null;
    return r.content[lang] || r.content.en || r.content.pt || null;
  }

  function renderArticle(r){
    const body = articleBody(r, r.lang);
    if(!body){
      r.el.article.innerHTML = `<div class="l1r-empty"><p>${esc(t('empty'))}</p><small>${esc(t('emptyHint'))}</small></div>`;
      return;
    }
    r.el.article.innerHTML = `<h1 class="l1r-h1">${esc(body.title || itemName(r.topic, r.lang))}</h1>${body.html || ''}`;
    r.el.article.style.fontSize = (r.fontScale*100)+'%';
    r.baseHtml = r.el.article.innerHTML;
    applyAllHighlights(r);
    if(r.el.searchInput.value.trim()) runSearch(r, r.el.searchInput.value);
  }

  /* ------------------- mídia: abre SÓ ao clicar na referência -------------------
     Regra do usuário (2026-07-25): a imagem NÃO aparece aberta na página. A página é só o
     texto; imagens, figuras e tabelas abrem em tela cheia quando se clica no nome delas no
     meio do texto ("image 1", "figure 2", "table 3") — igual ao material de origem.

     Por isso o que importa na transcrição é a REFERÊNCIA estar no ponto certo do texto,
     exatamente onde o material a cita. Mídia que não for referenciada em nenhum lugar fica
     inalcançável — é justamente isso que `node tools/library1-audit.js` acusa (§11.1).
  ------------------------------------------------------------------------------- */

  /* ---------------------------- marcação (highlight) ----------------------------
     Em PDF a marcação é geométrica (retângulos sobre o canvas). Aqui o conteúdo é
     texto real, então guardamos deslocamentos de caractere sobre o texto puro do
     artigo — estável porque o conteúdo é estático. Cada idioma tem seus próprios
     deslocamentos (os textos têm tamanhos diferentes), por isso a marcação é
     gravada com o idioma junto.
  ------------------------------------------------------------------------------ */
  function hlKey(){ return `couplemed_lib1hl_${currentUser()}`; }
  function loadAllHighlights(){
    try{ return JSON.parse(localStorage.getItem(hlKey())||'{}') || {}; }catch(e){ return {}; }
  }
  function saveAllHighlights(all){
    try{ localStorage.setItem(hlKey(), JSON.stringify(all)); }catch(e){}
  }
  function topicKey(r){ return `${r.folderSlug}/${r.topicSlug}`; }
  function loadHighlights(r){
    const all = loadAllHighlights();
    return Array.isArray(all[topicKey(r)]) ? all[topicKey(r)] : [];
  }
  function persistHighlights(r){
    const all = loadAllHighlights();
    all[topicKey(r)] = r.actions;
    saveAllHighlights(all);
  }
  function genId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

  function textNodesIn(root){
    const out = [];
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n; while((n = walk.nextNode())) out.push(n);
    return out;
  }

  // Deslocamento de um ponto do range no texto puro do artigo.
  // Medir com um Range auxiliar (em vez de procurar o nó de texto na lista) é o que
  // torna isso correto quando o ponto cai num ELEMENTO e não num nó de texto — que é
  // o caso comum de verdade: parágrafo inteiro, triplo-clique, ou arrasto que começa
  // antes da primeira letra. Nessas situações o offset é índice de FILHO, não de
  // caractere, e comparar por nó de texto simplesmente nunca casava.
  function offsetOfPoint(root, container, offset){
    try{
      const probe = document.createRange();
      probe.selectNodeContents(root);
      probe.setEnd(container, offset);
      return probe.toString().length;
    }catch(e){ return -1; }
  }

  // Deslocamento (start,end) da seleção atual dentro do texto puro do artigo.
  function selectionOffsets(r){
    const sel = window.getSelection && window.getSelection();
    if(!sel || sel.isCollapsed || sel.rangeCount===0) return null;
    const range = sel.getRangeAt(0);
    const anchor = range.commonAncestorContainer;
    const anchorEl = anchor.nodeType===1 ? anchor : anchor.parentElement;
    if(!anchorEl || !r.el.article.contains(anchorEl)) return null;

    const start = offsetOfPoint(r.el.article, range.startContainer, range.startOffset);
    const end   = offsetOfPoint(r.el.article, range.endContainer, range.endOffset);
    if(start<0 || end<0 || end<=start) return null;
    return { start, end, text: sel.toString() };
  }

  function addHighlightFromSelection(r, colorHex){
    const off = selectionOffsets(r);
    if(!off) return;
    const action = { id: genId(), lang: r.lang, start: off.start, end: off.end, color: colorHex };
    r.actions.push(action);
    r.redoActions = [];
    persistHighlights(r);
    const sel = window.getSelection && window.getSelection();
    if(sel) sel.removeAllRanges();
    applyAllHighlights(r);
    updateHistoryButtons(r);
  }

  function removeHighlight(r, id){
    const i = r.actions.findIndex(a=>a.id===id);
    if(i<0) return;
    r.redoActions.push(r.actions.splice(i,1)[0]);
    persistHighlights(r);
    applyAllHighlights(r);
    updateHistoryButtons(r);
  }

  function undo(r){
    if(!r.actions.length) return;
    r.redoActions.push(r.actions.pop());
    persistHighlights(r); applyAllHighlights(r); updateHistoryButtons(r);
  }
  function redo(r){
    if(!r.redoActions.length) return;
    r.actions.push(r.redoActions.pop());
    persistHighlights(r); applyAllHighlights(r); updateHistoryButtons(r);
  }
  function updateHistoryButtons(r){
    if(!r.el) return;
    if(r.el.undoBtn) r.el.undoBtn.disabled = !r.actions.length;
    if(r.el.redoBtn) r.el.redoBtn.disabled = !r.redoActions.length;
  }

  // Envolve o intervalo [start,end) do texto puro num <span>, quebrando por nó.
  function wrapRange(root, start, end, make){
    let acc = 0;
    const targets = [];
    for(const node of textNodesIn(root)){
      const len = node.nodeValue.length;
      const nodeStart = acc, nodeEnd = acc + len;
      acc = nodeEnd;
      if(nodeEnd<=start || nodeStart>=end) continue;
      targets.push({ node, from: Math.max(0, start-nodeStart), to: Math.min(len, end-nodeStart) });
    }
    // de trás pra frente: dividir um nó não desloca os que ainda faltam
    for(let i=targets.length-1; i>=0; i--){
      const { node, from, to } = targets[i];
      if(to<=from) continue;
      let target = node;
      if(to < target.nodeValue.length) target.splitText(to);
      if(from > 0) target = target.splitText(from);
      const span = make();
      target.parentNode.insertBefore(span, target);
      span.appendChild(target);
    }
  }

  function applyAllHighlights(r){
    if(!r.el || !r.el.article || r.baseHtml==null) return;
    r.el.article.innerHTML = r.baseHtml;
    r.actions.filter(a=>a.lang===r.lang).forEach(a=>{
      wrapRange(r.el.article, a.start, a.end, ()=>{
        const span = document.createElement('span');
        span.className = 'l1r-hl';
        span.dataset.hlId = a.id;
        span.style.background = a.color;
        return span;
      });
    });
  }

  function setEraseMode(r, mode){
    r.eraseMode = mode;
    if(r.el.eraserClickBtn) r.el.eraserClickBtn.classList.toggle('l3r-ic-active', mode==='click');
    if(r.el.eraserToggleBtn) r.el.eraserToggleBtn.classList.toggle('l3r-ic-active', !!mode);
    if(r.el.article) r.el.article.classList.toggle('l1r-erasing', mode==='click');
  }

  /* ---------------------------- busca ---------------------------- */
  function runSearch(r, query){
    const q = String(query||'').trim();
    applyAllHighlights(r);           // limpa marcas de busca anteriores
    r.searchHits = []; r.searchIdx = -1;
    if(!q){ r.el.searchCount.textContent=''; return; }

    const hay = textNodesIn(r.el.article).map(n=>n.nodeValue).join('');
    const needle = q.toLowerCase();
    const lower = hay.toLowerCase();
    const ranges = [];
    let from = 0, at;
    while((at = lower.indexOf(needle, from)) !== -1){
      ranges.push([at, at+needle.length]);
      from = at + needle.length;
      if(ranges.length>500) break;
    }
    for(let i=ranges.length-1; i>=0; i--){
      wrapRange(r.el.article, ranges[i][0], ranges[i][1], ()=>{
        const span = document.createElement('span');
        span.className = 'l1r-hit';
        return span;
      });
    }
    r.searchHits = Array.from(r.el.article.querySelectorAll('.l1r-hit'));
    r.el.searchCount.textContent = r.searchHits.length ? `1 ${t('of')} ${r.searchHits.length}` : '0';
    if(r.searchHits.length){ r.searchIdx = 0; focusHit(r); }
  }
  function searchStep(r, dir){
    if(!r.searchHits.length) return;
    r.searchIdx = (r.searchIdx + dir + r.searchHits.length) % r.searchHits.length;
    focusHit(r);
  }
  function focusHit(r){
    r.searchHits.forEach((el,i)=> el.classList.toggle('l1r-hit-active', i===r.searchIdx));
    const el = r.searchHits[r.searchIdx];
    if(el) el.scrollIntoView({ block:'center', behavior:'smooth' });
    r.el.searchCount.textContent = `${r.searchIdx+1} ${t('of')} ${r.searchHits.length}`;
  }

  /* ---------------------------- notebook / notes / flashcard ---------------------------- */
  function sendSelectionTo(r, act){
    const sel = window.getSelection && window.getSelection();
    const anchor = sel && sel.anchorNode && (sel.anchorNode.nodeType===1 ? sel.anchorNode : sel.anchorNode.parentElement);
    if(!anchor || !anchor.closest('#l1rArticle')) return;
    const text = sel ? sel.toString().trim() : '';
    if(!text) return;
    const page = act==='flashcard' ? 'flashcards' : (act==='notes' ? 'notes' : 'notebooks');
    location.href = `app.html?page=${page}&u=${encodeURIComponent(currentUser())}&prefill=${encodeURIComponent(text)}`;
  }

  /* ---------------------------- download (EN / PT) ----------------------------
     Gera um HTML autocontido do artigo no idioma pedido — funciona offline e
     imprime/converte pra PDF pelo próprio navegador. A Library 3 baixa o PDF
     original; aqui não existe "arquivo original", o conteúdo É a página.
  ------------------------------------------------------------------------------ */
  function downloadArticle(r, lang){
    const body = articleBody(r, lang);
    if(!body) return;
    const title = body.title || itemName(r.topic, lang);
    const subject = itemName(r.folder, lang);
    const doc = `<!doctype html>
<html lang="${lang==='pt'?'pt-BR':'en'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.65;color:#12243d;max-width:820px;margin:0 auto;padding:40px 24px}
  h1{font-size:26px;line-height:1.25;margin:0 0 4px}
  .src{color:#6b7f9e;font-size:13px;margin:0 0 28px}
  h2{font-size:19px;margin:28px 0 8px} h3{font-size:16px;margin:22px 0 6px}
  table{border-collapse:collapse;width:100%;margin:16px 0} th,td{border:1px solid #d7deea;padding:8px 10px;text-align:left;vertical-align:top}
  th{background:#f2f5fa} img{max-width:100%;height:auto} ul,ol{padding-left:22px}
  @media print{body{padding:0}}
</style></head>
<body>
<h1>${esc(title)}</h1>
<p class="src">CoupleMed · Medical Library · Library 1 · ${esc(subject)}</p>
${body.html || ''}
</body></html>`;

    const blob = new Blob([doc], { type:'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(title)}-${lang}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  window.CMLibrary1Reader = { open, close: destroyActive };
})();
