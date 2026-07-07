# CoupleMed — Handoff v35 (sessão de 06/07/2026, parte 2)

> Continuação do v34. Este pacote traz uma correção técnica do Bug #1 (tradução)
> e uma explicação importante sobre os limites de direitos autorais do UWorld
> que afetam o pedido de "reproduzir exatamente as questões originais".

---

## 1. O QUE FOI FEITO NESTA SESSÃO

### ✅ BUG #1 corrigido de verdade (causa raiz, não só sintoma)
A causa real não era só "faltam campos ptTranslation" — o motor de render do QBank
(`qbank.js`) **nunca lia `ptTranslation` para options/explC/explI/objective**. Todo texto
(inclusive vinheta e pergunta) sempre passava por `qbTransSpan()` → API MyMemory em tempo
real, mesmo quando já existia uma tradução fixa salva no banco de questões. Isso explica
por que a tradução era inconsistente: dependia de uma API externa gratuita, sem tradução
fixa de fato sendo usada.

**Correção aplicada em `qbank.js` (v32→v33):**
- Nova função `qbField(en, ptVal, cls)`: se o idioma ativo for PT **e** existir tradução
  fixa (`ptVal`), usa-a diretamente (sem chamada de API, sem re-tradução). Caso contrário,
  cai no comportamento antigo (API/cache via `qbTransSpan`).
- Novas funções auxiliares `ptOptionText(q, label)` e `ptExplIText(q, option)` para buscar
  a tradução certa de cada alternativa/explicação incorreta dentro do array `ptTranslation`.
- Todos os pontos de render (`vignette`, `q`, cada opção, `explC`, cada item de `explI`,
  `objective`) agora passam por `qbField` em vez de `qbTransSpan` direto.
- O `MutationObserver` que já existia (dispara `render()` ao trocar a bandeira PT/EN)
  continua funcionando normalmente — não precisou mexer nisso.

**Preenchi o campo `ptTranslation` completo (options + explC + explI) nas 19 questões
que estavam parciais** (Batch 01 — Male Reproductive System, Batch 02 — Cardiovascular).
Validado com um script Node que confirma: **19/19 questões com tradução 100% completa**
(mesmo número de opções e de itens de explI traduzidos que no original em inglês).

Também enriqueci a vinheta em inglês da questão `CMQ-STEP1-MRS-0003` (torção testicular)
com 2 detalhes clínicos que estavam faltando (uso de ibuprofeno sem alívio; testículo
esquerdo mais baixo no escroto) — mantendo o texto como paráfrase, não cópia literal.

**Cache-bust:** `qbank.js?v=32` → `?v=33` no `app.html`. Nenhum outro arquivo mudou.

**Validação:** `node --check` em todos os 7 arquivos JS do projeto (todos OK) + teste
isolado da lógica de `qbField` (comportamento correto em PT com tradução, PT sem
tradução, e EN).

---

## 2. ⚠️ O QUE NÃO FIZ E POR QUÊ — direitos autorais do UWorld

Você pediu para que as questões, alternativas, explicações e imagens fossem
**exatamente as mesmas** dos prints que você enviou. Preciso ser direto sobre isso:

**Não posso copiar o texto literal das questões/explicações do UWorld nem as imagens
originais (vários prints que você enviou têm a marca "©UWorld" visível — ex.: o
diagrama de diferenciação sexual fetal, o gráfico de pressão do ducto arterioso, o
diagrama de causas de regurgitação mitral).** UWorld é um produto comercial pago, e
reproduzir seu banco de questões e suas ilustrações palavra por palavra / pixel por
pixel — mesmo para uso privado entre poucas pessoas — não é algo que eu deva fazer.
Isso vale tanto para o texto (vinheta, alternativas, explicação completa) quanto para
as imagens/diagramas.

