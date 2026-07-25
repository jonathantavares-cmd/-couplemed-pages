# CoupleMed Library 1 — Documentação Completa (inclusão de conteúdo)

> Referência definitiva do módulo **Medical Library › Library 1**: como incluir o material de estudo nas pastas/tópicos que já existem no site, como o conteúdo é armazenado, e como a Library 1 se conecta ao QBank 1.
>
> **Este arquivo é autossuficiente.** Quando o usuário disser apenas "adicionar Library 1" (ou variação), leia este arquivo do início ao fim antes de agir.
>
> ⚠️ **Este arquivo é DIFERENTE e INDEPENDENTE do `QBANK_ADD_QUESTION.md`.** São dois fluxos de trabalho distintos, com funções e tarefas diferentes, que rodam **ao mesmo tempo em sessões/chats separados** (regra do usuário, 2026-07-25 — ainda faltam +3.000 questões a adicionar no QBank). Nunca misture os dois procedimentos, nunca edite os arquivos do outro fluxo, e nunca trate um como continuação do outro. Ver **Seção 10 (Trabalho concorrente)** — é a seção que evita que as duas sessões briguem por arquivo/commit.
>
> Última auditoria contra o código real: 2026-07-25 (criação do arquivo + leitor de página implementado e testado).

---

## 0. PROCEDIMENTO PADRÃO — o que fazer quando o usuário disser "adicionar Library 1"

Gatilhos reconhecidos: **"adicionar Library 1"**, "adicionar conteúdo à Library 1", "incluir material da Library 1", ou variação equivalente que cite a Library 1.

1. **Ler este arquivo (`LIBRARY1_ADD_CONTENT.md`) do início ao fim.** Não usar memória de sessões anteriores como fonte.
2. **Abrir e varrer a pasta de origem** `/Users/jonathan/Desktop/Adicionar Library 1/` (Seção 2), recursivamente, e **visualizar o conteúdo** de cada arquivo encontrado. Não pedir material ao usuário antes de checar a pasta — só pedir se a pasta estiver sem nenhum arquivo novo desde a última leva.
3. **Identificar, para cada arquivo, a qual tópico do site ele pertence** — o caminho da pasta já é a resposta (Seção 3: `Subject/Tópico/arquivo`). Não adivinhar por conteúdo quando o caminho já diz.
4. **Aplicar a Regra de Fidelidade (Seção 1)** — o material é conteúdo próprio do usuário; transcrever verbatim.
5. **Gravar o conteúdo** no arquivo de destino correspondente (Seção 5), sempre **bilíngue EN + PT no mesmo commit** (Seção 6).
6. **Validar**: `node --check` no(s) arquivo(s) alterado(s) + conferir que o tópico abre no site (Seção 9).
7. **Marcar o progresso**: `node tools/library1-progress.js mark "<Subject>" "<Tópico>"` — põe o ✅ na subpasta do Desktop e, se o Subject ficar completo, na pasta dele também (Seção 11).
8. **Commit e push automáticos**, sem esperar aprovação (mesma política do QBank — permissões em bypass global). Commitar **apenas** os arquivos da Library 1 (Seção 10).
9. **Processar a pasta inteira**, quantos arquivos forem — em lotes, seguindo automaticamente lote após lote, sem perguntar se deve continuar. Subpasta vazia é pulada em silêncio (Seção 2.2).

---

## 1. REGRA DE FIDELIDADE

Idêntica em espírito à do QBank (`QBANK_ADD_QUESTION.md` §0.1), e vale integralmente aqui:

- **Todo material enviado é conteúdo próprio/original do usuário.** Este é o site e o material de estudo pessoal dele — não pode haver nada errado.
- Transcrever **verbatim**: não parafrasear, não resumir, não "melhorar" a redação, não reordenar tópicos.
- **Nunca inventar** conteúdo médico, valores, tabelas ou referências que não estejam no material.
- Se algum dado estiver ilegível/ausente, **perguntar ao usuário** em vez de supor.
- A única liberdade editorial permitida é a **tradução PT-BR** (Seção 6), que é obrigatória e deve ser fiel ao original.

---

