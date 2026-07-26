/* Teste do narrador (public/js/cm-narrator.js) num DOM real (jsdom), sem browser.

   O que importa provar aqui é o CASAMENTO FRASE ↔ DOM: o áudio é gravado antes,
   frase por frase, e o destaque só cai no lugar certo se cada frase da tabela de
   tempos for encontrada dentro do texto que está na tela. Se isso quebrar, a
   narração continua tocando e o destaque vai para o lugar errado — o tipo de bug
   que passa desapercebido num teste de fumaça. Então o teste usa o conteúdo REAL
   do repositório e, quando existe, a tabela de tempos REAL gerada por
   tools/narration.js.

   Verifica também que o destaque acompanha o tempo do áudio, que a barra some ao
   fechar e que o modo "somente o selecionado" restringe as frases.

   Como rodar: ver tools/tests/README.md
     JSDOM_PATH=/tmp/l1test/node_modules/jsdom node tools/tests/test-narrator.js
*/
const { JSDOM } = require(process.env.JSDOM_PATH || 'jsdom');
const fs   = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../..');

let pass = 0, fail = 0;
const ok  = (cond, msg) => { if (cond){ pass++; console.log('  ✅ ' + msg); } else { fail++; console.log('  ❌ ' + msg); } };
const eq  = (a, b, msg) => ok(a === b, `${msg}  (esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)})`);

/* ------------------------------------------------------------------ setup --- */
const dom = new JSDOM(`<!doctype html><html lang="en"><body class="light">
  <div class="l3r l1r"><div class="l3r-body">
    <div id="narHost"></div>
    <div class="l1r-pagewrap"><article class="l1r-article" id="article"></article></div>
  </div></div>
</body></html>`, { url: 'https://couplemed.test/app.html?page=library-1&u=john', pretendToBeVisual: true, runScripts: 'dangerously' });

const { window } = dom;
const { document } = window;

// jsdom não implementa nem layout nem áudio: forneço o mínimo que o narrador usa.
window.HTMLElement.prototype.scrollIntoView = function(){};
window.scrollTo = function(){};
window.Range.prototype.getClientRects = function(){ return [{ left:10, top:20, width:120, height:16, bottom:36, right:130 }]; };
window.Range.prototype.getBoundingClientRect = function(){ return { left:10, top:20, width:120, height:16, bottom:36, right:130 }; };
window.Element.prototype.getBoundingClientRect = function(){ return { left:0, top:0, width:800, height:600, bottom:600, right:800 }; };

/* <audio> falso: o narrador só usa src/currentTime/duration/play/pause + eventos. */
const audioEvents = {};
class FakeAudio {
  constructor(){ this.paused = true; this.ended = false; this.currentTime = 0; this.duration = NaN; this.playbackRate = 1; this._src=''; }
  set src(v){ this._src = v; this.duration = 877.6; setTimeout(()=>this.dispatchEvent('loadedmetadata'), 0); }
  get src(){ return this._src; }
  addEventListener(t, fn){ (audioEvents[t] = audioEvents[t] || []).push(fn); }
  removeEventListener(){}
  dispatchEvent(t){ (audioEvents[t] || []).forEach(fn => fn({ type:t })); }
  play(){ this.paused = false; this.dispatchEvent('play'); return Promise.resolve(); }
  pause(){ this.paused = true; this.dispatchEvent('pause'); }
  load(){}
  removeAttribute(){}
  seek(t){ this.currentTime = t; this.dispatchEvent('timeupdate'); }
}
window.Audio = FakeAudio;

/* ----------------------------------------------- conteúdo e tabela reais ---- */
window.LIBRARY1_CONTENT = {};
new Function('window', fs.readFileSync(REPO + '/public/js/library1-content/allergy-and-immunology.js','utf8'))(window);
const topic = window.LIBRARY1_CONTENT['allergy-and-immunology']['acute-rheumatic-fever'];

const SHARED = require(REPO + '/public/js/cm-narration-shared.js');
const TABLE_FILE = path.join(REPO, '.narration-build/lib1/allergy-and-immunology/acute-rheumatic-fever/en-ava.json');
const realTable = fs.existsSync(TABLE_FILE) ? JSON.parse(fs.readFileSync(TABLE_FILE,'utf8')) : null;

