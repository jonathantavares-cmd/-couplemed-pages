# CoupleMed QBank — Documentação Completa

> Referência definitiva do módulo QBank: como adicionar questões, como todos os sistemas funcionam, e como cada funcionalidade se conecta com o resto do site.
> **Este arquivo é autossuficiente.** Quando o usuário disser apenas "incluir questões" (ou variações, incluindo "incluir questões novas"), leia este arquivo do início ao fim antes de agir — ele contém tudo que é preciso, sem precisar reexplorar o site inteiro a cada sessão, sem pedir material antes de checar a pasta do Desktop (Seção 0 passo 1, Seção 0.3), e sem parar pra pedir aprovação de comando ou de conteúdo (permissões em bypass global + commit/push automáticos, Seção 0.3). Última auditoria completa contra o código real: 2026-07-11.

---

## 0. PROCEDIMENTO PADRÃO — o que fazer quando o usuário disser "incluir questões"

1. **Determinar a origem do material:**
   - Se o usuário já colou/anexou o material (foto/print/texto) na própria mensagem, usar isso diretamente. Confirmar se é sistema/disciplina conhecidos ou se você deve identificar pelo conteúdo.
   - Se ele disser apenas **"incluir questões"** ou **"incluir questões novas"** (ou variação equivalente), **sem colar/anexar nada na mensagem** — ir direto para a **Seção 0.3** e varrer `/Users/jonathan/Desktop/Questões novas/`. Não pedir o material antes de checar a pasta; só pedir explicitamente se a pasta estiver vazia, não existir, ou já tiver sido totalmente processada (nenhum arquivo novo desde a última leva).
2. **Aplicar a Regra de Fidelidade (Seção 0.1)** — transcrição verbatim, sem exceções, pois todo o material é conteúdo próprio do usuário.
3. Para cada questão:
   a. Definir `id` seguindo a Seção 3 e checar duplicidade: `grep -n "'CMQ-STEP1-{SIGLA}-" public/js/qbank.js`.
   b. Definir `system` / `discipline` / `category` usando a Seção 5 (TAXONOMY). Se o subtópico não existir, registrar antes na Seção 6.
   c. Transcrever vignette/q/options/correct/explC/explI/objective/peer **exatamente como enviado** (Seção 0.1).
   c2. Calcular `difficulty` a partir do `peer` da alternativa correta (Seção 0.2) — nunca estimar "no olho".
   c3. Se a questão mencionar/depender de algum exame laboratorial clinicamente relevante, escolher (com autonomia total, sem aprovação do usuário) quais exames incluir e pesquisar (WebSearch) a faixa de referência apropriada ao paciente daquela questão específica (idade/sexo/gravidez/condição), preenchendo o campo opcional `labs` (Seção 16b) — **única exceção à Regra de Fidelidade (Seção 0.1)**: aqui, e só aqui, você pesquisa/decide sozinho, sem checar com o usuário antes ou depois. Todo o resto da questão continua proibido de ser inventado/alterado (transcrição verbatim).
   d. Escrever `ptTranslation` completo no mesmo passo (Seção 17) — nunca deixar para depois.
   e. Se houver imagem: processar segundo a Seção 19 (crop/resize/nome/local) **antes** de referenciar no campo `img`.
   f. Inserir o objeto dentro do `// BATCH` correspondente em `SEED` (`public/js/qbank.js`), preservando a organização por sistema. Criar novo `// BATCH` só se não existir um para aquele sistema.
   g. Deixar `library` omitido (= Library 1) a menos que o usuário tenha dito explicitamente que a leva é para Library 2/3 (ver Seção 4b — hoje isso só muda o rótulo exibido, pois Library 2/3 não têm QBank funcional ainda).
4. Depois de inserir **todas** as questões da leva, rodar `node --check public/js/qbank.js` para garantir que não há erro de sintaxe.
5. *(Opcional, só para conferência própria)* Gerar o link de preview isolado (Seção 20) com os IDs da leva — desde 2026-07-13 (mudança de política, ver Seção 0.3) **não é mais necessário abrir/enviar isso ao usuário nem aguardar aprovação antes de commitar**. Ele confere as questões depois direto no site publicado, localizando a leva pela seção/taxonomia (Seções 4/5) em que foi inserida.
6. Rodar o Checklist da Seção 23 e, em seguida, `git add`/`git commit`/`git push` **automaticamente, sem esperar resposta do usuário e sem pedido explícito por leva** (mudança de política em 2026-07-13, Seção 0.3).

---

## 0.1 REGRA DE FIDELIDADE — leia antes de transcrever qualquer questão

**Todo o material de questões enviado pelo usuário é conteúdo próprio/original dele.** Este é o site e material de estudos pessoal do usuário — ele não pode ter nenhuma questão errada.

Ao transcrever uma questão a partir do material enviado (foto, print, texto):
- Transcreva **exatamente como enviado, verbatim** — vinheta, enunciado, todas as alternativas, gabarito (resposta correta) e comentários/explicações. Não parafraseie, não resuma, não "melhore" a redação.
- **Nunca invente** gabarito, explicação ou percentual de `peer` que não esteja no material enviado. O material do usuário já inclui a resposta correta e o percentual de acerto/escolha por alternativa — transcreva esses números exatamente como fornecidos. **Esses percentuais rotineiramente NÃO somam exatamente 100 (arredondamento do material de origem) — isso é esperado e está resolvido permanentemente (confirmado 2026-07-13): transcreva sempre verbatim, sem ajustar, e sem avisar o usuário sobre isso — não é mais necessário perguntar nem sinalizar esse ponto a cada leva.** Se algum dado estiver faltando (não apenas a soma não batendo 100, mas um valor realmente ausente), pergunte ao usuário em vez de supor ou gerar um valor plausível.
- Sempre revise a questão renderizada via preview isolado (Seção 20) antes de comitar.

Não existe modo "reescrever" para essas questões — isso só se aplicaria se o usuário explicitamente avisasse que uma leva veio de um banco comercial (UWorld/AMBOSS/etc.), o que não é o caso deste site.

---

## 0.2 REGRA DE DIFICULDADE — como calcular o campo `difficulty`

**A dificuldade nunca é escolhida "no olho" — é sempre calculada a partir do `peer` da alternativa correta** (o `%` de colegas que acertaram, campo `peer[correct]`, transcrito verbatim do material do usuário conforme Seção 0.1).

| Dificuldade | % de acerto da alternativa correta (`peer[correct]`) |
|---|---|
| `easy` | ≥ 70% |
| `medium` | 50% a 69% |
| `hard` | < 50% |
| `medium` | quando a questão **não tem** `peer` (default) |

**Como aplicar:**
1. Depois de transcrever `peer` (Seção 0.1) e confirmar `correct`, pegar `peer[correct]` (ex.: `correct:'A'` e `peer:{A:71,...}` → 71%).
2. Classificar pela tabela acima e preencher `difficulty` com o valor resultante.
3. Se a questão não vier com `peer` no material (raro, mas pode acontecer), usar `difficulty:'medium'` como default — nunca deixar em branco nem inventar um `peer` só para calcular a dificuldade (isso violaria a Seção 0.1).
4. Essa regra vale para **toda questão nova**, sem exceção — inclusive ao editar/corrigir uma questão já existente, se o `peer` dela mudar.

---

## 0.3 GATILHO "incluir questões" / "incluir questões novas" sem material anexado — varredura automática de pasta e processamento em lote (implementado 2026-07-13, ampliado 2026-07-13)

Quando o usuário disser **"incluir questões"** ou **"incluir questões novas"** (ou variação equivalente) **sem colar/anexar o material direto na mensagem**, o procedimento é diferente do passo 1a da Seção 0 (que só se aplica quando o material vem colado na própria mensagem):

