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
      de verdade (cifrão) viraria "fi" e, pior, o "r" de "large" viraria
      "decreased". Fonte de símbolo é a que SÓ emite caracteres do repertório de
      ícone (ver SYMBOL_CHARS/classifyFonts); não se conta fragmento, porque o
      mesmo texto vem inteiro num PDF e picado letra por letra no outro. A
      detecção é pelo repertório e não pelo nome porque o PDF.js nomeia fontes por
      documento (`g_d0_f2`), e esse nome muda de arquivo para arquivo.
      Dois glifos são ambíguos e se resolvem pelo contexto: "#" é espaço fino
      depois de seta e ligadura fora dela (applyGlyphs), e o "!" da fonte de
      display é o travessão do título, não ligadura (resolveLigatures).

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
  '`': ' '                 // separador decorativo do cabeçalho
};

/* As setas — os únicos glifos de significado fixo. */
const ARROWS = new Set(['q', 'r', 'p']);

/* Marcadores temporários para "aqui havia uma ligadura desconhecida". Dois, porque a
   largura já diz de quantos glifos ela é: LIG são as de dois (fi/fl/ff) e LIG3 as de
   três (ffi/ffl), que são largas — tão largas quanto o travessão do título, e é só o
   entorno que separa as duas ("Lö⟦?⟧er" = Löffler, "CARDIOVASCULAR⟦?⟧PATHOLOGY" = —). */
const LIG  = '\u0001';
const LIG3 = '\u0002';
/* Os caracteres AMBÍGUOS da fonte de ícone. Cada um deles é três coisas diferentes no
   mesmo PDF, e quem diz qual é a LARGURA do glifo em relação ao corpo da letra —
   medido item por item em bioquímica, cardiovascular, micologia e rapid-review:

     ~1,0 em   travessão OU ligadura de três glifos (decidido por palavra, ver LIG3)
     ~0,55 em  ligadura fi/fl/ff     'in"uenzae' = influenzae     → resolvida por palavra
     ~0,28 em  espaço fino ou hífen  'q"in RV' = "↑ in RV"        → espaço

   Fixar um papel só era o que apagava letras: com "#" preso em espaço a narração dizia
   "uconazole" (fluconazole) e "uorescent" (fluorescent); com "!" preso em ligadura o
   título saía "BIOCHEMISTRYfiMOLECULAR". */
const LIG_CHARS = new Set(['$', '%', '!', '&', "'", '#', '"']);
const WIDE_EM   = 0.8;    // daqui para cima, glifo largo: travessão ou ffi/ffl
const THIN_EM   = 0.4;    // daqui para baixo, espaço fino

/* A prova de que uma fonte é de TEXTO: ela emitiu letra ou dígito que nenhuma fonte
   de ícone do First Aid sabe desenhar. As setas ocupam as posições de `q`, `r` e `p`,
   então só essas três letras não valem como prova. Pontuação não vale: as fontes de
   ícone emitem justamente `# ! $ % " \`` (ver classifyFonts). */
function provesTextFont(ch){
  if (ARROWS.has(ch)) return false;
  return /[0-9]/.test(ch) || /\p{L}/u.test(ch);
}

/* Palavras com ligadura que aparecem de fato em texto médico. A lista existe para
   decidir ENTRE as candidatas (fi/fl/ff/ffi/ffl) — não para corrigir ortografia.
   Fora dela, "fi" é o palpite padrão: é a ligadura mais comum em inglês médico
   (deficiency, specific, classification, fibrosis…). */
const LIG_WORDS  = ['fi','fl','ff'];        // glifo de largura normal
const LIG3_WORDS = ['ffl','ffi'];           // glifo largo
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
  'affinity','afferent','efferent','buffer','diffusely','löffler','loffler'
]);

/* Troca cada marcador de ligadura pela candidata que produz uma palavra conhecida.
   Roda sobre o texto já montado, porque a decisão depende da palavra inteira — e a
   palavra pode ter sido partida em vários fragmentos pelo PDF. */
