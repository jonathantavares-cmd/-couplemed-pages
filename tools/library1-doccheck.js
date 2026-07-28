#!/usr/bin/env node
/* CoupleMed — audita o LIBRARY1_ADD_CONTENT.md contra o código real
   ============================================================================
   O doc é a fonte única do fluxo da Library 1, e envelhece em silêncio: citar
   `site.js:1380` fica errado no dia em que alguém insere 60 linhas acima disso.
   Já aconteceu duas vezes nesta base (e as duas por edição nossa no site.js).

   Este script verifica o que é verificável:
     1. todo arquivo citado existe;
     2. o guia não depende de números de linha frágeis;
     3. arquivos, ferramentas e testes obrigatórios do fluxo são citados;
     4. todo subcomando documentado existe na ferramenta;
     5. nenhuma referência "Seção N" aponta para seção inexistente;
     6. o doc não afirma o contrário do código nos pontos que já causaram bug.

   Uso:  node tools/library1-doccheck.js
   Sai com código 1 se houver divergência. Rodar junto com a auditoria de
   conteúdo (library1-audit.js) sempre que o doc ou o leitor mudarem.
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const DOC = 'LIBRARY1_ADD_CONTENT.md';
const md = fs.readFileSync(path.join(REPO, DOC), 'utf8');

let problems = 0, checks = 0;
const fail = (msg, detail) => { problems++; console.log(`  ❌ ${msg}${detail ? '\n       ' + detail : ''}`); };
const pass = () => { checks++; };
const read = p => fs.readFileSync(path.join(REPO, p), 'utf8');
const exists = p => fs.existsSync(path.join(REPO, p));

/* ---------- 1. arquivos citados existem ---------- */
console.log('1. arquivos citados no doc');
[...new Set([...md.matchAll(/`((?:public|tools)\/[A-Za-z0-9_/.-]+\.(?:js|css|md|json))`/g)].map(m => m[1]))]
  .filter(f => !f.includes('<'))
  .forEach(f => exists(f) ? pass() : fail(`${f} é citado mas não existe`));

/* ---------- 2. referências estáveis, sem números de linha ----------
   O guia operacional deve apontar por arquivo/símbolo. Linhas mudam sempre que
   conteúdo é inserido e não são um contrato seguro. */
console.log('2. referências estáveis');
const fragile = [...md.matchAll(/(?:site|qbank|library1-reader)\.js:(?:~?\d+|\d+-\d+)|~?linha\s+\d+/gi)];
if(fragile.length) fail(`há ${fragile.length} referência(s) frágil(is) por número de linha`,
                        fragile.slice(0, 3).map(m=>m[0]).join(', '));
else pass();

const SYMBOLS = [
  ['public/js/library1-structure.js', 'LIBRARY1_STRUCTURE'],
  ['public/js/library1-reader.js', 'couplemed:langchange'],
  ['public/js/library1-reader.js', 'couplemed_lib1quiz_'],
  ['public/js/library1-reader.js', 'l1r-q-figure'],
  ['public/js/cm-narration-shared.js', 'VOICES'],
  ['public/js/library1-content/_TEMPLATE.js', 'key:A1']
];
SYMBOLS.forEach(([file, symbol]) =>
  read(file).includes(symbol) ? pass() : fail(`${file} não contém o símbolo/invariante "${symbol}"`));
const template = read('public/js/library1-content/_TEMPLATE.js');
if(/src:A1|image-\d+-en\.(?:jpe?g|png)/i.test(template))
  fail('o template de conteúdo ainda ensina src/JPG/PNG legado em vez de key/WebP');
else pass();