1. **Localizar a pasta**: `/Users/jonathan/Desktop/Questões novas/`. Varrer **recursivamente** — pode haver múltiplas subpastas dentro dela, com nomes/localizações diferentes a cada leva (por tema, por data, por lote enviado etc.), em qualquer profundidade. Listar todo arquivo de imagem (screenshot/foto de questão) encontrado.
2. **Processar TODAS as questões encontradas, independente da quantidade** — 50, 100, 200, 300 ou mais. Nunca parar no meio nem perguntar se deve continuar para o próximo lote. Trabalhar em lotes menores (5 questões por vez é o padrão sugerido, mas outro tamanho pode ser usado se ajudar a manter a qualidade da transcrição) e seguir automaticamente lote após lote, aplicando o procedimento completo da Seção 0 (fidelidade 0.1, dificuldade 0.2, labs 16b, tradução 17, imagem 19, taxonomia/dedup de ID Seção 3) em cada questão, até que **a pasta inteira** tenha sido incluída no SEED.
3. **Exceções que ainda exigem parar e perguntar ao usuário** (não cobertas pela autonomia deste modo): dado realmente ausente no material (Seção 0.1 — nunca inventar), imagem corrompida/ilegível, ou ambiguidade de taxonomia que não seja resolvível sozinho consultando a Seção 5/6.
4. Rodar `node --check public/js/qbank.js` ao final de cada lote (pega erro de sintaxe cedo) e novamente ao final da pasta inteira.
5. Depois que **toda a pasta** tiver sido processada: *(opcional)* gerar o(s) link(s) de preview (Seção 20.3) só para conferência própria — não precisa ser aberto/enviado ao usuário.
6. Seguir para `git add`/`git commit`/`git push` **automaticamente** (Seção 0, passos 5–6 — mudança de política em 2026-07-13: nem commit nem push esperam aprovação ou pedido explícito por leva). O usuário confere depois direto no site publicado, localizando as questões novas pela seção/taxonomia em que foram inseridas.

**Sobre permissões de comando:** desde 2026-07-13, comandos de terminal (Bash/Read/Write) rodam em modo bypass — não pedem mais aprovação individual —, por isso este modo consegue rodar do início ao fim sem interrupção por prompt de permissão. Isso é independente da exigência de fidelidade (Seção 0.1), que continua valendo normalmente: só o gate de *aprovação humana antes do commit* foi removido, não a exigência de transcrever certo.

**Sobre o computador entrar em repouso/pausa durante o processamento:**
- Se o Mac entrar em sleep físico de verdade (tela apagada + sistema suspenso), o processo é pausado no nível do sistema operacional — nenhum software continua rodando durante o sleep real; isso é limitação de hardware/SO, não do Claude. Ao acordar o Mac, a sessão retoma sozinha de onde parou — nada se perde, porque cada questão já inserida fica salva em disco imediatamente, arquivo por arquivo. Não é preciso reiniciar do zero.
- Para evitar que o Mac durma no meio de uma leva grande, recomenda-se rodar `caffeinate -dis` num terminal separado antes de pedir "incluir questões novas" (impede sleep de tela e sistema enquanto o comando estiver ativo), ou desativar temporariamente o sleep em Ajustes do Sistema → Bateria/Energia.
- Se a sessão cair por outro motivo (rede, terminal fechado), é só retomar a conversa — o `qbank.js` já reflete tudo que foi inserido até aquele ponto, então o próximo passo não duplica nada (checagem de duplicidade de ID continua valendo normalmente, Seção 3).

**Sobre atingir o limite de uso/tokens do Claude durante o processamento (regra do usuário, 2026-07-13):**
- Se o limite de uso do Claude for atingido no meio de uma leva grande **e o usuário não trocar para outra conta** para continuar, a expectativa dele é: aguardar o limite ser liberado de novo e **retomar automaticamente de onde parou**, sem pedir nada a mais e sem reprocessar/pular nenhuma questão.
- Na prática, para isso funcionar: manter a sessão do Claude Code aberta (não fechar o terminal/app) até o limite renovar — normalmente a mensagem pendente fica na fila e é reenviada automaticamente assim que a janela de uso libera de novo. Se por algum motivo isso não acontecer sozinho (varia por versão/plano), uma simples mensagem do usuário como "continuar" depois que o limite liberar é suficiente — a checagem de duplicidade de ID (Seção 3) garante que o processamento retoma exatamente do próximo arquivo de imagem ainda não incluído no SEED, sem repetir nem pular nada.
- Isso não exige o computador ligado ativamente processando o tempo todo — só não fechar a sessão do Claude Code enquanto se espera o limite renovar (mesma lógica do sleep do Mac, acima: nada se perde porque cada questão já commitada/pushada fica salva permanentemente a cada leva).

---

## 1. Arquivo principal

```
public/js/qbank.js
```

Todo o QBank (dados + lógica + UI) vive neste único arquivo (~2290 linhas). Estrutura interna:

| Seção | Linhas aprox. | O que é |
|---|---|---|
| `const SEED = [...]` | ~42–1128 | Array com todas as questões |
| `window.CMSearchProviders.qbank` | ~1140 | Provider da busca global (Seção 18) |
| `ROOT_CAUSES` | ~1172 | 5 causas-raiz de erro disponíveis |
| `const TAXONOMY` | ~1183 | Hierarquia de sistemas e subtópicos |
| `SYSTEM_ALIASES` | ~1257 | Aliases de IDs de sistemas |
| `DISCIPLINE_LABELS` | ~1267 | Mapa discipline → label exibido |
| `metaFor(q)` | ~1277 | Deriva Subject/System/Topic/Library de uma questão |
| `const T` (i18n de interface) | ~1309 | Strings EN/PT dos botões/labels |
| `const store` | ~1438 | Camada de dados (lê/grava localStorage) |
| `filterPool` / `availablePool` | ~1526 | Filtragem de questões para Create Test |
| `boot()` | ~1578 | Entrada do módulo — inclui o modo preview (Seção 20) |
| `renderHome` | ~1611 | Pass Navigator (tela inicial) |
| `renderCreate` | ~1745 | Create Test (filtros) |
| `startTest` / `renderTest` | ~1835/1861 | Início e tela de resolução das questões |
| `submitAnswer` / `endBlock` | ~1990/2022 | Gravação de attempts (Seção 10) |
| `renderResults` | ~2035 | Tela de resultados do bloco |
| `renderAnalytics` | ~2075 | Analytics (Seção 13) |
| Modais | ~2118 | Root Cause, Flashcard, Notebook, Lab Values |

Outros arquivos que **leem ou escrevem dados do QBank** (mapa completo na Seção 21): `public/js/site.js` (menu, busca, sidebar), `public/js/cm-sync.js` (sincronização multi-aparelho), `public/js/notebook.js` (referências), `public/js/flashcards.js` (taxonomia espelhada, não lê SEED), `public/css/qbank.css` (estilos, inclusive das imagens).

**`SEED` é global — não é armazenado por usuário.** É um array fixo, compilado dentro do próprio `qbank.js` e servido igual para todo mundo; `store.questions()`/`store.question(id)` (~linha 1896) apenas retornam esse array. Isso significa que toda questão nova commitada (Seção 0) fica automaticamente disponível para **todas as contas** do site — hoje 6, verificado em `seed_users.sql` e em `USER_META` (`public/js/site.js` ~linha 25): `john`, `alysson`, `guest1`, `guest2`, `guest3`, `guest4`. Não existe limite de contas em `worker.js`: qualquer `uid` inserido na tabela `users` do D1 ganha automaticamente seu próprio balde de progresso (Seção 10), sem precisar mudar nada no código do QBank. Ver Seção 10 para o que É armazenado por usuário (nunca o conteúdo da questão em si, só o progresso).

---

## 2. Estrutura de uma questão (SEED)

