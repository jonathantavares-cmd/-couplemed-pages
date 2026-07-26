/* Marca "já lido" da Library 1: o ✓ na lista de tópicos e o botão da toolbar
   compartilham o MESMO estado, e nenhum dos dois encosta no QBank. */
const { JSDOM } = require(process.env.JSDOM_PATH || 'jsdom');
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../..');

const dom = new JSDOM(`<!doctype html><html lang="en"><body><div id="host"></div></body></html>`, {
  url: 'https://couplemed.test/app.html?page=library-1&u=john&folder=allergy-and-immunology&topic=arf',
  pretendToBeVisual: true, runScripts: 'dangerously'
});
const { window } = dom;
window.Element.prototype.scrollIntoView = function(){};
const document = window.document, localStorage = window.localStorage;

// estado de QBank que tem de sair intacto
localStorage.setItem('couplemed_qbank_state_john', 'nao-mexer');
const qbankBefore = localStorage.getItem('couplemed_qbank_state_john');

// site.js é grande e depende do DOM da app; aqui basta a API pública que ele expõe,
// reimplementada com a MESMA chave e semântica (o teste do contrato, não da cópia).
window.eval(`
  const KEY = () => 'couplemed_lib1read_john';
  const all = () => { try { return JSON.parse(localStorage.getItem(KEY())||'{}')||{}; } catch(e){ return {}; } };
  window.CMLib1Read = {
    isRead: (f,t) => !!all()[f+'/'+t],
    toggle: (f,t) => { const a=all(), k=f+'/'+t; if(a[k]) delete a[k]; else a[k]=1;
      localStorage.setItem(KEY(), JSON.stringify(a)); return !!a[k]; }
  };
`);

const s = document.createElement('script');
s.textContent = fs.readFileSync(REPO + '/public/js/library1-reader.js','utf8');
document.head.appendChild(s);

const origCreate = document.createElement.bind(document);
document.createElement = function(tag){
  const el = origCreate(tag);
  if(tag==='link') setTimeout(()=>el.dispatchEvent(new window.Event('load')),0);
  if(tag==='script') setTimeout(()=>{
    window.LIBRARY1_CONTENT = { 'allergy-and-immunology': { 'arf': {
      en:{ title:'ARF', html:'<h2>A</h2><p>x</p>' },
      pt:{ title:'ARF', html:'<h2>A</h2><p>x</p>' }
    } } };
    el.dispatchEvent(new window.Event('load'));
  },0);
  return el;
};

let fail = 0;
const ok=(l,c,e)=>{ console.log((c?'  ✅ ':'  ❌ ')+l+(c?'':'  <-- '+(e||''))); if(!c)fail++; };
const host = document.getElementById('host');
const click = el => el.dispatchEvent(new window.Event('click',{bubbles:true}));
const globalLang = lang => {
  document.documentElement.lang = lang==='pt'?'pt-BR':'en';
  window.dispatchEvent(new window.CustomEvent('couplemed:langchange',{detail:{lang}}));
};

window.CMLibrary1Reader.open(host, {name:'ARF',ptName:'ARF'},
  {name:'Allergy & Immunology',ptName:'Alergia e Imunologia'}, ()=>{});

setTimeout(()=>{
  const btn = host.querySelector('#l1rReadBtn');

  console.log('\n== BOTÃO NA TOOLBAR ==');
  ok('existe na barra de cima', !!btn && !!btn.closest('.l3r-toolbar'));
  ok('começa desmarcado', btn.getAttribute('aria-pressed')==='false' && !btn.classList.contains('l1r-read-on'));
  ok('rótulo "Mark as read"', /Mark as read/.test(btn.textContent), btn.textContent);

  console.log('\n== MARCAR ==');
  click(btn);
  ok('fica marcado', btn.getAttribute('aria-pressed')==='true' && btn.classList.contains('l1r-read-on'));
  ok('rótulo passa a "Read ✓"', /Read/.test(btn.textContent), btn.textContent);
  ok('gravado em chave PRÓPRIA da Library 1', !!localStorage.getItem('couplemed_lib1read_john'));
  const saved = JSON.parse(localStorage.getItem('couplemed_lib1read_john'));
  ok('indexado por subject/topic', !!saved['allergy-and-immunology/arf'], Object.keys(saved).join(','));

  console.log('\n== MESMO ESTADO DA LISTA DE TÓPICOS ==');
  ok('a lista vê o tópico como lido', window.CMLib1Read.isRead('allergy-and-immunology','arf'));
  // outra aba (ou a lista, noutro passo) muda o estado: o evento storage atualiza na hora,
  // sem precisar reabrir o tópico
  window.CMLib1Read.toggle('allergy-and-immunology','arf');   // desmarca "de fora"
  window.dispatchEvent(Object.assign(new window.Event('storage'), { key:'couplemed_lib1read_john' }));
  ok('mudança feita fora do leitor atualiza o botão na hora', host.querySelector('#l1rReadBtn').getAttribute('aria-pressed')==='false');
  window.CMLib1Read.toggle('allergy-and-immunology','arf');   // marca "de fora"
  window.dispatchEvent(Object.assign(new window.Event('storage'), { key:'couplemed_lib1read_john' }));
  ok('e volta a marcar', host.querySelector('#l1rReadBtn').getAttribute('aria-pressed')==='true');
  window.CMLib1Read.toggle('allergy-and-immunology','arf');   // deixa desmarcado
  window.dispatchEvent(Object.assign(new window.Event('storage'), { key:'couplemed_lib1read_john' }));

  console.log('\n== TRADUÇÃO DO RÓTULO ==');
  globalLang('pt');
  ok('rótulo traduz', /Marcar como lido/.test(host.querySelector('#l1rReadBtn').textContent), host.querySelector('#l1rReadBtn').textContent);
  click(host.querySelector('#l1rReadBtn'));
  ok('marcado em PT mostra "Lido ✓"', /Lido/.test(host.querySelector('#l1rReadBtn').textContent));
  globalLang('en');

  console.log('\n== DESMARCAR E ISOLAMENTO ==');
  click(host.querySelector('#l1rReadBtn'));
  ok('desmarca com outro clique', host.querySelector('#l1rReadBtn').getAttribute('aria-pressed')==='false');
  ok('some do armazenamento', !JSON.parse(localStorage.getItem('couplemed_lib1read_john'))['allergy-and-immunology/arf']);
  ok('QBank intocado', localStorage.getItem('couplemed_qbank_state_john')===qbankBefore);
  ok('nenhuma chave de QBank criada', Object.keys(localStorage).filter(k=>/qbank/i.test(k)).length===1);

  console.log('\n== AO REABRIR O TÓPICO ==');
  // fluxo real do site: marca pela lista, entra no tópico, e a toolbar já vem marcada.
  // open() é assíncrono (carrega CSS/conteúdo), então a checagem espera um tick.
  window.CMLib1Read.toggle('allergy-and-immunology','arf');   // marca pela "lista"
  window.CMLibrary1Reader.open(host, {name:'ARF',ptName:'ARF'},
    {name:'Allergy & Immunology',ptName:'Alergia e Imunologia'}, ()=>{});
  setTimeout(()=>{
    ok('abre já refletindo a marca feita na lista', host.querySelector('#l1rReadBtn').getAttribute('aria-pressed')==='true',
       host.querySelector('#l1rReadBtn').getAttribute('aria-pressed'));
    console.log(`\n${fail? '❌ '+fail+' FALHA(S)' : '✅ TODOS OS TESTES PASSARAM'}`);
    process.exit(fail?1:0);
  }, 80);
}, 90);
