/* CoupleMed — Library 1 › Allergy & Immunology
   ============================================================================
   Conteúdo transcrito FIELMENTE dos prints enviados pelo usuário
   (~/Desktop/Adicionar Library 1/Allergy & Immunology/<tópico>/).
   Ver LIBRARY1_ADD_CONTENT.md — §1 (fidelidade) e §5 (formato).
   Não parafrasear, resumir, expandir nem reordenar. EN e PT sempre juntos.
   ============================================================================ */
/* IIFE obrigatória: todos os arquivos de Subject são carregados no MESMO escopo
   global, então qualquer const/let solta aqui colidiria com a do arquivo vizinho. */
(function(){
'use strict';
window.LIBRARY1_CONTENT = window.LIBRARY1_CONTENT || {};

// chave relativa: o leitor resolve para o site ou para o R2 (ver ASSET_BASE)
const A1 = 'allergy-and-immunology/';

window.LIBRARY1_CONTENT['allergy-and-immunology'] = {

  /* ---------------------------------------------------------------- *
   * Acute rheumatic fever · Febre reumática aguda                    *
   * Origem: 30 prints (1-6 texto EN, 7-19 mídia EN, 20-29 mídia PT,  *
   * 30 texto PT). Incluído em 2026-07-25.                            *
   * ---------------------------------------------------------------- */
  'acute-rheumatic-fever': {

    assets: {
      'image-1': { kind:'image', n:1,
        en:{ key:A1+'acute-rheumatic-fever/image-1-en.webp', alt:'Acute rheumatic heart disease' },
        pt:{ key:A1+'acute-rheumatic-fever/image-1-pt.webp', alt:'Doença cardíaca reumática aguda' } },
      'image-2': { kind:'image', n:2,
        en:{ key:A1+'acute-rheumatic-fever/image-2-en.webp', alt:'Erythema marginatum' },
        pt:{ key:A1+'acute-rheumatic-fever/image-2-pt.webp', alt:'Eritema marginal' } },
      'image-3': { kind:'image', n:3,
        en:{ key:A1+'acute-rheumatic-fever/image-3-en.webp', alt:'Henoch-Schönlein purpura' },
        pt:{ key:A1+'acute-rheumatic-fever/image-3-pt.webp', alt:'Purpura Henoch-Schönlein' } },
      'image-4': { kind:'image', n:4,
        en:{ key:A1+'acute-rheumatic-fever/image-4-en.webp', alt:'Erythema migrans' },
        pt:{ key:A1+'acute-rheumatic-fever/image-4-pt.webp', alt:'Eritema migrans' } },
      'image-5': { kind:'image', n:5,
        en:{ key:A1+'acute-rheumatic-fever/image-5-en.webp', alt:'Erythema infectiosum (fifth disease)' },
        pt:{ key:A1+'acute-rheumatic-fever/image-5-pt.webp', alt:'Eritema infeccioso (cinta doença)' } },
      'figure-1': { kind:'figure', n:1,
        en:{ key:A1+'acute-rheumatic-fever/figure-1-en.webp', alt:'Pathophysiology of acute rheumatic fever' },
        pt:{ key:A1+'acute-rheumatic-fever/figure-1-pt.webp', alt:'Fisiopatologia da febre reumática aguda' } },
      'figure-2': { kind:'figure', n:2,
        en:{ key:A1+'acute-rheumatic-fever/figure-2-en.webp', alt:'Mitral valve calcification' },
        pt:{ key:A1+'acute-rheumatic-fever/figure-2-pt.webp', alt:'Calcificação da válvula mitral' } },
      'table-1': { kind:'table', n:1,
        en:{ key:A1+'acute-rheumatic-fever/table-1-en.webp', alt:'Antibiotic prophylaxis for secondary prevention of rheumatic fever' },
        pt:{ key:A1+'acute-rheumatic-fever/table-1-pt.webp', alt:'Profilaxia antibiótica para prevenção secundária de febre reumática' } },
      'table-2': { kind:'table', n:2,
        en:{ key:A1+'acute-rheumatic-fever/table-2-en.webp', alt:'Streptococcal pharyngitis' },
        pt:{ key:A1+'acute-rheumatic-fever/table-2-pt.webp', alt:'Faringite estreptocócica' } },
      'table-3': { kind:'table', n:3,
        en:{ key:A1+'acute-rheumatic-fever/table-3-en.webp', alt:'Acute rheumatic fever' },
        pt:{ key:A1+'acute-rheumatic-fever/table-3-pt.webp', alt:'Febre reumática aguda' } }
    },

    /* ---- CREATE TEST: questões de treino DESTE tópico ----
       Transcritas dos prints em ~/Desktop/.../Acute rheumatic fever/ (Imagem 1-14).
       ⚠️ SEPARADAS do QBank 1: não entram no SEED nem na performance dele
       (LIBRARY1_ADD_CONTENT.md §11.2). Mesmo schema de campos do QBank. */
    quiz: [
      {
        id: 'L1Q-ARF-001',
        vignette: 'The public health department of a developing country performs an epidemiologic study to assess the nationwide incidence of upper respiratory infections among children.  The data show a high rate of childhood bacterial pharyngitis.  Current practice guidelines indicate that a rapid test should be performed in children to identify the presence of bacterial antigens.  If this test is negative, a throat culture, the gold standard for definitive diagnosis, is then performed.  To offset cost and avoid losing patients to follow-up, the department is considering recommending the empiric use of penicillin for the treatment of suspected bacterial pharyngitis.',
        q: 'Which of the following would be expected to decrease after long-term implementation of this guideline?',
        options: [
          'Deaths associated with diarrheal illness',
          'Diagnoses of serum sickness-like reactions',
          'Incidence of nephritic syndrome',
          'Need for cardiac surgery',
          'Use of broad-spectrum antibiotics'
        ],
        correct: 'D',
        peer: { A:2, B:3, C:31, D:52, E:11 },
        difficulty: 'medium',
        explC: 'Early penicillin treatment of group A streptococcal pharyngitis is important for the prevention of acute rheumatic fever (ARF), a major cause of cardiovascular death in many developing nations.  ARF primarily affects the heart and central nervous system because host antibodies produced in response to streptococcal antigens cross-react with host antigens in these organs.  Chronic cardiac inflammation can progress to rheumatic heart disease, specifically valvular disease.  The mitral valve is the most commonly affected and gradually thickens, fibroses, and calcifies, eventually requiring valvotomy or more invasive surgical intervention.\n\nEmpiric therapy for a condition must be considered in the context of the host characteristics, pre-test probability of the disease, benefits/risks of waiting for a definitive diagnosis, and cost of therapy versus its potential complications.  If all cases of acute streptococcal pharyngitis were treated empirically, the incidence of rheumatic heart disease and associated cardiac procedures would likely decrease.',
        explI: {
          A: 'Antibiotic use can promote diarrhea by altering the gut microbial milieu.  This alteration can lead to overgrowth of Clostridium difficile, a gram-positive bacterium that can cause profuse, watery diarrhea and life-threatening fulminant colitis.  Therefore, increasing antibiotic use would likely result in increased diarrheal illness and potential complications.',
          B: 'Serum sickness-like reactions are associated with certain infections (eg, hepatitis B) and antibiotics (eg, penicillin).  The development of circulating drug-specific immune complexes may cause fever, rash, and arthritis.  If penicillin was used more frequently, serum sickness-like reactions would potentially increase, not decrease.',
          C: 'Post-streptococcal glomerulonephritis (PSGN) is the most common cause of nephritic syndrome in children worldwide.  It is caused by deposition of immune complexes in glomeruli following pharyngitis or skin infections with group A Streptococcus.  Although early antibiotics are effective in preventing ARF, they have not been shown to reduce the risk of PSGN.',
          E: 'Empiric use of potentially unnecessary antibiotics may cause an increase in antibiotic resistance, thereby increasing the need for broad-spectrum antibiotics.  For example, methicillin-resistant Staphylococcus aureus (MRSA) evolved from methicillin-sensitive S aureus via alteration of the protein binding site for beta-lactam antibiotics.  As a result, broad-spectrum antibiotics (eg, vancomycin, daptomycin) are required for MRSA infections.'
        },
        objective: 'Acute rheumatic fever is a complication of untreated group A streptococcal pharyngitis.  Rheumatic heart disease is the most common cause of acquired valvular heart disease and cardiovascular death in developing countries.  The incidence of acute rheumatic fever and rheumatic heart disease has been reduced in industrialized nations with prompt treatment of streptococcal pharyngitis with penicillin.',
        tags: { subject:'Microbiology', system:'Infectious Diseases', topic:'Rheumatic fever' },
        ptTranslation: {
          vignette: 'O departamento de saúde pública de um país em desenvolvimento realiza um estudo epidemiológico para avaliar a incidência nacional de infecções respiratórias superiores em crianças. Os dados mostram uma alta taxa de faringite bacteriana na infância. As diretrizes atuais indicam que um teste rápido deve ser realizado em crianças para identificar a presença de antígenos bacterianos. Se esse teste for negativo, realiza-se então uma cultura de garganta, o padrão-ouro para o diagnóstico definitivo. Para compensar o custo e evitar a perda de pacientes no seguimento, o departamento está considerando recomendar o uso empírico de penicilina para o tratamento da faringite bacteriana suspeita.',
          q: 'Qual dos seguintes seria esperado diminuir após a implementação a longo prazo dessa diretriz?',
          options: [
            'Mortes associadas a doença diarreica',
            'Diagnósticos de reações semelhantes à doença do soro',
            'Incidência de síndrome nefrítica',
            'Necessidade de cirurgia cardíaca',
            'Uso de antibióticos de amplo espectro'
          ],
          explC: 'O tratamento precoce com penicilina da faringite estreptocócica do grupo A é importante para a prevenção da febre reumática aguda (ARF), uma causa importante de morte cardiovascular em muitas nações em desenvolvimento. A ARF afeta principalmente o coração e o sistema nervoso central porque os anticorpos do hospedeiro produzidos em resposta aos antígenos estreptocócicos reagem cruzadamente com antígenos do hospedeiro nesses órgãos. A inflamação cardíaca crônica pode progredir para doença cardíaca reumática, especificamente doença valvular. A válvula mitral é a mais comumente afetada e gradualmente espessa, fibrosa e calcifica, eventualmente requerendo valvotomia ou intervenção cirúrgica mais invasiva.\n\nA terapia empírica para uma condição deve ser considerada no contexto das características do hospedeiro, da probabilidade pré-teste da doença, dos benefícios/riscos de aguardar um diagnóstico definitivo e do custo da terapia versus suas complicações potenciais. Se todos os casos de faringite estreptocócica aguda fossem tratados empiricamente, a incidência de doença cardíaca reumática e os procedimentos cardíacos associados provavelmente diminuiriam.',
          explI: {
            A: 'O uso de antibióticos pode promover diarreia por alterar o meio microbiano intestinal. Essa alteração pode levar ao supercrescimento de Clostridium difficile, uma bactéria gram-positiva que pode causar diarreia profusa e aquosa e colite fulminante potencialmente fatal. Portanto, aumentar o uso de antibióticos provavelmente resultaria em aumento da doença diarreica e de complicações potenciais.',
            B: 'As reações semelhantes à doença do soro estão associadas a certas infecções (por exemplo, hepatite B) e antibióticos (por exemplo, penicilina). O desenvolvimento de imunocomplexos circulantes específicos do fármaco pode causar febre, erupção cutânea e artrite. Se a penicilina fosse usada com mais frequência, as reações semelhantes à doença do soro potencialmente aumentariam, e não diminuiriam.',
            C: 'A glomerulonefrite pós-estreptocócica (GNPE) é a causa mais comum de síndrome nefrítica em crianças no mundo. É causada pela deposição de imunocomplexos nos glomérulos após faringite ou infecções de pele por Streptococcus do grupo A. Embora os antibióticos precoces sejam eficazes na prevenção da ARF, não foi demonstrado que reduzam o risco de GNPE.',
            E: 'O uso empírico de antibióticos potencialmente desnecessários pode causar aumento da resistência antibiótica, aumentando assim a necessidade de antibióticos de amplo espectro. Por exemplo, o Staphylococcus aureus resistente à meticilina (MRSA) evoluiu do S aureus sensível à meticilina por alteração do sítio de ligação proteica para antibióticos beta-lactâmicos. Como resultado, antibióticos de amplo espectro (por exemplo, vancomicina, daptomicina) são necessários para infecções por MRSA.'
          },
          objective: 'A febre reumática aguda é uma complicação da faringite estreptocócica do grupo A não tratada. A doença cardíaca reumática é a causa mais comum de doença valvular cardíaca adquirida e de morte cardiovascular em países em desenvolvimento. A incidência de febre reumática aguda e de doença cardíaca reumática foi reduzida em nações industrializadas com o tratamento imediato da faringite estreptocócica com penicilina.'
        }
      },
      {
        id: 'L1Q-ARF-002',
        vignette: 'An 8-year-old boy is brought to the office for rapid and irregular movements of his hands for one week.  His parents say that he is also making unintentional "funny faces" and has trouble controlling the volume of his voice.  His temperature is 38.9 C (102 F).  On physical examination, the boy moves his hands frequently and erratically.  He has a new III/VI systolic murmur and several circular, faintly erythematous lesions on his abdomen.',
        q: "Which of the following is the most likely mechanism for this patient's condition?",
        options: [
          'Nonspecific T cell receptor activation',
          'Cross-reactivity of antibodies against bacterial and host antigens',
          'Embolization of an infected thrombus',
          'Injury from immune complex deposition',
          'Release of an erythrogenic toxin'
        ],
        correct: 'B',
        peer: { A:4, B:63, C:6, D:9, E:15 },
        difficulty: 'medium',
        img: 'figure-1',
        explC: 'This patient has acute rheumatic fever, an immune-mediated disease following an untreated group A Streptococcus (GAS) infection.  Antibodies against GAS cross-react with host tissues due to molecular mimicry between GAS antigens and cardiac and central nervous system antigens.  Specifically, antibodies directed against GAS antigens, M protein and N-acetyl-beta-D-glucosamine, subsequently attack myosin, a cardiac protein, and lysoganglioside, a neuronal cell surface protein.\n\nThe major manifestations of acute rheumatic fever include arthritis, pancarditis, Sydenham chorea, erythema marginatum, and subcutaneous nodules.  This patient\'s murmur is likely due to acute mitral regurgitation from pancarditis.  Sydenham chorea presents with non-rhythmic movements of the hands, feet, and face.  Patients often have sudden changes in voice pitch and volume.  Erythema marginatum presents as faintly erythematous, circular lesions with central clearing that come and go on the trunk and extremities.',
        explI: {
          A: 'Superantigens cause a tremendous release of cytokines through nonspecific T cell receptor activation, leading to acute fever, hypotension, and erythroderma.  This is the mechanism of action of the toxic shock syndrome exotoxins produced by both Staphylococcus aureus and Streptococcus pyogenes.',
          C: 'An embolic stroke from infective endocarditis can present with fever, a new-onset murmur, and focal neurologic deficits.  In addition, Janeway lesions, Osler nodes, and Roth spots are specific findings of infectious endocarditis.  The most common pathogens are S aureus, viridans group streptococci, and enterococci.',
          D: 'The deposition of streptococcal antigen immune complexes in glomeruli causes post-streptococcal glomerulonephritis, a type III hypersensitivity reaction.  Patients have microscopic or gross hematuria, edema, hypertension, and proteinuria.',
          E: 'Scarlet fever is caused by the body\'s response to an erythrogenic (pyrogenic) toxin released by group A Streptococcus.  It presents with a diffuse, erythematous, "sandpaper"-textured rash most notable in the skin folds (eg, inguinal, axillary, antecubital areas).  Scarlet fever can occur with pharyngitis and can lead to acute rheumatic fever if untreated.'
        },
        objective: 'Acute rheumatic fever is an autoimmune reaction following an untreated group A streptococcal pharyngitis.  Anti-group A Streptococcus antibodies (eg, anti-M protein, anti-N-acetyl-beta-D-glucosamine) cross-react and attack cardiac and central nervous system antigens.',
        tags: { subject:'Pathophysiology', system:'Infectious Diseases', topic:'Rheumatic fever' },
        ptTranslation: {
          vignette: 'Um menino de 8 anos é levado ao consultório por movimentos rápidos e irregulares das mãos há uma semana. Os pais dizem que ele também está fazendo "caretas" involuntárias e tem dificuldade para controlar o volume da voz. Sua temperatura é 38,9 C (102 F). Ao exame físico, o menino move as mãos com frequência e de forma errática. Ele apresenta um novo sopro sistólico III/VI e diversas lesões circulares, discretamente eritematosas, no abdome.',
          q: 'Qual das seguintes é o mecanismo mais provável para a condição deste paciente?',
          options: [
            'Ativação inespecífica do receptor de células T',
            'Reatividade cruzada de anticorpos contra antígenos bacterianos e do hospedeiro',
            'Embolização de um trombo infectado',
            'Lesão por deposição de imunocomplexos',
            'Liberação de uma toxina eritrogênica'
          ],
          explC: 'Este paciente tem febre reumática aguda, uma doença imunomediada que ocorre após uma faringite estreptocócica do grupo A (GAS) não tratada. Anticorpos contra o GAS reagem de forma cruzada com tecidos do hospedeiro devido ao mimetismo molecular entre antígenos do GAS e antígenos cardíacos e do sistema nervoso central. Especificamente, anticorpos direcionados contra antígenos do GAS, a proteína M e a N-acetil-beta-D-glucosamina, atacam subsequentemente a miosina, uma proteína cardíaca, e o lisogangliosídeo, uma proteína de superfície das células neuronais.\n\nAs principais manifestações da febre reumática aguda incluem artrite, pancardite, coreia de Sydenham, eritema marginado e nódulos subcutâneos. O sopro deste paciente provavelmente se deve à regurgitação mitral aguda por pancardite. A coreia de Sydenham se apresenta com movimentos não rítmicos das mãos, pés e face. Os pacientes frequentemente apresentam mudanças súbitas no tom e volume da voz. O eritema marginado se apresenta como lesões circulares, discretamente eritematosas, com clareamento central, que aparecem e desaparecem no tronco e nas extremidades.',
          explI: {
            A: 'Superantígenos causam uma liberação tremenda de citocinas através da ativação inespecífica do receptor de células T, levando a febre aguda, hipotensão e eritrodermia. Este é o mecanismo de ação das exotoxinas da síndrome do choque tóxico produzidas tanto por Staphylococcus aureus quanto por Streptococcus pyogenes.',
            C: 'Um acidente vascular cerebral embólico decorrente de endocardite infecciosa pode se apresentar com febre, sopro de início recente e déficits neurológicos focais. Além disso, lesões de Janeway, nódulos de Osler e manchas de Roth são achados específicos de endocardite infecciosa. Os patógenos mais comuns são S aureus, estreptococos do grupo viridans e enterococos.',
            D: 'A deposição de imunocomplexos de antígenos estreptocócicos nos glomérulos causa glomerulonefrite pós-estreptocócica, uma reação de hipersensibilidade do tipo III. Os pacientes apresentam hematúria microscópica ou macroscópica, edema, hipertensão e proteinúria.',
            E: 'A escarlatina é causada pela resposta do corpo a uma toxina eritrogênica (pirogênica) liberada pelo Streptococcus do grupo A. Apresenta-se com uma erupção cutânea difusa, eritematosa, de textura "lixa", mais notável nas dobras cutâneas (por exemplo, regiões inguinal, axilar, antecubital). A escarlatina pode ocorrer com faringite e pode levar à febre reumática aguda se não tratada.'
          },
          objective: 'A febre reumática aguda é uma reação autoimune que ocorre após uma faringite estreptocócica do grupo A não tratada. Anticorpos anti-Streptococcus do grupo A (por exemplo, anti-proteína M, anti-N-acetil-beta-D-glucosamina) reagem de forma cruzada e atacam antígenos cardíacos e do sistema nervoso central.'
        }
      },
      {
        id: 'L1Q-ARF-003',
        vignette: 'A 10-year-old boy is brought to the emergency department due to shortness of breath and palpitations for the past day.  He also has associated fever and fatigue.  Vital signs indicate tachypnea, tachycardia, and hypotension.  On cardiac auscultation, the patient has a new holosystolic murmur.  He is admitted to the hospital for further workup and management.  A cardiac biopsy is performed due to decompensation and an unclear diagnosis.  Light microscopy of the tissue specimen is shown in the image below.',
        q: "Which of the following most likely preceded development of this patient's current condition?",
        options: [
          'Antibiotic exposure',
          'Bacterial infection',
          'Chemotherapy',
          'Genetic mutation',
          'Travel to South America',
          'Viral infection'
        ],
        correct: 'B',
        peer: { A:0, B:48, C:1, D:4, E:16, F:28 },
        difficulty: 'hard',
        explC: "Acute rheumatic fever (ARF) is an immune-mediated complication of an untreated group A streptococcal pharyngeal infection.  The most serious manifestation of ARF is pancarditis, which can cause nonspecific fever, fatigue, and anorexia as well as altered vital signs (tachycardia, tachypnea, hypotension).  Endocardial involvement resulting in valvular dysfunction (specifically acute mitral valve regurgitation) is the most likely cause of the patient's new holosystolic murmur.\n\nThis patient's myocardial biopsy shows a lesion consisting of lymphocytes and macrophages as well as scattered multinucleated giant cells.  This interstitial myocardial granuloma, or Aschoff body, is pathognomonic for ARF-related myocarditis.  Plump macrophages with abundant cytoplasm and central, slender chromatin ribbons called Anitschkow (or caterpillar) cells are also often present.  Over subsequent years, Aschoff bodies are replaced by fibrous scar tissue, leading to chronic mitral valve stenosis and regurgitation.",
        explI: {
          A: 'Hypersensitivity myocarditis, which results from an autoimmune reaction to a medication, is characterized by an interstitial infiltrate of eosinophils.  Many classes of drugs, including diuretics (eg, furosemide, hydrochlorothiazide) and antibiotics (eg, ampicillin, azithromycin), can cause this hypersensitivity reaction.',
          C: 'Anthracyclines (eg, doxorubicin, daunorubicin) are cardiotoxic chemotherapeutic agents.  These agents can cause dose-related acute and chronic cardiac damage (eg, dilated cardiomyopathy).  On biopsy, patchy fibrosis with vacuolization and lysis of myocytes are evident.',
          D: 'A genetic mutation involving sarcomere genes can lead to the development of hypertrophic cardiomyopathy (HCM).  HCM leads to left ventricular hypertrophy and, in turn, both systolic and diastolic dysfunction.  The pathology involves disorganized, hypertrophied myocytes.',
          E: 'Recent travel to South America is associated with Chagas disease, which is caused by the protozoan parasite Trypanosoma cruzi.  Chagas disease can result in a myocarditis characterized by distension of individual myofibers with intracellular trypanosomes.',
          F: 'Viral myocarditis produces a predominantly lymphocytic interstitial infiltrate with focal necrosis of myocytes.  Aschoff bodies are not seen.  Viral infection (eg, adenovirus, Coxsackie B virus, parvovirus B19) is the most common cause of myocarditis in the general population.'
        },
        objective: 'Interstitial myocardial granulomas (Aschoff bodies) are found in carditis due to acute rheumatic fever, which develops after an untreated group A streptococcal pharyngeal infection.  Aschoff bodies contain plump macrophages with abundant cytoplasm and central, slender ribbons of chromatin (Anitschkow, or caterpillar, cells).',
        tags: { subject:'Pathology', system:'Cardiovascular System', topic:'Rheumatic fever' },
        ptTranslation: {
          vignette: 'Um menino de 10 anos é levado ao pronto-socorro devido a falta de ar e palpitações no último dia. Ele também apresenta febre e fadiga associadas. Os sinais vitais indicam taquipneia, taquicardia e hipotensão. À ausculta cardíaca, o paciente apresenta um novo sopro holossistólico. Ele é internado para investigação e manejo adicionais. Uma biópsia cardíaca é realizada devido à descompensação e a um diagnóstico incerto. A microscopia óptica da amostra de tecido é mostrada na imagem abaixo.',
          q: 'Qual das seguintes opções provavelmente precedeu o desenvolvimento da condição atual deste paciente?',
          options: [
            'Exposição a antibióticos',
            'Infecção bacteriana',
            'Quimioterapia',
            'Mutação genética',
            'Viagem à América do Sul',
            'Infecção viral'
          ],
          explC: 'A febre reumática aguda (ARF) é uma complicação imunomediada de uma infecção faríngea estreptocócica do grupo A não tratada. A manifestação mais grave da ARF é a pancardite, que pode causar febre inespecífica, fadiga e anorexia, além de sinais vitais alterados (taquicardia, taquipneia, hipotensão). O envolvimento endocárdico resultando em disfunção valvular (especificamente regurgitação mitral aguda) é a causa mais provável do novo sopro holossistólico do paciente.\n\nA biópsia miocárdica deste paciente mostra uma lesão composta por linfócitos e macrófagos, além de células gigantes multinucleadas dispersas. Esse granuloma miocárdico intersticial, ou corpo de Aschoff, é patognomônico de miocardite relacionada à ARF. Macrófagos volumosos com citoplasma abundante e fitas de cromatina centrais e delgadas, chamadas células de Anitschkow (ou em lagarta), também costumam estar presentes. Ao longo dos anos seguintes, os corpos de Aschoff são substituídos por tecido cicatricial fibroso, levando à estenose e regurgitação mitral crônicas.',
          explI: {
            A: 'A miocardite de hipersensibilidade, que resulta de uma reação autoimune a um medicamento, é caracterizada por um infiltrado intersticial de eosinófilos. Diversas classes de fármacos, incluindo diuréticos (por exemplo, furosemida, hidroclorotiazida) e antibióticos (por exemplo, ampicilina, azitromicina), podem causar essa reação de hipersensibilidade.',
            C: 'As antraciclinas (por exemplo, doxorrubicina, daunorrubicina) são agentes quimioterápicos cardiotóxicos. Esses agentes podem causar dano cardíaco agudo e crônico relacionado à dose (por exemplo, cardiomiopatia dilatada). Na biópsia, observam-se fibrose irregular com vacuolização e lise dos miócitos.',
            D: 'Uma mutação genética envolvendo genes do sarcômero pode levar ao desenvolvimento de cardiomiopatia hipertrófica (HCM). A HCM leva à hipertrofia ventricular esquerda e, por consequência, a disfunção sistólica e diastólica. A patologia envolve miócitos desorganizados e hipertrofiados.',
            E: 'Viagem recente à América do Sul está associada à doença de Chagas, causada pelo parasita protozoário Trypanosoma cruzi. A doença de Chagas pode resultar em miocardite caracterizada por distensão de miofibras individuais com tripanossomas intracelulares.',
            F: 'A miocardite viral produz um infiltrado intersticial predominantemente linfocítico com necrose focal de miócitos. Corpos de Aschoff não são observados. A infecção viral (por exemplo, adenovírus, vírus Coxsackie B, parvovírus B19) é a causa mais comum de miocardite na população geral.'
          },
          objective: 'Granulomas miocárdicos intersticiais (corpos de Aschoff) são encontrados na cardite decorrente de febre reumática aguda, que se desenvolve após uma infecção faríngea estreptocócica do grupo A não tratada. Os corpos de Aschoff contêm macrófagos volumosos com citoplasma abundante e fitas centrais e delgadas de cromatina (células de Anitschkow, ou em lagarta).'
        }
      },
      {
        id: 'L1Q-ARF-004',
        vignette: "A 12-year-old girl comes to the office with constant swelling and pain of her elbows for the past week that have prevented her from participating in basketball practice.  She also had knee pain during the preceding week that was attributed to a fall during practice.  Her parents say that she is healthy and has had only minor illnesses that children typically experience during the winter.  The patient's temperature is 38.9 C (102 F), blood pressure is 110/70 mm Hg, and pulse is 110/min.  Her elbows are swollen and tender with limited range of motion.  Her knees appear normal.  A new holosystolic murmur is heard on cardiac auscultation.  Antistreptolysin O titers are 400 Todd units/mL (normal: <300 Todd units/mL).  The patient is admitted to the hospital.",
        q: 'During her hospitalization, this patient is at greatest risk of dying from which of the following complications?',
        options: [
          'Mitral stenosis',
          'Pancarditis',
          'Renal failure',
          'Septic arthritis',
          'Septic shock'
        ],
        correct: 'B',
        peer: { A:10, B:43, C:15, D:6, E:23 },
        difficulty: 'hard',
        img: 'table-3',
        explC: "Acute rheumatic fever (ARF) is the most likely diagnosis in this patient with migratory arthritis, new-onset murmur, fever, and a positive anti-streptolysin O titer.  ARF is a multisystem complication that develops 2-4 weeks after untreated group A streptococcal pharyngitis.  Most organs are often only mildly and transiently affected in ARF, with the exception of the heart.  Acute morbidity is most likely due to pancarditis (inflammation of the endocardium, myocardium, and epicardium).  Inflammation of the mitral valve can lead to mitral regurgitation, which is the likely cause of the new holosystolic murmur in this patient.  Severe regurgitation and/or myocarditis can lead to cardiac dilation, heart failure, and death in a small percentage of patients.",
        explI: {
          A: 'Virtually all cases of mitral stenosis are caused by fibrosis of the valve leaflets in chronic rheumatic heart disease.  The fibrosis occurs gradually over years or decades after the initial episode of ARF and would, therefore, not be an acute complication in this patient.',
          C: 'Acute poststreptococcal glomerulonephritis (PSGN) is caused by circulating immune complexes following a streptococcal pharyngeal infection with specific nephritogenic strains.  Hematuria, edema, proteinuria, and hypertension are classic findings.  This patient has no symptoms of PSGN, which rarely occurs simultaneously with ARF.',
          D: 'Patients with septic arthritis are often febrile and ill-appearing.  Staphylococcus aureus is the most common cause and usually infects only one joint.',
          E: 'Septic shock refers to end-organ damage due to poor perfusion from an overwhelming inflammatory response to infection.  Although the pathogenesis of ARF involves an initial infection with group A streptococcus, the disease itself is autoimmune-related, not due to direct infection.'
        },
        objective: 'The primary cause of morbidity in acute rheumatic fever is heart failure from severe pancarditis.  Mitral stenosis develops years or decades after the original illness.  Joint involvement is usually transient.',
        tags: { subject:'Pathology', system:'Rheumatology/Orthopedics & Sports', topic:'Rheumatic fever' },
        ptTranslation: {
          vignette: 'Uma menina de 12 anos vem ao consultório com inchaço e dor constantes nos cotovelos na última semana, que a impediram de participar dos treinos de basquete. Ela também teve dor no joelho na semana anterior, atribuída a uma queda durante o treino. Os pais dizem que ela é saudável e teve apenas doenças leves, típicas das crianças no inverno. A temperatura da paciente é 38,9 C (102 F), a pressão arterial é 110/70 mmHg e o pulso é 110/min. Seus cotovelos estão inchados e sensíveis, com amplitude de movimento limitada. Os joelhos parecem normais. Um novo sopro holossistólico é auscultado ao exame cardíaco. Os títulos de antiestreptolisina O são de 400 unidades Todd/mL (normal: <300 unidades Todd/mL). A paciente é internada.',
          q: 'Durante a internação, esta paciente corre o maior risco de morrer devido a qual das seguintes complicações?',
          options: [
            'Estenose mitral',
            'Pancardite',
            'Insuficiência renal',
            'Artrite séptica',
            'Choque séptico'
          ],
          explC: 'A febre reumática aguda (ARF) é o diagnóstico mais provável nesta paciente com artrite migratória, sopro de início recente, febre e título positivo de antiestreptolisina O. A ARF é uma complicação multissistêmica que se desenvolve 2-4 semanas após faringite estreptocócica do grupo A não tratada. A maioria dos órgãos costuma ser afetada apenas de forma leve e transitória na ARF, com exceção do coração. A morbidade aguda deve-se, mais provavelmente, à pancardite (inflamação do endocárdio, miocárdio e epicárdio). A inflamação da válvula mitral pode levar à regurgitação mitral, causa provável do novo sopro holossistólico nesta paciente. Regurgitação grave e/ou miocardite podem levar à dilatação cardíaca, insuficiência cardíaca e morte em uma pequena porcentagem dos pacientes.',
          explI: {
            A: 'Praticamente todos os casos de estenose mitral são causados por fibrose dos folhetos valvares na doença cardíaca reumática crônica. A fibrose ocorre gradualmente ao longo de anos ou décadas após o episódio inicial de ARF e, portanto, não seria uma complicação aguda nesta paciente.',
            C: 'A glomerulonefrite pós-estreptocócica aguda (PSGN) é causada por imunocomplexos circulantes após uma infecção faríngea estreptocócica com cepas nefritogênicas específicas. Hematúria, edema, proteinúria e hipertensão são achados clássicos. Esta paciente não apresenta sintomas de PSGN, que raramente ocorre simultaneamente com a ARF.',
            D: 'Pacientes com artrite séptica costumam estar febris e com aspecto de doença. Staphylococcus aureus é a causa mais comum e geralmente infecta apenas uma articulação.',
            E: 'O choque séptico se refere a lesão de órgãos-alvo devido à má perfusão decorrente de uma resposta inflamatória avassaladora à infecção. Embora a patogênese da ARF envolva uma infecção inicial pelo Streptococcus do grupo A, a doença em si é de natureza autoimune, e não decorrente de infecção direta.'
          },
          objective: 'A principal causa de morbidade na febre reumática aguda é a insuficiência cardíaca decorrente de pancardite grave. A estenose mitral se desenvolve anos ou décadas após a doença original. O envolvimento articular costuma ser transitório.'
        }
      },
      {
        id: 'L1Q-ARF-005',
        vignette: 'A 10-year-old boy is brought to the physician by his parents due to restlessness and involuntary jerking.  He takes no medications and his vaccinations are up-to-date.  His parents do not recall any recent injuries or illnesses other than a sore throat 3 months ago.  On examination, the patient has rapid, irregular jerking movements involving his face, arms, and legs.',
        q: 'This patient is at greatest risk for developing which of the following conditions?',
        options: [
          'Deforming polyarthritis',
          'Early dementia',
          'Parkinson disease',
          'Renal failure',
          'Valvular heart disease'
        ],
        correct: 'E',
        peer: { A:5, B:8, C:5, D:8, E:72 },
        difficulty: 'easy',
        img: 'table-3',
        explC: 'This patient\'s restlessness and purposeless jerking movements 3 months after having a sore throat are consistent with Sydenham chorea, a hyperkinetic extrapyramidal movement disorder that is the most common acquired chorea of childhood.  Sydenham chorea is a neurologic manifestation of acute rheumatic fever that occurs 1-8 months after group A β-hemolytic streptococcal infection.  It is caused by a delayed onset autoimmune reaction involving anti-streptococcal antibodies that cross-react with the basal ganglia.  Because Sydenham chorea is a manifestation of acute rheumatic fever, patients with this disorder are at risk for chronic rheumatic heart disease.',
        explI: {
          A: 'Although migratory polyarthritis is an early manifestation of acute rheumatic fever, it is generally transient and rarely, if ever, deforming.',
          B: 'Early-onset Alzheimer dementia is associated with Down syndrome (trisomy 21).  Increased expression of the amyloid precursor protein gene located on chromosome 21 is thought to be the cause.',
          C: 'Parkinson disease is an extrapyramidal hypokinetic movement disorder consisting of tremor, rigidity, akinesia, and postural instability.  Jerking extremity movements are generally not seen in Parkinson disease, except in cases of levodopa overdose.',
          D: 'Poststreptococcal glomerulonephritis occurs following infection with specific nephritogenic strains of group A Streptococcus.  However, the nephritis manifests within 1-6 weeks and is typically self-limited.  Renal failure is not part of the clinical syndrome associated with acute rheumatic fever.'
        },
        objective: 'Sydenham chorea presents with involuntary, rapid, irregular jerking movements involving the face, arms, and legs.  It occurs months after group A streptococcal infection and is one of the major clinical manifestations of acute rheumatic fever.  Patients with this condition carry a high risk of chronic valvular disease.',
        tags: { subject:'Pathology', system:'Cardiovascular System', topic:'Rheumatic fever' },
        ptTranslation: {
          vignette: 'Um menino de 10 anos é levado ao médico pelos pais devido a inquietação e movimentos involuntários. Ele não toma medicamentos e suas vacinas estão em dia. Os pais não se lembram de nenhuma lesão ou doença recente, exceto uma dor de garganta há 3 meses. Ao exame, o paciente apresenta movimentos bruscos, rápidos e irregulares envolvendo a face, os braços e as pernas.',
          q: 'Este paciente corre o maior risco de desenvolver qual das seguintes condições?',
          options: [
            'Poliartrite deformante',
            'Demência precoce',
            'Doença de Parkinson',
            'Insuficiência renal',
            'Doença valvular cardíaca'
          ],
          explC: 'A inquietação e os movimentos bruscos e sem propósito deste paciente, 3 meses após um quadro de dor de garganta, são compatíveis com coreia de Sydenham, um distúrbio hipercinético extrapiramidal do movimento que é a coreia adquirida mais comum da infância. A coreia de Sydenham é uma manifestação neurológica da febre reumática aguda que ocorre 1-8 meses após infecção estreptocócica do grupo A β-hemolítico. É causada por uma reação autoimune de início tardio, envolvendo anticorpos antiestreptocócicos que reagem de forma cruzada com os núcleos da base. Como a coreia de Sydenham é uma manifestação da febre reumática aguda, os pacientes com esse distúrbio correm risco de doença cardíaca reumática crônica.',
          explI: {
            A: 'Embora a poliartrite migratória seja uma manifestação precoce da febre reumática aguda, ela geralmente é transitória e raramente, ou nunca, é deformante.',
            B: 'A demência de Alzheimer de início precoce está associada à síndrome de Down (trissomia do 21). Acredita-se que o aumento da expressão do gene da proteína precursora de amiloide, localizado no cromossomo 21, seja a causa.',
            C: 'A doença de Parkinson é um distúrbio extrapiramidal hipocinético do movimento, que consiste em tremor, rigidez, acinesia e instabilidade postural. Movimentos bruscos das extremidades geralmente não são observados na doença de Parkinson, exceto em casos de superdosagem de levodopa.',
            D: 'A glomerulonefrite pós-estreptocócica ocorre após infecção com cepas nefritogênicas específicas do Streptococcus do grupo A. No entanto, a nefrite se manifesta em 1-6 semanas e costuma ser autolimitada. A insuficiência renal não faz parte da síndrome clínica associada à febre reumática aguda.'
          },
          objective: 'A coreia de Sydenham se apresenta com movimentos involuntários, bruscos, rápidos e irregulares envolvendo a face, os braços e as pernas. Ocorre meses após infecção estreptocócica do grupo A e é uma das principais manifestações clínicas da febre reumática aguda. Pacientes com essa condição apresentam alto risco de doença valvular crônica.'
        }
      }
    ],

    en: {
      title: 'Acute rheumatic fever',
      html: `
        <h2>INTRODUCTION</h2>
        <p>Acute rheumatic fever (ARF) is an autoimmune disease that develops after untreated group A <em>Streptococcus</em> (GAS) pharyngitis.  It most commonly affects children and adolescents with major manifestations including arthritis, pancarditis, Sydenham chorea, erythema marginatum, and subcutaneous nodules.</p>

        <h2>PATHOGENESIS</h2>
        <p>ARF is a <strong>nonsuppurative, immune-mediated complication</strong> of an untreated <strong>group A <em>Streptococcus</em> (GAS) pharyngitis</strong>.  Antibodies against GAS cross-react with host tissues due to molecular mimicry between GAS antigens and cardiac and central nervous system antigens (<a class="l1r-ref" data-ref="figure-1">figure 1</a>).  Specifically, antibodies directed against GAS antigens (eg, <strong>M protein</strong>) attack cardiac proteins (eg, myosin) and neuronal cell surface proteins (eg, lysoganglioside in the basal ganglia).</p>
        <p>Morbidity and mortality is primarily related to inflammation of endocardium, myocardium, and epicardium.  ARF is associated with development of cardiac interstitial granulomas consisting of lymphocytes and macrophages as well as scattered multinucleated giant cells, or <strong>Aschoff bodies</strong>, on histology (<a class="l1r-ref" data-ref="image-1">image 1</a>); plump macrophages with abundant cytoplasm and central, slender chromatin ribbons called Anitschkow (or caterpillar) cells are also often present.  Over subsequent years, Aschoff bodies may be replaced by fibrous scar tissue, leading to chronic mitral valve stenosis and regurgitation.</p>

        <h2>RISK FACTORS</h2>
        <ul>
          <li>Resource-limited regions due to overcrowding and limited health care access</li>
          <li>Age 5-15</li>
        </ul>

        <h2>CLINICAL PRESENTATION</h2>
        <p>Manifestations of ARF typically begin <strong>2-4 weeks after</strong> an episode of GAS pharyngitis, the symptoms of which (eg, sore throat) may have been mild and are typically self-resolving.  The most common presenting symptoms of ARF are fever and arthritis.  The comprehensive features are categorized by major and minor manifestations for diagnostic purposes (ie, <strong>Jones criteria</strong>), and include the following:</p>
        <h3>Major criteria</h3>
        <ul>
          <li><strong>J</strong>oint involvement:  Arthritis is often the first manifestation of ARF and typically begins in large joints (eg, knees, ankles, elbows).  One joint is usually affected first, with other joints developing inflammation sequentially (ie, migratory arthritis).  Inflammation is transient and typically lasts days to a week per joint.</li>
          <li><strong>O ♥</strong> (carditis):  Inflammation of the endocardium, myocardium, and epicardium (ie, pancarditis) most commonly manifests as in valvular dysfunction, specifically acute <strong>mitral valve regurgitation</strong> with a new holosystolic murmur.  Altered vital signs (tachycardia, tachypnea, hypotension) and a friction rub may be seen.</li>
          <li><strong>N</strong>odules (subcutaneous):  These small, firm, painless lesions most commonly occur on the extensor surface of bony prominences (eg, elbow).</li>
          <li><strong>E</strong>rythema marginatum (<a class="l1r-ref" data-ref="image-2">image 2</a>):  This rash presents as nonpruritic, faintly erythematous, circular lesions with central clearing that come and go on the trunk and extremities.</li>
          <li><strong>S</strong>ydenham chorea:  Chorea has the longest latency period, occurring 1-8 months after GAS pharyngitis; it is the most common acquired cause of chorea in children.  Symptoms include nonrhythmic (irregular), involuntary, and rapid movements of the hands, feet, and face (eg, grimacing).  Patients may also have associated muscle weakness with a delayed relaxation phase of the patellar reflex.  In addition, pronator drift (involuntary hyperpronation of extended arms) is often present.  Other associated findings include emotional lability, decline in school performance, and sudden changes in voice pitch and volume.</li>
        </ul>
        <h3>Minor criteria</h3>
        <ul>
          <li>Fever</li>
          <li>Arthralgia</li>
          <li>Elevated inflammatory markers (ie, C-reactive protein [CRP], erythrocyte sedimentation rate [ESR])</li>
          <li>Prolonged PR interval on ECG</li>
        </ul>

        <h2>EVALUATION</h2>
        <p>Evaluation of suspected ARF based on clinical findings includes the following:</p>
        <p><strong>Laboratory studies</strong>:  Inflammatory markers (ie, CRP, ESR) are often elevated and reflect systemic inflammation.  Complete blood count may reveal anemia and leukocytosis.</p>
        <p><strong>Cardiac studies</strong>:  ECG may reveal a prolonged PR interval, and echocardiography often shows valvular regurgitation (most commonly mitral followed by aortic).  Chest x-ray may show cardiomegaly.</p>

        <h2>DIAGNOSIS</h2>
        <p>Diagnosis of ARF generally requires <strong>both</strong> of the following:</p>
        <ul>
          <li><strong>Two major</strong> OR <strong>one major and two minor</strong> Jones criteria.  However, the presence of indolent (ie, slowly progressive) carditis or Sydenham chorea alone is also considered sufficient due to the high likelihood of ARF in children with these symptoms.</li>
          <li><strong>Laboratory evidence of recent GAS infection</strong>.  Elevated anti-streptococcal antibodies (eg, anti-streptolysin O) titers or anti-DNAse B antibodies are most commonly used; a positive throat culture or rapid streptococcal antigen test is also sufficient, but both are usually negative at the onset of ARF symptoms.</li>
        </ul>

        <h2>DIFFERENTIAL DIAGNOSIS</h2>
        <p>The differential diagnosis for ARF depends on the primary manifesting symptom.</p>
        <h3>Arthritis</h3>
        <ul>
          <li><strong>Systemic juvenile idiopathic arthritis</strong>:  Systemic symptoms (eg, fever, rash) with arthritis are typical.  The arthritis is not transient and migratory but, rather, persists in affected joints for &gt;6 weeks.</li>
          <li><strong>Systemic lupus erythematosus</strong>:  Arthritis and elevated inflammatory markers (eg, CRP, ESR) are typical of this autoimmune disease that affects multiple organ systems.  Other expected symptoms include a malar rash, oral ulcers, and renal abnormalities (eg, proteinuria, hematuria).</li>
          <li><strong>Post-infectious reactive arthritis</strong>:  An asymmetric oligoarthritis can present weeks after initial gastrointestinal or genitourinary infection (eg, diarrhea, urethritis).  Most patients are young adults without cardiac manifestations.</li>
          <li><strong>Henoch-Schönlein purpura</strong> (<a class="l1r-ref" data-ref="image-3">image 3</a>):  This vasculitis can cause a transient, migratory arthritis and rash.  However, the rash is purpuric and abdominal pain and/or kidney involvement (eg, hematuria) is typical.</li>
          <li><strong>Lyme disease</strong> (<a class="l1r-ref" data-ref="image-4">image 4</a>):  This tick-borne illness can present with rash and arthritis.  The rash consists of single or multiple bull's eye lesions (erythema migrans) that slowly expand, and the arthritis is usually monoarticular (eg, knee only).</li>
          <li><strong>Parvovirus B19 infection</strong> (<a class="l1r-ref" data-ref="image-5">image 5</a>):  The symptoms of this infection can include acute, symmetric arthritis of small joints (eg, hands) with or without the characteristic "slapped-cheek" rash.  Large joint arthritis and chorea are not seen.</li>
        </ul>
        <h3>Carditis</h3>
        <ul>
          <li><strong>Infective endocarditis</strong>:  Fever and a new murmur with signs of acute heart failure (eg, dyspnea) are classic presenting symptoms.  Migratory arthritis is not seen, and most children have a historical risk factor (eg, congenital heart disease).</li>
          <li><strong>Infectious myocarditis/pericarditis</strong>:  Common viral infections (eg, Coxsackie virus) are associated with carditis in children.  Coxsackie virus causes vesicular pharyngitis (herpangina) in young children.  Arthritis, rash, and chorea are not associated findings.</li>
        </ul>

        <h2>MANAGEMENT</h2>
        <h3>Acute management</h3>
        <p>First-line treatment of ARF is a single intramuscular (IM) dose of <strong>benzathine penicillin G</strong> to eradicate GAS infection in the upper respiratory tract (even if rapid streptococcal antigen testing and throat culture are negative).  Oral alternatives can be given for IM penicillin unavailability (eg, amoxicillin) or allergy (eg, azithromycin).</p>
        <p>Additional management is primarily symptomatic and includes nonsteroidal anti-inflammatory drugs for joint inflammation or corticosteroids for severe chorea.  Carditis is also managed symptomatically (eg, angiotensin- converting enzyme inhibitors, diuretics for heart failure).</p>
        <h3>Long-term management</h3>
        <p>Patients with a history of ARF are at <strong>high risk for recurrence and progression of rheumatic heart disease (RHD)</strong> with repeated episodes of GAS pharyngitis.  Therefore, all patients should receive <strong>prophylaxis</strong> with intramuscular <strong>benzathine penicillin G</strong> every 4 weeks to prevent recurrence.  Oral alternatives can be given for IM penicillin unavailability (eg, oral penicillin V) or allergy (eg, azithromycin).</p>
        <p>The total duration of antibiotic prophylaxis ranges from 5 years to lifelong, depending on the severity and persistence of heart disease (<a class="l1r-ref" data-ref="table-1">table 1</a>).</p>

        <h2>COMPLICATIONS</h2>
        <p>RHD is characterized by permanent valvular damage (eg, <strong>mitral regurgitation/stenosis</strong>) resulting from one or more episodes of ARF.  It is usually identified 10-20 years after the initial diagnosis of ARF, though it can present much earlier, particularly in those with cumulative damage from recurrent ARF episodes.  The greatest risk factor for development of chronic valvular damage is the presence of carditis during ARF.</p>
        <p>The mitral valve is the most commonly affected in RHD and gradually thickens, fibroses, and calcifies, causing symptoms of heart failure (eg, dyspnea) and, less commonly, cardioembolic stroke.  Management typically involves valvotomy or more invasive surgical intervention.</p>
        <p>Many patients have morphologic evidence of RHD without a previous ARF diagnosis, presumably due to a missed diagnosis or mild initial disease.  Calcification primarily affecting the valve commissures with lesser involvement of the annulus is characteristic of RHD, which contrasts with age-related calcification primarily affecting the posterior mitral annulus (<a class="l1r-ref" data-ref="figure-2">figure 2</a>).  Mitral valve prolapse due to RHD, usually due to prolapse of the anterior mitral valve, must also be differentiated from myxomatous degeneration, which is usually due to prolapse of the posterior mitral valve and is far more common than RHD in resource-rich regions.</p>

        <h2>PROGNOSIS</h2>
        <p>Most organs are often only mildly and transiently affected in ARF, with the exception of the heart; without carditis, full recovery is expected provided the patient adheres to appropriate prophylactic therapy.</p>
        <p>With carditis, severe regurgitation and/or myocarditis during acute inflammation can lead to cardiac dilation, heart failure, and death in a small percentage of patients.  The risk of RHD increases over time.</p>

        <h2>PREVENTION</h2>
        <h3>Primary prevention</h3>
        <p>Prevention of ARF is via prompt treatment of GAS pharyngitis with antibiotics (<a class="l1r-ref" data-ref="table-2">table 2</a>).  Oral penicillin V for 10 days is the treatment of choice for streptococcal pharyngitis; alternatives include a 10-day course of amoxicillin.  Penicillin-allergic patients can receive cephalosporins (mild reactions) or macrolides (severe, IgE-mediated reactions).</p>
        <h3>Secondary prevention</h3>
        <p>Patients with ARF should receive long-acting, IM benzathine penicillin G every month for ≥5 years; duration may be lifelong for those with severe, persistent RHD.</p>

        <h2>SUMMARY</h2>
        <p>Acute rheumatic fever is a multisystem, autoimmune complication of untreated group A streptococcal pharyngitis (<a class="l1r-ref" data-ref="table-3">table 3</a>).  Major manifestations include arthritis, pancarditis, Sydenham chorea, erythema marginatum, and subcutaneous nodules.  Acute treatment includes a single intramuscular dose of benzathine penicillin G; secondary prevention includes long-term antibiotic therapy to prevent recurrences and progression to rheumatic heart disease (chronic valvular disease).</p>

        <h3>TAGS</h3>
        <p class="l1r-tags"><span>Allergy &amp; Immunology</span><span>Cardiovascular System</span><span>Infectious Diseases</span></p>
      `
    },

    pt: {
      title: 'Febre reumática aguda',
      html: `
        <h2>INTRODUÇÃO</h2>
        <p>A febre reumática aguda (ARF) é uma doença autoimune que se desenvolve após a faringite não tratada com <em>Streptococcus</em> do grupo A (GAS). Afeta mais comumente crianças e adolescentes com manifestações importantes, incluindo artrite, pancardite, coreia de Sydenham, eritema marginal e nódulos subcutâneos.</p>

        <h2>PATOGÊNESE</h2>
        <p>A ARF é uma <strong>complicação não supurativa e imunomediada</strong> de uma <strong>faringite</strong> não tratada do <strong>grupo A <em>Streptococcus</em> (GAS).</strong> Anticorpos contra GAS reagem cruzadamente com tecidos hospedeiros devido ao mimetismo molecular entre antígenos GAS e antígenos cardíacos e do sistema nervoso central (<a class="l1r-ref" data-ref="figure-1">figura 1</a>). Especificamente, anticorpos direcionados contra antígenos GAS (por exemplo, <strong>proteína M</strong>) atacam proteínas cardíacas (por exemplo, miosina) e proteínas de superfície celular neuronal (por exemplo, lisogangliosídeo nos gânglios basais).</p>
        <p>A morbidade e a mortalidade estão relacionadas principalmente à inflamação do endocárdio, miocárdio e epicárdio. A ARF está associada ao desenvolvimento de granulomas intersticiais cardíacos que consistem em linfócitos e macrófagos, bem como células gigantes multinucleadas espalhadas, ou <strong>corpos de Aschoff</strong>, na histologia (<a class="l1r-ref" data-ref="image-1">imagem 1</a>); macrófagos carnudos com citoplasma abundante e fitas de cromatina centrais e finas chamadas células de Anitschkow (ou lagarta) também estão frequentemente presentes. Nos anos subsequentes, os corpos de Aschoff podem ser substituídos por tecido cicatricial fibroso, levando à estenose crônica da válvula mitral e regurgitação.</p>

        <h2>FATORES DE RISCO</h2>
        <ul>
          <li>Regiões com recursos limitados devido à superlotação e acesso limitado a cuidados de saúde</li>
          <li>Idade 5-15</li>
        </ul>

        <h2>APRESENTAÇÃO CLÍNICA</h2>
        <p>As manifestações de IRA normalmente começam <strong>2-4 semanas após</strong> um episódio de faringite GAS, cujos sintomas (por exemplo, dor de garganta) podem ter sido leves e são tipicamente auto-resolvíveis. Os sintomas de apresentação mais comuns de IRA são febre e artrite. Os recursos abrangentes são categorizados por manifestações maiores e menores para fins de diagnóstico (ou seja, <strong>critérios de Jones</strong>) e incluem o seguinte:</p>
        <h3>Principais critérios</h3>
        <ul>
          <li><strong>E</strong>nvolvimento articular: A artrite é frequentemente a primeira manifestação da IRA e normalmente começa em grandes articulações (por exemplo, joelhos, tornozelos, cotovelos). Uma articulação é geralmente afetada primeiro, com outras articulações desenvolvendo inflamação sequencialmente (ou seja, artrite migratória). A inflamação é transitória e normalmente dura de dias a uma semana por articulação.</li>
          <li><strong>O ♥</strong> (cardite): A inflamação do endocárdio, miocárdio e epicárdio (ou seja, pancardite) manifesta-se mais comumente como disfunção valvular, especificamente <strong>regurgitação aguda da válvula mitral</strong> com um novo sopro holossistólico. Sinais vitais alterados (taquicardia, taquipneia, hipotensão) e atrito pericárdico podem ser observados.</li>
          <li><strong>N</strong>ódulos (subcutâneos): Essas lesões pequenas, firmes e indolores ocorrem mais comumente na superfície extensora de proeminências ósseas (por exemplo, cotovelo).</li>
          <li><strong>E</strong>ritema marginal (<a class="l1r-ref" data-ref="image-2">imagem 2</a>): Essa erupção se apresenta como lesões circulares, não pruriginosas, discretamente eritematosas, com clareira central, que vêm e vão no tronco e nas extremidades.</li>
          <li><strong>C</strong>oreia de Sydenham: A coreia tem o maior período de latência, ocorrendo 1-8 meses após a faringite GAS; é a causa adquirida mais comum de coreia em crianças. Os sintomas incluem movimentos não rítmicos (irregulares), involuntários e rápidos das mãos, pés e face (por exemplo, caretas). Os pacientes também podem apresentar fraqueza muscular associada com fase de relaxamento retardada do reflexo patelar. Além disso, o desvio pronador (hiperpronação involuntária dos braços estendidos) está frequentemente presente. Outros achados associados incluem labilidade emocional, queda no desempenho escolar e mudanças súbitas no tom e volume da voz.</li>
        </ul>
        <h3>Critérios menores</h3>
        <ul>
          <li>Febre</li>
          <li>Artralgia</li>
          <li>Marcadores inflamatórios elevados (ou seja, proteína C reativa [PCR], velocidade de hemossedimentação [VHS])</li>
          <li>Intervalo PR prolongado no ECG</li>
        </ul>

        <h2>AVALIAÇÃO</h2>
        <p>A avaliação de suspeita de ARF com base nos achados clínicos inclui o seguinte:</p>
        <p><strong>Estudos laboratoriais</strong>: Os marcadores inflamatórios (ou seja, PCR, VHS) estão frequentemente elevados e refletem inflamação sistêmica. O hemograma completo pode revelar anemia e leucocitose.</p>
        <p><strong>Estudos cardíacos</strong>: O ECG pode revelar um intervalo PR prolongado, e a ecocardiografia frequentemente mostra regurgitação valvular (mais comumente mitral, seguida pela aórtica). A radiografia de tórax pode mostrar cardiomegalia.</p>

        <h2>DIAGNÓSTICO</h2>
        <p>O diagnóstico de ARF geralmente requer <strong>ambos</strong> os seguintes:</p>
        <ul>
          <li><strong>Dois critérios maiores</strong> OU <strong>um maior e dois menores</strong> critérios de Jones. No entanto, a presença de cardite indolente (ou seja, lentamente progressiva) ou coreia de Sydenham isoladamente também é considerada suficiente devido à alta probabilidade de ARF em crianças com esses sintomas.</li>
          <li><strong>Evidência laboratorial de infecção recente por GAS</strong>. Títulos elevados de anticorpos antiestreptocócicos (por exemplo, antiestreptolisina O) ou anticorpos anti-DNAse B são os mais comumente utilizados; uma cultura de garganta positiva ou teste rápido de antígeno estreptocócico também é suficiente, mas ambos costumam ser negativos no início dos sintomas de ARF.</li>
        </ul>

        <h2>DIAGNÓSTICO DIFERENCIAL</h2>
        <p>O diagnóstico diferencial da ARF depende do sintoma manifestante primário.</p>
        <h3>Artrite</h3>
        <ul>
          <li><strong>Artrite idiopática juvenil sistêmica</strong>: Sintomas sistêmicos (por exemplo, febre, erupção cutânea) com artrite são típicos. A artrite não é transitória e migratória, mas, ao contrário, persiste nas articulações afetadas por &gt;6 semanas.</li>
          <li><strong>Lúpus eritematoso sistêmico</strong>: Artrite e marcadores inflamatórios elevados (por exemplo, PCR, VHS) são típicos dessa doença autoimune que afeta múltiplos sistemas orgânicos. Outros sintomas esperados incluem erupção malar, úlceras orais e anormalidades renais (por exemplo, proteinúria, hematúria).</li>
          <li><strong>Artrite reativa pós-infecciosa</strong>: Uma oligoartrite assimétrica pode se apresentar semanas após infecção gastrointestinal ou geniturinária inicial (por exemplo, diarreia, uretrite). A maioria dos pacientes são adultos jovens sem manifestações cardíacas.</li>
          <li><strong>Púrpura de Henoch-Schönlein</strong> (<a class="l1r-ref" data-ref="image-3">imagem 3</a>): Essa vasculite pode causar artrite migratória transitória e erupção cutânea. No entanto, a erupção é purpúrica e dor abdominal e/ou envolvimento renal (por exemplo, hematúria) é típico.</li>
          <li><strong>Doença de Lyme</strong> (<a class="l1r-ref" data-ref="image-4">imagem 4</a>): Essa doença transmitida por carrapatos pode se apresentar com erupção cutânea e artrite. A erupção consiste em lesões únicas ou múltiplas em alvo (eritema migrans) que se expandem lentamente, e a artrite é geralmente monoarticular (por exemplo, apenas joelho).</li>
          <li><strong>Infecção por parvovírus B19</strong> (<a class="l1r-ref" data-ref="image-5">imagem 5</a>): Os sintomas dessa infecção podem incluir artrite aguda e simétrica de pequenas articulações (por exemplo, mãos) com ou sem a característica erupção em "bochecha esbofeteada". Artrite de grandes articulações e coreia não são observadas.</li>
        </ul>
        <h3>Cardite</h3>
        <ul>
          <li><strong>Endocardite infecciosa</strong>: Febre e um novo sopro com sinais de insuficiência cardíaca aguda (por exemplo, dispneia) são sintomas clássicos de apresentação. Artrite migratória não é observada, e a maioria das crianças tem um fator de risco prévio (por exemplo, cardiopatia congênita).</li>
          <li><strong>Miocardite/pericardite infecciosa</strong>: Infecções virais comuns (por exemplo, vírus Coxsackie) estão associadas a cardite em crianças. O vírus Coxsackie causa faringite vesicular (herpangina) em crianças pequenas. Artrite, erupção cutânea e coreia não são achados associados.</li>
        </ul>

        <h2>CONDUTA</h2>
        <h3>Conduta aguda</h3>
        <p>O tratamento de primeira linha da ARF é uma dose única intramuscular (IM) de <strong>penicilina G benzatina</strong> para erradicar a infecção por GAS no trato respiratório superior (mesmo se o teste rápido de antígeno estreptocócico e a cultura de garganta forem negativos). Alternativas orais podem ser administradas em caso de indisponibilidade da penicilina IM (por exemplo, amoxicilina) ou alergia (por exemplo, azitromicina).</p>
        <p>A conduta adicional é principalmente sintomática e inclui anti-inflamatórios não esteroidais para inflamação articular ou corticosteroides para coreia grave. A cardite também é tratada sintomaticamente (por exemplo, inibidores da enzima conversora de angiotensina, diuréticos para insuficiência cardíaca).</p>
        <h3>Conduta de longo prazo</h3>
        <p>Pacientes com história de ARF apresentam <strong>alto risco de recorrência e progressão para doença cardíaca reumática (DCR)</strong> com episódios repetidos de faringite GAS. Portanto, todos os pacientes devem receber <strong>profilaxia</strong> com <strong>penicilina G benzatina</strong> intramuscular a cada 4 semanas para prevenir recorrência. Alternativas orais podem ser administradas em caso de indisponibilidade da penicilina IM (por exemplo, penicilina V oral) ou alergia (por exemplo, azitromicina).</p>
        <p>A duração total da profilaxia antibiótica varia de 5 anos a vitalícia, dependendo da gravidade e persistência da doença cardíaca (<a class="l1r-ref" data-ref="table-1">tabela 1</a>).</p>

        <h2>COMPLICAÇÕES</h2>
        <p>A DCR é caracterizada por lesão valvular permanente (por exemplo, <strong>regurgitação/estenose mitral</strong>) resultante de um ou mais episódios de ARF. Geralmente é identificada 10-20 anos após o diagnóstico inicial de ARF, embora possa se apresentar muito mais cedo, particularmente naqueles com dano cumulativo de episódios recorrentes de ARF. O maior fator de risco para o desenvolvimento de lesão valvular crônica é a presença de cardite durante a ARF.</p>
        <p>A válvula mitral é a mais comumente afetada na DCR e gradualmente espessa, fibrosa e calcifica, causando sintomas de insuficiência cardíaca (por exemplo, dispneia) e, menos comumente, acidente vascular cerebral cardioembólico. A conduta normalmente envolve valvotomia ou intervenção cirúrgica mais invasiva.</p>
        <p>Muitos pacientes têm evidência morfológica de DCR sem diagnóstico prévio de ARF, presumivelmente devido a um diagnóstico não realizado ou doença inicial leve. A calcificação que afeta principalmente as comissuras valvares com menor envolvimento do anel é característica da DCR, o que contrasta com a calcificação relacionada à idade que afeta principalmente o anel mitral posterior (<a class="l1r-ref" data-ref="figure-2">figura 2</a>). O prolapso da válvula mitral devido à DCR, geralmente por prolapso da válvula mitral anterior, também deve ser diferenciado da degeneração mixomatosa, que geralmente se deve ao prolapso da válvula mitral posterior e é muito mais comum que a DCR em regiões com muitos recursos.</p>

        <h2>PROGNÓSTICO</h2>
        <p>A maioria dos órgãos é frequentemente afetada apenas de forma leve e transitória na ARF, com exceção do coração; sem cardite, a recuperação completa é esperada desde que o paciente adira à terapia profilática apropriada.</p>
        <p>Com cardite, a regurgitação grave e/ou miocardite durante a inflamação aguda pode levar a dilatação cardíaca, insuficiência cardíaca e morte em uma pequena porcentagem de pacientes. O risco de DCR aumenta ao longo do tempo.</p>

        <h2>PREVENÇÃO</h2>
        <h3>Prevenção primária</h3>
        <p>A prevenção da ARF se dá pelo tratamento imediato da faringite GAS com antibióticos (<a class="l1r-ref" data-ref="table-2">tabela 2</a>). A penicilina V oral por 10 dias é o tratamento de escolha para faringite estreptocócica; as alternativas incluem um curso de 10 dias de amoxicilina. Pacientes alérgicos à penicilina podem receber cefalosporinas (reações leves) ou macrolídeos (reações graves mediadas por IgE).</p>
        <h3>Prevenção secundária</h3>
        <p>Pacientes com ARF devem receber penicilina G benzatina IM de ação prolongada mensalmente por ≥5 anos; a duração pode ser vitalícia para aqueles com DCR grave e persistente.</p>

        <h2>RESUMO</h2>
        <p>A febre reumática aguda é uma complicação autoimune multissistêmica da faringite estreptocócica do grupo A não tratada (<a class="l1r-ref" data-ref="table-3">tabela 3</a>). As manifestações maiores incluem artrite, pancardite, coreia de Sydenham, eritema marginal e nódulos subcutâneos. O tratamento agudo inclui uma dose única intramuscular de penicilina G benzatina; a prevenção secundária inclui terapia antibiótica de longo prazo para prevenir recorrências e progressão para doença cardíaca reumática (doença valvular crônica).</p>

        <h3>TAGS</h3>
        <p class="l1r-tags"><span>Alergia e Imunologia</span><span>Sistema Cardiovascular</span><span>Doenças Infecciosas</span></p>
      `
    }
  }

};
})();
