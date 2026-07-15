/* CoupleMed — Library 3: leitor de PDF embutido (piloto)
   ============================================================================
   Abre um PDF da Library 3 DENTRO do site (em vez de nova aba), com:
     - navegação paginada (PDFPageView do próprio PDF.js — canvas + camada de
       texto de verdade, selecionável);
     - zoom, busca por texto, download do arquivo original;
     - marcação (highlight) de trechos, persistida por usuário e sincronizada
       entre aparelhos via a mesma camada genérica de `cm-sync.js`;
     - botão "Traduzir página", que traduz o texto extraído da página atual
       usando o MESMO motor/cache de tradução do resto do site (window.CMI18N);
     - seleção de texto → "Criar Flashcard" / "Adicionar ao Notebook", reaproveitando
       o mecanismo de `?prefill=` (já existe pronto em flashcards.js; foi
       adicionado o equivalente em notebook.js).

   Escopo: só os PDFs listados em window.LIBRARY3_READER_PILOT abrem aqui —
   todo o resto da Library 3 continua abrindo em nova aba, sem nenhuma mudança.
   Ver /Users/jonathan/.claude/plans/vivid-mixing-eich.md para o plano completo.

   PDF.js vendorizado localmente em public/vendor/pdfjs/ (build "legacy", pela
   mesma razão de compatibilidade do resto do site: Mac/iPad/iPhone/Safari).
   Carregado SOB DEMANDA (só quando o leitor é aberto pela 1ª vez).
   ============================================================================ */
