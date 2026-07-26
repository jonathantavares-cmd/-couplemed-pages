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

/* ════════════════════════════════════════════════════════════════════════════
   TÓPICO 2 — Allergic/irritant contact dermatitis
   Dermatite de contato alérgica/irritativa                  (2026-07-26)

   30 cards bilíngues, mesma regra da §11.4. Distribuição:
     12 recall · 7 contrast · 4 image · 3 cloze · 2 why · 2 case
   Sem card `mnemonic`: o material deste tópico NÃO traz mnemônico, e §1
   proíbe inventar conteúdo que não está no artigo — o card virou recall.
   IIFE própria: as constantes do tópico anterior não valem aqui.
   ════════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const A = '/assets/library1/allergy-and-immunology/allergic-irritant-contact-dermatitis/';
const SYS   = 'allergy_immunology';
const SUBJ  = 'allergy_immunology::principles_immunology';   // hipersensibilidade tipo IV
const TOPIC = { en:'Allergic/irritant contact dermatitis', pt:'Dermatite de contato alérgica/irritativa' };
const TAGS  = ['Library1','ContactDermatitis','Step1','ACD','ICD'];
let n = 0;
const card = (kind, en, pt, extra) => Object.assign({
  id: `L1FC-AICD-${String(++n).padStart(3,'0')}`,
  kind, en, pt, tags: TAGS, sys: SYS, subj: SUBJ, topic: TOPIC
}, extra || {});

window.LIBRARY1_FLASHCARDS['allergy-and-immunology']['allergic-irritant-contact-dermatitis'] = [

  /* ═══════════ MECANISMO ═══════════ */
  card('recall',
    { front:'Contact dermatitis has 2 forms. Name them and the mechanism of each.',
      back:'<b>Irritant (ICD)</b> — an irritant <b>disrupts the skin barrier</b>, causing nonspecific inflammation.<br><b>Allergic (ACD)</b> — an allergen causes a <b>type IV (delayed-type) hypersensitivity</b> reaction.',
      why:'The two overlap clinically and are virtually indistinguishable histologically, so the mechanism — not the rash — is what separates them on the exam.' },
    { front:'A dermatite de contato tem 2 formas. Cite-as e o mecanismo de cada uma.',
      back:'<b>Irritante (CDI)</b> — um irritante <b>rompe a barreira da pele</b>, causando inflamação inespecífica.<br><b>Alérgica (ACD)</b> — um alérgeno causa uma reação de <b>hipersensibilidade do tipo IV (tipo retardado)</b>.',
      why:'As duas se sobrepõem clinicamente e são praticamente indistinguíveis na histologia, então é o mecanismo — não a erupção — que as separa na prova.' }),

  card('cloze',
    { front:'ACD is a type {{c1::IV}} (delayed-type) hypersensitivity reaction that occurs in {{c2::2}} distinct phases: {{c3::sensitization}} and {{c4::elicitation}}.',
      back:'Type IV · 2 phases · sensitization then elicitation.',
      why:'Every question about timing (10-14 days vs 2-3 days) hangs on knowing which phase is being described.' },
    { front:'A ACD é uma reação de hipersensibilidade do tipo {{c1::IV}} (tipo retardado) que ocorre em {{c2::2}} fases distintas: {{c3::sensibilização}} e {{c4::elicitação}}.',
      back:'Tipo IV · 2 fases · sensibilização e depois elicitação.',
      why:'Toda questão sobre tempo (10-14 dias vs 2-3 dias) depende de saber qual fase está sendo descrita.' }),

  card('recall',
    { front:'How long does the sensitization phase of ACD take, and does it produce a rash?',
      back:'<b>10-14 days</b> — and it produces <b>no cutaneous lesions</b>.',
      hint:'Think about what is happening in the lymph node, not in the skin.',
      why:'This is why a patient can be exposed and stay asymptomatic: the first encounter only builds the hapten-specific T-cell clone.' },
    { front:'Quanto tempo leva a fase de sensibilização da ACD, e ela produz erupção?',
      back:'<b>10-14 dias</b> — e <b>não produz lesões cutâneas</b>.',
      hint:'Pense no que acontece no linfonodo, não na pele.',
      why:'É por isso que o paciente pode ser exposto e ficar assintomático: o primeiro contato apenas constrói o clone de células T específicas do hapteno.' }),

  card('recall',
    { front:'After reexposure to a sensitized allergen, when do the lesions of acute ACD appear?',
      back:'<b>24-72 hours</b> (range <b>4-96 hr</b>); the elicitation phase typically occurs within <b>2-3 days</b>.',
      why:'The delay is the fingerprint of type IV. A reaction in minutes is type I (mast cells/IgE), not ACD.' },
    { front:'Após a reexposição a um alérgeno já sensibilizado, quando aparecem as lesões da ACD aguda?',
      back:'<b>24-72 horas</b> (variando de <b>4 a 96 horas</b>); a fase de elicitação normalmente ocorre em <b>2-3 dias</b>.',
      why:'O atraso é a impressão digital do tipo IV. Reação em minutos é tipo I (mastócitos/IgE), não ACD.' }),

  card('recall',
    { front:'Which cutaneous cell takes up the hapten in ACD, and on which molecules does it present it?',
      back:'The cutaneous dendritic (<b>Langerhans</b>) cell — presenting the hapten on <b>MHC-I and MHC-II</b> as hapten-conjugated peptides, then travelling to the draining lymph nodes.',
      why:'Presenting on both MHC classes is why <i>both</i> CD4+ and CD8+ T cells get activated and clonally expanded.' },
    { front:'Qual célula cutânea capta o hapteno na ACD e em quais moléculas o apresenta?',
      back:'A célula dendrítica cutânea (de <b>Langerhans</b>) — apresentando o hapteno em <b>MHC-I e MHC-II</b> como peptídeos conjugados com hapteno, e então viajando para os linfonodos drenantes.',
      why:'Apresentar nas duas classes de MHC é o motivo de <i>ambas</i> as células T CD4+ e CD8+ serem ativadas e expandidas clonalmente.' }),

  card('recall',
    { front:'In urushiol-induced contact dermatitis (poison ivy), which cell is the primary effector and what does it do?',
      back:'<b>CD8+ T cells</b> — they <b>directly destroy keratinocytes</b> expressing haptenated proteins.',
      hint:'Direct killing or indirect, via macrophages?',
      why:'Contact dermatitis can be CD8+-driven (direct) or CD4+ Th1-driven (indirect, by activating macrophages); poison ivy is the CD8+ example.' },
    { front:'Na dermatite de contato induzida por urushiol (hera venenosa), qual célula é a efetora primária e o que ela faz?',
      back:'As <b>células T CD8+</b> — elas <b>destroem diretamente os queratinócitos</b> que expressam proteínas haptenadas.',
      hint:'Morte direta ou indireta, via macrófagos?',
      why:'A dermatite de contato pode ser conduzida por CD8+ (direta) ou por Th1 CD4+ (indireta, ativando macrófagos); a hera venenosa é o exemplo de CD8+.' }),

  card('why',
    { front:'Why can ICD appear on the very first exposure, while ACD cannot?',
      back:'ICD is a <b>nonspecific</b> inflammatory response to barrier damage — no immune memory needed. ACD requires a prior <b>sensitization</b> phase (10-14 days) to create hapten-specific T cells.',
      why:'The exception that proves the rule: a highly antigenic antigen (eg, urushiol) can sensitize and then elicit after a single first exposure.' },
    { front:'Por que a CDI pode aparecer já na primeira exposição, e a ACD não?',
      back:'A CDI é uma resposta inflamatória <b>inespecífica</b> ao dano de barreira — não precisa de memória imune. A ACD exige uma fase prévia de <b>sensibilização</b> (10-14 dias) para criar células T específicas do hapteno.',
      why:'A exceção que confirma a regra: um antígeno altamente antigênico (por exemplo, urushiol) pode sensibilizar e depois elicitar após uma única primeira exposição.' }),

  card('image',
    { front:'This figure shows the 2 phases of urushiol-induced contact dermatitis. What happens in each?',
      back:'<b>Sensitization</b>: Langerhans cells take up urushiol and transport the hapten to the lymph node, activating hapten-specific CD4+ (Th1) and CD8+ T cells.<br><b>Elicitation</b>: on reexposure, CD8+ T cell-induced keratinocyte apoptosis and release of inflammatory mediators.',
      why:'Seeing where the hapten goes (skin → node → back to skin) fixes the sequence better than memorizing the phase names.' },
    { front:'Esta figura mostra as 2 fases da dermatite de contato induzida por urushiol. O que acontece em cada uma?',
      back:'<b>Sensibilização</b>: as células de Langerhans captam o urushiol e transportam o hapteno ao linfonodo, ativando células T CD4+ (Th1) e CD8+ específicas do hapteno.<br><b>Elicitação</b>: na reexposição, apoptose de queratinócitos induzida por células T CD8+ e liberação de mediadores inflamatórios.',
      why:'Ver para onde o hapteno vai (pele → linfonodo → volta à pele) fixa a sequência melhor que decorar o nome das fases.' },
    { img: A+'figure-1-en.webp',
      imgAlt:{ en:'Urushiol-induced contact dermatitis', pt:'Dermatite de contato induzida por Urushiol' } }),

  /* ═══════════ ALÉRGENOS E APRESENTAÇÃO ═══════════ */
  card('recall',
    { front:'Name the common allergens that cause ACD.',
      back:'<b>Nickel</b> (jewelry, belt buckles), <b>fragrances</b>, <b>preservatives</b> (cosmetics, skin care products), <b>topical medications</b>, <b>dyes</b>, <b>latex</b>, <b>rubber</b>, <b>formaldehyde</b> (artificial nails), and <b>urushiol</b> (poison ivy, oak, sumac).',
      why:'The vignette rarely says "allergen": it says watch, belt buckle, hair dye, artificial nails, or a walk in the woods.' },
    { front:'Cite os alérgenos comuns que causam ACD.',
      back:'<b>Níquel</b> (joias, fivelas de cinto), <b>fragrâncias</b>, <b>conservantes</b> (cosméticos, produtos para a pele), <b>medicamentos tópicos</b>, <b>corantes</b>, <b>látex</b>, <b>borracha</b>, <b>formaldeído</b> (unhas artificiais) e <b>urushiol</b> (hera venenosa, carvalho e sumagre venenosos).',
      why:'A vinheta raramente diz "alérgeno": ela diz relógio, fivela de cinto, tintura de cabelo, unhas artificiais ou uma caminhada no bosque.' }),

  card('recall',
    { front:'Nickel-induced ACD causes symptoms at which characteristic locations?',
      back:'<b>Medial beltline</b> (belt buckles), <b>wrists</b> (watches, bracelets), <b>earlobes</b> (earrings), and <b>perioral areas</b> (musical instruments).',
      why:'Distribution is the diagnosis here: the rash maps the metal, not the immune system.' },
    { front:'A ACD induzida por níquel causa sintomas em quais locais característicos?',
      back:'<b>Linha do cinto medial</b> (fivelas), <b>pulsos</b> (relógios, pulseiras), <b>lóbulos das orelhas</b> (brincos) e <b>áreas periorais</b> (instrumentos musicais).',
      why:'Aqui a distribuição é o diagnóstico: a erupção mapeia o metal, não o sistema imune.' }),

  card('why',
    { front:'Why does a nickel watch cause dermatitis, mechanistically?',
      back:'<b>Corrosion of the metal alloy by electrolytes in sweat</b> releases <b>soluble metal ions</b>, which trigger the hypersensitivity reaction.',
      hint:'What has to happen to solid metal before the immune system can see it?',
      why:'Solid nickel is inert to the immune system — it is the dissolved ion acting as a hapten that gets presented.' },
    { front:'Mecanisticamente, por que um relógio de níquel causa dermatite?',
      back:'A <b>corrosão da liga metálica por eletrólitos do suor</b> libera <b>íons metálicos solúveis</b>, que desencadeiam a reação de hipersensibilidade.',
      hint:'O que precisa acontecer com o metal sólido antes de o sistema imune conseguir vê-lo?',
      why:'O níquel sólido é inerte para o sistema imune — é o íon dissolvido, agindo como hapteno, que é apresentado.' }),

  card('contrast',
    { front:'Acute vs chronic ICD: what exposure causes each, and how does each look?',
      back:'<b>Acute</b>: a <b>single</b> exposure to a <b>strong</b> irritant (eg, bleach) → burning or painful erythema, edema, vesicles, bullae.<br><b>Chronic</b>: <b>repeated</b> exposure to a <b>mild</b> irritant (eg, water, detergent) over weeks to months → scaling, lichenification, fissuring, most commonly on the <b>hands</b>.',
      why:'One strong hit blisters; many weak hits thicken. The occupational history tells you which.' },
    { front:'CDI aguda vs crônica: qual exposição causa cada uma e como cada uma se apresenta?',
      back:'<b>Aguda</b>: exposição <b>única</b> a um irritante <b>forte</b> (por exemplo, alvejante) → eritema ardente ou doloroso, edema, vesículas, bolhas.<br><b>Crônica</b>: exposição <b>repetida</b> a um irritante <b>leve</b> (por exemplo, água, detergente) por semanas a meses → descamação, liquenificação, fissura, mais comumente nas <b>mãos</b>.',
      why:'Um golpe forte forma bolha; muitos golpes leves espessam. A história ocupacional diz qual é.' }),

  card('contrast',
    { front:'Acute vs chronic ACD: which lesions distinguish them?',
      back:'<b>Acute</b>: intensely pruritic, erythematous, <b>indurated plaques with vesicles</b>, bullae, mild scaling.<br><b>Chronic</b>: pruritus, <b>lichenification and fissuring</b> — the vesicles and bullae are <b>typically not seen</b>.',
      why:'"No vesicles" does not rule out ACD — it points to the chronic form.' },
    { front:'ACD aguda vs crônica: quais lesões as distinguem?',
      back:'<b>Aguda</b>: placas intensamente pruriginosas, eritematosas e <b>endurecidas, com vesículas</b>, bolhas e descamação leve.<br><b>Crônica</b>: prurido, <b>liquenificação e fissura</b> — as vesículas e bolhas <b>normalmente não são vistas</b>.',
      why:'"Sem vesículas" não exclui ACD — aponta para a forma crônica.' }),

  card('image',
    { front:'This is the hallmark histologic finding of acute contact dermatitis. Name it and describe what is happening.',
      back:'<b>Spongiosis</b> — dermal edema from leaky vessels seeps into the <b>epidermal intercellular spaces</b>, pulling apart the desmosomes and sometimes forming <b>intraepidermal vesicles</b>. Epidermal thickness is <b>normal</b>.',
      why:'Widened space between keratinocytes with stretched intercellular bridges is the microscopic version of the clinical vesicle.' },
    { front:'Este é o achado histológico marcante da dermatite de contato aguda. Nomeie-o e descreva o que está acontecendo.',
      back:'<b>Espongiose</b> — o edema dérmico de vasos permeáveis infiltra-se nos <b>espaços intercelulares epidérmicos</b>, separando os desmossomos e às vezes formando <b>vesículas intraepidérmicas</b>. A espessura da epiderme é <b>normal</b>.',
      why:'O espaço alargado entre queratinócitos com pontes intercelulares esticadas é a versão microscópica da vesícula clínica.' },
    { img: A+'image-7-en.webp',
      imgAlt:{ en:'Spongiosis', pt:'Espongiose' } }),

  card('recall',
    { front:'With chronic antigen or irritant exposure, which 3 histologic features become prominent?',
      back:'<b>Acanthosis</b> (epidermal thickening), <b>hyperkeratosis</b> (stratum corneum thickening), and <b>hypergranulosis</b> (stratum granulosum thickening) — while spongiosis and the inflammatory infiltrate become <b>minimal</b>.',
      hint:'Chronic = thick, not wet.',
      why:'Acute is edema; chronic is thickening. Same disease, opposite microscopic emphasis.' },
    { front:'Com exposição crônica a antígeno ou irritante, quais 3 achados histológicos tornam-se proeminentes?',
      back:'<b>Acantose</b> (espessamento epidérmico), <b>hiperqueratose</b> (espessamento do estrato córneo) e <b>hipergranulose</b> (espessamento do estrato granuloso) — enquanto a espongiose e o infiltrado inflamatório tornam-se <b>mínimos</b>.',
      hint:'Crônico = espesso, não úmido.',
      why:'Agudo é edema; crônico é espessamento. Mesma doença, ênfase microscópica oposta.' }),

  card('recall',
    { front:'ICD and ACD are diagnosed how? Name the 3 diagnostic aspects that matter.',
      back:'<b>Clinically</b>, by history and physical: (1) <b>distribution</b> of the rash reflecting contact areas; (2) <b>resolution</b> on withdrawal and <b>recurrence</b> on reexposure; (3) the <b>temporal relationship</b> — 2-3 day delay for ACD, immediate eruption after a strong irritant for ICD.',
      why:'A rash in a noncontact area should raise suspicion for an alternate diagnosis — distribution is the first filter.' },
    { front:'Como se diagnosticam a CDI e a ACD? Cite os 3 aspectos diagnósticos que importam.',
      back:'<b>Clinicamente</b>, por história e exame físico: (1) <b>distribuição</b> da erupção refletindo as áreas de contato; (2) <b>resolução</b> na retirada e <b>recorrência</b> na reexposição; (3) a <b>relação temporal</b> — atraso de 2-3 dias na ACD, erupção imediata após irritante forte na CDI.',
      why:'Uma erupção em área sem contato deve levantar suspeita de diagnóstico alternativo — a distribuição é o primeiro filtro.' }),

  card('image',
    { front:'What test is shown, and when is the skin read after the patches are removed?',
      back:'<b>Patch testing</b> — the skin is examined for <b>erythema and vesicles 48 hours after patch removal</b>, because ACD is a delayed-type reaction. The associated compound is then identified as the allergen and should be avoided.',
      why:'Reading it immediately would miss the reaction entirely: the whole point of "delayed-type" is that the T cells need time.' },
    { front:'Qual exame está mostrado, e quando a pele é avaliada após a remoção dos adesivos?',
      back:'<b>Teste de contato (patch testing)</b> — a pele é examinada quanto a <b>eritema e vesículas 48 horas após a remoção do adesivo</b>, porque a ACD é uma reação do tipo retardado. O composto associado é então identificado como o alérgeno e deve ser evitado.',
      why:'Ler imediatamente perderia a reação por completo: o sentido de "tipo retardado" é que as células T precisam de tempo.' },
    { img: A+'image-9-en.webp',
      imgAlt:{ en:'Patch testing', pt:'Teste de patch' } }),

  card('contrast',
    { front:'ACD/ICD vs <b>atopic dermatitis</b>: what distinguishes them?',
      back:'Atopic dermatitis has a characteristic <b>bilateral flexural distribution</b> in adults (antecubital and popliteal fossae) with <b>no allergen/irritant exposure</b>, plus a <b>family history of atopic dermatitis or personal history of atopy</b> (allergic rhinitis, asthma). It is caused by immune dysregulation and genetic barrier dysfunction (eg, <b>filaggrin mutation</b>).',
      why:'The eczematous rash itself can be indistinguishable — the distribution and the atopic history do the work.' },
    { front:'ACD/CDI vs <b>dermatite atópica</b>: o que as distingue?',
      back:'A dermatite atópica tem <b>distribuição flexural bilateral</b> característica em adultos (fossas antecubitais e poplíteas), <b>sem exposição a alérgeno/irritante</b>, além de <b>história familiar de dermatite atópica ou pessoal de atopia</b> (rinite alérgica, asma). É causada por desregulação imune e disfunção genética de barreira (por exemplo, <b>mutação da filagrina</b>).',
      why:'A erupção eczematosa em si pode ser indistinguível — a distribuição e a história atópica é que resolvem.' }),

  card('contrast',
    { front:'ACD/ICD vs <b>psoriasis</b>: which findings settle it?',
      back:'Psoriasis: mildly pruritic erythematous plaques with <b>thick, silvery scales</b> on <b>bilateral extensor</b> surfaces (elbows, knees) — where contact is unlikely. <b>Nail changes</b> (pitting, onycholysis, oil spots) and <b>psoriatic arthritis</b> can coexist with psoriasis but <b>not</b> with ACD or ICD.',
      why:'Silvery scales are never seen in ACD/ICD, and the nails/joints give you a second, independent clue.' },
    { front:'ACD/CDI vs <b>psoríase</b>: quais achados resolvem?',
      back:'Psoríase: placas eritematosas levemente pruriginosas com <b>escamas espessas e prateadas</b> em superfícies <b>extensoras bilaterais</b> (cotovelos, joelhos) — onde o contato é improvável. <b>Alterações nas unhas</b> (pitting, onicólise, manchas de óleo) e <b>artrite psoriática</b> podem coexistir com psoríase, mas <b>não</b> com ACD ou CDI.',
      why:'Escamas prateadas nunca são vistas na ACD/CDI, e as unhas/articulações dão uma segunda pista independente.' }),

  card('contrast',
    { front:'ACD/ICD vs <b>seborrheic dermatitis</b>: scale, site, and what is absent?',
      back:'Seborrheic dermatitis: erythematous patches/plaques with <b>greasy scales</b> in <b>oily areas</b> — scalp (dandruff) and central face (eyebrows, nose, nasolabial folds). <b>Vesicles, bullae, and skin edema are not present</b>.',
      why:'Greasy vs silvery vs vesicular: the quality of the surface change is a cheap and reliable discriminator.' },
    { front:'ACD/CDI vs <b>dermatite seborreica</b>: escama, sítio e o que está ausente?',
      back:'Dermatite seborreica: manchas/placas eritematosas com <b>escamas gordurosas</b> em <b>áreas oleosas</b> — couro cabeludo (caspa) e face central (sobrancelhas, nariz, dobras nasolabiais). <b>Vesículas, bolhas e edema cutâneo não estão presentes</b>.',
      why:'Gordurosa vs prateada vs vesicular: a qualidade da alteração de superfície é um discriminador barato e confiável.' }),

  card('contrast',
    { front:'ACD/ICD vs <b>tinea corporis</b>: morphology and confirmatory test?',
      back:'Tinea corporis: <b>scaly, erythematous, annular</b> patches or plaques — a morphology <b>inconsistent</b> with ACD and ICD. Confirmed by a <b>potassium hydroxide (KOH) skin test showing fungal hyphae</b>.',
      why:'Annular with an advancing edge is a fungus until KOH says otherwise; contact dermatitis follows contact, not a ring.' },
    { front:'ACD/CDI vs <b>tinea corporis</b>: morfologia e teste confirmatório?',
      back:'Tinea corporis: manchas ou placas <b>escamosas, eritematosas e anulares</b> — morfologia <b>inconsistente</b> com ACD e CDI. Confirmada por <b>teste cutâneo de hidróxido de potássio (KOH) mostrando hifas fúngicas</b>.',
      why:'Anular com borda em avanço é fungo até o KOH dizer o contrário; a dermatite de contato segue o contato, não um anel.' }),

  /* ═══════════ TRATAMENTO ═══════════ */
  card('recall',
    { front:'Beyond avoidance, what are the first management steps in ICD?',
      back:'<b>Gloves and barrier creams</b> when the irritant cannot be avoided; <b>emollients and moisturizers multiple times a day</b> to restore the skin barrier; and <b>topical corticosteroid therapy</b> to reduce inflammation.',
      why:'ICD is a barrier disease first — restoring the barrier is treatment, not comfort care.' },
    { front:'Além da evitação, quais são os primeiros passos do tratamento na CDI?',
      back:'<b>Luvas e cremes de barreira</b> quando o irritante não pode ser evitado; <b>emolientes e hidratantes várias vezes ao dia</b> para restaurar a barreira; e <b>terapia tópica com corticosteroides</b> para reduzir a inflamação.',
      why:'A CDI é antes de tudo uma doença de barreira — restaurar a barreira é tratamento, não conforto.' }),

  card('cloze',
    { front:'Topical corticosteroid potency: {{c1::high}}-potency for areas with <b>thicker</b> skin (hands, feet) or severe dermatitis; {{c2::low- or medium}}-potency for areas with <b>thinner</b> skin (face, eyelids, flexural areas) or mild dermatitis.',
      back:'Thick skin → high potency. Thin skin → low/medium potency.',
      why:'Potency is chosen by skin thickness and severity, because thin skin is where atrophy and hypopigmentation happen.' },
    { front:'Potência do corticosteroide tópico: potência {{c1::alta}} para áreas de pele <b>mais espessa</b> (mãos, pés) ou dermatite grave; potência {{c2::baixa ou média}} para áreas de pele <b>mais fina</b> (rosto, pálpebras, áreas flexurais) ou dermatite leve.',
      back:'Pele espessa → alta potência. Pele fina → baixa/média potência.',
      why:'A potência é escolhida pela espessura da pele e pela gravidade, porque é na pele fina que ocorrem atrofia e hipopigmentação.' }),

  card('cloze',
    { front:'In ACD, topical corticosteroid is used when the rash covers {{c1::&lt;20%}} of total body surface area, for no longer than {{c2::2-4 weeks}}; systemic (oral) corticosteroid is indicated when it covers {{c3::&gt;20%}} of BSA and is usually given for {{c4::2-3 weeks}}.',
      back:'&lt;20% BSA → topical, ≤2-4 weeks. &gt;20% BSA → systemic, 2-3 weeks.',
      why:'The topical ceiling exists to prevent skin atrophy and hypopigmentation; the systemic course length exists to prevent rebound dermatitis.' },
    { front:'Na ACD, o corticosteroide tópico é usado quando a erupção cobre {{c1::&lt;20%}} da área de superfície corporal total, por não mais de {{c2::2-4 semanas}}; o corticosteroide sistêmico (oral) é indicado quando cobre {{c3::&gt;20%}} da ASC e é geralmente dado por {{c4::2-3 semanas}}.',
      back:'&lt;20% ASC → tópico, ≤2-4 semanas. &gt;20% ASC → sistêmico, 2-3 semanas.',
      why:'O teto do tópico existe para prevenir atrofia e hipopigmentação; a duração do sistêmico existe para prevenir dermatite de rebote.' }),

  card('contrast',
    { front:'Topical <b>tacrolimus</b> vs topical <b>corticosteroid</b> in ACD: when and why choose tacrolimus?',
      back:'Tacrolimus is a <b>calcineurin inhibitor</b> reserved for ACD of the <b>face and intertriginous areas</b> when <b>extended therapy (&gt;2 weeks)</b> is needed. Unlike steroids it causes <b>no skin atrophy or hypopigmentation</b> even with extended use, and its onset is <b>shorter</b>; but it is <b>more expensive</b>.',
      why:'The whole reason it exists in this algorithm is the site + duration combination that steroids handle badly.' },
    { front:'<b>Tacrolimus</b> tópico vs <b>corticosteroide</b> tópico na ACD: quando e por que escolher o tacrolimus?',
      back:'O tacrolimus é um <b>inibidor da calcineurina</b> reservado para ACD de <b>face e áreas intertriginosas</b> quando é necessária <b>terapia prolongada (&gt;2 semanas)</b>. Ao contrário dos corticoides, <b>não causa atrofia cutânea nem hipopigmentação</b> mesmo com uso prolongado, e seu início de ação é <b>mais curto</b>; porém é <b>mais caro</b>.',
      why:'A razão de ele existir neste algoritmo é justamente a combinação sítio + duração que os corticoides toleram mal.' }),

  card('recall',
    { front:'After contact with poison ivy, what 2 steps reduce post-exposure spread?',
      back:'<b>Remove contaminated clothing</b> and <b>wash the area of contact with soap and water</b>, to prevent secondary spread of the allergen (eg, through scratching).',
      why:'The allergen is still on the skin and the clothes: the rash can keep appearing in new places without any new plant.' },
    { front:'Após contato com hera venenosa, quais 2 medidas reduzem a propagação pós-exposição?',
      back:'<b>Remover a roupa contaminada</b> e <b>lavar a área de contato com água e sabão</b>, para evitar a propagação secundária do alérgeno (por exemplo, por arranhões).',
      why:'O alérgeno ainda está na pele e na roupa: a erupção pode continuar surgindo em novos locais sem nenhuma planta nova.' }),

  /* ═══════════ COMPLICAÇÕES E PROGNÓSTICO ═══════════ */
  card('image',
    { front:'Yellow crusts appear on a patient\'s contact dermatitis. What complication is this, and what is the treatment?',
      back:'<b>Secondary bacterial infection</b> (eg, <i>Staphylococcus aureus</i>) — yellow crusts indicate <b>impetigo</b>. Treatment: <b>topical or systemic antibiotics</b>.',
      hint:'Also suspect it when the rash resists standard therapy.',
      why:'Barrier disruption plus scratching inoculates the organism — the infection is a consequence of the dermatitis, not a separate disease.' },
    { front:'Crostas amarelas aparecem sobre a dermatite de contato de um paciente. Qual é essa complicação e qual o tratamento?',
      back:'<b>Infecção bacteriana secundária</b> (por exemplo, <i>Staphylococcus aureus</i>) — crostas amarelas indicam <b>impetigo</b>. Tratamento: <b>antibióticos tópicos ou sistêmicos</b>.',
      hint:'Suspeite também quando a erupção resiste à terapia padrão.',
      why:'A ruptura da barreira somada ao ato de coçar inocula o agente — a infecção é consequência da dermatite, não uma doença separada.' },
    { img: A+'image-18-en.webp',
      imgAlt:{ en:'Impetiginized hand dermatitis', pt:'Dermatite de mão impetiginizada' } }),

  card('case',
    { front:'A 30-year-old man has a 3-week itching, burning rash limited to the left wrist. No new skin products; he has been wearing a watch bought on a recent trip. What is the diagnosis, and what would histology show?',
      back:'<b>Chronic allergic contact dermatitis</b> from <b>nickel</b> in the watch. Histology: <b>intercellular epidermal edema (spongiosis) with lymphocytes and eosinophils</b>; chronic lesions also show epidermal hyperplasia (acanthosis).',
      hint:'What is under the watch band, chemically?',
      why:'A rash whose border is the object that touches it is contact dermatitis by distribution alone.' },
    { front:'Homem de 30 anos com erupção pruriginosa e ardente há 3 semanas, limitada ao pulso esquerdo. Sem produtos novos para a pele; usa um relógio comprado em viagem recente. Qual o diagnóstico e o que mostraria a histologia?',
      back:'<b>Dermatite alérgica de contato crônica</b> pelo <b>níquel</b> do relógio. Histologia: <b>edema epidérmico intercelular (espongiose) com linfócitos e eosinófilos</b>; lesões crônicas também mostram hiperplasia epidérmica (acantose).',
      hint:'O que há sob a pulseira do relógio, quimicamente?',
      why:'Uma erupção cujo contorno é o objeto que a toca é dermatite de contato só pela distribuição.' }),

  card('case',
    { front:'A 34-year-old lineman returns from a repair job in a wooded area with an intensely pruritic rash on the right leg, with papules and vesicles in linear streaks. Which cell causes the tissue damage?',
      back:'<b>T lymphocytes</b> — specifically <b>CD8+ T cells</b>, the primary effector cells in urushiol-induced (poison ivy) contact dermatitis, which directly destroy haptenated keratinocytes.',
      hint:'Type IV means cell-mediated, not antibody- or mast cell-mediated.',
      why:'Mast cells, basophils, eosinophils, neutrophils, and plasma cells are all distractors from types I, II and III — the linear streaks plus the wilderness exposure point to type IV.' },
    { front:'Eletricista de 34 anos volta de um serviço em área arborizada com erupção intensamente pruriginosa na perna direita, com pápulas e vesículas em listras lineares. Qual célula causa o dano tecidual?',
      back:'<b>Linfócitos T</b> — especificamente as <b>células T CD8+</b>, as células efetoras primárias na dermatite de contato induzida por urushiol (hera venenosa), que destroem diretamente os queratinócitos haptenados.',
      hint:'Tipo IV significa mediada por células, não por anticorpos nem por mastócitos.',
      why:'Mastócitos, basófilos, eosinófilos, neutrófilos e plasmócitos são todos distratores dos tipos I, II e III — as listras lineares somadas à exposição no bosque apontam para o tipo IV.' }),

  /* ═══════════ FATORES DE RISCO ═══════════ */
  card('recall',
    { front:'Age affects ICD and ACD in opposite directions. How?',
      back:'<b>ICD</b>: <b>younger</b> patients are more likely, due to a heightened inflammatory response.<br><b>ACD</b>: <b>adults</b> are more likely, because they have had more time for allergen <b>sensitization</b>.',
      why:'Sensitization takes exposure over years — so the allergic form skews older while the irritant form skews younger.' },
    { front:'A idade afeta CDI e ACD em direções opostas. Como?',
      back:'<b>CDI</b>: pacientes <b>mais jovens</b> são mais propensos, pela resposta inflamatória aumentada.<br><b>ACD</b>: <b>adultos</b> são mais propensos, porque tiveram mais tempo para a <b>sensibilização</b> ao alérgeno.',
      why:'A sensibilização exige exposição ao longo de anos — então a forma alérgica pesa mais em adultos e a irritativa em jovens.' }),

];
})();
