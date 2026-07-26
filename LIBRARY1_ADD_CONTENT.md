# CoupleMed Library 1 — Documentação Completa (inclusão de conteúdo)

> Referência definitiva do módulo **Medical Library › Library 1**: como incluir o material de estudo nas pastas/tópicos que já existem no site, como o conteúdo é armazenado, e como a Library 1 se conecta ao QBank 1.
>
> **Este arquivo é autossuficiente.** Quando o usuário disser apenas "adicionar Library 1" (ou variação), leia este arquivo do início ao fim antes de agir — ele contém tudo que é preciso, sem reexplorar o site a cada sessão, sem pedir material antes de checar a pasta do Desktop (Seção 2), e **sem parar para pedir aprovação de comando ou de conteúdo** (bypass de permissões + commit/push automáticos, Seção 2.3) e retomando sozinho a cada hora se o limite de uso bater sem troca de conta (Seção 2.4).
>
> 🔒 **A Seção 1 (Regra de Fidelidade) manda em tudo o mais.** O conteúdo publicado tem de ser exatamente o que está nas imagens enviadas — é proibido parafrasear, resumir, expandir, reordenar ou "corrigir". Autonomia de execução nunca vira liberdade editorial.
>
> ⚠️ **Este arquivo é DIFERENTE e INDEPENDENTE do `QBANK_ADD_QUESTION.md`.** São dois fluxos de trabalho distintos, com funções e tarefas diferentes, que rodam **ao mesmo tempo em sessões/chats separados** (regra do usuário, 2026-07-25 — ainda faltam +3.000 questões a adicionar no QBank). Nunca misture os dois procedimentos, nunca edite os arquivos do outro fluxo, e nunca trate um como continuação do outro. Ver **Seção 10 (Trabalho concorrente)** — é a seção que evita que as duas sessões briguem por arquivo/commit.
>
> Última auditoria contra o código real: **2026-07-25**. **Comece pela Seção 12 (ESTADO ATUAL)** para saber exatamente onde paramos e qual é a próxima tarefa.

---

## 0. PROCEDIMENTO PADRÃO — o que fazer quando o usuário disser "adicionar Library 1"

Gatilhos reconhecidos: **"adicionar Library 1"**, "adicionar conteúdo à Library 1", "incluir material da Library 1", ou variação equivalente que cite a Library 1.

1. **Ler este arquivo (`LIBRARY1_ADD_CONTENT.md`) do início ao fim.** Não usar memória de sessões anteriores como fonte.
2. **Armar a retomada automática por hora** (Seção 2.4) — `CronCreate` no início da leva, para o trabalho voltar sozinho se o limite de uso bater e o usuário não trocar de conta. Apagar com `CronDelete` ao terminar.
3. **Abrir e varrer a pasta de origem** `/Users/jonathan/Desktop/Adicionar Library 1/` (Seção 2), recursivamente, e **visualizar o conteúdo** de cada arquivo encontrado. Não pedir material ao usuário antes de checar a pasta — só pedir se a pasta estiver sem nenhum arquivo novo desde a última leva.
4. **Identificar, para cada arquivo, a qual tópico do site ele pertence** — o caminho da pasta já é a resposta (Seção 3: `Subject/Tópico/arquivo`). Não adivinhar por conteúdo quando o caminho já diz.
5. **Aplicar a Regra de Fidelidade (Seção 1)** — o material é conteúdo próprio do usuário; transcrever verbatim.
6. **Gravar o conteúdo** no arquivo de destino correspondente (Seção 5), sempre **bilíngue EN + PT no mesmo commit** (Seção 6).
7. **Validar**: `node --check` no(s) arquivo(s) alterado(s) + conferir que o tópico abre no site (Seção 9).
8. **AUDITAR (obrigatório, Seção 11.1)**: `node tools/library1-audit.js "<Subject>" "<Tópico>"`. Tem de sair ✅ — se sair ❌, corrigir e rodar de novo antes de qualquer outra coisa.
9. **Marcar o progresso**: `node tools/library1-progress.js mark "<Subject>" "<Tópico>"` — põe o ✅ na subpasta do Desktop e, se o Subject ficar completo, na pasta dele também (Seção 11).
10. **Commit e push automáticos**, sem esperar aprovação (mesma política do QBank — permissões em bypass global). Commitar **apenas** os arquivos da Library 1 (Seção 10).
11. **Processar a pasta inteira**, quantos arquivos forem — em lotes, seguindo automaticamente lote após lote, sem perguntar se deve continuar. Subpasta vazia é pulada em silêncio (Seção 2.2).

---

## 1. REGRA DE FIDELIDADE — a regra mais importante deste arquivo

> **Reforçada explicitamente pelo usuário em 2026-07-25:** *"muita atenção à regra: deverá ser exatamente colocado e incluído fielmente ao conteúdo que irei encaminhar nas imagens. É PROIBIDO mudar o conteúdo ou transcrevê-lo de outra forma."*

Idêntica em espírito à do QBank (`QBANK_ADD_QUESTION.md` §0.1), e vale integralmente aqui:

- **Todo material enviado é conteúdo próprio/original do usuário.** Este é o site e o material de estudo pessoal dele — não pode haver nada errado.
- A página publicada tem de ser **o que está na imagem**, na mesma ordem, com os mesmos títulos, as mesmas listas, as mesmas tabelas e os mesmos destaques.
- **Nunca inventar** conteúdo médico, valores, tabelas ou referências que não estejam no material.
- Se algum trecho estiver ilegível ou faltando, **perguntar ao usuário** — nunca completar por conta própria, nem "deduzir" pelo conhecimento médico geral. Essa é uma das poucas exceções ao modo automático (Seção 2.3).

**É PROIBIDO — mesmo que pareça uma melhoria:**

| Proibido | Por quê |
|---|---|
| Parafrasear ou reescrever com outras palavras | descaracteriza o material do usuário |
| Resumir, encurtar, "enxugar" | perde conteúdo que ele quer estudar |
| Expandir, acrescentar explicação, completar raciocínio | insere conteúdo que não é dele |
| Reordenar seções, listas ou linhas de tabela | a ordem do material é a ordem de estudo |
| Corrigir o que parece erro/typo no material | não cabe a nós julgar; se parecer erro, perguntar |
| Trocar termo técnico por sinônimo | muda o vocabulário que ele decorou |
| Unificar/desmembrar tópicos por conta própria | a estrutura é a do site (Seção 4) |

**A ÚNICA liberdade editorial permitida** é a **tradução PT-BR** (Seção 6) — obrigatória, e ela mesma tem de ser fiel ao original em inglês, sem adaptar nem melhorar.

Marcação em HTML (`<h2>`, `<ul>`, `<table>`…) **não é reescrita**: é só dar ao mesmo texto a mesma forma que ele tem na imagem. O texto em si permanece caractere por caractere.

---

## 2. PASTA DE ORIGEM DO MATERIAL

**Caminho:** `/Users/jonathan/Desktop/Adicionar Library 1/`

Estrutura verificada em 2026-07-25:

```
Adicionar Library 1/
├── Allergy & Immunology/           ← 26 pastas de nível 1 (Subjects)
│   ├── Acute rheumatic fever/      ← 1.838 subpastas de nível 2 (Tópicos)
│   ├── Anaphylaxis/
│   └── ...
├── Anatomy & Histology/
└── ...
```

- **26 pastas** de nível 1 e **1.838 subpastas** de nível 2 — espelham **exatamente** `LIBRARY1_STRUCTURE` (Seção 4). Verificado por script: 1838/1838 casam, 0 faltando, 0 sobrando.
- Em 2026-07-25 a pasta continha **as pastas criadas, mas nenhum arquivo de conteúdo ainda** (só `.DS_Store`). O usuário informou que preencherá **em ordem**, para não se perder.
- O material de um tópico vai **dentro da subpasta daquele tópico**. O caminho é a classificação — não é preciso inferir taxonomia pelo conteúdo.

