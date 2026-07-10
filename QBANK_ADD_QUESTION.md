# CoupleMed QBank — Documentação Completa

> Referência definitiva do módulo QBank: como adicionar questões, como todos os sistemas funcionam, e como cada funcionalidade se conecta.

---

## 1. Arquivo principal

```
public/js/qbank.js
```

Todo o QBank (dados + lógica + UI) vive neste único arquivo. Estrutura interna:

| Seção | Linhas aprox. | O que é |
|---|---|---|
| `const SEED = [...]` | ~42–1128 | Array com todas as questões |
| `ROOT_CAUSES` | ~1172 | 5 causas-raiz de erro disponíveis |
| `const TAXONOMY` | ~1183 | Hierarquia de sistemas e subtópicos |
| `SYSTEM_ALIASES` | ~1257 | Aliases de IDs de sistemas |
| `DISCIPLINE_LABELS` | ~1267 | Mapa discipline → label exibido |
| `const store` | ~1431 | Camada de dados (lê/grava localStorage) |
| `filterPool` | ~1524 | Filtragem de questões para Create Test |
| `renderHome` | ~1605 | Pass Navigator (tela inicial) |
| `renderCreate` | ~1738 | Create Test (filtros) |
| `renderTest` | (após renderCreate) | Tela de resolução das questões |
| `renderResults` | ~2011 | Tela de resultados do bloco |
| `renderAnalytics` | ~2056 | Analytics (desempenho, causas-raiz) |
| Modais | ~2086 | Root Cause, Flashcard, Notebook, Lab Values |

---

## 2. Estrutura de uma questão (SEED)

