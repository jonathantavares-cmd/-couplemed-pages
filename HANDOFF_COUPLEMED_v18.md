# CoupleMed — Documento de Handoff Técnico
### Contexto completo para continuar o desenvolvimento em outro chat ou com outra IA

> **Versão atual: v18** (menu simplificado — subpastas removidas, textos placeholder removidos)
> **Data deste handoff:** 04/07/2026
> **ZIP que acompanha este documento:** `couplemed_v18.zip`

Cole este documento inteiro no início de uma nova conversa (com qualquer IA) e anexe o ZIP.
Ele contém tudo o que é necessário para entender, editar e publicar o site sem retrabalho.

---

## 1. O QUE É O PROJETO

**CoupleMed** é uma plataforma privada de estudos para o exame **USMLE**, usada por 2 usuários
principais (John e Alysson) + 2 contas convidadas (guest1, guest2). É um site estático de 3 páginas
(login, transição, app principal) hospedado no **Cloudflare (Worker + Static Assets)** em `couplemed.com`.

- **Stack:** HTML, CSS e JavaScript puros (vanilla, sem frameworks, sem CDN).
- **Fontes:** Montserrat (self-hosted como woff2).
- **Persistência:** `localStorage` / `sessionStorage` (não há banco de dados no servidor).
- **Backend:** apenas um Cloudflare Worker (`worker.js`) que serve os arquivos estáticos e expõe
  a rota `/tutor` para o AI Tutor chamar a OpenAI.
- **Usuário não-técnico:** o dono (John) trabalha em Mac com Chrome/Safari e se comunica em
  português. Toda a execução técnica (código, testes, empacotamento) é feita pela IA; o John só
  faz o deploy final via GitHub Desktop.

---

## 2. ESTRUTURA DE ARQUIVOS (dentro do ZIP)

```
/  (raiz do repositório)
├── worker.js                      ← backend Cloudflare (serve public/ + rota /tutor → OpenAI)
├── wrangler.toml                  ← config do Worker (name = "couplemed", main, [assets] directory=./public)
├── HANDOFF_COUPLEMED_v17.md       ← este arquivo
├── README_AI_TUTOR.md
├── README_DEPLOY_CLOUDFLARE.md
└── public/                        ← TODOS os arquivos do site ficam aqui
    ├── index.html                 ← página de login
    ├── transition.html            ← tela de transição (7s, só John/Alysson)
    ├── app.html                   ← app principal (home + páginas internas)
    ├── robots.txt                 ← bloqueia indexação
    ├── assets/                    ← imagens (login-layout.jpg, transition-bg.jpg,
    │                                 platform-hero-current.jpg, cm-logo.png, favicon.png,
    │                                 apple-touch-icon.png, flag-br.svg, flag-us.svg,
    │                                 coming-soon.png)
    ├── fonts/Montserrat.woff2
    ├── css/
    │   ├── styles.css             ← estilos do site + módulo Flashcards + UWorld folders
    │   └── ai-tutor-widget.css    ← estilos do widget AI Tutor
    └── js/
        ├── site.js                ← navegação, tema, bandeiras, transição, coming-soon, UWorld page
        ├── flashcards.js          ← MÓDULO FLASHCARDS completo (~1041 linhas)
        └── ai-tutor-widget.js     ← widget de chat do AI Tutor
```

**REGRA DE OURO DA ESTRUTURA:** `worker.js` e `wrangler.toml` ficam na RAIZ; todo o resto do site
fica dentro de `public/`. Nunca colocar arquivos do site soltos na raiz — quebra o deploy.

---

## 3. COMO FAZER O DEPLOY (fluxo obrigatório)

O projeto usa Cloudflare Worker com Git CI. O deploy é sempre via Git:

```
Editar arquivos localmente
   ↓
Copiar para a pasta do repositório: /Users/jonathan/Documents/GitHub/-couplemed-pages
   ↓
GitHub Desktop → Commit to main → Push origin
   ↓
Cloudflare faz deploy automático (~1 min)
   ↓
Recarregar couplemed.com com Cmd+Shift+R (limpa cache)
```

