/* Flashcards gerados a partir da Library 1 (guia, Seção 5.4):
   - o pacote traz 30 cards BILÍNGUES por tópico, no padrão "Anki melhorado";
   - a semeadura é idempotente e preserva o progresso de estudo;
   - os cards entram com sys/subj/topic, então caem nos filtros e na busca;
   - subject inexistente na taxonomia dos Flashcards vai para Miscellaneous (misc). */
const { JSDOM } = require(process.env.JSDOM_PATH || 'jsdom');
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../..');

let fail = 0;
const ok = (l,c,e)=>{ console.log((c?'  ✅ ':'  ❌ ')+l+(c?'':'  <-- '+(e||''))); if(!c)fail++; };

/* ---------- 1. o pacote de cards, lido como dado puro ---------- */
console.log('\n== PACOTE DE CARDS ==');
/* Qual tópico conferir. Sem argumento, VARRE TODOS os pacotes — antes isto era
   fixo em allergy-and-immunology/acute-rheumatic-fever, e como o §0 manda rodar
   este teste para validar o tópico que acabou de entrar, ele saía ✅ conferindo o
   tópico velho mesmo que o novo estivesse com zero flashcards.
     node tools/tests/test-flashcards.js                        # todos
     node tools/tests/test-flashcards.js <subject-slug> [topic-slug]  */
const argSubject = process.argv[2] || null;
const argTopic   = process.argv[3] || null;

const PACK_DIR = REPO + '/public/js/library1-flashcards';
const packFiles = fs.readdirSync(PACK_DIR).filter(f => f.endsWith('.js') && !f.startsWith('_'))
                    .filter(f => !argSubject || f === argSubject + '.js');
if (!packFiles.length){
  console.log(`\n❌ nenhum pacote de flashcards encontrado${argSubject ? ' para ' + argSubject : ''} em public/js/library1-flashcards/`);
  process.exit(1);
}

const sandbox = { window:{} };
for (const f of packFiles) new Function('window', fs.readFileSync(PACK_DIR + '/' + f,'utf8'))(sandbox.window);
const packs = sandbox.window.LIBRARY1_FLASHCARDS;

/* lista de (subject, topic) a conferir */
const alvos = [];
for (const subj of Object.keys(packs || {})){
  if (argSubject && subj !== argSubject) continue;
  for (const top of Object.keys(packs[subj] || {})){
    if (argTopic && top !== argTopic) continue;
    alvos.push([subj, top]);
  }
}
if (!alvos.length){
  console.log(`\n❌ nada a conferir: ${argSubject||'(todos)'} / ${argTopic||'(todos)'} não existe nos pacotes`);
  process.exit(1);
}
console.log(`   conferindo ${alvos.length} tópico(s): ${alvos.map(a=>a[1]).join(', ')}`);

const targets = alvos.map(([subject, topic]) => ({
  subject, topic,
  cards: Array.isArray(packs[subject] && packs[subject][topic]) ? packs[subject][topic] : []
}));

/* Cada alvo filtrado precisa passar pelo conjunto inteiro de invariantes. Antes,
   apenas alvos[0] era testado, então `subject` sem `topic` e a varredura global
   podiam aprovar tópicos posteriores sem sequer lê-los. */
