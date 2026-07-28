# CoupleMed — Adicionar conteúdo à Library 1

> Guia operacional exclusivo da **Medical Library › Library 1**.
>
> Gatilhos: “adicionar Library 1”, “adicionar conteúdo à Library 1” e equivalentes.
>
> Fonte de verdade deste fluxo: este arquivo no repositório. A cópia em
> `/Users/jonathan/Desktop/Adicionar Library 1/LIBRARY1_ADD_CONTENT.md`
> deve permanecer byte a byte idêntica.

---

## 0. Leia isto antes de agir

### 0.1 Escopo absoluto: Library 1 não é QBank 1

Este fluxo pode alterar somente os arquivos necessários à Library 1, seus
flashcards, sua narração e, quando indispensável, arquivos compartilhados da
interface.

**Nunca, neste fluxo:**

- editar `public/js/qbank.js`;
- inserir questões no `SEED` do QBank;
- alterar filtros, performance ou estado do QBank;
- copiar o procedimento de `QBANK_ADD_QUESTION.md`;
- adicionar ou modificar o painel global **Lab Values** do QBank;
- misturar arquivos de uma sessão paralela do QBank no mesmo commit.

As questões do botão **Create Test** pertencem ao tópico da Library 1. Elas
ficam no campo `quiz`, usam ids `L1Q-*` e estado próprio. Não são questões do
QBank.

Se um print do Create Test contiver valores laboratoriais, transcreva-os
fielmente como parte da própria questão, tabela ou imagem. Isso **não**
autoriza tocar no recurso global Lab Values; essa regra existe somente no
fluxo do QBank.

Qualquer integração futura entre tags do QBank e artigos da Library 1 exige
uma tarefa separada e explícita. Não a implemente durante inclusão de conteúdo.

### 0.2 Ordem de prioridade

Quando duas instruções parecerem incompatíveis, siga esta ordem:

1. **Fidelidade ao material-fonte**;
2. **nenhuma invenção ou dedução médica**;
3. **separação entre Library 1 e QBank 1**;
4. **conteúdo bilíngue EN + PT-BR**;
5. **integridade de imagens, questões, flashcards e narração**;
6. **responsividade e acessibilidade**;
7. **automação, velocidade e economia de tokens**.

Escalar para um modelo mais forte não permite preencher uma informação que
não aparece no material.

### 0.3 Definição única de “tópico concluído”

Um tópico só está concluído quando todos os itens aplicáveis abaixo passaram:

- [ ] texto completo em EN e PT-BR;
- [ ] todas as mídias do artigo incluídas, refinadas e ligadas às referências;
- [ ] todas as questões do Create Test incluídas, **se existirem na origem**;
- [ ] toda imagem de enunciado e explicação do Create Test incluída;
- [ ] exatamente **30 flashcards bilíngues**, todos baseados no tópico;
- [ ] **6 narrações** publicadas: 4 EN + 2 PT, cada uma com áudio e JSON;
- [ ] comparação visual e textual com todo o material-fonte;
- [ ] auditoria automatizada, testes e QA responsivo aprovados;
- [ ] commit e push concluídos;
- [ ] `✅` aplicado à subpasta do tópico; e à pasta do Subject apenas quando
      todos os seus tópicos estiverem realmente concluídos.

Um tópico sem questões é válido: não criar `quiz`, não inventar perguntas e
não exibir Create Test.

### 0.4 Política de escolha de modelo

Use o modelo mais econômico capaz de manter a fidelidade.

| Nível | Use quando | Não use sozinho quando |
|---|---|---|
| **modelo econômico — medium** | prints nítidos, ordem explícita, texto corrido, schema já existente, edições mecânicas, comandos e testes conhecidos | tradução médica difícil, tabela densa, pareamento incerto de imagens, OCR duvidoso, conflito de arquivos |
| **modelo econômico — high** | tradução médica PT-BR, tabelas/listas complexas, classificação de muitos prints, recorte com moldura, warnings de auditoria, QA responsivo ou conflito simples | fonte ilegível/oculta, costura delicada, regras conflitantes, falhas repetidas sem causa |
| **GPT-5.6-sol — ultra** | auditoria de material muito complexo, diagrama ou tabela difícil, costura de imagem, sequência ambígua, conflito de regras/código, regressão difícil ou falhas repetidas | nunca para “adivinhar” trecho ausente, ilegível ou encoberto |

Regras de escalonamento:

- Comece em `medium` somente quando o lote for limpo e previsível.
- Suba para `high` ao primeiro sinal de ambiguidade médica, visual ou estrutural.
- Use GPT-5.6-sol em `ultra` para a parte difícil e volte ao modelo econômico nas
  etapas mecânicas.
- Se nem o modelo mais forte consegue ler a fonte com segurança, peça um
  arquivo limpo. Não publique uma hipótese.

#### 0.4.1 Política multiplataforma de modelos e esforços

Os níveis deste guia descrevem a **capacidade necessária para a tarefa**, não
um nome fixo de produto. Modelo e esforço de raciocínio são controles
independentes: selecionar os dois quando a plataforma permitir.

| Nível operacional | Trabalho permitido |
|---|---|
| **econômico — medium** | Trabalho mecânico, previsível e estruturado, sem ambiguidade: inventário, ordenação, aplicação de schema conhecido, edições localizadas e testes determinísticos. |
| **econômico — high** | Tradução médica PT-BR, tabelas densas, OCR ou crop que exija julgamento, pareamento de mídias, QA responsivo comum e auditoria final. |
| **forte — ultra** | Conflito de fontes, ambiguidade médica/visual/estrutural, CSS responsivo crítico, taxonomia nova, regressão ou falha repetida sem causa. |

