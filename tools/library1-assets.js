#!/usr/bin/env node
/* CoupleMed — Library 1: pipeline de mídia (recorte + WebP + upload R2)
   ============================================================================
   Converte os prints de imagem/figura/tabela de um tópico para WebP e, quando
   o R2 estiver ligado, envia para o bucket.

   POR QUE WebP: o 1º tópico incluído gerou 2,5 MB em JPEG/PNG. Na mesma
   proporção, 1.838 tópicos passariam de 4 GB — inviável num repositório git.
   Em WebP o mesmo material cai 63% (0,92 MB/tópico ≈ 1,6 GB no total), o que
   já torna viável manter no git por boa parte do caminho, e reduz banda e
   tempo de carregamento quando a mídia migrar para o R2.

   Escolha de formato por arquivo (o menor vence, medido de verdade):
     - fotos e diagramas  -> WebP com perdas (q82) — ~60-70% menor que JPEG q92
     - tabelas (texto)    -> WebP sem perdas      — texto nítido E menor que PNG

   Uso:
     node tools/library1-assets.js build "<Subject>" "<Tópico>"
         Lê os PNGs originais na pasta do Desktop, recorta a borda branca,
         converte e grava em public/assets/library1/<subject>/<topic>/.
         Requer um mapa de nomes (ver --map abaixo).

     node tools/library1-assets.js convert <dir>
         Converte para WebP tudo que já está em <dir> (jpg/png) e apaga o
         original. Usado para migrar mídia já publicada.

     node tools/library1-assets.js report
         Mostra quanto a mídia da Library 1 está pesando e a projeção para os
         1.838 tópicos — é o número que decide quando migrar para o R2.

     node tools/library1-assets.js upload [<subject>[/<topic>]]
         Envia para o R2 via endpoint admin do worker. Exige as variáveis
         LIB1_ADMIN_SECRET e (opcional) LIB1_BASE_URL.
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const ASSETS = path.join(REPO, 'public/assets/library1');
const TOPICS_TOTAL = 1838;

const slugify = s => String(s || '').toLowerCase()
  .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* ---------- conversão via Pillow (já instalado neste ambiente) ---------- */
const PY_CONVERT = `
import sys, os, json
from PIL import Image, ImageChops

def trim(im, tol=8):
    bg = Image.new(im.mode, im.size, (255,255,255))
    diff = ImageChops.difference(im, bg).convert("L").point(lambda p: 255 if p > tol else 0)
    box = diff.getbbox()
    return im.crop(box) if box else im

def convert(src, dst, do_trim=True):
    im = Image.open(src).convert("RGB")
    if do_trim: im = trim(im)
    lossy, lossless = dst + ".q.webp", dst + ".l.webp"
    im.save(lossy, "WEBP", quality=82, method=6)
    im.save(lossless, "WEBP", lossless=True, method=6)
    a, b = os.path.getsize(lossy), os.path.getsize(lossless)
    keep, drop = (lossy, lossless) if a <= b else (lossless, lossy)
    os.replace(keep, dst); os.remove(drop)
    return {"w": im.width, "h": im.height, "bytes": os.path.getsize(dst),
            "mode": "lossy" if a <= b else "lossless"}

jobs = json.load(sys.stdin)
out = []
for j in jobs:
    out.append({"dst": j["dst"], **convert(j["src"], j["dst"], j.get("trim", True))})
print(json.dumps(out))
`;

function convertFiles(jobs){
  if(!jobs.length) return [];
  const res = execFileSync('python3', ['-c', PY_CONVERT], {
    input: JSON.stringify(jobs), maxBuffer: 64 * 1024 * 1024
  }).toString();
  return JSON.parse(res);
}

/* ---------- converter uma pasta já publicada ---------- */
function convertDir(dir){
  if(!fs.existsSync(dir)){ console.error(`Pasta não encontrada: ${dir}`); process.exit(1); }
  const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f));
  if(!files.length){ console.log('Nada para converter (já está tudo em WebP?)'); return; }
  const jobs = files.map(f => ({
    src: path.join(dir, f),
    dst: path.join(dir, f.replace(/\.(jpe?g|png)$/i, '.webp')),
    trim: false   // já recortado quando foi publicado
  }));
  const before = files.reduce((a,f) => a + fs.statSync(path.join(dir,f)).size, 0);
  const out = convertFiles(jobs);
  files.forEach(f => fs.unlinkSync(path.join(dir, f)));
  const after = out.reduce((a,o) => a + o.bytes, 0);
  out.forEach(o => console.log(`  ${path.basename(o.dst).padEnd(20)} ${(o.bytes/1024).toFixed(0).padStart(5)} KB  (${o.mode})`));
  console.log(`\n${files.length} arquivo(s): ${(before/1024/1024).toFixed(2)} MB -> ${(after/1024/1024).toFixed(2)} MB  (${(100-100*after/before).toFixed(0)}% menor)`);
}

