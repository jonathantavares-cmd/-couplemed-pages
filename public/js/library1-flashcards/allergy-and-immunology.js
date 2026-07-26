/* CoupleMed — Flashcards da Library 1 › Allergy & Immunology
   ============================================================================
   REGRA (LIBRARY1_ADD_CONTENT.md §11.4): ao incluir CADA tópico na Library 1,
   criar automaticamente **30 flashcards** daquele tópico, **em inglês E em
   português**, disponíveis para todos os usuários.

   PADRÃO: "Anki melhorado" — o que a ciência da aprendizagem mostra que
   funciona, não enfeite (§11.5):

     • ATOMICIDADE (chunking)      um fato por card; card curto
     • RECALL ATIVO                a frente sempre pede uma resposta
     • CLOZE                       lacuna quando o alvo é um termo exato
     • DUAL CODING                 texto + imagem quando a imagem É o conteúdo
     • ELABORAÇÃO (`why`)          o "por quê" aparece DEPOIS da resposta
     • DISCRIMINAÇÃO (`contrast`)  cards que separam coisas confundíveis
     • APLICAÇÃO (`case`)          mini-vinheta clínica, do jeito do Step 1
     • DIFICULDADE DESEJÁVEL       `hint` opcional em vez de entregar a resposta
     • CODIFICAÇÃO SEMÂNTICA       cor/emoji com significado fixo por `kind`,
                                   nunca decoração aleatória

   Schema de cada card:
     id     — estável, prefixo L1FC- (a semeadura é idempotente por ele)
     kind   — recall | cloze | contrast | image | why | case | mnemonic
     en/pt  — { front, back, hint?, why?, pearl? }   ← bilíngue OBRIGATÓRIO
     img    — caminho da imagem do tópico (dual coding), opcional
     sys/subj/topic — taxonomia dos Flashcards (filtro); subject fora da lista → '<sys>::misc'
   ============================================================================ */
window.LIBRARY1_FLASHCARDS = window.LIBRARY1_FLASHCARDS || {};

