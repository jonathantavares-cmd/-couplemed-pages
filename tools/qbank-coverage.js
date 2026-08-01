#!/usr/bin/env node
/* Cobertura geral do QBank 1: contagem, metas, problemas estruturais. */
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..');
const QBANK = path.join(REPO, 'public/js/qbank.js');
const ASSETS = path.join(REPO, 'public/assets/qbank');

const src = fs.readFileSync(QBANK, 'utf8');

// extrair SEED contando colchetes
const startMarker = 'const SEED = [';
const start = src.indexOf(startMarker);
if (start < 0) { console.error('SEED não encontrado'); process.exit(1); }
let i = start + startMarker.length - 1; // posição do '[' inicial
let depth = 0;
let inString = false, stringChar = '', escaped = false;
const seedStart = i;
for (; i < src.length; i++) {
  const ch = src[i];
  if (escaped) { escaped = false; continue; }
  if (ch === '\\') { escaped = true; continue; }
  if (inString) {
    if (ch === stringChar) inString = false;
    continue;
  }
  if (ch === '"' || ch === "'" || ch === '`') { inString = true; stringChar = ch; continue; }
  if (ch === '[') { depth++; continue; }
  if (ch === ']') {
    depth--;
    if (depth === 0) { i++; break; }
  }
}
const seedText = src.substring(seedStart, i);
let SEED;
try {
  SEED = eval(seedText);
} catch (e) {
  console.error('Falha ao avaliar SEED:', e.message);
  process.exit(1);
}

// extrair TAXONOMY (mesma técnica)
const taxMarker = 'const TAXONOMY = [';
const taxStart = src.indexOf(taxMarker);
let TAXONOMY = [];
if (taxStart >= 0) {
  let j = taxStart + taxMarker.length - 1;
  let d = 0;
  inString = false; stringChar = ''; escaped = false;
  const taxBegin = j;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (inString) { if (ch === stringChar) inString = false; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inString = true; stringChar = ch; continue; }
    if (ch === '[') { d++; continue; }
    if (ch === ']') { d--; if (d === 0) { j++; break; } }
  }
  try { TAXONOMY = eval(src.substring(taxBegin, j)); } catch (e) {}
}

// metas canônicas (do QBANK_ADD_QUESTION.md §8.3)
const GOALS = {
  'biochemistry': 65, 'genetics': 62, 'microbiology': 30, 'pathology': 39,
  'pharmacology': 45, 'biostatistics_epidemiology': 120, 'poisoning_environmental': 32,
  'psychiatric_behavioral': 179, 'social_sciences': 107, 'multisystem': 24,
  'allergy_immunology': 108, 'cardiovascular': 417, 'dermatology': 100, 'ent': 40,
  'endocrine': 199, 'female_repro_breast': 79, 'gi_nutrition': 306,
  'heme_onc': 231, 'infectious_diseases': 272, 'male_repro': 52,
  'nervous_system': 402, 'ophthalmology': 31, 'pregnancy_childbirth': 59,
  'pulmonary_critical_care': 264, 'renal_urinary': 226, 'rheum_ortho': 168,
};

const assetExists = name => fs.existsSync(path.join(ASSETS, name));
const assetFiles = new Set(fs.readdirSync(ASSETS).filter(f => !f.startsWith('.')));

const stats = {
  total: SEED.length,
  bySystem: {},
  byCategory: {},
  ids: new Map(),
  problems: [],
  missingAssets: new Set(),
  orphanAssets: new Set(assetFiles),
  unknownCategories: new Set(),
  warnings: [],
};

function addProblem(q, type, detail) {
  stats.problems.push({ id: q && q.id || 'N/A', type, detail });
}
function addWarning(q, type, detail) {
  stats.warnings.push({ id: q && q.id || 'N/A', type, detail });
}

