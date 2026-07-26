#!/usr/bin/env node
/* CoupleMed — Library 1: AUDITORIA de tópico incluído
   ============================================================================
   Roda OBRIGATORIAMENTE ao terminar cada tópico (LIBRARY1_ADD_CONTENT.md §11.1).
   Confere o que o olho não pega numa página longa e bilíngue:

     1. Toda mídia declarada tem os DOIS idiomas e os arquivos existem em disco.
     2. Toda mídia é REFERENCIADA no texto — se ninguém a cita, ela é
        inalcançável, porque a imagem só abre clicando no nome dela.
     3. EN e PT referenciam exatamente o mesmo conjunto de mídias.
     4. Toda referência aponta para uma mídia que existe (sem link morto).
     5. As legendas (alt) estão preenchidas e diferentes entre EN e PT — alt
        igual nos dois idiomas quase sempre é tradução esquecida.
     6. EN e PT têm a mesma estrutura (seções, listas, tabelas) — seção a menos
        no PT é sinal de tradução incompleta.
     7. O HTML não traz <img> solta: a página é só texto (a mídia abre no clique).

   Uso:
     node tools/library1-audit.js                      # tudo que já foi publicado
     node tools/library1-audit.js "<Subject>"          # um Subject
     node tools/library1-audit.js "<Subject>" "<Tópico>"
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(REPO, 'public/js/library1-content');
const ASSETS_DIR = path.join(REPO, 'public/assets/library1');

const slugify = s => String(s || '').toLowerCase()
  .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function loadAll(){
  const sandbox = { LIBRARY1_CONTENT: {} };
  if(!fs.existsSync(CONTENT_DIR)) return {};
  for(const f of fs.readdirSync(CONTENT_DIR)){
    if(!f.endsWith('.js') || f.startsWith('_')) continue;
    try { new Function('window', fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8'))(sandbox); }
    catch(e){ console.error(`  ! ${f}: ${e.message}`); }
  }
  return sandbox.LIBRARY1_CONTENT || {};
}

const refsOf = html => [...String(html||'').matchAll(/data-ref="([^"]+)"/g)].map(m => m[1]);
const countTag = (html, tag) => (String(html||'').match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;

function auditTopic(subjectSlug, topicSlug, rec){
  const problems = [], warnings = [];
  const assets = rec.assets || {};
  const keys = Object.keys(assets);

  // 1. mídia: dois idiomas + arquivo em disco
  for(const k of keys){
    const a = assets[k];
    if(!a.kind || !a.n) problems.push(`${k}: falta kind/n (agrupa e numera a legenda)`);
    for(const lang of ['en','pt']){
      const v = a[lang];
      if(!v){ problems.push(`${k}: falta a versão ${lang.toUpperCase()}`); continue; }
      const key = v.key || v.src;
      if(!key){ problems.push(`${k}.${lang}: sem key`); continue; }
      const file = path.join(ASSETS_DIR, key.replace(/^\/?assets\/library1\//, ''));
      if(!fs.existsSync(file)) problems.push(`${k}.${lang}: arquivo não existe → ${key}`);
      if(!v.alt) problems.push(`${k}.${lang}: alt vazio (é a legenda da imagem ampliada)`);
    }
    // 5. alt traduzido
    if(a.en && a.pt && a.en.alt && a.pt.alt && a.en.alt === a.pt.alt)
      warnings.push(`${k}: alt idêntico em EN e PT ("${a.en.alt}") — tradução esquecida?`);
  }

  // 2/3/4. referências
  const rEn = refsOf(rec.en && rec.en.html), rPt = refsOf(rec.pt && rec.pt.html);
  const setEn = new Set(rEn), setPt = new Set(rPt);
  for(const k of keys){
    if(!setEn.has(k)) problems.push(`${k}: NÃO é referenciada no texto EN — fica inalcançável`);
    if(!setPt.has(k)) problems.push(`${k}: NÃO é referenciada no texto PT — fica inalcançável`);
  }
  for(const r of setEn) if(!assets[r]) problems.push(`EN referencia "${r}", que não existe em assets`);
  for(const r of setPt) if(!assets[r]) problems.push(`PT referencia "${r}", que não existe em assets`);
  if(rEn.length !== rPt.length)
    warnings.push(`nº de referências difere: EN ${rEn.length} × PT ${rPt.length} (ordem/repetição podem divergir)`);

  // 6. estrutura EN × PT
  for(const [tag, label] of [['h2','seções'],['h3','subseções'],['li','itens de lista'],['table','tabelas'],['p','parágrafos']]){
    const a = countTag(rec.en && rec.en.html, tag), b = countTag(rec.pt && rec.pt.html, tag);
    if(a !== b) warnings.push(`${label}: EN ${a} × PT ${b} — tradução pode estar incompleta`);
  }
  if(!rec.en || !rec.en.title) problems.push('falta title EN');
  if(!rec.pt || !rec.pt.title) problems.push('falta title PT');

  // 7. nada de <img> solta no conteúdo
  for(const lang of ['en','pt']){
    if(/<img[\s>]/i.test((rec[lang] && rec[lang].html) || ''))
      problems.push(`${lang.toUpperCase()}: há <img> no HTML — a página é só texto; a mídia entra em assets e abre no clique`);
  }

  return { problems, warnings, assets: keys.length, refs: rEn.length };
}

/* ---------- execução ---------- */
const [subjArg, topicArg] = process.argv.slice(2);
const all = loadAll();
const subjects = Object.keys(all).filter(s => !subjArg || s === slugify(subjArg));

if(!subjects.length){
  console.error(subjArg ? `Nenhum conteúdo publicado para "${subjArg}".` : 'Nenhum conteúdo publicado ainda.');
  process.exit(1);
}

let totalP = 0, totalW = 0, n = 0;
for(const s of subjects){
  const topics = Object.keys(all[s]).filter(t => !topicArg || t === slugify(topicArg));
  for(const t of topics){
    n++;
    const { problems, warnings, assets, refs } = auditTopic(s, t, all[s][t]);
    totalP += problems.length; totalW += warnings.length;
    const status = problems.length ? '❌' : warnings.length ? '⚠️ ' : '✅';
    console.log(`\n${status} ${s} › ${t}   (${assets} mídias, ${refs} referências)`);
    problems.forEach(p => console.log(`     ❌ ${p}`));
    warnings.forEach(w => console.log(`     ⚠️  ${w}`));
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`${n} tópico(s) auditado(s) · ${totalP} problema(s) · ${totalW} aviso(s)`);
if(totalP){
  console.log('\n❌ CORRIGIR ANTES DE SEGUIR PARA O PRÓXIMO TÓPICO.');
  process.exit(1);
}
console.log(totalW ? '\n⚠️  Sem problemas graves, mas confira os avisos acima.'
                   : '\n✅ Tudo certo.');