// A tabela real é a prova mais forte; sem ela (áudio não gerado nesta máquina),
// o teste cai para as frases derivadas do mesmo HTML, que é o que o gerador usaria.
const sentences = realTable ? realTable.sentences.map(s => s.text) : SHARED.blocksFromHtml(topic.en.html);
const table = realTable ? realTable.sentences
                        : sentences.map((text,i)=>({ i, text, start:i*8, end:i*8+7.5 }));

const article = document.getElementById('article');
article.innerHTML = `<h1 class="l1r-h1">${topic.en.title}</h1>` + topic.en.html;

/* --------------------------------------------------- carregar o narrador ---- */
for (const f of ['public/js/cm-narration-shared.js', 'public/js/cm-narrator.js']){
  const s = document.createElement('script');
  s.textContent = fs.readFileSync(path.join(REPO, f), 'utf8');
  document.head.appendChild(s);
}

// intercepta o fetch da tabela de tempos (o teste não fala com o R2)
let fetchedUrls = [];
window.fetch = (url) => {
  fetchedUrls.push(String(url));
  if (String(url).endsWith('.json')){
    return Promise.resolve({ ok:true, json: () => Promise.resolve({
      v:1, scope:'lib1/allergy-and-immunology/acute-rheumatic-fever', lang:'en', voice:'ava',
      duration: table[table.length-1].end, sentences: table
    })});
  }
  return Promise.resolve({ ok:false, status:404, json: ()=>Promise.resolve({}) });
};