## 2. PASTA DE ORIGEM DO MATERIAL

**Caminho:** `/Users/jonathan/Desktop/Adicionar Library 1/`

Estrutura verificada em 2026-07-25:

```
Adicionar Library 1/
├── Allergy & Immunology/           ← 26 pastas de nível 1 (Subjects)
│   ├── Acute rheumatic fever/      ← 1.838 subpastas de nível 2 (Tópicos)
│   ├── Anaphylaxis/
│   └── ...
├── Anatomy & Histology/
└── ...
```

- **26 pastas** de nível 1 e **1.838 subpastas** de nível 2 — espelham **exatamente** `LIBRARY1_STRUCTURE` (Seção 4). Verificado por script: 1838/1838 casam, 0 faltando, 0 sobrando.
- Em 2026-07-25 a pasta continha **as pastas criadas, mas nenhum arquivo de conteúdo ainda** (só `.DS_Store`). O usuário informou que preencherá **em ordem**, para não se perder.
- O material de um tópico vai **dentro da subpasta daquele tópico**. O caminho é a classificação — não é preciso inferir taxonomia pelo conteúdo.

### 2.1 Formato do material: PRINTS E IMAGENS (definido pelo usuário, 2026-07-25)

Dentro de cada subpasta de tópico o usuário coloca **prints (screenshots) e imagens** do conteúdo daquele tópico. **Não há texto digitado** — a fonte é sempre visual.

**A tarefa é transcrever esses prints para uma página**, de modo que ao clicar no tópico no site abra uma página **igual ao que está nas imagens**: mesma sequência de seções, mesmos títulos, mesmas tabelas, mesmas listas, mesmos destaques. A página é a transcrição fiel do print, não um resumo dele (Seção 1).

- **Ordem de leitura:** ordenar os arquivos pelo nome (print 1, print 2, …) — a numeração do usuário é a ordem do conteúdo. Se a ordem não estiver clara pelos nomes, deduzir pela continuidade do texto entre as imagens.
- **Figuras/diagramas dentro do print:** quando o print contém uma figura que é conteúdo (diagrama, algoritmo, foto clínica, tabela como imagem), recortar e salvar como imagem em `public/assets/library1/<subject-slug>/` e referenciar no HTML — não tentar redesenhar em texto. Mesmo processo de recorte/redimensionamento já usado no QBank (`QBANK_ADD_QUESTION.md` §19).
- **Texto que dá para transcrever, transcreve.** Só vira imagem o que é genuinamente gráfico.

### 2.2 Subpasta vazia = material ainda não colocado

Regra do usuário (2026-07-25): quando uma subpasta de tópico está **vazia, é porque ele ainda não colocou o material** — não é erro, não é conteúdo faltando, não é para perguntar.

**Comportamento correto:** pular a subpasta em silêncio e seguir para a próxima. Nunca marcar ✅ (Seção 10) numa pasta vazia, e nunca criar registro de conteúdo vazio para ela. No site, um tópico sem conteúdo publicado abre normalmente e mostra o aviso de "conteúdo ainda não incluído" — comportamento já implementado e testado.

---

## 3. MAPEAMENTO pasta do disco → tópico do site

O macOS não aceita alguns caracteres em nome de pasta, então os nomes no disco são uma versão saneada dos nomes do site. Regra de normalização **verificada contra os 1.838 tópicos** (aplicar sobre o nome do site para achar a pasta):

| Transformação | Exemplo (site → disco) |
|---|---|
| `/` → ` - ` | `Allergic/irritant contact dermatitis` → `Allergic - irritant contact dermatitis` |
| `:` → ` - ` | `Anatomy: Ear` → `Anatomy - Ear` |
| `<` e `>` → removidos | `Bacterial meningitis (age >1 month)` → `Bacterial meningitis (age 1 month)` |
| ponto final → removido | `…microscopic polyangiitis (MPA).` → `…microscopic polyangiitis (MPA)` |
| espaços duplicados → colapsados | — |
| Unicode → normalizar com **NFC** | o macOS grava acentos em NFD (`Chédiak` decomposto); sem `.normalize('NFC')` dos dois lados a comparação falha em 12 tópicos |
| sufixo ` ✅` → removido antes de comparar | `Chapman points ✅` → `Chapman points` (marca de progresso, Seção 10 — **nunca** faz parte do nome do tópico) |

