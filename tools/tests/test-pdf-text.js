/* Teste da extração de texto de PDF em ordem de leitura (tools/lib/pdf-text.js).

   É o que decide se a narração da Library 3 sai compreensível ou vira salada de
   palavras. Roda sem browser e sem PDF: monta os fragmentos na mão, reproduzindo
   os layouts que o First Aid usa de verdade — foi medindo o PDF real que cada um
   destes casos apareceu.

   Como rodar:  node tools/tests/test-pdf-text.js
*/
const P = require('../lib/pdf-text.js');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c){ pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const eq = (a, b, m) => ok(a === b, `${m}\n       esperado: ${JSON.stringify(b)}\n       veio:     ${JSON.stringify(a)}`);

/* fragmento como o PDF.js entrega */
const part = (text, x, y, w, h) => ({ text, x, y, w: w != null ? w : text.length * 5, h: h || 10 });

console.log('\n1) ordem de leitura numa TABELA de rótulo | conteúdo');
{
  // O caso que quebrava: o rótulo ocupa DUAS linhas e o conteúdo UMA, então
  // agrupar por y joga o conteúdo no meio do rótulo.
  const parts = [
    part('Selective serotonin',  70, 700, 90),
    part('Fluoxetine, sertraline, citalopram.', 190, 700, 300),
    part('reuptake inhibitors',  70, 687, 90),
    part('MECHANISM',            70, 660, 70),
    part('Inhibit 5-HT reuptake.', 190, 660, 180),
    part('CLINICAL USE',         70, 640, 80),
    part('Depression, OCD, bulimia.', 190, 640, 220),
    part('ADVERSE EFFECTS',     70, 620, 95),
    part('Serotonin syndrome, GI distress, SIADH.', 190, 620, 320),
    part('sexual dysfunction, mania precipitation.', 190, 608, 330),
    part('NOTES',               70, 580, 45),
    part('Fewer adverse effects than TCAs overall.', 190, 580, 330),
    part('Takes 4 to 8 weeks for onset of effect.', 190, 568, 320),
    part('Serotonin syndrome',  70, 540, 90),
    part('Caused by combination with MAO inhibitors.', 190, 540, 340),
    part('Presents with hyperthermia and clonus.', 190, 528, 320),
    part('Treatment is cyproheptadine.', 190, 516, 230),
    part('MECHANISM',           70, 490, 70),
    part('Excess serotonergic stimulation.', 190, 490, 260),
    part('CLINICAL USE',        70, 470, 80),
    part('Diagnosis is clinical; stop the offending agent.', 190, 470, 370)
  ];
  const cols = P.detectColumns(parts);
  ok(!!cols, 'reconhece que a página é uma tabela');
  const text = P.orderTableLines(parts, cols.bounds).map(l => l.text).join(' ');
  ok(/Selective serotonin reuptake inhibitors/.test(text),
     'o rótulo de duas linhas sai INTEIRO, sem o conteúdo no meio');
  ok(text.indexOf('reuptake inhibitors') < text.indexOf('Fluoxetine'),
     'o rótulo vem antes do conteúdo que ele rotula');
  ok(/MECHANISM Inhibit 5-HT/.test(text), 'cada rótulo fica colado ao seu próprio conteúdo');
}

console.log('\n2) texto corrido não é tratado como tabela');
{
  const parts = [];
  for (let i = 0; i < 24; i++) parts.push(part('linha corrida de texto normal numero ' + i, 70, 700 - i * 12, 460));
  ok(!P.detectColumns(parts), 'uma coluna só: não inventa tabela');
}

console.log('\n3) fragmentos da mesma linha se juntam com o espaçamento certo');
{
  // o PDF quebra a linha em pedaços por mudança de fonte; colar direto gruda palavras
  eq(P.joinLine([part('coma', 100, 500, 25), part('Thiamine', 130, 500, 45)]),
     'coma Thiamine', 'vão largo entre pedaços vira espaço');
  eq(P.joinLine([part('Na', 100, 500, 12), part('+', 112, 500, 4)]),
     'Na+', 'pedaços colados (sobrescrito) não ganham espaço');
  eq(P.joinLine([part('risco', 100, 500, 25), part(',', 125, 500, 3)]),
     'risco,', 'pontuação não é separada da palavra');
}

console.log('\n4) glifos do First Aid viram palavra falável');
{
  eq(P.GLYPHS['q'].trim(), 'increased', 'q (↑) é lido como "increased"');
  eq(P.GLYPHS['r'].trim(), 'decreased', 'r (↓) é lido como "decreased"');
  eq(P.GLYPHS['p'].trim(), 'leads to',  'p (→) é lido como "leads to"');
  ok(!('$' in P.GLYPHS), 'ligadura NÃO tem tradução fixa (varia de PDF para PDF)');
}

console.log('\n5) ligaduras: o mesmo glifo é "ff" num PDF e "fi" noutro');
{
  const L = '';   // marcador de ligadura desconhecida
  const c = t => P.cleanForSpeech(t);
  eq(c(`de${L}ciency`),   'deficiency',   'de⟦?⟧ciency → deficiency (palavra conhecida)');
  eq(c(`Korsako${L}`),    'Korsakoff',    'Korsako⟦?⟧ → Korsakoff (palavra conhecida)');
  eq(c(`el${L}n`),        'elfin',        'el⟦?⟧n → elfin (palavra conhecida)');
  eq(c(`in${L}ammation`), 'inflammation', 'in⟦?⟧ammation → inflammation');
  // fora do dicionário, decide pelo som
  eq(c(`${L}uvoxamine`),  'fluvoxamine',  'desconhecida antes de vogal → "fl" (não "fi")');
  eq(c(`speci${L}cally`), 'specifically', 'desconhecida antes de consoante → "fi"');
}

console.log('\n6) limpeza para leitura em voz alta');
{
  const c = P.cleanForSpeech;
  ok(!/https?:/.test(c('Veja https://ebookmed.ir agora')), 'URL de marca d’água não é narrada');
  eq(c('hyper- prolactinemia'), 'hyperprolactinemia', 'palavra partida no fim da linha volta inteira');
  eq(c('risco , grave'), 'risco, grave', 'espaço antes de vírgula sai');
  eq(c('( retinal )'), '(retinal)', 'parênteses ficam colados');
}

console.log(`\n${fail === 0 ? '✅ TODOS OS TESTES PASSARAM' : '❌ ' + fail + ' TESTE(S) FALHARAM'}  (${pass} ok, ${fail} falhou)`);
process.exit(fail === 0 ? 0 : 1);