function resolveLigatures(text){
  if (text.indexOf(LIG) < 0 && text.indexOf(LIG3) < 0) return text;
  return text.replace(/[A-Za-zÀ-ÿ\u0001\u0002-]*[\u0001\u0002][A-Za-zÀ-ÿ\u0001\u0002-]*/g, token => {
    const marks = /[\u0001\u0002]/g;
    const wide  = token.indexOf(LIG3) >= 0;
    // a ligadura entra na caixa da palavra em volta: em "ADVERSE E⟦?⟧ECTS" o que falta é
    // "FF", não "ff" — senão o `say` lê "EffECTS" trocando de tom no meio da palavra
    const caseOf = s => /[a-zà-ÿ]/.test(token) ? s : s.toUpperCase();
    const fill = c => token.replace(marks, caseOf(c));
    // a largura já disse de quantos glifos é a ligadura; a outra lista fica como segunda
    // tentativa, para o caso de o PDF não ter informado a largura do glifo
    const first = wide ? LIG3_WORDS : LIG_WORDS;
    for (const cand of first.concat(wide ? LIG_WORDS : LIG3_WORDS)){
      const tryWord = fill(cand);
      if (LIG_KNOWN.has(tryWord.toLowerCase().replace(/[^a-zà-ÿ]/g,''))) return tryWord;
    }
    // Na fonte de DISPLAY o glifo largo não é ligadura nenhuma: é o travessão que separa
    // as duas metades do título ("BIOCHEMISTRY–MOLECULAR"). Sem isto o cabeçalho era
    // narrado "BIOCHEMISTRYfiMOLECULAR". O que denuncia o travessão é o entorno em CAIXA
    // ALTA com palavra inteira de cada lado — numa ligadura de verdade algum lado é curto
    // ("E⟦?⟧ECTS" = EFFECTS) ou há minúscula em volta ("Lö⟦?⟧er" = Löffler).
    const sides = token.split(marks);
    const letters = s => s.replace(/[^A-Za-zÀ-ÿ]/g, '').length;
    if (sides.every(s => s === '')) return '—';
    if (!/[a-zà-ÿ]/.test(token) && sides.every(s => letters(s) >= 2) && sides.some(s => letters(s) >= 3)){
      return sides.join('—');
    }
    // Fora do dicionário, decide pelo som. Nas de dois glifos: "fl" só ocorre antes de
    // vogal (fluvoxamine, inflammation) e "ff" entre vogais (different, Korsakoff) — sem
    // isto "fl uvoxamine" virava "fiuvoxamine". Nas de três: "ffl" leva vogal depois
    // (Löffler) e "ffi" leva consoante (sufficient, affiliate).
    const at   = token.search(marks);
    const prev = (token[at - 1] || '').toLowerCase();
    const next = (token[at + 1] || '').toLowerCase();
    let guess;
    if (wide){
      guess = /[aeiouà-ÿ]/.test(next) ? 'ffl' : 'ffi';
    } else {
      guess = 'fi';
      if (/[uoa]/.test(next) && !/[aeiou]/.test(prev)) guess = 'fl';
      else if (/[aeiou]/.test(prev) && (next === '' || /[aeiou]/.test(next))) guess = 'ff';
    }
    return fill(guess);
  });
}

/* Quais fontes da página são de TEXTO (o mapa de glifos não as toca) e quais são de
   SÍMBOLO (aí sim `r` é ↓).

   A régua é o repertório de caracteres, não a contagem: basta a fonte emitir UMA letra
   ou dígito que uma fonte de ícone não teria (ver provesTextFont) para ela ser de
   texto. Não se exige que o repertório dela caiba numa lista fechada de símbolos, e
   isso é deliberado: a fonte de ligaduras da micologia emite `#`, `!` e `"`, e uma
   lista fechada deixaria o `"` de fora e mandaria a fonte para o lado errado.

   A versão anterior contava fragmentos "longos" (≥4 caracteres com 3 letras) e dava
   a fonte por símbolo quando achava menos de dois. Isso dependia de sorte: o PDF de
   psiquiatria passou porque a fonte do corpo emitia 20 fragmentos longos, e o de
   bioquímica corrompeu porque lá a MESMA fonte de corpo vem picada em pedaços de uma
   letra ("larg", "l", "arg", "H", "c", "h" — 22 fragmentos, 1 longo). Resultado:
   "Chromatin structure" era narrado "Ch decreased omatin st decreased uctu decreased e".
   Frase plausível e errada é pior que frase embaralhada — o aluno não desconfia. */
