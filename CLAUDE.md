# CoupleMed — memória do projeto

Este arquivo é carregado automaticamente em toda sessão do Claude Code aberta nesta pasta.
Vale para todas as sessões (inclusive as paralelas).

**Idioma:** responder sempre em português.

---

## 1. Política de modelo e esforço

### Níveis

Os níveis abstratos (**medium / high / ultra**) e o mapeamento por plataforma já estão escritos
nos docs canônicos — esta seção **não os redefine**, só aponta:

- `QBANK_ADD_QUESTION.md` §3.1–3.4
- `LIBRARY1_ADD_CONTENT.md` §0.4.1–0.4.4
- `RESPONSIVE_BREAKPOINTS.md` §7.1

Mapeamento para Claude Code (§3.3 do QBank):

| Nível | Modelo | Effort | Para quê |
|---|---|---|---|
| medium | `haiku` | medium | mecânico: inventário, IDs, dedup, ordenação, checklists, schema conhecido |
| high | `sonnet` | high; max só quando suportado e justificado | tradução médica, Lab Values, tabelas densas, OCR/crop com julgamento, QA responsivo |
| ultra | `opus` | xhigh / max, conforme a versão | conflito de fontes, taxonomia nova, CSS crítico, regressão sem causa |

**Padrão de entrada deste repositório: `sonnet` + effort `medium`** (`.claude/settings.json`) —
é o nível mais baixo que serve para a maioria das sessões. Ao entrar em bloco médico/visual,
subir o effort para `high` conforme os docs; ao entrar em bloco crítico, subir para `opus`.

### Regras

1. Começar sempre no nível mais baixo que preserve a fidelidade.
2. Escalar apenas a **menor unidade necessária** — um bloco, não a sessão inteira.
3. Voltar ao nível econômico assim que o bloco crítico terminar.
4. **Modelo mais forte nunca autoriza inventar conteúdo** ausente, ilegível ou contraditório.
   Fonte ilegível continua sendo motivo de parar e perguntar, em qualquer modelo.

### O que é automático e o que não é

Isto é importante e não deve ser reescrito como se fosse mágico:

- **Troca automática de verdade:** subagentes declarados em `.claude/agents/` rodam no modelo
  fixado no frontmatter deles. Quando o Claude delega para `mecanico`, aquele trabalho roda em
  Haiku sem ninguém digitar nada.
- **Semi-automático:** o perfil `opusplan` (`/model opusplan`) planeja em Opus e executa em
  Sonnet sozinho. Usar quando a parte ambígua é o planejamento e a execução é rotina.
- **Não é automático:** o modelo da **sessão principal**. Não existe hook, config ou comando que
  troque o modelo da conversa principal no meio dela. Só `/model`, digitado pelo Jonathan.
  O esforço também não muda sozinho, mas pode ser alterado por `/effort` ou no seletor de
  `/model`, além de `--effort`, `CLAUDE_CODE_EFFORT_LEVEL`, `effortLevel` nos settings e
  `effort` no frontmatter de skill/subagente. Confirmar o valor ativo porque níveis não
  suportados podem sofrer fallback.

Portanto, quando um bloco exigir nível acima do padrão, o Claude deve:

1. **avisar antes** de começar o bloco;
2. dizer qual nível é necessário e o comando exato (`/model opus`);
3. **avisar depois**, explicitamente, quando é seguro voltar (`/model sonnet`).

Nunca começar em silêncio um bloco crítico num modelo insuficiente.

### Delegação automática (usar sem perguntar)

Delegar para o subagente **`mecanico`** (Haiku) quando a tarefa for repetitiva e o critério já
estiver escrito em algum doc canônico: varreduras, conferência de IDs, dedup, inventário de
arquivos, checagem de campos obrigatórios, contagem de questões/tópicos, verificação de padrão.

Delegar para **`tradutor-medico`** (Sonnet) para lotes de tradução EN→PT já com critério definido
por `QBANK_ADD_QUESTION.md` / `LIBRARY1_ADD_CONTENT.md`.

Não delegar quando: a tarefa exige contexto acumulado da conversa, é curta (delegar custa mais
que fazer), ou envolve decidir o critério em vez de aplicá-lo.

### Relatório de escalonamento

Sempre que houver escalonamento, incluir no relatório final:

- unidade afetada;
- motivo do escalonamento;
- nível usado;
- ponto em que o trabalho voltou ao nível econômico.

---

## 2. Disciplina de escopo

Não modificar arquivos fora do fluxo ativo sem necessidade explícita.

Documentos canônicos (a fonte é o doc, não a memória):

- `QBANK_ADD_QUESTION.md` — QBank
- `LIBRARY1_ADD_CONTENT.md` — Library 1 e narração (§17)
- `RESPONSIVE_BREAKPOINTS.md` — responsividade (1180 / 820 / 520 px)
- `WORKSPACE_GOODNOTES_SPEC.md` — My Workspace

Regras:

- Trabalhando em Library 1, não tocar em arquivos do QBank, e vice-versa.
- Não misturar conteúdo de Library 1 e QBank no mesmo commit.
- Há sessões concorrentes neste repo: `git fetch` e comparar com o remoto **antes** de commitar
  ou dar push. Commits alheios aparecendo no histórico não são bug.

---

## 3. Conteúdo bilíngue

Regra do site inteiro: EN e PT entram **juntos, no mesmo commit** (QBank, Flashcards, Medical
Library). Imagem em PT só quando fornecida.

---

## 4. Antes de acabar o contexto

Avisar cedo quando a tarefa parecer longa e sugerir um ponto de pausa, para a troca de conta
acontecer antes do corte — não depois.
