# My Workspace — Redesenho estilo GoodNotes + Apple Notes

Especificação ditada pelo Jonathan (jul/2026) a partir de screenshots do GoodNotes (Mac)
e do Apple Notes. **Este arquivo é a fonte de verdade para continuar o trabalho em
qualquer sessão/conta.** Regra geral: reproduzir o GoodNotes/Apple Notes fielmente,
EXCETO os itens marcados como "fora". Tudo bilíngue EN+PT no mesmo commit.

## Status das fases
- [x] **Fase 1 — Criação** (commit `3b30018`): menu sem "Notes"; botão "+ Novo" com
  popover Pasta/Notebook/Notes; diálogo de pasta (Cor/Ícone, seletor de cor
  personalizado, emojis de estudo); modal "Novo caderno" (papéis, cores, capas,
  importar papel). Cadernos podem ficar na raiz; capas antigas migradas.
- [x] **Fase 2 — Shell do editor** (commit `bf50173`): caderno abre direto nas
  páginas; barra azul (home, renomear, painel de miniaturas, busca no documento
  Notas/Esquemas, modo leitura "Apenas leitura"); adicionar página (popover
  completo); menu ⋯ da página; migração notas→páginas; busca global por página.
- [x] **Fase 3 — Ferramentas** (itens 6–15): barra GoodNotes no caderno (Laço ·
  Caneta · Marca-texto · Borracha · Texto · Imagem · Nota adesiva · Laser) com
  sub-barras, popovers de cor (3 fileiras + predefinições + `openColorPicker`),
  estilos de caneta, borracha padrão/traço-inteiro (+ só marca-texto), laço
  retangular/mão-livre (mover/apagar seleção), imagem e post-it como objetos
  móveis/redimensionáveis (`pg.objs`), laser Ponto/Linha, atalhos V/P/E/I/N/L,
  "Afixar ferramenta de texto", prefs em `couplemed_nb_tools`. Os toolbars
  antigos (textToolbar/drawToolbar) continuam só na visão legada de nota.
- [x] **Fase 4 — Exportar/Imprimir** (embutida na Fase 2: openSharePop/exportBookPages)
- [x] **Fase 5 — Notes = clone do Apple Notes** (itens 21–29): app próprio em
  `page=notes`, dados em `couplemed_notes_${user}` (independente do Workspace).
  3 colunas (sidebar iCloud/Notas/Apagadas/pastas+Pasta Inteligente, lista com
  Fixadas colapsável + agrupamento por data + galeria/lista, nota com
  data/título=1ª linha/corpo rico). Toolbar: nova nota, Aa (estilos + B/I/U/S +
  realce 5 cores), checklist, tabela, clipe (foto/vídeo, gravar áudio, anexar
  arquivo), Enviar Cópia (só Copiar), menu ⋯ (Fixar, Buscar na Nota, Mover
  para, Notas Recentes, Resultados de Cálculos, Visualização dos Anexos,
  Apagar → lixeira com recuperar/apagar-em-definitivo, purga automática em 30
  dias). Busca global e provider próprio (window.CMSearchProviders.notesApp).
- [x] **Fase 6 — Retoques pedidos pelo Jonathan (jul/2026)**, ver seção própria
  abaixo: Lixeira de pastas/cadernos, filtro/visão/menu do item na página
  Notebooks, "Notes" como item de menu separado, e ajustes no app Notes
  (clipe, marca-texto em bolinhas, ícones, menu de pasta, Apagadas).

## Arquivos
- `public/js/notebook.js` — módulo My Workspace (dados em localStorage `couplemed_nb_${user}`)
- `public/css/notebook.css` — estilos (prefixo `.nb-`)
- `public/app.html` — menu/versões de script
- Infra v3 já criada em notebook.js: `openPopover()` (balão com seta),
  `openColorPicker()` (grade gradiente + HEX + roda + conta-gotas + histórico),
  `bookCoverHtml()` (modelos de capa), `folderIconHtml()`, constantes `GN_*`.

## Decisões acordadas
- Sem linha "Idioma" no Novo caderno (site já é bilíngue).
- Cores de papel: branco, amarelo/bege, preto **+ azul claro, verde claro, rosa claro**.
- Papéis: Branco, Pontilhado, Quadriculado, Pautado estreito, Pautado largo, + Importar.
- Capas: Claras, Percurso, Simples, Sólida, Liso; cores Azul/Rosa/Roxo/Vermelho/
  Laranja/Amarelo/Verde/Cinza/Preto (`GN_COVER_COLORS`).