/* ---------- 3. arquivos, ferramentas e testes obrigatórios citados ---------- */
console.log('3. arquivos, ferramentas e testes obrigatórios');
const REQUIRED = [
  'public/js/library1-structure.js',
  'public/js/library1-content/_TEMPLATE.js',
  'public/js/library1-content/<subject-slug>.js',
  'public/assets/library1/<subject-slug>/<topic-slug>/',
  'public/js/library1-flashcards/<subject-slug>.js',
  'public/js/library1-reader.js',
  'public/css/library1-reader.css',
  'public/js/cm-narration-shared.js',
  'public/js/cm-narrator.js',
  'public/css/cm-narrator.css',
  'tools/library1-audit.js',
  'tools/library1-progress.js',
  'tools/library1-assets.js',
  'tools/library1-crop-exhibit.py',
  'tools/narration.js',
  'tools/library1-cachecheck.js',
  'tools/library1-doccheck.js',
  'tools/tests/test-reader.js',
  'tools/tests/test-quiz.js',
  'tools/tests/test-read.js',
  'tools/tests/test-narrator.js',
  'tools/tests/test-flashcards.js',
  'RESPONSIVE_BREAKPOINTS.md'
];
REQUIRED.forEach(item => md.includes(item) ? pass() : fail(`${item} é obrigatório mas não é citado no doc`));

/* ---------- 4. subcomandos documentados existem ---------- */
console.log('4. subcomandos');
[...md.matchAll(/node (tools\/[a-z0-9-]+\.js)(?: ([a-z]+))?/g)].forEach(([, file, cmd]) => {
  if(!exists(file)) return fail(`o doc manda rodar ${file}, que não existe`);
  if(!cmd) return pass();
  read(file).includes(`'${cmd}'`) ? pass() : fail(`${file} não implementa o subcomando "${cmd}"`);
});

