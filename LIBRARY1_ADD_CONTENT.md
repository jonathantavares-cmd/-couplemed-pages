# CoupleMed Library 1 — Documentação Completa (inclusão de conteúdo)

> Referência definitiva do módulo **Medical Library › Library 1**: como incluir o material de estudo nas pastas/tópicos que já existem no site, como o conteúdo é armazenado, e como a Library 1 se conecta ao QBank 1.
>
> **Este arquivo é autossuficiente.** Quando o usuário disser apenas "adicionar Library 1" (ou variação), leia este arquivo do início ao fim antes de agir.
>
> ⚠️ **Este arquivo é DIFERENTE e INDEPENDENTE do `QBANK_ADD_QUESTION.md`.** São dois fluxos de trabalho distintos, com funções e tarefas diferentes, que rodam **ao mesmo tempo em sessões/chats separados** (regra do usuário, 2026-07-25 — ainda faltam +3.000 questões a adicionar no QBank). Nunca misture os dois procedimentos, nunca edite os arquivos do outro fluxo, e nunca trate um como continuação do outro. Ver **Seção 9 (Trabalho concorrente)** — é a seção que evita que as duas sessões briguem por arquivo/commit.
>
> Última auditoria contra o código real: 2026-07-25 (criação do arquivo).

---

## 0. PROCEDIMENTO PADRÃO — o que fazer quando o usuário disser "adicionar Library 1"

Gatilhos reconhecidos: **"adicionar Library 1"**, "adicionar conteúdo à Library 1", "incluir material da Library 1", ou variação equivalente que cite a Library 1.

1. **Ler este arquivo (`LIBRARY1_ADD_CONTENT.md`) do início ao fim.** Não usar memória de sessões anteriores como fonte.
2. **Abrir e varrer a pasta de origem** `/Users/jonathan/Desktop/Adicionar Library 1/` (Seção 2), recursivamente, e **visualizar o conteúdo** de cada arquivo encontrado. Não pedir material ao usuário antes de checar a pasta — só pedir se a pasta estiver sem nenhum arquivo novo desde a última leva.
3. **Identificar, para cada arquivo, a qual tópico do site ele pertence** — o caminho da pasta já é a resposta (Seção 3: `Subject/Tópico/arquivo`). Não adivinhar por conteúdo quando o caminho já diz.
4. **Aplicar a Regra de Fidelidade (Seção 1)** — o material é conteúdo próprio do usuário; transcrever verbatim.
5. **Gravar o conteúdo** no arquivo de destino correspondente (Seção 5), sempre **bilíngue EN + PT no mesmo commit** (Seção 6).
6. **Validar**: `node --check` no(s) arquivo(s) alterado(s) + conferir que o tópico abre no site (Seção 8).
7. **Commit e push automáticos**, sem esperar aprovação (mesma política do QBank — permissões em bypass global). Commitar **apenas** os arquivos da Library 1 (Seção 9).
8. **Processar a pasta inteira**, quantos arquivos forem — em lotes, seguindo automaticamente lote após lote, sem perguntar se deve continuar.

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

### 2.1 Formato dos arquivos de material — ⏳ PENDENTE DE DEFINIÇÃO

Até 2026-07-25 nenhum arquivo havia sido colocado na pasta, então **o formato ainda não foi observado** (pode ser imagem/screenshot, PDF, .docx, .txt, .md…). Assim que a primeira leva chegar, **atualizar esta seção com o formato real** e o procedimento de extração correspondente. Não presumir formato antes de ver.

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

Snippet de referência (Node) para casar disco ↔ site:

```js
const norm = s => s.normalize('NFC')
  .replace(/\s*[\/:]\s*/g, ' - ')
  .replace(/[<>]/g, '')
  .replace(/\.+$/, '')
  .replace(/\s+/g, ' ').trim();
```

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

**Estado dos tópicos (verificado 2026-07-25):** são **links mortos**. Em `site.js:558` cada tópico é renderizado como `<a class="lib-book lib-topic" href="#" data-no-nav>` e em `site.js:561` o clique recebe `e.preventDefault()`. Ou seja: o índice completo existe, **mas não há nenhum conteúdo por trás dele** — é exatamente isso que este documento vem preencher.

O slug da pasta vem de `slugify()` (`site.js:530`): minúsculas, `&` → `and`, tudo que não for `[a-z0-9]` → `-`, sem hífen nas pontas.

**Busca global:** `site.js:1703-1707` já indexa pastas e tópicos da Library 1, mas todo tópico aponta hoje só para a pasta-mãe. Quando o 3º nível existir, atualizar o `href` para o tópico real.

---

## 5. ONDE O CONTEÚDO SERÁ ARMAZENADO — ⏳ PENDENTE DE DEFINIÇÃO

Nada foi implementado ainda. A decisão depende do formato do material (Seção 2.1) e **deve ser confirmada com o usuário antes da primeira leva**. Requisitos que a solução precisa atender:

1. **Não pode ficar em `public/js/qbank.js`.** Esse arquivo é do fluxo do QBank, que roda em sessão paralela — escrever nele causaria conflito de merge (Seção 9).
2. **Não pode ser um arquivo único gigante.** `qbank.js` já tem ~1,7 MB com ~250 questões; 1.838 artigos num só arquivo tornaria o carregamento inviável.
3. **Deve ser granular por Subject**, para que duas sessões trabalhando em Subjects diferentes nunca toquem o mesmo arquivo.
4. **Deve suportar EN + PT** no mesmo registro (Seção 6).

