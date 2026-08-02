# CoupleMed — Responsividade operacional

> Fonte canônica para QA responsivo do **QBank 1** e da **Library 1**, e para a
> **estrutura de plataforma do site inteiro**: tom (Claro/Sépia/Escuro), botão
> Voltar, barra superior e dashboard da Home (Seção 1). Qualquer sessão que vá
> mexer em `public/js/site.js` ou nas regras globais de `public/css/styles.css`
> (sidebar, `.top-actions`, `.cm-back-home`, `.dashboard-strip`) lê a Seção 1
> **antes** de editar — é a área que mais gerou regressão cross-módulo nas
> últimas rodadas (ago/2026): tom que não persistia por causa da sincronização
> com o servidor, Voltar sobrepondo o card, busca cobrindo o hambúrguer.
>
> O CSS é a fonte executável da verdade. Este arquivo é o índice operacional. Se houver divergência, confirmar o comportamento no CSS, corrigir este arquivo no mesmo commit e nunca copiar um valor de memória.

## 0. Fluxo obrigatório

1. Ler o guia do fluxo em execução:
   - QBank 1: `QBANK_ADD_QUESTION.md`;
   - Library 1: `LIBRARY1_ADD_CONTENT.md`.
2. Confirmar os `@media` atuais antes de editar UI:
   ```bash
   rg -n "@media" public/css/*.css
   ```
3. Não inventar breakpoint novo se um breakpoint do mesmo módulo já resolve o caso.
4. Abrir o conteúdo real da leva e executar a matriz da Seção 4 em **EN e PT-BR**.
5. Corrigir todas as falhas bloqueantes da Seção 5.
6. Rodar a auditoria e os testes do fluxo.
7. Fazer `git add` apenas dos caminhos do fluxo, `commit` e `push` automaticamente.
8. Só depois do push confirmado, marcar a subpasta com `✅`; marcar a pasta principal apenas quando todas as subpastas aplicáveis estiverem concluídas.

Falha responsiva, auditoria com erro ou conteúdo não fiel à fonte bloqueiam o `✅`, o commit e o push.

---

## 1. Estrutura da plataforma (site inteiro)

### 1.1 Breakpoints estruturais

| Breakpoint | Estrutura obrigatória |
|---|---|
| `max-width:1180px` | A sidebar reduz para `214px`; `.dashboard-strip` vai a 2 colunas (`minmax(240px,1fr) minmax(280px,1.1fr)`), com o slot de notícias ocupando a largura toda embaixo; a marca reduz. |
| `max-width:820px` | Aparece o botão hambúrguer (`42px`); a sidebar sai da tela e retorna com `.sidebar.open`; o scrim cobre a página; `.platform-main` perde a margem da sidebar; `.dashboard-strip` vira 1 coluna; o Voltar passa a acompanhar o hambúrguer em vez da sidebar. |
| `max-width:640px` | Corte interno mais comum para reorganizar conteúdo em celular (QBank, dashboard, barra superior) — não é estrutural por si só, mas é onde a maior parte dos componentes muda de forma. |
| `max-width:520px` | `.platform-main` perde padding lateral; `.internal-card` fica full-width, sem bordas laterais nem arredondamento; a marca compacta. |

Regras:

- `820px` é o corte global mais crítico: nenhum controle fixo, toolbar, modal ou painel pode cobrir o hambúrguer — em nenhum estado (aberto/fechado, busca expandida ou não).
- Tabelas podem ter rolagem horizontal **dentro do próprio componente**. A página inteira não pode rolar horizontalmente.

### 1.2 Tom da plataforma (Claro / Sépia / Escuro)

Três tons, e só três — não os onze temas de fundo que existiam antes de
ago/2026. Vivem em `data-tone` (em `<html>` e em `<body>`); `body.light`
continua sendo a chave que o CSS do site usa para superfícies claras (Claro e
Sépia são claros; Escuro não).