function classifyFonts(items, into){
  const symbol = {};
  for (const it of items){
    const s = (it.str || '').trim();
    if (!s) continue;
    const f = it.fontName || '?';
    if (!(f in symbol)) symbol[f] = true;   // símbolo até emitir algo que prove o contrário
    if (!symbol[f]) continue;
    for (const ch of s){
      if (provesTextFont(ch)){ symbol[f] = false; break; }
    }
  }
  const textFonts = into || new Set();
  for (const [f, isSymbol] of Object.entries(symbol)) if (!isSymbol) textFonts.add(f);
  return textFonts;
}

/* Papel de um caractere ambíguo, pela largura dele em "em" (ver LIG_CHARS).
   `em` = 0 quando o PDF não informa largura: aí o contexto decide — depois de seta é o
   espaço fino que a fonte de ícone insere, e fora dela o palpite seguro é ligadura,
   porque ligadura errada troca uma palavra e espaço errado apaga letras. */
function ambiguousGlyph(em, afterArrow){
  if (em >= WIDE_EM) return LIG3;
  if (em > 0 && em <= THIN_EM) return ' ';
  if (!em && afterArrow) return ' ';
  return LIG;                                     // decidida depois, por palavra
}

function applyGlyphs(str, isSymbolFont, em, afterArrow){
  if (!isSymbolFont) return str;
  let out = '';
  let prevArrow = !!afterArrow;
  for (const ch of str){
    if (ch in GLYPHS) out += GLYPHS[ch];
    else if (LIG_CHARS.has(ch)) out += ambiguousGlyph(em, prevArrow);
    else out += ch;
    if (!/\s/.test(ch)) prevArrow = ARROWS.has(ch);
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
  let afterArrow = false;     // ver applyGlyphs: é o que distingue "#" espaço de "#" ligadura
  for (const it of items){
    const raw = it.str;
    if (!raw || !raw.trim()) continue;
    const y = it.transform[5];
    // moldura fora já aqui: cabeçalho e rodapé têm x próprio e envenenariam a
    // detecção de colunas (foi o que fez a tabela não ser reconhecida na 1ª versão)
    if (y >= topBand || y <= bottomBand) continue;
    const isSym = !textFonts.has(it.fontName);
    // largura do glifo em "em": o corpo da letra é a escala do próprio item
    const size = Math.abs(it.transform[0]) || it.height || 0;
    const glyphs = raw.trim().length || 1;
    const em = size ? (it.width || 0) / (size * glyphs) : 0;
    const text = applyGlyphs(raw, isSym, em, afterArrow);
    const lastCh = raw.trim().slice(-1);
    afterArrow = isSym && ARROWS.has(lastCh);
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

  // Passada de reconhecimento das fontes ANTES de extrair, sobre todas as páginas
  // pedidas. O PDF.js nomeia fonte por documento (g_d1_f7), então uma página em que a
  // fonte do corpo só aparece num "r" solto a daria por símbolo — e "r" viraria
  // "decreased" ali. Vendo o intervalo inteiro primeiro, a fonte já entra classificada
  // como texto. Custa uma segunda leitura do texto, barato ao lado de gerar o áudio.
  const textFonts = new Set();
  for (let n = from; n <= to; n++){
    classifyFonts((await (await doc.getPage(n)).getTextContent()).items, textFonts);
  }

  const pages = [];
  let height = 0;
  for (let n = from; n <= to; n++){
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    height = Math.max(height, vp.height);
    const tc = await page.getTextContent();
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
                   /* expostos para os testes */ detectColumns, orderTableLines, groupIntoLines, joinLine,
                   classifyFonts, toParts, LIG };
