/* CoupleMed — Narrador: catálogo de vozes + segmentação de frases (COMPARTILHADO)
   ============================================================================
   Este arquivo é carregado nos DOIS lados e por isso não pode depender de nada:

     • no navegador  -> <script src="/js/cm-narration-shared.js"> (window.CMNarrationShared)
     • no Node        -> require('../public/js/cm-narration-shared.js') pelo gerador
                         (tools/library1-narration.js, tools/library3-narration.js)

   POR QUE COMPARTILHADO E NÃO DUPLICADO: o highlight que acompanha a leitura só
   funciona se o gerador e o leitor quebrarem o texto em frases EXATAMENTE do
   mesmo jeito. O gerador grava um áudio por frase, mede a duração de cada uma e
   salva a tabela de tempos; o leitor refaz a mesma quebra sobre o DOM e casa
   frase-a-frase pelo índice. Duas cópias do algoritmo divergiriam no primeiro
   ajuste e o destaque sairia deslocado do áudio — por isso é um arquivo só.

   VOZES (padrão do site, definido pelo usuário em 2026-07-26): são as vozes
   aprimoradas/premium da Apple instaladas no Mac de produção, e valem para as
   TRÊS libraries. Library 3 é só inglês (o material é só em inglês). Trocar
   qualquer voz aqui invalida os áudios já gravados com o id antigo — o id entra
   no nome do arquivo no R2. Ver LIBRARY1_ADD_CONTENT.md §17.
   ============================================================================ */
