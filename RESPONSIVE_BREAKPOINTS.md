# CoupleMed — Responsividade operacional

> Fonte canônica para QA responsivo do **QBank 1** e da **Library 1**.
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

## 1. Breakpoints estruturais do site

Estes três cortes mudam a estrutura global. Os demais são ajustes internos de componentes.

| Breakpoint | Estrutura obrigatória |
|---|---|
| `max-width:1180px` | A sidebar reduz para `214px`; o dashboard passa a 4 colunas; as duas últimas ações somem; a marca reduz. |
| `max-width:820px` | Aparece o botão hambúrguer; a sidebar sai da tela e retorna com `.sidebar.open`; o scrim cobre a página; `.platform-main` perde a margem da sidebar; dashboard vira 1 coluna; progress card some. |
| `max-width:520px` | `.platform-main` perde padding lateral; `.internal-card` fica full-width, sem bordas laterais nem arredondamento; a marca compacta. |

Regras:

- `820px` é o corte global mais crítico: nenhum controle fixo, toolbar, modal ou painel pode cobrir o hambúrguer.
- `640px` é o corte interno mais comum para conteúdo, mas não substitui os cortes reais de cada módulo.
- Tabelas podem ter rolagem horizontal **dentro do próprio componente**. A página inteira não pode rolar horizontalmente.

---

## 2. QBank 1 — `public/css/qbank.css`

| Breakpoint | Seletores/área | Comportamento esperado |
|---|---|---|
| `760px` | guia visual | Hero, quick links, etapas e navegação reorganizam. |
| `720px` | `.qb-row` | Grid de duas colunas do Create Test standalone vira uma coluna. |
| `640px` | `#internalContent.qb-wide .internal-card` | Padding interno reduz. |
| `640px` | resultados/resolução | `.qb-perf`, `.qb-res-top` e `.qb-nav` empilham; ferramentas continuam acessíveis. |
| `640px` | `.qb-question-image` | Padding/margem reduzem; imagem usa `max-height:300px`; legenda decorativa some. |
| `640px` | toolbar da resolução | Cabeçalho não quebra; ferramentas rolam horizontalmente; fonte/padding compactam. |
| `560px` | `.qb-stepper` | Cada etapa ocupa uma linha e conectores somem. |
| `560px` | `.qb-tax` | Taxonomia vira uma coluna. |
| `520px` | guia visual | Etapas/itens viram uma coluna e elementos decorativos compactam ou somem. |
| `480px` | `.qb-gen` | Quantidade, disponíveis e botão de gerar empilham; botão ocupa 100%. |

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

Este arquivo prioriza os dois fluxos de inclusão. Ao alterar Notebook, AI Tutor, Settings, My Workspace ou outra tela, auditar os `@media` do CSS correspondente com `rg -n "@media" public/css/*.css`; não reutilizar uma tabela de números de linha, porque linhas mudam a cada edição.
