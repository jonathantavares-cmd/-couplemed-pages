/* CoupleMed — Flashcards gerados a partir da Library 1 › Allergy & Immunology
   ============================================================================
   REGRA (LIBRARY1_ADD_CONTENT.md §11.4): ao incluir CADA tópico na Library 1,
   criar automaticamente **20 flashcards** sobre ele, no padrão Anki e com foco
   em USMLE Step 1, disponíveis para TODOS os usuários.

   Os cards derivam do conteúdo daquele tópico (Seção 1 — fidelidade: o que está
   aqui tem de estar no artigo; nada de fato novo). Podem usar as imagens já
   publicadas em /assets/library1/<subject>/<topic>/.

   Schema de cada card (o mínimo que o flashcards.js precisa; o resto do estado
   SRS é criado por usuário no primeiro carregamento):
     id      — estável e único; prefixo L1FC- garante idempotência do seed
     front   — pergunta. Cloze no padrão Anki: {{c1::texto}}
     back    — resposta (pode conter <img src="/assets/library1/…">)
     tags    — array de strings
     sys     — id do sistema no FC_TAXONOMY (ex.: 'allergy_immunology')
     subj    — '<sys>::<slug>'; se o assunto não existir na lista, usar '<sys>::misc' (Others)
     topic   — nome do tópico da Library 1 (texto livre)
   ============================================================================ */
window.LIBRARY1_FLASHCARDS = window.LIBRARY1_FLASHCARDS || {};

