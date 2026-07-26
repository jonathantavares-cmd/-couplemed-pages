#!/usr/bin/env node
/* CoupleMed — Library 1: guarda contra "alterei o arquivo e esqueci de subir a versão"
   ============================================================================
   O leitor e o CSS são servidos com `?v=N` para furar o cache do navegador. Se o
   arquivo muda e o N não muda, o navegador continua servindo a versão velha — e o
   sintoma é cruel: o código está certo no repositório, os testes passam, e nada
   muda na tela do usuário. Isso já aconteceu DUAS vezes:

     1. o CSS do visualizador foi publicado como v=2 já quebrado, e o v=2 anterior
        (bom) ficou em cache — a imagem abria em tamanho natural;
     2. as figuras do Create Test entraram no JS/CSS sem subir v= — as imagens
        simplesmente não apareciam nas questões.

   Este script grava o hash de cada arquivo versionado ao lado da versão publicada
   (em tools/.cache-versions.json) e reclama quando o conteúdo mudou sem o v= mudar.

   Uso:
     node tools/library1-cachecheck.js          # verifica (sai 1 se houver pendência)
     node tools/library1-cachecheck.js --accept # grava o estado atual como o correto
                                                # (use DEPOIS de subir o v=)
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = path.resolve(__dirname, '..');
const STATE = path.join(__dirname, '.cache-versions.json');

/* onde cada versão é declarada */
const TARGETS = [
  { file: 'public/js/library1-reader.js',
    declaredIn: 'public/app.html',
    re: /library1-reader\.js\?v=(\d+)/ },
  { file: 'public/css/library1-reader.css',
    declaredIn: 'public/js/library1-reader.js',
    re: /library1-reader\.css\?v=(\d+)/ }
];

const sha = p => crypto.createHash('sha1')
  .update(fs.readFileSync(path.join(REPO, p))).digest('hex').slice(0, 12);

const readVersion = (declaredIn, re) => {
  const m = fs.readFileSync(path.join(REPO, declaredIn), 'utf8').match(re);
  return m ? m[1] : null;
};

const prev = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const accept = process.argv.includes('--accept');
const now = {};
let stale = 0;

for(const t of TARGETS){
  const hash = sha(t.file);
  const version = readVersion(t.declaredIn, t.re);
  now[t.file] = { hash, version };
  if(version == null){
    console.log(`  ❌ ${t.file}: não achei o \`?v=\` em ${t.declaredIn}`);
    stale++; continue;
  }
  const old = prev[t.file];
  if(!old){
    console.log(`  •  ${t.file}: v=${version} (primeiro registro)`);
    continue;
  }
  const changed = old.hash !== hash;
  const bumped  = old.version !== version;
  if(changed && !bumped){
    console.log(`  ❌ ${t.file}: CONTEÚDO MUDOU mas continua v=${version}`);
    console.log(`     → suba a versão em ${t.declaredIn} (o navegador vai servir o arquivo velho)`);
    stale++;
  } else if(changed && bumped){
    console.log(`  ✅ ${t.file}: mudou e a versão subiu (v=${old.version} → v=${version})`);
  } else if(!changed && bumped){
    console.log(`  •  ${t.file}: versão subiu sem o arquivo mudar (v=${version}) — inofensivo`);
  } else {
    console.log(`  ✅ ${t.file}: sem alteração (v=${version})`);
  }
}

if(accept){
  fs.writeFileSync(STATE, JSON.stringify(now, null, 2) + '\n');
  console.log('\nEstado atual gravado como referência.');
  process.exit(0);
}

if(stale){
  console.log(`\n❌ ${stale} arquivo(s) publicado(s) com versão de cache velha.`);
  console.log('   Suba o `?v=` e rode de novo com --accept.');
  process.exit(1);
}
console.log('\n✅ versões de cache coerentes com o conteúdo.');