**Proposta (a validar com o usuário):** um arquivo por Subject em `public/js/library1-content/<subject-slug>.js`, carregado sob demanda quando a pasta é aberta, com um registro por tópico contendo o conteúdo EN e PT. Registrar aqui a decisão final assim que tomada, com o schema exato do registro.

---

## 6. BILÍNGUE EN + PT — regra obrigatória do site inteiro

Regra vigente para **todo** o site (QBank, Flashcards, Medical Library): o conteúdo entra em **inglês e português no mesmo commit**, nunca "PT depois".

- Nomes de Subject/tópico já têm `ptName` pré-gravado em `library1-structure.js` — reaproveitar, não retraduzir.
- O corpo do conteúdo precisa de tradução PT-BR fiel, gravada junto (não depender de tradução ao vivo).
- Imagem em PT só quando o usuário fornecer a versão em português; caso contrário, usar a imagem original.

---

## 7. INTEGRAÇÃO COM O QBANK 1 — tags clicáveis (requisito do usuário)

**Pedido do usuário (2026-07-25):** as tags exibidas no QBank 1, **ao serem clicadas, devem levar ao conteúdo da Library 1**. É isto que faz os dois módulos se completarem.

### 7.1 Como as tags funcionam hoje (verificado)

Em `public/js/qbank.js`, `renderQuestionMeta()` (~linha 9847) desenha 3 pílulas ao final da explicação, derivadas de `metaFor(q)` (~linha 9045):

| Pílula | Origem | Comportamento atual |
|---|---|---|
| **Subject** | `q.discipline` | `data-act="meta-filter"` → **filtra questões** no próprio QBank |
| **System** | `q.system` | idem |
| **Topic** | parte após `::` em `q.category` | idem |

Abaixo delas há um `<small>` com o texto `Medical Library > Library 1 > {System} > {Topic}` (`m.libraryPath`, `qbank.js:9060`) — hoje é **texto puro, não é link**.

### 7.2 O obstáculo real (medido em 2026-07-25)

Os dois módulos usam **vocabulários diferentes**, então não existe ligação automática 1:1:

- **Systems:** QBank tem 26, Library 1 tem 26 — mas só **9 nomes coincidem**. O QBank usa nomes por sistema (`Cardiovascular System`, `Nervous System`, `Renal, Urinary Systems & Electrolytes`), a Library 1 usa nomes por especialidade (`Cardiology`, `Neurology`, `Nephrology`).
- **Topics:** QBank tem **151 topics amplos** (categorias tipo "Cardiac arrhythmias", "Thyroid disorders"); a Library 1 tem **1.838 tópicos específicos** (artigos tipo "Atrial fibrillation"). Apenas **9 nomes** são idênticos nos dois.

Conclusão: o "Topic" do QBank é uma **categoria**, o tópico da Library 1 é um **artigo**. Um link direto por nome resolveria menos de 1% dos casos.

### 7.3 Caminhos possíveis — ⏳ PENDENTE DE DECISÃO DO USUÁRIO

1. **Tabela de-para de Systems (26→26), link no nível da pasta.** Barato, cobre 100% das questões, mas leva à lista da pasta, não ao artigo.
2. **Campo novo por questão** (ex.: `lib1:'cardiology/atrial-fibrillation'`) apontando o artigo exato. Precisão total, mas exige preencher questão a questão (e são +3.000 por vir) — teria de entrar no procedimento do `QBANK_ADD_QUESTION.md`.
3. **Híbrido (recomendado):** de-para de Systems como piso garantido para toda questão + campo opcional de artigo exato quando o tópico for óbvio. Nunca deixa o clique "morto" e permite refinar aos poucos.

Registrar a decisão aqui quando tomada. Se a opção envolver mexer no QBank, **coordenar com a sessão do QBank** — a mudança em `qbank.js` pertence àquele fluxo (Seção 9).

---

## 8. TESTAR LOCALMENTE

Mesma infraestrutura do QBank (`QBANK_ADD_QUESTION.md` §20):

```bash
# Sem servidor/login — abrir direto no navegador:
public/app.html?page=library-1&u=guest1

# Pasta específica (slug via slugify, ver Seção 4):
public/app.html?page=library-1&u=guest1&folder=allergy-and-immunology
```

Checklist antes de commitar:
- [ ] `node --check` em todo arquivo `.js` alterado.
- [ ] O tópico abre e mostra o conteúdo (não cai em link morto).
- [ ] Conteúdo confere **verbatim** com o material de origem (Seção 1).
- [ ] Versão PT presente no mesmo commit (Seção 6).
- [ ] Nenhum arquivo do fluxo do QBank foi tocado (Seção 9).

---

## 9. TRABALHO CONCORRENTE — Library 1 e QBank ao mesmo tempo

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

## 10. HISTÓRICO DE DECISÕES

| Data | Decisão / achado |
|---|---|
| 2026-07-25 | Arquivo criado. Verificado: pasta de origem espelha 1838/1838 tópicos; tópicos no site são links mortos (`site.js:558,561`); vocabulários de QBank e Library 1 divergem (só 9 systems e 9 topics coincidem). Pendentes: formato do material (§2.1), armazenamento (§5), estratégia de link das tags (§7.3). |