```js
{ id:'CMQ-STEP1-XXX-0001',

  // classificação — define filtros E tags exibidas na explicação
  system:'cardiovascular',
  discipline:'pathophysiology',
  category:'cardiovascular::valvular_heart_diseases',
  difficulty:'medium',           // 'easy' | 'medium' | 'hard' — calculado a partir de peer[correct], ver Seção 0.2
  library:1,                     // OPCIONAL — 1|2|3. Default 1 se omitido. Ver Seção 4b.

  // conteúdo
  vignette:'Texto da vinheta clínica...',
  q:'Qual das alternativas é a mais correta?',
  options:[
    {label:'A', text:'Opção A'},
    {label:'B', text:'Opção B'},
    {label:'C', text:'Opção C'},
    {label:'D', text:'Opção D'},
    {label:'E', text:'Opção E'},
  ],
  correct:'A',

  // explicações
  explC:'Explicação completa da resposta CORRETA.',
  explI:[
    {option:'B', explanation:'Por que B está errada.'},
    {option:'C', explanation:'Por que C está errada.'},
    {option:'D', explanation:'Por que D está errada.'},
    {option:'E', explanation:'Por que E está errada.'},
  ],
  objective:'Frase única com o ponto de aprendizado principal.',

  // Quando o material original explica 2+ alternativas incorretas juntas com o MESMO texto
  // (padrão "(Choices B and C)" ou "(Choices A, B, D, E, and F)" do UWorld), NÃO duplicar o texto
  // em uma entrada por letra — isso faz o mesmo parágrafo se repetir várias vezes na tela (bug já
  // corrigido em BCH-0010, feedback do usuário em 2026-07-11). Em vez disso, usar UMA única entrada
  // em explI com `option` contendo todas as letras juntas, exatamente como agrupadas no material:
  //   {option:'B, D, and E', explanation:'texto único que vale para B, D e E...'}
  // O renderer (renderExplanation, ~linha 2396) apenas concatena "${e.option}." + a explicação, então
  // qualquer string funciona como label — não precisa ser uma letra isolada. Se o material agrupar
  // as 5 alternativas incorretas em um único parágrafo, o array explI dessa questão terá 1 item só.
  // A mesma regra vale para ptTranslation.explI (mesma string em `option` nos dois idiomas, pois a
  // busca de tradução em ptExplIText faz comparação exata por `option`).

  // peer stats — % de escolha por alternativa (deve somar 100) — vem do material do usuário, nunca inventar (Seção 0.1)
  peer:{A:71, B:9, C:12, D:5, E:3},

  // OPCIONAL: imagem exibida na vinheta — string ou array de strings. Ver Seção 19 antes de gerar o arquivo.
  img:'assets/qbank/CMQ-STEP1-CVS-0001_nome_imagem.png',

  // OPCIONAL: valores de referência laboratoriais pertinentes a ESTA questão. Exames e faixas escolhidos
  // com autonomia total por você (Claude) — sem aprovação do usuário para essa escolha — de acordo com o
  // caso clínico, sinais/sintomas, sexo, idade, gravidez e histórico descritos na vinheta. Única exceção
  // à Regra de Fidelidade (Seção 0.1) — o resto da questão continua verbatim. Ver Seção 16b completa.
  labs:[
    ['Ammonia (venous)', '15–45 µg/dL (≈9–26 µmol/L)', '15–45 µg/dL (≈9–26 µmol/L)',
     'Elevated in urea cycle disorders', 'Elevada nos distúrbios do ciclo da ureia'],
  ],

  // OPCIONAL mas recomendado: tradução PT-BR completa (não existe tradução separada para img — ver Seção 19)
  ptTranslation:{
    vignette:'Vinheta em português...',
    q:'Pergunta em português?',
    objective:'Objetivo em português.',
    options:[
      {label:'A', text:'Opção A em PT'},
      {label:'B', text:'Opção B em PT'},
      {label:'C', text:'Opção C em PT'},
      {label:'D', text:'Opção D em PT'},
      {label:'E', text:'Opção E em PT'},
    ],
    explC:'Explicação correta em português.',
    explI:[
      {option:'B', explanation:'Explicação B em PT.'},
      {option:'C', explanation:'Explicação C em PT.'},
      {option:'D', explanation:'Explicação D em PT.'},
      {option:'E', explanation:'Explicação E em PT.'},
    ]
  }
},
```

### Questões com 6 alternativas

Apenas acrescentar mais uma opção em `options` (label `F`) e adicionar `F` em `peer` e `explI`. O sistema detecta automaticamente (não há limite de alternativas verificado no código, mas 5–6 é o padrão do banco).

---

## 3. Convenção de IDs

| Tipo | Formato | Exemplo |
|---|---|---|
| Batch temático | `CMQ-STEP1-{SYS}-{NNNN}` | `CMQ-STEP1-CVS-0001` |
| Questão simples antiga | `q_{descricao_curta}` | `q_cv_as` |

**Siglas de sistema para o ID:**

| Sistema | Sigla |
|---|---|
| Cardiovascular | CVS |
| Pulmonary & Critical Care | PUL |
| Renal & Urinary | REN |
| Gastrointestinal | GIT |
| Nervous System | NEU |
| Hematology & Oncology | HEM |
| Infectious Diseases | INF |
| Endocrine | END |
| Male Reproductive | MRS |
| Female Reproductive | FRS |
| Musculoskeletal | MSK |
| Psychiatry/Behavioral | PSY |
| Biochemistry | BCH |
| Pharmacology | PHR |
| Biostatistics & Epidemiology | BST |
| Microbiology | MIC |
| Dermatology | DER |
| Allergy & Immunology | IMM |

Antes de usar um ID, sempre confirmar que não existe: `grep -n "id:'CMQ-STEP1-CVS-0007'" public/js/qbank.js` (ou o ID exato que for usar).

---

## 4. Sistema de classificação (system / category / discipline)

Estes três campos controlam:
- **Onde a questão aparece** nos filtros do Create Test
- **Quais chips (tags) aparecem** no final da explicação (Subject / System / Topic)

### 4a. Como as tags são geradas automaticamente

Tudo é derivado por `metaFor(q)` (`public/js/qbank.js` ~linha 1277) — **não existe passo manual de tagging**.

| Chip exibido | Campo da questão | Exemplo |
|---|---|---|
| **Subject** | `discipline` | `biostatistics` → "Biostatistics" |
| **System** | `system` | `biostatistics_epidemiology` → "Biostatistics & Epidemiology" |
| **Topic** | parte após `::` em `category` | `hypothesis_testing` → "Hypothesis testing" |

> Se um slug de topic não existir no TAXONOMY, o sistema gera o label via `titleFromSlug` (converte `snake_case` → "Title Case"). Para label exato (ex: "Hypothesis testing" em vez de "Hypothesis Testing"), registrar no TAXONOMY — ver Seção 6.

### 4b. Library (1/2/3) — para qual biblioteca a questão é roteada

Cada questão carrega um campo opcional `library` (`1`, `2` ou `3`) que define o prefixo exibido no rodapé da explicação: `Medical Library > Library {N} > {System} > {Topic}` (função `metaFor()`, `public/js/qbank.js` ~linha 1277, campo implementado em 2026-07-11).

- **Default: `library:1`** — se o campo não for informado (caso de todas as ~700 questões existentes), a questão é tratada como Library 1.
- **Hoje só existe conteúdo/UI para QBank 1 (Library 1).** `Library 2` e `Library 3` já aparecem no menu de navegação (`public/js/site.js`) e `Library 2` já tem sua lista de pastas temáticas (`LIB_FOLDERS['library-2']`, estilo Step 2 CK: Biochemistry, Immunology, Microbiology, Pathology, General Pharmacology, Biostatistics, Public Health Science, Cardiovascular, Endocrinology, GI, Heme/Onc, MSK/Skin/CT, Neurology, Psychiatry, Nephrology, Reproductive, Pulmonology), mas **não existe ainda nenhum array de questões tipo `SEED` nem tela de resolução para QBank 2/3** — `qbank-2` está em `COMING_SOON_PAGES` (`public/js/site.js`).
- Setar `library:2` ou `library:3` numa questão nova hoje só afeta a tag/rótulo exibido (`libraryPath`) — **não** move a questão pra uma tela diferente, pois essa tela ainda não existe.
- Enquanto o usuário não pedir para construir o QBank 2/3 completo (nova tela, novo SEED, filtros, passadas — tarefa grande, separada), toda questão nova entra em `library:1` (ou omite o campo, que é o mesmo). Só usar 2/3 se o usuário disser explicitamente que a leva é destinada a outra library.

### Tabela de Disciplinas (`discipline`)

| Valor | Label exibido |
|---|---|
| `anatomy` | Anatomy |
| `histology` | Histology |
| `embryology` | Embryology |
| `physiology` | Physiology |
| `pathophysiology` | Pathophysiology |
| `pathology` | Pathology |
| `pharmacology` | Pharmacology |
| `microbiology` | Microbiology |
| `immunology` | Immunology |
| `genetics` | Genetics |
| `biochem` / `biochemistry` | Biochemistry |
| `behavioral_science` | Behavioral Science |
| `epidemiology` | Epidemiology |
| `biostatistics` | Biostatistics |
| `ethics` | Ethics |
| `social_sciences` | Social Sciences |

Um `discipline` fora dessa lista ainda funciona (vira Title Case automático via `titleFromSlug`), só não terá o label "bonito" da tabela.

---

## 5. TAXONOMY — Todos os Sistemas e Subtópicos

O campo `category` deve ser `{system_id}::{subtopico_slug}`.