Snippet de referência (Node) para casar disco ↔ site:

```js
const stripCheck = s => s.replace(/\s*✅\s*$/u, '').trim();
const norm = s => stripCheck(s.normalize('NFC'))
  .replace(/\s*[\/:]\s*/g, ' - ')
  .replace(/[<>]/g, '')
  .replace(/\.+$/, '')
  .replace(/\s+/g, ' ').trim();
```

> ⚠️ O `stripCheck` é obrigatório desde que a marcação de progresso passou a existir (Seção 10): a partir da primeira leva incluída, várias pastas terão ` ✅` no nome. Comparar sem removê-lo faz o tópico parecer "não encontrado".

> ⚠️ Sempre comparar com `.normalize('NFC')` **nos dois lados**. Sem isso, tópicos com acento (Chédiak, Ménière, Müllerian, Waldenström, Behçet, Sjögren, Guillain-Barré, Legg-Calvé-Perthes, Henoch-Schönlein) parecem "faltando" sem estar.

---

## 4. ESTRUTURA ATUAL DA LIBRARY 1 NO SITE

**Arquivo:** `public/js/library1-structure.js` → define `window.LIBRARY1_STRUCTURE`.

```js
window.LIBRARY1_STRUCTURE = [
  { name:"Allergy & Immunology", ptName:"Alergia e Imunologia", items:[
      { name:"Acute rheumatic fever", ptName:"Febre reumática aguda" },
      ...
  ]},
  ...
];
```

- **26 Subjects × 1.838 tópicos**, todos com `name` (EN) e `ptName` (PT-BR já bakeado — não depende do motor de tradução ao vivo).
- Contagem por Subject (2026-07-25): Infectious Diseases 176 · Gastroenterology 137 · Cardiology 114 · Hematology & Oncology 107 · Neurology 102 · Rheumatology/Orthopedics 98 · Preclinical/Basic sciences 97 · Psychiatry 89 · Gynecology 86 · Pulmonary & Critical Care 82 · Pharmacology 78 · Dermatology 77 · Obstetrics 69 · Nephrology 67 · Endocrinology 60 · ENT 57 · Cell Bio/Biochem/Genetics 51 · Anatomy & Histology 44 · Male Reproductive System 44 · Ophthalmology 40 · Allergy & Immunology 36 · Embryology 32 · Physiology 28 · Toxicology 26 · Social Sciences 25 · Osteopathic principles 16.

**Renderização:** `public/js/site.js`, função `renderLibrary()` (~linha 543-573). Hoje são **2 níveis**:

1. Lista das 26 pastas → clique navega para `app.html?page=library-1&u={user}&folder={slug}`.
2. Lista dos tópicos da pasta aberta.

**Estado dos tópicos:** até 2026-07-25 eram **links mortos** (`href="#"` + `preventDefault()`). Desde então há um **3º nível**: o tópico abre como página no leitor embutido (Seção 7), com deep link `app.html?page=library-1&u=<user>&folder=<slug>&topic=<slug>`. Um tópico cujo conteúdo ainda não foi incluído abre e mostra o aviso de "conteúdo ainda não incluído" — nunca dá erro.

O slug da pasta vem de `slugify()` (`site.js:530`): minúsculas, `&` → `and`, tudo que não for `[a-z0-9]` → `-`, sem hífen nas pontas.

**Busca global:** `site.js:1703-1707` já indexa pastas e tópicos da Library 1, mas todo tópico ainda aponta para a pasta-mãe. Agora que o 3º nível existe (Seção 7), **falta atualizar esse `href` para apontar ao tópico real** (`&topic=<slug>`) — pendência conhecida, não bloqueia a inclusão de conteúdo.

---

## 5. ONDE O CONTEÚDO É ARMAZENADO — ✅ IMPLEMENTADO (2026-07-25)

