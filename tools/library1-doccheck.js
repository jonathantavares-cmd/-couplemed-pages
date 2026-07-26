#!/usr/bin/env node
/* CoupleMed — audita o LIBRARY1_ADD_CONTENT.md contra o código real
   ============================================================================
   O doc é a fonte única do fluxo da Library 1, e envelhece em silêncio: citar
   `site.js:1380` fica errado no dia em que alguém insere 60 linhas acima disso.
   Já aconteceu duas vezes nesta base (e as duas por edição nossa no site.js).

   Este script verifica o que é verificável:
     1. todo arquivo citado existe;
     2. toda citação `arquivo.js:N` aponta para uma linha que realmente contém
        aquilo que o doc diz (por palavra-chave);
     3. toda ferramenta em tools/ e todo teste em tools/tests/ é citado;
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

/* ---------- 2. citações de linha apontam para o lugar certo ----------
   O doc cita linhas em contextos conhecidos; cada um traz a palavra que a linha
   precisa conter. Se o número escorregar, isto acusa. */
console.log('2. citações de linha');
const LINE_CLAIMS = [
  { re: /`site\.js:(\d+)`\) dispara o evento `couplemed:langchange`/, file: 'public/js/site.js', needle: 'setLang', what: 'setLang()' },
  { re: /`slugify\(\)` \(`site\.js:(\d+)`\)/,                          file: 'public/js/site.js', needle: 'slugify',  what: 'slugify()' },
  { re: /função `renderLibrary\(\)` \(linha (\d+)/,                    file: 'public/js/site.js', needle: 'renderLibrary', what: 'renderLibrary()' },
  { re: /o bloco da Library 1 começa em (\d+)/,                        file: 'public/js/site.js', needle: "library-1", what: 'bloco library-1' },
  { re: /`site\.js:(\d+)-\d+` já indexa/,                              file: 'public/js/site.js', needle: 'LIBRARY1_STRUCTURE.forEach', what: 'indexador da busca global' },
  { re: /`renderQuestionMeta\(\)` \(~linha (\d+)\)/,                    file: 'public/js/qbank.js', needle: 'renderQuestionMeta', what: 'renderQuestionMeta()' },
  { re: /`metaFor\(q\)` \(~linha (\d+)\)/,                              file: 'public/js/qbank.js', needle: 'metaFor', what: 'metaFor()' },
  { re: /`qbank\.js:(\d+)`\)/,                                         file: 'public/js/qbank.js', needle: 'libraryPath', what: 'libraryPath' }
];
for(const c of LINE_CLAIMS){
  const m = md.match(c.re);
  if(!m){ fail(`não achei no doc a citação de ${c.what} (o texto mudou de forma?)`); continue; }
  const n = Number(m[1]);
  const line = (read(c.file).split('\n')[n - 1] || '');
  line.includes(c.needle)
    ? pass()
    : fail(`doc diz ${path.basename(c.file)}:${n} para ${c.what}, mas essa linha é outra`,
           `linha ${n}: ${line.trim().slice(0, 70)}…`);
}

/* ---------- 3. ferramentas e testes citados ---------- */
console.log('3. ferramentas e testes');
fs.readdirSync(path.join(REPO, 'tools')).filter(f => f.endsWith('.js'))
  .forEach(t => md.includes('tools/' + t) ? pass() : fail(`tools/${t} existe mas não é citada no doc`));
fs.readdirSync(path.join(REPO, 'tools/tests')).filter(f => f.endsWith('.js'))
  .forEach(t => md.includes(t) ? pass() : fail(`tools/tests/${t} existe mas não é citado no doc`));

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
  { what: 'doc diz que não há painel lateral',
    docSays: /Não existe painel lateral/.test(md), codeAgrees: !/l1r-aside|l1r-thumb/.test(rd) },
  { what: 'doc diz que o leitor não tem botão de idioma próprio',
    docSays: /não tem botão de idioma próprio/.test(md), codeAgrees: !/l1r-langbtn/.test(rd) },
  { what: 'doc diz que a mídia do artigo abre só no clique',
    docSays: /abre no clique|só quando se clica/.test(md), codeAgrees: !/function embedAssets/.test(rd) },
  { what: 'doc diz que as imagens do quiz são exibidas',
    docSays: /EXIBIDAS na página da questão/i.test(md), codeAgrees: rd.includes('l1r-q-figure') },
  { what: 'doc diz que o quiz grava em chave própria',
    docSays: md.includes('couplemed_lib1quiz_'), codeAgrees: rd.includes('couplemed_lib1quiz_') && !/qbank_/.test(rd) }
];
CLAIMS.forEach(c => {
  if(!c.docSays) return fail(`${c.what} — mas o doc não afirma isso (seção removida?)`);
  c.codeAgrees ? pass() : fail(`${c.what}, mas o CÓDIGO faz o contrário`);
});

console.log();
console.log(`${checks} verificação(ões) ok, ${problems} divergência(s)`);
if(problems){
  console.log('\n❌ o doc está fora de sincronia com o código — corrigir antes de commitar.');
  process.exit(1);
}
console.log('\n✅ LIBRARY1_ADD_CONTENT.md coerente com o código.');