```
biochemistry
  amino_acids_proteins_enzymes
  bioenergetics_carb_metabolism
  cell_molecular_biology
  lipid_metabolism
  misc

genetics
  clinical_genetics
  dna_structure_replication_repair
  gene_expression_regulation
  protein_synthesis
  rna_structure_synthesis_processing
  misc

microbiology
  bacteriology
  mycology
  parasitology
  virology
  misc

pathology
  cellular_pathology
  inflammation_repair
  neoplasia

pharmacology
  drug_metabolism_toxicity
  drug_receptors_pharmacodynamics
  pharmacokinetics
  misc

biostatistics_epidemiology
  epidemiology_population_health
  measures_distribution_data
  probability_principles_testing
  study_design_interpretation
  hypothesis_testing             ← adicionado manualmente
  misc

poisoning_environmental
  environmental_exposure
  toxicology

allergy_immunology
  anaphylaxis_allergic_reactions
  autoimmune_diseases
  immune_deficiencies
  transplant_medicine
  principles_immunology
  misc

cardiovascular
  normal_cv
  aortic_peripheral_artery
  cardiac_arrhythmias
  congenital_heart_disease
  coronary_heart_disease
  heart_failure_shock
  hypertension
  myopericardial_diseases
  valvular_heart_diseases
  cardiovascular_drugs
  misc

dermatology
  normal_skin
  disorders_epidermal_appendages
  inflammatory_dermatoses_bullous
  skin_soft_tissue_infections
  skin_tumors
  misc

ent
  disorders_ent

endocrine
  normal_endocrine
  congenital_dev_anomalies
  adrenal_disorders
  diabetes_mellitus
  endocrine_tumors
  hypothalamus_pituitary
  obesity_dyslipidemia
  reproductive_endocrinology
  thyroid_disorders
  misc

female_repro_breast
  normal_female_repro
  congenital_dev_anomalies
  breast_disorders
  genital_tract_tumors
  genitourinary_infections
  menstrual_disorders_contraception
  misc

gi_nutrition
  normal_gi
  congenital_dev_anomalies
  biliary_tract
  disorders_nutrition
  gastroesophageal
  hepatic
  intestinal_colorectal
  pancreatic
  tumors_gi
  misc

heme_onc
  normal_heme
  hemostasis_thrombosis
  plasma_cell
  platelet_disorders
  rbc_disorders
  transfusion_medicine
  wbc_disorders
  principles_oncology
  misc

infectious_diseases
  antimicrobial_drugs
  bacterial_infections
  fungal_infections
  hiv_sti
  infection_control
  parasitic_helminthic
  viral_infections
  misc

male_repro
  normal_male_repro
  disorders_male_repro

nervous_system
  normal_nervous
  congenital_dev_anomalies
  cerebrovascular_disease
  cns_infections
  demyelinating_diseases
  peripheral_nerves_muscles
  headache
  neurodegenerative_dementias
  seizures_epilepsy
  spinal_cord_disorders
  traumatic_brain_injuries
  tumors_nervous
  hydrocephalus
  anesthesia
  sleep_disorders
  misc

ophthalmology
  normal_eye
  disorders_eye

pregnancy_childbirth
  normal_pregnancy
  disorders_pregnancy

psychiatric_behavioral
  normal_behavior_development
  anxiety_trauma
  mood_disorders
  neurodevelopmental_disorders
  personality_disorders
  psychotic_disorders
  substance_use_disorders
  eating_disorders
  somatoform_disorders
  misc

pulmonary_critical_care
  normal_pulmonary
  congenital_dev_anomalies
  critical_care
  interstitial_lung
  lung_cancer
  obstructive_lung
  pulmonary_infections
  pulmonary_vascular
  sleep_disorders
  misc

renal_urinary
  normal_renal
  congenital_dev_anomalies
  acute_kidney_injury
  bone_metabolism
  chronic_kidney_disease
  cystic_kidney
  fluid_electrolytes_acidbase
  glomerular_diseases
  neoplasms_kidney_urinary
  nephrolithiasis_obstruction
  diabetes_insipidus
  urinary_incontinence
  misc

rheum_ortho
  normal_msk
  congenital_dev_anomalies
  arthritis_spondylo
  autoimmune_vasculitides
  bone_joint_injuries_infections
  bone_tumors
  spinal_disorders_back_pain
  metabolic_bone
  misc
```

---

## 6. Adicionar subtópico novo ao TAXONOMY

Se o subtópico ainda não existe, localizar o sistema no TAXONOMY (~linha 1183) e adicionar o par `['slug','Nome Legível']`:

```js
{id:'biostatistics_epidemiology', name:'Biostatistics & Epidemiology', subs:[
  ['study_design_interpretation','Study design and interpretation'],
  ['hypothesis_testing','Hypothesis testing'],   // ← novo
  ['misc','Others']
]},
```

Se quiser tradução PT correta desse label (senão cai automaticamente no inglês), adicionar também em `TAX_PT` (~linha 1241, dicionário `{'English label':'Rótulo em português'}`).

---

## 7. Sistema de Passadas (Pass Navigator)

O QBank usa passadas sequenciais — o usuário faz o banco inteiro múltiplas vezes, cada "passada" com foco diferente.

| Passada | Nome (EN) | Nome (PT) | Desbloqueio |
|---|---|---|---|
| 1 | Learning | Aprendizado | Sempre disponível |
| 2 | Consolidation | Consolidação | Passada 1 100% concluída |
| 3 | Refinement | Refinamento | Passada 2 100% concluída |
| ★ Dirigida | Total Mastery | Domínio Total | Passada 1 100% concluída |

**Como o sistema rastreia:**
- Cada questão respondida gera um `attempt` gravado no localStorage
- `passNumber(qid)` = número de attempts anteriores para aquela questão
  - 0 attempts → passada 1
  - 1 attempt → passada 2
  - 2 attempts → passada 3
  - 3+ attempts → passada dirigida (99)
- `passProgress(pn)` retorna `{total, answered, pct, done}`, onde **`total` = `SEED.length` no momento do cálculo**
- A passada N está **concluída** quando TODAS as questões têm ≥ N attempts

> ⚠ **Efeito colateral de adicionar questões:** como `total` é sempre `SEED.length` (o banco inteiro), toda vez que uma leva de questões novas é comitada, o denominador de `passProgress` aumenta imediatamente para todos os usuários — inclusive quem já tinha uma passada em 100% pode ver a % cair, e uma passada antes "completed" pode voltar a `active` até ele responder as novas questões daquela passada. Isso é esperado/correto (mais questões = mais para estudar), mas **avise o usuário** ao comitar uma leva grande, para ele não estranhar o dashboard.

**Passada Dirigida (99):**
- Pool dinâmico: questões com último attempt `incorrect` OU com flag ativo
- Excluídas automaticamente: questões com 2 acertos consecutivos

**Desbloqueio manual (admin):**
```js
localStorage.setItem('couplemed_qb_unlock_john', '3'); // desbloqueia até passada 3
```
O usuário `john` (USER exatamente igual a `'john'`) é o único tratado como admin no código (`isAdmin(){ return USER==='john'; }`) e bypassa os locks automaticamente. `alysson` **não** é admin nesse módulo, mesmo sendo um dos dois usuários "premium" do site — para ele, o desbloqueio manual acima (com `couplemed_qb_unlock_alysson`) é necessário se for preciso pular locks.

---

## 8. Create Test — Filtros disponíveis

| Filtro | Valores | O que filtra |
|---|---|---|
| **Status** | all / unused / correct / incorrect / omitted / marked | Último status do attempt da questão |
| **Passada** | all / 1 / 2 / 3 / 99 (Dirigida) | Número de attempts da questão |
| **Dificuldade** | all / easy / medium / hard | Campo `difficulty` da questão |
| **Sistema** | Accordion com TAXONOMY | Campo `category` da questão |
| **Modo** | tutor / timed | Controla se a explicação aparece imediatamente |
| **Nº de questões** | 1–40 (máx permitido) | Quantidade de questões no bloco |
| **Seg/questão** | numérico (só no modo timed) | Timer automático por questão |

**Regra do contador:**
- O número exibido ("33 disponíveis") considera **todos os filtros exceto seleção de subtópico** — mostra quantas questões existem antes de aplicar o accordion de sistemas.
- `filterPool(f)` aplica todos os filtros incluindo subtópicos.
- `availablePool(f)` aplica todos os filtros **exceto** subtópicos (usado para os contadores do accordion).

---

## 9. Tela de Resolução — funcionalidades