### 2.1 Formato do material: PRINTS E IMAGENS (definido pelo usuário, 2026-07-25)

Dentro de cada subpasta de tópico o usuário coloca **prints (screenshots) e imagens** do conteúdo daquele tópico. **Não há texto digitado** — a fonte é sempre visual.

**A tarefa é transcrever esses prints para uma página**, de modo que ao clicar no tópico no site abra uma página **igual ao que está nas imagens**: mesma sequência de seções, mesmos títulos, mesmas tabelas, mesmas listas, mesmos destaques. A página é a transcrição fiel do print, não um resumo dele (Seção 1).

- **Ordem de leitura:** ordenar os arquivos pelo nome (print 1, print 2, …) — a numeração do usuário é a ordem do conteúdo. Se a ordem não estiver clara pelos nomes, deduzir pela continuidade do texto entre as imagens.
- **Figuras/diagramas dentro do print:** quando o print contém uma figura que é conteúdo (diagrama, algoritmo, foto clínica, tabela como imagem), recortar e gravar em **`public/assets/library1/<subject-slug>/<topic-slug>/`** e declarar em `assets` — nunca redesenhar em texto e **nunca colocar `<img>` no HTML** (a mídia abre por clique na referência, §7.5).
- **Texto que dá para transcrever, transcreve.** Só vira imagem o que é genuinamente gráfico.
- **Toda imagem publicada abre ampliada ao clicar** (Seção 7.5) — então recortar preservando a resolução original, sem reduzir para "caber na página". O `alt` vira a legenda da imagem ampliada e precisa existir nos dois idiomas.

### 2.2 Subpasta vazia = material ainda não colocado

Regra do usuário (2026-07-25): quando uma subpasta de tópico está **vazia, é porque ele ainda não colocou o material** — não é erro, não é conteúdo faltando, não é para perguntar.

**Comportamento correto:** pular a subpasta em silêncio e seguir para a próxima. Nunca marcar ✅ (Seção 11) numa pasta vazia, e nunca criar registro de conteúdo vazio para ela. No site, um tópico sem conteúdo publicado abre normalmente e mostra o aviso de "conteúdo ainda não incluído" — comportamento já implementado e testado.

### 2.3 MODO AUTOMÁTICO — bypass de permissões, commit e push sem aprovação

Regra do usuário (2026-07-25), **igual à que já vale no QBank** (`QBANK_ADD_QUESTION.md` §0.3):

- **Bypass de permissões ativo** neste fluxo: comandos de terminal, leitura e escrita de arquivo rodam sem pedir aprovação individual, do início ao fim da leva.
- **`git add` / `git commit` / `git push` automáticos**, sem esperar resposta e sem pedido explícito por leva. O usuário confere depois direto no site publicado.
- **Não** enviar preview para aprovação nem parar para perguntar "posso continuar?" entre lotes. Processar a pasta inteira, quantos tópicos forem.
- No `git add`, sempre **caminhos específicos** — nunca `git add -A` / `git add .`, que arrastaria o trabalho da sessão paralela do QBank (Seção 10).

**As únicas situações que ainda exigem parar e perguntar:**
1. Trecho ilegível ou faltando no print (Seção 1 — nunca completar por conta própria).
2. Imagem corrompida ou que não abre.
3. Print que claramente não pertence ao tópico da subpasta onde está.

---

### 2.4 RETOMADA AUTOMÁTICA A CADA HORA APÓS ATINGIR O LIMITE DE USO

**Regra do usuário (2026-07-25):** quando o limite de uso do Claude é atingido no meio de um trabalho automático e **ele NÃO troca de conta**, a expectativa é que o processamento **retome sozinho**, sem ele precisar digitar nada. Para isso, tenta-se de novo **a cada hora** até o limite ser restabelecido.

> **Esta função deve ser armada SEMPRE que o trabalho for automático (§2.3) e não houver troca de usuário.** Não é opcional e não espera o limite bater — é seguro preventivo.

**Por que é uma tentativa cega:** não existe nenhum aviso de "o limite liberou" que o Claude receba. A única forma de descobrir é **tentar**. Então o job tenta, falha se ainda estiver limitado, e tenta de novo na hora seguinte, até uma tentativa passar.

**Quando armar:** no **início** de qualquer leva (não depois que o limite bateu — nesse ponto pode já não haver capacidade nem para criar o job).

**Como armar** — ferramenta `CronCreate`, parâmetros conferidos na especificação real:

| Parâmetro | Valor | Por quê |
|---|---|---|
| `cron` | `"13 * * * *"` | de hora em hora, em **minuto não-cheio**. A própria ferramenta recomenda evitar `:00` e `:30`, porque é quando o mundo inteiro agenda e a carga se concentra. |
| `recurring` | `true` | repete até ser apagado (ou expirar em 7 dias). |
| `prompt` | ver abaixo | tem de ser autossuficiente: quem recebe é uma sessão que não viu esta conversa. |

Prompt de retomada a usar (ajustar só o tópico/Subject da vez):

> *"Retomar o trabalho da Library 1 de onde parou. Ler LIBRARY1_ADD_CONTENT.md, começando pela Seção 12 (ESTADO ATUAL), que diz exatamente o que falta. Seguir a Seção 1 (fidelidade), a Seção 11.1 (auditoria obrigatória ao fim de cada tópico) e a Seção 10 (commitar só arquivos da Library 1, nunca `git add -A`). Se o limite de uso ainda estiver ativo, esta tentativa falha e a próxima (1h depois) tenta de novo — sem precisar que o usuário digite nada."*

**Ao terminar a leva, apagar o job com `CronDelete`** (o id vem no retorno do `CronCreate`; `CronList` mostra os jobs da sessão). Deixar rodando à toa faz a sessão reabrir trabalho que já acabou.

#### ⚠️ Se o usuário TROCAR de conta, apague o job

Com troca de conta, a outra sessão assume o trabalho. Se o job da sessão antiga continuar armado, **as duas podem trabalhar no mesmo tópico ao mesmo tempo** — e aí se briga por commit, exatamente o problema que a Seção 10 evita. Portanto: **houve troca de conta → `CronDelete` no job.**

#### Limitações reais desse mecanismo (conferidas na especificação da ferramenta)

- **O job só existe nesta sessão.** Fica em memória, não é gravado em disco, e **desaparece quando a sessão do Claude termina**. Logo: para a retomada automática funcionar, **a sessão do Claude Code precisa ficar aberta** (não fechar o terminal/app).
- O parâmetro `durable` **existe mas não tem efeito** — persistência durável não está disponível. Não confiar nele.
- **Expira sozinho em 7 dias**, disparando uma última vez antes de ser apagado.
- **Só dispara com a sessão ociosa**, nunca no meio de uma resposta — que é justamente o estado de quem espera o limite renovar.
- O agendador acrescenta uma folga própria: tarefas recorrentes podem disparar até **10% do período atrasadas** (no máximo 15 min). Para um job de 1 hora, significa disparar em até ~6 minutos depois do previsto. Isso não atrapalha nada aqui.

**Nada se perde no meio do caminho**, porque cada tópico concluído já foi commitado e pushado (§2.3) e o ✅ na pasta (§11) marca o que entrou. A retomada continua do próximo tópico pendente, sem repetir nem pular — a auditoria (§11.1) e o `library1-progress.js status` confirmam onde está.

---

## 3. MAPEAMENTO pasta do disco → tópico do site

O macOS não aceita alguns caracteres em nome de pasta, então os nomes no disco são uma versão saneada dos nomes do site. Regra de normalização **verificada contra os 1.838 tópicos** (aplicar sobre o nome do site para achar a pasta):