(function(){
'use strict';
const A = '/assets/library1/allergy-and-immunology/acute-rheumatic-fever/';
const SYS   = 'allergy_immunology';
const SUBJ  = 'allergy_immunology::autoimmune_diseases';   // existe na lista → não vai para Others
const TOPIC = { en:'Acute rheumatic fever', pt:'Febre reumática aguda' };
const TAGS  = ['Library1','AcuteRheumaticFever','Step1','ARF'];
let n = 0;
const card = (kind, en, pt, extra) => Object.assign({
  id: `L1FC-ARF-${String(++n).padStart(3,'0')}`,
  kind, en, pt, tags: TAGS, sys: SYS, subj: SUBJ, topic: TOPIC
}, extra || {});

window.LIBRARY1_FLASHCARDS['allergy-and-immunology'] = {
  'acute-rheumatic-fever': [

  /* ═══════════ PATOGÊNESE ═══════════ */
  card('recall',
    { front:'Acute rheumatic fever follows an untreated infection at which site, by which organism?',
      back:'<b>Group A <i>Streptococcus</i></b> — <b>pharyngitis</b> (throat), not skin.',
      why:'GAS skin infection can cause post-streptococcal glomerulonephritis, but only pharyngitis causes ARF. Site matters.' },
    { front:'A febre reumática aguda segue uma infecção não tratada em qual sítio, por qual agente?',
      back:'<b>Streptococcus do grupo A</b> — <b>faringite</b> (garganta), não pele.',
      why:'A infecção de pele por GAS pode causar glomerulonefrite pós-estreptocócica, mas só a faringite causa ARF. O sítio importa.' }),

  card('cloze',
    { front:'ARF is a {{c1::nonsuppurative}}, {{c2::immune-mediated}} complication of untreated group A streptococcal pharyngitis.',
      back:'Nonsuppurative = no pus, no organism in the lesion.',
      why:'This is why antibiotics treat the trigger but do not "cure" the inflammation already under way.' },
    { front:'A ARF é uma complicação {{c1::não supurativa}} e {{c2::imunomediada}} da faringite estreptocócica do grupo A não tratada.',
      back:'Não supurativa = sem pus, sem o agente na lesão.',
      why:'É por isso que o antibiótico trata o gatilho, mas não "cura" a inflamação já em curso.' }),

  card('why',
    { front:'By what mechanism do anti-streptococcal antibodies damage the heart and brain in ARF?',
      back:'<b>Molecular mimicry</b> — antibodies raised against GAS antigens cross-react with host cardiac and CNS antigens.',
      hint:'The antibody cannot tell the difference between two similar-looking antigens.',
      why:'The damage is autoimmune, not infectious — which explains the 2-4 week delay and why cultures are negative by then.' },
    { front:'Por qual mecanismo os anticorpos antiestreptocócicos lesam coração e cérebro na ARF?',
      back:'<b>Mimetismo molecular</b> — anticorpos contra antígenos do GAS reagem cruzadamente com antígenos cardíacos e do SNC do hospedeiro.',
      hint:'O anticorpo não distingue dois antígenos parecidos.',
      why:'A lesão é autoimune, não infecciosa — o que explica o atraso de 2-4 semanas e por que as culturas já estão negativas.' },
    { img: A+'figure-1-en.webp', imgAlt:{ en:'Pathophysiology of acute rheumatic fever', pt:'Fisiopatologia da febre reumática aguda' } }),

  card('recall',
    { front:'Which GAS antigen drives the cross-reactivity, and which two host proteins are attacked?',
      back:'<b>M protein</b> → attacks <b>cardiac myosin</b> and <b>lysoganglioside</b> (neuronal surface, basal ganglia).',
      why:'Myosin explains the carditis; lysoganglioside in the basal ganglia explains Sydenham chorea.' },
    { front:'Qual antígeno do GAS causa a reatividade cruzada, e quais duas proteínas do hospedeiro são atacadas?',
      back:'<b>Proteína M</b> → ataca a <b>miosina cardíaca</b> e o <b>lisogangliosídeo</b> (superfície neuronal, gânglios da base).',
      why:'A miosina explica a cardite; o lisogangliosídeo nos gânglios da base explica a coreia de Sydenham.' }),

  card('recall',
    { front:'How long after the GAS pharyngitis do ARF manifestations begin?',
      back:'<b>2-4 weeks</b>.',
      why:'The pharyngitis may have been mild and self-resolving — so the patient often does not connect the two events, and neither does the unwary examinee.' },
    { front:'Quanto tempo após a faringite por GAS começam as manifestações da ARF?',
      back:'<b>2-4 semanas</b>.',
      why:'A faringite pode ter sido leve e autolimitada — então o paciente muitas vezes não liga os dois eventos, e o candidato desatento também não.' }),

  card('contrast',
    { front:'ARF vs post-streptococcal glomerulonephritis (PSGN): which one is prevented by early antibiotics?',
      back:'<b>ARF is prevented</b> by prompt antibiotic treatment.<br><b>PSGN is not</b> — antibiotics have not been shown to reduce its risk.',
      why:'High-yield discrimination: same organism, two post-infectious diseases, opposite answers about prevention.' },
    { front:'ARF × glomerulonefrite pós-estreptocócica (GNPE): qual é prevenida por antibiótico precoce?',
      back:'<b>A ARF é prevenida</b> pelo tratamento antibiótico imediato.<br><b>A GNPE não</b> — não foi demonstrado que o antibiótico reduza seu risco.',
      why:'Discriminação de alto rendimento: mesmo agente, duas doenças pós-infecciosas, respostas opostas sobre prevenção.' }),

  /* ═══════════ HISTOLOGIA ═══════════ */
  card('image',
    { front:'Which histologic lesion is pathognomonic of rheumatic carditis?',
      back:'The <b>Aschoff body</b> — an interstitial granuloma of lymphocytes and macrophages with scattered <b>multinucleated giant cells</b>.',
      why:'"Granuloma in the myocardium of a child weeks after a sore throat" is the exam signature.' },
    { front:'Qual lesão histológica é patognomônica da cardite reumática?',
      back:'O <b>corpo de Aschoff</b> — granuloma intersticial de linfócitos e macrófagos com <b>células gigantes multinucleadas</b> espalhadas.',
      why:'"Granuloma no miocárdio de uma criança semanas após dor de garganta" é a assinatura da prova.' },
    { img: A+'image-1-en.webp', imgAlt:{ en:'Acute rheumatic heart disease', pt:'Doença cardíaca reumática aguda' } }),

  card('cloze',
    { front:'Plump macrophages with abundant cytoplasm and central, slender chromatin ribbons are the {{c1::Anitschkow}} cells, also called {{c2::caterpillar}} cells.',
      back:'They sit inside Aschoff bodies.',
      why:'The "caterpillar" nickname comes from the chromatin pattern — a visual hook worth keeping.' },
    { front:'Macrófagos carnudos, com citoplasma abundante e fitas de cromatina centrais e finas, são as células de {{c1::Anitschkow}}, também chamadas células em {{c2::lagarta}}.',
      back:'Ficam dentro dos corpos de Aschoff.',
      why:'O apelido "lagarta" vem do padrão da cromatina — um gancho visual que vale guardar.' }),

  card('recall',
    { front:'Over years, what replaces the Aschoff bodies, and what is the valvular result?',
      back:'<b>Fibrous scar tissue</b> → chronic <b>mitral stenosis</b> and regurgitation.',
      why:'This is the bridge from the acute episode to rheumatic heart disease decades later.' },
    { front:'Ao longo dos anos, o que substitui os corpos de Aschoff, e qual o resultado valvular?',
      back:'<b>Tecido cicatricial fibroso</b> → <b>estenose mitral</b> crônica e regurgitação.',
      why:'É a ponte entre o episódio agudo e a doença cardíaca reumática décadas depois.' }),

  /* ═══════════ CRITÉRIOS DE JONES ═══════════ */
  card('mnemonic',
    { front:'JONES — what are the five MAJOR criteria of ARF?',
      back:'<b>J</b>oint involvement (migratory arthritis)<br><b>O</b> = ♥ carditis<br><b>N</b>odules (subcutaneous)<br><b>E</b>rythema marginatum<br><b>S</b>ydenham chorea',
      why:'The "O" is drawn as a heart on purpose — it is the criterion that determines prognosis.' },
    { front:'JONES — quais são os cinco critérios MAIORES da ARF?',
      back:'<b>J</b>oint (envolvimento articular: artrite migratória)<br><b>O</b> = ♥ cardite<br><b>N</b>ódulos (subcutâneos)<br><b>E</b>ritema marginal<br><b>S</b>ydenham (coreia)',
      why:'O "O" é desenhado como um coração de propósito — é o critério que define o prognóstico.' }),

  card('recall',
    { front:'Describe the arthritis of ARF: which joints, and what pattern?',
      back:'<b>Migratory</b> arthritis of <b>large</b> joints (knees, ankles, elbows) — one joint first, others sequentially; transient, days to a week per joint.',
      hint:'It moves.',
      why:'Often the FIRST manifestation. "Migratory" is the word that separates it from JIA, which persists in the same joints.' },
    { front:'Descreva a artrite da ARF: quais articulações e qual padrão?',
      back:'Artrite <b>migratória</b> de <b>grandes</b> articulações (joelhos, tornozelos, cotovelos) — uma primeiro, as outras em sequência; transitória, de dias a uma semana por articulação.',
      hint:'Ela muda de lugar.',
      why:'Costuma ser a PRIMEIRA manifestação. "Migratória" é a palavra que separa da artrite idiopática juvenil, que persiste nas mesmas articulações.' }),

  card('cloze',
    { front:'The carditis of ARF is a {{c1::pancarditis}}, and its most common manifestation is acute {{c2::mitral regurgitation}} with a new holosystolic murmur.',
      back:'Endocardium + myocardium + epicardium, all inflamed.',
      why:'Acute disease = regurgitation (the valve leaks). Chronic disease = stenosis (the valve scars shut). Do not mix them up.' },
    { front:'A cardite da ARF é uma {{c1::pancardite}}, e sua manifestação mais comum é a {{c2::regurgitação mitral}} aguda com novo sopro holossistólico.',
      back:'Endocárdio + miocárdio + epicárdio, todos inflamados.',
      why:'Doença aguda = regurgitação (a válvula vaza). Doença crônica = estenose (a válvula cicatriza fechada). Não confundir.' }),

  card('recall',
    { front:'Where are the subcutaneous nodules of ARF found, and are they painful?',
      back:'On the <b>extensor surface of bony prominences</b> (eg, elbow). Small, firm and <b>painless</b>.',
      why:'Painless is the discriminator — tender nodules point elsewhere.' },
    { front:'Onde ficam os nódulos subcutâneos da ARF, e são dolorosos?',
      back:'Na <b>superfície extensora de proeminências ósseas</b> (por exemplo, cotovelo). Pequenos, firmes e <b>indolores</b>.',
      why:'Indolor é o discriminador — nódulo doloroso aponta para outra coisa.' }),

  card('image',
    { front:'Describe erythema marginatum.',
      back:'<b>Nonpruritic</b>, faintly erythematous, <b>circular lesions with central clearing</b> that come and go, on trunk and extremities.',
      why:'"Come and go" matters: a transient rash that the family may report but you may not see.' },
    { front:'Descreva o eritema marginal.',
      back:'Lesões circulares, <b>não pruriginosas</b>, discretamente eritematosas, com <b>clareira central</b>, que vêm e vão, no tronco e nas extremidades.',
      why:'"Vêm e vão" importa: é uma erupção transitória que a família relata e você pode não ver.' },
    { img: A+'image-2-en.webp', imgAlt:{ en:'Erythema marginatum', pt:'Eritema marginal' } }),

  card('recall',
    { front:'Which major criterion has the longest latency after GAS pharyngitis, and how long?',
      back:'<b>Sydenham chorea</b> — <b>1-8 months</b> later. It is the most common <b>acquired</b> cause of chorea in children.',
      why:'Because of the long latency, the pharyngitis is often forgotten by the time chorea appears.' },
    { front:'Qual critério maior tem a maior latência após a faringite por GAS, e de quanto?',
      back:'<b>Coreia de Sydenham</b> — <b>1-8 meses</b> depois. É a causa <b>adquirida</b> mais comum de coreia em crianças.',
      why:'Pela latência longa, a faringite já foi esquecida quando a coreia aparece.' }),

  card('recall',
    { front:'List the four MINOR Jones criteria.',
      back:'• Fever<br>• Arthralgia<br>• Elevated inflammatory markers (CRP, ESR)<br>• <b>Prolonged PR interval</b> on ECG',
      why:'Arthralgia (pain only) is minor; arthritis (inflammation) is major. Same joint, different criterion.' },
    { front:'Liste os quatro critérios MENORES de Jones.',
      back:'• Febre<br>• Artralgia<br>• Marcadores inflamatórios elevados (PCR, VHS)<br>• <b>Intervalo PR prolongado</b> no ECG',
      why:'Artralgia (só dor) é menor; artrite (inflamação) é maior. Mesma articulação, critério diferente.' }),

  /* ═══════════ DIAGNÓSTICO ═══════════ */
  card('recall',
    { front:'What is required to diagnose ARF?',
      back:'<b>Both</b>:<br>1. <b>Two major</b> OR <b>one major + two minor</b> Jones criteria<br>2. <b>Laboratory evidence of recent GAS infection</b>',
      hint:'Two separate requirements, not one list.',
      why:'Indolent carditis or Sydenham chorea ALONE is also sufficient — the likelihood is high enough in a child.' },
    { front:'O que é necessário para diagnosticar ARF?',
      back:'<b>Ambos</b>:<br>1. <b>Dois maiores</b> OU <b>um maior + dois menores</b> critérios de Jones<br>2. <b>Evidência laboratorial de infecção recente por GAS</b>',
      hint:'São duas exigências separadas, não uma lista só.',
      why:'Cardite indolente ou coreia de Sydenham ISOLADA também bastam — a probabilidade já é alta numa criança.' }),

  card('contrast',
    { front:'At the onset of ARF symptoms: throat culture or antibody titers — which supports recent GAS infection, and why?',
      back:'<b>Antibody titers</b> (anti-streptolysin O, anti-DNAse B).<br>Culture and rapid antigen test are <b>usually negative</b> by then.',
      why:'The pharyngitis was 2-4 weeks earlier — the organism is gone, the antibodies remain. Timing decides the test.' },
    { front:'No início dos sintomas de ARF: cultura de garganta ou títulos de anticorpos — o que apoia infecção recente por GAS, e por quê?',
      back:'<b>Títulos de anticorpos</b> (antiestreptolisina O, anti-DNAse B).<br>A cultura e o teste rápido de antígeno já estão <b>geralmente negativos</b>.',
      why:'A faringite foi 2-4 semanas antes — o agente já foi, os anticorpos ficaram. O tempo decide o exame.' }),

  /* ═══════════ DIAGNÓSTICO DIFERENCIAL ═══════════ */
  card('contrast',
    { front:'ARF arthritis vs systemic juvenile idiopathic arthritis: what separates them?',
      back:'ARF → <b>transient and migratory</b>.<br>Systemic JIA → <b>persists in the affected joints for &gt;6 weeks</b>.',
      why:'Both have fever, rash and arthritis. Duration and migration are the discriminators.' },
    { front:'Artrite da ARF × artrite idiopática juvenil sistêmica: o que as separa?',
      back:'ARF → <b>transitória e migratória</b>.<br>AIJ sistêmica → <b>persiste nas articulações afetadas por &gt;6 semanas</b>.',
      why:'As duas têm febre, erupção e artrite. Duração e migração são os discriminadores.' }),

  card('contrast',
    { front:'A child has migratory arthritis and a rash. What makes it Henoch-Schönlein purpura instead of ARF?',
      back:'The rash is <b>purpuric</b>, plus <b>abdominal pain</b> and/or <b>kidney involvement</b> (hematuria).',
      why:'ARF rash blanches and clears centrally; HSP rash is palpable purpura. Look at the rash, not just the joints.' },
    { front:'Criança com artrite migratória e erupção. O que indica púrpura de Henoch-Schönlein em vez de ARF?',
      back:'A erupção é <b>purpúrica</b>, além de <b>dor abdominal</b> e/ou <b>envolvimento renal</b> (hematúria).',
      why:'A erupção da ARF empalidece e tem clareira central; a da PHS é púrpura palpável. Olhe a erupção, não só as articulações.' },
    { img: A+'image-3-en.webp', imgAlt:{ en:'Henoch-Schönlein purpura', pt:'Purpura Henoch-Schönlein' } }),

  card('contrast',
    { front:'Rash + arthritis: what points to Lyme disease rather than ARF?',
      back:'<b>Bull\'s eye lesions</b> (erythema migrans) that <b>slowly expand</b>, and arthritis that is usually <b>monoarticular</b> (eg, knee only).',
      why:'ARF migrates between joints; Lyme tends to stay in one. And the rash expands instead of coming and going.' },
    { front:'Erupção + artrite: o que aponta para doença de Lyme em vez de ARF?',
      back:'Lesões <b>em alvo</b> (eritema migrans) que <b>se expandem lentamente</b>, e artrite geralmente <b>monoarticular</b> (por exemplo, só o joelho).',
      why:'A ARF migra entre articulações; a Lyme tende a ficar em uma. E a erupção se expande, em vez de vir e ir.' },
    { img: A+'image-4-en.webp', imgAlt:{ en:'Erythema migrans', pt:'Eritema migrans' } }),

  card('contrast',
    { front:'Symmetric arthritis of SMALL joints in a child with a facial rash — ARF or parvovirus B19?',
      back:'<b>Parvovirus B19</b> — acute, <b>symmetric</b>, <b>small</b> joints (hands), with or without the "slapped-cheek" rash.<br><b>Large joint arthritis and chorea are NOT seen.</b>',
      why:'ARF is large joints and migratory. Small + symmetric moves you off ARF entirely.' },
    { front:'Artrite simétrica de PEQUENAS articulações numa criança com erupção facial — ARF ou parvovírus B19?',
      back:'<b>Parvovírus B19</b> — aguda, <b>simétrica</b>, <b>pequenas</b> articulações (mãos), com ou sem a erupção em "bochecha esbofeteada".<br><b>Artrite de grandes articulações e coreia NÃO ocorrem.</b>',
      why:'A ARF é de grandes articulações e migratória. Pequenas + simétrica tira a ARF da mesa.' },
    { img: A+'image-5-en.webp', imgAlt:{ en:'Erythema infectiosum (fifth disease)', pt:'Eritema infeccioso (cinta doença)' } }),

  card('contrast',
    { front:'Fever + new murmur + heart failure in a child: what favours infective endocarditis over ARF?',
      back:'<b>No migratory arthritis</b>, and most children have a <b>historical risk factor</b> (eg, congenital heart disease).',
      why:'Both give fever and a new murmur. The joints and the past history break the tie.' },
    { front:'Febre + novo sopro + insuficiência cardíaca numa criança: o que favorece endocardite infecciosa em vez de ARF?',
      back:'<b>Ausência de artrite migratória</b>, e a maioria das crianças tem <b>fator de risco prévio</b> (por exemplo, cardiopatia congênita).',
      why:'As duas dão febre e novo sopro. As articulações e a história prévia desempatam.' }),

  /* ═══════════ TRATAMENTO ═══════════ */
  card('case',
    { front:'A 9-year-old has migratory arthritis, a new holosystolic murmur and fever. Rapid strep test and throat culture are NEGATIVE. What is the first-line treatment?',
      back:'A single IM dose of <b>benzathine penicillin G</b> — given <b>even with negative tests</b>, to eradicate GAS from the upper respiratory tract.',
      hint:'Do the negative tests change your action?',
      why:'The classic trap: negative culture does not withhold treatment, because by now the organism is expected to be gone.' },
    { front:'Menina de 9 anos com artrite migratória, novo sopro holossistólico e febre. Teste rápido e cultura de garganta NEGATIVOS. Qual o tratamento de primeira linha?',
      back:'Dose única IM de <b>penicilina G benzatina</b> — administrada <b>mesmo com exames negativos</b>, para erradicar o GAS do trato respiratório superior.',
      hint:'Os exames negativos mudam sua conduta?',
      why:'A pegadinha clássica: cultura negativa não suspende o tratamento, porque a essa altura já se espera que o agente tenha desaparecido.' }),

  card('image',
    { front:'Secondary prophylaxis of ARF: which drug, how often, and for how long?',
      back:'<b>Benzathine penicillin G</b> IM <b>every 4 weeks</b>, from <b>5 years to lifelong</b> depending on severity and persistence of heart disease.',
      why:'Duration is driven by the heart: no valve disease → shorter; carditis with valve disease → up to age 40 or lifelong.' },
    { front:'Profilaxia secundária da ARF: qual fármaco, com que frequência e por quanto tempo?',
      back:'<b>Penicilina G benzatina</b> IM <b>a cada 4 semanas</b>, de <b>5 anos a vitalícia</b>, conforme a gravidade e persistência da doença cardíaca.',
      why:'A duração é ditada pelo coração: sem doença valvular → menor; cardite com doença valvular → até os 40 anos ou vitalícia.' },
    { img: A+'table-1-en.webp', imgAlt:{ en:'Antibiotic prophylaxis for secondary prevention of rheumatic fever', pt:'Profilaxia antibiótica para prevenção secundária de febre reumática' } }),

  card('why',
    { front:'Why must a patient with previous ARF receive prophylaxis for years, rather than being treated again if it recurs?',
      back:'Each new GAS pharyngitis carries a <b>high risk of recurrence and progression of rheumatic heart disease</b> — damage is cumulative and permanent.',
      why:'You are not preventing a sore throat; you are preventing the next layer of valve scarring.' },
    { front:'Por que um paciente com ARF prévia precisa de profilaxia por anos, em vez de ser tratado de novo se recorrer?',
      back:'Cada nova faringite por GAS traz <b>alto risco de recorrência e progressão da doença cardíaca reumática</b> — o dano é cumulativo e permanente.',
      why:'Não se está prevenindo uma dor de garganta; está-se prevenindo a próxima camada de cicatriz valvular.' }),

  /* ═══════════ PREVENÇÃO PRIMÁRIA E COMPLICAÇÕES ═══════════ */
  card('recall',
    { front:'Primary prevention of ARF: treatment of choice for streptococcal pharyngitis, and the options if penicillin-allergic?',
      back:'<b>Oral penicillin V for 10 days</b> (alternative: 10-day amoxicillin).<br>Mild reaction → <b>cephalosporins</b>; severe, IgE-mediated → <b>macrolides</b>.',
      why:'Ten days is not negotiable — shorter courses fail to eradicate and leave the ARF risk standing.' },
    { front:'Prevenção primária da ARF: tratamento de escolha da faringite estreptocócica e as opções em caso de alergia à penicilina?',
      back:'<b>Penicilina V oral por 10 dias</b> (alternativa: amoxicilina por 10 dias).<br>Reação leve → <b>cefalosporinas</b>; grave, mediada por IgE → <b>macrolídeos</b>.',
      why:'Os 10 dias não são negociáveis — cursos mais curtos não erradicam e mantêm o risco de ARF.' }),

  card('recall',
    { front:'Rheumatic heart disease: which valve is most affected, and what happens to it?',
      back:'The <b>mitral valve</b> — it gradually <b>thickens, fibroses and calcifies</b>, causing heart failure (dyspnea) and, less commonly, cardioembolic stroke.',
      why:'Management ends up mechanical: valvotomy or more invasive surgery.' },
    { front:'Doença cardíaca reumática: qual válvula é mais afetada, e o que acontece com ela?',
      back:'A <b>válvula mitral</b> — <b>espessa, fibrosa e calcifica</b> gradualmente, causando insuficiência cardíaca (dispneia) e, menos comumente, AVC cardioembólico.',
      why:'A conduta acaba mecânica: valvotomia ou cirurgia mais invasiva.' }),

  card('image',
    { front:'Mitral calcification: rheumatic vs age-related — where does each one sit?',
      back:'Rheumatic → the valve <b>commissures</b> (annulus less involved).<br>Age-related → the <b>posterior mitral annulus</b>.',
      why:'A single anatomical detail separates a preventable post-infectious disease from ordinary degeneration.' },
    { front:'Calcificação mitral: reumática × relacionada à idade — onde fica cada uma?',
      back:'Reumática → nas <b>comissuras</b> valvares (anel menos envolvido).<br>Relacionada à idade → no <b>anel mitral posterior</b>.',
      why:'Um único detalhe anatômico separa uma doença pós-infecciosa prevenível de uma degeneração comum.' },
    { img: A+'figure-2-en.webp', imgAlt:{ en:'Mitral valve calcification', pt:'Calcificação da válvula mitral' } }),

  card('case',
    { front:'A 28-year-old from a resource-limited region has dyspnea and a diastolic murmur. Echo shows mitral stenosis with commissural calcification. No history of "rheumatic fever". Is ARF still the cause?',
      back:'<b>Yes.</b> Many patients have morphologic evidence of RHD <b>without a previous ARF diagnosis</b> — missed diagnosis or mild initial disease.',
      hint:'Does the absence of a diagnosis mean absence of the disease?',
      why:'Commissural calcification is the fingerprint. Absence of the label is not absence of the episode.' },
    { front:'Paciente de 28 anos de região com poucos recursos, com dispneia e sopro diastólico. Eco mostra estenose mitral com calcificação comissural. Sem história de "febre reumática". A ARF ainda é a causa?',
      back:'<b>Sim.</b> Muitos pacientes têm evidência morfológica de DCR <b>sem diagnóstico prévio de ARF</b> — diagnóstico não feito ou doença inicial leve.',
      hint:'A ausência do diagnóstico significa ausência da doença?',
      why:'A calcificação comissural é a impressão digital. Ausência do rótulo não é ausência do episódio.' }),

  ]
};
})();