| Funcionalidade | Ação do usuário | O que acontece |
|---|---|---|
| **Strikethrough** | Clique no × de uma alternativa | Risca a opção visualmente; não impede seleção |
| **Flag** | Botão "Marcar" | Marca a questão; aparece no filtro "Marcadas" e na Passada Dirigida |
| **Submit** | Botão "Responder" | Grava o attempt (imutável); no modo tutor abre explicação |
| **Lab Values** | Botão "Valores Lab" | Abre popup com faixas de referência (Na, K, Hb, etc.) |
| **End Block** | Botão "Encerrar Bloco" | Registra questões restantes como omitidas e vai para Resultados |
| **Suspend** | Botão "Suspender" | Salva o teste com status `suspended`; pode ser retomado depois |
| **Modo Timed** | Timer regressivo | Ao atingir 0 seg, a questão é auto-omitida |

**Navegação:**
- Botões Anterior / Próxima — navega sem submeter
- Grid de questões no rodapé — clique direto em qualquer número

> No **modo preview** (Seção 20) esta tela é reaproveitada, mas Submit/Suspend/End Block ficam ocultos e a explicação já aparece revelada desde o início — é só leitura, nada aqui é gravado.

---

## 10. Persistência — localStorage

**Chave principal:** `couplemed_qb_{USER}` (ex: `couplemed_qb_john`)

```js
db = {
  attempts: [],   // histórico imutável — NUNCA sobrescrito
  tests: [],      // blocos criados (in_progress / suspended / completed)
  notebook: [],   // notas por questão
  flags: {},      // { qid: true } — questões marcadas
  links: {}       // { qid: [flashcardId] } — vínculo QBank → Flashcards
}
```

**Schema de um attempt:**
```js
{
  id: 'att_abc123',
  user_id: 'john',
  question_id: 'CMQ-STEP1-CVS-0001',
  test_id: 'test_xyz',
  selected_option: 'A',          // null se omitida
  is_correct: 1,                  // 0 | 1 | null
  status: 'correct',             // 'correct' | 'incorrect' | 'omitted'
  pass_number: 1,                 // calculado no momento do addAttempt
  time_spent_seconds: 45,
  mode: 'tutor',
  flagged: false,
  strikethrough_options: ['B','D'],
  root_cause_tag: 'knowledge_gap', // preenchido pelo modal de causa-raiz (só em erros)
  created_at: '2025-07-10T12:00:00.000Z'
}
```

> **Importante:** attempts são INSERT-only. O sistema NUNCA modifica um attempt já gravado. O `pass_number` é calculado no momento da gravação com base nos attempts anteriores daquela questão. O modo preview (Seção 20) nunca chama `addAttempt`/`saveTest` — é a única forma segura de "abrir" uma questão sem gerar histórico permanente.

### 10.1 Arquitetura multi-usuário (contas reais, não é só john/alysson)

Confirmado por auditoria em 2026-07-11: o site já está preparado para **6 contas reais**, não só as 2 do casal.

- **Contas hoje:** `john`, `alysson`, `guest1`, `guest2`, `guest3`, `guest4` — todas cadastradas na tabela `users` do D1 (`seed_users.sql`), cada uma com hash de senha PBKDF2 próprio (login real, não é um `?u=` livre). `USER_META` em `public/js/site.js` (~linha 25) espelha essas 6 para exibir nome/avatar.
- **Sem limite de contas no backend:** `worker.js` não tem nenhuma checagem de "só 2 usuários" — login é só `SELECT ... FROM users WHERE login=?` (`worker.js:257`). Qualquer linha nova na tabela `users` já funciona para login e sincronização, sem mudar código. Para criar uma conta nova hoje é preciso inserir direto no D1 via `wrangler d1 execute` (não existe endpoint de "criar usuário" na UI) — depois disso, opcionalmente adicionar a entrada em `USER_META` (`site.js`) só para aparecer bonito no painel admin de Usuários; sem isso a conta funciona igual, só aparece com o `uid` cru em vez do nome de exibição.
- **`isAdmin()` é o único ponto realmente hardcoded a um único usuário:** `qbank.js` (~linha 1952) checa `USER==='john'` literalmente (bypassa os locks de passada) — `alysson` **não** é admin nesse módulo, mesmo sendo conta "premium". Se um dia quiser um segundo admin, é aqui que mexe.
- **Cada `uid` tem seu balde de progresso isolado automaticamente** (`user_state` no D1, bucket = `uid`) — não precisa de migração ao adicionar conta nova. O que é global (SEED, questões) x por usuário (attempts/tests/flags/notebook) está descrito na Seção 1 e no topo desta seção.
- **⚠️ Nota de segurança:** `seed_users.sql` tem o comentário `-- NAO COMMITAR` no topo, mas está commitado no repositório com os hashes de senha reais das 6 contas. Ciente disso desde 2026-07-11 — decisão consciente de não mexer por ora (não remover/alterar por iniciativa própria); reabrir esse ponto se o repositório mudar de privado para público ou ganhar colaboradores externos.

---

## 11. Causa-raiz de erro (Root Cause Analysis)

Quando o usuário erra uma questão em **modo tutor**, abre automaticamente um modal com 5 opções:

| ID | EN | PT |
|---|---|---|
| `knowledge_gap` | Knowledge gap | Falta de conteúdo |
| `similar_diagnosis_confusion` | Confused similar diagnoses | Confundi diagnósticos parecidos |
| `mechanism_misunderstanding` | Misunderstood the mechanism | Entendi mal o mecanismo |
| `reading_error` | Misread the vignette | Erro de leitura da vinheta |
| `time_pressure` | Time pressure | Pressão do tempo |

O `root_cause_tag` é gravado no **último attempt** daquela questão. Alimenta:
1. **Analytics → Causas de erro** (gráfico de barras)
2. **Revisão Cirúrgica** (usa a causa mais frequente para montar o teste)

---

## 12. Revisão Cirúrgica (Surgical Review)

Botão disponível na tela de Resultados após erros.

**Algoritmo:**
1. Identifica a causa-raiz mais frequente nos attempts do usuário
2. Seleciona questões onde o usuário errou e marcou aquela causa-raiz
3. Complementa com questões da Passada Dirigida (incorretas/flagged)
4. Limita a 15 questões
5. Inicia um teste em modo tutor com essas questões (`test_type: 'surgical_review'`)

---

## 13. Analytics — Painéis disponíveis

Acesso: botão "Análises" na tela Home.

| Painel | O que mostra |
|---|---|
| **Desempenho por sistema** | % de acerto por `system`, barra horizontal, formato `X% (acertos/tentativas)` |
| **Comparação por passada** | % de acerto por passada (1, 2, 3, Dirigida) |
| **Causas de erro** | Frequência de cada `root_cause_tag` (barra proporcional ao máximo) |

**Regras de cálculo:**
- Omitidas são excluídas do cálculo de % de acerto
- Cada attempt conta independentemente (usuário pode ter múltiplas tentativas da mesma questão)
- Analytics só aparece quando `store.allAttempts().length > 0`
- Uma questão nova só aparece nos painéis depois que o usuário a responder pelo menos uma vez fora do modo preview

---

## 14. SmartCards — Integração com Flashcards

Botão "**+ Add to Flashcards**" disponível na explicação de cada questão (inclusive no modo preview).

**O que acontece:**
1. Abre modal com campo "Front" (usuário escreve) e "Back" (pré-preenchido com `explC` + `objective`)
2. Ao salvar, grava o card no banco de Flashcards (`couplemed_fc_{USER}`)
3. Vincula o ID do card à questão em `store.links`

**Campos herdados do card criado:**
```js
{
  tags: ['qbank', 'Cardiovascular System'],  // nome do sistema da questão
  source: 'qbank',
  sourceQuestionId: 'CMQ-STEP1-CVS-0001',
  priority: 'high',    // se a questão foi errada
  flag: 'red',         // se a questão foi errada
  state: 'new'
}
```

O deck criado se chama **"QBank SmartCards"** (mesmo nome em PT) e aparece normalmente no módulo de Flashcards. O módulo Flashcards (`public/js/flashcards.js`) espelha a mesma taxonomia (Systems > Subjects) do QBank só para fins de filtro — ele **não lê o SEED diretamente**, só os cards já criados.

---

## 15. Caderno (Notebook)

Botão "**+ Caderno**" disponível na explicação de cada questão (inclusive no modo preview).

