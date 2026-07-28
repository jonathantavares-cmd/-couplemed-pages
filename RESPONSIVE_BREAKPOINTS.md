# CoupleMed — Breakpoints Responsivos (Media Queries)

> Referência dos breakpoints responsivos estruturais e dos principais `@media` por módulo: onde estão, o que controlam, e os 3 breakpoints que fazem o layout migrar entre desktop → iPad → mobile.
> Verificado contra o CSS real em 2026-07-28 para o fluxo do QBank e seus breakpoints principais. Se algum valor mudar no CSS, atualizar esta tabela junto — não deixar o arquivo divergir do código.

Para auditoria completa de todos os `@media` atuais, usar sempre:
```bash
rg -n "@media" public/css/*.css
```

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
| 146 | `max-width:820px` | Flashcards | `.fc-stats` e `.fc-rates` viram grid 2 colunas; `.fc-deck` empilha em coluna |
| 155 | `max-width:820px` | Flashcards (Navegar/Browse) | `.fc-row` empilha (texto em cima, ações embaixo) e `.fc-row-actions` quebra linha — os até 6 botões da linha (🚩/enterrar/suspender/compartilhar/editar/excluir), com rótulos longos em PT, não cabem ao lado do texto |
| 160 | `max-width:520px` | Flashcards (Navegar/Browse + tela de estudo) | `.fc-row-actions .fc-btn` vira grade flexível (`flex:1 1 auto`); `.fc-card` (tela de estudo) reduz padding/fonte; `.fc-review-tools` quebra linha |
| 233 | `max-width:820px` | Flashcards (deck/browse) | `.fc-deck-header`/`.fc-deck-row` reorganiza colunas; `.fc-browse-bar` vira 1 coluna; `.fc-state-grid` vira 2 colunas |
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
| 74 | `max-width:760px` | Guia visual do QBank reorganiza hero/quick/steps/nav para telas menores |
| 75 | `max-width:520px` | Guia visual empilha steps/nav/items em 1 coluna, reduz padding e oculta número decorativo |
| 120 | `max-width:560px` | `.qb-stepper` (navegador de passadas) quebra linha; cada `.qb-step` ocupa 100%; conector entre steps some. **v52**: antes havia um estágio intermediário em 900px (2 por linha) — removido de propósito para iPad/MacBook ficarem visualmente iguais ao desktop |
| 155 | `max-width:720px` | `.qb-row` (grid de 2 colunas do Create Test — usado só na tela standalone `/create` com o filtro "Passada" visível) vira 1 coluna |
| 193 | `max-width:480px` | Barra unificada "Nº de questões + disponíveis + Gerar Teste" (`.qb-gen`) empilha em coluna; botão vira 100% da largura |
| 317 | `max-width:640px` | Tela de resultados/resolução: `.qb-perf`, `.qb-res-top`, `.qb-nav` empilham em coluna; `.qb-head-tools` ocupa 100% |
| 332 | `max-width:560px` | `.qb-tax` (accordion de sistemas no Create Test) vira 1 coluna. **v52**: era 820px — baixado para 560px para iPad/MacBook manterem 2 colunas igual ao desktop |
| 423 | `max-width:640px` | Imagem da questão (`.qb-question-image`): reduz padding/margem, `max-height` da imagem cai para 300px, legenda "Click to enlarge" some |
| 437 | `max-width:640px` | Toolbar de resolução compacta: cabeçalho não quebra, `.qb-head-tools` rola horizontalmente, ferramentas reduzem fonte/padding e timer reduz fonte |

### 2.1 QBank — obrigação de QA responsivo para questões e imagens

Toda questão nova ou auditada, especialmente quando tiver `img` ou `explImg`, deve ser conferida contra estes breakpoints antes de ser marcada como concluída:

| Classe de dispositivo | Largura sugerida para teste | Critérios obrigatórios |
|---|---|---|
| Monitor grande / 27" | `2560×1440` ou largura equivalente | Figura/tabela não deve ficar pequena por excesso de margem; conteúdo centralizado e legível dentro do limite do QBank |
| Desktop / laptop grande | `1440×900` | Toolbar, enunciado, alternativas, imagem e explicação sem sobreposição ou desalinhamento |
| MacBook | `1280×800` ou `1366×768` | Stepper/taxonomia mantêm o comportamento desktop/tablet quando houver largura; sem truncamentos ruins |
| iPad | `1024×768` e `820×1180` | Sidebar vira hambúrguer em `820px`; QBank continua sem overflow horizontal; imagem permanece legível |
| Mobile | `390×844` e `360×780` | Imagem respeita `max-height:300px`, toolbar rola horizontalmente, alternativas/explicações/Lab Values não se sobrepõem |

Falhas bloqueiam o `✅`: overflow horizontal da página, texto sobreposto, botão inacessível, imagem distorcida, imagem importante ilegível no mobile ou recorte com margem excessiva que reduza demais o conteúdo real.

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

## 5. `public/css/cm-narrator.css` — Narrador (barra de leitura das Libraries 1/2/3)

Acompanha os cortes do leitor (`library3-reader.css`), porque a barra vive dentro dele.

| Linha | Breakpoint | O que acontece |
|---|---|---|
| 163 | `max-width:1180px` | Reduz o `gap` e o padding da barra; botão de play 42→38px; ícones 32→29px |
| 168 | `max-width:820px` | Barra mais compacta (`border-radius:10px`); play 36px; rótulo da frase 11,5px; **o painel de configurações passa a ocupar a largura toda** (`left/right:8px`) em vez de flutuar à direita — num iPad em retrato o painel de 290px estourava a borda |
| 176 | `max-width:590px` | **O rótulo da frase some** (`display:none`): no celular o espaço é curto e o essencial são os controles + a barra de progresso, que é o que permite acompanhar a leitura. Chips do painel reduzem para 11px |

Note que o narrador usa **590px** e não 520px: é onde a toolbar do leitor já quebra
(`library3-reader.css` linha 186), e a barra tem de virar junto com ela.

---

## 6. Como usar isto ao criar/ajustar UI

- **Antes de adicionar um componente novo**, verificar se ele precisa de ajuste nos 3 breakpoints estruturais (1180/820/520 — Seção 0) e, se for específico de um módulo (QBank/Notebook/Flashcards/AI Tutor/Settings/My Workspace), seguir o padrão de breakpoint já usado naquele arquivo em vez de inventar um valor novo.
- **820px é o breakpoint mais importante do site** — é onde o menu lateral vira hambúrguer com scrim. Qualquer elemento fixo/posicionado (como `.mobile-menu-button` ou os botões flutuantes do AI Tutor) precisa considerar esse breakpoint para não sobrepor o botão do menu.
- **640px é o valor mais reaproveitado** entre os módulos (QBank, Notebook, Flashcards, styles.css) — ao criar uma tela nova dentro de um módulo existente, esse é o breakpoint padrão de "virou mobile" dentro daquele componente.
- Ao editar este arquivo, sempre reconferir contra o CSS real (`grep -n "@media" public/css/*.css`) — não copiar valores de memória.