SEED.forEach((q, idx) => {
  // ID duplicado
  if (stats.ids.has(q.id)) addProblem(q, 'ID_DUPLICADO', `primeiro em #${stats.ids.get(q.id)}`);
  else stats.ids.set(q.id, idx);

  // campos obrigatórios
  ['system','discipline','category','difficulty','vignette','options','correct','explC','objective'].forEach(f => {
    if (q[f] === undefined || q[f] === null || q[f] === '') addProblem(q, 'CAMPO_OBRIGATORIO_VAZIO', f);
  });
  // q vazio é aviso (pergunta pode estar embutida na vignette)
  if (q.q === undefined || q.q === null || q.q === '') addWarning(q, 'Q_VAZIO', 'pergunta embutida na vignette?');

  // opções
  if (!Array.isArray(q.options) || q.options.length < 2) addProblem(q, 'OPTIONS_INVALIDAS', `${q.options?.length || 0} alternativas`);
  else {
    const labels = q.options.map(o => o.label);
    const expected = ['A','B','C','D','E','F','G','H','I','J'].slice(0, q.options.length);
    if (labels.join(',') !== expected.join(',')) addProblem(q, 'LABELS_FORA_DE_ORDEM', labels.join(','));
  }

  // correct deve existir em options
  if (q.options && !q.options.find(o => o.label === q.correct)) addProblem(q, 'CORRECT_INVALIDO', q.correct);

  // ptTranslation
  if (!q.ptTranslation) addProblem(q, 'PT_TRANSLATION_AUSENTE', '');
  else {
    ['vignette','objective','options','explC'].forEach(f => {
      if (q.ptTranslation[f] === undefined || q.ptTranslation[f] === null || q.ptTranslation[f] === '') addProblem(q, 'PT_CAMPO_VAZIO', f);
    });
    if (q.ptTranslation.q === undefined || q.ptTranslation.q === null || q.ptTranslation.q === '') addWarning(q, 'PT_Q_VAZIO', 'pergunta embutida na vignette?');
    if (Array.isArray(q.explI) && Array.isArray(q.ptTranslation.explI)) {
      const enOpts = q.explI.map(e => e.option).sort().join('|');
      const ptOpts = q.ptTranslation.explI.map(e => e.option).sort().join('|');
      if (enOpts !== ptOpts) addProblem(q, 'EXPLI_OPTIONS_DIVERGENTES', `EN:[${enOpts}] PT:[${ptOpts}]`);
    } else if (Array.isArray(q.explI) !== Array.isArray(q.ptTranslation.explI)) {
      addProblem(q, 'EXPLI_TIPO_DIVERGENTE', '');
    }
  }

  // dificuldade
  if (q.peer && q.peer[q.correct] !== undefined) {
    const pct = q.peer[q.correct];
    const expected = pct >= 70 ? 'easy' : pct >= 50 ? 'medium' : 'hard';
    if (q.difficulty !== expected) addProblem(q, 'DIFICULDADE_INCONSISTENTE', `peer=${pct}% esperado=${expected} atual=${q.difficulty}`);
  }

  // assets
  const checkAsset = (field, kind) => {
    if (!q[field]) return;
    const list = Array.isArray(q[field]) ? q[field] : [q[field]];
    list.forEach(a => {
      const name = a.replace(/^assets\/qbank\//, '');
      stats.orphanAssets.delete(name);
      if (!assetExists(name)) stats.missingAssets.add(name);
    });
  };
  checkAsset('img');
  checkAsset('explImg');

  // contagens
  stats.bySystem[q.system] = (stats.bySystem[q.system] || 0) + 1;
  stats.byCategory[q.category] = (stats.byCategory[q.category] || 0) + 1;
});

// taxonomia esperada
const expectedCats = new Set();
TAXONOMY.forEach(s => s.subs.forEach(([slug]) => expectedCats.add(`${s.id}::${slug}`)));
Object.keys(stats.byCategory).forEach(cat => { if (!expectedCats.has(cat)) { stats.unknownCategories.add(cat); addProblem({id:'GLOBAL'}, 'CATEGORIA_DESCONHECIDA', cat); } });

console.log('=== COBERTURA QBANK 1 ===\n');
console.log(`Total de questões: ${stats.total}\n`);

console.log('--- Por sistema (vs meta) ---');
Object.keys(stats.bySystem).sort().forEach(sys => {
  const n = stats.bySystem[sys];
  const goal = GOALS[sys] || '?';
  const ok = GOALS[sys] ? (n >= GOALS[sys] ? '✅' : `faltam ${GOALS[sys] - n}`) : '?';
  console.log(`  ${sys.padEnd(32)} ${String(n).padStart(4)} / ${goal}  ${ok}`);
});

console.log('\n--- Por categoria (top 30) ---');
Object.entries(stats.byCategory).sort((a,b)=>b[1]-a[1]).slice(0,30).forEach(([cat,n]) => console.log(`  ${cat.padEnd(60)} ${n}`));

console.log('\n--- Problemas ---');
if (stats.problems.length === 0) console.log('  ✅ Nenhum problema estrutural encontrado.');
else {
  const byType = {};
  stats.problems.forEach(p => { byType[p.type] = (byType[p.type] || 0) + 1; });
  Object.entries(byType).sort((a,b)=>b[1]-a[1]).forEach(([t,n]) => console.log(`  ${t}: ${n}`));
  console.log('\n  Detalhes (primeiros 30):');
  stats.problems.slice(0,30).forEach(p => console.log(`    ${p.id} — ${p.type}: ${p.detail}`));
}

console.log('\n--- Avisos ---');
if (stats.warnings.length === 0) console.log('  ✅ Nenhum aviso.');
else {
  const byType = {};
  stats.warnings.forEach(w => { byType[w.type] = (byType[w.type] || 0) + 1; });
  Object.entries(byType).sort((a,b)=>b[1]-a[1]).forEach(([t,n]) => console.log(`  ${t}: ${n}`));
  console.log('\n  Detalhes (primeiros 20):');
  stats.warnings.slice(0,20).forEach(w => console.log(`    ${w.id} — ${w.type}: ${w.detail}`));
}

console.log('\n--- Categorias desconhecidas ---');
if (stats.unknownCategories && stats.unknownCategories.size) Array.from(stats.unknownCategories).forEach(c => console.log(`  ❌ ${c}`));
else console.log('  ✅ Nenhuma');

console.log('\n--- Assets ---');
console.log(`  Assets órfãos: ${stats.orphanAssets.size}`);
if (stats.orphanAssets.size) Array.from(stats.orphanAssets).forEach(a => console.log(`    ⚠️  ${a}`));
console.log(`  Assets faltantes: ${stats.missingAssets.size}`);
if (stats.missingAssets.size) Array.from(stats.missingAssets).forEach(a => console.log(`    ❌ ${a}`));

console.log('\n--- IDs ---');
console.log(`  IDs únicos: ${stats.ids.size}`);
