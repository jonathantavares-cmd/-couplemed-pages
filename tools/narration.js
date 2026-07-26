#!/usr/bin/env node
/* CoupleMed — Gerador de narração (áudio + tabela de tempos) das Libraries
   ============================================================================
   Grava os áudios de leitura de cada tópico com as vozes padrão do site e sobe
   para o R2. Roda no Mac (usa o `say` do macOS, que é gratuito e local — ver
   LIBRARY1_ADD_CONTENT.md §17 para o porquê desta escolha).

   USO
     node tools/narration.js build lib1 <subject-slug> [topic-slug]
     node tools/narration.js build lib1 --all
     node tools/narration.js build lib3 <pdf-key|--all>
     node tools/narration.js upload [--only=lib1/...]     # manda o que foi gerado ao R2
     node tools/narration.js report                       # o que existe / o que falta
     node tools/narration.js voices                       # confere se as vozes estão instaladas

   POR QUE UM ÁUDIO POR FRASE E DEPOIS TUDO COLADO NUM SÓ ARQUIVO:
   o `say` não informa em que instante do áudio cada palavra é falada, e sem isso
   o destaque que acompanha a leitura seria adivinhação (o defeito que o narrador
   do navegador tem no Safari). Então gravo frase por frase, meço a duração exata
   de cada WAV, colo todas num único arquivo e salvo a tabela de tempos ao lado.
   O leitor então toca UM arquivo e sabe, ao milissegundo, qual frase destacar —
   e continua exato mesmo com o usuário mudando a velocidade ou arrastando a barra.

   SAÍDA (local, fora do git — ver .gitignore)
     .narration-build/<scope>/<lang>-<voiceId>.m4a    áudio completo do tópico
     .narration-build/<scope>/<lang>-<voiceId>.json   { duration, sentences:[{i,start,end,text}] }
   ============================================================================ */
'use strict';

const fs   = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const S    = require('../public/js/cm-narration-shared.js');

const ROOT     = path.join(__dirname, '..');
const BUILD    = path.join(ROOT, '.narration-build');
const TMP      = path.join(BUILD, '.tmp');
const RATE_HZ  = 22050;          // mono 16-bit: voz não ganha nada acima disso e o arquivo dobra
const SAY_WPM  = 180;            // ritmo de narração (o padrão do `say` é ~175)

/* ------------------------------------------------------------------ util --- */
const log  = (...a) => console.log(...a);
const die  = m => { console.error('ERRO: ' + m); process.exit(1); };
const ensureDir = d => fs.mkdirSync(d, { recursive: true });
const fmtDur = s => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;
const fmtMB  = b => (b/1048576).toFixed(1) + ' MB';

function requireMac(){
  if (process.platform !== 'darwin') die('só roda no macOS (usa o comando `say`).');
}

/* ---------------------------------------------------------------- WAV I/O ---
   Só preciso de duas coisas: quantos bytes de PCM o `say` produziu (para saber a
   duração da frase) e como colar vários PCMs num arquivo tocável. Fazer isso na
   mão evita depender de ffmpeg, que não vem no macOS. */
function readWavPcm(file){
  const buf = fs.readFileSync(file);
  if (buf.length < 44 || buf.toString('ascii',0,4) !== 'RIFF') throw new Error('WAV inválido: ' + file);
  let off = 12, fmt = null, data = null;
  while (off + 8 <= buf.length){
    const id = buf.toString('ascii', off, off+4);
    const sz = buf.readUInt32LE(off+4);
    const body = off + 8;
    if (id === 'fmt ') fmt = { channels: buf.readUInt16LE(body+2), sampleRate: buf.readUInt32LE(body+4), bits: buf.readUInt16LE(body+14) };
    else if (id === 'data') { data = buf.subarray(body, Math.min(body + sz, buf.length)); break; }
    off = body + sz + (sz % 2);
  }
  if (!fmt || !data) throw new Error('WAV sem fmt/data: ' + file);
  const bytesPerFrame = fmt.channels * (fmt.bits/8);
  return { pcm: data, fmt, seconds: data.length / (fmt.sampleRate * bytesPerFrame) };
}