- **Repositório GitHub:** `jonathantavares-cmd/-couplemed-pages` (o nome tem um hífen no início).
- **Worker Cloudflare:** nome `couplemed`, domínio `couplemed.com`.
- **NÃO** commitar `.DS_Store` (lixo do macOS).
- O `wrangler.toml` deve sempre ter `name = "couplemed"` (nome atual do Worker no Cloudflare).

### Cache-bust ao fazer alterações em CSS/JS
Os assets têm query string de versão em `app.html`:
```html
<link rel="stylesheet" href="css/styles.css?v=18" />
<script src="js/site.js?v=18"></script>
```
Ao alterar CSS ou JS, incrementar o número de versão em **todos** os `?v=` do `app.html`
(ex.: `v=18` → `v=19`) para forçar o browser a buscar os arquivos novos.

### Como testar se o backend está no ar
Abrir `https://couplemed.com/tutor` deve retornar `{"error":"Method Not Allowed"}` — isso é normal.

---

## 4. USUÁRIOS E LOGIN

| Usuário | Senha | Fluxo |
|---|---|---|
| John | `Ja@120622` | login → transição (7s) → `app.html?u=john` |
| Alysson | `Aj@120622` | login → transição (7s) → `app.html?u=alysson` |
| Guest 1 | `Gmed@07` | login → direto para `app.html?u=guest1` |
| Guest 2 | `Gmed@77` | login → direto para `app.html?u=guest2` |

O parâmetro `?u=` identifica o usuário e isola os dados no `localStorage`.
O parâmetro `?page=` seleciona a página interna (ex.: `?page=flashcards`).

---

## 5. REGRAS DE DESIGN / COMPORTAMENTO

- **Sidebar:** sempre navy, nunca muda de cor.
- **Home da plataforma:** abre sempre em **tema escuro**. Ao alternar, o fundo fica **branco** (não azul claro).
- **Páginas internas:** abrem sempre em **tema claro** (fundo branco).
- **Bandeiras BR/US:** circulares, sem texto, canto superior direito. Alternam idioma EN/PT.
- **Tema claro/escuro:** cápsula sol/lua; controlado pela classe `body.light`.
- **Fundo light mode:** sempre `#ffffff` (branco puro) — nunca `#f2f6fb`.
- **Transição:** 7 segundos, exibida só para John e Alysson.
- **Bilíngue:** todo texto novo entra em `T.en` e `T.pt` dentro de cada módulo JS.
- **112 mensagens** motivacionais na transição (62 versículos bíblicos + 50 frases).

---

## 6. SISTEMA DE PÁGINAS INTERNAS

### 6.1 Lógica de renderização (`site.js`)

Quando o usuário navega para uma página interna (`?page=X`), o `site.js` determina o que exibir:

```
COMING_SOON_PAGES = ['qbank-rd','step-2','step-3','languages','observership','residency-match','links']
UWORLD_PAGE = 'qbank-uworld'
isModule = page é 'flashcards' ou 'ai-tutor'
```

- **Coming soon:** exibe `#comingSoonPage` (imagem `coming-soon.png`) e esconde `#regularPage`
- **UWorld:** renderiza dinamicamente a página com 3 pastas (via `renderUWorldPage()`)
- **Módulos (flashcards, ai-tutor):** esconde `#comingSoonPage`, exibe `#regularPage` (os módulos montam seu próprio conteúdo dentro dele)
- **Outras páginas:** exibe `#regularPage` com título gerado automaticamente

### 6.2 REGRA CRÍTICA DO CSS — `coming-soon-page[hidden]`

O elemento `.coming-soon-page` tem `display:flex` no CSS, que sobrepõe o atributo `hidden` do HTML.
Por isso existe a regra obrigatória:
```css
.coming-soon-page[hidden] { display:none !important }
```
**NUNCA remover esta regra** — sem ela, a imagem coming-soon aparece em páginas onde não deveria.