| Transformação | Exemplo (site → disco) |
|---|---|
| `/` → ` - ` | `Allergic/irritant contact dermatitis` → `Allergic - irritant contact dermatitis` |
| `:` → ` - ` | `Anatomy: Ear` → `Anatomy - Ear` |
| `<` e `>` → removidos | `Bacterial meningitis (age >1 month)` → `Bacterial meningitis (age 1 month)` |
| ponto final → removido | `…microscopic polyangiitis (MPA).` → `…microscopic polyangiitis (MPA)` |
| espaços duplicados → colapsados | — |
| Unicode → normalizar com **NFC** | o macOS grava acentos em NFD (`Chédiak` decomposto); sem `.normalize('NFC')` dos dois lados a comparação falha em 12 tópicos |
| sufixo ` ✅` → removido antes de comparar | `Chapman points ✅` → `Chapman points` (marca de progresso, Seção 10 — **nunca** faz parte do nome do tópico) |

Snippet de referência (Node) para casar disco ↔ site:

```js
const stripCheck = s => s.replace(/\s*✅\s*$/u, '').trim();
const norm = s => stripCheck(s.normalize('NFC'))
  .replace(/\s*[\/:]\s*/g, ' - ')
  .replace(/[<>]/g, '')
  .replace(/\.+$/, '')
  .replace(/\s+/g, ' ').trim();
```

> ⚠️ O `stripCheck` é obrigatório desde que a marcação de progresso passou a existir (Seção 10): a partir da primeira leva incluída, várias pastas terão ` ✅` no nome. Comparar sem removê-lo faz o tópico parecer "não encontrado".

> ⚠️ Sempre comparar com `.normalize('NFC')` **nos dois lados**. Sem isso, tópicos com acento (Chédiak, Ménière, Müllerian, Waldenström, Behçet, Sjögren, Guillain-Barré, Legg-Calvé-Perthes, Henoch-Schönlein) parecem "faltando" sem estar.

---

## 4. ESTRUTURA ATUAL DA LIBRARY 1 NO SITE

**Arquivo:** `public/js/library1-structure.js` → define `window.LIBRARY1_STRUCTURE`.

```js
window.LIBRARY1_STRUCTURE = [
  { name:"Allergy & Immunology", ptName:"Alergia e Imunologia", items:[
      { name:"Acute rheumatic fever", ptName:"Febre reumática aguda" },
      ...
  ]},
  ...
];
```

- **26 Subjects × 1.838 tópicos**, todos com `name` (EN) e `ptName` (PT-BR já bakeado — não depende do motor de tradução ao vivo).
- Contagem por Subject (2026-07-25): Infectious Diseases 176 · Gastroenterology 137 · Cardiology 114 · Hematology & Oncology 107 · Neurology 102 · Rheumatology/Orthopedics 98 · Preclinical/Basic sciences 97 · Psychiatry 89 · Gynecology 86 · Pulmonary & Critical Care 82 · Pharmacology 78 · Dermatology 77 · Obstetrics 69 · Nephrology 67 · Endocrinology 60 · ENT 57 · Cell Bio/Biochem/Genetics 51 · Anatomy & Histology 44 · Male Reproductive System 44 · Ophthalmology 40 · Allergy & Immunology 36 · Embryology 32 · Physiology 28 · Toxicology 26 · Social Sciences 25 · Osteopathic principles 16.

**Renderização:** `public/js/site.js`, função `renderLibrary()` (~linha 543-573). Hoje são **2 níveis**:

1. Lista das 26 pastas → clique navega para `app.html?page=library-1&u={user}&folder={slug}`.
2. Lista dos tópicos da pasta aberta.

**Estado dos tópicos:** até 2026-07-25 eram **links mortos** (`href="#"` + `preventDefault()`). Desde então há um **3º nível**: o tópico abre como página no leitor embutido (Seção 7), com deep link `app.html?page=library-1&u=<user>&folder=<slug>&topic=<slug>`. Um tópico cujo conteúdo ainda não foi incluído abre e mostra o aviso de "conteúdo ainda não incluído" — nunca dá erro.

O slug da pasta vem de `slugify()` (`site.js:530`): minúsculas, `&` → `and`, tudo que não for `[a-z0-9]` → `-`, sem hífen nas pontas.

**Busca global:** `site.js:1703-1707` já indexa pastas e tópicos da Library 1, mas todo tópico ainda aponta para a pasta-mãe. Agora que o 3º nível existe (Seção 7), **falta atualizar esse `href` para apontar ao tópico real** (`&topic=<slug>`) — pendência conhecida, não bloqueia a inclusão de conteúdo.

---

## 5. ONDE O CONTEÚDO É ARMAZENADO — ✅ IMPLEMENTADO (2026-07-25)

**Um arquivo por Subject** em `public/js/library1-content/<subject-slug>.js`, carregado **sob demanda** (só quando um tópico daquele Subject é aberto). Modelo comentado em `public/js/library1-content/_TEMPLATE.js` — o `_` no início garante que ele nunca colida com um slug de Subject e nunca seja carregado.

```js
window.LIBRARY1_CONTENT = window.LIBRARY1_CONTENT || {};
window.LIBRARY1_CONTENT['allergy-and-immunology'] = {
  'anaphylaxis': {
    en: { title:'Anaphylaxis',  html:`<h2>Clinical features</h2><p>…</p>` },
    pt: { title:'Anafilaxia',   html:`<h2>Achados clínicos</h2><p>…</p>` }
  }
};
```

Razões da escolha (todas verificadas):
1. **Fora do `public/js/qbank.js`**, que é do fluxo paralelo do QBank — nunca conflita (Seção 10).
2. **Granular por Subject**: duas sessões em Subjects diferentes nunca tocam o mesmo arquivo.
3. **Sob demanda**: 1.838 tópicos num arquivo só seria inviável (o `qbank.js` já tem ~1,7 MB).
4. **EN + PT no mesmo registro** (Seção 6), o que torna a troca de idioma instantânea.

### 5.1 PESO DA MÍDIA — WebP agora, R2 quando passar do limite

O conteúdo é transcrito de prints e cada tópico traz a mídia **em dois idiomas**, então o volume de imagem é o fator que decide onde tudo isso mora. Medido no primeiro tópico incluído:

| | Por tópico | Projeção (1.838 tópicos) |
|---|---|---|
| JPEG q92 + PNG (formato inicial) | 2,48 MB | **4,4 GB** — inviável |
| **WebP misto (adotado)** | **0,92 MB** | **1,65 GB** |

**WebP misto** significa escolher, arquivo a arquivo, o menor entre WebP com perdas (q82) e sem perdas — medindo de verdade, não por regra fixa. Na prática as fotos e diagramas ficam com perdas e as **tabelas ficam sem perdas** (texto nítido *e* menor que o PNG original). Ganho medido: **63%**.

**Onde a mídia mora — ponto único de virada.** Os registros guardam só a **chave relativa** (`<subject>/<topic>/<arquivo>.webp`), nunca uma URL. Quem monta a URL é o leitor:

```js
const ASSET_BASE = window.LIBRARY1_ASSET_BASE || '/assets/library1/';
```

- **Hoje:** a mídia é servida da própria pasta `public/assets/library1/`, junto com o site. Simples, sem infraestrutura, e funciona offline no teste local.
- **Virada para o R2:** definir `window.LIBRARY1_ASSET_BASE = '/api/library1/img/lib1/'` antes de carregar o leitor. **Nenhum arquivo de conteúdo muda** — comportamento verificado por teste com o conteúdo real.

**Infraestrutura de R2 já está pronta** (não usada ainda, não atrapalha nada):
- `wrangler.toml`: binding `LIB1_STORAGE` → bucket `couplemed-library1` (criar com `wrangler r2 bucket create couplemed-library1` antes do primeiro deploy com esse binding).
- `worker.js`, `handleLibrary1()`: `GET /api/library1/img/<key>` serve com cache de edge e `Cache-Control: immutable`; `PUT /api/library1/admin/put?key=…` grava, protegido por `X-Admin-Secret` (`env.LIB1_ADMIN_SECRET`), mesmo padrão do `/admin/` da Library 3.
- `tools/library1-assets.js upload` envia a pasta inteira por esse endpoint.

