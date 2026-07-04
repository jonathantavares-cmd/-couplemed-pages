/* CoupleMed — Flashcards v3 (Anki-like: learning steps, SM-2, estados, browser, cloze, undo, stats) */
(function(){
  'use strict';
  const params = new URLSearchParams(location.search);
  if((params.get('page')||'home') !== 'flashcards') return;
  const USER = params.get('u') || 'guest';
  const KEY = `couplemed_fc_${USER}`;
  const SHARED_KEY = 'couplemed_fc_shared';
  const MIN = 60000, DAY = 86400000;

  /* ---------- i18n ---------- */
  const T = {
    en: {
      title:'Flashcards', bread:'Home › Study › Flashcards',
      decks:'Decks', dueToday:'Due today', newCards:'New', retention:'Retention',
      create:'+ Create', imp:'Import', browse:'Browse', stats:'Stats', review:'Study now',
      srcMine:'My flashcards', srcShared:'Shared bank', srcAll:'All',
      colNew:'New', colLearn:'Learn', colDue:'Due',
      deckEmpty:'No decks yet. Create your first flashcard to get started.',
      view:'Browse', del:'Delete', edit:'Edit', back:'← Back',
      front:'Front (question)', backSide:'Back (answer)', tags:'Tags (comma separated)', deck:'Deck',
      newDeck:'+ New deck…', deckName:'Deck name', save:'Save', cancel:'Cancel',
      shareLbl:'Share with other users (adds to the shared bank)',
      clozeHint:'Tip: use {{c1::hidden text}} for cloze deletion cards (like Anki).',
      sharedBadge:'shared', byOwner:o=>`by ${o}`, sharedBank:'Shared bank',
      sharedEmpty:'No shared cards from other users yet.',
      share:'Share', unshare:'Unshare',
      impHint:'One card per line, using :: to separate front and back:',
      impExample:'What is troponin? :: Cardiac protein released in myocardial injury',
      impBtn:'Import cards', exportBtn:'Export deck (.txt)',
      searchPh:'Search cards (front, back, tags)…', allDecks:'All decks', allStates:'All states',
      stNew:'New', stLearn:'Learning', stReview:'Review', stRelearn:'Relearning', stSuspended:'Suspended',
      suspend:'Suspend', unsuspend:'Unsuspend', noResults:'No cards match your search.',
      showAnswer:'Show answer', again:'Again', hard:'Hard', good:'Good', easy:'Easy',
      undo:'↩ Undo', kbdHint:'Space = show · 1 Again · 2 Hard · 3 Good · 4 Easy',
      sessionDone:'Congratulations! You have finished this session.',
      sessionStats:(a,b)=>`${a} of ${b} answers were Good or Easy.`,
      backDash:'Back to dashboard', nothingDue:'Nothing to study in this source. Great job!',
      confirmDeck:'Delete this deck and all its cards?', confirmCard:'Delete this card?',
      leechMsg:'Card marked as leech and suspended (8+ lapses).',
      statsTitle:'Statistics', statsToday:'Today', statsReviews:'reviews', statsCards:'Cards by state',
      statsWeek:'Last 7 days', statsRetentionInfo:'Mature retention (Good/Easy on review cards)',
      limits:'Daily limits', newLimit:'New cards/day', revLimit:'Reviews/day',
      required:'Front and back are required.', deckRequired:'Select or create a deck.',
      dueLabel:'due', days:d=>d===1?'1d':`${d}d`, mins:m=>`${m}m`, imported:n=>`${n} cards imported.`
    },
    pt: {
      title:'Flashcards', bread:'Home › Estudos › Flashcards',
      decks:'Decks', dueToday:'Para hoje', newCards:'Novos', retention:'Retenção',
      create:'+ Criar', imp:'Importar', browse:'Navegar', stats:'Estatísticas', review:'Estudar agora',
      srcMine:'Meus flashcards', srcShared:'Banco compartilhado', srcAll:'Todos',
      colNew:'Novos', colLearn:'Aprend.', colDue:'Revisar',
      deckEmpty:'Nenhum deck ainda. Crie seu primeiro flashcard para começar.',
      view:'Navegar', del:'Excluir', edit:'Editar', back:'← Voltar',
      front:'Frente (pergunta)', backSide:'Verso (resposta)', tags:'Tags (separadas por vírgula)', deck:'Deck',
      newDeck:'+ Novo deck…', deckName:'Nome do deck', save:'Salvar', cancel:'Cancelar',
      shareLbl:'Compartilhar com os outros usuários (entra no banco compartilhado)',
      clozeHint:'Dica: use {{c1::texto oculto}} para cards cloze (igual ao Anki).',
      sharedBadge:'compartilhado', byOwner:o=>`por ${o}`, sharedBank:'Banco compartilhado',
      sharedEmpty:'Ainda não há cards compartilhados por outros usuários.',
      share:'Compartilhar', unshare:'Descompartilhar',
      impHint:'Um card por linha, usando :: para separar frente e verso:',
      impExample:'O que é troponina? :: Proteína cardíaca liberada em lesão miocárdica',
      impBtn:'Importar cards', exportBtn:'Exportar deck (.txt)',
      searchPh:'Buscar cards (frente, verso, tags)…', allDecks:'Todos os decks', allStates:'Todos os estados',
      stNew:'Novo', stLearn:'Aprendendo', stReview:'Revisão', stRelearn:'Reaprendendo', stSuspended:'Suspenso',
      suspend:'Suspender', unsuspend:'Reativar', noResults:'Nenhum card corresponde à busca.',
      showAnswer:'Mostrar resposta', again:'Again', hard:'Hard', good:'Good', easy:'Easy',
      undo:'↩ Desfazer', kbdHint:'Espaço = mostrar · 1 Again · 2 Hard · 3 Good · 4 Easy',
      sessionDone:'Parabéns! Você terminou esta sessão.',
      sessionStats:(a,b)=>`${a} de ${b} respostas foram Good ou Easy.`,
      backDash:'Voltar ao painel', nothingDue:'Nada para estudar nesta fonte. Excelente!',
      confirmDeck:'Excluir este deck e todos os seus cards?', confirmCard:'Excluir este card?',
      leechMsg:'Card marcado como leech e suspenso (8+ lapsos).',
      statsTitle:'Estatísticas', statsToday:'Hoje', statsReviews:'revisões', statsCards:'Cards por estado',
      statsWeek:'Últimos 7 dias', statsRetentionInfo:'Retenção madura (Good/Easy em cards de revisão)',
      limits:'Limites diários', newLimit:'Cards novos/dia', revLimit:'Revisões/dia',
      required:'Frente e verso são obrigatórios.', deckRequired:'Selecione ou crie um deck.',
      dueLabel:'a revisar', days:d=>d===1?'1d':`${d}d`, mins:m=>`${m}m`, imported:n=>`${n} cards importados.`
    }
  };
  const lang = () => document.documentElement.lang === 'pt-BR' ? 'pt' : 'en';
  const t = k => T[lang()][k];
  const ownerName = o => o.charAt(0).toUpperCase() + o.slice(1);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const todayStr = () => new Date().toISOString().slice(0,10);

  /* ---------- config estilo Anki ---------- */
  const CFG = { learnSteps:[1,10], relearnSteps:[10], gradInt:1, easyInt:4, startEase:2.5,
    hardMult:1.2, easyBonus:1.3, lapseMult:0.5, minEase:1.3, maxEase:3.2, leech:8 };

  /* ---------- persistência + migração ---------- */
  function migrateCard(c){
    if(c.state) return c;
    // v1/v2 → v3 (compatível com cards do AI Tutor)
    c.ease = c.ease || CFG.startEase;
    c.lapses = c.lapses || 0;
    c.reps = c.reps != null ? c.reps : (c.repetitions || 0);
    c.suspended = !!c.suspended;
    c.type = c.type || (/\{\{c\d+::/.test(c.front) ? 'cloze' : 'basic');
    if(c.reps === 0 && c.lapses === 0){ c.state = 'new'; c.stepIdx = 0; c.due = Date.now(); c.interval = 0; }
    else { c.state = 'review'; c.interval = Math.max(1, c.interval || 1);
      c.due = c.dueDate ? new Date(c.dueDate + 'T00:00:00').getTime() : Date.now(); }
    delete c.repetitions; delete c.dueDate;
    return c;
  }
  function loadUser(){
    let d;
    try{ d = JSON.parse(localStorage.getItem(KEY)); }catch(e){}
    if(!d || !d.decks || !d.cards) d = {decks:[], cards:[]};
    d.cards = d.cards.map(migrateCard);
    d.stats = d.stats || {reviews:0, correct:0};
    d.days = d.days || {};
    d.sharedProgress = d.sharedProgress || {};
    Object.values(d.sharedProgress).forEach(migrateCard);
    d.prefs = d.prefs || {};
    if(!d.prefs.source) d.prefs.source = 'mine';
    if(d.prefs.newPerDay == null) d.prefs.newPerDay = 20;
    if(d.prefs.revPerDay == null) d.prefs.revPerDay = 200;
    return d;
  }
  function loadShared(){
    try{ const d = JSON.parse(localStorage.getItem(SHARED_KEY)); if(d && d.cards) return d; }catch(e){}
    return {cards:[]};
  }
  const DB = loadUser();
  const SH = loadShared();
  const save = () => localStorage.setItem(KEY, JSON.stringify(DB));
  const saveShared = () => localStorage.setItem(SHARED_KEY, JSON.stringify(SH));
  save(); // persiste migração
  const uid = p => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const dayCounters = () => { const k = todayStr();
    if(!DB.days[k]) DB.days[k] = {newDone:0, revDone:0, ok:0, total:0, matOk:0, matTotal:0};
    return DB.days[k]; };

  /* ---------- banco compartilhado ---------- */
  const sharedId = c => `${USER}:${c.id}`;
  function syncShare(card){
    const deck = DB.decks.find(d => d.id === card.deckId);
    const idx = SH.cards.findIndex(s => s.id === sharedId(card));
    if(card.shared){
      const entry = {id: sharedId(card), owner: USER, deckName: deck ? deck.name : 'Deck',
        front: card.front, back: card.back, tags: card.tags, type: card.type, createdAt: card.createdAt};
      if(idx >= 0) SH.cards[idx] = entry; else SH.cards.push(entry);
    } else if(idx >= 0) SH.cards.splice(idx, 1);
    saveShared();
  }
  const removeFromShared = card => { const i = SH.cards.findIndex(s => s.id === sharedId(card)); if(i>=0){ SH.cards.splice(i,1); saveShared(); } };
  const foreignShared = () => SH.cards.filter(s => s.owner !== USER);
  function progressOf(sc){
    if(!DB.sharedProgress[sc.id]) DB.sharedProgress[sc.id] = {state:'new', stepIdx:0, due:Date.now(),
      interval:0, ease:CFG.startEase, reps:0, lapses:0, suspended:false};
    return DB.sharedProgress[sc.id];
  }

  /* ---------- filas estilo Anki ---------- */
  const endOfToday = () => { const d = new Date(); d.setHours(23,59,59,999); return d.getTime(); };
  const stateOf = it => it.kind === 'own' ? it.card : progressOf(it.card);
  function allItems(src){
    src = src || DB.prefs.source;
    let items = [];
    if(src !== 'shared') items = items.concat(DB.cards.map(c => ({kind:'own', card:c})));
    if(src !== 'mine') items = items.concat(foreignShared().map(sc => ({kind:'shared', card:sc})));
    return items;
  }
  function queues(src, deckId){
    const now = Date.now(), eod = endOfToday(), dc = dayCounters();
    const items = allItems(src).filter(it => {
      const s = stateOf(it);
      if(s.suspended) return false;
      if(deckId && !(it.kind==='own' && it.card.deckId === deckId)) return false;
      return true;
    });
    const learn = items.filter(it => { const s = stateOf(it); return (s.state==='learn'||s.state==='relearn') && s.due <= eod; });
    const review = items.filter(it => { const s = stateOf(it); return s.state==='review' && s.due <= eod; })
      .slice(0, Math.max(0, DB.prefs.revPerDay - dc.revDone));
    const fresh = items.filter(it => stateOf(it).state==='new')
      .slice(0, Math.max(0, DB.prefs.newPerDay - dc.newDone));
    return {learn, review, fresh, now};
  }
  const dueCount = (src, deckId) => { const q = queues(src, deckId); return q.learn.length + q.review.length + q.fresh.length; };

  /* ---------- agendamento SM-2 + learning steps ---------- */
  function nextIvPreview(s, rating){
    const fmt = ms => ms < 3600000 ? t('mins')(Math.round(ms/MIN)) : t('days')(Math.round(ms/DAY));
    if(s.state === 'new' || s.state === 'learn' || s.state === 'relearn'){
      const steps = s.state === 'relearn' ? CFG.relearnSteps : CFG.learnSteps;
      const idx = s.state === 'new' ? 0 : s.stepIdx;
      if(rating === 'again') return fmt(steps[0]*MIN);
      if(rating === 'hard') return fmt(Math.round(steps[Math.min(idx, steps.length-1)]*MIN*1.5));
      if(rating === 'good') return idx+1 < steps.length ? fmt(steps[idx+1]*MIN)
        : fmt((s.state==='relearn' ? Math.max(1, s.interval) : CFG.gradInt)*DAY);
      return fmt(CFG.easyInt*DAY);
    }
    if(rating === 'again') return fmt(CFG.relearnSteps[0]*MIN);
    if(rating === 'hard') return fmt(Math.max(s.interval+1, Math.round(s.interval*CFG.hardMult))*DAY);
    if(rating === 'good') return fmt(Math.max(s.interval+1, Math.round(s.interval*s.ease))*DAY);
    return fmt(Math.max(s.interval+2, Math.round(s.interval*s.ease*CFG.easyBonus))*DAY);
  }
  function applyRating(s, rating){
    const now = Date.now();
    let leech = false;
    if(s.state === 'new'){ s.state = 'learn'; s.stepIdx = 0; }
    if(s.state === 'learn' || s.state === 'relearn'){
      const steps = s.state === 'relearn' ? CFG.relearnSteps : CFG.learnSteps;
      if(rating === 'again'){ s.stepIdx = 0; s.due = now + steps[0]*MIN; }
      else if(rating === 'hard'){ s.due = now + Math.round(steps[Math.min(s.stepIdx, steps.length-1)]*MIN*1.5); }
      else if(rating === 'good'){
        if(s.stepIdx + 1 < steps.length){ s.stepIdx++; s.due = now + steps[s.stepIdx]*MIN; }
        else { // gradua
          s.interval = s.state === 'relearn' ? Math.max(1, s.interval) : CFG.gradInt;
          s.state = 'review'; s.reps++; s.due = now + s.interval*DAY;
        }
      } else { // easy gradua direto
        s.interval = s.state === 'relearn' ? Math.max(CFG.gradInt, s.interval) : CFG.easyInt;
        s.state = 'review'; s.reps++; s.due = now + s.interval*DAY;
      }
    } else { // review
      if(rating === 'again'){
        s.lapses++; s.ease = Math.max(CFG.minEase, s.ease - 0.2);
        s.interval = Math.max(1, Math.round(s.interval * CFG.lapseMult));
        s.state = 'relearn'; s.stepIdx = 0; s.due = now + CFG.relearnSteps[0]*MIN;
        if(s.lapses >= CFG.leech){ s.suspended = true; leech = true;
          if(s.tags && !s.tags.includes('leech')) s.tags.push('leech'); }
      } else if(rating === 'hard'){
        s.ease = Math.max(CFG.minEase, s.ease - 0.15);
        s.interval = Math.max(s.interval+1, Math.round(s.interval*CFG.hardMult));
        s.reps++; s.due = now + s.interval*DAY;
      } else if(rating === 'good'){
        s.interval = Math.max(s.interval+1, Math.round(s.interval*s.ease));
        s.reps++; s.due = now + s.interval*DAY;
      } else {
        s.ease = Math.min(CFG.maxEase, s.ease + 0.15);
        s.interval = Math.max(s.interval+2, Math.round(s.interval*s.ease*CFG.easyBonus));
        s.reps++; s.due = now + s.interval*DAY;
      }
    }
    return leech;
  }

  /* ---------- cloze ---------- */
  const isCloze = txt => /\{\{c\d+::(.+?)\}\}/.test(txt);
  const clozeFront = txt => esc(txt).replace(/\{\{c\d+::(.+?)\}\}/g, '<span class="fc-cloze">[...]</span>');
  const clozeBack = txt => esc(txt).replace(/\{\{c\d+::(.+?)\}\}/g, '<span class="fc-cloze fc-cloze-open">$1</span>');

  /* ---------- estado/UI ---------- */
  let view = {name:'dash'};
  let root = null, undoBuf = null;

  function imgToBase64(file){
    return new Promise((res,rej)=>{
      if(!file.type.startsWith('image/')) return rej('Only images allowed');
      if(file.size > 5242880) return rej('Max 5MB'); // 5MB limit
      const r = new FileReader(); r.onload = () => res(r.result);
      r.onerror = () => rej('Read failed'); r.readAsDataURL(file);
    });
  }
  async function pasteImage(){ 
    try{ const items = await navigator.clipboard.read();
      for(const item of items){ if(item.types.includes('image/png')){ 
        const blob = await item.getType('image/png'); const b64 = await imgToBase64(blob);
        displayImagePreview(b64); } } }catch(e){ console.log('Paste failed',e); } }
  function displayImagePreview(b64){
    const preview = document.querySelector('#fcImagePreview');
    if(!preview) return;
    preview.innerHTML = `<img src="${b64}" style="max-width:100%;max-height:120px;border-radius:8px"/>
      <button class="fc-btn fc-sm" data-act="remove-image" style="margin-top:6px">Remove</button>`;
    window.currentImageB64 = b64;
  }

  function boot(){
    const host = document.querySelector('#internalContent .internal-card');
    if(!host) return;
    host.classList.add('fc-host');
    host.innerHTML = '<div id="fcRoot"></div>';
    root = host.querySelector('#fcRoot');
    render();
    new MutationObserver(render).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
    document.addEventListener('keydown', onKey);
  }
  function onKey(e){
    if(view.name !== 'review' || !view.queue || !view.queue.length) return;
    if(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if(e.code === 'Space' || e.key === 'Enter'){ e.preventDefault(); if(!view.showBack){ view.showBack = true; render(); } return; }
    if(view.showBack && ['1','2','3','4'].includes(e.key)){
      e.preventDefault();
      rate(['again','hard','good','easy'][+e.key - 1]);
    }
  }

  function render(){
    if(!root) return;
    if(view.name === 'dash') renderDash();
    else if(view.name === 'browse') renderBrowse();
    else if(view.name === 'review') renderReview();
    else if(view.name === 'stats') renderStats();
  }

  const stBadge = s => {
    if(s.suspended) return `<i class="fc-st fc-st-susp">${t('stSuspended')}</i>`;
    const map = {new:['fc-st-new','stNew'], learn:['fc-st-learn','stLearn'], review:['fc-st-rev','stReview'], relearn:['fc-st-learn','stRelearn']};
    const [cls,key] = map[s.state] || map.new;
    return `<i class="fc-st ${cls}">${t(key)}</i>`;
  };
  const sourceSelector = () => `<div class="fc-src" role="tablist">
    ${['mine','shared','all'].map(s => `<button class="fc-src-btn ${DB.prefs.source===s?'on':''}" data-act="src" data-src="${s}">${t(s==='mine'?'srcMine':s==='shared'?'srcShared':'srcAll')}</button>`).join('')}</div>`;

  function renderDash(){
    const q = queues();
    const dc = dayCounters();
    const ret = DB.stats.matTotal ? Math.round(100*DB.stats.matOk/DB.stats.matTotal) : 0;
    const head = `<div class="fc-head"><div><h1 class="fc-title">${t('title')}</h1><p class="fc-bread">${t('bread')}</p></div>
      <div class="fc-actions">
        <button class="fc-btn fc-primary" data-act="create">${t('create')}</button>
        <button class="fc-btn" data-act="import">${t('imp')}</button>
        <button class="fc-btn" data-act="browse">${t('browse')}</button>
        <button class="fc-btn" data-act="stats">${t('stats')}</button>
        <button class="fc-btn fc-review" data-act="review-src">▶ ${t('review')} (${q.learn.length + q.review.length + q.fresh.length})</button>
      </div></div>`;
    const chips = `<div class="fc-stats">
      <div class="fc-stat"><strong>${DB.decks.length}</strong><span>${t('decks')}</span></div>
      <div class="fc-stat"><strong class="fc-c-rev">${q.review.length + q.learn.length}</strong><span>${t('dueToday')}</span></div>
      <div class="fc-stat"><strong class="fc-c-new">${q.fresh.length}</strong><span>${t('newCards')}</span></div>
      <div class="fc-stat"><strong>${ret}%</strong><span>${t('retention')}</span></div></div>`;

    let decks;
    if(!DB.decks.length) decks = `<p class="fc-empty">${t('deckEmpty')}</p>`;
    else decks = `<div class="fc-deck-table"><div class="fc-deck-header"><span></span>
        <b class="fc-c-new">${t('colNew')}</b><b class="fc-c-learn">${t('colLearn')}</b><b class="fc-c-rev">${t('colDue')}</b><span></span></div>` +
      DB.decks.map(d => {
        const dq = queues('mine', d.id);
        return `<div class="fc-deck-row">
          <button class="fc-deck-name" data-act="review-deck" data-deck="${d.id}">${esc(d.name)}</button>
          <b class="fc-c-new">${dq.fresh.length}</b><b class="fc-c-learn">${dq.learn.length}</b><b class="fc-c-rev">${dq.review.length}</b>
          <span class="fc-deck-tools">
            <button class="fc-btn fc-sm" data-act="browse-deck" data-deck="${d.id}">${t('view')}</button>
            <button class="fc-btn fc-sm" data-act="export-deck" data-deck="${d.id}">⇩</button>
            <button class="fc-btn fc-sm fc-danger" data-act="del-deck" data-deck="${d.id}">✕</button>
          </span></div>`;
      }).join('') + '</div>';

    const fs = foreignShared();
    const groups = {};
    fs.forEach(sc => { const k = sc.owner + '|' + sc.deckName; (groups[k] = groups[k] || []).push(sc); });
    const eod = endOfToday();
    const sharedRows = Object.keys(groups).map(k => {
      const [owner, deckName] = k.split('|');
      const list = groups[k];
      const due = list.filter(sc => { const p = progressOf(sc); return !p.suspended && p.due <= eod; }).length;
      return `<div class="fc-deck-row fc-shared-deck"><span class="fc-deck-name">${esc(deckName)} <em class="fc-owner">${t('byOwner')(ownerName(owner))}</em></span>
        <b></b><b></b><b class="fc-c-rev">${due}</b><span class="fc-deck-tools">${list.length} cards</span></div>`;
    }).join('');
    const sharedPanel = `<h2 class="fc-sub">⇄ ${t('sharedBank')} (${fs.length})</h2>
      ${fs.length ? '<div class="fc-deck-table">'+sharedRows+'</div>' : `<p class="fc-empty">${t('sharedEmpty')}</p>`}`;

    root.innerHTML = head + sourceSelector() + chips + decks + sharedPanel + '<div id="fcModal" class="fc-modal" hidden></div>';
    wire();
  }

  /* ---------- browser ---------- */
  function renderBrowse(){
    const f = view.filter || (view.filter = {q:'', deck: view.deckId || '', state:''});
    const rowsData = allItems('all').filter(it => {
      const c = it.card, s = stateOf(it);
      if(f.deck && !(it.kind==='own' && c.deckId === f.deck)) return false;
      if(f.state === 'suspended'){ if(!s.suspended) return false; }
      else if(f.state && (s.state !== f.state || s.suspended)) return false;
      if(f.q){ const q = f.q.toLowerCase();
        const hay = (c.front + ' ' + c.back + ' ' + (c.tags||[]).join(' ')).toLowerCase();
        if(!hay.includes(q)) return false; }
      return true;
    });
    const rows = rowsData.length ? rowsData.map(it => {
      const c = it.card, s = stateOf(it), own = it.kind === 'own';
      return `<div class="fc-row">
        <div class="fc-row-txt"><strong>${isCloze(c.front)?clozeBack(c.front):esc(c.front)}
          ${stBadge(s)} ${own && c.shared?`<i class="fc-badge">⇄ ${t('sharedBadge')}</i>`:''}
          ${!own?`<i class="fc-owner">${t('byOwner')(ownerName(c.owner))}</i>`:''}</strong>
        <span>${esc(c.back)}</span>
        ${(c.tags||[]).length?`<em>${c.tags.map(esc).join(' · ')}</em>`:''}</div>
        <div class="fc-row-meta">${s.state==='review' ? t('days')(s.interval)+' · '+new Date(s.due).toISOString().slice(0,10) : ''}</div>
        <div class="fc-row-actions">
          <button class="fc-btn fc-sm" data-act="toggle-susp" data-card="${c.id}" data-kind="${it.kind}">${s.suspended?t('unsuspend'):t('suspend')}</button>
          ${own?`<button class="fc-btn fc-sm ${c.shared?'':'fc-share-btn'}" data-act="toggle-share" data-card="${c.id}">${c.shared?t('unshare'):t('share')}</button>
          <button class="fc-btn fc-sm" data-act="edit-card" data-card="${c.id}">${t('edit')}</button>
          <button class="fc-btn fc-sm fc-danger" data-act="del-card" data-card="${c.id}">✕</button>`:''}
        </div></div>`;
    }).join('') : `<p class="fc-empty">${t('noResults')}</p>`;
    root.innerHTML = `<button class="fc-btn fc-back" data-act="back">${t('back')}</button>
      <div class="fc-head"><div><h1 class="fc-title">${t('browse')}</h1><p class="fc-bread">${t('bread')} › ${t('browse')}</p></div>
      <div class="fc-actions"><button class="fc-btn fc-primary" data-act="create">${t('create')}</button></div></div>
      <div class="fc-browse-bar">
        <input id="fcSearch" placeholder="${t('searchPh')}" value="${esc(f.q)}"/>
        <select id="fcDeckFilter"><option value="">${t('allDecks')}</option>
          ${DB.decks.map(d=>`<option value="${d.id}" ${f.deck===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select>
        <select id="fcStateFilter"><option value="">${t('allStates')}</option>
          ${[['new','stNew'],['learn','stLearn'],['review','stReview'],['relearn','stRelearn'],['suspended','stSuspended']]
            .map(([v,k])=>`<option value="${v}" ${f.state===v?'selected':''}>${t(k)}</option>`).join('')}</select>
      </div>
      <div class="fc-list">${rows}</div><div id="fcModal" class="fc-modal" hidden></div>`;
    root.querySelector('#fcSearch').addEventListener('input', e => { f.q = e.target.value; renderBrowse(); });
    root.querySelector('#fcSearch').focus();
    const si = root.querySelector('#fcSearch'); si.setSelectionRange(si.value.length, si.value.length);
    root.querySelector('#fcDeckFilter').addEventListener('change', e => { f.deck = e.target.value; renderBrowse(); });
    root.querySelector('#fcStateFilter').addEventListener('change', e => { f.state = e.target.value; renderBrowse(); });
    wire();
  }

  /* ---------- revisão ---------- */
  function buildSession(src, deckId){
    const q = queues(src, deckId);
    // ordem Anki: learning primeiro, depois review e novos intercalados
    const rest = q.review.concat(q.fresh);
    rest.sort(() => Math.random() - .5);
    return q.learn.concat(rest);
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
    const item = q[0], s = stateOf(item), c = item.card;
    const counts = { n:0, l:0, r:0 };
    q.forEach(it => { const st = stateOf(it).state; if(st==='new') counts.n++; else if(st==='review') counts.r++; else counts.l++; });
    const ratings = ['again','hard','good','easy'].map((r,i) =>
      `<button class="fc-btn fc-rate fc-rate-${r}" data-act="rate" data-rate="${r}"><small>${i+1}</small>${t(r)}<small>${nextIvPreview(s, r)}</small></button>`).join('');
    const ownerTag = item.kind === 'shared' ? `<p class="fc-owner-tag">⇄ ${t('byOwner')(ownerName(c.owner))} · ${esc(c.deckName)}</p>` : '';
    const cloze = isCloze(c.front);
    const frontHtml = cloze ? (view.showBack ? clozeBack(c.front) : clozeFront(c.front)) : esc(c.front);
    const backHtml = view.showBack && (!cloze || c.back) ? `<hr class="fc-sep"/><div class="fc-card-back">${esc(c.back)}</div>` : '';
    const imgHtml = c.image64 ? `<div class="fc-card-image"><img src="${c.image64}" style="max-width:100%;max-height:200px;border-radius:8px;margin:10px 0"/></div>` : '';
    root.innerHTML = `<div class="fc-review-wrap">
      <div class="fc-counts"><b class="fc-c-new">${counts.n}</b> + <b class="fc-c-learn">${counts.l}</b> + <b class="fc-c-rev">${counts.r}</b></div>
      ${ownerTag}
      <div class="fc-card">${imgHtml}<div class="fc-card-front">${frontHtml}</div>${backHtml}</div>
      ${view.showBack ? `<div class="fc-rates">${ratings}</div>`
        : `<button class="fc-btn fc-primary fc-show" data-act="show">${t('showAnswer')}</button>`}
      <p class="fc-kbd">${t('kbdHint')}</p>
      <div class="fc-review-tools">
        ${undoBuf ? `<button class="fc-btn fc-sm" data-act="undo">${t('undo')}</button>` : ''}
        <button class="fc-btn fc-back fc-quit" data-act="back">${t('back')}</button>
      </div></div>`;
    wire();
  }
  function rate(rating){
    const item = view.queue[0], s = stateOf(item);
    undoBuf = { item, snap: JSON.parse(JSON.stringify(s)), session: {...view.session},
      dc: JSON.parse(JSON.stringify(dayCounters())), stats: {...DB.stats} };
    const wasNew = s.state === 'new', wasReview = s.state === 'review';
    const leech = applyRating(s, rating);
    const dc = dayCounters();
    dc.total++; DB.stats.reviews++;
    if(wasNew) dc.newDone++;
    if(wasReview){ dc.revDone++; dc.matTotal = (dc.matTotal||0)+1; DB.stats.matTotal = (DB.stats.matTotal||0)+1;
      if(rating==='good'||rating==='easy'){ dc.matOk=(dc.matOk||0)+1; DB.stats.matOk=(DB.stats.matOk||0)+1; } }
    if(rating==='good'||rating==='easy'){ dc.ok++; DB.stats.correct++; view.session.correct++; }
    view.session.total = view.session.total || 0; view.session.totalAnswered = (view.session.totalAnswered||0)+1;
    view.queue.shift();
    // learning steps: reenfileira se vence ainda nesta sessão (due próximo)
    if((s.state==='learn'||s.state==='relearn') && !s.suspended){
      const pos = Math.min(view.queue.length, Math.max(1, Math.round(s.due <= Date.now()+2*MIN ? 3 : view.queue.length)));
      view.queue.splice(pos, 0, item);
    }
    if(leech) view.flash = t('leechMsg');
    save();
    view.showBack = false;
    render();
    if(view.flash){ const el = document.createElement('p'); el.className='fc-flash'; el.textContent = view.flash;
      root.querySelector('.fc-review-wrap, .fc-session-done')?.prepend(el); view.flash = null; }
  }

  /* ---------- estatísticas ---------- */
  function renderStats(){
    const dc = dayCounters();
    const states = {new:0, learn:0, review:0, relearn:0, susp:0};
    DB.cards.forEach(c => c.suspended ? states.susp++ : states[c.state]++);
    const ret = DB.stats.matTotal ? Math.round(100*DB.stats.matOk/DB.stats.matTotal) : 0;
    const days = [];
    for(let i=6;i>=0;i--){ const d = new Date(Date.now()-i*DAY).toISOString().slice(0,10);
      days.push({d: d.slice(5), n: (DB.days[d]||{}).total || 0}); }
    const max = Math.max(1, ...days.map(x=>x.n));
    const bars = days.map(x => `<div class="fc-bar-col"><div class="fc-bar" style="height:${Math.round(70*x.n/max)+4}px"></div><span>${x.d}</span><b>${x.n}</b></div>`).join('');
    root.innerHTML = `<button class="fc-btn fc-back" data-act="back">${t('back')}</button>
      <div class="fc-head"><div><h1 class="fc-title">${t('statsTitle')}</h1><p class="fc-bread">${t('bread')} › ${t('stats')}</p></div></div>
      <div class="fc-stats">
        <div class="fc-stat"><strong>${dc.total}</strong><span>${t('statsToday')} · ${t('statsReviews')}</span></div>
        <div class="fc-stat"><strong class="fc-c-new">${dc.newDone}</strong><span>${t('newCards')}</span></div>
        <div class="fc-stat"><strong>${ret}%</strong><span>${t('retention')}</span></div>
        <div class="fc-stat"><strong>${DB.cards.length}</strong><span>Cards</span></div></div>
      <h2 class="fc-sub">${t('statsWeek')}</h2><div class="fc-bars">${bars}</div>
      <h2 class="fc-sub">${t('statsCards')}</h2>
      <div class="fc-state-grid">
        <div><b class="fc-c-new">${states.new}</b><span>${t('stNew')}</span></div>
        <div><b class="fc-c-learn">${states.learn + states.relearn}</b><span>${t('stLearn')}</span></div>
        <div><b class="fc-c-rev">${states.review}</b><span>${t('stReview')}</span></div>
        <div><b>${states.susp}</b><span>${t('stSuspended')}</span></div></div>
      <h2 class="fc-sub">${t('limits')}</h2>
      <div class="fc-limits">
        <label>${t('newLimit')} <input id="fcNewLimit" type="number" min="0" value="${DB.prefs.newPerDay}"/></label>
        <label>${t('revLimit')} <input id="fcRevLimit" type="number" min="0" value="${DB.prefs.revPerDay}"/></label>
      </div><p class="fc-hint">${t('statsRetentionInfo')}</p>`;
    root.querySelector('#fcNewLimit').addEventListener('change', e => { DB.prefs.newPerDay = Math.max(0, +e.target.value||0); save(); });
    root.querySelector('#fcRevLimit').addEventListener('change', e => { DB.prefs.revPerDay = Math.max(0, +e.target.value||0); save(); });
    wire();
  }

  /* ---------- modais ---------- */
  function openModal(html){ const m = root.querySelector('#fcModal'); if(!m) return; m.innerHTML = `<div class="fc-modal-box">${html}</div>`; m.hidden = false;
    m.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', onAct)); }
  function closeModal(){ const m = root.querySelector('#fcModal'); if(m){ m.hidden = true; m.innerHTML=''; } }
  const deckOptions = sel => DB.decks.map(d=>`<option value="${d.id}" ${d.id===sel?'selected':''}>${esc(d.name)}</option>`).join('')
      + `<option value="__new__">${t('newDeck')}</option>`;
  const deckPicker = preset => `<label>${t('deck')}</label><select id="fcDeckSel">${deckOptions(preset||'')}</select>
      <input id="fcNewDeck" placeholder="${t('deckName')}" style="display:none"/>`;
  function wireDeckPicker(){
    const sel = root.querySelector('#fcDeckSel'), nd = root.querySelector('#fcNewDeck');
    const upd = () => nd.style.display = sel.value === '__new__' ? 'block' : 'none';
    if(!DB.decks.length) sel.value = '__new__';
    sel.addEventListener('change', upd); upd();
  }
  const shareCheckbox = checked => `<label class="fc-check"><input type="checkbox" id="fcShare" ${checked?'checked':''}/> ⇄ ${t('shareLbl')}</label>`;

  function cardForm(card, presetDeck){
    const c = card || {front:'',back:'',tags:[],deckId:presetDeck||'',shared:false,image64:null};
    window.currentImageB64 = c.image64 || null;
    openModal(`<h2>${card?t('edit'):t('create').replace('+ ','')}</h2>
      ${deckPicker(c.deckId)}
      <label>${t('front')}</label><textarea id="fcFront" rows="2">${esc(c.front)}</textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0">
        <button class="fc-btn fc-sm" data-act="upload-image">📁 Upload</button>
        <button class="fc-btn fc-sm" data-act="paste-image">📋 Paste</button>
      </div>
      <div id="fcImagePreview" style="margin:10px 0">${c.image64?`<img src="${c.image64}" style="max-width:100%;max-height:120px;border-radius:8px"/><button class="fc-btn fc-sm" data-act="remove-image" style="margin-top:6px">Remove</button>`:''}</div>
      <label>${t('backSide')}</label><textarea id="fcBack" rows="3">${esc(c.back)}</textarea>
      <p class="fc-hint">${t('clozeHint')}</p>
      <label>${t('tags')}</label><input id="fcTags" value="${esc((c.tags||[]).join(', '))}"/>
      ${shareCheckbox(c.shared)}
      <p id="fcMsg" class="fc-msg"></p>
      <div class="fc-modal-actions"><button class="fc-btn" data-act="close">${t('cancel')}</button>
      <button class="fc-btn fc-primary" data-act="save-card" data-card="${card?card.id:''}">${t('save')}</button></div>`);
    wireDeckPicker();
    // File input oculto
    const fileInput = document.createElement('input'); fileInput.type='file'; fileInput.accept='image/*'; fileInput.id='fcImageUpload'; fileInput.style.display='none';
    root.querySelector('#fcModal').appendChild(fileInput);
    fileInput.addEventListener('change', async e => { if(e.target.files[0]) { try{ const b64 = await imgToBase64(e.target.files[0]); displayImagePreview(b64); }catch(err){ root.querySelector('#fcMsg').textContent = err; } } });
  }
  function importForm(){
    openModal(`<h2>${t('imp')}</h2>${deckPicker('')}
      <p class="fc-hint">${t('impHint')}</p>
      <textarea id="fcBatch" rows="7" placeholder="${esc(t('impExample'))}"></textarea>
      ${shareCheckbox(false)}
      <p id="fcMsg" class="fc-msg"></p>
      <div class="fc-modal-actions"><button class="fc-btn" data-act="close">${t('cancel')}</button>
      <button class="fc-btn fc-primary" data-act="save-batch">${t('impBtn')}</button></div>`);
    wireDeckPicker();
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
  const newCard = (deckId, front, back, tags, shared, image64) => ({id: uid('fc'), deckId, front, back, image64: image64||null,
    tags: tags||[], type: isCloze(front)?'cloze':'basic', source:'manual', shared: !!shared,
    createdAt: todayStr(), state:'new', stepIdx:0, due: Date.now(), interval:0,
    ease:CFG.startEase, reps:0, lapses:0, suspended:false});

  function exportDeck(deckId){
    const d = DB.decks.find(x=>x.id===deckId); if(!d) return;
    const txt = DB.cards.filter(c=>c.deckId===deckId).map(c=>`${c.front} :: ${c.back}`).join('\n');
    const blob = new Blob([txt], {type:'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `couplemed_${d.name.replace(/\s+/g,'_')}.txt`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  /* ---------- eventos ---------- */
  function wire(){ root.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', onAct)); }
  function onAct(e){
    const el = e.currentTarget, act = el.dataset.act;
    if(act==='create') cardForm(null, el.dataset.deck||'');
    else if(act==='import') importForm();
    else if(act==='close') closeModal();
    else if(act==='back'){ view={name:'dash'}; undoBuf = null; render(); }
    else if(act==='src'){ DB.prefs.source = el.dataset.src; save(); render(); }
    else if(act==='browse'){ view={name:'browse'}; render(); }
    else if(act==='browse-deck'){ view={name:'browse', deckId: el.dataset.deck}; render(); }
    else if(act==='stats'){ view={name:'stats'}; render(); }
    else if(act==='export-deck') exportDeck(el.dataset.deck);
    else if(act==='del-deck'){ if(confirm(t('confirmDeck'))){
      DB.cards.filter(c=>c.deckId===el.dataset.deck).forEach(removeFromShared);
      DB.cards = DB.cards.filter(c=>c.deckId!==el.dataset.deck);
      DB.decks = DB.decks.filter(d=>d.id!==el.dataset.deck); save(); render(); } }
    else if(act==='del-card'){ if(confirm(t('confirmCard'))){
      const c = DB.cards.find(x=>x.id===el.dataset.card); if(c) removeFromShared(c);
      DB.cards = DB.cards.filter(x=>x.id!==el.dataset.card); save(); render(); } }
    else if(act==='toggle-share'){
      const c = DB.cards.find(x=>x.id===el.dataset.card);
      if(c){ c.shared = !c.shared; syncShare(c); save(); render(); }
    }
    else if(act==='toggle-susp'){
      const kind = el.dataset.kind;
      const s = kind === 'shared' ? progressOf(foreignShared().find(sc=>sc.id===el.dataset.card) || SH.cards.find(sc=>sc.id===el.dataset.card))
        : DB.cards.find(x=>x.id===el.dataset.card);
      if(s){ s.suspended = !s.suspended; save(); render(); }
    }
    else if(act==='edit-card'){ cardForm(DB.cards.find(c=>c.id===el.dataset.card)); }
    else if(act==='upload-image') document.querySelector('#fcImageUpload').click();
    else if(act==='paste-image') pasteImage();
    else if(act==='remove-image'){ window.currentImageB64 = null; displayImagePreview(null); }
    else if(act==='save-card'){
      const front = root.querySelector('#fcFront').value.trim(), back = root.querySelector('#fcBack').value.trim();
      const msg = root.querySelector('#fcMsg');
      if(!front || (!back && !isCloze(front))){ msg.textContent = t('required'); return; }
      const deckId = resolveDeck();
      if(!deckId){ msg.textContent = t('deckRequired'); return; }
      const tags = root.querySelector('#fcTags').value.split(',').map(s=>s.trim()).filter(Boolean);
      const shared = root.querySelector('#fcShare').checked;
      const id = el.dataset.card;
      let card;
      if(id){ card = DB.cards.find(x=>x.id===id); Object.assign(card,{front,back,tags,deckId,shared,type:isCloze(front)?'cloze':'basic',image64:window.currentImageB64||null}); }
      else { card = newCard(deckId, front, back, tags, shared, window.currentImageB64); DB.cards.push(card); }
      syncShare(card); save(); closeModal(); render();
    }
    else if(act==='save-batch'){
      const msg = root.querySelector('#fcMsg');
      const deckId = resolveDeck();
      if(!deckId){ msg.textContent = t('deckRequired'); return; }
      const shared = root.querySelector('#fcShare').checked;
      const lines = root.querySelector('#fcBatch').value.split('\n').map(l=>l.trim()).filter(l=>l.includes('::') && !/\{\{c\d+::/.test(l.split('::')[0]) || l.includes(' :: '));
      let n = 0;
      root.querySelector('#fcBatch').value.split('\n').forEach(l => {
        l = l.trim(); if(!l) return;
        const i = l.indexOf(' :: ') >= 0 ? l.indexOf(' :: ') : l.indexOf('::');
        const sepLen = l.indexOf(' :: ') >= 0 ? 4 : 2;
        if(i <= 0) return;
        const front = l.slice(0,i).trim(), back = l.slice(i+sepLen).trim();
        if(front && back){ const card = newCard(deckId, front, back, [], shared); DB.cards.push(card); syncShare(card); n++; }
      });
      if(!n){ msg.textContent = t('impHint'); return; }
      save(); closeModal(); render();
    }
    else if(act==='review-src' || act==='review-deck'){
      const q = act==='review-deck' ? buildSession('mine', el.dataset.deck) : buildSession();
      view = {name:'review', queue:q, showBack:false, session:{total:q.length, correct:0}};
      undoBuf = null;
      render();
    }
    else if(act==='show'){ view.showBack = true; render(); }
    else if(act==='rate') rate(el.dataset.rate);
    else if(act==='undo'){
      if(!undoBuf) return;
      Object.keys(undoBuf.snap).forEach(k => stateOf(undoBuf.item)[k] = undoBuf.snap[k]);
      const cur = stateOf(undoBuf.item);
      Object.keys(cur).forEach(k => { if(!(k in undoBuf.snap)) delete cur[k]; });
      DB.days[todayStr()] = undoBuf.dc;
      DB.stats = undoBuf.stats;
      view.session = undoBuf.session;
      view.queue = view.queue.filter(it => it !== undoBuf.item);
      view.queue.unshift(undoBuf.item);
      undoBuf = null;
      save(); view.showBack = false; render();
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
