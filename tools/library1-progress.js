#!/usr/bin/env node
/* CoupleMed — Library 1: progresso da inclusão de conteúdo
   ============================================================================
   Marca com ✅ as subpastas (tópicos) já incluídas na pasta de origem do
   usuário, e marca a pasta do Subject inteiro quando todos os seus tópicos
   estiverem concluídos — pedido do usuário (2026-07-25), para ele saber de
   relance o que já entrou sem precisar abrir o site.

   O ✅ é acrescentado como SUFIXO do nome da pasta (" ✅"), o que preserva a
   ordem alfabética e não atrapalha o mapeamento — todo o código que compara
   nome de pasta com nome de tópico remove o ✅ antes de comparar (ver
   stripCheck() abaixo e LIBRARY1_ADD_CONTENT.md §3).

   Uso:
     node tools/library1-progress.js status
         Mostra o progresso por Subject (incluídos / com material / total).

     node tools/library1-progress.js mark "<Subject>" "<Tópico>"
         Marca um tópico como concluído. Se com isso o Subject ficar completo,
         marca a pasta do Subject também.

     node tools/library1-progress.js sync
         Reconcilia tudo com o que está realmente publicado em
         public/js/library1-content/ — marca o que está incluído e DESMARCA o
         que não está (fonte da verdade é o conteúdo publicado, não o ✅).
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
// LIB1_SRC existe só para teste do próprio script (apontar para uma cópia de mentira);
// no uso normal é sempre a pasta real do Desktop.
const SRC_ROOT = process.env.LIB1_SRC || '/Users/jonathan/Desktop/Adicionar Library 1';
const CONTENT_DIR = path.join(REPO, 'public/js/library1-content');
const CHECK = '✅';

/* ---------- normalização (idêntica à documentada em LIBRARY1_ADD_CONTENT.md §3) ---------- */
const stripCheck = s => s.replace(/\s*✅\s*$/u, '').trim();
const norm = s => stripCheck(String(s).normalize('NFC'))
  .replace(/\s*[\/:]\s*/g, ' - ')
  .replace(/[<>]/g, '')
  .replace(/\.+$/, '')
  .replace(/\s+/g, ' ')
  .trim();
const slugify = s => String(s || '').toLowerCase()
  .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* ---------- estrutura oficial do site ---------- */
function loadStructure(){
  const sandbox = {};
  const code = fs.readFileSync(path.join(REPO, 'public/js/library1-structure.js'), 'utf8');
  new Function('window', code)(sandbox);
  return sandbox.LIBRARY1_STRUCTURE;
}

