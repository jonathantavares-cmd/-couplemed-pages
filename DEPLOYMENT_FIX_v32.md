# CoupleMed v32 — Fix Package
# FIX 1: XXXX → SEED.length no sidebar
# FIX 2: 20 questões convertidas para formato SEED correto

## PASSO 1: Substituir as questões no qbank.js

Abra `public/js/qbank.js` e encontre o array `const SEED = [` (linha ~28).

DELETE todo o conteúdo entre `const SEED = [` e `];` (linhas 28-128).

COLE no lugar o conteúdo do arquivo `qbank_20q_CORRECTED.js` deste ZIP.

O resultado deve ficar:
```javascript
const SEED = [
    // 10 questões originais (que já estavam)
    { id:'q_cv_as', system:'cardiovascular', ... },
    // ...
    { id:'q_psych_mdd', ... },

    // 20 questões novas CORRIGIDAS
    { id:'CMQ-STEP1-MRS-0001', ... },
    // ...
    { id:'CMQ-STEP1-CVS-0009', ... },
];
```

## PASSO 2: Expor SEED.length para o sidebar

No `qbank.js`, LOGO APÓS a linha `];` que fecha o array SEED (antes do comentário
`/* ---------- ponte de busca global`), ADICIONE esta linha:

```javascript
  window.QBANK_TOTAL = SEED.length;
```

## PASSO 3: Atualizar o sidebar em site.js

No `site.js`, dentro da função `initPlatform()`, ANTES da linha `initSiteSearch();`,
ADICIONE este bloco:

```javascript
    // — QBank Progress Widget: conecta SEED.length ao sidebar —
    (function updateQBProgress(){
      const total = window.QBANK_TOTAL || 0;
      if(!total) return;
      document.querySelectorAll('.progress-card .bar-count').forEach(el=>{
        const m = el.textContent.match(/^(\d+)\s*\//);
        const done = m ? m[1] : '0';
        el.textContent = done + ' / ' + total;
      });
    })();
```

## PASSO 4: Bump de cache em app.html

Altere a versão do qbank.js e site.js:
```html
<script src="js/qbank.js?v=32"></script>
<script src="js/site.js?v=32"></script>
```

## PASSO 5: Commit e push

Summary: Fix XXXX sidebar + convert 20 questions to correct SEED format (v32)