### 6.3 Estrutura HTML do `internalContent`

```html
<section id="internalContent" class="internal-content" hidden>
  <div id="comingSoonPage" class="coming-soon-page" hidden>
    <img src="assets/coming-soon.png" class="coming-soon-img" />
  </div>
  <div id="regularPage" class="internal-card">
    <h1 id="internalTitle">Page ready to receive content</h1>
    <p id="internalDescription">...</p>
  </div>
</section>
```

O `flashcards.js` monta seu conteúdo dentro de `#internalContent .internal-card` (que é o `#regularPage`).

---

## 7. MÓDULO USMLE

### 7.1 Estrutura do menu

```
USMLE
├── Step 1 (expansível)
│   └── QBank (expansível)
│       ├── UWorld → abre página com 3 pastas (1 Pass, 2 Pass, 3 Pass)
│       └── RD → coming soon
├── Step 2 → link direto → coming soon
└── Step 3 → link direto → coming soon
```

### 7.2 Página UWorld (3 pastas)

Ao clicar em UWorld (`?page=qbank-uworld`), o `site.js` renderiza dinamicamente uma página profissional
com 3 pastas (1 Pass, 2 Pass, 3 Pass) em layout de lista. Cada pasta leva para sua respectiva página
coming soon (`?page=uworld-pass-1`, etc.).

A função `renderUWorldPage(container)` está em `site.js` e injeta o HTML diretamente no `#regularPage`.
Estilos: classes `.uw-folder-page`, `.uw-title`, `.uw-folders`, `.uw-folder` — com dark mode suportado.

### 7.3 Dashboard home — QBank Progress

O card "STEP 1 - QBANK PROGRESS" na home mostra **3 passes** (não rounds):
```
1 Pass → 0 - X    0%   [Continue]
2 Pass → 0 - X    0%   [Continue]
3 Pass → 0 - X    0%   [Continue]
```

---

## 8. MÓDULO CAREER

```
CAREER
├── Languages / English → coming soon
├── Observership → coming soon
├── Residency Match → coming soon
└── Links → coming soon
```

Todas as páginas do Career exibem a imagem `coming-soon.png` centralizada.

---

## 9. MÓDULO AI TUTOR

- **Frontend:** `public/js/ai-tutor-widget.js` + `public/css/ai-tutor-widget.css`.
  Botão flutuante 🎓 no canto inferior direito, abre painel de chat.
- **Backend:** rota `/tutor` no `worker.js` → chama OpenAI (`gpt-4o-mini`, temperature 0.3,
  max_tokens 900, histórico limitado a 16 mensagens).
- **5 modos:** socrático, nbme, caso, erro, anki.
- **Modo anki:** gera cards no formato `pergunta :: resposta`, compatível com o importador do Flashcards.
- **Chave da OpenAI:** vive SOMENTE no Cloudflare como variável de ambiente **Secret** chamada
  exatamente `OPENAI_API_KEY`. NUNCA colocar em arquivos ou GitHub.
- **A página AI Tutor NÃO é coming soon** — o módulo funciona normalmente.

---

## 10. MÓDULO FLASHCARDS (o mais complexo — `public/js/flashcards.js`, ~1041 linhas)

Sistema de repetição espaçada estilo Anki. Só carrega quando `?page=flashcards`.

### 10.1 REGRA CRÍTICA — GUIA AUTO-ATUALIZÁVEL
O guia da landing é **gerado automaticamente** dos arrays `FEATURES` e `QUICKSTART` no topo do
`flashcards.js`. **Toda alteração de funcionalidade DEVE atualizar esses arrays.** Nunca editar o
HTML do guia manualmente.

