/* CoupleMed — Library 3: leitor de PDF embutido (piloto)
   ============================================================================
   Abre um PDF da Library 3 DENTRO do site (em vez de nova aba), com:
     - navegação paginada (PDFPageView do próprio PDF.js — canvas + camada de
       texto de verdade, selecionável);
     - zoom, busca por texto, download do arquivo original;
     - marcação (highlight) de trechos, persistida por usuário e sincronizada
       entre aparelhos via a mesma camada genérica de `cm-sync.js`;
     - tradução: por SELEÇÃO, igual ao resto do site inteiro (balão global do
       `select-translate.js`, que já funciona sozinho aqui porque a camada de
       texto do PDF.js é texto de verdade selecionável — nenhuma mudança
       precisou ser feita nesse arquivo). Chegamos a testar uma versão de
       tradução automática da página inteira (mask & overlay ao trocar de
       idioma), mas o resultado não ficou como o Jonathan precisava — decisão
       dele foi manter os PDFs como estão e usar só a tradução por seleção
       já existente, específico pra esta Library 3.
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

  // Marca-texto fluorescente, estilo GoodNotes (4 fixas + "+" abre o seletor de cor nativo do
  // sistema pra qualquer cor customizada — ver l3rCustomColor). Highlights guardam a cor em HEX
  // direto (não um id) desde essa versão — HL_COLOR_MAP só serve pra resolver marcações antigas
  // que ainda tenham o id salvo.
  const HL_COLORS = [
    { id:'yellow', v:'#FFE600' },
    { id:'green',  v:'#4CFF6B' },
    { id:'blue',   v:'#00D6FF' },
    { id:'pink',   v:'#FF3EC9' }
  ];
  const HL_COLOR_MAP = Object.fromEntries(HL_COLORS.map(c=>[c.id,c.v]));

  // Ícone de borracha desenhado (era o emoji 🧹, que parece uma vassoura — pedido explícito
  // pra trocar por um desenho de borracha de verdade). currentColor acompanha o estado
  // normal/ativo do botão, igual aos outros ícones inline em select-translate.js.
  const ERASER_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M18.7 13.1 11 20.8H6.3l-3.5-3.5a2 2 0 0 1 0-2.8l9-9a2 2 0 0 1 2.8 0l4.1 4.1a2 2 0 0 1 0 2.8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M12.7 10.4 18 15.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M6.3 20.8h12.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;

  // Seta/cursor — representa o modo "clique pra apagar a marcação inteira" dentro do
  // menu da borracha (pra não repetir o mesmo ícone de borracha duas vezes).
  const CURSOR_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M5 3.5 19 10l-6.1 2.2L10.4 19 5 3.5Z" fill="currentColor"/>
  </svg>`;

  const T = {
    en: { loading:'Loading PDF…', loadError:'Could not load this PDF.', download:'Download',
          page:'Page', of:'of', search:'Search in this document…', noMatches:'0 results',
          matchOf:m=>`${m.i} of ${m.n}`, hl:'Highlight', flashcard:'Flashcard', notebook:'Notebook', notes:'Notes',
          zoomIn:'Zoom in', zoomOut:'Zoom out', back:'Back',
          customColor:'Custom color',
          eraserToggle:'Eraser options',
          eraserClick:'Click a highlight to remove it entirely',
          eraserBrush:'Eraser — drag over a highlight to erase it, like a real eraser' },
    pt: { loading:'Carregando PDF…', loadError:'Não foi possível carregar este PDF.', download:'Baixar',
          page:'Página', of:'de', search:'Buscar neste documento…', noMatches:'0 resultados',
          matchOf:m=>`${m.i} de ${m.n}`, hl:'Marcar', flashcard:'Flashcard', notebook:'Notebook', notes:'Notes',
          zoomIn:'Aumentar', zoomOut:'Diminuir', back:'Voltar',
          customColor:'Cor personalizada',
          eraserToggle:'Opções de borracha',
          eraserClick:'Clique numa marcação pra apagar ela inteira',
          eraserBrush:'Borracha — arraste por cima pra apagar de verdade, como uma borracha' }
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
  // Formato antigo era uma lista só de marcações (sem `type`, cada uma com `rects`).
  // Agora é uma lista de AÇÕES em ordem cronológica — marcação (`type:'highlight'`) e
  // apagão de borracha de verdade (`type:'erase'`), redesenhadas nessa mesma ordem a
  // cada render (ver renderHighlightsForPage). Dados antigos continuam abrindo normal.
  function normalizeActions(raw){
    if(!Array.isArray(raw)) return [];
    return raw.map(a => a.type ? a : Object.assign({}, a, { type:'highlight' }));
  }
  function genId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

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
    // site.js re-chama open() sozinho ao trocar a bandeira 🇧🇷/🇺🇸 (setLang() ->
    // updateDynamicContent() -> renderLibrary() -> aqui, pra qualquer página cujo título
    // dependa do idioma — Library 3 está nessa lista). Se for o MESMO PDF já aberto, isso
    // é só uma re-renderização por causa do idioma (troca labels da toolbar): reaproveita
    // o documento já carregado (evita rebaixar da rede de novo) e mantém página/zoom.
    if(activeReader && activeReader.item.key===item.key && activeReader.pdfDoc){
      const r = activeReader;
      r.hostEl = hostEl; r.folder = folder; r.onBack = onBack;
      renderSkeleton(r);
      updatePageCount(r);
      goToPage(r, r.currentPage);
      return;
    }
    destroyActive();
    const r = {
      hostEl, item, folder, onBack,
      pdfjsLib:null, PDFPageView:null, eventBus:null,
      pdfDoc:null, pageView:null, pageCount:0, currentPage:1, scale:1.3, fitDone:false,
      textIndex:null, textIndexPromise:null,
      search:{ query:'', matches:[], idx:-1 },
      eraseMode:null, // null | 'click' (apaga marcação inteira) | 'brush' (apaga de verdade, feito canvas)
      eraseBrushRadius:0.02, _activeErase:null, eraseMenuOpen:false,
      actions: normalizeActions(loadAllHighlights()[item.key])
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
          <div class="l3r-group l3r-search">
            <input type="text" id="l3rSearchInput" placeholder="${esc(t('search'))}" />
            <span id="l3rSearchCount" class="l3r-searchcount"></span>
          </div>
          <a class="l3r-btn l3r-download" id="l3rDownloadLink" download>⬇ ${esc(t('download'))}</a>
        </div>
        <div class="l3r-body">
          <div class="l3r-pagewrap" id="l3rPageWrap">
            <div class="l3r-loading" id="l3rLoading">${esc(t('loading'))}</div>
            <button type="button" class="l3r-sidearrow l3r-sidearrow-prev" id="l3rSidePrev" aria-label="prev">‹</button>
            <button type="button" class="l3r-sidearrow l3r-sidearrow-next" id="l3rSideNext" aria-label="next">›</button>
            <div class="l3r-pagehost pdfViewer" id="l3rPageHost"></div>
          </div>
          <div class="l3r-toolbar l3r-toolbar-bottom">
            <div class="l3r-group l3r-marktools">
              ${HL_COLORS.map(c=>`<button type="button" class="l3r-swatch" data-color="${c.v}" style="background:${c.v}" title="${esc(t('hl'))}"></button>`).join('')}
              <button type="button" class="l3r-swatch l3r-swatch-add" id="l3rCustomColorBtn" title="${esc(t('customColor'))}">+</button>
              <input type="color" id="l3rCustomColor" class="l3r-custom-color-input" value="#ff8a3d" tabindex="-1" aria-hidden="true" />
              <span class="l3r-marktools-sep"></span>
              <button type="button" class="l3r-ic l3r-eraser" id="l3rEraserToggleBtn" aria-label="${esc(t('eraserToggle'))}" title="${esc(t('eraserToggle'))}">${ERASER_SVG}</button>
              <span class="l3r-erase-menu" id="l3rEraseMenu">
                <button type="button" class="l3r-ic l3r-erase-click" id="l3rEraserClickBtn" aria-label="${esc(t('eraserClick'))}" title="${esc(t('eraserClick'))}">${CURSOR_SVG}</button>
                <button type="button" class="l3r-erasedot l3r-erasedot-s" id="l3rEraseS" data-radius="0.012" title="${esc(t('eraserBrush'))}"></button>
                <button type="button" class="l3r-erasedot l3r-erasedot-m" id="l3rEraseM" data-radius="0.022" title="${esc(t('eraserBrush'))}"></button>
                <button type="button" class="l3r-erasedot l3r-erasedot-l" id="l3rEraseL" data-radius="0.036" title="${esc(t('eraserBrush'))}"></button>
              </span>
              <span class="l3r-marktools-sep"></span>
              <button type="button" class="l3r-btn l3r-marktools-btn" id="l3rNotebookBtn">📓 ${esc(t('notebook'))}</button>
              <button type="button" class="l3r-btn l3r-marktools-btn" id="l3rNotesBtn">📝 ${esc(t('notes'))}</button>
              <button type="button" class="l3r-btn l3r-marktools-btn" id="l3rFlashcardBtn">🃏 ${esc(t('flashcard'))}</button>
            </div>
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
          </div>
        </div>
      </div>`;

    r.el = {
      root: r.hostEl.querySelector('#l3rRoot'),
      loading: r.hostEl.querySelector('#l3rLoading'),
      pageWrap: r.hostEl.querySelector('#l3rPageWrap'),
      pageHost: r.hostEl.querySelector('#l3rPageHost'),
      hiLayer: null, // criada de novo a cada goToPage(), dentro do próprio pv.div — ver goToPage
      // navegação/zoom moraram só na barra de baixo (o topo tinha isso duplicado antes —
      // removido a pedido). Continua em array porque as setas laterais também disparam
      // as mesmas ações e algumas rotinas iteram por conveniência.
      pageInputs: [r.hostEl.querySelector('#l3rPageInput')],
      pageCounts: [r.hostEl.querySelector('#l3rPageCount')],
      zoomLabels: [r.hostEl.querySelector('#l3rZoomLabel')],
      searchInput: r.hostEl.querySelector('#l3rSearchInput'),
      searchCount: r.hostEl.querySelector('#l3rSearchCount'),
      eraserToggleBtn: r.hostEl.querySelector('#l3rEraserToggleBtn'),
      eraseMenu: r.hostEl.querySelector('#l3rEraseMenu'),
      eraserClickBtn: r.hostEl.querySelector('#l3rEraserClickBtn'),
      eraseDots: Array.from(r.hostEl.querySelectorAll('.l3r-erasedot')),
      downloadLink: r.hostEl.querySelector('#l3rDownloadLink')
    };
    r.el.downloadLink.href = lib3PdfUrl(r.item.key);
    r.el.downloadLink.setAttribute('download', r.item.key.split('/').pop());
    updateZoomLabel(r);

    r.hostEl.querySelector('#l3rBack').addEventListener('click', ()=>{ destroyActive(); if(r.onBack) r.onBack(); });
    ['l3rPrev','l3rSidePrev'].forEach(id=>
      r.hostEl.querySelector('#'+id).addEventListener('click', ()=> goToPage(r, r.currentPage-1)));
    ['l3rNext','l3rSideNext'].forEach(id=>
      r.hostEl.querySelector('#'+id).addEventListener('click', ()=> goToPage(r, r.currentPage+1)));
    r.el.pageInputs.forEach(inp=>{
      inp.addEventListener('change', ()=> goToPage(r, parseInt(inp.value,10)||1));
      inp.addEventListener('keydown', e=>{
        if(e.key==='Enter'){ e.preventDefault(); goToPage(r, parseInt(inp.value,10)||1); inp.blur(); }
      });
    });
    r.hostEl.querySelector('#l3rZoomOut').addEventListener('click', ()=> setScale(r, r.scale-0.15));
    r.hostEl.querySelector('#l3rZoomIn').addEventListener('click', ()=> setScale(r, r.scale+0.15));

    // setas ↑↓ de resultado foram retiradas de dentro da busca (pedido explícito) — navegar
    // entre os resultados continua funcionando por teclado (Enter / Shift+Enter).
    let searchTimer = null;
    r.el.searchInput.addEventListener('input', ()=>{
      clearTimeout(searchTimer);
      searchTimer = setTimeout(()=> runSearch(r, r.el.searchInput.value), 350);
    });
    r.el.searchInput.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); e.shiftKey ? searchStep(r,-1) : searchStep(r,1); }
    });

    // Ferramentas de marcação ficam FIXAS na barra de baixo (não é mais um balão que aparece
    // ao selecionar — pedido explícito, o balão flutuante estava "piscando"/incomodando).
    // mousedown->preventDefault em todos: clicar um botão não pode derrubar a seleção de texto
    // atual, senão não haveria o que marcar/mandar quando o click() realmente disparar.
    r.hostEl.querySelectorAll('.l3r-swatch[data-color]').forEach(btn=>{
      btn.addEventListener('mousedown', e=>e.preventDefault());
      btn.addEventListener('click', ()=> addHighlightFromSelection(r, btn.dataset.color));
    });
    const customInput = r.hostEl.querySelector('#l3rCustomColor');
    r.hostEl.querySelector('#l3rCustomColorBtn').addEventListener('mousedown', e=>e.preventDefault());
    r.hostEl.querySelector('#l3rCustomColorBtn').addEventListener('click', ()=> customInput.click());
    customInput.addEventListener('input', e=>e.stopPropagation());
    customInput.addEventListener('change', ()=> addHighlightFromSelection(r, customInput.value));
    // Duas ferramentas de apagar, pedido explícito pra manter as duas opções: (1) clique
    // numa marcação = some ela inteira; (2) arraste com um círculo (3 tamanhos, estilo
    // GoodNotes) = apaga só o pedaço que o círculo tocar, como uma borracha de verdade —
    // ver attachEraserHandlers/renderHighlightsForPage. As duas ficam ESCONDIDAS atrás do
    // ícone de borracha (pedido explícito) — só aparecem quando ele é clicado, e um 2º
    // clique no mesmo ícone esconde de novo. Escolher uma ferramenta NÃO fecha o menu
    // sozinho (só o próprio ícone de borracha abre/fecha).
    r.el.eraserToggleBtn.addEventListener('mousedown', e=>e.preventDefault());
    r.el.eraserToggleBtn.addEventListener('click', ()=>{
      r.eraseMenuOpen = !r.eraseMenuOpen;
      r.el.eraseMenu.classList.toggle('l3r-erase-menu-open', r.eraseMenuOpen);
    });
    r.el.eraserClickBtn.addEventListener('mousedown', e=>e.preventDefault());
    r.el.eraserClickBtn.addEventListener('click', ()=> setEraseMode(r, r.eraseMode==='click' ? null : 'click'));
    r.el.eraseDots.forEach(btn=>{
      btn.addEventListener('mousedown', e=>e.preventDefault());
      btn.addEventListener('click', ()=>{
        const radius = Number(btn.dataset.radius);
        if(r.eraseMode==='brush' && r.eraseBrushRadius===radius) setEraseMode(r, null);
        else { r.eraseBrushRadius = radius; setEraseMode(r, 'brush'); }
      });
    });
    r.hostEl.querySelector('#l3rNotebookBtn').addEventListener('mousedown', e=>e.preventDefault());
    r.hostEl.querySelector('#l3rNotebookBtn').addEventListener('click', ()=> sendSelectionTo(r, 'notebook'));
    r.hostEl.querySelector('#l3rNotesBtn').addEventListener('mousedown', e=>e.preventDefault());
    r.hostEl.querySelector('#l3rNotesBtn').addEventListener('click', ()=> sendSelectionTo(r, 'notes'));
    r.hostEl.querySelector('#l3rFlashcardBtn').addEventListener('mousedown', e=>e.preventDefault());
    r.hostEl.querySelector('#l3rFlashcardBtn').addEventListener('click', ()=> sendSelectionTo(r, 'flashcard'));
    setEraseMode(r, r.eraseMode); // reaplica o estado visual (o DOM é reconstruído do zero aqui)
    r.el.eraseMenu.classList.toggle('l3r-erase-menu-open', r.eraseMenuOpen);
  }

  function setLoading(r, on, error){
    if(!r.el) return;
    r.el.loading.hidden = !on && !error;
    r.el.loading.textContent = error ? t('loadError') : t('loading');
    r.el.loading.classList.toggle('l3r-loading-error', !!error);
  }
  function updatePageCount(r){ if(r.el) r.el.pageCounts.forEach(el=>el.textContent = String(r.pageCount)); }
  function updateZoomLabel(r){ if(r.el) r.el.zoomLabels.forEach(el=>el.textContent = Math.round(r.scale*100) + '%'); }

  /* ---------------------------- navegação de página ---------------------------- */
  function goToPage(r, n){
    if(!r.pdfDoc) return;
    n = Math.max(1, Math.min(r.pageCount, n));
    r.currentPage = n;
    if(r.el) r.el.pageInputs.forEach(el=>el.value = String(n));
    if(r.pageView){ try{ r.pageView.div && r.pageView.div.remove(); r.pageView.destroy(); }catch(e){} r.pageView = null; }
    r.pdfDoc.getPage(n).then(page=>{
      if(activeReader!==r || r.currentPage!==n) return;
      const base = page.getViewport({ scale: 1 }); // dimensões da página em escala 1, pra fit e correção
      if(!r.fitDone){
        // abre já ajustado ao aparelho — a página inteira cabe na tela sem precisar rolar
        // (nem na largura nem na altura); o usuário decide se quer aumentar depois.
        r.fitDone = true;
        const wrap = r.el.pageWrap;
        const availW = Math.max(80, wrap.clientWidth - 36), availH = Math.max(80, wrap.clientHeight - 36);
        const fit = Math.min(availW/base.width, availH/base.height);
        if(isFinite(fit) && fit>0){ r.scale = Math.max(0.35, Math.min(3, fit)); updateZoomLabel(r); }
      }
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
        // O PDF.js às vezes ajusta a escala sozinho por "qualidade" (ex.: mantendo um piso
        // mínimo), renderizando maior do que o pedido — foi isso que quebrava o "cabe sem
        // rolar": pedia uma escala pequena pra caber, e ele desenhava maior mesmo assim. Depois
        // de desenhar, meço o tamanho real e força de volta pro tamanho pedido com um
        // transform:scale (afeta canvas + camada de texto juntos, então seleção/marcação
        // continuam batendo certo, já que tudo usa getBoundingClientRect(), que já reflete
        // o transform).
        // Medir pelo CANVAS (não pelo pv.div/".page") é essencial: ".page" (classe do
        // próprio pdf_viewer.css) tem uma borda transparente de 9px (--page-border) em
        // todo o perímetro, embutida no getBoundingClientRect() do pv.div. Usando o
        // pv.div como referência, essa borda inflava a medida e o fator de correção saía
        // levemente errado sempre — daí a marcação ir desalinhando mais nas linhas de
        // baixo (erro de escala residual crescendo com a distância do canto superior
        // esquerdo). O canvas (e a camada de texto, que o PDF.js sempre posiciona
        // exatamente por cima dele) não tem essa borda.
        const canvasEl = pv.div.querySelector('canvas');
        const measureRect = (canvasEl || pv.div).getBoundingClientRect();
        const targetW = base.width*r.scale, targetH = base.height*r.scale;
        if(measureRect.width>0 && measureRect.height>0){
          const corr = ((targetW/measureRect.width) + (targetH/measureRect.height)) / 2;
          if(Math.abs(corr-1) > 0.01){
            pv.div.style.transformOrigin = 'top left';
            pv.div.style.transform = `scale(${corr})`;
          }
        }
        // CSS transform não muda a caixa de LAYOUT que o pageHost usa pra calcular quanto
        // espaço ocupar (só o desenho visual) — sem isto, o pageWrap continuava achando que
        // precisava rolar, mesmo com a página visualmente já do tamanho certo. Travando o
        // tamanho do pageHost explicitamente no alvo (mesmo valor do transform) resolve.
        r.el.pageHost.style.width = targetW+'px';
        r.el.pageHost.style.height = targetH+'px';

        // Camada de marcações É CRIADA DE NOVO A CADA PÁGINA, DENTRO do próprio pv.div,
        // com left/top/width/height travados (em px) exatamente no retângulo real do
        // canvas — não mais um irmão solto dentro do pageHost. Isso garante que a
        // marcação seja sempre medida e desenhada contra o MESMO retângulo onde o texto
        // de verdade está (ver pageHostRect()), eliminando qualquer resíduo de erro de
        // escala/borda entre a hora de criar a marcação e a hora de redesenhá-la —
        // funciona igual não importa o zoom, o tamanho de tela nem o aparelho.
        // hiLayer agora é um <canvas> (não mais divs por retângulo) — precisa ser bitmap
        // pra desenhar a borracha circular de verdade (destination-out, ver
        // renderHighlightsForPage). O blend "marca-texto real" (deixa letra preta aparecer
        // por baixo) vem do mix-blend-mode:multiply no PRÓPRIO canvas (CSS), não em cada
        // marcação — canvas 2D não enxerga o que tem atrás dele na página, só CSS blend faz isso.
        const pvBox = pv.div.getBoundingClientRect();
        const canvasBox = (pv.div.querySelector('canvas') || pv.div).getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const hiLayer = document.createElement('canvas');
        hiLayer.id = 'l3rHiLayer';
        hiLayer.className = 'l3r-hilayer' + (r.eraseMode ? ' l3r-erase-active' : '');
        hiLayer.style.left = (canvasBox.left-pvBox.left)+'px';
        hiLayer.style.top = (canvasBox.top-pvBox.top)+'px';
        hiLayer.style.width = canvasBox.width+'px';
        hiLayer.style.height = canvasBox.height+'px';
        hiLayer.width = Math.max(1, Math.round(canvasBox.width*dpr));
        hiLayer.height = Math.max(1, Math.round(canvasBox.height*dpr));
        hiLayer.__dpr = dpr;
        pv.div.appendChild(hiLayer);
        r.el.hiLayer = hiLayer;
        attachEraserHandlers(r, hiLayer);
        updateEraserCursor(r);

        renderHighlightsForPage(r);
      });
    }).catch(err=>console.error('[library3-reader] page render', err));
  }

  function setScale(r, s){
    r.scale = Math.max(0.6, Math.min(3, Math.round(s*100)/100));
    updateZoomLabel(r);
    goToPage(r, r.currentPage);
  }

  /* ---------------------------- índice de texto (busca) ---------------------------- */
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

  /* ---------------------------- marcações (highlight) ----------------------------
     Coordenadas guardadas como FRAÇÃO (0..1) do próprio #l3rPageHost, não pixels
     em "escala 1" — antes, a conversão pixel↔escala 1 dependia de r.scale bater
     exatamente com o fator de correção aplicado ao pv.div (goToPage, ver `corr`),
     e qualquer resíduo (o código tolera até 1% de erro sem corrigir, e o PDF.js
     pode escalar largura/altura de forma levemente diferente uma da outra) ia
     acumulando ao longo da página — por isso a marcação aparecia cada vez mais
     deslocada do texto real conforme a posição Y aumentava. Usando fração do
     próprio host (que é o TAMANHO FINAL, já corrigido, da página) e desenhando
     com `left/top/width/height` em % (não px), a marcação fica pixel-perfeita
     em cima do texto não importa a escala/zoom, nem o tamanho de tela/aparelho —
     não depende de nenhum cálculo de correção nem de reler r.scale depois. */
  // Base da fração é a própria camada de marcações (hiLayer) — criada em goToPage() já
  // travada, em px, no retângulo exato do canvas. Usar o mesmo elemento pra medir (aqui)
  // e pra desenhar (renderHighlightsForPage) é o que garante marcação e texto
  // permanecerem pixel-perfeitos entre si, sem depender de nenhum fator de correção.
  function pageHostRect(r){ return r.el.hiLayer.getBoundingClientRect(); }

  // Pega os client rects só dos NÓS DE TEXTO de verdade contidos/parcialmente contidos
  // na seleção — em vez de `range.getClientRects()` puro. O PDF.js insere um `<br
  // role="presentation">` entre cada linha da camada de texto (pra copiar/colar preservar
  // quebra de linha); quando a seleção do mouse cruza esse `<br>`, o navegador às vezes
  // devolve um retângulo "fantasma" cobrindo o resto da linha (onde não tem nenhum
  // caractere) — é exatamente esse retângulo extra que aparecia sobrando depois da
  // última palavra de uma linha marcada. Como TreeWalker aqui só visita nós de TEXTO
  // (NodeFilter.SHOW_TEXT), o `<br>` nunca entra — cada retângulo devolvido corresponde
  // sempre a caracteres de verdade.
  function textNodeRectsInRange(range){
    const rects = [];
    const root = range.commonAncestorContainer;
    const container = root.nodeType===1 ? root : root.parentNode;
    if(!container) return rects;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node){ return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
    });
    let node;
    while((node = walker.nextNode())){
      let startOffset = 0, endOffset = node.textContent.length;
      if(node===range.startContainer) startOffset = range.startOffset;
      if(node===range.endContainer) endOffset = range.endOffset;
      if(startOffset>=endOffset) continue;
      const nodeRange = document.createRange();
      nodeRange.setStart(node, startOffset);
      nodeRange.setEnd(node, endOffset);
      rects.push(...Array.from(nodeRange.getClientRects()));
    }
    return rects;
  }

  function addHighlightFromSelection(r, colorHex){
    const sel = window.getSelection && window.getSelection();
    if(!sel || sel.isCollapsed || !sel.rangeCount) return;
    const anchor = sel.anchorNode && (sel.anchorNode.nodeType===1 ? sel.anchorNode : sel.anchorNode.parentElement);
    if(!anchor || !anchor.closest('#l3rPageHost')) return; // ignora seleção fora do PDF (ex.: dentro de outro widget)
    if(!r.el.hiLayer) return;
    const text = sel.toString();
    if(!text.trim()) return;
    const host = pageHostRect(r);
    if(host.width<=0 || host.height<=0) return;
    const rects = textNodeRectsInRange(sel.getRangeAt(0)).map(rc=>({
      x:(rc.left-host.left)/host.width, y:(rc.top-host.top)/host.height,
      w:rc.width/host.width, h:rc.height/host.height
    })).filter(rc=>rc.w>0 && rc.h>0);
    if(!rects.length) return;
    r.actions.push({ id:genId(), type:'highlight', page:r.currentPage, color:colorHex, rects, text, ts:Date.now() });
    persistHighlights(r);
    renderHighlightsForPage(r);
    sel.removeAllRanges();
  }

  // Clique-pra-apagar: acha a marcação (topo pro fundo, ou seja a mais recente primeiro)
  // cujo algum retângulo contém o ponto clicado, e remove ela INTEIRA.
  function removeHighlightAtPoint(r, xFrac, yFrac){
    for(let i=r.actions.length-1; i>=0; i--){
      const a = r.actions[i];
      if(a.type!=='highlight' || a.page!==r.currentPage) continue;
      const hit = a.rects.some(rc =>
        xFrac>=rc.x-0.002 && xFrac<=rc.x+rc.w+0.002 && yFrac>=rc.y-0.002 && yFrac<=rc.y+rc.h+0.002);
      if(hit){ r.actions.splice(i,1); persistHighlights(r); renderHighlightsForPage(r); return true; }
    }
    return false;
  }

  function persistHighlights(r){
    const all = loadAllHighlights();
    all[r.item.key] = r.actions;
    saveAllHighlights(all);
  }

  // Redesenha a página inteira de marcações TODA VEZ, tocando as ações em ordem
  // cronológica — marcação pinta (source-over, com transparência), apagão de borracha
  // "fura" (destination-out) o que já tinha sido pintado ANTES dele na lista. É assim que
  // uma borracha de verdade se comporta: apagar não impede marcar de novo por cima depois.
  function renderHighlightsForPage(r){
    if(!r.el || !r.el.hiLayer) return;
    const canvas = r.el.hiLayer;
    const ctx = canvas.getContext('2d');
    const dpr = canvas.__dpr || 1;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const W = canvas.width/dpr, H = canvas.height/dpr;
    ctx.clearRect(0,0,W,H);
    if(W<=0 || H<=0) return;
    r.actions.filter(a=>a.page===r.currentPage).forEach(a=>{
      if(a.type==='erase'){
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        const rad = a.radius*W;
        (a.points||[]).forEach(p=>{
          ctx.beginPath();
          ctx.arc(p.x*W, p.y*H, rad, 0, Math.PI*2);
          ctx.fill();
        });
        ctx.restore();
        return;
      }
      const color = HL_COLOR_MAP[a.color] || a.color || HL_COLORS[0].v; // ids antigos continuam OK
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = color;
      (a.rects||[]).forEach(rc=>{
        ctx.fillRect(rc.x*W, rc.y*H, rc.w*W, rc.h*H);
      });
      ctx.restore();
    });
  }

  /* ---------------------------- borracha ----------------------------
     Duas ferramentas, as duas disponíveis ao mesmo tempo (pedido explícito):
     - 'click': clique numa marcação e ela some inteira (comportamento de antes).
     - 'brush': arrasta um círculo (3 tamanhos) por cima e só aquele pedaço some, igual
       uma borracha de verdade apagando um borrão — ver attachEraserHandlers.
     Em qualquer um dos dois, a camada de marcações passa a aceitar ponteiro (ela
     normalmente ignora — pointer-events:none — pra não atrapalhar a seleção de texto). */
  function setEraseMode(r, mode){
    r.eraseMode = mode;
    if(r.el.hiLayer){
      r.el.hiLayer.classList.toggle('l3r-erase-active', !!mode);
      updateEraserCursor(r);
    }
    r.el.eraserToggleBtn.classList.toggle('l3r-ic-active', !!mode); // ícone-gatilho acende quando QUALQUER ferramenta de apagar está ativa, mesmo com o menu fechado
    r.el.eraserClickBtn.classList.toggle('l3r-ic-active', mode==='click');
    r.el.eraseDots.forEach(btn=>{
      btn.classList.toggle('l3r-erasedot-active', mode==='brush' && Number(btn.dataset.radius)===r.eraseBrushRadius);
    });
  }

  // Cursor circular do tamanho real do pincel (em px de tela) — feedback visual de
  // "borracha apagando", igual GoodNotes. Refeito sempre que o modo/tamanho muda ou uma
  // nova página/hiLayer é criada.
  function eraserCursorCss(radiusPx){
    const rad = Math.max(4, Math.min(60, Math.round(radiusPx)));
    const size = rad*2+4, c = size/2;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>`+
      `<circle cx='${c}' cy='${c}' r='${rad}' fill='rgba(255,255,255,.35)' stroke='#333' stroke-width='1.5'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${c} ${c}, crosshair`;
  }
  function updateEraserCursor(r){
    if(!r.el || !r.el.hiLayer) return;
    if(r.eraseMode==='brush'){
      const box = r.el.hiLayer.getBoundingClientRect();
      r.el.hiLayer.style.cursor = eraserCursorCss(r.eraseBrushRadius * box.width);
    } else if(r.eraseMode==='click'){
      r.el.hiLayer.style.cursor = 'crosshair';
    } else {
      r.el.hiLayer.style.cursor = '';
    }
  }

  // Listeners de ponteiro recriados a cada página nova (o canvas hiLayer é recriado do
  // zero em goToPage a cada vez, ver ali).
  function attachEraserHandlers(r, canvas){
    let dragging = false;
    canvas.addEventListener('pointerdown', e=>{
      if(!r.eraseMode) return;
      const box = canvas.getBoundingClientRect();
      const xFrac = (e.clientX-box.left)/box.width, yFrac = (e.clientY-box.top)/box.height;
      if(r.eraseMode==='click'){ removeHighlightAtPoint(r, xFrac, yFrac); return; }
      dragging = true;
      const action = { id:genId(), type:'erase', page:r.currentPage, radius:r.eraseBrushRadius, points:[{x:xFrac,y:yFrac}], ts:Date.now() };
      r.actions.push(action);
      r._activeErase = action;
      renderHighlightsForPage(r);
      try{ canvas.setPointerCapture(e.pointerId); }catch(err){}
    });
    canvas.addEventListener('pointermove', e=>{
      if(!dragging || !r._activeErase) return;
      const box = canvas.getBoundingClientRect();
      const xFrac = (e.clientX-box.left)/box.width, yFrac = (e.clientY-box.top)/box.height;
      const pts = r._activeErase.points;
      const last = pts[pts.length-1];
      if(!last || Math.hypot((xFrac-last.x)*box.width, (yFrac-last.y)*box.height) > 2){
        pts.push({x:xFrac,y:yFrac});
        renderHighlightsForPage(r);
      }
    });
    const endDrag = ()=>{
      if(!dragging) return;
      dragging = false; r._activeErase = null;
      persistHighlights(r);
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', endDrag);
  }

  /* ---------------------------- seleção → notebook / notes / flashcard ---------------------------- */
  function sendSelectionTo(r, act){
    const sel = window.getSelection && window.getSelection();
    const anchor = sel && sel.anchorNode && (sel.anchorNode.nodeType===1 ? sel.anchorNode : sel.anchorNode.parentElement);
    if(!anchor || !anchor.closest('#l3rPageHost')) return;
    const text = sel ? sel.toString().trim() : '';
    if(!text) return;
    const user = currentUser();
    const page = act==='flashcard' ? 'flashcards' : (act==='notes' ? 'notes' : 'notebooks');
    location.href = `app.html?page=${page}&u=${encodeURIComponent(user)}&prefill=${encodeURIComponent(text)}`;
  }

  /* ---------------------------- atalhos de teclado ---------------------------- */
  document.addEventListener('keydown', e=>{
    const r = activeReader;
    if(!r || !r.el) return;
    if(e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    // Shift/Ctrl/Cmd/Alt + seta é o atalho padrão do navegador pra ESTENDER uma seleção
    // de texto (ex.: clicar antes da 1ª letra de uma frase e Shift+→ pra selecionar).
    // Virar de página nesse momento destruía a página/camada de texto no meio do gesto —
    // por isso nunca dava pra selecionar a partir do início de uma frase. Só navega com
    // a seta "pura", sem nenhum modificador.
    if(e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    if(e.key==='ArrowRight') goToPage(r, r.currentPage+1);
    else if(e.key==='ArrowLeft') goToPage(r, r.currentPage-1);
  });

  window.CMLibrary3Reader = { open, close: destroyActive };
})();