**Prioridade, nesta ordem** (`resolveTone()` em `public/js/site.js`):

1. **Configurações** (`getPrefs(uid).theme`) — se o usuário fixou um tom lá,
   ele vale em **tudo**, inclusive na Home, de forma permanente, até o usuário
   trocar de novo ou escolher "Automático". É o único lugar com efeito
   permanente.
2. **Escolha pontual da barra superior** (`sessionStorage['cm-tone-session']`)
   — vale só durante a sessão do navegador e só nas páginas **internas**; a
   Home nunca usa essa escolha.
3. **Automático** (padrão de fábrica, sem nada configurado): Home sempre
   **escura** — ao entrar e toda vez que se volta a ela — e todas as páginas
   internas **claras**.

O seletor da barra sempre marca o tom da tela atual (na Home, em automático,
marca *Dark*; numa página interna, *Light*).

**Regras ao mexer nisso:**

- **Sépia nunca é produzido por padrão nem migração** — só existe por escolha
  explícita do usuário. `STG_TONE_MIGRATION` (`site.js`) nunca mapeia um tema
  antigo para `sepia`; temas claros antigos (`paper`, `mist`, `sage`, `rose`)
  caem em `light`, os escuros em `dark`.
- O tom é resolvido **duas vezes**: no script inline do `<head>` de `app.html`
  (evita flash antes do CSS carregar) e de novo em `site.js` no boot. As duas
  resoluções de usuário têm que ser **idênticas** — `?u=` da URL vence
  `sessionStorage['couplemed_active_user']`, que vence `'guest1'` — e seguir a
  **mesma ordem de prioridade** acima. Divergir aqui foi a causa de um defeito
  real: a Home abria clara para um usuário específico porque o script do
  `<head>` lia as preferências de outro usuário.
- `prefs` **sincroniza com o servidor** via `cm-sync.js` (`prefs` está em
  `SYNCED`). Qualquer migração de valor antigo tem que:
  1. gravar via `localStorage.setItem` (que o `cm-sync` intercepta e empurra
     ao servidor — gravar por outro caminho não se propaga);
  2. rodar **depois** que o pull do servidor já aconteceu, nunca antes — se
     rodar antes, o servidor devolve o valor velho por cima na mesma carga.
  3. usar uma marca de migração **por usuário** (`couplemed_tone_migrated_v3_<uid>`),
     nunca uma marca global — uma marca global fica "gasta" no primeiro
     usuário que abrir a plataforma e nunca mais roda para os demais.
- Nenhuma cor literal fora dos três blocos de paleta — usar os tokens
  (`--qb-text`, `--qb-card`, `--qb-line`, `--qb-accent`, …). Não redeclarar um
  token dentro de um escopo aninhado (ex.: `.qb`): isso vence a herança do
  `body` e o tom escolhido deixa de valer ali dentro.
- Seletor descendente largo (`.internal-card p`) vence por especificidade
  regras de conteúdo mais específicas (`.qb-expl-correct`); preferir filho
  direto (`> p`) em regras globais que tocam páginas internas.

### 1.3 Voltar hierárquico

`#cmBackHome` (`.cm-back-home`) chama `cmGoBack()` em `site.js`. **Não é**
`history.back()` e **não volta sempre para a Home** — sobe um nível na
hierarquia da página, nesta ordem:

1. Fecha uma camada aberta por cima (zoom de imagem, modal, leitor) —
   `cmCloseTopLayer()`.
2. Deixa o módulo da página interceptar via `window.CM_BACK_HANDLER()` — é
   assim que o QBank confirma (e salva) antes de abandonar um bloco em
   andamento, em vez de simplesmente navegar embaixo do usuário.
3. Sobe um nível pelo mapa `CM_PARENT` (`site.js`), resolvido a partir da
   **URL atual** — nunca do histórico do navegador. Página sem entrada no
   mapa cai na Home.

