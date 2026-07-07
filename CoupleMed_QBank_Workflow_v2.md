# CoupleMed QBank Workflow v2 — Acordo ChatGPT + Claude (atualizado 06/07/2026)

Este documento substitui o acordo anterior. A estrutura de papéis e o schema SEED
continuam os mesmos; a mudança é a seção 0 (nova) sobre direitos autorais.

## 0. ⚠️ REGRA NOVA — direitos autorais do UWorld (leia antes de tudo)

O UWorld é um produto comercial pago. Nem o ChatGPT nem o Claude devem produzir cópias
literais (palavra por palavra) das vinhetas, alternativas ou explicações do UWorld, nem
reproduzir os diagramas/imagens originais do UWorld (muitos são marcados "©UWorld").

**O que É permitido e esperado:**
- Extrair os **fatos clínicos** da questão (idade, sintomas, exames, diagnóstico,
  raciocínio) e reescrever em texto próprio (paráfrase fiel ao conteúdo médico, não à
  redação original).
- Usar os **percentuais reais de acerto dos colegas** (peer) exatamente como aparecem —
  isso é dado estatístico, não texto autoral.
- Classificar exatamente como no UWorld (system/subject/topic) — isso é metadado, não
  texto autoral.
- Criar diagramas/tabelas **originais** (redação e desenho próprios) que ensinem o mesmo
  conceito, se quiser suporte visual.

**O que NÃO é permitido:**
- Copiar a vinheta, as alternativas ou a explicação do UWorld palavra por palavra (nem
  "quase igual", mudando só 1-2 palavras).
- Recortar e usar as imagens/diagramas originais do UWorld como assets do site.

Isso vale tanto para o lote que o ChatGPT produz quanto para a integração do Claude.

## 1. Divisão de papéis (mantida)
- **ChatGPT (produção):** lê os prints, organiza, classifica, e **reescreve em paráfrase
  própria** (não tradução literal do inglês do UWorld — o objetivo final já é o par
  EN/PT no schema, mas o EN também deve ser uma redação própria, fiel aos fatos clínicos).
- **Claude (integração técnica):** valida o JSON, dá append no SEED, bump de cache, gera
  o ZIP final. Não faz extração de imagem/texto diretamente de prints do UWorld.
- **Você:** recebe o ZIP final e faz commit no GitHub Desktop.
- **Cloudflare:** deploy automático.

## 2. Schema SEED (sem mudanças — ver documento anterior)
Campos obrigatórios: `id, system, discipline, category, difficulty, vignette, q,
options[], correct, explC, explI[], objective, peer{}, ptTranslation{vignette, q,
objective, options[], explC, explI[]}`.

**Novidade de schema:** `ptTranslation` agora deve **sempre** incluir `options`, `explC`
e `explI` completos (não só vignette/q/objective) — isso corrige o Bug #1 de tradução
incompleta. O motor de render (`qbank.js` v33+) já lê esses campos automaticamente.

Campo `img`: continua existindo no schema, mas só deve ser preenchido com uma imagem
**original** (criada para o projeto), nunca um recorte do UWorld.

## 3. Fluxo (sem mudanças estruturais)
Igual ao acordo anterior — ver seção "Fluxo completo" do documento original — apenas
lembrando da regra 0 acima em cada etapa.

## 4. Pendências antes do próximo lote
1. Confirmar visualmente que a tradução PT do Bug #1 está funcionando (v35).
2. Definir se as próximas questões terão suporte de imagem original ou só texto.
