# CoupleMed — Adicionar Questões ao QBank 1

> Manual operacional do fluxo **QBank 1**. Não usar este arquivo para adicionar conteúdo à Library 1.
>
> Arquivo de dados: `public/js/qbank.js` (`SEED`).
> Assets: `public/assets/qbank/`.
> QA responsivo: `RESPONSIVE_BREAKPOINTS.md` é a fonte canônica.

## 1. Resultado obrigatório

Uma execução só está concluída quando:

- todas as fontes elegíveis foram inventariadas;
- cada questão nova foi transcrita fielmente em inglês;
- `ptTranslation` foi incluída e revisada em PT-BR;
- `labs` foi avaliado pelo algoritmo deste manual;
- imagens do enunciado e da explicação, **quando existirem**, foram recortadas,
  refinadas e conferidas;
- IDs, taxonomia, dificuldade, alternativas, assets e sintaxe foram validados;
- o preview e o QA responsivo foram aprovados;
- apenas os arquivos da tarefa foram commitados e o branch atual foi enviado com `git push`;
- somente depois do push confirmado, pastas/subpastas concluídas receberam `✅`.

Se uma fonte estiver incompleta, ilegível ou realmente ambígua, **não inventar**. Marcar somente esse item como bloqueado, continuar os itens independentes e pedir ao usuário os dados faltantes. Uma pasta com qualquer item bloqueado não recebe `✅`.

---

## 2. Escopo e gatilho

### 2.1 Material anexado na conversa

Usar os anexos fornecidos. Se o destino não estiver explícito, identificar `system`, `category` e `discipline` pelo material e pela taxonomia real do código. Ambiguidade que altere o destino exige escalonamento conforme a Seção 3.

### 2.2 Pedido sem material anexado

Quando o usuário disser “adicionar/incluir questões novas” ou equivalente sem anexos:

1. Ler este manual.
2. Localizar `/Users/jonathan/Desktop/Questões Novas QBank 1/`.
3. Varrer recursivamente em ordem natural.
4. Pular qualquer pasta/subpasta cujo **próprio nome** termine com `✅`.
5. Processar todas as fontes das pastas sem `✅`.

Não criar uma segunda pasta se o caminho não resolver por diferença de normalização Unicode do acento. Localizar a pasta existente no Desktop e reutilizá-la.

Extensões de fonte usuais: `.png`, `.jpg`, `.jpeg`, `.webp`, `.heic` e `.pdf`. O próprio `QBANK_ADD_QUESTION.md` dentro da pasta é documentação, não uma questão.

### 2.3 Pasta física define o destino

- A pasta principal define o sistema.
- A subpasta define o tópico de `category`.
- Remover apenas o prefixo numérico e o sufixo `✅` ao comparar o nome da pasta com a taxonomia.
- `Others`, `Others : Miscellaneous` e `Miscellaneous` correspondem a `misc`.
- No nome de pasta, a barra `/` do nome canônico é gravada como `:` pelo sistema de arquivos (o Finder exibe `/`). Tratar `/` e `:` como equivalentes ao comparar com a taxonomia; o hífen `-` legado (ex.: `Psychiatric-Behavioral`) é equivalente à barra.
- Não reclassificar por preferência pessoal.
- Se o conteúdo for claramente incompatível com a pasta, não mover a fonte e não adivinhar: marcar conflito, escalonar e continuar os demais itens seguros.

---

## 3. Escolha e escalonamento de modelo

Escalonar a menor unidade possível — uma questão ou subpasta, não necessariamente a leva inteira. Nunca usar um modelo inferior para “preencher” uma incerteza.

| Nível | Usar quando | Não delegar a este nível |
|---|---|---|
| **modelo econômico — medium** | inventário; ordenação; busca de duplicidade; alocação mecânica de ID; inserção de texto já estruturado e perfeitamente legível; execução de validações determinísticas | OCR duvidoso; decisão médica; tradução médica final; pesquisa de Lab Values; crop que exija julgamento; taxonomia nova |
| **modelo econômico — high** | fluxo padrão de questão legível; conferência visual de múltiplos screenshots; tradução médica PT-BR; Lab Values com fonte autoritativa; crop/refinamento; auditoria final comum | conflito persistente entre fontes; imagem diagnóstica muito complexa; mudança estrutural de UI/CSS; nova convenção sem precedente |
| **GPT-5.6-sol — ultra** | fonte ilegível, cortada ou contraditória; tabela/gráfico/radiologia complexos; possível gabarito conflitante; duplicidade incerta; novo sistema/prefixo/tópico; alteração responsiva em CSS; Lab Value de população especial sem faixa estável; auditoria após falhas repetidas | ainda é proibido inventar. Se ultra não resolver com evidência, bloquear e perguntar |

O processamento médico completo normalmente exige **high**. `medium` é adequado para etapas mecânicas ou para uma questão já transcrita e auditada por um nível superior.

### 3.1 Política multiplataforma de modelos e esforços

Os níveis deste guia descrevem a **capacidade necessária para a tarefa**, não
um nome fixo de produto. Modelo e esforço de raciocínio são controles
independentes: selecionar os dois quando a plataforma permitir.

| Nível operacional | Trabalho permitido |
|---|---|
| **econômico — medium** | Trabalho mecânico, previsível e estruturado, sem ambiguidade: inventário, ordenação, aplicação de schema conhecido, edições localizadas e testes determinísticos. |
| **econômico — high** | Tradução médica PT-BR, Lab Values com fonte autoritativa, tabelas densas, OCR ou crop que exija julgamento, QA responsivo comum e auditoria final. |
| **forte — ultra** | Conflito de fontes, ambiguidade médica/visual/estrutural, CSS responsivo crítico, taxonomia nova, regressão ou falha repetida sem causa. |

Regras operacionais:

- [ ] Começar no menor nível seguro.
- [ ] Escalonar somente a menor unidade afetada: trecho, imagem, Lab Value ou
      questão; não promover a leva inteira sem necessidade.
- [ ] Depois da parte crítica, voltar ao nível econômico para as etapas
      mecânicas.
- [ ] Nunca usar capacidade maior como autorização para inventar, completar ou
      “corrigir” a fonte sem evidência.
