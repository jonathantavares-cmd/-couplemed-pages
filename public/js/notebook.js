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
    /* v4: caderno = páginas direto (GoodNotes). As notas antigas de cada caderno
       viram páginas dele, em ordem de criação; o título da nota vira um <h1> na
       primeira página daquela nota. Nada é perdido. As notas migradas saem de
       DB.notes (notas rápidas passam a viver no app Notes, Fase 5). */
    const escMig = s => String(s==null?'':s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    (DB.notebooks||[]).forEach(nb=>{
      if(Array.isArray(nb.pages)) return;
      const notes = (DB.notes||[]).filter(n=>n.notebookId===nb.id).sort((a,b)=>(a.created||0)-(b.created||0));
      nb.pages = [];
      notes.forEach(nt=>{
        const pgs = Array.isArray(nt.pages)&&nt.pages.length ? nt.pages : [{html:nt.html||'', strokes:nt.strokes||[]}];
        pgs.forEach((p,i)=>{
          let html = p.html||'';
          if(i===0 && nt.title) html = '<h1>'+escMig(nt.title)+'</h1>'+html;
          nb.pages.push({ id:uid(), html, strokes:Array.isArray(p.strokes)?p.strokes:[], fav:(i===0&&!!nt.fav) });
        });
      });
      if(!nb.pages.length) nb.pages.push({ id:uid(), html:'', strokes:[] });
      touched = true;
    });
    if((DB.notes||[]).length){ DB.notes = []; touched = true; }
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
      // v4: páginas do caderno (conteúdo) entram na busca global
      (Array.isArray(n.pages)?n.pages:[]).forEach((p,i)=>{
        const sticky = (Array.isArray(p.objs)?p.objs:[]).filter(o=>o.type==='sticky'&&o.text).map(o=>o.text).join(' ');
        const txt = (stripHtml(p.html||'')+' '+sticky).replace(/\s+/g,' ').trim(); if(!txt) return;
        items.push({
          label: (n.title||'') + ' · p.' + (i+1),
          snippetSource: txt,
          href:`app.html?page=notebooks&u=${USER}&nb=${n.id}&pg=${i}`,
          cat:'Notebooks · '+(n.title||'')
        });
      });
    });
    return items;
  };
  /* v6: notas do app "Notes" (Apple Notes) também entram na busca global */
  window.CMSearchProviders.notesApp = function(){
    try{
      const d = JSON.parse(localStorage.getItem(`couplemed_notes_${USER}`)) || {};
      return (d.notes||[]).filter(n=>!n.deletedAt).map(n=>{
        const div = document.createElement('div'); div.innerHTML = n.html||'';
        const txt = (div.textContent||'').replace(/\s+/g,' ').trim();
        return { label: txt.slice(0,60)||'Nota', snippetSource: txt,
                 href:`app.html?page=notes&u=${USER}&note=${n.id}`, cat:'Notes' };
      });
    }catch(e){ return []; }
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
      editLbl:'Edit', noCover:'No cover',
      /* --- v4: shell do editor estilo GoodNotes --- */
      pgAddBefore:'Before', pgAddAfter:'After', pgAddLast:'Last page',
      recentModels:'Recent templates',
      recentModelsHint:'Templates shown here inherit the attributes of the current page whenever possible.',
      currentModel:'Current template', moreModels:'More templates…',
      imageOpt:'Image', takePhoto:'Take photo',
      searchDocTip:'Search in document', searchTitle:'Search',
      tabNotesS:'Notes', tabOutline:'Outline',
      searchEmptyT:'Find everything you need',
      searchEmptyD:'Search typed and handwritten notes, and document and folder names.',
      noResults:'No results.',
      readOnly:'Read-only', editModeTip:'Edit mode', readModeTip:'Reading mode',
      pageN:'Page {n}',
      addFav:'Add to favorites', rmFav:'Remove from favorites',
      copyPage:'Copy page', rotatePage:'Rotate page', rotCW:'Clockwise', rotCCW:'Counterclockwise',
      changeModel:'Change template', goToPage:'Go to page',
      clearOrDelete:'CLEAR OR DELETE PAGE', trashPage:'Move page to trash',
      confirmTrashPage:'Move this page to the trash? This deletes the page.',
      shareExport:'Share and export', exportSec:'Export',
      exportThisPage:'Export this page', exportAll:'Export all',
      renameBook:'Rename notebook', pagesLbl:'Pages',
      /* --- v5: ferramentas do editor (Fase 3) --- */
      lassoTitle:'Lasso tool', lassoRect:'Rectangular', lassoFree:'Freehand',
      textTool:'Text', imageTool:'Image', stickyTool:'Sticky note', laserTool:'Laser pointer',
      penColorTitle:'Pen color', markerColorTitle:'Highlighter color', presetsLbl:'Presets',
      styleFountain:'Fountain pen', styleBall:'Ballpoint', styleBrush:'Brush',
      eraserStandard:'Standard', eraserStroke:'Whole stroke', eraserSettings:'Eraser settings',
      eraserOnlyMarker:'Erase highlighter only',
      laserPoint:'Point', laserLine:'Line',
      spacingLbl:'Spacing', boxBorder:'Text box border',
      favStyleTip:'Favorite style', favApply:'Apply favorite style', favSave:'Save current style as favorite', favSaved:'Style saved!',
      pinText:'Pin text tool', stickyHint:'Tap the page to add a sticky note.',
      delSel:'Delete selection',
      /* --- v6: app Notes (clone do Apple Notes, Fase 5) --- */
      anICloud:'iCloud', anNotes:'Notes', anDeleted:'Recently Deleted',
      anNewFolderBtn:'New Folder', anFolderName:'Name',
      anSmartChk:'Make into Smart Folder', anSmartTags:'Tags (comma separated)',
      anRenameFolder:'Rename Folder', anDelFolder:'Delete Folder',
      anConfirmDelFolder:'Delete this folder? Its notes go back to Notes.',
      anPinned:'Pinned', anToday:'Today', anYesterday:'Yesterday',
      anLast7:'Previous 7 Days', anLast30:'Previous 30 Days',
      anNewNote:'New Note', anNoText:'No additional text', anEmpty:'No Notes',
      anNotesCount:'{n} notes', anNoteCount1:'1 note', anAt:'at',
      anViewGallery:'View as Gallery', anViewList:'View as List',
      anSortBy:'Sort By', anGroup:'Group By Date', anAuto:'Automatic', anOffLbl:'Off',
      anSortEdited:'Date Edited', anSortCreated:'Date Created', anSortTitle:'Title',
      anSeeAtt:'View Attachments',
      anPin:'Pin Note', anUnpin:'Unpin Note', anFind:'Find in Note',
      anMoveTo:'Move To', anRecent:'Recent Notes', anCalc:'Calculation Results',
      anAttOfNote:'Attachments View', anDelNote:'Delete Note',
      anRestore:'Recover', anDelForever:'Delete Now',
      anConfirmDelForever:'Permanently delete this note?',
      anTrashHint:'Notes are permanently deleted after 30 days.',
      anSendCopy:'Send a Copy', anCopy:'Copy', anCopied:'Note copied!',
      anStyleTitle:'Title', anStyleHeading:'Heading', anStyleSub:'Subheading',
      anStyleBody:'Body', anStyleMono:'Monostyled', anStyleBullet:'Bulleted List',
      anStyleDash:'Dashed List', anStyleNum:'Numbered List', anStyleQuote:'Block Quote',
      anTable:'Table', anPhotoVideo:'Choose Photo or Video', anRecAudio:'Record Audio',
      anRecording:'Recording… click the clip again to stop.', anRecFail:'Microphone unavailable.',
      anAttachFile:'Attach File', anSearchPh:'Search',
      anNoCalc:'No calculations in this note.', anNoAtt:'No attachments.'
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
      editLbl:'Editar', noCover:'Sem capa',
      /* --- v4: shell do editor estilo GoodNotes --- */
      pgAddBefore:'Antes', pgAddAfter:'Depois', pgAddLast:'Última página',
      recentModels:'Modelos recentes',
      recentModelsHint:'Os modelos mostrados aqui herdam os atributos da página atual sempre que possível.',
      currentModel:'Modelo atual', moreModels:'Mais de Modelos…',
      imageOpt:'Imagem', takePhoto:'Tirar fotografia',
      searchDocTip:'Pesquisar no documento', searchTitle:'Pesquisar',
      tabNotesS:'Notas', tabOutline:'Esquemas',
      searchEmptyT:'Descubra tudo o que precisa',
      searchEmptyD:'Pesquisar apontamentos digitados e escritos à mão, e nomes de documentos e pastas.',
      noResults:'Sem resultados.',
      readOnly:'Apenas leitura', editModeTip:'Modo de edição', readModeTip:'Modo de leitura',
      pageN:'Página {n}',
      addFav:'Adicionar a favoritos', rmFav:'Remover dos favoritos',
      copyPage:'Copiar página', rotatePage:'Rodar página', rotCW:'Sentido horário', rotCCW:'Sentido anti-horário',
      changeModel:'Alterar modelo', goToPage:'Ir para a página',
      clearOrDelete:'LIMPAR OU APAGAR PÁGINA', trashPage:'Mover a página para o lixo',
      confirmTrashPage:'Mover esta página para o lixo? Isso exclui a página.',
      shareExport:'Partilhar e exportar', exportSec:'Exportar',
      exportThisPage:'Exportar esta página', exportAll:'Exportar tudo',
      renameBook:'Renomear caderno', pagesLbl:'Páginas',
      /* --- v5: ferramentas do editor (Fase 3) --- */
      lassoTitle:'Ferramenta de laço', lassoRect:'Retangular', lassoFree:'Mão livre',
      textTool:'Texto', imageTool:'Imagem', stickyTool:'Nota adesiva', laserTool:'Ponteiro laser',
      penColorTitle:'Cor da caneta', markerColorTitle:'Cor do marcador', presetsLbl:'Predefinições',
      styleFountain:'Caneta-tinteiro', styleBall:'Esferográfica', styleBrush:'Pincel',
      eraserStandard:'Padrão', eraserStroke:'Traço inteiro', eraserSettings:'Ajustes da borracha',
      eraserOnlyMarker:'Apagar apenas marca-texto',
      laserPoint:'Ponto', laserLine:'Linha',
      spacingLbl:'Espaçamento', boxBorder:'Borda da caixa de texto',
      favStyleTip:'Estilo favorito', favApply:'Aplicar estilo favorito', favSave:'Guardar estilo atual como favorito', favSaved:'Estilo guardado!',
      pinText:'Afixar ferramenta de texto', stickyHint:'Toque na página para adicionar a nota adesiva.',
      delSel:'Apagar seleção',
      /* --- v6: app Notes (clone do Apple Notes, Fase 5) --- */
      anICloud:'iCloud', anNotes:'Notas', anDeleted:'Apagadas',
      anNewFolderBtn:'Nova Pasta', anFolderName:'Nome',
      anSmartChk:'Transformar em Pasta Inteligente', anSmartTags:'Etiquetas (separadas por vírgula)',
      anRenameFolder:'Renomear Pasta', anDelFolder:'Apagar Pasta',
      anConfirmDelFolder:'Apagar esta pasta? As notas dela voltam para Notas.',
      anPinned:'Fixadas', anToday:'Hoje', anYesterday:'Ontem',
      anLast7:'Últimos 7 Dias', anLast30:'Últimos 30 Dias',
      anNewNote:'Nova Nota', anNoText:'Sem texto adicional', anEmpty:'Nenhuma Nota',
      anNotesCount:'{n} notas', anNoteCount1:'1 nota', anAt:'às',
      anViewGallery:'Ver como Galeria', anViewList:'Ver como Lista',
      anSortBy:'Ordenar por', anGroup:'Agrupar por Data', anAuto:'Automático', anOffLbl:'Desativado',
      anSortEdited:'Data de Edição', anSortCreated:'Data de Criação', anSortTitle:'Título',
      anSeeAtt:'Ver Anexos',
      anPin:'Fixar Nota', anUnpin:'Desafixar Nota', anFind:'Buscar na Nota',
      anMoveTo:'Mover para', anRecent:'Notas Recentes', anCalc:'Resultados de Cálculos',
      anAttOfNote:'Visualização dos Anexos', anDelNote:'Apagar Nota',
      anRestore:'Recuperar', anDelForever:'Apagar Agora',
      anConfirmDelForever:'Apagar esta nota em definitivo?',
      anTrashHint:'As notas são apagadas em definitivo após 30 dias.',
      anSendCopy:'Enviar Cópia', anCopy:'Copiar', anCopied:'Nota copiada!',
      anStyleTitle:'Título', anStyleHeading:'Cabeçalho', anStyleSub:'Subtítulo',
      anStyleBody:'Corpo', anStyleMono:'Estilo Fixo', anStyleBullet:'Lista de Marcadores',
      anStyleDash:'Lista com Travessões', anStyleNum:'Lista Numerada', anStyleQuote:'Citação em Bloco',
      anTable:'Tabela', anPhotoVideo:'Escolher Foto ou Vídeo', anRecAudio:'Gravar Áudio',
      anRecording:'Gravando… clique no clipe de novo para parar.', anRecFail:'Microfone indisponível.',
      anAttachFile:'Anexar Arquivo', anSearchPh:'Buscar',
      anNoCalc:'Nenhum cálculo nesta nota.', anNoAtt:'Nenhum anexo.'
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
  /* ---------- v5: constantes das ferramentas GoodNotes (Fase 3) ---------- */
  // popover "Cor da caneta": 3 fileiras (vivas / escuras / neutras)
  const GN_PEN_ROWS = [
    ['#ff3b30','#ff9500','#ffcc00','#34c759','#00c7be','#32ade6','#007aff','#5856d6','#af52de','#ff2d55'],
    ['#1d1d1f','#48484a','#7a0619','#8a3800','#6b5500','#0e5a2b','#0b3d6b','#2c2a6b','#5b1e63','#5c4033'],
    ['#ffffff','#f2f2f7','#d1d1d6','#aeaeb2','#8e8e93','#636366','#48484a','#2c2c2e','#c9b9a0','#8d7350']
  ];
  // popover "Cor do marcador": pastéis (2 fileiras)
  const GN_MARKER_ROWS = [
    ['#fff59d','#ffe082','#ffcc80','#ffab91','#f8bbd0','#e1bee7','#d1c4e9','#c5cae9','#bbdefb','#b2ebf2'],
    ['#b2dfdb','#c8e6c9','#dcedc8','#f0f4c3','#ffd9e1','#ffe5b4','#d7ccc8','#cfd8dc','#e0f7fa','#f5f5f5']
  ];
  // nota adesiva: 10 cores exatas (rosa-averm., laranja, amarelo, verde, verde-água,
  // azul, lilás, rosa, cinza | branco)
  const GN_STICKY_COLORS = ['#f6a099','#fbc57c','#f9e08c','#c3e79a','#9fe3cf','#a5d4f6','#c8b6f2','#f4b6d9','#c9ccd2','#ffffff'];
  const GN_ERASER_SIZES = [10,18,32];
  const GN_PEN_STYLES = [
    {id:'fountain', k:'styleFountain', ico:'✒'},
    {id:'ball',     k:'styleBall',     ico:'🖊'},
    {id:'brush',    k:'styleBrush',    ico:'🖌'}
  ];
  /* preferências das ferramentas persistem entre sessões (como no GoodNotes) */
  const TOOLS_KEY = 'couplemed_nb_tools';
  const GN_TOOL_DEFAULTS = {
    tool:'text', penStyle:'fountain', penWidth:4, penSlots:['#182233','#2768ff','#e5484d'], penSlot:0, penPresets:[],
    markerWidth:22, markerSlots:['#fff176','#b9f6ca','#a8d8ff'], markerSlot:0, markerPresets:[],
    eraserMode:'standard', eraserWidth:18, eraserOnlyMarker:false,
    lassoMode:'rect', stickyColor:'#f9e08c', laserMode:'point',
    textPinned:false, favStyle:null, textColor:'#182233', textHilite:'#fff176'
  };
  let gnT = (function(){
    try{ const o = JSON.parse(localStorage.getItem(TOOLS_KEY)); if(o && typeof o==='object') return Object.assign({}, GN_TOOL_DEFAULTS, o); }catch(e){}
    return Object.assign({}, GN_TOOL_DEFAULTS);
  })();
  const saveTools = ()=>{ try{ localStorage.setItem(TOOLS_KEY, JSON.stringify(gnT)); }catch(e){} };
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
    if(PAGE==='notes') renderNotesApp();          // v6: app estilo Apple Notes
    else if(view.name==='folders') renderFolders();
    else if(view.name==='folder') renderFolder();
    else if(view.name==='notebook') renderNotebook();
    else { view = { name:'folders' }; renderFolders(); } // rotas legadas (note/allnotes/favorites)
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
    const n = (Array.isArray(b.pages)?b.pages.length:0) || 1;
    return `<button class="nb-book" data-open="${b.id}">
      <span class="nb-item-menu" data-menu="${b.id}" role="button" tabindex="0" aria-label="menu">⋯</span>
      ${bookCoverHtml(b)}
      <span class="nb-book-body"><strong>${cmSpan(b.title)}</strong><small>${n} ${t('pages').toLowerCase()}</small></span>
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

  /* ================================================================
     v4 — CADERNO = EDITOR DE PÁGINAS (GoodNotes). Abrir o caderno cai
     direto nas páginas: barra superior azul (home, nome ⌄, painel de
     páginas, busca no documento, modo leitura), adicionar página,
     partilhar/exportar e menu ⋯ da página.
     ================================================================ */
  const bookPages = nb => { if(!Array.isArray(nb.pages)||!nb.pages.length) nb.pages=[{id:uid(),html:'',strokes:[]}]; return nb.pages; };
  const objsOf = pg => { if(!Array.isArray(pg.objs)) pg.objs = []; return pg.objs; };
  const pageObjsText = pg => (Array.isArray(pg.objs)?pg.objs:[]).filter(o=>o.type==='sticky'&&o.text).map(o=>o.text).join(' ');
  /* objetos (imagens/post-its) nas miniaturas do painel de páginas */
  const thumbObjsHtml = p => (Array.isArray(p.objs)&&p.objs.length ? `<span class="nb-pthumb-objs">${p.objs.map(o=> o.type==='img'
      ? `<img src="${esc(o.src)}" style="left:${+o.x||0}%;top:${+o.y||0}%;width:${+o.w||10}%">`
      : `<i style="left:${+o.x||0}%;top:${+o.y||0}%;width:${+o.w||10}%;height:${+o.h||8}%;background:${esc(o.color)}"></i>`).join('')}</span>` : '');
  /* apaga do R2 as imagens da página (corpo + objetos) — melhor esforço */
  function deletePageAssets(pg){
    deleteRemoteImages(pg.html);
    (Array.isArray(pg.objs)?pg.objs:[]).forEach(o=>{
      if(o.type==='img' && (o.src||'').startsWith('/api/notebook/img/')){ try{ fetch(o.src, {method:'DELETE'}); }catch(e){} }
    });
  }
  const pagePaperOf = (book,p)=> p.paper || book.paper || 'blank';
  const pageBgOf2 = (book,p)=> p.bg || book.bg || 'white';
  function pageClass(book,p,extra){
    const paper = pagePaperOf(book,p), bg = pageBgOf2(book,p);
    return `nb-page nb-bg-${esc(bg)} ${paper&&paper!=='blank'&&paper!=='custom'?'nb-paper-'+esc(paper):''} ${book.orientation==='landscape'?'nb-o-landscape':''} ${extra||''}`;
  }
  function pageStyleAttr(book,p){
    const paper = pagePaperOf(book,p);
    return paper==='custom'&&book.customPaper?`style="background-image:url('${esc(book.customPaper)}');background-size:100% auto;background-repeat:repeat-y"`:'';
  }
  function paperNameOf(pid){
    if(pid==='custom') return t('pImported');
    const p = GN_PAPERS.find(x=>x.id===(GN_PAPER_ALIAS[pid]||pid));
    return p?t(p.k):t('pBlank');
  }
  function stampRecentTpl(paper,bg){
    DB.recentTpls = (DB.recentTpls||[]).filter(x=>!(x.paper===paper&&x.bg===bg));
    DB.recentTpls.unshift({paper,bg});
    DB.recentTpls = DB.recentTpls.slice(0,2);
  }

  function renderNotebook(){
    const book = bookById(view.nbId);
    if(!book){ view = { name:'folders' }; return render(); }
    const pages = bookPages(book);
    if(view.page==null||view.page<0) view.page=0;
    if(view.page>pages.length-1) view.page=pages.length-1;
    const pg = pages[view.page];
    const reading = !!view.reading;
    const tool = gnT.tool;
    const inking = !reading && ['pen','marker','eraser','lasso','laser'].includes(tool);
    const toolCls = reading ? '' : (inking ? 'nb-drawmode nb-tool-ink' : 'nb-tool-'+tool);
    if(view.panel===undefined) view.panel = window.innerWidth>1024;

    root.innerHTML = `
      <div class="nb-gnshell">
        <div class="nb-gnbar">
          <button class="nb-gnicon" id="nbHomeBtn" title="${t('home')}">⌂</button>
          <button class="nb-gntab" id="nbBookTab" title="${t('renameBook')}">${book.icon?esc(book.icon)+' ':''}${esc(book.title||t('nbUntitledPh'))} <b>⌄</b></button>
          <span class="nb-gnbar-sep"></span>
          <button class="nb-gnicon ${view.panel?'nb-on':''}" id="nbPanelBtn" title="${t('pagesLbl')}">▤</button>
          <button class="nb-gnicon" id="nbSearchBtn" title="${t('searchDocTip')}">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
          <button class="nb-gnicon ${reading?'nb-on':''}" id="nbReadTgl" title="${reading?t('editModeTip'):t('readModeTip')}">${reading?'✎':'👁'}</button>
          ${reading?`<span class="nb-gnro">${t('readOnly')}</span>`:''}
          <span class="nb-gnflex"></span>
          <span class="nb-savestate nb-gnsave" id="nbSaveState">${t('saved')}</span>
          <button class="nb-gnicon" id="nbAddPgBtn" title="${t('addPage')}">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M7 3h7l4 4v14H7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3v4h4M4 8v13h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.5 13.5h5M13 11v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
          <button class="nb-gnicon" id="nbShareBtn" title="${t('shareExport')}">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M12 15V4M12 4l-4 4M12 4l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 12v8h14v-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="nb-gnicon" id="nbPgMoreBtn" title="⋯">⋯</button>
        </div>
        ${reading?'':gnToolbar()}
        <div class="nb-gnmain">
          <aside class="nb-pgpanel" id="nbPgPanel" ${view.panel?'':'hidden'}>
            ${pages.map((p,i)=>`
              <button class="nb-pthumb ${i===view.page?'nb-on':''}" data-goto="${i}">
                <span class="${pageClass(book,p,'nb-pthumb-page')}" ${pageStyleAttr(book,p)}>
                  <span class="nb-pthumb-body">${p.html||''}</span>
                  ${thumbObjsHtml(p)}
                  <canvas class="nb-pthumb-ink" data-inkthumb="${i}"></canvas>
                </span>
                <em>${p.fav?'★ ':''}${i+1}</em>
              </button>`).join('')}
            <button class="nb-pthumb nb-pthumb-add" id="nbThumbAdd" title="${t('addPage')}">＋</button>
          </aside>
          <div class="nb-pgarea">
            <button class="nb-pgnav" id="nbPgPrev" ${view.page===0?'disabled':''} title="${t('prevPage')}">‹</button>
            <div class="nb-page-wrap nb-pgwrap">
              <div class="${pageClass(book,pg,toolCls)}" ${pageStyleAttr(book,pg)} id="nbPage">
                <div class="nb-page-text" id="nbEditor" contenteditable="${(!reading&&tool==='text')?'true':'false'}" data-ph="${(reading||tool!=='text')?'':t('notePh')}"></div>
                <div class="nb-objlayer" id="nbObjLayer"></div>
                <canvas class="nb-page-draw" id="nbCanvas"></canvas>
              </div>
              <div class="nb-pgcount">${t('pageOf',{n:view.page+1,total:pages.length})}</div>
            </div>
            <button class="nb-pgnav" id="nbPgNext" ${view.page===pages.length-1?'disabled':''} title="${t('nextPage')}">›</button>
          </div>
        </div>
      </div>`;

    const editor = root.querySelector('#nbEditor');
    editor.innerHTML = pg.html || '';

    // miniaturas de tinta no painel de páginas
    pages.forEach((p,i)=>{
      if(!(p.strokes&&p.strokes.length)) return;
      const cv = root.querySelector(`[data-inkthumb="${i}"]`); if(!cv) return;
      const ori = book.orientation==='landscape'?'landscape':'portrait';
      cv.width = Math.round(CANVAS_W[ori]/6); cv.height = Math.round(CANVAS_H[ori]/6);
      const ctx = cv.getContext('2d'); if(!ctx) return;
      ctx.scale(1/6, 1/6);
      p.strokes.forEach(s=>drawStroke(ctx, s));
    });

    const goto = i=>{ flushPage(book, editor, pg); view.page = Math.max(0, Math.min(i, pages.length-1)); syncUrl(); render(); };
    root.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click', ()=>goto(+b.dataset.goto)));
    root.querySelector('#nbPgPrev').addEventListener('click', ()=>{ if(view.page>0) goto(view.page-1); });
    root.querySelector('#nbPgNext').addEventListener('click', ()=>{ if(view.page<pages.length-1) goto(view.page+1); });
    root.querySelector('#nbThumbAdd').addEventListener('click', ()=>{ flushPage(book, editor, pg); insertPageAt(book,'last',{}); });

    root.querySelector('#nbHomeBtn').addEventListener('click', ()=>{
      flushPage(book, editor, pg);
      view = book.folderId ? {name:'folder', folderId:book.folderId} : {name:'folders'};
      syncUrl(); render();
    });
    root.querySelector('#nbBookTab').addEventListener('click', e=>{
      const pop = openPopover(e.currentTarget, `
        <div class="nb-renpop">
          <input id="nbRenInp" maxlength="80" value="${esc(book.title||'')}" placeholder="${t('nbUntitledPh')}">
          <button class="nb-btn nb-btn-primary" id="nbRenOk">${t('saveBtn')}</button>
        </div>`);
      const inp = pop.querySelector('#nbRenInp'); inp.focus(); inp.select();
      const doIt = ()=>{ book.title = inp.value.trim()||t('nbUntitledPh'); book.updated=Date.now(); save(); closePopover(); render(); };
      pop.querySelector('#nbRenOk').addEventListener('click', doIt);
      inp.addEventListener('keydown', ev=>{ if(ev.key==='Enter') doIt(); });
    });
    root.querySelector('#nbPanelBtn').addEventListener('click', ()=>{ flushPage(book, editor, pg); view.panel=!view.panel; render(); });
    root.querySelector('#nbReadTgl').addEventListener('click', ()=>{ flushPage(book, editor, pg); view.reading=!reading; render(); });
    root.querySelector('#nbSearchBtn').addEventListener('click', ()=>{ flushPage(book, editor, pg); openDocSearch(book); });
    root.querySelector('#nbAddPgBtn').addEventListener('click', e=>{ flushPage(book, editor, pg); openAddPage(e.currentTarget, book, pg); });
    root.querySelector('#nbShareBtn').addEventListener('click', e=>{ flushPage(book, editor, pg); openSharePop(e.currentTarget, book, pg); });
    root.querySelector('#nbPgMoreBtn').addEventListener('click', e=>{ flushPage(book, editor, pg); openPageMenu(e.currentTarget, book, pg); });

    renderObjLayer(book, pg, !reading);   // imagens móveis + notas adesivas
    setupInk(book, pg, inking, tool);     // sempre redesenha os traços (inclusive no modo leitura)
    if(reading) return;

    gnWireShortcuts(book, editor, pg);    // atalhos V/P/E/I/N/L (só desktop)
    wireGnToolbar(book, editor, pg);
    if(tool==='text') wireTextCore(book, editor, pg);
  }

  /* --- editor de texto (núcleo: input/save/checklist/colar/arrastar) —
     os comandos de formatação vivem na sub-barra da ferramenta Texto (v5) --- */
  function wireTextCore(book, editor, curPage){
    const scheduleSave = ()=>{
      markSaving(); clearTimeout(saveTimer);
      saveTimer = setTimeout(()=>{ curPage.html = editor.innerHTML; book.updated = Date.now(); save(); }, 500);
    };
    try{ document.execCommand('styleWithCSS', false, true); }catch(e){}
    try{ document.execCommand('defaultParagraphSeparator', false, 'p'); }catch(e){}
    editor.addEventListener('input', scheduleSave);
    editor.addEventListener('blur', ()=>flushPage(book, editor, curPage));
    editor.addEventListener('click', e=>{
      const li = e.target.closest('li.nb-check-item');
      if(li && e.offsetX < 26){ li.classList.toggle('nb-checked'); scheduleSave(); }
    });
    const insertImg = url => { editor.focus(); document.execCommand('insertImage', false, url); scheduleSave(); };
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

  /* --- inserir página (Antes/Depois/Última + modelos + imagem/foto/importar) --- */
  function insertPageAt(book, where, opts){
    const pages = bookPages(book);
    const np = { id:uid(), html:opts.html||'', strokes:[] };
    if(opts.paper){ np.paper = opts.paper; np.bg = opts.bg; stampRecentTpl(opts.paper, opts.bg); }
    let idx;
    if(where==='before') idx = view.page;
    else if(where==='last') idx = pages.length;
    else idx = view.page+1;
    pages.splice(idx, 0, np);
    view.page = idx;
    book.updated = Date.now(); save(); syncUrl(); render();
  }
  function openAddPage(anchor, book, curPg){
    let where = 'after';
    const curTpl = { paper: pagePaperOf(book,curPg), bg: pageBgOf2(book,curPg) };
    const recents = (DB.recentTpls||[]).filter(x=>!(x.paper===curTpl.paper&&x.bg===curTpl.bg)).slice(0,2);
    const tplTh = (tpl,label,key) => `
      <button class="nb-addpg-tpl" data-tpl="${key}">
        <span class="nb-gnb-paperth ${tpl.paper==='custom'?'':paperThumbClass(tpl.paper)}" style="background-color:${paperColorHex(tpl.bg)};${tpl.paper==='custom'&&book.customPaper?`background-image:url('${esc(book.customPaper)}');background-size:cover;`:''}"></span>
        <em>${label}</em>
      </button>`;
    const pop = openPopover(anchor, `
      <div class="nb-addpg">
        <strong class="nb-pop-title">${t('addPage')}</strong>
        <div class="nb-seg nb-addpg-seg">
          <button data-wh="before">${t('pgAddBefore')}</button>
          <button data-wh="after" class="nb-on">${t('pgAddAfter')}</button>
          <button data-wh="last">${t('pgAddLast')}</button>
        </div>
        <h6>${t('recentModels')}</h6>
        <p class="nb-addpg-hint">${t('recentModelsHint')}</p>
        <div class="nb-addpg-tpls">
          ${tplTh(curTpl, t('currentModel'), 'cur')}
          ${recents.map((r,i)=>tplTh(r, paperNameOf(r.paper), 'r'+i)).join('')}
        </div>
        <div class="nb-pop-list nb-addpg-list">
          <button data-ap="more">📄 ${t('moreModels')}</button>
          <button data-ap="img">🖼 ${t('imageOpt')}</button>
          <button data-ap="photo">📷 ${t('takePhoto')}</button>
          <button data-ap="import">⤓ ${t('importLbl')}</button>
        </div>
        <input type="file" accept="image/*" id="nbApImg" hidden>
        <input type="file" accept="image/*" capture="environment" id="nbApPhoto" hidden>
      </div>`, {cls:'nb-pop-addpg'});
    pop.querySelectorAll('[data-wh]').forEach(b=>b.addEventListener('click', ()=>{
      where = b.dataset.wh;
      pop.querySelectorAll('[data-wh]').forEach(x=>x.classList.toggle('nb-on', x===b));
    }));
    const add = (tpl, html)=>{ closePopover(); insertPageAt(book, where, { paper:tpl?tpl.paper:undefined, bg:tpl?tpl.bg:undefined, html:html||'' }); };
    pop.querySelector('[data-tpl="cur"]').addEventListener('click', ()=>add(curTpl));
    recents.forEach((r,i)=>{ pop.querySelector(`[data-tpl="r${i}"]`).addEventListener('click', ()=>add(r)); });
    pop.querySelector('[data-ap="more"]').addEventListener('click', ()=>{
      openTplChooser(anchor, curTpl, tpl=>insertPageAt(book, where, {paper:tpl.paper, bg:tpl.bg}));
    });
    const fileAdd = async inp => { const f=inp.files[0]; if(!f) return; const url=await uploadImage(f); if(url) add(curTpl, `<img src="${esc(url)}">`); inp.value=''; };
    pop.querySelector('[data-ap="img"]').addEventListener('click', ()=>pop.querySelector('#nbApImg').click());
    pop.querySelector('#nbApImg').addEventListener('change', e=>fileAdd(e.target));
    pop.querySelector('[data-ap="photo"]').addEventListener('click', ()=>pop.querySelector('#nbApPhoto').click());
    pop.querySelector('#nbApPhoto').addEventListener('change', e=>fileAdd(e.target));
    pop.querySelector('[data-ap="import"]').addEventListener('click', ()=>pop.querySelector('#nbApImg').click());
  }
  /* escolhedor de modelo de papel (Mais de Modelos… / Alterar modelo) */
  function openTplChooser(anchor, curTpl, cb){
    let bg = curTpl.bg;
    const pop = openPopover(anchor, `
      <div class="nb-tplchooser">
        <strong class="nb-pop-title">${t('paperModelsTitle')}</strong>
        <div class="nb-gnb-dots" style="justify-content:center;margin-bottom:10px">
          ${GN_PAPER_COLORS.map(c=>`<button class="nb-gnb-minidot ${bg===c.id?'nb-on':''}" data-tc="${c.id}" title="${t(c.k)}" style="background:${c.c}"></button>`).join('')}
        </div>
        <div class="nb-tpl-grid">
          ${GN_PAPERS.map(p=>`<button class="nb-addpg-tpl" data-tp="${p.id}">
            <span class="nb-gnb-paperth ${p.th}" data-tpth style="background-color:${paperColorHex(bg)}"></span><em>${t(p.k)}</em>
          </button>`).join('')}
        </div>
      </div>`, {cls:'nb-pop-addpg'});
    pop.querySelectorAll('[data-tc]').forEach(b=>b.addEventListener('click', ()=>{
      bg = b.dataset.tc;
      pop.querySelectorAll('[data-tc]').forEach(x=>x.classList.toggle('nb-on', x===b));
      pop.querySelectorAll('[data-tpth]').forEach(x=>x.style.backgroundColor = paperColorHex(bg));
    }));
    pop.querySelectorAll('[data-tp]').forEach(b=>b.addEventListener('click', ()=>{ closePopover(); cb({paper:b.dataset.tp, bg}); }));
  }

  /* --- menu ⋯ da página --- */
  function openPageMenu(anchor, book, pg){
    const pages = bookPages(book);
    const pop = openPopover(anchor, `
      <div class="nb-pgmenu">
        <div class="nb-pgmenu-head">
          <strong>${t('pageN',{n:view.page+1})}</strong>
          <span class="${pageClass(book,pg,'nb-pgmenu-mini')}" ${pageStyleAttr(book,pg)}></span>
        </div>
        <div class="nb-pop-list">
          <button data-pm="fav">🔖 ${pg.fav?t('rmFav'):t('addFav')}</button>
          <button data-pm="copy">⧉ ${t('copyPage')}</button>
          <button data-pm="rotcw">↻ ${t('rotatePage')} · ${t('rotCW')}</button>
          <button data-pm="rotccw">↺ ${t('rotatePage')} · ${t('rotCCW')}</button>
          <button data-pm="model">🎨 ${t('changeModel')}</button>
          <button data-pm="goto">→ ${t('goToPage')} <span class="nb-pgmenu-range">(1 – ${pages.length})</span></button>
        </div>
        <div class="nb-pgmenu-caps">${t('clearOrDelete')}</div>
        <div class="nb-pop-list">
          <button data-pm="clear" class="nb-pm-danger">⌫ ${t('clearPage')}</button>
          <button data-pm="trash" class="nb-pm-danger">🗑 ${t('trashPage')}</button>
        </div>
      </div>`, {cls:'nb-pop-pgmenu'});
    pop.querySelectorAll('[data-pm]').forEach(b=>b.addEventListener('click', ()=>{
      const act = b.dataset.pm;
      if(act==='fav'){ pg.fav = !pg.fav; book.updated=Date.now(); save(); closePopover(); render(); }
      else if(act==='copy'){
        const clone = JSON.parse(JSON.stringify(pg)); clone.id = uid();
        pages.splice(view.page+1, 0, clone); view.page++;
        book.updated=Date.now(); save(); closePopover(); render();
      }
      else if(act==='rotcw'||act==='rotccw'){ rotatePageStrokes(book, pg, act==='rotcw'); closePopover(); render(); }
      else if(act==='model'){
        openTplChooser(anchor, {paper:pagePaperOf(book,pg), bg:pageBgOf2(book,pg)}, tpl=>{
          pg.paper = tpl.paper; pg.bg = tpl.bg; book.updated=Date.now(); save(); render();
        });
      }
      else if(act==='goto') openGotoPop(anchor, book);
      else if(act==='clear'){
        deletePageAssets(pg);
        pg.html=''; pg.strokes=[]; pg.objs=[]; book.updated=Date.now(); save(); closePopover(); render();
      }
      else if(act==='trash'){
        if(!confirm(t('confirmTrashPage'))) return;
        deletePageAssets(pg);
        pages.splice(view.page, 1);
        if(!pages.length) pages.push({id:uid(), html:'', strokes:[]});
        if(view.page>pages.length-1) view.page = pages.length-1;
        book.updated=Date.now(); save(); closePopover(); render();
      }
    }));
  }
  function openGotoPop(anchor, book){
    const pages = bookPages(book);
    const pop = openPopover(anchor, `<div class="nb-renpop">
      <input id="nbGotoInp" type="number" min="1" max="${pages.length}" value="${view.page+1}">
      <button class="nb-btn nb-btn-primary" id="nbGotoOk">${t('goToPage')}</button></div>`);
    const inp = pop.querySelector('#nbGotoInp'); inp.focus(); inp.select();
    const go = ()=>{ const v = Math.max(1, Math.min(pages.length, parseInt(inp.value||'1',10)||1))-1; closePopover(); view.page=v; syncUrl(); render(); };
    pop.querySelector('#nbGotoOk').addEventListener('click', go);
    inp.addEventListener('keydown', e=>{ if(e.key==='Enter') go(); });
  }
  /* rotação: gira os traços vetoriais 90° dentro da mesma página */
  function rotatePageStrokes(book, pg, cw){
    const ori = book.orientation==='landscape'?'landscape':'portrait';
    const W = CANVAS_W[ori], H = CANVAS_H[ori];
    (pg.strokes||[]).forEach(s=>{
      for(let i=0;i<s.p.length;i+=2){
        const u = s.p[i]/W, v = s.p[i+1]/H;
        const nu = cw ? (1-v) : v, nv = cw ? u : (1-u);
        s.p[i] = Math.round(nu*W); s.p[i+1] = Math.round(nv*H);
      }
    });
    book.updated = Date.now(); save();
  }

  /* --- partilhar e exportar (só a seção Exportar, sem Colaboração) --- */
  function openSharePop(anchor, book, pg){
    const pop = openPopover(anchor, `
      <div class="nb-sharepop">
        <strong class="nb-pop-title">${t('shareExport')}</strong>
        <div class="nb-pgmenu-caps">${t('exportSec')}</div>
        <div class="nb-pop-list">
          <button data-sh="page">⇱ ${t('exportThisPage')}</button>
          <button data-sh="all">⇧ ${t('exportAll')}</button>
          <button data-sh="print">🖨 ${t('exportPrint')}</button>
        </div>
      </div>`);
    pop.querySelectorAll('[data-sh]').forEach(b=>b.addEventListener('click', ()=>{
      const act = b.dataset.sh; closePopover();
      if(act==='page') exportBookPages(book, [pg]);
      else exportBookPages(book, bookPages(book));
    }));
  }
  function exportBookPages(book, pages){
    const pagesHtml = pages.map(p=>{
      let canvasImg = '';
      if(p.strokes && p.strokes.length){
        const ori = book.orientation==='landscape'?'landscape':'portrait';
        const cv = document.createElement('canvas'); cv.width=CANVAS_W[ori]; cv.height=CANVAS_H[ori];
        const ctx = cv.getContext('2d');
        if(ctx){ p.strokes.forEach(s=>drawStroke(ctx,s)); try{ canvasImg = `<img class="ink" src="${cv.toDataURL('image/png')}" />`; }catch(e){} }
      }
      const objsHtml = (Array.isArray(p.objs)?p.objs:[]).map(o=> o.type==='img'
        ? `<img class="obj" src="${esc(o.src)}" style="left:${+o.x||0}%;top:${+o.y||0}%;width:${+o.w||10}%">`
        : `<div class="obj obj-sticky" style="left:${+o.x||0}%;top:${+o.y||0}%;width:${+o.w||10}%;height:${+o.h||8}%;background:${esc(o.color)}">${esc(o.text||'')}</div>`).join('');
      return `<section class="pg${book.orientation==='landscape'?' pg-l':''}">${canvasImg}${objsHtml}<div class="body">${p.html||''}</div></section>`;
    }).join('');
    const title = book.title||t('nbUntitledPh');
    const w = window.open('', '_blank');
    if(!w){ toast(t('storageFull'), true); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>@page{margin:16mm} body{font-family:'Helvetica Neue',Arial,sans-serif;color:#182233;line-height:1.6}
      h1,h2,h3{line-height:1.3} .pg{position:relative;page-break-after:always;padding-bottom:12px;aspect-ratio:1/1.35;overflow:hidden}
      .pg.pg-l{aspect-ratio:1.35/1}
      .pg:last-child{page-break-after:auto} .pg .ink{position:absolute;inset:0;width:100%;height:auto;pointer-events:none;z-index:3}
      .pg .obj{position:absolute;z-index:2}
      .pg .obj-sticky{border-radius:4px;padding:8px;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.2);white-space:pre-wrap;color:#26251f}
      img{max-width:100%} blockquote{border-left:3px solid #3d84ff;margin:10px 0;padding:4px 14px;color:#445}
      pre{background:#f4f6fa;padding:12px;border-radius:8px;overflow:auto} ul.nb-checklist{list-style:none;padding-left:4px}
      ul.nb-checklist li{position:relative;padding-left:26px} ul.nb-checklist li:before{content:'☐';position:absolute;left:0}
      ul.nb-checklist li.nb-checked:before{content:'☑'} ul.nb-checklist li.nb-checked{text-decoration:line-through;color:#889}</style>
      </head><body><h1>${esc(title)}</h1>${pagesHtml}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(()=>{ w.print(); }, 350);
  }

  /* --- busca no documento (painel Pesquisar, tabs Notas/Esquemas) --- */
  function openDocSearch(book){
    closePopover();
    const shell = root.querySelector('.nb-gnshell'); if(!shell) return;
    const old = shell.querySelector('#nbDocSearch');
    if(old){ old.remove(); return; }
    const panel = document.createElement('div');
    panel.className = 'nb-docsearch'; panel.id = 'nbDocSearch';
    panel.innerHTML = `
      <div class="nb-docsearch-head"><strong>${t('searchTitle')}</strong><button class="nb-gnicon nb-ds-close" id="nbDsClose">✕</button></div>
      <div class="nb-search nb-ds-input">
        <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input id="nbDsInp" placeholder="${t('searchTitle')}..." />
      </div>
      <div class="nb-seg nb-ds-seg">
        <button class="nb-on" data-dst="notes">${t('tabNotesS')}</button>
        <button data-dst="outline">${t('tabOutline')}</button>
      </div>
      <div class="nb-ds-results" id="nbDsRes"></div>`;
    shell.appendChild(panel);
    const res = panel.querySelector('#nbDsRes');
    const inp = panel.querySelector('#nbDsInp');
    let tab = 'notes';
    const emptyHtml = `<div class="nb-ds-empty"><span>🔎</span><strong>${t('searchEmptyT')}</strong><p>${t('searchEmptyD')}</p></div>`;
    const runSearch = ()=>{
      const q = inp.value.trim().toLowerCase();
      const pages = bookPages(book);
      if(tab==='outline'){
        const items = [];
        pages.forEach((p,i)=>{
          const d = document.createElement('div'); d.innerHTML = p.html||'';
          d.querySelectorAll('h1,h2,h3').forEach(h=>{
            const txt = (h.textContent||'').trim(); if(!txt) return;
            if(q && !txt.toLowerCase().includes(q)) return;
            items.push({ i, txt, lv:+h.tagName[1] });
          });
        });
        res.innerHTML = items.length
          ? items.map(x=>`<button class="nb-ds-item nb-ds-lv${x.lv}" data-dsgo="${x.i}"><em>${t('pageN',{n:x.i+1})}</em><span>${esc(x.txt)}</span></button>`).join('')
          : `<div class="nb-ds-empty"><span>🔎</span><p>${t('noResults')}</p></div>`;
      } else {
        if(!q){ res.innerHTML = emptyHtml; return; }
        const items = [];
        pages.forEach((p,i)=>{
          const txt = (stripHtml(p.html||'')+' '+pageObjsText(p)).replace(/\s+/g,' ').trim();
          const pos = txt.toLowerCase().indexOf(q);
          if(pos<0) return;
          const start = Math.max(0, pos-40);
          const snip = (start>0?'…':'') + txt.slice(start, pos+q.length+60) + '…';
          items.push({ i, snip });
        });
        res.innerHTML = items.length
          ? items.map(x=>`<button class="nb-ds-item" data-dsgo="${x.i}"><em>${t('pageN',{n:x.i+1})}</em><span>${esc(x.snip)}</span></button>`).join('')
          : `<div class="nb-ds-empty"><span>🔎</span><p>${t('noResults')}</p></div>`;
      }
      res.querySelectorAll('[data-dsgo]').forEach(b=>b.addEventListener('click', ()=>{
        view.page = +b.dataset.dsgo; syncUrl(); render();
      }));
    };
    res.innerHTML = emptyHtml;
    inp.addEventListener('input', runSearch);
    panel.querySelectorAll('[data-dst]').forEach(b=>b.addEventListener('click', ()=>{
      tab = b.dataset.dst;
      panel.querySelectorAll('[data-dst]').forEach(x=>x.classList.toggle('nb-on', x===b));
      runSearch();
    }));
    panel.querySelector('#nbDsClose').addEventListener('click', ()=>panel.remove());
    inp.focus();
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

  /* ================================================================
     v5 — FASE 3: barra de ferramentas do editor estilo GoodNotes.
     Ordem: Laço · Caneta · Marca-texto · Borracha · Texto · Imagem ·
     Nota adesiva · Ponteiro laser. FORA: figurinhas, formas, microfone.
     Preferências persistem em couplemed_nb_tools (gnT).
     ================================================================ */
  const gnIco = {
    lasso:'<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><ellipse cx="12" cy="10" rx="8" ry="6" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3 2.4"/><path d="M12 16v3a2 2 0 0 0 2 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    pen:'<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M4 20l1.2-4.2L16.6 4.4a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L8.2 18.8 4 20z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 6.5l3.5 3.5" stroke="currentColor" stroke-width="1.8"/></svg>',
    marker:'<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M5.5 20h13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".5"/><path d="M9.5 16.5L16 5.5l3 2.2-6.5 10-3.6 1.3 0.6-2.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    eraser:'<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M8.5 19l-4.2-4.2a2 2 0 0 1 0-2.8l7.5-7.5a2 2 0 0 1 2.8 0l4.9 4.9a2 2 0 0 1 0 2.8L13.4 19H8.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 10.5l6.5 6.5" stroke="currentColor" stroke-width="1.8"/></svg>',
    text:'<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M5 6V4h14v2M12 4v16m-3 0h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    image:'<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.6" fill="currentColor"/><path d="M6 17l4.5-4.5 3 3L17 12l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    sticky:'<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M4.5 5.5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1v9l-5 5h-9a1 1 0 0 1-1-1v-13z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M19.5 14.5H15a1 1 0 0 0-1 1v4.5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    laser:'<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><circle cx="12" cy="12" r="3.2" fill="currentColor"/><path d="M12 4v2.4M12 17.6V20M4 12h2.4M17.6 12H20M6.3 6.3L8 8M16 16l1.7 1.7M17.7 6.3L16 8M8 16l-1.7 1.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  function gnToolbar(){
    const tool = gnT.tool;
    const tools = [
      ['lasso',  t('lassoTitle'),   'V'],
      ['pen',    t('penTool'),      'P'],
      ['marker', t('highlighter'),  '' ],
      ['eraser', t('eraserTool'),   'E'],
      ['text',   t('textTool'),     '' ],
      ['image',  t('imageTool'),    'I'],
      ['sticky', t('stickyTool'),   'N'],
      ['laser',  t('laserTool'),    'L']
    ];
    return `
    <div class="nb-gntools" id="nbGnTools">
      <div class="nb-gt-row">
        ${tools.map(([id,tt,k])=>`<button class="nb-gt ${tool===id?'nb-on':''}" data-gt="${id}" title="${tt}${k?' ('+k+')':''}">${gnIco[id]}</button>`).join('')}
        <span class="nb-gnflex"></span>
        <button class="nb-gt" id="nbGnUndo" title="${t('tipUndo')}">↩</button>
        <button class="nb-gt" id="nbGnRedo" title="${t('tipRedo')}">↪</button>
      </div>
      ${gnSubbar(tool)}
      ${gnT.textPinned && tool!=='text' ? gnTextSub(true) : ''}
      <input type="file" id="nbGnImgFile" accept="image/*" hidden />
    </div>`;
  }

  function gnSubbar(tool){
    if(tool==='pen' || tool==='marker'){
      const isM = tool==='marker';
      const widths = isM ? MARKER_WIDTHS : PEN_WIDTHS;
      const curW = isM ? gnT.markerWidth : gnT.penWidth;
      const slots = isM ? gnT.markerSlots : gnT.penSlots;
      const slotIdx = isM ? gnT.markerSlot : gnT.penSlot;
      return `<div class="nb-gnsub">
        ${isM?'':`<div class="nb-gt-styles">${GN_PEN_STYLES.map(s=>`<button class="nb-gt-style ${gnT.penStyle===s.id?'nb-on':''}" data-pst="${s.id}" title="${t(s.k)}">${s.ico}</button>`).join('')}</div><span class="nb-tb-sep"></span>`}
        <div class="nb-width-group">${widths.map(w=>`<button class="nb-wbtn ${w.v===curW?'nb-on':''}" data-gw="${w.v}" title="${t(w.k)}"><span style="width:${Math.min(22,w.v+8)}px;height:${Math.max(2,Math.round(w.v/2))}px"></span></button>`).join('')}</div>
        <span class="nb-tb-sep"></span>
        <div class="nb-gt-slots">
          ${slots.map((c,i)=>`<button class="nb-gt-slot ${i===slotIdx?'nb-on':''}" data-slot="${i}" style="background:${esc(c)}"></button>`).join('')}
          <button class="nb-gt-slot nb-gt-slot-add" id="nbSlotAdd" title="${isM?t('markerColorTitle'):t('penColorTitle')}">＋</button>
        </div>
      </div>`;
    }
    if(tool==='eraser'){
      return `<div class="nb-gnsub">
        <select class="nb-tb-select nb-gt-esel" id="nbErMode">
          <option value="standard" ${gnT.eraserMode==='standard'?'selected':''}>${t('eraserStandard')}</option>
          <option value="stroke" ${gnT.eraserMode==='stroke'?'selected':''}>${t('eraserStroke')}</option>
        </select>
        <div class="nb-width-group">${GN_ERASER_SIZES.map(v=>`<button class="nb-wbtn ${v===gnT.eraserWidth?'nb-on':''}" data-gw="${v}"><span style="width:${Math.min(24,Math.round(v*0.7))}px;height:${Math.min(24,Math.round(v*0.7))}px;border-radius:50%"></span></button>`).join('')}</div>
        <button class="nb-gt" id="nbErCfg" title="${t('eraserSettings')}">⚙</button>
      </div>`;
    }
    if(tool==='sticky'){
      return `<div class="nb-gnsub">
        <div class="nb-gt-slots">${GN_STICKY_COLORS.map(c=>`<button class="nb-gt-slot ${gnT.stickyColor===c?'nb-on':''}" data-stc="${c}" style="background:${c}"></button>`).join('')}</div>
        <span class="nb-gt-hint">${t('stickyHint')}</span>
      </div>`;
    }
    if(tool==='text') return gnTextSub(false);
    return '';
  }

  /* sub-barra da ferramenta Texto (também aparece "afixada" nas outras ferramentas) */
  function gnTextSub(pinned){
    return `<div class="nb-gnsub nb-gnsub-text ${pinned?'nb-gnsub-pinned':''}">
      <button class="nb-gt nb-gt-color" id="nbTxColor" title="${t('tipColor')}">A<span class="nb-tb-color-bar" id="nbTxColorBar" style="background:${esc(gnT.textColor)}"></span></button>
      <select class="nb-tb-select" id="nbTxFont" title="${t('fontDefault')}"><option value="">${t('fontDefault')}</option>${FONTS.map(x=>`<option value="${x}">${x}</option>`).join('')}</select>
      <select class="nb-tb-select nb-gt-size" id="nbTxSize" title="${t('sizeLbl')}"><option value="">${t('sizeLbl')}</option>${SIZES.map(s=>`<option value="${s.v}">${s.l}</option>`).join('')}</select>
      <span class="nb-tb-sep"></span>
      <button class="nb-gt" data-txc="bold" title="${t('tipBold')}"><b>B</b></button>
      <button class="nb-gt" data-txc="italic" title="${t('tipItalic')}"><i>I</i></button>
      <button class="nb-gt" data-txc="underline" title="${t('tipUnder')}"><u>U</u></button>
      <button class="nb-gt" data-txc="strikeThrough" title="${t('tipStrike')}"><s>S</s></button>
      <button class="nb-gt nb-gt-color" id="nbTxHilite" title="${t('tipHilite')}">🖍<span class="nb-tb-color-bar" id="nbTxHiliteBar" style="background:${esc(gnT.textHilite)}"></span></button>
      <span class="nb-tb-sep"></span>
      <button class="nb-gt" data-txc="justifyLeft" title="${t('tipLeft')}">⇤</button>
      <button class="nb-gt" data-txc="justifyCenter" title="${t('tipCenter')}">☰</button>
      <button class="nb-gt" data-txc="justifyRight" title="${t('tipRight')}">⇥</button>
      <select class="nb-tb-select nb-gt-size" id="nbTxSpacing" title="${t('spacingLbl')}">
        <option value="">${t('spacingLbl')}</option><option value="1.2">1.0</option><option value="1.65">1.5</option><option value="2">1.8</option><option value="2.4">2.0</option>
      </select>
      <span class="nb-tb-sep"></span>
      <button class="nb-gt" data-txc="insertUnorderedList" title="${t('tipUl')}">•≡</button>
      <button class="nb-gt" data-txc="insertOrderedList" title="${t('tipOl')}">1≡</button>
      <button class="nb-gt" id="nbTxCheck" title="${t('tipCheck')}">☑</button>
      <span class="nb-tb-sep"></span>
      <button class="nb-gt" id="nbTxBox" title="${t('boxBorder')}">▣</button>
      <button class="nb-gt ${gnT.favStyle?'':'nb-dim'}" id="nbTxFav" title="${t('favStyleTip')}">★</button>
      <button class="nb-gt ${gnT.textPinned?'nb-on':''}" id="nbTxPin" title="${t('pinText')}">📌</button>
    </div>`;
  }

  function wireGnToolbar(book, editor, pg){
    const bar = root.querySelector('#nbGnTools'); if(!bar) return;
    /* seleção de ferramenta; clicar de novo na ativa abre as opções (laço/laser/imagem) */
    bar.querySelectorAll('[data-gt]').forEach(b=>b.addEventListener('click', ()=>{
      const id = b.dataset.gt;
      if(gnT.tool===id){
        if(id==='lasso') openLassoPop(b);
        else if(id==='laser') openLaserPop(b);
        else if(id==='image'){ const f=root.querySelector('#nbGnImgFile'); if(f) f.click(); }
        return;
      }
      flushPage(book, editor, pg);
      gnT.tool = id; saveTools(); render();
      if(id==='image') setTimeout(()=>{ const f=root.querySelector('#nbGnImgFile'); if(f) f.click(); }, 60);
    }));
    /* desfazer/refazer: texto usa o histórico do navegador; tinta usa a pilha de traços */
    root.querySelector('#nbGnUndo').addEventListener('click', ()=>{
      if(gnT.tool==='text'){ editor.focus(); document.execCommand('undo'); return; }
      if(pg.strokes && pg.strokes.length){
        if(inkState){ inkState.sel=null; positionSelChip(null); }
        inkRedoStack.push(pg.strokes.pop()); book.updated=Date.now(); save(); if(inkState) inkState.redraw();
      }
    });
    root.querySelector('#nbGnRedo').addEventListener('click', ()=>{
      if(gnT.tool==='text'){ editor.focus(); document.execCommand('redo'); return; }
      if(inkRedoStack.length){
        if(inkState){ inkState.sel=null; positionSelChip(null); }
        pg.strokes.push(inkRedoStack.pop()); book.updated=Date.now(); save(); if(inkState) inkState.redraw();
      }
    });
    /* upload da ferramenta Imagem → objeto movível/redimensionável */
    root.querySelector('#nbGnImgFile').addEventListener('change', async e=>{
      const f = e.target.files[0]; e.target.value=''; if(!f) return;
      const url = await uploadImage(f); if(!url) return;
      objsOf(pg).push({ id:uid(), type:'img', src:url, x:25, y:18, w:50 });
      book.updated = Date.now(); save(); renderObjLayer(book, pg, true);
    });
    /* sub-barras */
    const tool = gnT.tool;
    if(tool==='pen' || tool==='marker') wirePenSub(bar, tool);
    else if(tool==='eraser') wireEraserSub(bar);
    else if(tool==='sticky'){
      bar.querySelectorAll('[data-stc]').forEach(b=>b.addEventListener('click', ()=>{
        gnT.stickyColor = b.dataset.stc; saveTools();
        bar.querySelectorAll('[data-stc]').forEach(x=>x.classList.toggle('nb-on', x===b));
      }));
    }
    if(tool==='text' || gnT.textPinned) wireTextSub(bar, book, editor, pg);
  }

  function wirePenSub(bar, tool){
    const isM = tool==='marker';
    bar.querySelectorAll('[data-pst]').forEach(b=>b.addEventListener('click', ()=>{
      gnT.penStyle = b.dataset.pst; saveTools();
      bar.querySelectorAll('[data-pst]').forEach(x=>x.classList.toggle('nb-on', x===b));
    }));
    bar.querySelectorAll('.nb-gnsub [data-gw]').forEach(b=>b.addEventListener('click', ()=>{
      const v = +b.dataset.gw;
      if(isM) gnT.markerWidth = v; else gnT.penWidth = v;
      saveTools();
      bar.querySelectorAll('.nb-gnsub [data-gw]').forEach(x=>x.classList.toggle('nb-on', x===b));
    }));
    bar.querySelectorAll('[data-slot]').forEach(b=>b.addEventListener('click', ()=>{
      const i = +b.dataset.slot;
      if(isM) gnT.markerSlot = i; else gnT.penSlot = i;
      saveTools();
      bar.querySelectorAll('[data-slot]').forEach(x=>x.classList.toggle('nb-on', x===b));
    }));
    bar.querySelector('#nbSlotAdd').addEventListener('click', e=>openInkColorPop(e.currentTarget, isM));
  }

  /* popover "Cor da caneta" / "Cor do marcador": fileiras fixas + predefinições + seletor personalizado */
  function openInkColorPop(anchor, isM){
    const rows = isM ? GN_MARKER_ROWS : GN_PEN_ROWS;
    const presets = isM ? gnT.markerPresets : gnT.penPresets;
    const cur = String(isM ? gnT.markerSlots[gnT.markerSlot] : gnT.penSlots[gnT.penSlot]);
    const dot = c => `<button class="nb-gt-dot ${c.toLowerCase()===cur.toLowerCase()?'nb-on':''}" data-ic="${c}" style="background:${c}"></button>`;
    const pop = openPopover(anchor, `
      <div class="nb-inkpop">
        <strong class="nb-pop-title">${isM?t('markerColorTitle'):t('penColorTitle')}</strong>
        ${rows.map(r=>`<div class="nb-gt-dotrow">${r.map(dot).join('')}</div>`).join('')}
        <div class="nb-pgmenu-caps">${t('presetsLbl')}</div>
        <div class="nb-gt-dotrow">
          ${presets.map(dot).join('')}
          <button class="nb-gt-dot nb-gt-dot-add" id="nbIcMore" title="${t('pickerCustom')}">＋</button>
        </div>
      </div>`, {cls:'nb-pop-ink'});
    const applyColor = hex=>{
      hex = toHex(hex);
      if(isM) gnT.markerSlots[gnT.markerSlot] = hex; else gnT.penSlots[gnT.penSlot] = hex;
      saveTools(); closePopover(); render();
    };
    pop.querySelectorAll('[data-ic]').forEach(b=>b.addEventListener('click', ()=>applyColor(b.dataset.ic)));
    pop.querySelector('#nbIcMore').addEventListener('click', ()=>{
      const arr = isM ? gnT.markerPresets : gnT.penPresets;
      const inPresets = arr.some(c=>c.toLowerCase()===cur.toLowerCase());
      openColorPicker(anchor, {
        hex: cur, back: ()=>openInkColorPop(anchor, isM),
        onPick: hex=>{ // escolher aqui já "Adiciona a predefinições"
          if(!arr.some(c=>c.toLowerCase()===hex.toLowerCase())){ arr.unshift(hex); arr.splice(12); }
          applyColor(hex);
        },
        onRemove: inPresets ? ()=>{ // "Remover cor" tira a cor atual das predefinições
          const i = arr.findIndex(c=>c.toLowerCase()===cur.toLowerCase());
          if(i>=0) arr.splice(i,1);
          saveTools(); render();
        } : null
      });
    });
  }

  function wireEraserSub(bar){
    bar.querySelector('#nbErMode').addEventListener('change', e=>{ gnT.eraserMode = e.target.value; saveTools(); });
    bar.querySelectorAll('.nb-gnsub [data-gw]').forEach(b=>b.addEventListener('click', ()=>{
      gnT.eraserWidth = +b.dataset.gw; saveTools();
      bar.querySelectorAll('.nb-gnsub [data-gw]').forEach(x=>x.classList.toggle('nb-on', x===b));
    }));
    bar.querySelector('#nbErCfg').addEventListener('click', e=>{
      const pop = openPopover(e.currentTarget, `
        <div><strong class="nb-pop-title">${t('eraserSettings')}</strong>
        <label class="nb-gt-check"><input type="checkbox" id="nbErOnlyM" ${gnT.eraserOnlyMarker?'checked':''}> ${t('eraserOnlyMarker')}</label></div>`);
      pop.querySelector('#nbErOnlyM').addEventListener('change', ev=>{ gnT.eraserOnlyMarker = ev.target.checked; saveTools(); });
    });
  }

  function openLassoPop(anchor){
    const opt = (id,label,ico)=>`<button data-lm="${id}" class="${gnT.lassoMode===id?'nb-on':''}">${ico} ${label}</button>`;
    const pop = openPopover(anchor, `
      <div><strong class="nb-pop-title">${t('lassoTitle')}</strong>
      <div class="nb-pop-list">${opt('rect',t('lassoRect'),'▭')}${opt('free',t('lassoFree'),'〰')}</div></div>`);
    pop.querySelectorAll('[data-lm]').forEach(b=>b.addEventListener('click', ()=>{ gnT.lassoMode = b.dataset.lm; saveTools(); closePopover(); }));
  }
  function openLaserPop(anchor){
    const opt = (id,label,ico)=>`<button data-lz="${id}" class="${gnT.laserMode===id?'nb-on':''}">${ico} ${label}</button>`;
    const pop = openPopover(anchor, `
      <div><strong class="nb-pop-title">${t('laserTool')}</strong>
      <div class="nb-pop-list">${opt('point',t('laserPoint'),'●')}${opt('line',t('laserLine'),'➰')}</div></div>`);
    pop.querySelectorAll('[data-lz]').forEach(b=>b.addEventListener('click', ()=>{ gnT.laserMode = b.dataset.lz; saveTools(); closePopover(); }));
  }

  /* bloco (parágrafo/título/li) onde o cursor está — para espaçamento e borda */
  function selBlock(editor){
    const s = window.getSelection(); if(!s || !s.anchorNode) return null;
    let n = s.anchorNode; if(n.nodeType===3) n = n.parentElement;
    while(n && n!==editor && !/^(P|H1|H2|H3|DIV|LI|BLOCKQUOTE|PRE|UL|OL)$/.test(n.tagName)) n = n.parentElement;
    return (n && n!==editor && editor.contains(n)) ? n : null;
  }

  function wireTextSub(bar, book, editor, pg){
    const scheduleSave = ()=>{ markSaving(); clearTimeout(saveTimer); saveTimer = setTimeout(()=>{ pg.html = editor.innerHTML; book.updated = Date.now(); save(); }, 500); };
    const exec = (cmd,val)=>{ editor.focus(); document.execCommand(cmd, false, val); scheduleSave(); };
    bar.querySelectorAll('[data-txc]').forEach(b=>{
      b.addEventListener('mousedown', e=>e.preventDefault());
      b.addEventListener('click', ()=>exec(b.dataset.txc));
    });
    bar.querySelector('#nbTxFont').addEventListener('change', e=>{ if(e.target.value) exec('fontName', e.target.value); e.target.selectedIndex=0; });
    bar.querySelector('#nbTxSize').addEventListener('change', e=>{ if(e.target.value) exec('fontSize', e.target.value); e.target.selectedIndex=0; });
    const colorBtn = bar.querySelector('#nbTxColor'), hiliteBtn = bar.querySelector('#nbTxHilite');
    colorBtn.addEventListener('mousedown', e=>e.preventDefault());
    hiliteBtn.addEventListener('mousedown', e=>e.preventDefault());
    colorBtn.addEventListener('click', e=>openTextColorPop(e.currentTarget, false, exec, bar));
    hiliteBtn.addEventListener('click', e=>openTextColorPop(e.currentTarget, true, exec, bar));
    bar.querySelector('#nbTxSpacing').addEventListener('change', e=>{
      const v = e.target.value; e.target.selectedIndex = 0; if(!v) return;
      const blk = selBlock(editor); if(blk){ blk.style.lineHeight = v; scheduleSave(); }
    });
    bar.querySelector('#nbTxCheck').addEventListener('mousedown', e=>e.preventDefault());
    bar.querySelector('#nbTxCheck').addEventListener('click', ()=>{
      editor.focus();
      document.execCommand('insertHTML', false, '<ul class="nb-checklist"><li class="nb-check-item">&nbsp;</li></ul>');
      scheduleSave();
    });
    bar.querySelector('#nbTxBox').addEventListener('mousedown', e=>e.preventDefault());
    bar.querySelector('#nbTxBox').addEventListener('click', ()=>{
      const blk = selBlock(editor); if(blk){ blk.classList.toggle('nb-txt-border'); scheduleSave(); }
    });
    /* estilo favorito: aplicar / guardar o formato atual */
    bar.querySelector('#nbTxFav').addEventListener('mousedown', e=>e.preventDefault());
    bar.querySelector('#nbTxFav').addEventListener('click', e=>{
      const pop = openPopover(e.currentTarget, `<div class="nb-pop-list">
        ${gnT.favStyle?`<button data-fv="apply">★ ${t('favApply')}</button>`:''}
        <button data-fv="save">☆ ${t('favSave')}</button></div>`);
      pop.querySelectorAll('[data-fv]').forEach(b=>{
        b.addEventListener('mousedown', ev=>ev.preventDefault());
        b.addEventListener('click', ()=>{
          if(b.dataset.fv==='save'){
            editor.focus();
            gnT.favStyle = {
              font: document.queryCommandValue('fontName')||'',
              size: document.queryCommandValue('fontSize')||'',
              color: document.queryCommandValue('foreColor')||'',
              bold: document.queryCommandState('bold'),
              italic: document.queryCommandState('italic'),
              underline: document.queryCommandState('underline')
            };
            saveTools(); toast(t('favSaved'));
          } else if(gnT.favStyle){
            const f = gnT.favStyle; editor.focus();
            if(f.font) document.execCommand('fontName', false, f.font);
            if(f.size) document.execCommand('fontSize', false, f.size);
            if(f.color) document.execCommand('foreColor', false, f.color);
            ['bold','italic','underline'].forEach(k=>{ if(document.queryCommandState(k)!==!!f[k]) document.execCommand(k); });
            scheduleSave();
          }
          closePopover();
        });
      });
    });
    bar.querySelector('#nbTxPin').addEventListener('click', ()=>{ gnT.textPinned = !gnT.textPinned; saveTools(); render(); });
  }

  function openTextColorPop(anchor, isHilite, exec, bar){
    const rows = isHilite ? GN_MARKER_ROWS : GN_PEN_ROWS;
    const pop = openPopover(anchor, `
      <div class="nb-inkpop"><strong class="nb-pop-title">${isHilite?t('tipHilite'):t('tipColor')}</strong>
      ${rows.map(r=>`<div class="nb-gt-dotrow">${r.map(c=>`<button class="nb-gt-dot" data-ic="${c}" style="background:${c}"></button>`).join('')}</div>`).join('')}
      <div class="nb-gt-dotrow"><button class="nb-gt-dot nb-gt-dot-add" id="nbTxcMore" title="${t('pickerCustom')}">＋</button></div></div>`, {cls:'nb-pop-ink'});
    const applyC = hex=>{
      hex = toHex(hex);
      if(isHilite) gnT.textHilite = hex; else gnT.textColor = hex;
      saveTools();
      const barEl = bar.querySelector(isHilite?'#nbTxHiliteBar':'#nbTxColorBar'); if(barEl) barEl.style.background = hex;
      exec(isHilite?'hiliteColor':'foreColor', hex);
      closePopover();
    };
    pop.querySelectorAll('[data-ic]').forEach(b=>{
      b.addEventListener('mousedown', e=>e.preventDefault());
      b.addEventListener('click', ()=>applyC(b.dataset.ic));
    });
    pop.querySelector('#nbTxcMore').addEventListener('click', ()=>openColorPicker(anchor, {
      hex: isHilite?gnT.textHilite:gnT.textColor,
      back: ()=>openTextColorPop(anchor, isHilite, exec, bar),
      onPick: applyC
    }));
  }

  /* ---------- camada de objetos: imagens móveis + notas adesivas ---------- */
  function renderObjLayer(book, pg, interactive){
    const layer = root.querySelector('#nbObjLayer'); if(!layer) return;
    const objs = objsOf(pg);
    layer.innerHTML = objs.map((o,i)=> o.type==='img' ? `
      <div class="nb-obj nb-obj-img" data-oi="${i}" style="left:${+o.x||0}%;top:${+o.y||0}%;width:${+o.w||10}%">
        <img src="${esc(o.src)}" draggable="false">
        ${interactive?`<button class="nb-obj-x" title="${t('del')}">✕</button><span class="nb-obj-rs"></span>`:''}
      </div>` : `
      <div class="nb-obj nb-obj-sticky" data-oi="${i}" style="left:${+o.x||0}%;top:${+o.y||0}%;width:${+o.w||20}%;height:${+o.h||14}%;--stc:${esc(o.color)}">
        <span class="nb-obj-grip"></span>
        <div class="nb-sticky-text" ${interactive?'contenteditable="true"':''}>${esc(o.text||'')}</div>
        ${interactive?`<button class="nb-obj-x" title="${t('del')}">✕</button><span class="nb-obj-rs"></span>`:''}
      </div>`).join('');
    if(!interactive) return;
    const saveObjs = ()=>{ book.updated = Date.now(); save(); };
    /* clique na página com a ferramenta Nota adesiva → cria o post-it ali */
    layer.onclick = e=>{
      if(gnT.tool!=='sticky' || e.target!==layer) return;
      const r = layer.getBoundingClientRect();
      const x = Math.min(76, Math.max(0, (e.clientX-r.left)/r.width*100 - 11));
      const y = Math.min(82, Math.max(0, (e.clientY-r.top)/r.height*100 - 2));
      objs.push({ id:uid(), type:'sticky', color:gnT.stickyColor, text:'', x:Math.round(x*10)/10, y:Math.round(y*10)/10, w:23, h:14 });
      saveObjs(); renderObjLayer(book, pg, true);
      const el = layer.querySelector(`[data-oi="${objs.length-1}"] .nb-sticky-text`); if(el) el.focus();
    };
    layer.querySelectorAll('.nb-obj').forEach(el=>{
      const o = objs[+el.dataset.oi];
      const txt = el.querySelector('.nb-sticky-text');
      if(txt){
        txt.addEventListener('pointerdown', e=>e.stopPropagation()); // editar sem arrastar
        txt.addEventListener('input', ()=>{
          o.text = txt.innerText; markSaving();
          clearTimeout(saveTimer); saveTimer = setTimeout(saveObjs, 500);
        });
      }
      const x = el.querySelector('.nb-obj-x');
      if(x) x.addEventListener('click', e=>{
        e.stopPropagation();
        if(o.type==='img' && (o.src||'').startsWith('/api/notebook/img/')){ try{ fetch(o.src, {method:'DELETE'}); }catch(err){} }
        objs.splice(+el.dataset.oi, 1); saveObjs(); renderObjLayer(book, pg, true);
      });
      const rs = el.querySelector('.nb-obj-rs');
      if(rs) rs.addEventListener('pointerdown', e=>{
        e.preventDefault(); e.stopPropagation(); rs.setPointerCapture(e.pointerId);
        const lr = layer.getBoundingClientRect();
        const move = ev=>{
          o.w = Math.round(Math.min(96, Math.max(6, (ev.clientX-lr.left)/lr.width*100 - o.x))*10)/10;
          el.style.width = o.w+'%';
          if(o.type==='sticky'){
            o.h = Math.round(Math.min(90, Math.max(6, (ev.clientY-lr.top)/lr.height*100 - o.y))*10)/10;
            el.style.height = o.h+'%';
          }
        };
        const up = ()=>{ rs.removeEventListener('pointermove', move); rs.removeEventListener('pointerup', up); saveObjs(); };
        rs.addEventListener('pointermove', move); rs.addEventListener('pointerup', up);
      });
      el.addEventListener('pointerdown', e=>{
        if(e.target.closest('.nb-obj-x') || e.target.closest('.nb-obj-rs')) return;
        if(txt && (e.target===txt || txt.contains(e.target))) return;
        e.preventDefault(); el.setPointerCapture(e.pointerId);
        const lr = layer.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, ox = o.x, oy = o.y;
        let moved = false;
        const move = ev=>{
          const dx = (ev.clientX-sx)/lr.width*100, dy = (ev.clientY-sy)/lr.height*100;
          if(Math.abs(dx)+Math.abs(dy) > 0.15) moved = true;
          o.x = Math.round(Math.min(97-(+o.w||10), Math.max(0, ox+dx))*10)/10;
          o.y = Math.round(Math.min(96, Math.max(0, oy+dy))*10)/10;
          el.style.left = o.x+'%'; el.style.top = o.y+'%';
        };
        const up = ()=>{ el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); if(moved) saveObjs(); };
        el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
      });
    });
  }

  /* ---------- tinta v5: caneta/marcador/borracha/laço/laser no canvas ---------- */
  let inkState = null, inkRedoStack = [], inkPageId = null;
  function pointInPoly(x, y, poly){
    let inside = false;
    for(let i=0, j=poly.length-2; i<poly.length; j=i, i+=2){
      const xi=poly[i], yi=poly[i+1], xj=poly[j], yj=poly[j+1];
      if(((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi)) inside = !inside;
    }
    return inside;
  }
  function drawSelBox(ctx, sel){
    ctx.save(); ctx.strokeStyle = '#2768ff'; ctx.lineWidth = 2; ctx.setLineDash([7,5]);
    ctx.strokeRect(sel.x, sel.y, sel.w, sel.h); ctx.restore();
  }
  /* botão flutuante "Apagar seleção" ancorado na caixa do laço */
  function positionSelChip(sel){
    if(!root) return;
    let chip = root.querySelector('#nbSelChip');
    if(!sel){ if(chip) chip.remove(); return; }
    const page = root.querySelector('#nbPage'); if(!page || !inkState) return;
    if(!chip){
      chip = document.createElement('button');
      chip.id = 'nbSelChip'; chip.className = 'nb-lasso-del';
      chip.textContent = '🗑 ' + t('delSel');
      page.appendChild(chip);
      chip.addEventListener('click', ()=>{
        const st = inkState; if(!st || !st.sel) return;
        const set = new Set(st.sel.idx);
        st.pg.strokes = st.pg.strokes.filter((s,i)=>!set.has(i));
        st.sel = null; st.book.updated = Date.now(); save();
        st.redraw(); positionSelChip(null);
      });
    }
    const cv = inkState.canvas;
    chip.style.left = Math.min(97, Math.max(6, (sel.x+sel.w)/cv.width*100))+'%';
    chip.style.top = Math.min(96, Math.max(4, sel.y/cv.height*100))+'%';
  }
  function drawLassoPreview(ctx, path){
    ctx.save(); ctx.strokeStyle = '#2768ff'; ctx.lineWidth = 1.6; ctx.setLineDash([6,5]);
    if(gnT.lassoMode==='rect'){
      const x2 = path[path.length-2], y2 = path[path.length-1];
      ctx.strokeRect(Math.min(path[0],x2), Math.min(path[1],y2), Math.abs(x2-path[0]), Math.abs(y2-path[1]));
    } else {
      ctx.beginPath(); ctx.moveTo(path[0], path[1]);
      for(let i=2;i<path.length;i+=2) ctx.lineTo(path[i], path[i+1]);
      ctx.stroke();
    }
    ctx.restore();
  }
  function laserLoop(st){
    if(st.laserRaf) return;
    const tick = ()=>{
      st.laserRaf = 0;
      if(st!==inkState) return; // página re-renderizada
      const now = performance.now();
      if(gnT.laserMode==='point') st.laser = st.laser.filter(p=>now-p.t < 420);
      else if(!st.laserOn && st.laserUp && now-st.laserUp > 900) st.laser = [];
      st.redraw();
      if(st.laser.length){
        const ctx = st.ctx;
        ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
        ctx.shadowColor = 'rgba(255,45,35,.9)'; ctx.shadowBlur = 14;
        const globalA = (!st.laserOn && st.laserUp) ? Math.max(0, 1-(now-st.laserUp)/900) : 1;
        for(let i=1;i<st.laser.length;i++){
          const a = st.laser[i-1], b = st.laser[i];
          const age = gnT.laserMode==='point' ? Math.max(0, 1-(now-b.t)/420) : 1;
          ctx.strokeStyle = 'rgba(255,59,48,'+(0.85*age*globalA).toFixed(3)+')';
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
        const last = st.laser[st.laser.length-1];
        ctx.fillStyle = 'rgba(255,59,48,'+(0.95*globalA).toFixed(3)+')';
        ctx.beginPath(); ctx.arc(last.x, last.y, 6, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
      if(st.laser.length || st.laserOn) st.laserRaf = requestAnimationFrame(tick);
      else st.redraw();
    };
    st.laserRaf = requestAnimationFrame(tick);
  }
  function setupInk(book, pg, interactive, tool){
    const canvas = root.querySelector('#nbCanvas'); if(!canvas) return;
    const ori = book.orientation==='landscape' ? 'landscape' : 'portrait';
    canvas.width = CANVAS_W[ori]; canvas.height = CANVAS_H[ori];
    const ctx = canvas.getContext ? canvas.getContext('2d') : null; if(!ctx) return;
    pg.strokes = pg.strokes || [];
    if(inkPageId !== pg.id){ inkPageId = pg.id; inkRedoStack = []; }
    const st = { canvas, ctx, book, pg, sel:null, laser:[], laserOn:false, laserUp:0, laserRaf:0 };
    st.redraw = ()=>{
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pg.strokes.forEach(s=>drawStroke(ctx, s));
      if(st.sel) drawSelBox(ctx, st.sel);
    };
    st.redraw();
    inkState = st;
    positionSelChip(null);
    if(!interactive) return;

    const pos = e => {
      const r = canvas.getBoundingClientRect();
      return [ (e.clientX-r.left)*canvas.width/r.width, (e.clientY-r.top)*canvas.height/r.height ];
    };
    const hitStroke = (s, x, y, rad)=>{
      for(let i=0;i<s.p.length;i+=2){
        const dx = s.p[i]-x, dy = s.p[i+1]-y;
        if(dx*dx+dy*dy < rad*rad) return true;
      }
      return false;
    };
    let cur = null, lassoPath = null, dragSel = null, erasing = false, strokeErased = false;
    const eraseWholeStrokes = (x,y)=>{
      const rad = Math.max(gnT.eraserWidth, 12);
      const before = pg.strokes.length;
      for(let i=pg.strokes.length-1; i>=0; i--){
        const s = pg.strokes[i];
        if(gnT.eraserOnlyMarker && !s.m) continue;
        if(hitStroke(s, x, y, rad)) pg.strokes.splice(i, 1);
      }
      if(pg.strokes.length !== before){ strokeErased = true; st.redraw(); }
    };
    const finishLasso = ()=>{
      const path = lassoPath; lassoPath = null;
      if(!path || path.length < 6){ st.redraw(); return; }
      let inside;
      if(gnT.lassoMode==='rect'){
        const x1 = Math.min(path[0], path[path.length-2]), x2 = Math.max(path[0], path[path.length-2]);
        const y1 = Math.min(path[1], path[path.length-1]), y2 = Math.max(path[1], path[path.length-1]);
        inside = (px,py)=> px>=x1 && px<=x2 && py>=y1 && py<=y2;
      } else inside = (px,py)=> pointInPoly(px, py, path);
      const idx = [];
      pg.strokes.forEach((s,i)=>{
        let inN = 0, tot = 0;
        for(let k=0;k<s.p.length;k+=2){ tot++; if(inside(s.p[k], s.p[k+1])) inN++; }
        if(tot && inN/tot >= 0.5) idx.push(i);
      });
      if(!idx.length){ st.sel = null; st.redraw(); positionSelChip(null); return; }
      let mx1=1e9, my1=1e9, mx2=-1e9, my2=-1e9;
      idx.forEach(i=>{ const p = pg.strokes[i].p; for(let k=0;k<p.length;k+=2){ mx1=Math.min(mx1,p[k]); mx2=Math.max(mx2,p[k]); my1=Math.min(my1,p[k+1]); my2=Math.max(my2,p[k+1]); } });
      st.sel = { idx, x:mx1-12, y:my1-12, w:(mx2-mx1)+24, h:(my2-my1)+24 };
      st.redraw(); positionSelChip(st.sel);
    };

    canvas.addEventListener('pointerdown', e=>{
      e.preventDefault(); canvas.setPointerCapture(e.pointerId);
      const [x,y] = pos(e);
      if(tool==='laser'){ st.laser = [{x, y, t:performance.now()}]; st.laserOn = true; st.laserUp = 0; laserLoop(st); return; }
      if(tool==='lasso'){
        if(st.sel && x>=st.sel.x && x<=st.sel.x+st.sel.w && y>=st.sel.y && y<=st.sel.y+st.sel.h){ dragSel = {lx:x, ly:y, moved:false}; return; }
        st.sel = null; positionSelChip(null); lassoPath = [x, y]; return;
      }
      if(tool==='eraser' && gnT.eraserMode==='stroke'){ erasing = true; strokeErased = false; eraseWholeStrokes(x, y); return; }
      const isM = tool==='marker';
      cur = {
        c: tool==='eraser' ? '#000' : (isM ? gnT.markerSlots[gnT.markerSlot] : gnT.penSlots[gnT.penSlot]),
        w: tool==='eraser' ? gnT.eraserWidth : (isM ? gnT.markerWidth : gnT.penWidth),
        e: tool==='eraser' ? 1 : 0,
        m: isM ? 1 : 0,
        p: [Math.round(x), Math.round(y)]
      };
      if(tool==='pen' && gnT.penStyle!=='fountain') cur.st = gnT.penStyle;
    });
    canvas.addEventListener('pointermove', e=>{
      const [x,y] = pos(e);
      if(tool==='laser'){ if(st.laserOn) st.laser.push({x, y, t:performance.now()}); return; }
      if(tool==='lasso'){
        if(dragSel){
          const dx = x-dragSel.lx, dy = y-dragSel.ly;
          dragSel.lx = x; dragSel.ly = y; dragSel.moved = true;
          st.sel.idx.forEach(i=>{ const p = pg.strokes[i].p; for(let k=0;k<p.length;k+=2){ p[k]+=dx; p[k+1]+=dy; } });
          st.sel.x += dx; st.sel.y += dy;
          st.redraw(); positionSelChip(st.sel);
          return;
        }
        if(lassoPath){ lassoPath.push(x, y); st.redraw(); drawLassoPreview(ctx, lassoPath); }
        return;
      }
      if(tool==='eraser' && gnT.eraserMode==='stroke'){ if(erasing) eraseWholeStrokes(x, y); return; }
      if(!cur) return; e.preventDefault();
      const n = cur.p.length, xi = Math.round(x), yi = Math.round(y);
      if(n>=2 && Math.abs(cur.p[n-2]-xi)<2 && Math.abs(cur.p[n-1]-yi)<2) return;
      cur.p.push(xi, yi);
      drawStroke(ctx, cur, n-2);
    });
    const end = ()=>{
      if(tool==='laser'){ st.laserOn = false; st.laserUp = performance.now(); return; }
      if(tool==='lasso'){
        if(dragSel){ const mv = dragSel.moved; dragSel = null; if(mv){ book.updated = Date.now(); save(); } return; }
        if(lassoPath) finishLasso();
        return;
      }
      if(tool==='eraser' && gnT.eraserMode==='stroke'){ erasing = false; if(strokeErased){ book.updated = Date.now(); save(); } return; }
      if(!cur) return;
      if(cur.p.length===2) cur.p.push(cur.p[0]+1, cur.p[1]+1);
      pg.strokes.push(cur); cur = null; inkRedoStack = [];
      book.updated = Date.now(); save();
      st.redraw();
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  /* ---------- atalhos de teclado das ferramentas (V,P,E,I,N,L) — só desktop ---------- */
  let gnKeyCtx = null;
  function gnWireShortcuts(book, editor, pg){
    gnKeyCtx = { book, editor, pg };
    if(window.__nbGnKeys) return;
    window.__nbGnKeys = true;
    document.addEventListener('keydown', e=>{
      if(!gnKeyCtx || !root || view.name!=='notebook' || view.reading) return;
      if(window.innerWidth <= 820) return;
      if(e.ctrlKey || e.metaKey || e.altKey) return;
      const tgt = e.target;
      if(tgt && (tgt.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tgt.tagName||''))) return;
      const k = (e.key||'').toLowerCase();
      if((k==='delete' || k==='backspace') && gnT.tool==='lasso' && inkState && inkState.sel){
        e.preventDefault();
        const chip = root.querySelector('#nbSelChip'); if(chip) chip.click();
        return;
      }
      const map = { v:'lasso', p:'pen', e:'eraser', i:'image', n:'sticky', l:'laser' };
      if(!map[k]) return;
      e.preventDefault();
      if(gnT.tool === map[k]) return;
      flushPage(gnKeyCtx.book, gnKeyCtx.editor, gnKeyCtx.pg);
      gnT.tool = map[k]; saveTools(); render();
      if(map[k]==='image'){ const f = root.querySelector('#nbGnImgFile'); if(f) f.click(); }
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
    /* v5: estilos de caneta (tinteiro = padrão; esferográfica = traço mais fino; pincel = mais largo e translúcido) */
    if(s.st==='ball') ctx.lineWidth = Math.max(1, s.w*0.75);
    else if(s.st==='brush'){ ctx.lineWidth = s.w*1.6; if(!s.m && !s.e) ctx.globalAlpha = 0.88; }
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
  /* ================================================================
     v6 — FASE 5: app "Notes" = clone do Apple Notes (page=notes).
     Layout 3 colunas (sidebar iCloud / lista / nota), dados próprios em
     couplemed_notes_${user}. Título = 1ª linha da nota (como no Apple
     Notes). FORA: Bloquear Nota e todas as extensões de share.
     ================================================================ */
  const AN_KEY = `couplemed_notes_${USER}`;
  const AN = (function(){
    try{ const d = JSON.parse(localStorage.getItem(AN_KEY)); if(d && typeof d==='object') return { folders:d.folders||[], notes:d.notes||[] }; }catch(e){}
    return { folders:[], notes:[] };
  })();
  function anPersist(){ try{ localStorage.setItem(AN_KEY, JSON.stringify(AN)); }catch(e){ toast(t('storageFull'), true); } }
  // lixeira: apaga em definitivo depois de 30 dias
  (function(){ const cut = Date.now()-30*864e5; const n0 = AN.notes.length;
    AN.notes = AN.notes.filter(n=>!(n.deletedAt && n.deletedAt < cut));
    if(AN.notes.length !== n0) anPersist(); })();
  let anV = { folder:'all', noteId:null, sidebar:window.innerWidth>1024, gallery:false, sort:'edited', group:true, pinnedOpen:true, search:'' };
  let anRec = null, anBootNote = params.get('note');
  const AN_HILITES = ['#d9c8f6','#f6c9dd','#f8d9b0','#c8f0dd','#c9e2f9']; // Roxo, Rosa, Laranja, Menta, Azul

  const anById = id => AN.notes.find(n=>n.id===id);
  const anFolderById = id => AN.folders.find(f=>f.id===id);
  function anBlocks(n){
    const d = document.createElement('div'); d.innerHTML = n.html||'';
    const out = [];
    d.childNodes.forEach(c=>{ const s = (c.textContent||'').trim(); if(s) out.push(s); });
    return out;
  }
  const anTitleOf = n => (anBlocks(n)[0]||t('anNewNote')).slice(0,90);
  const anSnippetOf = n => anBlocks(n).slice(1).join(' ').slice(0,110) || t('anNoText');
  const anTextOf = n => anBlocks(n).join(' ');
  function anThumbOf(n){ const d = document.createElement('div'); d.innerHTML = n.html||''; const im = d.querySelector('img'); return im ? im.getAttribute('src') : null; }
  function anNotesIn(fid){
    if(fid==='trash') return AN.notes.filter(n=>n.deletedAt);
    const live = AN.notes.filter(n=>!n.deletedAt);
    if(fid==='all') return live;
    const f = anFolderById(fid); if(!f) return live;
    if(f.smart){
      const tags = (f.tags||[]).map(x=>('#'+String(x).replace(/^#/,'')).toLowerCase());
      return live.filter(n=>{ const tx = anTextOf(n).toLowerCase(); return tags.some(tg=>tx.includes(tg)); });
    }
    return live.filter(n=>n.folderId===f.id);
  }
  const anLoc = () => lang()==='pt' ? 'pt-BR' : 'en-US';
  function anDateShort(ts){
    const d = new Date(ts||Date.now());
    return d.toDateString()===new Date().toDateString()
      ? d.toLocaleTimeString(anLoc(), {hour:'2-digit',minute:'2-digit'})
      : d.toLocaleDateString(anLoc(), {day:'2-digit',month:'2-digit',year:'2-digit'});
  }
  function anDateLong(ts){
    const d = new Date(ts||Date.now());
    return d.toLocaleDateString(anLoc(), {day:'numeric',month:'long',year:'numeric'})
      + ' ' + t('anAt') + ' ' + d.toLocaleTimeString(anLoc(), {hour:'2-digit',minute:'2-digit'});
  }
  function anGroupOf(ts){
    const now = new Date();
    const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if(ts >= day0) return t('anToday');
    if(ts >= day0-864e5) return t('anYesterday');
    if(ts >= day0-7*864e5) return t('anLast7');
    if(ts >= day0-30*864e5) return t('anLast30');
    return new Date(ts).toLocaleDateString(anLoc(), {month:'long',year:'numeric'});
  }
  function anSyncUrl(){
    const u = new URL(location.href);
    u.searchParams.set('page','notes'); u.searchParams.set('u',USER);
    ['folder','nb','pg','fav','prefill','note'].forEach(k=>u.searchParams.delete(k));
    if(anV.noteId) u.searchParams.set('note', anV.noteId);
    history.replaceState(null,'','app.html'+u.search);
  }
  const anCountLbl = n => n===1 ? t('anNoteCount1') : t('anNotesCount',{n});

  /* ---------- render principal do app Notes ---------- */
  function renderNotesApp(){
    if(anBootNote){ // deep link ?note=
      const n = anById(anBootNote); anBootNote = null;
      if(n){ anV.noteId = n.id; if(n.deletedAt) anV.folder = 'trash'; }
    }
    const cur = anV.noteId ? anById(anV.noteId) : null;
    if(anV.noteId && !cur) anV.noteId = null;
    const inTrash = anV.folder==='trash';
    const dis = (!cur || inTrash) ? 'nb-an-dis' : '';
    const srow = (id, ico, label, count, menu) => `
      <button class="nb-an-srow ${anV.folder===id?'nb-on':''}" data-anf="${id}">
        <span class="nb-an-sico">${ico}</span><span class="nb-an-slbl">${label}</span>
        ${menu?`<i class="nb-an-fmenu" data-anfm="${id}">⋯</i>`:''}<em>${count}</em>
      </button>`;
    root.innerHTML = `
      <div class="nb-an ${cur?'nb-an-hasnote':''}">
        <div class="nb-an-bar">
          <button class="nb-gt ${anV.sidebar?'nb-on':''}" id="anSideTgl" title="Sidebar">◧</button>
          <button class="nb-gt nb-an-back" id="anBack">‹ ${t('anNotes')}</button>
          <button class="nb-gt" id="anNewNote" title="${t('anNewNote')}">✎</button>
          <span class="nb-tb-sep"></span>
          <button class="nb-gt ${dis}" id="anAaBtn" title="Aa"><b>Aa</b></button>
          <button class="nb-gt ${dis}" id="anCheckBtn" title="${t('tipCheck')}">☑</button>
          <button class="nb-gt ${dis}" id="anTableBtn" title="${t('anTable')}">⊞</button>
          <button class="nb-gt ${dis}" id="anClipBtn" title="${t('anAttachFile')}">📎</button>
          <span class="nb-tb-sep"></span>
          <button class="nb-gt ${dis}" id="anShareBtn" title="${t('anSendCopy')}">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M12 14V3M12 3L8 7M12 3l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 11v9h14v-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="nb-gt ${cur?'':'nb-an-dis'}" id="anMoreBtn" title="⋯">⋯</button>
          <span class="nb-gnflex"></span>
          <span class="nb-savestate" id="anSaveState">${t('saved')}</span>
          <div class="nb-search nb-an-search">
            <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <input id="anSearchInp" placeholder="${t('anSearchPh')}" value="${esc(anV.search)}" />
          </div>
        </div>
        <div class="nb-an-cols">
          <aside class="nb-an-side" id="anSide" ${anV.sidebar?'':'hidden'}>
            <div class="nb-an-sidecap">${t('anICloud')}</div>
            ${srow('all','📁',t('anNotes'), anNotesIn('all').length)}
            ${srow('trash','🗑',t('anDeleted'), anNotesIn('trash').length)}
            ${AN.folders.length?`<div class="nb-an-sidecap nb-an-sidecap2">${t('folders')}</div>`:''}
            ${AN.folders.map(f=>srow(f.id, f.smart?'⚙️':'📁', esc(f.name), anNotesIn(f.id).length, true)).join('')}
            <button class="nb-an-newfolder" id="anNewFolderBtn">⊕ ${t('anNewFolderBtn')}</button>
          </aside>
          <section class="nb-an-listcol" id="anListCol">${anListColHtml()}</section>
          <section class="nb-an-notecol">${anNoteColHtml(cur, inTrash)}</section>
        </div>
      </div>`;
    anWireShell(cur, inTrash);
    anWireListCol();
    if(cur) anWireNote(cur, inTrash);
  }

  /* ---------- coluna 2: lista/galeria com Fixadas + grupos de data ---------- */
  function anListColHtml(){
    const inTrash = anV.folder==='trash';
    const f = anFolderById(anV.folder);
    const title = inTrash ? t('anDeleted') : (f ? esc(f.name) : t('anNotes'));
    const q = anV.search.trim().toLowerCase();
    let list = anNotesIn(anV.folder);
    if(q) list = list.filter(n=>anTextOf(n).toLowerCase().includes(q));
    const sorters = {
      edited:(a,b)=>(b.updated||0)-(a.updated||0),
      created:(a,b)=>(b.created||0)-(a.created||0),
      title:(a,b)=>anTitleOf(a).localeCompare(anTitleOf(b))
    };
    list.sort(sorters[anV.sort]||sorters.edited);
    const pinned = inTrash ? [] : list.filter(n=>n.pinned);
    const rest = inTrash ? list : list.filter(n=>!n.pinned);
    const row = n => `
      <button class="nb-an-row ${n.id===anV.noteId?'nb-on':''}" data-annote="${n.id}">
        <span class="nb-an-rowmain">
          <strong>${esc(anTitleOf(n))}</strong>
          <span class="nb-an-rowsub"><em class="nb-an-date">${anDateShort(anV.sort==='created'?n.created:n.updated)}</em>
          <span class="nb-an-snip">${esc(anSnippetOf(n))}</span></span>
        </span>
        ${anThumbOf(n)?`<img class="nb-an-thumb" src="${esc(anThumbOf(n))}">`:''}
      </button>`;
    const card = n => `
      <button class="nb-an-card ${n.id===anV.noteId?'nb-on':''}" data-annote="${n.id}">
        <span class="nb-an-cardprev">${anThumbOf(n)?`<img src="${esc(anThumbOf(n))}">`:`<span class="nb-an-cardtxt">${esc(anTextOf(n).slice(0,180)||t('anNoText'))}</span>`}</span>
        <strong>${esc(anTitleOf(n))}</strong><em>${anDateShort(n.updated)}</em>
      </button>`;
    const item = anV.gallery ? card : row;
    let body = '';
    if(pinned.length){
      body += `<button class="nb-an-gcap" id="anPinTgl"><b>${anV.pinnedOpen?'⌄':'›'}</b> 📌 ${t('anPinned')}</button>`;
      if(anV.pinnedOpen) body += `<div class="${anV.gallery?'nb-an-cards':''}">${pinned.map(item).join('')}</div>`;
    }
    if(anV.group && anV.sort!=='title'){
      let lastG = null;
      let open = false;
      rest.forEach(n=>{
        const g = anGroupOf(anV.sort==='created'?n.created:n.updated);
        if(g!==lastG){
          if(open) body += '</div>';
          body += `<div class="nb-an-gcap nb-an-gcap-date">${g}</div><div class="${anV.gallery?'nb-an-cards':''}">`;
          lastG = g; open = true;
        }
        body += item(n);
      });
      if(open) body += '</div>';
    } else body += `<div class="${anV.gallery?'nb-an-cards':''}">${rest.map(item).join('')}</div>`;
    if(!list.length) body = `<div class="nb-an-emptylist">${t('anEmpty')}</div>`;
    return `
      <div class="nb-an-listhead">
        <strong>${title}</strong>
        <button class="nb-gt" id="anListMenu" title="⋯">⋯</button>
      </div>
      <div class="nb-an-count">${anCountLbl(list.length)}</div>
      ${inTrash?`<div class="nb-an-trashhint">${t('anTrashHint')}</div>`:''}
      <div class="nb-an-scroll">${body}</div>`;
  }
  function anWireListCol(){
    const col = root.querySelector('#anListCol'); if(!col) return;
    col.querySelectorAll('[data-annote]').forEach(b=>b.addEventListener('click', ()=>{
      anV.noteId = b.dataset.annote; anSyncUrl(); render();
    }));
    const pt = col.querySelector('#anPinTgl');
    if(pt) pt.addEventListener('click', ()=>{ anV.pinnedOpen = !anV.pinnedOpen; anRefreshList(); });
    const lm = col.querySelector('#anListMenu');
    if(lm) lm.addEventListener('click', e=>anOpenListMenu(e.currentTarget));
  }
  function anRefreshList(){
    const col = root.querySelector('#anListCol'); if(!col) return;
    col.innerHTML = anListColHtml(); anWireListCol();
  }
  function anTouchListItem(n){
    const el = root.querySelector(`[data-annote="${n.id}"]`); if(!el) return;
    const st = el.querySelector('strong'); if(st) st.textContent = anTitleOf(n);
    const sn = el.querySelector('.nb-an-snip'); if(sn) sn.textContent = anSnippetOf(n);
    const dt = el.querySelector('.nb-an-date'); if(dt) dt.textContent = anDateShort(n.updated);
  }
  /* menu ⋯ da lista: Galeria, Ordenar por ›, Agrupar por Data ›, Ver Anexos */
  function anOpenListMenu(anchor){
    const pop = openPopover(anchor, `<div class="nb-pop-list">
      <button data-alm="view">${anV.gallery?'☰ '+t('anViewList'):'⊞ '+t('anViewGallery')}</button>
      <button data-alm="sort">↕ ${t('anSortBy')} ›</button>
      <button data-alm="group">📅 ${t('anGroup')} ›</button>
      <button data-alm="att">🖼 ${t('anSeeAtt')}</button>
    </div>`);
    pop.querySelector('[data-alm="view"]').addEventListener('click', ()=>{ anV.gallery = !anV.gallery; closePopover(); anRefreshList(); });
    pop.querySelector('[data-alm="sort"]').addEventListener('click', ()=>{
      const p2 = openPopover(anchor, `<div class="nb-pop-list">
        ${[['edited','anSortEdited'],['created','anSortCreated'],['title','anSortTitle']].map(([v,k])=>`<button data-srt="${v}" class="${anV.sort===v?'nb-on':''}">${t(k)}</button>`).join('')}
      </div>`);
      p2.querySelectorAll('[data-srt]').forEach(b=>b.addEventListener('click', ()=>{ anV.sort = b.dataset.srt; closePopover(); anRefreshList(); }));
    });
    pop.querySelector('[data-alm="group"]').addEventListener('click', ()=>{
      const p2 = openPopover(anchor, `<div class="nb-pop-list">
        <button data-grp="1" class="${anV.group?'nb-on':''}">${t('anAuto')}</button>
        <button data-grp="0" class="${anV.group?'':'nb-on'}">${t('anOffLbl')}</button>
      </div>`);
      p2.querySelectorAll('[data-grp]').forEach(b=>b.addEventListener('click', ()=>{ anV.group = b.dataset.grp==='1'; closePopover(); anRefreshList(); }));
    });
    pop.querySelector('[data-alm="att"]').addEventListener('click', ()=>anAttPop(anchor, anNotesIn(anV.folder)));
  }
  /* anexos (de uma nota ou da pasta inteira) */
  function anAttPop(anchor, notes){
    const items = [];
    notes.forEach(n=>{
      const d = document.createElement('div'); d.innerHTML = n.html||'';
      d.querySelectorAll('img,audio,video,a.nb-an-file').forEach(el=>{
        if(el.tagName==='IMG') items.push(`<img src="${esc(el.getAttribute('src'))}">`);
        else if(el.tagName==='A') items.push(`<span class="nb-an-attfile">📄 ${esc(el.textContent.replace('📄','').trim())}</span>`);
        else items.push(`<span class="nb-an-attfile">${el.tagName==='AUDIO'?'🎙':'🎞'} ${el.tagName.toLowerCase()}</span>`);
      });
    });
    openPopover(anchor, `<div><strong class="nb-pop-title">${t('anAttOfNote')}</strong>
      ${items.length?`<div class="nb-an-attgrid">${items.join('')}</div>`:`<div class="nb-cpick-empty">${t('anNoAtt')}</div>`}</div>`, {cls:'nb-pop-anatt'});
  }

  /* ---------- coluna 3: a nota ---------- */
  function anNoteColHtml(cur, inTrash){
    if(!cur) return `<div class="nb-an-emptynote"><span>📝</span><p>${t('anEmpty')}</p></div>`;
    return `
      ${inTrash?`<div class="nb-an-trashbar">
        <button class="nb-btn" id="anRestore">↩ ${t('anRestore')}</button>
        <button class="nb-btn nb-btn-danger" id="anDelForever">🗑 ${t('anDelForever')}</button>
      </div>`:''}
      <div class="nb-an-ndate">${anDateLong(cur.updated)}</div>
      <div class="nb-an-body" id="anEditor" contenteditable="${inTrash?'false':'true'}" data-ph="${t('notePh')}"></div>`;
  }
  function anFlush(n, ed){
    clearTimeout(saveTimer);
    if(n && ed && !n.deletedAt){ n.html = ed.innerHTML; anPersist(); }
  }
  function anWireNote(cur, inTrash){
    const ed = root.querySelector('#anEditor'); if(!ed) return;
    ed.innerHTML = cur.html||'';
    if(inTrash){
      root.querySelector('#anRestore').addEventListener('click', ()=>{ cur.deletedAt = null; anPersist(); anV.folder='all'; render(); });
      root.querySelector('#anDelForever').addEventListener('click', ()=>{
        if(!confirm(t('anConfirmDelForever'))) return;
        deleteRemoteImages(cur.html);
        AN.notes = AN.notes.filter(n=>n.id!==cur.id);
        anPersist(); anV.noteId = null; anSyncUrl(); render();
      });
      return;
    }
    const schedule = ()=>{
      const st = root.querySelector('#anSaveState'); if(st) st.textContent = t('saving');
      clearTimeout(saveTimer);
      saveTimer = setTimeout(()=>{
        cur.html = ed.innerHTML; cur.updated = Date.now(); anPersist();
        const s2 = root.querySelector('#anSaveState'); if(s2) s2.textContent = t('saved');
        anTouchListItem(cur);
      }, 500);
    };
    anWireNote.schedule = schedule; // usado pela toolbar
    try{ document.execCommand('styleWithCSS', false, true); }catch(e){}
    try{ document.execCommand('defaultParagraphSeparator', false, 'p'); }catch(e){}
    ed.addEventListener('input', schedule);
    ed.addEventListener('blur', ()=>anFlush(cur, ed));
    ed.addEventListener('click', e=>{
      const li = e.target.closest('li.nb-check-item');
      if(li && e.offsetX < 26){ li.classList.toggle('nb-checked'); schedule(); }
    });
    ed.addEventListener('paste', async e=>{
      const items = (e.clipboardData||{}).items || [];
      for(const it of items){
        if(it.kind==='file' && /^image\//.test(it.type)){
          e.preventDefault();
          const url = await uploadImage(it.getAsFile());
          if(url){ ed.focus(); document.execCommand('insertImage', false, url); schedule(); }
          return;
        }
      }
    });
  }

  /* ---------- casca: sidebar + toolbar ---------- */
  function anWireShell(cur, inTrash){
    const ed = () => root.querySelector('#anEditor');
    const exec = (cmd, val)=>{ const e = ed(); if(!e) return; e.focus(); document.execCommand(cmd, false, val); if(anWireNote.schedule) anWireNote.schedule(); };
    const insertHtml = html => exec('insertHTML', html);
    root.querySelector('#anSideTgl').addEventListener('click', ()=>{ anV.sidebar = !anV.sidebar; render(); });
    root.querySelector('#anBack').addEventListener('click', ()=>{ anFlush(cur, ed()); anV.noteId = null; anSyncUrl(); render(); });
    root.querySelectorAll('[data-anf]').forEach(b=>b.addEventListener('click', e=>{
      if(e.target.closest('[data-anfm]')) return;
      anFlush(cur, ed());
      anV.folder = b.dataset.anf; anV.noteId = null; anSyncUrl(); render();
    }));
    root.querySelectorAll('[data-anfm]').forEach(i=>i.addEventListener('click', e=>{
      e.stopPropagation();
      const f = anFolderById(i.dataset.anfm); if(!f) return;
      const pop = openPopover(i, `<div class="nb-pop-list">
        <button data-afm="ren">✎ ${t('anRenameFolder')}</button>
        <button data-afm="del" class="nb-pm-danger">🗑 ${t('anDelFolder')}</button></div>`);
      pop.querySelector('[data-afm="ren"]').addEventListener('click', ()=>{ closePopover(); anFolderModal(f); });
      pop.querySelector('[data-afm="del"]').addEventListener('click', ()=>{
        closePopover();
        if(!confirm(t('anConfirmDelFolder'))) return;
        AN.notes.forEach(n=>{ if(n.folderId===f.id) n.folderId = null; });
        AN.folders = AN.folders.filter(x=>x.id!==f.id);
        if(anV.folder===f.id) anV.folder = 'all';
        anPersist(); render();
      });
    }));
    root.querySelector('#anNewFolderBtn').addEventListener('click', ()=>anFolderModal(null));
    root.querySelector('#anNewNote').addEventListener('click', ()=>{
      anFlush(cur, ed());
      const f = anFolderById(anV.folder);
      const nn = { id:uid(), folderId:(f && !f.smart)?f.id:null, html:'', created:Date.now(), updated:Date.now(), pinned:false, deletedAt:null };
      AN.notes.push(nn); anPersist();
      if(anV.folder==='trash') anV.folder = 'all';
      anV.noteId = nn.id; anSyncUrl(); render();
      const e2 = root.querySelector('#anEditor'); if(e2) e2.focus();
    });
    const need = fn => e => { if(cur && !inTrash) fn(e); };
    root.querySelector('#anAaBtn').addEventListener('click', need(e=>anOpenAa(e.currentTarget, exec)));
    root.querySelector('#anCheckBtn').addEventListener('click', need(()=>insertHtml('<ul class="nb-checklist"><li class="nb-check-item">&nbsp;</li></ul>')));
    root.querySelector('#anTableBtn').addEventListener('click', need(()=>insertHtml(
      '<table class="nb-an-table"><tbody><tr><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td></tr></tbody></table><p><br></p>')));
    root.querySelector('#anClipBtn').addEventListener('click', need(e=>anClipPop(e.currentTarget, insertHtml)));
    root.querySelector('#anShareBtn').addEventListener('click', need(e=>{
      const pop = openPopover(e.currentTarget, `<div><strong class="nb-pop-title">${t('anSendCopy')}</strong>
        <div class="nb-pop-list"><button data-ash="copy">⧉ ${t('anCopy')}</button></div></div>`);
      pop.querySelector('[data-ash="copy"]').addEventListener('click', ()=>{
        closePopover();
        const txt = anBlocks(cur).join('\n');
        const done = ()=>toast(t('anCopied'));
        if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done).catch(done);
        else done();
      });
    }));
    root.querySelector('#anMoreBtn').addEventListener('click', e=>{ if(cur) anNoteMenu(e.currentTarget, cur, inTrash); });
    const si = root.querySelector('#anSearchInp');
    si.addEventListener('input', ()=>{ anV.search = si.value; anRefreshList(); });
  }

  /* ---------- diálogo Nova Pasta (com Pasta Inteligente) ---------- */
  function anFolderModal(f){
    const m = openModal(`
      <h3>${f?t('anRenameFolder'):t('anNewFolderBtn')}</h3>
      <div class="nb-field"><label>${t('anFolderName')}</label>
        <input type="text" id="anFName" maxlength="40" value="${esc(f?f.name:'')}" placeholder="${t('anFolderName')}"></div>
      ${f?'':`<label class="nb-gt-check"><input type="checkbox" id="anFSmart"> ${t('anSmartChk')}</label>
      <div class="nb-field" id="anFTagsWrap" hidden style="margin-top:10px"><label>${t('anSmartTags')}</label>
        <input type="text" id="anFTags" placeholder="#prova, #anki"></div>`}
      <div class="nb-modal-foot">
        <button class="nb-btn nb-btn-ghost" id="anFCancel">${t('cancel')}</button>
        <button class="nb-btn nb-btn-primary" id="anFOk">OK</button>
      </div>`);
    const chk = m.querySelector('#anFSmart');
    if(chk) chk.addEventListener('change', ()=>{ m.querySelector('#anFTagsWrap').hidden = !chk.checked; });
    m.querySelector('#anFCancel').addEventListener('click', closeModal);
    const okIt = ()=>{
      const name = m.querySelector('#anFName').value.trim(); if(!name) return;
      if(f){ f.name = name; }
      else {
        const smart = chk && chk.checked;
        const tags = smart ? m.querySelector('#anFTags').value.split(',').map(s=>s.trim().replace(/^#/,'')).filter(Boolean) : [];
        AN.folders.push({ id:uid(), name, smart:!!smart, tags });
      }
      anPersist(); closeModal(); render();
    };
    m.querySelector('#anFOk').addEventListener('click', okIt);
    m.querySelector('#anFName').addEventListener('keydown', e=>{ if(e.key==='Enter') okIt(); });
    m.querySelector('#anFName').focus();
  }

  /* ---------- painel Aa: estilos + B/I/U/S + caneta de realce (5 cores) ---------- */
  function anOpenAa(anchor, exec){
    const pop = openPopover(anchor, `
      <div class="nb-an-aa">
        <div class="nb-pop-list">
          <button data-aas="h1" class="nb-an-s-h1">${t('anStyleTitle')}</button>
          <button data-aas="h2" class="nb-an-s-h2">${t('anStyleHeading')}</button>
          <button data-aas="h3" class="nb-an-s-h3">${t('anStyleSub')}</button>
          <button data-aas="p">${t('anStyleBody')}</button>
          <button data-aas="pre" class="nb-an-s-mono">${t('anStyleMono')}</button>
          <button data-aal="ul">• ${t('anStyleBullet')}</button>
          <button data-aal="dash">– ${t('anStyleDash')}</button>
          <button data-aal="ol">1. ${t('anStyleNum')}</button>
          <button data-aas="blockquote">▏${t('anStyleQuote')}</button>
        </div>
        <div class="nb-an-aa-row">
          <button data-aab="bold"><b>B</b></button>
          <button data-aab="italic"><i>I</i></button>
          <button data-aab="underline"><u>U</u></button>
          <button data-aab="strikeThrough"><s>S</s></button>
        </div>
        <div class="nb-an-aa-row">
          ${AN_HILITES.map(c=>`<button class="nb-gt-dot" data-aah="${c}" style="background:${c}"></button>`).join('')}
        </div>
      </div>`, {cls:'nb-pop-anaa'});
    pop.querySelectorAll('button').forEach(b=>b.addEventListener('mousedown', e=>e.preventDefault()));
    pop.querySelectorAll('[data-aas]').forEach(b=>b.addEventListener('click', ()=>{ exec('formatBlock','<'+b.dataset.aas+'>'); closePopover(); }));
    pop.querySelectorAll('[data-aal]').forEach(b=>b.addEventListener('click', ()=>{
      const k = b.dataset.aal;
      if(k==='ol') exec('insertOrderedList');
      else {
        exec('insertUnorderedList');
        if(k==='dash'){
          const s = window.getSelection();
          let n = s && s.anchorNode; if(n && n.nodeType===3) n = n.parentElement;
          const ul = n && n.closest ? n.closest('ul') : null;
          if(ul) ul.classList.add('nb-an-dash');
        }
      }
      closePopover();
    }));
    pop.querySelectorAll('[data-aab]').forEach(b=>b.addEventListener('click', ()=>exec(b.dataset.aab)));
    pop.querySelectorAll('[data-aah]').forEach(b=>b.addEventListener('click', ()=>{ exec('hiliteColor', b.dataset.aah); closePopover(); }));
  }

  /* ---------- clipe: foto/vídeo, gravar áudio, anexar arquivo ---------- */
  function anClipPop(anchor, insertHtml){
    if(anRec){ anRec.stop(); return; } // clicar de novo para a gravação em curso
    const pop = openPopover(anchor, `
      <div class="nb-pop-list">
        <button data-ac="pv">🖼 ${t('anPhotoVideo')}</button>
        <button data-ac="rec">🎙 ${t('anRecAudio')}</button>
        <button data-ac="file">📄 ${t('anAttachFile')}</button>
      </div>
      <input type="file" id="anPvInp" accept="image/*,video/*" hidden>
      <input type="file" id="anFileInp" hidden>`);
    const attach = async f => {
      if(!f) return;
      if(/^image\//.test(f.type)){ const u = await uploadImage(f); if(u) insertHtml(`<img src="${esc(u)}">`); return; }
      if(f.size > 8*1024*1024){ toast(t('imgTooBig'), true); return; }
      const u = await blobToDataURL(f);
      if(/^video\//.test(f.type)) insertHtml(`<video controls src="${u}"></video>`);
      else insertHtml(`<a class="nb-an-file" download="${esc(f.name)}" href="${u}">📄 ${esc(f.name)}</a>`);
    };
    pop.querySelector('[data-ac="pv"]').addEventListener('click', ()=>pop.querySelector('#anPvInp').click());
    pop.querySelector('#anPvInp').addEventListener('change', e=>{ const f=e.target.files[0]; closePopover(); attach(f); });
    pop.querySelector('[data-ac="file"]').addEventListener('click', ()=>pop.querySelector('#anFileInp').click());
    pop.querySelector('#anFileInp').addEventListener('change', e=>{ const f=e.target.files[0]; closePopover(); attach(f); });
    pop.querySelector('[data-ac="rec"]').addEventListener('click', ()=>{
      closePopover();
      if(!navigator.mediaDevices || !window.MediaRecorder){ toast(t('anRecFail'), true); return; }
      navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
        const mr = new MediaRecorder(stream); const chunks = [];
        mr.ondataavailable = e=>{ if(e.data && e.data.size) chunks.push(e.data); };
        mr.onstop = ()=>{
          stream.getTracks().forEach(tk=>tk.stop()); anRec = null;
          const blob = new Blob(chunks, {type: mr.mimeType||'audio/webm'});
          if(blob.size > 8*1024*1024){ toast(t('imgTooBig'), true); return; }
          blobToDataURL(blob).then(u=>insertHtml(`<audio controls src="${u}"></audio>`));
        };
        mr.start(); anRec = mr; toast(t('anRecording'), true);
      }).catch(()=>toast(t('anRecFail'), true));
    });
  }

  /* ---------- menu ⋯ da nota ---------- */
  function anNoteMenu(anchor, n, inTrash){
    if(inTrash){ anAttPop(anchor, [n]); return; }
    const pop = openPopover(anchor, `<div class="nb-pop-list">
      <button data-am="pin">📌 ${n.pinned?t('anUnpin'):t('anPin')}</button>
      <button data-am="find">🔍 ${t('anFind')}</button>
      <button data-am="move">📁 ${t('anMoveTo')} ›</button>
      <button data-am="recent">🕘 ${t('anRecent')} ›</button>
      <button data-am="calc">🟰 ${t('anCalc')} ›</button>
      <button data-am="att">🖼 ${t('anAttOfNote')} ›</button>
      <button data-am="del" class="nb-pm-danger">🗑 ${t('anDelNote')}</button>
    </div>`);
    pop.querySelector('[data-am="pin"]').addEventListener('click', ()=>{ n.pinned = !n.pinned; anPersist(); closePopover(); render(); });
    pop.querySelector('[data-am="find"]').addEventListener('click', ()=>{
      const p2 = openPopover(anchor, `<div class="nb-renpop">
        <input id="anFindInp" placeholder="${t('anFind')}...">
        <button class="nb-btn nb-btn-primary" id="anFindOk">🔍</button></div>`);
      const inp = p2.querySelector('#anFindInp'); inp.focus();
      const go = ()=>{ const q = inp.value.trim(); if(q) anFindInNote(q); };
      p2.querySelector('#anFindOk').addEventListener('click', go);
      inp.addEventListener('keydown', e=>{ if(e.key==='Enter') go(); });
    });
    pop.querySelector('[data-am="move"]').addEventListener('click', ()=>{
      const opts = [{id:null, name:t('anNotes')}].concat(AN.folders.filter(f=>!f.smart));
      const p2 = openPopover(anchor, `<div class="nb-pop-list">
        ${opts.map((f,i)=>`<button data-mv="${i}" class="${(n.folderId||null)===(f.id||null)?'nb-on':''}">📁 ${esc(f.name)}</button>`).join('')}
      </div>`);
      p2.querySelectorAll('[data-mv]').forEach(b=>b.addEventListener('click', ()=>{
        n.folderId = opts[+b.dataset.mv].id || null; n.updated = Date.now();
        anPersist(); closePopover(); render();
      }));
    });
    pop.querySelector('[data-am="recent"]').addEventListener('click', ()=>{
      const rec = AN.notes.filter(x=>!x.deletedAt).sort((a,b)=>(b.updated||0)-(a.updated||0)).slice(0,5);
      const p2 = openPopover(anchor, `<div class="nb-pop-list">
        ${rec.map(x=>`<button data-rc="${x.id}">${esc(anTitleOf(x))}</button>`).join('')||`<div class="nb-cpick-empty">—</div>`}
      </div>`);
      p2.querySelectorAll('[data-rc]').forEach(b=>b.addEventListener('click', ()=>{ closePopover(); anV.noteId = b.dataset.rc; anSyncUrl(); render(); }));
    });
    pop.querySelector('[data-am="calc"]').addEventListener('click', ()=>{
      const res = anCalcResults(n);
      openPopover(anchor, `<div><strong class="nb-pop-title">${t('anCalc')}</strong>
        ${res.length?`<div class="nb-pop-list">${res.map(r=>`<button class="nb-an-calcrow">${esc(r)}</button>`).join('')}</div>`
                    :`<div class="nb-cpick-empty">${t('anNoCalc')}</div>`}</div>`);
    });
    pop.querySelector('[data-am="att"]').addEventListener('click', ()=>anAttPop(anchor, [n]));
    pop.querySelector('[data-am="del"]').addEventListener('click', ()=>{
      n.deletedAt = Date.now(); n.pinned = false; anPersist();
      closePopover(); anV.noteId = null; anSyncUrl(); render();
    });
  }
  /* Resultados de Cálculos: expressões "2+2=" no texto viram resultados (versão simples) */
  function anCalcResults(n){
    const out = [];
    const tx = anBlocks(n).join('\n');
    const re = /([0-9][0-9+\-*/().,\s]{0,60}?)\s*=(?![0-9=])/g;
    let m;
    while((m = re.exec(tx))){
      const e = m[1].replace(/,/g,'.').replace(/[^0-9+\-*/().]/g,'');
      if(!/[+\-*/]/.test(e)) continue;
      try{
        const v = Function('"use strict";return ('+e+')')();
        if(typeof v==='number' && isFinite(v)) out.push(e+' = '+(Math.round(v*1e6)/1e6));
      }catch(err){}
    }
    return out.slice(0,12);
  }
  /* Buscar na Nota: seleciona e rola até a primeira ocorrência */
  function anFindInNote(q){
    const ed = root.querySelector('#anEditor'); if(!ed) return;
    const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
    const ql = q.toLowerCase();
    let node;
    while((node = walker.nextNode())){
      const i = node.textContent.toLowerCase().indexOf(ql);
      if(i>=0){
        const r = document.createRange();
        r.setStart(node, i); r.setEnd(node, i+q.length);
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        (node.parentElement||ed).scrollIntoView({block:'center', behavior:'smooth'});
        closePopover(); return;
      }
    }
    toast(t('noResults'), true);
  }

  /* ---------- URL / deep links ---------- */
  function syncUrl(){
    const u = new URL(location.href);
    u.searchParams.set('page','notebooks'); u.searchParams.set('u',USER);
    u.searchParams.delete('folder'); u.searchParams.delete('nb'); u.searchParams.delete('note'); u.searchParams.delete('prefill'); u.searchParams.delete('pg'); u.searchParams.delete('fav');
    if(view.name==='folder') u.searchParams.set('folder', view.folderId);
    else if(view.name==='notebook'){ u.searchParams.set('nb', view.nbId); if(view.page) u.searchParams.set('pg', view.page); }
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
    const pages = bookPages(book);
    pages.push({ id:uid(), html:'<p>'+esc(prefill)+'</p>', strokes:[] });
    book.updated = Date.now(); save();
    return { name:'notebook', nbId:book.id, page:pages.length-1 };
  }
  function initialView(){
    const prefill = params.get('prefill');
    if(prefill) return quickCaptureView(prefill);
    // page=notes vira o app estilo Apple Notes na Fase 5; até lá cai nas pastas
    if(PAGE==='notes') return { name:'folders' };
    const nbId = params.get('nb'), folderId = params.get('folder');
    const pgIdx = Math.max(0, parseInt(params.get('pg')||'0',10)||0);
    if(nbId && bookById(nbId)) return { name:'notebook', nbId, page:pgIdx };
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
