/* CoupleMed — Library 1: TEMPLATE do arquivo de conteúdo por Subject
   ============================================================================
   ⚠️ Este arquivo NÃO é carregado pelo site. O nome começa com "_" justamente
   para não colidir com nenhum slug de Subject. Ele existe só como referência do
   formato. Ver LIBRARY1_ADD_CONTENT.md §5.

   REGRA: um arquivo por Subject, nomeado com o slug do Subject.
     public/js/library1-content/<subject-slug>.js

   O slug é o mesmo `slugify()` usado em site.js e library1-reader.js:
     minúsculas · "&" vira "and" · tudo que não for [a-z0-9] vira "-" · sem "-" nas pontas
   Exemplos:
     "Allergy & Immunology"        -> allergy-and-immunology.js
     "Ear, Nose & Throat (ENT)"    -> ear-nose-and-throat-ent.js
     "Rheumatology/Orthopedics"    -> rheumatology-orthopedics.js
     "Cell Bio, Biochem, Genetics" -> cell-bio-biochem-genetics.js

   A chave de cada tópico é o slug do NOME DO TÓPICO em inglês (campo `name` de
   library1-structure.js), pelo mesmo slugify.

   BILÍNGUE OBRIGATÓRIO (regra do site inteiro): `en` e `pt` sempre juntos, no
   mesmo commit. O material de origem vem em inglês; a versão PT é gravada junto
   para que a troca de idioma no leitor seja instantânea, sem tradução ao vivo.
   ============================================================================ */
/* IIFE obrigatória: todos os arquivos de Subject são carregados no MESMO escopo
   global, então qualquer const/let solta aqui colidiria com a do arquivo vizinho. */
(function(){
'use strict';
window.LIBRARY1_CONTENT = window.LIBRARY1_CONTENT || {};

const A1 = '/assets/library1/<subject-slug>/';

window.LIBRARY1_CONTENT['<subject-slug>'] = {

  '<topic-slug>': {

    /* MÍDIA — imagens, figuras e tabelas do material, SEMPRE nos dois idiomas.
       `kind` agrupa no painel lateral (image | figure | table) e `n` é o número
       exibido ("image 1", "figura 2"). O `alt` vira a legenda da imagem ampliada
       e por isso também precisa estar traduzido. */
    assets: {
      'image-1': { kind:'image', n:1,
        en:{ src:A1+'<topic-slug>/image-1-en.jpg', alt:'Caption in English' },
        pt:{ src:A1+'<topic-slug>/image-1-pt.jpg', alt:'Legenda em português' } },
      'figure-1': { kind:'figure', n:1,
        en:{ src:A1+'<topic-slug>/figure-1-en.jpg', alt:'Caption in English' },
        pt:{ src:A1+'<topic-slug>/figure-1-pt.jpg', alt:'Legenda em português' } },
      'table-1': { kind:'table', n:1,
        en:{ src:A1+'<topic-slug>/table-1-en.png', alt:'Caption in English' },
        pt:{ src:A1+'<topic-slug>/table-1-pt.png', alt:'Legenda em português' } }
    },

    en: {
      title: 'Topic title exactly as in library1-structure.js (name)',
      html: `
        <h2>Section heading</h2>
        <p>Body text, transcribed <strong>verbatim</strong> from the source material,
           with the reference clickable exactly like in the original
           (<a class="l1r-ref" data-ref="figure-1">figure 1</a>).</p>
        <ul><li>Bullet</li><li>Another bullet</li></ul>
        <table>
          <thead><tr><th>Column</th><th>Column</th></tr></thead>
          <tbody><tr><td>Cell</td><td>Cell</td></tr></tbody>
        </table>
      `
    },
    pt: {
      title: 'Título do tópico exatamente como em library1-structure.js (ptName)',
      html: `
        <h2>Título da seção</h2>
        <p>Texto do corpo, tradução fiel do original em inglês, com a referência
           clicável igual à do original
           (<a class="l1r-ref" data-ref="figure-1">figura 1</a>).</p>
        <ul><li>Item</li><li>Outro item</li></ul>
        <table>
          <thead><tr><th>Coluna</th><th>Coluna</th></tr></thead>
          <tbody><tr><td>Célula</td><td>Célula</td></tr></tbody>
        </table>
      `
    }
  }

};
})();

/* ----------------------------------------------------------------------------
   NOTAS DE FORMATO

   1. HTML permitido no corpo: h2, h3, p, ul/ol/li, strong, em, table/thead/
      tbody/tr/th/td, blockquote, code, hr, e o <a class="l1r-ref" data-ref="…">
      das referências. O <h1> NÃO vai aqui — o leitor desenha o título a partir
      do campo `title`.

   2. Estilo vem todo de public/css/library1-reader.css. Não colocar `style=`
      inline nem <script>/<style> no conteúdo.

   3. MÍDIA BILÍNGUE (regra do usuário, 2026-07-25): o material traz cada imagem,
      figura e tabela em inglês E em português. As duas versões são recortadas e
      gravadas, e o leitor troca a imagem junto com o texto — inclusive com a
      imagem já aberta na tela. Nunca reaproveitar a versão EN no PT.
      Caminho: public/assets/library1/<subject-slug>/<topic-slug>/
      Nomes: image-N-en.jpg / image-N-pt.jpg, figure-N-*, table-N-*
      Fotos e diagramas em JPEG (qualidade 92); tabelas em PNG (texto nítido).
      Recortar a borda branca, mas NUNCA reduzir a resolução — a imagem ampliada
      precisa dos pixels.

   4. REFERÊNCIAS no texto: onde o original diz "image 1", "figure 2", "table 3"
      como link, usar <a class="l1r-ref" data-ref="image-1">image 1</a>. O
      data-ref é a chave em `assets`. Os DOIS idiomas têm de referenciar o mesmo
      conjunto de chaves (só o texto visível muda: "figure 1" / "figura 1").

   5. Template literal (crase): se o conteúdo contiver crase ou ${, escapar com
      \` e \${ — senão quebra a sintaxe. Rodar `node --check` no arquivo depois.

   6. Marcações do usuário (highlights) são gravadas por deslocamento de
      caractere sobre o texto do artigo, separadas por idioma. Editar um
      conteúdo já publicado desloca as marcações antigas daquele tópico — evitar
      reescrever conteúdo já revisado sem necessidade.
---------------------------------------------------------------------------- */
