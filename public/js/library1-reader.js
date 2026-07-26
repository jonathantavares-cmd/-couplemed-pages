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
  const PAGE_CSS    = '/css/library1-reader.css?v=4';   // específico do modo página
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
          zoomIn:'Zoom in', zoomOut:'Zoom out', zoomReset:'Fit to window',
          empty:'Content for this topic has not been added yet.',
          emptyHint:'It will appear here as soon as the material is included.',
          ctTitle:'Create Test', ctSub:'Practice questions on this topic only. Separate from QBank 1 — these do not affect your QBank performance.',
          ctStart:'Create Test', ctQuestion:'question', ctQuestions:'questions',
          ctDone:'Test completed', ctRight:'Correct', ctWrong:'Incorrect',
          ctReview:'Review answers', ctRedo:'Retake test', ctSubmit:'Submit',
          ctNext:'Next', ctPrev:'Previous', ctFinish:'Finish test',
          ctCorrect:'Correct', ctIncorrect:'Incorrect', ctObjective:'Educational objective:',
          ctBackToTopic:'Back to topic', ctResultTitle:'Test completed',
          ctScope:'Topic-only test · does not count toward QBank 1' },
    pt: { loading:'Carregando…', loadError:'Este tópico ainda não tem conteúdo.',
          download:'Baixar', downloadEn:'Baixar (Inglês)', downloadPt:'Baixar (Português)',
          search:'Buscar nesta página…', of:'de', hl:'Marcar', flashcard:'Flashcard',
          notebook:'Notebook', notes:'Notes', back:'Voltar', customColor:'Cor personalizada',
          eraserToggle:'Opções de borracha', eraserClick:'Clique numa marcação pra apagar',
          undo:'Desfazer', redo:'Refazer', more:'Mais ferramentas', colors:'Cores',
          fontSmaller:'Diminuir texto', fontBigger:'Aumentar texto', language:'Idioma', close:'Fechar',
          zoomIn:'Aumentar', zoomOut:'Diminuir', zoomReset:'Ajustar à janela',
          empty:'O conteúdo deste tópico ainda não foi incluído.',
          emptyHint:'Ele aparecerá aqui assim que o material for adicionado.',
          ctTitle:'Create Test', ctSub:'Questões de treino só deste tópico. Separadas do QBank 1 — não afetam o desempenho do QBank.',
          ctStart:'Create Test', ctQuestion:'questão', ctQuestions:'questões',
          ctDone:'Teste concluído', ctRight:'Acertos', ctWrong:'Erros',
          ctReview:'Rever respostas', ctRedo:'Refazer teste', ctSubmit:'Responder',
          ctNext:'Próxima', ctPrev:'Anterior', ctFinish:'Finalizar teste',
          ctCorrect:'Correto', ctIncorrect:'Incorreto', ctObjective:'Objetivo educacional:',
          ctBackToTopic:'Voltar ao tópico', ctResultTitle:'Teste concluído',
          ctScope:'Teste só deste tópico · não conta no QBank 1' }
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

      // ---- Create Test: bloco no fim do conteúdo ----
      const ct = e.target.closest && e.target.closest('[data-ct]');
      if(ct){
        if(ct.dataset.ct === 'start')  startQuiz(r, {});
        if(ct.dataset.ct === 'review') startQuiz(r, { review:true });
        if(ct.dataset.ct === 'redo'){ clearQuizResult(r); startQuiz(r, {}); }
        return;
      }
      // ---- Create Test: dentro do teste ----
      const opt = e.target.closest && e.target.closest('[data-q-opt]');
      if(opt && r.quiz){
        const item = r.quiz.items[r.quiz.i];
        if(!r.quiz.revealed[item.id]){ r.quiz.answers[item.id] = opt.dataset.qOpt; renderQuiz(r); }
        return;
      }
      const qa = e.target.closest && e.target.closest('[data-q]');
      if(qa){
        const act = qa.dataset.q;
        if(act === 'submit' && r.quiz){
          const item = r.quiz.items[r.quiz.i];
          if(r.quiz.answers[item.id]){ r.quiz.revealed[item.id] = true; renderQuiz(r); }
        }
        else if(act === 'next' && r.quiz){ r.quiz.i = Math.min(r.quiz.items.length-1, r.quiz.i+1); renderQuiz(r); }
        else if(act === 'prev' && r.quiz){ r.quiz.i = Math.max(0, r.quiz.i-1); renderQuiz(r); }
        else if(act === 'finish') finishQuiz(r);
        else if(act === 'redo'){ clearQuizResult(r); startQuiz(r, {}); }
        else if(act === 'exit') exitQuiz(r);
        return;
      }
      // no ARTIGO a página não mostra imagem (só a referência abre). Já dentro do Create Test
      // a figura é exibida e clicar nela amplia — igual ao QBank 1 (§11.2).
      const qfig = e.target.closest && e.target.closest('figure[data-asset]');
      if(qfig){ openLightbox(r, qfig.dataset.asset); return; }
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
      <div class="l1r-ex" role="dialog" aria-modal="true">
        <div class="l1r-ex-head">
          <span class="l1r-ex-title" data-ex-title></span>
          <span class="l1r-ex-nav">
            <button type="button" class="l1r-ex-btn" data-lb-nav="-1" aria-label="prev">‹</button>
            <b data-ex-count>1/1</b>
            <button type="button" class="l1r-ex-btn" data-lb-nav="1" aria-label="next">›</button>
          </span>
          <button type="button" class="l1r-ex-btn l1r-ex-close" aria-label="${esc(t('close'))}" title="${esc(t('close'))}">✕</button>
        </div>
        <div class="l1r-ex-body" data-ex-body><img alt="" /></div>
        <div class="l1r-ex-cap" data-ex-cap></div>
        <div class="l1r-ex-foot">
          <button type="button" class="l1r-ex-btn" data-ex-zoom="-1" aria-label="${esc(t('zoomOut'))}" title="${esc(t('zoomOut'))}">−</button>
          <span class="l1r-ex-zoomlabel" data-ex-zoomlabel>100%</span>
          <button type="button" class="l1r-ex-btn" data-ex-zoom="1" aria-label="${esc(t('zoomIn'))}" title="${esc(t('zoomIn'))}">+</button>
          <button type="button" class="l1r-ex-btn" data-ex-zoom="0" aria-label="${esc(t('zoomReset'))}" title="${esc(t('zoomReset'))}">⟳</button>
        </div>
      </div>`;
    box.addEventListener('click', e=>{
      const nav = e.target.closest('[data-lb-nav]');
      if(nav){ stepLightbox(r, Number(nav.dataset.lbNav)); return; }
      const z = e.target.closest('[data-ex-zoom]');
      if(z){ zoomLightbox(r, Number(z.dataset.exZoom)); return; }
      // clicar FORA da janela fecha; dentro, não
      if(e.target===box || e.target.closest('.l1r-ex-close')) closeLightbox(r);
    });
    document.body.appendChild(box);
    r.lightbox = box;
    r.lightboxKey = refKey;
    r.lbZoom = 1;
    paintLightbox(r);
    if(!r.lbKeyHandler){
      r.lbKeyHandler = e=>{
        if(!r.lightbox) return;
        if(e.key==='Escape') closeLightbox(r);
        else if(e.key==='ArrowRight') stepLightbox(r, 1);
        else if(e.key==='ArrowLeft')  stepLightbox(r, -1);
        else if(e.key==='+' || e.key==='=') zoomLightbox(r, 1);
        else if(e.key==='-') zoomLightbox(r, -1);
      };
      document.addEventListener('keydown', r.lbKeyHandler);
    }
  }

  // Zoom da janela: 1 = imagem inteira visível (proporcional ao dispositivo).
  function zoomLightbox(r, dir){
    if(!r.lightbox) return;
    r.lbZoom = dir===0 ? 1 : Math.min(4, Math.max(1, Math.round((r.lbZoom + dir*0.25)*100)/100));
    applyZoom(r);
  }
  function applyZoom(r){
    if(!r.lightbox) return;
    const body = r.lightbox.querySelector('[data-ex-body]');
    const img  = body.querySelector('img');
    const z = r.lbZoom || 1;
    body.classList.toggle('l1r-ex-zoomed', z > 1);
    if(z > 1){
      // dimensiona de verdade (em vez de transform) para o scroll acompanhar
      img.style.transform = 'none';
      img.style.width = (z*100) + '%';
      img.style.height = 'auto';
    } else {
      img.style.transform = 'none';
      img.style.width = '';
      img.style.height = '';
    }
    const lbl = r.lightbox.querySelector('[data-ex-zoomlabel]');
    if(lbl) lbl.textContent = Math.round(z*100) + '%';
  }

  // Repinta com o idioma corrente — é o que faz a imagem trocar junto com o texto.
  function paintLightbox(r){
    if(!r.lightbox || !r.lightboxKey) return;
    const a = r.content.assets[r.lightboxKey];
    const v = assetSrc(r, r.lightboxKey, r.lang);
    if(!v) return;
    const img = r.lightbox.querySelector('[data-ex-body] img');
    img.setAttribute('src', v.src);
    img.setAttribute('alt', v.alt || '');

    const label = { image:  r.lang==='pt' ? 'Imagem'  : 'Image',
                    figure: r.lang==='pt' ? 'Figura'  : 'Figure',
                    table:  r.lang==='pt' ? 'Tabela'  : 'Table' }[a.kind] || '';
    r.lightbox.querySelector('[data-ex-title]').textContent = `${label} ${a.n}`;
    const cap = r.lightbox.querySelector('[data-ex-cap]');
    cap.textContent = v.alt || '';
    cap.hidden = !v.alt;

    const group = assetList(r, a.kind);
    const i = group.indexOf(r.lightboxKey);
    r.lightbox.querySelector('[data-ex-count]').textContent = `${i+1}/${group.length}`;
    r.lightbox.querySelectorAll('[data-lb-nav]').forEach(b=> b.hidden = group.length < 2);
    applyZoom(r);
  }
  function stepLightbox(r, dir){
    if(!r.lightboxKey) return;
    const a = r.content.assets[r.lightboxKey];
    const group = assetList(r, a.kind);
    const i = group.indexOf(r.lightboxKey);
    if(i < 0 || group.length < 2) return;
    r.lightboxKey = group[(i + dir + group.length) % group.length];
    r.lbZoom = 1;
    paintLightbox(r);
  }
  function closeLightbox(r){
    if(r.lightbox && r.lightbox.parentNode) r.lightbox.parentNode.removeChild(r.lightbox);
    r.lightbox = null;
    r.lightboxKey = null;
    r.lbZoom = 1;
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
    // no meio do Create Test, traduzir a QUESTÃO — não voltar para o artigo
    if(r.quiz) renderQuiz(r);
    else renderArticle(r);
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
    insertCreateTest(r);
    r.el.article.style.fontSize = (r.fontScale*100)+'%';
    r.baseHtml = r.el.article.innerHTML;
    applyAllHighlights(r);
    if(r.el.searchInput.value.trim()) runSearch(r, r.el.searchInput.value);
  }

  /* ============================== CREATE TEST ==============================
     Questões de treino DO TÓPICO, no fim do conteúdo e ACIMA das tags.

     ⚠️ REGRA ABSOLUTA (usuário, 2026-07-25): estas questões são SEPARADAS do QBank 1.
     Não entram no SEED do QBank, não aparecem nos filtros dele e **não contam na
     performance dele**. Vivem no próprio registro do tópico (campo `quiz`) e o
     resultado é gravado numa chave de localStorage exclusiva:

         couplemed_lib1quiz_<user>        (Library 1)
         ≠ qualquer chave do QBank        (nunca tocada por este arquivo)

     Cada tópico tem a SUA performance, independente de todos os outros.
  ========================================================================= */
  function quizOf(r){
    const qz = r.content && r.content.quiz;
    return Array.isArray(qz) && qz.length ? qz : null;
  }
  function quizKey(){ return `couplemed_lib1quiz_${currentUser()}`; }
  function loadAllQuizResults(){
    try{ return JSON.parse(localStorage.getItem(quizKey())||'{}') || {}; }catch(e){ return {}; }
  }
  function quizResult(r){
    const all = loadAllQuizResults();
    return all[topicKey(r)] || null;
  }
  function saveQuizResult(r, result){
    const all = loadAllQuizResults();
    all[topicKey(r)] = result;
    try{ localStorage.setItem(quizKey(), JSON.stringify(all)); }catch(e){}
  }
  function clearQuizResult(r){
    const all = loadAllQuizResults();
    delete all[topicKey(r)];
    try{ localStorage.setItem(quizKey(), JSON.stringify(all)); }catch(e){}
  }

  // Bloco no fim do conteúdo, imediatamente ACIMA das tags.
  function insertCreateTest(r){
    const quiz = quizOf(r);
    if(!quiz) return;
    const res = quizResult(r);
    const L = T[r.lang];
    let html;
    if(res && res.done){
      const pct = Math.round((res.correct / res.total) * 100);
      html = `<div class="l1r-ct l1r-ct-done">
        <div class="l1r-ct-head">
          <span class="l1r-ct-badge">✓</span>
          <b>${esc(L.ctDone)}</b>
          <span class="l1r-ct-score">${res.correct}/${res.total} · ${pct}%</span>
        </div>
        <div class="l1r-ct-stats">
          <span class="l1r-ct-ok">${esc(L.ctRight)}: <b>${res.correct}</b></span>
          <span class="l1r-ct-bad">${esc(L.ctWrong)}: <b>${res.total - res.correct}</b></span>
        </div>
        <div class="l1r-ct-actions">
          <button type="button" class="l1r-ct-btn" data-ct="review">${esc(L.ctReview)}</button>
          <button type="button" class="l1r-ct-btn l1r-ct-btn-alt" data-ct="redo">${esc(L.ctRedo)}</button>
        </div>
      </div>`;
    } else {
      html = `<div class="l1r-ct">
        <div class="l1r-ct-head"><b>${esc(L.ctTitle)}</b>
          <span class="l1r-ct-count">${quiz.length} ${esc(quiz.length===1 ? L.ctQuestion : L.ctQuestions)}</span>
        </div>
        <p class="l1r-ct-sub">${esc(L.ctSub)}</p>
        <div class="l1r-ct-actions">
          <button type="button" class="l1r-ct-btn" data-ct="start">${esc(L.ctStart)}</button>
        </div>
      </div>`;
    }
    const tags = r.el.article.querySelector('.l1r-tags');
    const anchor = tags ? (tags.previousElementSibling && /^H[23]$/.test(tags.previousElementSibling.tagName) ? tags.previousElementSibling : tags) : null;
    if(anchor) anchor.insertAdjacentHTML('beforebegin', html);
    else r.el.article.insertAdjacentHTML('beforeend', html);
  }

  /* --------- execução do teste --------- */
  function startQuiz(r, opts){
    const quiz = quizOf(r);
    if(!quiz) return;
    r.quiz = {
      items: quiz,
      i: 0,
      answers: {},                 // id -> letra escolhida
      revealed: {},                // id -> true depois de confirmar
      review: !!(opts && opts.review)
    };
    if(r.quiz.review){
      const res = quizResult(r);
      if(res && res.answers){ r.quiz.answers = { ...res.answers }; }
      Object.keys(r.quiz.answers).forEach(k=> r.quiz.revealed[k] = true);
    }
    renderQuiz(r);
  }
  function exitQuiz(r){
    r.quiz = null;
    renderArticle(r);
    r.el.article.scrollTop = 0;
    const wrap = r.hostEl.querySelector('#l1rPageWrap');
    if(wrap) wrap.scrollTop = 0;
  }

  function qField(item, lang, field){
    if(lang === 'pt' && item.ptTranslation && item.ptTranslation[field] != null) return item.ptTranslation[field];
    return item[field];
  }
  function qOptions(item, lang){
    const o = (lang === 'pt' && item.ptTranslation && item.ptTranslation.options) ? item.ptTranslation.options : item.options;
    return Array.isArray(o) ? o : [];
  }
  const LETTERS = ['A','B','C','D','E','F','G','H'];

  function renderQuiz(r){
    const Q = r.quiz; if(!Q) return;
    const L = T[r.lang];
    const item = Q.items[Q.i];
    const revealed = !!Q.revealed[item.id];
    const chosen = Q.answers[item.id] || null;
    const opts = qOptions(item, r.lang);
    const correctIdx = LETTERS.indexOf(item.correct);

    const optsHtml = opts.map((txt, idx)=>{
      const letter = LETTERS[idx];
      const isChosen = chosen === letter;
      const isCorrect = idx === correctIdx;
      let cls = 'l1r-q-opt';
      if(revealed && isCorrect) cls += ' l1r-q-opt-correct';
      else if(revealed && isChosen) cls += ' l1r-q-opt-wrong';
      if(isChosen) cls += ' l1r-q-opt-chosen';
      const peer = item.peer && item.peer[letter] != null ? `<span class="l1r-q-peer">${item.peer[letter]}%</span>` : '';
      return `<button type="button" class="${cls}" data-q-opt="${letter}"${revealed?' disabled':''}>
        <span class="l1r-q-letter">${letter}</span>
        <span class="l1r-q-text">${esc(txt)}</span>
        ${revealed ? peer : ''}
      </button>`;
    }).join('');

    /* Imagem da questão: no Create Test ela é EXIBIDA na página da questão, ao contrário da
       página do tópico (onde só abre no clique). É o mesmo padrão das questões do QBank 1
       (`renderQImage`/`renderExplImage` em qbank.js) — regra do usuário, §11.2. Continua
       clicável para ampliar. */
    const quizFigure = (key, extraClass) => {
      const v = key && assetSrc(r, key, r.lang);
      if(!v) return '';
      return `<figure class="l1r-q-figure${extraClass?' '+extraClass:''}" data-asset="${esc(key)}">
        <img src="${esc(v.src)}" alt="${esc(v.alt)}" loading="lazy" decoding="async" />
        ${v.alt ? `<figcaption>${esc(v.alt)}</figcaption>` : ''}
      </figure>`;
    };
    const imgHtml = quizFigure(item.img);

    let explHtml = '';
    if(revealed){
      const wrong = Object.entries(qField(item, r.lang, 'explI') || {})
        .map(([k,v])=>`<li><b>${k}.</b> ${esc(v)}</li>`).join('');
      const explImgHtml = quizFigure(item.explImg, 'l1r-q-figure-expl');
      explHtml = `<div class="l1r-q-expl">
        <h4>${esc(chosen === item.correct ? L.ctCorrect : L.ctIncorrect)}</h4>
        ${explImgHtml}
        <p>${esc(qField(item, r.lang, 'explC') || '')}</p>
        ${wrong ? `<ul class="l1r-q-wrong">${wrong}</ul>` : ''}
        ${qField(item, r.lang, 'objective') ? `<div class="l1r-q-obj"><b>${esc(L.ctObjective)}</b> ${esc(qField(item, r.lang, 'objective'))}</div>` : ''}
      </div>`;
    }

    const last = Q.i === Q.items.length - 1;
    const answeredAll = Q.items.every(it => Q.revealed[it.id]);

    r.el.article.innerHTML = `
      <div class="l1r-quiz">
        <div class="l1r-q-top">
          <button type="button" class="l1r-ct-btn l1r-ct-btn-alt" data-q="exit">‹ ${esc(L.ctBackToTopic)}</button>
          <span class="l1r-q-progress">${Q.i+1} / ${Q.items.length}</span>
          <span class="l1r-q-scope">${esc(L.ctScope)}</span>
        </div>
        <div class="l1r-q-card">
          <p class="l1r-q-vig">${esc(qField(item, r.lang, 'vignette') || '')}</p>
          ${imgHtml}
          <p class="l1r-q-stem"><b>${esc(qField(item, r.lang, 'q') || '')}</b></p>
          <div class="l1r-q-opts">${optsHtml}</div>
          ${!revealed ? `<div class="l1r-ct-actions"><button type="button" class="l1r-ct-btn" data-q="submit"${chosen?'':' disabled'}>${esc(L.ctSubmit)}</button></div>` : ''}
          ${explHtml}
        </div>
        <div class="l1r-q-nav">
          <button type="button" class="l1r-ct-btn l1r-ct-btn-alt" data-q="prev"${Q.i===0?' disabled':''}>‹ ${esc(L.ctPrev)}</button>
          ${last
            ? `<button type="button" class="l1r-ct-btn" data-q="finish"${answeredAll?'':' disabled'}>${esc(L.ctFinish)}</button>`
            : `<button type="button" class="l1r-ct-btn" data-q="next">${esc(L.ctNext)} ›</button>`}
        </div>
      </div>`;
    r.baseHtml = null;   // no modo teste não há marcação de texto
  }

  function finishQuiz(r){
    const Q = r.quiz; if(!Q) return;
    let correct = 0;
    Q.items.forEach(it=>{ if(Q.answers[it.id] === it.correct) correct++; });
    // grava SÓ na chave da Library 1 — o QBank não é tocado
    saveQuizResult(r, {
      done: true, correct, total: Q.items.length,
      answers: { ...Q.answers }, at: Date.now()
    });
    const L = T[r.lang];
    const pct = Math.round((correct / Q.items.length) * 100);
    r.el.article.innerHTML = `
      <div class="l1r-quiz">
        <div class="l1r-q-result">
          <div class="l1r-q-result-pct">${pct}%</div>
          <h3>${esc(L.ctResultTitle)}</h3>
          <p class="l1r-q-result-line">
            <span class="l1r-ct-ok">${esc(L.ctRight)}: <b>${correct}</b></span>
            <span class="l1r-ct-bad">${esc(L.ctWrong)}: <b>${Q.items.length - correct}</b></span>
          </p>
          <p class="l1r-ct-sub">${esc(L.ctScope)}</p>
          <div class="l1r-ct-actions">
            <button type="button" class="l1r-ct-btn" data-q="exit">${esc(L.ctBackToTopic)}</button>
            <button type="button" class="l1r-ct-btn l1r-ct-btn-alt" data-q="redo">${esc(L.ctRedo)}</button>
          </div>
        </div>
      </div>`;
    r.quiz = null;
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
  // Converte a imagem em data URI para o arquivo baixado funcionar OFFLINE, sem depender
  // do site nem do R2.
  function toDataUrl(url){
    return fetch(url)
      .then(res => res.ok ? res.blob() : Promise.reject(new Error(String(res.status))))
      .then(blob => new Promise((resolve, reject)=>{
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      }))
      .catch(()=> null);   // imagem que falhar não impede o download do texto
  }

  async function downloadArticle(r, lang){
    const body = articleBody(r, lang);
    if(!body) return;
    const title = body.title || itemName(r.topic, lang);
    const subject = itemName(r.folder, lang);
    const btn = r.hostEl.querySelector(lang==='pt' ? '#l1rDownloadPt' : '#l1rDownloadEn');
    const label = btn && btn.textContent;
    if(btn){ btn.disabled = true; btn.textContent = '…'; }

    try{
      // Monta o artigo num DOM solto para inserir as figuras nos lugares certos.
      const doc = document.createElement('div');
      doc.innerHTML = body.html || '';

      const assets = (r.content && r.content.assets) || {};
      const keys = Object.keys(assets).sort((a,b)=>(assets[a].n||0)-(assets[b].n||0));

      // Baixa todas as imagens do idioma pedido de uma vez.
      const data = {};
      await Promise.all(keys.map(async k=>{
        const v = assetSrc(r, k, lang);
        if(v) data[k] = await toDataUrl(v.src);
      }));

      // No arquivo baixado NÃO existe clique: a imagem tem de estar embutida no corpo,
      // logo depois do bloco que a referencia, no tamanho certo (regra do usuário).
      const placed = new Set();
      keys.forEach(k=>{
        const v = assetSrc(r, k, lang);
        if(!v || !data[k]) return;
        const a = assets[k];
        const lbl = { image:  lang==='pt' ? 'Imagem'  : 'Image',
                      figure: lang==='pt' ? 'Figura'  : 'Figure',
                      table:  lang==='pt' ? 'Tabela'  : 'Table' }[a.kind] || '';
        const fig = `<figure class="fig"><img src="${data[k]}" alt="${esc(v.alt)}" />` +
                    `<figcaption><b>${esc(lbl)} ${a.n}.</b> ${esc(v.alt)}</figcaption></figure>`;
        const ref = doc.querySelector(`[data-ref="${k.replace(/"/g,'\\"')}"]`);
        if(ref){
          let block = ref;
          while(block.parentElement && block.parentElement !== doc) block = block.parentElement;
          block.insertAdjacentHTML('afterend', fig);
        } else {
          doc.insertAdjacentHTML('beforeend', fig);   // sem referência: vai para o fim
        }
        placed.add(k);
      });

      // As referências viram texto simples (não há para onde clicar num arquivo salvo).
      doc.querySelectorAll('[data-ref]').forEach(el=>{
        const span = document.createElement('span');
        span.className = 'ref';
        span.textContent = el.textContent;
        el.replaceWith(span);
      });

      const html = `<!doctype html>
<html lang="${lang==='pt'?'pt-BR':'en'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.65;color:#12243d;max-width:820px;margin:0 auto;padding:40px 24px}
  h1{font-size:26px;line-height:1.25;margin:0 0 4px}
  .src{color:#6b7f9e;font-size:13px;margin:0 0 28px}
  h2{font-size:19px;margin:28px 0 8px} h3{font-size:16px;margin:22px 0 6px}
  table{border-collapse:collapse;width:100%;margin:16px 0} th,td{border:1px solid #d7deea;padding:8px 10px;text-align:left;vertical-align:top}
  th{background:#f2f5fa} ul,ol{padding-left:22px}
  .ref{color:#2768ff;font-weight:600}
  figure.fig{margin:18px 0;padding:12px;border:1px solid #dfe5ef;border-radius:8px;background:#fafbfe;text-align:center;page-break-inside:avoid;break-inside:avoid}
  figure.fig img{max-width:100%;height:auto;border-radius:4px}
  figure.fig figcaption{margin-top:8px;font-size:12.5px;color:#5b6c86;line-height:1.45}
  @media print{body{padding:0} figure.fig{border-color:#ccc;background:#fff}}
</style></head>
<body>
<h1>${esc(title)}</h1>
<p class="src">CoupleMed · Medical Library · Library 1 · ${esc(subject)}</p>
${doc.innerHTML}
</body></html>`;

      const blob = new Blob([html], { type:'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugify(title)}-${lang}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
    } finally {
      if(btn){ btn.disabled = false; btn.textContent = label; }
    }
  }

  window.CMLibrary1Reader = { open, close: destroyActive };
})();