- Abre modal com textarea livre
- Nota salva em `db.notebook[]` com `{id, question_id, content, created_at}`
- Notas aparecem indexadas na **busca global do site** (categoria "QBank · Notebook")
- O módulo Notebook (`public/js/notebook.js`) também permite, de dentro de uma nota qualquer, **linkar** para uma questão do QBank colando o ID — isso só cria um link de referência (`app.html?page=qbank-1&u=USER&q=ID`), nunca modifica a questão. Hoje esse `?q=` não é interpretado por `qbank.js` para abrir a questão diretamente (não há handler no `boot()`) — é só um rótulo/link para o QBank em geral, então não depender dele para abrir uma questão específica.

---

## 16. Lab Values — Popup de referência

Botão "**Valores Lab**" durante a resolução de questões (inclusive no modo preview). Implementado em `openLabs(q)` (`public/js/qbank.js`, ~linha 2387), chamado como `openLabs(currentQ())` no switch de ações (`case 'labs'`).

### 16a. Lista fixa e global (sempre visível, todas as questões)

Bilíngue EN/PT, igual para toda questão — editar o array `rows` dentro de `openLabs()` para mudar (mudança de código, não por questão):

| Sigla | Faixa |
|---|---|
| Na⁺ | 136–145 mEq/L |
| K⁺ | 3.5–5.0 mEq/L |
| Cl⁻ | 98–106 mEq/L |
| HCO₃⁻ | 22–28 mEq/L |
| BUN | 7–20 mg/dL |
| Creatinine | 0.6–1.2 mg/dL |
| Glucose (fasting) | 70–100 mg/dL |
| Ca²⁺ | 8.4–10.2 mg/dL |
| Hemoglobin | 13.5–17.5 g/dL (M) |
| Leukocytes | 4,500–11,000/mm³ |
| Platelets | 150–400 ×10³/mm³ |
| TSH | 0.4–4.0 µU/mL |

### 16b. Valores pertinentes por questão (campo opcional `labs`, implementado em 2026-07-11)

Além da lista fixa acima, cada questão pode ter um campo opcional `labs` — um array de exames/valores **especificamente relevantes àquela questão** (ex.: amônia numa questão de ciclo da ureia, vitamina C numa questão de escorbuto). Quando presente, esses valores aparecem em destaque (fundo azul claro) no **topo** do popup, acima da lista fixa, sob o rótulo "Relevant to this question" / "Relevante para esta questão".

**Formato** (mesma convenção da lista fixa — array de tuplas `[termo, faixa_EN, faixa_PT, significado_EN, significado_PT]`):
```js
labs:[
  ['Ammonia (venous)', '15–45 µg/dL (≈9–26 µmol/L)', '15–45 µg/dL (≈9–26 µmol/L)',
   'Elevated in urea cycle disorders (eg, OTC deficiency) due to impaired ammonia clearance',
   'Elevada nos distúrbios do ciclo da ureia (ex.: deficiência de OTC) por depuração prejudicada de amônia'],
],
```

**⚠️ ÚNICA EXCEÇÃO à Regra de Fidelidade (Seção 0.1) (definido por ele em 2026-07-11):**

- O material do usuário (UWorld/prints) **não traz** valores de referência laboratoriais. Ele pediu explicitamente que você (Claude) **pesquise e preencha** esse campo por conta própria, e delegou **total autonomia** a você sobre: (1) quais exames incluir em cada questão, e (2) quais valores de referência usar para cada um. **Você não precisa da aprovação dele para essas duas escolhas** — nem exame por exame, nem faixa por faixa. Isso é diferente do resto do processo: vignette/options/peer/explicações continuam exigindo transcrição verbatim (Seção 0.1) — a diferença é só essa fidelidade de conteúdo; desde 2026-07-13 não existe mais etapa de aprovação geral do usuário antes de commitar (Seção 0.3), então isso deixou de ser exceção nesse sentido para qualquer campo.

- **Como decidir quais exames incluir em cada questão** — analise a questão como um todo (vinheta + achados clínicos + o que está sendo perguntado + `objective`/objetivo de aprendizado) e pergunte-se: *"que exame(s) um médico pediria nesse caso, e qual resultado ajudaria o usuário a fixar o conceito sendo testado?"*. Considere especificamente, sempre que estiverem presentes na vinheta:
  - O **caso clínico e a anamnese** descritos — sintomas, queixa principal, história da doença atual.
  - **Sinais clínicos e achados de exame físico** mencionados.
  - **Sexo do paciente** (homem/mulher) — várias faixas de referência mudam por sexo (ex.: hemoglobina, creatinina, ácido orótico urinário).
  - **Faixa etária** — recém-nascido, criança, adulto, idoso — várias faixas mudam com a idade (ex.: amônia neonatal é mais alta que a do adulto; função renal e hormônios mudam com a idade).
  - **Gravidez**, quando aplicável — várias faixas mudam nesse estado fisiológico (ex.: fosfatase alcalina, D-dímero, hemoglobina, TSH).
  - **Histórico pessoal e familiar de doenças** mencionado na vinheta.
  - **O diagnóstico/mecanismo que a questão está de fato ensinando** (`objective`) — o exame escolhido deve reforçar diretamente esse aprendizado, não ser genérico ou decorativo.
  - Nem toda questão precisa de `labs` — só inclua quando a vinheta de fato menciona ou depende de achado(s) laboratorial(is) relevante(s) ao raciocínio clínico. Não force um exame artificial numa questão puramente mecanística/bioquímica sem nenhum dado clínico laboratorial no enunciado.

- **Faixas de referência NÃO são padronizadas — atenção redobrada ao pesquisar:** diferente da lista fixa global (Seção 16a, que usa faixas genéricas de "adulto saudável"), a faixa escolhida em `labs` deve refletir **o perfil do paciente daquela questão específica** sempre que idade/sexo/gravidez/condição afetarem significativamente o valor normal — não aplique cegamente uma faixa-padrão de adulto a uma criança, idoso, gestante etc. Pesquise (WebSearch) a faixa mais apropriada para aquele perfil. Quando não houver um valor único amplamente aceito (comum em exames menos padronizados, ex.: ácido orótico urinário), é preferível indicar isso ("varia por laboratório/método") a inventar uma precisão falsa.

- **Mencionar a alteração esperada no INÍCIO do campo de significado** (campos 4 e 5 da tupla — `meaning_EN`/`meaning_PT`): antes de explicar o que o exame mede, diga primeiro se ele está esperado alto, baixo, ou alterado de que forma **naquele diagnóstico/questão específica** — ex.: começar com "Elevated in…" / "Decreased in…" / "Elevada em…" / "Diminuída em…". Assim, ao abrir o popup durante o estudo, o usuário vê de imediato qual é a alteração esperada para aquele caso, não só a faixa normal isolada.

- **Não duplicar** um exame que já está na lista fixa (Seção 16a) a menos que a faixa específica da questão (por idade/sexo/condição) seja diferente da faixa genérica já exibida.

---

## 17. i18n — Internacionalização (tradução)

O QBank tem dois sistemas de tradução separados:

### Interface (botões, labels)
- Objeto `T` com sub-objetos `en` e `pt` (~linha 1309)
- Seleciona automaticamente com base em `document.documentElement.lang`
- Função `t(key)` retorna o label no idioma ativo

### Conteúdo das questões (vinheta, opções, explicações) — critério obrigatório para questões novas
- Se `ptTranslation` existir na questão, usa diretamente quando o idioma é PT-BR (função `qbField(en, ptVal)`)
- Se não existir, tenta tradução automática via `window.CMI18N` (motor compartilhado com Library e Flashcards, mais lento e menos preciso)
- O original em inglês **nunca é sobrescrito** — apenas a exibição muda
- **Toda questão nova precisa do `ptTranslation` completo** no mesmo commit (nunca deixar para depois): `vignette`, `q`, `objective`, `options` (todas as letras), `explC`, `explI` (todas as incorretas). Ver estrutura completa na Seção 2.
- A tradução deve preservar exatamente o sentido/conteúdo do original verbatim (Seção 0.1) — é uma versão fiel em PT-BR da mesma questão, não uma paráfrase nem uma "melhoria" em nenhum dos dois idiomas.
- **Não existe campo de imagem por idioma.** O campo `img` (Seção 19) é único e compartilhado entre EN e PT — não há `ptTranslation.img` nem equivalente no código atual. Se uma imagem tiver texto/rótulos em inglês que atrapalhem o estudo em PT, isso precisa ser resolvido na própria imagem (Seção 19), não via campo de tradução.

---

## 18. Busca Global

O QBank registra um provider em `window.CMSearchProviders.qbank` (~linha 1140) que indexa:
- Vinheta, stem, alternativas, explicação e objetivo de cada questão (só em inglês — o índice de busca usa os campos originais, não o `ptTranslation`)
- Notas do Caderno do usuário

