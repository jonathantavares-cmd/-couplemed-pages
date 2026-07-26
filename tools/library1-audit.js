#!/usr/bin/env node
/* CoupleMed — Library 1: AUDITORIA de tópico incluído
   ============================================================================
   Roda OBRIGATORIAMENTE ao terminar cada tópico (LIBRARY1_ADD_CONTENT.md §11.1).
   Confere o que o olho não pega numa página longa e bilíngue:

     1. Toda mídia declarada tem os DOIS idiomas e os arquivos existem em disco.
     2. Toda mídia é REFERENCIADA — no texto do artigo OU em alguma questão do
        Create Test (`img`/`explImg`). Mídia do Create Test é AUTOSSUFICIENTE:
        entra sempre que o print trouxer imagem no enunciado ou na explicação,
        MESMO que o artigo nunca a cite — não depende de referência no texto
        (regra do usuário, reforçada 2026-07-25; ver LIBRARY1_ADD_CONTENT.md §11.2).
     3. EN e PT referenciam exatamente o mesmo conjunto de mídias (quando a
        referência vem do texto do artigo).
     4. Toda referência aponta para uma mídia que existe (sem link morto).
     5. As legendas (alt) estão preenchidas e diferentes entre EN e PT — alt
        igual nos dois idiomas quase sempre é tradução esquecida.
     6. EN e PT têm a mesma estrutura (seções, listas, tabelas) — seção a menos
        no PT é sinal de tradução incompleta.
     7. O HTML não traz <img> solta: a página é só texto (a mídia abre no clique).
     8. Create Test: id único, correct válida, difficulty coerente com peer (mesma
        regra do QBank), explicações e tradução PT completas, e TODA imagem do
        enunciado (`img`) e da explicação (`explImg`) incluída — nunca omitida
        por não estar referenciada em outro lugar.

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
    if(a.en && a.pt && a.en.alt && a.pt.alt && a.en.alt === a.pt.alt && !a.singleLang)
      warnings.push(`${k}: alt idêntico em EN e PT ("${a.en.alt}") — tradução esquecida? (se a figura veio só num idioma, marque singleLang:true)`);
  }

  // 2/3/4. referências — no texto do artigo OU nas questões do Create Test (img/explImg).
  // Mídia do Create Test é AUTOSSUFICIENTE: entra sempre, mesmo que o artigo nunca a cite
  // (regra do usuário, reforçada 2026-07-25 — ver LIBRARY1_ADD_CONTENT.md §11.2).
  const quizPre = Array.isArray(rec.quiz) ? rec.quiz : [];
  const quizRefs = new Set();
  quizPre.forEach(it => { if(it.img) quizRefs.add(it.img); if(it.explImg) quizRefs.add(it.explImg); });

  const rEn = refsOf(rec.en && rec.en.html), rPt = refsOf(rec.pt && rec.pt.html);
  const setEn = new Set(rEn), setPt = new Set(rPt);
  for(const k of keys){
    if(quizRefs.has(k)) continue;   // garantida pelo Create Test — não depende do texto do artigo
    if(!setEn.has(k)) problems.push(`${k}: NÃO é referenciada no texto EN nem em nenhuma questão do Create Test — fica inalcançável`);
    if(!setPt.has(k)) problems.push(`${k}: NÃO é referenciada no texto PT nem em nenhuma questão do Create Test — fica inalcançável`);
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

  /* 8. CREATE TEST — questões do tópico (separadas do QBank 1) */
  const quiz = quizPre;
  const seenIds = new Set();
  const LETTERS = ['A','B','C','D','E','F','G','H'];
  quiz.forEach((it, i)=>{
    const tag = `quiz[${i}]${it.id?' '+it.id:''}`;
    if(!it.id) problems.push(`${tag}: sem id`);
    else if(seenIds.has(it.id)) problems.push(`${tag}: id repetido`);
    else seenIds.add(it.id);
    if(!it.vignette) problems.push(`${tag}: sem vignette`);
    if(!it.q) problems.push(`${tag}: sem enunciado (q)`);
    const opts = Array.isArray(it.options) ? it.options : [];
    if(opts.length < 2) problems.push(`${tag}: menos de 2 alternativas`);
    const ci = LETTERS.indexOf(it.correct);
    if(ci < 0 || ci >= opts.length) problems.push(`${tag}: correct "${it.correct}" fora das alternativas`);
    // peer + dificuldade pela MESMA regra do QBank (§0.2 daquele doc)
    if(it.peer && it.peer[it.correct] != null){
      const p = it.peer[it.correct];
      const should = p >= 70 ? 'easy' : p >= 50 ? 'medium' : 'hard';
      if(it.difficulty && it.difficulty !== should)
        problems.push(`${tag}: difficulty "${it.difficulty}" não bate com peer[${it.correct}]=${p}% (deveria ser "${should}")`);
      if(!it.difficulty) warnings.push(`${tag}: sem difficulty (peer diz "${should}")`);
    } else if(it.peer){
      problems.push(`${tag}: peer não tem a alternativa correta (${it.correct})`);
    }
    if(!it.explC) problems.push(`${tag}: sem explicação da correta (explC)`);
    if(!it.objective) warnings.push(`${tag}: sem objetivo educacional`);
    if(it.img && !assets[it.img]) problems.push(`${tag}: img "${it.img}" não existe em assets`);
    if(it.explImg && !assets[it.explImg]) problems.push(`${tag}: explImg "${it.explImg}" não existe em assets`);
    // tradução PT obrigatória
    const p = it.ptTranslation;
    if(!p) problems.push(`${tag}: sem ptTranslation (bilíngue é obrigatório)`);
    else {
      ['vignette','q','explC','objective'].forEach(f=>{
        if(it[f] && !p[f]) problems.push(`${tag}: ptTranslation.${f} faltando`);
      });
      const po = Array.isArray(p.options) ? p.options : [];
      if(po.length !== opts.length) problems.push(`${tag}: ptTranslation.options tem ${po.length}, EN tem ${opts.length}`);
      const a = Object.keys(it.explI||{}).sort().join(','), b = Object.keys(p.explI||{}).sort().join(',');
      if(a !== b) problems.push(`${tag}: explI difere entre EN (${a||'—'}) e PT (${b||'—'})`);
    }
  });

  return { problems, warnings, assets: keys.length, refs: rEn.length, quiz: quiz.length };
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
    const { problems, warnings, assets, refs, quiz } = auditTopic(s, t, all[s][t]);
    totalP += problems.length; totalW += warnings.length;
    const status = problems.length ? '❌' : warnings.length ? '⚠️ ' : '✅';
    console.log(`\n${status} ${s} › ${t}   (${assets} mídias, ${refs} referências, ${quiz} questões)`);
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