**Quando virar:** rodar `node tools/library1-assets.js report` — ele mostra a média real por tópico e quantos tópicos ainda cabem antes de 1 GB (limite recomendado pelo GitHub). Na medição atual cabem **~1.114 tópicos**, ou seja, dá para ir mais da metade do caminho sem R2. Migrar antes disso é opcional; depois é obrigatório.

**Ferramentas:**
```bash
node tools/library1-assets.js report            # peso atual + projeção + quando migrar
node tools/library1-assets.js convert <dir>     # converte uma pasta já publicada para WebP
node tools/library1-assets.js upload [subject]  # envia para o R2 (precisa de LIB1_ADMIN_SECRET)
```

---

**Regras de formato** (detalhadas no `_TEMPLATE.js`): sem `<h1>` no corpo (o leitor desenha o título a partir de `title`); sem `style=` inline, `<script>` ou `<style>`; mídia declarada em `assets` com **chave relativa** `<subject-slug>/<topic-slug>/<arquivo>.webp` (nunca URL — §5.1), e **nenhuma `<img>` no HTML**; escapar crase e `${` dentro do template literal; rodar `node --check` no arquivo ao terminar.

---

## 6. BILÍNGUE EN + PT — regra obrigatória do site inteiro

Regra vigente para **todo** o site (QBank, Flashcards, Medical Library): o conteúdo entra em **inglês e português no mesmo commit**, nunca "PT depois".

- Nomes de Subject/tópico já têm `ptName` pré-gravado em `library1-structure.js` — reaproveitar, não retraduzir.
- O corpo do conteúdo precisa de tradução PT-BR fiel, gravada junto (não depender de tradução ao vivo).
- **Mídia**: o usuário fornece cada imagem/figura/tabela nos dois idiomas; ambas são gravadas (§7.5).

### 6.1 O texto PT costuma vir INCOMPLETO — e isso é esperado

Observado no 1º tópico incluído: o usuário mandou **6 páginas de texto em inglês e apenas 1 em português**. A regra dele é clara: *"o conteúdo que irei colocar estará todo em inglês, mas você deve colocá-lo já nos 2 idiomas"*. Logo:

- **Onde ele forneceu PT, transcrever verbatim** — é material dele (Seção 1).
- **Onde não forneceu, traduzir**, seguindo o mesmo vocabulário e estilo da parte que ele forneceu.
- **Ao terminar, dizer ao usuário de qual ponto em diante a tradução é nossa.** Ele precisa saber o que revisar.

### 6.2 Inconsistências na tradução fornecida são PRESERVADAS

A tradução que vem no material é automática e às vezes tem defeitos. Pela Regra de Fidelidade (Seção 1), **não corrigimos** — apenas avisamos o usuário. Exemplos reais preservados no 1º tópico:

| No material dele | Observação |
|---|---|
| alterna "ARF" e "IRA" para a mesma doença | mantido como está; a parte traduzida por nós usa "ARF", que é o termo dominante no material |
| "Eritema infeccioso (cinta doença)" | tradução ruim de "fifth disease"; mantida verbatim na legenda da imagem |

Se o usuário pedir para padronizar, aí sim se padroniza — a decisão é dele, não nossa.

---

## 7. O LEITOR DE PÁGINA E A TOOLBAR — ✅ IMPLEMENTADO (2026-07-25)

**Pedido do usuário:** ao clicar numa das 1.838 subpastas, abrir **uma página normal, com toolbar igual à da Library 3**. E — regra permanente — **toda modificação feita numa das duas toolbars tem de ser feita na outra também.**

**Arquivos:**
| Arquivo | Papel |
|---|---|
| `public/js/library1-reader.js` | o leitor de página (equivalente ao `library3-reader.js`) |
| `public/css/library1-reader.css` | **só** o específico do modo página (artigo, marcação em texto, busca, idioma) |
| `public/css/library3-reader.css` | **a toolbar inteira** — usada pelas duas Libraries |
| `public/js/site.js` (~553) | o tópico deixou de ser link morto e abre o leitor; deep link `&topic=` |
| `public/app.html` | carrega `library1-reader.js` no boot |

### 7.1 Como a paridade das toolbars é garantida

A toolbar da Library 1 usa **exatamente as mesmas classes `.l3r-*`** da Library 3 e **o mesmo arquivo CSS**. Isso não é coincidência de estilo: é o mecanismo que faz a regra do usuário se cumprir sozinha — qualquer ajuste visual em `library3-reader.css` aparece nas duas na mesma hora, sem ninguém precisar lembrar.

O que **não** é compartilhado automaticamente é o comportamento em JS (os dois leitores têm arquivos próprios, porque um é PDF e o outro é HTML). **Portanto: ao mexer no comportamento de um botão da toolbar, aplicar a mesma mudança nos dois arquivos, no mesmo commit.** Os ícones SVG, as 4 cores de marca-texto e os rótulos traduzidos estão duplicados nos dois arquivos justamente para ficarem visíveis lado a lado — se mudar num, mudar no outro.

**A única exceção deliberada ao CSS compartilhado** está em `library1-reader.css`, no seletor **`.l1r .l3r-toolbar-bottom`**: o CSS da Library 3 monta a barra de baixo num grid de **3 colunas** (ferramentas · navegação de página · zoom), e a Library 1 não tem navegação de página. Com 2 grupos num grid de 3, o alinhamento quebrava e os botões se sobrepunham. A correção fica **escopada em `.l1r`** justamente para **não afetar a Library 3**.

> ⚠️ Consequência prática: se algum dia a barra da Library 3 mudar de número de colunas, esse seletor tem de ser revisto. É o único ponto em que as duas divergem de propósito — todo o resto do visual vem do arquivo comum. O `<div>` raiz do leitor tem `class="l3r l1r"` exatamente para permitir esse escopo.

### 7.2 O que é igual e o que muda (e por quê)

| Grupo da toolbar | Library 3 (PDF) | Library 1 (página) |
|---|---|---|
| Voltar, título, busca | igual | igual (busca no texto da página, com contador e Enter/Shift+Enter) |
| Marca-texto + 4 cores + cor customizada | igual | igual |
| Borracha, desfazer/refazer | igual | igual |
| Notebook / Notes / Flashcard | igual (`?prefill=`) | igual (`?prefill=`) |
| Navegação de página (‹ 1 de N ›) | existe | **não existe** — página única, rolagem contínua |
| Zoom do canvas (%) | existe | vira **tamanho da fonte** (A− / A+), mesma posição e mesmo visual |
| Download | o PDF original | **dois botões: EN e PT** |
| Idioma | não traduz (só por seleção) | segue o **tradutor global** do site; texto e imagens trocam juntos (Seção 7.3) |
| Mídia | páginas do PDF | **não aparece na página**; abre em tela cheia ao clicar no nome (Seção 7.5) |
| Caneta livre, Post-it, anotação de página | existe | **ainda não** — dependem de camada de desenho sobre canvas; ficam para uma fase seguinte |

### 7.3 Tradução — vem do TRADUTOR GLOBAL do site

A Library 3 é um **arquivo PDF pronto** e por decisão do usuário não traduz a página inteira (só tradução por seleção). A Library 1 é **página**, então funciona ao contrário: o material vem em inglês e é **gravado nos dois idiomas no momento da inclusão** (Seção 6).

**O leitor não tem botão de idioma próprio** — ele obedece às bandeiras do topo, como todo o resto do site. `setLang()` (`site.js:1380`) dispara o evento `couplemed:langchange`, o leitor escuta e troca **tudo de uma vez**:

- o texto do artigo e o título;
- o título na toolbar, o botão Voltar e o placeholder da busca;
- **as imagens, figuras e tabelas** — inclusive uma que já esteja aberta na tela, que troca de idioma na hora;
- as legendas das imagens.

Tudo instantâneo, **sem nenhuma chamada de tradução ao vivo** e sem depender de rede, porque as duas versões já estão gravadas. O tópico abre no idioma em que o site está.

> Bug corrigido em 2026-07-25: o leitor tinha botões EN/PT próprios e ignorava o tradutor do site, então clicar na bandeira não traduzia o conteúdo. Os botões locais foram removidos e o leitor passou a escutar `couplemed:langchange`.

