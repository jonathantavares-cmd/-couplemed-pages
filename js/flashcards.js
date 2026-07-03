/* CoupleMed — Módulo Flashcards v2 (Anki-like + banco compartilhado entre usuários) */
(function(){
  'use strict';
  const params = new URLSearchParams(location.search);
  if((params.get('page')||'home') !== 'flashcards') return;
  const USER = params.get('u') || 'guest';
  const KEY = `couplemed_fc_${USER}`;
  const SHARED_KEY = 'couplemed_fc_shared';

  /* ---------- i18n ---------- */
  const T = {
    en: {
      title:'Flashcards', breadcrumb:'Home › Study › Flashcards',
      decks:'My decks', due:'Due today', fresh:'New cards', acc:'Accuracy',
      create:'+ Create flashcard', imp:'Import batch', reviewNow:'Review now',
      srcMine:'My flashcards', srcShared:'Shared bank', srcAll:'All',
      deckEmpty:'No decks yet. Create your first flashcard to get started.',
      cards:'cards', newLbl:'new', dueLbl:'due', view:'View cards', review:'Review',
      edit:'Edit', back:'← Back', noCards:'This deck has no cards yet.',
      front:'Front (question)', backSide:'Back (answer)', tags:'Tags (comma separated)', deck:'Deck',
      newDeck:'+ New deck…', deckName:'Deck name', save:'Save', cancel:'Cancel',
      shareLbl:'Share with other users (adds to the shared bank)',
      sharedBadge:'shared', byOwner:o=>`by ${o}`, sharedBank:'Shared bank',
      sharedEmpty:'No shared cards from other users yet.',
      share:'Share', unshare:'Unshare',
      impHint:'One card per line, using :: to separate front and back:', impExample:'What is troponin? :: Cardiac protein released in myocardial injury',
      impBtn:'Import cards',
      showAnswer:'Show answer', again:'Again', hard:'Hard', good:'Good', easy:'Easy',
      sessionDone:'Session complete!', sessionStats:(a,b)=>`${a} of ${b} answers were Good or Easy.`,
      backDash:'Back to dashboard', nothingDue:'Nothing due for review in this source. Great job!',
      confirmDeck:'Delete this deck and all its cards?', confirmCard:'Delete this card?',
      progress:(i,n)=>`Card ${i} of ${n}`, days:d=>d===1?'1 day':`${d} days`, minLbl:'<10 min',
      required:'Front and back are required.', deckRequired:'Select or create a deck.'
    },
    pt: {
      title:'Flashcards', breadcrumb:'Home › Estudos › Flashcards',
      decks:'Meus decks', due:'Revisões de hoje', fresh:'Cards novos', acc:'Taxa de acerto',
      create:'+ Criar flashcard', imp:'Importar em lote', reviewNow:'Revisar agora',
      srcMine:'Meus flashcards', srcShared:'Banco compartilhado', srcAll:'Todos',
      deckEmpty:'Nenhum deck ainda. Crie seu primeiro flashcard para começar.',
      cards:'cards', newLbl:'novos', dueLbl:'a revisar', view:'Ver cards', review:'Revisar',
      edit:'Editar', back:'← Voltar', noCards:'Este deck ainda não tem cards.',
      front:'Frente (pergunta)', backSide:'Verso (resposta)', tags:'Tags (separadas por vírgula)', deck:'Deck',
      newDeck:'+ Novo deck…', deckName:'Nome do deck', save:'Salvar', cancel:'Cancelar',
      shareLbl:'Compartilhar com os outros usuários (entra no banco compartilhado)',
      sharedBadge:'compartilhado', byOwner:o=>`por ${o}`, sharedBank:'Banco compartilhado',
      sharedEmpty:'Ainda não há cards compartilhados por outros usuários.',
      share:'Compartilhar', unshare:'Descompartilhar',
      impHint:'Um card por linha, usando :: para separar frente e verso:', impExample:'O que é troponina? :: Proteína cardíaca liberada em lesão miocárdica',
      impBtn:'Importar cards',
      showAnswer:'Mostrar resposta', again:'Again', hard:'Hard', good:'Good', easy:'Easy',
      sessionDone:'Sessão concluída!', sessionStats:(a,b)=>`${a} de ${b} respostas foram Good ou Easy.`,
      backDash:'Voltar ao painel', nothingDue:'Nada para revisar nesta fonte. Excelente!',
      confirmDeck:'Excluir este deck e todos os seus cards?', confirmCard:'Excluir este card?',
      progress:(i,n)=>`Card ${i} de ${n}`, days:d=>d===1?'1 dia':`${d} dias`, minLbl:'<10 min',
      required:'Frente e verso são obrigatórios.', deckRequired:'Selecione ou crie um deck.'
    }
  };
  const lang = () => document.documentElement.lang === 'pt-BR' ? 'pt' : 'en';
  const t = k => T[lang()][k];
  const ownerName = o => o.charAt(0).toUpperCase() + o.slice(1);

  /* ---------- persistência ---------- */
  function loadUser(){
    try{ const d = JSON.parse(localStorage.getItem(KEY)); if(d && d.decks && d.cards){
      d.stats = d.stats || {reviews:0, correct:0};
      d.sharedProgress = d.sharedProgress || {};
      d.prefs = d.prefs || {source:'mine'};
      return d; } }catch(e){}
    return {decks:[], cards:[], stats:{reviews:0, correct:0}, sharedProgress:{}, prefs:{source:'mine'}};
  }
  function loadShared(){
    try{ const d = JSON.parse(localStorage.getItem(SHARED_KEY)); if(d && d.cards) return d; }catch(e){}
    return {cards:[]};
  }
  const DB = loadUser();
  const SH = loadShared();
  const save = () => localStorage.setItem(KEY, JSON.stringify(DB));
  const saveShared = () => localStorage.setItem(SHARED_KEY, JSON.stringify(SH));

  const uid = p => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const today = () => new Date().toISOString().slice(0,10);
  function addDays(n){ const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ---------- banco compartilhado ---------- */
  const sharedId = c => `${USER}:${c.id}`;
  function syncShare(card){
    const deck = DB.decks.find(d => d.id === card.deckId);
    const idx = SH.cards.findIndex(s => s.id === sharedId(card));
    if(card.shared){
      const entry = {id: sharedId(card), owner: USER, deckName: deck ? deck.name : 'Deck',
        front: card.front, back: card.back, tags: card.tags, createdAt: card.createdAt};
      if(idx >= 0) SH.cards[idx] = entry; else SH.cards.push(entry);
    } else if(idx >= 0) SH.cards.splice(idx, 1);
    saveShared();
  }
  function removeFromShared(card){ const i = SH.cards.findIndex(s => s.id === sharedId(card)); if(i>=0){ SH.cards.splice(i,1); saveShared(); } }
  const foreignShared = () => SH.cards.filter(s => s.owner !== USER);
  function progressOf(sc){
    if(!DB.sharedProgress[sc.id]) DB.sharedProgress[sc.id] = {interval:1, ease:2.5, repetitions:0, lapses:0, dueDate: today()};
    return DB.sharedProgress[sc.id];
  }

  /* ---------- consultas ---------- */
  const deckCards = id => DB.cards.filter(c => c.deckId === id);
  const isDueOwn = c => c.dueDate <= today();
  const isNewOwn = c => c.repetitions === 0 && c.lapses === 0;
  const dueOwn = deckId => DB.cards.filter(c => (!deckId || c.deckId === deckId) && isDueOwn(c));
  const dueShared = () => foreignShared().filter(sc => progressOf(sc).dueDate <= today());
  function dueBySource(src){
    src = src || DB.prefs.source;
    if(src === 'mine') return dueOwn().map(c => ({kind:'own', card:c}));
    if(src === 'shared') return dueShared().map(sc => ({kind:'shared', card:sc}));
    return dueOwn().map(c => ({kind:'own', card:c})).concat(dueShared().map(sc => ({kind:'shared', card:sc})));
  }

  /* ---------- repetição espaçada ---------- */
  function applyRating(state, rating){
    if(rating === 'again'){ state.repetitions = 0; state.interval = 1; state.lapses += 1; }
    else if(rating === 'hard'){ state.repetitions += 1; state.interval = Math.max(2, Math.round(state.interval * 1.2)); }
    else if(rating === 'good'){ state.repetitions += 1; state.interval = Math.max(3, Math.round(state.interval * state.ease)); }
    else { state.repetitions += 1; state.ease = Math.min(3.2, state.ease + 0.15); state.interval = Math.round(state.interval * (state.ease + 0.3)); }
    state.dueDate = addDays(state.interval);
  }
  function previewInterval(state, rating){
    if(rating === 'again') return null;
    if(rating === 'hard') return Math.max(2, Math.round(state.interval * 1.2));
    if(rating === 'good') return Math.max(3, Math.round(state.interval * state.ease));
    return Math.round(state.interval * (Math.min(3.2, state.ease + 0.15) + 0.3));
  }

  /* ---------- estado / boot ---------- */
  let view = {name:'dash'};
  let root = null;
  function boot(){
    const host = document.querySelector('#internalContent .internal-card');
    if(!host) return;
    host.classList.add('fc-host');
    host.innerHTML = '<div id="fcRoot"></div>';
    root = host.querySelector('#fcRoot');
    render();
    new MutationObserver(render).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  }

  /* ---------- render ---------- */
  function render(){
    if(view.name === 'dash') renderDash();
    else if(view.name === 'deck') renderDeck(view.deckId);
    else if(view.name === 'review') renderReview();
  }

  function sourceSelector(){
    const src = DB.prefs.source;
    return `<div class="fc-src" role="tablist">
      ${['mine','shared','all'].map(s => `<button class="fc-src-btn ${src===s?'on':''}" data-act="src" data-src="${s}">${t(s==='mine'?'srcMine':s==='shared'?'srcShared':'srcAll')}</button>`).join('')}
    </div>`;
  }

  function header(){
    return `<div class="fc-head"><div><h1 class="fc-title">${t('title')}</h1><p class="fc-bread">${t('breadcrumb')}</p></div>
      <div class="fc-actions"><button class="fc-btn fc-primary" data-act="create">${t('create')}</button>
      <button class="fc-btn" data-act="import">${t('imp')}</button>
      <button class="fc-btn fc-review" data-act="review-src">▶ ${t('reviewNow')} (${dueBySource().length})</button></div></div>`;
  }

  function renderDash(){
    const totalNew = DB.cards.filter(isNewOwn).length;
    const acc = DB.stats.reviews ? Math.round(100*DB.stats.correct/DB.stats.reviews) : 0;
    const stats = `<div class="fc-stats">
      <div class="fc-stat"><strong>${DB.decks.length}</strong><span>${t('decks')}</span></div>
      <div class="fc-stat"><strong>${dueBySource().length}</strong><span>${t('due')}</span></div>
      <div class="fc-stat"><strong>${totalNew}</strong><span>${t('fresh')}</span></div>
      <div class="fc-stat"><strong>${acc}%</strong><span>${t('acc')}</span></div></div>`;

    let decks;
    if(!DB.decks.length){ decks = `<p class="fc-empty">${t('deckEmpty')}</p>`; }
    else{
      decks = '<div class="fc-decks">' + DB.decks.map(d => {
        const cs = deckCards(d.id);
        const due = cs.filter(isDueOwn).length, nw = cs.filter(isNewOwn).length;
        return `<div class="fc-deck">
          <div class="fc-deck-info"><strong>${esc(d.name)}</strong>
          <span>${cs.length} ${t('cards')} · ${nw} ${t('newLbl')} · ${due} ${t('dueLbl')}</span></div>
          <div class="fc-deck-actions">
            <button class="fc-btn fc-sm fc-primary" data-act="review-deck" data-deck="${d.id}" ${due?'':'disabled'}>${t('review')} (${due})</button>
            <button class="fc-btn fc-sm" data-act="open-deck" data-deck="${d.id}">${t('view')}</button>
            <button class="fc-btn fc-sm fc-danger" data-act="del-deck" data-deck="${d.id}">✕</button>
          </div></div>`;
      }).join('') + '</div>';
    }

    /* painel do banco compartilhado (cards dos outros usuários) */
    const fs = foreignShared();
    const groups = {};
    fs.forEach(sc => { const k = sc.owner + '|' + sc.deckName; (groups[k] = groups[k] || []).push(sc); });
    const sharedRows = Object.keys(groups).map(k => {
      const [owner, deckName] = k.split('|');
      const list = groups[k];
      const due = list.filter(sc => progressOf(sc).dueDate <= today()).length;
      return `<div class="fc-deck fc-shared-deck">
        <div class="fc-deck-info"><strong>${esc(deckName)} <em class="fc-owner">${t('byOwner')(ownerName(owner))}</em></strong>
        <span>${list.length} ${t('cards')} · ${due} ${t('dueLbl')}</span></div></div>`;
    }).join('');
    const sharedPanel = `<h2 class="fc-sub">⇄ ${t('sharedBank')} (${fs.length})</h2>
      ${fs.length ? '<div class="fc-decks">'+sharedRows+'</div>' : `<p class="fc-empty">${t('sharedEmpty')}</p>`}`;

    root.innerHTML = header() + sourceSelector() + stats + decks + sharedPanel + modalShell();
    wire();
  }

  function renderDeck(deckId){
    const d = DB.decks.find(x => x.id === deckId);
    if(!d){ view = {name:'dash'}; return renderDash(); }
    const cs = deckCards(deckId);
    const rows = cs.length ? cs.map(c => `<div class="fc-row">
        <div class="fc-row-txt"><strong>${esc(c.front)} ${c.shared?`<i class="fc-badge">⇄ ${t('sharedBadge')}</i>`:''}</strong>
        <span>${esc(c.back)}</span>
        ${c.tags.length?`<em>${c.tags.map(esc).join(' · ')}</em>`:''}</div>
        <div class="fc-row-meta">${t('days')(c.interval)} · ${c.dueDate}</div>
        <div class="fc-row-actions">
        <button class="fc-btn fc-sm ${c.shared?'':'fc-share-btn'}" data-act="toggle-share" data-card="${c.id}">${c.shared?t('unshare'):t('share')}</button>
        <button class="fc-btn fc-sm" data-act="edit-card" data-card="${c.id}">${t('edit')}</button>
        <button class="fc-btn fc-sm fc-danger" data-act="del-card" data-card="${c.id}">✕</button></div>
      </div>`).join('') : `<p class="fc-empty">${t('noCards')}</p>`;
    root.innerHTML = `<button class="fc-btn fc-back" data-act="back">${t('back')}</button>
      <div class="fc-head"><div><h1 class="fc-title">${esc(d.name)}</h1><p class="fc-bread">${t('breadcrumb')} › ${esc(d.name)}</p></div>
      <div class="fc-actions"><button class="fc-btn fc-primary" data-act="create" data-deck="${d.id}">${t('create')}</button>
      <button class="fc-btn fc-review" data-act="review-deck" data-deck="${d.id}">▶ ${t('review')} (${cs.filter(isDueOwn).length})</button></div></div>
      <div class="fc-list">${rows}</div>` + modalShell();
    wire();
  }

  function renderReview(){
    const q = view.queue;
    if(!q.length){
      const s = view.session;
      root.innerHTML = `<div class="fc-session-done"><h1 class="fc-title">${s.total ? t('sessionDone') : ''}</h1>
        <p>${s.total ? t('sessionStats')(s.correct, s.total) : t('nothingDue')}</p>
        <button class="fc-btn fc-primary" data-act="back">${t('backDash')}</button></div>`;
      wire(); return;
    }
    const item = q[0];
    const state = item.kind === 'own' ? item.card : progressOf(item.card);
    const ratings = ['again','hard','good','easy'].map(r => {
      const iv = previewInterval(state, r);
      return `<button class="fc-btn fc-rate fc-rate-${r}" data-act="rate" data-rate="${r}">${t(r)}<small>${iv===null?t('minLbl'):t('days')(iv)}</small></button>`;
    }).join('');
    const ownerTag = item.kind === 'shared' ? `<p class="fc-owner-tag">⇄ ${t('byOwner')(ownerName(item.card.owner))} · ${esc(item.card.deckName)}</p>` : '';
    root.innerHTML = `<div class="fc-review-wrap">
      <p class="fc-progress">${t('progress')(view.session.total - q.length + 1, view.session.total || q.length)}</p>
      ${ownerTag}
      <div class="fc-card"><div class="fc-card-front">${esc(item.card.front)}</div>
      ${view.showBack ? `<hr class="fc-sep"/><div class="fc-card-back">${esc(item.card.back)}</div>` : ''}</div>
      ${view.showBack ? `<div class="fc-rates">${ratings}</div>`
        : `<button class="fc-btn fc-primary fc-show" data-act="show">${t('showAnswer')}</button>`}
      <button class="fc-btn fc-back fc-quit" data-act="back">${t('back')}</button></div>`;
    wire();
  }

  /* ---------- modais ---------- */
  function modalShell(){ return '<div id="fcModal" class="fc-modal" hidden></div>'; }
  function openModal(html){ const m = root.querySelector('#fcModal'); m.innerHTML = `<div class="fc-modal-box">${html}</div>`; m.hidden = false; }
  function closeModal(){ const m = root.querySelector('#fcModal'); if(m){ m.hidden = true; m.innerHTML=''; } }

  function deckOptions(sel){
    return DB.decks.map(d=>`<option value="${d.id}" ${d.id===sel?'selected':''}>${esc(d.name)}</option>`).join('')
      + `<option value="__new__">${t('newDeck')}</option>`;
  }
  function deckPicker(preset){
    return `<label>${t('deck')}</label><select id="fcDeckSel">${deckOptions(preset||'')}</select>
      <input id="fcNewDeck" placeholder="${t('deckName')}" style="display:none"/>`;
  }
  function wireDeckPicker(){
    const sel = root.querySelector('#fcDeckSel'), nd = root.querySelector('#fcNewDeck');
    const upd = () => nd.style.display = sel.value === '__new__' ? 'block' : 'none';
    if(!DB.decks.length) sel.value = '__new__';
    sel.addEventListener('change', upd); upd();
  }
  function shareCheckbox(checked){
    return `<label class="fc-check"><input type="checkbox" id="fcShare" ${checked?'checked':''}/> ⇄ ${t('shareLbl')}</label>`;
  }

  function cardForm(card, presetDeck){
    const c = card || {front:'',back:'',tags:[],deckId:presetDeck||'',shared:false};
    openModal(`<h2>${card?t('edit'):t('create').replace('+ ','')}</h2>
      ${deckPicker(c.deckId)}
      <label>${t('front')}</label><textarea id="fcFront" rows="2">${esc(c.front)}</textarea>
      <label>${t('backSide')}</label><textarea id="fcBack" rows="3">${esc(c.back)}</textarea>
      <label>${t('tags')}</label><input id="fcTags" value="${esc(c.tags.join(', '))}"/>
      ${shareCheckbox(c.shared)}
      <p id="fcMsg" class="fc-msg"></p>
      <div class="fc-modal-actions"><button class="fc-btn" data-act="close">${t('cancel')}</button>
      <button class="fc-btn fc-primary" data-act="save-card" data-card="${card?card.id:''}">${t('save')}</button></div>`);
    wireDeckPicker();
    root.querySelectorAll('#fcModal [data-act]').forEach(el => el.addEventListener('click', onAct));
  }

  function importForm(){
    openModal(`<h2>${t('imp')}</h2>
      ${deckPicker('')}
      <p class="fc-hint">${t('impHint')}</p>
      <textarea id="fcBatch" rows="7" placeholder="${esc(t('impExample'))}"></textarea>
      ${shareCheckbox(false)}
      <p id="fcMsg" class="fc-msg"></p>
      <div class="fc-modal-actions"><button class="fc-btn" data-act="close">${t('cancel')}</button>
      <button class="fc-btn fc-primary" data-act="save-batch">${t('impBtn')}</button></div>`);
    wireDeckPicker();
    root.querySelectorAll('#fcModal [data-act]').forEach(el => el.addEventListener('click', onAct));
  }

  function resolveDeck(){
    const sel = root.querySelector('#fcDeckSel'), nd = root.querySelector('#fcNewDeck');
    if(sel.value !== '__new__') return sel.value;
    const name = (nd.value||'').trim();
    if(!name) return null;
    const existing = DB.decks.find(d=>d.name.toLowerCase()===name.toLowerCase());
    if(existing) return existing.id;
    const d = {id: uid('dk'), name}; DB.decks.push(d); return d.id;
  }

  function newCard(deckId, front, back, tags, shared){
    return {id: uid('fc'), deckId, front, back, tags: tags||[], type:'basic', source:'manual', shared: !!shared,
      createdAt: today(), interval:1, ease:2.5, repetitions:0, lapses:0, dueDate: today()};
  }

  /* ---------- eventos ---------- */
  function wire(){ root.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', onAct)); }
  function onAct(e){
    const el = e.currentTarget, act = el.dataset.act;
    if(act==='create') cardForm(null, el.dataset.deck||'');
    else if(act==='import') importForm();
    else if(act==='close') closeModal();
    else if(act==='back'){ view={name:'dash'}; render(); }
    else if(act==='src'){ DB.prefs.source = el.dataset.src; save(); render(); }
    else if(act==='open-deck'){ view={name:'deck', deckId:el.dataset.deck}; render(); }
    else if(act==='del-deck'){ if(confirm(t('confirmDeck'))){
      deckCards(el.dataset.deck).forEach(removeFromShared);
      DB.cards = DB.cards.filter(c=>c.deckId!==el.dataset.deck);
      DB.decks = DB.decks.filter(d=>d.id!==el.dataset.deck); save(); render(); } }
    else if(act==='del-card'){ if(confirm(t('confirmCard'))){
      const c = DB.cards.find(x=>x.id===el.dataset.card); if(c) removeFromShared(c);
      DB.cards = DB.cards.filter(x=>x.id!==el.dataset.card); save(); render(); } }
    else if(act==='toggle-share'){
      const c = DB.cards.find(x=>x.id===el.dataset.card);
      if(c){ c.shared = !c.shared; syncShare(c); save(); render(); }
    }
    else if(act==='edit-card'){ cardForm(DB.cards.find(c=>c.id===el.dataset.card)); }
    else if(act==='save-card'){
      const front = root.querySelector('#fcFront').value.trim(), back = root.querySelector('#fcBack').value.trim();
      const msg = root.querySelector('#fcMsg');
      if(!front || !back){ msg.textContent = t('required'); return; }
      const deckId = resolveDeck();
      if(!deckId){ msg.textContent = t('deckRequired'); return; }
      const tags = root.querySelector('#fcTags').value.split(',').map(s=>s.trim()).filter(Boolean);
      const shared = root.querySelector('#fcShare').checked;
      const id = el.dataset.card;
      let card;
      if(id){ card = DB.cards.find(x=>x.id===id); Object.assign(card,{front,back,tags,deckId,shared}); }
      else { card = newCard(deckId, front, back, tags, shared); DB.cards.push(card); }
      syncShare(card); save(); closeModal(); render();
    }
    else if(act==='save-batch'){
      const msg = root.querySelector('#fcMsg');
      const deckId = resolveDeck();
      if(!deckId){ msg.textContent = t('deckRequired'); return; }
      const shared = root.querySelector('#fcShare').checked;
      const lines = root.querySelector('#fcBatch').value.split('\n').map(l=>l.trim()).filter(l=>l.includes('::'));
      if(!lines.length){ msg.textContent = t('impHint'); return; }
      lines.forEach(l => { const i = l.indexOf('::');
        const front = l.slice(0,i).trim(), back = l.slice(i+2).trim();
        if(front && back){ const card = newCard(deckId, front, back, [], shared); DB.cards.push(card); syncShare(card); }
      });
      save(); closeModal(); render();
    }
    else if(act==='review-src' || act==='review-deck'){
      let q;
      if(act==='review-deck') q = dueOwn(el.dataset.deck).map(c => ({kind:'own', card:c}));
      else q = dueBySource();
      q.sort(()=>Math.random()-.5);
      view = {name:'review', queue:q, showBack:false, session:{total:q.length, correct:0}};
      render();
    }
    else if(act==='show'){ view.showBack = true; render(); }
    else if(act==='rate'){
      const rate = el.dataset.rate, item = view.queue[0];
      const state = item.kind === 'own' ? item.card : progressOf(item.card);
      applyRating(state, rate);
      DB.stats.reviews += 1;
      if(rate==='good'||rate==='easy'){ DB.stats.correct += 1; view.session.correct += 1; }
      view.queue.shift();
      if(rate==='again') view.queue.push(item);
      save();
      view.showBack = false;
      render();
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