**Um arquivo por Subject** em `public/js/library1-content/<subject-slug>.js`, carregado **sob demanda** (só quando um tópico daquele Subject é aberto). Modelo comentado em `public/js/library1-content/_TEMPLATE.js` — o `_` no início garante que ele nunca colida com um slug de Subject e nunca seja carregado.

```js
window.LIBRARY1_CONTENT = window.LIBRARY1_CONTENT || {};
window.LIBRARY1_CONTENT['allergy-and-immunology'] = {
  'anaphylaxis': {
    en: { title:'Anaphylaxis',  html:`<h2>Clinical features</h2><p>…</p>` },
    pt: { title:'Anafilaxia',   html:`<h2>Achados clínicos</h2><p>…</p>` }
  }
};
```

Razões da escolha (todas verificadas):
1. **Fora do `public/js/qbank.js`**, que é do fluxo paralelo do QBank — nunca conflita (Seção 10).
2. **Granular por Subject**: duas sessões em Subjects diferentes nunca tocam o mesmo arquivo.
3. **Sob demanda**: 1.838 tópicos num arquivo só seria inviável (o `qbank.js` já tem ~1,7 MB).
4. **EN + PT no mesmo registro** (Seção 6), o que torna a troca de idioma instantânea.

**Regras de formato** (detalhadas no `_TEMPLATE.js`): sem `<h1>` no corpo (o leitor desenha o título a partir de `title`); sem `style=` inline, `<script>` ou `<style>`; imagens em `public/assets/library1/<subject-slug>/` referenciadas por caminho absoluto; escapar crase e `${` dentro do template literal; rodar `node --check` no arquivo ao terminar.

---

## 6. BILÍNGUE EN + PT — regra obrigatória do site inteiro

Regra vigente para **todo** o site (QBank, Flashcards, Medical Library): o conteúdo entra em **inglês e português no mesmo commit**, nunca "PT depois".

- Nomes de Subject/tópico já têm `ptName` pré-gravado em `library1-structure.js` — reaproveitar, não retraduzir.
- O corpo do conteúdo precisa de tradução PT-BR fiel, gravada junto (não depender de tradução ao vivo).
- Imagem em PT só quando o usuário fornecer a versão em português; caso contrário, usar a imagem original.

---

## 7. O LEITOR DE PÁGINA E A TOOLBAR — ✅ IMPLEMENTADO (2026-07-25)

**Pedido do usuário:** ao clicar numa das 1.838 subpastas, abrir **uma página normal, com toolbar igual à da Library 3**. E — regra permanente — **toda modificação feita numa das duas toolbars tem de ser feita na outra também.**

**Arquivos:**
| Arquivo | Papel |
|---|---|
| `public/js/library1-reader.js` | o leitor de página (equivalente ao `library3-reader.js`) |
| `public/css/library1-reader.css` | **só** o específico do modo página (artigo, marcação em texto, busca, idioma) |
| `public/css/library3-reader.css` | **a toolbar inteira** — usada pelas duas Libraries |
| `public/js/site.js` (~553) | o tópico deixou de ser link morto e abre o leitor; deep link `&topic=` |
| `public/app.html` | carrega `library1-reader.js` no boot |

### 7.1 Como a paridade das toolbars é garantida

A toolbar da Library 1 usa **exatamente as mesmas classes `.l3r-*`** da Library 3 e **o mesmo arquivo CSS**. Isso não é coincidência de estilo: é o mecanismo que faz a regra do usuário se cumprir sozinha — qualquer ajuste visual em `library3-reader.css` aparece nas duas na mesma hora, sem ninguém precisar lembrar.

O que **não** é compartilhado automaticamente é o comportamento em JS (os dois leitores têm arquivos próprios, porque um é PDF e o outro é HTML). **Portanto: ao mexer no comportamento de um botão da toolbar, aplicar a mesma mudança nos dois arquivos, no mesmo commit.** Os ícones SVG, as 4 cores de marca-texto e os rótulos traduzidos estão duplicados nos dois arquivos justamente para ficarem visíveis lado a lado — se mudar num, mudar no outro.

### 7.2 O que é igual e o que muda (e por quê)