- Conteúdo antigo migra automático (papel branco/sem capa quando faltar dado).
- Atalhos de teclado (V,P,E,I,N,L) só no desktop.
- AirDrop fora; no share do Notes fica "Copiar".
- "Resultados de Cálculos" (Apple Notes): implementar versão simples.
- Ícones de pasta: emojis chamativos de estudo, NUNCA ícones de linha.
- **Caderno = páginas direto** (decidido pelo Jonathan em 2026-07-17): abrir o
  caderno abre o editor com as páginas, sem lista de notas no meio. Notas antigas
  viram páginas do caderno (título vira <h1> na 1ª página da nota); notas rápidas
  passam a viver no app Notes (Fase 5).

## Fase 2 — Barra superior do caderno aberto (itens 16–20)
Esquerda: painel lateral de páginas (miniaturas), busca no documento (painel
"Pesquisar" com tabs Notas/Esquemas, estado vazio ilustrado, destaca ocorrências),
toggle **Modo leitura/edição** (selo "Apenas leitura", esconde toolbar).
FORA: terceiro ícone (fichas de estudo).
Direita: **Adicionar página** (popover: tabs Antes/Depois/Última página; "Modelos
recentes" que herdam atributos da página atual; Mais de Modelos…; Imagem; Tirar
fotografia; Importar), **Exportar** (ver Fase 4), **menu ⋯** da página:
✓ Adicionar a favoritos, Copiar página, Rodar página ›, Alterar modelo,
Ir para a página (1–N), Limpar página, Mover a página para o lixo (vermelho).
FORA: duplicar-ao-lado, apagar elementos, seção DEFINIÇÕES inteira.
Aba superior com nome do caderno ⌄ + botão home.