function writeWav(file, pcmChunks, fmt){
  const dataLen = pcmChunks.reduce((n,c)=>n+c.length, 0);
  const bytesPerFrame = fmt.channels * (fmt.bits/8);
  const h = Buffer.alloc(44);
  h.write('RIFF',0,'ascii');  h.writeUInt32LE(36 + dataLen, 4);  h.write('WAVE',8,'ascii');
  h.write('fmt ',12,'ascii'); h.writeUInt32LE(16,16);            h.writeUInt16LE(1,20);
  h.writeUInt16LE(fmt.channels,22);   h.writeUInt32LE(fmt.sampleRate,24);
  h.writeUInt32LE(fmt.sampleRate*bytesPerFrame,28); h.writeUInt16LE(bytesPerFrame,32);
  h.writeUInt16LE(fmt.bits,34);       h.write('data',36,'ascii'); h.writeUInt32LE(dataLen,40);
  fs.writeFileSync(file, Buffer.concat([h, ...pcmChunks]));
}

/* Silêncio curto entre frases: sem ele a narração fica atropelada e o destaque
   troca de frase no instante exato em que a próxima começa, sem respiro visual. */
function silence(seconds, fmt){
  return Buffer.alloc(Math.round(seconds * fmt.sampleRate) * fmt.channels * (fmt.bits/8));
}

/* ------------------------------------------------------------ geração ------ */
function sayToWav(voiceSayName, text, outFile){
  execFileSync('say', ['-v', voiceSayName, '-r', String(SAY_WPM),
                       '--file-format=WAVE', `--data-format=LEI16@${RATE_HZ}`,
                       '-o', outFile, text],
               { stdio: ['ignore','ignore','pipe'], maxBuffer: 1<<22 });
}

function toM4a(wavFile, m4aFile){
  // AAC 48 kbps mono: voz fica limpa e 13 min dão ~3 MB. `afconvert` vem no macOS.
  execFileSync('afconvert', ['-f','m4af','-d','aac','-b','48000', wavFile, m4aFile],
               { stdio: ['ignore','ignore','pipe'] });
}

/* Gera UMA combinação (escopo + idioma + voz). Devolve o resumo ou null se já existia. */
function buildOne(scopeKey, lang, voice, sentences, opts){
  const outDir  = path.join(BUILD, scopeKey);
  const m4aPath = path.join(outDir, `${lang}-${voice.id}.m4a`);
  const jsonPath= path.join(outDir, `${lang}-${voice.id}.json`);

  if (!opts.force && fs.existsSync(m4aPath) && fs.existsSync(jsonPath)){
    return { skipped: true, m4aPath, jsonPath };
  }
  ensureDir(outDir); ensureDir(TMP);

  const pcms = [], table = [];
  let fmt = null, cursor = 0;
  const gap = 0.28;                       // pausa entre frases, em segundos

  sentences.forEach((text, i) => {
    const spoken = S.speakable(text, lang);
    if (!spoken) return;
    const wav = path.join(TMP, `s${i}.wav`);
    sayToWav(voice.say, spoken, wav);
    const { pcm, fmt: f, seconds } = readWavPcm(wav);
    fmt = fmt || f;
    pcms.push(pcm);
    table.push({ i: table.length, start: +cursor.toFixed(3), end: +(cursor+seconds).toFixed(3), text });
    cursor += seconds;
    if (i < sentences.length - 1){ pcms.push(silence(gap, fmt)); cursor += gap; }
    fs.unlinkSync(wav);
  });

  if (!table.length) return null;

  const joined = path.join(TMP, 'joined.wav');
  writeWav(joined, pcms, fmt);
  toM4a(joined, m4aPath);
  fs.unlinkSync(joined);

  fs.writeFileSync(jsonPath, JSON.stringify({
    v: 1, scope: scopeKey, lang, voice: voice.id, voiceLabel: voice.label,
    engine: 'macos-say', wpm: SAY_WPM, gap,
    duration: +cursor.toFixed(3), sentences: table
  }));

  return { duration: cursor, count: table.length, bytes: fs.statSync(m4aPath).size, m4aPath, jsonPath };
}

/* ------------------------------------------------------ fonte: Library 1 ---- */
function loadLib1Subject(subjectSlug){
  const file = path.join(ROOT, 'public/js/library1-content', subjectSlug + '.js');
  if (!fs.existsSync(file)) die(`conteúdo não encontrado: ${path.relative(ROOT,file)}`);
  global.window = global.window || {};
  require(file);
  const all = global.window.LIBRARY1_CONTENT || {};
  if (!all[subjectSlug]) die(`o arquivo existe mas não registrou LIBRARY1_CONTENT['${subjectSlug}']`);
  return all[subjectSlug];
}

