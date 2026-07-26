/* Create Test da Library 1: botão no fim do conteúdo, execução, resultado,
   performance por tópico e — o ponto crítico — ISOLAMENTO do QBank 1. */
const { JSDOM } = require(process.env.JSDOM_PATH || 'jsdom');
const fs = require('fs');
const REPO = require('path').resolve(__dirname, '../..');

const dom = new JSDOM(`<!doctype html><html lang="en"><body><div id="host"></div></body></html>`, {
  url: 'https://couplemed.test/app.html?page=library-1&u=john&folder=allergy-and-immunology&topic=arf',
  pretendToBeVisual: true, runScripts: 'dangerously'
});
const { window } = dom;
window.Element.prototype.scrollIntoView = function(){};
const document = window.document, localStorage = window.localStorage;

// estado de QBank já existente — tem de sair intacto no fim
localStorage.setItem('couplemed_qbank_state_john', JSON.stringify({ answered: 250, correct: 200 }));
localStorage.setItem('couplemed_qbank_perf_john', 'nao-mexer');
const qbankBefore = JSON.stringify({
  a: localStorage.getItem('couplemed_qbank_state_john'),
  b: localStorage.getItem('couplemed_qbank_perf_john')
});

const s = document.createElement('script');
s.textContent = fs.readFileSync(REPO + '/public/js/library1-reader.js','utf8');
document.head.appendChild(s);

const origCreate = document.createElement.bind(document);
document.createElement = function(tag){
  const el = origCreate(tag);
  if(tag==='link') setTimeout(()=>el.dispatchEvent(new window.Event('load')),0);
  if(tag==='script') setTimeout(()=>{
    window.LIBRARY1_CONTENT = { 'allergy-and-immunology': { 'arf': {
      assets: { 'image-1': { kind:'image', n:1,
        en:{key:'x/i1-en.webp',alt:'Histology'}, pt:{key:'x/i1-pt.webp',alt:'Histologia'} } },
      quiz: [
        { id:'L1Q-ARF-001',
          vignette:'A 10-year-old boy has dyspnea and palpitations.', q:'Which most likely preceded this?',
          options:['Antibiotic exposure','Bacterial infection','Chemotherapy'],
          correct:'B', peer:{A:0,B:48,C:1},
          explC:'ARF follows untreated GAS pharyngitis.',
          explI:{A:'Not related.', C:'No chemo history.'},
          objective:'ARF is an immune-mediated complication of GAS pharyngitis.',
          img:'image-1',
          ptTranslation:{ vignette:'Um menino de 10 anos tem dispneia e palpitacoes.', q:'O que mais provavelmente precedeu?',
            options:['Exposicao a antibiotico','Infeccao bacteriana','Quimioterapia'],
            explC:'A ARF segue faringite por GAS nao tratada.',
            explI:{A:'Nao relacionado.', C:'Sem historia de quimio.'},
            objective:'A ARF e uma complicacao imunomediada da faringite por GAS.' } },
        { id:'L1Q-ARF-002',
          vignette:'A 12-year-old girl has migratory arthritis.', q:'Most likely complication?',
          options:['Mitral stenosis','Renal failure'],
          correct:'A', peer:{A:70,B:30},
          explC:'Chronic RHD causes mitral stenosis.', explI:{B:'Not typical.'},
          objective:'RHD leads to mitral stenosis.',
          ptTranslation:{ vignette:'Uma menina de 12 anos tem artrite migratoria.', q:'Complicacao mais provavel?',
            options:['Estenose mitral','Insuficiencia renal'],
            explC:'A DCR cronica causa estenose mitral.', explI:{B:'Nao tipico.'},
            objective:'A DCR leva a estenose mitral.' } }
      ],
      en:{ title:'Acute rheumatic fever', html:'<h2>INTRO</h2><p>Text (<a class="l1r-ref" data-ref="image-1">image 1</a>).</p><h3>TAGS</h3><p class="l1r-tags"><span>Allergy</span></p>' },
      pt:{ title:'Febre reumatica aguda', html:'<h2>INTRO</h2><p>Texto (<a class="l1r-ref" data-ref="image-1">imagem 1</a>).</p><h3>TAGS</h3><p class="l1r-tags"><span>Alergia</span></p>' }
    } } };
    el.dispatchEvent(new window.Event('load'));
  },0);
  return el;
};