```js
{ id:'CMQ-STEP1-XXX-0001',

  // classificação — define filtros E tags exibidas na explicação
  system:'cardiovascular',
  discipline:'pathophysiology',
  category:'cardiovascular::valvular_heart_diseases',
  difficulty:'medium',           // 'easy' | 'medium' | 'hard'

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

  // peer stats — % de escolha por alternativa (deve somar 100)
  peer:{A:71, B:9, C:12, D:5, E:3},

  // OPCIONAL: imagem exibida na vinheta
  img:'assets/qbank/CMQ-STEP1-CVS-0001_nome_imagem.png',

  // OPCIONAL mas recomendado: tradução PT-BR completa
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

Apenas acrescentar mais uma opção em `options` (label `F`) e adicionar `F` em `peer` e `explI`. O sistema detecta automaticamente.

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

---

## 4. Sistema de classificação (system / category / discipline)

Estes três campos controlam:
- **Onde a questão aparece** nos filtros do Create Test
- **Quais chips (tags) aparecem** no final da explicação (Subject / System / Topic)

### Como as tags são geradas automaticamente

| Chip exibido | Campo da questão | Exemplo |
|---|---|---|
| **Subject** | `discipline` | `biostatistics` → "Biostatistics" |
| **System** | `system` | `biostatistics_epidemiology` → "Biostatistics & Epidemiology" |
| **Topic** | parte após `::` em `category` | `hypothesis_testing` → "Hypothesis testing" |

> Se um slug de topic não existir no TAXONOMY, o sistema gera o label via `titleFromSlug` (converte `snake_case` → "Title Case"). Para label exato (ex: "Hypothesis testing" em vez de "Hypothesis Testing"), registrar no TAXONOMY — ver Seção 6.

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
- `passProgress(pn)` retorna `{total, answered, pct, done}`
- A passada N está **concluída** quando TODAS as questões têm ≥ N attempts

**Passada Dirigida (99):**
- Pool dinâmico: questões com último attempt `incorrect` OU com flag ativo
- Excluídas automaticamente: questões com 2 acertos consecutivos

**Desbloqueio manual (admin):**
```js
localStorage.setItem('couplemed_qb_unlock_john', '3'); // desbloqueia até passada 3
```
O usuário `john` (USER = 'john') é admin e bypassa os locks.

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

> **Importante:** attempts são INSERT-only. O sistema NUNCA modifica um attempt já gravado. O `pass_number` é calculado no momento da gravação com base nos attempts anteriores daquela questão.

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

---

## 14. SmartCards — Integração com Flashcards

Botão "**+ Add to Flashcards**" disponível na explicação de cada questão.

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

O deck criado se chama **"QBank SmartCards"** (ou "QBank SmartCards" em PT) e aparece normalmente no módulo de Flashcards.

---

## 15. Caderno (Notebook)

Botão "**+ Caderno**" disponível na explicação de cada questão.

- Abre modal com textarea livre
- Nota salva em `db.notebook[]` com `{id, question_id, content, created_at}`
- Notas aparecem indexadas na **busca global do site** (categoria "QBank · Notebook")

---

## 16. Lab Values — Popup de referência

Botão "**Valores Lab**" durante a resolução de questões.

Valores disponíveis no popup (bilíngue EN/PT):

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

> Para adicionar um novo valor de laboratório, editar o array `rows` dentro da função `openLabs()` (~linha 2154).

---

## 17. i18n — Internacionalização

O QBank tem dois sistemas de tradução separados:

### Interface (botões, labels)
- Objeto `T` com sub-objetos `en` e `pt`
- Seleciona automaticamente com base em `document.documentElement.lang`
- Função `t(key)` retorna o label no idioma ativo

### Conteúdo das questões (vinheta, opções, explicações)
- Se `ptTranslation` existir na questão, usa diretamente quando o idioma é PT-BR
- Se não existir, tenta tradução automática via `window.CMI18N` (motor compartilhado com Library e Flashcards)
- O original em inglês **nunca é sobrescrito** — apenas a exibição muda
- Função `qbField(en, ptVal)` — usa ptVal se idioma PT e ptVal existe, senão usa CMI18N

> **Melhor prática:** sempre incluir `ptTranslation` completo nas questões novas para evitar depender da API de tradução automática.

---

## 18. Busca Global

O QBank registra um provider em `window.CMSearchProviders.qbank` que indexa:
- Vinheta, stem, alternativas, explicação e objetivo de cada questão
- Notas do Caderno do usuário

Isso acontece **independente de estar na página do QBank** — o provider é registrado ao carregar o JS, permitindo que a busca global do site encontre questões mesmo em outras páginas.

---

## 19. Questões com imagem

Para questões com imagem na vinheta, adicionar o campo `img`:

```js
{ id:'CMQ-STEP1-CVS-0001', ...,
  img:'assets/qbank/CMQ-STEP1-CVS-0001_nome_descritivo.png',
  ...
}
```

- Imagens ficam em `public/assets/qbank/`
- Convenção de nome: `{ID}_descricao_curta.png`
- Clicável para ampliar (toast "Clique para ampliar a imagem")

---

## 20. Testar localmente

**Opção rápida** (sem login, funciona para QBank):
```bash
open public/app.html
# No navegador: app.html?page=qbank-1&u=guest1
```

**Com worker completo** (login + D1):
```bash
npx wrangler dev
# Acesse: http://localhost:8787
```

**URLs de acesso direto por passada:**
```
app.html?page=qbank-1         → QBank Home (Pass Navigator)
app.html?page=qbank1-pass-1   → Create Test pré-filtrado: Passada 1
app.html?page=qbank1-pass-2   → Create Test pré-filtrado: Passada 2
app.html?page=qbank1-pass-3   → Create Test pré-filtrado: Passada 3
app.html?page=qbank1-pass-4   → Create Test pré-filtrado: Passada Dirigida
```

**Parâmetros de URL:**
```
?u=john        → abre como usuário john (admin, sem locks)
?pass=2        → abre Home com Passada 2 selecionada
```

---

## 21. Checklist antes de commitar

- [ ] `id` único (grep para confirmar que não existe)
- [ ] `system` e `category` válidos (consultar Seção 5)
- [ ] `peer` soma exatamente 100
- [ ] `correct` é uma das letras em `options`
- [ ] `explI` cobre TODAS as alternativas incorretas
- [ ] `ptTranslation` incluída com todos os campos
- [ ] Se tiver imagem: arquivo em `public/assets/qbank/` com nome correto
- [ ] Testado localmente: questão aparece no filtro correto do Create Test
- [ ] Testado localmente: responder a questão gera attempt e aparece em Analytics
