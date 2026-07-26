/* CoupleMed — extração de texto de PDF em ORDEM DE LEITURA (para narrar)
   ============================================================================
   Usado por tools/narration.js para gerar a narração da Library 3. Roda o MESMO
   PDF.js vendorizado que o leitor usa (public/vendor/pdfjs/), então o texto que
   sai daqui é o mesmo que o navegador vê — o que importa, porque o destaque no
   leitor é casado com estas frases.

   TRÊS PROBLEMAS QUE O TEXTO CRU TEM, E QUE SÓ APARECEM QUANDO SE OUVE
   ---------------------------------------------------------------------------
   1) ORDEM. `getTextContent()` devolve os fragmentos na ordem em que o PDF os
      declara, não na ordem de leitura. Medi o First Aid: ele NÃO é diagramado em
      duas colunas independentes (a maior faixa vertical vazia numa página é ~30px,
      que é o vão da tabela, não um gutter de coluna) — o layout é uma TABELA de
      rótulo | conteúdo. Por isso a ordenação certa aqui é **linha a linha** (y
      decrescente) e, dentro da linha, da esquerda para a direita. Ler "a coluna
      inteira primeiro", que seria o certo num artigo de duas colunas, produziria
      "MECHANISM CLINICAL USE ADVERSE EFFECTS" seguido de todo o conteúdo solto —
      exatamente o contrário do que se quer ouvir.

   2) GLIFOS. O First Aid usa fontes de ícone e ligaduras que saem como letras
      soltas. Sem tradução, a narração lê "de cifrão ciency" e "q risco":
        q → ↑ (increased)      $ → ligadura "fi"     ` → enfeite do cabeçalho
        r → ↓ (decreased)      % → ligadura "fl"
        p → → (leads to)       ! → ligadura "ff"
      O mapa só é aplicado a itens que estão numa fonte de SÍMBOLO — senão um "$"
      de verdade (cifrão) viraria "fi". As fontes de símbolo são detectadas por
      página, não pelo nome: o PDF.js nomeia fontes por documento (`g_d0_f2`), e
      esse nome muda de arquivo para arquivo.

   3) MOLDURA. Cabeçalho ("SECTION III · PSYCHIATRY · PHARMACOLOGY"), número de
      página e rodapé de arquivo ("FAS1_2025_13-Psych.indd", "12/19/24") se repetem
      em toda página. Narrados, viram um ruído a cada virada. São descartados por
      posição (faixas no topo e no pé) e por repetição entre páginas.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../..');
const VENDOR = path.join(REPO, 'public/vendor/pdfjs');

/* O PDF.js espera APIs de navegador. Para extrair TEXTO basta compor matrizes —
   nada é rasterizado —, então um DOMMatrix mínimo evita a dependência pesada de
   @napi-rs/canvas só para ler texto. */
function installBrowserShims(){
  if (globalThis.DOMMatrix) return;
  class DOMMatrixLite {
    constructor(init){
      if (Array.isArray(init)) [this.a,this.b,this.c,this.d,this.e,this.f] = init;
      else { this.a=1; this.b=0; this.c=0; this.d=1; this.e=0; this.f=0; }
    }
    multiply(o){
      return new DOMMatrixLite([
        this.a*o.a + this.c*o.b, this.b*o.a + this.d*o.b,
        this.a*o.c + this.c*o.d, this.b*o.c + this.d*o.d,
        this.a*o.e + this.c*o.f + this.e, this.b*o.e + this.d*o.f + this.f
      ]);
    }
    translate(x=0, y=0){ return this.multiply(new DOMMatrixLite([1,0,0,1,x,y])); }
    scale(x=1, y=x){ return this.multiply(new DOMMatrixLite([x,0,0,y,0,0])); }
    invertSelf(){ return this; }
    transformPoint(p){ return { x: this.a*p.x + this.c*p.y + this.e, y: this.b*p.x + this.d*p.y + this.f }; }
  }
  globalThis.DOMMatrix = DOMMatrixLite;
  globalThis.Path2D = class { constructor(){} addPath(){} };
}

let pdfjsPromise = null;
function loadPdfjs(){
  if (pdfjsPromise) return pdfjsPromise;
  installBrowserShims();
  pdfjsPromise = import(path.join(VENDOR, 'pdf.min.mjs')).then(lib => {
    // o arquivo vendorizado é o `.min.mjs`; sem apontar, o PDF.js procura `pdf.worker.mjs`
    lib.GlobalWorkerOptions.workerSrc = path.join(VENDOR, 'pdf.worker.min.mjs');
    return lib;
  });
  return pdfjsPromise;
}