(function(){
'use strict';
const A = '/assets/library1/allergy-and-immunology/acute-rheumatic-fever/';
// ARF é doença autoimune pós-estreptocócica → 'autoimmune_diseases' existe na lista
// do FC_TAXONOMY para allergy_immunology, então NÃO cai em Others.
const SYS  = 'allergy_immunology';
const SUBJ = 'allergy_immunology::autoimmune_diseases';
const TOPIC = 'Acute rheumatic fever';
const TAGS = ['Library1','AcuteRheumaticFever','Step1','ARF'];
const card = (n, front, back, extra) => Object.assign({
  id: `L1FC-ARF-${String(n).padStart(3,'0')}`,
  front, back, tags: TAGS, sys: SYS, subj: SUBJ, topic: TOPIC
}, extra || {});

window.LIBRARY1_FLASHCARDS['allergy-and-immunology'] = {
  'acute-rheumatic-fever': [

    /* ---- patogênese ---- */
    card(1,
      'Acute rheumatic fever develops after an untreated infection with which organism?',
      'Group A <i>Streptococcus</i> (GAS) <b>pharyngitis</b>.<br><br><small>Skin infection with GAS causes PSGN, not ARF.</small>'),

    card(2,
      'ARF is a {{c1::nonsuppurative}}, {{c2::immune-mediated}} complication of untreated group A streptococcal pharyngitis.',
      'It is not a direct bacterial invasion of the heart — there is no pus and no organism in the lesion.'),

    card(3,
      'What mechanism explains how anti-streptococcal antibodies damage the host in ARF?',
      '<b>Molecular mimicry</b> — antibodies against GAS antigens cross-react with cardiac and central nervous system antigens.',
      { back:'<b>Molecular mimicry</b> — antibodies against GAS antigens cross-react with cardiac and central nervous system antigens.'
             + `<br><img src="${A}figure-1-en.webp" alt="Pathophysiology of acute rheumatic fever" style="max-width:100%;border-radius:8px;margin-top:8px">` }),

    card(4,
      'Which GAS antigen is classically responsible for the cross-reactivity in ARF, and which host proteins are attacked?',
      '<b>M protein</b>.<br>It cross-reacts with <b>cardiac myosin</b> and with neuronal cell surface proteins (<b>lysoganglioside</b> in the basal ganglia).'),

    card(5,
      'How long after GAS pharyngitis do the manifestations of ARF typically begin?',
      '<b>2-4 weeks</b> after the episode — and the pharyngitis itself may have been mild and self-resolving.'),

    /* ---- histologia ---- */
    card(6,
      'What is the pathognomonic histologic lesion of rheumatic carditis?',
      'The <b>Aschoff body</b> — a cardiac interstitial granuloma of lymphocytes and macrophages with scattered multinucleated giant cells.'
      + `<br><img src="${A}image-1-en.webp" alt="Acute rheumatic heart disease" style="max-width:100%;border-radius:8px;margin-top:8px">`),

    card(7,
      'Plump macrophages with abundant cytoplasm and central, slender chromatin ribbons in rheumatic carditis are called {{c1::Anitschkow cells}} (also known as {{c2::caterpillar}} cells).',
      'They are found within Aschoff bodies. The "caterpillar" name comes from the chromatin pattern.'),

    card(8,
      'Over years, what happens to Aschoff bodies — and what is the valvular consequence?',
      'They are replaced by <b>fibrous scar tissue</b>, leading to chronic <b>mitral stenosis</b> and regurgitation.'),

    /* ---- critérios de Jones ---- */
    card(9,
      'What does the JONES mnemonic stand for (major criteria of ARF)?',
      '<b>J</b>oint involvement (migratory arthritis)<br><b>O</b> = ♥ carditis<br><b>N</b>odules (subcutaneous)<br><b>E</b>rythema marginatum<br><b>S</b>ydenham chorea'),

    card(10,
      'Describe the arthritis of ARF.',
      '<b>Migratory</b> arthritis of <b>large</b> joints (knees, ankles, elbows). One joint first, others sequentially; transient, lasting days to a week per joint. Often the <b>first</b> manifestation.'),

    card(11,
      'The carditis of ARF is a {{c1::pancarditis}}, and its most common manifestation is acute {{c2::mitral valve regurgitation}} with a new holosystolic murmur.',
      'Endocardium, myocardium and epicardium are all inflamed. Altered vital signs (tachycardia, tachypnea, hypotension) and a friction rub may be present.'),

    card(12,
      'Where do the subcutaneous nodules of ARF typically occur?',
      'On the <b>extensor surface of bony prominences</b> (eg, elbow). They are small, firm and <b>painless</b>.'),

    card(13,
      'Describe erythema marginatum.',
      '<b>Nonpruritic</b>, faintly erythematous, <b>circular lesions with central clearing</b> that come and go on the trunk and extremities.'
      + `<br><img src="${A}image-2-en.webp" alt="Erythema marginatum" style="max-width:100%;border-radius:8px;margin-top:8px">`),

    card(14,
      'Which major criterion of ARF has the longest latency, and how long is it?',
      '<b>Sydenham chorea</b> — appearing <b>1-8 months</b> after the GAS pharyngitis. It is the most common <b>acquired</b> cause of chorea in children.'),

    card(15,
      'List the MINOR Jones criteria of ARF.',
      '• Fever<br>• Arthralgia<br>• Elevated inflammatory markers (CRP, ESR)<br>• <b>Prolonged PR interval</b> on ECG'),

    /* ---- diagnóstico ---- */
    card(16,
      'What is required to diagnose ARF?',
      '<b>Both</b> of:<br>1. <b>Two major</b> OR <b>one major + two minor</b> Jones criteria (indolent carditis or Sydenham chorea alone also suffices)<br>2. <b>Laboratory evidence of recent GAS infection</b>'),

    card(17,
      'Which lab test best supports recent GAS infection at the onset of ARF symptoms — throat culture or antibody titers? Why?',
      '<b>Antibody titers</b> (anti-streptolysin O, anti-DNAse B).<br>Throat culture and rapid antigen tests are <b>usually negative by then</b>, because the pharyngitis was weeks earlier.'),

    /* ---- tratamento e prevenção ---- */
    card(18,
      'What is the first-line treatment of ARF, and is it given even when the throat culture is negative?',
      'A single intramuscular dose of <b>benzathine penicillin G</b> — given <b>even if</b> rapid antigen testing and throat culture are negative, to eradicate GAS from the upper respiratory tract.'),

    card(19,
      'Secondary prevention of ARF: which drug, how often, and for how long?',
      '<b>Benzathine penicillin G</b> IM <b>every 4 weeks</b> (monthly), for <b>5 years to lifelong</b> depending on the severity and persistence of heart disease.'
      + `<br><img src="${A}table-1-en.webp" alt="Antibiotic prophylaxis for secondary prevention of rheumatic fever" style="max-width:100%;border-radius:8px;margin-top:8px">`),

    /* ---- complicação ---- */
    card(20,
      'In rheumatic heart disease, calcification affects mainly the valve {{c1::commissures}}, in contrast to age-related calcification, which affects mainly the {{c2::posterior mitral annulus}}.',
      'RHD is usually identified 10-20 years after the initial ARF episode; the greatest risk factor for chronic valvular damage is <b>carditis during ARF</b>.'
      + `<br><img src="${A}figure-2-en.webp" alt="Mitral valve calcification" style="max-width:100%;border-radius:8px;margin-top:8px">`)

  ]
};
})();