- [ ] Se a interface não puder trocar modelo/esforço automaticamente, informar
      ao usuário antes da unidade crítica: unidade, motivo, nível necessário e
      ponto de retorno.
- [ ] Se o modelo solicitado não estiver disponível, usar o equivalente mais
      próximo que cumpra o nível e registrar a substituição.

Perfis de execução:

- **máxima economia:** `medium` por padrão, com escalonamento pontual;
- **menor risco / menor intervenção:** `high` no fluxo médico/visual e
  `medium` apenas no trabalho determinístico;
- **ultra pontual:** `ultra` somente na unidade crítica, seguido de retorno ao
  nível anterior.

Relatório mínimo de escalonamento:

```text
Unidade: <trecho/imagem/Lab Value/questão>
Motivo: <ambiguidade ou risco observável>
Nível necessário: <medium|high|ultra>
Retorno: <etapa em que volta ao nível econômico>
```

### 3.2 ChatGPT / Codex

Usar a família atual disponível; não confundir o nome do modelo com o esforço.

| Nível do guia | Modelo preferencial | Esforço |
|---|---|---|
| **medium** | GPT-5.6 Luna; na ausência, GPT-5.4 ou equivalente econômico | `medium` |
| **high** | GPT-5.6 Terra; na ausência, GPT-5.5 ou equivalente intermediário | `high` ou `xhigh` |
| **ultra** | GPT-5.6 Sol | `ultra` no Codex; `max` quando a API não expuser `ultra` |