Isso acontece **independente de estar na página do QBank** — o provider é registrado assim que `qbank.js` carrega em qualquer página do site (o registro fica ANTES do guard de página), permitindo que a busca global encontre questões mesmo fora do QBank. Toda questão nova em `SEED` entra automaticamente nesse índice, sem passo manual.

---

## 19. Imagens — workflow completo (posicionamento, recorte, redimensionamento)

### 19.1 O que o CSS faz — e o que ele NÃO faz

A imagem é exibida dentro de `.qb-question-image` (`public/css/qbank.css` ~linha 313):
- Container: `max-width: min(760px, 100%)`, com padding e borda.
- `<img>`: `max-width:100%`, `max-height:420px` (desktop) / `300px` (mobile ≤640px), `object-fit:contain`.

**`object-fit:contain` só encolhe a imagem para caber na caixa, preservando a proporção original — ele nunca corta nem reposiciona nada.** Isso significa que **todo o recorte e enquadramento precisam ser feitos por você (Claude) antes de salvar o arquivo**, não pelo CSS. Uma imagem com margem sobrando, texto de gabarito colado, ou watermark do material original vai aparecer exatamente assim no site — pequena e com espaço desperdiçado — se não for tratada antes.

> **Nota factual:** a legenda abaixo da imagem diz "Clique para ampliar" (`t('imageHint')`), mas **não existe nenhum listener de clique/zoom implementado no código atual** — a imagem não é clicável hoje. Não prometer esse comportamento ao usuário; se ele quiser um lightbox de verdade, é uma feature nova a implementar, não algo que já funciona.

### 19.2 Ferramentas disponíveis neste ambiente (verificado 2026-07-11)

- **Python + Pillow** — instalado nesta sessão via `python3 -m pip install --user pillow` (já presente; reinstalar só se o ambiente for outro). Uso: recorte por retângulo exato, redimensionamento com boa qualidade (`LANCZOS`), conversão de formato.
- **`sips`** (nativo do macOS, sempre disponível) — bom para redimensionar rápido ou converter formato, mas seu crop (`--cropToHeightWidth`) é sempre centralizado; não serve para recortar uma região arbitrária (ex: tirar uma legenda em um canto). Use Pillow quando o recorte precisar ser assimétrico.

### 19.3 Processo obrigatório por imagem

1. **Receber a imagem original** (screenshot/foto do material do usuário) e salvar temporariamente no scratchpad.
2. **Recortar (crop)** removendo tudo que não faz parte da figura em si: margens de página, número da questão, texto de gabarito/explicação que porventura esteja colado na mesma imagem, watermarks. Só a figura clínica/diagrama relevante deve sobrar. Exemplo com Pillow:
   ```python
   from PIL import Image
   im = Image.open('original.png')
   im.crop((left, top, right, bottom)).save('cropped.png')  # coordenadas em pixels
   ```
3. **Redimensionar** para um tamanho eficiente e nítido dentro do container real do site — como a caixa tem no máximo 760px de largura exibida, mas telas retina mostram 2x, o ideal é salvar a imagem com **~1200–1600px de largura** (ou a largura nativa se for menor) mantendo a proporção original, sem forçar um aspect ratio diferente do da imagem-fonte. Nunca estique/distorça.
   ```python
   im.thumbnail((1600, 1600))  # mantém proporção, não amplia além do original
   im.save('final.png', optimize=True)
   ```
4. **Formato:** PNG para diagramas/ilustrações/linhas (texto nítido, sem artefato de compressão); JPG (qualidade ~85) para fotos clínicas/histologia reais, para manter o arquivo leve.
5. **Nome do arquivo:** `{ID}_descricao_curta.png` (ou `.jpg`), ex: `CMQ-STEP1-CVS-0007_cardiac_output_venous_return_curves.png` — sempre em inglês, snake_case ou kebab-case, descrevendo o conteúdo da imagem.
6. **Local:** salvar em `public/assets/qbank/`.
7. **Múltiplas imagens na mesma questão:** usar array no campo `img: ['assets/qbank/ID_parte1.png', 'assets/qbank/ID_parte2.png']` — todas empilhadas verticalmente na vinheta, cada uma respeitando os mesmos limites de tamanho.
8. **Revisar sempre no preview (Seção 20)** antes de aprovar — é a única forma de ver exatamente como a imagem vai renderizar (tamanho final, corte, nitidez) dentro do layout real do site.

### 19.4 Campo no objeto da questão

```js
{ id:'CMQ-STEP1-CVS-0001', ...,
  img:'assets/qbank/CMQ-STEP1-CVS-0001_nome_descritivo.png',
  ...
}
```

Não existe campo de imagem separado para a explicação (`explImg` não existe no código) nem campo de imagem por idioma (`ptTranslation.img` não existe) — só o único campo `img`, compartilhado, renderizado sempre logo após a vinheta e antes do enunciado (`q`).

---

## 20. Testar localmente e revisar antes de aprovar

### 20.1 Opção rápida — sem servidor, sem login (funciona para QBank)
```bash
open public/app.html
# No navegador: app.html?page=qbank-1&u=guest1
```
Ou servir a pasta (evita qualquer restrição de `file://`, recomendado ao usar o preview):
```bash
cd public && python3 -m http.server 8791
# http://localhost:8791/app.html?page=qbank-1&u=guest1
```

### 20.2 Com worker completo (login real + sincronização D1)
```bash
npx wrangler dev
# Acesse: http://localhost:8787
```
> ⚠ Só ao usar o worker completo com um usuário real (`john`/`alysson`) é que `cm-sync.js` sincroniza o estado com o banco D1 remoto. No modo estático (`open` ou `http.server`), tudo fica só no localStorage local do navegador — não há risco de sincronizar dado de teste para a nuvem por engano, **exceto** se o próprio usuário estiver rodando o worker completo enquanto você testa.

### 20.3 `previewIds` — revisão isolada das questões novas (implementado e testado em 2026-07-11)

```
app.html?page=qbank-1&u=USER&previewIds=ID1,ID2,ID3
```

- Abre **só** as questões listadas em `previewIds` (IDs separados por vírgula), **na ordem exata em que foram passadas**, sem embaralhar e sem misturar com o resto do banco.
- A explicação de cada questão já aparece **revelada automaticamente** (gabarito, explicação, peer stats, imagem) — não é preciso clicar em nada para ver o resultado final.
- Um banner amarelo no topo confirma "PREVIEW MODE — N questões" e lista qualquer ID que não tenha sido encontrado no banco (erro de digitação, questão ainda não inserida etc.).
- **100% somente-leitura, verificado no código e por teste automatizado (Playwright) nesta sessão:** os botões Submit, Suspend e End Block ficam ocultos; clicar numa alternativa não faz nada; `submitAnswer()` e `endBlock()` têm um retorno antecipado quando `T0.preview` é verdadeiro. Nenhum `attempt`, `test` ou dado de passada é gravado — `localStorage['couplemed_qb_USER']` fica exatamente como estava antes de abrir o preview. Isso significa que abrir o preview **nunca** afeta % de passada, Analytics, ou (se estiver rodando com o worker completo) a sincronização D1 do usuário real.
- **Botões que continuam ativos no preview** (intencional): Flag, "+ Add to Flashcards" e "+ Notebook" — são ações aditivas que o usuário pode querer fazer já durante a revisão, e não geram attempt nem afetam passada/analytics.
- Navegação: Prev/Next/clique no grid mantêm a explicação sempre revelada (não precisa clicar de novo a cada questão).
- Implementado em `boot()` (~linha 1580, branch `previewIds`) e em pontos pontuais de `renderTest`/`submitAnswer`/`endBlock`/switch de ações (buscar `T0.preview` ou `view.test.preview` no arquivo para ver todos os pontos).

**Fluxo recomendado ao terminar uma leva de questões:**
1. *(Opcional, só para conferência própria)* Montar a URL com os IDs da leva e servir/abrir localmente (20.1) antes de commitar.
2. `git add`/`git commit`/`git push` automaticamente em seguida — desde 2026-07-13 nenhuma etapa espera aprovação ou pedido explícito do usuário (Seção 0.3). Ele confere depois direto no site publicado, localizando a leva pela seção/taxonomia (Seções 4/5) em que foi inserida.

