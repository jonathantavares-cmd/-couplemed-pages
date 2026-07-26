# CoupleMed — Breakpoints Responsivos (Media Queries)

> Referência definitiva de todo `@media` do site: onde está, o que exatamente controla, e os 3 breakpoints estruturais que fazem o layout migrar entre desktop → iPad → mobile.
> Verificado linha a linha contra o CSS real em 2026-07-11. Se algum valor mudar no CSS, atualizar esta tabela junto — não deixar o arquivo divergir do código.

---

## 0. Os 3 breakpoints estruturais (o que define desktop → iPad → mobile)

Estes são os únicos que mudam a **estrutura** do layout (sidebar, navegação, grid principal). Os demais (Seção 2+) são ajustes finos de componentes específicos.

| Breakpoint | Alvo | O que muda estruturalmente |
|---|---|---|
| `max-width:1180px` | iPad landscape / laptop pequeno | `--sidebar` (variável CSS) encolhe para `214px`; `.dashboard-strip` vira 4 colunas (`1.3fr 1.8fr .9fr .9fr`); os 2 últimos `.action` do dashboard somem (`:nth-last-child(-n+2){display:none}`); `.brand strong` reduz para 15px |
| `max-width:820px` | iPad portrait / tablet | Aparece `.mobile-menu-button` (botão hambúrguer fixo, 42×42px, canto superior esquerdo); `.sidebar` sai da tela (`translateX(-105%)`) e só volta com `.sidebar.open`; `.sidebar-scrim.open` cobre a tela (overlay escuro) quando o menu abre; `.platform-main` perde a margem lateral da sidebar (`margin-left:0`); `.dashboard-strip` vira 1 coluna; `.progress-card` some (`display:none`) |
| `max-width:520px` | Celular | `.platform-main` remove padding lateral; `.internal-card` perde borda lateral e arredondamento (`border-radius:0`, sem borda esq/dir — cards ocupam a largura total); `.brand` reduz margem inferior |

Todo o resto do site (My Workspace, Flashcards, QBank, Notebook, AI Tutor, Settings) tem os próprios ajustes de detalhe dentro dessas três faixas, listados abaixo por arquivo.

---

## 1. `public/css/styles.css` — layout global + Flashcards + Settings

| Linha | Breakpoint | Escopo | O que acontece |
|---|---|---|---|
| 35 | `orientation:portrait` | Global | Ajustes de orientação vertical (qualquer largura) |
| 70 | `max-width:1180px` | Global (sidebar/dashboard) | Ver Seção 0 |
| 71 | `max-width:820px` | Global (menu hambúrguer) | Ver Seção 0 |
| 72 | `max-width:520px` | Global (padding/cards) | Ver Seção 0 |
| 146 | `max-width:820px` | Flashcards | `.fc-stats` e `.fc-rates` viram grid 2 colunas; `.fc-deck` empilha em coluna; `.fc-row` quebra linha |
| 212 | `max-width:820px` | Flashcards (deck/browse) | `.fc-deck-header`/`.fc-deck-row` reorganiza colunas; `.fc-browse-bar` vira 1 coluna; `.fc-state-grid` vira 2 colunas |
| 243 | `max-width:820px` | Flashcards (hero) | `.fc-hero` alinha ao início; `.fc-perf-row .fc-review` ocupa 100% da largura |
| 278 | `max-width:820px` | Flashcards (compartilhado) | `.fc-share-banner` empilha em coluna; `.fc-share-counts` troca borda esquerda por borda superior |
| 302 | `max-width:820px` | Flashcards (taxonomia) | `.fc-tax` vira 1 coluna (`column-count:1`) |
| 376 | `max-width:640px` | Flashcards (seletor de sistema) | `.fc-syspick-grid` vira 1 coluna |
| 455 | `max-width:900px` | Flashcards (performance) | `.fc-perf-grid` vira 2 colunas; `.fc-perf-streak` ocupa 2 colunas |
| 456 | `max-width:560px` | Flashcards (performance) | `.fc-perf-grid` vira 1 coluna; `.fc-cta` ocupa 100% |
| 484 | `max-width:560px` | Flashcards (barras Step 1) | `.step1-bars` empilha em coluna |
| 508 | `max-width:820px` | Busca global (header) | `.search-toggle` encolhe; campo de busca expandido fica mais estreito |
| 594 | `max-width:768px` | Settings | `.stg-user-header` empilha; `.stg-user-actions` ocupa 100%; `.stg-perf-panel` vira 1 coluna; `.stg-info-row` empilha |
| 746 | `max-width:900px` | Settings (navegação) | `.stg-shell` vira 1 coluna; `.stg-nav` fica horizontal e rolável; `.stg-nav-user` some |
| 753 | `max-width:560px` | Settings (cards) | `.stg-card` reduz padding; `.stg-unlock-row` empilha; `.stg-user-actions` quebra linha |
| 862 | `max-width:720px` | **My Workspace** (novo) | `.cm-ws-grid` vira 1 coluna; `.cm-ws-head h1` reduz para 26px |