(function(){
  'use strict';

  const VENDOR = '/vendor/pdfjs/';
  const READER_CSS = '/css/library3-reader.css';
  const lib3PdfUrl = key => `/api/library3/pdf/${key}`;
  const uiLang = () => document.documentElement.lang === 'pt-BR' ? 'pt' : 'en';
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const currentUser = () => new URLSearchParams(location.search).get('u') || 'guest';

  const HL_COLORS = [
    { id:'yellow', v:'#ffe08a' },
    { id:'green',  v:'#b8f5b0' },
    { id:'blue',   v:'#a8d8ff' },
    { id:'pink',   v:'#ffc4dd' }
  ];

  const T = {
    en: { loading:'Loading PDF…', loadError:'Could not load this PDF.', download:'Download',
          page:'Page', of:'of', search:'Search in this document…', noMatches:'0 results',
          matchOf:m=>`${m.i} of ${m.n}`, translatePage:'Translate page', translating:'Translating…',
          translateClose:'Close', hl:'Highlight', flashcard:'Flashcard', notebook:'Notebook',
          zoomIn:'Zoom in', zoomOut:'Zoom out', back:'Back' },
    pt: { loading:'Carregando PDF…', loadError:'Não foi possível carregar este PDF.', download:'Baixar',
          page:'Página', of:'de', search:'Buscar neste documento…', noMatches:'0 resultados',
          matchOf:m=>`${m.i} de ${m.n}`, translatePage:'Traduzir página', translating:'Traduzindo…',
          translateClose:'Fechar', hl:'Marcar', flashcard:'Flashcard', notebook:'Notebook',
          zoomIn:'Aumentar', zoomOut:'Diminuir', back:'Voltar' }
  };
  const t = k => T[uiLang()][k];

  /* ---------------------------- carregar PDF.js sob demanda ---------------------------- */
  function ensureStylesheet(id, href){
    const existing = document.getElementById(id);
    if(existing) return existing.dataset.loaded==='1' ? Promise.resolve() : new Promise(res=>{
      existing.addEventListener('load', res, { once:true });
      existing.addEventListener('error', res, { once:true });
    });
    return new Promise(res=>{
      const l = document.createElement('link');
      l.id = id; l.rel = 'stylesheet'; l.href = href;
      l.addEventListener('load', ()=>{ l.dataset.loaded='1'; res(); }, { once:true });
      l.addEventListener('error', res, { once:true }); // não trava o leitor se o CSS falhar
      document.head.appendChild(l);
    });
  }
  let libPromise = null;
  function loadPdfJs(){
    if(libPromise) return libPromise;
    // pdf_viewer.mjs (componentes de viewer do PDF.js) não importa o core via ESM —
    // ele lê de `globalThis.pdfjsLib` no momento em que é avaliado (mesmo padrão do
    // viewer oficial deles). Por isso o core PRECISA terminar de carregar e se expor
    // globalmente ANTES de importar pdf_viewer.mjs — não dá pra fazer os dois em paralelo.
    libPromise = import(VENDOR+'pdf.min.mjs').then(pdfjsLib=>{
      globalThis.pdfjsLib = pdfjsLib;
      return Promise.all([
        import(VENDOR+'pdf_viewer.mjs'),
        ensureStylesheet('lib3PdfViewerCss', VENDOR+'pdf_viewer.css'),
        ensureStylesheet('lib3ReaderCss', READER_CSS)
      ]).then(([pdfjsViewer])=>{
        pdfjsLib.GlobalWorkerOptions.workerSrc = VENDOR + 'pdf.worker.min.mjs';
        pdfjsLib.GlobalWorkerOptions.standardFontDataUrl = VENDOR + 'standard_fonts/';
        return { pdfjsLib, PDFPageView: pdfjsViewer.PDFPageView, EventBus: pdfjsViewer.EventBus };
      });
    });
    return libPromise;
  }

  /* ---------------------------- persistência das marcações ---------------------------- */
  function hlKey(){ return `couplemed_lib3hl_${currentUser()}`; }
  function loadAllHighlights(){
    try{ return JSON.parse(localStorage.getItem(hlKey())) || {}; }catch(e){ return {}; }
  }
  function saveAllHighlights(all){
    try{ localStorage.setItem(hlKey(), JSON.stringify(all)); }catch(e){}
  }

  /* ---------------------------- instância ativa (uma por vez) ---------------------------- */
  let activeReader = null;

  function destroyActive(){
    if(!activeReader) return;
    try{ activeReader.pdfDoc && activeReader.pdfDoc.destroy(); }catch(e){}
    try{ activeReader.pageView && activeReader.pageView.destroy(); }catch(e){}
    activeReader = null;
  }

  /* ---------------------------- API pública ---------------------------- */
  function open(hostEl, item, folder, onBack){
    destroyActive();
    const r = {
      hostEl, item, folder, onBack,
      pdfjsLib:null, PDFPageView:null, eventBus:null,
      pdfDoc:null, pageView:null, pageCount:0, currentPage:1, scale:1.3,
      textIndex:null, textIndexPromise:null,
      search:{ query:'', matches:[], idx:-1 },
      translateCache:new Map(), translateOpen:false,
      highlights: (loadAllHighlights()[item.key] || [])
    };
    activeReader = r;
    renderSkeleton(r);
    loadPdfJs().then(({pdfjsLib, PDFPageView, EventBus})=>{
      if(activeReader!==r) return; // usuário já saiu daqui
      r.pdfjsLib = pdfjsLib; r.PDFPageView = PDFPageView; r.eventBus = new EventBus();
      return pdfjsLib.getDocument({ url: lib3PdfUrl(item.key) }).promise;
    }).then(doc=>{
      if(!doc || activeReader!==r) return;
      r.pdfDoc = doc; r.pageCount = doc.numPages;
      setLoading(r, false);
      updatePageCount(r);
      goToPage(r, 1);
    }).catch(err=>{
      if(activeReader!==r) return;
      console.error('[library3-reader]', err);
      setLoading(r, false, true);
    });
  }

  /* ---------------------------- esqueleto / toolbar ---------------------------- */
  function itemName(it, lang){ return (lang==='pt' && it.ptName) ? it.ptName : it.name; }

  function renderSkeleton(r){
    const lang = uiLang();
    const title = `${esc(itemName(r.folder, lang))} · ${esc(itemName(r.item, lang))}`;
    r.hostEl.innerHTML = `
      <div class="l3r" id="l3rRoot">
        <div class="l3r-toolbar">
          <button type="button" class="l3r-back" id="l3rBack">‹ ${esc(t('back'))}</button>
          <div class="l3r-title" id="l3rTitle">${title}</div>
          <div class="l3r-group l3r-nav">
            <button type="button" class="l3r-ic" id="l3rPrev" aria-label="prev">‹</button>
            <input type="number" id="l3rPageInput" class="l3r-pageinput" min="1" value="1" />
            <span class="l3r-of">${esc(t('of'))} <span id="l3rPageCount">—</span></span>
            <button type="button" class="l3r-ic" id="l3rNext" aria-label="next">›</button>
          </div>
          <div class="l3r-group l3r-zoom">
            <button type="button" class="l3r-ic" id="l3rZoomOut" aria-label="${esc(t('zoomOut'))}">−</button>
            <span id="l3rZoomLabel">130%</span>
            <button type="button" class="l3r-ic" id="l3rZoomIn" aria-label="${esc(t('zoomIn'))}">+</button>
          </div>
          <div class="l3r-group l3r-search">
            <input type="text" id="l3rSearchInput" placeholder="${esc(t('search'))}" />
            <button type="button" class="l3r-ic" id="l3rSearchPrev" aria-label="prev match">↑</button>
            <span id="l3rSearchCount" class="l3r-searchcount"></span>
            <button type="button" class="l3r-ic" id="l3rSearchNext" aria-label="next match">↓</button>
          </div>
          <button type="button" class="l3r-btn" id="l3rTranslateBtn">🌐 ${esc(t('translatePage'))}</button>
          <a class="l3r-btn l3r-download" id="l3rDownloadLink" download>⬇ ${esc(t('download'))}</a>
        </div>
        <div class="l3r-body">
          <div class="l3r-pagewrap" id="l3rPageWrap">
            <div class="l3r-loading" id="l3rLoading">${esc(t('loading'))}</div>
            <div class="l3r-pagehost pdfViewer" id="l3rPageHost">
              <div class="l3r-hilayer" id="l3rHiLayer"></div>
            </div>
          </div>
          <aside class="l3r-translatepanel" id="l3rTranslatePanel" hidden>
            <div class="l3r-translatepanel-head">
              <strong>${esc(t('translatePage'))}</strong>
              <button type="button" class="l3r-ic" id="l3rTranslateClose">✕</button>
            </div>
            <div class="l3r-translatepanel-body" id="l3rTranslateBody"></div>
          </aside>
        </div>
        <div class="l3r-selpop" id="l3rSelPop" hidden>
          ${HL_COLORS.map(c=>`<button type="button" class="l3r-selpop-hl" data-color="${c.id}" style="background:${c.v}" title="${esc(t('hl'))}"></button>`).join('')}
          <span class="l3r-selpop-sep"></span>
          <button type="button" class="l3r-selpop-btn" data-act="notebook">📓 ${esc(t('notebook'))}</button>
          <button type="button" class="l3r-selpop-btn" data-act="flashcard">🃏 ${esc(t('flashcard'))}</button>
        </div>
      </div>`;

    r.el = {
      root: r.hostEl.querySelector('#l3rRoot'),
      loading: r.hostEl.querySelector('#l3rLoading'),
      pageWrap: r.hostEl.querySelector('#l3rPageWrap'),
      pageHost: r.hostEl.querySelector('#l3rPageHost'),
      hiLayer: r.hostEl.querySelector('#l3rHiLayer'),
      pageInput: r.hostEl.querySelector('#l3rPageInput'),
      pageCount: r.hostEl.querySelector('#l3rPageCount'),
      zoomLabel: r.hostEl.querySelector('#l3rZoomLabel'),
      searchInput: r.hostEl.querySelector('#l3rSearchInput'),
      searchCount: r.hostEl.querySelector('#l3rSearchCount'),
      translatePanel: r.hostEl.querySelector('#l3rTranslatePanel'),
      translateBody: r.hostEl.querySelector('#l3rTranslateBody'),
      selPop: r.hostEl.querySelector('#l3rSelPop'),
      downloadLink: r.hostEl.querySelector('#l3rDownloadLink')
    };
    r.el.downloadLink.href = lib3PdfUrl(r.item.key);
    r.el.downloadLink.setAttribute('download', r.item.key.split('/').pop());
    updateZoomLabel(r);

    r.hostEl.querySelector('#l3rBack').addEventListener('click', ()=>{ destroyActive(); if(r.onBack) r.onBack(); });
    r.hostEl.querySelector('#l3rPrev').addEventListener('click', ()=> goToPage(r, r.currentPage-1));
    r.hostEl.querySelector('#l3rNext').addEventListener('click', ()=> goToPage(r, r.currentPage+1));
    r.el.pageInput.addEventListener('change', ()=> goToPage(r, parseInt(r.el.pageInput.value,10)||1));
    r.hostEl.querySelector('#l3rZoomOut').addEventListener('click', ()=> setScale(r, r.scale-0.15));
    r.hostEl.querySelector('#l3rZoomIn').addEventListener('click', ()=> setScale(r, r.scale+0.15));
    r.hostEl.querySelector('#l3rTranslateBtn').addEventListener('click', ()=> toggleTranslatePanel(r));
    r.hostEl.querySelector('#l3rTranslateClose').addEventListener('click', ()=> toggleTranslatePanel(r, false));

    let searchTimer = null;
    r.el.searchInput.addEventListener('input', ()=>{
      clearTimeout(searchTimer);
      searchTimer = setTimeout(()=> runSearch(r, r.el.searchInput.value), 350);
    });
    r.el.searchInput.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); e.shiftKey ? searchStep(r,-1) : searchStep(r,1); }
    });
    r.hostEl.querySelector('#l3rSearchPrev').addEventListener('click', ()=> searchStep(r,-1));
    r.hostEl.querySelector('#l3rSearchNext').addEventListener('click', ()=> searchStep(r,1));

    r.el.selPop.querySelectorAll('[data-color]').forEach(btn=>{
      btn.addEventListener('mousedown', e=>e.preventDefault());
      btn.addEventListener('click', ()=> addHighlightFromSelection(r, btn.dataset.color));
    });
    r.el.selPop.querySelectorAll('[data-act]').forEach(btn=>{
      btn.addEventListener('mousedown', e=>e.preventDefault());
      btn.addEventListener('click', ()=> sendSelectionTo(r, btn.dataset.act));
    });
  }

  function setLoading(r, on, error){
    if(!r.el) return;
    r.el.loading.hidden = !on && !error;
    r.el.loading.textContent = error ? t('loadError') : t('loading');
    r.el.loading.classList.toggle('l3r-loading-error', !!error);
  }
  function updatePageCount(r){ if(r.el) r.el.pageCount.textContent = String(r.pageCount); }
  function updateZoomLabel(r){ if(r.el) r.el.zoomLabel.textContent = Math.round(r.scale*100) + '%'; }

  /* ---------------------------- navegação de página ---------------------------- */
  function goToPage(r, n){
    if(!r.pdfDoc) return;
    n = Math.max(1, Math.min(r.pageCount, n));
    r.currentPage = n;
    if(r.el) r.el.pageInput.value = String(n);
    if(r.pageView){ try{ r.pageView.div && r.pageView.div.remove(); r.pageView.destroy(); }catch(e){} r.pageView = null; }
    r.pdfDoc.getPage(n).then(page=>{
      if(activeReader!==r || r.currentPage!==n) return;
      const viewport = page.getViewport({ scale: r.scale });
      const pv = new r.PDFPageView({
        container: r.el.pageHost,
        eventBus: r.eventBus,
        id: n,
        scale: r.scale,
        defaultViewport: viewport
      });
      r.pageView = pv;
      r.el.pageHost.appendChild(pv.div); // PDFPageView não se auto-insere no container
      pv.setPdfPage(page);
      return pv.draw().then(()=>{
        if(activeReader!==r) return;
        renderHighlightsForPage(r);
      });
    }).catch(err=>console.error('[library3-reader] page render', err));
  }

  function setScale(r, s){
    r.scale = Math.max(0.6, Math.min(3, Math.round(s*100)/100));
    updateZoomLabel(r);
    goToPage(r, r.currentPage);
  }

  /* ---------------------------- índice de texto (busca + tradução) ---------------------------- */
  function ensureTextIndex(r){
    if(r.textIndexPromise) return r.textIndexPromise;
    r.textIndexPromise = (async ()=>{
      const arr = new Array(r.pageCount);
      for(let i=1;i<=r.pageCount;i++){
        const page = await r.pdfDoc.getPage(i);
        const tc = await page.getTextContent();
        arr[i-1] = tc.items.map(it=>it.str).join(' ').replace(/\s+/g,' ').trim();
      }
      r.textIndex = arr;
      return arr;
    })();
    return r.textIndexPromise;
  }

  function runSearch(r, query){
    query = (query||'').trim();
    r.search = { query, matches:[], idx:-1 };
    if(!query || query.length<2){ updateSearchCount(r); return; }
    ensureTextIndex(r).then(arr=>{
      if(activeReader!==r || r.search.query!==query) return;
      const q = query.toLowerCase();
      const matches = [];
      arr.forEach((text,i)=>{
        const low = text.toLowerCase();
        let pos = 0;
        while(true){ const idx = low.indexOf(q,pos); if(idx===-1) break; matches.push({page:i+1}); pos = idx+q.length; }
      });
      r.search.matches = matches;
      r.search.idx = matches.length ? 0 : -1;
      updateSearchCount(r);
      if(matches.length) jumpToMatch(r);
    });
  }
  function searchStep(r, dir){
    if(!r.search.matches.length) return;
    r.search.idx = (r.search.idx + dir + r.search.matches.length) % r.search.matches.length;
    updateSearchCount(r);
    jumpToMatch(r);
  }
  function jumpToMatch(r){
    const m = r.search.matches[r.search.idx];
    if(!m) return;
    goToPage(r, m.page);
    setTimeout(()=>{ try{ window.find && window.find(r.search.query); }catch(e){} }, 250);
  }
  function updateSearchCount(r){
    if(!r.el) return;
    r.el.searchCount.textContent = r.search.matches.length
      ? t('matchOf')({ i:r.search.idx+1, n:r.search.matches.length })
      : (r.search.query ? t('noMatches') : '');
  }

  /* ---------------------------- traduzir página (painel) ---------------------------- */
  function toggleTranslatePanel(r, force){
    r.translateOpen = force!==undefined ? force : !r.translateOpen;
    r.el.translatePanel.hidden = !r.translateOpen;
    r.el.pageWrap.classList.toggle('l3r-with-panel', r.translateOpen);
    if(r.translateOpen) renderTranslationForCurrentPage(r);
  }
  async function renderTranslationForCurrentPage(r){
    const page = r.currentPage;
    if(r.translateCache.has(page)){
      r.el.translateBody.innerHTML = r.translateCache.get(page);
      return;
    }
    r.el.translateBody.innerHTML = `<p class="l3r-translate-loading">${esc(t('translating'))}</p>`;
    const arr = await ensureTextIndex(r);
    if(activeReader!==r || r.currentPage!==page) return;
    const text = arr[page-1] || '';
    if(!text.trim()){ r.el.translateBody.innerHTML = ''; return; }
    const html = await translateLongText(text);
    if(activeReader!==r || r.currentPage!==page) return;
    r.translateCache.set(page, html);
    r.el.translateBody.innerHTML = html;
  }
  async function translateLongText(text){
    const CM = window.CMI18N;
    if(!CM || typeof CM.translateText !== 'function'){
      return `<p>${esc(text)}</p>`;
    }
    // divide em pedaços por frase (mesmo padrão de select-translate.js), ~480 chars
    const parts = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
    const chunks = []; let cur = '';
    parts.forEach(p=>{ if((cur+p).length > 480){ if(cur) chunks.push(cur); cur = p; } else cur += p; });
    if(cur) chunks.push(cur);
    const out = [];
    for(const c of chunks){
      try{
        const tr = await CM.translateText(c.trim(), 'pt', 'en');
        out.push(tr || c.trim());
      }catch(e){ out.push(c.trim()); }
    }
    return `<p>${esc(out.join(' '))}</p>`;
  }

  /* ---------------------------- marcações (highlight) ---------------------------- */
  function pageHostRect(r){ return r.el.pageHost.getBoundingClientRect(); }

  function addHighlightFromSelection(r, colorId){
    const sel = window.getSelection && window.getSelection();
    if(!sel || sel.isCollapsed || !sel.rangeCount) return;
    const text = sel.toString();
    if(!text.trim()) return;
    const host = pageHostRect(r);
    const rects = Array.from(sel.getRangeAt(0).getClientRects()).map(rc=>({
      x:(rc.left-host.left)/r.scale, y:(rc.top-host.top)/r.scale, w:rc.width/r.scale, h:rc.height/r.scale
    })).filter(rc=>rc.w>0 && rc.h>0);
    if(!rects.length) return;
    const hl = { id:Date.now().toString(36)+Math.random().toString(36).slice(2,6), page:r.currentPage, color:colorId, rects, text, ts:Date.now() };
    r.highlights.push(hl);
    persistHighlights(r);
    renderHighlightsForPage(r);
    hideSelPop(r);
    sel.removeAllRanges();
  }
  function persistHighlights(r){
    const all = loadAllHighlights();
    all[r.item.key] = r.highlights;
    saveAllHighlights(all);
  }
  function renderHighlightsForPage(r){
    if(!r.el) return;
    const layer = r.el.hiLayer;
    layer.innerHTML = '';
    const colorMap = Object.fromEntries(HL_COLORS.map(c=>[c.id,c.v]));
    r.highlights.filter(h=>h.page===r.currentPage).forEach(h=>{
      h.rects.forEach(rc=>{
        const d = document.createElement('div');
        d.className = 'l3r-hl';
        d.style.left = (rc.x*r.scale)+'px';
        d.style.top = (rc.y*r.scale)+'px';
        d.style.width = (rc.w*r.scale)+'px';
        d.style.height = (rc.h*r.scale)+'px';
        d.style.background = colorMap[h.color] || colorMap.yellow;
        layer.appendChild(d);
      });
    });
  }

  /* ---------------------------- seleção → notebook / flashcard ---------------------------- */
  function sendSelectionTo(r, act){
    const sel = window.getSelection && window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    hideSelPop(r);
    if(!text) return;
    const user = currentUser();
    const page = act==='flashcard' ? 'flashcards' : 'notebooks';
    location.href = `app.html?page=${page}&u=${encodeURIComponent(user)}&prefill=${encodeURIComponent(text)}`;
  }

  /* ---------------------------- popover de seleção (marcar/notebook/flashcard) ---------------------------- */
  function hideSelPop(r){ if(r && r.el) r.el.selPop.hidden = true; }
  function showSelPopFor(r, rect){
    const pop = r.el.selPop;
    pop.hidden = false;
    const margin = 8;
    pop.style.left = '0px'; pop.style.top = '0px';
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let x = rect.left + rect.width/2 - w/2;
    let y = rect.bottom + margin; // sempre ABAIXO da seleção (o balão global de tradução prefere ficar acima)
    x = Math.max(margin, Math.min(x, window.innerWidth - w - margin));
    y = Math.min(y, window.innerHeight - h - margin);
    pop.style.left = x+'px'; pop.style.top = y+'px';
  }
  document.addEventListener('selectionchange', ()=>{
    const r = activeReader;
    if(!r || !r.el) return;
    const sel = window.getSelection && window.getSelection();
    if(!sel || sel.isCollapsed || !sel.rangeCount){ hideSelPop(r); return; }
    const anchor = sel.anchorNode && (sel.anchorNode.nodeType===1 ? sel.anchorNode : sel.anchorNode.parentElement);
    if(!anchor || !anchor.closest('#l3rPageHost')){ hideSelPop(r); return; }
    const text = sel.toString();
    if(!text.trim() || text.length>4000){ hideSelPop(r); return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if(!rect || (rect.width===0 && rect.height===0)){ hideSelPop(r); return; }
    showSelPopFor(r, rect);
  });
  document.addEventListener('mousedown', e=>{
    const r = activeReader;
    if(!r || !r.el || r.el.selPop.hidden) return;
    if(!r.el.selPop.contains(e.target)) hideSelPop(r);
  });

  /* ---------------------------- atalhos de teclado ---------------------------- */
  document.addEventListener('keydown', e=>{
    const r = activeReader;
    if(!r || !r.el) return;
    if(e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if(e.key==='ArrowRight') goToPage(r, r.currentPage+1);
    else if(e.key==='ArrowLeft') goToPage(r, r.currentPage-1);
  });

  /* ---------------------------- re-render de labels ao trocar idioma ---------------------------- */
  new MutationObserver(()=>{
    const r = activeReader;
    if(!r || !r.el) return;
    const wasTranslateOpen = r.translateOpen;
    renderSkeleton(r);
    if(r.pdfDoc){ updatePageCount(r); goToPage(r, r.currentPage); }
    if(wasTranslateOpen){ r.translateOpen = false; toggleTranslatePanel(r, true); }
  }).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });

  window.CMLibrary3Reader = { open, close: destroyActive };
})();
