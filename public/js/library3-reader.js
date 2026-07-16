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

  const T = {
    en: { loading:'Loading PDF…', loadError:'Could not load this PDF.', download:'Download',
          page:'Page', of:'of', search:'Search in this document…', noMatches:'0 results',
          matchOf:m=>`${m.i} of ${m.n}`, hl:'Highlight', flashcard:'Flashcard', notebook:'Notebook', notes:'Notes',
          zoomIn:'Zoom in', zoomOut:'Zoom out', back:'Back',
          customColor:'Custom color', eraser:'Eraser — click a highlight to remove it' },
    pt: { loading:'Carregando PDF…', loadError:'Não foi possível carregar este PDF.', download:'Baixar',
          page:'Página', of:'de', search:'Buscar neste documento…', noMatches:'0 resultados',
          matchOf:m=>`${m.i} de ${m.n}`, hl:'Marcar', flashcard:'Flashcard', notebook:'Notebook', notes:'Notes',
          zoomIn:'Aumentar', zoomOut:'Diminuir', back:'Voltar',
          customColor:'Cor personalizada', eraser:'Borracha — clique numa marcação pra apagar' }
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
      search:{ query:'', matches:[], idx:-1 }, eraseMode:false,
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
              <button type="button" class="l3r-ic l3r-eraser" id="l3rEraserBtn" aria-label="${esc(t('eraser'))}" title="${esc(t('eraser'))}">${ERASER_SVG}</button>
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
      eraserBtn: r.hostEl.querySelector('#l3rEraserBtn'),
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
    r.el.eraserBtn.addEventListener('click', ()=> setEraseMode(r, !r.eraseMode));
    r.hostEl.querySelector('#l3rNotebookBtn').addEventListener('mousedown', e=>e.preventDefault());
    r.hostEl.querySelector('#l3rNotebookBtn').addEventListener('click', ()=> sendSelectionTo(r, 'notebook'));
    r.hostEl.querySelector('#l3rNotesBtn').addEventListener('mousedown', e=>e.preventDefault());
    r.hostEl.querySelector('#l3rNotesBtn').addEventListener('click', ()=> sendSelectionTo(r, 'notes'));
    r.hostEl.querySelector('#l3rFlashcardBtn').addEventListener('mousedown', e=>e.preventDefault());
    r.hostEl.querySelector('#l3rFlashcardBtn').addEventListener('click', ()=> sendSelectionTo(r, 'flashcard'));
    setEraseMode(r, r.eraseMode); // reaplica o estado visual (o DOM é reconstruído do zero aqui)
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
        const pvBox = pv.div.getBoundingClientRect();
        const canvasBox = (pv.div.querySelector('canvas') || pv.div).getBoundingClientRect();
        const hiLayer = document.createElement('div');
        hiLayer.id = 'l3rHiLayer';
        hiLayer.className = 'l3r-hilayer' + (r.eraseMode ? ' l3r-erase-active' : '');
        hiLayer.style.left = (canvasBox.left-pvBox.left)+'px';
        hiLayer.style.top = (canvasBox.top-pvBox.top)+'px';
        hiLayer.style.width = canvasBox.width+'px';
        hiLayer.style.height = canvasBox.height+'px';
        pv.div.appendChild(hiLayer);
        r.el.hiLayer = hiLayer;

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
    const rects = Array.from(sel.getRangeAt(0).getClientRects()).map(rc=>({
      x:(rc.left-host.left)/host.width, y:(rc.top-host.top)/host.height,
      w:rc.width/host.width, h:rc.height/host.height
    })).filter(rc=>rc.w>0 && rc.h>0);
    if(!rects.length) return;
    const hl = { id:Date.now().toString(36)+Math.random().toString(36).slice(2,6), page:r.currentPage, color:colorHex, rects, text, ts:Date.now() };
    r.highlights.push(hl);
    persistHighlights(r);
    renderHighlightsForPage(r);
    sel.removeAllRanges();
  }
  function removeHighlight(r, id){
    r.highlights = r.highlights.filter(h=>h.id!==id);
    persistHighlights(r);
    renderHighlightsForPage(r);
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
    r.highlights.filter(h=>h.page===r.currentPage).forEach(h=>{
      const color = HL_COLOR_MAP[h.color] || h.color || HL_COLORS[0].v; // ids antigos continuam OK
      h.rects.forEach(rc=>{
        const d = document.createElement('div');
        d.className = 'l3r-hl';
        d.style.left = (rc.x*100)+'%';
        d.style.top = (rc.y*100)+'%';
        d.style.width = (rc.w*100)+'%';
        d.style.height = (rc.h*100)+'%';
        d.style.background = color;
        d.addEventListener('click', ()=>{ if(r.eraseMode) removeHighlight(r, h.id); });
        layer.appendChild(d);
      });
    });
  }

  /* ---------------------------- borracha ----------------------------
     Enquanto ativa, a camada de marcações passa a aceitar clique (ela normalmente ignora o
     mouse — pointer-events:none — pra não atrapalhar a seleção de texto por baixo). */
  function setEraseMode(r, on){
    r.eraseMode = on;
    if(r.el.hiLayer) r.el.hiLayer.classList.toggle('l3r-erase-active', on);
    r.el.eraserBtn.classList.toggle('l3r-ic-active', on);
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