let fail = 0;
const ok = (l,c,extra)=>{ console.log(`${c?'  ✅':'  ❌'} ${l}${c?'':'  <-- '+(extra||'')}`); if(!c) fail++; };
const globalLang = lang => {
  document.documentElement.lang = lang==='pt' ? 'pt-BR' : 'en';
  window.dispatchEvent(new window.CustomEvent('couplemed:langchange', { detail:{ lang } }));
};
const host = document.getElementById('host');
const q = sel => host.querySelector(sel);
const click = el => el.dispatchEvent(new window.Event('click',{bubbles:true}));

window.CMLibrary1Reader.open(host,
  { name:'ARF', ptName:'ARF' },
  { name:'Allergy & Immunology', ptName:'Alergia e Imunologia' }, ()=>{});

setTimeout(()=>{
  const art = q('#l1rArticle');

  console.log('\n== BOTÃO NO FIM DO CONTEÚDO, ACIMA DAS TAGS ==');
  const ct = art.querySelector('.l1r-ct');
  ok('bloco Create Test existe', !!ct);
  ok('fica ACIMA das tags', !!ct && !!(ct.compareDocumentPosition(art.querySelector('.l1r-tags')) & window.Node.DOCUMENT_POSITION_FOLLOWING));
  ok('acima também do título TAGS', !!ct && ct.nextElementSibling && ct.nextElementSibling.tagName==='H3', ct && ct.nextElementSibling && ct.nextElementSibling.tagName);
  ok('mostra a contagem de questões', /2\s+questions/.test(ct.textContent), ct.textContent.replace(/\s+/g,' ').slice(0,80));
  ok('avisa que é separado do QBank', /do not affect your QBank/i.test(ct.textContent));

  console.log('\n== EXECUÇÃO ==');
  click(art.querySelector('[data-ct="start"]'));
  ok('abre a 1ª questão', !!q('.l1r-quiz') && /1 \/ 2/.test(q('.l1r-q-progress').textContent));
  ok('vinheta e enunciado', /10-year-old/.test(q('.l1r-q-vig').textContent) && /Which most likely/.test(q('.l1r-q-stem').textContent));
  ok('3 alternativas', host.querySelectorAll('[data-q-opt]').length===3);
  ok('não mostra % antes de responder', !host.querySelector('.l1r-q-peer'));
  ok('Responder desabilitado sem escolha', q('[data-q="submit"]').disabled);
  ok('imagem da questão abre por referência', !!q('.l1r-q-img [data-ref="image-1"]'));

  click(host.querySelector('[data-q-opt="C"]'));
  ok('escolha marcada', host.querySelector('[data-q-opt="C"]').classList.contains('l1r-q-opt-chosen'));
  ok('Responder habilita', !q('[data-q="submit"]').disabled);
  click(q('[data-q="submit"]'));
  ok('marca a errada escolhida', host.querySelector('[data-q-opt="C"]').classList.contains('l1r-q-opt-wrong'));
  ok('marca a correta', host.querySelector('[data-q-opt="B"]').classList.contains('l1r-q-opt-correct'));
  ok('mostra % dos colegas só depois', host.querySelectorAll('.l1r-q-peer').length===3);
  ok('explicação da correta', /follows untreated GAS/.test(q('.l1r-q-expl').textContent));
  ok('por que as outras estão erradas', /Not related/.test(q('.l1r-q-wrong').textContent));
  ok('objetivo educacional', /immune-mediated complication/.test(q('.l1r-q-obj').textContent));
  ok('não dá para trocar depois de responder', host.querySelector('[data-q-opt="A"]').disabled);

  console.log('\n== TRADUÇÃO DENTRO DO TESTE ==');
  globalLang('pt');
  ok('vinheta traduz', /menino de 10 anos/.test(q('.l1r-q-vig').textContent), q('.l1r-q-vig').textContent.slice(0,40));
  ok('alternativas traduzem', /Infeccao bacteriana/.test(host.querySelector('[data-q-opt="B"]').textContent));
  ok('explicação traduz', /faringite por GAS nao tratada/.test(q('.l1r-q-expl').textContent));
  ok('resposta escolhida se mantém', host.querySelector('[data-q-opt="C"]').classList.contains('l1r-q-opt-wrong'));
  globalLang('en');

  console.log('\n== NAVEGAÇÃO E FIM ==');
  ok('Finalizar só aparece na última', !q('[data-q="finish"]') && !!q('[data-q="next"]'));
  click(q('[data-q="next"]'));
  ok('vai para a 2ª', /2 \/ 2/.test(q('.l1r-q-progress').textContent));
  ok('Finalizar travado até responder', q('[data-q="finish"]').disabled);
  click(host.querySelector('[data-q-opt="A"]'));
  click(q('[data-q="submit"]'));
  ok('Finalizar liberado', !q('[data-q="finish"]').disabled);
  click(q('[data-q="finish"]'));
  ok('tela de resultado', !!q('.l1r-q-result'));
  ok('percentual certo (1 de 2 = 50%)', q('.l1r-q-result-pct').textContent==='50%', q('.l1r-q-result-pct').textContent);
  ok('acertos e erros', /Correct: 1/.test(q('.l1r-q-result-line').textContent.replace(/\s+/g,' ')) && /Incorrect: 1/.test(q('.l1r-q-result-line').textContent.replace(/\s+/g,' ')), q('.l1r-q-result-line').textContent.replace(/\s+/g,' '));

  console.log('\n== ISOLAMENTO DO QBANK 1 (crítico) ==');
  const keys = Object.keys(localStorage).filter(k=>/qbank/i.test(k));
  const qbankAfter = JSON.stringify({
    a: localStorage.getItem('couplemed_qbank_state_john'),
    b: localStorage.getItem('couplemed_qbank_perf_john')
  });
  ok('nenhuma chave de QBank foi criada ou alterada', qbankAfter===qbankBefore, 'estado do QBank mudou!');
  ok('só as 2 chaves originais de qbank continuam lá', keys.length===2, keys.join(', '));
  ok('resultado gravado em chave PRÓPRIA da Library 1', !!localStorage.getItem('couplemed_lib1quiz_john'));
  const saved = JSON.parse(localStorage.getItem('couplemed_lib1quiz_john'));
  ok('indexado por subject/topic (performance individual)', !!saved['allergy-and-immunology/arf'], Object.keys(saved).join(', '));
  ok('guarda acertos, total e respostas', saved['allergy-and-immunology/arf'].correct===1 && saved['allergy-and-immunology/arf'].total===2 && !!saved['allergy-and-immunology/arf'].answers);

  console.log('\n== ESTADO "JÁ REALIZADO" NO TÓPICO ==');
  click(q('[data-q="exit"]'));
  const done = q('.l1r-ct-done');
  ok('bloco mostra que já foi feito', !!done);
  ok('mostra acertos/erros e %', /1\/2/.test(done.textContent) && /50%/.test(done.textContent), done.textContent.replace(/\s+/g,' ').slice(0,90));
  ok('tem Rever respostas e Refazer', !!done.querySelector('[data-ct="review"]') && !!done.querySelector('[data-ct="redo"]'));

  console.log('\n== REVER × REFAZER ==');
  click(done.querySelector('[data-ct="review"]'));
  ok('Rever já mostra respondida', !!q('.l1r-q-expl') && host.querySelector('[data-q-opt="C"]').classList.contains('l1r-q-opt-wrong'));
  click(q('[data-q="exit"]'));
  click(q('.l1r-ct-done [data-ct="redo"]'));
  ok('Refazer começa em branco', !q('.l1r-q-expl') && !host.querySelector('.l1r-q-opt-chosen'));
  ok('Refazer apaga o resultado anterior', !JSON.parse(localStorage.getItem('couplemed_lib1quiz_john'))['allergy-and-immunology/arf']);

  console.log('\n== TÓPICO SEM QUESTÕES ==');
  click(q('[data-q="exit"]'));
  delete window.LIBRARY1_CONTENT['allergy-and-immunology'].arf.quiz;
  window.CMLibrary1Reader.open(host, { name:'ARF', ptName:'ARF' },
    { name:'Allergy & Immunology', ptName:'Alergia e Imunologia' }, ()=>{});
  setTimeout(()=>{
    ok('sem questões, nenhum botão aparece', !host.querySelector('.l1r-ct'));
    console.log(`\n${fail? '❌ '+fail+' FALHA(S)' : '✅ TODOS OS TESTES PASSARAM'}`);
    process.exit(fail?1:0);
  }, 80);
}, 90);
