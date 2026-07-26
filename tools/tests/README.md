# Testes do leitor da Library 1

Testes do `public/js/library1-reader.js` num DOM real (jsdom), **sem browser**.
Rodam o arquivo real do repositório, não uma cópia.

## Como rodar

O `jsdom` **não** é dependência do projeto (o site não tem `package.json`), então
ele é instalado à parte e apontado por variável de ambiente:

```bash
# 1) instalar jsdom numa pasta qualquer, fora do repo
mkdir -p /tmp/l1test && cd /tmp/l1test
npm init -y >/dev/null
npm install jsdom --cache /tmp/l1test/.npmcache      # ⚠️ o --cache é necessário:
                                                     # o cache padrão (~/.npm) dá EACCES no sandbox

# 2) rodar, apontando o jsdom
cd <repo>
JSDOM_PATH=/tmp/l1test/node_modules/jsdom node tools/tests/test-reader.js
JSDOM_PATH=/tmp/l1test/node_modules/jsdom node tools/tests/test-quiz.js
JSDOM_PATH=/tmp/l1test/node_modules/jsdom node tools/tests/test-read.js
JSDOM_PATH=/tmp/l1test/node_modules/jsdom node tools/tests/test-read-lib3.js
JSDOM_PATH=/tmp/l1test/node_modules/jsdom node tools/tests/test-count.js
JSDOM_PATH=/tmp/l1test/node_modules/jsdom node tools/tests/test-flashcards.js
JSDOM_PATH=/tmp/l1test/node_modules/jsdom node tools/tests/test-assetbase.js
JSDOM_PATH=/tmp/l1test/node_modules/jsdom node tools/tests/test-narrator.js
JSDOM_PATH=/tmp/l1test/node_modules/jsdom node tools/tests/test-flashcards-i18n.js
```

Saída esperada: `✅ TODOS OS TESTES PASSARAM` em todos, menos `test-assetbase.js`,
que responde `✅ A virada para o R2 é uma linha — provado`.

- `test-narrator.js` — narração das Libraries (§17): catálogo das 6 vozes, o player e,
  o mais importante, o **casamento frase ↔ DOM** que mantém o destaque em cima do
  trecho que está sendo lido. Usa a tabela de tempos real se ela existir em
  `.narration-build/` (gere com `node tools/narration.js build lib1 …`).
- `test-flashcards-i18n.js` — tradução dos flashcards, inclusive os **formatados**
  (negrito/listas/imagens), que antes ficavam presos no idioma original.

## O que cada um cobre

| Arquivo | Cobre |
|---|---|
| `test-reader.js` | toolbar; página mostrando **só texto**; imagem abrindo apenas ao clicar no nome; janela do visualizador com zoom −/+/⟳; tradução pelo **tradutor global** do site (texto, rótulos, legendas e imagens juntos, inclusive com a imagem aberta); marcação por seleção isolada por idioma; undo/redo; borracha; busca; download com as imagens **embutidas** em data URI |
| `test-quiz.js` | Create Test: botão acima das tags, execução, revelação do %, explicações, resultado, estado "já realizado", Rever × Refazer e — o mais importante — **isolamento do QBank 1** (grava estado de QBank, roda o teste e compara byte a byte que nada mudou) |
| `test-read.js` | marca "já lido": botão da toolbar, estado compartilhado com a lista de tópicos, tradução do rótulo, atualização por evento `storage` e isolamento do QBank |
| `test-read-lib3.js` | a mesma marca na **Library 3**: botão na toolbar do leitor de PDF, id = a `key` do PDF, chave separada da Library 1, e nenhuma das duas encostando no QBank |
| `test-count.js` | prova que a **quantidade de questões é livre** (1, 2, 9 e nenhuma) — 5 não é padrão |
| `test-flashcards.js` | os **20 flashcards por tópico** (§11.4): contagem, ids idempotentes, taxonomia, cloze, imagens existentes em disco, e a semeadura no banco (sem duplicar, preservando progresso) |
| `test-assetbase.js` | carrega o **conteúdo real** do repositório e prova que trocar `window.LIBRARY1_ASSET_BASE` migra a mídia para o R2 **sem editar nenhum conteúdo** |

## Detalhes de ambiente que já custaram tempo

- **`runScripts: 'dangerously'` é obrigatório.** Carregar o leitor com `window.eval()`
  cria o `AbortController` em outra realm e o `addEventListener({signal})` rejeita.
- jsdom **não** implementa `URL.createObjectURL`, `fetch` nem um `FileReader` útil —
  os testes fazem stub dos três (é o que permite testar o download).
- `Element.prototype.scrollIntoView` também não existe; é stubado.

## Relação com a auditoria

Estes testes verificam **comportamento do leitor**. A conferência do **conteúdo
incluído** (mídia bilíngue, referências, questões) é outra coisa e roda por
`node tools/library1-audit.js` — obrigatória ao fim de cada tópico
(`LIBRARY1_ADD_CONTENT.md` §11.1).