### 7.4 Marcação sobre texto (diferente do PDF)

No PDF a marcação é geométrica (retângulos sobre o canvas). Aqui o conteúdo é texto real, então cada marcação é gravada como **deslocamento de caractere** sobre o texto do artigo, em `localStorage` na chave `couplemed_lib1hl_<user>`, indexada por `<subject-slug>/<topic-slug>`.

Duas consequências que importam:
- **A marcação é por idioma.** Os textos EN e PT têm tamanhos diferentes, então cada versão guarda seus próprios deslocamentos. Marcar em inglês não faz aparecer marca no português — comportamento intencional e testado.
- **Reescrever um conteúdo já publicado desloca as marcações antigas daquele tópico.** Evitar reescrever conteúdo já revisado sem necessidade.

### 7.5 Mídia bilíngue — a página é só texto; a imagem abre no clique

**Regra do usuário (2026-07-25), em duas partes:**

1. **A imagem NÃO aparece aberta na página.** A página mostra apenas o texto. Imagens, figuras e tabelas abrem em tela cheia **só quando se clica no nome delas** no meio do texto — "image 1", "figure 2", "table 3" — exatamente como no material de origem. Não existe painel lateral de miniaturas (foi implementado e **removido a pedido**), e não se embute a figura no corpo do artigo.
2. **Cada mídia vem em inglês E em português** na subpasta, e as duas versões são recortadas e gravadas. A imagem segue o idioma corrente e troca junto com o texto.

**O que "posicionar corretamente" significa aqui:** como a mídia não é exibida, o que precisa estar no lugar certo é a **referência**. Ela tem de aparecer exatamente no mesmo ponto do texto em que o material a cita — mesmo parágrafo, mesma frase, mesma posição na frase. É isso que a auditoria (Seção 11.1) confere.

Como funciona:
- O registro do tópico tem um bloco `assets`, com `kind` (image/figure/table), `n` (o número exibido) e as versões `en` e `pt`, cada uma com `key` e `alt`.
- No texto, a referência é `<a class="l1r-ref" data-ref="image-1">image 1</a>`. Os dois idiomas **referenciam as mesmas chaves**; só muda o texto visível ("figure 1" / "figura 1").
- A mídia abre numa **janela centrada sobre a página** (modelo "Exhibit Display" do material de origem), **proporcional ao dispositivo** — nunca em tamanho natural escorrendo para fora da tela. A janela tem cabeçalho (rótulo + contador `1/5` + navegação), corpo com a imagem ajustada, legenda e rodapé com **zoom − / % / + / ⟳**. Ampliada, a imagem excede a janela e rola; `⟳` volta a caber. Fecha com ✕, **Esc** ou clique fora; as setas ‹ › andam **dentro do mesmo grupo** (image 1 → image 2, sem pular para as tabelas).
- O `alt` é a **legenda** da imagem ampliada — precisa existir e estar traduzido.
- **Mídia que não for referenciada em lugar nenhum fica inalcançável.** Não há segunda porta de entrada. A auditoria trata isso como erro, não como aviso.

Convenções de arquivo:
- Caminho: `public/assets/library1/<subject-slug>/<topic-slug>/`
- Nomes: `image-N-en.webp` / `image-N-pt.webp`, e o mesmo para `figure-N-*` e `table-N-*`.
- **Formato: WebP**, escolhido arquivo a arquivo entre com perdas (q82) e sem perdas — o menor vence (§5.1). Use `node tools/library1-assets.js convert <dir>`; não gerar JPEG/PNG à mão.
- Recortar a borda branca em volta, mas **nunca reduzir a resolução** — quem precisa dos pixels é a versão ampliada.

### 7.5b Download (EN e PT) — aqui a imagem VAI embutida

No arquivo baixado **não existe clique**, então a regra da página se inverte: a mídia precisa estar **dentro do corpo do conteúdo**, posicionada corretamente e em tamanho visível (regra do usuário, 2026-07-25).

Como o download é montado:
- Cada figura é inserida **logo após o bloco que a referencia** — mesmo critério de posição das referências na página.
- Mídia sem referência vai para o fim do documento (não pode sumir).
- As imagens vão **em `data:` URI (base64)**, então o arquivo abre offline, sem depender do site nem do R2.
- A referência vira **texto simples** (não há para onde clicar num arquivo salvo).
- Cada arquivo leva **só as imagens do seu idioma**: `…-en.html` com as versões EN, `…-pt.html` com as PT, legendas incluídas.
- O CSS de impressão usa `page-break-inside: avoid` nas figuras, para nenhuma quebrar ao meio ao gerar o PDF pelo navegador (⌘P → Salvar como PDF).

### 7.6 Estado de verificação

Testado em 2026-07-25 com DOM real (jsdom) — os testes vivem em **`tools/tests/`** (Seção 9) e rodam o arquivo real do repositório:

| Teste | Verificações | Cobre |
|---|---|---|
| `test-reader.js` | **60** | toolbar; página só com texto; imagem abrindo só ao clicar no nome; janela do visualizador com zoom −/+/⟳; tradução pelo tradutor global (texto, rótulos, legendas e imagens juntos, inclusive com a imagem aberta); marcação isolada por idioma; desfazer/refazer; borracha; busca; download com imagens embutidas |
| `test-quiz.js` | **41** | Create Test completo + **isolamento do QBank 1** comparado byte a byte |
| `test-assetbase.js` | **5** | a virada da mídia para o R2 sem editar conteúdo, usando o conteúdo real |

Um bug real foi encontrado e corrigido nesse processo: quando a seleção começava num **elemento** em vez de num nó de texto (parágrafo inteiro, triplo-clique, arrasto começando antes da primeira letra), o deslocamento nunca casava e a marcação falhava em silêncio. A medição passou a ser feita com um `Range` auxiliar (`offsetOfPoint`), que trata os dois casos.

---

## 8. INTEGRAÇÃO COM O QBANK 1 — tags clicáveis (requisito do usuário)

**Pedido do usuário (2026-07-25):** as tags exibidas no QBank 1, **ao serem clicadas, devem levar ao conteúdo da Library 1**. É isto que faz os dois módulos se completarem.

### 8.1 Como as tags funcionam hoje (verificado)

Em `public/js/qbank.js`, `renderQuestionMeta()` (~linha 9847) desenha 3 pílulas ao final da explicação, derivadas de `metaFor(q)` (~linha 9045):

| Pílula | Origem | Comportamento atual |
|---|---|---|
| **Subject** | `q.discipline` | `data-act="meta-filter"` → **filtra questões** no próprio QBank |
| **System** | `q.system` | idem |
| **Topic** | parte após `::` em `q.category` | idem |

Abaixo delas há um `<small>` com o texto `Medical Library > Library 1 > {System} > {Topic}` (`m.libraryPath`, `qbank.js:9060`) — hoje é **texto puro, não é link**.

### 8.2 O obstáculo real (medido em 2026-07-25)

Os dois módulos usam **vocabulários diferentes**, então não existe ligação automática 1:1:

- **Systems:** QBank tem 26, Library 1 tem 26 — mas só **9 nomes coincidem**. O QBank usa nomes por sistema (`Cardiovascular System`, `Nervous System`, `Renal, Urinary Systems & Electrolytes`), a Library 1 usa nomes por especialidade (`Cardiology`, `Neurology`, `Nephrology`).
- **Topics:** QBank tem **151 topics amplos** (categorias tipo "Cardiac arrhythmias", "Thyroid disorders"); a Library 1 tem **1.838 tópicos específicos** (artigos tipo "Atrial fibrillation"). Apenas **9 nomes** são idênticos nos dois.

Conclusão: o "Topic" do QBank é uma **categoria**, o tópico da Library 1 é um **artigo**. Um link direto por nome resolveria menos de 1% dos casos.

### 8.3 Caminhos possíveis — ⏳ PENDENTE DE DECISÃO DO USUÁRIO