Por não depender de `document.referrer` nem de `history.length`, o botão se
comporta igual vindo de link direto, de F5 ou de navegação interna, e nunca
sai do site nem cai numa tela em branco.

No layout, o botão fica **fixo, na mesma linha dos controles do topo**
(`.top-actions`), não mais solto no fluxo do conteúdo — por isso
`.internal-content` reserva `padding-top` (50px acima de 820px; 44px entre
821–640px; 76px abaixo de 640px, quando ele desce para uma segunda linha ao
lado do hambúrguer). Esquecer de ajustar esse padding ao mexer na altura do
botão faz o card da página nascer por baixo dele.

### 1.4 Barra superior unificada

Uma linha só, em qualquer dispositivo. Ordem fixa, da esquerda para a
direita: **busca → notificação → tons → `Aa` → bandeiras** (PT/EN).

- Enquanto a busca está aberta (`.site-search.open`), os chips de tom
  (`.cm-tone-seg`) e o botão `Aa` (`.cm-type-wrap`) recolhem para abrir espaço
  ao campo — em **qualquer** dispositivo, não só no celular. Voltam ao
  fechar.
- No celular (`≤640px`), as bandeiras ficam na mesma linha dos demais
  controles (cabem: com os tons compactos o conjunto usa ~292px dos ~328
  disponíveis ao lado do hambúrguer). O Voltar mora numa **segunda linha**,
  abaixo do hambúrguer — não pode dividir a linha da busca, porque o campo
  expandido o cobriria.
- Com a busca aberta no celular, o campo ocupa a faixa livre entre o menu e a
  lupa (`left:52px; right:122px`); nunca alcança o hambúrguer nem as
  bandeiras.

### 1.5 Dashboard da Home

Três colunas: Sequência de Estudos, coluna dividida QBank/Flashcards
(`.split-card` → dois `.split-half`) e o slot de notícias (`.news-slot`,
ainda vazio — moldura pontilhada, sem conteúdo real).

- Proporção base (desktop/monitor/Mac, `>1180px`): **27% / 28% / 45%**.
  `≤1180px`: duas colunas, notícias embaixo. `≤820px`: uma coluna, tudo
  empilhado.
- As duas metades do card do QBank dividem a altura via `flex:1;min-height:0`
  — isso só funciona quando o card **tem** altura reservada (grid do
  desktop). No empilhamento do celular elas precisam de `flex:0 0 auto`;
  herdar a regra do desktop ali faz as metades colapsarem para zero e o
  conteúdo de uma se sobrepor ao da outra — já aconteceu.
- A partir de `1181px`, a Home ocupa **exatamente uma tela, sem rolagem**: o
  hero usa `flex:1 1 auto` dentro de `.platform-main{height:100vh}` e absorve
  o espaço que sobra (`object-fit:cover`, cortando a imagem pelas bordas) em
  vez de esticar a página; o dashboard mantém só a altura que precisa.

---

## 2. QBank 1 — `public/css/qbank.css`

Padrão visual fiel às imagens de referência do UWorld: Arial/Helvetica 14px,
entrelinha 1.45, opções sem card com radio circular e ✓/✕ na margem esquerda.
Tamanho e entrelinha saem de `--qb-fs`/`--qb-lh` no escopo `.qb`, escaláveis
pelo painel `Aa` da barra superior (`--cm-scale`) — nunca fixar `font-size`
literal num seletor de conteúdo, sempre referenciar `--qb-fs`.

O **tom** (Claro/Sépia/Escuro) não é mais local do QBank — é da plataforma
inteira. Ver Seção 1.2. O QBank só herda o `data-tone` já aplicado no `body`.