/* Glifos do First Aid. Só valem dentro de fonte de símbolo (ver classifyFonts).
   As SETAS são estáveis entre arquivos; as LIGADURAS não são — medido: o mesmo
   caractere "!" sai como "ff" no PDF de psiquiatria ("Korsako!" = Korsakoff) e
   como "fi" no de bioquímica ("el!n" = elfin). O PDF não expõe qual é qual, então
   a escolha é feita depois, por palavra (ver resolveLigatures). */
const GLYPHS = {
  'q': ' increased ',      // ↑
  'r': ' decreased ',      // ↓
  'p': ' leads to ',       // →
  '`': ' ',                // separador decorativo do cabeçalho
  '#': ' '                 // espaço fino que a fonte de ícones insere depois da seta
};

/* Marcador temporário para "aqui havia uma ligadura desconhecida". */
const LIG = '\u0001';
const LIG_CHARS = new Set(['$', '%', '!', '&', "'"]);

/* Palavras com ligadura que aparecem de fato em texto médico. A lista existe para
   decidir ENTRE as candidatas (fi/fl/ff/ffi/ffl) — não para corrigir ortografia.
   Fora dela, "fi" é o palpite padrão: é a ligadura mais comum em inglês médico
   (deficiency, specific, classification, fibrosis…). */
const LIG_WORDS = [
  'fi','fl','ff','ffi','ffl'
];
const LIG_KNOWN = new Set([
  'deficiency','deficient','deficits','deficit','specific','specifically','specificity',
  'identify','identified','identification','classification','classified','fibrosis','fibrous',
  'fibrillation','fibrin','fibroblast','confirm','confirmed','first','five','filament','filtration',
  'filter','final','finding','findings','fine','finger','fingers','fixed','fission','profile',
  'benefit','benefits','defined','define','definitive','elfin','magnification','significant',
  'significantly','insufficiency','artificial','superficial','calcification','ossification',
  'inflammation','inflammatory','reflux','reflex','reflexes','influenza','influx','flow','fluid',
  'fluids','flare','flaccid','fluorescence','fluoroquinolone','fluoxetine','trifluoperazine',
  'fluphenazine','conflict','afflicted','effect','effects','effective','affect','affected','affects',
  'different','differentiation','differential','differences','diffuse','diffusion','sufficient',
  'suffer','suffering','efficacy','efficiency','offspring','stiffness','korsakoff','staffing',
  'affinity','afferent','efferent','buffer','diffusely'
]);

/* Troca cada marcador de ligadura pela candidata que produz uma palavra conhecida.
   Roda sobre o texto já montado, porque a decisão depende da palavra inteira — e a
   palavra pode ter sido partida em vários fragmentos pelo PDF. */
function resolveLigatures(text){
  if (text.indexOf(LIG) < 0) return text;
  return text.replace(/[A-Za-zÀ-ÿ\u0001-]*\u0001[A-Za-zÀ-ÿ\u0001-]*/g, token => {
    for (const cand of LIG_WORDS){
      const tryWord = token.split(LIG).join(cand);
      if (LIG_KNOWN.has(tryWord.toLowerCase().replace(/[^a-zà-ÿ]/g,''))) return tryWord;
    }
    // Fora do dicionário, decide pelo som: "fl" só ocorre antes de vogal
    // (fluvoxamine, inflammation) e "ff" entre vogais (different, Korsakoff).
    // Sem isto, "fl uvoxamine" virava "fiuvoxamine".
    const at = token.indexOf(LIG);
    const prev = (token[at - 1] || '').toLowerCase();
    const next = (token[at + 1] || '').toLowerCase();
    let guess = 'fi';
    if (/[uoa]/.test(next) && !/[aeiou]/.test(prev)) guess = 'fl';
    else if (/[aeiou]/.test(prev) && (next === '' || /[aeiou]/.test(next))) guess = 'ff';
    return token.split(LIG).join(guess);
  });
}

/* Uma fonte é "de texto" quando produz palavras de verdade. Tudo o mais (ícones,
   ligaduras avulsas, numeração decorativa) é tratado como símbolo. */
function classifyFonts(items){
  const stat = {};
  for (const it of items){
    const s = (it.str || '').trim();
    if (!s) continue;
    const f = it.fontName || '?';
    stat[f] = stat[f] || { long: 0, total: 0 };
    stat[f].total++;
    if (s.length >= 4 && /[a-zA-Z]{3}/.test(s)) stat[f].long++;
  }
  const textFonts = new Set();
  for (const [f, d] of Object.entries(stat)){
    // basta um punhado de fragmentos com palavras para a fonte ser de texto
    if (d.long >= 2 || (d.long === 1 && d.total <= 3)) textFonts.add(f);
  }
  return textFonts;
}