1. **Tabela de-para de Systems (26→26), link no nível da pasta.** Barato, cobre 100% das questões, mas leva à lista da pasta, não ao artigo.
2. **Campo novo por questão** (ex.: `lib1:'cardiology/atrial-fibrillation'`) apontando o artigo exato. Precisão total, mas exige preencher questão a questão (e são +3.000 por vir) — teria de entrar no procedimento do `QBANK_ADD_QUESTION.md`.
3. **Híbrido (recomendado):** de-para de Systems como piso garantido para toda questão + campo opcional de artigo exato quando o tópico for óbvio. Nunca deixa o clique "morto" e permite refinar aos poucos.

Registrar a decisão aqui quando tomada. Se a opção envolver mexer no QBank, **coordenar com a sessão do QBank** — a mudança em `qbank.js` pertence àquele fluxo (Seção 10).

---

## 9. TESTAR LOCALMENTE

Mesma infraestrutura do QBank (`QBANK_ADD_QUESTION.md` §20):

```bash
# Sem servidor/login — abrir direto no navegador:
public/app.html?page=library-1&u=guest1

# Pasta específica (slug via slugify, ver Seção 4):
public/app.html?page=library-1&u=guest1&folder=allergy-and-immunology

# Tópico específico (o que foi acabado de incluir):
public/app.html?page=library-1&u=guest1&folder=allergy-and-immunology&topic=anaphylaxis
```

**Testes automatizados do leitor** (DOM real, sem browser) vivem em **`tools/tests/`** — ver `tools/tests/README.md` para rodar (o `jsdom` fica fora do repo, apontado por `JSDOM_PATH`):

```bash
JSDOM_PATH=<...>/node_modules/jsdom node tools/tests/test-reader.js     # leitor — 60 verificações
JSDOM_PATH=<...>/node_modules/jsdom node tools/tests/test-quiz.js       # Create Test — 41, inclui isolamento do QBank
JSDOM_PATH=<...>/node_modules/jsdom node tools/tests/test-assetbase.js  # prova a virada para o R2
```

Rodar os três sempre que mexer no comportamento do leitor. Para conferir **conteúdo incluído**, o que vale é a auditoria da Seção 11.1.

Checklist antes de commitar:
- [ ] `node --check` em todo arquivo `.js` alterado.
- [ ] O tópico abre e mostra o conteúdo, nos **dois** idiomas (botões EN/PT).
- [ ] Download EN e PT gera arquivo com o conteúdo certo.
- [ ] Conteúdo confere **exatamente** com os prints de origem, sem paráfrase, corte ou acréscimo (Seção 1).
- [ ] **`node tools/library1-audit.js` saiu ✅** (Seção 11.1) — inegociável.
- [ ] Imagens abrem ao clicar no nome, nos dois idiomas, e a página não mostra imagem aberta (Seção 7.5).
- [ ] Clicar na bandeira do topo traduz texto E imagens (Seção 7.3).
- [ ] Versão PT presente no mesmo commit (Seção 6).
- [ ] ✅ aplicado nas subpastas concluídas (Seção 11).
- [ ] Nenhum arquivo do fluxo do QBank foi tocado (Seção 10).
- [ ] Se a toolbar mudou: a mesma mudança foi aplicada na Library 3 (Seção 7.1).

---

## 10. TRABALHO CONCORRENTE — Library 1 e QBank ao mesmo tempo

**Regra do usuário (2026-07-25):** as duas inclusões rodam **simultaneamente, em chats/sessões diferentes**, porque ainda faltam +3.000 questões no QBank. Para as sessões não se atrapalharem:

| | Fluxo QBank 1 | Fluxo Library 1 |
|---|---|---|
| Documento | `QBANK_ADD_QUESTION.md` | `LIBRARY1_ADD_CONTENT.md` (este) |
| Pasta de origem | `~/Desktop/Questões Novas QBank 1/` | `~/Desktop/Adicionar Library 1/` |
| Arquivo de dados | `public/js/qbank.js` | `public/js/library1-content/*` (Seção 5) |
| Gatilho | "adicionar questões novas" | "adicionar Library 1" |

**Obrigações de cada sessão:**
1. **Nunca editar o arquivo de dados do outro fluxo.** A sessão da Library 1 não toca `qbank.js`; a do QBank não toca o conteúdo da Library 1.
2. **Commitar só os próprios arquivos** — usar `git add <caminhos específicos>`, nunca `git add -A` / `git add .`, que arrastaria trabalho em andamento da outra sessão.
3. **Antes de commitar, `git pull --rebase`** — a outra sessão pode ter publicado no meio do caminho.
4. Ver commits "aparecendo sozinhos" no `git log` é **esperado**, não é bug: é a outra sessão trabalhando.
5. Se um arquivo realmente precisar ser tocado pelos dois (ex.: `site.js` para o link das tags, Seção 7), fazer a alteração **num só lado** e em commit isolado e pequeno, para reduzir a janela de conflito.

### 10.1 Duas sessões na MESMA Library — caso real, 2026-07-25

A Seção 10 previa duas sessões em fluxos diferentes (QBank × Library 1). Aconteceu algo pior: **duas sessões na mesma Library, no mesmo tópico, ao mesmo tempo**. Uma transcrevia as questões; a outra (esta) corrigia a regra da mídia de questão. As duas foram mexer na Q3 de `allergy-and-immunology.js` simultaneamente.

**Como terminou bem:** o mesmo diretório de trabalho é compartilhado, então `git status` mostrou as alterações **não commitadas** da outra sessão. Foi possível ver que ela já havia resolvido a Q3 (criando `image-6`/`figure-3`, recorte **byte a byte idêntico** ao que esta sessão tinha acabado de fazer) e **desfazer a duplicação** em vez de commitar em cima.

**Regras que saem daí — valem para qualquer sessão desta Library:**
1. **Antes de editar um arquivo de conteúdo, rodar `git status`.** Se ele aparecer como `M` sem que você o tenha alterado, **outra sessão está trabalhando nele agora**. Não edite: leia o que ela fez.
2. **Nunca `git checkout`/`git restore` num arquivo com trabalho não commitado da outra sessão** — isso apaga o trabalho dela sem aviso. Para desfazer o *seu* pedaço, remova-o cirurgicamente (edição pontual), nunca por reversão do arquivo inteiro.
3. **Ao commitar, listar só os arquivos que você mesmo alterou** — e conferir o `git diff` deles antes, para não levar de carona o trabalho pela metade da outra sessão.
4. **Se as duas fizeram a mesma coisa, a que chegou depois desfaz a sua.** Duplicar mídia (dois arquivos idênticos com nomes diferentes) e duplicar declaração em `assets` é pior que perder o trabalho de recorte, que custa segundos.

---

## 11. MARCAÇÃO DE PROGRESSO NA PASTA DO DESKTOP (✅)

**Pedido do usuário (2026-07-25):** ele quer saber de relance, olhando a própria pasta, o que já foi incluído — sem precisar abrir o site.

**Regra:**
1. Ao terminar de incluir **um tópico**, acrescentar ` ✅` ao final do nome da subpasta daquele tópico.
2. Quando **todos** os tópicos de um Subject estiverem concluídos, acrescentar ` ✅` também à pasta do Subject (ex.: `Allergy & Immunology ✅`).
3. **Nunca** marcar pasta vazia (Seção 2.2) — vazia significa material ainda não colocado, não tópico pronto.
4. O ✅ é **sufixo**, nunca prefixo: preserva a ordem alfabética da pasta e é removido por `stripCheck()` em toda comparação de nome (Seção 3).

**Ferramenta:** `tools/library1-progress.js` (no repo), que faz isso sem risco de errar o nome da pasta — **mas só depois da auditoria da Seção 11.1 passar**:

```bash
node tools/library1-progress.js status
    # tabela por Subject: incluídos / com material aguardando / total + % geral

node tools/library1-progress.js mark "Allergy & Immunology" "Anaphylaxis"
    # marca o tópico; se o Subject ficar completo, marca a pasta do Subject sozinho

node tools/library1-progress.js sync
    # reconcilia TUDO com o que está publicado em public/js/library1-content/:
    # marca o que está incluído e DESMARCA o que não está
```