---

## 2. `public/css/qbank.css` — QBank

| Linha | Breakpoint | O que acontece |
|---|---|---|
| 20 | `max-width:640px` | `#internalContent.qb-wide .internal-card` reduz padding (18px 14px) |
| 85 | `max-width:560px` | `.qb-stepper` (navegador de passadas) quebra linha; cada `.qb-step` ocupa 100%; conector entre steps some. **v52**: antes havia um estágio intermediário em 900px (2 por linha) — removido de propósito para o iPad ficar visualmente igual ao desktop (só reagrupa perto da largura real de celular) |
| 120 | `max-width:720px` | `.qb-row` (grid de 2 colunas do Create Test — usado só na tela standalone `/create` com o filtro "Passada" visível) vira 1 coluna |
| 158 | `max-width:480px` | Barra unificada "Nº de questões + disponíveis + Gerar Teste" (`.qb-gen`) empilha em coluna; botão vira 100% da largura |
| 274 | `max-width:640px` | Tela de resultados/resolução: `.qb-perf`, `.qb-res-top`, `.qb-nav` empilham em coluna; `.qb-head-tools` ocupa 100% |
| 289 | `max-width:560px` | `.qb-tax` (accordion de sistemas no Create Test) vira 1 coluna. **v52**: era 820px — baixado para 560px para o iPad manter 2 colunas igual ao desktop, só virando 1 coluna perto da largura real de celular (mesmo valor do stepper acima) |
| 377 | `max-width:640px` | Imagem da questão (`.qb-question-image`): reduz padding/margem, `max-height` da imagem cai para 300px, legenda "Click to enlarge" some |

---

## 3. `public/css/notebook.css` — Notebook (Caderno)

| Linha | Breakpoint | O que acontece |
|---|---|---|
| 20 | `max-width:640px` | `#internalContent.nb-wide .internal-card` reduz padding |
| 189 | `max-width:1024px` | `.nb-page-text` ajusta padding |
| 192 | `max-width:640px` | `.nb-grid` vira grid auto-fill de 150px; `.nb-head`/`.nb-actions` empilham; título/texto reduzem |
| 299 | `max-width:640px` | (bloco "v2" — favoritos/multi-página) `.nb-note-grid` ajusta para 140px; `.nb-ed-head` quebra linha; `.nb-read-body` reduz padding |

---

## 4. `public/css/ai-tutor-widget.css` — AI Tutor

| Linha | Breakpoint | O que acontece |
|---|---|---|
| 50 | `max-width:480px` | `.ai-tutor-panel` e `.ai-tutor-launcher` reposicionam mais próximos da borda (16px) para caber em telas muito pequenas |

---

## 5. Como usar isto ao criar/ajustar UI

- **Antes de adicionar um componente novo**, verificar se ele precisa de ajuste nos 3 breakpoints estruturais (1180/820/520 — Seção 0) e, se for específico de um módulo (QBank/Notebook/Flashcards/AI Tutor/Settings/My Workspace), seguir o padrão de breakpoint já usado naquele arquivo em vez de inventar um valor novo.
- **820px é o breakpoint mais importante do site** — é onde o menu lateral vira hambúrguer com scrim. Qualquer elemento fixo/posicionado (como `.mobile-menu-button` ou os botões flutuantes do AI Tutor) precisa considerar esse breakpoint para não sobrepor o botão do menu.
- **640px é o valor mais reaproveitado** entre os módulos (QBank, Notebook, Flashcards, styles.css) — ao criar uma tela nova dentro de um módulo existente, esse é o breakpoint padrão de "virou mobile" dentro daquele componente.
- Ao editar este arquivo, sempre reconferir contra o CSS real (`grep -n "@media" public/css/*.css`) — não copiar valores de memória.