(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;   // Node (gerador)
  else root.CMNarrationShared = api;                                        // navegador
})(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

  /* ---------------------------------------------------------------- vozes ----
     `say` = nome exato da voz no comando `say` do macOS (o que o gerador usa).
     `id`  = identificador curto e estável que entra no nome do arquivo no R2.
             NUNCA renomear um id: o áudio gravado com ele deixaria de ser achado.
     `label` = o que o usuário vê no menu de configurações do player.          */
  const VOICES = {
    en: [
      { id:'ava',      say:'Ava (Premium)',       label:'Ava',      gender:'f' },
      { id:'samantha', say:'Samantha (Enhanced)', label:'Samantha', gender:'f' },
      { id:'alex',     say:'Alex',                label:'Alex',     gender:'m' },
      { id:'tom',      say:'Tom (Enhanced)',      label:'Tom',      gender:'m' }
    ],
    pt: [
      { id:'fernanda', say:'Fernanda (Enhanced)', label:'Fernanda', gender:'f' },
      { id:'felipe',   say:'Felipe (Enhanced)',   label:'Felipe',   gender:'m' }
    ]
  };

  /* Voz que toca quando o usuário nunca escolheu nada. Uma feminina em cada
     idioma — é a que o gerador grava primeiro, então é a que abre instantânea. */
  const DEFAULT_VOICE = { en:'ava', pt:'fernanda' };

  const voicesFor  = lang => VOICES[lang === 'pt' ? 'pt' : 'en'];
  const findVoice  = (lang, id) => voicesFor(lang).find(v => v.id === id) || null;
  const resolveVoice = (lang, id) => findVoice(lang, id) || findVoice(lang, DEFAULT_VOICE[lang === 'pt' ? 'pt' : 'en']) || voicesFor(lang)[0];

  /* Velocidades do menu (o player aplica em audio.playbackRate). */
  const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

  /* ------------------------------------------------------- segmentação ------
     Abreviações depois das quais um ponto NÃO termina a frase. Sem esta lista o
     texto médico viraria picadinho: "e.g.", "vs.", "Dr.", "approx." e as
     unidades apareceriam como frases de duas letras, e o destaque pularia
     loucamente pela tela. Comparação sempre em minúsculas.                   */
  const ABBREV = new Set([
    // inglês
    'e.g','i.e','etc','vs','cf','al','approx','fig','no','vol','ch','pp','ed','est',
    'dr','drs','mr','mrs','ms','prof','st','jr','sr','inc','ltd','dept','univ',
    // português
    'p.ex','ex','etc','fig','tab','ref','obs','aprox','pág','pag','cap','vol','ed',
    'dra','dras','sr','sra','srs','sras','prof','profa','av','núm','num',
    // Siglas clínicas COM ponto interno — estas de fato aparecem no meio da frase.
    // Unidades soltas (mg, ml, kg, cm…) ficaram FORA de propósito: na escrita real elas
    // vêm sem ponto ("500 mg de amoxicilina"), então um "mg." seguido de maiúscula é
    // quase sempre fim de frase mesmo. Listá-las aqui grudava duas frases numa só.
    'a.c','p.c','v.o','i.v','i.m','s.c','b.i.d','t.i.d','q.i.d','p.r.n','q.d','q.h.s'
  ]);

  /* Quebra um texto corrido em frases.
     A regra é conservadora de propósito: só termina a frase quando o ponto (ou
     ! ? ;) é seguido de espaço e de algo que PAREÇA começo de frase. Errar para
     o lado da frase longa é inofensivo (o destaque cobre um trecho maior);
     errar para o lado curto quebra a leitura no meio de uma sigla.            */
  function splitSentences(text){
    const s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    if (!s) return [];

    const out = [];
    let start = 0;

    for (let i = 0; i < s.length; i++){
      const ch = s[i];
      if (ch !== '.' && ch !== '!' && ch !== '?' && ch !== ';') continue;

      // agrupa pontuação repetida/fechamentos: "...", "?!", ".)", '."'
      let j = i;
      while (j + 1 < s.length && '.!?;'.includes(s[j+1])) j++;
      while (j + 1 < s.length && ')]}»"\''.includes(s[j+1])) j++;

      const next = s[j+1];
      if (next === undefined){ i = j; break; }                 // fim do texto: sai e fecha embaixo
      if (next !== ' ') { i = j; continue; }                    // "1.5", "U.S.A" no meio da palavra

      const after = s.slice(j+2, j+42);
      // depois do espaço tem de começar coisa nova: maiúscula, dígito, abre-parêntese…
      if (!/^[«"'(\[]?[A-ZÀ-ÖØ-Þ0-9•\-–—]/.test(after)) { i = j; continue; }

      if (ch === '.'){
        // última "palavra" antes do ponto — se é abreviação conhecida, não quebra
        const before = s.slice(start, i);
        const m = before.match(/([A-Za-zÀ-ÿ.]+)$/);
        const w = m ? m[1].toLowerCase().replace(/^[^a-zà-ÿ.]+/, '') : '';
        if (w && ABBREV.has(w)) { i = j; continue; }
        // inicial solta de nome ("J. Smith") — uma letra só antes do ponto
        if (/(^|\s)[A-Za-zÀ-ÿ]$/.test(before)) { i = j; continue; }
      }

      const piece = s.slice(start, j+1).trim();
      if (piece) out.push(piece);
      start = j + 2;
      i = j + 1;
    }

    const tail = s.slice(start).trim();
    if (tail) out.push(tail);

    // frases minúsculas (resto de sigla, número solto) grudam na anterior: um
    // pedaço de 3 letras não merece um destaque próprio nem um arquivo de áudio.
    const merged = [];
    for (const p of out){
      if (merged.length && p.replace(/[^A-Za-zÀ-ÿ0-9]/g,'').length < 4) merged[merged.length-1] += ' ' + p;
      else merged.push(p);
    }
    return merged;
  }

  /* Texto que vai para o sintetizador. O que está escrito para o olho não
     serve para o ouvido: "figure 1" no meio da frase é uma referência clicável
     (não se lê "figura um" ali), e símbolos soltos viram ruído. */
  function speakable(text, lang){
    const or = (lang === 'pt') ? ' ou ' : ' or ';
    const approx = (lang === 'pt') ? ' aproximadamente ' : ' approximately ';
    return String(text == null ? '' : text)
      .replace(/\s+/g, ' ')
      .replace(/([A-Za-zÀ-ÿ])\/([A-Za-zÀ-ÿ])/g, '$1' + or + '$2')   // "alérgica/irritante"
      .replace(/[•▪◦]/g, ',')
      .replace(/[≈~]/g, approx)
      .replace(/\s*[—–]\s*/g, ', ')
      .replace(/\s*,\s*,\s*/g, ', ')
      .trim();
  }

  /* ------------------------------------------------- blocos de um HTML ------
     Usado pelo GERADOR (Node, sem DOM) para varrer o `html` gravado de um tópico
     da Library 1. Segmentar o texto todo de uma vez grudaria o título da seção
     na primeira frase dela ("INTRODUCTION Acute rheumatic fever is…"), que soa
     errado narrado e destaca duas coisas ao mesmo tempo. Então quebra primeiro
     nas tags de bloco e só depois em frases dentro de cada bloco.

     O leitor NÃO refaz esta conta: ele recebe a lista de frases pronta no JSON e
     procura cada uma no DOM (ver matchSentencesToDom em cm-narrator.js). Por
     isso um bloco a mais ou a menos aqui não desalinha o destaque — o casamento
     é por texto, não por índice cego. */
  const BLOCK_TAGS = 'h1|h2|h3|h4|h5|h6|p|li|td|th|caption|figcaption|blockquote|dt|dd|pre|summary';

  function blocksFromHtml(html){
    let s = String(html == null ? '' : html);
    // <br> vira quebra de bloco; script/style nunca são falados
    s = s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
         .replace(/<br\s*\/?>/gi, '\u0001');
    // marca a fronteira de cada tag de bloco (abre e fecha) com \u0001
    s = s.replace(new RegExp('</?(?:' + BLOCK_TAGS + ')\\b[^>]*>', 'gi'), '\u0001');
    s = s.replace(/<[^>]+>/g, ' ');                       // resto das tags (strong, a, em…) é inline
    s = decodeEntities(s);

    const out = [];
    for (const raw of s.split('\u0001')){
      const block = raw.replace(/\s+/g, ' ').trim();
      if (!block) continue;
      for (const sent of splitSentences(block)) out.push(sent);
    }
    return out;
  }

  function decodeEntities(s){
    const named = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ', ndash:'–', mdash:'—',
                    lsquo:'‘', rsquo:'’', ldquo:'“', rdquo:'”', hellip:'…',
                    deg:'°', plusmn:'±', times:'×', divide:'÷', le:'≤', ge:'≥', ne:'≠', asymp:'≈',
                    alpha:'α', beta:'β', gamma:'γ', delta:'δ', mu:'µ', bull:'•', middot:'·', reg:'®', copy:'©' };
    return String(s)
      .replace(/&#x([0-9a-f]+);/gi, (_,h)=>safeChar(parseInt(h,16)))
      .replace(/&#(\d+);/g,        (_,d)=>safeChar(parseInt(d,10)))
      .replace(/&([a-z]+);/gi,     (m,n)=>{ const k=n.toLowerCase(); return k in named ? named[k] : m; });
  }
  function safeChar(cp){ try{ return String.fromCodePoint(cp); }catch(e){ return ''; } }

  /* Normalização usada para casar a frase do JSON com o texto do DOM. Tem de ser
     idêntica nos dois lados, então mora aqui: minúsculas, sem acento, só
     letras/dígitos. Assim "cross‑react" e "cross-react" (hífens diferentes),
     espaço duplo ou &nbsp; continuam casando. */
  function normalizeForMatch(text){
    return String(text == null ? '' : text)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  /* Nome do objeto no R2. Uma pasta por escopo, um arquivo por idioma+voz.
     `.m4a` = o áudio inteiro do tópico; `.json` = a tabela de tempos das frases.
       narration/lib1/<subject>/<topic>/en-ava.m4a
       narration/lib1/<subject>/<topic>/en-ava.json
       narration/lib3/<pdf-sem-extensao>/en-ava.m4a                            */
  function narrationKey(scopeKey, lang, voiceId, ext){
    return 'narration/' + String(scopeKey).replace(/^\/+|\/+$/g,'') + '/' + lang + '-' + voiceId + '.' + ext;
  }

  return { VOICES, DEFAULT_VOICE, RATES, voicesFor, findVoice, resolveVoice,
           splitSentences, speakable, blocksFromHtml, normalizeForMatch, narrationKey };
});