| Breakpoint | Seletores/área | Comportamento esperado |
|---|---|---|
| `1181px` (min-width) | Flashcard/Caderno na barra da questão | Rótulo completo (`+ Adicionar Flashcard`, `+ Adicionar Caderno`); abaixo disso, curto (`+ Flashcard`, `+ Caderno`). |
| `1180px` (max-width) | `.qb-step-badge` (stepper), Question Status | Quadrado numerado (1/2/3/★) some — cabeçalho `QBank 1` também vira etiqueta azul de identificação e "Complete guide" vira "Guide"/"Guia". Question Status vai para grade de 3×2 (três opções por linha, sempre duas linhas) — em uma linha só, as seis opções não cabem em nenhum tamanho de iPad retrato (precisam de ~580px; há ~500–560px), então a grade vale na faixa inteira do iPad, não só no celular. |
| `768px` (min-width) | `.qb-test-body.has-explanation` | **A partir de** 768px a resolução fica em duas colunas (questão \| explicação) com a divisória `.qb-splitter` arrastável (alça com 44px de área de toque em `pointer:coarse`); a proporção vive em `--qb-split` (30–70%, salva em `localStorage['cm-qb-split']`). Abaixo disso, coluna única. O corte é 768 — não 1024 — para cobrir o iPad em **retrato**, não só deitado. |
| `641–1180px` | Card de resultado (`.qb-res-summary`) | Pode quebrar linha (a largura que importa é a da **coluna** da questão, via `container-type:inline-size` em `.qb-question-col`, não a da tela). Coluna larga (iPad deitado): uma linha. Coluna estreita (`<420px` de container, iPad retrato): duas linhas — veredito em cima, as duas métricas dividem a de baixo. |
| `760px` | guia visual | Hero, quick links, etapas e navegação reorganizam. |
| `720px` | `.qb-row` | Grid de duas colunas do Create Test standalone vira uma coluna. |
| `700px` | `.qb-tax` | Taxonomia vira uma coluna (a partir daqui, e também em `560px` por uma segunda regra — checar as duas se mexer aqui). |
| `640px` | Barra da questão (`.qb-head-tools`) | Tudo numa linha só, sem rolagem lateral: `⚑ Marcar → + Flashcard → + Caderno → 🧪 Valores Lab → [cronômetro, só se Cronometrado] → Parar e Salvar → Encerrar Bloco`. Rótulos abreviados (`Parar`/`Encerrar`) só abaixo de `379px`. Medido: 342px de conteúdo em 352px úteis a 390px. |
| `640px` | "Questão X de Y" | Sai da barra (não cabe) e sobe para cima do card, no fluxo — nunca `position:absolute` com offset negativo em relação a `#internalContent`, que já causou o número sumir da tela por completo. |
| `640px` | As 4 passadas (stepper) | Ficam **na mesma linha**, sem quebrar — rótulos abreviados (`Aprend.`, `Consol.`, `Refin.`, `Dirigida`); "VOCÊ ESTÁ AQUI" some (não cabe em ~86px) e vira só o realce de borda do card ativo. |
| `640px` | Painel da passada (donut + estatísticas) | Donut encolhe para 88px e vai para a esquerda; as 5 estatísticas ficam ao lado, em duas colunas, em vez de embaixo — altura cai de ~380px para ~110px. |
| `640px` | `#internalContent.qb-wide .internal-card` | Padding interno reduz. |
| `640px` | Card de resultado no celular | Nunca quebra: rótulos por extenso, distribuídos pela linha (não amontoados à esquerda); a letra da resposta correta fica na mesma linha do rótulo ("Resposta correta **F**"), nunca sozinha embaixo. |
| `640px` | `.qb-question-image` | Padding/margem reduzem; imagem usa `max-height:300px`; legenda decorativa some. |
| `640px` | Create Test (Test Mode, Systems, Status) | Ver §2.2 — compactado em toda a faixa `≤1180px`, não só no celular. |
| `560px` | `.qb-tax` | Ver linha `700px` acima — segunda regra que também vira uma coluna. |
| `520px` | guia visual | Etapas/itens viram uma coluna e elementos decorativos compactam ou somem. |
| `480px` | `.qb-gen` | Quantidade, disponíveis e botão de gerar empilham; botão ocupa 100%. |
| `379px` (max-width) | Barra da questão | Só abaixo daqui (iPhone mini/SE) o par Parar/Encerrar também abrevia. |