A fonte da verdade é sempre o **conteúdo publicado**, não o ✅ — por isso existe o `sync`, que corrige a pasta caso alguém marque à mão ou um conteúdo seja removido. Comportamento verificado em 2026-07-25 numa cópia de teste: marcação, idempotência (marcar duas vezes não duplica o símbolo), promoção automática do Subject ao completar todos os tópicos, e desmarcação pelo `sync`.

---

# ⚠️⚠️⚠️ 11.1 AUDITORIA OBRIGATÓRIA AO FIM DE CADA TÓPICO ⚠️⚠️⚠️

> ## **NENHUM TÓPICO É DADO POR CONCLUÍDO SEM ESTA AUDITORIA.**
>
> Exigida explicitamente pelo usuário (2026-07-25). Ela roda **depois** de gravar o conteúdo e **antes** de marcar o ✅ e de commitar:
>
> ```bash
> node tools/library1-audit.js "<Subject>" "<Tópico>"
> ```
>
> **Se sair qualquer ❌, corrigir e rodar de novo. Não seguir para o próximo tópico com erro pendente.**

**Por que existe:** a página é longa, bilíngue, e a mídia **não aparece na tela** — ela só abre clicando no nome. Isso torna invisível a olho nu justamente o erro mais provável: uma imagem gravada mas nunca citada no texto fica **inalcançável para sempre**, sem nada na página indicando que ela existe. A auditoria é a única coisa que pega isso.

**O que ela confere, item a item:**

| # | Verificação | Por que importa |
|---|---|---|
| 1 | Toda mídia tem as versões **EN e PT** e os arquivos existem em disco | uma versão faltando quebra a troca de idioma |
| 2 | Toda mídia é **referenciada** — no texto do artigo (nos dois idiomas) **ou** em `img`/`explImg` de alguma questão do Create Test (§11.2) | mídia do artigo sem referência é inalcançável; mídia de questão entra sempre, mesmo sem citação no artigo |
| 3 | EN e PT referenciam **o mesmo conjunto** de mídias | referência só no EN some ao traduzir |
| 4 | Toda referência aponta para uma mídia **que existe** | link morto no meio do texto |
| 5 | `alt` preenchido e **diferente** entre EN e PT | é a legenda; alt igual quase sempre é tradução esquecida |
| 6 | EN e PT com a **mesma estrutura** (seções, listas, tabelas, parágrafos) | seção a menos no PT = tradução incompleta |
| 7 | **Nenhuma `<img>` solta** no HTML | a página é só texto; a mídia entra em `assets` |

Os itens 1 a 4 e 7 são **erros** (❌) e travam o fluxo; 5 e 6 são **avisos** (⚠️) e pedem conferência — uma diferença de contagem pode ser legítima (o português às vezes quebra um parágrafo a mais), mas tem de ser verificada, não ignorada.

**Ordem obrigatória ao fechar um tópico:**
1. `node --check` nos arquivos alterados
2. **`node tools/library1-audit.js "<Subject>" "<Tópico>"` — tem de sair ✅**
3. `node tools/library1-progress.js mark "<Subject>" "<Tópico>"` (o ✅ na pasta)
4. `git add` dos caminhos específicos → `commit` → `push`

Sem argumento, `node tools/library1-audit.js` audita **tudo** que já foi publicado — vale rodar de tempos em tempos, porque uma edição posterior num conteúdo pode quebrar uma referência antiga.

---

### 11.2 CREATE TEST — questões de treino do tópico

Botão **"Create Test"** no fim do conteúdo, **imediatamente acima das tags**. Abre as questões de treino daquele tópico.

> ### ⚠️ REGRA ABSOLUTA: são SEPARADAS do QBank 1
> Pedido explícito do usuário (2026-07-25). Estas questões **não entram no `SEED` do QBank**, não aparecem nos filtros dele e **não contam na performance dele, em hipótese alguma**.
>
> | | QBank 1 | Create Test da Library 1 |
> |---|---|---|
> | Onde ficam | `SEED` em `public/js/qbank.js` | campo `quiz` do registro do tópico |
> | Resultado | chaves do QBank | `couplemed_lib1quiz_<user>` |
> | Escopo | banco inteiro, passadas, analytics | **só aquele tópico** |
>
> Há teste automatizado que grava estado de QBank, roda um teste inteiro da Library 1 e confirma **byte a byte** que nada do QBank foi criado ou alterado.

> ## ⚠️ TODA IMAGEM DA QUESTÃO ENTRA — SEMPRE
>
> **Regra do usuário (2026-07-25), corrigindo uma decisão errada minha:** *"independente de ter sido referenciada a mídia ou o conteúdo da questão teste, deve ser implantada nas questões teste exatamente como enviadas; portanto todas as imagens, tanto das questões teste como das explicações, devem ser sempre incluídas."*
>
> - **Imagem no enunciado do print → campo `img`.**
> - **Imagem na explicação do print → campo `explImg`.**
> - **As duas entram sempre**, mesmo que a figura não apareça em lugar nenhum do artigo. A mídia da questão **pertence à questão**, não ao artigo.
> - Não reaproveitar "o que já existe no artigo" como substituto de uma imagem que veio no print da questão. Se veio no print, entra.
>
> **O que deu errado antes:** a auditoria exigia que *toda* mídia declarada estivesse referenciada no texto do artigo. Quando a Q3 trouxe uma imagem no enunciado e outra na explicação, a regra empurrou para a decisão de **não incluí-las** — o oposto do que o usuário quer. A auditoria foi corrigida: mídia usada por uma questão é válida **sem** referência no artigo, e a checagem de "mídia inalcançável" passou a considerar artigo **e** questões.
>
> **Mídia de questão pode vir em um só idioma.** Os prints das questões costumam vir só em inglês. Nesse caso, declarar `en` e `pt` apontando para o **mesmo arquivo** — a imagem entra de todo modo — e **avisar o usuário** de que aquela figura não tem versão PT. Nunca deixar de incluir por falta do par.

**Formato das questões:** o **mesmo schema de campos do QBank** (`vignette`, `q`, `options`, `correct`, `peer`, `difficulty`, `explC`, `explI`, `objective`, `ptTranslation`) — inclusive a **regra de dificuldade** (`peer[correct]` ≥70 = easy, 50-69 = medium, <50 = hard), que a auditoria confere. O `id` usa o prefixo **`L1Q-`** para nunca colidir com um id do QBank. Campo opcional `img` aponta uma chave de `assets`, e a imagem abre por clique como no resto da página.

**Comportamento:**
- Uma questão por vez; escolher → **Responder** → explicação da correta, por que as outras estão erradas, objetivo educacional e o **% dos colegas** (revelado só depois de responder, como no QBank).
- No fim, **Finalizar teste** mostra percentual, acertos e erros.
- Depois de feito, o tópico passa a exibir **"Teste concluído"** com acertos, erros e %, mais **Rever respostas** e **Refazer teste** (que zera o resultado daquele tópico).
- **Cada tópico tem a sua própria performance**, independente dos outros.
- Trocar o idioma no meio do teste traduz a própria questão e **preserva** a resposta já marcada.

---

## 12. ESTADO ATUAL (onde paramos)

**Último trabalho: 2026-07-25.** Tudo abaixo está commitado e publicado.

**Infraestrutura — pronta:**
- Leitor de página com toolbar espelhada da Library 3 (§7), tradução pelo tradutor global (§7.3), mídia abrindo em janela com zoom só ao clicar no nome (§7.5), download com imagens embutidas (§7.5b).
- Armazenamento por Subject (§5) e mídia em WebP com a virada para R2 pronta (§5.1).
- Create Test por tópico, isolado do QBank 1 (§11.2).
- Ferramentas: `library1-progress.js` (✅ nas pastas), `library1-assets.js` (WebP/report/upload), `library1-audit.js` (auditoria obrigatória), `tools/tests/` (testes do leitor).

