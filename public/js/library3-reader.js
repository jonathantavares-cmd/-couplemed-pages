/* CoupleMed — Library 3: leitor de PDF embutido (piloto)
   ============================================================================
   Abre um PDF da Library 3 DENTRO do site (em vez de nova aba), com:
     - navegação paginada (PDFPageView do próprio PDF.js — canvas + camada de
       texto de verdade, selecionável);
     - zoom, busca por texto, download do arquivo original;
     - marcação (highlight) de trechos, persistida por usuário e sincronizada
       entre aparelhos via a mesma camada genérica de `cm-sync.js`;
     - tradução da página NO LUGAR: ao trocar a bandeira 🇧🇷/🇺🇸 do topo do site
       (o mesmo seletor global que traduz o QBank), a página atual troca de idioma
       sem nenhum botão/painel próprio. Técnica "mascarar e sobrepor": o canvas
       original do PDF nunca é alterado; por cima dele desenho retângulos com a
       cor de fundo amostrada em cima de cada linha de texto (apagando o inglês
       visualmente sem tocar nas imagens/diagramas) e sobreponho o texto traduzido
       em HTML na mesma posição, usando o MESMO motor/cache de tradução do resto
       do site (window.CMI18N.span/translateAllVisible — igual ao QBank). Ver
       "Tradução no lugar (mask & overlay)" mais abaixo.
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
          matchOf:m=>`${m.i} of ${m.n}`, hl:'Highlight', flashcard:'Flashcard', notebook:'Notebook',
          zoomIn:'Zoom in', zoomOut:'Zoom out', back:'Back' },
    pt: { loading:'Carregando PDF…', loadError:'Não foi possível carregar este PDF.', download:'Baixar',
          page:'Página', of:'de', search:'Buscar neste documento…', noMatches:'0 resultados',
          matchOf:m=>`${m.i} de ${m.n}`, hl:'Marcar', flashcard:'Flashcard', notebook:'Notebook',
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
    // site.js já re-chama open() sozinho ao trocar a bandeira 🇧🇷/🇺🇸 (setLang() ->
    // updateDynamicContent() -> renderLibrary() -> aqui, pra qualquer página cujo título
    // dependa do idioma — Library 3 está nessa lista). Se for o MESMO PDF já aberto, isso
    // é só uma re-renderização por causa do idioma: reaproveita o documento já carregado
    // (evita rebaixar da rede de novo) e mantém página/zoom, só refaz o esqueleto e o
    // desenho da página atual — é isso que reconstrói a sobreposição traduzida.
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
      pdfDoc:null, pageView:null, pageCount:0, currentPage:1, scale:1.3,
      textIndex:null, textIndexPromise:null,
      search:{ query:'', matches:[], idx:-1 },
      highlights: (loadAllHighlights()[item.key] || [])
    };
    activeReader = r;
    renderSkeleton(r);
    loadPdfJs().then(({pdfjsLib, PDFPageView, EventBus})=>{
      if(activeReader!==r) return; // usuário já saiu daqui
      r.pdfjsLib = pdfjsLib; r.PDFPageView = PDFPageView; r.eventBus = new EventBus();
      // `pv.draw()` resolve assim que o CANVAS termina — a camada de texto (.textLayer, de
      // onde a sobreposição traduzida lê as posições) renderiza à parte e só fica pronta
      // quando este evento dispara. Esperar por ele (em vez de só o draw()) evita montar a
      // tradução antes das spans existirem (dava 0 linhas encontradas).
      r.eventBus.on('textlayerrendered', evt=>{
        if(activeReader!==r || evt.pageNumber!==r.currentPage || uiLang()!=='pt') return;
        buildTranslationOverlay(r);
      });
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
          <a class="l3r-btn l3r-download" id="l3rDownloadLink" download>⬇ ${esc(t('download'))}</a>
        </div>
        <div class="l3r-body">
          <div class="l3r-pagewrap" id="l3rPageWrap">
            <div class="l3r-loading" id="l3rLoading">${esc(t('loading'))}</div>
            <div class="l3r-pagehost pdfViewer" id="l3rPageHost">
              <div class="l3r-hilayer" id="l3rHiLayer"></div>
              <canvas class="l3r-mask-layer" id="l3rMaskLayer" hidden></canvas>
              <div class="l3r-translate-layer" id="l3rTranslateLayer" hidden></div>
            </div>
          </div>
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
      maskLayer: r.hostEl.querySelector('#l3rMaskLayer'),
      translateLayer: r.hostEl.querySelector('#l3rTranslateLayer'),
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
    r.el.pageInput.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); goToPage(r, parseInt(r.el.pageInput.value,10)||1); r.el.pageInput.blur(); }
    });
    r.hostEl.querySelector('#l3rZoomOut').addEventListener('click', ()=> setScale(r, r.scale-0.15));
    r.hostEl.querySelector('#l3rZoomIn').addEventListener('click', ()=> setScale(r, r.scale+0.15));

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
        // se estiver em PT, quem monta a sobreposição é o listener de 'textlayerrendered'
        // (garante que a camada de texto já existe); aqui só limpa quando volta pro EN.
        if(uiLang()!=='pt') clearTranslationOverlay(r);
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

  /* ---------------------------- tradução no lugar (mask & overlay) ----------------------------
     Sem botão/painel próprio: dispara junto com a troca da bandeira 🇧🇷/🇺🇸 do topo do site
     (que já muda document.documentElement.lang — o mesmo gatilho que o QBank usa pra traduzir
     as questões). O canvas original nunca é tocado: numa camada extra por cima, mascaro cada
     linha de texto com a cor de fundo amostrada e sobreponho o texto traduzido em HTML,
     reaproveitando window.CMI18N.span()/translateAllVisible() — o motor único de tradução de
     conteúdo do site (mesmo usado em qbank.js:9176-9179). */

  // Agrupa as SPANS já renderizadas pela camada de texto do próprio PDF.js (.textLayer) em
  // linhas. Usar as spans reais (em vez de recalcular a posição a partir da matriz do PDF)
  // garante alinhamento exato com o que está na tela — é a mesma geometria que já funciona
  // pra seleção de texto — em vez de reimplementar (e arriscar errar) a matemática de
  // transform/viewport do PDF.js.
  function buildLinesFromTextLayer(r){
    const textLayerEl = r.pageView.div && r.pageView.div.querySelector('.textLayer');
    if(!textLayerEl) return [];
    const hostRect = r.el.pageHost.getBoundingClientRect();
    const spans = Array.from(textLayerEl.querySelectorAll('span'))
      .filter(sp=>sp.children.length===0 && sp.textContent && sp.textContent.trim());
    const items = spans.map(sp=>{
      const rc = sp.getBoundingClientRect();
      const fontSize = parseFloat(getComputedStyle(sp).fontSize) || rc.height*0.8;
      return { text: sp.textContent, x:rc.left-hostRect.left, y:rc.top-hostRect.top, w:rc.width, h:rc.height, fontSize };
    }).filter(it=>it.w>0 && it.h>0);

    const lines = [];
    let cur = null;
    items.forEach(it=>{
      if(cur){
        const curH = cur.y2-cur.y;
        const closeY = Math.abs((it.y+it.h/2)-(cur.y+curH/2)) < Math.max(it.h,curH)*0.6;
        const gap = it.x - cur.x2;
        // tolerância generosa: cobre espaço normal entre palavras E títulos com letras bem
        // espaçadas (ex.: "H I G H - Y I E L D"), sem juntar colunas/blocos realmente
        // diferentes (esses ficam bem mais longe que ~3.5x a altura da linha).
        const sameLine = closeY && gap > -Math.max(2, it.w*0.4) && gap < Math.max(it.h,curH)*3.5;
        if(sameLine){
          cur.text += (/\s$/.test(cur.text) || /^\s/.test(it.text)) ? it.text : (' '+it.text);
          cur.x2 = Math.max(cur.x2, it.x+it.w);
          cur.y = Math.min(cur.y, it.y);
          cur.y2 = Math.max(cur.y2, it.y+it.h);
          cur.fontSize = Math.max(cur.fontSize, it.fontSize);
          return;
        }
        lines.push(cur); cur = null;
      }
      cur = { text:it.text, x:it.x, x2:it.x+it.w, y:it.y, y2:it.y+it.h, fontSize:it.fontSize };
    });
    if(cur) lines.push(cur);
    return lines.filter(l=>l.text && l.text.trim());
  }

  const luminance = p => 0.299*p[0]+0.587*p[1]+0.114*p[2];
  const toHex = p => '#'+p.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');

  // Amostra a cor de fundo (bordas da caixa) e a cor de "tinta" (pixel mais contrastante lá
  // dentro) de uma região do canvas JÁ renderizado, antes de mascarar — pra cobrir tanto texto
  // escuro em fundo claro quanto texto claro na barra escura de seção.
  function sampleLineColors(ctx, rect){
    const x = Math.max(0, Math.round(rect.x)), y = Math.max(0, Math.round(rect.y));
    const w = Math.max(1, Math.round(rect.w)), h = Math.max(1, Math.round(rect.h));
    let data;
    try{ data = ctx.getImageData(x, y, w, h).data; }
    catch(e){ return { bg:'#ffffff', ink:'#132235' }; }
    const step = Math.max(1, Math.floor(Math.min(w,h)/24));
    const edge = [], all = [];
    for(let j=0;j<h;j+=step){
      for(let i=0;i<w;i+=step){
        const idx = (j*w+i)*4;
        const px = [data[idx],data[idx+1],data[idx+2]];
        all.push(px);
        if(i<step*2 || j<step*2 || i>w-step*2 || j>h-step*2) edge.push(px);
      }
    }
    const avg = arr => { const s=arr.reduce((a,p)=>[a[0]+p[0],a[1]+p[1],a[2]+p[2]],[0,0,0]); return s.map(v=>v/arr.length); };
    const bg = avg(edge.length?edge:all);
    let inkPx = bg, best = -1;
    all.forEach(p=>{
      const d = (p[0]-bg[0])**2+(p[1]-bg[1])**2+(p[2]-bg[2])**2;
      if(d>best){ best=d; inkPx=p; }
    });
    return { bg: toHex(bg), ink: best>800 ? toHex(inkPx) : (luminance(bg)>140 ? '#132235' : '#ffffff') };
  }

  // Depois que a tradução real (assíncrona, via CM.translateAllVisible) preenche o texto,
  // encolhe a fonte das linhas que ficaram grandes demais pro espaço original.
  function fitOverlayLine(div){
    const targetH = parseFloat(div.dataset.targetH||'0');
    const baseFont = parseFloat(div.dataset.baseFont||'0');
    if(!targetH || !baseFont) return;
    let size = parseFloat(div.style.fontSize) || baseFont;
    let guard = 0;
    while(div.scrollHeight > targetH*1.25 && size > baseFont*0.7 && guard<6){
      size *= 0.92;
      div.style.fontSize = size+'px';
      div.style.lineHeight = Math.max(size*1.05, targetH*0.6)+'px';
      guard++;
    }
  }

  async function buildTranslationOverlay(r){
    const CM = window.CMI18N;
    if(!CM || !r.pageView || !r.el) return;
    const page = r.currentPage;

    const canvas = r.pageView.canvas || (r.pageView.div && r.pageView.div.querySelector('canvas'));
    const hostRect = r.el.pageHost.getBoundingClientRect();
    if(!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const canvasOffX = canvasRect.left-hostRect.left, canvasOffY = canvasRect.top-hostRect.top;
    const dpr = canvas.width / canvas.clientWidth || 1;
    const srcCtx = canvas.getContext('2d');

    const lines = buildLinesFromTextLayer(r);
    if(activeReader!==r || r.currentPage!==page || uiLang()!=='pt') return;

    const hostW = r.el.pageHost.clientWidth, hostH = r.el.pageHost.clientHeight;
    const maskCanvas = r.el.maskLayer, overlay = r.el.translateLayer;
    maskCanvas.width = hostW; maskCanvas.height = hostH;
    maskCanvas.style.width = hostW+'px'; maskCanvas.style.height = hostH+'px';
    overlay.style.width = hostW+'px'; overlay.style.height = hostH+'px';
    const mctx = maskCanvas.getContext('2d');
    mctx.clearRect(0,0,hostW,hostH);
    overlay.innerHTML = '';

    lines.forEach(line=>{
      const x = line.x, y = line.y, w = line.x2-line.x, h = line.y2-line.y;
      if(w<=0 || h<=0) return;
      // amostragem de cor precisa das coordenadas relativas ao CANVAS (não ao pageHost) e em
      // pixels reais do buffer (canvas.width pode ser maior que clientWidth em telas retina)
      const colors = sampleLineColors(srcCtx, {
        x:(x-canvasOffX)*dpr, y:(y-canvasOffY)*dpr, w:w*dpr, h:h*dpr
      });
      mctx.fillStyle = colors.bg;
      mctx.fillRect(Math.max(0,x-2), Math.max(0,y-2), w+4, h+4);

      const fontSize = Math.max(7, line.fontSize*0.92);
      const div = document.createElement('div');
      div.className = 'l3r-translated-line';
      div.style.left = x+'px'; div.style.top = y+'px';
      div.style.width = w+'px'; div.style.minHeight = h+'px';
      div.style.color = colors.ink;
      div.style.fontSize = fontSize+'px';
      div.style.lineHeight = Math.max(fontSize*1.05, h*0.85)+'px';
      div.dataset.targetH = String(h);
      div.dataset.baseFont = String(fontSize);
      div.textContent = line.text; // mostra o inglês na hora; troca pro traduzido assim que chegar
      overlay.appendChild(div);
      line.div = div;
    });

    maskCanvas.hidden = false;
    overlay.hidden = false;
    const origTextLayer = r.pageView.div && r.pageView.div.querySelector('.textLayer');
    if(origTextLayer) origTextLayer.style.pointerEvents = 'none';

    // Uma página tem muito mais linhas (dezenas) do que qualquer outro lugar do site que usa
    // CM.translateAllVisible (que dispara tudo em paralelo) — isso estourava o limite de taxa
    // da API gratuita de tradução. Aqui, chamo CM.translateText() diretamente (mesmo motor/
    // cache — é a mesma função que select-translate.js já usa) só que com um número pequeno
    // de chamadas simultâneas por vez, pra não tomar 429.
    translateLinesThrottled(CM, lines, page);
  }

  async function translateLinesThrottled(CM, lines, page, concurrency){
    concurrency = concurrency || 3;
    let idx = 0;
    async function worker(){
      while(idx < lines.length){
        const line = lines[idx++];
        const r = activeReader;
        if(!r || r.currentPage!==page || uiLang()!=='pt' || !line.div || !line.div.isConnected) continue;
        try{
          const tr = await CM.translateText(line.text, 'pt', 'en');
          if(activeReader===r && r.currentPage===page && line.div.isConnected) line.div.textContent = tr || line.text;
        }catch(e){ /* mantém o inglês se a tradução falhar */ }
        if(line.div && line.div.isConnected) fitOverlayLine(line.div);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, lines.length) }, worker));
  }

  function clearTranslationOverlay(r){
    if(!r.el) return;
    if(r.el.maskLayer){
      r.el.maskLayer.hidden = true;
      const c = r.el.maskLayer.getContext('2d');
      if(c) c.clearRect(0,0,r.el.maskLayer.width,r.el.maskLayer.height);
    }
    if(r.el.translateLayer){
      r.el.translateLayer.hidden = true;
      r.el.translateLayer.innerHTML = '';
    }
    const origTextLayer = r.pageView && r.pageView.div && r.pageView.div.querySelector('.textLayer');
    if(origTextLayer) origTextLayer.style.pointerEvents = '';
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

  /* Troca de idioma: NÃO precisa de observer próprio aqui. site.js já re-chama open() sozinho
     quando a bandeira 🇧🇷/🇺🇸 do topo muda (setLang -> updateDynamicContent -> renderLibrary),
     e open() (acima) já sabe reaproveitar o documento carregado e re-renderizar a página atual
     nesse caso. Ter um observer próprio AQUI TAMBÉM causava uma corrida: os dois disparavam pro
     mesmo evento, e o open() (que reseta pra página 1) podia vencer depois do reaproveitamento
     ter rodado, perdendo a página em que o usuário estava. */

  window.CMLibrary3Reader = { open, close: destroyActive };
})();