### 2.1 Checklist de questão, imagem e Lab Values

- [ ] Enunciado, alternativas, `peer`, explicações, objetivo e botões não se sobrepõem.
- [ ] Questão com `img` e/ou `explImg` preserva proporção, nitidez, títulos, eixos, unidades, legendas e notas.
- [ ] O asset foi refinado antes da publicação: sem UI do navegador/Finder, gabarito colado, margem vazia excessiva ou corte de conteúdo relevante.
- [ ] `object-fit:contain` não foi tratado como ferramenta de recorte; se a figura ficar pequena por espaço inútil, refazer o crop.
- [ ] Imagem importante continua legível com `max-height:300px` no mobile.
- [ ] Toolbar rola no próprio eixo e mantém todas as ações alcançáveis.
- [ ] Botão e modal **Valores Lab** abrem; tabela, valores pertinentes, unidades e tooltips cabem ou rolam dentro do componente; fechar o modal permanece possível.
- [ ] Não há rolagem horizontal da página.

Para uma leva, usar o preview isolado:

```text
http://localhost:8791/app.html?page=qbank-1&u=guest1&previewIds=ID1,ID2
```

O guia do QBank exige preview de todas as questões. Para a matriz completa de
viewports, selecionar ao menos os piores casos da leva: texto longo em PT-BR, seis
alternativas, `img`, `explImg`, tabela e `labs`. Se os layouts forem materialmente
diferentes, testar mais de uma questão em todos os viewports.

---

### 2.2 Create Test compacto (`1180px` para baixo)

Densidade calibrada pela razão texto/caixa das imagens de referência (≈0,65):
checkbox `17px`, rótulo `12.5px`, linha `27px` — três variáveis
(`--qb-box`, `--qb-tax-fs`, `--qb-tax-lh`) comandam a tela inteira; não
regular tamanho por seletor solto. Vale em iPad e celular igualmente, para o
mesmo QBank não ficar diferente entre um iPad Pro e um iPad menor.

- **"TEST MODE"** fica na mesma linha dos switches Tutor/Cronometrado, não
  numa linha própria acima — em qualquer dispositivo.
- **Status da Questão**: grade 3×2 de `1180px` para baixo (ver tabela acima).
- **Systems**: duas colunas até onde couber; uma só a partir de `700px`.

### 2.3 Timer / "Tempo gasto" — ver regra forte

A medição de tempo por questão (acumulação entre visitas, pausa em aba
oculta, limite do modo Cronometrado) é **REGRA FORTE**, documentada em
`QBANK_ADD_QUESTION.md` §12-A. Qualquer mexida em `startTimer`, `accrueTime`,
`submitAnswer` ou `endBlock` (todos em `public/js/qbank.js`) tem que ler
aquela seção antes.

---

## 3. Library 1

A Library 1 depende de quatro camadas: estrutura global (`styles.css`), página (`library1-reader.css`), toolbar compartilhada (`library3-reader.css`) e narrador (`cm-narrator.css`). Alterar ou testar apenas uma camada não basta.

### 3.1 Página e Create Test — `public/css/library1-reader.css`

| Breakpoint | Área | Comportamento esperado |
|---|---|---|
| `820px` | página e toolbar inferior | `.l1r-pagewrap` compacta; texto ajusta line-height; toolbar mantém ferramentas e zoom sem sobreposição. |
| `590px` | toolbar inferior e “já lido” | Toolbar vira uma coluna; zoom deixa de flutuar; botão “já lido” vira ícone. |
| `640px` | Exhibit/lightbox | Janela ocupa `100vw × 100vh`, sem borda/arredondamento; fechar e navegar continuam acessíveis. |
| `520px` | figura do Create Test | `.l1r-q-figure img` usa `max-height:320px`. |
| `520px` | Create Test | Card compacta; navegação empilha; botões ocupam 100%. |
| `520px` | artigo | Página, título e downloads compactam. |

