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
window.LIBRARY1_CONTENT = window.LIBRARY1_CONTENT || {};

window.LIBRARY1_CONTENT['<subject-slug>'] = {

  '<topic-slug>': {
    en: {
      title: 'Topic title exactly as in library1-structure.js (name)',
      html: `
        <h2>Section heading</h2>
        <p>Body text, transcribed <strong>verbatim</strong> from the source material.</p>
        <ul><li>Bullet</li><li>Another bullet</li></ul>
        <table>
          <thead><tr><th>Column</th><th>Column</th></tr></thead>
          <tbody><tr><td>Cell</td><td>Cell</td></tr></tbody>
        </table>
        <img src="/assets/library1/<subject-slug>/<file>.png" alt="describe the figure">
      `
    },
    pt: {
      title: 'Título do tópico exatamente como em library1-structure.js (ptName)',
      html: `
        <h2>Título da seção</h2>
        <p>Texto do corpo, tradução fiel do original em inglês.</p>
        <ul><li>Item</li><li>Outro item</li></ul>
        <table>
          <thead><tr><th>Coluna</th><th>Coluna</th></tr></thead>
          <tbody><tr><td>Célula</td><td>Célula</td></tr></tbody>
        </table>
        <img src="/assets/library1/<subject-slug>/<file>.png" alt="descreva a figura">
      `
    }
  }

};

/* ----------------------------------------------------------------------------
   NOTAS DE FORMATO

   1. HTML permitido no corpo: h2, h3, p, ul/ol/li, strong, em, table/thead/
      tbody/tr/th/td, img, blockquote, code, hr, a. O <h1> NÃO vai aqui — o
      leitor já desenha o título a partir do campo `title`.

   2. Estilo vem todo de public/css/library1-reader.css. Não colocar `style=`
      inline nem <script>/<style> no conteúdo.

   3. Imagens: gravar em public/assets/library1/<subject-slug>/ e referenciar
      com caminho absoluto (/assets/...). Usar a MESMA imagem nas duas versões,
      a menos que o usuário forneça a versão em português (regra do site).

   4. Template literal (crase): se o conteúdo contiver crase ou ${, escapar com
      \` e \${ — senão quebra a sintaxe. Rodar `node --check` no arquivo depois.

   5. Marcações do usuário (highlights) são gravadas por deslocamento de
      caractere sobre o texto do artigo, separadas por idioma. Editar um
      conteúdo já publicado desloca as marcações antigas daquele tópico — evitar
      reescrever conteúdo já revisado sem necessidade.
---------------------------------------------------------------------------- */
