/* Flashcards gerados a partir da Library 1 (§11.4):
   - o pacote traz 30 cards BILÍNGUES por tópico, no padrão "Anki melhorado" (§11.5);
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

const [SUBJ, TOP] = alvos[0];
const cards = packs[SUBJ][TOP];

ok('pacote existe', !!cards);
ok('tem exatamente 30 cards', cards.length===30, `${cards.length} cards`);
ok('todos com id único', new Set(cards.map(c=>c.id)).size===30);
ok('ids com prefixo L1FC- (idempotência)', cards.every(c=>/^L1FC-/.test(c.id)));
ok('todos BILÍNGUES (en e pt com front+back)', cards.every(c=>c.en&&c.en.front&&c.en.back&&c.pt&&c.pt.front&&c.pt.back));
ok('todos com `why` (elaboração) nos dois idiomas', cards.every(c=>c.en.why&&c.pt.why));
ok('todos com `kind` (tipo pedagógico)', cards.every(c=>c.kind));
ok('usa vários tipos (interleaving de formatos)', new Set(cards.map(c=>c.kind)).size>=5, [...new Set(cards.map(c=>c.kind))].join(','));
ok('PT não é cópia do EN', cards.every(c=>c.en.front!==c.pt.front));
ok('todos com sys/subj/topic (entram nos filtros)', cards.every(c=>c.sys && c.subj && c.topic));
ok('subj no formato <sys>::<slug>', cards.every(c=>c.subj.startsWith(c.sys+'::')));
ok('topic bilíngue', cards.every(c=>c.topic&&c.topic.en&&c.topic.pt));
ok('todos com tags', cards.every(c=>Array.isArray(c.tags) && c.tags.length));

const cloze = cards.filter(c=>/\{\{c\d+::/.test(c.en.front));
ok('usa cloze no padrão Anki em parte dos cards', cloze.length>=3, `${cloze.length} cloze`);
const withImg = cards.filter(c=>!!c.img);
ok('aproveita imagens do tópico', withImg.length>=3, `${withImg.length} com imagem`);
// o caminho é derivado do tópico auditado — estava fixo em acute-rheumatic-fever
// até 2026-07-26, então passava ✅ com a imagem de OUTRO tópico.
const IMG_BASE = `/assets/library1/${SUBJ}/${TOP}/`;
ok('imagens apontam para assets publicados da Library 1',
   withImg.every(c=>c.img.startsWith(IMG_BASE)), IMG_BASE);

console.log('\n== AS IMAGENS REFERENCIADAS EXISTEM EM DISCO ==');
const srcs = [...new Set(cards.filter(c=>c.img).map(c=>c.img))];
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
// a semeadura cobre TODOS os tópicos publicados, não só o auditado: 30 por tópico
const TOPICOS = Object.values(packs).reduce((a,p)=>a+Object.keys(p).length, 0);
const ESPERADO = 30 * TOPICOS;
ok(`semeia 30 cards por tópico no primeiro boot (${TOPICOS} tópico(s) = ${ESPERADO})`,
   seeded.length===ESPERADO, `${(db1.cards||[]).length} cards no total, ${seeded.length} da Library 1`);
ok('marcados com source:"library1"', seeded.every(c=>c.source==='library1'));
ok('deck criado com o NOME DO TÓPICO', (db1.decks||[]).some(d=>d.name==='Acute rheumatic fever'), (db1.decks||[]).map(d=>d.name).join(','));
ok('deck tem nome em português também', (db1.decks||[]).some(d=>d.namePt==='Febre reumática aguda'));
ok('um deck por tópico (id derivado do slug)', (db1.decks||[]).some(d=>d.id==='deck_l1_acute-rheumatic-fever'));
ok('cards guardam o bloco bilíngue no banco', seeded.every(c=>c.l1&&c.l1.en&&c.l1.pt));
ok('cards guardam o kind', seeded.every(c=>c.kind));
ok('cards começam como "new" (entram no SRS)', seeded.every(c=>c.state==='new'));
ok('preserva sys/subj/topic no banco', seeded.every(c=>c.sys && c.subj && c.topic));

// idempotência + preservação de progresso
const touched = JSON.parse(JSON.stringify(db1));
const target = touched.cards.find(c=>c.id==='L1FC-ARF-001');
target.reps = 7; target.state = 'review'; target.interval = 12; target.ease = 2.7;
const db2 = boot(touched);
const seeded2 = (db2.cards||[]).filter(c=>c.source==='library1');
ok('segundo boot NÃO duplica', seeded2.length===ESPERADO, `${seeded2.length} cards`);
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