As tabelas do artigo usam rolagem local. O HTML do artigo **não embute
`<img>`**: a mídia abre no Exhibit ao clicar na referência. O
`max-width:100%` do CSS é apenas uma defesa para mídia renderizada por
componentes. Imagens de questões aparecem dentro do Create Test e também abrem
ampliadas.

### 3.2 Toolbar compartilhada — `public/css/library3-reader.css`

| Breakpoint | Comportamento esperado na Library 1 |
|---|---|
| `1180px` | Ferramentas de marcação compactam sem perder acesso. |
| `820px` | Toolbar passa a rolar horizontalmente; busca/título/ícones compactam; menu de borracha não sai da tela. |
| `640px` | Setas laterais compactam. |
| `590px` | Título some; controles essenciais permanecem; ferramentas secundárias migram para o menu “mais”; menu abre dentro da largura. |

### 3.3 Narrador — `public/css/cm-narrator.css`

| Breakpoint | Comportamento esperado |
|---|---|
| `1180px` | Barra, play e ícones compactam. |
| `820px` | Painel de configurações ocupa a largura disponível (`left/right:8px`) e não cobre o hambúrguer. |
| `590px` | Rótulo da frase some; controles, progresso e painel continuam utilizáveis. |

### 3.4 Flashcards gerados pela Library 1 — `public/css/styles.css`

- Em `820px`, linha do Browse empilha texto e ações; ações quebram linha; decks/stats reorganizam.
- Em `520px`, botões do Browse viram grade flexível; tela de estudo reduz padding/fonte e ferramentas quebram linha.
- Testar rótulos longos em PT-BR, especialmente ações de enterrar, desenterrar, compartilhar e descompartilhar.

### 3.5 Checklist do tópico

- [ ] Artigo EN e PT-BR mantém a mesma ordem e estrutura visual da fonte.
- [ ] Títulos, listas e parágrafos não cortam nem se sobrepõem.
- [ ] Tabela larga rola apenas dentro da tabela e preserva cabeçalhos, unidades e notas.
- [ ] Referências `image/figure/table` abrem a mídia correta no idioma atual.
- [ ] Exhibit cabe na viewport; fechar, anterior, próximo, zoom e reset permanecem acessíveis.
- [ ] Create Test exibe toda imagem de enunciado e explicação enviada na fonte; não distorce nem oculta legenda.
- [ ] Toolbar, busca, marcação, menu “mais”, download e “já lido” funcionam.
- [ ] Narrador não cobre o hambúrguer nem conteúdo essencial.
- [ ] Os 30 flashcards cabem no Browse e no estudo em EN/PT-BR.
- [ ] Não há rolagem horizontal da página.

Abrir o tópico real:

```text
http://localhost:8791/app.html?page=library-1&u=guest1&folder=<subject-slug>&topic=<topic-slug>
```

---

## 4. Matriz mínima de viewport

Executar em navegador real ou emulação de dispositivo. Não aprovar apenas redimensionando mentalmente o CSS.

| Classe | Viewport obrigatória | Verificação principal |
|---|---|---|
| Monitor grande / 27" | `2560×1440` | Conteúdo não fica minúsculo por margem/asset mal recortado; centralização e leitura. |
| Desktop | `1440×900` | Layout normal, toolbar, imagens, modais e explicações. |
| MacBook | `1280×800` **ou** `1366×768` | Sem truncamentos; comportamento desktop preservado quando há largura. |
| iPad landscape | `1024×768` | Conteúdo e toolbar cabem; sem overflow da página. |
| iPad portrait | `820×1180` | Hambúrguer/sidebar/scrim; nenhum controle fixo se sobrepõe. |
| Mobile | `390×844` **e** `360×780` | Pior caso de texto PT-BR, imagens, tabelas, menus, modal/lightbox e ações. |

