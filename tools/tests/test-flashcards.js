/* Flashcards gerados a partir da Library 1 (§11.4):
   - o pacote traz 20 cards por tópico, no padrão Anki;
   - a semeadura é idempotente e preserva o progresso de estudo;
   - os cards entram com sys/subj/topic, então caem nos filtros e na busca;
   - subject inexistente na taxonomia dos Flashcards vai para Others (misc). */
const { JSDOM } = require(process.env.JSDOM_PATH || 'jsdom');
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../..');

let fail = 0;
const ok = (l,c,e)=>{ console.log((c?'  ✅ ':'  ❌ ')+l+(c?'':'  <-- '+(e||''))); if(!c)fail++; };

/* ---------- 1. o pacote de cards, lido como dado puro ---------- */
console.log('\n== PACOTE DE CARDS ==');
const sandbox = { window:{} };
new Function('window', fs.readFileSync(REPO + '/public/js/library1-flashcards/allergy-and-immunology.js','utf8'))(sandbox.window);
const packs = sandbox.window.LIBRARY1_FLASHCARDS;
const cards = packs['allergy-and-immunology']['acute-rheumatic-fever'];

ok('pacote existe', !!cards);
ok('tem exatamente 20 cards', cards.length===20, `${cards.length} cards`);
ok('todos com id único', new Set(cards.map(c=>c.id)).size===20);
ok('ids com prefixo L1FC- (idempotência)', cards.every(c=>/^L1FC-/.test(c.id)));
ok('todos com front e back', cards.every(c=>c.front && c.back));
ok('todos com sys/subj/topic (entram nos filtros)', cards.every(c=>c.sys && c.subj && c.topic));
ok('subj no formato <sys>::<slug>', cards.every(c=>c.subj.startsWith(c.sys+'::')));
ok('topic é o nome do tópico da Library 1', cards.every(c=>c.topic==='Acute rheumatic fever'));
ok('todos com tags', cards.every(c=>Array.isArray(c.tags) && c.tags.length));

const cloze = cards.filter(c=>/\{\{c\d+::/.test(c.front));
ok('usa cloze no padrão Anki em parte dos cards', cloze.length>=3, `${cloze.length} cloze`);
const withImg = cards.filter(c=>/<img /.test(c.back));
ok('aproveita imagens do tópico', withImg.length>=3, `${withImg.length} com imagem`);
ok('imagens apontam para assets publicados da Library 1',
   withImg.every(c=>/\/assets\/library1\/allergy-and-immunology\/acute-rheumatic-fever\//.test(c.back)));

console.log('\n== AS IMAGENS REFERENCIADAS EXISTEM EM DISCO ==');
const srcs = [...new Set(cards.flatMap(c=>[...String(c.back).matchAll(/src="([^"]+)"/g)].map(m=>m[1])))];
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
const used = [...new Set(cards.map(c=>c.subj))];
used.forEach(u=>ok(`subj "${u}" existe na taxonomia dos Flashcards`, ids.has(u),
  'não existe — deveria cair em <sys>::misc (Others)'));
ok('todo sistema usado existe', [...new Set(cards.map(c=>c.sys))].every(s=>FC_TAXONOMY.some(t=>t.id===s)));
ok('a regra de Others está disponível (misc existe no sistema usado)',
   FC_TAXONOMY.find(t=>t.id===cards[0].sys).subs.some(([slug])=>slug==='misc'));

/* ---------- 3. semeadura no banco do usuário ---------- */
console.log('\n== SEMEADURA NO BANCO (todos os usuários) ==');
function boot(prevDB){
  const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', {
    url: 'https://couplemed.test/app.html?page=flashcards&u=john',
    runScripts: 'dangerously', pretendToBeVisual: true
  });
  const w = dom.window;
  if(prevDB) w.localStorage.setItem('couplemed_fc_john', JSON.stringify(prevDB));
  const p1 = w.document.createElement('script');
  p1.textContent = fs.readFileSync(REPO + '/public/js/library1-flashcards/allergy-and-immunology.js','utf8');
  w.document.head.appendChild(p1);
  const p2 = w.document.createElement('script');
  p2.textContent = fs.readFileSync(REPO + '/public/js/flashcards.js','utf8');
  w.document.head.appendChild(p2);
  return JSON.parse(w.localStorage.getItem('couplemed_fc_john') || '{}');
}

const db1 = boot(null);
const seeded = (db1.cards||[]).filter(c=>c.source==='library1');
ok('semeia os 20 cards no primeiro boot', seeded.length===20, `${(db1.cards||[]).length} cards no total, ${seeded.length} da Library 1`);
ok('marcados com source:"library1"', seeded.every(c=>c.source==='library1'));
ok('criou o deck da Library 1', (db1.decks||[]).some(d=>d.id==='deck_library1'));
ok('cards começam como "new" (entram no SRS)', seeded.every(c=>c.state==='new'));
ok('preserva sys/subj/topic no banco', seeded.every(c=>c.sys && c.subj && c.topic));

// idempotência + preservação de progresso
const touched = JSON.parse(JSON.stringify(db1));
const target = touched.cards.find(c=>c.id==='L1FC-ARF-001');
target.reps = 7; target.state = 'review'; target.interval = 12; target.ease = 2.7;
const db2 = boot(touched);
const seeded2 = (db2.cards||[]).filter(c=>c.source==='library1');
ok('segundo boot NÃO duplica', seeded2.length===20, `${seeded2.length} cards`);
const after = db2.cards.find(c=>c.id==='L1FC-ARF-001');
ok('progresso de estudo preservado', after.reps===7 && after.state==='review' && after.interval===12,
   `reps=${after.reps} state=${after.state}`);

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