| Grupo da toolbar | Library 3 (PDF) | Library 1 (página) |
|---|---|---|
| Voltar, título, busca | igual | igual (busca no texto da página, com contador e Enter/Shift+Enter) |
| Marca-texto + 4 cores + cor customizada | igual | igual |
| Borracha, desfazer/refazer | igual | igual |
| Notebook / Notes / Flashcard | igual (`?prefill=`) | igual (`?prefill=`) |
| Navegação de página (‹ 1 de N ›) | existe | **não existe** — página única, rolagem contínua |
| Zoom do canvas (%) | existe | vira **tamanho da fonte** (A− / A+), mesma posição e mesmo visual |
| Download | o PDF original | **dois botões: EN e PT** |
| Idioma | não traduz (só por seleção) | **botões EN/PT**, troca instantânea |
| Caneta livre, Post-it, anotação de página | existe | **ainda não** — dependem de camada de desenho sobre canvas; ficam para uma fase seguinte |

### 7.3 Tradução — a diferença essencial em relação à Library 3

A Library 3 é um **arquivo PDF pronto** e por decisão do usuário não traduz a página inteira (só tradução por seleção). A Library 1 é **página**, então funciona ao contrário: o material de origem vem em inglês e é **gravado nos dois idiomas no momento da inclusão** (Seção 6). Trocar de idioma no leitor apenas troca qual versão é exibida — **instantâneo, sem chamada de tradução ao vivo**, e sem depender de rede.

### 7.4 Marcação sobre texto (diferente do PDF)

No PDF a marcação é geométrica (retângulos sobre o canvas). Aqui o conteúdo é texto real, então cada marcação é gravada como **deslocamento de caractere** sobre o texto do artigo, em `localStorage` na chave `couplemed_lib1hl_<user>`, indexada por `<subject-slug>/<topic-slug>`.

Duas consequências que importam:
- **A marcação é por idioma.** Os textos EN e PT têm tamanhos diferentes, então cada versão guarda seus próprios deslocamentos. Marcar em inglês não faz aparecer marca no português — comportamento intencional e testado.
- **Reescrever um conteúdo já publicado desloca as marcações antigas daquele tópico.** Evitar reescrever conteúdo já revisado sem necessidade.

### 7.5 Estado de verificação

Testado em 2026-07-25 com DOM real (jsdom), 35 verificações, todas passando: montagem da toolbar, render bilíngue, troca de idioma, tamanho de fonte, marcação (criação, cor, persistência, isolamento por idioma), desfazer/refazer, borracha, busca (ocorrências, contador, integridade do texto ao limpar), download EN e PT com nomes distintos, botão voltar e o estado de "tópico ainda sem conteúdo".

Um bug real foi encontrado e corrigido nesse teste: quando a seleção começava num **elemento** em vez de num nó de texto (parágrafo inteiro, triplo-clique, arrasto começando antes da primeira letra), o deslocamento nunca casava e a marcação falhava em silêncio. A medição passou a ser feita com um `Range` auxiliar (`offsetOfPoint`), que trata os dois casos.

---

## 8. INTEGRAÇÃO COM O QBANK 1 — tags clicáveis (requisito do usuário)

**Pedido do usuário (2026-07-25):** as tags exibidas no QBank 1, **ao serem clicadas, devem levar ao conteúdo da Library 1**. É isto que faz os dois módulos se completarem.

### 8.1 Como as tags funcionam hoje (verificado)

Em `public/js/qbank.js`, `renderQuestionMeta()` (~linha 9847) desenha 3 pílulas ao final da explicação, derivadas de `metaFor(q)` (~linha 9045):

| Pílula | Origem | Comportamento atual |
|---|---|---|
| **Subject** | `q.discipline` | `data-act="meta-filter"` → **filtra questões** no próprio QBank |
| **System** | `q.system` | idem |
| **Topic** | parte após `::` em `q.category` | idem |

Abaixo delas há um `<small>` com o texto `Medical Library > Library 1 > {System} > {Topic}` (`m.libraryPath`, `qbank.js:9060`) — hoje é **texto puro, não é link**.

### 8.2 O obstáculo real (medido em 2026-07-25)

Os dois módulos usam **vocabulários diferentes**, então não existe ligação automática 1:1:

