/* CoupleMed — Notebooks/Notes v1
   ============================================================================
   Módulo real de cadernos (substitui o placeholder My Workspace › Notebooks/Notes).
   Estrutura: Pastas → Cadernos → Notas. Editor rico (contenteditable nativo,
   sem libs externas) + modo de escrita à mão (canvas, strokes vetoriais com undo).
   Imagens: upload/colagem → Cloudflare R2 via worker (/api/notebook/upload);
   fallback automático para base64 comprimido se o R2 ainda não estiver ativo.
   Persistência: localStorage `couplemed_nb_${user}` (padrão do site).
   i18n: labels fixos no dicionário T local; conteúdo do usuário via CMI18N.span
   (títulos/nomes/tags). O CORPO da nota não é traduzido automaticamente — é o
   documento do usuário sendo editado.
   Busca global: provider registrado ANTES do guard de página (regra da seção 6
   do handoff), expondo pastas, cadernos e notas (com snippet do conteúdo).
   ============================================================================ */
(function(){
  'use strict';
  const params = new URLSearchParams(location.search);
  const PAGE = params.get('page') || 'home';
  const NB_PAGES = ['notebooks','notes']; // 'notes' abre a visão "All notes"
  const USER = params.get('u') || 'guest';
  const KEY = `couplemed_nb_${USER}`;

  /* ---------- reset único (limpeza dos dados de teste do My Workspace) ----------
     A pedido: tudo que estava salvo no My Workspace eram apenas testes. Esta rotina
     roda UMA ÚNICA VEZ ao carregar a nova versão e zera pastas/cadernos/notas de teste,
     começando o Workspace limpo já no formato premium. Não toca em QBank, Flashcards,
     login, progresso ou qualquer outro dado — apenas na chave do notebook deste usuário.
     A flag versionada garante que nunca reexecuta (edições futuras do usuário ficam a salvo). */
  const RESET_FLAG = 'couplemed_nb_reset_v2';
  (function oneTimeWorkspaceReset(){
    try{
      if(localStorage.getItem(RESET_FLAG)) return;      // já resetou antes → não repete
      // remove a chave de notebook de TODOS os usuários (limpa testes antigos por completo)
      const toDrop = [];
      for(let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i);
        if(k && k.indexOf('couplemed_nb_')===0 && k!==RESET_FLAG) toDrop.push(k);
      }
      toDrop.forEach(k=>localStorage.removeItem(k));
      localStorage.setItem(RESET_FLAG, String(Date.now()));
    }catch(e){}
  })();

  /* ---------- dados ---------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  function load(){
    try{
      const d = JSON.parse(localStorage.getItem(KEY));
      if(d && typeof d === 'object') return { folders:d.folders||[], notebooks:d.notebooks||[], notes:d.notes||[] };
    }catch(e){}
    return { folders:[], notebooks:[], notes:[] };
  }
  let DB = load();
  /* --- v2: migração transparente para o modelo de páginas ---
     Notas antigas guardam html/strokes direto na nota. O novo modelo usa
     nt.pages = [{id, html, strokes}] + nt.multiPage. Migramos on-load sem perder
     nada: a nota antiga vira uma nota de 1 página com o mesmo conteúdo. */
  function migrate(){
    let touched = false;
    (DB.notes||[]).forEach(nt=>{
      if(!Array.isArray(nt.pages)){
        nt.pages = [{ id: uid(), html: nt.html||'', strokes: Array.isArray(nt.strokes)?nt.strokes:[] }];
        if(nt.multiPage === undefined) nt.multiPage = false;
        if(nt.fav === undefined) nt.fav = false;
        if(!Array.isArray(nt.refs)) nt.refs = [];
        touched = true;
      }
    });
    (DB.folders||[]).forEach(f=>{ if(f.parentId===undefined){ f.parentId=null; touched=true; } });
    /* v3: capas antigas ({type:'color'|'image', value}) viram o novo modelo GoodNotes
       ({on, model, colorHex, image}) sem perder nada — cor antiga vira capa "Sólida". */
    (DB.notebooks||[]).forEach(nb=>{
      const c = nb.cover;
      if(c && c.on===undefined){
        nb.cover = c.type==='image'
          ? { on:true, model:'image', image:c.value }
          : { on:true, model:'solida', colorHex:c.value||'#55c6e4' };
        touched = true;
      }
      if(!nb.cover){ nb.cover = { on:false, model:'claras', colorHex:'#55c6e4' }; touched = true; }
    });
    if(touched){ try{ localStorage.setItem(KEY, JSON.stringify(DB)); }catch(e){} }
  }
  migrate();
  function save(){
    try{ localStorage.setItem(KEY, JSON.stringify(DB)); markSaved(); }
    catch(e){ toast(t('storageFull'), true); }
  }
  const stripHtml = html => { const d = document.createElement('div'); d.innerHTML = html||''; return (d.textContent||'').replace(/\s+/g,' ').trim(); };
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  /* ---------- ponte de busca global (window.CMSearchProviders.notebook) ----------
     Registrado ANTES do guard de página abaixo, para que a busca funcione em
     qualquer lugar do site — não só dentro do módulo (padrão do handoff §6). */
  window.CMSearchProviders = window.CMSearchProviders || {};
  window.CMSearchProviders.notebook = function(){
    const d = load(); // sempre lê o estado atual do localStorage
    const items = [];
    d.folders.forEach(f=>{
      items.push({ label:f.name, snippetSource:'', href:`app.html?page=notebooks&u=${USER}&folder=${f.id}`, cat:'Notebooks · Folders' });
    });
    d.notebooks.forEach(n=>{
      const f = d.folders.find(x=>x.id===n.folderId);
      items.push({ label:n.title, snippetSource:'', href:`app.html?page=notebooks&u=${USER}&nb=${n.id}`, cat:'Notebooks · '+(f?f.name:'No folder') });
    });
    d.notes.forEach(nt=>{
      const nb = d.notebooks.find(x=>x.id===nt.notebookId);
      const bodyHtml = Array.isArray(nt.pages) ? nt.pages.map(p=>p.html||'').join(' ') : (nt.html||'');
      items.push({
        label: nt.title || '(untitled note)',
        snippetSource: [nt.title, (nt.tags||[]).join(' '), stripHtml(bodyHtml)].filter(Boolean).join(' — '),
        href:`app.html?page=notebooks&u=${USER}&nb=${nt.notebookId}&note=${nt.id}`,
        cat:'Notes · '+(nb?nb.title:'')
      });
    });
    return items;
  };

  // guard de página: todo o restante (UI completa) só roda nas páginas do módulo —
  // o provider acima já ficou registrado e funciona em qualquer página.
  if(!NB_PAGES.includes(PAGE)) return;

  /* ---------- i18n de UI (labels fixos do desenvolvedor) ---------- */
  const T = {
    en:{
      title:'My Notebooks', titleNotes:'All Notes', home:'Home',
      newFolder:'+ New folder', newNotebook:'+ New notebook', newNote:'+ New note',
      folders:'Folders', notebooks:'notebooks', notes:'notes', note:'note',
      emptyFolders:'No folders yet. Create your first folder to organize your notebooks.',
      emptyBooks:'No notebooks in this folder yet.', emptyNotes:'No notes in this notebook yet.',
      emptyAll:'No notes yet. Open a notebook and create your first note.',
      searchNotes:'Search notes by title, tag or content...',
      folderName:'Folder name', color:'Color', create:'Create', saveBtn:'Save', cancel:'Cancel',
      notebookTitle:'Notebook title', icon:'Icon', cover:'Cover', coverColor:'Solid color', coverImage:'Upload image',
      paper:'Paper template', bg:'Background', orientation:'Orientation',
      portrait:'Portrait', landscape:'Landscape',
      pBlank:'Blank', pRuledS:'Ruled · narrow', pRuledM:'Ruled · medium', pRuledL:'Ruled · wide',
      pGridS:'Grid · small', pGridM:'Grid · medium', pGridL:'Grid · large',
      bgWhite:'White', bgCream:'Cream', bgBlack:'Black',
      rename:'Rename', customize:'Customize', del:'Delete', back:'← Back',
      confirmDelFolder:'Delete this folder AND all notebooks/notes inside it?',
      confirmDelBook:'Delete this notebook AND all notes inside it?',
      confirmDelNote:'Delete this note?', confirmClearDraw:'Clear the whole drawing on this page?',
      typeMode:'✎ Type', drawMode:'✍ Draw',
      untitled:'Untitled note', notePh:'Start typing your note here...',
      tagsPh:'+ tag (press Enter)', saved:'Saved', saving:'Saving...',
      fmtP:'Paragraph', fmtH1:'Title 1', fmtH2:'Title 2', fmtH3:'Title 3',
      fontDefault:'Font', sizeLbl:'Size',
      tipBold:'Bold', tipItalic:'Italic', tipUnder:'Underline', tipStrike:'Strikethrough',
      tipColor:'Font color', tipHilite:'Highlighter', tipLeft:'Align left', tipCenter:'Center', tipRight:'Align right',
      tipUl:'Bullet list', tipOl:'Numbered list', tipImg:'Insert image', tipClear:'Clear formatting',
      tipUndo:'Undo', tipRedo:'Redo',
      pen:'Pen', eraser:'Eraser', width:'Width', undoStroke:'Undo', clearDraw:'Clear',
      imgUploading:'Uploading image...', imgUploaded:'Image saved to cloud storage.',
      imgLocal:'Cloud storage unavailable — image saved locally (compressed). It may increase local storage usage.',
      imgTooBig:'Image too large (max 8MB).', imgOnly:'Only image files are supported.',
      storageFull:'Local storage is full! Delete old notes/images or move images to cloud storage.',
      updated:'Updated',
      /* --- v2: novas funcionalidades --- */
      subfolder:'+ Subfolder', parentFolder:'Parent folder', none:'None (top level)',
      favorites:'Favorites', favorite:'Favorite', unfavorite:'Remove from favorites',
      allFavorites:'Favorites', emptyFavorites:'No favorites yet. Star a note to pin it here.',
      viewGrid:'Grid view', viewList:'List view', duplicate:'Duplicate', moveTo:'Move to…',
      readMode:'Reading mode', editMode:'Edit', exitReading:'Exit reading',
      exportNote:'Export', exportPdf:'Export PDF', exportPrint:'Print', exportHtml:'Export HTML',
      checklist:'Checklist', tipCheck:'Checklist item', tipQuote:'Quote', tipCode:'Code block', tipLink:'Insert link', linkPrompt:'Link URL:',
      pages:'Pages', page:'Page', onePage:'Single page', multiPage:'Multi-page',
      addPage:'Add page', addPageAfter:'Add page after', duplicatePage:'Duplicate page', deletePage:'Delete page', clearPage:'Clear page',
      confirmDelPage:'Delete this page and its content?', pageOf:'Page {n} of {total}',
      prevPage:'Previous page', nextPage:'Next page', pageLayout:'Page layout',
      highlighter:'Highlighter', lasso:'Select / move', shapes:'Shapes',
      shapeLine:'Line', shapeRect:'Rectangle', shapeCircle:'Circle', shapeArrow:'Arrow',
      penTool:'Pen', markerTool:'Marker', eraserTool:'Eraser',
      moreColors:'More colors', penStyle:'Style', thin:'Thin', medium:'Medium', thick:'Thick',
      reference:'Reference', linkRef:'Link a reference', refQbank:'QBank question', refFlash:'Flashcard', refLibrary:'Medical Library',
      refAdd:'+ Add reference', refNonePicked:'No references linked yet.', refOpen:'Open reference', refRemove:'Remove reference',
      refPickQbank:'Paste QBank question ID or link', refPickFlash:'Paste Flashcard link/label', refPickLibrary:'Paste Medical Library topic/link',
      refHint:'References are links only — they never modify the QBank, Flashcards or Library.',
      insertMenu:'Insert', done:'Done',
      sortRecent:'Recent', sortName:'Name', sortCreated:'Created', sortBy:'Sort',
      pinned:'Pinned', tagFilter:'Filter by tag', allTags:'All tags', clearFilter:'Clear filter',
      wordCount:'{w} words · {c} chars', emptyReading:'This note is empty.',
      copyLink:'Copy link', linkCopied:'Link copied!', fullscreen:'Fullscreen', exitFullscreen:'Exit fullscreen',
      /* --- v3: fluxo de criação estilo GoodNotes --- */
      plusNew:'+ New', ctFolder:'Folder', ctNotebook:'Notebook', ctNotes:'Notes',
      newFolderTitle:'New folder', untitledFolder:'Untitled',
      tabColor:'Color', tabIcon:'Icon', noIcon:'None',
      colorsTitle:'Colors', pickerCustom:'Custom', pickerHistory:'History',
      removeColor:'Remove color', addPreset:'Add to presets', hexLbl:'HEX',
      nbNewTitle:'New notebook', nameLbl:'Name', nbUntitledPh:'Untitled notebook',
      paperCaps:'PAPER TEMPLATES', coverCaps:'COVER TEMPLATES',
      sizeLbl2:'Size', a4v:'A4, Vertical', a4h:'A4, Horizontal',
      paperModelsTitle:'Paper templates', coverModelsTitle:'Cover templates',
      essentials:'Essentials', simpleCat:'Simple',
      paperLbl:'PAPER', coverLbl2:'COVER',
      pDotted:'Dotted paper', pGridGN:'Grid paper', pNarrow:'Narrow ruled', pWide:'Wide ruled', pImported:'Imported',
      importLbl:'Import',
      cWhite:'White', cYellow:'Yellow', cBlack:'Black', cLBlue:'Light blue', cLGreen:'Light green', cLPink:'Light pink',
      cmClaras:'Bright', cmPercurso:'Doodle', cmSimples:'Simple', cmSolida:'Solid', cmLiso:'Plain',
      covBlue:'Blue', covPink:'Pink', covPurple:'Purple', covRed:'Red', covOrange:'Orange',
      covYellow:'Yellow', covGreen:'Green', covGray:'Gray', covBlack:'Black',
      editLbl:'Edit', noCover:'No cover'
    },
    pt:{
      title:'Meus Cadernos', titleNotes:'Todas as Notas', home:'Início',
      newFolder:'+ Nova pasta', newNotebook:'+ Novo caderno', newNote:'+ Nova nota',
      folders:'Pastas', notebooks:'cadernos', notes:'notas', note:'nota',
      emptyFolders:'Nenhuma pasta ainda. Crie sua primeira pasta para organizar seus cadernos.',
      emptyBooks:'Nenhum caderno nesta pasta ainda.', emptyNotes:'Nenhuma nota neste caderno ainda.',
      emptyAll:'Nenhuma nota ainda. Abra um caderno e crie sua primeira nota.',
      searchNotes:'Buscar notas por título, tag ou conteúdo...',
      folderName:'Nome da pasta', color:'Cor', create:'Criar', saveBtn:'Salvar', cancel:'Cancelar',
      notebookTitle:'Título do caderno', icon:'Ícone', cover:'Capa', coverColor:'Cor sólida', coverImage:'Enviar imagem',
      paper:'Modelo de papel', bg:'Fundo', orientation:'Orientação',
      portrait:'Retrato', landscape:'Paisagem',
      pBlank:'Branco', pRuledS:'Pautado · estreito', pRuledM:'Pautado · médio', pRuledL:'Pautado · largo',
      pGridS:'Quadriculado · pequeno', pGridM:'Quadriculado · médio', pGridL:'Quadriculado · grande',
      bgWhite:'Branco', bgCream:'Bege/Creme', bgBlack:'Preto',
      rename:'Renomear', customize:'Personalizar', del:'Excluir', back:'← Voltar',
      confirmDelFolder:'Excluir esta pasta E todos os cadernos/notas dentro dela?',
      confirmDelBook:'Excluir este caderno E todas as notas dentro dele?',
      confirmDelNote:'Excluir esta nota?', confirmClearDraw:'Apagar todo o desenho desta página?',
      typeMode:'✎ Digitar', drawMode:'✍ Escrever à mão',
      untitled:'Nota sem título', notePh:'Comece a digitar sua nota aqui...',
      tagsPh:'+ tag (pressione Enter)', saved:'Salvo', saving:'Salvando...',
      fmtP:'Parágrafo', fmtH1:'Título 1', fmtH2:'Título 2', fmtH3:'Título 3',
      fontDefault:'Fonte', sizeLbl:'Tamanho',
      tipBold:'Negrito', tipItalic:'Itálico', tipUnder:'Sublinhado', tipStrike:'Tachado',
      tipColor:'Cor da fonte', tipHilite:'Marca-texto', tipLeft:'Alinhar à esquerda', tipCenter:'Centralizar', tipRight:'Alinhar à direita',
      tipUl:'Lista com marcadores', tipOl:'Lista numerada', tipImg:'Inserir imagem', tipClear:'Limpar formatação',
      tipUndo:'Desfazer', tipRedo:'Refazer',
      pen:'Caneta', eraser:'Borracha', width:'Espessura', undoStroke:'Desfazer', clearDraw:'Limpar',
      imgUploading:'Enviando imagem...', imgUploaded:'Imagem salva no armazenamento em nuvem.',
      imgLocal:'Armazenamento em nuvem indisponível — imagem salva localmente (comprimida). Isso pode aumentar o uso do armazenamento local.',
      imgTooBig:'Imagem muito grande (máx. 8MB).', imgOnly:'Apenas arquivos de imagem são suportados.',
      storageFull:'O armazenamento local está cheio! Exclua notas/imagens antigas ou mova imagens para a nuvem.',
      updated:'Atualizado',
      /* --- v2: novas funcionalidades --- */
      subfolder:'+ Subpasta', parentFolder:'Pasta superior', none:'Nenhuma (nível principal)',
      favorites:'Favoritos', favorite:'Favoritar', unfavorite:'Remover dos favoritos',
      allFavorites:'Favoritos', emptyFavorites:'Nenhum favorito ainda. Marque uma nota com a estrela para fixá-la aqui.',
      viewGrid:'Visão em grade', viewList:'Visão em lista', duplicate:'Duplicar', moveTo:'Mover para…',
      readMode:'Modo leitura', editMode:'Editar', exitReading:'Sair da leitura',
      exportNote:'Exportar', exportPdf:'Exportar PDF', exportPrint:'Imprimir', exportHtml:'Exportar HTML',
      checklist:'Checklist', tipCheck:'Item de checklist', tipQuote:'Citação', tipCode:'Bloco de código', tipLink:'Inserir link', linkPrompt:'URL do link:',
      pages:'Páginas', page:'Página', onePage:'Página única', multiPage:'Multi-página',
      addPage:'Adicionar página', addPageAfter:'Adicionar página depois', duplicatePage:'Duplicar página', deletePage:'Excluir página', clearPage:'Limpar página',
      confirmDelPage:'Excluir esta página e seu conteúdo?', pageOf:'Página {n} de {total}',
      prevPage:'Página anterior', nextPage:'Próxima página', pageLayout:'Layout de página',
      highlighter:'Marca-texto', lasso:'Selecionar / mover', shapes:'Formas',
      shapeLine:'Linha', shapeRect:'Retângulo', shapeCircle:'Círculo', shapeArrow:'Seta',
      penTool:'Caneta', markerTool:'Marcador', eraserTool:'Borracha',
      moreColors:'Mais cores', penStyle:'Estilo', thin:'Fina', medium:'Média', thick:'Grossa',
      reference:'Referência', linkRef:'Vincular referência', refQbank:'Questão do QBank', refFlash:'Flashcard', refLibrary:'Medical Library',
      refAdd:'+ Adicionar referência', refNonePicked:'Nenhuma referência vinculada ainda.', refOpen:'Abrir referência', refRemove:'Remover referência',
      refPickQbank:'Cole o ID ou link da questão do QBank', refPickFlash:'Cole o link/rótulo do Flashcard', refPickLibrary:'Cole o tópico/link da Medical Library',
      refHint:'Referências são apenas links — nunca modificam o QBank, Flashcards ou a Library.',
      insertMenu:'Inserir', done:'Concluir',
      sortRecent:'Recentes', sortName:'Nome', sortCreated:'Criação', sortBy:'Ordenar',
      pinned:'Fixados', tagFilter:'Filtrar por tag', allTags:'Todas as tags', clearFilter:'Limpar filtro',
      wordCount:'{w} palavras · {c} caracteres', emptyReading:'Esta nota está vazia.',
      copyLink:'Copiar link', linkCopied:'Link copiado!', fullscreen:'Tela cheia', exitFullscreen:'Sair da tela cheia',
      /* --- v3: fluxo de criação estilo GoodNotes --- */
      plusNew:'+ Novo', ctFolder:'Pasta', ctNotebook:'Notebook', ctNotes:'Notes',
      newFolderTitle:'Nova pasta', untitledFolder:'Sem título',
      tabColor:'Cor', tabIcon:'Ícone', noIcon:'Nenhum',
      colorsTitle:'Cores', pickerCustom:'Personalizar', pickerHistory:'Histórico',
      removeColor:'Remover cor', addPreset:'Adicionar a predefinições', hexLbl:'HEX',
      nbNewTitle:'Novo caderno', nameLbl:'Nome', nbUntitledPh:'Caderno sem título',
      paperCaps:'MODELOS DE PAPEL', coverCaps:'MODELOS DE CAPA',
      sizeLbl2:'Tamanho', a4v:'A4, Vertical', a4h:'A4, Horizontal',
      paperModelsTitle:'Modelos de papel', coverModelsTitle:'Modelos de capa',
      essentials:'Essenciais', simpleCat:'Simples',
      paperLbl:'PAPEL', coverLbl2:'CAPA',
      pDotted:'Papel pontilhado', pGridGN:'Papel quadriculado', pNarrow:'Pautado estreito', pWide:'Pautado largo', pImported:'Importado',
      importLbl:'Importar',
      cWhite:'Branco', cYellow:'Amarelo', cBlack:'Preto', cLBlue:'Azul claro', cLGreen:'Verde claro', cLPink:'Rosa claro',
      cmClaras:'Claras', cmPercurso:'Percurso', cmSimples:'Simples', cmSolida:'Sólida', cmLiso:'Liso',
      covBlue:'Azul', covPink:'Rosa', covPurple:'Roxo', covRed:'Vermelho', covOrange:'Laranja',
      covYellow:'Amarelo', covGreen:'Verde', covGray:'Cinza', covBlack:'Preto',
      editLbl:'Editar', noCover:'Sem capa'
    }
  };
  const lang = () => document.documentElement.lang === 'pt-BR' ? 'pt' : 'en';
  const t = (k, vars) => {
    let s = (T[lang()] && T[lang()][k] !== undefined) ? T[lang()][k] : (T.en[k] !== undefined ? T.en[k] : k);
    if(vars) Object.keys(vars).forEach(vk=>{ s = s.replace(new RegExp('\\{'+vk+'\\}','g'), vars[vk]); });
    return s;
  };

  const CM = window.CMI18N;
  const cmSpan = (text, cls) => CM ? CM.span(text, cls) : `<span class="${cls||''}">${esc(text)}</span>`;

  /* ---------- constantes de personalização ---------- */
  const FOLDER_COLORS = ['#3d84ff','#7c5cff','#12a150','#e5484d','#f0932b','#0a9fb5','#d64f9e','#8d99ae'];
  const PEN_COLORS = ['#182233','#2768ff','#e5484d','#12a150','#f0932b','#7c5cff','#0a9fb5','#ffffff'];
  const SWATCHES = ['#182233','#5f748f','#2768ff','#0a9fb5','#12a150','#f0932b','#e5484d','#d64f9e','#7c5cff','#8c6d2d','#ffffff','#fff176'];
  /* v2: paleta ampliada para caneta/marcador (2 linhas), estilo GoodNotes */
  const PEN_PALETTE = ['#182233','#37414d','#2768ff','#1e40af','#0a9fb5','#12a150','#57b947','#f0932b','#e5484d','#c2185b','#7c5cff','#d64f9e','#8c6d2d','#ffffff'];
  const MARKER_PALETTE = ['#ffe08a','#ffd0a0','#ffe08a','#b8f5b0','#a8d8ff','#d9c4ff','#ffc4dd','#fff176','#b9f6ca','#84ffff','#ff8a80'];
  const PEN_WIDTHS = [{k:'thin',v:2},{k:'medium',v:4},{k:'thick',v:8}];
  const MARKER_WIDTHS = [{k:'thin',v:14},{k:'medium',v:22},{k:'thick',v:32}];
  /* ---------- v3: constantes do fluxo de criação estilo GoodNotes ---------- */
  // 3 fileiras de cores de pasta (escuras / vivas / claras) — a última posição é o arco-íris (cor personalizada)
  const GN_FOLDER_COLORS = [
    ['#8c2f39','#a04a2b','#8a6116','#1e6b34','#2b56b3','#6d3fbf','#94357c','#5b6066','#1d1d1f'],
    ['#f25c54','#f5a13d','#f0c53d','#5fd35f','#3d84ff','#b18aff','#f58ac8','#b9bcc0','#ffffff'],
    ['#f7b1b1','#f9d6a8','#f7eea0','#b5efc4','#c7dcff','#ddd0fa','#f9d4ea','#e8e6e1']
  ];
  // emojis visuais/chamativos para memorização de estudo (pedido do Jonathan — nada de ícones de linha)
  const GN_FOLDER_EMOJIS = [
    '🧠','🫀','🫁','🦴','🩸','💊','💉','🦠','🧬','🩺','🔬','🧪','🏥','🚑','🥼',
    '📚','📖','📝','✏️','📌','⭐','❤️','🔥','💡','🎯','🏆','⏰','😊','🌙','🎨','🎵','⚖️','🌍'
  ];
  // papéis "Essenciais" (ids legados ruled-m/grid-s/grid-l continuam válidos no CSS p/ cadernos antigos)
  const GN_PAPERS = [
    {id:'blank',   k:'pBlank',  th:''},
    {id:'dotted',  k:'pDotted', th:'nb-th-dotted'},
    {id:'grid-m',  k:'pGridGN', th:'nb-th-grid-m'},
    {id:'ruled-s', k:'pNarrow', th:'nb-th-ruled-s'},
    {id:'ruled-l', k:'pWide',   th:'nb-th-ruled-l'}
  ];
  const GN_PAPER_ALIAS = { 'ruled-m':'ruled-s', 'grid-s':'grid-m', 'grid-l':'grid-m' }; // legado → card equivalente
  // cores de papel: as 3 do GoodNotes + azul claro, verde claro e rosa claro (pedido)
  const GN_PAPER_COLORS = [
    {id:'white', k:'cWhite', c:'#ffffff'},
    {id:'cream', k:'cYellow',c:'#faf3dd'},
    {id:'black', k:'cBlack', c:'#1c1f26'},
    {id:'lblue', k:'cLBlue', c:'#e7f1fc'},
    {id:'lgreen',k:'cLGreen',c:'#e9f7ec'},
    {id:'lpink', k:'cLPink', c:'#fdeef5'}
  ];
  // cores de capa exatamente como o popover do GoodNotes (Imagem 21)
  const GN_COVER_COLORS = [
    {id:'blue',  k:'covBlue',  c:'#55c6e4'},
    {id:'pink',  k:'covPink',  c:'#ee93c6'},
    {id:'purple',k:'covPurple',c:'#b49add'},
    {id:'red',   k:'covRed',   c:'#e4746a'},
    {id:'orange',k:'covOrange',c:'#f0a45e'},
    {id:'yellow',k:'covYellow',c:'#f5d664'},
    {id:'green', k:'covGreen', c:'#59d99d'},
    {id:'gray',  k:'covGray',  c:'#a8a6a4'},
    {id:'black', k:'covBlack', c:'#3a3a3c'}
  ];
  const GN_COVER_MODELS = [
    {id:'claras',  k:'cmClaras'},
    {id:'percurso',k:'cmPercurso'},
    {id:'simples', k:'cmSimples'},
    {id:'solida',  k:'cmSolida'},
    {id:'liso',    k:'cmLiso'}
  ];
  const coverColorHex = id => { const cc = GN_COVER_COLORS.find(c=>c.id===id); return cc?cc.c:GN_COVER_COLORS[0].c; };
  const paperColorHex = id => { const pc = GN_PAPER_COLORS.find(c=>c.id===id); return pc?pc.c:'#ffffff'; };

  const defBook = () => ({ paper:'ruled-s', bg:'white', orientation:'portrait', icon:'', cover:{on:false, model:'claras', colorHex:'#55c6e4'} });

  /* ---------- upload de imagem (R2 com fallback base64) ---------- */
  async function compressImage(file, maxSide, quality){
    return new Promise((resolve,reject)=>{
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = ()=>{
        URL.revokeObjectURL(url);
        let w = img.naturalWidth, h = img.naturalHeight;
        const scale = Math.min(1, (maxSide||1600)/Math.max(w,h));
        w = Math.max(1, Math.round(w*scale)); h = Math.max(1, Math.round(h*scale));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(b => b ? resolve(b) : reject(new Error('compress failed')), 'image/jpeg', quality||0.85);
      };
      img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }
  const blobToDataURL = blob => new Promise((res,rej)=>{ const r = new FileReader(); r.onload = ()=>res(r.result); r.onerror = ()=>rej(new Error('read failed')); r.readAsDataURL(blob); });
  async function uploadImage(file){
    if(!/^image\//.test(file.type)){ toast(t('imgOnly'), true); return null; }
    if(file.size > 8*1024*1024){ toast(t('imgTooBig'), true); return null; }
    let blob = file;
    try{ if(!(file.type==='image/png' && file.size < 300*1024)) blob = await compressImage(file, 1600, 0.85); }catch(e){ blob = file; }
    toast(t('imgUploading'));
    try{
      const fd = new FormData();
      fd.append('file', blob, 'image');
      fd.append('user', USER);
      const resp = await fetch('/api/notebook/upload', { method:'POST', body:fd });
      if(resp.ok){
        const data = await resp.json();
        if(data && data.url){ toast(t('imgUploaded')); return data.url; }
      }
    }catch(e){}
    // fallback: R2 indisponível (503/erro de rede) → base64 comprimido no localStorage
    try{ const dataUrl = await blobToDataURL(blob); toast(t('imgLocal'), true); return dataUrl; }
    catch(e){ return null; }
  }
  function deleteRemoteImages(html){
    // melhor esforço: limpa do R2 as imagens de uma nota excluída
    const d = document.createElement('div'); d.innerHTML = html||'';
    d.querySelectorAll('img').forEach(img=>{
      const src = img.getAttribute('src')||'';
      if(src.startsWith('/api/notebook/img/')){
        try{ fetch(src, { method:'DELETE' }); }catch(e){}
      }
    });
  }

  /* ---------- estado / helpers de UI ---------- */
  let view = { name: PAGE==='notes' ? 'allnotes' : 'folders' };
  let root = null, host = null;
  let saveTimer = null, toastTimer = null;
  const fmtDate = ts => { const d = new Date(ts||Date.now()); return d.toLocaleDateString(lang()==='pt'?'pt-BR':'en-US', {day:'2-digit',month:'short',year:'numeric'}); };
  const folderById = id => DB.folders.find(f=>f.id===id);
  const bookById = id => DB.notebooks.find(n=>n.id===id);
  const noteById = id => DB.notes.find(n=>n.id===id);
  const booksIn = fid => DB.notebooks.filter(n=>n.folderId===fid);
  const notesIn = nbid => DB.notes.filter(n=>n.notebookId===nbid).sort((a,b)=>(b.updated||0)-(a.updated||0));
  /* v2: helpers de páginas / favoritos / subpastas / referências */
  const notePages = nt => Array.isArray(nt.pages) && nt.pages.length ? nt.pages : (nt.pages=[{id:uid(),html:nt.html||'',strokes:Array.isArray(nt.strokes)?nt.strokes:[]}]);
  const noteText = nt => notePages(nt).map(p=>stripHtml(p.html||'')).join(' ').replace(/\s+/g,' ').trim();
  const subfoldersOf = pid => DB.folders.filter(f=>(f.parentId||null)===(pid||null));
  const rootFolders = () => DB.folders.filter(f=>!f.parentId);
  const favNotes = () => DB.notes.filter(n=>n.fav).sort((a,b)=>(b.updated||0)-(a.updated||0));
  function allDescendantFolderIds(fid){
    const out=[fid]; let frontier=[fid];
    while(frontier.length){ const next=[]; frontier.forEach(id=>subfoldersOf(id).forEach(f=>{out.push(f.id);next.push(f.id);})); frontier=next; }
    return out;
  }

  function toast(msg, warn){
    let el = document.querySelector('.nb-toast');
    if(!el){ el = document.createElement('div'); el.className = 'nb-toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.toggle('nb-warn', !!warn); el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(()=>{ el.hidden = true; }, warn?4200:2200);
  }
  function markSaving(){ const el = root && root.querySelector('#nbSaveState'); if(el) el.textContent = t('saving'); }
  function markSaved(){ const el = root && root.querySelector('#nbSaveState'); if(el) el.textContent = t('saved'); }

  /* ---------- modal ---------- */
  function openModal(html){
    let m = document.querySelector('.nb-modal');
    if(!m){ m = document.createElement('div'); m.className = 'nb-modal'; document.body.appendChild(m);
      m.addEventListener('click', e=>{ if(e.target===m) closeModal(); }); }
    m.innerHTML = `<div class="nb-modal-box nb">${html}</div>`;
    m.hidden = false;
    return m;
  }
  function closeModal(){ const m = document.querySelector('.nb-modal'); if(m){ m.hidden = true; m.innerHTML=''; } }

  /* ==================================================================
     v3 — infraestrutura GoodNotes: popover ancorado, seletor de cor
     personalizado e renderização de pastas/capas.
     ================================================================== */
  let popEl = null, popCleanup = null;
  function closePopover(){
    if(popCleanup){ popCleanup(); popCleanup = null; }
    if(popEl){ popEl.remove(); popEl = null; }
  }
  /* popover com balão + seta, ancorado num elemento; fecha em clique fora/Esc */
  function openPopover(anchor, html, opts){
    opts = opts||{};
    closePopover();
    const pop = document.createElement('div');
    pop.className = 'nb nb-pop' + (opts.cls?' '+opts.cls:'');
    pop.innerHTML = `<span class="nb-pop-arrow"></span><div class="nb-pop-body">${html}</div>`;
    document.body.appendChild(pop);
    popEl = pop;
    const place = ()=>{
      const r = anchor.getBoundingClientRect();
      const pw = pop.offsetWidth, ph = pop.offsetHeight;
      let left = r.left + r.width/2 - pw/2;
      left = Math.max(10, Math.min(left, window.innerWidth - pw - 10));
      let top = r.bottom + 10;
      let above = false;
      if(top + ph > window.innerHeight - 10 && r.top - ph - 10 > 0){ top = r.top - ph - 10; above = true; }
      pop.style.left = left+'px'; pop.style.top = top+'px';
      pop.classList.toggle('nb-pop-above', above);
      const ar = pop.querySelector('.nb-pop-arrow');
      if(ar) ar.style.left = Math.max(14, Math.min(r.left + r.width/2 - left, pw-14))+'px';
    };
    place();
    requestAnimationFrame(place);
    const onDoc = e=>{ if(!pop.contains(e.target) && e.target!==anchor && !anchor.contains(e.target)) closePopover(); };
    const onKey = e=>{ if(e.key==='Escape') closePopover(); };
    setTimeout(()=>{ document.addEventListener('pointerdown', onDoc, true); document.addEventListener('keydown', onKey); },0);
    popCleanup = ()=>{ document.removeEventListener('pointerdown', onDoc, true); document.removeEventListener('keydown', onKey); };
    return pop;
  }

  /* ---------- seletor de cor personalizado (grade + HEX + roda + conta-gotas) ---------- */
  const COLOR_HIST_KEY = 'couplemed_nb_colors_hist';
  const colorHist = () => { try{ const a = JSON.parse(localStorage.getItem(COLOR_HIST_KEY)); return Array.isArray(a)?a:[]; }catch(e){ return []; } };
  function pushColorHist(hex){
    try{
      const a = colorHist().filter(c=>c.toLowerCase()!==hex.toLowerCase());
      a.unshift(hex); localStorage.setItem(COLOR_HIST_KEY, JSON.stringify(a.slice(0,24)));
    }catch(e){}
  }
  function gnGradientGrid(){
    // 12 colunas × 10 linhas: 1ª coluna tons de cinza, demais colunas por matiz (escuro → claro)
    const hues = [0,25,45,60,95,135,165,195,225,260,290,325];
    let html = '';
    for(let row=0; row<10; row++){
      for(let col=0; col<12; col++){
        let c;
        if(col===0){ const l = Math.round(row*100/9); c = `hsl(0,0%,${l}%)`; }
        else { const l = 14 + row*8.6; c = `hsl(${hues[col-1]},82%,${Math.round(l)}%)`; }
        html += `<button class="nb-cgrad" data-hex="${c}" style="background:${c}"></button>`;
      }
    }
    return html;
  }
  function toHex(c){
    // aceita hsl()/rgb()/#hex e devolve #rrggbb
    if(/^#([0-9a-f]{6})$/i.test(c)) return c.toLowerCase();
    const d = document.createElement('div'); d.style.color = c; document.body.appendChild(d);
    const m = getComputedStyle(d).color.match(/\d+/g); d.remove();
    if(!m) return '#000000';
    return '#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('');
  }
  /* painel "Cores" (Personalizar/Histórico) — usado pela pasta, caneta, marcador etc. */
  function openColorPicker(anchor, opts){
    opts = opts||{};
    const hist = colorHist();
    const pop = openPopover(anchor, `
      <div class="nb-cpick">
        <div class="nb-cpick-head">
          ${opts.back?`<button class="nb-cpick-back" id="nbCpBack">‹</button>`:'<span></span>'}
          <strong>${t('colorsTitle')}</strong>
          <button class="nb-cpick-eye" id="nbCpEye" title="${t('pickerCustom')}">💧</button>
        </div>
        <div class="nb-seg nb-cpick-seg">
          <button class="nb-on" data-cptab="custom">${t('pickerCustom')}</button>
          <button data-cptab="hist">${t('pickerHistory')}</button>
        </div>
        <div id="nbCpCustom"><div class="nb-cgrad-grid">${gnGradientGrid()}</div></div>
        <div id="nbCpHist" hidden>
          ${hist.length?`<div class="nb-cgrad-grid nb-hist-grid">${hist.map(c=>`<button class="nb-cgrad" data-hex="${c}" style="background:${c}"></button>`).join('')}</div>`:`<div class="nb-cpick-empty">—</div>`}
        </div>
        <div class="nb-cpick-foot">
          <span class="nb-cpick-cur" id="nbCpCur" style="background:${esc(opts.hex||'#000000')}"></span>
          <label class="nb-cpick-hex">${t('hexLbl')} <input id="nbCpHex" maxlength="7" value="${esc((opts.hex||'#000000').replace('#','').toUpperCase())}"></label>
          <label class="nb-cpick-wheel" title="${t('colorsTitle')}"><input type="color" id="nbCpWheel" value="${esc(toHex(opts.hex||'#000000'))}"></label>
        </div>
        ${opts.onRemove?`<button class="nb-cpick-remove" id="nbCpRemove">${t('removeColor')}</button>`:''}
      </div>`, {cls:'nb-pop-cpick'});
    const cur = pop.querySelector('#nbCpCur');
    const apply = (hex, keepOpen)=>{
      hex = toHex(hex);
      cur.style.background = hex;
      pop.querySelector('#nbCpHex').value = hex.replace('#','').toUpperCase();
      pushColorHist(hex);
      if(opts.onPick) opts.onPick(hex);
      if(!keepOpen) closePopover();
    };
    pop.querySelectorAll('[data-cptab]').forEach(b=>b.addEventListener('click',()=>{
      pop.querySelectorAll('[data-cptab]').forEach(x=>x.classList.toggle('nb-on', x===b));
      pop.querySelector('#nbCpCustom').hidden = b.dataset.cptab!=='custom';
      pop.querySelector('#nbCpHist').hidden = b.dataset.cptab!=='hist';
    }));
    pop.querySelectorAll('.nb-cgrad').forEach(b=>b.addEventListener('click',()=>apply(b.dataset.hex)));
    pop.querySelector('#nbCpHex').addEventListener('change', e=>{
      const v = e.target.value.trim().replace('#','');
      if(/^[0-9a-f]{6}$/i.test(v)) apply('#'+v);
    });
    pop.querySelector('#nbCpWheel').addEventListener('input', e=>apply(e.target.value, true));
    pop.querySelector('#nbCpWheel').addEventListener('change', e=>apply(e.target.value));
    const eye = pop.querySelector('#nbCpEye');
    if(window.EyeDropper){
      eye.addEventListener('click', async ()=>{
        try{ const r = await new window.EyeDropper().open(); if(r && r.sRGBHex) apply(r.sRGBHex); }catch(e){}
      });
    } else eye.style.display = 'none';
    const back = pop.querySelector('#nbCpBack');
    if(back) back.addEventListener('click', ()=>{ closePopover(); if(opts.back) opts.back(); });
    const rem = pop.querySelector('#nbCpRemove');
    if(rem) rem.addEventListener('click', ()=>{ closePopover(); opts.onRemove(); });
    return pop;
  }

  /* ---------- renderização: pasta colorida (estilo macOS/GoodNotes) ---------- */
  function folderIconHtml(f, big){
    const c = esc(f.color||'#3d84ff');
    return `<span class="nb-gnfolder ${big?'nb-gnfolder-big':''}" style="--fc:${c}">
      ${f.icon?`<span class="nb-gnfolder-emoji">${esc(f.icon)}</span>`:''}
    </span>`;
  }
  /* ---------- renderização: capa do caderno (modelos GoodNotes) ---------- */
  function bookCoverHtml(b){
    const cov = b.cover||{};
    const icon = b.icon?`<span class="nb-book-ico">${esc(b.icon)}</span>`:'';
    if(cov.on===false){
      // sem capa: mostra o papel (primeira página) como no GoodNotes
      const th = paperThumbClass(b.paper);
      return `<span class="nb-book-cover nb-cov-off" style="background:${paperBgOf(b)}"><span class="nb-covpaper ${th}"></span>${icon}</span>`;
    }
    if(cov.model==='image' || cov.type==='image'){
      return `<span class="nb-book-cover" style="background-image:url('${esc(cov.image||cov.value)}');background-size:cover;background-position:center">${icon}</span>`;
    }
    const hex = esc(cov.colorHex||cov.value||'#55c6e4');
    const model = esc(cov.model||'solida');
    let inner = '';
    if(model==='percurso') inner = `<svg class="nb-cov-squiggle" viewBox="0 0 60 80" fill="none"><path d="M8 22c14-12 30-8 26 4-4 12-22 10-18 22 4 12 26 6 30 16" stroke="${hex}" stroke-width="5" stroke-linecap="round"/><rect x="14" y="34" width="26" height="10" rx="3" fill="#fff"/></svg>`;
    return `<span class="nb-book-cover nb-cov-${model}" style="--cov:${hex}">${inner}${icon}</span>`;
  }
  function paperThumbClass(paper){
    const id = GN_PAPER_ALIAS[paper]||paper;
    const p = GN_PAPERS.find(x=>x.id===id);
    return p?p.th:'';
  }
  function paperBgOf(b){ return paperColorHex(b.bg||'white'); }

  /* ---------- render principal ---------- */
  function render(){
    if(!root) return;
    if(CM) CM.bumpToken();
    if(view.name==='folders') renderFolders();
    else if(view.name==='folder') renderFolder();
    else if(view.name==='notebook') renderNotebook();
    else if(view.name==='note') renderNote();
    else if(view.name==='allnotes') renderAllNotes();
    else if(view.name==='favorites') renderFavorites();
    if(CM) CM.translateAllVisible(root);
  }

  function crumbs(parts){
    // parts: [{label(html pronto), act?}] — último é o atual
    const html = parts.map((p,i)=>{
      const last = i===parts.length-1;
      const inner = p.raw ? p.label : esc(p.label);
      if(last) return `<span class="nb-crumb-cur">${inner}</span>`;
      return `<button data-crumb="${i}">${inner}</button><span class="nb-crumb-sep">›</span>`;
    }).join('');
    return `<div class="nb-crumbs">${html}</div>`;
  }
  function wireCrumbs(parts){
    root.querySelectorAll('[data-crumb]').forEach(btn=>btn.addEventListener('click',()=>{
      const p = parts[+btn.dataset.crumb]; if(p && p.act) p.act();
    }));
  }

  /* ================= VISÃO: PASTAS ================= */
  /* v3 — popover do "+ Novo" (Pasta / Notebook / Notes), estilo GoodNotes */
  function openNewMenu(anchor, folderId){
    const pop = openPopover(anchor, `
      <div class="nb-newpop">
        <button data-nn="folder">
          <span class="nb-newpop-ico"><span class="nb-gnfolder" style="--fc:#3d84ff"></span></span>
          <em>${t('ctFolder')}</em>
        </button>
        <button data-nn="notebook">
          <span class="nb-newpop-ico">${bookCoverHtml({icon:'', cover:{on:true, model:'claras', colorHex:'#55c6e4'}})}</span>
          <em>${t('ctNotebook')}</em>
        </button>
        <button data-nn="notes">
          <span class="nb-newpop-ico"><span class="nb-newpop-note"></span></span>
          <em>${t('ctNotes')}</em>
        </button>
      </div>`, {cls:'nb-pop-new'});
    pop.querySelector('[data-nn="folder"]').addEventListener('click', ()=>{ closePopover(); folderModal(null, folderId||null); });
    pop.querySelector('[data-nn="notebook"]').addEventListener('click', ()=>{ closePopover(); bookModal(null, folderId||null); });
    pop.querySelector('[data-nn="notes"]').addEventListener('click', ()=>{ closePopover(); location.href = `app.html?page=notes&u=${encodeURIComponent(USER)}`; });
  }
  function folderCardHtml(f, openAttr, menuAttr){
    const nBooks = booksIn(f.id).length;
    const nSub = subfoldersOf(f.id).length;
    const sub = nSub?`${nSub} ${t('folders').toLowerCase()} · `:'';
    return `<button class="nb-folder" data-${openAttr}="${f.id}">
      <span class="nb-item-menu" data-${menuAttr}="${f.id}" role="button" tabindex="0" aria-label="menu">⋯</span>
      ${folderIconHtml(f)}
      <strong>${cmSpan(f.name)}</strong>
      <small>${sub}${nBooks} ${t('notebooks')}</small>
    </button>`;
  }
  function bookCardHtml(b){
    const n = notesIn(b.id).length;
    return `<button class="nb-book" data-open="${b.id}">
      <span class="nb-item-menu" data-menu="${b.id}" role="button" tabindex="0" aria-label="menu">⋯</span>
      ${bookCoverHtml(b)}
      <span class="nb-book-body"><strong>${cmSpan(b.title)}</strong><small>${n} ${t('notes')}</small></span>
    </button>`;
  }
  function renderFolders(){
    const parts = [{label:t('title')}];
    const fav = favNotes();
    const roots = rootFolders();
    const rootBooks = DB.notebooks.filter(n=>!n.folderId);
    root.innerHTML = `
      <div class="nb-head">
        <div><h1>${t('title')}</h1>${crumbs(parts)}</div>
        <div class="nb-actions">
          ${fav.length?`<button class="nb-btn" id="nbGoFav">★ ${t('favorites')}</button>`:''}
          <button class="nb-btn nb-btn-primary" id="nbPlusNew">${t('plusNew')}</button>
        </div>
      </div>
      ${(roots.length||rootBooks.length) ? `<div class="nb-grid">${
        roots.map(f=>folderCardHtml(f,'open','menu-f')).join('') + rootBooks.map(bookCardHtml).join('')
      }</div>`
      : `<div class="nb-empty"><span class="nb-empty-ico">📂</span>${t('emptyFolders')}</div>`}`;
    root.querySelector('#nbPlusNew').addEventListener('click', e=>openNewMenu(e.currentTarget, null));
    const gf = root.querySelector('#nbGoFav'); if(gf) gf.addEventListener('click', ()=>{ view={name:'favorites'}; syncUrl(); render(); });
    root.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click', e=>{
      if(e.target.closest('[data-menu-f],[data-menu]')) return;
      const id = el.dataset.open;
      view = folderById(id) ? { name:'folder', folderId:id } : { name:'notebook', nbId:id };
      syncUrl(); render();
    }));
    root.querySelectorAll('[data-menu-f]').forEach(el=>el.addEventListener('click', e=>{
      e.stopPropagation(); const f = folderById(el.dataset.menuF); folderModal(f, f.parentId||null);
    }));
    root.querySelectorAll('[data-menu]').forEach(el=>el.addEventListener('click', e=>{
      e.stopPropagation(); const b = bookById(el.dataset.menu); if(b) bookModal(b, b.folderId||null);
    }));
  }
  /* v3 — diálogo de pasta estilo GoodNotes: preview grande, nome no meio,
     abas Cor/Ícone; cores em 3 fileiras + arco-íris (cor personalizada);
     ícones = emojis chamativos que ajudam na memorização de estudo. */
  function folderModal(folder, parentId){
    const isNew = !folder;
    let color = (folder && folder.color) || '#3d84ff';
    let icon = (folder && folder.icon) || '';
    const pid = (folder ? (folder.parentId||null) : (parentId||null));
    let tab = 'color';
    const m = openModal(`
      <div class="nb-gnf">
        <div class="nb-gnf-prev" id="nbGnfPrev">${folderIconHtml({color, icon}, true)}</div>
        <input type="text" id="nbGnfName" class="nb-gnf-name" maxlength="60"
               placeholder="${t('untitledFolder')}" value="${esc(folder?folder.name:'')}" />
        <div class="nb-seg nb-gnf-seg">
          <button data-gtab="color" class="nb-on">${t('tabColor')}</button>
          <button data-gtab="icon">${t('tabIcon')}</button>
        </div>
        <div class="nb-gnf-panel" id="nbGnfPanel"></div>
        <div class="nb-modal-foot nb-gnf-foot">
          ${isNew?'':`<button class="nb-btn nb-btn-danger" id="nbFDel">${t('del')}</button>`}
          <button class="nb-btn nb-btn-ghost" id="nbFCancel">${t('cancel')}</button>
          <button class="nb-btn nb-btn-primary" id="nbFSave">${isNew?t('create'):t('saveBtn')}</button>
        </div>
      </div>`);
    const updPrev = ()=>{ m.querySelector('#nbGnfPrev').innerHTML = folderIconHtml({color, icon}, true); };
    const isPreset = c => GN_FOLDER_COLORS.some(row=>row.some(x=>x.toLowerCase()===String(c).toLowerCase()));
    function renderPanel(){
      const panel = m.querySelector('#nbGnfPanel');
      if(tab==='color'){
        panel.innerHTML = GN_FOLDER_COLORS.map((row,ri)=>`<div class="nb-gnf-crow">${
          row.map(c=>`<button class="nb-gnf-dot ${c.toLowerCase()===color.toLowerCase()?'nb-on':''}" data-fc="${c}" style="background:${c}">${c.toLowerCase()===color.toLowerCase()?'✓':''}</button>`).join('')
        }${ri===2?`<button class="nb-gnf-dot nb-gnf-rainbow ${!isPreset(color)?'nb-on':''}" id="nbGnfCustom">${!isPreset(color)?'✓':''}</button>`:''}</div>`).join('');
        panel.querySelectorAll('[data-fc]').forEach(b=>b.addEventListener('click',()=>{ color = b.dataset.fc; updPrev(); renderPanel(); }));
        panel.querySelector('#nbGnfCustom').addEventListener('click', e=>{
          openColorPicker(e.currentTarget, { hex: color, onPick: hex=>{ color = hex; updPrev(); renderPanel(); } });
        });
      } else {
        panel.innerHTML = `<div class="nb-gnf-icons">
          <button class="nb-gnf-ic nb-gnf-ic-none ${!icon?'nb-on':''}" data-fi="" title="${t('noIcon')}">∅</button>
          ${GN_FOLDER_EMOJIS.map(e2=>`<button class="nb-gnf-ic ${e2===icon?'nb-on':''}" data-fi="${e2}">${e2}</button>`).join('')}
        </div>`;
        panel.querySelectorAll('[data-fi]').forEach(b=>b.addEventListener('click',()=>{ icon = b.dataset.fi; updPrev(); renderPanel(); }));
      }
    }
    renderPanel();
    m.querySelectorAll('[data-gtab]').forEach(b=>b.addEventListener('click',()=>{
      tab = b.dataset.gtab;
      m.querySelectorAll('[data-gtab]').forEach(x=>x.classList.toggle('nb-on', x===b));
      renderPanel();
    }));
    m.querySelector('#nbFCancel').addEventListener('click', closeModal);
    m.querySelector('#nbFSave').addEventListener('click', ()=>{
      const name = m.querySelector('#nbGnfName').value.trim() || t('untitledFolder');
      if(isNew) DB.folders.push({ id:uid(), name, color, icon, parentId:pid, created:Date.now() });
      else { folder.name = name; folder.color = color; folder.icon = icon; }
      save(); closeModal(); render();
    });
    const del = m.querySelector('#nbFDel');
    if(del) del.addEventListener('click', ()=>{
      if(!confirm(t('confirmDelFolder'))) return;
      // apaga recursivamente subpastas, cadernos e notas
      const ids = allDescendantFolderIds(folder.id);
      ids.forEach(fid=>{
        booksIn(fid).forEach(b=>{ notesIn(b.id).forEach(nt=>notePages(nt).forEach(p=>deleteRemoteImages(p.html))); DB.notes = DB.notes.filter(n=>n.notebookId!==b.id); });
        DB.notebooks = DB.notebooks.filter(n=>n.folderId!==fid);
      });
      DB.folders = DB.folders.filter(f=>!ids.includes(f.id));
      save(); closeModal(); view = { name:'folders' }; syncUrl(); render();
    });
    m.querySelector('#nbGnfName').focus();
  }

  /* ================= VISÃO: CADERNOS DA PASTA ================= */
  function renderFolder(){
    const folder = folderById(view.folderId);
    if(!folder){ view = { name:'folders' }; return render(); }
    // trilha completa até a raiz (subpastas)
    const chain = []; let cur = folder;
    while(cur){ chain.unshift(cur); cur = cur.parentId ? folderById(cur.parentId) : null; }
    const parts = [{ label:t('title'), act:()=>{ view={name:'folders'}; syncUrl(); render(); } }];
    chain.forEach((f,i)=>{
      const last = i===chain.length-1;
      parts.push({ label:cmSpan(f.name), raw:true, act: last?null:()=>{ view={name:'folder', folderId:f.id}; syncUrl(); render(); } });
    });
    const subs = subfoldersOf(folder.id);
    const books = booksIn(folder.id);
    const subHtml = subs.map(f=>folderCardHtml(f,'openf','menuf')).join('');
    const bookHtml = books.map(bookCardHtml).join('');
    root.innerHTML = `
      <div class="nb-head">
        <div><h1>${cmSpan(folder.name)}</h1>${crumbs(parts)}</div>
        <div class="nb-actions">
          <button class="nb-btn nb-btn-primary" id="nbPlusNew">${t('plusNew')}</button>
        </div>
      </div>
      ${(subs.length||books.length) ? `<div class="nb-grid">${subHtml}${bookHtml}</div>`
      : `<div class="nb-empty"><span class="nb-empty-ico">📘</span>${t('emptyBooks')}</div>`}`;
    root.querySelector('#nbPlusNew').addEventListener('click', e=>openNewMenu(e.currentTarget, folder.id));
    root.querySelectorAll('[data-openf]').forEach(el=>el.addEventListener('click', e=>{
      if(e.target.closest('[data-menuf]')) return;
      view = { name:'folder', folderId: el.dataset.openf }; syncUrl(); render();
    }));
    root.querySelectorAll('[data-menuf]').forEach(el=>el.addEventListener('click', e=>{
      e.stopPropagation(); const f=folderById(el.dataset.menuf); folderModal(f, f.parentId||null);
    }));
    root.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click', e=>{
      if(e.target.closest('[data-menu]')) return;
      view = { name:'notebook', nbId: el.dataset.open }; syncUrl(); render();
    }));
    root.querySelectorAll('[data-menu]').forEach(el=>el.addEventListener('click', e=>{
      e.stopPropagation(); bookModal(bookById(el.dataset.menu), folder.id);
    }));
    wireCrumbs(parts);
  }

  /* v3 — modal "Novo caderno" estilo GoodNotes: X/✓ no cabeçalho, previews de
     PAPEL e CAPA à esquerda (clique alterna a seção ativa), Nome + toggle Capa,
     MODELOS DE PAPEL/CAPA (Tamanho + Cor) e a galeria de modelos embaixo.
     Sem a linha "Idioma" (o site já é bilíngue). */
  function bookModal(book, folderId){
    const isNew = !book;
    const cur = book ? JSON.parse(JSON.stringify(book)) : Object.assign({ title:'' }, defBook());
    if(!cur.cover || cur.cover.on===undefined) cur.cover = defBook().cover;
    let section = cur.cover.on ? 'cover' : 'paper'; // qual preview está ativo (sublinhado azul)
    const paperName = ()=>{ const id = cur.paper==='custom'?null:(GN_PAPER_ALIAS[cur.paper]||cur.paper); const p = GN_PAPERS.find(x=>x.id===id); return cur.paper==='custom'?t('pImported'):(p?t(p.k):t('pBlank')); };
    const paperColorName = ()=>{ const c = GN_PAPER_COLORS.find(x=>x.id===cur.bg); return c?t(c.k):t('cWhite'); };
    const coverColorName = ()=>{ const c = GN_COVER_COLORS.find(x=>x.c.toLowerCase()===String(cur.cover.colorHex||'').toLowerCase()); return c?t(c.k):t('tabColor'); };
    const coverModelName = ()=>{ const mm = GN_COVER_MODELS.find(x=>x.id===cur.cover.model); return mm?t(mm.k):t('cmClaras'); };
    const m = openModal(`
      <div class="nb-gnb">
        <div class="nb-gnb-head">
          <button class="nb-gnb-x" id="nbGnbX" aria-label="${t('cancel')}">✕</button>
          <strong>${isNew?t('nbNewTitle'):t('customize')}</strong>
          <button class="nb-gnb-ok" id="nbGnbOk" aria-label="${t('create')}">✓</button>
        </div>
        <div class="nb-gnb-top">
          <div class="nb-gnb-prevs" id="nbGnbPrevs"></div>
          <div class="nb-gnb-form">
            <div class="nb-gnb-rows">
              <label class="nb-gnb-row"><span>${t('nameLbl')}</span><input id="nbGnbName" maxlength="80" placeholder="${t('nbUntitledPh')}" value="${esc(cur.title||'')}"></label>
              <div class="nb-gnb-row"><span>${t('cover')}</span>
                <label class="nb-switch"><input type="checkbox" id="nbGnbCovSw" ${cur.cover.on?'checked':''}><i></i></label>
              </div>
            </div>
            <div class="nb-gnb-caps" id="nbGnbCaps"></div>
            <div class="nb-gnb-rows">
              <button class="nb-gnb-row nb-gnb-click" id="nbGnbSize"><span>${t('sizeLbl2')}</span><span class="nb-gnb-val" id="nbGnbSizeVal"></span></button>
              <button class="nb-gnb-row nb-gnb-click" id="nbGnbColor"><span>${t('color')}</span><span class="nb-gnb-val" id="nbGnbColorVal"></span></button>
            </div>
          </div>
        </div>
        <div class="nb-gnb-body" id="nbGnbBody"></div>
        ${isNew?'':`<div class="nb-gnb-del"><button class="nb-btn nb-btn-danger" id="nbBDel">${t('del')}</button></div>`}
        <input type="file" id="nbGnbImport" accept="image/*" hidden />
      </div>`);

    /* ---- previews (esquerda) ---- */
    function renderPrevs(){
      const wrap = m.querySelector('#nbGnbPrevs');
      const paperCard = `
        <button class="nb-gnb-prevcard ${section==='paper'?'nb-on':''}" data-sec="paper">
          <small>${t('paperLbl')}</small>
          <span class="nb-gnb-paperprev ${cur.paper==='custom'?'':paperThumbClass(cur.paper)}"
                style="background-color:${paperColorHex(cur.bg)};${cur.paper==='custom'&&cur.customPaper?`background-image:url('${esc(cur.customPaper)}');background-size:100% auto;`:''}"></span>
          <em>${paperName()}</em><i class="nb-gnb-under"></i>
        </button>`;
      const coverCard = cur.cover.on ? `
        <button class="nb-gnb-prevcard ${section==='cover'?'nb-on':''}" data-sec="cover">
          <small>${t('coverLbl2')}</small>
          <span class="nb-gnb-covprev">${bookCoverHtml({icon:'', cover:cur.cover, paper:cur.paper, bg:cur.bg})}</span>
          <em>${coverModelName()}</em><i class="nb-gnb-under"></i>
        </button>` : '';
      wrap.innerHTML = coverCard + paperCard;
      wrap.querySelectorAll('[data-sec]').forEach(b=>b.addEventListener('click',()=>{ section = b.dataset.sec; refresh(); }));
    }
    /* ---- MODELOS DE PAPEL/CAPA (Tamanho + Cor) ---- */
    function renderMeta(){
      m.querySelector('#nbGnbCaps').textContent = section==='cover' ? t('coverCaps') : t('paperCaps');
      m.querySelector('#nbGnbSizeVal').innerHTML = `${cur.orientation==='landscape'?t('a4h'):t('a4v')} <b>⌄</b>`;
      const dot = section==='cover'
        ? `<i class="nb-mini-dot" style="background:${esc(cur.cover.colorHex||'#55c6e4')}"></i> ${coverColorName()}`
        : `<i class="nb-mini-dot" style="background:${paperColorHex(cur.bg)}"></i> ${paperColorName()}`;
      m.querySelector('#nbGnbColorVal').innerHTML = `${dot} <b>⌄</b>`;
    }
    /* ---- galeria de modelos (embaixo) ---- */
    function renderBody(){
      const body = m.querySelector('#nbGnbBody');
      if(section==='paper'){
        const dots = pid => GN_PAPER_COLORS.map(c=>`<button class="nb-gnb-minidot ${cur.paper===pid&&cur.bg===c.id?'nb-on':''}" data-pcol="${pid}|${c.id}" title="${t(c.k)}" style="background:${c.c}"></button>`).join('');
        body.innerHTML = `
          <h4>${t('paperModelsTitle')}</h4><h5>${t('essentials')}</h5>
          <div class="nb-gnb-cards">
            ${GN_PAPERS.map(p=>`
              <div class="nb-gnb-card">
                <button class="nb-gnb-paperth ${p.th}" data-pp="${p.id}" style="background-color:${paperColorHex(cur.bg)}">
                  ${ (GN_PAPER_ALIAS[cur.paper]||cur.paper)===p.id?'<span class="nb-gnb-check">✓</span>':'' }
                </button>
                <em>${t(p.k)}</em>
                <div class="nb-gnb-dots">${dots(p.id)}</div>
              </div>`).join('')}
            ${cur.customPaper?`
              <div class="nb-gnb-card">
                <button class="nb-gnb-paperth" data-pp="custom" style="background-image:url('${esc(cur.customPaper)}');background-size:cover;background-position:top center">
                  ${cur.paper==='custom'?'<span class="nb-gnb-check">✓</span>':''}
                </button>
                <em>${t('pImported')}</em>
              </div>`:''}
            <div class="nb-gnb-card">
              <button class="nb-gnb-import" id="nbGnbImpBtn">＋<br>${t('importLbl')}</button>
            </div>
          </div>`;
        body.querySelectorAll('[data-pp]').forEach(b=>b.addEventListener('click',()=>{ cur.paper = b.dataset.pp; refresh(); }));
        body.querySelectorAll('[data-pcol]').forEach(b=>b.addEventListener('click',e=>{
          e.stopPropagation();
          const [pid,cid] = b.dataset.pcol.split('|'); cur.paper = pid; cur.bg = cid; refresh();
        }));
        body.querySelector('#nbGnbImpBtn').addEventListener('click',()=>m.querySelector('#nbGnbImport').click());
      } else {
        const covOf = (model,hex)=>bookCoverHtml({icon:'', cover:{on:true, model, colorHex:hex}});
        const defHex = {claras:'#55c6e4', percurso:'#55c6e4', simples:'#b49a72', solida:'#a9c6f2', liso:'#f2f2f4'};
        body.innerHTML = `
          <h4>${t('coverModelsTitle')}</h4><h5>${t('simpleCat')}</h5>
          <div class="nb-gnb-cards nb-gnb-covcards">
            ${GN_COVER_MODELS.map(mm=>{
              const hex = cur.cover.model===mm.id ? (cur.cover.colorHex||defHex[mm.id]) : defHex[mm.id];
              return `
              <div class="nb-gnb-card">
                <button class="nb-gnb-covth" data-cm="${mm.id}">
                  ${covOf(mm.id, hex)}
                  ${cur.cover.model===mm.id?'<span class="nb-gnb-check">✓</span>':''}
                </button>
                <em>${t(mm.k)}</em>
                <div class="nb-gnb-dots">
                  ${GN_COVER_COLORS.slice(0,4).map(c=>`<button class="nb-gnb-minidot ${cur.cover.model===mm.id&&String(cur.cover.colorHex).toLowerCase()===c.c.toLowerCase()?'nb-on':''}" data-cmc="${mm.id}|${c.c}" title="${t(c.k)}" style="background:${c.c}"></button>`).join('')}
                  <span class="nb-gnb-more">+${GN_COVER_COLORS.length-4}</span>
                </div>
              </div>`;}).join('')}
          </div>`;
        body.querySelectorAll('[data-cm]').forEach(b=>b.addEventListener('click',()=>{ cur.cover.model = b.dataset.cm; delete cur.cover.image; refresh(); }));
        body.querySelectorAll('[data-cmc]').forEach(b=>b.addEventListener('click',e=>{
          e.stopPropagation();
          const [mid,hex] = b.dataset.cmc.split('|'); cur.cover.model = mid; cur.cover.colorHex = hex; delete cur.cover.image; refresh();
        }));
      }
    }
    function refresh(){ renderPrevs(); renderMeta(); renderBody(); }
    refresh();

    /* toggle Capa: liga → mostra preview da capa e a seção vira MODELOS DE CAPA */
    m.querySelector('#nbGnbCovSw').addEventListener('change', e=>{
      cur.cover.on = e.target.checked;
      section = cur.cover.on ? 'cover' : 'paper';
      refresh();
    });
    /* Tamanho: A4 Vertical/Horizontal */
    m.querySelector('#nbGnbSize').addEventListener('click', e=>{
      const pop = openPopover(e.currentTarget, `
        <div class="nb-pop-list">
          <button data-sz="portrait" class="${cur.orientation!=='landscape'?'nb-on':''}">${t('a4v')}</button>
          <button data-sz="landscape" class="${cur.orientation==='landscape'?'nb-on':''}">${t('a4h')}</button>
        </div>`);
      pop.querySelectorAll('[data-sz]').forEach(b=>b.addEventListener('click',()=>{ cur.orientation = b.dataset.sz; closePopover(); refresh(); }));
    });
    /* Cor: papel = lista simples; capa = grade de mini-capas (Imagem 21) */
    m.querySelector('#nbGnbColor').addEventListener('click', e=>{
      if(section==='paper'){
        const pop = openPopover(e.currentTarget, `
          <div class="nb-pop-list">
            ${GN_PAPER_COLORS.map(c=>`<button data-pc="${c.id}" class="${cur.bg===c.id?'nb-on':''}"><i class="nb-mini-dot" style="background:${c.c}"></i> ${t(c.k)}</button>`).join('')}
          </div>`);
        pop.querySelectorAll('[data-pc]').forEach(b=>b.addEventListener('click',()=>{ cur.bg = b.dataset.pc; closePopover(); refresh(); }));
      } else {
        const pop = openPopover(e.currentTarget, `
          <div class="nb-covgrid-head"><strong>${t('color')}</strong></div>
          <div class="nb-covgrid">
            ${GN_COVER_COLORS.map(c=>`
              <button data-cvc="${c.c}" class="nb-covgrid-item">
                <span class="nb-covgrid-mini">${bookCoverHtml({icon:'', cover:{on:true, model:cur.cover.model==='image'?'claras':cur.cover.model, colorHex:c.c}})}</span>
                ${String(cur.cover.colorHex).toLowerCase()===c.c.toLowerCase()?'<span class="nb-gnb-check">✓</span>':''}
                <em>${t(c.k)}</em>
              </button>`).join('')}
          </div>`, {cls:'nb-pop-covgrid'});
        pop.querySelectorAll('[data-cvc]').forEach(b=>b.addEventListener('click',()=>{ cur.cover.colorHex = b.dataset.cvc; delete cur.cover.image; closePopover(); refresh(); }));
      }
    });
    /* Importar tipo de página (imagem vira o papel do caderno) */
    m.querySelector('#nbGnbImport').addEventListener('change', async e=>{
      const f = e.target.files[0]; if(!f) return;
      const url = await uploadImage(f);
      if(url){ cur.customPaper = url; cur.paper = 'custom'; refresh(); }
      e.target.value='';
    });
    m.querySelector('#nbGnbX').addEventListener('click', ()=>{ closePopover(); closeModal(); });
    m.querySelector('#nbGnbOk').addEventListener('click', ()=>{
      const title = m.querySelector('#nbGnbName').value.trim() || t('nbUntitledPh');
      const data = { title, icon:cur.icon||'', paper:cur.paper, bg:cur.bg, orientation:cur.orientation,
                     cover:cur.cover, customPaper:cur.customPaper||null };
      if(isNew) DB.notebooks.push(Object.assign({ id:uid(), folderId:folderId||null, created:Date.now(), updated:Date.now() }, data));
      else Object.assign(book, data, { updated:Date.now() });
      save(); closePopover(); closeModal(); render();
    });
    const del = m.querySelector('#nbBDel');
    if(del) del.addEventListener('click', ()=>{
      if(!confirm(t('confirmDelBook'))) return;
      notesIn(book.id).forEach(nt=>notePages(nt).forEach(p=>deleteRemoteImages(p.html)));
      DB.notes = DB.notes.filter(n=>n.notebookId!==book.id);
      DB.notebooks = DB.notebooks.filter(n=>n.id!==book.id);
      save(); closePopover(); closeModal(); render();
    });
    m.querySelector('#nbGnbName').focus();
  }

  /* ================= VISÃO: NOTAS DO CADERNO ================= */
  function noteRow(nt, showBook){
    const nb = bookById(nt.notebookId);
    const prevTxt = noteText(nt).slice(0,180);
    const npages = notePages(nt).length;
    return `<button class="nb-note-row" data-note="${nt.id}">
      <span class="nb-note-row-ico">📝</span>
      <span class="nb-note-row-main">
        <strong>${nt.fav?'<span class="nb-fav-dot" title="'+t('favorite')+'">★</span> ':''}${cmSpan(nt.title||t('untitled'))}</strong>
        ${prevTxt?`<span class="nb-note-prev">${esc(prevTxt)}</span>`:''}
        <span class="nb-note-meta">
          ${showBook&&nb?`<span class="nb-note-book-badge">${esc(nb.icon||'📘')} ${cmSpan(nb.title)}</span>`:''}
          <span class="nb-note-date">${t('updated')}: ${fmtDate(nt.updated)}</span>
          ${npages>1?`<span class="nb-note-pagecount">▤ ${npages} ${t('pages')}</span>`:''}
          ${(nt.tags||[]).map(tag=>`<span class="nb-tag">${cmSpan(tag)}</span>`).join('')}
        </span>
      </span>
      <span class="nb-note-star ${nt.fav?'nb-on':''}" data-fav="${nt.id}" role="button" tabindex="0" aria-label="${t('favorite')}">${nt.fav?'★':'☆'}</span>
    </button>`;
  }
  function filterNotes(list, q){
    q = (q||'').toLowerCase().trim(); if(!q) return list;
    return list.filter(nt=>{
      const hay = [nt.title, (nt.tags||[]).join(' '), noteText(nt)].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  /* v2: helpers compartilhados das listas de notas */
  function sortNotes(list, mode){
    const l = list.slice();
    if(mode==='name') l.sort((a,b)=>(a.title||'').localeCompare(b.title||''));
    else if(mode==='created') l.sort((a,b)=>(b.created||0)-(a.created||0));
    else l.sort((a,b)=>(b.updated||0)-(a.updated||0));
    // favoritos sempre no topo
    return l.sort((a,b)=>(b.fav?1:0)-(a.fav?1:0));
  }
  function allTagsIn(list){ const s=new Set(); list.forEach(nt=>(nt.tags||[]).forEach(tg=>s.add(tg))); return Array.from(s).sort((a,b)=>a.localeCompare(b)); }
  function noteToolsBar(list, opts){
    opts = opts||{};
    const tags = allTagsIn(list);
    return `<div class="nb-note-tools">
      <div class="nb-search"><svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <input id="nbNoteSearch" type="text" placeholder="${t('searchNotes')}" value="${esc(view.q||'')}" /></div>
      <select class="nb-tb-select" id="nbSort" title="${t('sortBy')}">
        <option value="recent" ${(view.sort||'recent')==='recent'?'selected':''}>${t('sortRecent')}</option>
        <option value="name" ${view.sort==='name'?'selected':''}>${t('sortName')}</option>
        <option value="created" ${view.sort==='created'?'selected':''}>${t('sortCreated')}</option>
      </select>
      ${tags.length?`<select class="nb-tb-select" id="nbTagFilter" title="${t('tagFilter')}">
        <option value="">${t('allTags')}</option>
        ${tags.map(tg=>`<option value="${esc(tg)}" ${view.tag===tg?'selected':''}>#${esc(tg)}</option>`).join('')}
      </select>`:''}
      <div class="nb-viewtoggle">
        <button class="${(view.grid?'':'nb-on')}" id="nbViewList" title="${t('viewList')}">☰</button>
        <button class="${(view.grid?'nb-on':'')}" id="nbViewGrid" title="${t('viewGrid')}">▦</button>
      </div>
    </div>`;
  }
  function applyToolsState(list){
    let out = list;
    if(view.tag) out = out.filter(nt=>(nt.tags||[]).includes(view.tag));
    out = filterNotes(out, view.q);
    out = sortNotes(out, view.sort||'recent');
    return out;
  }
  function noteListHtml(list, showBook){
    if(!list.length) return '';
    if(view.grid){
      return `<div class="nb-note-grid">${list.map(nt=>{
        const nb = bookById(nt.notebookId);
        const prev = noteText(nt).slice(0,140);
        return `<button class="nb-note-card" data-note="${nt.id}">
          <span class="nb-note-star ${nt.fav?'nb-on':''}" data-fav="${nt.id}" role="button" tabindex="0">${nt.fav?'★':'☆'}</span>
          <strong>${cmSpan(nt.title||t('untitled'))}</strong>
          ${prev?`<span class="nb-note-card-prev">${esc(prev)}</span>`:''}
          <span class="nb-note-card-foot">${showBook&&nb?esc(nb.icon||'📘')+' ':''}<span>${fmtDate(nt.updated)}</span></span>
        </button>`;
      }).join('')}</div>`;
    }
    return `<div class="nb-note-list">${list.map(nt=>noteRow(nt,showBook)).join('')}</div>`;
  }
  function wireNoteTools(){
    const s = root.querySelector('#nbNoteSearch');
    if(s) s.addEventListener('input', ()=>{ view.q = s.value; const pos = s.selectionStart; render(); const s2 = root.querySelector('#nbNoteSearch'); if(s2){ s2.focus(); s2.setSelectionRange(pos,pos);} });
    const so = root.querySelector('#nbSort'); if(so) so.addEventListener('change', ()=>{ view.sort = so.value; render(); });
    const tf = root.querySelector('#nbTagFilter'); if(tf) tf.addEventListener('change', ()=>{ view.tag = tf.value||null; render(); });
    const vl = root.querySelector('#nbViewList'); if(vl) vl.addEventListener('click', ()=>{ view.grid=false; render(); });
    const vg = root.querySelector('#nbViewGrid'); if(vg) vg.addEventListener('click', ()=>{ view.grid=true; render(); });
  }
  function wireStars(){
    root.querySelectorAll('[data-fav]').forEach(el=>el.addEventListener('click', e=>{
      e.stopPropagation();
      const nt = noteById(el.dataset.fav); if(!nt) return;
      nt.fav = !nt.fav; nt.updated = Date.now(); save(); render();
    }));
  }

  function renderNotebook(){
    const book = bookById(view.nbId);
    if(!book){ view = { name:'folders' }; return render(); }
    const folder = folderById(book.folderId);
    const parts = [
      { label:t('title'), act:()=>{ view={name:'folders'}; syncUrl(); render(); } },
      ...(folder?[{ label:cmSpan(folder.name), raw:true, act:()=>{ view={name:'folder', folderId:book.folderId}; syncUrl(); render(); } }]:[]),
      { label:cmSpan(book.title), raw:true }
    ];
    const all = notesIn(book.id);
    const list = applyToolsState(all);
    root.innerHTML = `
      <div class="nb-head">
        <div><h1>${book.icon?esc(book.icon)+' ':''}${cmSpan(book.title)}</h1>${crumbs(parts)}</div>
        <div class="nb-actions">
          <button class="nb-btn" id="nbBookCfg">⚙ ${t('customize')}</button>
          <button class="nb-btn nb-btn-primary" id="nbNewNote">${t('newNote')}</button>
        </div>
      </div>
      ${noteToolsBar(all)}
      ${list.length ? noteListHtml(list,false)
        : `<div class="nb-empty"><span class="nb-empty-ico">📝</span>${all.length?'—':t('emptyNotes')}</div>`}`;
    root.querySelector('#nbBookCfg').addEventListener('click', ()=>bookModal(book, book.folderId));
    root.querySelector('#nbNewNote').addEventListener('click', ()=>{
      const nt = { id:uid(), notebookId:book.id, title:'', tags:[], fav:false, refs:[], multiPage:false, pages:[{id:uid(),html:'',strokes:[]}], created:Date.now(), updated:Date.now() };
      DB.notes.push(nt); save();
      view = { name:'note', noteId:nt.id, page:0 }; syncUrl(); render();
    });
    wireNoteTools(); wireStars();
    root.querySelectorAll('[data-note]').forEach(el=>el.addEventListener('click', e=>{
      if(e.target.closest('[data-fav]')) return;
      view = { name:'note', noteId: el.dataset.note, page:0 }; syncUrl(); render();
    }));
    wireCrumbs(parts);
  }

  /* ================= VISÃO: TODAS AS NOTAS (page=notes) ================= */
  function renderAllNotes(){
    const all = DB.notes.slice();
    const list = applyToolsState(all);
    root.innerHTML = `
      <div class="nb-head">
        <div><h1>${t('titleNotes')}</h1>${crumbs([{label:t('titleNotes')}])}</div>
        <div class="nb-actions">${favNotes().length?`<button class="nb-btn" id="nbGoFav2">★ ${t('favorites')}</button>`:''}</div>
      </div>
      ${noteToolsBar(all)}
      ${list.length ? noteListHtml(list,true)
        : `<div class="nb-empty"><span class="nb-empty-ico">📝</span>${t('emptyAll')}</div>`}`;
    const gf = root.querySelector('#nbGoFav2'); if(gf) gf.addEventListener('click', ()=>{ view={name:'favorites'}; syncUrl(); render(); });
    wireNoteTools(); wireStars();
    root.querySelectorAll('[data-note]').forEach(el=>el.addEventListener('click', e=>{
      if(e.target.closest('[data-fav]')) return;
      const nt = noteById(el.dataset.note);
      if(nt){ view = { name:'note', noteId: nt.id, page:0 }; syncUrl(); render(); }
    }));
  }

  /* ================= VISÃO: FAVORITOS ================= */
  function renderFavorites(){
    const all = favNotes();
    const list = applyToolsState(all);
    root.innerHTML = `
      <div class="nb-head">
        <div><h1>★ ${t('allFavorites')}</h1>${crumbs([
          {label:t('title')}, {label:t('allFavorites')}
        ])}</div>
      </div>
      ${all.length?noteToolsBar(all):''}
      ${list.length ? noteListHtml(list,true)
        : `<div class="nb-empty"><span class="nb-empty-ico">★</span>${t('emptyFavorites')}</div>`}`;
    // primeiro crumb volta às pastas
    root.querySelectorAll('.nb-crumbs button').forEach((b,i)=>{ if(i===0) b.addEventListener('click',()=>{ view={name:'folders'}; syncUrl(); render(); }); });
    wireNoteTools(); wireStars();
    root.querySelectorAll('[data-note]').forEach(el=>el.addEventListener('click', e=>{
      if(e.target.closest('[data-fav]')) return;
      const nt = noteById(el.dataset.note);
      if(nt){ view = { name:'note', noteId: nt.id, page:0 }; syncUrl(); render(); }
    }));
  }

  /* ================= VISÃO: EDITOR DA NOTA ================= */
  const FONTS = ['Helvetica Neue','Arial','Georgia','Times New Roman','Courier New','Verdana'];
  const SIZES = [{v:'1',l:'10'},{v:'2',l:'13'},{v:'3',l:'15'},{v:'4',l:'18'},{v:'5',l:'24'},{v:'6',l:'32'},{v:'7',l:'42'}];

  function renderNote(){
    const nt = noteById(view.noteId);
    if(!nt){ view = { name:'folders' }; return render(); }
    const book = bookById(nt.notebookId) || defBook();
    const folder = folderById(book.folderId);
    const pages = notePages(nt);
    if(view.page == null || view.page < 0) view.page = 0;
    if(view.page > pages.length-1) view.page = pages.length-1;
    const curPage = pages[view.page];
    const reading = !!view.reading;

    const parts = [
      { label:t('title'), act:()=>{ view={name:'folders'}; syncUrl(); render(); } },
      ...(folder?[{ label:cmSpan(folder.name), raw:true, act:()=>{ view={name:'folder', folderId:book.folderId}; syncUrl(); render(); } }]:[]),
      { label:cmSpan(book.title||''), raw:true, act:()=>{ view={name:'notebook', nbId:nt.notebookId}; syncUrl(); render(); } },
      { label:cmSpan(nt.title||t('untitled')), raw:true }
    ];
    const drawing = view.mode==='draw' && !reading;

    if(reading){ renderReading(nt, book, parts); return; }

    const swatchPop = (id) => `<div class="nb-swatch-pop" id="${id}" hidden>
      ${SWATCHES.map(c=>`<button class="nb-sw" data-sw="${c}" style="background:${c}"></button>`).join('')}
      <input type="color" class="nb-sw-custom" data-swc value="#2768ff" />
    </div>`;

    const multi = !!nt.multiPage;
    const pagerHtml = multi ? `
      <div class="nb-pager" id="nbPager">
        <button class="nb-btn nb-pager-nav" id="nbPgPrev" ${view.page===0?'disabled':''} title="${t('prevPage')}">‹</button>
        <span class="nb-pager-info">${t('pageOf',{n:view.page+1,total:pages.length})}</span>
        <button class="nb-btn nb-pager-nav" id="nbPgNext" ${view.page===pages.length-1?'disabled':''} title="${t('nextPage')}">›</button>
        <span class="nb-tb-sep"></span>
        <button class="nb-btn" id="nbPgAdd" title="${t('addPageAfter')}">＋ ${t('page')}</button>
        <button class="nb-btn" id="nbPgDup" title="${t('duplicatePage')}">⧉</button>
        <button class="nb-btn nb-btn-danger" id="nbPgDel" ${pages.length<=1?'disabled':''} title="${t('deletePage')}">🗑</button>
      </div>` : '';

    root.innerHTML = `
      <div class="nb-ed-head">
        <button class="nb-btn nb-btn-ghost" id="nbBack">${t('back')}</button>
        <input class="nb-ed-title" id="nbNoteTitle" maxlength="120" placeholder="${t('untitled')}" value="${esc(nt.title)}" />
        <span class="nb-savestate" id="nbSaveState">${t('saved')}</span>
        <button class="nb-icon-btn ${nt.fav?'nb-on':''}" id="nbFavBtn" title="${nt.fav?t('unfavorite'):t('favorite')}">${nt.fav?'★':'☆'}</button>
        <div class="nb-mode">
          <button id="nbModeType" class="${drawing?'':'nb-on'}">${t('typeMode')}</button>
          <button id="nbModeDraw" class="${drawing?'nb-on':''}">${t('drawMode')}</button>
        </div>
        <button class="nb-btn" id="nbReadBtn" title="${t('readMode')}">👁</button>
        <div class="nb-menu-wrap">
          <button class="nb-btn" id="nbMoreBtn" title="${t('insertMenu')}">⋯</button>
          <div class="nb-menu-pop" id="nbMorePop" hidden>
            <button data-more="layout">▤ ${t('pageLayout')}: ${multi?t('multiPage'):t('onePage')}</button>
            <button data-more="ref">🔗 ${t('linkRef')}</button>
            <button data-more="export">⬆ ${t('exportNote')}</button>
            <button data-more="pdf">📄 ${t('exportPdf')}</button>
            <button data-more="print">🖨 ${t('exportPrint')}</button>
            <button data-more="copylink">⧉ ${t('copyLink')}</button>
            <button data-more="del" class="nb-menu-danger">🗑 ${t('del')}</button>
          </div>
        </div>
      </div>
      <div class="nb-tags-line">
        ${(nt.tags||[]).map((tag,i)=>`<span class="nb-tag">${cmSpan(tag)} <button data-deltag="${i}" style="border:0;background:transparent;color:inherit;cursor:pointer;padding:0 0 0 4px">✕</button></span>`).join('')}
        <input id="nbTagInput" type="text" placeholder="${t('tagsPh')}" maxlength="30" />
      </div>
      ${(nt.refs&&nt.refs.length)?`<div class="nb-refs-line" id="nbRefsLine">
        ${nt.refs.map((r,i)=>`<a class="nb-ref-chip" href="${esc(r.href||'#')}" ${/^https?:|^app\.html|^\//.test(r.href||'')?'':'onclick="return false"'} data-refopen="${i}">
          <span class="nb-ref-kind">${r.kind==='qbank'?'QBank':r.kind==='flash'?'Flash':'Library'}</span>${esc(r.label||r.href||'')}
          <span class="nb-ref-x" data-refdel="${i}">✕</span></a>`).join('')}
      </div>`:''}
      ${drawing ? drawToolbar() : textToolbar(swatchPop)}
      ${pagerHtml}
      <div class="nb-page-wrap">
        <div class="nb-page nb-bg-${esc(book.bg||'white')} ${book.paper&&book.paper!=='blank'?'nb-paper-'+esc(book.paper):''} ${book.orientation==='landscape'?'nb-o-landscape':''} ${drawing?'nb-drawmode':''}" ${book.paper==='custom'&&book.customPaper?`style="background-image:url('${esc(book.customPaper)}');background-size:100% auto;background-repeat:repeat-y"`:''} id="nbPage">
          <div class="nb-page-text" id="nbEditor" contenteditable="${drawing?'false':'true'}" data-ph="${t('notePh')}"></div>
          <canvas class="nb-page-draw" id="nbCanvas"></canvas>
        </div>
      </div>`;
    wireCrumbs(parts);

    const editor = root.querySelector('#nbEditor');
    editor.innerHTML = curPage.html || '';

    const scheduleSave = ()=>{
      markSaving();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(()=>{ if(view.mode!=='draw') curPage.html = editor.innerHTML; nt.updated = Date.now(); save(); }, 500);
    };

    /* --- casca comum --- */
    root.querySelector('#nbBack').addEventListener('click', ()=>{ flushPage(nt, editor, curPage); view={name:'notebook', nbId:nt.notebookId}; syncUrl(); render(); });
    const titleInp = root.querySelector('#nbNoteTitle');
    titleInp.addEventListener('input', ()=>{ nt.title = titleInp.value; scheduleSave(); });
    const tagInp = root.querySelector('#nbTagInput');
    tagInp.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); const v = tagInp.value.trim(); if(!v) return;
        nt.tags = nt.tags||[]; if(!nt.tags.includes(v)) nt.tags.push(v);
        nt.updated = Date.now(); save(); render();
        setTimeout(()=>{ const el=root.querySelector('#nbTagInput'); if(el)el.focus(); },0);
      }
    });
    root.querySelectorAll('[data-deltag]').forEach(b=>b.addEventListener('click', ()=>{
      nt.tags.splice(+b.dataset.deltag,1); nt.updated=Date.now(); save(); render();
    }));
    // favoritar
    root.querySelector('#nbFavBtn').addEventListener('click', ()=>{ nt.fav=!nt.fav; nt.updated=Date.now(); save(); render(); });
    // modo leitura
    root.querySelector('#nbReadBtn').addEventListener('click', ()=>{ flushPage(nt, editor, curPage); view.reading=true; render(); });
    // menu "mais"
    const moreBtn = root.querySelector('#nbMoreBtn'), morePop = root.querySelector('#nbMorePop');
    moreBtn.addEventListener('click', e=>{ e.stopPropagation(); morePop.hidden=!morePop.hidden; });
    document.addEventListener('click', ()=>{ if(morePop) morePop.hidden=true; }, { once:true });
    morePop.addEventListener('click', e=>e.stopPropagation());
    morePop.querySelectorAll('[data-more]').forEach(b=>b.addEventListener('click', ()=>{
      morePop.hidden=true; const act=b.dataset.more;
      if(act==='layout'){ flushPage(nt,editor,curPage); nt.multiPage=!nt.multiPage; if(!nt.multiPage) view.page=0; nt.updated=Date.now(); save(); render(); }
      else if(act==='ref') refModal(nt);
      else if(act==='export') exportHtml(nt);
      else if(act==='pdf'){ flushPage(nt,editor,curPage); exportPrint(nt, true); }
      else if(act==='print'){ flushPage(nt,editor,curPage); exportPrint(nt, false); }
      else if(act==='copylink'){ copyNoteLink(nt); }
      else if(act==='del'){
        if(!confirm(t('confirmDelNote'))) return;
        notePages(nt).forEach(p=>deleteRemoteImages(p.html));
        DB.notes = DB.notes.filter(n=>n.id!==nt.id);
        save(); view={name:'notebook', nbId:nt.notebookId}; syncUrl(); render();
      }
    }));
    // referências: abrir/remover
    root.querySelectorAll('[data-refdel]').forEach(x=>x.addEventListener('click', e=>{
      e.preventDefault(); e.stopPropagation(); nt.refs.splice(+x.dataset.refdel,1); nt.updated=Date.now(); save(); render();
    }));

    // troca de modo
    root.querySelector('#nbModeType').addEventListener('click', ()=>{ if(view.mode!=='draw')return; flushPage(nt, editor, curPage); view.mode='type'; render(); });
    root.querySelector('#nbModeDraw').addEventListener('click', ()=>{ if(view.mode==='draw')return; flushPage(nt, editor, curPage); view.mode='draw'; render(); });

    // paginação
    if(multi){
      const goto = i=>{ flushPage(nt, editor, curPage); view.page=i; syncUrl(); render(); };
      const pv=root.querySelector('#nbPgPrev'), nx=root.querySelector('#nbPgNext');
      if(pv) pv.addEventListener('click', ()=>{ if(view.page>0) goto(view.page-1); });
      if(nx) nx.addEventListener('click', ()=>{ if(view.page<pages.length-1) goto(view.page+1); });
      root.querySelector('#nbPgAdd').addEventListener('click', ()=>{
        flushPage(nt, editor, curPage);
        pages.splice(view.page+1, 0, { id:uid(), html:'', strokes:[] });
        view.page++; nt.updated=Date.now(); save(); render();
      });
      root.querySelector('#nbPgDup').addEventListener('click', ()=>{
        flushPage(nt, editor, curPage);
        const clone = JSON.parse(JSON.stringify(curPage)); clone.id=uid();
        pages.splice(view.page+1, 0, clone);
        view.page++; nt.updated=Date.now(); save(); render();
      });
      const dl=root.querySelector('#nbPgDel');
      if(dl) dl.addEventListener('click', ()=>{
        if(pages.length<=1) return;
        if(!confirm(t('confirmDelPage'))) return;
        deleteRemoteImages(curPage.html);
        pages.splice(view.page,1);
        if(view.page>pages.length-1) view.page=pages.length-1;
        nt.updated=Date.now(); save(); render();
      });
    }

    /* --- canvas de desenho --- */
    setupCanvas(nt, book, drawing, curPage);
    if(drawing){ wireDrawBar(nt, curPage); return; }

    /* --- editor de texto --- */
    try{ document.execCommand('styleWithCSS', false, true); }catch(e){}
    try{ document.execCommand('defaultParagraphSeparator', false, 'p'); }catch(e){}
    editor.addEventListener('input', scheduleSave);
    editor.addEventListener('blur', ()=>flushPage(nt, editor, curPage));
    // checklist: alterna concluído ao clicar na caixinha
    editor.addEventListener('click', e=>{
      const li = e.target.closest('li.nb-check-item');
      if(li && e.offsetX < 26){ li.classList.toggle('nb-checked'); scheduleSave(); }
    });

    const exec = (cmd, val)=>{ editor.focus(); document.execCommand(cmd, false, val); scheduleSave(); };
    root.querySelectorAll('#nbToolbar [data-cmd]').forEach(b=>{
      b.addEventListener('mousedown', e=>e.preventDefault());
      b.addEventListener('click', ()=>exec(b.dataset.cmd));
    });
    root.querySelector('#nbFmtBlock').addEventListener('change', e=>{ exec('formatBlock', '<'+e.target.value+'>'); e.target.value='p'; });
    root.querySelector('#nbFontSel').addEventListener('change', e=>{ if(e.target.value) exec('fontName', e.target.value); e.target.selectedIndex=0; });
    root.querySelector('#nbSizeSel').addEventListener('change', e=>{ if(e.target.value) exec('fontSize', e.target.value); e.target.selectedIndex=0; });

    // botões extras: checklist, citação, código, link
    const insertChecklist = ()=>{
      editor.focus();
      document.execCommand('insertHTML', false, '<ul class="nb-checklist"><li class="nb-check-item">&nbsp;</li></ul>');
      scheduleSave();
    };
    root.querySelector('#nbCheckBtn').addEventListener('mousedown', e=>e.preventDefault());
    root.querySelector('#nbCheckBtn').addEventListener('click', insertChecklist);
    root.querySelector('#nbQuoteBtn').addEventListener('mousedown', e=>e.preventDefault());
    root.querySelector('#nbQuoteBtn').addEventListener('click', ()=>exec('formatBlock','<blockquote>'));
    root.querySelector('#nbCodeBtn').addEventListener('mousedown', e=>e.preventDefault());
    root.querySelector('#nbCodeBtn').addEventListener('click', ()=>{ exec('formatBlock','<pre>'); });
    root.querySelector('#nbLinkBtn').addEventListener('mousedown', e=>e.preventDefault());
    root.querySelector('#nbLinkBtn').addEventListener('click', ()=>{ const u=prompt(t('linkPrompt'),'https://'); if(u) exec('createLink',u); });

    // paletas de cor (fonte + marca-texto)
    const wireSwatch = (btnId, popId, barId, cmd)=>{
      const btn = root.querySelector('#'+btnId), pop = root.querySelector('#'+popId), bar = root.querySelector('#'+barId);
      btn.addEventListener('mousedown', e=>e.preventDefault());
      btn.addEventListener('click', ()=>{ closePops(pop); pop.hidden = !pop.hidden; });
      pop.querySelectorAll('[data-sw]').forEach(sw=>{
        sw.addEventListener('mousedown', e=>e.preventDefault());
        sw.addEventListener('click', ()=>{ bar.style.background = sw.dataset.sw; exec(cmd, sw.dataset.sw); pop.hidden = true; });
      });
      const custom = pop.querySelector('[data-swc]');
      custom.addEventListener('input', ()=>{ bar.style.background = custom.value; exec(cmd, custom.value); });
    };
    const closePops = except => root.querySelectorAll('.nb-swatch-pop').forEach(p=>{ if(p!==except) p.hidden = true; });
    wireSwatch('nbForeBtn','nbForePop','nbForeBar','foreColor');
    wireSwatch('nbHiliteBtn','nbHilitePop','nbHiliteBar','hiliteColor');
    if(!window.__nbPopCloser){
      window.__nbPopCloser = true;
      document.addEventListener('click', e=>{ if(!e.target.closest('.nb-swatch-wrap') && root) root.querySelectorAll('.nb-swatch-pop').forEach(p=>{ p.hidden = true; }); });
    }

    // imagens
    const insertImg = url => { editor.focus(); document.execCommand('insertImage', false, url); scheduleSave(); };
    root.querySelector('#nbImgBtn').addEventListener('click', ()=>root.querySelector('#nbImgFile').click());
    root.querySelector('#nbImgFile').addEventListener('change', async e=>{
      const f = e.target.files[0]; if(!f) return;
      const url = await uploadImage(f); if(url) insertImg(url);
      e.target.value='';
    });
    editor.addEventListener('paste', async e=>{
      const items = (e.clipboardData||{}).items || [];
      for(const it of items){
        if(it.kind==='file' && /^image\//.test(it.type)){
          e.preventDefault();
          const url = await uploadImage(it.getAsFile()); if(url) insertImg(url);
          return;
        }
      }
    });
    editor.addEventListener('dragover', e=>{ if((e.dataTransfer.types||[]).includes('Files')) e.preventDefault(); });
    editor.addEventListener('drop', async e=>{
      const f = (e.dataTransfer.files||[])[0];
      if(f && /^image\//.test(f.type)){ e.preventDefault(); const url = await uploadImage(f); if(url) insertImg(url); }
    });
  }

  /* ---------- toolbars (texto e desenho) ---------- */
  function textToolbar(swatchPop){
    return `
    <div class="nb-toolbar" id="nbToolbar">
      <button class="nb-tb" data-cmd="undo" title="${t('tipUndo')}">↩</button>
      <button class="nb-tb" data-cmd="redo" title="${t('tipRedo')}">↪</button>
      <span class="nb-tb-sep"></span>
      <select class="nb-tb-select" id="nbFmtBlock">
        <option value="p">${t('fmtP')}</option><option value="h1">${t('fmtH1')}</option>
        <option value="h2">${t('fmtH2')}</option><option value="h3">${t('fmtH3')}</option>
      </select>
      <select class="nb-tb-select" id="nbFontSel">
        <option value="">${t('fontDefault')}</option>
        ${FONTS.map(f=>`<option value="${f}">${f}</option>`).join('')}
      </select>
      <select class="nb-tb-select" id="nbSizeSel">
        <option value="">${t('sizeLbl')}</option>
        ${SIZES.map(s=>`<option value="${s.v}">${s.l}</option>`).join('')}
      </select>
      <span class="nb-tb-sep"></span>
      <button class="nb-tb" data-cmd="bold" title="${t('tipBold')}"><b>B</b></button>
      <button class="nb-tb" data-cmd="italic" title="${t('tipItalic')}"><i>I</i></button>
      <button class="nb-tb" data-cmd="underline" title="${t('tipUnder')}"><u>U</u></button>
      <button class="nb-tb" data-cmd="strikeThrough" title="${t('tipStrike')}"><s>S</s></button>
      <span class="nb-tb-sep"></span>
      <span class="nb-swatch-wrap"><button class="nb-tb" id="nbForeBtn" title="${t('tipColor')}">A<span class="nb-tb-color-bar" id="nbForeBar" style="background:#2768ff"></span></button>${swatchPop('nbForePop')}</span>
      <span class="nb-swatch-wrap"><button class="nb-tb" id="nbHiliteBtn" title="${t('tipHilite')}">🖍<span class="nb-tb-color-bar" id="nbHiliteBar" style="background:#fff176"></span></button>${swatchPop('nbHilitePop')}</span>
      <span class="nb-tb-sep"></span>
      <button class="nb-tb" data-cmd="justifyLeft" title="${t('tipLeft')}">⇤</button>
      <button class="nb-tb" data-cmd="justifyCenter" title="${t('tipCenter')}">☰</button>
      <button class="nb-tb" data-cmd="justifyRight" title="${t('tipRight')}">⇥</button>
      <span class="nb-tb-sep"></span>
      <button class="nb-tb" data-cmd="insertUnorderedList" title="${t('tipUl')}">•≡</button>
      <button class="nb-tb" data-cmd="insertOrderedList" title="${t('tipOl')}">1≡</button>
      <button class="nb-tb" id="nbCheckBtn" title="${t('tipCheck')}">☑</button>
      <span class="nb-tb-sep"></span>
      <button class="nb-tb" id="nbQuoteBtn" title="${t('tipQuote')}">❝</button>
      <button class="nb-tb" id="nbCodeBtn" title="${t('tipCode')}">&lt;/&gt;</button>
      <button class="nb-tb" id="nbLinkBtn" title="${t('tipLink')}">🔗</button>
      <button class="nb-tb" id="nbImgBtn" title="${t('tipImg')}">🖼</button>
      <input type="file" id="nbImgFile" accept="image/*" hidden />
      <button class="nb-tb" data-cmd="removeFormat" title="${t('tipClear')}">⌫A</button>
    </div>`;
  }
  function drawToolbar(){
    const tool = drawPrefs.tool;
    const palette = tool==='marker' ? MARKER_PALETTE : PEN_PALETTE;
    const widths = tool==='marker' ? MARKER_WIDTHS : PEN_WIDTHS;
    return `
    <div class="nb-drawbar" id="nbDrawBar">
      <div class="nb-tool-group">
        <button class="nb-tool ${tool==='pen'?'nb-on':''}" data-tool="pen" title="${t('penTool')}">✒</button>
        <button class="nb-tool ${tool==='marker'?'nb-on':''}" data-tool="marker" title="${t('markerTool')}">🖊</button>
        <button class="nb-tool ${tool==='eraser'?'nb-on':''}" data-tool="eraser" title="${t('eraserTool')}">◻</button>
        <button class="nb-tool ${tool==='lasso'?'nb-on':''}" data-tool="lasso" title="${t('lasso')}">⬚</button>
        <span class="nb-tb-sep"></span>
        <button class="nb-tool ${tool==='line'?'nb-on':''}" data-tool="line" title="${t('shapeLine')}">╱</button>
        <button class="nb-tool ${tool==='rect'?'nb-on':''}" data-tool="rect" title="${t('shapeRect')}">▭</button>
        <button class="nb-tool ${tool==='circle'?'nb-on':''}" data-tool="circle" title="${t('shapeCircle')}">◯</button>
        <button class="nb-tool ${tool==='arrow'?'nb-on':''}" data-tool="arrow" title="${t('shapeArrow')}">➜</button>
      </div>
      ${tool==='eraser'||tool==='lasso' ? '' : `
      <span class="nb-tb-sep"></span>
      <div class="nb-pen-colors" id="nbPenColors">
        ${palette.map(c=>`<button class="nb-pen" data-pen="${c}" style="background:${c};${c==='#ffffff'?'box-shadow:inset 0 0 0 1px rgba(0,0,0,.3)':''}"></button>`).join('')}
      </div>`}
      <span class="nb-tb-sep"></span>
      <div class="nb-width-group">
        ${widths.map(w=>`<button class="nb-wbtn" data-w="${w.v}" title="${t(w.k)}"><span style="width:${Math.min(22,w.v+8)}px;height:${Math.max(2,Math.round(w.v/2))}px"></span></button>`).join('')}
      </div>
      <span class="nb-tb-sep"></span>
      <button class="nb-btn" id="nbUndoStroke" title="${t('undoStroke')}">↩</button>
      <button class="nb-btn nb-btn-danger" id="nbClearDraw">${t('clearDraw')}</button>
    </div>`;
  }

  /* ---------- MODO LEITURA ---------- */
  function renderReading(nt, book, parts){
    const pages = notePages(nt);
    const body = pages.map((p,i)=>`
      <div class="nb-read-page nb-bg-${esc(book.bg||'white')} ${book.paper&&book.paper!=='blank'?'nb-paper-'+esc(book.paper):''} ${book.orientation==='landscape'?'nb-o-landscape':''}" ${book.paper==='custom'&&book.customPaper?`style="background-image:url('${esc(book.customPaper)}');background-size:100% auto;background-repeat:repeat-y"`:''}>
        <div class="nb-read-body">${p.html||'<p class="nb-muted">'+t('emptyReading')+'</p>'}</div>
      </div>`).join('');
    root.innerHTML = `
      <div class="nb-ed-head">
        <button class="nb-btn nb-btn-ghost" id="nbReadBack">${t('exitReading')}</button>
        <h1 class="nb-read-title">${cmSpan(nt.title||t('untitled'))}</h1>
        <span style="flex:1"></span>
        <button class="nb-btn" id="nbReadPdf">📄 ${t('exportPdf')}</button>
        <button class="nb-btn" id="nbReadPrint">🖨 ${t('exportPrint')}</button>
      </div>
      ${crumbs(parts)}
      <div class="nb-reading">${body}</div>`;
    wireCrumbs(parts);
    root.querySelector('#nbReadBack').addEventListener('click', ()=>{ view.reading=false; render(); });
    root.querySelector('#nbReadPdf').addEventListener('click', ()=>exportPrint(nt, true));
    root.querySelector('#nbReadPrint').addEventListener('click', ()=>exportPrint(nt, false));
    // re-desenha traços vetoriais como imagem no modo leitura
    const wraps = root.querySelectorAll('.nb-read-page');
    pages.forEach((p,i)=>{
      if(!(p.strokes&&p.strokes.length)) return;
      const ori = book.orientation==='landscape'?'landscape':'portrait';
      const cv = document.createElement('canvas'); cv.width=CANVAS_W[ori]; cv.height=CANVAS_H[ori];
      cv.className='nb-read-canvas';
      const ctx=cv.getContext('2d'); if(ctx) p.strokes.forEach(s=>drawStroke(ctx,s));
      if(wraps[i]) wraps[i].appendChild(cv);
    });
  }

  /* ---------- REFERÊNCIAS (somente link) ---------- */
  function refModal(nt){
    let kind = 'qbank';
    const m = openModal(`
      <h3>${t('linkRef')}</h3>
      <div class="nb-field"><label>${t('reference')}</label>
        <div class="nb-opts" id="nbRefKinds">
          <button class="nb-opt nb-on" data-k="qbank">📚 ${t('refQbank')}</button>
          <button class="nb-opt" data-k="flash">🃏 ${t('refFlash')}</button>
          <button class="nb-opt" data-k="library">▤ ${t('refLibrary')}</button>
        </div>
      </div>
      <div class="nb-field"><label id="nbRefLbl">${t('refPickQbank')}</label>
        <input type="text" id="nbRefVal" placeholder="${t('refPickQbank')}" />
      </div>
      <p class="nb-ref-hint">${t('refHint')}</p>
      <div class="nb-modal-foot">
        <button class="nb-btn nb-btn-ghost" id="nbRefCancel">${t('cancel')}</button>
        <button class="nb-btn nb-btn-primary" id="nbRefSave">${t('refAdd').replace('+ ','')}</button>
      </div>`);
    const lbl = m.querySelector('#nbRefLbl'), inp = m.querySelector('#nbRefVal');
    m.querySelectorAll('[data-k]').forEach(b=>b.addEventListener('click', ()=>{
      kind=b.dataset.k; m.querySelectorAll('[data-k]').forEach(x=>x.classList.toggle('nb-on',x===b));
      const ph = kind==='qbank'?t('refPickQbank'):kind==='flash'?t('refPickFlash'):t('refPickLibrary');
      lbl.textContent=ph; inp.placeholder=ph;
    }));
    m.querySelector('#nbRefCancel').addEventListener('click', closeModal);
    m.querySelector('#nbRefSave').addEventListener('click', ()=>{
      const val = inp.value.trim(); if(!val) return;
      // monta href/rótulo — apenas referência, nunca altera QBank/Flash/Library
      let href = val, label = val;
      if(kind==='qbank' && !/^https?:|^app\.html|^\//.test(val)){ href = `app.html?page=qbank-1&u=${USER}&q=${encodeURIComponent(val)}`; label = 'QBank #'+val; }
      nt.refs = nt.refs||[]; nt.refs.push({ kind, href, label });
      nt.updated=Date.now(); save(); closeModal(); render();
    });
    inp.focus();
  }

  /* ---------- EXPORTAR / IMPRIMIR ---------- */
  function noteToExportHtml(nt){
    const book = bookById(nt.notebookId) || defBook();
    const pages = notePages(nt);
    const pagesHtml = pages.map((p,i)=>{
      let canvasImg = '';
      if(p.strokes && p.strokes.length){
        const ori = book.orientation==='landscape'?'landscape':'portrait';
        const cv=document.createElement('canvas'); cv.width=CANVAS_W[ori]; cv.height=CANVAS_H[ori];
        const ctx=cv.getContext('2d'); if(ctx){ p.strokes.forEach(s=>drawStroke(ctx,s)); try{ canvasImg=`<img class="ink" src="${cv.toDataURL('image/png')}" />`; }catch(e){} }
      }
      return `<section class="pg">${canvasImg}<div class="body">${p.html||''}</div></section>`;
    }).join('');
    return { title: nt.title||t('untitled'), html: pagesHtml };
  }
  function exportHtml(nt){
    const { title, html } = noteToExportHtml(nt);
    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>body{font-family:'Helvetica Neue',Arial,sans-serif;max-width:820px;margin:24px auto;padding:0 20px;color:#182233;line-height:1.6}
      h1,h2,h3{line-height:1.3} .pg{position:relative;margin:0 0 26px;padding-bottom:20px;border-bottom:1px dashed #ccc}
      .pg .ink{position:absolute;inset:0;width:100%;height:auto;pointer-events:none} img{max-width:100%}
      blockquote{border-left:3px solid #3d84ff;margin:10px 0;padding:4px 14px;color:#445}
      pre{background:#f4f6fa;padding:12px;border-radius:8px;overflow:auto} ul.nb-checklist{list-style:none;padding-left:4px}
      ul.nb-checklist li{position:relative;padding-left:26px} ul.nb-checklist li:before{content:'☐';position:absolute;left:0}
      ul.nb-checklist li.nb-checked:before{content:'☑'} ul.nb-checklist li.nb-checked{text-decoration:line-through;color:#889}</style>
      </head><body><h1>${esc(title)}</h1>${html}</body></html>`;
    const blob = new Blob([doc], {type:'text/html'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download = (title||'note').replace(/[^\w\-]+/g,'_')+'.html';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1500);
  }
  function exportPrint(nt, isPdf){
    const { title, html } = noteToExportHtml(nt);
    const w = window.open('', '_blank');
    if(!w){ toast(t('storageFull'), true); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>@page{margin:16mm} body{font-family:'Helvetica Neue',Arial,sans-serif;color:#182233;line-height:1.6}
      h1,h2,h3{line-height:1.3} .pg{position:relative;page-break-after:always;padding-bottom:12px}
      .pg:last-child{page-break-after:auto} .pg .ink{position:absolute;inset:0;width:100%;height:auto;pointer-events:none}
      img{max-width:100%} blockquote{border-left:3px solid #3d84ff;margin:10px 0;padding:4px 14px;color:#445}
      pre{background:#f4f6fa;padding:12px;border-radius:8px;overflow:auto} ul.nb-checklist{list-style:none;padding-left:4px}
      ul.nb-checklist li{position:relative;padding-left:26px} ul.nb-checklist li:before{content:'☐';position:absolute;left:0}
      ul.nb-checklist li.nb-checked:before{content:'☑'} ul.nb-checklist li.nb-checked{text-decoration:line-through;color:#889}</style>
      </head><body><h1>${esc(title)}</h1>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(()=>{ w.print(); }, 350);
  }
  function copyNoteLink(nt){
    const url = `${location.origin}/app.html?page=notebooks&u=${USER}&nb=${nt.notebookId}&note=${nt.id}`;
    const done = ()=>toast(t('linkCopied'));
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done).catch(done);
    else { try{ const ta=document.createElement('textarea'); ta.value=url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }catch(e){} done(); }
  }

  function flushPage(nt, editor, page){
    clearTimeout(saveTimer);
    if(editor && view.mode!=='draw' && page) page.html = editor.innerHTML;
    nt.updated = Date.now(); save();
  }
  function flushNoteSave(nt, editor){ // compat: usado por chamadas antigas
    const pages = notePages(nt);
    flushPage(nt, editor, pages[view.page||0]);
  }

  /* ---------- desenho à mão (canvas, strokes vetoriais + formas) ---------- */
  const CANVAS_W = { portrait:900, landscape:1240 }, CANVAS_H = { portrait:1215, landscape:918 };
  let drawState = null;
  let drawPrefs = { tool:'pen', penColor:PEN_PALETTE[0], markerColor:MARKER_PALETTE[0], penWidth:4, markerWidth:22, eraserWidth:18 };
  function setupCanvas(nt, book, interactive, page){
    const canvas = root.querySelector('#nbCanvas'); if(!canvas) return;
    const ori = book.orientation==='landscape' ? 'landscape' : 'portrait';
    canvas.width = CANVAS_W[ori]; canvas.height = CANVAS_H[ori];
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;
    page.strokes = page.strokes || [];
    if(!ctx) return;
    const redraw = ()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      page.strokes.forEach(s=>drawStroke(ctx, s));
    };
    redraw();
    drawState = { canvas, ctx, nt, page, redraw };
    if(!interactive) return;

    let cur = null, startPt = null, previewStrokes = null;
    const pos = e => {
      const r = canvas.getBoundingClientRect();
      return [ Math.round((e.clientX - r.left) * canvas.width / r.width),
               Math.round((e.clientY - r.top) * canvas.height / r.height) ];
    };
    const activeColor = ()=> drawPrefs.tool==='marker' ? drawPrefs.markerColor : drawPrefs.penColor;
    const activeWidth = ()=> drawPrefs.tool==='marker' ? drawPrefs.markerWidth : (drawPrefs.tool==='eraser' ? drawPrefs.eraserWidth : drawPrefs.penWidth);

    canvas.addEventListener('pointerdown', e=>{
      e.preventDefault(); canvas.setPointerCapture(e.pointerId);
      const [x,y] = pos(e); startPt=[x,y];
      const tool = drawPrefs.tool;
      if(tool==='lasso') return; // seleção/mover: simplificado (sem persistência de seleção)
      if(['line','rect','circle','arrow'].includes(tool)){
        cur = { c: activeColor(), w: drawPrefs.penWidth, e:0, shape:tool, p:[x,y,x,y] };
        return;
      }
      cur = {
        c: tool==='eraser' ? '#000' : activeColor(),
        w: activeWidth(),
        e: tool==='eraser' ? 1 : 0,
        m: tool==='marker' ? 1 : 0,
        p:[x,y]
      };
    });
    canvas.addEventListener('pointermove', e=>{
      if(!cur) return; e.preventDefault();
      const [x,y] = pos(e);
      if(cur.shape){
        cur.p[2]=x; cur.p[3]=y;
        drawState.redraw(); drawStroke(ctx, cur);
        return;
      }
      const n = cur.p.length;
      if(n>=2 && Math.abs(cur.p[n-2]-x)<2 && Math.abs(cur.p[n-1]-y)<2) return;
      cur.p.push(x,y);
      drawStroke(drawState.ctx, cur, n-2);
    });
    const end = ()=>{
      if(!cur) return;
      if(!cur.shape && cur.p.length===2) cur.p.push(cur.p[0]+1, cur.p[1]+1);
      page.strokes.push(cur); cur = null;
      nt.updated = Date.now(); save();
      drawState.redraw();
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }
  function drawStroke(ctx, s, fromIdx){
    ctx.save();
    if(s.m){ ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=0.38; }
    else ctx.globalCompositeOperation = s.e ? 'destination-out' : 'source-over';
    ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const p = s.p;
    if(s.shape){
      const [x1,y1,x2,y2]=p;
      ctx.beginPath();
      if(s.shape==='line'){ ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
      else if(s.shape==='rect'){ ctx.strokeRect(Math.min(x1,x2),Math.min(y1,y2),Math.abs(x2-x1),Math.abs(y2-y1)); }
      else if(s.shape==='circle'){ ctx.ellipse((x1+x2)/2,(y1+y2)/2,Math.abs(x2-x1)/2,Math.abs(y2-y1)/2,0,0,Math.PI*2); ctx.stroke(); }
      else if(s.shape==='arrow'){
        ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        const ang=Math.atan2(y2-y1,x2-x1), h=Math.max(10,s.w*3);
        ctx.beginPath(); ctx.moveTo(x2,y2);
        ctx.lineTo(x2-h*Math.cos(ang-Math.PI/6), y2-h*Math.sin(ang-Math.PI/6));
        ctx.moveTo(x2,y2);
        ctx.lineTo(x2-h*Math.cos(ang+Math.PI/6), y2-h*Math.sin(ang+Math.PI/6));
        ctx.stroke();
      }
      ctx.restore(); return;
    }
    const start = Math.max(0, fromIdx||0);
    ctx.beginPath();
    ctx.moveTo(p[start], p[start+1]);
    for(let i=start+2; i<p.length; i+=2) ctx.lineTo(p[i], p[i+1]);
    ctx.stroke();
    ctx.restore();
  }
  function wireDrawBar(nt, page){
    const bar = root.querySelector('#nbDrawBar'); if(!bar || !drawState) return;
    // seleção de ferramenta
    bar.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click', ()=>{
      drawPrefs.tool = b.dataset.tool; render(); // re-render para atualizar paleta/larguras
    }));
    // cores
    const isMarker = drawPrefs.tool==='marker';
    bar.querySelectorAll('[data-pen]').forEach(b=>{
      const on = b.dataset.pen === (isMarker?drawPrefs.markerColor:drawPrefs.penColor);
      b.classList.toggle('nb-on', on);
      b.addEventListener('click', ()=>{
        if(isMarker) drawPrefs.markerColor=b.dataset.pen; else drawPrefs.penColor=b.dataset.pen;
        bar.querySelectorAll('[data-pen]').forEach(x=>x.classList.toggle('nb-on', x===b));
      });
    });
    // larguras
    const curW = isMarker?drawPrefs.markerWidth:drawPrefs.penWidth;
    bar.querySelectorAll('[data-w]').forEach(b=>{
      b.classList.toggle('nb-on', +b.dataset.w===curW);
      b.addEventListener('click', ()=>{
        const v=+b.dataset.w;
        if(isMarker) drawPrefs.markerWidth=v; else drawPrefs.penWidth=v;
        bar.querySelectorAll('[data-w]').forEach(x=>x.classList.toggle('nb-on', x===b));
      });
    });
    bar.querySelector('#nbUndoStroke').addEventListener('click', ()=>{
      page.strokes.pop(); nt.updated = Date.now(); save(); drawState.redraw();
    });
    bar.querySelector('#nbClearDraw').addEventListener('click', ()=>{
      if(!confirm(t('confirmClearDraw'))) return;
      page.strokes = []; nt.updated = Date.now(); save(); drawState.redraw();
    });
  }
  /* ---------- URL / deep links ---------- */
  function syncUrl(){
    const u = new URL(location.href);
    u.searchParams.set('page','notebooks'); u.searchParams.set('u',USER);
    u.searchParams.delete('folder'); u.searchParams.delete('nb'); u.searchParams.delete('note'); u.searchParams.delete('prefill');
    if(view.name==='folder') u.searchParams.set('folder', view.folderId);
    else if(view.name==='notebook') u.searchParams.set('nb', view.nbId);
    else if(view.name==='note'){ const nt=noteById(view.noteId); if(nt){ u.searchParams.set('nb', nt.notebookId); u.searchParams.set('note', view.noteId); } }
    else if(view.name==='allnotes') u.searchParams.set('page','notes');
    else if(view.name==='favorites') u.searchParams.set('fav','1');
    history.replaceState(null,'', 'app.html'+u.search);
  }
  /* ---------- entrada rápida por seleção (ex.: botão "Notebook" no leitor da
     Library 3) — mesmo espírito do `?prefill=` que o Flashcards já suporta:
     cai direto no editor de uma nota nova, já com o texto selecionado dentro. */
  function ensureQuickCaptureBook(){
    let folder = folderById('lib3-folder');
    if(!folder){
      folder = { id:'lib3-folder', name:'Library 3', color:FOLDER_COLORS[0], parentId:null, created:Date.now() };
      DB.folders.push(folder);
    }
    let book = bookById('lib3-clips');
    if(!book){
      book = { id:'lib3-clips', folderId:folder.id, title:'Library 3', icon:'📘', paper:'blank', bg:'white',
        orientation:'portrait', cover:{on:true, model:'solida', colorHex:'#2768ff'}, created:Date.now(), updated:Date.now() };
      DB.notebooks.push(book);
    }
    return book;
  }
  function quickCaptureView(prefill){
    const book = ensureQuickCaptureBook();
    const nt = { id:uid(), notebookId:book.id, title:'', tags:[], fav:false, refs:[], multiPage:false,
      pages:[{ id:uid(), html:'<p>'+esc(prefill)+'</p>', strokes:[] }], created:Date.now(), updated:Date.now() };
    DB.notes.push(nt); save();
    return { name:'note', noteId:nt.id, page:0 };
  }
  function initialView(){
    const prefill = params.get('prefill');
    if(prefill) return quickCaptureView(prefill);
    if(PAGE==='notes') return { name:'allnotes' };
    if(params.get('fav')) return { name:'favorites' };
    const noteId = params.get('note'), nbId = params.get('nb'), folderId = params.get('folder');
    if(noteId && noteById(noteId)) return { name:'note', noteId, page:0 };
    if(nbId && bookById(nbId)) return { name:'notebook', nbId };
    if(folderId && folderById(folderId)) return { name:'folder', folderId };
    return { name:'folders' };
  }

  /* ---------- boot ---------- */
  let booted = false;
  function boot(){
    if(booted) return;
    const h = document.querySelector('#internalContent .internal-card');
    if(!h) return;
    booted = true;
    host = h;
    document.querySelector('#internalContent').classList.add('nb-wide');
    host.classList.add('nb');
    host.innerHTML = '<div id="nbRoot" class="nb"></div>';
    root = host.querySelector('#nbRoot');
    view = initialView();
    render();
    // limpa o `?prefill=` da URL depois de criar a nota, senão um F5 duplicaria a captura
    if(params.get('prefill')) syncUrl();
    // re-renderiza ao trocar de idioma (mesmo padrão do módulo Flashcards)
    new MutationObserver(()=>render()).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