function lib1Subjects(){
  const dir = path.join(ROOT, 'public/js/library1-content');
  return fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('_')).map(f => f.slice(0,-3));
}

function buildLib1(subjectSlug, topicSlug, opts){
  const subject = loadLib1Subject(subjectSlug);
  const topics = topicSlug ? (subject[topicSlug] ? [[topicSlug, subject[topicSlug]]] : die(`tópico '${topicSlug}' não existe em ${subjectSlug}`))
                           : Object.entries(subject);
  let totalDur = 0, totalBytes = 0, made = 0, skipped = 0;

  for (const [slug, topic] of topics){
    const scopeKey = `lib1/${subjectSlug}/${slug}`;
    log(`\n▸ ${scopeKey}`);
    for (const lang of ['en','pt']){
      const html = topic[lang] && topic[lang].html;
      if (!html){ log(`   ${lang}: sem conteúdo, pulando`); continue; }
      const sentences = S.blocksFromHtml(html);
      for (const voice of S.voicesFor(lang)){
        const t0 = Date.now();
        const r = buildOne(scopeKey, lang, voice, sentences, opts);
        if (!r){ log(`   ${lang}/${voice.id}: nada a narrar`); continue; }
        if (r.skipped){ skipped++; log(`   ${lang}/${voice.id}: já existe (use --force para regravar)`); continue; }
        made++; totalDur += r.duration; totalBytes += r.bytes;
        log(`   ${lang}/${voice.id.padEnd(9)} ${String(r.count).padStart(4)} frases  ${fmtDur(r.duration).padStart(6)}  ${fmtMB(r.bytes).padStart(8)}  (${((Date.now()-t0)/1000).toFixed(1)}s)`);
      }
    }
  }
  log(`\n${made} áudio(s) gravado(s), ${skipped} já existia(m) · ${fmtDur(totalDur)} de narração · ${fmtMB(totalBytes)}`);
  if (made) log(`Agora suba para o R2:  node tools/narration.js upload`);
}

/* ------------------------------------------------------ fonte: Library 3 ----
   PDF: o texto vem do próprio arquivo via pdftotext (poppler) se existir, ou do
   PDF.js vendorizado. Library 3 é só inglês — o material é só em inglês. */
function buildLib3(pdfKey, opts){
  die('Library 3 ainda não implementada nesta versão — ver LIBRARY1_ADD_CONTENT.md §17.6.\n' +
      '     A Library 1 já funciona: node tools/narration.js build lib1 <subject> [topic]');
}

/* ----------------------------------------------------------------- upload --- */
async function upload(only){
  const secret = process.env.NARRATION_ADMIN_SECRET || process.env.LIB1_ADMIN_SECRET;
  const base   = process.env.LIB1_BASE_URL || 'https://couplemed.pages.dev';
  if (!secret) die('falta NARRATION_ADMIN_SECRET (ou LIB1_ADMIN_SECRET) no ambiente.\n' +
                   '     wrangler secret put NARRATION_ADMIN_SECRET  e exporte o mesmo valor aqui.');
  if (!fs.existsSync(BUILD)) die('nada gerado ainda — rode `build` primeiro.');

  const files = [];
  (function walk(dir){
    for (const e of fs.readdirSync(dir, { withFileTypes:true })){
      if (e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(m4a|json)$/.test(e.name)) files.push(p);
    }
  })(BUILD);

  const picked = files.filter(f => !only || path.relative(BUILD,f).startsWith(only));
  if (!picked.length) die('nenhum arquivo gerado corresponde ao filtro.');
  log(`Enviando ${picked.length} arquivo(s) para ${base} …`);

  let ok = 0, fail = 0;
  for (const f of picked){
    const rel = path.relative(BUILD, f).split(path.sep).join('/');
    const key = 'narration/' + rel;
    const type = f.endsWith('.m4a') ? 'audio/mp4' : 'application/json';
    try{
      const res = await fetch(`${base}/api/narration/admin/put?key=${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': type, 'X-Admin-Secret': secret },
        body: fs.readFileSync(f)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0,120)}`);
      ok++; log(`  ✓ ${key}`);
    }catch(err){ fail++; log(`  ✗ ${key} — ${err.message}`); }
  }
  log(`\n${ok} enviado(s), ${fail} falha(s).`);
  if (fail) process.exitCode = 1;
}