- **Systems:** QBank tem 26, Library 1 tem 26 — mas só **9 nomes coincidem**. O QBank usa nomes por sistema (`Cardiovascular System`, `Nervous System`, `Renal, Urinary Systems & Electrolytes`), a Library 1 usa nomes por especialidade (`Cardiology`, `Neurology`, `Nephrology`).
- **Topics:** QBank tem **151 topics amplos** (categorias tipo "Cardiac arrhythmias", "Thyroid disorders"); a Library 1 tem **1.838 tópicos específicos** (artigos tipo "Atrial fibrillation"). Apenas **9 nomes** são idênticos nos dois.

Conclusão: o "Topic" do QBank é uma **categoria**, o tópico da Library 1 é um **artigo**. Um link direto por nome resolveria menos de 1% dos casos.

### 8.3 Caminhos possíveis — ⏳ PENDENTE DE DECISÃO DO USUÁRIO

1. **Tabela de-para de Systems (26→26), link no nível da pasta.** Barato, cobre 100% das questões, mas leva à lista da pasta, não ao artigo.
2. **Campo novo por questão** (ex.: `lib1:'cardiology/atrial-fibrillation'`) apontando o artigo exato. Precisão total, mas exige preencher questão a questão (e são +3.000 por vir) — teria de entrar no procedimento do `QBANK_ADD_QUESTION.md`.
3. **Híbrido (recomendado):** de-para de Systems como piso garantido para toda questão + campo opcional de artigo exato quando o tópico for óbvio. Nunca deixa o clique "morto" e permite refinar aos poucos.

Registrar a decisão aqui quando tomada. Se a opção envolver mexer no QBank, **coordenar com a sessão do QBank** — a mudança em `qbank.js` pertence àquele fluxo (Seção 10).

---

## 9. TESTAR LOCALMENTE

Mesma infraestrutura do QBank (`QBANK_ADD_QUESTION.md` §20):

```bash
# Sem servidor/login — abrir direto no navegador:
public/app.html?page=library-1&u=guest1

# Pasta específica (slug via slugify, ver Seção 4):
public/app.html?page=library-1&u=guest1&folder=allergy-and-immunology

# Tópico específico (o que foi acabado de incluir):
public/app.html?page=library-1&u=guest1&folder=allergy-and-immunology&topic=anaphylaxis
```

Também dá para exercitar o leitor sem browser, num DOM real, com o mesmo teste usado na implementação (jsdom, 35 verificações) — útil quando a mudança é de comportamento da toolbar e não de conteúdo.

Checklist antes de commitar:
- [ ] `node --check` em todo arquivo `.js` alterado.
- [ ] O tópico abre e mostra o conteúdo, nos **dois** idiomas (botões EN/PT).
- [ ] Download EN e PT gera arquivo com o conteúdo certo.
- [ ] Conteúdo confere **verbatim** com os prints de origem (Seção 1).
- [ ] Versão PT presente no mesmo commit (Seção 6).
- [ ] ✅ aplicado nas subpastas concluídas (Seção 11).
- [ ] Nenhum arquivo do fluxo do QBank foi tocado (Seção 10).
- [ ] Se a toolbar mudou: a mesma mudança foi aplicada na Library 3 (Seção 7.1).

---

## 10. TRABALHO CONCORRENTE — Library 1 e QBank ao mesmo tempo

**Regra do usuário (2026-07-25):** as duas inclusões rodam **simultaneamente, em chats/sessões diferentes**, porque ainda faltam +3.000 questões no QBank. Para as sessões não se atrapalharem:

| | Fluxo QBank 1 | Fluxo Library 1 |
|---|---|---|
| Documento | `QBANK_ADD_QUESTION.md` | `LIBRARY1_ADD_CONTENT.md` (este) |
| Pasta de origem | `~/Desktop/Questões Novas QBank 1/` | `~/Desktop/Adicionar Library 1/` |
| Arquivo de dados | `public/js/qbank.js` | `public/js/library1-content/*` (Seção 5) |
| Gatilho | "adicionar questões novas" | "adicionar Library 1" |