/* ---------- 5. referências cruzadas ---------- */
console.log('5. referências de seção');
const heads = new Set([...md.matchAll(/^#{1,4} [^\n]*?(\d+\.\d+[a-z]?|\b\d+\b)/gm)].map(m => m[1]));
[...new Set([...md.matchAll(/Seção (\d+(?:\.\d+)?)/g)].map(m => m[1]))]
  .forEach(r => heads.has(r) ? pass() : fail(`"Seção ${r}" é referenciada mas não existe`));

/* ---------- 6. o doc não contradiz o código nos pontos sensíveis ---------- */
console.log('6. coerência nos pontos que já causaram bug');
const rd = read('public/js/library1-reader.js');
const CLAIMS = [
  { what: 'doc diz que o leitor não tem botão de idioma próprio',
    docSays: /não há botões locais EN\/PT/i.test(md), codeAgrees: !/l1r-langbtn/.test(rd) },
  { what: 'doc diz que a mídia do artigo abre só no clique',
    docSays: /clica na referência para ampliar|abre a mídia ampliada/i.test(md), codeAgrees: !/function embedAssets/.test(rd) },
  { what: 'doc diz que as imagens do quiz são exibidas',
    docSays: /Create Test, as imagens aparecem inline/i.test(md), codeAgrees: rd.includes('l1r-q-figure') },
  { what: 'doc diz que o quiz grava em chave própria',
    docSays: md.includes('couplemed_lib1quiz_'), codeAgrees: rd.includes('couplemed_lib1quiz_') && !/qbank_/.test(rd) }
];
CLAIMS.forEach(c => {
  if(!c.docSays) return fail(`${c.what} — mas o doc não afirma isso (seção removida?)`);
  c.codeAgrees ? pass() : fail(`${c.what}, mas o CÓDIGO faz o contrário`);
});

/* ---------- 7. flashcards: a quantidade afirmada bate com o arquivo? ---------- */
console.log('7. flashcards da Library 1 (Seção 5.4)');
const FC_DIR = 'public/js/library1-flashcards';
if(exists(FC_DIR)){
  // quantidade obrigatória declarada no doc (hoje 30)
  // pega o número exigido do título da Seção 5.4 ou da frase "A quantidade **é N**"
  const m = md.match(/^#+[^\n]*?(\d+)\s+FLASHCARDS/im)
    || md.match(/exatamente\s+\*{0,2}(\d+)\s+flashcards/i)
    || md.match(/A quantidade \*\*é (\d+)\*\*/);
  const required = m ? Number(m[1]) : null;
  required ? pass() : fail('o doc não declara claramente quantos flashcards por tópico');

  /* Nenhum OUTRO número de flashcards pode aparecer no doc nem no README dos testes.
     Motivo: a quantidade subiu de 20 para 30 e o "20" sobreviveu em pontos soltos
     ("Ele confere as 20 unidades", "os 20 flashcards por tópico"), mandando a sessão
     seguinte criar a quantidade errada. Achado na auditoria de 2026-07-26. */
  if(required){
    const TESTS_README = 'tools/tests/README.md';
    const scan = [[DOC, md]];
    if(exists(TESTS_README)) scan.push([TESTS_README, read(TESTS_README)]);
    scan.forEach(([nome, texto])=>{
      texto.split('\n').forEach((linha, i)=>{
        // o espaço é obrigatório: sem ele, casaria dentro de identificadores
        // como `seedLibrary1Cards()`, que não é uma afirmação de quantidade.
        const re = /(?<![A-Za-z0-9])(\d+)\**\s+\**(flashcards|cards|unidades)\b/gi;
        let m;
        while((m = re.exec(linha))){
          const n = Number(m[1]);
          if(n === required || n === 0) { pass(); continue; }
          fail(`${nome}:${i+1} diz "${m[0]}", mas a quantidade obrigatória é ${required}`,
               linha.trim().slice(0, 120));
        }
      });
    });
  }

  fs.readdirSync(path.join(REPO, FC_DIR)).filter(f=>f.endsWith('.js') && !f.startsWith('_')).forEach(file=>{
    const rel = FC_DIR + '/' + file;
    md.includes(rel) || md.includes(FC_DIR) ? pass() : fail(`${rel} existe mas o doc não fala da pasta`);
    const box = { LIBRARY1_FLASHCARDS: {} };
    try { new Function('window', read(rel))(box); }
    catch(e){ return fail(`${rel} não carrega: ${e.message}`); }
    Object.entries(box.LIBRARY1_FLASHCARDS || {}).forEach(([subject, topics])=>{
      Object.entries(topics).forEach(([topic, list])=>{
        const where = `${subject} › ${topic}`;
        if(required && list.length !== required)
          fail(`${where}: ${list.length} flashcards, mas o doc exige ${required}`);
        else pass();
        // bilinguismo e campos que o doc promete
        const bad = list.filter(c=>!(c.en&&c.en.front&&c.en.back&&c.pt&&c.pt.front&&c.pt.back));
        bad.length ? fail(`${where}: ${bad.length} card(s) sem os dois idiomas completos`) : pass();
        const noKind = list.filter(c=>!c.kind);
        noKind.length ? fail(`${where}: ${noKind.length} card(s) sem \`kind\``) : pass();
        const copy = list.filter(c=>c.en.front===c.pt.front);
        copy.length ? fail(`${where}: ${copy.length} card(s) com PT igual ao EN`) : pass();
        // imagens declaradas existem
        list.filter(c=>c.img).forEach(c=>{
          exists('public'+c.img) ? pass() : fail(`${where}: ${c.id} aponta imagem inexistente ${c.img}`);
        });
      });
    });
  });
}

console.log();
/* 8. pacote de flashcards registrado no app.html
   O conteúdo da Library 1 carrega sob demanda, mas os flashcards são <script>
   estático. Um Subject novo sem a linha no app.html tem os cards no repositório e
   invisíveis para todo mundo — e nenhum teste pegava isso, porque o pacote existe,
   só não é carregado. O guia trata esse registro como obrigatório. */
console.log('8. pacote de flashcards carregado no app.html');
{
  const dir = path.join(REPO, 'public/js/library1-flashcards');
  const html = fs.readFileSync(path.join(REPO, 'public/app.html'), 'utf8');
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js') && !x.startsWith('_'))){
    if (html.includes('library1-flashcards/' + f)) pass();
    else fail(`${f} existe mas NÃO está carregado em public/app.html`,
              'sem essa linha os cards nunca são semeados para ninguém (Seção 5.4)');
  }
}

console.log(`${checks} verificação(ões) ok, ${problems} divergência(s)`);
if(problems){
  console.log('\n❌ o doc está fora de sincronia com o código — corrigir antes de commitar.');
  process.exit(1);
}
console.log('\n✅ LIBRARY1_ADD_CONTENT.md coerente com o código.');