for (const target of targets){
  const { subject, topic, cards } = target;
  const where = `${subject} › ${topic}`;
  const prefix = `[${where}] `;

  ok(prefix+'pacote existe', Array.isArray(packs[subject] && packs[subject][topic]));
  ok(prefix+'tem exatamente 30 cards', cards.length===30, `${cards.length} cards`);
  ok(prefix+'todos com id único', new Set(cards.map(c=>c.id)).size===cards.length);
  ok(prefix+'ids com prefixo L1FC- (idempotência)', cards.every(c=>/^L1FC-/.test(c.id)));
  ok(prefix+'todos BILÍNGUES (en e pt com front+back)', cards.every(c=>c.en&&c.en.front&&c.en.back&&c.pt&&c.pt.front&&c.pt.back));
  ok(prefix+'todos com `why` (elaboração) nos dois idiomas', cards.every(c=>c.en&&c.pt&&c.en.why&&c.pt.why));
  ok(prefix+'todos com `kind` (tipo pedagógico)', cards.every(c=>c.kind));
  const kinds = new Set(cards.map(c=>c.kind));
  ok(prefix+'usa vários tipos (interleaving de formatos)', kinds.size>=5, [...kinds].join(','));
  ok(prefix+'PT não é cópia do EN', cards.every(c=>c.en&&c.pt&&c.en.front!==c.pt.front));
  ok(prefix+'todos com sys/subj/topic (entram nos filtros)', cards.every(c=>c.sys && c.subj && c.topic));
  ok(prefix+'subj no formato <sys>::<slug>', cards.every(c=>c.sys&&c.subj&&c.subj.startsWith(c.sys+'::')));
  ok(prefix+'topic bilíngue', cards.every(c=>c.topic&&c.topic.en&&c.topic.pt));
  ok(prefix+'todos com tags', cards.every(c=>Array.isArray(c.tags) && c.tags.length));

  const cloze = cards.filter(c=>c.en&&/\{\{c\d+::/.test(c.en.front));
  ok(prefix+'usa cloze no padrão Anki em parte dos cards', cloze.length>=3, `${cloze.length} cloze`);
  const withImg = cards.filter(c=>!!c.img);
  // O caminho é derivado de CADA tópico auditado, nunca de um piloto fixo.
  const imgBase = `/assets/library1/${subject}/${topic}/`;
  ok(prefix+'imagens apontam para assets publicados da Library 1',
     withImg.every(c=>c.img.startsWith(imgBase)), imgBase);
}

const targetCards = targets.flatMap(t=>t.cards);
ok('ids únicos entre todos os alvos filtrados',
   new Set(targetCards.map(c=>c.id)).size===targetCards.length);

console.log('\n== AS IMAGENS REFERENCIADAS EXISTEM EM DISCO ==');
const srcs = [...new Set(targetCards.filter(c=>c.img).map(c=>c.img))];
srcs.forEach(src=>{
  const p = path.join(REPO,'public',src.replace(/^\//,''));
  ok(path.basename(src), fs.existsSync(p), 'arquivo não existe: '+src);
});

/* ---------- 2. taxonomia: o subj existe na lista dos Flashcards? ---------- */
console.log('\n== TAXONOMIA (filtro por sistema/subject) ==');
const fcSrc = fs.readFileSync(REPO + '/public/js/flashcards.js','utf8');
const taxBlock = fcSrc.slice(fcSrc.indexOf('const FC_TAXONOMY = ['), fcSrc.indexOf('const FC_SUBJ_ID'));
const FC_TAXONOMY = eval(taxBlock.replace('const FC_TAXONOMY =','').replace(/;\s*$/,''));
const ids = new Set();
FC_TAXONOMY.forEach(s=>s.subs.forEach(([slug])=>ids.add(s.id+'::'+slug)));
const used = [...new Set(targetCards.map(c=>c.subj).filter(Boolean))];
used.forEach(u=>ok(`subj "${u}" existe na taxonomia dos Flashcards`, ids.has(u),
  'não existe — deveria cair em <sys>::misc (Miscellaneous)'));
const usedSystems = [...new Set(targetCards.map(c=>c.sys).filter(Boolean))];
ok('todo sistema usado existe', usedSystems.every(s=>FC_TAXONOMY.some(t=>t.id===s)));
usedSystems.forEach(system=>{
  const tax = FC_TAXONOMY.find(t=>t.id===system);
  ok(`a regra de Miscellaneous está disponível em "${system}"`,
     !!tax && tax.subs.some(([slug])=>slug==='misc'));
});

/* ---------- 3. semeadura no banco do usuário ---------- */
console.log('\n== SEMEADURA NO BANCO (todos os usuários) ==');
function boot(prevDB){
  const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', {
    url: 'https://couplemed.test/app.html?page=flashcards&u=john',
    runScripts: 'dangerously', pretendToBeVisual: true
  });
  const w = dom.window;
  if(prevDB) w.localStorage.setItem('couplemed_fc_john', JSON.stringify(prevDB));
  // Carrega dinamicamente os mesmos pacotes selecionados no início do teste.
  // Assim qualquer Subject novo é testável sem editar este arquivo.
  for (const f of packFiles){
    const packScript = w.document.createElement('script');
    packScript.textContent = fs.readFileSync(PACK_DIR + '/' + f,'utf8');
    w.document.head.appendChild(packScript);
  }
  const appScript = w.document.createElement('script');
  appScript.textContent = fs.readFileSync(REPO + '/public/js/flashcards.js','utf8');
  w.document.head.appendChild(appScript);
  return JSON.parse(w.localStorage.getItem('couplemed_fc_john') || '{}');
}

const db1 = boot(null);
const seeded = (db1.cards||[]).filter(c=>c.source==='library1');
// O boot recebe todos os tópicos dos pacotes selecionados, ainda que o filtro
// final escolha um único tópico dentro do arquivo do Subject.
const loadedTopics = Object.entries(packs || {}).flatMap(([subject, topics]) =>
  Object.entries(topics || {}).map(([topic, list]) => ({
    subject, topic, cards: Array.isArray(list) ? list : []
  })));
const loadedCards = loadedTopics.flatMap(t=>t.cards);
const TOPICOS = loadedTopics.length;
const ESPERADO = 30 * TOPICOS;
ok('ids únicos em todos os pacotes carregados',
   new Set(loadedCards.map(c=>c.id)).size===loadedCards.length);
ok(`semeia 30 cards por tópico no primeiro boot (${TOPICOS} tópico(s) = ${ESPERADO})`,
   seeded.length===ESPERADO, `${(db1.cards||[]).length} cards no total, ${seeded.length} da Library 1`);
ok('nenhum id duplicado no banco semeado',
   new Set(seeded.map(c=>c.id)).size===seeded.length);
ok('marcados com source:"library1"', seeded.every(c=>c.source==='library1'));
for (const target of targets){
  const first = target.cards[0] || {};
  const topic = first.topic || {};
  const expectedEn = topic.en || topic || target.topic;
  const expectedPt = topic.pt || topic.en || topic || target.topic;
  const deckId = 'deck_l1_' + target.topic;
  const deck = (db1.decks||[]).find(d=>d.id===deckId);
  const where = `${target.subject} › ${target.topic}`;
  ok(`[${where}] um deck por tópico (id derivado do slug)`, !!deck, deckId);
  ok(`[${where}] deck criado com o NOME DO TÓPICO`,
     !!deck && deck.name===expectedEn, deck ? deck.name : '(sem deck)');
  ok(`[${where}] deck tem nome em português também`,
     !!deck && deck.namePt===expectedPt, deck ? deck.namePt : '(sem deck)');
}
ok('cards guardam o bloco bilíngue no banco', seeded.every(c=>c.l1&&c.l1.en&&c.l1.pt));
ok('cards guardam o kind', seeded.every(c=>c.kind));
ok('cards começam como "new" (entram no SRS)', seeded.every(c=>c.state==='new'));
ok('preserva sys/subj/topic no banco', seeded.every(c=>c.sys && c.subj && c.topic));

// idempotência + preservação de progresso
const touched = JSON.parse(JSON.stringify(db1));
const sampleSource = targetCards.find(c=>c&&c.id);
const sampleId = sampleSource && sampleSource.id;
const touchedCard = sampleId && touched.cards.find(c=>c.id===sampleId);
ok('há card-alvo para testar preservação de progresso', !!touchedCard, sampleId || '(sem id)');
if(touchedCard){
  touchedCard.reps = 7; touchedCard.state = 'review';
  touchedCard.interval = 12; touchedCard.ease = 2.7;
}
const db2 = boot(touched);
const seeded2 = (db2.cards||[]).filter(c=>c.source==='library1');
ok('segundo boot NÃO duplica', seeded2.length===ESPERADO, `${seeded2.length} cards`);
const after = sampleId && db2.cards.find(c=>c.id===sampleId);
ok('progresso de estudo preservado',
   !!after && after.reps===7 && after.state==='review' && after.interval===12,
   after ? `reps=${after.reps} state=${after.state}` : `card ${sampleId || '(sem id)'} ausente`);

// card do usuário não é afetado
const withOwn = JSON.parse(JSON.stringify(db1));
withOwn.cards.push({ id:'fc_meu', deckId:'d1', front:'meu card', back:'x', tags:[], type:'basic',
  source:'manual', shared:false, sys:null, subj:null, topic:null, createdAt:'2026-01-01',
  state:'new', stepIdx:0, due:1, interval:0, ease:2.5, reps:0, lapses:0, suspended:false, flag:null, buriedUntil:0 });
const db3 = boot(withOwn);
ok('card criado pelo usuário sobrevive à semeadura', (db3.cards||[]).some(c=>c.id==='fc_meu'));
ok('nenhum card da Library 1 marcado como shared (progresso é individual)',
   (db3.cards||[]).filter(c=>c.source==='library1').every(c=>c.shared===false));

console.log(`\n${fail? '❌ '+fail+' FALHA(S)' : '✅ TODOS OS TESTES PASSARAM'}`);
process.exit(fail?1:0);