**Obrigações de cada sessão:**
1. **Nunca editar o arquivo de dados do outro fluxo.** A sessão da Library 1 não toca `qbank.js`; a do QBank não toca o conteúdo da Library 1.
2. **Commitar só os próprios arquivos** — usar `git add <caminhos específicos>`, nunca `git add -A` / `git add .`, que arrastaria trabalho em andamento da outra sessão.
3. **Antes de commitar, `git pull --rebase`** — a outra sessão pode ter publicado no meio do caminho.
4. Ver commits "aparecendo sozinhos" no `git log` é **esperado**, não é bug: é a outra sessão trabalhando.
5. Se um arquivo realmente precisar ser tocado pelos dois (ex.: `site.js` para o link das tags, Seção 7), fazer a alteração **num só lado** e em commit isolado e pequeno, para reduzir a janela de conflito.

---

## 11. MARCAÇÃO DE PROGRESSO NA PASTA DO DESKTOP (✅)

**Pedido do usuário (2026-07-25):** ele quer saber de relance, olhando a própria pasta, o que já foi incluído — sem precisar abrir o site.

**Regra:**
1. Ao terminar de incluir **um tópico**, acrescentar ` ✅` ao final do nome da subpasta daquele tópico.
2. Quando **todos** os tópicos de um Subject estiverem concluídos, acrescentar ` ✅` também à pasta do Subject (ex.: `Allergy & Immunology ✅`).
3. **Nunca** marcar pasta vazia (Seção 2.2) — vazia significa material ainda não colocado, não tópico pronto.
4. O ✅ é **sufixo**, nunca prefixo: preserva a ordem alfabética da pasta e é removido por `stripCheck()` em toda comparação de nome (Seção 3).

**Ferramenta:** `tools/library1-progress.js` (no repo), que faz isso sem risco de errar o nome da pasta:

```bash
node tools/library1-progress.js status
    # tabela por Subject: incluídos / com material aguardando / total + % geral

node tools/library1-progress.js mark "Allergy & Immunology" "Anaphylaxis"
    # marca o tópico; se o Subject ficar completo, marca a pasta do Subject sozinho

node tools/library1-progress.js sync
    # reconcilia TUDO com o que está publicado em public/js/library1-content/:
    # marca o que está incluído e DESMARCA o que não está
```

A fonte da verdade é sempre o **conteúdo publicado**, não o ✅ — por isso existe o `sync`, que corrige a pasta caso alguém marque à mão ou um conteúdo seja removido. Comportamento verificado em 2026-07-25 numa cópia de teste: marcação, idempotência (marcar duas vezes não duplica o símbolo), promoção automática do Subject ao completar todos os tópicos, e desmarcação pelo `sync`.

---

## 12. HISTÓRICO DE DECISÕES

| Data | Decisão / achado |
|---|---|
| 2026-07-25 | Arquivo criado. Verificado: pasta de origem espelha 1838/1838 tópicos; tópicos no site eram links mortos (`site.js:558,561`); vocabulários de QBank e Library 1 divergem (só 9 systems e 9 topics coincidem). |
| 2026-07-25 | **Formato do material definido:** prints e imagens dentro de cada subpasta, a transcrever para página fiel ao print (§2.1). Subpasta vazia = material ainda não colocado, pular em silêncio (§2.2). |
| 2026-07-25 | **Armazenamento definido e implementado:** um arquivo por Subject em `public/js/library1-content/`, carregado sob demanda, com EN+PT no mesmo registro (§5). |
| 2026-07-25 | **Leitor de página implementado** com a toolbar espelhada da Library 3, CSS compartilhado, tradução instantânea EN/PT e download nos dois idiomas (§7). 35 testes em jsdom passando; corrigido bug de seleção iniciada em elemento. |
| 2026-07-25 | **Marcação de progresso ✅ implementada** em `tools/library1-progress.js`, com `status`/`mark`/`sync`; `stripCheck()` incorporado à regra de normalização (§3, §11). |
| — | **Pendentes:** estratégia de link das tags do QBank (§8.3); caneta livre/Post-it/anotação no leitor (§7.2); `href` do tópico na busca global (§4). |