### 10.2 Landing page — ordem das seções (v13+)
1. **Hero:** título "Flashcards" + botão "▶ Abrir Flashcards" (ao lado do título) + subtítulo
2. **"Sua performance":** 5 cards (Para hoje, Novos, Revisões hoje, Retenção, Dias seguidos com ✓)
3. **Guia de uso:** "Como usar em 5 passos" + "Tudo o que você pode fazer" (12 funcionalidades)
4. **Banner:** "Compartilhamento do banco de Flashcards entre os Usuários"

### 10.3 Modal Criar/Importar — Compartilhar com todos
O bloco "Compartilhar com todos" usa `.fc-share-box` com estrutura:
```html
<label class="fc-share-box" id="fcShareBox">
  <input type="checkbox" id="fcShare"/>
  <div class="fc-share-body">
    <strong class="fc-share-title">⇄ Compartilhar com todos</strong>
    <small class="fc-share-sub">Visível para todos: John, Alysson...</small>
  </div>
</label>
```
Não usar `.fc-share-icon` ou `.fc-share-text` (removidos na v14).

### 10.4 Funcionalidades implementadas
- SM-2 + learning steps (1m → 10m → gradua 1d; Easy gradua 4d)
- Retenção desejada 70–97% (slider)
- Dias fáceis e adiar revisões
- Leech: 8+ lapsos → suspensão automática
- Cloze `{{c1::texto oculto}}`
- Card invertido (cria cópia B→A)
- Imagens nos cards (upload/paste, até 5MB, base64)
- Importação por arquivo (.txt/.csv) ou colar: `frente :: verso :: tag1, tag2`
- Decks, tags e busca avançada: tokens `deck:Nome tag:xyz flag:red`
- Suspender, enterrar, flags coloridas
- Liberar por tema: filtrar + "🔓 Liberar N filtrados"
- Atalhos de teclado: Espaço mostra resposta; 1–4 avaliam; desfazer última avaliação
- Estatísticas com períodos: 7d / 1m / 3m / 6m
- Tradução dinâmica do conteúdo dos cards ao trocar a bandeira
- Compartilhamento entre todos os usuários (chave global `couplemed_fc_shared`)

### 10.5 Estrutura de dados (localStorage)
- Chave por usuário: `couplemed_fc_{user}` → `{decks:[], cards:[], stats, days, sharedProgress, prefs}`
- Chave compartilhada: `couplemed_fc_shared` → `{cards:[...]}`

---

## 11. COMO A IA DEVE TRABALHAR NESTE PROJETO

1. **Extrair o ZIP** para uma pasta de trabalho.
2. **Editar** os arquivos com cuidado (o `flashcards.js` é grande; usar edições cirúrgicas).
3. **Validar sintaxe:** `node --check public/js/flashcards.js` (e nos demais JS).
4. **Ao alterar CSS ou JS:** incrementar o `?v=N` em todos os links de `app.html`.
5. **Reempacotar** mantendo a estrutura: `worker.js` + `wrangler.toml` na raiz, resto em `public/`.
   Excluir `.DS_Store`.
6. **Bilíngue e temas:** todo texto novo em `T.en` e `T.pt`; todo componente com dark mode.
7. **Entregar o ZIP** com summary do commit para o GitHub Desktop.

---

## 12. HISTÓRICO DE VERSÕES (resumo)

- **v6:** sistema de compartilhamento de flashcards.
- **v7:** integração do AI Tutor (5 modos) + backend.
- **v8:** Flashcards reescrito estilo Anki (SM-2, learning steps, browser, cloze, undo, stats).
- **v8/Worker:** migração para Cloudflare Worker (`worker.js` + `wrangler.toml` + `public/`).
- **v9:** imagens nos cards + tradução dinâmica das respostas do AI Tutor.
- **v10:** landing premium com guia auto-atualizável + importação por arquivo.
- **v11:** compartilhamento mais evidente (banner + toast) + estatísticas por período.
- **v12:** tradução dinâmica do conteúdo dos cards ao trocar a bandeira.
- **v13:** landing reordenada (hero → performance → guia → banner), ícone ✓ no streak.
- **v14:** fix layout modal compartilhar, botão CTA ao lado do título, removido botão duplicado.
- **v15:** menu USMLE reestruturado (3 passes, RD sem Unnamed folder), coming-soon para Career/Steps.
- **v16:** fundo branco (substituiu azul claro), coming-soon removido de flashcards/AI Tutor,
  página UWorld com 3 pastas, Step 2/3 como links diretos. Fix `wrangler.toml` (name = "couplemed").