Regras operacionais:

- [ ] Começar no menor nível seguro.
- [ ] Escalonar somente a menor unidade afetada: trecho, imagem, tabela, questão
      do Create Test ou tópico; não promover o lote inteiro sem necessidade.
- [ ] Depois da parte crítica, voltar ao nível econômico para as etapas
      mecânicas.
- [ ] Nunca usar capacidade maior como autorização para inventar, completar ou
      “melhorar” conteúdo ausente.
- [ ] Se a interface não puder trocar modelo/esforço automaticamente, informar
      ao usuário antes da unidade crítica: unidade, motivo, nível necessário e
      ponto de retorno.
- [ ] Se o modelo solicitado não estiver disponível, usar o equivalente mais
      próximo que cumpra o nível e registrar a substituição.

Perfis de execução:

- **máxima economia:** `medium` por padrão, com escalonamento pontual;
- **menor risco / menor intervenção:** `high` no fluxo médico/visual e
  `medium` apenas no trabalho determinístico;
- **ultra pontual:** `ultra` somente na unidade crítica, seguido de retorno ao
  nível anterior.

Relatório mínimo de escalonamento:

```text
Unidade: <trecho/imagem/tabela/questão/tópico>
Motivo: <ambiguidade ou risco observável>
Nível necessário: <medium|high|ultra>
Retorno: <etapa em que volta ao nível econômico>
```

#### 0.4.2 ChatGPT / Codex

Usar a família atual disponível; não confundir o nome do modelo com o esforço.

| Nível do guia | Modelo preferencial | Esforço |
|---|---|---|
| **medium** | GPT-5.6 Luna; na ausência, GPT-5.4 ou equivalente econômico | `medium` |
| **high** | GPT-5.6 Terra; na ausência, GPT-5.5 ou equivalente intermediário | `high` ou `xhigh` |
| **ultra** | GPT-5.6 Sol | `ultra` no Codex; `max` quando a API não expuser `ultra` |

