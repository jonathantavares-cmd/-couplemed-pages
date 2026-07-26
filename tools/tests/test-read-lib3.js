/* Marca "já lido" da Library 3: botão na toolbar do leitor de PDF, mesmo mecanismo
   da Library 1 mas com chave e id próprios (id = a `key` do PDF).
   Não carrega o PDF.js — só o esqueleto/toolbar interessa aqui. */
const { JSDOM } = require(process.env.JSDOM_PATH || 'jsdom');
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../..');

const dom = new JSDOM(`<!doctype html><html lang="en"><body><div id="host"></div></body></html>`, {
  url: 'https://couplemed.test/app.html?page=library-3&u=john',
  pretendToBeVisual: true, runScripts: 'dangerously'
});
const { window } = dom;
const document = window.document, localStorage = window.localStorage;
window.Element.prototype.scrollIntoView = function(){};

// estados que NÃO podem ser tocados
localStorage.setItem('couplemed_qbank_state_john', 'nao-mexer');
localStorage.setItem('couplemed_lib1read_john', JSON.stringify({ 'allergy-and-immunology/arf': 1 }));
const qbankBefore = localStorage.getItem('couplemed_qbank_state_john');
const lib1Before = localStorage.getItem('couplemed_lib1read_john');

// API que site.js expõe (mesma chave e semântica)
window.eval(`
  const key = lib => 'couplemed_lib'+lib+'read_john';
  const all = lib => { try { return JSON.parse(localStorage.getItem(key(lib))||'{}')||{}; } catch(e){ return {}; } };
  window.CMLibRead = {
    isRead: (lib,id) => !!all(lib)[id],
    toggle: (lib,id) => { const a=all(lib); if(a[id]) delete a[id]; else a[id]=1;
      localStorage.setItem(key(lib), JSON.stringify(a)); return !!a[id]; }
  };
`);

// PDF.js é carregado por import() dinâmico dentro de loadPdfJs(); aqui ele nunca resolve,
// mas renderSkeleton() já rodou — que é o que este teste verifica.
const s = document.createElement('script');
s.textContent = fs.readFileSync(REPO + '/public/js/library3-reader.js','utf8');
document.head.appendChild(s);

const origCreate = document.createElement.bind(document);
document.createElement = function(tag){
  const el = origCreate(tag);
  if(tag==='link') setTimeout(()=>el.dispatchEvent(new window.Event('load')),0);
  return el;
};
window.fetch = () => new Promise(()=>{});   // o HEAD do PDF nunca resolve: irrelevante aqui

let fail = 0;
const ok=(l,c,e)=>{ console.log((c?'  ✅ ':'  ❌ ')+l+(c?'':'  <-- '+(e||''))); if(!c)fail++; };
const host = document.getElementById('host');
const click = el => el.dispatchEvent(new window.Event('click',{bubbles:true}));

const item   = { key:'lib3/first-aid/01-biochemistry.pdf', name:'Biochemistry', ptName:'Bioquímica' };
const folder = { key:'m1', name:'Module 1', ptName:'Módulo 1' };

window.CMLibrary3Reader.open(host, item, folder, ()=>{});

setTimeout(()=>{
  const btn = host.querySelector('#l3rReadBtn');

  console.log('\n== BOTÃO NA TOOLBAR DA LIBRARY 3 ==');
  ok('existe', !!btn);
  ok('está na barra de cima, ao lado do download', !!btn && !!btn.closest('.l3r-toolbar') && !!host.querySelector('#l3rDownloadLink'));
  ok('começa desmarcado', btn.getAttribute('aria-pressed')==='false');
  ok('rótulo em inglês', /Mark as read/.test(btn.textContent), btn.textContent);

  console.log('\n== MARCAR / DESMARCAR ==');
  click(btn);
  ok('marca', btn.getAttribute('aria-pressed')==='true' && btn.classList.contains('l3r-read-on'));
  ok('rótulo passa a "Read ✓"', /Read/.test(btn.textContent), btn.textContent);
  const saved = JSON.parse(localStorage.getItem('couplemed_lib3read_john'));
  ok('grava em couplemed_lib3read_ (chave da Library 3)', !!saved);
  ok('id é a `key` do PDF', !!saved[item.key], Object.keys(saved).join(','));
  click(btn);
  ok('desmarca com outro clique', btn.getAttribute('aria-pressed')==='false');
  ok('some do armazenamento', !JSON.parse(localStorage.getItem('couplemed_lib3read_john'))[item.key]);

  console.log('\n== MUDANÇA FORA DO LEITOR (outra aba / lista) ==');
  window.CMLibRead.toggle(3, item.key);
  window.dispatchEvent(Object.assign(new window.Event('storage'), { key:'couplemed_lib3read_john' }));
  ok('o botão acompanha na hora', host.querySelector('#l3rReadBtn').getAttribute('aria-pressed')==='true');

  console.log('\n== ISOLAMENTO ==');
  ok('a marca da Library 1 fica intacta', localStorage.getItem('couplemed_lib1read_john')===lib1Before);
  ok('Library 1 e 3 usam chaves separadas',
     !!localStorage.getItem('couplemed_lib1read_john') && !!localStorage.getItem('couplemed_lib3read_john'));
  ok('QBank intocado', localStorage.getItem('couplemed_qbank_state_john')===qbankBefore);
  ok('nenhuma chave de QBank criada', Object.keys(localStorage).filter(k=>/qbank/i.test(k)).length===1);

  console.log(`\n${fail? '❌ '+fail+' FALHA(S)' : '✅ TODOS OS TESTES PASSARAM'}`);
  process.exit(fail?1:0);
}, 120);