- **v17:** fix crítico do CSS — `.coming-soon-page[hidden]{display:none!important}` corrige
  bug onde `display:flex` sobrepunha o atributo `hidden`, fazendo a imagem aparecer em páginas erradas.
- **v18 (atual):** simplificação geral do menu lateral:
  - Removido texto placeholder "Page ready to receive content" / "Esta área interna abre com fundo
    branco..." de TODAS as páginas internas (`#internalTitle` continua exibindo o nome da página,
    mas sem descrição). Removidas chaves `readyTitle`/`readyDesc` do `I18N` em `site.js`.
  - **My Notebook → My Workspace** (chave i18n `myWorkspace`); subitens "Notebooks" e "Notes" agora
    com ícones 📘 e 📝.
  - **Study Planner:** removidas subpastas "Week Planner"/"Month Planner" — agora é link direto
    para `?page=study-planner`.
  - **Study Materials:** removidas subpastas "First Aid", "Pathology", "Pharmacology" — substituídas
    por "Video Lectures" (`?page=video-lectures`) e "Audio Lessons" (`?page=audio-lessons`).
  - **Medical Library:** removida a estrutura `deep` com listas de "Book 1..17" sob RD/UWorld.
    Agora tem 3 links diretos: UWorld (`?page=library-uworld`), RD (`?page=library-rd`) e
    First Aid (`?page=first-aid-library`). A função `buildBooks()` ficou órfã (sem alvo no DOM) mas
    foi mantida no código por segurança — não quebra nada.
  - **USMLE → Step 1:** removido o nível intermediário "QBank" — agora Step 1 tem 2 links diretos:
    UWorld (`?page=qbank-uworld`, abre a página com 3 pastas 1/2/3 Pass) e RD (`?page=qbank-rd`,
    coming soon). Adicionado mapeamento de título em `site.js` (`titleMap`) para exibir "QBank
    UWorld" / "QBank RD" corretamente nas páginas de biblioteca.
  - **AI Tutor:** removido texto placeholder do `#regularPage` no `app.html` (módulo monta seu
    próprio conteúdo).
  - Cache-bust incrementado de `?v=18` para `?v=19` em todos os assets de `app.html`.

---

## 13. AVISOS DE SEGURANÇA

- A chave da OpenAI deve ser revogada e regenerada na plataforma OpenAI se tiver sido exposta.
  Atualizar apenas a variável `OPENAI_API_KEY` no Cloudflare (Settings → Variables and Secrets).
- Nunca colocar a chave em nenhum arquivo do repositório.
- As senhas dos usuários são de um sistema privado — tratar como confidenciais.

---

## 14. PRÓXIMOS PASSOS POSSÍVEIS (não implementados)

- Implementar módulos UWorld (1 Pass, 2 Pass, 3 Pass) com banco de questões real
- Implementar módulos Career (Languages, Observership, Residency Match, Links)
- Implementar Steps 2 e 3 com conteúdo
- Oclusão de imagem nos flashcards (útil para anatomia, ECG, histologia)
- Exportar/backup de todos os decks em um único arquivo
- Histórico de desempenho por tema
- AI Tutor sugerir temas fracos com base nas estatísticas
- RAG: carregar PDFs/resumos para o AI Tutor
- Substituir fotos placeholder dos guests por imagens reais
- Expansão das demais páginas internas (My Notebook, Study Planner, Medical Library, etc.)

---

*Fim do handoff. Com este documento + o ZIP `couplemed_v18.zip`, qualquer IA
consegue entender a arquitetura, editar com segurança e orientar o deploy sem retrabalho.*