**Conteúdo — 1 de 1.838 tópicos:**

| Tópico | Estado |
|---|---|
| Allergy & Immunology › Acute rheumatic fever | texto EN+PT ✅ · 10 mídias × 2 idiomas ✅ · **1 de 5 questões** transcrita |

**A PRÓXIMA TAREFA é terminar as questões desse tópico.** Os 14 prints estão em `~/Desktop/Adicionar Library 1/Allergy & Immunology/Acute rheumatic fever ✅/` e se distribuem assim:

| Questão | Prints | Assunto | Estado |
|---|---|---|---|
| Q1 | Imagem 1, 2 | saúde pública / penicilina empírica (gabarito D, 52%) | ✅ transcrita (`L1Q-ARF-001`) |
| Q2 | Imagem 3, 4, 5 | fisiopatologia / mimetismo molecular | ⏳ falta |
| Q3 | Imagem 6, 7, 8, 9, 10 | menino de 10 anos, biópsia (corpos de Aschoff) | ⏳ falta |
| Q4 | Imagem 11, 12 | menina de 12 anos, artrite migratória / estenose mitral | ⏳ falta |
| Q5 | Imagem 13, 14 | coreia de Sydenham | ⏳ falta |

Ao terminar cada uma: rodar a auditoria (§11.1), depois o ✅ (§11), depois commit e push.

> ⚠️ **Atenção:** o usuário substituiu o conteúdo daquela subpasta pelos prints das QUESTÕES — os prints do texto do artigo não estão mais lá. O texto já está publicado, então isso não é problema; só não tente reconferir o artigo pela pasta.

---

## 13. HISTÓRICO DE DECISÕES

| Data | Decisão / achado |
|---|---|
| 2026-07-25 | Arquivo criado. Verificado: pasta de origem espelha 1838/1838 tópicos; tópicos no site eram links mortos (`site.js:558,561`); vocabulários de QBank e Library 1 divergem (só 9 systems e 9 topics coincidem). |
| 2026-07-25 | **Formato do material definido:** prints e imagens dentro de cada subpasta, a transcrever para página fiel ao print (§2.1). Subpasta vazia = material ainda não colocado, pular em silêncio (§2.2). |
| 2026-07-25 | **Armazenamento definido e implementado:** um arquivo por Subject em `public/js/library1-content/`, carregado sob demanda, com EN+PT no mesmo registro (§5). |
| 2026-07-25 | **Leitor de página implementado** com a toolbar espelhada da Library 3, CSS compartilhado, tradução instantânea EN/PT e download nos dois idiomas (§7). testes em jsdom passando (hoje em `tools/tests/`); corrigido bug de seleção iniciada em elemento. |
| 2026-07-25 | **Marcação de progresso ✅ implementada** em `tools/library1-progress.js`, com `status`/`mark`/`sync`; `stripCheck()` incorporado à regra de normalização (§3, §11). |
| 2026-07-25 | **Regra de fidelidade reforçada pelo usuário** e detalhada em tabela de proibições (§1): proibido parafrasear, resumir, expandir, reordenar ou "corrigir" o material. Única liberdade editorial é a tradução PT. |
| 2026-07-25 | **Modo automático formalizado** (§2.3): bypass de permissões + commit/push automáticos também neste fluxo, como já vale no QBank. |
| 2026-07-25 | **Imagens abrem ampliadas ao clicar** (§7.5), com legenda vinda do `alt` nos dois idiomas; recortar preservando a resolução original. |
| 2026-07-25 | **Primeiro tópico incluído** (Allergy & Immunology › Acute rheumatic fever), a partir de 30 prints: 6 páginas de texto EN, 1 página PT, e 10 mídias × 2 idiomas. Confirmado o padrão do material e as convenções de arquivo (§7.5). |
| 2026-07-25 | ✅ **Peso das imagens resolvido** (§5.1): mídia passa a WebP misto — 2,48 MB → **0,92 MB por tópico (63% menor)**, projeção de 4,4 GB → 1,65 GB. A URL da mídia passou a ser resolvida num ponto único (`ASSET_BASE`), com os registros guardando só a chave relativa, e a infraestrutura de R2 (bucket, rota no worker, endpoint de upload, script) ficou pronta para virar a chave sem editar conteúdo. Cabem ~1.114 tópicos no git antes de precisar migrar. |
| 2026-07-25 | **Tradução corrigida:** o leitor tinha botões EN/PT próprios e ignorava o tradutor global do site. Botões removidos; passou a escutar `couplemed:langchange` e traduzir texto, toolbar, legendas e imagens de uma vez (§7.3). |
| 2026-07-25 | **Painel lateral de miniaturas removido a pedido** e a mídia **não é mais embutida na página**: a página é só texto e a imagem abre ao clicar no nome (§7.5). O que precisa estar posicionado corretamente é a **referência**. |
| 2026-07-25 | **Auditoria obrigatória criada** (`tools/library1-audit.js`, §11.1): 7 verificações por tópico, com destaque para mídia não referenciada — que sem painel lateral fica inalcançável e invisível. |
| 2026-07-25 | **Visualizador refeito como janela centrada com zoom** (§7.5). O CSS do visualizador havia sido apagado por engano numa limpeza, e sem ele a imagem saía em tamanho natural escorrendo para fora da tela — foi o que o usuário viu. Reescrito no modelo do material de origem, com cabeçalho, contador, legenda e zoom −/+/⟳. |
| 2026-07-25 | **Download passa a embutir a mídia no corpo** (§7.5b), em data URI, posicionada após o bloco que a referencia, cada idioma com as suas imagens — no arquivo salvo não há clique. |
| 2026-07-25 | **Create Test implementado** (§11.2): questões de treino por tópico, no fim do conteúdo acima das tags, com performance individual e isolamento verificado do QBank 1. Auditoria estendida para conferir as questões (id, correct, difficulty × peer, tradução). |
| 2026-07-25 | **Q1 do tópico Acute rheumatic fever transcrita** (de 5 identificadas nos 14 prints). Faltam Q2–Q5 — ver Seção 12. |
| 2026-07-25 | **Testes movidos para `tools/tests/`** (antes viviam num scratchpad temporário e se perderiam), com README de como rodar. §6.1/6.2 passam a registrar que o texto PT vem incompleto e que as inconsistências da tradução do usuário são preservadas. |
| 2026-07-25 | **Retomada automática por hora documentada** (§2.4), a pedido do usuário: quando o limite de uso bate e ele **não troca de conta**, arma-se `CronCreate` de hora em hora (minuto não-cheio) para tentar retomar sozinho, e apaga-se com `CronDelete` ao terminar — ou imediatamente, se houver troca de conta (senão duas sessões trabalham no mesmo tópico). Parâmetros e limitações conferidos na especificação real da ferramenta, incluindo dois pontos que o doc do QBank não registra: `durable` **não tem efeito** e tarefas recorrentes têm jitter de até 10% do período. |
| 2026-07-25 | **Regra corrigida a pedido do usuário (§11.2):** TODA imagem que vem no print da questão entra sempre — do enunciado (`img`) e da explicação (`explImg`) — **independente de estar referenciada no artigo**. A regra anterior da auditoria (toda mídia tinha de ser citada no artigo) empurrou para a decisão errada de deixar as imagens da Q3 de fora. A auditoria passou a considerar artigo **e** questões, e a aceitar `singleLang:true` para figura que veio só num idioma. |
| 2026-07-25 | **§10.1 registra um conflito real:** duas sessões trabalharam no mesmo tópico ao mesmo tempo e quase duplicaram a mídia da Q3. Regras novas: `git status` antes de editar conteúdo, nunca reverter arquivo com trabalho não commitado alheio, e desfazer o próprio pedaço cirurgicamente. |
| — | **Pendentes:** estratégia de link das tags do QBank (§8.3); caneta livre/Post-it/anotação no leitor (§7.2); `href` do tópico na busca global (§4). |