Se a sessão oferecer somente parte dessas opções, preservar primeiro o nível
de capacidade e registrar o modelo/esforço efetivamente usados. Referência:
[guia oficial de modelos OpenAI](https://developers.openai.com/api/docs/guides/latest-model).

### 3.3 Claude / Claude Code

Preferir os aliases atuais, sem fixar versões que podem envelhecer:

| Nível do guia | Alias/modelo | Esforço |
|---|---|---|
| **medium** | `haiku` | `medium` |
| **high** | `sonnet` | `high`; `max` apenas se a versão ativa oferecer e a unidade justificar |
| **ultra** | `opus` ou `best` | `xhigh` ou `max`, conforme a versão ativa |

O perfil `opusplan` é adequado quando a parte ambígua exige planejamento com
Opus e a execução pode voltar ao Sonnet. Confirmar o modelo resolvido pela
interface antes da unidade crítica. Referência:
[configuração oficial do Claude Code](https://code.claude.com/docs/en/model-config).

#### 3.3.1 O que troca sozinho e o que não troca

Distinção obrigatória — não descrever nenhuma destas como automática sem que
esteja nesta lista:

| Mecanismo | Troca sozinha? |
|---|---|
| Subagente com `model:` no frontmatter (`.claude/agents/*.md`) | **Sim.** Roda no modelo declarado quando a sessão principal delega |
| Perfil `opusplan` | **Parcial.** Planeja em Opus, executa em Sonnet, sem intervenção |
| Modelo da sessão principal | **Não.** Só `/model`, digitado pelo usuário |
| Esforço da sessão principal | **Não muda por conta própria.** O usuário pode alterá-lo com `/effort` ou pelo seletor de `/model`; também pode defini-lo no início por flag, variável de ambiente ou settings |

Não existe hook, setting ou comando que troque o modelo da conversa principal
no meio dela. Qualquer instrução que prometa isso está errada e não deve ser
seguida.

Esforço não é troca de modelo. Conforme a versão ativa, pode ser definido por
`/effort`, seletor de `/model`, `--effort`, `CLAUDE_CODE_EFFORT_LEVEL`,
`effortLevel` nos settings ou `effort` no frontmatter de skill/subagente.
Confirmar o valor ativo na interface; níveis não suportados podem sofrer
fallback. `max` normalmente vale apenas para a sessão, salvo configuração por
variável de ambiente.

#### 3.3.2 Configuração implantada neste repositório

- `.claude/settings.json` (versionado): `model: sonnet`, `effortLevel: medium`.
  É o nível de entrada; sobrepõe o padrão global do usuário apenas neste repo.
- `CLAUDE.md` na raiz: carrega a política em toda sessão aberta nesta pasta.
- `.claude/agents/mecanico.md` — Haiku, **somente leitura**. Delegar sem
  perguntar o trabalho de nível `medium`: inventário, conferência de IDs,
  dedup, contagem de questões/tópicos, checagem de campos obrigatórios.
- `.claude/agents/tradutor-medico.md` — Sonnet com `effort: high`. Delegar
  lotes de tradução EN→PT cujo critério já está neste documento. Não commita
  nem dá push.

Ambos os subagentes devolvem uma seção **Pendências** e são proibidos de
inventar conteúdo; conflito de fontes ou taxonomia nova é devolvido à sessão
principal para escalonar a `ultra`.

Não delegar quando a tarefa depende do contexto acumulado da conversa, é curta
demais (delegar custa mais que fazer) ou exige **decidir** o critério em vez de
aplicá-lo.

### 3.4 Kimi / Kimi Code

Usar os nomes e controles realmente exibidos na instalação atual:

| Nível do guia | Modelo sugerido | Esforço/modo |
|---|---|---|
| **medium** | K3-256k ou K2.7 Code (`kimi-for-coding`) | menor esforço seguro; Thinking pode ficar desligado no trabalho puramente mecânico |
| **high** | K3-256k ou K3 | `high` / Thinking ligado |
| **ultra** | K3 ou o modelo mais forte disponível | `max` / Thinking ligado |

Usar `/model` para conferir ou trocar modelo e Thinking Mode quando disponível.
Opções chamadas **Auto Model**, tiers ou modos Architect/Code/Debug só podem ser
usadas se aparecerem na interface atual; nunca presumir que existem. Registrar
qual modelo foi resolvido automaticamente. Referências:
[modelos do Kimi Code](https://www.kimi.com/code/docs/en/kimi-code/models.html)
e [interação da CLI](https://www.kimi.com/help/kimi-code/cli-interaction).

---

## 4. Pré-voo seguro

Antes de editar:

- [ ] Rodar `git status --short`.
- [ ] Identificar mudanças preexistentes e preservá-las.
- [ ] Não usar reset, checkout destrutivo ou sobrescrita de trabalho alheio.
- [ ] Inventariar as fontes sem `✅` e agrupá-las por questão.
- [ ] Para cada grupo, registrar: caminhos-fonte, pasta/subpasta, destino, ID existente/novo, imagens necessárias e estado.
- [ ] Contar grupos de questão por subpasta.

Um único enunciado pode ocupar vários screenshots; uma mesma captura pode conter enunciado, alternativas, explicação e figura. Agrupar por número exibido, sequência de arquivos, conteúdo e continuidade visual. OCR pode ajudar, mas a imagem deve ser inspecionada visualmente; nunca confiar apenas no OCR.

Manter uma tabela curta de trabalho durante a execução, com: caminhos-fonte,
destino, ID, estado e assets. Ela pode viver no contexto ou em nota temporária
fora do repositório; **não criar nem adicionar ao Git um arquivo de manifesto**
sem pedido explícito. Estados permitidos:

- `PENDENTE`
- `EM_PROCESSAMENTO`
- `AUDITADA`
- `JÁ_EXISTENTE`
- `BLOQUEADA_FONTE`
- `BLOQUEADA_TAXONOMIA`

### Deduplicação obrigatória

Checar duas coisas antes de inserir:

1. **ID:** pesquisar o ID exato em `public/js/qbank.js`.
2. **Conteúdo:** pesquisar um trecho distintivo da vinheta/pergunta e comparar pergunta, alternativas e gabarito.

Checar só o ID **não** torna a retomada segura: a mesma fonte poderia receber outro ID. Se a questão já existir, auditar/corrigir o objeto existente; não criar duplicata.

---

## 5. Fidelidade absoluta ao material

### 5.1 Original em inglês

Transcrever exatamente o que está na fonte:

- `vignette`
- `q`
- todas as `options`
- `correct`
- `explC`
- todo `explI`
- `objective`
- `peer`, quando fornecido

Regras inegociáveis:

- Não resumir, parafrasear, “melhorar”, completar ou corrigir silenciosamente o material.
- Preservar números, casas decimais, unidades, símbolos (`<`, `>`, `≥`, `≤`, `−`, `×`), negações, idade, sexo, temporalidade e ordem das alternativas.
- Não inventar gabarito, explicação, objetivo, alternativa ou percentual.
- Percentuais de `peer` podem não somar 100 por arredondamento. Transcrever sem ajustar e sem tratar a soma como erro.
- Se `peer` não existir na fonte, omitir `peer` e usar dificuldade `medium`.
- Se só parte de `peer` estiver ausente, bloquear a questão; não completar.
- `correct` deve corresponder exatamente a uma label existente.
- `explI` deve cobrir as explicações fornecidas para as incorretas. Se a fonte agrupar letras, manter uma única entrada, por exemplo `option:'B, D, and E'`; não duplicar o mesmo parágrafo.
- **Justificativa das incorretas dentro da explicação geral:** quando a fonte explicar as alternativas incorretas apenas dentro de `explC` (sem seções próprias por alternativa), extrair o trecho correspondente de cada incorreta para `explI`, agrupando as que compartilham a mesma justificativa (ex.: `option:'B, and C'`). Nesse caso `explI` não pode ficar vazio. Extração não é invenção: usar somente o que a fonte afirma sobre cada alternativa, sem criar raciocínio novo. `explI` vazio só é aceito quando a fonte realmente não explica nenhuma incorreta em lugar nenhum.
- Em uma questão com seis alternativas, adicionar `F` a `options` e a `peer` quando este existir. Adicionar `F` a `explI` somente se `F` for incorreta e conforme a fonte.

Se um campo obrigatório estiver realmente ausente ou ilegível, não gerar texto plausível. Bloquear e pedir a fonte correta.

### 5.2 Tradução PT-BR

Toda questão nova deve incluir `ptTranslation` completa no mesmo commit:

- `vignette`
- `q`
- `objective`
- todas as `options`
- `explC`
- todo `explI`

Checklist da tradução:

- [ ] Português brasileiro natural e terminologia médica usada no Brasil.
- [ ] Mesmo conteúdo, nível de certeza e relações causais do inglês.
- [ ] Nenhuma informação adicionada, removida ou “explicada melhor”.
- [ ] Números, unidades, símbolos, doses, vias, genes e siglas preservados.
- [ ] Labels `A`–`F` preservadas.
- [ ] A string `option` de cada explicação agrupada é idêntica em EN e PT.
- [ ] Negação, sexo, idade e cronologia conferidos palavra por palavra.
- [ ] Original em inglês permanece intacto.

Se o usuário também fornecer uma versão PT:

- transcrevê-la como fonte, sem normalização silenciosa;
- se houver erro ortográfico evidente que não altere o sentido, registrar e pedir
  decisão antes de corrigir;
- se PT e EN divergirem em dado clínico, gabarito, número, unidade ou sentido,
  bloquear a questão e pedir decisão;
- nunca publicar uma tradução sabidamente incorreta apenas para manter o fluxo
  automático.

Não existe `ptTranslation.img` nem `ptTranslation.explImg`. Não alterar texto, setas, cores ou pistas de uma figura para “traduzir” a imagem. Manter a figura fiel; traduzir o conteúdo textual nos campos disponíveis. Uma arte visual bilíngue nova é uma tarefa separada e exige escalonamento.

---

## 6. Estrutura do objeto

```js
{
  id:'CMQ-STEP1-CVS-0010',
  system:'cardiovascular',
  discipline:'pathophysiology',
  category:'cardiovascular::valvular_heart_diseases',
  difficulty:'medium',

  vignette:'...',
  q:'...',
  options:[
    {label:'A', text:'...'},
    {label:'B', text:'...'},
    {label:'C', text:'...'},
    {label:'D', text:'...'},
    {label:'E', text:'...'},
  ],
  correct:'A',
  explC:'...',
  explI:[
    {option:'B', explanation:'...'},
    {option:'C, D, and E', explanation:'...'},
  ],
  objective:'...',
  peer:{A:71, B:9, C:12, D:5, E:3},

  img:'assets/qbank/CMQ-STEP1-CVS-0010_nome.png',
  explImg:['assets/qbank/CMQ-STEP1-CVS-0010_expl_parte1.png'],

  labs:[
    ['Exam', 'reference range EN', 'faixa de referência PT',
     'patient-specific meaning EN', 'interpretação específica PT'],
  ],

  ptTranslation:{
    vignette:'...',
    q:'...',
    objective:'...',
    options:[
      {label:'A', text:'...'},
      {label:'B', text:'...'},
      {label:'C', text:'...'},
      {label:'D', text:'...'},
      {label:'E', text:'...'},
    ],
    explC:'...',
    explI:[
      {option:'B', explanation:'...'},
      {option:'C, D, and E', explanation:'...'},
    ],
  },
},
```

Campos condicionais:

- `peer`: somente quando fornecido.
- `img`: imagem do enunciado; string ou array.
- `explImg`: imagem da explicação; string ou array.
- `labs`: condicionalmente obrigatório conforme a Seção 9.
- `library`: omitir. O default é Library 1. Só usar `2`/`3` se o usuário pedir explicitamente outra Library; isso não cria QBank 2/3 funcional.

Inserir no `SEED`, dentro do `// BATCH` do sistema. Criar um batch do sistema somente se não existir.

---

## 7. IDs

Formato: `CMQ-STEP1-{SIGLA}-{NNNN}`.

### 7.1 Regra de alocação

1. Identificar a sigla pelo sistema.
2. Listar os IDs existentes dessa sigla.
3. Usar o maior sufixo numérico + 1.
4. Não reutilizar lacunas.
5. Confirmar a ausência do ID exato imediatamente antes da inserção.
6. Confirmar também ausência de questão duplicada por conteúdo.

Comandos de apoio (substituir `CVS` e o trecho pelos valores reais):

```bash
rg -o 'CMQ-STEP1-CVS-[0-9]{4}' public/js/qbank.js | sort -u | tail -1
rg -n -F 'CMQ-STEP1-CVS-0011' public/js/qbank.js
rg -n -F 'trecho distintivo da pergunta' public/js/qbank.js
```

O primeiro comando apenas informa o maior ID lexicográfico da sigla quando o
sufixo tem quatro dígitos; ainda é obrigatório conferir o número e as buscas
por ID/conteúdo. Resultado vazio é esperado para uma sigla ainda reservada.

### 7.2 Mapa pasta → `system` → sigla

| Pasta | `system` | Sigla |
|---|---|---|
| 01 Biochemistry | `biochemistry` | `BCH` |
| 02 Genetics | `genetics` | `GEN` |
| 03 Microbiology | `microbiology` | `MIC` |
| 04 Pathology | `pathology` | `PAT` |
| 05 Pharmacology | `pharmacology` | `PHR` |
| 06 Biostatistics & Epidemiology | `biostatistics_epidemiology` | `BST` |
| 07 Poisoning & Environmental Exposure | `poisoning_environmental` | `TOX` |
| 08 Allergy & Immunology | `allergy_immunology` | `IMM` |
| 09 Cardiovascular System | `cardiovascular` | `CVS` |
| 10 Dermatology | `dermatology` | `DER` |
| 11 Ear, Nose & Throat | `ent` | `ENT` |
| 12 Endocrine, Diabetes & Metabolism | `endocrine` | `END` |
| 13 Female Reproductive System & Breast | `female_repro_breast` | `FRS` |
| 14 Gastrointestinal & Nutrition | `gi_nutrition` | `GIT` |
| 15 Hematology & Oncology | `heme_onc` | `HEM` |
| 16 Infectious Diseases | `infectious_diseases` | `INF` |
| 17 Male Reproductive System | `male_repro` | `MRS` |
| 18 Nervous System | `nervous_system` | `NEU` |
| 19 Ophthalmology | `ophthalmology` | `OPH` |
| 20 Pregnancy, Childbirth & Puerperium | `pregnancy_childbirth` | `OBG` |
| 21 Psychiatric/Behavioral | `psychiatric_behavioral` | `PSY` |
| 22 Pulmonary & Critical Care | `pulmonary_critical_care` | `PUL` |
| 23 Renal, Urinary Systems & Electrolytes | `renal_urinary` | `REN` |
| 24 Rheumatology/Orthopedics & Sports | `rheum_ortho` | `MSK` |
| 25 Social Sciences | `social_sciences` | `SOC` |
| 26 Miscellaneous (Multisystem) | `multisystem` | `MUL` |

As siglas que ainda não possuírem questão no `SEED` tornam-se a convenção reservada ao primeiro uso. Não trocar a sigla depois que o primeiro ID for publicado. Se o repositório já tiver adotado outra sigla, o código vence: usar a existente e atualizar esta tabela.

---

## 8. Taxonomia e dificuldade

### 8.1 `system`, `category` e `discipline`

O código real é a fonte canônica:

- localizar `const TAXONOMY` em `public/js/qbank.js` pelo símbolo, não por número de linha;
- formar `category` como `{system}::{slug}`;
- comparar o nome da subpasta com o label legível da taxonomia;
- escolher `discipline` pelo conteúdo entre os valores já usados no código.

Valores usuais de `discipline`:

`anatomy`, `histology`, `embryology`, `physiology`, `pathophysiology`, `pathology`, `pharmacology`, `microbiology`, `immunology`, `genetics`, `biochem`/`biochemistry`, `behavioral_science`, `epidemiology`, `biostatistics`, `ethics`, `social_sciences`.

Se um sistema/tópico não existir:

1. confirmar que não é só diferença de label;
2. escalonar para GPT-5.6-sol — `ultra`;
3. adicionar o sistema/tópico à `TAXONOMY`;
4. adicionar a tradução do label em `TAX_PT`;
5. validar filtros e responsividade;
6. atualizar este mapa se uma nova convenção foi criada.

### 8.2 `difficulty`

Calcular somente a partir de `peer[correct]`:

| Condição | Valor |
|---|---|
| `peer[correct] >= 70` | `easy` |
| `50 <= peer[correct] < 70` | `medium` |
| `peer[correct] < 50` | `hard` |
| não existe `peer` | `medium` |

Nunca estimar dificuldade “no olho”.

### 8.3 Estrutura canônica, nomes e metas (UWorld Step 1)

A estrutura abaixo é a referência oficial de **nomes** (sistemas e tópicos) e
**metas de quantidade** do QBank 1. Ela prevalece sobre nomes divergentes em
pastas, taxonomia do código e labels. Total planejado: **3.657 questões**.

Regras:

- [ ] Pastas e subpastas do Desktop usam o nome canônico (prefixo numérico e
      sufixo `✅` continuam sendo ignorados na comparação).
- [ ] `TAXONOMY` (EN) e `TAX_PT` (PT-BR) refletem exatamente estes nomes;
      todo label canônico tem tradução PT-BR, como o restante da plataforma.
- [ ] Uma subpasta só é considerada **concluída** quando a contagem de
      questões do tópico no `SEED` atinge a meta. A meta não autoriza
      inventar questões: ela apenas indica o trabalho restante.
- [ ] Sistemas já concluídos com meta atingida: Biochemistry 65, Genetics 62,
      Microbiology 30, Pathology 39, Pharmacology 45,
      Biostatistics & Epidemiology 120, Poisoning & Environmental Exposure 32.

| Sistema (meta) | Tópico — meta |
|---|---|
| **Biochemistry (General Principles)** — 65 | Amino acids, proteins, and enzymes — 20; Bioenergetics and carbohydrate metabolism — 21; Cell and molecular biology — 17; Lipid metabolism — 3; Miscellaneous — 4 |
| **Genetics (General Principles)** — 62 | Clinical genetics — 21; DNA structure, replication, and repair — 18; Gene expression and regulation — 7; Protein synthesis — 1; RNA structure, synthesis, and processing — 13; Miscellaneous — 2 |
| **Microbiology (General Principles)** — 30 | Bacteriology — 15; Mycology — 2; Parasitology — 1; Virology — 10; Miscellaneous — 2 |
| **Pathology (General Principles)** — 39 | Cellular pathology — 6; Inflammation and repair — 2; Neoplasia — 31 |
| **Pharmacology (General Principles)** — 45 | Drug metabolism and toxicity — 18; Drug receptors and pharmacodynamics — 5; Pharmacokinetics — 14; Miscellaneous — 8 |
| **Biostatistics & Epidemiology** — 120 | Epidemiology and population health — 31; Measures and distribution of data — 11; Probability and principles of testing — 23; Study design and interpretation — 54; Miscellaneous — 1 |
| **Poisoning & Environmental Exposure** — 32 | Environmental exposure — 7; Toxicology — 25 |
| **Psychiatric/Behavioral & Substance Use Disorder** — 179 | Normal behavior and development — 18; Anxiety and trauma-related disorders — 24; Mood disorders — 33; Neurodevelopmental disorders — 17; Personality disorders — 7; Psychotic disorders — 26; Substance use disorders — 26; Eating disorders — 8; Somatoform disorders — 2; Miscellaneous — 18 |
| **Social Sciences (Ethics/Legal/Professional)** — 107 | Communication and interpersonal skills — 62; Healthcare policy and economics — 9; Medical ethics and jurisprudence — 20; Patient safety — 8; System based-practice and quality improvement — 5; Miscellaneous — 3 |
| **Miscellaneous (Multisystem)** — 24 | Miscellaneous — 24 |
| **Allergy & Immunology** — 108 | Anaphylaxis and allergic reactions — 19; Autoimmune diseases — 13; Immune deficiencies — 23; Transplant medicine — 7; Principles of immunology — 25; Miscellaneous — 21 |
| **Cardiovascular System** — 417 | Normal structure and function of the cardiovascular system — 56; Aortic and peripheral artery diseases — 37; Cardiac arrhythmias — 50; Congenital heart disease — 32; Coronary heart disease — 46; Heart failure and shock — 46; Hypertension — 24; Myopericardial diseases — 52; Valvular heart diseases — 46; Cardiovascular drugs — 17; Miscellaneous — 11 |
| **Dermatology** — 100 | Normal structure and function of skin — 6; Disorders of epidermal appendages — 11; Inflammatory dermatoses and bullous diseases — 28; Skin and soft tissue infections — 18; Skin tumors and tumor-like lesions — 32; Miscellaneous — 5 |
| **Ear, Nose & Throat (ENT)** — 40 | Disorders of the ear, nose, and throat — 40 |
| **Endocrine, Diabetes & Metabolism** — 199 | Normal structure and function of endocrine glands — 3; Congenital and developmental anomalies — 19; Adrenal disorders — 11; Diabetes mellitus — 49; Endocrine tumors — 26; Hypothalamus and pituitary disorders — 13; Obesity and dyslipidemia — 13; Reproductive endocrinology — 21; Thyroid disorders — 34; Miscellaneous — 10 |
| **Female Reproductive System & Breast** — 79 | Normal structure and function of the female reproductive system and breast — 11; Congenital and developmental anomalies — 10; Breast disorders — 7; Genital tract tumors and tumor-like lesions — 26; Genitourinary tract infections — 13; Menstrual disorders and contraception — 4; Miscellaneous — 8 |
| **Gastrointestinal & Nutrition** — 306 | Normal structure and function of the GI tract — 22; Congenital and developmental anomalies — 21; Biliary tract disorders — 17; Disorders of nutrition — 18; Gastroesophageal disorders — 45; Hepatic disorders — 59; Intestinal and colorectal disorders — 66; Pancreatic disorders — 17; Tumors of the GI tract — 27; Miscellaneous — 14 |
| **Hematology & Oncology** — 231 | Normal hematologic structure and function — 10; Hemostasis and thrombosis — 37; Plasma cell disorders — 2; Platelet disorders — 15; Red blood cell disorders — 85; Transfusion medicine — 4; White blood cell disorders — 47; Principles of oncology — 24; Miscellaneous — 7 |
| **Infectious Diseases** — 272 | Antimicrobial drugs — 23; Bacterial infections — 112; Fungal infections — 12; HIV and sexually transmitted infections — 42; Infection control — 6; Parasitic and helminthic infections — 26; Viral infections — 44; Miscellaneous — 7 |
| **Male Reproductive System** — 52 | Normal structure and function of the male reproductive system — 4; Disorders of the male reproductive system — 48 |
| **Nervous System** — 402 | Normal structure and function of the nervous system — 48; Congenital and developmental anomalies — 36; Cerebrovascular disease — 62; CNS infections — 30; Demyelinating diseases — 9; Disorders of peripheral nerves and muscles — 69; Headache — 12; Neurodegenerative disorders and dementias — 35; Seizures and epilepsy — 19; Spinal cord disorders — 14; Traumatic brain injuries — 8; Tumors of the nervous system — 17; Hydrocephalus — 5; Anesthesia — 12; Sleep disorders — 8; Miscellaneous — 18 |
| **Ophthalmology** — 31 | Normal structure and function of the eye and associated structures — 3; Disorders of the eye and associated structures — 28 |
| **Pregnancy, Childbirth & Puerperium** — 59 | Normal pregnancy, childbirth, and puerperium — 15; Disorders of pregnancy, childbirth, and puerperium — 44 |
| **Pulmonary & Critical Care** — 264 | Normal pulmonary structure and function — 25; Congenital and developmental anomalies — 9; Critical care medicine — 40; Interstitial lung disease — 26; Lung cancer — 10; Obstructive lung disease — 48; Pulmonary infections — 61; Pulmonary vascular disease — 23; Sleep disorders — 1; Miscellaneous — 21 |
| **Renal, Urinary Systems & Electrolytes** — 226 | Normal structure and function of the kidneys and urinary system — 24; Congenital and developmental anomalies — 21; Acute kidney injury — 22; Bone metabolism — 8; Chronic kidney disease — 15; Cystic kidney diseases — 3; Fluid, electrolytes, and acid-base — 38; Glomerular diseases — 39; Neoplasms of the kidneys and urinary tract — 12; Nephrolithiasis and urinary tract obstruction — 16; Diabetes insipidus — 8; Urinary incontinence — 5; Miscellaneous — 15 |
| **Rheumatology/Orthopedics & Sports** — 168 | Normal structure and function of the musculoskeletal system — 31; Congenital and developmental anomalies — 9; Arthritis and spondyloarthropathies — 38; Autoimmune disorders and vasculitides — 25; Bone/joint injuries and infections — 35; Bone tumors and tumor-like lesions — 6; Spinal disorders and back pain — 4; Metabolic bone disorders — 14; Miscellaneous — 6 |

---

## 9. Lab Values

`labs` é **condicionalmente obrigatório**. A tupla é:

```js
[nome_do_exame, faixa_EN, faixa_PT, significado_EN, significado_PT]
```

Usar somente esse array de cinco posições dentro de `labs:[...]`. Não usar o
schema legado `{name, value, normal}`: o renderizador atual do popup lê as
posições da tupla e um objeto produziria campos vazios.

O resultado do paciente não substitui a faixa de referência. Quando relevante, repetir o resultado verbatim dentro do significado, mantendo-o também intacto na vinheta.

### Algoritmo obrigatório por questão

1. **Inventariar os exames citados.** Varrer `vignette`, `q`, `explC` e todo `explI` em busca de exames, valores numéricos e achados qualitativos, como “AFP elevada”, “leucocitose” ou “nitrito positivo”.
2. **Resolver a lista global.** Verificar a lista fixa de `openLabs()` no código. Se ela já contiver exatamente o exame e a faixa aplicável ao paciente, registrar na tabela de trabalho “coberto pela lista global” e não duplicar. Caso contrário, criar entrada em `labs`.
3. **Avaliar extras.** Adicionar no máximo 1–2 exames não citados somente se forem clássicos, diretamente ligados ao `objective` e pedagogicamente úteis. Não preencher o popup com exames decorativos.
4. **Pesquisar a faixa correta.** Usar fonte médica primária/autoritativa e atual, específica para idade, sexo, gravidez e condição quando aplicável. Não confiar em snippet de busca ou blog.
5. **Lidar com variação.** Se não houver faixa universal, escrever “varia por laboratório/método”; não inventar precisão.
6. **Redigir significado.** Começar com `↑`, `↓` ou `→`; explicar brevemente o mecanismo e, quando útil, a diferenciação clínica. Fazer versões EN e PT equivalentes.
7. **Evitar cópia cega.** Reavaliar cada faixa para o paciente atual; nunca copiar a tupla inteira de outra questão sem conferir.
8. **Omitir quando apropriado.** Se não houver exame citado fora da lista global e nenhum extra realmente útil, omitir `labs`.

Pesquisar/selecionar faixas e, quando pertinente, até 1–2 exames adicionais é a
**única ampliação clínica permitida**. Ela nunca autoriza alterar ou completar
vinheta, pergunta, alternativas, gabarito, explicações, objetivo ou `peer`.
Registrar no resumo final as fontes autoritativas usadas nas faixas adicionadas.

Não duplicar um item da lista fixa salvo quando a faixa específica da questão diferir. Cálculos derivados só podem ser usados quando todos os valores-fonte estiverem presentes, a fórmula for padronizada, o resultado estiver rotulado como calculado/estimado e a questão tiver sido processada em high ou ultra.

Ao editar uma questão existente, rodar novamente este algoritmo. Não iniciar auditoria retroativa de todo o banco sem pedido explícito, mas corrigir qualquer questão tocada.

---

## 10. Imagens: `img` e `explImg`

### 10.1 Classificação

- Figura usada no enunciado → `img`.
- Figura/tabela/diagrama da explicação → `explImg`.
- Verificar sempre as duas partes da fonte.
- Se o enunciado não referencia figura e um diagrama de mecanismo está em `img`, investigar se ele pertence a `explImg`.
- Reutilizar asset idêntico já existente; não duplicar só para trocar o ID.

### 10.2 Recorte e refinamento

1. Preservar a fonte original sem edição.
2. Criar um derivado a partir dela.
3. Recortar somente UI, margens e áreas que não fazem parte do conteúdo.
4. Preservar bordas, títulos, legendas, eixos, escalas, unidades, setas, marcadores e pistas diagnósticas.
5. Não redesenhar, fazer inpainting, alterar cores, “melhorar” texto, apagar sobreposição dentro do conteúdo ou gerar figura semelhante por IA.
6. Se uma marca d’água sobrepuser conteúdo relevante, não apagá-la; usar uma fonte limpa ou bloquear.
7. Comparar visualmente o crop final com a fonte.
8. Remover espaço vazio excessivo sem cortar conteúdo.
9. Não distorcer nem ampliar além da resolução nativa.
10. Se o arquivo exceder `1600×1600`, reduzir pelo maior lado mantendo proporção;
    não ampliar arquivo menor e não reduzir quando isso prejudicar texto ou detalhe
    diagnóstico.

Formato:

- PNG para tabelas, diagramas, gráficos, texto e linhas.
- JPG com qualidade aproximada de 85 para fotografia clínica/histologia.

Nome:

`{ID}_descricao_curta.png` ou `.jpg`, em inglês, descritivo e sem espaços.

Local:

`public/assets/qbank/`

Referência no objeto:

`assets/qbank/{arquivo}`

Strings servem para uma imagem; arrays servem para várias imagens na ordem correta.

---

## 11. Inserção em lotes

Processar a pasta inteira, independentemente da quantidade. O padrão recomendado é um lote de até 5 questões:

1. transcrever e estruturar;
2. traduzir;
3. calcular dificuldade;
4. aplicar Lab Values;
5. criar e conferir assets;
6. inserir no `SEED`;
7. rodar `node --check public/js/qbank.js`;
8. atualizar a tabela de trabalho;
9. seguir para o próximo lote sem pedir autorização rotineira.

Um erro de uma questão não deve contaminar as demais. Questões bloqueadas permanecem fora do código e impedem apenas o `✅` da subpasta correspondente.

### Retomada de uma leva longa

- O checkpoint verificável é: conteúdo salvo, `node --check` aprovado e, ao
  fechar a subpasta, commit/push. A tabela de trabalho auxilia a execução, mas
  não substitui o código, as fontes e os marcadores `✅`.
- Após interrupção, listar primeiro os nomes com `✅`, depois reconciliar o
  código com a tabela de trabalho, busca por ID **e por conteúdo**; nunca
  reinserir pelo simples fato de a pasta ainda não estar marcada.
- Se o ambiente tiver automação recorrente e a execução puder parar por limite de
  uso, criar uma retomada horária autossuficiente no início, em minuto não-cheio,
  e removê-la ao concluir ou quando outra conta/sessão assumir.
- Se essa capacidade não existir, não inventar nomes de ferramenta nem afirmar que
  a retomada foi armada.

---

## 12. Preview e responsividade

### 12.1 Preview isolado obrigatório

Na raiz do repositório, servir `public/`:

```bash
python3 -m http.server 8791 --directory public
```

Abrir:

```text
http://localhost:8791/app.html?page=qbank-1&u=guest1&previewIds=ID1,ID2,ID3
```

O preview não cria attempts nem altera passadas, mas alguns controles aditivos podem continuar ativos. Não clicar em Flag, Add to Flashcards ou Notebook durante QA.

Conferir **todas** as questões novas. Para cada uma, selecionar primeiro a
bandeira **US/EN** e depois a bandeira **BR/PT** no seletor global; aguardar a
troca do texto antes de registrar cada conferência:

- ordem e texto;
- alternativas e gabarito;
- explicações agrupadas;
- `peer`;
- objetivo;
- PT-BR;
- Lab Values;
- `img` no enunciado e `explImg` na explicação;
- crop, nitidez e ordem dos assets;
- **zoom da imagem** abre e funciona (ampliar e reduzir) no desktop e no mobile, sem deslocar o layout da questão.

Para navegação fora do preview, usar conta de teste (`guest1`), nunca uma conta real.

### 12.2 Fonte canônica responsiva

Ler `RESPONSIVE_BREAKPOINTS.md` antes do QA. Não copiar breakpoints de memória e não manter uma tabela duplicada neste arquivo.

Usar os viewports e critérios da seção QBank desse documento. Falhas que bloqueiam aprovação e `✅`:

- overflow horizontal da página;
- texto sobreposto ou truncado de forma indevida;
- toolbar/botão inacessível;
- imagem distorcida ou cortada;
- figura importante ilegível no mobile;
- margem no asset que torne o conteúdo pequeno;
- alternativas, explicações ou Lab Values sobrepostos.

Se a correção exigir CSS ou novo breakpoint, escalonar para GPT-5.6-sol —
`ultra` e validar que outros módulos não regrediram.

---

## 12-A. Medição do tempo por questão — REGRA FORTE

**Esta medição não pode estar errada.** O tempo por questão alimenta o "Tempo gasto"
do card de resultado, o campo `time_spent_seconds` de cada tentativa e, através dele,
toda a análise de desempenho. Um número errado aqui não aparece como defeito: ele
contamina o histórico em silêncio, e o usuário só descobre quando as estatísticas já
não fazem sentido.

Quem mexer no cronômetro (`startTimer`, `accrueTime`, `submitAnswer`, `endBlock` em
`public/js/qbank.js`) tem de preservar as cinco regras abaixo:

1. **Acumula, não substitui.** Sair da questão e voltar SOMA o tempo das visitas.
   Já houve um defeito exatamente aqui: o relógio reiniciava a cada visita e só a
   última contava.
2. **Pausa fora de vista.** Aba em segundo plano não é tempo de estudo; ao voltar,
   a contagem retoma de onde parou (`visibilitychange`).
3. **A fonte é `Date.now()`**, nunca a soma dos ticks do `setInterval` — o navegador
   desacelera intervalos em abas inativas e a contagem por ticks atrasa.
4. **O limite do modo Cronometrado usa o tempo ACUMULADO** da questão, não o da
   visita atual; senão o usuário ganha tempo extra a cada ida e volta.
5. **A medição roda com o cronômetro oculto.** No modo Tutor o relógio não aparece,
   mas o tempo continua sendo medido — o modo decide a exibição, não a medição.

Além disso, `times` faz parte de `serializeTest`: sem isso o tempo se perde ao
recarregar a página ou retomar um bloco suspenso, e as questões encerradas sem
resposta gravam o tempo real que receberam, não zero.

**Como conferir depois de mexer:** abrir uma questão, esperar alguns segundos, ir
para a próxima, voltar e responder. O "Tempo gasto" tem de ser a soma das duas
visitas — se mostrar só a última, a regra 1 foi quebrada.

## 13. Auditoria final

Executar a auditoria em uma segunda passada, preferencialmente com contexto limpo e
modelo econômico — `high`; usar GPT-5.6-sol — `ultra` nos itens escalados ou quando a primeira
auditoria encontrar padrão de erro. O autor da transcrição não deve apenas reler o
próprio diff de forma superficial.

### 13.1 Reconciliação da fonte

- [ ] Total de grupos-fonte = novas + já existentes auditadas + bloqueadas.
- [ ] Nenhuma fonte sem estado.
- [ ] Nenhuma fonte processada duas vezes.
- [ ] Contagem por subpasta confere com o QBank.
- [ ] Pasta física e `category` conferem.

### 13.2 Auditoria por questão

- [ ] ID único e conteúdo não duplicado.
- [ ] `system`, `category` e `discipline` válidos.
- [ ] `vignette`, `q`, `options`, `correct`, `explC`, `explI`, `objective` fiéis.
- [ ] `peer` fiel, sem ajuste artificial para 100.
- [ ] `correct` existe em `options`.
- [ ] `difficulty` calculada por `peer[correct]`.
- [ ] Todas as incorretas/explicações agrupadas refletem a fonte.
- [ ] `ptTranslation` completa e revisada.
- [ ] Lab Values inventariados; lista global/`labs` resolvidos.
- [ ] `img` e `explImg` no lado correto.
- [ ] Assets existem, abrem, estão nítidos e mantêm fidelidade.
- [ ] Preview EN/PT aprovado.
- [ ] QA de `RESPONSIVE_BREAKPOINTS.md` aprovado.
- [ ] `library` omitido ou explicitamente `1`.

### 13.3 Validação do repositório

- [ ] `node --check public/js/qbank.js`
- [ ] Busca global por IDs duplicados.
- [ ] Busca por referências de asset inexistentes.
- [ ] `git diff --check`
- [ ] `git diff --cached --check` depois do stage.
- [ ] `git diff` revisado; nenhuma alteração alheia.
- [ ] Questões novas disponíveis nas **4 passadas** (o pool de cada passada é recalculado a partir do `SEED`, nunca congelado); contagem da árvore de sistemas coerente com o campo “disponíveis” do gerador de teste.

O `SEED` é global: questões novas ficam disponíveis a todas as contas. Uma leva grande aumenta o denominador das passadas e pode reduzir percentuais antes concluídos; mencionar isso no resumo final.

---

## 14. Commit e push automáticos

O pedido de inclusão de questões autoriza commit e push ao final; não pedir confirmação rotineira. Ainda assim, respeitar permissões reais do ambiente.

Fluxo seguro:

1. Rodar `git status --short`.
2. Revisar `git diff --check` e `git diff`.
3. Adicionar ao stage **somente** `public/js/qbank.js`, assets novos e outros arquivos comprovadamente alterados pela tarefa.
4. Não usar `git add .`.
5. Conferir `git diff --cached --name-only`, `git diff --cached --check` e
   `git diff --cached`.
6. Commitar com mensagem que identifique sistema/subpasta ou lote.
7. Rodar `git push` no branch atual. Se ele ainda não tiver upstream, usar
   `git push -u origin HEAD`. Nunca usar force push.
8. Confirmar hash do commit, branch e resultado do push.

Se o push for rejeitado porque o remoto avançou, só fazer `git pull --rebase`
depois que o trabalho próprio estiver commitado e o worktree estiver livre de
mudanças alheias. Nunca usar autostash/rebase sobre alterações de outra sessão.
Depois do rebase, repetir as validações afetadas e tentar o push novamente.

Se houver mudanças preexistentes sobrepostas que não possam ser separadas com
segurança, parar antes do commit e pedir orientação. Se autenticação/permissão
bloquear o push, informar o erro exato e manter o commit local recuperável.

---

## 15. Marcação `✅`

O `✅` no nome é o marcador operacional principal.

1. Pular nomes já marcados.
2. Renomear uma subpasta para `nome ✅` somente quando todas as fontes dela
   estiverem incluídas/já existentes, auditadas, sem bloqueio **e com push
   confirmado**.
3. Nunca modificar, apagar ou mover as imagens-fonte; somente renomear a pasta.
4. Opcionalmente criar `✅ AUDITORIA CONCLUÍDA.txt` como recibo, mas ele não
   substitui o nome.
5. Marcar a pasta principal somente quando todas as subpastas estiverem `✅`, a
   auditoria final tiver passado e o commit/push correspondente tiver sido
   concluído.
6. Se o push falhar, não marcar subpasta nem pasta principal. Preservar o commit
   e corrigir o push com segurança.

---

## 16. Relatório final mínimo

Informar:

- quantidade de questões novas e auditadas;
- IDs e destinos;
- subpastas/pastas marcadas `✅`;
- bloqueios restantes;
- validações executadas;
- QA responsivo;
- commit, branch e push;
- efeito esperado sobre o progresso das passadas quando a leva for grande.

---

## 17. Manutenção e cópia deste guia

Arquivo canônico:

```text
/Users/jonathan/Documents/GitHub/-couplemed-pages/QBANK_ADD_QUESTION.md
```

Cópia obrigatória:

```text
/Users/jonathan/Desktop/Questões Novas QBank 1/QBANK_ADD_QUESTION.md
```

Depois de editar o canônico, substituir a cópia inteira e exigir igualdade byte a
byte:

```bash
cmp -s \
  "/Users/jonathan/Documents/GitHub/-couplemed-pages/QBANK_ADD_QUESTION.md" \
  "/Users/jonathan/Desktop/Questões Novas QBank 1/QBANK_ADD_QUESTION.md"
```

Qualquer resultado diferente de zero bloqueia a entrega. A cópia do Desktop não
entra no Git. Não registrar histórico de sessões neste guia; o histórico pertence
ao Git e o estado corrente é descoberto pelos `✅`, pelo código e pelas fontes.