/* ---------- relatório de peso ---------- */
function walk(dir){
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap(n => {
    const p = path.join(dir, n);
    return fs.statSync(p).isDirectory() ? walk(p) : [p];
  });
}
function report(){
  const files = walk(ASSETS).filter(f => !f.endsWith('.DS_Store'));
  const bytes = files.reduce((a,f) => a + fs.statSync(f).size, 0);
  const topics = new Set(files.map(f => path.dirname(f))).size;
  const byExt = {};
  files.forEach(f => { const e = path.extname(f).toLowerCase(); byExt[e] = (byExt[e]||0) + fs.statSync(f).size; });

  console.log(`Arquivos            : ${files.length}`);
  console.log(`Tópicos com mídia   : ${topics}`);
  console.log(`Peso atual          : ${(bytes/1024/1024).toFixed(2)} MB`);
  Object.entries(byExt).sort((a,b)=>b[1]-a[1]).forEach(([e,b]) =>
    console.log(`   ${e.padEnd(6)}          ${(b/1024/1024).toFixed(2)} MB`));
  if(topics){
    const perTopic = bytes / topics;
    const projected = perTopic * TOPICS_TOTAL;
    console.log(`\nMédia por tópico    : ${(perTopic/1024/1024).toFixed(2)} MB`);
    console.log(`Projeção ${TOPICS_TOTAL} tópicos: ${(projected/1024**3).toFixed(2)} GB`);
    const limitGb = 1;
    const maxTopics = Math.floor(limitGb * 1024**3 / perTopic);
    console.log(`\nNo git cabem ~${maxTopics} tópicos antes de passar de ${limitGb} GB`);
    console.log(projected > limitGb * 1024**3
      ? `→ acima de ~${maxTopics} tópicos, migrar a mídia para o R2 (ver §5.1 do LIBRARY1_ADD_CONTENT.md)`
      : `→ dentro do limite; ainda não é preciso migrar para o R2`);
  }
}

/* ---------- upload para o R2 (endpoint admin do worker) ---------- */
async function upload(filter){
  const secret = process.env.LIB1_ADMIN_SECRET;
  const base = process.env.LIB1_BASE_URL || 'https://couplemed.pages.dev';
  if(!secret){
    console.error('Falta LIB1_ADMIN_SECRET no ambiente.');
    console.error('Configure o segredo no worker (wrangler secret put LIB1_ADMIN_SECRET) e exporte o mesmo valor aqui.');
    process.exit(1);
  }
  let files = walk(ASSETS).filter(f => !f.endsWith('.DS_Store'));
  if(filter) files = files.filter(f => path.relative(ASSETS, f).startsWith(filter));
  if(!files.length){ console.log('Nada a enviar.'); return; }

  let sent = 0, failed = 0;
  for(const f of files){
    const key = 'lib1/' + path.relative(ASSETS, f).split(path.sep).join('/');
    const body = fs.readFileSync(f);
    const type = f.endsWith('.webp') ? 'image/webp' : f.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const res = await fetch(`${base}/api/library1/admin/put?key=${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'X-Admin-Secret': secret, 'Content-Type': type },
      body
    });
    if(res.ok){ sent++; process.stdout.write('.'); }
    else { failed++; console.error(`\n  ✗ ${key}: ${res.status} ${await res.text()}`); }
  }
  console.log(`\n${sent} enviado(s), ${failed} falha(s).`);
}

/* ---------- CLI ---------- */
const [cmd, a] = process.argv.slice(2);
if(cmd === 'report' || !cmd) report();
else if(cmd === 'convert') convertDir(path.resolve(a || '.'));
else if(cmd === 'upload') upload(a).catch(e => { console.error(e); process.exit(1); });
else {
  console.error('Uso: library1-assets.js [report | convert <dir> | upload [<subject>/<topic>]]');
  process.exit(1);
}