Em cada viewport:

- [ ] abrir/fechar menu mobile quando aplicável;
- [ ] percorrer do topo ao fim;
- [ ] trocar EN ↔ PT-BR e repetir a área mais densa;
- [ ] abrir imagem/lightbox e modal quando existirem;
- [ ] acionar toolbar/menu horizontal;
- [ ] verificar `document.documentElement.scrollWidth <= document.documentElement.clientWidth`, exceto rolagens locais previstas;
- [ ] registrar quais viewports foram aprovadas no resumo final.

---

## 5. Falhas bloqueantes

Qualquer item abaixo impede auditoria final, `✅`, commit e push:

- rolagem horizontal da página;
- texto, toolbar, hambúrguer, modal ou imagem sobrepostos;
- botão/controle essencial cortado, fora da tela ou impossível de tocar;
- imagem distorcida, excessivamente pequena, ilegível ou com recorte que perde conteúdo;
- tabela sem acesso a colunas, cabeçalhos, unidades ou notas;
- conteúdo EN/PT-BR estruturalmente diferente por erro de markup;
- Lab Values, Exhibit, Create Test, flashcard ou narrador inutilizável;
- erro que só “some” ao omitir conteúdo fiel da fonte.

Nunca resolver overflow apagando, resumindo, reordenando ou reduzindo conteúdo médico. Corrigir CSS, markup ou crop preservando fidelidade absoluta.

---

## 6. Gate final por fluxo

### QBank 1

- [ ] Matriz da Seção 4 aprovada para amostra representativa.
- [ ] Fidelidade, tradução PT-BR, `labs`, `img`/`explImg` e taxonomia auditadas conforme `QBANK_ADD_QUESTION.md`.
- [ ] `node --check public/js/qbank.js` passou.
- [ ] Commit e push automáticos concluídos.
- [ ] Subpasta marcada `✅` somente após QA, auditoria e push; pasta principal somente após todas as subpastas.

### Library 1

- [ ] Matriz da Seção 4 aprovada no tópico real, EN e PT-BR.
- [ ] `node --check` passou em cada JS alterado.
- [ ] `node tools/library1-audit.js "<Subject>" "<Tópico>"` saiu `✅`.
- [ ] Testes de flashcards/leitor aplicáveis passaram.
- [ ] Commit apenas dos caminhos da Library 1 e push automático concluídos.
- [ ] `node tools/library1-progress.js mark "<Subject>" "<Tópico>"` executado só depois dos gates anteriores e do push confirmado.

---

## 7. Escolha de capacidade do modelo

Use a menor capacidade que execute o gate sem adivinhar:

| Capacidade | Usar quando |
|---|---|
| **modelo econômico — medium** | Aplicar checklist conhecido, conferir breakpoints já existentes, validar uma leva regular e fazer correções mecânicas/localizadas sem ambiguidade visual. |
| **modelo econômico — high** | Diagnosticar overflow/sobreposição; ajustar markup ou crop; na Library 1, corrigir CSS localizado em breakpoint existente quando a causa for inequívoca. Não alterar CSS do QBank neste nível. |
| **GPT-5.6-sol — ultra** | Qualquer alteração de CSS responsivo do QBank; breakpoint novo; CSS compartilhado ou regressão entre módulos; conflito entre regras/CSS/código; falha que permaneceu sem causa após uma passada `high`. |

Modelo mais forte não autoriza inventar conteúdo. Fonte ilegível, ausente ou contraditória continua exigindo parar e pedir material melhor ao usuário.

### 7.1 Política multiplataforma de modelos e esforços

Os níveis acima representam **capacidade**, não um produto específico. Quando a
plataforma separar modelo e esforço, configurar ambos.