**O que já estava e continua no SEED é uma paráfrase** (mesmos fatos clínicos, mesma
classificação, mesmos percentuais reais de acerto dos colegas — que não são
copyrightáveis — mas com redação própria, não copiada linha a linha do UWorld). Isso é
o que já existia desde o v34 nas 19 questões MRS/CVS, e é o que reforcei agora ao
completar as traduções e corrigir a vinheta da torção testicular.

**Sobre as imagens/diagramas:** não posso recortar e salvar os diagramas do UWorld
(Klinefelter, barreira hematotesticular, vasectomia, diferenciação fetal, lesão
uretral, tabelas de choque/hemodinâmica, etc.) como assets do site. Se quiser suporte
visual nas questões, as opções que posso oferecer são:
1. Recriar um diagrama **original** (desenho simples, não uma cópia) que ensine o
   mesmo conceito — por exemplo, um SVG simples "quadro de achados da torção
   testicular" feito do zero.
2. Deixar as questões só em texto (como já estão hoje).
3. Você mesmo, como titular de uma assinatura paga do UWorld, decidir se quer usar
   prints recortados manualmente como material de estudo pessoal — essa é uma decisão
   sua sobre o uso da sua própria assinatura, não algo que eu deva fazer por você em
   escala.

**Recomendação prática:** o workflow ChatGPT→Claude que vocês já tinham combinado
(ver `CoupleMed_QBank_Workflow_v2.md` neste pacote) já separa bem os papéis — o ChatGPT
faz a extração/tradução a partir das imagens, e o Claude só faz a integração técnica
(valida JSON, dá append no SEED, ajusta cache, gera o ZIP). Sugiro manter essa divisão:
peça ao ChatGPT que gere o lote já em paráfrase própria (não cópia literal), e me
envie apenas o JSON pronto para eu integrar — sem me pedir para eu mesmo extrair
texto/imagens diretamente dos prints do UWorld.

---

## 3. ESTADO ATUAL

- **Versão:** v35
- **29 questões** no QBank (10 originais + 10 MRS + 9 CVS)
- **Bug #1:** ✅ corrigido (mecanismo de tradução fixa via `ptTranslation`, 19/19 completas)
- **Bug #2** (fidelidade do modo Tutor + imagens): parcialmente endereçado — texto mais
  fiel aos fatos clínicos das questões MRS-0003; imagens **não** adicionadas por motivo
  de direitos autorais (ver seção 2)
- **Bug #3** (contador do dashboard): sem mudanças nesta sessão — já corrigido no v33/v40
  do site.js, aguardando sua confirmação visual

## 4. PRÓXIMOS PASSOS SUGERIDOS

- [ ] Confirmar visualmente que a tradução PT das 19 questões MRS/CVS agora aparece
      completa (alternativas + explicações) ao clicar na bandeira 🇧🇷
- [ ] Decidir sobre imagens: original/ilustrativo vs. sem imagem vs. uso pessoal da sua
      assinatura UWorld fora do fluxo Claude
- [ ] Retomar o Batch 001 do workflow ChatGPT→Claude com o ChatGPT gerando o JSON já em
      paráfrase (não texto literal do UWorld)

---

## COMMIT PARA O GITHUB DESKTOP

**Summary:**
`v35: corrige Bug #1 (tradução PT completa do QBank) e enriquece vinheta MRS-0003`

**Description:**
- qbank.js (v32→v33): motor de render agora usa ptTranslation fixo (options/explC/explI/objective) em vez de depender só da API de tradução em tempo real
- Novas funções qbField / ptOptionText / ptExplIText
- Completado ptTranslation (options+explC+explI) nas 19 questões MRS/CVS que estavam parciais
- Vinheta da questão CMQ-STEP1-MRS-0003 (torção testicular) enriquecida com 2 detalhes clínicos que faltavam
- app.html: bump de cache qbank.js?v=33
- Validado: node --check em todos os 7 arquivos JS + script de verificação de completude das traduções (19/19 OK)
- Nenhuma imagem do UWorld foi copiada para o projeto (ver HANDOFF_COUPLEMED_v35.md seção 2 sobre direitos autorais)
