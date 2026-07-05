/* CoupleMed — Flashcards v4
   ============================================================================
   REGRA DE MANUTENÇÃO (COMANDOS OFICIAIS):
   Toda alteração de funcionalidade deste módulo DEVE atualizar o array
   FEATURES e/ou QUICKSTART abaixo. A página inicial de instruções é gerada
   automaticamente a partir deles — nunca editar o HTML do guia manualmente.
   ============================================================================
   v4: landing premium (guia + mini dashboard), import por arquivo (.txt/.csv),
   bury até amanhã, flags coloridas, card invertido, retenção 70–97%,
   dias fáceis, adiar revisões, liberar por tema (unsuspend em massa),
   busca avançada (deck: tag: flag:), + tudo da v3 (SM-2, learning steps,
   cloze, imagens, undo, leech, banco compartilhado, estatísticas). */
(function(){
  'use strict';
  const params = new URLSearchParams(location.search);
  if((params.get('page')||'home') !== 'flashcards') return;
  const USER = params.get('u') || 'guest';
  const KEY = `couplemed_fc_${USER}`;
  const SHARED_KEY = 'couplemed_fc_shared';
  const MIN = 60000, DAY = 86400000;
  const FLAGS = [null,'red','orange','green','blue'];

  /* ---------- FONTE ÚNICA DO GUIA (atualizar aqui a cada mudança) ---------- */
  const QUICKSTART = {
    en: ['Study a topic, then create or import its cards.',
      'Turn question mistakes into your own cards (one idea per card).',
      'Review every day and answer the 4 buttons honestly.',
      'Watch your stats so reviews never pile up.',
      'Adjust retention and use easy days near exams.'],
    pt: ['Estude o tema e depois crie ou importe os cards dele.',
      'Transforme erros de questões em cards próprios (uma ideia por card).',
      'Revise todos os dias respondendo os 4 botões com honestidade.',
      'Acompanhe as estatísticas para as revisões não acumularem.',
      'Ajuste a retenção e use dias fáceis perto de provas.']
  };
  const FEATURES = [
    {i:'🧠', en:['Spaced repetition (SM-2)','Again / Hard / Good / Easy schedule each card at the ideal moment, with learning steps (1m → 10m → 1d) like Anki.'],
             pt:['Repetição espaçada (SM-2)','Errei / Difícil / Bom / Fácil agendam cada card no momento ideal, com learning steps (1m → 10m → 1d) igual ao Anki.']},
    {i:'📄', en:['Import from AI file','Ask an AI for e.g. "100 psychiatry pharmacology flashcards", upload the .txt/.csv file and the platform creates them all, with tags for filtering.'],
             pt:['Importar arquivo da AI','Peça à AI, por ex., "100 flashcards de farmacologia em psiquiatria", faça upload do arquivo .txt/.csv e a plataforma cria todos, com tags para filtrar.']},
    {i:'🖼️', en:['Images on cards','Upload from gallery/files or paste (Cmd+V) a screenshot straight into the card.'],
             pt:['Imagens nos cards','Envie da galeria/arquivos ou cole (Cmd+V) um print direto no card.']},
    {i:'✂️', en:['Cloze deletion','Use {{c1::hidden text}} to hide words inside a sentence.'],
             pt:['Cloze (lacunas)','Use {{c1::texto oculto}} para esconder palavras dentro de uma frase.']},
    {i:'🔁', en:['Reversed card','One click also creates the B→A copy of a basic card.'],
             pt:['Card invertido','Um clique também cria a cópia B→A de um card básico.']},
    {i:'🏷️', en:['Decks, tags & smart search','Organize by deck and free tags; search with deck:Cardio tag:error text.'],
             pt:['Decks, tags e busca avançada','Organize por deck e tags livres; busque com deck:Cardio tag:erro texto.']},
    {i:'🔓', en:['Release by topic','Import ready-made cards as suspended and unsuspend a topic only after studying it.'],
             pt:['Liberar por tema','Importe cards prontos como suspensos e libere um tema só depois de estudá-lo.']},
    {i:'💤', en:['Suspend, bury & flags','Suspend indefinitely, bury until tomorrow, or mark cards with colored flags.'],
             pt:['Suspender, enterrar e flags','Suspenda por tempo indeterminado, enterre até amanhã ou marque cards com bandeiras coloridas.']},
    {i:'🎯', en:['Desired retention (70–97%)','Higher = more frequent reviews; lower = fewer daily reviews. Plus postpone reviews and easy days.'],
             pt:['Retenção desejada (70–97%)','Maior = revisões mais frequentes; menor = menos revisões por dia. Além de adiar revisões e dias fáceis.']},
    {i:'⇄', en:['Shared bank','Share your cards (created or imported) with the other users; each person keeps individual progress.'],
             pt:['Banco compartilhado','Compartilhe seus cards (criados ou importados) com os outros usuários; o progresso de cada um é individual.']},
    {i:'⌨️', en:['Keyboard shortcuts','Space shows the answer; 1–4 rate the card; undo the last review.'],
             pt:['Atalhos de teclado','Espaço mostra a resposta; 1–4 avaliam o card; desfaça a última revisão.']},
    {i:'📊', en:['Statistics','Daily reviews, mature retention, cards per state, streak and 7-day chart.'],
             pt:['Estatísticas','Revisões diárias, retenção madura, cards por estado, sequência de dias e gráfico de 7 dias.']}
  ];

  /* ---------- i18n ---------- */
  const T = {
    en: {
      title:'Flashcards', bread:'Home › Study › Flashcards',
      heroSub:'Your Anki-style spaced repetition system, built into CoupleMed.',
      openApp:'▶ Open Flashcards', quickTitle:'How to use in 5 steps', featTitle:'Everything you can do',
      perfTitle:'Your performance', streak:d=>`${d}-day streak`,
      decks:'Decks', dueToday:'Due today', newCards:'New', retention:'Retention',
      create:'+ Create', imp:'Import', browse:'Browse', stats:'Stats', review:'Study now', guide:'ⓘ Guide',
      srcMine:'My flashcards', srcShared:'Shared bank', srcAll:'All',
      colNew:'New', colLearn:'Learn', colDue:'Due',
      deckEmpty:'No decks yet. Create your first flashcard or import a file to get started.',
      view:'Browse', del:'Delete', edit:'Edit', back:'← Back',
      front:'Front (question)', backSide:'Back (answer)', tags:'Tags (comma separated)', deck:'Deck',
      newDeck:'+ New deck…', deckName:'Deck name', save:'Save', cancel:'Cancel',
      shareLbl:'Visible to everyone: John, Alysson and all guest accounts.', shareTitle:'⇄ Share this with everyone',
      shareToast:'⇄ Shared! Now visible to all users in the Shared bank.', shareToastBatch:n=>`⇄ ${n} cards shared! Now visible to all users.`,
      shareBannerTitle:'⇄ Flashcard bank sharing between users',
      shareBannerBody:'Cards you share (created or imported) become visible to John, Alysson and every guest account — each person keeps their own review progress.',
      sharedByMe:'shared by you', sharedByOthers:'shared by others',
      reversedLbl:'Also create reversed copy (back → front)',
      clozeHint:'Tip: use {{c1::hidden text}} for cloze deletion cards (like Anki).',
      sharedBadge:'shared', byOwner:o=>`by ${o}`, sharedBank:'Shared bank',
      sharedEmpty:'No shared cards from other users yet.',
      share:'Share', unshare:'Unshare',
      impHint:'One card per line: front :: back :: tag1, tag2 (tags optional). Tab-separated also works.',
      impExample:'What is troponin? :: Cardiac protein released in myocardial injury :: cardio, labs',
      impFile:'📄 Load from file (.txt / .csv)', impFileLoaded:n=>`${n} lines loaded from file. Review below and import.`,
      impSuspended:'Import as suspended (release by topic later)',
      impBtn:'Import cards', exportBtn:'Export deck (.txt)',
      searchPh:'Search… (supports deck:Name tag:xyz flag:red)', allDecks:'All decks', allStates:'All states',
      stNew:'New', stLearn:'Learning', stReview:'Review', stRelearn:'Relearning', stSuspended:'Suspended',
      suspend:'Suspend', unsuspend:'Unsuspend', bury:'Bury 1d', unbury:'Unbury', noResults:'No cards match your search.',
      releaseAll:n=>`🔓 Unsuspend ${n} filtered`, released:n=>`${n} cards released.`,
      showAnswer:'Show answer', again:'Again', hard:'Hard', good:'Good', easy:'Easy',
      undo:'↩ Undo', kbdHint:'Space = show · 1 Again · 2 Hard · 3 Good · 4 Easy',
      sessionDone:'Congratulations! You have finished this session.',
      sessionStats:(a,b)=>`${a} of ${b} answers were Good or Easy.`,
      backDash:'Back to dashboard', nothingDue:'Nothing to study in this source. Great job!',
      confirmDeck:'Delete this deck and all its cards?', confirmCard:'Delete this card?',
      leechMsg:'Card marked as leech and suspended (8+ lapses).',
      statsTitle:'Statistics', statsToday:'Today', statsReviews:'reviews', statsCards:'Cards by state',
      statsWeek:'Last 7 days', statsRetentionInfo:'Mature retention (Good/Easy on review cards)',
      statsPerf:'Detailed performance', statsAvgDay:'avg/day', statsGoodEasy:'Good/Easy answers',
      range_7d:'7 days', range_1m:'1 month', range_3m:'3 months', range_6m:'6 months',
      limits:'Daily limits & scheduling', newLimit:'New cards/day', revLimit:'Reviews/day',
      retentionLbl:'Desired retention', retentionHint:'Higher = more reviews/day, lower risk of forgetting.',
      easyDaysLbl:'Easy days (no new cards)', postponeLbl:'Postpone due reviews', postponeBtn:'Postpone',
      postponed:n=>`${n} reviews postponed.`, daysSuffix:'day(s)',
      dow:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
      required:'Front and back are required.', deckRequired:'Select or create a deck.',
      days:d=>d===1?'1d':`${d}d`, mins:m=>`${m}m`, imported:n=>`${n} cards imported.`
    },
    pt: {
      title:'Flashcards', bread:'Home › Estudos › Flashcards',
      heroSub:'Seu sistema de repetição espaçada estilo Anki, integrado ao CoupleMed.',
      openApp:'▶ Abrir Flashcards', quickTitle:'Como usar em 5 passos', featTitle:'Tudo o que você pode fazer',
      perfTitle:'Sua performance', streak:d=>`${d} dia(s) seguidos`,
      decks:'Decks', dueToday:'Para hoje', newCards:'Novos', retention:'Retenção',
      create:'+ Criar', imp:'Importar', browse:'Navegar', stats:'Estatísticas', review:'Estudar agora', guide:'ⓘ Guia',
      srcMine:'Meus flashcards', srcShared:'Banco compartilhado', srcAll:'Todos',
      colNew:'Novos', colLearn:'Aprend.', colDue:'Revisar',
      deckEmpty:'Nenhum deck ainda. Crie seu primeiro flashcard ou importe um arquivo para começar.',
      view:'Navegar', del:'Excluir', edit:'Editar', back:'← Voltar',
      front:'Frente (pergunta)', backSide:'Verso (resposta)', tags:'Tags (separadas por vírgula)', deck:'Deck',
      newDeck:'+ Novo deck…', deckName:'Nome do deck', save:'Salvar', cancel:'Cancelar',
      shareLbl:'Visível para todos: John, Alysson e todas as contas convidadas.', shareTitle:'⇄ Compartilhar com todos',
      shareToast:'⇄ Compartilhado! Agora visível para todos os usuários no Banco compartilhado.', shareToastBatch:n=>`⇄ ${n} cards compartilhados! Agora visíveis para todos.`,
      shareBannerTitle:'⇄ Compartilhamento do banco de Flashcards entre os Usuários',
      shareBannerBody:'Cards que você compartilha (criados ou importados) ficam visíveis para John, Alysson e todas as contas convidadas — cada pessoa mantém seu próprio progresso de revisão.',
      sharedByMe:'compartilhados por você', sharedByOthers:'compartilhados por outros',
      reversedLbl:'Criar também a cópia invertida (verso → frente)',
      clozeHint:'Dica: use {{c1::texto oculto}} para cards cloze (igual ao Anki).',
      sharedBadge:'compartilhado', byOwner:o=>`por ${o}`, sharedBank:'Banco compartilhado',
      sharedEmpty:'Ainda não há cards compartilhados por outros usuários.',
      share:'Compartilhar', unshare:'Descompartilhar',
      impHint:'Um card por linha: frente :: verso :: tag1, tag2 (tags opcionais). Separação por Tab também funciona.',
      impExample:'O que é troponina? :: Proteína cardíaca liberada em lesão miocárdica :: cardio, labs',
      impFile:'📄 Carregar de arquivo (.txt / .csv)', impFileLoaded:n=>`${n} linhas carregadas do arquivo. Revise abaixo e importe.`,
      impSuspended:'Importar como suspensos (liberar por tema depois)',
      impBtn:'Importar cards', exportBtn:'Exportar deck (.txt)',
      searchPh:'Buscar… (aceita deck:Nome tag:xyz flag:red)', allDecks:'Todos os decks', allStates:'Todos os estados',
      stNew:'Novo', stLearn:'Aprendendo', stReview:'Revisão', stRelearn:'Reaprendendo', stSuspended:'Suspenso',
      suspend:'Suspender', unsuspend:'Reativar', bury:'Enterrar 1d', unbury:'Desenterrar', noResults:'Nenhum card corresponde à busca.',
      releaseAll:n=>`🔓 Liberar ${n} filtrados`, released:n=>`${n} cards liberados.`,
      showAnswer:'Mostrar resposta', again:'Errei', hard:'Difícil', good:'Bom', easy:'Fácil',
      undo:'↩ Desfazer', kbdHint:'Espaço = mostrar · 1 Errei · 2 Difícil · 3 Bom · 4 Fácil',
      sessionDone:'Parabéns! Você terminou esta sessão.',
      sessionStats:(a,b)=>`${a} de ${b} respostas foram Bom ou Fácil.`,
      backDash:'Voltar ao painel', nothingDue:'Nada para estudar nesta fonte. Excelente!',
      confirmDeck:'Excluir este deck e todos os seus cards?', confirmCard:'Excluir este card?',
      leechMsg:'Card marcado como leech e suspenso (8+ lapsos).',
      statsTitle:'Estatísticas', statsToday:'Hoje', statsReviews:'revisões', statsCards:'Cards por estado',
      statsWeek:'Últimos 7 dias', statsRetentionInfo:'Retenção madura (Bom/Fácil em cards de revisão)',
      statsPerf:'Performance detalhada', statsAvgDay:'média/dia', statsGoodEasy:'Respostas Bom/Fácil',
      range_7d:'7 dias', range_1m:'1 mês', range_3m:'3 meses', range_6m:'6 meses',
      limits:'Limites diários e agendamento', newLimit:'Cards novos/dia', revLimit:'Revisões/dia',
      retentionLbl:'Retenção desejada', retentionHint:'Maior = mais revisões/dia, menor risco de esquecer.',
      easyDaysLbl:'Dias fáceis (sem cards novos)', postponeLbl:'Adiar revisões vencidas', postponeBtn:'Adiar',
      postponed:n=>`${n} revisões adiadas.`, daysSuffix:'dia(s)',
      dow:['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
      required:'Frente e verso são obrigatórios.', deckRequired:'Selecione ou crie um deck.',
      days:d=>d===1?'1d':`${d}d`, mins:m=>`${m}m`, imported:n=>`${n} cards importados.`
    }
  };
  const lang = () => document.documentElement.lang === 'pt-BR' ? 'pt' : 'en';
  const t = k => T[lang()][k];
  const ownerName = o => {
    const m = o.match(/^guest(\d+)$/i);
    if(m) return (lang()==='pt'?'Convidado ':'Guest ') + m[1];
    return o.charAt(0).toUpperCase() + o.slice(1);
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const todayStr = () => new Date().toISOString().slice(0,10);

  /* ---------- config estilo Anki ---------- */
  const CFG = { learnSteps:[1,10], relearnSteps:[10], gradInt:1, easyInt:4, startEase:2.5,
    hardMult:1.2, easyBonus:1.3, lapseMult:0.5, minEase:1.3, maxEase:3.2, leech:8 };

  /* ---------- persistência + migração ---------- */
  function migrateCard(c){
    if(c.flag === undefined) c.flag = null;
    if(c.buriedUntil === undefined) c.buriedUntil = 0;
    if(c.state) return c;
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
    if(d.prefs.retention == null) d.prefs.retention = 0.9;
    if(!Array.isArray(d.prefs.easyDays)) d.prefs.easyDays = [];
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
  save();
  const uid = p => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const dayCounters = () => { const k = todayStr();
    if(!DB.days[k]) DB.days[k] = {newDone:0, revDone:0, ok:0, total:0, matOk:0, matTotal:0};
    return DB.days[k]; };
  const retFactor = () => {
    const r = Math.min(.97, Math.max(.7, DB.prefs.retention || 0.9));
    return Math.log(r)/Math.log(0.9); // 0.9 → 1.0 ; 0.97 → ~0.29 ; 0.7 → ~3.4
  };

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
      interval:0, ease:CFG.startEase, reps:0, lapses:0, suspended:false, flag:null, buriedUntil:0};
    return DB.sharedProgress[sc.id];
  }

  /* ---------- filas ---------- */
  const endOfToday = () => { const d = new Date(); d.setHours(23,59,59,999); return d.getTime(); };
  const startOfTomorrow = () => endOfToday() + 1;
  const stateOf = it => it.kind === 'own' ? it.card : progressOf(it.card);
  const isBuried = s => s.buriedUntil && s.buriedUntil > Date.now();
  function allItems(src){
    src = src || DB.prefs.source;
    let items = [];
    if(src !== 'shared') items = items.concat(DB.cards.map(c => ({kind:'own', card:c})));
    if(src !== 'mine') items = items.concat(foreignShared().map(sc => ({kind:'shared', card:sc})));
    return items;
  }
  function queues(src, deckId){
    const eod = endOfToday(), dc = dayCounters();
    const items = allItems(src).filter(it => {
      const s = stateOf(it);
      if(s.suspended || isBuried(s)) return false;
      if(deckId && !(it.kind==='own' && it.card.deckId === deckId)) return false;
      return true;
    });
    const learn = items.filter(it => { const s = stateOf(it); return (s.state==='learn'||s.state==='relearn') && s.due <= eod; });
    const review = items.filter(it => { const s = stateOf(it); return s.state==='review' && s.due <= eod; })
      .slice(0, Math.max(0, DB.prefs.revPerDay - dc.revDone));
    const easyToday = DB.prefs.easyDays.includes(new Date().getDay());
    const fresh = easyToday ? [] : items.filter(it => stateOf(it).state==='new')
      .slice(0, Math.max(0, DB.prefs.newPerDay - dc.newDone));
    return {learn, review, fresh};
  }

  /* ---------- agendamento SM-2 + learning steps + retenção ---------- */
  function reviewNextInterval(s, rating){
    if(rating === 'hard') return Math.max(s.interval+1, Math.round(s.interval*CFG.hardMult*retFactor()));
    if(rating === 'good') return Math.max(s.interval+1, Math.round(s.interval*s.ease*retFactor()));
    return Math.max(s.interval+2, Math.round(s.interval*s.ease*CFG.easyBonus*retFactor()));
  }
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
    return fmt(reviewNextInterval(s, rating)*DAY);
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
        else { s.interval = s.state === 'relearn' ? Math.max(1, s.interval) : CFG.gradInt;
          s.state = 'review'; s.reps++; s.due = now + s.interval*DAY; }
      } else { s.interval = s.state === 'relearn' ? Math.max(CFG.gradInt, s.interval) : CFG.easyInt;
        s.state = 'review'; s.reps++; s.due = now + s.interval*DAY; }
    } else {
      if(rating === 'again'){
        s.lapses++; s.ease = Math.max(CFG.minEase, s.ease - 0.2);
        s.interval = Math.max(1, Math.round(s.interval * CFG.lapseMult));
        s.state = 'relearn'; s.stepIdx = 0; s.due = now + CFG.relearnSteps[0]*MIN;
        if(s.lapses >= CFG.leech){ s.suspended = true; leech = true;
          if(s.tags && !s.tags.includes('leech')) s.tags.push('leech'); }
      } else {
        if(rating === 'hard') s.ease = Math.max(CFG.minEase, s.ease - 0.15);
        if(rating === 'easy') s.ease = Math.min(CFG.maxEase, s.ease + 0.15);
        s.interval = reviewNextInterval(s, rating);
        s.reps++; s.due = now + s.interval*DAY;
      }
    }
    return leech;
  }

  /* ---------- cloze ---------- */
  const isCloze = txt => /\{\{c\d+::(.+?)\}\}/.test(txt);
  const clozeFront = txt => esc(txt).replace(/\{\{c\d+::(.+?)\}\}/g, '<span class="fc-cloze">[...]</span>');
  const clozeBack = txt => esc(txt).replace(/\{\{c\d+::(.+?)\}\}/g, '<span class="fc-cloze fc-cloze-open">$1</span>');

  /* ---------- imagens ---------- */
  function imgToBase64(file){
    return new Promise((res,rej)=>{
      if(!file.type || !file.type.startsWith('image/')) return rej('Only images allowed');
      if(file.size > 5242880) return rej('Max 5MB');
      const r = new FileReader(); r.onload = () => res(r.result);
      r.onerror = () => rej('Read failed'); r.readAsDataURL(file);
    });
  }
  async function pasteImage(){
    try{ const items = await navigator.clipboard.read();
      for(const item of items){ if(item.types.includes('image/png')){
        const blob = await item.getType('image/png'); const b64 = await imgToBase64(blob);
        displayImagePreview(b64); } } }catch(e){ console.log('Paste failed', e); }
  }
  function displayImagePreview(b64){
    const preview = document.querySelector('#fcImagePreview');
    if(!preview) return;
    window.currentImageB64 = b64 || null;
    preview.innerHTML = b64 ? `<img src="${b64}" style="max-width:100%;max-height:120px;border-radius:8px"/>
      <button class="fc-btn fc-sm" data-act="remove-image" style="margin-top:6px">✕</button>` : '';
    preview.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', onAct));
  }

  function showToast(msg){
    if(!root) return;
    const old = root.querySelector('.fc-toast'); if(old) old.remove();
    const el = document.createElement('div');
    el.className = 'fc-toast';
    el.innerHTML = `<span class="fc-toast-icon">⇄</span><span>${esc(msg)}</span>`;
    root.appendChild(el);
    requestAnimationFrame(()=> el.classList.add('show'));
    setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(), 300); }, 3200);
  }

  /* ---------- tradução dinâmica do CONTEÚDO dos cards (front/back) ----------
     Mesmo motor usado no AI Tutor. A interface (botões/labels) já traduz via T[lang];
     isto traduz o texto que o usuário escreveu/importou, em qualquer idioma de origem,
     sempre que a bandeira for trocada. Cards cloze não são traduzidos (preserva a sintaxe
     {{c1::...}}); o original em DB nunca é sobrescrito, só a exibição. */
  const TRANSLATE_API = 'https://api.mymemory.translated.net/get';
  const transCache = {}; // `${text}|${targetLang}` -> texto traduzido
  let renderToken = 0;
  async function translateField(text, targetLang){
    if(!text || !text.trim()) return text;
    const key = text + '|' + targetLang;
    if(transCache[key]) return transCache[key];
    try{
      const url = `${TRANSLATE_API}?q=${encodeURIComponent(text.slice(0,480))}&langpair=autodetect|${targetLang}`;
      const resp = await fetch(url);
      const data = await resp.json();
      const out = data?.responseData?.translatedText || text;
      transCache[key] = out;
      return out;
    }catch(e){ return text; }
  }
  function translateVisibleCardTexts(){
    const myToken = renderToken;
    const targetLang = lang();
    root.querySelectorAll('[data-fc-i18n-text]').forEach(async el => {
      const original = el.dataset.fcOriginal;
      if(!original) return;
      if(isCloze(original)) return; // preserva sintaxe cloze
      const translated = await translateField(original, targetLang);
      if(renderToken !== myToken) return; // usuário já navegou para outra tela
      el.textContent = translated;
    });
  }

  /* ---------- estado/UI ---------- */
  let view = {name:'home'};
  let root = null, undoBuf = null;
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
    renderToken++;
    if(view.name === 'home') renderHome();
    else if(view.name === 'dash') renderDash();
    else if(view.name === 'browse') renderBrowse();
    else if(view.name === 'review') renderReview();
    else if(view.name === 'stats') renderStats();
    translateVisibleCardTexts();
  }

  const stBadge = s => {
    if(s.suspended) return `<i class="fc-st fc-st-susp">${t('stSuspended')}</i>`;
    const map = {new:['fc-st-new','stNew'], learn:['fc-st-learn','stLearn'], review:['fc-st-rev','stReview'], relearn:['fc-st-learn','stRelearn']};
    const [cls,key] = map[s.state] || map.new;
    return `<i class="fc-st ${cls}">${t(key)}</i>`;
  };
  const flagDot = s => s.flag ? `<i class="fc-flag fc-flag-${s.flag}"></i>` : '';
  const sourceSelector = () => `<div class="fc-src" role="tablist">
    ${['mine','shared','all'].map(s => `<button class="fc-src-btn ${DB.prefs.source===s?'on':''}" data-act="src" data-src="${s}">${t(s==='mine'?'srcMine':s==='shared'?'srcShared':'srcAll')}</button>`).join('')}</div>`;

  function streakDays(){
    let n = 0;
    for(let i=0;;i++){
      const d = new Date(Date.now()-i*DAY).toISOString().slice(0,10);
      const rec = DB.days[d];
      if(rec && rec.total > 0) n++;
      else if(i === 0) continue; // hoje ainda sem revisão não quebra a sequência
      else break;
    }
    return n;
  }

  /* ---------- LANDING (guia gerado de FEATURES/QUICKSTART) ---------- */
  function renderHome(){
    const L = lang();
    const q = queues();
    const dc = dayCounters();
    const ret = DB.stats.matTotal ? Math.round(100*DB.stats.matOk/DB.stats.matTotal) : 0;
    const steps = QUICKSTART[L].map((s,i) => `<div class="fc-step"><b>${i+1}</b><span>${s}</span></div>`).join('');
    const feats = FEATURES.map(f => `<div class="fc-feat"><span class="fc-feat-i">${f.i}</span>
      <div><strong>${f[L][0]}</strong><p>${f[L][1]}</p></div></div>`).join('');
    const myShared = DB.cards.filter(c=>c.shared).length;
    const theirShared = foreignShared().length;
    const streak = streakDays();
    const shareBanner = `<div class="fc-share-banner">
      <span class="fc-share-banner-icon">⇄</span>
      <div class="fc-share-banner-txt"><strong>${t('shareBannerTitle')}</strong><p>${t('shareBannerBody')}</p></div>
      <div class="fc-share-counts"><b>${myShared}</b><span>${t('sharedByMe')}</span></div>
      <div class="fc-share-counts"><b>${theirShared}</b><span>${t('sharedByOthers')}</span></div>
    </div>`;
    const perfCard = (val, label, cls) => `<div class="fc-perf-card">
      <strong class="${cls||''}">${val}</strong><span>${label}</span></div>`;
    root.innerHTML = `
      <div class="fc-hero">
        <div class="fc-hero-txt">
          <div class="fc-title-row">
            <h1 class="fc-title">${t('title')}</h1>
            <button class="fc-btn fc-primary fc-cta" data-act="open-app">${t('openApp')}</button>
          </div>
          <p class="fc-bread">${t('bread')}</p>
          <p class="fc-hero-sub">${t('heroSub')}</p>
        </div>
      </div>

      <div class="fc-perf">
        <div class="fc-perf-head"><h2 class="fc-perf-title">${t('perfTitle')}</h2></div>
        <div class="fc-perf-grid">
          ${perfCard(q.review.length + q.learn.length, t('dueToday'), 'fc-c-rev')}
          ${perfCard(q.fresh.length, t('newCards'), 'fc-c-new')}
          ${perfCard(dc.total, t('statsToday')+' · '+t('statsReviews'))}
          ${perfCard(ret+'%', t('retention'))}
          <div class="fc-perf-card fc-perf-streak">
            <span class="fc-check">✓</span>
            <div><strong>${streak}</strong><span>${t('streak')(streak).replace(/^[\d]+[- ]?/,'')}</span></div>
          </div>
        </div>
      </div>

      <div class="fc-guide-section">
        <h2 class="fc-sub">${t('quickTitle')}</h2>
        <div class="fc-steps">${steps}</div>
        <h2 class="fc-sub">${t('featTitle')}</h2>
        <div class="fc-feats">${feats}</div>
      </div>

      ${shareBanner}`;
    wire();
  }

  function renderDash(){
    const q = queues();
    const ret = DB.stats.matTotal ? Math.round(100*DB.stats.matOk/DB.stats.matTotal) : 0;
    const head = `<button class="fc-btn fc-back" data-act="go-home">${t('guide')}</button>
      <div class="fc-head"><div><h1 class="fc-title">${t('title')}</h1><p class="fc-bread">${t('bread')}</p></div>
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
      const due = list.filter(sc => { const p = progressOf(sc); return !p.suspended && !isBuried(p) && p.due <= eod; }).length;
      return `<div class="fc-deck-row fc-shared-deck"><span class="fc-deck-name">${esc(deckName)} <em class="fc-owner">${t('byOwner')(ownerName(owner))}</em></span>
        <b></b><b></b><b class="fc-c-rev">${due}</b><span class="fc-deck-tools">${list.length} cards</span></div>`;
    }).join('');
    const sharedPanel = `<h2 class="fc-sub">⇄ ${t('sharedBank')} (${fs.length})</h2>
      ${fs.length ? '<div class="fc-deck-table">'+sharedRows+'</div>' : `<p class="fc-empty">${t('sharedEmpty')}</p>`}`;
    root.innerHTML = head + sourceSelector() + chips + decks + sharedPanel + '<div id="fcModal" class="fc-modal" hidden></div>';
    wire();
  }

  /* ---------- browser + busca avançada ---------- */
  function parseQuery(q){
    const f = {deck:null, tags:[], flag:null, text:[]};
    q.trim().split(/\s+/).filter(Boolean).forEach(tok => {
      const m = tok.match(/^(deck|tag|flag):(.+)$/i);
      if(!m){ f.text.push(tok.toLowerCase()); return; }
      const v = m[2].toLowerCase();
      if(m[1].toLowerCase()==='deck') f.deck = v;
      else if(m[1].toLowerCase()==='tag') f.tags.push(v);
      else f.flag = v;
    });
    return f;
  }
  function renderBrowse(){
    const f = view.filter || (view.filter = {q:'', deck: view.deckId || '', state:''});
    const pq = parseQuery(f.q);
    const rowsData = allItems('all').filter(it => {
      const c = it.card, s = stateOf(it);
      if(f.deck && !(it.kind==='own' && c.deckId === f.deck)) return false;
      if(f.state === 'suspended'){ if(!s.suspended) return false; }
      else if(f.state && (s.state !== f.state || s.suspended)) return false;
      if(pq.deck){ const d = it.kind==='own' ? DB.decks.find(x=>x.id===c.deckId) : {name:c.deckName};
        if(!d || !d.name.toLowerCase().includes(pq.deck)) return false; }
      if(pq.tags.length && !pq.tags.every(tg => (c.tags||[]).some(x => x.toLowerCase().includes(tg)))) return false;
      if(pq.flag && s.flag !== pq.flag) return false;
      if(pq.text.length){ const hay = (c.front + ' ' + c.back + ' ' + (c.tags||[]).join(' ')).toLowerCase();
        if(!pq.text.every(w => hay.includes(w))) return false; }
      return true;
    });
    const suspCount = rowsData.filter(it => it.kind==='own' && stateOf(it).suspended).length;
    const transSpan = (text, cls) => `<span class="${cls||''}" data-fc-i18n-text data-fc-original="${esc(text)}">${esc(text)}</span>`;
    const rows = rowsData.length ? rowsData.map(it => {
      const c = it.card, s = stateOf(it), own = it.kind === 'own';
      const cid = own ? c.id : c.id;
      const cloze = isCloze(c.front);
      return `<div class="fc-row">
        <div class="fc-row-txt"><strong>${flagDot(s)}${cloze?clozeBack(c.front):transSpan(c.front)}
          ${stBadge(s)} ${isBuried(s)?'<i class="fc-st fc-st-susp">💤</i>':''} ${own && c.shared?`<i class="fc-badge">⇄ ${t('sharedBadge')}</i>`:''}
          ${!own?`<i class="fc-owner">${t('byOwner')(ownerName(c.owner))}</i>`:''}</strong>
        <span>${cloze?esc(c.back):transSpan(c.back)}</span>
        ${(c.tags||[]).length?`<em>${c.tags.map(esc).join(' · ')}</em>`:''}</div>
        <div class="fc-row-meta">${s.state==='review' ? t('days')(s.interval)+' · '+new Date(s.due).toISOString().slice(0,10) : ''}</div>
        <div class="fc-row-actions">
          <button class="fc-btn fc-sm" data-act="cycle-flag" data-card="${cid}" data-kind="${it.kind}">🚩</button>
          <button class="fc-btn fc-sm" data-act="toggle-bury" data-card="${cid}" data-kind="${it.kind}">${isBuried(s)?t('unbury'):t('bury')}</button>
          <button class="fc-btn fc-sm" data-act="toggle-susp" data-card="${cid}" data-kind="${it.kind}">${s.suspended?t('unsuspend'):t('suspend')}</button>
          ${own?`<button class="fc-btn fc-sm ${c.shared?'':'fc-share-btn'}" data-act="toggle-share" data-card="${cid}">${c.shared?t('unshare'):t('share')}</button>
          <button class="fc-btn fc-sm" data-act="edit-card" data-card="${cid}">${t('edit')}</button>
          <button class="fc-btn fc-sm fc-danger" data-act="del-card" data-card="${cid}">✕</button>`:''}
        </div></div>`;
    }).join('') : `<p class="fc-empty">${t('noResults')}</p>`;
    root.innerHTML = `<button class="fc-btn fc-back" data-act="back">${t('back')}</button>
      <div class="fc-head"><div><h1 class="fc-title">${t('browse')}</h1><p class="fc-bread">${t('bread')} › ${t('browse')}</p></div>
      <div class="fc-actions">${suspCount?`<button class="fc-btn" data-act="release-filtered">${t('releaseAll')(suspCount)}</button>`:''}
      <button class="fc-btn fc-primary" data-act="create">${t('create')}</button></div></div>
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
    const si = root.querySelector('#fcSearch'); si.focus(); si.setSelectionRange(si.value.length, si.value.length);
    root.querySelector('#fcDeckFilter').addEventListener('change', e => { f.deck = e.target.value; renderBrowse(); });
    root.querySelector('#fcStateFilter').addEventListener('change', e => { f.state = e.target.value; renderBrowse(); });
    view.lastFiltered = rowsData;
    wire();
  }

  /* ---------- revisão ---------- */
  function buildSession(src, deckId){
    const q = queues(src, deckId);
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
    const transSpan = (text, cls) => `<span class="${cls||''}" data-fc-i18n-text data-fc-original="${esc(text)}">${esc(text)}</span>`;
    const frontHtml = cloze ? (view.showBack ? clozeBack(c.front) : clozeFront(c.front)) : transSpan(c.front);
    const backHtml = view.showBack && (!cloze || c.back) ? `<hr class="fc-sep"/><div class="fc-card-back">${cloze?esc(c.back):transSpan(c.back)}</div>` : '';
    const imgHtml = c.image64 ? `<div class="fc-card-image"><img src="${c.image64}" style="max-width:100%;max-height:200px;border-radius:8px;margin:10px 0"/></div>` : '';
    root.innerHTML = `<div class="fc-review-wrap">
      <div class="fc-counts"><b class="fc-c-new">${counts.n}</b> + <b class="fc-c-learn">${counts.l}</b> + <b class="fc-c-rev">${counts.r}</b> ${flagDot(s)}</div>
      ${ownerTag}
      <div class="fc-card">${imgHtml}<div class="fc-card-front">${frontHtml}</div>${backHtml}</div>
      ${view.showBack ? `<div class="fc-rates">${ratings}</div>`
        : `<button class="fc-btn fc-primary fc-show" data-act="show">${t('showAnswer')}</button>`}
      <p class="fc-kbd">${t('kbdHint')}</p>
      <div class="fc-review-tools">
        ${undoBuf ? `<button class="fc-btn fc-sm" data-act="undo">${t('undo')}</button>` : ''}
        <button class="fc-btn fc-sm" data-act="cycle-flag-cur">🚩</button>
        <button class="fc-btn fc-sm" data-act="bury-cur">${t('bury')}</button>
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
    view.queue.shift();
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

  /* ---------- estatísticas + configurações ---------- */
  const STATS_RANGES = {'7d':{n:7,unit:'day'}, '1m':{n:30,unit:'day'}, '3m':{n:13,unit:'week'}, '6m':{n:26,unit:'week'}};
  function buildRangeData(rangeKey){
    const r = STATS_RANGES[rangeKey] || STATS_RANGES['7d'];
    const buckets = [];
    if(r.unit === 'day'){
      for(let i=r.n-1;i>=0;i--){
        const d = new Date(Date.now()-i*DAY);
        const key = d.toISOString().slice(0,10);
        const rec = DB.days[key] || {};
        buckets.push({label: d.toLocaleDateString(lang()==='pt'?'pt-BR':'en-US',{day:'2-digit',month:'2-digit'}),
          total: rec.total||0, ok: rec.ok||0, matOk: rec.matOk||0, matTotal: rec.matTotal||0});
      }
    } else { // semana
      for(let w=r.n-1; w>=0; w--){
        let total=0, ok=0, matOk=0, matTotal=0;
        const end = new Date(Date.now() - w*7*DAY);
        for(let d=0; d<7; d++){
          const day = new Date(end.getTime() - d*DAY).toISOString().slice(0,10);
          const rec = DB.days[day]; if(rec){ total+=rec.total||0; ok+=rec.ok||0; matOk+=rec.matOk||0; matTotal+=rec.matTotal||0; }
        }
        buckets.push({label: (lang()==='pt'?'sem ':'wk ')+end.toLocaleDateString(lang()==='pt'?'pt-BR':'en-US',{day:'2-digit',month:'2-digit'}),
          total, ok, matOk, matTotal});
      }
    }
    return buckets;
  }
  function renderStats(){
    const dc = dayCounters();
    const states = {new:0, learn:0, review:0, relearn:0, susp:0};
    DB.cards.forEach(c => c.suspended ? states.susp++ : states[c.state]++);
    const ret = DB.stats.matTotal ? Math.round(100*DB.stats.matOk/DB.stats.matTotal) : 0;
    const range = view.statsRange || (view.statsRange = '7d');
    const data = buildRangeData(range);
    const max = Math.max(1, ...data.map(x=>x.total));
    const showEvery = data.length > 14 ? Math.ceil(data.length/14) : 1;
    const bars = data.map((x,i) => `<div class="fc-bar-col"><div class="fc-bar" style="height:${Math.round(70*x.total/max)+4}px" title="${x.total}"></div>
      <span>${i % showEvery === 0 ? x.label : ''}</span><b>${x.total||''}</b></div>`).join('');
    const totalRange = data.reduce((a,x)=>a+x.total,0);
    const okRange = data.reduce((a,x)=>a+x.ok,0);
    const matOkR = data.reduce((a,x)=>a+x.matOk,0), matTotR = data.reduce((a,x)=>a+x.matTotal,0);
    const retRange = matTotR ? Math.round(100*matOkR/matTotR) : 0;
    const avgDay = data.length ? Math.round(totalRange/(range==='7d'||range==='1m'?data.length:data.length*7)) : 0;
    const rangeTabs = Object.keys(STATS_RANGES).map(k =>
      `<button class="fc-src-btn ${range===k?'on':''}" data-act="stats-range" data-range="${k}">${t('range_'+k)}</button>`).join('');
    const dows = t('dow').map((n,i) => `<label class="fc-dow"><input type="checkbox" data-dow="${i}" ${DB.prefs.easyDays.includes(i)?'checked':''}/> ${n}</label>`).join('');
    root.innerHTML = `<button class="fc-btn fc-back" data-act="back">${t('back')}</button>
      <div class="fc-head"><div><h1 class="fc-title">${t('statsTitle')}</h1><p class="fc-bread">${t('bread')} › ${t('stats')}</p></div></div>
      <div class="fc-stats">
        <div class="fc-stat"><strong>${dc.total}</strong><span>${t('statsToday')} · ${t('statsReviews')}</span></div>
        <div class="fc-stat"><strong class="fc-c-new">${dc.newDone}</strong><span>${t('newCards')}</span></div>
        <div class="fc-stat"><strong>${ret}%</strong><span>${t('retention')}</span></div>
        <div class="fc-stat"><strong>🔥 ${streakDays()}</strong><span>${t('streak')(streakDays()).replace(/^[\d]+[- ]?/,'')}</span></div>
        <div class="fc-stat"><strong>${DB.cards.length}</strong><span>Cards</span></div></div>
      <h2 class="fc-sub">${t('statsPerf')}</h2>
      <div class="fc-src">${rangeTabs}</div>
      <div class="fc-stats" style="margin-top:10px">
        <div class="fc-stat"><strong>${totalRange}</strong><span>${t('statsReviews')}</span></div>
        <div class="fc-stat"><strong>${avgDay}</strong><span>${t('statsAvgDay')}</span></div>
        <div class="fc-stat"><strong>${okRange}</strong><span>${t('statsGoodEasy')}</span></div>
        <div class="fc-stat"><strong>${retRange}%</strong><span>${t('retention')}</span></div>
      </div>
      <div class="fc-bars fc-bars-range">${bars}</div>
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
        <label>${t('retentionLbl')} <input id="fcRetention" type="range" min="70" max="97" value="${Math.round((DB.prefs.retention||0.9)*100)}"/>
          <b id="fcRetVal">${Math.round((DB.prefs.retention||0.9)*100)}%</b></label>
      </div>
      <p class="fc-hint">${t('retentionHint')}</p>
      <div class="fc-limits"><span>${t('easyDaysLbl')}:</span> ${dows}</div>
      <div class="fc-limits">
        <label>${t('postponeLbl')} <input id="fcPostpone" type="number" min="1" value="1"/> ${t('daysSuffix')}</label>
        <button class="fc-btn fc-sm" data-act="postpone">${t('postponeBtn')}</button>
        <span id="fcPostMsg" class="fc-hint"></span>
      </div>
      <p class="fc-hint">${t('statsRetentionInfo')}</p>`;
    root.querySelector('#fcNewLimit').addEventListener('change', e => { DB.prefs.newPerDay = Math.max(0, +e.target.value||0); save(); });
    root.querySelector('#fcRevLimit').addEventListener('change', e => { DB.prefs.revPerDay = Math.max(0, +e.target.value||0); save(); });
    root.querySelector('#fcRetention').addEventListener('input', e => {
      DB.prefs.retention = Math.min(97, Math.max(70, +e.target.value))/100;
      root.querySelector('#fcRetVal').textContent = e.target.value + '%'; save(); });
    root.querySelectorAll('[data-dow]').forEach(cb => cb.addEventListener('change', e => {
      const d = +e.target.dataset.dow;
      DB.prefs.easyDays = e.target.checked ? [...new Set([...DB.prefs.easyDays, d])] : DB.prefs.easyDays.filter(x=>x!==d);
      save(); }));
    wire();
  }

  /* ---------- modais ---------- */
  function openModal(html){ const m = root.querySelector('#fcModal'); if(!m) return; m.innerHTML = `<div class="fc-modal-box">${html}</div>`; m.hidden = false;
    m.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', onAct)); }
  function closeModal(){ const m = root.querySelector('#fcModal'); if(m){ m.hidden = true; m.innerHTML=''; } window.currentImageB64 = null; }
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
  const shareCheckbox = checked => `<label class="fc-share-box ${checked?'on':''}" id="fcShareBox">
      <input type="checkbox" id="fcShare" ${checked?'checked':''}/>
      <div class="fc-share-body">
        <strong class="fc-share-title">⇄ ${t('shareTitle')}</strong>
        <small class="fc-share-sub">${t('shareLbl')}</small>
      </div>
    </label>`;

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
      <div id="fcImagePreview" style="margin:10px 0">${c.image64?`<img src="${c.image64}" style="max-width:100%;max-height:120px;border-radius:8px"/><button class="fc-btn fc-sm" data-act="remove-image" style="margin-top:6px">✕</button>`:''}</div>
      <label>${t('backSide')}</label><textarea id="fcBack" rows="3">${esc(c.back)}</textarea>
      <p class="fc-hint">${t('clozeHint')}</p>
      <label>${t('tags')}</label><input id="fcTags" value="${esc((c.tags||[]).join(', '))}"/>
      ${card?'':`<label class="fc-check"><input type="checkbox" id="fcReversed"/> 🔁 ${t('reversedLbl')}</label>`}
      ${shareCheckbox(c.shared)}
      <p id="fcMsg" class="fc-msg"></p>
      <div class="fc-modal-actions"><button class="fc-btn" data-act="close">${t('cancel')}</button>
      <button class="fc-btn fc-primary" data-act="save-card" data-card="${card?card.id:''}">${t('save')}</button></div>`);
    wireDeckPicker();
    const fileInput = document.createElement('input'); fileInput.type='file'; fileInput.accept='image/*'; fileInput.id='fcImageUpload'; fileInput.style.display='none';
    root.querySelector('#fcModal').appendChild(fileInput);
    fileInput.addEventListener('change', async e => { if(e.target.files[0]) { try{ const b64 = await imgToBase64(e.target.files[0]); displayImagePreview(b64); }catch(err){ root.querySelector('#fcMsg').textContent = err; } } });
  }
  function importForm(){
    openModal(`<h2>${t('imp')}</h2>${deckPicker('')}
      <button class="fc-btn fc-sm" data-act="import-file" style="margin:10px 0">${t('impFile')}</button>
      <p id="fcFileMsg" class="fc-hint"></p>
      <p class="fc-hint">${t('impHint')}</p>
      <textarea id="fcBatch" rows="7" placeholder="${esc(t('impExample'))}"></textarea>
      <label class="fc-check"><input type="checkbox" id="fcImpSusp"/> 🔒 ${t('impSuspended')}</label>
      ${shareCheckbox(false)}
      <p id="fcMsg" class="fc-msg"></p>
      <div class="fc-modal-actions"><button class="fc-btn" data-act="close">${t('cancel')}</button>
      <button class="fc-btn fc-primary" data-act="save-batch">${t('impBtn')}</button></div>`);
    wireDeckPicker();
    const fi = document.createElement('input'); fi.type='file'; fi.accept='.txt,.csv,.md,text/plain,text/csv'; fi.id='fcBatchFile'; fi.style.display='none';
    root.querySelector('#fcModal').appendChild(fi);
    fi.addEventListener('change', e => {
      const file = e.target.files[0]; if(!file) return;
      const r = new FileReader();
      r.onload = () => { const txt = String(r.result || '');
        root.querySelector('#fcBatch').value = txt;
        const n = txt.split('\n').filter(l => l.includes('::') || l.includes('\t')).length;
        root.querySelector('#fcFileMsg').textContent = t('impFileLoaded')(n); };
      r.readAsText(file);
    });
  }
  function parseBatchLine(l){
    l = l.trim(); if(!l) return null;
    let parts;
    if(l.includes('::')) parts = l.split('::').map(s=>s.trim());
    else if(l.includes('\t')) parts = l.split('\t').map(s=>s.trim());
    else return null;
    if(parts.length < 2 || !parts[0] || !parts[1]) return null;
    const tags = parts[2] ? parts[2].split(/[,;]/).map(s=>s.trim()).filter(Boolean) : [];
    return {front: parts[0], back: parts[1], tags};
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
  const newCard = (deckId, front, back, tags, shared, image64, suspended) => ({id: uid('fc'), deckId, front, back,
    image64: image64||null, tags: tags||[], type: isCloze(front)?'cloze':'basic', source:'manual', shared: !!shared,
    createdAt: todayStr(), state:'new', stepIdx:0, due: Date.now(), interval:0,
    ease:CFG.startEase, reps:0, lapses:0, suspended: !!suspended, flag:null, buriedUntil:0});

  function exportDeck(deckId){
    const d = DB.decks.find(x=>x.id===deckId); if(!d) return;
    const txt = DB.cards.filter(c=>c.deckId===deckId)
      .map(c=>`${c.front} :: ${c.back}${(c.tags||[]).length?' :: '+c.tags.join(', '):''}`).join('\n');
    const blob = new Blob([txt], {type:'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `couplemed_${d.name.replace(/\s+/g,'_')}.txt`;
    a.click(); URL.revokeObjectURL(a.href);
  }
  const findState = (id, kind) => kind === 'shared'
    ? progressOf(SH.cards.find(sc=>sc.id===id))
    : DB.cards.find(x=>x.id===id);

  /* ---------- eventos ---------- */
  function wire(){ root.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', onAct)); }
  function onAct(e){
    const el = e.currentTarget, act = el.dataset.act;
    if(act==='open-app'){ view={name:'dash'}; render(); }
    else if(act==='go-home'){ view={name:'home'}; render(); }
    else if(act==='create') cardForm(null, el.dataset.deck||'');
    else if(act==='import') importForm();
    else if(act==='import-file') document.querySelector('#fcBatchFile').click();
    else if(act==='upload-image') document.querySelector('#fcImageUpload').click();
    else if(act==='paste-image') pasteImage();
    else if(act==='remove-image') displayImagePreview(null);
    else if(act==='close') closeModal();
    else if(act==='back'){ view={name:'dash'}; undoBuf = null; render(); }
    else if(act==='src'){ DB.prefs.source = el.dataset.src; save(); render(); }
    else if(act==='browse'){ view={name:'browse'}; render(); }
    else if(act==='browse-deck'){ view={name:'browse', deckId: el.dataset.deck}; render(); }
    else if(act==='stats'){ view={name:'stats', statsRange: view.statsRange||'7d'}; render(); }
    else if(act==='stats-range'){ view.statsRange = el.dataset.range; render(); }
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
      const s = findState(el.dataset.card, el.dataset.kind);
      if(s){ s.suspended = !s.suspended; save(); render(); }
    }
    else if(act==='toggle-bury'){
      const s = findState(el.dataset.card, el.dataset.kind);
      if(s){ s.buriedUntil = isBuried(s) ? 0 : startOfTomorrow(); save(); render(); }
    }
    else if(act==='cycle-flag'){
      const s = findState(el.dataset.card, el.dataset.kind);
      if(s){ s.flag = FLAGS[(FLAGS.indexOf(s.flag)+1) % FLAGS.length]; save(); render(); }
    }
    else if(act==='cycle-flag-cur'){
      const s = stateOf(view.queue[0]);
      s.flag = FLAGS[(FLAGS.indexOf(s.flag)+1) % FLAGS.length]; save(); render();
    }
    else if(act==='bury-cur'){
      const s = stateOf(view.queue[0]);
      s.buriedUntil = startOfTomorrow(); save();
      view.queue.shift(); view.showBack = false; render();
    }
    else if(act==='release-filtered'){
      let n = 0;
      (view.lastFiltered||[]).forEach(it => { if(it.kind==='own'){ const s = stateOf(it);
        if(s.suspended){ s.suspended = false; n++; } } });
      save(); view.flash = t('released')(n); renderBrowse();
    }
    else if(act==='postpone'){
      const days = Math.max(1, +root.querySelector('#fcPostpone').value || 1);
      const eod = endOfToday(); let n = 0;
      DB.cards.forEach(c => { if(c.state==='review' && !c.suspended && c.due <= eod){ c.due += days*DAY; n++; } });
      Object.values(DB.sharedProgress).forEach(p => { if(p.state==='review' && !p.suspended && p.due <= eod){ p.due += days*DAY; n++; } });
      save(); root.querySelector('#fcPostMsg').textContent = t('postponed')(n);
    }
    else if(act==='edit-card'){ cardForm(DB.cards.find(c=>c.id===el.dataset.card)); }
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
      else {
        card = newCard(deckId, front, back, tags, shared, window.currentImageB64);
        DB.cards.push(card);
        const rev = root.querySelector('#fcReversed');
        if(rev && rev.checked && back){
          const rc = newCard(deckId, back, front, tags, shared, window.currentImageB64);
          DB.cards.push(rc); syncShare(rc);
        }
      }
      syncShare(card); save(); closeModal(); render();
      if(shared) showToast(t('shareToast'));
    }
    else if(act==='save-batch'){
      const msg = root.querySelector('#fcMsg');
      const deckId = resolveDeck();
      if(!deckId){ msg.textContent = t('deckRequired'); return; }
      const shared = root.querySelector('#fcShare').checked;
      const susp = root.querySelector('#fcImpSusp').checked;
      let n = 0;
      root.querySelector('#fcBatch').value.split('\n').forEach(l => {
        const p = parseBatchLine(l);
        if(p){ const card = newCard(deckId, p.front, p.back, p.tags, shared, null, susp);
          DB.cards.push(card); syncShare(card); n++; }
      });
      if(!n){ msg.textContent = t('impHint'); return; }
      save(); closeModal(); render();
      if(shared) showToast(t('shareToastBatch')(n));
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
      const cur = stateOf(undoBuf.item);
      Object.keys(undoBuf.snap).forEach(k => cur[k] = undoBuf.snap[k]);
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