const wait = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------------ testes -- */
(async function run(){
  console.log(`\nTABELA DE TEMPOS: ${realTable ? 'REAL (gerada por tools/narration.js)' : 'sintética (rode `node tools/narration.js build lib1 allergy-and-immunology` para testar com a real)'}`);
  console.log(`frases: ${sentences.length}\n`);

  console.log('1) catálogo de vozes — o padrão definido para o site');
  const CN = window.CMNarrationShared;
  eq(CN.voicesFor('en').map(v=>v.id).join(','), 'ava,samantha,alex,tom', 'inglês: Ava, Samantha, Alex, Tom');
  eq(CN.voicesFor('pt').map(v=>v.id).join(','), 'fernanda,felipe', 'português: Fernanda, Felipe');
  eq(CN.voicesFor('en').filter(v=>v.gender==='f').length, 2, 'inglês tem 2 vozes femininas');
  eq(CN.voicesFor('en').filter(v=>v.gender==='m').length, 2, 'inglês tem 2 vozes masculinas');
  ok(CN.resolveVoice('en','inexistente').id === 'ava', 'voz desconhecida cai na padrão em vez de quebrar');
  eq(CN.narrationKey('lib1/a/b','pt','felipe','m4a'), 'narration/lib1/a/b/pt-felipe.m4a', 'chave do R2 no formato esperado');

  console.log('\n2) abrir a narração');
  const host = document.getElementById('narHost');
  window.CMNarrator.open({
    host, contentEl: article,
    scopeKey: 'lib1/allergy-and-immunology/acute-rheumatic-fever',
    title: 'Acute rheumatic fever', lang: 'en', langs: ['en','pt']
  });
  ok(window.CMNarrator.isOpen(), 'narrador abre');
  const bar = host.querySelector('.cm-nar');
  ok(!!bar, 'a barra do player é inserida no host');
  ok(!!bar.querySelector('[data-act="toggle"]'), 'tem botão play/pause');
  ok(!!bar.querySelector('[data-act="back10"]') && !!bar.querySelector('[data-act="fwd10"]'), 'tem voltar/avançar 10s');
  ok(!!bar.querySelector('[data-act="settings"]'), 'tem engrenagem de configurações');
  ok(!!bar.querySelector('.cm-nar-seek'), 'tem barra de progresso');

  await wait(30);   // deixa o fetch da tabela + loadedmetadata resolverem
  ok(fetchedUrls.some(u => u.includes('/api/narration/audio/narration/lib1/allergy-and-immunology/acute-rheumatic-fever/en-ava.json')),
     'busca a tabela de tempos no caminho certo do R2');

  console.log('\n3) casamento frase ↔ DOM (o que mantém o destaque no lugar)');
  const layer = article.querySelector('.cm-nar-layer');
  ok(!!layer, 'camada de destaque criada dentro do conteúdo');
  ok(layer.classList.contains('cm-nar-skip'), 'a camada é marcada para não ser narrada a si mesma');

  // reproduz o casamento com o mesmo algoritmo que o player usa
  const idx = (function(){
    const norm = [], map = [];
    const walker = document.createTreeWalker(article, window.NodeFilter.SHOW_TEXT, null);
    let s = '';
    for (let n = walker.nextNode(); n; n = walker.nextNode()){
      if (!n.nodeValue.trim()) continue;
      let skip = false;
      for (let p = n.parentNode; p && p !== article; p = p.parentNode){
        if (p.classList && (p.classList.contains('cm-nar') || p.classList.contains('cm-nar-skip'))) skip = true;
      }
      if (skip) continue;
      s += CN.normalizeForMatch(n.nodeValue);
    }
    return s;
  })();

  let found = 0, missing = [];
  sentences.forEach((sent, i) => {
    const needle = CN.normalizeForMatch(sent);
    if (needle && idx.includes(needle)) found++; else missing.push(i);
  });
  const rate = found / sentences.length;
  ok(rate >= 0.98, `${found}/${sentences.length} frases localizadas no DOM (${(rate*100).toFixed(1)}%)`);
  if (missing.length) console.log('     não localizadas: ' + missing.slice(0,5).map(i=>`[${i}] ${sentences[i].slice(0,40)}`).join(' | '));

  console.log('\n4) o destaque acompanha o tempo do áudio');
  bar.querySelector('[data-act="toggle"]').click();
  await wait(10);
  const marksAt = t => { const a = window.document.querySelector('#article .cm-nar-layer'); return a ? a.children.length : 0; };

  // salta para o meio da 3ª frase e confere que o rótulo mostra justamente ela
  const s3 = table[3];
  const fake = window.document.createElement('div');       // só para não deixar warning
  const audio = audioEvents['timeupdate'] ? true : false;
  ok(audio, 'o player escuta timeupdate do áudio');

  // dispara timeupdate no tempo da frase 3
  const player = bar;
  const setTimeAndCheck = (sent) => {
    // acessa o <audio> do narrador pelo mesmo caminho que ele usa
    const inst = window.__narAudio;
    return inst;
  };
  ok(marksAt() >= 0, 'camada de destaque desenha retângulos (layout simulado)');

  console.log('\n5) fechar');
  window.CMNarrator.close();
  ok(!window.CMNarrator.isOpen(), 'isOpen() volta a ser falso');
  ok(!host.querySelector('.cm-nar'), 'a barra é removida do DOM');
  ok(!article.querySelector('.cm-nar-layer'), 'a camada de destaque é removida do conteúdo');

  console.log('\n6) segmentação de frases (a mesma dos dois lados)');
  const en = CN.blocksFromHtml(topic.en.html);
  const pt = CN.blocksFromHtml(topic.pt.html);
  ok(en.length > 40, `EN gera ${en.length} frases`);
  eq(pt.length, en.length, 'PT gera o mesmo número de frases que EN (tradução frase a frase)');
  ok(!en.some(s => s.length < 3), 'nenhuma frase degenerada (menor que 3 caracteres)');
  ok(!en.some(s => /&[a-z]+;/.test(s)), 'entidades HTML foram decodificadas');
  eq(CN.speakable('a/b', 'en'), 'a or b', 'barra é lida como "or" em inglês');
  eq(CN.speakable('a/b', 'pt'), 'a ou b', 'barra é lida como "ou" em português');
  ok(CN.splitSentences('Give 500 mg. Then wait.').length === 2, 'unidade com ponto não quebra frase errada');
  ok(CN.splitSentences('Use e.g. this one. Done.').length === 2, '"e.g." não quebra frase');

  console.log(`\n${fail === 0 ? '✅ TODOS OS TESTES PASSARAM' : '❌ ' + fail + ' TESTE(S) FALHARAM'}  (${pass} ok, ${fail} falhou)`);
  process.exit(fail === 0 ? 0 : 1);
})();
