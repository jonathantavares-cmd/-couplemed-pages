/* Teste da TRADUÇÃO dos flashcards (public/js/flashcards.js) em jsdom.

   O bug que este teste tranca: o editor de flashcards sempre envolve o que o usuário
   escreve em <p>, e `fcHasHtml` classifica qualquer coisa com tag como "rica". O ramo
   rico renderizava sem marcação de tradução, então TODO card criado pelo editor ficava
   preso no idioma original — enquanto os importados em texto puro traduziam
   normalmente, o que fazia o problema parecer aleatório.

   Verifica que os dois caminhos (texto puro e conteúdo formatado) saem marcados para
   tradução, que a formatação sobrevive à tradução, e que cloze continua intocado.

   Como rodar: ver tools/tests/README.md
     JSDOM_PATH=/tmp/l1test/node_modules/jsdom node tools/tests/test-flashcards-i18n.js
*/
const { JSDOM } = require(process.env.JSDOM_PATH || 'jsdom');
const fs = require('fs');
const REPO = require('path').resolve(__dirname, '../..');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c){ pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const dom = new JSDOM('<!doctype html><html lang="pt-BR"><body></body></html>',
  { url: 'https://couplemed.test/app.html?page=flashcards&u=john', pretendToBeVisual: true });
const { window } = dom;
global.window = window; global.document = window.document;
global.NodeFilter = window.NodeFilter;

/* Motor de tradução falso: marca o texto para dar para provar que passou por ele. */
const asked = [];
window.CMI18N = {
  translateText: async (text) => { asked.push(text); return '[PT]' + text; }
};

/* Recorta do flashcards.js só as peças em teste — o arquivo inteiro exige o app montado
   (localStorage sincronizado, decks, DOM do site). O que importa aqui é a lógica. */
const src = fs.readFileSync(REPO + '/public/js/flashcards.js', 'utf8');
const grab = (name, re) => {
  const m = src.match(re);
  if (!m) { console.log(`  ❌ não encontrei ${name} em flashcards.js — o teste precisa ser atualizado`); process.exit(1); }
  return m[0];
};
const pieces = [
  grab('esc',           /const esc = [^\n]+/),
  grab('fcHasHtml',     /const fcHasHtml = [^\n]+/),
  grab('richSpan',      /const richSpan = [^\n]+/),
  grab('fcSanitize',    /function fcSanitize\(html\)\{[\s\S]*?\n  \}/),
  grab('isCloze',       /const isCloze = [^\n]+/),
  grab('translateField',/async function translateField\([\s\S]*?\n  \}/),
  grab('translateRich', /async function translateRichHtml\([\s\S]*?\n  \}/)
].join('\n');

const mod = new Function('window','document','NodeFilter', pieces + `
  return { fcHasHtml, richSpan, translateRichHtml, isCloze, fcSanitize };
`)(window, window.document, window.NodeFilter);

(async function run(){
  console.log('\n1) o que conta como card "rico"');
  ok(mod.fcHasHtml('<p>Qual a causa?</p>'), 'card do editor (envolto em <p>) é classificado como rico');
  ok(!mod.fcHasHtml('Qual a causa?'), 'texto puro não é rico');
  ok(mod.fcHasHtml('<ul><li>um</li></ul>'), 'lista é rica');

  console.log('\n2) o card rico agora sai marcado para tradução (era o bug)');
  const html = mod.richSpan('<p>What causes <strong>rheumatic fever</strong>?</p>');
  ok(html.includes('data-fc-i18n-html'), 'recebe data-fc-i18n-html');
  ok(html.includes('data-fc-original='), 'guarda o HTML original no dataset');
  ok(html.includes('class="fc-rich"'), 'mantém a classe fc-rich (o estilo não muda)');
  ok(mod.richSpan('x','div').startsWith('<div'), 'aceita <div> na tela de revisão');

  console.log('\n3) traduzir preserva a formatação');
  const out = await mod.translateRichHtml('<p>What causes <strong>rheumatic fever</strong>?</p>', 'pt');
  ok(out.includes('<strong>'), 'o negrito sobrevive à tradução');
  ok(out.includes('[PT]'), 'o texto foi de fato traduzido');
  ok(/\[PT\]rheumatic fever/.test(out), 'o texto DENTRO do negrito também traduz');
  ok(!out.includes('[PT]<'), 'nenhuma tag foi enviada ao tradutor');

  console.log('\n4) imagens e espaçamento');
  const img = await mod.translateRichHtml('<p>Veja <img src="data:image/png;base64,AAA"> aqui agora</p>', 'pt');
  ok(img.includes('<img'), 'a imagem continua no card');
  ok(!asked.some(t => t.includes('base64')), 'o base64 da imagem nunca foi mandado para o tradutor');
  const sp = await mod.translateRichHtml('<p>um <em>dois</em> tres</p>', 'pt');
  ok(!/\]\w*<em/.test(sp.replace(/\[PT\]/g,'[PT]')) && sp.includes(' <em>'), 'o espaço antes da tag é preservado (palavras não grudam)');

  console.log('\n5) o que NÃO deve ser traduzido');
  const before = asked.length;
  await mod.translateRichHtml('<p>.</p>', 'pt');
  ok(asked.length === before, 'pedaço só de pontuação não vira chamada de tradução');
  ok(mod.isCloze('O agente é {{c1::estreptococo}}'), 'cloze é reconhecido (o render o mantém fora da tradução)');

  console.log(`\n${fail === 0 ? '✅ TODOS OS TESTES PASSARAM' : '❌ ' + fail + ' TESTE(S) FALHARAM'}  (${pass} ok, ${fail} falhou)`);
  process.exit(fail === 0 ? 0 : 1);
})();