/* ---------- conteúdo já publicado ---------- */
function loadPublished(){
  const out = {};
  if(!fs.existsSync(CONTENT_DIR)) return out;
  for(const file of fs.readdirSync(CONTENT_DIR)){
    if(!file.endsWith('.js') || file.startsWith('_')) continue;
    const sandbox = { LIBRARY1_CONTENT: {} };
    try{
      new Function('window', fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8'))(sandbox);
    }catch(e){
      console.error(`  ! ${file}: ${e.message}`);
      continue;
    }
    Object.assign(out, sandbox.LIBRARY1_CONTENT || {});
  }
  return out;
}

/* ---------- disco ---------- */
const isDir = p => { try{ return fs.statSync(p).isDirectory(); }catch(e){ return false; } };
const listDirs = p => !isDir(p) ? [] :
  fs.readdirSync(p).filter(n => n !== '.DS_Store' && isDir(path.join(p, n)));
const hasMaterial = p => !isDir(p) ? false :
  fs.readdirSync(p).some(n => n !== '.DS_Store');
const isChecked = name => /✅\s*$/u.test(name);

function setCheck(dirPath, want){
  const dir = path.dirname(dirPath);
  const name = path.basename(dirPath);
  const has = isChecked(name);
  if(has === want) return false;
  const target = want ? `${stripCheck(name)} ${CHECK}` : stripCheck(name);
  const dest = path.join(dir, target);
  if(fs.existsSync(dest) && dest !== dirPath){
    console.error(`  ! já existe: ${target}`);
    return false;
  }
  fs.renameSync(dirPath, dest);
  return true;
}

// Acha a pasta no disco que corresponde a um nome do site (tolerando o ✅).
function findDir(parent, siteName){
  const want = norm(siteName);
  for(const n of listDirs(parent)){
    if(norm(n) === want) return path.join(parent, n);
  }
  return null;
}

/* ---------- relatório ---------- */
function report(){
  const S = loadStructure();
  const published = loadPublished();
  if(!isDir(SRC_ROOT)){
    console.error(`Pasta de origem não encontrada: ${SRC_ROOT}`);
    process.exit(1);
  }
  let tDone = 0, tMat = 0, tAll = 0;
  const rows = [];
  for(const folder of S){
    const dir = findDir(SRC_ROOT, folder.name);
    let done = 0, mat = 0;
    const pub = published[slugify(folder.name)] || {};
    for(const topic of folder.items){
      const tslug = slugify(topic.name);
      if(pub[tslug]) done++;
      const tdir = dir ? findDir(dir, topic.name) : null;
      if(tdir && hasMaterial(tdir)) mat++;
    }
    tDone += done; tMat += mat; tAll += folder.items.length;
    rows.push({ name: folder.name, done, mat, total: folder.items.length, missing: !dir });
  }
  const w = Math.max(...rows.map(r => r.name.length));
  console.log(`${'SUBJECT'.padEnd(w)}  INCLUÍDOS  C/ MATERIAL  TOTAL`);
  console.log('-'.repeat(w + 30));
  for(const r of rows){
    const flag = r.done === r.total && r.total > 0 ? ' ✅' : (r.missing ? '  (pasta não encontrada)' : '');
    console.log(`${r.name.padEnd(w)}  ${String(r.done).padStart(9)}  ${String(r.mat).padStart(11)}  ${String(r.total).padStart(5)}${flag}`);
  }
  console.log('-'.repeat(w + 30));
  console.log(`${'TOTAL'.padEnd(w)}  ${String(tDone).padStart(9)}  ${String(tMat).padStart(11)}  ${String(tAll).padStart(5)}`);
  const pct = tAll ? ((tDone / tAll) * 100).toFixed(1) : '0.0';
  console.log(`\nProgresso: ${tDone}/${tAll} tópicos (${pct}%) · ${tMat} com material aguardando inclusão`);
}

/* ---------- marcar um tópico ---------- */
function mark(subjectName, topicName){
  const S = loadStructure();
  const folder = S.find(f => norm(f.name) === norm(subjectName));
  if(!folder){ console.error(`Subject não encontrado: ${subjectName}`); process.exit(1); }
  const dir = findDir(SRC_ROOT, folder.name);
  if(!dir){ console.error(`Pasta do Subject não encontrada no disco: ${folder.name}`); process.exit(1); }

  if(topicName){
    const topic = folder.items.find(t => norm(t.name) === norm(topicName));
    if(!topic){ console.error(`Tópico não encontrado: ${topicName}`); process.exit(1); }
    const tdir = findDir(dir, topic.name);
    if(!tdir){ console.error(`Pasta do tópico não encontrada: ${topic.name}`); process.exit(1); }
    if(setCheck(tdir, true)) console.log(`✅ ${folder.name} › ${topic.name}`);
    else console.log(`(já marcado) ${folder.name} › ${topic.name}`);
  }

  // Subject completo? (todos os tópicos marcados no disco)
  const allDone = folder.items.every(t => {
    const td = findDir(dir, t.name);
    return td && isChecked(path.basename(td));
  });
  if(allDone){
    if(setCheck(dir, true)) console.log(`\n🎉 SUBJECT COMPLETO: ${folder.name} ✅`);
  }
}

/* ---------- reconciliar com o conteúdo publicado ---------- */
function sync(){
  const S = loadStructure();
  const published = loadPublished();
  let marked = 0, unmarked = 0, subjects = 0;
  for(const folder of S){
    const dir = findDir(SRC_ROOT, folder.name);
    if(!dir) continue;
    const pub = published[slugify(folder.name)] || {};
    let done = 0;
    for(const topic of folder.items){
      const tdir = findDir(dir, topic.name);
      if(!tdir) continue;
      const want = !!pub[slugify(topic.name)];
      if(want) done++;
      const changed = setCheck(tdir, want);
      if(changed) want ? marked++ : unmarked++;
    }
    const complete = done === folder.items.length && folder.items.length > 0;
    if(setCheck(dir, complete) && complete) subjects++;
  }
  console.log(`sync: ${marked} tópico(s) marcado(s), ${unmarked} desmarcado(s), ${subjects} subject(s) completo(s)`);
}

/* ---------- CLI ---------- */
const [cmd, a, b] = process.argv.slice(2);
if(cmd === 'status' || !cmd) report();
else if(cmd === 'mark') mark(a, b);
else if(cmd === 'sync') sync();
else {
  console.error('Uso: library1-progress.js [status | mark "<Subject>" "<Tópico>" | sync]');
  process.exit(1);
}