function applyGlyphs(str, isSymbolFont){
  if (!isSymbolFont) return str;
  let out = '';
  for (const ch of str){
    if (ch in GLYPHS) out += GLYPHS[ch];
    else if (LIG_CHARS.has(ch)) out += LIG;      // decidido depois, por palavra
    else out += ch;
  }
  return out;
}

/* Junta os fragmentos de uma linha respeitando o espaçamento real: o PDF quebra
   a linha em pedaços por mudança de fonte/estilo, e colar tudo direto gruda
   palavras ("comaThiamine"). A régua é a distância entre o fim de um pedaço e o
   começo do próximo. */
function joinLine(parts){
  let out = '';
  let prevEnd = null;
  for (const p of parts){
    const s = p.text;
    if (!s) continue;
    if (out === ''){ out = s; prevEnd = p.x + p.w; continue; }
    const gap = p.x - (prevEnd == null ? p.x : prevEnd);
    const needsSpace = gap > Math.max(1.2, p.h * 0.18);
    const endsOpen = /[\s(\[“"'\-–—]$/.test(out);
    const startsClosed = /^[\s.,;:!?)\]”"']/.test(s);
    out += (needsSpace && !endsOpen && !startsClosed) ? ' ' + s : s;
    prevEnd = p.x + p.w;
  }
  return out;
}

/* Uma página vira linhas: agrupa por y (com tolerância proporcional à altura da
   letra, senão sobrescrito/subscrito viram linha própria) e ordena da esquerda
   para a direita dentro de cada linha. */
function toParts(items, textFonts, height){
  const parts = [];
  const topBand = height ? height * 0.90 : Infinity;
  const bottomBand = height ? height * 0.07 : -Infinity;
  for (const it of items){
    const raw = it.str;
    if (!raw || !raw.trim()) continue;
    const y = it.transform[5];
    // moldura fora já aqui: cabeçalho e rodapé têm x próprio e envenenariam a
    // detecção de colunas (foi o que fez a tabela não ser reconhecida na 1ª versão)
    if (y >= topBand || y <= bottomBand) continue;
    const isSym = !textFonts.has(it.fontName);
    const text = applyGlyphs(raw, isSym);
    if (!text.trim()) continue;
    parts.push({ text, x: it.transform[4], y,
                 w: it.width || 0, h: it.height || Math.abs(it.transform[3]) || 10 });
  }
  return parts;
}

function groupIntoLines(parts){
  const sorted = parts.slice().sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const p of sorted){
    const last = lines[lines.length - 1];
    // mesma linha se a base está dentro de ~55% da altura da letra
    if (last && Math.abs(last.y - p.y) <= Math.max(3, p.h * 0.55)){
      last.parts.push(p);
      last.y = (last.y * (last.parts.length - 1) + p.y) / last.parts.length;
      last.minX = Math.min(last.minX, p.x);
      last.maxX = Math.max(last.maxX, p.x + p.w);
    } else {
      lines.push({ y: p.y, minX: p.x, maxX: p.x + p.w, parts: [p] });
    }
  }
  for (const l of lines){
    l.parts.sort((a, b) => a.x - b.x);
    l.text = joinLine(l.parts).replace(/\s+/g, ' ').trim();
  }
  return lines.filter(l => l.text);
}

/* Uma página vira linhas em ordem de leitura. */
function itemsToLines(items, textFonts, height){
  const parts = toParts(items, textFonts, height);
  const cols = detectColumns(parts);
  const lines = cols ? orderTableLines(parts, cols.bounds) : groupIntoLines(parts);
  return { lines, table: !!cols };
}

/* ---------------------------------------------------------- tabela ---------
   O First Aid é diagramado como tabela: rótulo à esquerda, conteúdo à direita.

   A armadilha aqui — que custou uma depuração inteira — é que rótulo e conteúdo
   dividem a MESMA linha física. "MECHANISM" (x=74) e "Affects neurotransmission…"
   (x=182) têm o mesmo y, então agrupar por y funde as duas colunas numa linha só
   antes de qualquer chance de separá-las. Enquanto o rótulo cabe numa linha isso
   passa despercebido; quando ele ocupa duas, o conteúdo entra no meio dele:

     "Selective serotonin      Fluoxetine, fluvoxamine, paroxetine…
      reuptake inhibitors"
        ↓ agrupado por y vira ↓
     "Selective serotonin Fluoxetine, fluvoxamine… reuptake inhibitors"

   Por isso a separação em colunas acontece nos ITENS, antes de formar linha. Cada
   coluna vira linhas por conta própria; depois os rótulos são agrupados em blocos
   (linhas vizinhas, espaçamento de uma linha) e cada bloco leva junto o conteúdo
   que está na faixa vertical dele. Assim o rótulo é lido inteiro e só então o que
   ele rotula — que é como uma pessoa lê a tabela. */
/* Rede de segurança da detecção de colunas: quando não há vão vazio nítido
   (linhas longas de uma coluna encostam na outra), o recuo ainda denuncia a
   tabela — a maioria das linhas começa em duas posições bem distintas. */
function detectByModes(parts){
  const freq = {};
  for (const p of parts){ const b = Math.round(p.x / 8) * 8; freq[b] = (freq[b] || 0) + 1; }
  const modes = Object.entries(freq).map(([x, n]) => ({ x: +x, n }))
                      .sort((a, b) => b.n - a.n).slice(0, 4).sort((a, b) => a.x - b.x);
  if (modes.length < 2) return null;
  const labelX = modes[0].x, bodyX = modes[modes.length - 1].x;
  if (bodyX - labelX < 60) return null;
  const divider = labelX + (bodyX - labelX) * 0.5;
  const left = parts.filter(p => p.x < divider);
  if (left.length < 3 || left.length > parts.length * 0.5) return null;
  const crossing = parts.filter(p => p.x < divider && p.x + p.w > divider + 10).length;
  if (crossing > parts.length * 0.06) return null;
  const maxX = Math.max(...parts.map(p => p.x + p.w));
  return { bounds: [Math.min(...parts.map(p => p.x)), divider, maxX + 1] };
}

function detectColumns(parts){
  if (parts.length < 20) return null;

  // Faixas verticais VAZIAS separam colunas. Medir a ocupação em tiras finas acha
  // os vãos de verdade, inclusive o das páginas de TRÊS colunas do First Aid
  // (rótulo | conteúdo | notas laterais), que a versão anterior — que só sabia
  // procurar duas — lia intercalado.
  const xs = parts.map(p => p.x), rights = parts.map(p => p.x + p.w);
  const minX = Math.min(...xs), maxX = Math.max(...rights);
  const W = maxX - minX;
  if (W < 100) return null;

  const STEP = 4;
  const bins = new Array(Math.ceil(W / STEP) + 1).fill(0);
  for (const p of parts){
    const a = Math.floor((p.x - minX) / STEP);
    const b = Math.ceil((p.x + p.w - minX) / STEP);
    for (let k = a; k < b && k < bins.length; k++) bins[k]++;
  }

  // um vão só conta se for largo o bastante para ser separação de coluna
  const MIN_GAP = 14;
  const gaps = [];
  let run = 0;
  for (let k = 0; k < bins.length; k++){
    if (bins[k] === 0) run++;
    else { if (run * STEP >= MIN_GAP && k - run > 0) gaps.push({ from: k - run, to: k }); run = 0; }
  }
  if (!gaps.length) return detectByModes(parts);

  const bounds = [minX, ...gaps.map(g => minX + (g.from + g.to) / 2 * STEP), maxX + 1];
  const cols = [];
  for (let i = 0; i < bounds.length - 1; i++){
    const from = bounds[i], to = bounds[i + 1];
    const items = parts.filter(p => p.x >= from && p.x < to);
    if (items.length) cols.push({ from, to, items });
  }
  if (cols.length < 2) return detectByModes(parts);

  // a coluna de rótulos é a primeira; exige-se que ela seja minoria do texto,
  // senão isto é texto corrido com um vão acidental
  if (cols[0].items.length > parts.length * 0.5) return detectByModes(parts);

  return { bounds: cols.map(c => c.from).concat([bounds[bounds.length - 1]]) };
}

function orderTableLines(parts, bounds){
  // uma lista de linhas por coluna
  const colLines = [];
  for (let i = 0; i < bounds.length - 1; i++){
    const sel = parts.filter(p => p.x >= bounds[i] && p.x < bounds[i + 1]);
    colLines.push(groupIntoLines(sel));
  }
  const labels = colLines[0];
  const rest = colLines.slice(1);
  if (!labels.length) return groupIntoLines(parts);

  // blocos de rótulo: linhas coladas (espaçamento de uma linha) são o mesmo rótulo
  const blocks = [];
  for (const l of labels){
    const b = blocks[blocks.length - 1];
    const h = l.parts[0] ? l.parts[0].h : 10;
    if (b && (b.y - l.y) <= h * 1.7) { b.lines.push(l); b.y = l.y; }
    else blocks.push({ y: l.y, top: l.y, lines: [l] });
  }

  const cursor = rest.map(() => 0);
  const drain = (upTo, out) => {
    // esvazia cada coluna de conteúdo até o limite vertical, coluna por coluna —
    // assim as notas laterais são lidas DEPOIS do conteúdo a que pertencem, e não
    // intercaladas linha a linha com ele
    rest.forEach((lines, c) => {
      while (cursor[c] < lines.length && lines[cursor[c]].y > upTo + 2) out.push(lines[cursor[c]++]);
    });
  };

  const out = [];
  for (let i = 0; i < blocks.length; i++){
    drain(blocks[i].top, out);            // o que vem acima deste rótulo
    out.push(...blocks[i].lines);
    const nextTop = (i + 1 < blocks.length) ? blocks[i + 1].top : -Infinity;
    drain(nextTop, out);
  }
  drain(-Infinity, out);
  return out;
}

/* Cabeçalho/rodapé: mora nas faixas extremas E se repete entre páginas. Exigir as
   duas coisas evita comer conteúdo real que por acaso começa no alto da página. */
function markFrameLines(pages, height){
  // 0,90 e não 0,94: medido no First Aid, o cabeçalho fica em y≈785 de 849 (92%),
  // e com a faixa estreita demais ele escapava e era narrado em toda página.
  const topBand = height * 0.90, bottomBand = height * 0.07;
  const freq = {};
  for (const pg of pages){
    for (const l of pg.lines){
      if (l.y >= topBand || l.y <= bottomBand){
        const k = l.text.replace(/\d+/g, '#').slice(0, 60);
        freq[k] = (freq[k] || 0) + 1;
      }
    }
  }
  const repeated = new Set(Object.entries(freq).filter(([,n]) => n >= 2).map(([k]) => k));
  for (const pg of pages){
    pg.lines = pg.lines.filter(l => {
      if (l.y < topBand && l.y > bottomBand) return true;
      const k = l.text.replace(/\d+/g, '#').slice(0, 60);
      if (repeated.has(k)) return false;
      // número de página solto na moldura também sai
      if (/^[#\s.]*$/.test(k) || /^\d+$/.test(l.text.trim())) return false;
      return true;
    });
  }
}

/* Palavra quebrada no fim da linha ("hyper-\nprolactinemia") tem de voltar inteira
   antes de virar frase, senão o sintetizador lê os dois pedaços separados. */
function joinLines(lines){
  let out = '';
  for (const l of lines){
    const t = l.text;
    if (!out){ out = t; continue; }
    if (/[a-zà-ÿ]-$/.test(out) && /^[a-zà-ÿ]/.test(t)) out = out.slice(0, -1) + t;
    else out += ' ' + t;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/* Limpeza final do que atrapalha só na LEITURA EM VOZ ALTA. */
function cleanForSpeech(text){
  return resolveLigatures(String(text || ''))
    .replace(/https?:\/\/\S+/g, ' ')          // URL de marca d'água não se lê
    .replace(/\s*­\s*/g, '')             // hífen invisível
    .replace(/([a-zà-ÿ])-\s+([a-zà-ÿ])/g, '$1$2')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* API: devolve [{ page, text }] em ordem de leitura, pronto para virar frases. */
async function extractPdfText(fileOrBuffer, opts){
  opts = opts || {};
  const pdfjs = await loadPdfjs();
  const data = Buffer.isBuffer(fileOrBuffer) ? new Uint8Array(fileOrBuffer)
                                             : new Uint8Array(fs.readFileSync(fileOrBuffer));
  const doc = await pdfjs.getDocument({
    data, isEvalSupported: false, disableFontFace: true,
    standardFontDataUrl: path.join(VENDOR, 'standard_fonts') + path.sep
  }).promise;

  const from = Math.max(1, opts.from || 1);
  const to   = Math.min(doc.numPages, opts.to || doc.numPages);

  const pages = [];
  let height = 0;
  for (let n = from; n <= to; n++){
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    height = Math.max(height, vp.height);
    const tc = await page.getTextContent();
    const textFonts = classifyFonts(tc.items);
    const built = itemsToLines(tc.items, textFonts, vp.height);
    pages.push({ page: n, lines: built.lines, table: built.table });
  }

  markFrameLines(pages, height);

  return {
    numPages: doc.numPages,
    pages: pages.map(p => ({ page: p.page, table: p.table, text: cleanForSpeech(joinLines(p.lines)),
                             lines: opts.debug ? p.lines : undefined }))
  };
}

module.exports = { extractPdfText, GLYPHS, cleanForSpeech,
                   /* expostos para os testes */ detectColumns, orderTableLines, groupIntoLines, joinLine };