### 20.4 URLs de acesso direto por passada
```
app.html?page=qbank-1         → QBank Home (Pass Navigator)
app.html?page=qbank1-pass-1   → Create Test pré-filtrado: Passada 1
app.html?page=qbank1-pass-2   → Create Test pré-filtrado: Passada 2
app.html?page=qbank1-pass-3   → Create Test pré-filtrado: Passada 3
app.html?page=qbank1-pass-4   → Create Test pré-filtrado: Passada Dirigida
```

### 20.5 Parâmetros de URL úteis
```
?u=john        → abre como usuário john (admin, sem locks)
?u=alysson     → abre como usuário alysson (não é admin — ver Seção 7)
?u=guest1      → usuário de teste, sem tocar em dados reais de ninguém (default se ?u= for omitido)
?pass=2        → abre Home com Passada 2 selecionada
?previewIds=ID1,ID2 → modo preview isolado (Seção 20.3)
```

**Recomendação:** para qualquer teste que não seja o preview isolado (ex: navegar o Create Test normal para conferir se a questão aparece no filtro certo), usar sempre `u=guest1` (ou outro usuário de teste) — nunca `u=john`/`u=alysson` — para não gerar attempts reais nas contas do casal por engano.

---

## 21. Como o QBank se conecta com o resto do site (mapa de integração)

Lista de todo ponto de contato encontrado no código entre o QBank e outros módulos — relevante porque adicionar uma questão nova automaticamente "aparece" em todos esses lugares, sem passo manual extra:

| Módulo/arquivo | Conexão com o QBank |
|---|---|
| `public/js/site.js` | Menu lateral (QBank 1/2, Library 1/2/3), título de página (`PAGE_TITLE_KEYS`), índice de busca global consome `window.CMSearchProviders.qbank` |
| `public/js/cm-sync.js` | Sincroniza a chave `qb` (todo o blob de `couplemed_qb_{USER}`) entre aparelhos via `/api/state`, só quando rodando com o worker completo (Seção 20.2) e usuário logado. Resolução de conflito é "last write wins" por `updated_at` |
| `public/js/notebook.js` | Permite criar um link de referência para uma questão do QBank a partir de uma nota (não modifica a questão; ver Seção 15) |
| `public/js/flashcards.js` | Espelha a mesma taxonomia (Systems > Subjects) do QBank só para os filtros de Flashcards — não lê `SEED`. A ligação real de dados acontece via SmartCards (Seção 14), que grava direto no banco de Flashcards |
| `public/css/qbank.css` | Todo o estilo visual, inclusive as regras de imagem (Seção 19.1) |
| `window.CMI18N` (`public/js/i18n-content.js`) | Motor de tradução automática compartilhado — usado como fallback quando uma questão não tem `ptTranslation` (Seção 17) |

**Não existe** hoje: handler de `?q=ID` para abrir uma questão específica direto por URL (só um link "de fachada" existe em `notebook.js`, sem contraparte em `qbank.js`); lightbox/zoom de imagem (Seção 19.1); QBank 2/Library 2/3 funcionais (Seção 4b).

---

## 22. Breakpoints responsivos do site (espelhado de `RESPONSIVE_BREAKPOINTS.md`)

> Fonte fixa/canônica: `RESPONSIVE_BREAKPOINTS.md` na raiz do projeto. Este conteúdo é uma cópia mantida em sincronia aqui para que a leitura de **apenas este arquivo** já seja suficiente — se um dia os dois divergirem, `RESPONSIVE_BREAKPOINTS.md` é quem vale, e esta seção deve ser atualizada para bater com ele. Relevante para QBank sempre que uma questão tiver imagem (Seção 19) ou se o usuário pedir ajuste visual na tela do QBank.

### 22.1 Os 3 breakpoints estruturais (desktop → iPad → mobile)

| Breakpoint | Alvo | O que muda estruturalmente |
|---|---|---|
| `max-width:1180px` | iPad landscape / laptop pequeno | `--sidebar` encolhe para `214px`; `.dashboard-strip` vira 4 colunas; 2 últimos `.action` do dashboard somem; `.brand strong` reduz para 15px |
| `max-width:820px` | iPad portrait / tablet | **O mais importante do site**: aparece `.mobile-menu-button` (hambúrguer fixo); `.sidebar` sai da tela e só volta com `.sidebar.open`; `.sidebar-scrim.open` cobre a tela; `.dashboard-strip` vira 1 coluna; `.progress-card` some |
| `max-width:520px` | Celular | `.platform-main` remove padding lateral; `.internal-card` perde borda lateral/arredondamento (cards full-width); `.brand` reduz margem |

### 22.2 Breakpoint específico do QBank (`public/css/qbank.css`)

| Linha | Breakpoint | O que acontece |
|---|---|---|
| 20 | `max-width:640px` | `#internalContent.qb-wide .internal-card` reduz padding |
| 82 | `max-width:900px` | `.qb-stepper` (navegador de passadas) quebra linha; `.qb-step` ~44% cada; conector some |
| 83 | `max-width:560px` | Cada `.qb-step` ocupa 100% |
| 118 | `max-width:720px` | `.qb-row` (grid 2 colunas do Create Test) vira 1 coluna |
| 246 | `max-width:640px` | Tela de resultados/resolução empilha em coluna (`.qb-perf`, `.qb-res-top`, `.qb-nav`, `.qb-head-tools`) |
| 259 | `max-width:820px` | `.qb-tax` (accordion de sistemas no Create Test) vira 1 coluna |
| 344 | `max-width:640px` | Imagem da questão: reduz padding/margem, `max-height` cai para 300px, legenda some — **ver Seção 19.1, é o valor usado no workflow de imagem** |

### 22.3 Demais módulos (referência rápida — tabela completa por linha está em `RESPONSIVE_BREAKPOINTS.md`)

| Módulo/arquivo | Breakpoints | Resumo |
|---|---|---|
| `styles.css` — Flashcards | 820px, 900px, 560px, 640px | Stats/decks/taxonomia/performance reorganizam em menos colunas |
| `styles.css` — Settings | 768px, 900px, 560px | Navegação vira horizontal rolável, painéis viram 1 coluna |
| `styles.css` — My Workspace | 720px | Grid de cards vira 1 coluna, título reduz para 26px |
| `notebook.css` | 1024px, 640px | Grid de notas, cabeçalho e editor adaptam |
| `ai-tutor-widget.css` | 480px | Widget reposiciona mais perto da borda |

**640px é o valor mais reaproveitado entre módulos** ("virou mobile" daquele componente); **820px é o breakpoint crítico global** (hambúrguer) — qualquer elemento fixo/flutuante precisa considerar essa faixa para não sobrepor o botão do menu.

---

## 23. Checklist antes de commitar

- [ ] `id` único (grep para confirmar que não existe)
- [ ] `system`, `category` e `discipline` válidos (consultar Seções 4 e 5) — ou subtópico novo registrado no TAXONOMY (Seção 6)
- [ ] Vignette/q/options/correct/explC/explI/objective transcritos **verbatim** do material do usuário (Seção 0.1)
- [ ] `peer` veio do material do usuário e soma exatamente 100 (Seção 0.1) — nunca inventado
- [ ] `correct` é uma das letras em `options`
- [ ] `difficulty` calculado a partir de `peer[correct]` pela tabela da Seção 0.2 (não escolhido no olho)
- [ ] `explI` cobre TODAS as alternativas incorretas
- [ ] Se a questão menciona/depende de exame laboratorial relevante: campo `labs` preenchido, exame/faixa escolhidos com autonomia por você — Claude, sem necessidade de aprovação do usuário para essa escolha (Seção 16b, única exceção à Seção 0.1)
- [ ] `ptTranslation` incluída com todos os campos, fiel ao original (Seção 17)
- [ ] Se tiver imagem: processada segundo a Seção 19 (recorte, tamanho, formato, nome, local em `public/assets/qbank/`)
- [ ] `library` omitido (ou explicitamente `1`) a menos que o usuário tenha pedido Library 2/3 (Seção 4b)
- [ ] `node --check public/js/qbank.js` sem erro de sintaxe
- [ ] *(Opcional)* Leva conferida via `previewIds` (Seção 20.3) só para checagem própria — não precisa ser mostrada/enviada ao usuário nem aguardar aprovação (mudança de política em 2026-07-13, Seção 0.3)
- [ ] Se a leva for grande, mencionar no resumo final o efeito no % de passadas (Seção 7) — informativo, não bloqueia o commit
- [ ] Commit e push automáticos, sem aprovação nem pedido explícito por leva (Seção 0.3)
