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
- [ ] **Fase 3 — Ferramentas** (itens 6–15) ← PRÓXIMA. Substituir os toolbars
  atuais (textToolbar/drawToolbar em notebook.js) pelas ferramentas GoodNotes.
- [x] **Fase 4 — Exportar/Imprimir** (embutida na Fase 2: openSharePop/exportBookPages)
- [ ] **Fase 5 — Notes = clone do Apple Notes** (itens 21–29)

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
Ferramentas (nesta ordem): **Laço · Caneta · Borracha · Texto · Imagem · Nota
adesiva · Ponteiro laser**. FORA: figurinhas/adesivos, formas, microfone.
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

## Como testar (sem deploy)
```
python3 -m http.server 8765 -d public   # /api 404 → cm-sync entra em modo local
# abrir http://localhost:8765/app.html?page=notebooks&u=guest
```
Playwright instalado no scratchpad da sessão de jul/2026; screenshots de referência
do Jonathan ficam em ~/Desktop/Imagem N.png (podem ser apagados — o texto acima
já descreve tudo).