Se a sessão oferecer somente parte dessas opções, preservar primeiro o nível
de capacidade e registrar o modelo/esforço efetivamente usados. Referência:
[guia oficial de modelos OpenAI](https://developers.openai.com/api/docs/guides/latest-model).

#### 0.4.3 Claude / Claude Code

Preferir os aliases atuais, sem fixar versões que podem envelhecer:

| Nível do guia | Alias/modelo | Esforço |
|---|---|---|
| **medium** | `haiku` | `medium` |
| **high** | `sonnet` | `high` ou `xhigh` |
| **ultra** | `opus` ou `best` | `xhigh` ou `max`, se disponível |

O perfil `opusplan` é adequado quando a parte ambígua exige planejamento com
Opus e a execução pode voltar ao Sonnet. Confirmar o modelo resolvido pela
interface antes da unidade crítica. Referência:
[configuração oficial do Claude Code](https://code.claude.com/docs/en/model-config).

**O que troca sozinho e o que não troca** — não descrever nenhum outro
mecanismo como automático:

| Mecanismo | Troca sozinha? |
|---|---|
| Subagente com `model:` no frontmatter (`.claude/agents/*.md`) | **Sim.** Roda no modelo declarado quando a sessão principal delega |
| Perfil `opusplan` | **Parcial.** Planeja em Opus, executa em Sonnet |
| Modelo da sessão principal | **Não.** Só `/model`, digitado pelo usuário |
| `effortLevel` | **Não.** Só `.claude/settings.json` ou `/config` |

Não existe hook, setting ou comando que troque o modelo da conversa principal
no meio dela. Qualquer instrução que prometa isso está errada.

**Configuração implantada neste repositório:**

- `.claude/settings.json` (versionado): `model: sonnet`, `effortLevel: medium`
  como nível de entrada, sobrepondo o padrão global só neste repo.
- `CLAUDE.md` na raiz: carrega a política em toda sessão aberta nesta pasta.
- `.claude/agents/mecanico.md` — Haiku, **somente leitura**. Delegar sem
  perguntar o trabalho de nível `medium`: inventário de arquivos, conferência
  de IDs e slugs, dedup, contagem de tópicos, checagem de campos obrigatórios,
  verificação de padrão de nomes (inclusive nos lotes de narração, §17).
- `.claude/agents/tradutor-medico.md` — Sonnet. Delegar lotes de tradução
  EN→PT cujo critério já está neste documento. Não commita nem dá push.

Ambos devolvem uma seção **Pendências**, são proibidos de inventar conteúdo e
devolvem à sessão principal qualquer conflito de fontes ou taxonomia nova, que
é nível `ultra`. Não delegar tarefa que dependa do contexto acumulado da
conversa, curta demais, ou que exija **decidir** o critério em vez de aplicá-lo.

#### 0.4.4 Kimi / Kimi Code

Usar os nomes e controles realmente exibidos na instalação atual:

| Nível do guia | Modelo sugerido | Esforço/modo |
|---|---|---|
| **medium** | K3-256k ou K2.7 Code (`kimi-for-coding`) | menor esforço seguro; Thinking pode ficar desligado no trabalho puramente mecânico |
| **high** | K3-256k ou K3 | `high` / Thinking ligado |
| **ultra** | K3 ou o modelo mais forte disponível | `max` / Thinking ligado |

Usar `/model` para conferir ou trocar modelo e Thinking Mode quando disponível.
Opções chamadas **Auto Model**, tiers ou modos Architect/Code/Debug só podem ser
usadas se aparecerem na interface atual; nunca presumir que existem. Registrar
qual modelo foi resolvido automaticamente. Referências:
[modelos do Kimi Code](https://www.kimi.com/code/docs/en/kimi-code/models.html)
e [interação da CLI](https://www.kimi.com/help/kimi-code/cli-interaction).

---

## 1. Fluxo operacional obrigatório

Execute **um tópico por vez**, do inventário ao push. Depois passe
automaticamente ao próximo tópico com material.

1. **Preflight**
   - Ler este arquivo e `RESPONSIVE_BREAKPOINTS.md`.
   - Rodar `git status --short`.
   - Não tocar em arquivo já modificado por outra sessão.
   - Rodar `node tools/library1-progress.js status`.

2. **Localizar o material**
   - Varrer `/Users/jonathan/Desktop/Adicionar Library 1/` recursivamente.
   - Processar apenas arquivos sob `<Subject>/<Tópico>/...`.
   - Ignorar o próprio guia, `.DS_Store`, arquivos ocultos, temporários e
     subpastas vazias.
   - Remover mentalmente o sufixo ` ✅` antes de comparar nomes.

3. **Inventariar antes de transcrever**
   - Ordenar arquivos por ordem **natural**: 1, 2, 3, …, 10; nunca 1, 10, 2.
   - Visualizar todos os arquivos do tópico.
   - Montar um mapa: arquivo → idioma → artigo/questão → texto/mídia → ordem.
   - Contar páginas, mídias e questões sem usar números de tópicos anteriores.

4. **Resolver bloqueios da fonte**
   - Se houver trecho ilegível, arquivo corrompido, ordem realmente ambígua,
     conteúdo encoberto ou material no tópico errado, não adivinhar.
   - Registrar os arquivos exatos e pedir uma fonte limpa.
   - Enquanto aguarda, pode continuar outros tópicos independentes e
     não bloqueados; nunca marcar o tópico bloqueado.

5. **Transcrever o artigo**
   - EN permanece fiel ao material, na mesma ordem e estrutura.
   - PT fornecido pelo usuário segue a regra da Seção 3.2.
   - PT ausente é traduzido de forma correta e fiel.
   - Criar HTML sem mudar o conteúdo.

6. **Preparar a mídia**
   - Separar texto transcrevível de conteúdo genuinamente gráfico.
   - Recortar e refinar conforme a Seção 4.
   - Gerar WebP, conferir em folha de contato e registrar `assets`.
   - Colocar cada referência no ponto exato em que aparece no artigo.

7. **Incluir Create Test, se houver**
   - Transcrever todas e somente as questões encontradas.
   - Incluir todas as imagens de enunciado e explicação.
   - Manter o quiz isolado do QBank.

8. **Criar os 30 flashcards**
   - Bilíngues, um fato do tópico por card e todo card com `why`.
   - Registrar pacote novo em `public/app.html` se o Subject ainda não tiver
     script de flashcards carregado.

9. **Gerar e publicar as 6 narrações**
   - Conferir vozes, gerar EN/PT, subir ao R2 e verificar os 12 objetos públicos.

10. **Validar**
    - Rodar a checklist canônica da Seção 7, sem pular warnings.
    - Fazer QA responsivo nos tamanhos da Seção 6.
    - Comparar a saída final com cada arquivo do inventário.

11. **Commit e push automáticos**
    - Stage somente de caminhos próprios da Library 1.
    - Revisar o diff staged, commitar e fazer push sem pedir confirmação
      intermediária.
    - Respeitar qualquer aprovação que o ambiente realmente exija; nunca
      alegar que houve “bypass” se o runtime não concedeu.

12. **Marcar progresso**
    - Somente depois do push confirmado:

      ```bash
      node tools/library1-progress.js mark "<Subject>" "<Tópico>"
      ```

    - Continuar automaticamente até acabar todo o material novo.

---

## 2. Origem, árvore e correspondência de nomes

### 2.1 Pasta de origem

```text
/Users/jonathan/Desktop/Adicionar Library 1/
├── <Subject ou System>/          nível 1
│   ├── <Tópico>/                 nível 2: unidade de trabalho
│   │   ├── Imagem 1.png
│   │   ├── Imagem 2.png
│   │   └── <subpasta opcional>/  nível 3+: ainda é o mesmo tópico
│   └── ...
└── LIBRARY1_ADD_CONTENT.md       arquivo de controle; nunca é conteúdo
```

Regras:

- Pasta de nível 1 = Subject/System do site.
- Subpasta de nível 2 = tópico do site.
- Qualquer nível abaixo do tópico ainda pertence ao mesmo tópico.
- Subpasta vazia significa “material ainda não enviado”: pular em silêncio,
  não criar conteúdo vazio e não marcar `✅`.
- O caminho é a classificação. Não recategorizar pelo conteúdo.
- Um arquivo diretamente na raiz ou diretamente no Subject não é material de
  tópico; não processá-lo como artigo.

### 2.2 Normalização disco ↔ site

Antes de comparar:

- `/` e `:` no nome do site viram ` - ` no disco;
- `<` e `>` são removidos;
- ponto final no fim é removido;
- espaços duplicados são colapsados;
- Unicode dos dois lados é normalizado para NFC;
- sufixo ` ✅` é removido.

Referência:

```js
const stripCheck = s => s.replace(/\s*✅\s*$/u, '').trim();
const norm = s => stripCheck(String(s).normalize('NFC'))
  .replace(/\s*[\/:]\s*/g, ' - ')
  .replace(/[<>]/g, '')
  .replace(/\.+$/, '')
  .replace(/\s+/g, ' ')
  .trim();
```

Se ainda não houver correspondência exata com
`public/js/library1-structure.js`, não escolher “o mais parecido”. Parar o
tópico e registrar a divergência.

### 2.3 Inventário mínimo por tópico

Antes de editar, produza internamente uma tabela equivalente a:

| Ordem | Arquivo | Idioma | Grupo | Papel |
|---|---|---|---|---|
| 1 | `Imagem 1.png` | EN | artigo | texto |
| 2 | `Imagem 2.png` | EN | artigo | figure 1 |
| 3 | `...` | PT | artigo | versão PT de figure 1 |
| 4 | `questões/...` | EN | Create Test | Q1 enunciado |

Conferências:

- a sequência do texto é contínua;
- versões EN/PT estão pareadas corretamente;
- nenhum print foi usado duas vezes ou ficou sem classificação;
- prints da mesma questão foram agrupados antes de contar questões;
- o número de arquivos **não** é presumido como número de questões.

---

## 3. Fidelidade e tradução

### 3.1 Regra de fidelidade absoluta

O artigo e as questões do Create Test devem reproduzir o material:

- mesma ordem;
- mesmos títulos e subtítulos;
- mesmos parágrafos;
- mesmas listas e numeração;
- mesmas tabelas, linhas, colunas, unidades, notas e símbolos;
- mesmos destaques e referências a imagens/figuras/tabelas;
- mesmas alternativas, resposta, percentuais, explicações e objetivo.

É proibido:

- parafrasear, resumir, encurtar ou “enxugar”;
- expandir ou acrescentar explicações;
- reordenar conteúdo;
- corrigir silenciosamente o material-fonte;
- trocar termo técnico por sinônimo;
- completar uma lacuna com conhecimento médico;
- inventar tabela, unidade, valor, legenda, referência, questão ou mnemônico;
- usar conteúdo de outro tópico para preencher este;
- transformar uma figura em texto ou redesenhá-la por conta própria.

HTML é somente estrutura visual. Ele não autoriza reescrita.

### 3.2 PT-BR correto sem violar a fonte

Use esta decisão, sem improvisar:

| Situação | Ação |
|---|---|
| PT foi fornecido como parte do material | Transcrever como fonte. Erro provável não deve ser corrigido silenciosamente nem publicado como se estivesse validado: registrar o trecho e pedir decisão. |
| PT não foi fornecido | Traduzir do EN para PT-BR correto, médico e natural, sem omitir, acrescentar ou alterar a ordem. |
| PT foi fornecido só até certo ponto | Transcrever a parte fornecida; traduzir o restante e registrar exatamente onde começa a tradução feita pelo modelo. |
| EN e PT fornecidos divergem de forma material | Não escolher uma versão. Registrar a divergência e pedir decisão. |
| Termo admite mais de uma tradução médica | Manter consistência com o vocabulário PT já fornecido no mesmo tópico; se não houver referência segura, usar modelo econômico — `high`. |

Todo conteúdo entra em EN e PT no mesmo commit:

- título e corpo do artigo;
- legendas/`alt`;
- Create Test;
- flashcards;
- narração.

Não depender de tradução ao vivo. Os `ptName` existentes em
`public/js/library1-structure.js` devem ser reutilizados, não retraduzidos.

### 3.3 Derivações permitidas

O artigo e o Create Test são transcrições. Os 30 flashcards são uma derivação
pedagógica permitida, mas:

- cada card deve usar apenas fatos presentes no tópico;
- a pergunta pode ser reorganizada para recall ativo;
- nenhum fato, diagnóstico diferencial ou mnemônico externo pode ser adicionado;
- `why` explica o fato já presente, sem trazer conhecimento de fora.

---

## 4. Imagens: recorte, refinamento e publicação

### 4.1 O que vira texto e o que vira imagem

- Texto legível, listas e tabelas simples devem ser transcritos para HTML.
- Foto clínica, diagrama, algoritmo, ilustração, gráfico e tabela cuja forma
  visual é essencial permanecem como mídia.
- Não usar screenshot de um parágrafo quando ele pode ser transcrito.
- Não reconstruir um diagrama em HTML ou com geração de imagem.

### 4.2 Recorte seguro

Objetivo: remover somente o que não pertence ao conteúdo, preservando o
material original.

Checklist de recorte:

- [ ] remover moldura do aplicativo, barra “Exhibit Display”, controles,
      bordas brancas excessivas e notificações **somente quando estiverem fora
      do conteúdo**;
- [ ] preservar título, legenda, escala, unidades, eixos, notas, marcadores,
      setas, cores diagnósticas e proporção;
- [ ] preservar resolução original; não reduzir para “caber”;
- [ ] não esticar, distorcer, recolorir, inpaintar, apagar ou inventar pixels;
- [ ] não aplicar nitidez, contraste ou filtro que altere achados clínicos;
- [ ] não cortar espaço necessário para entender rótulos ou setas;
- [ ] comparar recorte e original lado a lado;
- [ ] inspecionar todos os resultados em folha de contato antes de publicar.

Para capturas da janela Exhibit Display, pode usar:

```bash
python3 tools/library1-crop-exhibit.py \
  "<pasta-dos-prints>" "<pasta-saida>" <numero-do-print> [...]
```

Os números correspondem a arquivos `Imagem N.png`. O resultado automático
sempre exige inspeção visual. Se uma notificação ou falha cobrir conteúdo, não
usar IA generativa para reconstruir: pedir o print limpo.

Costura de duas capturas só é permitida quando há sobreposição inequívoca,
sem duplicar ou perder linhas. Use modelo econômico — `high` ou GPT-5.6-sol —
`ultra` e valide a junção
em zoom. Se a costura não for comprovável, pedir nova captura.

### 4.3 Formato, destino e nomes

Destino:

```text
public/assets/library1/<subject-slug>/<topic-slug>/
```

Nomes:

```text
image-N-en.webp
image-N-pt.webp
figure-N-en.webp
figure-N-pt.webp
table-N-en.webp
table-N-pt.webp
```

Converter com:

```bash
node tools/library1-assets.js convert \
  public/assets/library1/<subject-slug>/<topic-slug>
```

Regras:

- WebP com perdas pode ser usado em fotografia, se não apagar detalhe.
- Tabela, texto, gráfico e diagrama devem permanecer nítidos; prefira lossless.
- Não gerar JPEG/PNG finais manualmente.
- A chave gravada no conteúdo é relativa:
  `<subject-slug>/<topic-slug>/<arquivo>.webp`.
- Nunca gravar URL absoluta no registro.
- Nunca colocar `<img>` solta no HTML do artigo.

O repositório serve a mídia de `public/assets/library1/`. Quando o relatório
indicar aproximação do limite planejado, a base pode migrar para R2 sem mudar
as chaves:

```bash
node tools/library1-assets.js report
```

Não faça a migração durante uma inclusão comum sem tarefa explícita.

### 4.4 Mídia bilíngue

Cada mídia possui `en` e `pt`, com `key` e `alt`.

- O `alt` funciona como legenda no visualizador e deve ser completo.
- EN e PT do artigo devem referenciar o mesmo conjunto de mídias.
- A referência precisa ficar no mesmo ponto semântico do material:
  `<a class="l1r-ref" data-ref="figure-1">figure 1</a>`.
- Na página do artigo, a imagem não aparece aberta: o usuário clica na
  referência para ampliar.
- No download EN/PT, a imagem é embutida após o bloco que a referencia.

Para mídia **do artigo**, EN e PT são o padrão obrigatório. Se faltar uma versão
com texto traduzido, não gerar/reconstruir a arte e não esconder a falta:
registrar o bloqueio e pedir o arquivo correspondente.

Para mídia exclusiva do **Create Test** que realmente foi fornecida em um idioma
só:

- não omitir;
- apontar `en` e `pt` para a mesma `key`; se um legado já usar dois nomes
  pareados, os arquivos devem ser byte a byte idênticos;
- marcar `singleLang:true`;
- traduzir o `alt` quando possível;
- registrar a ausência da versão PT no relatório final.

Não usar `singleLang:true` para esconder um pareamento esquecido.

---

## 5. Estrutura de dados e entregas

### 5.1 Artigo

Um arquivo por Subject:

```text
public/js/library1-content/<subject-slug>.js
```

Modelo:

```js
(function(){
'use strict';
window.LIBRARY1_CONTENT = window.LIBRARY1_CONTENT || {};
window.LIBRARY1_CONTENT['<subject-slug>'] = {
  '<topic-slug>': {
    en: { title: '<title EN>', html: `<h2>...</h2>` },
    pt: { title: '<title PT>', html: `<h2>...</h2>` },
    assets: {
      'figure-1': {
        kind: 'figure',
        n: 1,
        en: { key: '<subject>/<topic>/figure-1-en.webp', alt: '...' },
        pt: { key: '<subject>/<topic>/figure-1-pt.webp', alt: '...' }
      }
    }
  }
};
})();
```

Regras de HTML:

- manter a IIFE: arquivos de Subjects diferentes carregam no mesmo escopo global;
- sem `<h1>` no corpo; o leitor usa `title`;
- sem `<script>`, `<style>` ou `style=` inline;
- sem `<img>` no corpo do artigo;
- escapar crase e `${` dentro de template literal;
- manter a mesma hierarquia estrutural em EN e PT;
- rodar `node --check` ao terminar.

Não alterar conteúdo já publicado fora do tópico em trabalho.

### 5.2 Invariantes do leitor

Na inclusão comum não é necessário editar o leitor.

Comportamento que o conteúdo deve respeitar:

- a bandeira global troca texto, título, referências, legendas e mídia;
- não há botões locais EN/PT;
- a página do artigo mostra texto e links de mídia, não imagens inline;
- o visualizador abre a mídia ampliada, com zoom e navegação;
- download EN/PT embute a mídia do idioma correspondente;
- marcações de texto são separadas por idioma.

Se for indispensável alterar toolbar, leitor ou CSS:

- preservar a paridade de comportamento com a toolbar da Library 3;
- aumentar as versões `?v=` correspondentes;
- rodar testes do leitor, `library1-cachecheck.js` e `library1-doccheck.js`;
- manter o commit pequeno e isolado.

### 5.3 Create Test

O campo `quiz` é opcional e existe somente quando a pasta traz questões.

Schema:

```js
quiz: [{
  id: 'L1Q-<TOPIC>-001',
  vignette: '...',
  q: '...',
  options: ['...', '...'],
  correct: 'A',
  peer: { A: 70, B: 10, C: 20 },
  difficulty: 'easy',
  explC: '...',
  explI: { B: '...', C: '...' },
  objective: '...',
  img: 'image-1',
  explImg: 'figure-1',
  ptTranslation: {
    vignette: '...',
    q: '...',
    options: ['...', '...'],
    explC: '...',
    explI: { B: '...', C: '...' },
    objective: '...'
  }
}]
```

Regras:

- quantidade = exatamente a quantidade encontrada; pode ser 0, 1 ou qualquer
  outro número;
- uma questão pode ocupar vários prints; agrupar antes de contar;
- transcrever todas as opções, com suporte atual de A–H;
- se a fonte tiver mais de 8 alternativas, não truncar nem publicar parcialmente:
  bloquear a questão e escalonar a adaptação do leitor para GPT-5.6-sol —
  `ultra` antes de incluí-la;
- `correct` deve ser a alternativa indicada na origem;
- `peer` vem somente da origem, é copiado sem ajuste e pode não somar 100;
- se `peer` não existir, omiti-lo e usar `difficulty:'medium'`; se vier
  parcialmente ausente, bloquear a questão em vez de completar percentuais;
- dificuldade deriva do percentual da correta:
  - `>= 70` → `easy`;
  - `50–69` → `medium`;
  - `< 50` → `hard`;
- toda questão recebe tradução PT completa;
- imagem do enunciado vai em `img`;
- imagem da explicação vai em `explImg`;
- se as duas existirem, incluir as duas;
- toda imagem enviada com a questão entra, mesmo sem referência no artigo;
- no Create Test, as imagens aparecem inline e também podem ser ampliadas;
- nunca substituir imagem da questão por mídia “parecida” do artigo.

O estado do Create Test usa a chave própria `couplemed_lib1quiz_<user>`.
Não usar chaves, analytics ou performance do QBank.

### 5.4 Trinta flashcards por tópico

Destino:

```text
public/js/library1-flashcards/<subject-slug>.js
```

Regras obrigatórias:

- exatamente 30;
- EN e PT em todo card;
- id único e estável com prefixo `L1FC-`;
- um conceito por card;
- todo card contém `why` nos dois idiomas;
- deck = nome do tópico, bilíngue;
- `tags` inclui `Library1` e o tópico;
- `sys`, `subj` e `topic` preenchidos;
- se a taxonomia não tiver o assunto, usar `<sys>::misc`;
- imagens vêm do próprio tópico, por caminho; nunca base64;
- usar cards `image` somente para imagens realmente existentes e úteis no
  material. Se houver menos imagens que a distribuição de referência, converter
  as vagas em `recall`/`contrast`; nunca inventar nem reutilizar mídia de outro
  tópico para atingir uma cota;
- nenhum fato externo ao material.

Distribuição de referência:

| Tipo | Quantidade aproximada |
|---|---:|
| `recall` | 11 |
| `contrast` | 7 |
| `image` | 4 |
| `cloze` | 3 |
| `why` | 2 |
| `case` | 2 |
| `mnemonic` | 1, somente se o material tiver mnemônico |

Se não houver mnemônico, converter essa vaga em `recall`; nunca inventar um.
A distribuição é um guia pedagógico, mas o total é sempre 30.

Subject novo exige, antes de `flashcards.js`, em `public/app.html`:

```html
<script src="js/library1-flashcards/<subject-slug>.js?v=1"></script>
```

Teste sempre com Subject e tópico explícitos:

```bash
JSDOM_PATH=<caminho-absoluto-para-jsdom> \
node tools/tests/test-flashcards.js "<subject-slug>" "<topic-slug>"
```

### 5.5 Seis narrações por tópico

Vozes fixas:

| Idioma | Vozes |
|---|---|
| EN | Ava, Samantha, Alex, Tom |
| PT | Fernanda, Felipe |

O catálogo real fica em `public/js/cm-narration-shared.js`. Não renomear ids
nem escolher outras vozes.

Fluxo:

```bash
node tools/narration.js voices
node tools/narration.js build lib1 "<subject-slug>" "<topic-slug>"
node tools/narration.js upload \
  --only=lib1/<subject-slug>/<topic-slug>
```

Se o texto de um tópico já narrado mudar:

```bash
node tools/narration.js build lib1 \
  "<subject-slug>" "<topic-slug>" --force
```

Destino público:

```text
narration/lib1/<subject>/<topic>/<lang>-<voiceId>.m4a
narration/lib1/<subject>/<topic>/<lang>-<voiceId>.json
```

São **12 objetos por tópico**: 6 `.m4a` + 6 `.json`.

`node tools/narration.js report` mede a oficina local
`.narration-build/`, não prova o que está no R2. Antes de concluir, verificar
pela rota pública que os 12 objetos respondem com sucesso.

Exemplo de conferência pública (`200` ou `206` conta como disponível):

```bash
base="https://couplemed.johnestudosmed.workers.dev/api/narration/audio"
key="narration/lib1/<subject-slug>/<topic-slug>"
for voice in en-ava en-samantha en-alex en-tom pt-fernanda pt-felipe; do
  for ext in m4a json; do
    code="$(curl -s -o /dev/null -w '%{http_code}' -I "$base/$key/$voice.$ext")"
    case "$code" in 200|206) ;; *) echo "FALHA $voice.$ext HTTP $code"; exit 1;; esac
  done
done
```

---

## 6. Responsividade obrigatória

Antes de produzir o `✅`, aplicar `RESPONSIVE_BREAKPOINTS.md`. Não inventar
breakpoint novo sem necessidade; respeitar os cortes estruturais
`1180px`, `820px` e `520px`.

Matriz mínima de QA:

| Classe | Viewport sugerido |
|---|---|
| Monitor grande / 27" | `2560×1440` |
| Desktop | `1440×900` |
| MacBook/laptop | `1280×800` e/ou `1366×768` |
| iPad landscape/portrait | `1024×768` e `820×1180` |
| Mobile | `390×844` e `360×780` |

Conferir nos dois idiomas:

- [ ] sem overflow horizontal da página;
- [ ] texto, tabelas e listas sem corte ou sobreposição;
- [ ] referências de mídia clicáveis e legíveis;
- [ ] visualizador não extrapola a tela e mantém zoom/fechar acessíveis;
- [ ] legenda, título, escala, unidades e notas continuam legíveis;
- [ ] imagens não ficam minúsculas por margens residuais;
- [ ] Create Test mostra enunciado, alternativas, `img` e `explImg` sem
      sobreposição;
- [ ] flashcards cabem em Browse e estudo; rótulos PT quebram linha;
- [ ] toolbar e narrador não cobrem o menu hambúrguer nem conteúdo essencial;
- [ ] downloads EN/PT preservam ordem e mídia.

Qualquer falha responsiva bloqueia conclusão e `✅`.

---

## 7. Checklist final canônica

> Esta é a única checklist de fechamento. Não marcar, commitar ou anunciar
> conclusão antes de todos os itens aplicáveis passarem.

### 7.1 Fonte e fidelidade

- [ ] Todo arquivo do inventário foi visualizado e classificado.
- [ ] Ordem natural e continuidade foram confirmadas.
- [ ] Texto EN foi comparado com a fonte, seção por seção.
- [ ] Títulos, listas, tabelas, símbolos, unidades e destaques coincidem.
- [ ] Não há resumo, paráfrase, acréscimo ou correção silenciosa.
- [ ] PT fornecido foi transcrito ou teve divergência resolvida; PT criado é completo e correto.
- [ ] Ponto em que a tradução criada começa foi registrado.
- [ ] Nenhum trecho ilegível foi completado por inferência.

### 7.2 Mídia

- [ ] Todas as mídias foram incluídas; nenhuma ficou sem classificação.
- [ ] Recortes foram comparados com os originais e aprovados em folha de contato.
- [ ] Nenhum título, rótulo, unidade, legenda ou detalhe foi cortado.
- [ ] Não houve distorção, redução de resolução, recoloração ou inpainting.
- [ ] EN/PT estão pareados; `singleLang:true` só aparece quando justificado.
- [ ] `alt` existe nos dois idiomas.
- [ ] Todas as referências do artigo apontam para mídia existente.
- [ ] Nenhuma `<img>` está solta no HTML do artigo.
- [ ] Toda imagem de enunciado/explicação está em `img`/`explImg`.

### 7.3 Conteúdo derivado

- [ ] Quantidade do Create Test coincide com a origem; zero é aceito.
- [ ] Create Test não tocou no QBank nem em Lab Values global.
- [ ] Existem exatamente 30 flashcards bilíngues.
- [ ] Todos os flashcards têm ids únicos e `why` EN/PT.
- [ ] Nenhum flashcard introduz fato ausente do tópico.
- [ ] As 6 narrações foram geradas e os 12 objetos estão públicos.

### 7.4 Validação técnica

1. Sintaxe:

   ```bash
   node --check public/js/library1-content/<subject-slug>.js
   node --check public/js/library1-flashcards/<subject-slug>.js
   ```

2. Auditoria estrutural, sempre com nomes explícitos:

   ```bash
   node tools/library1-audit.js "<Subject>" "<Tópico>"
   ```

   Exigir:

   - saída referente ao tópico correto;
   - exatamente `1 tópico(s) auditado(s)`;
   - `0 problema(s)`;
   - todo aviso explicado e resolvido ou documentado.

   **Importante:** essa ferramenta não compara o texto com os prints, não
   valida correção médica da tradução e não comprova a posição exata de cada
   referência. Por isso a auditoria visual das Seções 7.1 e 7.2 é obrigatória.
   A ferramenta também rejeita `0 tópico(s)` e IDs `L1Q-*` repetidos entre
   tópicos; qualquer uma dessas falhas bloqueia a conclusão.

3. Coerência do guia, template, pacotes e registro em `app.html`:

   ```bash
   node tools/library1-doccheck.js
   ```

   Rodar **sempre**, inclusive em Subject novo. Essa verificação detecta, entre
   outros desvios, pacote de flashcards que existe mas não foi carregado em
   `public/app.html`.

4. Flashcards:

   ```bash
   JSDOM_PATH=<caminho-absoluto-para-jsdom> \
   node tools/tests/test-flashcards.js \
     "<subject-slug>" "<topic-slug>"
   ```

5. Abrir o deep link do tópico e testar EN/PT:

   ```bash
   python3 -m http.server 8791 --directory public
   ```

   ```text
   http://localhost:8791/app.html?page=library-1&u=guest1&folder=<subject-slug>&topic=<topic-slug>
   ```

6. Conferir:

   - artigo;
   - troca pela bandeira global;
   - todas as referências e imagens;
   - download EN e PT;
   - Create Test, se existir;
   - flashcards;
   - narração;
   - matriz responsiva da Seção 6.

7. Se leitor/CSS/toolbar mudaram:

   ```bash
   JSDOM_PATH=<caminho-absoluto-para-jsdom> node tools/tests/test-reader.js
   JSDOM_PATH=<caminho-absoluto-para-jsdom> node tools/tests/test-quiz.js
   JSDOM_PATH=<caminho-absoluto-para-jsdom> node tools/tests/test-read.js
   JSDOM_PATH=<caminho-absoluto-para-jsdom> node tools/tests/test-narrator.js
   node tools/library1-cachecheck.js
   ```

   Subir `?v=` antes de aceitar o novo estado do cache:

   ```bash
   node tools/library1-cachecheck.js --accept
   ```

8. Inspeção final do escopo:

   ```bash
   git status --short
   git diff -- <caminhos-da-Library-1>
   ```

   Confirmar que `public/js/qbank.js` e arquivos alheios não foram alterados
   nem serão staged.

---

## 8. Commit, push e `✅`

### 8.1 Concorrência segura

Antes de editar:

```bash
git status --short
```

Se um arquivo-alvo já estiver modificado sem ter sido alterado por esta
sessão:

- assuma que outra sessão está trabalhando nele;
- não edite, não restaure, não faça checkout e não sobrescreva;
- escolha outro tópico/Subject ou coordene a posse do arquivo.

Nunca use `git add .`, `git add -A`, `git restore` ou `git checkout --` sobre
arquivo com trabalho alheio.

### 8.2 Publicação automática

Após a checklist da Seção 7:

1. revisar diff dos caminhos próprios;
2. stage somente dos arquivos desta entrega;
3. conferir `git diff --cached --name-only`, `git diff --cached --check` e o
   diff staged;
4. criar commit pequeno, preferencialmente um tópico por commit;
5. fazer `git push` automaticamente; se o branch não tiver upstream, usar
   `git push -u origin HEAD`;
6. confirmar que o remoto recebeu o commit;
7. somente então aplicar o `✅`.

Exemplo de mensagem:

```text
feat(library1): add <topic-name>
```

Se o push for rejeitado por avanço remoto:

- não rebase sobre worktree com alterações alheias;
- assegure que seu trabalho já está commitado e o worktree relevante está limpo;
- execute `git pull --rebase`;
- resolva qualquer conflito sem apagar trabalho de outra sessão;
- repita os testes afetados;
- faça push novamente.

### 8.3 Marcação de progresso

```bash
node tools/library1-progress.js mark "<Subject>" "<Tópico>"
```

Regras:

- ` ✅` é sufixo, nunca prefixo;
- marcar a subpasta do tópico somente após push confirmado;
- a ferramenta marca a pasta do Subject quando todos os tópicos estiverem
  concluídos;
- nunca marcar pasta vazia ou tópico bloqueado;
- a fonte de verdade é o conteúdo publicado, não o nome da pasta.

Para reconciliar:

```bash
node tools/library1-progress.js sync
node tools/library1-progress.js status
```

### 8.4 Relatório final mínimo

Informar:

- Subject e tópico;
- número de arquivos-fonte, mídias e questões processados;
- cobertura EN/PT e origem da tradução;
- exceções `singleLang`, defeitos ou divergências preservados;
- resultado da auditoria/testes/QA responsivo;
- confirmação das 6 narrações;
- commit e push;
- pastas marcadas com `✅`.

---

## 9. Processamento em lote e retomada

- Processar todos os tópicos com material sem pedir “posso continuar?” entre
  eles.
- Fazer checkpoint real por tópico: validação → commit → push → `✅`.
- Um tópico bloqueado não impede processar outros tópicos independentes.
- Consolidar dúvidas de fonte, mas nunca publicar suposições enquanto espera.

Se o ambiente oferecer uma ferramenta de automação e o trabalho tiver de
retomar sozinho após limite de uso:

- criar no início uma retomada recorrente, de hora em hora e em minuto
  não-cheio;
- usar prompt autossuficiente que mande ler este arquivo, consultar
  `library1-progress.js status`, respeitar fidelidade e continuar do próximo
  tópico sem `✅`;
- excluir a automação ao concluir a leva ou se outra conta/sessão assumir;
- não criar duas retomadas para o mesmo lote.

Se o ambiente não oferecer automação, não inventar `CronCreate` nem afirmar
que a retomada foi armada. Os commits e `✅` já são o checkpoint durável.

---

## 10. Mapa rápido de arquivos e ferramentas

| Caminho | Papel |
|---|---|
| `public/js/library1-structure.js` | Subjects e tópicos EN/PT |
| `public/js/library1-content/<subject>.js` | artigos, assets e Create Test |
| `public/js/library1-content/_TEMPLATE.js` | modelo de registro |
| `public/assets/library1/<subject>/<topic>/` | mídia WebP |
| `public/js/library1-flashcards/<subject>.js` | 30 cards por tópico |
| `public/js/library1-reader.js` | leitor HTML da Library 1 |
| `public/css/library1-reader.css` | CSS específico do artigo |
| `public/js/cm-narration-shared.js` | vozes e segmentação |
| `public/js/cm-narrator.js` | player de narração |
| `public/css/cm-narrator.css` | barra de narração |
| `tools/library1-audit.js` | auditoria estrutural do tópico |
| `tools/library1-progress.js` | status, `✅` e reconciliação |
| `tools/library1-assets.js` | converter/reportar mídia |
| `tools/library1-crop-exhibit.py` | auxiliar de recorte Exhibit Display |
| `tools/narration.js` | gerar e subir narração |
| `tools/library1-cachecheck.js` | guarda de versão do leitor/CSS |
| `tools/library1-doccheck.js` | coerência do guia com o código |
| `RESPONSIVE_BREAKPOINTS.md` | matriz responsiva obrigatória |

---

## 11. Manutenção deste guia

Quando este documento for alterado:

1. conferir instruções contra os arquivos e comandos reais;
2. eliminar exemplos históricos da parte operacional;
3. rodar:

   ```bash
   node tools/library1-doccheck.js
   ```

4. atualizar a cópia:

   ```text
   /Users/jonathan/Desktop/Adicionar Library 1/LIBRARY1_ADD_CONTENT.md
   ```

5. confirmar igualdade byte a byte:

   ```bash
   cmp -s \
     "/Users/jonathan/Documents/GitHub/-couplemed-pages/LIBRARY1_ADD_CONTENT.md" \
     "/Users/jonathan/Desktop/Adicionar Library 1/LIBRARY1_ADD_CONTENT.md"
   ```

   Resultado diferente de zero bloqueia a entrega.
6. commitar e fazer push usando caminhos específicos.

Não registrar longos históricos de sessões neste guia. Decisões antigas que
não mudam a execução devem ficar no histórico do Git; o estado corrente deve
ser descoberto por `library1-progress.js status`, pelo conteúdo publicado e
pelos arquivos novos da pasta de origem.