/* ----------------------------------------------------------------- report --- */
function report(){
  log('VOZES PADRÃO DO SITE\n');
  for (const lang of ['en','pt']){
    log(`  ${lang === 'en' ? 'Inglês    ' : 'Português '} ${S.voicesFor(lang).map(v=>`${v.label}(${v.gender})`).join('  ')}`);
  }

  log('\nÁUDIOS GERADOS LOCALMENTE');
  if (!fs.existsSync(BUILD)){ log('  (nenhum — rode `build`)'); }
  else {
    let n = 0, bytes = 0, dur = 0;
    (function walk(dir){
      for (const e of fs.readdirSync(dir, { withFileTypes:true })){
        if (e.name.startsWith('.')) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.m4a')){ n++; bytes += fs.statSync(p).size; }
        else if (e.name.endsWith('.json')){
          try{ dur += JSON.parse(fs.readFileSync(p,'utf8')).duration || 0; }catch(e){}
        }
      }
    })(BUILD);
    log(`  ${n} arquivo(s) · ${fmtDur(dur)} de narração · ${fmtMB(bytes)}`);
  }

  log('\nCOBERTURA DA LIBRARY 1');
  for (const subjectSlug of lib1Subjects()){
    const subject = loadLib1Subject(subjectSlug);
    const topics = Object.keys(subject);
    let done = 0, expected = 0;
    for (const slug of topics){
      for (const lang of ['en','pt']){
        if (!(subject[slug][lang] && subject[slug][lang].html)) continue;
        for (const v of S.voicesFor(lang)){
          expected++;
          if (fs.existsSync(path.join(BUILD, `lib1/${subjectSlug}/${slug}`, `${lang}-${v.id}.m4a`))) done++;
        }
      }
    }
    log(`  ${subjectSlug}: ${topics.length} tópico(s) · ${done}/${expected} áudio(s)`);
  }
}

/* ----------------------------------------------------------------- voices --- */
function voices(){
  requireMac();
  const installed = execSync("say -v '?'", { encoding:'utf8' });
  let missing = 0;
  log('Vozes exigidas pelo site (ver cm-narration-shared.js):\n');
  for (const lang of ['en','pt']){
    for (const v of S.voicesFor(lang)){
      const ok = installed.split('\n').some(l => l.trim().startsWith(v.say));
      if (!ok) missing++;
      log(`  ${ok ? 'OK   ' : 'FALTA'}  ${lang}  ${v.label.padEnd(10)} ${v.say}`);
    }
  }
  if (missing){
    log('\nBaixe as que faltam em: Ajustes do Sistema → Acessibilidade → Conteúdo Falado');
    log('→ Voz do Sistema → (escolha o idioma) → baixar a variante Aprimorada/Premium.');
    process.exitCode = 1;
  } else log('\nTodas instaladas.');
}

/* -------------------------------------------------------------------- CLI --- */
function main(){
  const [cmd, ...rest] = process.argv.slice(2);
  const opts = { force: rest.includes('--force') };
  const args = rest.filter(a => !a.startsWith('--'));

  switch (cmd){
    case 'build': {
      requireMac();
      const which = args[0];
      if (which === 'lib1'){
        if (rest.includes('--all')) { for (const s of lib1Subjects()) buildLib1(s, null, opts); }
        else if (args[1]) buildLib1(args[1], args[2] || null, opts);
        else die('uso: build lib1 <subject-slug> [topic-slug]   ou   build lib1 --all');
      } else if (which === 'lib3'){ buildLib3(args[1], opts); }
      else die('uso: build lib1|lib3 …');
      break;
    }
    case 'upload': {
      const only = (rest.find(a => a.startsWith('--only=')) || '').slice(7) || null;
      upload(only);
      break;
    }
    case 'report':  report(); break;
    case 'voices':  voices(); break;
    default:
      log(fs.readFileSync(__filename,'utf8').split('*/')[0].split('USO')[1].split('POR QUE')[0].trim());
  }
}

main();