- [ ] **Medium:** modelo econômico em esforço `medium`, somente para checklist,
      inspeção e correção mecânica sem ambiguidade.
- [ ] **High:** modelo intermediário em esforço `high`/`xhigh`, para diagnóstico
      visual e correção localizada permitida pela tabela acima.
- [ ] **Ultra:** modelo mais forte em esforço `ultra` (ou `max`, se esse for o
      maior valor da plataforma), apenas para CSS responsivo crítico, conflito,
      regressão ou falha repetida.
- [ ] Começar no menor nível seguro, escalonar a menor unidade e voltar ao
      econômico após resolver a parte crítica.
- [ ] Se a interface não fizer a troca automaticamente, informar unidade,
      motivo, nível necessário e ponto de retorno.
- [ ] Modelo forte nunca autoriza inventar conteúdo nem ultrapassar as
      permissões específicas de QBank e Library 1.

Mapeamentos atuais e regras de fallback estão nas seções `3.2`–`3.4` de
`QBANK_ADD_QUESTION.md` e `0.4.2`–`0.4.4` de
`LIBRARY1_ADD_CONTENT.md`.

No Claude Code, a única troca de modelo que acontece sem intervenção é a de
**subagente** (`.claude/agents/*.md`, modelo fixo no frontmatter) e a do perfil
`opusplan`. O modelo da sessão principal **não muda sozinho** e exige `/model`
digitado pelo usuário. O esforço também não se autoescalona, mas pode ser
alterado por `/effort` ou pelo seletor de `/model` e configurado por flag,
variável de ambiente, settings ou frontmatter. Detalhes em
`QBANK_ADD_QUESTION.md` §3.3.1–3.3.2.

Diagnóstico visual de CSS responsivo **não é trabalho de subagente econômico**:
o agente `mecanico` (Haiku, somente leitura) só serve aqui para inventariar
media queries e conferir se os breakpoints 1180/820/520 px estão consistentes
entre arquivos. Qualquer correção de layout volta para a sessão principal.

---

## 8. Sincronização deste documento

Arquivo canônico:

```text
/Users/jonathan/Documents/GitHub/-couplemed-pages/RESPONSIVE_BREAKPOINTS.md
```

Cópias obrigatórias:

```text
/Users/jonathan/Desktop/Questões Novas QBank 1/RESPONSIVE_BREAKPOINTS.md
/Users/jonathan/Desktop/Adicionar Library 1/RESPONSIVE_BREAKPOINTS.md
```

Depois de editar o canônico, copiar o arquivo inteiro para os dois destinos e validar igualdade byte a byte:

```bash
cmp -s \
  "/Users/jonathan/Documents/GitHub/-couplemed-pages/RESPONSIVE_BREAKPOINTS.md" \
  "/Users/jonathan/Desktop/Questões Novas QBank 1/RESPONSIVE_BREAKPOINTS.md"
cmp -s \
  "/Users/jonathan/Documents/GitHub/-couplemed-pages/RESPONSIVE_BREAKPOINTS.md" \
  "/Users/jonathan/Desktop/Adicionar Library 1/RESPONSIVE_BREAKPOINTS.md"
```

Qualquer `cmp` diferente de zero bloqueia a entrega. As cópias do Desktop não entram no Git; o arquivo canônico entra no commit.

---

## 9. Outros módulos

Este arquivo prioriza os dois fluxos de inclusão, mais a estrutura de
plataforma da Seção 1 (Home/dashboard, tom, Voltar, barra superior — essas
NÃO são "outro módulo", são globais e vivem na Seção 1). Ao alterar Notebook,
AI Tutor, Settings, My Workspace ou outra tela específica, auditar os
`@media` do CSS correspondente com `rg -n "@media" public/css/*.css`; não
reutilizar uma tabela de números de linha, porque linhas mudam a cada edição.
