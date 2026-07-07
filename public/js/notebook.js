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
      items.push({
        label: nt.title || '(untitled note)',
        snippetSource: [nt.title, (nt.tags||[]).join(' '), stripHtml(nt.html)].filter(Boolean).join(' — '),
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
      updated:'Updated'
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
      updated:'Atualizado'
    }
  };
  const lang = () => document.documentElement.lang === 'pt-BR' ? 'pt' : 'en';
  const t = k => (T[lang()] && T[lang()][k] !== undefined) ? T[lang()][k] : (T.en[k] !== undefined ? T.en[k] : k);

  const CM = window.CMI18N;
  const cmSpan = (text, cls) => CM ? CM.span(text, cls) : `<span class="${cls||''}">${esc(text)}</span>`;

  /* ---------- constantes de personalização ---------- */
  const FOLDER_COLORS = ['#3d84ff','#7c5cff','#12a150','#e5484d','#f0932b','#0a9fb5','#d64f9e','#8d99ae'];
  const BOOK_ICONS = ['📘','📗','📕','📙','🧠','🫀','🦠','💊','🩺','🔬','🧬','⭐'];
  const PEN_COLORS = ['#182233','#2768ff','#e5484d','#12a150','#f0932b','#7c5cff','#0a9fb5','#ffffff'];
  const SWATCHES = ['#182233','#5f748f','#2768ff','#0a9fb5','#12a150','#f0932b','#e5484d','#d64f9e','#7c5cff','#8c6d2d','#ffffff','#fff176'];
  const PAPERS = [
    {id:'blank',   k:'pBlank',  th:''},
    {id:'ruled-s', k:'pRuledS', th:'nb-th-ruled-s'},
    {id:'ruled-m', k:'pRuledM', th:'nb-th-ruled-m'},
    {id:'ruled-l', k:'pRuledL', th:'nb-th-ruled-l'},
    {id:'grid-s',  k:'pGridS',  th:'nb-th-grid-s'},
    {id:'grid-m',  k:'pGridM',  th:'nb-th-grid-m'},
    {id:'grid-l',  k:'pGridL',  th:'nb-th-grid-l'}
  ];
  const BGS = [{id:'white',k:'bgWhite',c:'#ffffff'},{id:'cream',k:'bgCream',c:'#f7efdc'},{id:'black',k:'bgBlack',c:'#12151c'}];

  const defBook = () => ({ paper:'ruled-m', bg:'white', orientation:'portrait', icon:'📘', cover:{type:'color', value:'#2768ff'} });

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

  /* ---------- render principal ---------- */
  function render(){
    if(!root) return;
    if(CM) CM.bumpToken();
    if(view.name==='folders') renderFolders();
    else if(view.name==='folder') renderFolder();
    else if(view.name==='notebook') renderNotebook();
    else if(view.name==='note') renderNote();
    else if(view.name==='allnotes') renderAllNotes();
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
  function renderFolders(){
    const parts = [{label:t('title')}];
    root.innerHTML = `
      <div class="nb-head">
        <div><h1>${t('title')}</h1>${crumbs(parts)}</div>
        <div class="nb-actions"><button class="nb-btn nb-btn-primary" id="nbNewFolder">${t('newFolder')}</button></div>
      </div>
      ${DB.folders.length ? `<div class="nb-grid">${DB.folders.map(f=>{
        const n = booksIn(f.id).length;
        return `<button class="nb-folder" data-open="${f.id}">
          <span class="nb-item-menu" data-menu="${f.id}" role="button" tabindex="0" aria-label="menu">⋯</span>
          <span class="nb-folder-ico" style="background:${esc(f.color||'#3d84ff')}"></span>
          <strong>${cmSpan(f.name)}</strong>
          <small>${n} ${t('notebooks')}</small>
        </button>`;
      }).join('')}</div>`
      : `<div class="nb-empty"><span class="nb-empty-ico">📂</span>${t('emptyFolders')}</div>`}`;
    root.querySelector('#nbNewFolder').addEventListener('click', ()=>folderModal(null));
    root.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click', e=>{
      if(e.target.closest('[data-menu]')) return;
      view = { name:'folder', folderId: el.dataset.open }; syncUrl(); render();
    }));
    root.querySelectorAll('[data-menu]').forEach(el=>el.addEventListener('click', e=>{
      e.stopPropagation(); folderModal(folderById(el.dataset.menu));
    }));
  }
  function folderModal(folder){
    const isNew = !folder;
    const cur = folder || { name:'', color:FOLDER_COLORS[0] };
    let color = cur.color || FOLDER_COLORS[0];
    const m = openModal(`
      <h3>${isNew?t('newFolder').replace('+ ',''):t('rename')}</h3>
      <div class="nb-field"><label>${t('folderName')}</label><input type="text" id="nbFName" maxlength="60" value="${esc(cur.name)}" /></div>
      <div class="nb-field"><label>${t('color')}</label><div class="nb-color-row" id="nbFColors">
        ${FOLDER_COLORS.map(c=>`<button class="nb-color-dot ${c===color?'nb-on':''}" data-c="${c}" style="background:${c}"></button>`).join('')}
      </div></div>
      <div class="nb-modal-foot">
        ${isNew?'':`<button class="nb-btn nb-btn-danger" id="nbFDel">${t('del')}</button>`}
        <button class="nb-btn nb-btn-ghost" id="nbFCancel">${t('cancel')}</button>
        <button class="nb-btn nb-btn-primary" id="nbFSave">${isNew?t('create'):t('saveBtn')}</button>
      </div>`);
    m.querySelectorAll('[data-c]').forEach(b=>b.addEventListener('click',()=>{
      color = b.dataset.c;
      m.querySelectorAll('[data-c]').forEach(x=>x.classList.toggle('nb-on', x===b));
    }));
    m.querySelector('#nbFCancel').addEventListener('click', closeModal);
    m.querySelector('#nbFSave').addEventListener('click', ()=>{
      const name = m.querySelector('#nbFName').value.trim(); if(!name) return;
      if(isNew) DB.folders.push({ id:uid(), name, color, created:Date.now() });
      else { folder.name = name; folder.color = color; }
      save(); closeModal(); render();
    });
    const del = m.querySelector('#nbFDel');
    if(del) del.addEventListener('click', ()=>{
      if(!confirm(t('confirmDelFolder'))) return;
      booksIn(folder.id).forEach(b=>{ notesIn(b.id).forEach(nt=>deleteRemoteImages(nt.html)); DB.notes = DB.notes.filter(n=>n.notebookId!==b.id); });
      DB.notebooks = DB.notebooks.filter(n=>n.folderId!==folder.id);
      DB.folders = DB.folders.filter(f=>f.id!==folder.id);
      save(); closeModal(); view = { name:'folders' }; syncUrl(); render();
    });
    m.querySelector('#nbFName').focus();
  }

  /* ================= VISÃO: CADERNOS DA PASTA ================= */
  function renderFolder(){
    const folder = folderById(view.folderId);
    if(!folder){ view = { name:'folders' }; return render(); }
    const parts = [
      { label:t('title'), act:()=>{ view={name:'folders'}; syncUrl(); render(); } },
      { label:cmSpan(folder.name), raw:true }
    ];
    const books = booksIn(folder.id);
    root.innerHTML = `
      <div class="nb-head">
        <div><h1>${cmSpan(folder.name)}</h1>${crumbs(parts)}</div>
        <div class="nb-actions"><button class="nb-btn nb-btn-primary" id="nbNewBook">${t('newNotebook')}</button></div>
      </div>
      ${books.length ? `<div class="nb-grid">${books.map(b=>{
        const n = notesIn(b.id).length;
        const cov = b.cover && b.cover.type==='image'
          ? `style="background-image:url('${esc(b.cover.value)}')"`
          : `style="background:${esc((b.cover&&b.cover.value)||'#2768ff')}"`;
        return `<button class="nb-book" data-open="${b.id}">
          <span class="nb-item-menu" data-menu="${b.id}" role="button" tabindex="0" aria-label="menu">⋯</span>
          <span class="nb-book-cover" ${cov}><span class="nb-book-ico">${esc(b.icon||'📘')}</span></span>
          <span class="nb-book-body"><strong>${cmSpan(b.title)}</strong><small>${n} ${t('notes')}</small></span>
        </button>`;
      }).join('')}</div>`
      : `<div class="nb-empty"><span class="nb-empty-ico">📘</span>${t('emptyBooks')}</div>`}`;
    root.querySelector('#nbNewBook').addEventListener('click', ()=>bookModal(null, folder.id));
    root.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click', e=>{
      if(e.target.closest('[data-menu]')) return;
      view = { name:'notebook', nbId: el.dataset.open }; syncUrl(); render();
    }));
    root.querySelectorAll('[data-menu]').forEach(el=>el.addEventListener('click', e=>{
      e.stopPropagation(); bookModal(bookById(el.dataset.menu), folder.id);
    }));
    wireCrumbs(parts);
  }

  function bookModal(book, folderId){
    const isNew = !book;
    const cur = book ? JSON.parse(JSON.stringify(book)) : Object.assign({ title:'' }, defBook());
    let coverType = (cur.cover&&cur.cover.type)||'color';
    let coverValue = (cur.cover&&cur.cover.value)||'#2768ff';
    const m = openModal(`
      <h3>${isNew?t('newNotebook').replace('+ ',''):t('customize')}</h3>
      <div class="nb-field"><label>${t('notebookTitle')}</label><input type="text" id="nbBTitle" maxlength="80" value="${esc(cur.title)}" /></div>
      <div class="nb-field"><label>${t('icon')}</label><div class="nb-opts" id="nbBIcons">
        ${BOOK_ICONS.map(i=>`<button class="nb-opt ${i===cur.icon?'nb-on':''}" data-i="${i}">${i}</button>`).join('')}
      </div></div>
      <div class="nb-field"><label>${t('cover')}</label>
        <div class="nb-cover-line">
          <span class="nb-cover-prev" id="nbCoverPrev"></span>
          <div>
            <div class="nb-color-row" id="nbBCovColors" style="margin-bottom:9px">
              ${FOLDER_COLORS.map(c=>`<button class="nb-color-dot" data-cc="${c}" style="background:${c}"></button>`).join('')}
            </div>
            <button class="nb-btn" id="nbCovUpload">🖼 ${t('coverImage')}</button>
            <input type="file" id="nbCovFile" accept="image/*" hidden />
          </div>
        </div>
      </div>
      <div class="nb-field"><label>${t('paper')}</label><div class="nb-opts" id="nbBPapers">
        ${PAPERS.map(p=>`<button class="nb-paper-thumb ${p.th} ${p.id===cur.paper?'nb-on':''}" data-p="${p.id}" title="${t(p.k)}"></button>`).join('')}
      </div></div>
      <div class="nb-field"><label>${t('bg')}</label><div class="nb-opts" id="nbBBgs">
        ${BGS.map(b=>`<button class="nb-opt ${b.id===cur.bg?'nb-on':''}" data-b="${b.id}"><span class="nb-color-dot" style="width:16px;height:16px;background:${b.c};display:inline-block;border:1px solid rgba(0,0,0,.2)"></span>${t(b.k)}</button>`).join('')}
      </div></div>
      <div class="nb-field"><label>${t('orientation')}</label><div class="nb-opts" id="nbBOri">
        <button class="nb-opt ${cur.orientation!=='landscape'?'nb-on':''}" data-o="portrait">▯ ${t('portrait')}</button>
        <button class="nb-opt ${cur.orientation==='landscape'?'nb-on':''}" data-o="landscape">▭ ${t('landscape')}</button>
      </div></div>
      <div class="nb-modal-foot">
        ${isNew?'':`<button class="nb-btn nb-btn-danger" id="nbBDel">${t('del')}</button>`}
        <button class="nb-btn nb-btn-ghost" id="nbBCancel">${t('cancel')}</button>
        <button class="nb-btn nb-btn-primary" id="nbBSave">${isNew?t('create'):t('saveBtn')}</button>
      </div>`);
    const prev = m.querySelector('#nbCoverPrev');
    const updPrev = ()=>{ if(coverType==='image'){ prev.style.background=''; prev.style.backgroundImage=`url('${coverValue}')`; prev.style.backgroundSize='cover'; } else { prev.style.backgroundImage=''; prev.style.background=coverValue; } };
    updPrev();
    m.querySelectorAll('[data-i]').forEach(b=>b.addEventListener('click',()=>{ cur.icon=b.dataset.i; m.querySelectorAll('[data-i]').forEach(x=>x.classList.toggle('nb-on',x===b)); }));
    m.querySelectorAll('[data-cc]').forEach(b=>b.addEventListener('click',()=>{ coverType='color'; coverValue=b.dataset.cc; updPrev(); }));
    m.querySelector('#nbCovUpload').addEventListener('click',()=>m.querySelector('#nbCovFile').click());
    m.querySelector('#nbCovFile').addEventListener('change', async e=>{
      const f = e.target.files[0]; if(!f) return;
      const url = await uploadImage(f);
      if(url){ coverType='image'; coverValue=url; updPrev(); }
      e.target.value='';
    });
    m.querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click',()=>{ cur.paper=b.dataset.p; m.querySelectorAll('[data-p]').forEach(x=>x.classList.toggle('nb-on',x===b)); }));
    m.querySelectorAll('[data-b]').forEach(b=>b.addEventListener('click',()=>{ cur.bg=b.dataset.b; m.querySelectorAll('[data-b]').forEach(x=>x.classList.toggle('nb-on',x===b)); }));
    m.querySelectorAll('[data-o]').forEach(b=>b.addEventListener('click',()=>{ cur.orientation=b.dataset.o; m.querySelectorAll('[data-o]').forEach(x=>x.classList.toggle('nb-on',x===b)); }));
    m.querySelector('#nbBCancel').addEventListener('click', closeModal);
    m.querySelector('#nbBSave').addEventListener('click', ()=>{
      const title = m.querySelector('#nbBTitle').value.trim(); if(!title) return;
      const data = { title, icon:cur.icon, paper:cur.paper, bg:cur.bg, orientation:cur.orientation, cover:{type:coverType, value:coverValue} };
      if(isNew) DB.notebooks.push(Object.assign({ id:uid(), folderId, created:Date.now(), updated:Date.now() }, data));
      else Object.assign(book, data, { updated:Date.now() });
      save(); closeModal(); render();
    });
    const del = m.querySelector('#nbBDel');
    if(del) del.addEventListener('click', ()=>{
      if(!confirm(t('confirmDelBook'))) return;
      notesIn(book.id).forEach(nt=>deleteRemoteImages(nt.html));
      DB.notes = DB.notes.filter(n=>n.notebookId!==book.id);
      DB.notebooks = DB.notebooks.filter(n=>n.id!==book.id);
      save(); closeModal(); render();
    });
    m.querySelector('#nbBTitle').focus();
  }

  /* ================= VISÃO: NOTAS DO CADERNO ================= */
  function noteRow(nt, showBook){
    const nb = bookById(nt.notebookId);
    const prevTxt = stripHtml(nt.html).slice(0,180);
    return `<button class="nb-note-row" data-note="${nt.id}">
      <span class="nb-note-row-ico">📝</span>
      <span class="nb-note-row-main">
        <strong>${cmSpan(nt.title||t('untitled'))}</strong>
        ${prevTxt?`<span class="nb-note-prev">${esc(prevTxt)}</span>`:''}
        <span class="nb-note-meta">
          ${showBook&&nb?`<span class="nb-note-book-badge">${esc(nb.icon||'📘')} ${cmSpan(nb.title)}</span>`:''}
          <span class="nb-note-date">${t('updated')}: ${fmtDate(nt.updated)}</span>
          ${(nt.tags||[]).map(tag=>`<span class="nb-tag">${cmSpan(tag)}</span>`).join('')}
        </span>
      </span>
    </button>`;
  }
  function filterNotes(list, q){
    q = (q||'').toLowerCase().trim(); if(!q) return list;
    return list.filter(nt=>{
      const hay = [nt.title, (nt.tags||[]).join(' '), stripHtml(nt.html)].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  function renderNotebook(){
    const book = bookById(view.nbId);
    if(!book){ view = { name:'folders' }; return render(); }
    const folder = folderById(book.folderId);
    const parts = [
      { label:t('title'), act:()=>{ view={name:'folders'}; syncUrl(); render(); } },
      { label:cmSpan(folder?folder.name:''), raw:true, act:()=>{ view={name:'folder', folderId:book.folderId}; syncUrl(); render(); } },
      { label:cmSpan(book.title), raw:true }
    ];
    const all = notesIn(book.id);
    const list = filterNotes(all, view.q);
    root.innerHTML = `
      <div class="nb-head">
        <div><h1>${esc(book.icon||'📘')} ${cmSpan(book.title)}</h1>${crumbs(parts)}</div>
        <div class="nb-actions">
          <button class="nb-btn" id="nbBookCfg">⚙ ${t('customize')}</button>
          <button class="nb-btn nb-btn-primary" id="nbNewNote">${t('newNote')}</button>
        </div>
      </div>
      <div class="nb-note-tools">
        <div class="nb-search"><svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input id="nbNoteSearch" type="text" placeholder="${t('searchNotes')}" value="${esc(view.q||'')}" /></div>
      </div>
      ${list.length ? `<div class="nb-note-list">${list.map(nt=>noteRow(nt,false)).join('')}</div>`
        : `<div class="nb-empty"><span class="nb-empty-ico">📝</span>${all.length?'—':t('emptyNotes')}</div>`}`;
    root.querySelector('#nbBookCfg').addEventListener('click', ()=>bookModal(book, book.folderId));
    root.querySelector('#nbNewNote').addEventListener('click', ()=>{
      const nt = { id:uid(), notebookId:book.id, title:'', tags:[], html:'', strokes:[], created:Date.now(), updated:Date.now() };
      DB.notes.push(nt); save();
      view = { name:'note', noteId:nt.id }; syncUrl(); render();
    });
    const s = root.querySelector('#nbNoteSearch');
    s.addEventListener('input', ()=>{ view.q = s.value; const pos = s.selectionStart; render(); const s2 = root.querySelector('#nbNoteSearch'); s2.focus(); s2.setSelectionRange(pos,pos); });
    root.querySelectorAll('[data-note]').forEach(el=>el.addEventListener('click', ()=>{
      view = { name:'note', noteId: el.dataset.note }; syncUrl(); render();
    }));
    wireCrumbs(parts);
  }

  /* ================= VISÃO: TODAS AS NOTAS (page=notes) ================= */
  function renderAllNotes(){
    const all = DB.notes.slice().sort((a,b)=>(b.updated||0)-(a.updated||0));
    const list = filterNotes(all, view.q);
    root.innerHTML = `
      <div class="nb-head">
        <div><h1>${t('titleNotes')}</h1>${crumbs([{label:t('titleNotes')}])}</div>
      </div>
      <div class="nb-note-tools">
        <div class="nb-search"><svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input id="nbNoteSearch" type="text" placeholder="${t('searchNotes')}" value="${esc(view.q||'')}" /></div>
      </div>
      ${list.length ? `<div class="nb-note-list">${list.map(nt=>noteRow(nt,true)).join('')}</div>`
        : `<div class="nb-empty"><span class="nb-empty-ico">📝</span>${t('emptyAll')}</div>`}`;
    const s = root.querySelector('#nbNoteSearch');
    s.addEventListener('input', ()=>{ view.q = s.value; const pos = s.selectionStart; render(); const s2 = root.querySelector('#nbNoteSearch'); s2.focus(); s2.setSelectionRange(pos,pos); });
    root.querySelectorAll('[data-note]').forEach(el=>el.addEventListener('click', ()=>{
      const nt = noteById(el.dataset.note);
      if(nt) location.href = `app.html?page=notebooks&u=${USER}&nb=${nt.notebookId}&note=${nt.id}`;
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
    const parts = [
      { label:t('title'), act:()=>{ view={name:'folders'}; syncUrl(); render(); } },
      { label:cmSpan(folder?folder.name:''), raw:true, act:()=>{ view={name:'folder', folderId:book.folderId}; syncUrl(); render(); } },
      { label:cmSpan(book.title||''), raw:true, act:()=>{ view={name:'notebook', nbId:nt.notebookId}; syncUrl(); render(); } },
      { label:cmSpan(nt.title||t('untitled')), raw:true }
    ];
    const drawing = view.mode==='draw';
    const swatchPop = (id) => `<div class="nb-swatch-pop" id="${id}" hidden>
      ${SWATCHES.map(c=>`<button class="nb-sw" data-sw="${c}" style="background:${c}"></button>`).join('')}
      <input type="color" class="nb-sw-custom" data-swc value="#2768ff" />
    </div>`;
    root.innerHTML = `
      <div class="nb-ed-head">
        <button class="nb-btn nb-btn-ghost" id="nbBack">${t('back')}</button>
        <input class="nb-ed-title" id="nbNoteTitle" maxlength="120" placeholder="${t('untitled')}" value="${esc(nt.title)}" />
        <span class="nb-savestate" id="nbSaveState">${t('saved')}</span>
        <div class="nb-mode">
          <button id="nbModeType" class="${drawing?'':'nb-on'}">${t('typeMode')}</button>
          <button id="nbModeDraw" class="${drawing?'nb-on':''}">${t('drawMode')}</button>
        </div>
        <button class="nb-btn nb-btn-danger" id="nbDelNote">🗑</button>
      </div>
      <div class="nb-tags-line">
        ${(nt.tags||[]).map((tag,i)=>`<span class="nb-tag">${cmSpan(tag)} <button data-deltag="${i}" style="border:0;background:transparent;color:inherit;cursor:pointer;padding:0 0 0 4px">✕</button></span>`).join('')}
        <input id="nbTagInput" type="text" placeholder="${t('tagsPh')}" maxlength="30" />
      </div>
      ${drawing ? `
      <div class="nb-drawbar" id="nbDrawBar">
        ${PEN_COLORS.map(c=>`<button class="nb-pen" data-pen="${c}" style="background:${c};${c==='#ffffff'?'box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)':''}"></button>`).join('')}
        <span class="nb-tb-sep"></span>
        <button class="nb-btn" id="nbEraser">◻ ${t('eraser')}</button>
        <label>${t('width')} <input type="range" id="nbPenW" min="2" max="26" value="4" /></label>
        <span class="nb-tb-sep"></span>
        <button class="nb-btn" id="nbUndoStroke">↩ ${t('undoStroke')}</button>
        <button class="nb-btn nb-btn-danger" id="nbClearDraw">${t('clearDraw')}</button>
      </div>` : `
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
        <span class="nb-tb-sep"></span>
        <button class="nb-tb" id="nbImgBtn" title="${t('tipImg')}">🖼</button>
        <input type="file" id="nbImgFile" accept="image/*" hidden />
        <button class="nb-tb" data-cmd="removeFormat" title="${t('tipClear')}">⌫A</button>
      </div>`}
      <div class="nb-page-wrap">
        <div class="nb-page nb-bg-${esc(book.bg||'white')} ${book.paper&&book.paper!=='blank'?'nb-paper-'+esc(book.paper):''} ${book.orientation==='landscape'?'nb-o-landscape':''} ${drawing?'nb-drawmode':''}" id="nbPage">
          <div class="nb-page-text" id="nbEditor" contenteditable="${drawing?'false':'true'}" data-ph="${t('notePh')}"></div>
          <canvas class="nb-page-draw" id="nbCanvas"></canvas>
        </div>
      </div>`;
    wireCrumbs(parts);

    const editor = root.querySelector('#nbEditor');
    editor.innerHTML = nt.html || '';

    const scheduleSave = ()=>{
      markSaving();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(()=>{ if(view.mode!=='draw') nt.html = editor.innerHTML; nt.updated = Date.now(); save(); }, 500);
    };

    /* --- casca: voltar, título, tags, excluir, modo --- */
    root.querySelector('#nbBack').addEventListener('click', ()=>{ flushNoteSave(nt, editor); view={name:'notebook', nbId:nt.notebookId}; syncUrl(); render(); });
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
    root.querySelector('#nbDelNote').addEventListener('click', ()=>{
      if(!confirm(t('confirmDelNote'))) return;
      deleteRemoteImages(nt.html);
      DB.notes = DB.notes.filter(n=>n.id!==nt.id);
      save(); view={name:'notebook', nbId:nt.notebookId}; syncUrl(); render();
    });
    root.querySelector('#nbModeType').addEventListener('click', ()=>{ if(view.mode!=='draw')return; flushNoteSave(nt, editor); view.mode='type'; render(); });
    root.querySelector('#nbModeDraw').addEventListener('click', ()=>{ if(view.mode==='draw')return; flushNoteSave(nt, editor); view.mode='draw'; render(); });

    /* --- canvas de desenho (sempre visível; interativo só no modo draw) --- */
    setupCanvas(nt, book, drawing);

    if(drawing){
      wireDrawBar(nt);
      return; // toolbar de texto não existe neste modo
    }

    /* --- editor de texto --- */
    try{ document.execCommand('styleWithCSS', false, true); }catch(e){}
    try{ document.execCommand('defaultParagraphSeparator', false, 'p'); }catch(e){}
    editor.addEventListener('input', scheduleSave);
    editor.addEventListener('blur', ()=>flushNoteSave(nt, editor));

    const exec = (cmd, val)=>{ editor.focus(); document.execCommand(cmd, false, val); scheduleSave(); };
    root.querySelectorAll('#nbToolbar [data-cmd]').forEach(b=>{
      b.addEventListener('mousedown', e=>e.preventDefault()); // preserva a seleção
      b.addEventListener('click', ()=>exec(b.dataset.cmd));
    });
    root.querySelector('#nbFmtBlock').addEventListener('change', e=>{ exec('formatBlock', '<'+e.target.value+'>'); e.target.value='p'; });
    root.querySelector('#nbFontSel').addEventListener('change', e=>{ if(e.target.value) exec('fontName', e.target.value); e.target.selectedIndex=0; });
    root.querySelector('#nbSizeSel').addEventListener('change', e=>{ if(e.target.value) exec('fontSize', e.target.value); e.target.selectedIndex=0; });

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

    // imagens: botão, colagem (Cmd+V) e arrastar-soltar
    const insertImg = url => {
      editor.focus();
      document.execCommand('insertImage', false, url);
      scheduleSave();
    };
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
  function flushNoteSave(nt, editor){
    clearTimeout(saveTimer);
    if(editor && view.mode!=='draw') nt.html = editor.innerHTML;
    nt.updated = Date.now(); save();
  }

  /* ---------- desenho à mão (canvas, strokes vetoriais) ---------- */
  const CANVAS_W = { portrait:900, landscape:1240 }, CANVAS_H = { portrait:1215, landscape:918 };
  let drawState = null;
  function setupCanvas(nt, book, interactive){
    const canvas = root.querySelector('#nbCanvas'); if(!canvas) return;
    const ori = book.orientation==='landscape' ? 'landscape' : 'portrait';
    canvas.width = CANVAS_W[ori]; canvas.height = CANVAS_H[ori];
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;
    nt.strokes = nt.strokes || [];
    if(!ctx) return;
    const redraw = ()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      nt.strokes.forEach(s=>drawStroke(ctx, s));
    };
    redraw();
    drawState = { canvas, ctx, nt, redraw, color:PEN_COLORS[0], width:4, eraser:false };
    if(!interactive) return;

    let cur = null;
    const pos = e => {
      const r = canvas.getBoundingClientRect();
      return [ Math.round((e.clientX - r.left) * canvas.width / r.width),
               Math.round((e.clientY - r.top) * canvas.height / r.height) ];
    };
    canvas.addEventListener('pointerdown', e=>{
      e.preventDefault(); canvas.setPointerCapture(e.pointerId);
      const [x,y] = pos(e);
      cur = { c: drawState.eraser ? '#000' : drawState.color, w: drawState.eraser ? drawState.width*3 : drawState.width, e: drawState.eraser ? 1 : 0, p:[x,y] };
    });
    canvas.addEventListener('pointermove', e=>{
      if(!cur) return; e.preventDefault();
      const [x,y] = pos(e);
      const n = cur.p.length;
      if(n>=2 && Math.abs(cur.p[n-2]-x)<2 && Math.abs(cur.p[n-1]-y)<2) return; // simplificação
      cur.p.push(x,y);
      drawStroke(drawState.ctx, cur, n-2);
    });
    const end = e=>{
      if(!cur) return;
      if(cur.p.length===2) cur.p.push(cur.p[0]+1, cur.p[1]+1); // ponto único vira tracinho
      nt.strokes.push(cur); cur = null;
      nt.updated = Date.now(); save();
      drawState.redraw();
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }
  function drawStroke(ctx, s, fromIdx){
    ctx.save();
    ctx.globalCompositeOperation = s.e ? 'destination-out' : 'source-over';
    ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const p = s.p; const start = Math.max(0, fromIdx||0);
    ctx.beginPath();
    ctx.moveTo(p[start], p[start+1]);
    for(let i=start+2; i<p.length; i+=2) ctx.lineTo(p[i], p[i+1]);
    ctx.stroke();
    ctx.restore();
  }
  function wireDrawBar(nt){
    const bar = root.querySelector('#nbDrawBar'); if(!bar || !drawState) return;
    const pens = bar.querySelectorAll('[data-pen]');
    const eraserBtn = bar.querySelector('#nbEraser');
    const setPen = c => { drawState.color = c; drawState.eraser = false;
      pens.forEach(p=>p.classList.toggle('nb-on', p.dataset.pen===c));
      eraserBtn.classList.remove('nb-on'); };
    pens.forEach(p=>p.addEventListener('click', ()=>setPen(p.dataset.pen)));
    setPen(PEN_COLORS[0]);
    eraserBtn.addEventListener('click', ()=>{ drawState.eraser = !drawState.eraser;
      eraserBtn.classList.toggle('nb-on', drawState.eraser);
      if(drawState.eraser) pens.forEach(p=>p.classList.remove('nb-on')); else setPen(drawState.color); });
    bar.querySelector('#nbPenW').addEventListener('input', e=>{ drawState.width = +e.target.value; });
    bar.querySelector('#nbUndoStroke').addEventListener('click', ()=>{
      nt.strokes.pop(); nt.updated = Date.now(); save(); drawState.redraw();
    });
    bar.querySelector('#nbClearDraw').addEventListener('click', ()=>{
      if(!confirm(t('confirmClearDraw'))) return;
      nt.strokes = []; nt.updated = Date.now(); save(); drawState.redraw();
    });
  }

  /* ---------- URL / deep links ---------- */
  function syncUrl(){
    const u = new URL(location.href);
    u.searchParams.set('page','notebooks'); u.searchParams.set('u',USER);
    u.searchParams.delete('folder'); u.searchParams.delete('nb'); u.searchParams.delete('note');
    if(view.name==='folder') u.searchParams.set('folder', view.folderId);
    else if(view.name==='notebook') u.searchParams.set('nb', view.nbId);
    else if(view.name==='note'){ const nt=noteById(view.noteId); if(nt){ u.searchParams.set('nb', nt.notebookId); u.searchParams.set('note', view.noteId); } }
    else if(view.name==='allnotes') u.searchParams.set('page','notes');
    history.replaceState(null,'', 'app.html'+u.search);
  }
  function initialView(){
    if(PAGE==='notes') return { name:'allnotes' };
    const noteId = params.get('note'), nbId = params.get('nb'), folderId = params.get('folder');
    if(noteId && noteById(noteId)) return { name:'note', noteId };
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
    // re-renderiza ao trocar de idioma (mesmo padrão do módulo Flashcards)
    new MutationObserver(()=>render()).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