## Fase 3 — Barra de ferramentas do editor (itens 6–15)
Ferramentas (nesta ordem, ajustada na Fase 6): **Caneta · Marca-texto · Borracha ·
Laço · Texto · Imagem · Nota adesiva · Ponteiro laser**. FORA: figurinhas/adesivos, formas, microfone.
- Laço (V): popover "Ferramenta de laço" → Retangular / Mão livre.
- Caneta (P): sub-barra com estilos (tinteiro/esferográfica/pincel…), 3 espessuras,
  3 slots de cor rápida + "+" → popover "Cor da caneta" (3 fileiras: vivas, escuras,
  neutras) + "+" → seletor personalizado (usar `openColorPicker`, com "Adicionar a
  predefinições" e "Remover cor").
- Marca-texto: igual caneta; popover "Cor do marcador" com pastéis (2 fileiras).
- Borracha (E): dropdown "Padrão", 3 tamanhos, botão de ajustes.
- Texto: cor, tamanho, fonte, B/I, alinhamento, espaçamento de linha, borda da
  caixa, estilo favorito, "Afixar ferramenta de texto" + extras aprovados:
  sublinhado, tachado, realce, listas, checklist.
- Imagem (I): inserir imagem/arquivo movível/redimensionável.
- Nota adesiva (N): 10 cores exatas (rosa-averm., laranja, amarelo, verde,
  verde-água, azul, lilás, rosa, cinza | branco), post-it movível com texto.
- Ponteiro laser (L): popover com modos Ponto e Linha (rastro vermelho que some).

## Fase 4 — Exportar (item 17)
Popover "Partilhar e exportar" SÓ com seção Exportar: **Exportar esta página**,
**Exportar tudo**, **Imprimir** (submenu). FORA: Colaboração/convidar.

## Fase 5 — "Notes" = clone Apple Notes (itens 21–29)
Abre por "+ Novo → Notes" (rota `app.html?page=notes`). Layout 3 colunas:
1. Sidebar: iCloud → **Notas** (contador) e **Apagadas** (lixeira); botão Nova
   Pasta (diálogo: Nome, checkbox "Transformar em Pasta Inteligente" com etiquetas/
   filtros, Cancelar/OK) e toggle da sidebar.
2. Lista: cabeçalho "Notas · N notas"; seção Fixadas colapsável; agrupamento por
   data (Últimos 7 Dias / 30 Dias…); item = título negrito, data, snippet,
   miniatura de anexo. Menu ⋯ da lista: Ver como Galeria, Ordenar por ›,
   Agrupar por Data ›, Ver Anexos.
3. Nota: data/hora no topo, título grande, corpo rico.
Toolbar: nova nota ✎; **Aa** = B/I/U/S + caneta de realce (5 cores: Roxo, Rosa,
Laranja, Menta, Azul) + estilos Título/Cabeçalho/Subtítulo/Corpo/Estilo Fixo
(mono)/• Lista Marcadores/– Travessões/1. Numerada/| Citação em Bloco;
checklist; tabela; anexos (clipe: Escolher Foto ou Vídeo, Gravar Áudio, Anexar
Arquivo — sem seções de iPhone/iPad); compartilhar (dropdown "Enviar Cópia" →
só Copiar); menu ⋯ da nota: Fixar Nota, Buscar na Nota, Mover para ›, Notas
Recentes ›, Resultados de Cálculos ›, Visualização dos Anexos ›, Apagar Nota.
FORA: Bloquear Nota, Mail/Mensagens/todas as extensões de share.
Campo Buscar à direita.

## Fase 6 — Retoques pedidos pelo Jonathan (jul/2026)
Rodada de ajustes sobre as fases 1–5, já concluídos e testados:
- **Menu lateral**: "Notes" virou item próprio no submenu My Workspace, entre
  Notebooks e Study Planner (`app.html?page=notes`). Saiu do popover "+ Novo"
  do caderno (que agora só tem Pasta/Notebook).
- **Página Meus Cadernos — cabeçalho**: sem mais a migalha de pão duplicando
  o título. Abaixo do título, filtro **"▾ Tudo"** (funil) com Tudo/Pastas/
  Cadernos/Favoritos/Partilhados (nesta ordem; "Partilhados" é só placeholder,
  nada implementado ainda). Ao lado do "+ Novo": ícone de visualização
  (mostra ☰ em Lista / ⊞ em Galeria, abre Grelha↔Lista + "Ordenar por" com
  Tipo/Data de criação/Última modificação/Nome + Ascendente/Descendente) e
  ícone "⋯" (só com "Caixote do lixo" por enquanto). Preferências
  (`nbUI` = modo/ordenar/filtro) persistem em `couplemed_nb_ui_${user}`.
- **Cada card de pasta/caderno**: ★ favorito (fica amarela; alimenta o filtro
  Favoritos) e um menu (⋯ na Galeria, ⌄ na Lista) com **Editar, Duplicar,
  Mover, Exportar, Partilhar (sem ação — decisão futura do Jonathan), Mover
  para o lixo**. Duplicar pasta é recursivo (subpastas + cadernos, sufixo
  " cópia"/" copy"). Exportar pasta reúne todos os cadernos num só PDF/impressão.
- **Lixeira** (pastas e cadernos excluídos, `folder.deletedAt`/`book.deletedAt`,
  purga automática em 30 dias): botão "Selecionar" com Recuperar/Apagar dos
  marcados, e "Apagar tudo" sem precisar selecionar (fica por último). Excluir
  pelo modal de edição (folderModal/bookModal) agora também manda pra lixeira
  em vez de apagar direto.
- **Pasta aberta**: mesma paridade da raiz (filtro, +Novo, visão/menu, estrela
  +menu por card) mais o botão de voltar.
- Emojis de ícone de pasta ampliados (~64 opções); capa **"Percurso"** removida
  das opções (fica só de leitura em cadernos antigos que já tinham essa capa).
- **App Notes**: popover do clipe (📎) ficou só com "Escolher Foto" (photo
  picker nativo) e "Anexar Arquivo" — sem Gravar Áudio nem Vídeo. Marca-texto
  do painel **Aa** virou lista com bolinha + nome (Roxo/Rosa/Laranja/Menta/
  Azul, estilo Apple Notes) e o botão Aa ganhou um pontinho indicando a
  última cor usada. Sidebar sem o rótulo "iCloud". Botão de nova nota trocou
  o ✎ por um ícone quadrado com lápis; ganhou um botão irmão de nova pasta
  ao lado (mesmo ícone da imagem de referência); os dois em destaque azul
  (`nb-gt-cta`) pra ficarem mais evidentes. O menu ⋯ de cada linha da sidebar
  (inclusive "Notas", que antes não tinha) ganhou Renomear Pasta/Apagar Pasta
  (só pastas personalizadas), Nova Pasta, Compartilhar Pasta (sem ação),
  Ordenar por › e Agrupar por Data ›. "Apagadas": o menu ⋯ da lista perdeu Ver
  Galeria/Ordenar por/Agrupar por Data/Ver Anexos e ganhou só **Selecionar**
  (Recuperar/Apagar das marcadas) e **Apagar tudo**; abrir uma nota apagada
  individualmente continua igual (Recuperar/Apagar Agora).

## Como testar (sem deploy)
```
python3 -m http.server 8765 -d public   # /api 404 → cm-sync entra em modo local
# abrir http://localhost:8765/app.html?page=notebooks&u=guest
```
Playwright instalado no scratchpad da sessão de jul/2026; screenshots de referência
do Jonathan ficam em ~/Desktop/Imagem N.png (podem ser apagados — o texto acima
já descreve tudo).
