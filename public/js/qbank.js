/* CoupleMed — QBank v1
   ============================================================================
   Módulo de banco de questões para USMLE Step 1.
   Arquitetura de 2 camadas: toda persistência passa por QB.store, que hoje usa
   localStorage e amanhã troca para a API D1 (worker.js /api/qbank/*) sem mexer na UI.

   Cobre nesta v1:
   - Parte 2  Create Test (filtros combináveis + contador dinâmico)
   - Parte 3  Tela de resolução (strikethrough, flag, lab values, grid colorido, End Block)
   - Parte 4  Sistema de passes (pass_number calculado por attempts; nunca sobrescreve)
   - Parte 5  Causa-raiz do erro (modal 5 tags) + Surgical Review
   - Parte 6/15 SmartCards: "Add to Flashcards" grava no mesmo banco do módulo Flashcards
   - Parte 7  Analytics (overview, por sistema, comparação por pass, causa-raiz)
   Próximos: import pipeline (Parte 16 UI), self-assessments (Parte 8), study planner (Parte 9).
   ============================================================================ */
(function(){
  'use strict';
  const params = new URLSearchParams(location.search);
  const PAGE = params.get('page') || 'home';
  const QB_PAGES = ['qbank-1','qbank1-pass-1','qbank1-pass-2','qbank1-pass-3','qbank1-pass-4'];
  const USER = params.get('u') || 'guest1';
  const KEY = `couplemed_qb_${USER}`;
  const FC_KEY = `couplemed_fc_${USER}`;
  const PREF_KEY = `couplemed_prefs_${USER}`;

  /* preferências do usuário definidas em Settings (v51). Apenas o PADRÃO inicial
     do Create Test — os controles na tela continuam livres para alterar. */
  function qbPrefDefaults(){
    let p={};
    try{ p = JSON.parse(localStorage.getItem(PREF_KEY))||{}; }catch(e){}
    const qb = p.qbank||{};
    return {
      mode:  qb.mode==='timed' ? 'timed' : 'tutor',
      count: Math.max(1, Math.min(40, parseInt(qb.count,10)||10)),
      peer:  qb.peer===false ? false : true
    };
  }

  /* ======================= SEED (questões originais) =======================
     Substituível pelo pipeline de importação (Parte 16) ou pela API D1.
     Cada questão: vinheta estilo NBME, 5 alternativas, explicações e peer stats. */
  const SEED = [
    { id:'q_cv_as', system:'cardiovascular', discipline:'pathophysiology', category:'cardiovascular::valvular_heart_diseases', difficulty:'easy',
      vignette:'A 72-year-old man is evaluated for two episodes of syncope during exertion over the past month. He also reports dyspnea on climbing stairs. On auscultation there is a harsh crescendo-decrescendo systolic murmur best heard at the right upper sternal border, radiating to both carotids. The murmur intensity decreases with handgrip. Peripheral pulses are delayed and diminished (pulsus parvus et tardus).',
      q:'Which of the following is the most likely diagnosis?',
      options:[{label:'A',text:'Aortic stenosis'},{label:'B',text:'Mitral regurgitation'},{label:'C',text:'Hypertrophic obstructive cardiomyopathy'},{label:'D',text:'Aortic regurgitation'},{label:'E',text:'Mitral valve prolapse'}],
      correct:'A',
      explC:'The triad of exertional syncope, a crescendo-decrescendo systolic murmur radiating to the carotids, and pulsus parvus et tardus is classic for severe aortic stenosis. The murmur is a systolic ejection murmur produced by turbulent flow across a narrowed valve; handgrip (↑afterload) decreases the gradient and softens the murmur.',
      explI:[{option:'B',explanation:'Mitral regurgitation produces a holosystolic murmur at the apex radiating to the axilla, not to the carotids, and it increases with handgrip.'},{option:'C',explanation:'HOCM murmur increases with maneuvers that decrease preload (Valsalva, standing) and decreases with handgrip — but it does not cause pulsus parvus et tardus; the carotid upstroke is brisk/bifid.'},{option:'D',explanation:'Aortic regurgitation is a diastolic decrescendo murmur with a wide pulse pressure and bounding pulses — the opposite of the diminished pulses here.'},{option:'E',explanation:'MVP causes a mid-systolic click followed by a late systolic murmur, not the described ejection quality with carotid radiation.'}],
      objective:'Recognize severe aortic stenosis by exertional syncope, an ejection systolic murmur radiating to the carotids, and pulsus parvus et tardus.',
      peer:{A:71,B:9,C:12,D:5,E:3} },

    { id:'q_resp_emph', system:'pulmonary_critical_care', discipline:'pathology', category:'pulmonary_critical_care::obstructive_lung', difficulty:'medium',
      vignette:'A 66-year-old man with a 45-pack-year smoking history reports progressive exertional dyspnea. He is thin, sits leaning forward, and breathes through pursed lips. The chest is hyperresonant with diminished breath sounds and a prolonged expiratory phase. Chest imaging shows hyperinflation with a flattened diaphragm and increased retrosternal air space. Arterial blood gas is near normal at rest.',
      q:'Which pathologic process best explains these findings?',
      options:[{label:'A',text:'Destruction of alveolar walls distal to the terminal bronchiole'},{label:'B',text:'Hyperplasia of bronchial submucosal glands'},{label:'C',text:'Non-caseating granulomas in the interstitium'},{label:'D',text:'Diffuse alveolar damage with hyaline membranes'},{label:'E',text:'Reversible bronchospasm from mast cell degranulation'}],
      correct:'A',
      explC:'The "pink puffer" phenotype — thin, pursed-lip breathing, hyperinflation, near-normal gas exchange — reflects emphysema: destruction of alveolar septa distal to the terminal bronchiole, loss of elastic recoil, and air trapping. Centriacinar emphysema is the smoking-related pattern.',
      explI:[{option:'B',explanation:'Submucosal gland hyperplasia (↑Reid index) defines chronic bronchitis — the "blue bloater" with productive cough, not the hyperinflated thin patient here.'},{option:'C',explanation:'Non-caseating granulomas suggest sarcoidosis, which causes restrictive interstitial disease and bilateral hilar adenopathy, not hyperinflation.'},{option:'D',explanation:'Diffuse alveolar damage with hyaline membranes is ARDS — an acute process with hypoxemia, not a chronic smoker phenotype.'},{option:'E',explanation:'Reversible bronchospasm describes asthma; airflow obstruction here is fixed and structural.'}],
      objective:'Attribute the emphysema ("pink puffer") phenotype to destruction of alveolar walls distal to the terminal bronchiole with loss of elastic recoil.',
      peer:{A:64,B:20,C:4,D:5,E:7} },

    { id:'q_renal_hyperk', system:'renal_urinary', discipline:'physiology', category:'renal_urinary::fluid_electrolytes_acidbase', difficulty:'medium',
      vignette:'A 59-year-old man with end-stage renal disease missed his last two dialysis sessions. He presents with weakness and palpitations. Serum potassium is 7.2 mEq/L. The ECG shows peaked T waves, a widened QRS, and loss of P waves.',
      q:'Which is the most appropriate immediate next step in management?',
      options:[{label:'A',text:'Intravenous calcium gluconate'},{label:'B',text:'Intravenous regular insulin with dextrose'},{label:'C',text:'Nebulized albuterol'},{label:'D',text:'Oral sodium polystyrene sulfonate'},{label:'E',text:'Urgent hemodialysis'}],
      correct:'A',
      explC:'With ECG changes of hyperkalemia, the FIRST step is IV calcium to stabilize the cardiac membrane. Calcium raises the threshold potential and antagonizes the depolarizing effect of potassium within minutes; it does not lower serum K+ but prevents lethal arrhythmia while other measures take effect.',
      explI:[{option:'B',explanation:'Insulin+dextrose shifts K+ intracellularly and is essential, but it is given AFTER membrane stabilization because it takes longer to act and does not immediately protect the myocardium.'},{option:'C',explanation:'Albuterol also shifts K+ intracellularly but is adjunctive and slower than membrane stabilization.'},{option:'D',explanation:'Cation-exchange resins remove K+ from the body over hours and do nothing for the acute arrhythmia risk.'},{option:'E',explanation:'Dialysis is the definitive treatment for total-body potassium in ESRD, but it takes time to arrange; calcium must be given first when ECG changes are present.'}],
      objective:'When hyperkalemia produces ECG changes, give IV calcium first to stabilize the myocardium before shifting or removing potassium.',
      peer:{A:52,B:31,C:2,D:4,E:11} },

    { id:'q_id_gc', system:'infectious_diseases', discipline:'microbiology', category:'infectious_diseases::hiv_sti', difficulty:'easy',
      vignette:'A 24-year-old sexually active man presents with dysuria and a purulent urethral discharge for three days. Gram stain of the discharge shows numerous neutrophils containing gram-negative diplococci.',
      q:'Which organism is the most likely cause?',
      options:[{label:'A',text:'Neisseria gonorrhoeae'},{label:'B',text:'Chlamydia trachomatis'},{label:'C',text:'Treponema pallidum'},{label:'D',text:'Trichomonas vaginalis'},{label:'E',text:'Haemophilus ducreyi'}],
      correct:'A',
      explC:'Intracellular gram-negative diplococci within neutrophils on a Gram stain of urethral discharge are diagnostic of Neisseria gonorrhoeae. It is oxidase-positive and grows on Thayer-Martin agar. Empiric therapy also covers Chlamydia because of frequent co-infection.',
      explI:[{option:'B',explanation:'Chlamydia is an obligate intracellular organism that does not Gram stain (no classic peptidoglycan wall); it causes a similar but often milder, clear discharge.'},{option:'C',explanation:'Treponema pallidum causes syphilis (painless chancre) and is not seen on Gram stain — it requires darkfield microscopy.'},{option:'D',explanation:'Trichomonas is a flagellated protozoan seen on wet mount, not a diplococcus.'},{option:'E',explanation:'H. ducreyi causes chancroid (painful genital ulcers), described as a "school of fish" on Gram stain, not urethritis with intracellular diplococci.'}],
      objective:'Identify Neisseria gonorrhoeae from intracellular gram-negative diplococci in neutrophils on urethral Gram stain.',
      peer:{A:78,B:14,C:3,D:3,E:2} },

    { id:'q_endo_graves', system:'endocrine', discipline:'pathophysiology', category:'endocrine::thyroid_disorders', difficulty:'medium',
      vignette:'A 32-year-old woman reports a 6-kg weight loss despite increased appetite, palpitations, heat intolerance, and anxiety over three months. On exam she has a fine resting tremor, warm moist skin, a diffusely enlarged nontender thyroid with a bruit, and bilateral proptosis. TSH is undetectable and free T4 is elevated.',
      q:'Which finding is most specific for the underlying diagnosis?',
      options:[{label:'A',text:'Proptosis (exophthalmos)'},{label:'B',text:'Fine resting tremor'},{label:'C',text:'Undetectable TSH'},{label:'D',text:'Weight loss with increased appetite'},{label:'E',text:'Heat intolerance'}],
      correct:'A',
      explC:'The picture is Graves disease, caused by stimulating anti-TSH-receptor antibodies. Ophthalmopathy (proptosis) results from autoantibody-driven inflammation and glycosaminoglycan deposition in retro-orbital tissue and occurs almost exclusively in Graves — making it the most specific feature. The other findings occur in any cause of thyrotoxicosis.',
      explI:[{option:'B',explanation:'Tremor is a general adrenergic manifestation of thyrotoxicosis from any cause.'},{option:'C',explanation:'Suppressed TSH occurs in all forms of primary hyperthyroidism and does not distinguish Graves from toxic nodule or thyroiditis.'},{option:'D',explanation:'Hypermetabolism with weight loss is nonspecific to the etiology.'},{option:'E',explanation:'Heat intolerance reflects the hypermetabolic state generally, not Graves specifically.'}],
      objective:'Recognize that thyroid ophthalmopathy is specific to Graves disease among the causes of thyrotoxicosis.',
      peer:{A:58,B:6,C:22,D:6,E:8} },

    { id:'q_neuro_levodopa', system:'nervous_system', discipline:'pharmacology', category:'nervous_system::neurodegenerative_dementias', difficulty:'medium',
      vignette:'A 68-year-old man has a resting pill-rolling tremor, cogwheel rigidity, bradykinesia, and a shuffling gait. He is started on a medication that is combined with carbidopa.',
      q:'What is the purpose of adding carbidopa to this therapy?',
      options:[{label:'A',text:'It inhibits peripheral DOPA decarboxylase, reducing peripheral side effects and increasing central levodopa delivery'},{label:'B',text:'It directly stimulates central dopamine receptors'},{label:'C',text:'It inhibits catechol-O-methyltransferase in the brain'},{label:'D',text:'It blocks central muscarinic receptors to reduce tremor'},{label:'E',text:'It crosses the blood-brain barrier to be converted to dopamine'}],
      correct:'A',
      explC:'Carbidopa inhibits peripheral aromatic L-amino acid (DOPA) decarboxylase but does not cross the blood-brain barrier. This decreases peripheral conversion of levodopa to dopamine, reducing nausea and hypotension while allowing more levodopa to reach the CNS.',
      explI:[{option:'B',explanation:'Direct dopamine-receptor agonism describes drugs like pramipexole/ropinirole, not carbidopa.'},{option:'C',explanation:'COMT inhibition is the mechanism of entacapone/tolcapone; carbidopa inhibits decarboxylase, not COMT.'},{option:'D',explanation:'Central antimuscarinic action describes benztropine/trihexyphenidyl used for tremor, not carbidopa.'},{option:'E',explanation:'Levodopa (not carbidopa) crosses the BBB and is converted to dopamine centrally; carbidopa acts only peripherally.'}],
      objective:'Explain that carbidopa blocks peripheral DOPA decarboxylase to reduce peripheral side effects and boost central levodopa availability.',
      peer:{A:61,B:8,C:18,D:6,E:7} },

    { id:'q_heme_ida', system:'heme_onc', discipline:'pathology', category:'heme_onc::rbc_disorders', difficulty:'easy',
      vignette:'A 41-year-old woman with heavy menstrual bleeding reports fatigue and pica (craving ice). Labs show hemoglobin 9.1 g/dL, MCV 74 fL, low serum ferritin, elevated total iron-binding capacity, and low transferrin saturation.',
      q:'Which is the most likely diagnosis?',
      options:[{label:'A',text:'Iron deficiency anemia'},{label:'B',text:'Anemia of chronic disease'},{label:'C',text:'Beta-thalassemia minor'},{label:'D',text:'Sideroblastic anemia'},{label:'E',text:'Vitamin B12 deficiency'}],
      correct:'A',
      explC:'Microcytic anemia with LOW ferritin, HIGH TIBC, and low transferrin saturation in a woman with menorrhagia and pica is iron deficiency. Low ferritin is highly specific because ferritin reflects total body iron stores; TIBC rises as the body upregulates transferrin.',
      explI:[{option:'B',explanation:'Anemia of chronic disease also causes microcytosis but with HIGH or normal ferritin and LOW TIBC (iron is sequestered), the opposite iron studies.'},{option:'C',explanation:'Thalassemia minor gives microcytosis with a normal/high RBC count and NORMAL iron studies; ferritin is not low.'},{option:'D',explanation:'Sideroblastic anemia typically shows HIGH ferritin and iron overload with ringed sideroblasts.'},{option:'E',explanation:'B12 deficiency causes a MACROcytic (high MCV) anemia, not microcytosis.'}],
      objective:'Distinguish iron deficiency (low ferritin, high TIBC) from other microcytic anemias using iron studies.',
      peer:{A:74,B:15,C:6,D:2,E:3} },

    { id:'q_gi_scc', system:'gi_nutrition', discipline:'pathophysiology', category:'gi_nutrition::tumors_gi', difficulty:'medium',
      vignette:'A 61-year-old man with a long history of tobacco and alcohol use reports difficulty swallowing solid foods for two months, now progressing to difficulty with liquids as well. He has lost 7 kg. Upper endoscopy reveals an irregular ulcerated mass in the mid-esophagus.',
      q:'Which is the most likely diagnosis?',
      options:[{label:'A',text:'Squamous cell carcinoma of the esophagus'},{label:'B',text:'Esophageal adenocarcinoma'},{label:'C',text:'Achalasia'},{label:'D',text:'Diffuse esophageal spasm'},{label:'E',text:'Eosinophilic esophagitis'}],
      correct:'A',
      explC:'Progressive dysphagia (solids → liquids) with weight loss and a mid-esophageal mass in a patient with tobacco AND alcohol use points to squamous cell carcinoma, which classically arises in the upper/middle third and is strongly linked to smoking and alcohol.',
      explI:[{option:'B',explanation:'Adenocarcinoma arises in the DISTAL esophagus from Barrett metaplasia due to chronic GERD/obesity, not the mid-esophagus in a smoker/drinker.'},{option:'C',explanation:'Achalasia causes dysphagia to solids AND liquids simultaneously from the start, with a "bird-beak" on barium study — not a discrete mass.'},{option:'D',explanation:'Diffuse esophageal spasm causes intermittent chest pain and dysphagia without a mass or progressive weight loss.'},{option:'E',explanation:'Eosinophilic esophagitis affects younger atopic patients with food impaction and concentric rings, not an ulcerated mass with weight loss.'}],
      objective:'Link progressive dysphagia, weight loss, and a mid-esophageal mass in a smoker/drinker to squamous cell carcinoma.',
      peer:{A:56,B:30,C:6,D:3,E:5} },

    { id:'q_gp_vongierke', system:'biochemistry', discipline:'biochem', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'A 5-month-old infant is brought in with a protuberant abdomen. Exam reveals marked hepatomegaly and doll-like facies. During a brief fast the infant becomes lethargic; labs show severe hypoglycemia, lactic acidosis, hyperuricemia, and hyperlipidemia. Ketones are present but the infant does not improve with glucagon.',
      q:'A deficiency of which enzyme best explains this presentation?',
      options:[{label:'A',text:'Glucose-6-phosphatase'},{label:'B',text:'Alpha-1,4-glucosidase (acid maltase)'},{label:'C',text:'Debranching enzyme'},{label:'D',text:'Muscle glycogen phosphorylase'},{label:'E',text:'Branching enzyme'}],
      correct:'A',
      explC:'Von Gierke disease (glycogen storage disease type I) results from glucose-6-phosphatase deficiency. Glucose cannot be released from the liver, so fasting causes severe hypoglycemia unresponsive to glucagon, with lactic acidosis, hyperuricemia, and hyperlipidemia, plus massive hepatomegaly.',
      explI:[{option:'B',explanation:'Acid maltase deficiency is Pompe disease (type II) — a lysosomal defect causing cardiomegaly and hypotonia, with normal blood glucose.'},{option:'C',explanation:'Debranching enzyme deficiency (Cori, type III) causes milder hypoglycemia WITHOUT lactic acidosis and with normal uric acid.'},{option:'D',explanation:'Muscle phosphorylase deficiency is McArdle disease (type V) — exercise intolerance and cramps, not fasting hypoglycemia.'},{option:'E',explanation:'Branching enzyme deficiency (Andersen, type IV) causes cirrhosis from abnormal glycogen, not the classic fasting-hypoglycemia triad.'}],
      objective:'Recognize von Gierke disease (G6Pase deficiency) by fasting hypoglycemia unresponsive to glucagon with lactic acidosis, hyperuricemia, and hepatomegaly.',
      peer:{A:49,B:14,C:20,D:9,E:8} },

    { id:'q_bioepi_null_mrsa', system:'biostatistics_epidemiology', discipline:'biostatistics', category:'biostatistics_epidemiology::hypothesis_testing', difficulty:'easy',
      vignette:'A group of researchers wants to identify factors related to hospital-acquired bacteremia caused by methicillin-resistant Staphylococcus aureus (MRSA). A total of 40 patients admitted to the ICU after developing MRSA bacteremia confirmed by blood cultures over the same time period were enrolled. During the same period, 80 control patients admitted to the ICU who did not develop bacteremia were randomly selected. The frequency of factors such as central venous catheter use, urinary catheter placement, and surgical site infections in the days prior to the diagnosis of bacteremia were compared between the 2 groups.',
      q:'Which of the following is the most appropriate null hypothesis for this study?',
      options:[{label:'A',text:'Hazard ratio is equal to 1'},{label:'B',text:'Hazard ratio is not equal to 1'},{label:'C',text:'Odds ratio is equal to 1'},{label:'D',text:'Odds ratio is not equal to 1'},{label:'E',text:'Relative risk is not equal to 1'}],
      correct:'C',
      explC:'A statistical hypothesis is an initial assumption (that may or may not be true) regarding population parameters (e.g., mean values in two different groups) in a study. The null hypothesis (H₀) is a statement of no difference or no association. The alternative hypothesis (H₁) is a statement of difference or association. In this study, patients with and without MRSA bacteremia are identified based on the results of blood cultures and then traced back in time to identify prior exposures — this design is a case-control study. The appropriate measure of association for case-control studies is the odds ratio (OR). OR = 1 indicates that the odds of exposure are the same among cases and controls, meaning exposure is NOT associated with disease. OR > 1 or < 1 indicates that the odds of exposure differ between cases and controls, implying an association with disease. Because H₀ is a statement of no association, the most appropriate null hypothesis is that the odds ratio is equal to 1 (Choice C).',
      explI:[{option:'A',explanation:'The hazard ratio is used in survival analyses (e.g., cohort studies with time-to-event outcomes). Although "hazard ratio = 1" is a valid null hypothesis in that context, this study is a case-control design that uses the odds ratio as its measure of association, not the hazard ratio.'},{option:'B',explanation:'This represents the alternative hypothesis (H₁) in a survival analysis — a statement that the hazard ratio differs from 1. Furthermore, hazard ratios are not the appropriate measure of association for case-control studies.'},{option:'D',explanation:'OR ≠ 1 represents the alternative hypothesis (H₁): it states that the odds of exposure differ between cases and controls, implying an association with disease. H₁ is not the null hypothesis.'},{option:'E',explanation:'Relative risk is the appropriate measure of association in cohort (prospective) studies, not case-control studies. Additionally, RR ≠ 1 represents the alternative hypothesis, not the null hypothesis.'}],
      objective:'Identify the appropriate null hypothesis for a case-control study: because case-control studies use the odds ratio as their measure of association, and H₀ states no association, the null hypothesis is OR = 1.',
      peer:{A:3,B:2,C:72,D:14,E:9},
      ptTranslation:{vignette:'Um grupo de pesquisadores quer identificar fatores relacionados à bacteremia hospitalar causada por Staphylococcus aureus resistente à meticilina (MRSA). Um total de 40 pacientes internados na UTI que desenvolveram bacteremia por MRSA confirmada por hemoculturas foram incluídos. No mesmo período, 80 pacientes controles internados na UTI que não desenvolveram bacteremia foram selecionados aleatoriamente. A frequência de fatores como uso de cateter venoso central, sondagem vesical e infecção de sítio cirúrgico nos dias anteriores ao diagnóstico de bacteremia foi comparada entre os 2 grupos.',q:'Qual das seguintes é a hipótese nula mais apropriada para este estudo?',objective:'Identificar a hipótese nula adequada para um estudo caso-controle: como esses estudos usam a razão de chances como medida de associação e H₀ afirma ausência de associação, a hipótese nula é RC = 1.',
      options:[{label:'A',text:'A razão de risco é igual a 1'},{label:'B',text:'A razão de risco não é igual a 1'},{label:'C',text:'A razão de chances é igual a 1'},{label:'D',text:'A razão de chances não é igual a 1'},{label:'E',text:'O risco relativo não é igual a 1'}],
      explC:'Uma hipótese estatística é uma suposição inicial (que pode ou não ser verdadeira) sobre os parâmetros populacionais em um estudo. A hipótese nula (H₀) é uma afirmação de ausência de diferença ou associação. A hipótese alternativa (H₁) é uma afirmação de diferença ou associação. Neste estudo, pacientes com e sem bacteremia por MRSA são identificados com base nos resultados das hemoculturas e rastreados retrospectivamente para identificar exposições anteriores — caracterizando um estudo caso-controle. A medida de associação utilizada em estudos caso-controle é a razão de chances (RC ou OR). RC = 1 indica que as chances de exposição são iguais entre casos e controles, ou seja, a exposição NÃO está associada à doença. RC > 1 ou < 1 indica que as chances de exposição diferem entre casos e controles, sugerindo associação com a doença. Como H₀ é uma afirmação de ausência de associação, a hipótese nula mais adequada é que a razão de chances é igual a 1 (Alternativa C).',
      explI:[{option:'A',explanation:'A razão de risco (hazard ratio) é utilizada em análises de sobrevivência (p. ex., estudos de coorte com desfechos tempo-até-evento). Embora "razão de risco = 1" seja uma hipótese nula válida nesse contexto, este estudo é um caso-controle que utiliza a razão de chances como medida de associação, não a razão de risco.'},{option:'B',explanation:'Isso representa a hipótese alternativa (H₁) em uma análise de sobrevivência — uma afirmação de que a razão de risco difere de 1. Além disso, a razão de risco não é a medida de associação adequada para estudos caso-controle.'},{option:'D',explanation:'RC ≠ 1 representa a hipótese alternativa (H₁): afirma que as chances de exposição diferem entre casos e controles, sugerindo associação com a doença. H₁ não é a hipótese nula.'},{option:'E',explanation:'O risco relativo é a medida de associação adequada para estudos de coorte (prospectivos), não para estudos caso-controle. Além disso, RR ≠ 1 representa a hipótese alternativa, não a hipótese nula.'}]} },

    { id:'q_psych_mdd', system:'psychiatric_behavioral', discipline:'behavioral_science', category:'psychiatric_behavioral::mood_disorders', difficulty:'easy',
      vignette:'A 29-year-old woman reports six weeks of depressed mood and loss of interest in activities she used to enjoy. She also describes insomnia, poor concentration, low energy, feelings of worthlessness, and a 4-kg unintentional weight loss. She denies manic episodes, substance use, and has a normal physical exam and TSH.',
      q:'Which is the most likely diagnosis?',
      options:[{label:'A',text:'Major depressive disorder'},{label:'B',text:'Persistent depressive disorder (dysthymia)'},{label:'C',text:'Adjustment disorder with depressed mood'},{label:'D',text:'Bipolar II disorder'},{label:'E',text:'Normal grief'}],
      correct:'A',
      explC:'At least five SIG E CAPS symptoms (including depressed mood or anhedonia) present most of the day for ≥2 weeks meets criteria for major depressive disorder. This patient has depressed mood, anhedonia, insomnia, poor concentration, low energy, worthlessness, and weight change over six weeks.',
      explI:[{option:'B',explanation:'Persistent depressive disorder requires depressed mood for ≥2 YEARS with fewer acute symptoms; six weeks is too short.'},{option:'C',explanation:'Adjustment disorder requires an identifiable stressor and does not meet full MDD criteria; none is described here.'},{option:'D',explanation:'Bipolar II requires at least one hypomanic episode, which she explicitly denies.'},{option:'E',explanation:'Grief is tied to a specific loss and centers on the deceased; there is no bereavement described.'}],
      objective:'Apply DSM-5 criteria (≥5 SIG E CAPS symptoms for ≥2 weeks) to diagnose major depressive disorder.',
      peer:{A:70,B:12,C:10,D:5,E:3} },

    // ═══════════════════════════════════════════════════════════════
    // BATCH 01 — Male Reproductive System (10 questions)
    // ═══════════════════════════════════════════════════════════════
    { id:'CMQ-STEP1-MRS-0001', system:'male_repro', discipline:'microbiology', category:'male_repro::disorders_male_repro', difficulty:'easy',
      vignette:'A 24-year-old man comes to the office due to 2 days of burning pain with urination. The patient has also had increased urinary frequency over the past few days. He has had no fever, chills, nausea, vomiting, flank pain, or penile discharge. The patient is sexually active with his longtime boyfriend. Vital signs are within normal limits. Physical examination shows mild suprapubic tenderness. There is no costovertebral angle tenderness. The penis is uncircumcised. Laboratory results are as follows:\n\nUrinalysis:\nSpecific gravity: 1.016\npH: 5\nBlood: negative\nLeukocyte esterase: positive\nNitrites: positive',
      q:'Based on the urinalysis results, which of the following organisms is the most likely cause of this patient\'s illness?',
      options:[{label:'A',text:'Candida albicans'},{label:'B',text:'Enterococcus faecalis'},{label:'C',text:'Escherichia coli'},{label:'D',text:'Herpes simplex virus'},{label:'E',text:'Proteus mirabilis'},{label:'F',text:'Staphylococcus saprophyticus'}],
      correct:'C',
      explC:'Dysuria in sexually active male patients is most commonly due to urethritis and less commonly caused by prostatitis, epididymitis, or urinary tract infection (UTI). In this case, the patient\'s lack of systemic symptoms, absence of penile discharge, and positive urine dipstick analysis are consistent with UTI. The most common cause of UTI is fecal flora, including gram-negative rods such as Escherichia coli. Urinalysis findings: positive leukocyte esterase (marker of inflammation), positive nitrites (produced by nitrate reductase-producing bacteria like E. coli), and acidic pH (pH = 5, ruling out Proteus mirabilis which produces alkaline urine via urease). This dipstick pattern is most consistent with E. coli UTI.',
      explI:[{option:'A',explanation:'UTI with Candida albicans is generally seen only in elderly, hospitalized, and immunocompromised patients. Dipstick would be positive for leukocyte esterase but negative for nitrites.'},{option:'B',explanation:'Enterococcus faecalis does not produce nitrate reductase, making its presence inconsistent with this patient\'s positive urinary nitrites.'},{option:'D',explanation:'Genital herpes simplex virus typically presents with clusters of vesicles that may cause dysuria. Leukocyte esterase may be present but nitrites would not.'},{option:'E',explanation:'Proteus mirabilis produces urease which generates alkaline urine (pH >8). This patient\'s acidic pH (5) makes P. mirabilis unlikely.'},{option:'F',explanation:'Staphylococcus saprophyticus does not produce nitrate reductase, making it inconsistent with positive urinary nitrites.'}],
      objective:'The most common cause of urinary tract infection is Escherichia coli, a nitrate reductase-producing bacterium. Dipstick analysis should show positive leukocyte esterase, positive nitrites, and a mildly acidic pH.',
      peer:{A:1,B:7,C:70,D:1,E:13,F:6},
      ptTranslation:{vignette:'Um homem de 24 anos procura o consultório com 2 dias de dor ao urinar e aumento da frequência urinária. Sem febre, calafrios, dor nas costas ou secreção peniana. Sexualmente ativo com seu namorado. Urinálise: esterase de leucócitos positiva, nitritos positivos, pH 5.',q:'Com base nos resultados da urinálise, qual organismo é a causa mais provável?',objective:'A causa mais comum de ITU é Escherichia coli, produtora de nitrato redutase.',
      options:[{label:'A',text:'Candida albicans'},{label:'B',text:'Enterococcus faecalis'},{label:'C',text:'Escherichia coli'},{label:'D',text:'Vírus herpes simples'},{label:'E',text:'Proteus mirabilis'},{label:'F',text:'Staphylococcus saprophyticus'}],
      explC:'A disúria em homens sexualmente ativos é mais comumente causada por uretrite e, menos comumente, por prostatite, epididimite ou infecção do trato urinário (ITU). Neste caso, a ausência de sintomas sistêmicos, a ausência de secreção peniana e a urinálise positiva são consistentes com ITU. A causa mais comum de ITU é a flora fecal, incluindo bacilos gram-negativos como a Escherichia coli. Achados da urinálise: esterase de leucócitos positiva (marcador de inflamação), nitritos positivos (produzidos por bactérias produtoras de nitrato redutase, como E. coli) e pH ácido (pH = 5, o que torna improvável o Proteus mirabilis, que produz urina alcalina via urease). Esse padrão é mais consistente com ITU por E. coli.',
      explI:[{option:'A',explanation:'ITU por Candida albicans ocorre geralmente apenas em pacientes idosos, hospitalizados ou imunocomprometidos. O exame seria positivo para esterase de leucócitos, mas negativo para nitritos.'},{option:'B',explanation:'Enterococcus faecalis não produz nitrato redutase, o que é inconsistente com os nitritos urinários positivos deste paciente.'},{option:'D',explanation:'O herpes simples genital geralmente se apresenta com vesículas em cacho que podem causar disúria. A esterase de leucócitos pode estar presente, mas os nitritos não.'},{option:'E',explanation:'Proteus mirabilis produz urease, que gera urina alcalina (pH >8). O pH ácido (5) deste paciente torna P. mirabilis improvável.'},{option:'F',explanation:'Staphylococcus saprophyticus não produz nitrato redutase, o que é inconsistente com nitritos urinários positivos.'}]} },

    { id:'CMQ-STEP1-MRS-0002', system:'male_repro', discipline:'pharmacology', category:'male_repro::disorders_male_repro', difficulty:'hard',
      vignette:'A 65-year-old man with benign prostatic hyperplasia has moderately severe symptoms and is started on finasteride. After six months of treatment with finasteride, his symptoms improve markedly and his prostate has regressed in size.',
      q:'Which of the following histological patterns was most likely present at the time of initiation of treatment?',
      options:[{label:'A',text:'Hyperplasia of prostate with predominance of epithelial components'},{label:'B',text:'Hyperplasia of prostate with predominance of muscular element'},{label:'C',text:'Hyperplasia of prostate with predominance of collagen'},{label:'D',text:'Hyperplasia of prostate with predominance of both collagen and smooth muscles'}],
      correct:'A',
      explC:'Finasteride is a 5-alpha reductase inhibitor that inhibits the conversion of testosterone to dihydrotestosterone. It acts on the epithelial components of the prostate gland and produces improvement of symptoms as well as reduction in the size of the gland. Patients with epithelial predominance best respond to treatment with finasteride.',
      explI:[{option:'B',explanation:'Alpha-1 blockers produce symptomatic improvement in patients with BPH by their action on smooth muscles in prostate and bladder base. Patients with smooth muscle predominance respond to alpha-1 blockers, not finasteride.'},{option:'C',explanation:'Patients with collagen predominance respond neither to finasteride nor to alpha-1 blockers.'},{option:'D',explanation:'Patients with both collagen and smooth muscle predominance respond neither to finasteride nor to alpha-1 blockers.'}],
      objective:'Finasteride acts on epithelium and alpha-1 blockers act on smooth muscles of prostate and bladder base.',
      peer:{A:41,B:25,C:5,D:27},
      ptTranslation:{vignette:'Um homem de 65 anos com HPB tem sintomas moderadamente graves e é iniciado em finasterida. Após seis meses, seus sintomas melhoram e a próstata regrediu.',q:'Qual padrão histológico era mais provável no início do tratamento?',objective:'A finasterida atua no epitélio e os bloqueadores alfa-1 nos músculos lisos da próstata.',
      options:[{label:'A',text:'Hiperplasia da próstata com predomínio de componentes epiteliais'},{label:'B',text:'Hiperplasia da próstata com predomínio do elemento muscular'},{label:'C',text:'Hiperplasia da próstata com predomínio de colágeno'},{label:'D',text:'Hiperplasia da próstata com predomínio de colágeno e músculo liso'}],
      explC:'A finasterida é um inibidor da 5-alfa redutase que inibe a conversão de testosterona em di-hidrotestosterona. Ela atua nos componentes epiteliais da próstata, produzindo melhora dos sintomas e redução do tamanho da glândula. Pacientes com predomínio epitelial respondem melhor ao tratamento com finasterida.',
      explI:[{option:'B',explanation:'Os bloqueadores alfa-1 melhoram os sintomas da HPB por atuarem no músculo liso da próstata e da base da bexiga. Pacientes com predomínio de músculo liso respondem aos bloqueadores alfa-1, não à finasterida.'},{option:'C',explanation:'Pacientes com predomínio de colágeno não respondem nem à finasterida nem aos bloqueadores alfa-1.'},{option:'D',explanation:'Pacientes com predomínio de colágeno e músculo liso não respondem nem à finasterida nem aos bloqueadores alfa-1.'}]} },

    { id:'CMQ-STEP1-MRS-0003', system:'male_repro', discipline:'pathophysiology', category:'male_repro::disorders_male_repro', difficulty:'medium',
      vignette:'A 19-year-old man comes to the emergency department due to intense scrotal pain over the past 6 hours. The pain started shortly after participating in a soccer game; he does not recall any specific trauma and took ibuprofen at home with minimal relief. He is sexually active and has been treated twice in the past for Neisseria gonorrhoeae. Temperature is 36.9 C (98.5 F), blood pressure is 110/86 mm Hg, and pulse is 92/min. On examination, there is no inguinal lymphadenopathy or palpable mass. There is significant discomfort with scrotal examination primarily on the right where a high-riding swollen mass is palpable within the hemiscrotum; the left testicle is palpated lower in the scrotum.',
      q:'Which of the following additional physical examination findings is most likely present in this patient?',
      options:[{label:'A',text:'Absent elevation of the mass with stroking of the ipsilateral thigh'},{label:'B',text:'Enlargement of the mass when the patient coughs or bears down'},{label:'C',text:'Increase in the size of the mass when standing relative to laying'},{label:'D',text:'Reduction in pain with manual elevation of the mass'},{label:'E',text:'Transillumination of the mass when a flashlight is placed behind the scrotum'}],
      correct:'A',
      explC:'This patient has acute, severe, progressive unilateral scrotal pain with a high-riding scrotal mass, findings concerning for testicular torsion. An absent cremasteric reflex (testicular elevation when stroking the ipsilateral inner thigh) is highly suggestive of testicular torsion.',
      explI:[{option:'B',explanation:'Cough/Valsalva causing bulging suggests inguinal hernia, not testicular torsion.'},{option:'C',explanation:'Varicocele increases in size when standing and causes a dull ache, not acute severe pain.'},{option:'D',explanation:'Pain relief with elevation (positive Prehn sign) suggests epididymitis, not torsion.'},{option:'E',explanation:'Transillumination suggests hydrocele, a fluid collection that causes enlargement but not acute pain.'}],
      objective:'Testicular torsion presents with acute unilateral scrotal pain. Classic findings include a high-riding testicle and absent cremasteric reflex.',
      peer:{A:66,B:6,C:3,D:18,E:5},
      ptTranslation:{vignette:'Um homem de 19 anos com dor escrotal intensa há 6 horas, iniciada após jogo de futebol; sem trauma específico, uso de ibuprofeno em casa com alívio mínimo. Sem linfadenopatia ou massa inguinal. Massa elevada e inchada no hemiscroto direito; o testículo esquerdo está posicionado mais baixo no escroto.',q:'Qual achado de exame físico adicional é mais provável?',objective:'A torção testicular apresenta dor escrotal aguda com testículo elevado e reflexo cremastérico ausente.',
      options:[{label:'A',text:'Ausência de elevação da massa ao estimular a face interna da coxa ipsilateral'},{label:'B',text:'Aumento da massa quando o paciente tosse ou faz força'},{label:'C',text:'Aumento do tamanho da massa em pé em comparação à posição deitada'},{label:'D',text:'Redução da dor com elevação manual da massa'},{label:'E',text:'Transiluminação da massa ao posicionar uma lanterna atrás do escroto'}],
      explC:'Este paciente apresenta dor escrotal aguda, intensa e progressiva, unilateral, com massa escrotal elevada — achados preocupantes para torção testicular. A ausência do reflexo cremastérico (elevação testicular ao estimular a face interna da coxa ipsilateral) é altamente sugestiva de torção testicular.',
      explI:[{option:'B',explanation:'O aumento da massa com tosse/Valsalva sugere hérnia inguinal, não torção testicular.'},{option:'C',explanation:'O varicocele aumenta de tamanho em pé e causa dor surda, não dor aguda e intensa.'},{option:'D',explanation:'O alívio da dor com elevação (sinal de Prehn positivo) sugere epididimite, não torção.'},{option:'E',explanation:'A transiluminação sugere hidrocele, uma coleção de líquido que causa aumento de volume, mas não dor aguda.'}]} },

    { id:'CMQ-STEP1-MRS-0004', system:'male_repro', discipline:'genetics', category:'male_repro::disorders_male_repro', difficulty:'medium',
      vignette:'A 16-year-old boy is brought to the office for a well-child visit. The parents report that his teacher has expressed concerns about the patient\'s reading and writing skills. Height is at the 98th percentile and weight is at the 75th percentile. He has bilateral gynecomastia and Tanner stage 1 genitalia.',
      q:'Which of the following is the most likely underlying mechanism responsible for this patient\'s condition?',
      options:[{label:'A',text:'FBN1 gene mutation on chromosome 15'},{label:'B',text:'Loss of paternally derived genes on chromosome 15'},{label:'C',text:'Meiotic nondisjunction of chromosome X'},{label:'D',text:'Meiotic nondisjunction of chromosome Y'},{label:'E',text:'Trinucleotide repeat expansion on chromosome X'}],
      correct:'C',
      explC:'This patient with learning disabilities, tall stature, small testes, and gynecomastia most likely has Klinefelter syndrome (47,XXY), the most common cause of primary hypogonadism in males. The pathogenesis involves meiotic nondisjunction of the X chromosome.',
      explI:[{option:'A',explanation:'FBN1 mutation causes Marfan syndrome. Tall stature but no hypogonadism or gynecomastia.'},{option:'B',explanation:'Loss of paternal genes on chr 15 causes Prader-Willi: short stature and obesity, not seen here.'},{option:'D',explanation:'Nondisjunction of Y gives XYY (47,XYY): tall stature and learning disabilities but no hypogonadism.'},{option:'E',explanation:'Trinucleotide repeat on X causes Fragile X: macroorchidism (not Tanner 1), long face, large ears.'}],
      objective:'Klinefelter syndrome (47,XXY) is the most common cause of male primary hypogonadism, caused by meiotic nondisjunction of chromosome X.',
      peer:{A:5,B:7,C:61,D:12,E:12},
      ptTranslation:{vignette:'Um menino de 16 anos com dificuldades de leitura e escrita, altura no P98, ginecomastia bilateral e Tanner 1.',q:'Qual é o mecanismo subjacente mais provável?',objective:'Síndrome de Klinefelter (47,XXY): causa mais comum de hipogonadismo primário masculino.',
      options:[{label:'A',text:'Mutação do gene FBN1 no cromossomo 15'},{label:'B',text:'Perda de genes de origem paterna no cromossomo 15'},{label:'C',text:'Não disjunção meiótica do cromossomo X'},{label:'D',text:'Não disjunção meiótica do cromossomo Y'},{label:'E',text:'Expansão de repetição trinucleotídica no cromossomo X'}],
      explC:'Este paciente com dificuldades de aprendizagem, estatura elevada, testículos pequenos e ginecomastia provavelmente tem síndrome de Klinefelter (47,XXY), a causa mais comum de hipogonadismo primário em homens. A patogênese envolve não disjunção meiótica do cromossomo X.',
      explI:[{option:'A',explanation:'A mutação do FBN1 causa síndrome de Marfan. Há estatura elevada, mas sem hipogonadismo ou ginecomastia.'},{option:'B',explanation:'A perda de genes paternos no cromossomo 15 causa síndrome de Prader-Willi: estatura baixa e obesidade, não observadas aqui.'},{option:'D',explanation:'A não disjunção do Y resulta em síndrome XYY (47,XYY): estatura elevada e dificuldades de aprendizagem, mas sem hipogonadismo.'},{option:'E',explanation:'A repetição trinucleotídica no X causa síndrome do X frágil: macro-orquidismo (não Tanner 1), face alongada, orelhas grandes.'}]} },

    { id:'CMQ-STEP1-MRS-0005', system:'male_repro', discipline:'behavioral_science', category:'male_repro::disorders_male_repro', difficulty:'medium',
      vignette:'A 78-year-old man comes to the office for a regularly scheduled review. He has hypertension, CAD, and type 2 DM, taking metformin, atorvastatin, lisinopril, and nitroglycerin PRN. He hesitates, laughs nervously, and says, "I can\'t get an erection anymore, and my wife says I have to ask you about getting the blue pill."',
      q:'Which of the following is the most appropriate response to this patient\'s concern?',
      options:[{label:'A',text:'"I can see that you feel uncomfortable talking about this. It can be a sensitive subject for some men."'},{label:'B',text:'"I can understand your concern, but at your age, we hesitate to start too many medications."'},{label:'C',text:'"Medications for erectile dysfunction have significant side effects. I would not pursue them unless you feel it is important."'},{label:'D',text:'"This is a very common problem for men as they age. It is good that you mentioned it."'},{label:'E',text:'"We can try medication for erectile dysfunction, but it may not be effective at your age."'}],
      correct:'D',
      explC:'When counseling on sexuality, the first objective is making the patient feel comfortable. Reassure that sexual dysfunction is common and appropriate to discuss. Choice D normalizes the concern and affirms the patient for bringing it up.',
      explI:[{option:'A',explanation:'Reiterates and draws attention to his anxiety, potentially reinforcing awkwardness.'},{option:'B',explanation:'Age is not a contraindication. However, his nitrate use does contraindicate PDE5 inhibitors.'},{option:'C',explanation:'This may make him feel he must justify raising the concern.'},{option:'E',explanation:'Age does not determine efficacy. This is dismissive.'}],
      objective:'When counseling patients on sexuality, the clinician should normalize the concern and reassure them.',
      peer:{A:18,B:4,C:7,D:69,E:1},
      ptTranslation:{vignette:'Um homem de 78 anos com HAS, DAC e DM2 hesita e diz: "Não consigo mais ter ereção, minha esposa diz que devo perguntar sobre a pílula azul."',q:'Qual é a resposta mais apropriada?',objective:'Ao aconselhar sobre sexualidade, normalize a preocupação e tranquilize o paciente.',
      options:[{label:'A',text:'"Percebo que você se sente desconfortável falando sobre isso. Pode ser um assunto delicado para alguns homens."'},{label:'B',text:'"Entendo sua preocupação, mas na sua idade, hesitamos em iniciar muitos medicamentos."'},{label:'C',text:'"Medicamentos para disfunção erétil têm efeitos colaterais significativos. Eu não os buscaria a menos que você considere importante."'},{label:'D',text:'"Este é um problema muito comum para homens conforme envelhecem. É bom que você tenha mencionado."'},{label:'E',text:'"Podemos tentar um medicamento para disfunção erétil, mas pode não ser eficaz na sua idade."'}],
      explC:'Ao aconselhar sobre sexualidade, o primeiro objetivo é deixar o paciente confortável. Tranquilizar que a disfunção sexual é comum e apropriada para discussão. A alternativa D normaliza a preocupação e valida o paciente por trazer o assunto.',
      explI:[{option:'A',explanation:'Reitera e chama atenção para sua ansiedade, podendo reforçar o constrangimento.'},{option:'B',explanation:'A idade não é uma contraindicação. No entanto, o uso de nitrato sim contraindica inibidores da PDE5.'},{option:'C',explanation:'Isso pode fazer o paciente sentir que precisa justificar a preocupação.'},{option:'E',explanation:'A idade não determina a eficácia. Essa resposta é desdenhosa.'}]} },

    { id:'CMQ-STEP1-MRS-0006', system:'male_repro', discipline:'histology', category:'male_repro::normal_male_repro', difficulty:'medium',
      vignette:'A 34-year-old man is found to have low sperm count during an infertility evaluation. He has a history of testicular trauma from a motorcycle accident several years ago. Further evaluation reveals antisperm antibodies.',
      q:'This patient\'s testicular trauma most likely damaged an anatomic barrier formed from which of the following components?',
      options:[{label:'A',text:'Leydig cells'},{label:'B',text:'Primary spermatocytes'},{label:'C',text:'Secondary spermatocytes'},{label:'D',text:'Sertoli cells'},{label:'E',text:'Tunica albuginea'}],
      correct:'D',
      explC:'The blood-testis barrier (BTB) is formed by tight junctions between Sertoli cells in the seminiferous tubules. Disruption can lead to antisperm antibodies and impaired fertility.',
      explI:[{option:'A',explanation:'Leydig cells produce testosterone outside the tubules. They do not form the BTB.'},{option:'B',explanation:'Primary spermatocytes migrate inside the BTB but do not form it.'},{option:'C',explanation:'Secondary spermatocytes are inside the BTB but do not form the barrier.'},{option:'E',explanation:'Tunica albuginea is the outer capsule of the testis, not the BTB.'}],
      objective:'The blood-testis barrier is formed by tight junctions between Sertoli cells. Disruption leads to antisperm antibodies.',
      peer:{A:9,B:3,C:3,D:58,E:25},
      ptTranslation:{vignette:'Um homem de 34 anos com baixa contagem de esperma e histórico de trauma testicular desenvolveu anticorpos antiesperma.',q:'Qual componente formava a barreira danificada?',objective:'A barreira sangue-testis é formada por junções entre células de Sertoli.',
      options:[{label:'A',text:'Células de Leydig'},{label:'B',text:'Espermatócitos primários'},{label:'C',text:'Espermatócitos secundários'},{label:'D',text:'Células de Sertoli'},{label:'E',text:'Túnica albugínea'}],
      explC:'A barreira hematotesticular é formada por junções firmes entre as células de Sertoli nos túbulos seminíferos. Sua disrupção pode levar à formação de anticorpos antiesperma e prejudicar a fertilidade.',
      explI:[{option:'A',explanation:'As células de Leydig produzem testosterona fora dos túbulos. Não formam a barreira hematotesticular.'},{option:'B',explanation:'Os espermatócitos primários migram dentro da barreira, mas não a formam.'},{option:'C',explanation:'Os espermatócitos secundários estão dentro da barreira, mas não a formam.'},{option:'E',explanation:'A túnica albugínea é a cápsula externa do testículo, não a barreira hematotesticular.'}]} },

    { id:'CMQ-STEP1-MRS-0007', system:'male_repro', discipline:'anatomy', category:'male_repro::normal_male_repro', difficulty:'medium',
      vignette:'A 42-year-old man with 6 children elects to undergo a vasectomy after appropriate discussion regarding contraceptive options. On examination, normal circumcised penis with no abnormalities.',
      q:'The patient should be advised to expect which of the following side effects during the first few months following the procedure?',
      options:[{label:'A',text:'Decreased interest in sexual activity'},{label:'B',text:'Difficulty in maintaining an erection'},{label:'C',text:'Large reduction in the volume of ejaculate'},{label:'D',text:'Reduced testosterone production'},{label:'E',text:'Viable sperm in the ejaculate'}],
      correct:'E',
      explC:'Vasectomy transects the vas deferens. Sperm may persist in the ejaculate for months until cleared proximal to the transection. Alternative contraception needed until two azoospermic semen analyses.',
      explI:[{option:'A',explanation:'Vasectomy does not affect libido; testosterone production continues.'},{option:'B',explanation:'Erectile function is not affected by vasectomy.'},{option:'C',explanation:'Ejaculate volume is determined by seminal vesicles and prostate, which are unaffected.'},{option:'D',explanation:'Testosterone production is unaffected; testes and blood supply remain intact.'}],
      objective:'After vasectomy, viable sperm may persist for months until cleared. Alternative contraception is needed until confirmed azoospermia.',
      peer:{A:2,B:4,C:22,D:2,E:68},
      ptTranslation:{vignette:'Um homem de 42 anos com 6 filhos opta pela vasectomia.',q:'Qual efeito colateral esperar nos primeiros meses?',objective:'Após vasectomia, esperma viável pode persistir por meses até ser eliminado.',
      options:[{label:'A',text:'Diminuição do interesse na atividade sexual'},{label:'B',text:'Dificuldade em manter uma ereção'},{label:'C',text:'Grande redução no volume do ejaculado'},{label:'D',text:'Redução da produção de testosterona'},{label:'E',text:'Espermatozoides viáveis no ejaculado'}],
      explC:'A vasectomia secciona o ducto deferente. Espermatozoides podem persistir no ejaculado por meses até serem eliminados da porção proximal à secção. É necessário método contraceptivo alternativo até duas análises seminais confirmarem azoospermia.',
      explI:[{option:'A',explanation:'A vasectomia não afeta a libido; a produção de testosterona continua normalmente.'},{option:'B',explanation:'A função erétil não é afetada pela vasectomia.'},{option:'C',explanation:'O volume do ejaculado é determinado pelas vesículas seminais e pela próstata, que não são afetadas.'},{option:'D',explanation:'A produção de testosterona não é afetada; os testículos e o suprimento sanguíneo permanecem intactos.'}]} },

    { id:'CMQ-STEP1-MRS-0008', system:'male_repro', discipline:'genetics', category:'male_repro::disorders_male_repro', difficulty:'hard',
      vignette:'An autopsy on a stillborn fetus at 20 weeks gestation reveals a 46,XY karyotype with a loss of function mutation of the androgen receptor gene on the X chromosome, resulting in complete androgen insensitivity.',
      q:'Which of the following phenotypes is most likely to be present in this fetus?',
      options:[{label:'A',text:'Absent internal genital ducts, Female external genitalia'},{label:'B',text:'Absent internal genital ducts, Male external genitalia'},{label:'C',text:'Uterus and fallopian tubes, Ambiguous external genitalia'},{label:'D',text:'Uterus and fallopian tubes, Male external genitalia'},{label:'E',text:'Vas deferens and epididymis, Female external genitalia'}],
      correct:'A',
      explC:'In CAIS, testes produce AMH (Müllerian regression) and testosterone (but androgen receptor is nonfunctional). Result: Müllerian ducts regress (no uterus/tubes), Wolffian ducts also regress (no vas deferens), external genitalia female (no DHT response).',
      explI:[{option:'B',explanation:'Male external genitalia need DHT via functional androgen receptor. Absent in CAIS.'},{option:'C',explanation:'AMH is produced normally, so Müllerian structures (uterus, tubes) regress.'},{option:'D',explanation:'Both Müllerian structures and male genitalia cannot co-develop in CAIS.'},{option:'E',explanation:'Wolffian duct development requires functional androgen receptor, absent in CAIS.'}],
      objective:'CAIS: 46,XY with absent internal genital ducts and female external genitalia.',
      peer:{A:34,B:6,C:17,D:5,E:36},
      ptTranslation:{vignette:'Feto natimorto 46,XY com mutação do receptor androgênico, insensibilidade androgênica completa.',q:'Qual fenótipo é mais provável?',objective:'CAIS: cariótipo 46,XY com dutos genitais internos ausentes e genitália externa feminina.',
      options:[{label:'A',text:'Dutos genitais internos ausentes, genitália externa feminina'},{label:'B',text:'Dutos genitais internos ausentes, genitália externa masculina'},{label:'C',text:'Útero e tubas uterinas, genitália externa ambígua'},{label:'D',text:'Útero e tubas uterinas, genitália externa masculina'},{label:'E',text:'Ducto deferente e epidídimo, genitália externa feminina'}],
      explC:'Na síndrome de insensibilidade androgênica completa (CAIS), os testículos produzem AMH (regressão mülleriana) e testosterona, mas o receptor androgênico é não funcional. Resultado: os ductos müllerianos regridem (sem útero/tubas), os ductos wolffianos também regridem (sem ducto deferente), e a genitália externa é feminina (sem resposta à DHT).',
      explI:[{option:'B',explanation:'A genitália externa masculina requer DHT via receptor androgênico funcional, ausente na CAIS.'},{option:'C',explanation:'O AMH é produzido normalmente, portanto as estruturas müllerianas (útero, tubas) regridem.'},{option:'D',explanation:'As estruturas müllerianas e a genitália masculina não podem coexistir na CAIS.'},{option:'E',explanation:'O desenvolvimento do ducto wolffiano requer receptor androgênico funcional, ausente na CAIS.'}]} },

    { id:'CMQ-STEP1-MRS-0009', system:'male_repro', discipline:'anatomy', category:'male_repro::disorders_male_repro', difficulty:'medium', img:['assets/qbank/CMQ-STEP1-MRS-0009_urethral_anatomy_labeled.png'],
      vignette:'A 45-year-old man is brought to the ED after a high-speed motor vehicle collision. He has lower abdominal pain, sensation of bladder fullness, but has been unable to urinate since the collision. CT reveals rib fractures and a pelvic fracture.',
      q:'Which of the following portions of the urogenital tract is most likely injured in this patient?',
      options:[{label:'A',text:'Anterior bladder wall'},{label:'B',text:'Prostatic urethra'},{label:'C',text:'Membranous urethra (bulbomembranous junction)'},{label:'D',text:'Bulbar urethra'},{label:'E',text:'Penile urethra'}],
      correct:'C',
      explC:'Pelvic fracture most commonly causes posterior urethral injury at the bulbomembranous junction. The posterior urethra is fixed to pelvic bones. Traumatic fracture causes upward displacement and tearing. Clinical findings: blood at meatus, high-riding prostate, inability to void.',
      explI:[{option:'A',explanation:'Bladder wall injury presents with extraperitoneal urine leakage. Inability to void suggests urethral, not bladder injury.'},{option:'B',explanation:'Prostatic urethra is supported by prostate tissue and is less likely to be injured.'},{option:'D',explanation:'Bulbar urethra (anterior) is mobile and protected from indirect forces; injured by straddle injury.'},{option:'E',explanation:'Penile urethra is anterior and mobile; injured by direct trauma, not pelvic fracture.'}],
      objective:'Pelvic fractures are associated with posterior urethral injury at the bulbomembranous junction.',
      peer:{A:17,B:12,C:61,D:6,E:1},
      ptTranslation:{vignette:'Um homem de 45 anos após colisão veicular com dor abdominal, bexiga cheia mas incapaz de urinar. TC: fratura pélvica.',q:'Qual porção do trato urogenital está mais provavelmente ferida?',objective:'Fraturas pélvicas associam-se a lesão da uretra posterior na junção bulbomembranosa.',
      options:[{label:'A',text:'Parede anterior da bexiga'},{label:'B',text:'Uretra prostática'},{label:'C',text:'Uretra membranosa (junção bulbomembranosa)'},{label:'D',text:'Uretra bulbar'},{label:'E',text:'Uretra peniana'}],
      explC:'A fratura pélvica causa mais comumente lesão da uretra posterior na junção bulbomembranosa. A uretra posterior é fixa aos ossos pélvicos. A fratura traumática causa deslocamento superior e ruptura. Achados clínicos: sangue no meato, próstata elevada ("high-riding"), incapacidade de urinar.',
      explI:[{option:'A',explanation:'A lesão da parede da bexiga se apresenta com extravasamento extraperitoneal de urina. A incapacidade de urinar sugere lesão uretral, não vesical.'},{option:'B',explanation:'A uretra prostática é sustentada pelo tecido prostático e é menos propensa a ser lesada.'},{option:'D',explanation:'A uretra bulbar (anterior) é móvel e protegida de forças indiretas; é lesada por trauma direto (straddle injury).'},{option:'E',explanation:'A uretra peniana é anterior e móvel; é lesada por trauma direto, não por fratura pélvica.'}]} },

    { id:'CMQ-STEP1-MRS-0010', system:'male_repro', discipline:'pathology', category:'male_repro::disorders_male_repro', difficulty:'easy',
      vignette:'A 28-year-old man comes to the office due to a bump on his right testicle. He is otherwise asymptomatic and healthy. A solid mass is palpated. Scrotal ultrasound reveals a suspicious, partially necrotic mass. Serum LDH and AFP are markedly elevated. He undergoes right radical inguinal orchiectomy.',
      q:'Which of the following is the most likely histologic diagnosis?',
      options:[{label:'A',text:'Leydig cell tumor'},{label:'B',text:'Nonseminomatous germ cell tumor'},{label:'C',text:'Sertoli cell tumor'},{label:'D',text:'Teratoma'},{label:'E',text:'Testicular lymphoma'}],
      correct:'B',
      explC:'Testicular cancer is the most common solid organ malignancy in men age 15-35. Painless mass + elevated AFP strongly suggests nonseminomatous germ cell tumor (NSGCT). NSGCTs produce AFP and/or hCG. Seminomas do not produce AFP.',
      explI:[{option:'A',explanation:'Leydig cell tumors produce testosterone, not AFP.'},{option:'C',explanation:'Sertoli cell tumors are rare and do not elevate AFP.'},{option:'D',explanation:'Pure teratomas typically do not elevate AFP.'},{option:'E',explanation:'Testicular lymphoma is most common in men over 60, not in young men.'}],
      objective:'NSGCT is the most likely diagnosis with elevated AFP in a young man with a testicular mass.',
      peer:{A:5,B:74,C:7,D:10,E:1},
      ptTranslation:{vignette:'Um homem de 28 anos com massa testicular direita. AFP e LDH elevados. Orquiectomia inguinal radical.',q:'Qual é o diagnóstico histológico mais provável?',objective:'Tumor germinativo não seminomatoso: AFP elevada em homem jovem com massa testicular.',
      options:[{label:'A',text:'Tumor de células de Leydig'},{label:'B',text:'Tumor germinativo não seminomatoso'},{label:'C',text:'Tumor de células de Sertoli'},{label:'D',text:'Teratoma'},{label:'E',text:'Linfoma testicular'}],
      explC:'O câncer testicular é a neoplasia sólida mais comum em homens de 15 a 35 anos. Uma massa indolor associada a AFP elevada sugere fortemente tumor germinativo não seminomatoso (NSGCT). Os NSGCTs produzem AFP e/ou hCG. Os seminomas não produzem AFP.',
      explI:[{option:'A',explanation:'Os tumores de células de Leydig produzem testosterona, não AFP.'},{option:'C',explanation:'Os tumores de células de Sertoli são raros e não elevam a AFP.'},{option:'D',explanation:'Os teratomas puros geralmente não elevam a AFP.'},{option:'E',explanation:'O linfoma testicular é mais comum em homens acima de 60 anos, não em homens jovens.'}]} },

    // ═══════════════════════════════════════════════════════════════
    // BATCH 02 — Cardiovascular System (9 questions)
    // ═══════════════════════════════════════════════════════════════
    { id:'CMQ-STEP1-CVS-0001', system:'cardiovascular', discipline:'pharmacology', category:'cardiovascular::cardiovascular_drugs', difficulty:'medium',
      vignette:'A 53-year-old man comes for follow-up after acute myocardial infarction. Medications include metoprolol and low-dose aspirin. He quit smoking after his MI. He is obese (100 kg, 178 cm). Total cholesterol 155 mg/dL, HDL 27 mg/dL, triglycerides 92 mg/dL.',
      q:'Which of the following lipid-lowering agents would be most effective for preventing future cardiovascular events?',
      options:[{label:'A',text:'Absorption inhibitor'},{label:'B',text:'Cationic exchange resin'},{label:'C',text:'Enzyme inhibitor'},{label:'D',text:'Essential fatty acids'},{label:'E',text:'Pharmacologic vitamin'},{label:'F',text:'Transcription factor ligand'}],
      correct:'C',
      explC:'Statins (HMG-CoA reductase inhibitors / enzyme inhibitors) are the most effective lipid-lowering drugs for preventing cardiovascular events. Indicated for secondary prevention in all patients with known ASCVD, regardless of baseline lipid levels.',
      explI:[{option:'A',explanation:'Ezetimibe: mixed evidence for CV event reduction; minimal benefit over statin monotherapy.'},{option:'B',explanation:'Bile acid sequestrants: mixed CV outcomes evidence.'},{option:'D',explanation:'Omega-3 fatty acids: no significant CV outcome improvement.'},{option:'E',explanation:'Niacin raises HDL but does not improve CV outcomes when added to statin therapy.'},{option:'F',explanation:'Fibrates (PPARα ligands) primarily lower triglycerides; no significant CV benefit with statins.'}],
      objective:'Statins are the most effective lipid-lowering drugs for preventing cardiovascular events.',
      peer:{A:5,B:2,C:55,D:6,E:26,F:4},
      ptTranslation:{vignette:'Um homem de 53 anos pós-IAM. Colesterol total 155, HDL 27, triglicerídeos 92 mg/dL.',q:'Qual agente redutor de lipídios é mais eficaz para prevenção secundária?',objective:'As estatinas são os medicamentos mais eficazes para prevenir eventos cardiovasculares.',
      options:[{label:'A',text:'Inibidor de absorção'},{label:'B',text:'Resina de troca catiônica'},{label:'C',text:'Inibidor de enzima'},{label:'D',text:'Ácidos graxos essenciais'},{label:'E',text:'Vitamina farmacológica'},{label:'F',text:'Ligante de fator de transcrição'}],
      explC:'As estatinas (inibidores da HMG-CoA redutase / inibidores de enzima) são os medicamentos redutores de lipídios mais eficazes para prevenir eventos cardiovasculares. Indicadas para prevenção secundária em todos os pacientes com doença aterosclerótica conhecida, independentemente dos níveis lipídicos basais.',
      explI:[{option:'A',explanation:'Ezetimiba: evidência mista de redução de eventos cardiovasculares; benefício mínimo sobre a monoterapia com estatina.'},{option:'B',explanation:'Sequestrantes de ácidos biliares: evidência mista sobre desfechos cardiovasculares.'},{option:'D',explanation:'Ácidos graxos ômega-3: sem melhora significativa de desfechos cardiovasculares.'},{option:'E',explanation:'A niacina eleva o HDL, mas não melhora desfechos cardiovasculares quando associada à estatina.'},{option:'F',explanation:'Os fibratos (ligantes de PPARα) reduzem principalmente os triglicerídeos; sem benefício cardiovascular significativo associado a estatinas.'}]} },

    { id:'CMQ-STEP1-CVS-0002', system:'cardiovascular', discipline:'embryology', category:'cardiovascular::congenital_heart_disease', difficulty:'hard',
      vignette:'A newborn girl born at 39 weeks via SVD. At 1 hour, a 2/6 systolic murmur at the left upper sternal border. At 8 hours, the murmur is continuous (systole and diastole). At 24 hours, no murmur.',
      q:'Which of the following most likely occurred immediately prior to the disappearance of this patient\'s murmur?',
      options:[{label:'A',text:'Closure of a ventricular left-to-right shunt'},{label:'B',text:'Closure of a ventricular right-to-left shunt'},{label:'C',text:'Closure of an arterial left-to-right shunt'},{label:'D',text:'Closure of an arterial right-to-left shunt'},{label:'E',text:'Closure of an atrial left-to-right shunt'},{label:'F',text:'Closure of an atrial right-to-left shunt'}],
      correct:'C',
      explC:'The murmur evolution reflects normal ductus arteriosus closure. After birth, PVR drops and SVR increases, reversing fetal right-to-left flow to left-to-right through the DA. This creates a continuous murmur. As the DA closes (24-72 hours), the L-to-R shunt stops and the murmur disappears.',
      explI:[{option:'A',explanation:'VSD would cause a holosystolic murmur that does not self-resolve in 24 hours.'},{option:'B',explanation:'Ventricular R-to-L shunt suggests cyanotic disease, not a benign self-resolving murmur.'},{option:'D',explanation:'R-to-L arterial flow occurs in fetal life; after birth it reverses to L-to-R before DA closure.'},{option:'E',explanation:'ASD does not typically close within 24 hours.'},{option:'F',explanation:'Foramen ovale closure is gradual and does not produce the described murmur pattern.'}],
      objective:'The ductus arteriosus normally closes 24-72 hours after birth. The murmur disappears when the left-to-right shunt ceases.',
      peer:{A:5,B:2,C:44,D:18,E:17,F:12},
      ptTranslation:{vignette:'Recém-nascida com sopro sistólico que se torna contínuo e desaparece em 24 horas.',q:'O que ocorreu imediatamente antes do desaparecimento do sopro?',objective:'O ducto arterioso normalmente fecha 24-72 horas após o nascimento.',
      options:[{label:'A',text:'Fechamento de um shunt ventricular esquerda-direita'},{label:'B',text:'Fechamento de um shunt ventricular direita-esquerda'},{label:'C',text:'Fechamento de um shunt arterial esquerda-direita'},{label:'D',text:'Fechamento de um shunt arterial direita-esquerda'},{label:'E',text:'Fechamento de um shunt atrial esquerda-direita'},{label:'F',text:'Fechamento de um shunt atrial direita-esquerda'}],
      explC:'A evolução do sopro reflete o fechamento normal do ducto arterioso. Após o nascimento, a RVP cai e a RVS aumenta, revertendo o fluxo fetal direita-esquerda para esquerda-direita através do ducto arterioso. Isso cria um sopro contínuo. Quando o ducto se fecha (24-72 horas), o shunt esquerda-direita cessa e o sopro desaparece.',
      explI:[{option:'A',explanation:'A CIV causaria um sopro holossistólico que não se resolve espontaneamente em 24 horas.'},{option:'B',explanation:'Um shunt ventricular direita-esquerda sugere doença cianótica, não um sopro benigno autolimitado.'},{option:'D',explanation:'O fluxo arterial direita-esquerda ocorre na vida fetal; após o nascimento, reverte para esquerda-direita antes do fechamento do ducto.'},{option:'E',explanation:'A CIA normalmente não se fecha em 24 horas.'},{option:'F',explanation:'O fechamento do forame oval é gradual e não produz o padrão de sopro descrito.'}]} },

    { id:'CMQ-STEP1-CVS-0003', system:'cardiovascular', discipline:'pathology', category:'cardiovascular::valvular_heart_diseases', difficulty:'hard',
      vignette:'A 63-year-old man with hypertension, hyperlipidemia, and diet-controlled DM2 presents with 2 hours of chest pain. A systolic murmur is heard. Basilar crackles bilaterally. Coronary catheterization reveals an occlusion; successfully revascularized. The next morning, lungs are clear and no murmur is present.',
      q:'The murmur heard during initial presentation is most likely explained by a pathologic process involving which of the following structures?',
      options:[{label:'A',text:'Aortic root'},{label:'B',text:'Aortic valve leaflets'},{label:'C',text:'Interventricular septum'},{label:'D',text:'Mitral valve chordae'},{label:'E',text:'Papillary muscle'}],
      correct:'E',
      explC:'MI-induced papillary muscle ischemia causes dysfunction and mitral regurgitation. Revascularization restores papillary muscle function, resolving the MR. Unlike rupture (which does not resolve with revascularization), dysfunction improves.',
      explI:[{option:'A',explanation:'Aortic root is not directly affected by myocardial ischemia.'},{option:'B',explanation:'Aortic valve leaflets are not affected by MI.'},{option:'C',explanation:'Septal rupture is a mechanical complication (3-5 days post-MI) that requires surgery.'},{option:'D',explanation:'Chordae rupture is also a mechanical complication requiring surgery.'}],
      objective:'MI can cause papillary muscle dysfunction leading to MR that improves with revascularization.',
      peer:{A:8,B:19,C:7,D:21,E:43},
      ptTranslation:{vignette:'Um homem de 63 anos com IAM, sopro sistólico que desaparece após revascularização.',q:'O sopro é explicado por processo envolvendo qual estrutura?',objective:'A isquemia do músculo papilar causa regurgitação mitral que melhora com revascularização.',
      options:[{label:'A',text:'Raiz aórtica'},{label:'B',text:'Folhetos da valva aórtica'},{label:'C',text:'Septo interventricular'},{label:'D',text:'Cordas tendíneas da valva mitral'},{label:'E',text:'Músculo papilar'}],
      explC:'A isquemia do músculo papilar induzida pelo IAM causa disfunção e regurgitação mitral. A revascularização restaura a função do músculo papilar, resolvendo a RM. Diferentemente da ruptura (que não se resolve com revascularização), a disfunção melhora.',
      explI:[{option:'A',explanation:'A raiz aórtica não é diretamente afetada pela isquemia miocárdica.'},{option:'B',explanation:'Os folhetos da valva aórtica não são afetados pelo IAM.'},{option:'C',explanation:'A ruptura septal é uma complicação mecânica (3-5 dias pós-IAM) que requer cirurgia.'},{option:'D',explanation:'A ruptura das cordas tendíneas também é uma complicação mecânica que requer cirurgia.'}]} },

    { id:'CMQ-STEP1-CVS-0004', system:'cardiovascular', discipline:'physiology', category:'cardiovascular::heart_failure_shock', difficulty:'medium',
      vignette:'A 55-year-old man collapses at home with chest pain. BP 80/50, pulse 120/min. Bilateral crackles. S3 audible. ECG: ST elevation in V2-V6.',
      q:'Which of the following hemodynamic changes are most likely present?',
      options:[{label:'A',text:'Decreased PCWP, Decreased CVP, Decreased coronary perfusion pressure'},{label:'B',text:'Decreased PCWP, Increased CVP, Decreased coronary perfusion pressure'},{label:'C',text:'Increased PCWP, Decreased CVP, Increased coronary perfusion pressure'},{label:'D',text:'Increased PCWP, Increased CVP, Decreased coronary perfusion pressure'},{label:'E',text:'Increased PCWP, Increased CVP, Increased coronary perfusion pressure'}],
      correct:'D',
      explC:'STEMI with cardiogenic shock: LV failure → increased LV end-diastolic pressure → increased PCWP → pulmonary edema. Increased pressure impairs RV → increased CVP. Decreased cardiac output → hypotension → decreased coronary perfusion pressure.',
      explI:[{option:'A',explanation:'Decreased CVP/PCWP/CPP = hypovolemic or septic shock.'},{option:'B',explanation:'Decreased PCWP + increased CVP = obstructive shock (PE, tension pneumothorax).'},{option:'C',explanation:'Decreased CVP with increased PCWP is atypical.'},{option:'E',explanation:'Increased coronary perfusion pressure would not occur in shock.'}],
      objective:'Cardiogenic shock: increased PCWP and CVP with decreased coronary perfusion pressure.',
      peer:{A:10,B:10,C:10,D:60,E:8},
      ptTranslation:{vignette:'Um homem de 55 anos com colapso, dor no peito, PA 80/50, estertores bilaterais, S3, supra ST V2-V6.',q:'Quais mudanças hemodinâmicas estão presentes?',objective:'Choque cardiogênico: aumento de PCWP e CVP com diminuição da pressão de perfusão coronária.',
      options:[{label:'A',text:'PCWP diminuída, PVC diminuída, pressão de perfusão coronariana diminuída'},{label:'B',text:'PCWP diminuída, PVC aumentada, pressão de perfusão coronariana diminuída'},{label:'C',text:'PCWP aumentada, PVC diminuída, pressão de perfusão coronariana aumentada'},{label:'D',text:'PCWP aumentada, PVC aumentada, pressão de perfusão coronariana diminuída'},{label:'E',text:'PCWP aumentada, PVC aumentada, pressão de perfusão coronariana aumentada'}],
      explC:'No IAMCST com choque cardiogênico: a falência do VE aumenta a pressão diastólica final do VE, aumentando a PCWP e causando edema pulmonar. O aumento de pressão prejudica o VD, aumentando a PVC. A queda do débito cardíaco causa hipotensão e diminuição da pressão de perfusão coronariana.',
      explI:[{option:'A',explanation:'PVC/PCWP/pressão de perfusão coronariana diminuídas = choque hipovolêmico ou séptico.'},{option:'B',explanation:'PCWP diminuída + PVC aumentada = choque obstrutivo (TEP, pneumotórax hipertensivo).'},{option:'C',explanation:'PVC diminuída com PCWP aumentada é atípico.'},{option:'E',explanation:'O aumento da pressão de perfusão coronariana não ocorreria em choque.'}]} },

    { id:'CMQ-STEP1-CVS-0005', system:'cardiovascular', discipline:'pathophysiology', category:'cardiovascular::heart_failure_shock', difficulty:'hard',
      vignette:'A 53-year-old smoker (2 packs/day for 35 years) has progressive exertional dyspnea, increased AP diameter, decreased breath sounds, scattered wheezes. Extremities unremarkable. Echo: RV dilation, increased CVP.',
      q:'The absence of peripheral edema in this patient is best explained by which of the following compensatory mechanisms?',
      options:[{label:'A',text:'Decreased capillary permeability'},{label:'B',text:'Decreased circulating aldosterone levels'},{label:'C',text:'Decreased interstitial fluid pressure'},{label:'D',text:'Increased plasma oncotic pressure'},{label:'E',text:'Increased tissue lymphatic drainage'}],
      correct:'E',
      explC:'Despite elevated CVP and right heart failure, no peripheral edema yet. In chronic heart failure, increased lymphatic drainage initially offsets factors favoring edema, temporarily delaying its development.',
      explI:[{option:'A',explanation:'Capillary permeability is unchanged in heart failure.'},{option:'B',explanation:'Aldosterone is elevated (not decreased) in HF, promoting sodium retention.'},{option:'C',explanation:'Decreased interstitial pressure would promote edema, not prevent it.'},{option:'D',explanation:'Plasma oncotic pressure is decreased (not increased) in HF due to hemodilution.'}],
      objective:'In chronic heart failure, increased lymphatic drainage initially offsets edema-promoting factors.',
      peer:{A:14,B:23,C:9,D:22,E:30},
      ptTranslation:{vignette:'Um fumante de 53 anos com DPOC, dilatação de VD e PVC aumentada, mas sem edema periférico.',q:'A ausência de edema é melhor explicada por qual mecanismo?',objective:'Na IC crônica, a drenagem linfática aumentada inicialmente compensa fatores que favorecem edema.',
      options:[{label:'A',text:'Diminuição da permeabilidade capilar'},{label:'B',text:'Diminuição dos níveis de aldosterona circulante'},{label:'C',text:'Diminuição da pressão do líquido intersticial'},{label:'D',text:'Aumento da pressão oncótica plasmática'},{label:'E',text:'Aumento da drenagem linfática tecidual'}],
      explC:'Apesar da PVC elevada e da insuficiência cardíaca direita, ainda não há edema periférico. Na insuficiência cardíaca crônica, o aumento da drenagem linfática inicialmente compensa os fatores que favorecem o edema, retardando temporariamente seu desenvolvimento.',
      explI:[{option:'A',explanation:'A permeabilidade capilar não se altera na insuficiência cardíaca.'},{option:'B',explanation:'A aldosterona está elevada (não diminuída) na IC, promovendo retenção de sódio.'},{option:'C',explanation:'A diminuição da pressão intersticial favoreceria o edema, não o preveniria.'},{option:'D',explanation:'A pressão oncótica plasmática está diminuída (não aumentada) na IC devido à hemodiluição.'}]} },

    { id:'CMQ-STEP1-CVS-0006', system:'cardiovascular', discipline:'pharmacology', category:'cardiovascular::cardiac_arrhythmias', difficulty:'hard',
      vignette:'An 82-year-old man with recent atrial fibrillation (discharged 2 weeks ago on oral meds), hypertension, and severe COPD. He now has syncope and constipation. BP 105/60, pulse 50/min. ECG: new-onset second-degree AV block.',
      q:'Which of the following drugs is the most likely cause of his current condition?',
      options:[{label:'A',text:'Amlodipine'},{label:'B',text:'Diltiazem'},{label:'C',text:'Hydrochlorothiazide'},{label:'D',text:'Lidocaine'},{label:'E',text:'Propranolol'},{label:'F',text:'Terazosin'},{label:'G',text:'Valsartan'}],
      correct:'B',
      explC:'Constipation + second-degree AV block (syncope) = adverse effects of nondihydropyridine CCB (diltiazem/verapamil). These block L-type calcium channels, decreasing AV node conduction. Negative chronotropic and inotropic effects. Constipation from reduced colonic smooth muscle contraction.',
      explI:[{option:'A',explanation:'Amlodipine is a dihydropyridine CCB with minimal cardiac conduction effects. Does not cause AV block.'},{option:'C',explanation:'HCTZ is a diuretic for hypertension, not for AF. Does not cause AV block.'},{option:'D',explanation:'Lidocaine is for ventricular arrhythmias, not AF.'},{option:'E',explanation:'Propranolol can cause AV block but is avoided in severe COPD and does not cause constipation.'},{option:'F',explanation:'Terazosin causes orthostatic hypotension, not AV block.'},{option:'G',explanation:'Valsartan does not cause AV block or constipation.'}],
      objective:'Nondihydropyridine CCBs (diltiazem, verapamil) can cause constipation, bradycardia, and AV block.',
      peer:{A:10,B:48,C:1,D:5,E:29,F:1,G:1},
      ptTranslation:{vignette:'Um homem de 82 anos pós-FA com síncope e constipação. DPOC grave. Pulso 50/min. ECG: BAV 2° grau.',q:'Qual medicamento é a causa mais provável?',objective:'BCC não-dihidropiridínicos (diltiazem, verapamil) podem causar constipação, bradicardia e BAV.',
      options:[{label:'A',text:'Anlodipino'},{label:'B',text:'Diltiazem'},{label:'C',text:'Hidroclorotiazida'},{label:'D',text:'Lidocaína'},{label:'E',text:'Propranolol'},{label:'F',text:'Terazosina'},{label:'G',text:'Valsartana'}],
      explC:'Constipação + bloqueio atrioventricular de segundo grau (síncope) = efeitos adversos de bloqueador dos canais de cálcio não di-hidropiridínico (diltiazem/verapamil). Esses fármacos bloqueiam os canais de cálcio tipo L, reduzindo a condução no nó AV. Efeitos cronotrópico e inotrópico negativos. A constipação decorre da redução da contração da musculatura lisa colônica.',
      explI:[{option:'A',explanation:'O anlodipino é um BCC di-hidropiridínico com efeitos mínimos sobre a condução cardíaca. Não causa BAV.'},{option:'C',explanation:'A hidroclorotiazida é um diurético para hipertensão, não para FA. Não causa BAV.'},{option:'D',explanation:'A lidocaína é usada para arritmias ventriculares, não para FA.'},{option:'E',explanation:'O propranolol pode causar BAV, mas é evitado em DPOC grave e não causa constipação.'},{option:'F',explanation:'A terazosina causa hipotensão ortostática, não BAV.'},{option:'G',explanation:'A valsartana não causa BAV nem constipação.'}]} },

    { id:'CMQ-STEP1-CVS-0007', system:'cardiovascular', discipline:'physiology', category:'cardiovascular::coronary_heart_disease', difficulty:'easy', img:['assets/qbank/CMQ-STEP1-CVS-0007_cardiac_output_venous_return_curves.png'],
      vignette:'The cardiac output and venous return curves of a healthy person are shown with solid lines. The dashed lines depict decreased cardiac output with unchanged venous return (unchanged blood volume and TPR).',
      q:'Which of the following is the most likely cause of the change depicted by the dashed lines?',
      options:[{label:'A',text:'Excessive hydration'},{label:'B',text:'Acute hemorrhage'},{label:'C',text:'Chronic anemia'},{label:'D',text:'Myocardial infarction'},{label:'E',text:'Anaphylaxis'}],
      correct:'D',
      explC:'Isolated decrease in cardiac output with unchanged venous return indicates decreased contractility from myocardial injury. MI decreases both the slope and maximal height of the cardiac function curve.',
      explI:[{option:'A',explanation:'Excessive hydration shifts venous return curve rightward, not just cardiac output down.'},{option:'B',explanation:'Hemorrhage shifts venous return curve leftward and downward.'},{option:'C',explanation:'Chronic anemia increases cardiac output to meet metabolic demands.'},{option:'E',explanation:'Anaphylaxis causes widespread vasodilation and drops venous return.'}],
      objective:'MI causes decreased cardiac output by loss of contractile function.',
      peer:{A:2,B:13,C:4,D:75,E:3},
      ptTranslation:{vignette:'Curvas de débito cardíaco e retorno venoso mostram diminuição isolada do débito com retorno venoso inalterado.',q:'Qual é a causa mais provável?',objective:'O IM causa diminuição do débito cardíaco por perda de função contrátil.',
      options:[{label:'A',text:'Hidratação excessiva'},{label:'B',text:'Hemorragia aguda'},{label:'C',text:'Anemia crônica'},{label:'D',text:'Infarto do miocárdio'},{label:'E',text:'Anafilaxia'}],
      explC:'A diminuição isolada do débito cardíaco com retorno venoso inalterado indica diminuição da contratilidade por lesão miocárdica. O infarto do miocárdio diminui tanto a inclinação quanto a altura máxima da curva de função cardíaca.',
      explI:[{option:'A',explanation:'A hidratação excessiva desloca a curva de retorno venoso para a direita, não apenas reduz o débito cardíaco.'},{option:'B',explanation:'A hemorragia desloca a curva de retorno venoso para a esquerda e para baixo.'},{option:'C',explanation:'A anemia crônica aumenta o débito cardíaco para atender às demandas metabólicas.'},{option:'E',explanation:'A anafilaxia causa vasodilatação generalizada e reduz o retorno venoso.'}]} },

    { id:'CMQ-STEP1-CVS-0008', system:'cardiovascular', discipline:'pharmacology', category:'cardiovascular::cardiac_arrhythmias', difficulty:'easy',
      vignette:'A 24-year-old man with sudden-onset palpitations ("my heart is racing"), similar episode a year ago that resolved spontaneously. BP 126/74, pulse 164/min regular. Rapid IV medication causes instantaneous resolution with short-lived flushing, burning in the chest, and shortness of breath.',
      q:'Which of the following medications was used to treat this patient\'s condition?',
      options:[{label:'A',text:'Adenosine'},{label:'B',text:'Amiodarone'},{label:'C',text:'Digoxin'},{label:'D',text:'Ibutilide'},{label:'E',text:'Lidocaine'},{label:'F',text:'Verapamil'}],
      correct:'A',
      explC:'SVT in a young man terminated by rapid IV push with transient flushing/dyspnea = adenosine. It blocks AV node conduction with ultra-short half-life (~10 seconds), explaining the transient side effects.',
      explI:[{option:'B',explanation:'Amiodarone has slow onset, not used for acute SVT termination.'},{option:'C',explanation:'Digoxin has slow onset (hours), not for acute SVT.'},{option:'D',explanation:'Ibutilide is for atrial flutter/fibrillation, not SVT.'},{option:'E',explanation:'Lidocaine is for ventricular arrhythmias.'},{option:'F',explanation:'Verapamil can terminate SVT but has slower onset and different side effect profile.'}],
      objective:'Adenosine is a rapid-acting, ultra-short-lived drug for terminating acute SVT.',
      peer:{A:72,B:8,C:4,D:1,E:5,F:6},
      ptTranslation:{vignette:'Um homem de 24 anos com palpitações súbitas, pulso 164/min. Medicação IV rápida resolve instantaneamente com rubor transitório.',q:'Qual medicamento foi usado?',objective:'Adenosina: ação rápida e ultra-curta para encerrar TVS aguda.',
      options:[{label:'A',text:'Adenosina'},{label:'B',text:'Amiodarona'},{label:'C',text:'Digoxina'},{label:'D',text:'Ibutilida'},{label:'E',text:'Lidocaína'},{label:'F',text:'Verapamil'}],
      explC:'TVS (taquicardia supraventricular) em um homem jovem, encerrada por injeção IV rápida com rubor/dispneia transitórios = adenosina. Ela bloqueia a condução no nó AV com meia-vida ultracurta (~10 segundos), explicando os efeitos colaterais transitórios.',
      explI:[{option:'B',explanation:'A amiodarona tem início de ação lento, não é usada para o encerramento agudo de TVS.'},{option:'C',explanation:'A digoxina tem início de ação lento (horas), não é usada para TVS aguda.'},{option:'D',explanation:'A ibutilida é usada para flutter/fibrilação atrial, não para TVS.'},{option:'E',explanation:'A lidocaína é usada para arritmias ventriculares.'},{option:'F',explanation:'O verapamil pode encerrar a TVS, mas tem início mais lento e perfil de efeitos colaterais diferente.'}]} },

    { id:'CMQ-STEP1-CVS-0009', system:'cardiovascular', discipline:'physiology', category:'cardiovascular::cardiovascular_drugs', difficulty:'medium',
      vignette:'A 44-year-old woman with pyelonephritis and septic shock (BP 80/40, pulse 140/min) receives IV phenylephrine. Her heart rate decreases to 100/min.',
      q:'The infusion most likely induced which of the following intracellular changes?',
      options:[{label:'A',text:'Decreased cAMP in ventricular myocytes, Increased IP3 in vascular smooth muscle, Decreased inward calcium current in SA nodal cells'},{label:'B',text:'Decreased cAMP in ventricular myocytes, Decreased IP3 in vascular smooth muscle, No change in SA nodal calcium current'},{label:'C',text:'Increased cAMP in ventricular myocytes, Increased IP3 in vascular smooth muscle, Increased SA nodal calcium current'},{label:'D',text:'Increased cAMP in ventricular myocytes, No change in IP3, Increased SA nodal calcium current'},{label:'E',text:'No change in cAMP, Decreased IP3 in vascular smooth muscle, Decreased SA nodal calcium current'}],
      correct:'A',
      explC:'Phenylephrine (alpha-1 agonist) → increased IP3 in vascular smooth muscle → vasoconstriction → increased BP → baroreceptor reflex → increased parasympathetic + decreased sympathetic outflow → decreased cAMP in ventricular myocytes + decreased inward calcium current in SA node → decreased HR.',
      explI:[{option:'B',explanation:'Phenylephrine increases (not decreases) IP3 via alpha-1 activation.'},{option:'C',explanation:'Baroreceptor reflex decreases (not increases) sympathetic outflow, so cAMP and SA calcium current decrease.'},{option:'D',explanation:'IP3 does change (increases) and SA calcium current decreases (not increases).'},{option:'E',explanation:'cAMP does change (decreases via baroreceptor reflex) and IP3 increases (not decreases).'}],
      objective:'Phenylephrine raises BP via alpha-1/IP3 → baroreceptor reflex → decreased cardiac cAMP and SA node calcium current → decreased HR.',
      peer:{A:50,B:9,C:18,D:8,E:12},
      ptTranslation:{vignette:'Uma mulher de 44 anos com pielonefrite e choque séptico recebe fenilefrina IV. FC diminui de 140 para 100/min.',q:'Quais mudanças intracelulares a infusão induziu?',objective:'Fenilefrina causa vasoconstrição via alfa-1/IP3. O reflexo barorreceptor diminui cAMP cardíaco e corrente de cálcio no nó SA.',
      options:[{label:'A',text:'cAMP diminuído nos miócitos ventriculares, IP3 aumentado no músculo liso vascular, corrente de cálcio diminuída nas células do nó SA'},{label:'B',text:'cAMP diminuído nos miócitos ventriculares, IP3 diminuído no músculo liso vascular, sem alteração na corrente de cálcio do nó SA'},{label:'C',text:'cAMP aumentado nos miócitos ventriculares, IP3 aumentado no músculo liso vascular, corrente de cálcio aumentada no nó SA'},{label:'D',text:'cAMP aumentado nos miócitos ventriculares, sem alteração no IP3, corrente de cálcio aumentada no nó SA'},{label:'E',text:'Sem alteração no cAMP, IP3 diminuído no músculo liso vascular, corrente de cálcio diminuída no nó SA'}],
      explC:'A fenilefrina (agonista alfa-1) aumenta o IP3 no músculo liso vascular → vasoconstrição → aumento da PA → reflexo barorreceptor → aumento do tônus parassimpático e diminuição do simpático → diminuição do cAMP nos miócitos ventriculares e da corrente de cálcio no nó SA → diminuição da FC.',
      explI:[{option:'B',explanation:'A fenilefrina aumenta (não diminui) o IP3 via ativação alfa-1.'},{option:'C',explanation:'O reflexo barorreceptor diminui (não aumenta) o tônus simpático, portanto o cAMP e a corrente de cálcio no nó SA diminuem.'},{option:'D',explanation:'O IP3 se altera (aumenta) e a corrente de cálcio do nó SA diminui (não aumenta).'},{option:'E',explanation:'O cAMP se altera (diminui via reflexo barorreceptor) e o IP3 aumenta (não diminui).'}]} },

    // ═══════════════════════════════════════════════════════════════
    // BATCH TEST 001 — Deploy test package generated by ChatGPT
    // ═══════════════════════════════════════════════════════════════
    {
            "id": "CMQ-TEST-001",
            "system": "renal_urinary",
            "discipline": "histology",
            "category": "renal_urinary::glomerular_diseases",
            "difficulty": "easy",
            "vignette": "An 8-year-old boy is brought to the office due to acute facial puffiness. His mother reports that for the preceding 24 hours he has been easily fatigued and has had dark urine. The patient was treated for a skin infection 3 weeks ago but has no chronic medical conditions. Temperature is 36.1 C (97 F) and blood pressure is 140/94 mm Hg. Physical examination shows periorbital edema and mild pitting edema along the ankles. The remainder of the examination shows no abnormalities. A representative renal biopsy sample is shown in the image below:",
            "q": "The fluorescent areas on the slide most likely indicate the presence of which of the following substances?",
            "options": [
                {
                    "label": "A",
                    "text": "Albumin"
                },
                {
                    "label": "B",
                    "text": "C1q"
                },
                {
                    "label": "C",
                    "text": "C3"
                },
                {
                    "label": "D",
                    "text": "Fibrin"
                },
                {
                    "label": "E",
                    "text": "IgE"
                },
                {
                    "label": "F",
                    "text": "M protein"
                }
            ],
            "correct": "C",
            "explC": "This pediatric patient with nephritic syndrome (eg, periorbital edema, hematuria, hypertension) following a recent skin infection most likely has poststreptococcal glomerulonephritis (PSGN), the most common cause of pediatric nephritic syndrome. This typically occurs after exposure to strains of group A Streptococcus that produce nephritogenic antigens that can activate the alternate complement pathway. These combine with antibodies to form immune complexes, which deposit on the glomerular basement membrane (GBM) and induce complement activation and inflammation.\n\nThese immune complexes are visible on immunofluorescence microscopy as granular deposits of IgG, IgM, and C3 on the GBM and mesangium. Because these particular immune complexes tend to activate complement via the alternate pathway, the deposits rarely contain C1q or C4 (classic complement pathway components).",
            "explI": [
                {
                    "option": "A",
                    "explanation": "Disruption of the GBM in PSGN causes increased filtration of proteins such as albumin, which are lost in urine and do not deposit in the GBM. The loss of albumin results in decreased plasma oncotic pressure and subsequent peripheral edema."
                },
                {
                    "option": "B",
                    "explanation": "C1q is a classic complement pathway component. In PSGN, the immune complexes tend to activate complement via the alternate pathway; therefore, the deposits rarely contain C1q or C4."
                },
                {
                    "option": "D",
                    "explanation": "Fibrin deposits in the Bowman space of the glomerulus are found in the crescents of rapidly progressive glomerulonephritis."
                },
                {
                    "option": "E",
                    "explanation": "IgE deposits are sometimes seen in lupus nephritis and are confined to the capillary wall. They are associated with a poorer prognosis."
                },
                {
                    "option": "F",
                    "explanation": "M protein is a component of the streptococcal cell wall that acts as an antiphagocytic virulence factor and stimulates antibody formation. The cross-reactivity of these antibodies to myosin within myocardial cells is likely responsible for rheumatic heart disease. However, M protein has not been isolated in the immune complexes in PSGN."
                }
            ],
            "objective": "Poststreptococcal glomerulonephritis occurs after exposure to strains of group A Streptococcus that produce nephritogenic antigens; antigen-antibody complexes deposit on the glomerular basement membrane and activate the alternate complement pathway. Immunofluorescence microscopy shows granular deposits of IgG, IgM, and C3 in the basement membranes and mesangium.",
            "ptTranslation": {
            "vignette": "Um menino de 8 anos é levado ao consultório por inchaço facial agudo. A mãe relata que nas últimas 24 horas ele tem apresentado fadiga fácil e urina escura. O paciente foi tratado por uma infecção de pele há 3 semanas e não possui doenças crônicas. A temperatura é 36,1 °C e a pressão arterial é 140/94 mmHg. O exame físico mostra edema periorbitário e leve edema depressível nos tornozelos. O restante do exame não apresenta alterações. Uma amostra representativa de biópsia renal é mostrada na imagem abaixo:",
            "q": "As áreas fluorescentes na lâmina indicam mais provavelmente a presença de qual das seguintes substâncias?",
            "options": [
                        {
                                    "label": "A",
                                    "text": "Albumina"
                        },
                        {
                                    "label": "B",
                                    "text": "C1q"
                        },
                        {
                                    "label": "C",
                                    "text": "C3"
                        },
                        {
                                    "label": "D",
                                    "text": "Fibrina"
                        },
                        {
                                    "label": "E",
                                    "text": "IgE"
                        },
                        {
                                    "label": "F",
                                    "text": "Proteína M"
                        }
            ],
            "explC": "Este paciente pediátrico com síndrome nefrítica, evidenciada por edema periorbitário, hematúria e hipertensão após infecção cutânea recente, provavelmente tem glomerulonefrite pós-estreptocócica. Essa condição ocorre após exposição a cepas nefritogênicas de Streptococcus do grupo A. Os antígenos nefritogênicos se combinam com anticorpos para formar imunocomplexos, que se depositam na membrana basal glomerular e no mesângio, induzindo inflamação e ativação do complemento. Na imunofluorescência, esses depósitos aparecem em padrão granular, contendo principalmente IgG, IgM e C3. Como a ativação ocorre predominantemente pela via alternativa, os depósitos raramente contêm C1q ou C4.",
            "explI": [
                        {
                                    "option": "A",
                                    "explanation": "A albumina pode ser perdida na urina devido ao aumento da permeabilidade glomerular, contribuindo para edema, mas não é o principal depósito fluorescente na membrana basal glomerular."
                        },
                        {
                                    "option": "B",
                                    "explanation": "C1q é componente da via clássica do complemento. Na glomerulonefrite pós-estreptocócica, a ativação é principalmente pela via alternativa, portanto C1q costuma estar ausente ou pouco representado."
                        },
                        {
                                    "option": "D",
                                    "explanation": "Depósitos proeminentes de fibrina são mais característicos de glomerulonefrite rapidamente progressiva com crescentes."
                        },
                        {
                                    "option": "E",
                                    "explanation": "IgE está relacionada a reações alérgicas e parasitoses; não é o principal componente dos depósitos granulares nessa síndrome nefrítica."
                        },
                        {
                                    "option": "F",
                                    "explanation": "Proteína M sugere gamopatia monoclonal, como mieloma múltiplo, e não explica o quadro nefrítico pós-infeccioso pediátrico."
                        }
            ],
            "objective": "Reconhecer a glomerulonefrite pós-estreptocócica como síndrome nefrítica pós-infecção associada a depósitos granulares de IgG, IgM e C3."
},
            "peer": {
                "A": 2,
                "B": 4,
                "C": 71,
                "D": 2,
                "E": 5,
                "F": 14
            },
            "img": "assets/qbank/CMQ-TEST-001_renal_biopsy_if.png"
        },
        {
            "id": "CMQ-TEST-002",
            "system": "female_repro_breast",
            "discipline": "histology",
            "category": "female_repro_breast::breast_disorders",
            "difficulty": "hard",
            "vignette": "A 34-year-old woman comes to the office with bleeding from the right nipple. The patient has noticed blood staining her bra on several occasions over the past week but has no fever or breast pain. She has no chronic medical conditions and does not take any medications. Breast examination shows no palpable masses or skin changes. A thin, blood-tinged discharge can be expressed from the right nipple. There are no enlarged axillary lymph nodes.",
            "q": "Which of the following is the most likely histopathologic finding in this patient's right breast?",
            "options": [
                {
                    "label": "A",
                    "text": "Atypical cells infiltrating the nipple skin"
                },
                {
                    "label": "B",
                    "text": "Cysts lined by metaplastic apocrine cells"
                },
                {
                    "label": "C",
                    "text": "Epithelial cells lining fibrovascular cores"
                },
                {
                    "label": "D",
                    "text": "Necrotic adipocytes with inflammation"
                },
                {
                    "label": "E",
                    "text": "Stromal proliferation compressing the ducts to slits"
                }
            ],
            "correct": "C",
            "explC": "Nipple discharge can be physiologic (ie, bilateral, nonbloody or milky, without masses or skin changes) or pathologic (ie, bloody or serosanguineous and unilateral with or without palpable masses and skin changes).\n\nThe most common cause of pathologic nipple discharge is an intraductal papilloma, which classically presents as a unilateral, bloody nipple discharge with no associated breast masses, skin changes, or axillary lymphadenopathy. Although most cases of intraductal papilloma are benign, all patients with pathologic nipple discharge require evaluation with imaging (eg, mammogram or ultrasound, depending upon age) and possibly with biopsy. On microscopy, intraductal papilloma shows epithelial and myoepithelial cells lining fibrovascular cores forming papillae within a duct or cyst wall. The bloody discharge results from twisting of the vascular stalk of the papilloma in the duct.",
            "explI": [
                {
                    "option": "A",
                    "explanation": "Paget disease of the breast occurs due to the ductal spread of atypical malignant cells to the nipple epidermis. Although patients may have bloody nipple discharge, they also have a unilateral erythematous, intensely pruritic, ulcerative lesion over the nipple and areola, which is not seen in this patient."
                },
                {
                    "option": "B",
                    "explanation": "Fibrocystic changes of the breast may show cysts with or without metaplasia and areas of fibrosis. Patients with fibrocystic changes typically have cyclic breast pain, not nipple discharge."
                },
                {
                    "option": "D",
                    "explanation": "Fat necrosis typically presents as an irregular breast mass with no associated nipple discharge after localized trauma or biopsy. Microscopy may show adipocytes undergoing necrosis with inflammation, including macrophages and giant cells."
                },
                {
                    "option": "E",
                    "explanation": "Fibroadenomas are small, firm, and mobile breast masses that occur due to proliferation of breast stroma and ducts. Fibroadenomas do not typically cause bloody nipple discharge. Microscopic examination shows stromal proliferation compressing the ducts to slits."
                }
            ],
            "objective": "Intraductal papilloma is characterized by epithelial and myoepithelial cells lining fibrovascular cores in a cyst wall or duct. It is the most common cause of bloody nipple discharge and typically presents without breast masses or skin changes.",
            "ptTranslation": {
            "vignette": "Uma mulher de 34 anos procura atendimento por sangramento pelo mamilo direito. Ela percebeu manchas de sangue no sutiã em várias ocasiões durante a última semana, mas não tem febre nem dor mamária. Não possui doenças crônicas e não usa medicamentos. O exame das mamas não mostra massas palpáveis nem alterações cutâneas. Uma secreção fina e sanguinolenta pode ser expressa pelo mamilo direito. Não há linfonodos axilares aumentados.",
            "q": "Qual é o diagnóstico mais provável?",
            "options": [
                        {
                                    "label": "A",
                                    "text": "Ectasia ductal"
                        },
                        {
                                    "label": "B",
                                    "text": "Fibroadenoma"
                        },
                        {
                                    "label": "C",
                                    "text": "Papiloma intraductal"
                        },
                        {
                                    "label": "D",
                                    "text": "Mastite"
                        },
                        {
                                    "label": "E",
                                    "text": "Doença de Paget da mama"
                        }
            ],
            "explC": "O quadro é mais compatível com papiloma intraductal, uma lesão benigna que cresce dentro dos ductos mamários maiores, geralmente próxima ao mamilo. A apresentação clássica é secreção unilateral espontânea, serosa ou sanguinolenta, frequentemente sem massa palpável. Histologicamente, há projeções papilares fibrovasculares revestidas por células epiteliais e mioepiteliais.",
            "explI": [
                        {
                                    "option": "A",
                                    "explanation": "A ectasia ductal costuma ocorrer em mulheres peri ou pós-menopáusicas e causa secreção espessa, pegajosa e frequentemente esverdeada ou multicolorida, com possível retração mamilar."
                        },
                        {
                                    "option": "B",
                                    "explanation": "Fibroadenoma é uma massa mamária benigna, bem delimitada, móvel e indolor em mulheres jovens. Normalmente não causa secreção mamilar sanguinolenta."
                        },
                        {
                                    "option": "D",
                                    "explanation": "Mastite geralmente ocorre durante a lactação e cursa com dor, eritema, calor local e febre. Esses achados inflamatórios estão ausentes."
                        },
                        {
                                    "option": "E",
                                    "explanation": "A doença de Paget da mama causa lesão eczematosa, eritematosa e descamativa do mamilo/aréola, frequentemente associada a carcinoma ductal subjacente."
                        }
            ],
            "objective": "Associar secreção mamilar unilateral sanguinolenta, sem massa palpável, a papiloma intraductal."
},
            "peer": {
                "A": 14,
                "B": 10,
                "C": 45,
                "D": 7,
                "E": 22
            },
            "img": "assets/qbank/CMQ-TEST-002_intraductal_papilloma_histology.png"
        },
        {
            "id": "CMQ-TEST-003",
            "system": "female_repro_breast",
            "discipline": "histology",
            "category": "female_repro_breast::menstrual_disorders_contraception",
            "difficulty": "hard",
            "vignette": "A 42-year-old woman, gravida 4 para 4, comes to the office due to heavy and painful menstrual bleeding over the past 3 months. The patient's last menstrual period was 3 weeks ago. Menarche was at age 10, and menstrual periods last for 3-5 days and occur every 30 days. She is sexually active with her husband and does not have pain with intercourse. The patient had a bilateral tubal ligation 3 years ago after the birth of her last child. She takes no medications and has no allergies. BMI is 24 kg/m². Vital signs are normal. On bimanual examination, the uterus is uniformly enlarged and tender. Urine β-hCG is negative.",
            "q": "Which of the following is the most likely cause of this patient's symptoms?",
            "options": [
                {
                    "label": "A",
                    "text": "Benign myometrial smooth muscle cell proliferation"
                },
                {
                    "label": "B",
                    "text": "Blastocyst implantation in the fallopian tube"
                },
                {
                    "label": "C",
                    "text": "Endometrial glands and stroma within the myometrium"
                },
                {
                    "label": "D",
                    "text": "Localized overgrowth of endometrium into the uterine cavity"
                },
                {
                    "label": "E",
                    "text": "Unregulated endometrial proliferation with increased gland-to-stroma ratio"
                }
            ],
            "correct": "C",
            "explC": "This patient has adenomyosis, a disorder caused by an abnormal collection of endometrial glands and stroma within the uterine myometrium. Adenomyosis is common in multiparous women, and prior uterine surgery (eg, cesarean delivery) is a risk factor.\n\nAlthough the exact pathogenesis is unclear, adenomyosis may occur due to endometrial invagination into the myometrium during periods of myometrial weakening or changes in vascularity at the endomyometrial interface (eg, pregnancy, uterine surgery). The clinical features of adenomyosis reflect its pathophysiology: endometrial gland proliferation and cyclic bleeding within the myometrium leads to dysmenorrhea and uterine tenderness; abnormal myometrial hyperplasia and hypertrophy results in a concentric, uniformly enlarged uterus; uterine enlargement and subsequently increased endometrial surface area causes regular, heavy menstrual bleeding. Definitive therapy is with hysterectomy, which allows for histologic diagnosis.",
            "explI": [
                {
                    "option": "A",
                    "explanation": "Leiomyomas (ie, uterine fibroids) are benign myometrial smooth muscle cell tumors. Although fibroids can cause regular, heavy menses (also due to increased endometrial surface area), the uterus is typically nontender and irregularly enlarged rather than tender and uniformly enlarged."
                },
                {
                    "option": "B",
                    "explanation": "An ectopic pregnancy most commonly occurs due to abnormal blastocyst implantation in the fallopian tube. Although prior tubal surgery (eg, bilateral tubal ligation) is a risk factor, ectopic pregnancy is unlikely in this patient with a negative urine β-hCG. In addition, uterine enlargement would not be seen."
                },
                {
                    "option": "D",
                    "explanation": "Endometrial polyps are benign, intracavitary, focal hyperplastic growths of endometrial tissue. In contrast to adenomyosis, endometrial polyps cause painless intermenstrual bleeding rather than painful, cyclic, heavy menses. There is also no associated uterine tenderness or enlargement."
                },
                {
                    "option": "E",
                    "explanation": "Patients with endometrial hyperplasia have unregulated endometrial gland proliferation with increased gland-to-stroma ratio; the thickened endometrial lining may slightly increase uterine size and cause heavy menses. However, endometrial hyperplasia does not typically cause dysmenorrhea or uterine tenderness. In addition, the most common risk factor is unopposed estrogen from chronic anovulation and/or obesity; this patient has regular menses and a normal BMI."
                }
            ],
            "objective": "Adenomyosis is the abnormal presence of endometrial glands and stroma within the uterine myometrium. Affected patients are typically multiparous women with dysmenorrhea, heavy menses, and a uniformly enlarged uterus.",
            "ptTranslation": {
            "vignette": "Uma mulher de 44 anos procura atendimento por cólicas menstruais intensas e sangramento menstrual aumentado há vários meses. Ela tem dois filhos e não usa contraceptivos. O exame pélvico mostra útero aumentado de forma difusa, macio e doloroso. A imagem mostra a alteração uterina esperada.",
            "q": "Qual achado histológico é esperado nessa condição?",
            "options": [
                        {
                                    "label": "A",
                                    "text": "Glândulas e estroma endometriais dentro do miométrio"
                        },
                        {
                                    "label": "B",
                                    "text": "Glândulas endometriais atípicas confinadas ao endométrio"
                        },
                        {
                                    "label": "C",
                                    "text": "Cistos ovarianos de conteúdo escuro"
                        },
                        {
                                    "label": "D",
                                    "text": "Tumor benigno de músculo liso bem delimitado"
                        },
                        {
                                    "label": "E",
                                    "text": "Tecido endometrial fora do útero, com fibrose e aderências"
                        }
            ],
            "explC": "Adenomiose é a presença de glândulas e estroma endometriais dentro do miométrio. Essa invasão causa hipertrofia do músculo liso adjacente, levando a útero aumentado de forma difusa, globoso e doloroso. O quadro clínico típico inclui dismenorreia, menorragia e dor pélvica em mulheres de meia-idade, especialmente multíparas.",
            "explI": [
                        {
                                    "option": "B",
                                    "explanation": "Glândulas endometriais atípicas confinadas ao endométrio sugerem hiperplasia endometrial ou carcinoma endometrial inicial, não adenomiose."
                        },
                        {
                                    "option": "C",
                                    "explanation": "Cistos ovarianos com conteúdo escuro são endometriomas, associados à endometriose ovariana."
                        },
                        {
                                    "option": "D",
                                    "explanation": "Tumor benigno de músculo liso bem delimitado corresponde a leiomioma, que forma massas firmes circunscritas."
                        },
                        {
                                    "option": "E",
                                    "explanation": "Tecido endometrial fora do útero com fibrose e aderências caracteriza endometriose; na adenomiose, o tecido endometrial está dentro do miométrio."
                        }
            ],
            "objective": "Distinguir adenomiose, definida por glândulas e estroma endometriais dentro do miométrio, de endometriose e leiomiomas."
},
            "peer": {
                "A": 20,
                "B": 1,
                "C": 46,
                "D": 10,
                "E": 20
            },
            "img": "assets/qbank/CMQ-TEST-003_adenomyosis_diagram.png"
        },
        {
            "id": "CMQ-TEST-004",
            "system": "renal_urinary",
            "discipline": "histology",
            "category": "renal_urinary::glomerular_diseases",
            "difficulty": "easy",
            "vignette": "A 9-year-old girl is brought to the office due to 2 days of face and eye puffiness. The patient was treated for a rash on her leg with an antibiotic about 3 weeks ago. Temperature is 37.2 C (99 F) and blood pressure is 150/90 mm Hg. On physical examination, there is generalized edema but no rash. Urinalysis reveals proteinuria and hematuria. An electron microscopy image representative of this patient's disease process is shown below:",
            "q": "The area marked by the arrow most likely represents which of the following?",
            "options": [
                {
                    "label": "A",
                    "text": "Albumin buildup"
                },
                {
                    "label": "B",
                    "text": "Eosinophil enzymes"
                },
                {
                    "label": "C",
                    "text": "Fibrin deposition"
                },
                {
                    "label": "D",
                    "text": "Hyaline accumulation"
                },
                {
                    "label": "E",
                    "text": "Immune complex deposits"
                },
                {
                    "label": "F",
                    "text": "Lipid droplet"
                },
                {
                    "label": "G",
                    "text": "Neutrophil enzymes"
                }
            ],
            "correct": "E",
            "explC": "This pediatric patient with hypertension, hematuria, proteinuria, and edema has a nephritic syndrome. The timeline (3 weeks after a skin infection) of symptoms suggests the most likely cause is poststreptococcal glomerulonephritis (PSGN), an immune complex-mediated disease that occurs after exposure to nephritogenic strains of group A Streptococcus. Laboratory evaluation reveals classic signs of nephritic syndrome (eg, hematuria, red blood cell [RBC] casts, mild proteinuria).\n\nThe immune complexes in PSGN are deposited along the glomerular basement membrane (GBM) and are visible on electron microscopy as large, dome-shaped, subepithelial, electron-dense deposits (\"humps\"). These can also be visualized on immunofluorescence as granular deposits of IgG, IgM, and C3 along the GBM and glomerular mesangium (\"lumpy-bumpy\" appearance). Because the immune complexes trigger an inflammatory reaction, light microscopy shows large glomeruli that are hypercellular due to leukocyte infiltration and proliferation of glomerular cells (a response to injury).",
            "explI": [
                {
                    "option": "A",
                    "explanation": "Proteins such as albumin may be lost in the urine due to increased permeability of the glomerular capillary wall in PSGN. However, albumin does not deposit within the glomerulus or renal tubules."
                },
                {
                    "option": "B",
                    "explanation": "Many antibiotics (eg, penicillins, cephalosporins) can cause acute interstitial nephritis (AIN), which often manifests as peritubular T-lymphocyte, macrophage, and eosinophilic infiltration. However, edema, significant hematuria, and proteinuria are uncommon, and AIN usually resolves when the offending agent is discontinued."
                },
                {
                    "option": "C",
                    "explanation": "Prominent fibrin deposition is characteristic of rapidly progressive (crescentic) glomerulonephritis."
                },
                {
                    "option": "D",
                    "explanation": "Hyaline (acellular, homogeneous, proteinaceous material) can accumulate within the glomerular capillary and arteriolar walls in diabetic nephropathy due to extravasation of plasma proteins."
                },
                {
                    "option": "F",
                    "explanation": "Lipid droplets in renal tubules may be seen in conditions causing nephrotic syndrome, which leads to heavy proteinuria and edema; however, gross hematuria and RBC casts are unexpected. In addition, lipid droplets do not deposit on the basement membrane."
                },
                {
                    "option": "G",
                    "explanation": "Neutrophils and monocytes infiltrate the glomeruli in PSGN, contributing to the hypercellular appearance on light microscopy. Enzymes released from these cells would not typically form extracellular aggregates."
                }
            ],
            "objective": "Poststreptococcal glomerulonephritis is an immune complex-mediated disease that occurs 2-4 weeks after group A Streptococcus skin infections. Immune complexes composed of IgG, IgM, and C3 are deposited along the glomerular basement membrane and are visible on electron microscopy as large, dome-shaped, subepithelial, electron-dense deposits.",
            "ptTranslation": {
            "vignette": "Um menino apresenta edema periorbitário, hipertensão e urina escura algumas semanas após uma infecção estreptocócica. A biópsia renal mostra a alteração representativa na microscopia eletrônica.",
            "q": "Qual achado de microscopia eletrônica é mais característico dessa condição?",
            "options": [
                        {
                                    "label": "A",
                                    "text": "Depósitos subepiteliais em forma de corcova"
                        },
                        {
                                    "label": "B",
                                    "text": "Espessamento difuso da membrana basal glomerular com espículas"
                        },
                        {
                                    "label": "C",
                                    "text": "Apagamento difuso dos pedicelos"
                        },
                        {
                                    "label": "D",
                                    "text": "Depósitos mesangiais de IgA"
                        },
                        {
                                    "label": "E",
                                    "text": "Depósitos lineares de IgG na membrana basal"
                        }
            ],
            "explC": "A glomerulonefrite pós-estreptocócica é uma síndrome nefrítica causada por deposição de imunocomplexos após infecção por cepas nefritogênicas de Streptococcus do grupo A. Na microscopia eletrônica, o achado clássico são depósitos subepiteliais grandes em forma de corcova. A imunofluorescência mostra padrão granular de IgG, IgM e C3.",
            "explI": [
                        {
                                    "option": "B",
                                    "explanation": "Espessamento difuso da membrana basal com espículas sugere nefropatia membranosa, uma causa de síndrome nefrótica."
                        },
                        {
                                    "option": "C",
                                    "explanation": "Apagamento difuso dos pedicelos é típico da doença de lesões mínimas, que causa síndrome nefrótica em crianças."
                        },
                        {
                                    "option": "D",
                                    "explanation": "Depósitos mesangiais de IgA caracterizam nefropatia por IgA, que geralmente causa hematúria logo após infecção respiratória."
                        },
                        {
                                    "option": "E",
                                    "explanation": "Deposição linear de IgG na membrana basal é típica da síndrome anti-MBG/Goodpasture."
                        }
            ],
            "objective": "Reconhecer depósitos subepiteliais em forma de corcova na microscopia eletrônica como achado clássico da glomerulonefrite pós-estreptocócica."
},
            "peer": {
                "A": 3,
                "B": 2,
                "C": 4,
                "D": 5,
                "E": 79,
                "F": 4,
                "G": 1
            },
            "img": "assets/qbank/CMQ-TEST-004_psgn_em_hump.png"
        },
        {
            "id": "CMQ-TEST-005",
            "system": "pulmonary_critical_care",
            "discipline": "histology",
            "category": "pulmonary_critical_care::obstructive_lung",
            "difficulty": "medium",
            "vignette": "A 64-year-old man is brought to the emergency department due to worsening shortness of breath. The patient is able to speak in short sentences only and becomes hypoxemic with minimal exertion. His medical history includes hypertension and dyslipidemia. He smoked a pack of cigarettes a day for 40 years and worked for 25 years as a nickel miner. His father died of chronic respiratory failure. While in the emergency department, he rapidly develops respiratory failure and is intubated. Despite appropriate treatment, he dies several days later in the intensive care unit. Autopsy is performed, and examination of the bronchi reveals thickened bronchial walls, inflammatory infiltrates, mucous gland enlargement, and patchy squamous metaplasia of the bronchial mucosa.",
            "q": "Which of the following factors was likely the greatest contributor to this patient's pathological findings?",
            "options": [
                {
                    "label": "A",
                    "text": "Allergic"
                },
                {
                    "label": "B",
                    "text": "Behavioral"
                },
                {
                    "label": "C",
                    "text": "Genetic"
                },
                {
                    "label": "D",
                    "text": "Infectious"
                },
                {
                    "label": "E",
                    "text": "Neoplastic"
                },
                {
                    "label": "F",
                    "text": "Occupational"
                }
            ],
            "correct": "B",
            "explC": "This patient with respiratory failure, hypoxemia, and thickened bronchial walls with inflammatory infiltrates and mucous gland enlargement likely had chronic bronchitis. Chronic bronchitis is characterized by chronic, productive cough with airflow limitation and is part of the spectrum of chronic obstructive pulmonary disease. It is most commonly caused by tobacco smoking. Chronic irritation by other inhaled environmental substances, such as air pollutants and grain, cotton, or silica dusts, can also contribute to its development. Biopsy typically shows thickened bronchial walls with predominantly lymphocytic infiltrates, mucous gland enlargement with increased numbers of goblet cells (increasing mucus production), and patchy squamous metaplasia of the bronchial mucosa.",
            "explI": [
                {
                    "option": "A",
                    "explanation": "Patients with allergic asthma can develop pathologic remodeling of the bronchial wall, which includes thickening of the bronchial epithelium, basement membrane, and bronchial smooth muscle as well as edema, inflammatory infiltrates, and submucosal mucous gland enlargement. However, the infiltrates consist predominantly of eosinophils and mast cells. In addition, although asthma is a risk factor for chronic bronchitis, smoking is a much more common cause."
                },
                {
                    "option": "C",
                    "explanation": "Genetic factors are not known to strongly predispose to chronic bronchitis. Genetic mutation causing alpha-1 antitrypsin deficiency can lead to panacinar emphysema; however, chronic bronchitis is not a significant component of the disease."
                },
                {
                    "option": "D",
                    "explanation": "Repeated bronchial/bronchiolar bacterial and viral infections can contribute to the development of chronic bronchitis, although less significantly than can smoking. Tobacco smoke predisposes to infection by impairing ciliary clearance and directly damaging the respiratory epithelium."
                },
                {
                    "option": "E",
                    "explanation": "Nickel is a carcinogen, and occupational exposure is associated with nasal and lung cancers. However, neoplastic transformation itself does not contribute to the development of chronic bronchitis."
                },
                {
                    "option": "F",
                    "explanation": "Although this patient's history of nickel mining is also suggestive of silica dust exposure, smoking is the most important risk factor for chronic bronchitis."
                }
            ],
            "objective": "Thickened bronchial walls, lymphocytic infiltration, mucous gland enlargement, and patchy squamous metaplasia of the bronchial mucosa are features of chronic bronchitis. Tobacco smoking is the leading cause of chronic bronchitis.",
            "ptTranslation": {
            "vignette": "Um paciente apresenta quadro compatível com bronquite crônica, com tosse produtiva crônica, limitação ao fluxo aéreo e alterações histológicas de parede brônquica espessada, aumento de glândulas mucosas e infiltrado inflamatório.",
            "q": "Qual fator é a causa mais importante para o desenvolvimento dessa condição?",
            "options": [
                        {
                                    "label": "A",
                                    "text": "Asma alérgica"
                        },
                        {
                                    "label": "B",
                                    "text": "Predisposição genética"
                        },
                        {
                                    "label": "C",
                                    "text": "Infecções respiratórias recorrentes"
                        },
                        {
                                    "label": "D",
                                    "text": "Transformação neoplásica"
                        },
                        {
                                    "label": "E",
                                    "text": "Tabagismo"
                        }
            ],
            "explC": "Bronquite crônica é definida clinicamente por tosse produtiva por pelo menos 3 meses em 2 anos consecutivos e faz parte do espectro da doença pulmonar obstrutiva crônica. O tabagismo é o principal fator de risco. A irritação crônica da fumaça lesiona o epitélio respiratório, prejudica a depuração mucociliar, promove inflamação crônica e causa hiperplasia de glândulas mucosas e aumento de células caliciformes.",
            "explI": [
                        {
                                    "option": "A",
                                    "explanation": "A asma alérgica causa inflamação eosinofílica e remodelamento das vias aéreas, mas não é a principal causa da bronquite crônica."
                        },
                        {
                                    "option": "B",
                                    "explanation": "Fatores genéticos não são a principal causa de bronquite crônica. Deficiência de alfa-1 antitripsina se associa principalmente a enfisema panacinar."
                        },
                        {
                                    "option": "C",
                                    "explanation": "Infecções respiratórias recorrentes podem agravar ou contribuir para bronquite crônica, mas têm papel menor que o tabagismo."
                        },
                        {
                                    "option": "D",
                                    "explanation": "Transformação neoplásica não causa bronquite crônica."
                        }
            ],
            "objective": "Identificar o tabagismo como o principal fator de risco para bronquite crônica."
},
            "peer": {
                "A": 2,
                "B": 58,
                "C": 2,
                "D": 1,
                "E": 5,
                "F": 29
            }
        },
        {
            "id": "CMQ-TEST-006",
            "system": "nervous_system",
            "discipline": "histology",
            "category": "nervous_system::normal_nervous",
            "difficulty": "medium",
            "vignette": "A 20-year-old woman comes to the office due to blisters around her mouth associated with a mild burning sensation. She reports that she has been having frequent recurrence of these lesions, which resolve spontaneously within a few days. She has no medical problems and does not take any medications. Physical examination findings are shown in the image below.\n\nIt is determined that the causative organism of this patient's condition remains in a latent state in the neuronal cell bodies of sensory ganglia. Upon reactivation, the virus is transported through the nerve axon to the skin.",
            "q": "Which of the following proteins is most likely involved in the transport process leading to disease recurrence?",
            "options": [
                {
                    "label": "A",
                    "text": "Dynein"
                },
                {
                    "label": "B",
                    "text": "Kinesin"
                },
                {
                    "label": "C",
                    "text": "Lamin"
                },
                {
                    "label": "D",
                    "text": "Selectin"
                },
                {
                    "label": "E",
                    "text": "Spectrin"
                },
                {
                    "label": "F",
                    "text": "Vimentin"
                }
            ],
            "correct": "B",
            "explC": "This patient is suffering from recurrent bouts of herpes labialis (\"cold sores\"), which is most commonly caused by herpes simplex virus 1 (HSV-1). Primary infection occurs following contact with an affected individual's saliva. Although it is often asymptomatic, infection can result in painful blister formation on the oral mucosa and surrounding skin of the mouth and lips. After resolution of the initial infection, the virus enters a latent phase where viral particles lay dormant in neural sensory ganglia (most commonly the trigeminal).\n\nReactivation of the virus occurs during times of stress or illness, resulting in recurrence of the characteristic perioral vesicular lesions. During reactivation, HSV particles rely on anterograde axonal transport to reach the skin and oral mucosa. Anterograde axonal transport is mediated by kinesin, a motor protein that moves intracellular cargo (eg, organelles, viral particles) away from the nucleus, down the axon, and toward the nerve terminal. Kinesin-mediated movement is powered by ATP hydrolysis and guided by microtubule filaments, which function as an intracellular \"track\" system.",
            "explI": [
                {
                    "option": "A",
                    "explanation": "Dynein is a microtubular motor protein that participates in retrograde axonal transport (ie, moving organelles toward the nucleus). Dynein is important in establishing the latent phase following primary HSV infection by transporting viral particles to the neural sensory ganglia. However, it is not responsible for disease recurrence."
                },
                {
                    "option": "C",
                    "explanation": "Lamins are proteins that help form the fibrillar network that lines the inside of the nuclear envelope. In addition to providing structural support, they also help to organize the genome and regulate gene transcription."
                },
                {
                    "option": "D",
                    "explanation": "Selectins are a group of cell adhesion molecules that are expressed on endothelial cells during the inflammatory response. They function to bind leukocytes, allowing them to exit blood vessels at the site of inflammation."
                },
                {
                    "option": "E",
                    "explanation": "Spectrin is a cytoskeletal protein located intracellularly along the plasma membrane. It is responsible for maintaining the distinct shape of red blood cells. Protein defects may result in hereditary elliptocytosis and spherocytosis."
                },
                {
                    "option": "F",
                    "explanation": "Vimentin is a type of intermediate filament expressed in mesenchymal cells. It is responsible for securing organelles inside the cytosol and provides resistance to mechanical stress."
                }
            ],
            "objective": "Kinesin is a microtubule-associated motor protein that functions in the anterograde transport of materials and organelles within cells. Reactivation of latent herpes simplex virus requires anterograde transport of viral particles from neuronal cell bodies in the sensory ganglia to the skin and oral mucosa.",
            "ptTranslation": {
            "vignette": "Uma mulher apresenta episódios recorrentes de vesículas dolorosas ao redor dos lábios, desencadeadas por estresse ou doença. A infecção primária ocorreu por contato com saliva contaminada, e o vírus permanece latente em gânglios sensitivos. A imagem mostra a lesão característica.",
            "q": "Durante a recorrência da doença, qual proteína motora é responsável pelo transporte das partículas virais até a pele e mucosa oral?",
            "options": [
                        {
                                    "label": "A",
                                    "text": "Dineína"
                        },
                        {
                                    "label": "B",
                                    "text": "Cinesina"
                        },
                        {
                                    "label": "C",
                                    "text": "Laminas"
                        },
                        {
                                    "label": "D",
                                    "text": "Selectinas"
                        },
                        {
                                    "label": "E",
                                    "text": "Espectrina"
                        },
                        {
                                    "label": "F",
                                    "text": "Vimentina"
                        }
            ],
            "explC": "O quadro representa herpes labial recorrente, mais frequentemente causado pelo vírus herpes simples tipo 1. Após a infecção primária, o vírus permanece latente em gânglios sensitivos, especialmente o trigeminal. Na reativação, as partículas virais precisam se deslocar do corpo neuronal em direção à pele e à mucosa oral. Esse transporte anterógrado ao longo do axônio é mediado pela cinesina, proteína motora que move cargas intracelulares para longe do núcleo e em direção ao terminal axonal, utilizando microtúbulos como trilhos e energia da hidrólise de ATP.",
            "explI": [
                        {
                                    "option": "A",
                                    "explanation": "A dineína participa do transporte axonal retrógrado, levando cargas em direção ao corpo celular. Ela ajuda a estabelecer latência, mas não leva o vírus à pele na recorrência."
                        },
                        {
                                    "option": "C",
                                    "explanation": "Laminas são proteínas da lâmina nuclear, envolvidas na sustentação do envelope nuclear e organização do genoma."
                        },
                        {
                                    "option": "D",
                                    "explanation": "Selectinas são moléculas de adesão expressas no endotélio durante a inflamação; não transportam partículas virais no axônio."
                        },
                        {
                                    "option": "E",
                                    "explanation": "Espectrina é proteína do citoesqueleto associada à membrana plasmática, importante para manter a forma das hemácias."
                        },
                        {
                                    "option": "F",
                                    "explanation": "Vimentina é filamento intermediário de células mesenquimais; não é a proteína motora responsável pelo transporte anterógrado."
                        }
            ],
            "objective": "Diferenciar transporte axonal anterógrado por cinesina, usado na reativação do HSV, do transporte retrógrado por dineína, usado para estabelecer latência."
},
            "peer": {
                "A": 28,
                "B": 59,
                "C": 2,
                "D": 2,
                "E": 2,
                "F": 4
            },
            "img": "assets/qbank/CMQ-TEST-006_herpes_labialis.png"
        },

    // BATCH 03 — Biochemistry (5 questions)
    { id:'CMQ-STEP1-BCH-0001', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::second_messengers', difficulty:'hard',
      vignette:'A research scientist develops an agent that specifically blocks the interaction of inositol triphosphate with its intracellular receptor. A study is then performed in which vascular smooth muscle cells are divided into 2 groups: an experimental group treated with the receptor blocker and an untreated control group. Both groups are exposed to phenylephrine.',
      q:'Compared to the control cells, decreased activity of which of the following enzymes is most likely to be observed in the experimental cells?',
      options:[
        {label:'A', text:'Adenylate cyclase'},
        {label:'B', text:'Lipoxygenase'},
        {label:'C', text:'Phosphodiesterase'},
        {label:'D', text:'Phospholipase C'},
        {label:'E', text:'Protein kinase C'},
      ],
      correct:'E',
      explC:'G protein-coupled receptors have a characteristic structure with 7 transmembrane regions, an extracellular domain, and an intracellular domain coupled with a G protein. In their inactivated state, G proteins exist as heterotrimers consisting of alpha, beta, and gamma subunits with GDP tightly bound to the alpha subunit. G proteins are activated after ligand binding to the extracellular domain of the receptor. The first step in activation occurs when GDP is exchanged for GTP on the alpha subunit. Once bound to GTP, the alpha subunit dissociates from the beta and gamma subunits and activates either adenylate cyclase or phospholipase C, depending on the ligand. When phenylephrine binds to an alpha-1 receptor on vascular smooth muscle cells, the alpha subunit of the G protein (Gq) activates phospholipase C, which breaks down phosphatidylinositol bisphosphate into inositol triphosphate (IP3) and diacylglycerol (DAG). DAG stimulates protein kinase C, which phosphorylates downstream intracellular proteins to produce its physiologic effects (eg, smooth muscle contraction). IP3 produces most of its effects by increasing intracellular calcium, which also activates protein kinase C. In the study described above, protein kinase C activity would be reduced in the experimental group compared to the control group as calcium release from the endoplasmic reticulum is interrupted.',
      explI:[
        {option:'A', explanation:'Activation of adenylate cyclase leads to the formation of cAMP and subsequent activation of protein kinase A. Protein kinase A phosphorylates intracellular proteins to produce its effects.'},
        {option:'B', explanation:'Lipoxygenase is an enzyme responsible for the formation of leukotrienes from arachidonic acid. It is not directly involved in the phosphatidylinositol second messenger system.'},
        {option:'C', explanation:'Phosphodiesterase is an enzyme that terminates the effects of ligands that act via cAMP or cGMP second messenger systems. It has no direct effect on the phosphatidylinositol second messenger system.'},
        {option:'D', explanation:'The activity of phospholipase C would be unchanged if IP3 were blocked because phospholipase C exerts its effect before IP3 in the phosphatidylinositol second messenger system.'},
      ],
      objective:'After a ligand binds to a G protein-coupled receptor that activates phospholipase C, membrane phospholipids are broken down into diacylglycerol (DAG) and inositol triphosphate (IP3). Protein kinase C is subsequently activated by DAG and calcium; the latter is released from the endoplasmic reticulum under the influence of IP3.',
      peer:{A:10, B:1, C:4, D:36, E:47},
      img:'assets/qbank/CMQ-STEP1-BCH-0001_phosphatidylinositol_second_messenger_system.png',
      ptTranslation:{
        vignette:'Um cientista pesquisador desenvolve um agente que bloqueia especificamente a interação do trifosfato de inositol (IP3) com seu receptor intracelular. Em seguida, é realizado um estudo no qual células musculares lisas vasculares são divididas em 2 grupos: um grupo experimental tratado com o bloqueador do receptor e um grupo controle não tratado. Ambos os grupos são expostos à fenilefrina.',
        q:'Em comparação com as células controle, a diminuição da atividade de qual das seguintes enzimas é mais provável de ser observada nas células do grupo experimental?',
        objective:'Após um ligante se ligar a um receptor acoplado à proteína G que ativa a fosfolipase C, os fosfolipídios de membrana são clivados em diacilglicerol (DAG) e trifosfato de inositol (IP3). A proteína quinase C é subsequentemente ativada pelo DAG e pelo cálcio; este último é liberado do retículo endoplasmático sob a influência do IP3.',
        options:[
          {label:'A', text:'Adenilato ciclase'},
          {label:'B', text:'Lipoxigenase'},
          {label:'C', text:'Fosfodiesterase'},
          {label:'D', text:'Fosfolipase C'},
          {label:'E', text:'Proteína quinase C'},
        ],
        explC:'Os receptores acoplados à proteína G têm uma estrutura característica com 7 regiões transmembrana, um domínio extracelular e um domínio intracelular acoplado a uma proteína G. Em seu estado inativado, as proteínas G existem como heterotrímeros compostos pelas subunidades alfa, beta e gama, com GDP fortemente ligado à subunidade alfa. As proteínas G são ativadas após a ligação do ligante ao domínio extracelular do receptor. O primeiro passo da ativação ocorre quando o GDP é trocado por GTP na subunidade alfa. Uma vez ligada ao GTP, a subunidade alfa se dissocia das subunidades beta e gama e ativa a adenilato ciclase ou a fosfolipase C, dependendo do ligante. Quando a fenilefrina se liga a um receptor alfa-1 nas células musculares lisas vasculares, a subunidade alfa da proteína G (Gq) ativa a fosfolipase C, que quebra o fosfatidilinositol bisfosfato em trifosfato de inositol (IP3) e diacilglicerol (DAG). O DAG estimula a proteína quinase C, que fosforila proteínas intracelulares a jusante para produzir seus efeitos fisiológicos (por exemplo, contração do músculo liso). O IP3 produz a maior parte de seus efeitos aumentando o cálcio intracelular, que também ativa a proteína quinase C. No estudo descrito acima, a atividade da proteína quinase C estaria reduzida no grupo experimental em comparação ao grupo controle, já que a liberação de cálcio do retículo endoplasmático é interrompida.',
        explI:[
          {option:'A', explanation:'A ativação da adenilato ciclase leva à formação de AMPc e à subsequente ativação da proteína quinase A. A proteína quinase A fosforila proteínas intracelulares para produzir seus efeitos.'},
          {option:'B', explanation:'A lipoxigenase é uma enzima responsável pela formação de leucotrienos a partir do ácido araquidônico. Ela não está diretamente envolvida no sistema de segundo mensageiro do fosfatidilinositol.'},
          {option:'C', explanation:'A fosfodiesterase é uma enzima que encerra os efeitos de ligantes que atuam pelos sistemas de segundo mensageiro AMPc ou GMPc. Ela não tem efeito direto sobre o sistema de segundo mensageiro do fosfatidilinositol.'},
          {option:'D', explanation:'A atividade da fosfolipase C permaneceria inalterada se o IP3 fosse bloqueado, pois a fosfolipase C exerce seu efeito antes do IP3 no sistema de segundo mensageiro do fosfatidilinositol.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0002', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::urea_cycle', difficulty:'medium',
      vignette:'A 2-year-old boy is brought to the emergency department with fever, vomiting, and sleepiness. He had several episodes of emesis this morning, and his mother was unable to wake him from his afternoon nap. The boy has had mild rhinorrhea and fever for the past 3 days. Since the newborn period, the parents say that the patient has had multiple illnesses characterized by vomiting and sleepiness. Prior laboratory testing revealed increased blood ammonia levels during these episodes and markedly increased orotic acid excretion in the urine. Physical examination shows a tachypneic boy who is unresponsive to all stimuli.',
      q:'Which of the following enzymes is most likely to be deficient in this patient?',
      options:[
        {label:'A', text:'Carbamoyl phosphate synthetase I'},
        {label:'B', text:'Hypoxanthine-guanine phosphoribosyltransferase'},
        {label:'C', text:'N-acetylglutamate synthetase'},
        {label:'D', text:'Ornithine transcarbamylase'},
        {label:'E', text:'Uridine monophosphate synthetase'},
      ],
      correct:'D',
      explC:'Ammonia generated from the metabolism of amino acids is converted into urea by the urea cycle. The combination of bicarbonate (HCO3-), ammonia, and ATP is catalyzed by carbamoyl phosphate synthetase (rate-limiting enzyme in the urea cycle) to yield carbamoyl phosphate. Carbamoyl phosphate combines with ornithine to form citrulline in a reaction catalyzed by ornithine transcarbamylase. Citrulline enters the cytosol and is converted to argininosuccinate, which is then converted to arginine. The conversion of arginine to ornithine by arginase completes the urea cycle by releasing a urea molecule. N-acetylglutamate serves as a regulator of the urea cycle through activation of carbamoyl phosphate synthetase I. This patient most likely has ornithine transcarbamylase (OTC) deficiency, the most common urea cycle disorder. OTC deficiency results in excess carbamoyl phosphate, which stimulates pyrimidine synthesis. As an intermediate product in this pathway, orotic acid accumulates and results in increased urinary orotic acid. Patients also have hyperammonemia due to impaired ammonia excretion, which is a metabolic emergency. Ammonia is neurotoxic and causes episodes of vomiting and confusion/coma. Tachypnea also occurs due to cerebral edema from ammonia buildup, resulting in central hyperventilation and respiratory alkalosis. Metabolic decompensation is often triggered by illness (eg, viral upper respiratory infection, acute otitis media), fasting, or increased protein intake.',
      explI:[
        {option:'A', explanation:'Although defects in carbamoyl phosphate synthetase I and N-Acetylglutamate synthetase also result in hyperammonemia, levels of carbamoyl phosphate are low and orotic acid is not elevated in the urine.'},
        {option:'B', explanation:'Hypoxanthine-guanine phosphoribosyltransferase deficiency (Lesch-Nyhan syndrome) results in hyperuricemia because purines cannot be salvaged from degraded DNA. Urate kidney stones and self-mutilation are classic clinical manifestations.'},
        {option:'C', explanation:'Although defects in carbamoyl phosphate synthetase I and N-Acetylglutamate synthetase also result in hyperammonemia, levels of carbamoyl phosphate are low and orotic acid is not elevated in the urine.'},
        {option:'E', explanation:'Uridine monophosphate synthetase (UMPS) is part of the pyrimidine synthesis pathway. UMPS deficiency leads to orotic acid buildup (similar to OTC deficiency) but not hyperammonemia. Characteristic findings include megaloblastic anemia and delayed growth.'},
      ],
      objective:'Patients with urea cycle disorders typically have discrete episodes of vomiting, tachypnea, and confusion/coma secondary to hyperammonemia (a metabolic emergency). Ornithine transcarbamylase deficiency is the most common disorder of the urea cycle and is characterized by hyperammonemia and elevated urinary orotic acid.',
      peer:{A:15, B:4, C:3, D:64, E:11},
      img:'assets/qbank/CMQ-STEP1-BCH-0002_urea_cycle.png',
      labs:[
        ['Ammonia (venous)','15–45 µg/dL (≈9–26 µmol/L)','15–45 µg/dL (≈9–26 µmol/L)','Elevated in urea cycle disorders (eg, OTC deficiency) due to impaired ammonia clearance','Elevada nos distúrbios do ciclo da ureia (ex.: deficiência de OTC) por depuração prejudicada de amônia'],
        ['Orotic acid (urine)','<1.5 mg/g creatinine (varies by lab/method)','<1,5 mg/g creatinina (varia por laboratório/método)','Markedly elevated in OTC deficiency; low/normal in CPS I and N-acetylglutamate synthetase deficiency','Marcadamente elevado na deficiência de OTC; baixo/normal na deficiência de CPS I e de N-acetilglutamato sintetase'],
      ],
      ptTranslation:{
        vignette:'Um menino de 2 anos é levado ao pronto-socorro com febre, vômitos e sonolência. Ele teve vários episódios de êmese nesta manhã, e sua mãe não conseguiu acordá-lo de sua soneca à tarde. O menino tem apresentado rinorreia leve e febre nos últimos 3 dias. Desde o período neonatal, os pais relatam que o paciente já teve múltiplas doenças caracterizadas por vômitos e sonolência. Exames laboratoriais prévios revelaram níveis aumentados de amônia no sangue durante esses episódios e excreção urinária marcadamente aumentada de ácido orótico. O exame físico mostra um menino taquipneico que não responde a nenhum estímulo.',
        q:'Qual das seguintes enzimas está mais provavelmente deficiente neste paciente?',
        objective:'Pacientes com distúrbios do ciclo da ureia tipicamente apresentam episódios discretos de vômitos, taquipneia e confusão/coma secundários à hiperamonemia (uma emergência metabólica). A deficiência de ornitina transcarbamilase é o distúrbio mais comum do ciclo da ureia e é caracterizada por hiperamonemia e ácido orótico urinário elevado.',
        options:[
          {label:'A', text:'Carbamoil fosfato sintetase I'},
          {label:'B', text:'Hipoxantina-guanina fosforribosiltransferase'},
          {label:'C', text:'N-acetilglutamato sintetase'},
          {label:'D', text:'Ornitina transcarbamilase'},
          {label:'E', text:'Uridina monofosfato sintetase'},
        ],
        explC:'A amônia gerada pelo metabolismo dos aminoácidos é convertida em ureia pelo ciclo da ureia. A combinação de bicarbonato (HCO3-), amônia e ATP é catalisada pela carbamoil fosfato sintetase (enzima limitante da velocidade no ciclo da ureia) para formar carbamoil fosfato. O carbamoil fosfato se combina com a ornitina para formar citrulina em uma reação catalisada pela ornitina transcarbamilase. A citrulina entra no citosol e é convertida em argininossuccinato, que então é convertido em arginina. A conversão de arginina em ornitina pela arginase completa o ciclo da ureia ao liberar uma molécula de ureia. O N-acetilglutamato atua como regulador do ciclo da ureia por meio da ativação da carbamoil fosfato sintetase I. Este paciente muito provavelmente tem deficiência de ornitina transcarbamilase (OTC), o distúrbio mais comum do ciclo da ureia. A deficiência de OTC resulta em excesso de carbamoil fosfato, que estimula a síntese de pirimidinas. Como produto intermediário dessa via, o ácido orótico se acumula e resulta em aumento do ácido orótico urinário. Os pacientes também apresentam hiperamonemia devido à excreção prejudicada de amônia, o que constitui uma emergência metabólica. A amônia é neurotóxica e causa episódios de vômitos e confusão/coma. A taquipneia também ocorre devido ao edema cerebral causado pelo acúmulo de amônia, resultando em hiperventilação central e alcalose respiratória. A descompensação metabólica é frequentemente desencadeada por doenças (por exemplo, infecção viral de vias aéreas superiores, otite média aguda), jejum ou aumento da ingestão proteica.',
        explI:[
          {option:'A', explanation:'Embora defeitos na carbamoil fosfato sintetase I e na N-acetilglutamato sintetase também resultem em hiperamonemia, os níveis de carbamoil fosfato são baixos e o ácido orótico não está elevado na urina.'},
          {option:'B', explanation:'A deficiência de hipoxantina-guanina fosforribosiltransferase (síndrome de Lesch-Nyhan) resulta em hiperuricemia, pois as purinas não podem ser resgatadas a partir do DNA degradado. Cálculos renais de urato e automutilação são manifestações clínicas clássicas.'},
          {option:'C', explanation:'Embora defeitos na carbamoil fosfato sintetase I e na N-acetilglutamato sintetase também resultem em hiperamonemia, os níveis de carbamoil fosfato são baixos e o ácido orótico não está elevado na urina.'},
          {option:'E', explanation:'A uridina monofosfato sintetase (UMPS) faz parte da via de síntese de pirimidinas. A deficiência de UMPS leva ao acúmulo de ácido orótico (semelhante à deficiência de OTC), porém sem hiperamonemia. Achados característicos incluem anemia megaloblástica e atraso do crescimento.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0003', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'hard',
      vignette:'As part of a research study investigating enzymatic activity in both normal and diseased liver tissue, hepatocytes are isolated from biopsy samples obtained from patients undergoing routine care at a local tertiary referral center. The cells are homogenized and centrifuged to remove membrane components and organelles. Following subsequent rounds of centrifugation, the remaining supernatant contains only cytosol and cytosolic proteins.',
      q:'Activity of which of the following enzymes will most likely be detectable in the supernatant of healthy liver cells?',
      options:[
        {label:'A', text:'3-Hydroxy-3-methylglutaryl-CoA lyase'},
        {label:'B', text:'Ornithine transcarbamylase'},
        {label:'C', text:'Pyruvate carboxylase'},
        {label:'D', text:'Succinate dehydrogenase'},
        {label:'E', text:'Transketolase'},
      ],
      correct:'E',
      explC:'Enzymes and the biochemical processes they catalyze often require distinct chemical environments for optimal function; small variations in temperature, molecular concentrations, and pH may render them ineffective. Cellular compartmentalization provides a means by which multiple heterogeneous environments can exist within a cell. Organelles such as the nucleus and mitochondria form distinct, membrane-bound regions with a chemical composition different from the cytosol. This allows multiple biochemical processes to occur simultaneously at maximum efficiency. The cytosol and mitochondria are the predominant sites of metabolism in the cell. Mitochondria are the site of beta-oxidation of fatty acids, the citric acid cycle, and the carboxylation of pyruvate (gluconeogenesis). The cytosol is home to enzymes necessary for glycolysis, fatty acid synthesis, and the pentose phosphate pathway. Transketolase is an enzyme of the pentose phosphate pathway that uses thiamine (vitamin B1) as a cofactor to shuttle 2-carbon fragments between sugar molecules. Other processes such as heme synthesis, the urea cycle, and gluconeogenesis rely on a complex interplay between the mitochondria and cytosol to function optimally; enzymes present in both cellular compartments are required for these metabolic pathways.',
      explI:[
        {option:'A', explanation:'3-Hydroxy-3-methylglutaryl-CoA (HMG CoA) lyase is a mitochondrial enzyme necessary for ketogenesis. It is also responsible for metabolism of the ketogenic amino acid, leucine.'},
        {option:'B', explanation:'Ornithine transcarbamylase catalyzes the combination of ornithine and carbamoyl phosphate to form citrulline in the urea cycle. This reaction occurs within the mitochondria.'},
        {option:'C', explanation:'Pyruvate carboxylase catalyzes the initial step in gluconeogenesis by converting pyruvate to oxaloacetate. This enzyme requires biotin as a cofactor, and functions within the mitochondria.'},
        {option:'D', explanation:'Succinate dehydrogenase is a TCA cycle enzyme that converts succinate to fumarate. It is an inner mitochondrial membrane protein and functions as part of the electron transport chain.'},
      ],
      objective:'Cellular compartmentalization allows multiple biochemical processes to occur simultaneously at maximum efficiency. Beta-oxidation of fatty acids, the TCA cycle, and the carboxylation of pyruvate (gluconeogenesis) all occur within the mitochondria. The enzymes responsible for glycolysis, fatty acid synthesis, and the pentose phosphate pathway reside in the cytosol.',
      peer:{A:11, B:19, C:26, D:7, E:35},
      ptTranslation:{
        vignette:'Como parte de um estudo de pesquisa que investiga a atividade enzimática em tecido hepático normal e doente, hepatócitos são isolados a partir de amostras de biópsia obtidas de pacientes em atendimento de rotina em um centro de referência terciário local. As células são homogeneizadas e centrifugadas para remover componentes de membrana e organelas. Após rodadas subsequentes de centrifugação, o sobrenadante restante contém apenas citosol e proteínas citosólicas.',
        q:'A atividade de qual das seguintes enzimas será mais provavelmente detectável no sobrenadante de células hepáticas saudáveis?',
        objective:'A compartimentalização celular permite que múltiplos processos bioquímicos ocorram simultaneamente com eficiência máxima. A beta-oxidação de ácidos graxos, o ciclo do ATC e a carboxilação do piruvato (gliconeogênese) ocorrem todos dentro da mitocôndria. As enzimas responsáveis pela glicólise, síntese de ácidos graxos e via das pentoses fosfato residem no citosol.',
        options:[
          {label:'A', text:'3-Hidroxi-3-metilglutaril-CoA liase'},
          {label:'B', text:'Ornitina transcarbamilase'},
          {label:'C', text:'Piruvato carboxilase'},
          {label:'D', text:'Succinato desidrogenase'},
          {label:'E', text:'Transcetolase'},
        ],
        explC:'Enzimas e os processos bioquímicos que catalisam frequentemente requerem ambientes químicos distintos para funcionamento ideal; pequenas variações de temperatura, concentrações moleculares e pH podem torná-las ineficazes. A compartimentalização celular fornece um meio pelo qual múltiplos ambientes heterogêneos podem existir dentro de uma célula. Organelas como o núcleo e a mitocôndria formam regiões distintas, delimitadas por membrana, com composição química diferente do citosol. Isso permite que múltiplos processos bioquímicos ocorram simultaneamente com eficiência máxima. O citosol e a mitocôndria são os principais locais de metabolismo na célula. A mitocôndria é o local da beta-oxidação de ácidos graxos, do ciclo do ácido cítrico e da carboxilação do piruvato (gliconeogênese). O citosol abriga as enzimas necessárias para a glicólise, síntese de ácidos graxos e a via das pentoses fosfato. A transcetolase é uma enzima da via das pentoses fosfato que usa tiamina (vitamina B1) como cofator para transferir fragmentos de 2 carbonos entre moléculas de açúcar. Outros processos, como a síntese do heme, o ciclo da ureia e a gliconeogênese, dependem de uma interação complexa entre a mitocôndria e o citosol para funcionar de forma ideal; enzimas presentes em ambos os compartimentos celulares são necessárias para essas vias metabólicas.',
        explI:[
          {option:'A', explanation:'A 3-hidroxi-3-metilglutaril-CoA (HMG-CoA) liase é uma enzima mitocondrial necessária para a cetogênese. Ela também é responsável pelo metabolismo do aminoácido cetogênico leucina.'},
          {option:'B', explanation:'A ornitina transcarbamilase catalisa a combinação de ornitina e carbamoil fosfato para formar citrulina no ciclo da ureia. Essa reação ocorre dentro da mitocôndria.'},
          {option:'C', explanation:'A piruvato carboxilase catalisa a etapa inicial da gliconeogênese, convertendo piruvato em oxaloacetato. Essa enzima requer biotina como cofator e funciona dentro da mitocôndria.'},
          {option:'D', explanation:'A succinato desidrogenase é uma enzima do ciclo do ATC que converte succinato em fumarato. É uma proteína da membrana mitocondrial interna e funciona como parte da cadeia transportadora de elétrons.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0004', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::vitamins_cofactors', difficulty:'hard',
      vignette:'A 78-year-old woman comes to the office due to tenderness and easy bleeding of the gums when she brushes her teeth. The patient has brushed her teeth twice a day for as long as she can remember and has not experienced these symptoms before. Physical examination shows swollen gingiva that bleed on probing. Her skin findings are shown in the image below. Further questioning reveals that the patient lives alone and that her diet consists primarily of tea and toast.',
      q:'Her symptoms are most likely caused by hypoactivity of an enzyme found in which of the following compartments?',
      options:[
        {label:'A', text:'Extracellular space'},
        {label:'B', text:'Golgi apparatus'},
        {label:'C', text:'Lysosomes'},
        {label:'D', text:'Mitochondria'},
        {label:'E', text:'Nucleus'},
        {label:'F', text:'Rough endoplasmic reticulum'},
      ],
      correct:'F',
      explC:'Disorders caused by defective collagen synthesis — Ehlers-Danlos syndrome (types I & II): joint hypermobility, hyperextensible/fragile skin, most common form of Ehlers-Danlos; impairment: mutation in type V collagen. Osteogenesis imperfecta: spontaneous fractures, bone & tooth malformation, blue sclerae; impairment: mutation in type I collagen. Scurvy: bleeding gums, ecchymosis & petechiae, impaired wound healing; impairment: lack of vitamin C impairs collagen hydroxylation. This patient likely has vitamin C deficiency (scurvy). In the United States, vitamin C deficiency is seen primarily among malnourished populations, including patients with alcohol use disorder and the elderly. The symptoms of scurvy reflect impaired formation of collagen and include gingival swelling/bleeding, petechiae, ecchymoses, and poor wound healing. Perifollicular hemorrhages and coiled (corkscrew) hairs are also commonly seen. Collagen synthesis is a complex process that begins with the transcription of collagen genes in the nucleus. Collagen α-chains are then synthesized by rough endoplasmic reticulum (RER)-bound ribosomes and directed into the cisternae of the RER. Within the RER, specific proline and lysine residues are post-translationally hydroxylated to hydroxyproline and hydroxylysine by prolyl hydroxylase and lysyl hydroxylase, respectively. Vitamin C is a required cofactor for this post-translational modification. Defective hydroxylation of these residues severely diminishes the amount of collagen secreted by fibroblasts and impairs triple helix stability and covalent crosslink formation.',
      explI:[
        {option:'A', explanation:'After formation of the triple helix, procollagen molecules are secreted from the cell via the Golgi apparatus. Propeptides at the N- and C-terminals are cleaved by extracellular procollagen peptidase to form insoluble tropocollagen molecules. These monomers then self-assemble into collagen fibrils that are subsequently crosslinked via lysyl oxidase.'},
        {option:'B', explanation:'After formation of the triple helix, procollagen molecules are secreted from the cell via the Golgi apparatus. Propeptides at the N- and C-terminals are cleaved by extracellular procollagen peptidase to form insoluble tropocollagen molecules. These monomers then self-assemble into collagen fibrils that are subsequently crosslinked via lysyl oxidase.'},
        {option:'C', explanation:'Lysosomes and mitochondria are not directly involved in the synthesis of collagen.'},
        {option:'D', explanation:'Lysosomes and mitochondria are not directly involved in the synthesis of collagen.'},
        {option:'E', explanation:'Collagen synthesis begins with the transcription of collagen genes in the nucleus; however, the vitamin C-dependent hydroxylation that is defective in this patient occurs later, in the rough endoplasmic reticulum.'},
      ],
      objective:'The hydroxylation of proline and lysine residues in collagen helps it attain its maximum tensile strength. This process occurs in the rough endoplasmic reticulum and requires vitamin C as a cofactor. Impaired collagen synthesis resulting from vitamin C deficiency (scurvy) can lead to fragile vessels, predisposing to gingival bleeding, ecchymosis, and petechiae.',
      peer:{A:16, B:14, C:5, D:10, E:3, F:49},
      img:'assets/qbank/CMQ-STEP1-BCH-0004_scurvy_perifollicular_hemorrhages.jpg',
      labs:[
        ['Vitamin C (ascorbic acid), plasma','0.4–2.0 mg/dL (deficient: <0.2 mg/dL)','0,4–2,0 mg/dL (deficiência: <0,2 mg/dL)','Low in scurvy; needed as a cofactor for prolyl and lysyl hydroxylase in collagen synthesis','Baixa no escorbuto; necessária como cofator da prolil e lisil hidroxilase na síntese de colágeno'],
      ],
      ptTranslation:{
        vignette:'Uma mulher de 78 anos vem ao consultório devido a sensibilidade e sangramento fácil das gengivas ao escovar os dentes. A paciente escova os dentes duas vezes ao dia desde que se lembra e nunca havia apresentado esses sintomas antes. O exame físico mostra gengiva edemaciada que sangra à sondagem. Seus achados cutâneos são mostrados na imagem abaixo. Questionamento adicional revela que a paciente mora sozinha e que sua dieta consiste principalmente em chá e torrada.',
        q:'Seus sintomas são mais provavelmente causados pela hipoatividade de uma enzima encontrada em qual dos seguintes compartimentos?',
        objective:'A hidroxilação dos resíduos de prolina e lisina no colágeno ajuda a atingir sua força de tensão máxima. Esse processo ocorre no retículo endoplasmático rugoso e requer vitamina C como cofator. A síntese prejudicada de colágeno resultante da deficiência de vitamina C (escorbuto) pode levar a vasos frágeis, predispondo a sangramento gengival, equimose e petéquias.',
        options:[
          {label:'A', text:'Espaço extracelular'},
          {label:'B', text:'Complexo de Golgi'},
          {label:'C', text:'Lisossomos'},
          {label:'D', text:'Mitocôndria'},
          {label:'E', text:'Núcleo'},
          {label:'F', text:'Retículo endoplasmático rugoso'},
        ],
        explC:'Distúrbios causados por síntese defeituosa de colágeno — Síndrome de Ehlers-Danlos (tipos I e II): hipermobilidade articular, pele hiperextensível e frágil, forma mais comum de Ehlers-Danlos; comprometimento: mutação no colágeno tipo V. Osteogênese imperfeita: fraturas espontâneas, malformação óssea e dentária, esclera azulada; comprometimento: mutação no colágeno tipo I. Escorbuto: sangramento gengival, equimose e petéquias, cicatrização de feridas prejudicada; comprometimento: a falta de vitamina C prejudica a hidroxilação do colágeno. Esta paciente provavelmente tem deficiência de vitamina C (escorbuto). Nos Estados Unidos, a deficiência de vitamina C é observada principalmente em populações desnutridas, incluindo pacientes com transtorno por uso de álcool e idosos. Os sintomas do escorbuto refletem a formação prejudicada de colágeno e incluem edema/sangramento gengival, petéquias, equimoses e cicatrização de feridas deficiente. Hemorragias perifoliculares e pelos em saca-rolhas (enrolados) também são comumente observados. A síntese de colágeno é um processo complexo que começa com a transcrição dos genes do colágeno no núcleo. As cadeias alfa de colágeno são então sintetizadas por ribossomos ligados ao retículo endoplasmático rugoso (RER) e direcionadas para as cisternas do RER. Dentro do RER, resíduos específicos de prolina e lisina são hidroxilados pós-traducionalmente a hidroxiprolina e hidroxilisina pela prolil hidroxilase e lisil hidroxilase, respectivamente. A vitamina C é um cofator necessário para essa modificação pós-traducional. A hidroxilação defeituosa desses resíduos diminui gravemente a quantidade de colágeno secretado pelos fibroblastos e prejudica a estabilidade da hélice tripla e a formação de ligações cruzadas covalentes.',
        explI:[
          {option:'A', explanation:'Após a formação da hélice tripla, as moléculas de pró-colágeno são secretadas da célula por meio do complexo de Golgi. Os propeptídeos nos terminais N e C são clivados pela procolágeno peptidase extracelular para formar moléculas insolúveis de tropocolágeno. Esses monômeros então se auto-organizam em fibrilas de colágeno que são posteriormente ligadas de forma cruzada pela lisil oxidase.'},
          {option:'B', explanation:'Após a formação da hélice tripla, as moléculas de pró-colágeno são secretadas da célula por meio do complexo de Golgi. Os propeptídeos nos terminais N e C são clivados pela procolágeno peptidase extracelular para formar moléculas insolúveis de tropocolágeno. Esses monômeros então se auto-organizam em fibrilas de colágeno que são posteriormente ligadas de forma cruzada pela lisil oxidase.'},
          {option:'C', explanation:'Lisossomos e mitocôndrias não estão diretamente envolvidos na síntese de colágeno.'},
          {option:'D', explanation:'Lisossomos e mitocôndrias não estão diretamente envolvidos na síntese de colágeno.'},
          {option:'E', explanation:'A síntese de colágeno começa com a transcrição dos genes do colágeno no núcleo; porém, a hidroxilação dependente de vitamina C que está deficiente nesta paciente ocorre posteriormente, no retículo endoplasmático rugoso.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0005', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'medium',
      vignette:'As part of an experiment, healthy volunteers undergo a 12-hour fast and then drink a solution containing radiolabeled alanine. Consecutive blood samples are drawn every 15 minutes for the next 3 hours. Initial blood samples detect the radiolabeled alanine, but analysis of later samples shows that the radiotracer is present in blood primarily in the form of glucose.',
      q:'Before alanine can be converted to glucose, its amino group is transferred to which of the following?',
      options:[
        {label:'A', text:'α-Ketoglutarate'},
        {label:'B', text:'L-citrulline'},
        {label:'C', text:'Malate'},
        {label:'D', text:'Citrate'},
        {label:'E', text:'Oxaloacetate'},
      ],
      correct:'A',
      explC:'Alanine and glutamine play an important role in transporting nitrogen throughout the body. Glutamine is produced by most body tissues and is catabolized primarily by the gut and kidney for maintenance of cellular metabolism and acid-base regulation, respectively. A significant portion of the glutamine used by these tissues is converted to alanine and released into the circulation. Alanine is also released by skeletal muscle tissue during protein catabolism as part of the glucose-alanine cycle that helps remove excess nitrogen. Alanine is then transported to the liver, where it serves as a vehicle for nitrogen disposal and as a source of carbon skeletons for gluconeogenesis. In the liver, alanine is transaminated by alanine aminotransferase to pyruvate with the amino group being transferred to α-ketoglutarate to form glutamate. Almost all aminotransferase enzymes use α-ketoglutarate as the amino group acceptor. Thus, amino groups are funneled into glutamate during protein catabolism. Glutamate is further metabolized by the enzyme glutamate dehydrogenase, which liberates free ammonia and regenerates α-ketoglutarate. Ammonia then enters the urea cycle to form urea, the primary disposal form of nitrogen in humans. Urea subsequently enters the blood and is excreted in the urine.',
      explI:[
        {option:'B', explanation:'L-citrulline is an amino acid produced as an intermediate in the conversion of ornithine to argininosuccinate during the hepatic urea cycle.'},
        {option:'C', explanation:'Malate, citrate, and oxaloacetate are all intermediates of the tricarboxylic acid cycle.'},
        {option:'D', explanation:'Malate, citrate, and oxaloacetate are all intermediates of the tricarboxylic acid cycle.'},
        {option:'E', explanation:'Malate, citrate, and oxaloacetate are all intermediates of the tricarboxylic acid cycle.'},
      ],
      objective:'Alanine is the major amino acid responsible for transferring nitrogen to the liver for disposal. During the catabolism of proteins, amino groups are transferred to α-ketoglutarate to form glutamate. Glutamate is then processed in the liver to form urea, the primary disposal form of nitrogen in humans. Free ammonia is also excreted into the urine by the kidney for regulation of acid-base status.',
      peer:{A:61, B:5, C:7, D:5, E:20},
      img:'assets/qbank/CMQ-STEP1-BCH-0005_alanine_glucose_cycle_urea_cycle.png',
      ptTranslation:{
        vignette:'Como parte de um experimento, voluntários saudáveis passam por um jejum de 12 horas e depois bebem uma solução contendo alanina radiomarcada. Amostras de sangue consecutivas são coletadas a cada 15 minutos durante as 3 horas seguintes. As amostras de sangue iniciais detectam a alanina radiomarcada, mas a análise de amostras posteriores mostra que o radiotraçador está presente no sangue principalmente na forma de glicose.',
        q:'Antes que a alanina possa ser convertida em glicose, seu grupo amino é transferido para qual das seguintes substâncias?',
        objective:'A alanina é o principal aminoácido responsável por transferir nitrogênio para o fígado para eliminação. Durante o catabolismo de proteínas, os grupos amino são transferidos para o α-cetoglutarato para formar glutamato. O glutamato é então processado no fígado para formar ureia, a principal forma de eliminação de nitrogênio em humanos. A amônia livre também é excretada na urina pelo rim para regulação do estado ácido-base.',
        options:[
          {label:'A', text:'α-Cetoglutarato'},
          {label:'B', text:'L-citrulina'},
          {label:'C', text:'Malato'},
          {label:'D', text:'Citrato'},
          {label:'E', text:'Oxaloacetato'},
        ],
        explC:'A alanina e a glutamina desempenham um papel importante no transporte de nitrogênio pelo corpo. A glutamina é produzida pela maioria dos tecidos do corpo e é catabolizada principalmente pelo intestino e pelo rim para manutenção do metabolismo celular e regulação do equilíbrio ácido-base, respectivamente. Uma parte significativa da glutamina utilizada por esses tecidos é convertida em alanina e liberada na circulação. A alanina também é liberada pelo tecido muscular esquelético durante o catabolismo proteico como parte do ciclo glicose-alanina, que ajuda a remover o excesso de nitrogênio. A alanina é então transportada até o fígado, onde serve como veículo para a eliminação de nitrogênio e como fonte de esqueletos de carbono para a gliconeogênese. No fígado, a alanina é transaminada pela alanina aminotransferase a piruvato, com o grupo amino sendo transferido para o α-cetoglutarato para formar glutamato. Praticamente todas as enzimas aminotransferases usam o α-cetoglutarato como aceptor do grupo amino. Assim, os grupos amino são canalizados para o glutamato durante o catabolismo proteico. O glutamato é ainda metabolizado pela enzima glutamato desidrogenase, que libera amônia livre e regenera o α-cetoglutarato. A amônia então entra no ciclo da ureia para formar ureia, a principal forma de eliminação de nitrogênio em humanos. A ureia subsequentemente entra no sangue e é excretada na urina.',
        explI:[
          {option:'B', explanation:'A L-citrulina é um aminoácido produzido como intermediário na conversão de ornitina em argininossuccinato durante o ciclo hepático da ureia.'},
          {option:'C', explanation:'Malato, citrato e oxaloacetato são todos intermediários do ciclo do ácido tricarboxílico.'},
          {option:'D', explanation:'Malato, citrato e oxaloacetato são todos intermediários do ciclo do ácido tricarboxílico.'},
          {option:'E', explanation:'Malato, citrato e oxaloacetato são todos intermediários do ciclo do ácido tricarboxílico.'},
        ]
      }
    },
  ];

  /* --- Expor contagem total para sidebar --- */
  window.QBANK_TOTAL = SEED.length;

  /* ---------- ponte de busca global (window.CMSearchProviders.qbank) ----------
     Registrado ANTES do guard de página abaixo, para que a busca funcione em
     qualquer lugar do site — não só quando o usuário está na tela do QBank.
     Expõe as questões (vinheta/stem/opções/explicação) e notas do notebook do
     usuário para o índice de busca central em site.js, sem acoplar os módulos —
     site.js chama isto sob demanda, só quando o usuário digita algo na busca. */
  window.CMSearchProviders = window.CMSearchProviders || {};
  window.CMSearchProviders.qbank = function(){
    const items = [];
    SEED.forEach(q=>{
      const parts = [q.vignette, q.q, ...(q.options||[]).map(o=>o.text), q.explC, q.objective].filter(Boolean);
      items.push({
        label: q.q || q.vignette.slice(0,60),
        snippetSource: parts.join(' — '),
        href: `app.html?page=qbank-1&u=${USER}`,
        cat: 'QBank · Questões'
      });
    });
    try{
      const db = JSON.parse(localStorage.getItem(KEY));
      (db && db.notebook || []).forEach(n=>{
        if(!n.text) return;
        const q = SEED.find(x=>x.id===n.question_id);
        items.push({
          label: 'Nota — ' + (q ? q.q : n.question_id),
          snippetSource: n.text,
          href: `app.html?page=qbank-1&u=${USER}`,
          cat: 'QBank · Notebook'
        });
      });
    }catch(e){}
    return items;
  };

  // guard de página: todo o restante do arquivo (UI completa do QBank) só roda
  // quando o usuário está de fato numa página do QBank — o provider acima já
  // ficou registrado e funciona independente disso.
  if(!QB_PAGES.includes(PAGE)) return;

  const ROOT_CAUSES = [
    {id:'knowledge_gap',              en:'Knowledge gap',                 pt:'Falta de conteúdo'},
    {id:'similar_diagnosis_confusion',en:'Confused similar diagnoses',    pt:'Confundi diagnósticos parecidos'},
    {id:'mechanism_misunderstanding', en:'Misunderstood the mechanism',   pt:'Entendi mal o mecanismo'},
    {id:'reading_error',              en:'Misread the vignette',          pt:'Erro de leitura da vinheta'},
    {id:'time_pressure',              en:'Time pressure',                 pt:'Pressão do tempo'},
  ];

  /* ===================== TAXONOMIA OFICIAL (Systems → Subjects) =====================
     Taxonomia oficial de sistemas e disciplinas do USMLE Step 1. Cada subtópico tem id namespaced
     por sistema (systemId::slug) para garantir unicidade. É a fonte única do accordion. */
  const TAXONOMY = [
    {id:'biochemistry', name:'Biochemistry', subs:[
      ['amino_acids_proteins_enzymes','Amino acids, proteins, and enzymes'],['bioenergetics_carb_metabolism','Bioenergetics and carbohydrate metabolism'],['cell_molecular_biology','Cell and molecular biology'],['lipid_metabolism','Lipid metabolism'],['second_messengers','Second messengers'],['urea_cycle','Urea cycle'],['vitamins_cofactors','Vitamins and cofactors'],['misc','Others']]},
    {id:'genetics', name:'Genetics', subs:[
      ['clinical_genetics','Clinical genetics'],['dna_structure_replication_repair','DNA structure, replication, and repair'],['gene_expression_regulation','Gene expression and regulation'],['protein_synthesis','Protein synthesis'],['rna_structure_synthesis_processing','RNA structure, synthesis, and processing'],['misc','Others']]},
    {id:'microbiology', name:'Microbiology', subs:[
      ['bacteriology','Bacteriology'],['mycology','Mycology'],['parasitology','Parasitology'],['virology','Virology'],['misc','Others']]},
    {id:'pathology', name:'Pathology', subs:[
      ['cellular_pathology','Cellular pathology'],['inflammation_repair','Inflammation and repair'],['neoplasia','Neoplasia']]},
    {id:'pharmacology', name:'Pharmacology', subs:[
      ['drug_metabolism_toxicity','Drug metabolism and toxicity'],['drug_receptors_pharmacodynamics','Drug receptors and pharmacodynamics'],['pharmacokinetics','Pharmacokinetics'],['misc','Others']]},
    {id:'biostatistics_epidemiology', name:'Biostatistics & Epidemiology', subs:[
      ['epidemiology_population_health','Epidemiology and population health'],['measures_distribution_data','Measures and distribution of data'],['probability_principles_testing','Probability and principles of testing'],['study_design_interpretation','Study design and interpretation'],['hypothesis_testing','Hypothesis testing'],['misc','Others']]},
    {id:'poisoning_environmental', name:'Poisoning & Environmental Exposure', subs:[
      ['environmental_exposure','Environmental exposure'],['toxicology','Toxicology']]},
    {id:'allergy_immunology', name:'Allergy & Immunology', subs:[
      ['anaphylaxis_allergic_reactions','Anaphylaxis and allergic reactions'],['autoimmune_diseases','Autoimmune diseases'],['immune_deficiencies','Immune deficiencies'],['transplant_medicine','Transplant medicine'],['principles_immunology','Principles of immunology'],['misc','Others']]},
    {id:'cardiovascular', name:'Cardiovascular System', subs:[
      ['normal_cv','Normal structure and function of the cardiovascular system'],['aortic_peripheral_artery','Aortic and peripheral artery diseases'],['cardiac_arrhythmias','Cardiac arrhythmias'],['congenital_heart_disease','Congenital heart disease'],['coronary_heart_disease','Coronary heart disease'],['heart_failure_shock','Heart failure and shock'],['hypertension','Hypertension'],['myopericardial_diseases','Myopericardial diseases'],['valvular_heart_diseases','Valvular heart diseases'],['cardiovascular_drugs','Cardiovascular drugs'],['misc','Others']]},
    {id:'dermatology', name:'Dermatology', subs:[
      ['normal_skin','Normal structure and function of skin'],['disorders_epidermal_appendages','Disorders of epidermal appendages'],['inflammatory_dermatoses_bullous','Inflammatory dermatoses and bullous diseases'],['skin_soft_tissue_infections','Skin and soft tissue infections'],['skin_tumors','Skin tumors and tumor-like lesions'],['misc','Others']]},
    {id:'ent', name:'Ear, Nose & Throat (ENT)', subs:[
      ['disorders_ent','Disorders of the ear, nose, and throat']]},
    {id:'endocrine', name:'Endocrine, Diabetes & Metabolism', subs:[
      ['normal_endocrine','Normal structure and function of endocrine glands'],['congenital_dev_anomalies','Congenital and developmental anomalies'],['adrenal_disorders','Adrenal disorders'],['diabetes_mellitus','Diabetes mellitus'],['endocrine_tumors','Endocrine tumors'],['hypothalamus_pituitary','Hypothalamus and pituitary disorders'],['obesity_dyslipidemia','Obesity and dyslipidemia'],['reproductive_endocrinology','Reproductive endocrinology'],['thyroid_disorders','Thyroid disorders'],['misc','Others']]},
    {id:'female_repro_breast', name:'Female Reproductive System & Breast', subs:[
      ['normal_female_repro','Normal structure and function of the female reproductive system and breast'],['congenital_dev_anomalies','Congenital and developmental anomalies'],['breast_disorders','Breast disorders'],['genital_tract_tumors','Genital tract tumors and tumor-like lesions'],['genitourinary_infections','Genitourinary tract infections'],['menstrual_disorders_contraception','Menstrual disorders and contraception'],['misc','Others']]},
    {id:'gi_nutrition', name:'Gastrointestinal & Nutrition', subs:[
      ['normal_gi','Normal structure and function of the GI tract'],['congenital_dev_anomalies','Congenital and developmental anomalies'],['biliary_tract','Biliary tract disorders'],['disorders_nutrition','Disorders of nutrition'],['gastroesophageal','Gastroesophageal disorders'],['hepatic','Hepatic disorders'],['intestinal_colorectal','Intestinal and colorectal disorders'],['pancreatic','Pancreatic disorders'],['tumors_gi','Tumors of the GI tract'],['misc','Others']]},
    {id:'heme_onc', name:'Hematology & Oncology', subs:[
      ['normal_heme','Normal hematologic structure and function'],['hemostasis_thrombosis','Hemostasis and thrombosis'],['plasma_cell','Plasma cell disorders'],['platelet_disorders','Platelet disorders'],['rbc_disorders','Red blood cell disorders'],['transfusion_medicine','Transfusion medicine'],['wbc_disorders','White blood cell disorders'],['principles_oncology','Principles of oncology'],['misc','Others']]},
    {id:'infectious_diseases', name:'Infectious Diseases', subs:[
      ['antimicrobial_drugs','Antimicrobial drugs'],['bacterial_infections','Bacterial infections'],['fungal_infections','Fungal infections'],['hiv_sti','HIV and sexually transmitted infections'],['infection_control','Infection control'],['parasitic_helminthic','Parasitic and helminthic infections'],['viral_infections','Viral infections'],['misc','Others']]},
    {id:'male_repro', name:'Male Reproductive System', subs:[
      ['normal_male_repro','Normal structure and function of the male reproductive system'],['disorders_male_repro','Disorders of the male reproductive system']]},
    {id:'nervous_system', name:'Nervous System', subs:[
      ['normal_nervous','Normal structure and function of the nervous system'],['congenital_dev_anomalies','Congenital and developmental anomalies'],['cerebrovascular_disease','Cerebrovascular disease'],['cns_infections','CNS infections'],['demyelinating_diseases','Demyelinating diseases'],['peripheral_nerves_muscles','Disorders of peripheral nerves and muscles'],['headache','Headache'],['neurodegenerative_dementias','Neurodegenerative disorders and dementias'],['seizures_epilepsy','Seizures and epilepsy'],['spinal_cord_disorders','Spinal cord disorders'],['traumatic_brain_injuries','Traumatic brain injuries'],['tumors_nervous','Tumors of the nervous system'],['hydrocephalus','Hydrocephalus'],['anesthesia','Anesthesia'],['sleep_disorders','Sleep disorders'],['misc','Others']]},
    {id:'ophthalmology', name:'Ophthalmology', subs:[
      ['normal_eye','Normal structure and function of the eye and associated structures'],['disorders_eye','Disorders of the eye and associated structures']]},
    {id:'pregnancy_childbirth', name:'Pregnancy, Childbirth & Puerperium', subs:[
      ['normal_pregnancy','Normal pregnancy, childbirth, and puerperium'],['disorders_pregnancy','Disorders of pregnancy, childbirth, and puerperium']]},
    {id:'psychiatric_behavioral', name:'Psychiatric/Behavioral & Substance Use Disorder', subs:[
      ['normal_behavior_development','Normal behavior and development'],['anxiety_trauma','Anxiety and trauma-related disorders'],['mood_disorders','Mood disorders'],['neurodevelopmental_disorders','Neurodevelopmental disorders'],['personality_disorders','Personality disorders'],['psychotic_disorders','Psychotic disorders'],['substance_use_disorders','Substance use disorders'],['eating_disorders','Eating disorders'],['somatoform_disorders','Somatoform disorders'],['misc','Others']]},
    {id:'pulmonary_critical_care', name:'Pulmonary & Critical Care', subs:[
      ['normal_pulmonary','Normal pulmonary structure and function'],['congenital_dev_anomalies','Congenital and developmental anomalies'],['critical_care','Critical care medicine'],['interstitial_lung','Interstitial lung disease'],['lung_cancer','Lung cancer'],['obstructive_lung','Obstructive lung disease'],['pulmonary_infections','Pulmonary infections'],['pulmonary_vascular','Pulmonary vascular disease'],['sleep_disorders','Sleep disorders'],['misc','Others']]},
    {id:'renal_urinary', name:'Renal, Urinary Systems & Electrolytes', subs:[
      ['normal_renal','Normal structure and function of the kidneys and urinary system'],['congenital_dev_anomalies','Congenital and developmental anomalies'],['acute_kidney_injury','Acute kidney injury'],['bone_metabolism','Bone metabolism'],['chronic_kidney_disease','Chronic kidney disease'],['cystic_kidney','Cystic kidney diseases'],['fluid_electrolytes_acidbase','Fluid, electrolytes, and acid-base'],['glomerular_diseases','Glomerular diseases'],['neoplasms_kidney_urinary','Neoplasms of the kidneys and urinary tract'],['nephrolithiasis_obstruction','Nephrolithiasis and urinary tract obstruction'],['diabetes_insipidus','Diabetes insipidus'],['urinary_incontinence','Urinary incontinence'],['misc','Others']]},
    {id:'rheum_ortho', name:'Rheumatology/Orthopedics & Sports', subs:[
      ['normal_msk','Normal structure and function of the musculoskeletal system'],['congenital_dev_anomalies','Congenital and developmental anomalies'],['arthritis_spondylo','Arthritis and spondyloarthropathies'],['autoimmune_vasculitides','Autoimmune disorders and vasculitides'],['bone_joint_injuries_infections','Bone/joint injuries and infections'],['bone_tumors','Bone tumors and tumor-like lesions'],['spinal_disorders_back_pain','Spinal disorders and back pain'],['metabolic_bone','Metabolic bone disorders'],['misc','Others']]},
    {id:'social_sciences', name:'Social Sciences (Ethics/Legal/Professional)', subs:[
      ['communication_interpersonal','Communication and interpersonal skills'],['healthcare_policy_economics','Healthcare policy and economics'],['medical_ethics_jurisprudence','Medical ethics and jurisprudence'],['patient_safety','Patient safety'],['system_based_practice_qi','System based-practice and quality improvement'],['misc','Others']]},
    {id:'multisystem', name:'Miscellaneous (Multisystem)', subs:[
      ['misc','Others']]},
  ];
  const subjId = (sysId,slug)=>`${sysId}::${slug}`;
  const SYS_NAMES={}, SUBJ_NAMES={};
  TAXONOMY.forEach(s=>{ SYS_NAMES[s.id]=s.name; s.subs.forEach(([slug,name])=>{ SUBJ_NAMES[subjId(s.id,slug)]=name; }); });
  // Tradução PT da taxonomia (chaveada pelo rótulo em inglês; subtópicos repetidos deduplicam)
  const TAX_PT = {
    'Biochemistry':'Bioquímica','Genetics':'Genética','Microbiology':'Microbiologia','Pathology':'Patologia','Pharmacology':'Farmacologia','Biostatistics & Epidemiology':'Bioestatística & Epidemiologia','Poisoning & Environmental Exposure':'Intoxicação & Exposição Ambiental','Allergy & Immunology':'Alergia & Imunologia','Cardiovascular System':'Sistema Cardiovascular','Dermatology':'Dermatologia','Ear, Nose & Throat (ENT)':'Otorrinolaringologia (ENT)','Endocrine, Diabetes & Metabolism':'Endócrino, Diabetes & Metabolismo','Female Reproductive System & Breast':'Sistema Reprodutor Feminino & Mama','Gastrointestinal & Nutrition':'Gastrointestinal & Nutrição','Hematology & Oncology':'Hematologia & Oncologia','Infectious Diseases':'Doenças Infecciosas','Male Reproductive System':'Sistema Reprodutor Masculino','Nervous System':'Sistema Nervoso','Ophthalmology':'Oftalmologia','Pregnancy, Childbirth & Puerperium':'Gravidez, Parto & Puerpério','Psychiatric/Behavioral & Substance Use Disorder':'Psiquiátrico/Comportamental & Uso de Substâncias','Pulmonary & Critical Care':'Pneumologia & Terapia Intensiva','Renal, Urinary Systems & Electrolytes':'Renal, Sistema Urinário & Eletrólitos','Rheumatology/Orthopedics & Sports':'Reumatologia/Ortopedia & Esportes','Social Sciences (Ethics/Legal/Professional)':'Ciências Sociais (Ética/Legal/Profissional)','Miscellaneous (Multisystem)':'Diversos (Multissistêmico)',
    'Amino acids, proteins, and enzymes':'Aminoácidos, proteínas e enzimas','Bioenergetics and carbohydrate metabolism':'Bioenergética e metabolismo de carboidratos','Cell and molecular biology':'Biologia celular e molecular','Lipid metabolism':'Metabolismo lipídico','Second messengers':'Segundos mensageiros','Urea cycle':'Ciclo da ureia','Vitamins and cofactors':'Vitaminas e cofatores','Miscellaneous':'Outros','Others':'Outros','Clinical genetics':'Genética clínica','DNA structure, replication, and repair':'Estrutura, replicação e reparo do DNA','Gene expression and regulation':'Expressão e regulação gênica','Protein synthesis':'Síntese proteica','RNA structure, synthesis, and processing':'Estrutura, síntese e processamento do RNA','Bacteriology':'Bacteriologia','Mycology':'Micologia','Parasitology':'Parasitologia','Virology':'Virologia','Cellular pathology':'Patologia celular','Inflammation and repair':'Inflamação e reparo','Neoplasia':'Neoplasia','Drug metabolism and toxicity':'Metabolismo e toxicidade de fármacos','Drug receptors and pharmacodynamics':'Receptores e farmacodinâmica','Pharmacokinetics':'Farmacocinética','Epidemiology and population health':'Epidemiologia e saúde populacional','Measures and distribution of data':'Medidas e distribuição de dados','Probability and principles of testing':'Probabilidade e princípios de testes','Study design and interpretation':'Desenho e interpretação de estudos','Environmental exposure':'Exposição ambiental','Toxicology':'Toxicologia','Anaphylaxis and allergic reactions':'Anafilaxia e reações alérgicas','Autoimmune diseases':'Doenças autoimunes','Immune deficiencies':'Imunodeficiências','Transplant medicine':'Medicina de transplantes','Principles of immunology':'Princípios de imunologia','Normal structure and function of the cardiovascular system':'Estrutura e função normais do sistema cardiovascular','Aortic and peripheral artery diseases':'Doenças da aorta e artérias periféricas','Cardiac arrhythmias':'Arritmias cardíacas','Congenital heart disease':'Cardiopatia congênita','Coronary heart disease':'Doença coronariana','Heart failure and shock':'Insuficiência cardíaca e choque','Hypertension':'Hipertensão','Myopericardial diseases':'Doenças miopericárdicas','Valvular heart diseases':'Valvopatias','Cardiovascular drugs':'Fármacos cardiovasculares','Normal structure and function of skin':'Estrutura e função normais da pele','Disorders of epidermal appendages':'Distúrbios dos anexos epidérmicos','Inflammatory dermatoses and bullous diseases':'Dermatoses inflamatórias e doenças bolhosas','Skin and soft tissue infections':'Infecções de pele e partes moles','Skin tumors and tumor-like lesions':'Tumores cutâneos e lesões tumorais','Disorders of the ear, nose, and throat':'Distúrbios do ouvido, nariz e garganta','Normal structure and function of endocrine glands':'Estrutura e função normais das glândulas endócrinas','Congenital and developmental anomalies':'Anomalias congênitas e do desenvolvimento','Adrenal disorders':'Distúrbios adrenais','Diabetes mellitus':'Diabetes mellitus','Endocrine tumors':'Tumores endócrinos','Hypothalamus and pituitary disorders':'Distúrbios do hipotálamo e hipófise','Obesity and dyslipidemia':'Obesidade e dislipidemia','Reproductive endocrinology':'Endocrinologia reprodutiva','Thyroid disorders':'Distúrbios da tireoide','Normal structure and function of the female reproductive system and breast':'Estrutura e função normais do sistema reprodutor feminino e mama','Breast disorders':'Distúrbios mamários','Genital tract tumors and tumor-like lesions':'Tumores do trato genital e lesões tumorais','Genitourinary tract infections':'Infecções do trato geniturinário','Menstrual disorders and contraception':'Distúrbios menstruais e contracepção','Normal structure and function of the GI tract':'Estrutura e função normais do trato GI','Biliary tract disorders':'Distúrbios das vias biliares','Disorders of nutrition':'Distúrbios nutricionais','Gastroesophageal disorders':'Distúrbios gastroesofágicos','Hepatic disorders':'Distúrbios hepáticos','Intestinal and colorectal disorders':'Distúrbios intestinais e colorretais','Pancreatic disorders':'Distúrbios pancreáticos','Tumors of the GI tract':'Tumores do trato GI','Normal hematologic structure and function':'Estrutura e função hematológicas normais','Hemostasis and thrombosis':'Hemostasia e trombose','Plasma cell disorders':'Distúrbios de plasmócitos','Platelet disorders':'Distúrbios plaquetários','Red blood cell disorders':'Distúrbios das hemácias','Transfusion medicine':'Medicina transfusional','White blood cell disorders':'Distúrbios dos leucócitos','Principles of oncology':'Princípios de oncologia','Antimicrobial drugs':'Fármacos antimicrobianos','Bacterial infections':'Infecções bacterianas','Fungal infections':'Infecções fúngicas','HIV and sexually transmitted infections':'HIV e infecções sexualmente transmissíveis','Infection control':'Controle de infecção','Parasitic and helminthic infections':'Infecções parasitárias e helmínticas','Viral infections':'Infecções virais','Normal structure and function of the male reproductive system':'Estrutura e função normais do sistema reprodutor masculino','Disorders of the male reproductive system':'Distúrbios do sistema reprodutor masculino','Normal structure and function of the nervous system':'Estrutura e função normais do sistema nervoso','Cerebrovascular disease':'Doença cerebrovascular','CNS infections':'Infecções do SNC','Demyelinating diseases':'Doenças desmielinizantes','Disorders of peripheral nerves and muscles':'Distúrbios dos nervos periféricos e músculos','Headache':'Cefaleia','Neurodegenerative disorders and dementias':'Distúrbios neurodegenerativos e demências','Seizures and epilepsy':'Convulsões e epilepsia','Spinal cord disorders':'Distúrbios da medula espinhal','Traumatic brain injuries':'Traumatismos cranioencefálicos','Tumors of the nervous system':'Tumores do sistema nervoso','Hydrocephalus':'Hidrocefalia','Anesthesia':'Anestesia','Sleep disorders':'Distúrbios do sono','Normal structure and function of the eye and associated structures':'Estrutura e função normais do olho e estruturas associadas','Disorders of the eye and associated structures':'Distúrbios do olho e estruturas associadas','Normal pregnancy, childbirth, and puerperium':'Gravidez, parto e puerpério normais','Disorders of pregnancy, childbirth, and puerperium':'Distúrbios da gravidez, parto e puerpério','Normal behavior and development':'Comportamento e desenvolvimento normais','Anxiety and trauma-related disorders':'Transtornos de ansiedade e relacionados a trauma','Mood disorders':'Transtornos do humor','Neurodevelopmental disorders':'Transtornos do neurodesenvolvimento','Personality disorders':'Transtornos de personalidade','Psychotic disorders':'Transtornos psicóticos','Substance use disorders':'Transtornos por uso de substâncias','Eating disorders':'Transtornos alimentares','Somatoform disorders':'Transtornos somatoformes','Normal pulmonary structure and function':'Estrutura e função pulmonares normais','Critical care medicine':'Medicina intensiva','Interstitial lung disease':'Doença pulmonar intersticial','Lung cancer':'Câncer de pulmão','Obstructive lung disease':'Doença pulmonar obstrutiva','Pulmonary infections':'Infecções pulmonares','Pulmonary vascular disease':'Doença vascular pulmonar','Normal structure and function of the kidneys and urinary system':'Estrutura e função normais dos rins e sistema urinário','Acute kidney injury':'Injúria renal aguda','Bone metabolism':'Metabolismo ósseo','Chronic kidney disease':'Doença renal crônica','Cystic kidney diseases':'Doenças renais císticas','Fluid, electrolytes, and acid-base':'Fluidos, eletrólitos e ácido-base','Glomerular diseases':'Doenças glomerulares','Neoplasms of the kidneys and urinary tract':'Neoplasias dos rins e trato urinário','Nephrolithiasis and urinary tract obstruction':'Nefrolitíase e obstrução do trato urinário','Diabetes insipidus':'Diabetes insípido','Urinary incontinence':'Incontinência urinária','Normal structure and function of the musculoskeletal system':'Estrutura e função normais do sistema musculoesquelético','Arthritis and spondyloarthropathies':'Artrite e espondiloartropatias','Autoimmune disorders and vasculitides':'Distúrbios autoimunes e vasculites','Bone/joint injuries and infections':'Lesões e infecções ósseas/articulares','Bone tumors and tumor-like lesions':'Tumores ósseos e lesões tumorais','Spinal disorders and back pain':'Distúrbios da coluna e dor lombar','Metabolic bone disorders':'Distúrbios ósseos metabólicos','Communication and interpersonal skills':'Comunicação e habilidades interpessoais','Healthcare policy and economics':'Política e economia da saúde','Medical ethics and jurisprudence':'Ética médica e jurisprudência','Patient safety':'Segurança do paciente','System based-practice and quality improvement':'Prática baseada no sistema e melhoria da qualidade',
  };
  const txLabel = en => lang()==='pt' ? (TAX_PT[en]||en) : en;      // rótulo de taxonomia traduzido
  const sysName = id => txLabel(SYS_NAMES[id]||id);                  // nome de sistema por id, traduzido

  /* ===================== METADADOS CONTEXTUAIS DO QBANK =====================
     Regra fixa CoupleMed: cada questão deve ter Subject, System e Topic ao final
     e também permitir criação de blocos por esses metadados. Mantemos os dados
     clínicos do SEED intactos e derivamos os metadados a partir do schema atual:
       - System: q.system / taxonomia oficial
       - Subject: q.discipline
       - Topic: q.category normalizado para Medical Library > Library 1
     Novas questões podem continuar usando o schema SEED existente; esta camada
     garante exibição e filtros sem exigir campos extras no objeto principal. */
  const SYSTEM_ALIASES = {
    'male-reproductive-system':'male_repro',
    'male_reproductive_system':'male_repro',
    'renal-urinary':'renal_urinary',
    'pulmonary-critical-care':'pulmonary_critical_care',
    'psychiatric-behavioral':'psychiatric_behavioral',
    'female-repro-breast':'female_repro_breast',
    'gi-nutrition':'gi_nutrition',
    'heme-onc':'heme_onc'
  };
  const DISCIPLINE_LABELS = {
    anatomy:'Anatomy', histology:'Histology', embryology:'Embryology', physiology:'Physiology',
    pathophysiology:'Pathophysiology', pathology:'Pathology', pharmacology:'Pharmacology',
    microbiology:'Microbiology', immunology:'Immunology', genetics:'Genetics', biochem:'Biochemistry',
    biochemistry:'Biochemistry', behavioral_science:'Behavioral Science', epidemiology:'Epidemiology',
    biostatistics:'Biostatistics', ethics:'Ethics', social_sciences:'Social Sciences'
  };
  function titleFromSlug(s){ return String(s||'Miscellaneous').replace(/::/g,' ').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim().replace(/\b\w/g,m=>m.toUpperCase()); }
  function normSystemId(id){ return SYSTEM_ALIASES[id] || id || 'misc'; }
  function topicSlug(q){ const cat=q.category||''; return cat.includes('::') ? cat.split('::').pop() : (cat || 'misc'); }
  function metaFor(q){
    const systemId = normSystemId(q.system || (q.category||'').split('::')[0]);
    const sys = TAXONOMY.find(s=>s.id===systemId);
    const slug = topicSlug(q);
    const topic = sys && sys.subs ? sys.subs.find(([s])=>s===slug) : null;
    const subjectId = q.discipline || 'misc';
    const libraryNum = [1,2,3].includes(q.library) ? q.library : 1; // default: Library 1 (QBank 1); set q.library:2/3 to route to a future library
    return {
      subjectId,
      subject: DISCIPLINE_LABELS[subjectId] || titleFromSlug(subjectId),
      systemId,
      system: sys ? txLabel(sys.name) : titleFromSlug(systemId),
      topicId: subjId(systemId, slug),
      topic: topic ? txLabel(topic[1]) : titleFromSlug(slug),
      libraryNum,
      libraryPath: `Medical Library > Library ${libraryNum} > ${sys ? txLabel(sys.name) : titleFromSlug(systemId)} > ${topic ? txLabel(topic[1]) : titleFromSlug(slug)}`
    };
  }
  function allDisciplines(){
    const map={}; SEED.forEach(q=>{ const m=metaFor(q); map[m.subjectId]=m.subject; });
    return Object.keys(map).sort((a,b)=>map[a].localeCompare(map[b])).map(id=>({id,name:map[id]}));
  }
  function allSystems(){
    const map={}; SEED.forEach(q=>{ const m=metaFor(q); map[m.systemId]=m.system; });
    return Object.keys(map).sort((a,b)=>map[a].localeCompare(map[b])).map(id=>({id,name:map[id]}));
  }
  function allTopics(){
    const map={}; SEED.forEach(q=>{ const m=metaFor(q); map[m.topicId]=m.topic; });
    return Object.keys(map).sort((a,b)=>map[a].localeCompare(map[b])).map(id=>({id,name:map[id]}));
  }

  /* ============================= i18n ============================= */
  const T = {
    en:{ home:'QBank 1', createTest:'Create Test', reviewFlagged:'Review flagged',
      perfTitle:'Your performance', used:'Used', correct:'Correct', incorrect:'Incorrect', omitted:'Omitted', unused:'Unused', overall:'Overall score',
      passes:'Passes', pass:'Pass', dirigido:'Directed Pass', questions:'questions', continue:'Continue', start:'Start',
      passName:{1:'Learning',2:'Consolidation',3:'Refinement',99:'Total Mastery'},
      youAreHere:'You are here', passDone:'Completed', passProgress:'Pass progress',
      passProgressLine:(a,b)=>`${a} of ${b} questions answered in this pass`,
      passSeqHint:'Complete 100% of this pass to unlock the next one.',
      passCompleteHint:pn=>pn>=3?'All passes complete. Outstanding work!':'Pass complete — the next pass is now unlocked.',
      lockedHint:pn=>`Complete Pass ${pn-1} to unlock`,
      lockedBody:pn=> pn===99 ? 'Finish Pass 1 to unlock your Directed Pass.' : `Finish the previous pass (100%) to unlock this one. You can only start it once the pass before is complete.`,
      lockedToast:'This pass is locked. Finish the previous one first.',
      directedDesc:'A focused pass built only from questions you keep missing or flagged.',
      directedPending:'questions waiting for review',
      // create test
      ctTitle:'Create Test', ctSystems:'Systems', ctDisciplines:'Disciplines', ctStatus:'Question status', ctPass:'Pass', ctDifficulty:'Difficulty', ctMode:'Mode', ctCount:'Number of questions', ctSystemFilter:'System', ctSystemHint:'Filter by organ system', ctAllSystems:'All systems', ctSubjects:'Subject', ctSubjectsHint:'Filter by discipline/subject', ctAllSubjects:'All subjects', ctTopicFilter:'Topic', ctTopicHint:'Filter by Library 1 topic / question topic', ctAllTopics:'All topics', metaTitle:'Question metadata', metaSubject:'Subject', metaSystem:'System', metaTopic:'Topic', collapseAll:'Collapse all', expandAll:'Expand all', maxPerBlock:'Max allowed',
      stAll:'All', stUnused:'Unused', stCorrect:'Correct', stIncorrect:'Incorrect', stMarked:'Marked', stOmitted:'Omitted',
      passAll:'All', pass1:'First', pass2:'Second', pass3:'Third', pass99:'Directed',
      diffAll:'All', easy:'Easy', medium:'Medium', hard:'Hard',
      tutor:'Tutor', timed:'Timed', secsPerQ:'sec / question',
      available:'available', generate:'Generate Test', noMatch:'No questions match these filters. Loosen a filter to continue.',
      back:'‹ Back to QBank',
      // solve
      qOf:(a,b)=>`Question ${a} of ${b}`, suspend:'Suspend', endBlock:'End Block', labValues:'Lab Values', flag:'Flag', unflag:'Unflag',
      submit:'Submit', next:'Next ›', prev:'‹ Prev', confirmEnd:'End this block now? Unanswered questions will be recorded as omitted.',
      confirmSuspend:'Suspend and leave? Your progress is saved and you can resume later.',
      correctBadge:'Correct', incorrectBadge:'Incorrect', omittedBadge:'Omitted',
      eduObjective:'Educational objective', peerTitle:'Peer answer choices', chosePct:p=>`${p}% chose this`, avgClass:'class average',
      addFlash:'+ Add to Flashcards', addNote:'+ Notebook', explanation:'Explanation',
      // preview mode (staging review before commit)
      previewBanner:n=>`🔍 PREVIEW MODE — ${n} newly added question${n===1?'':'s'}, shown in order. This is read-only: answers are disabled and nothing is saved to your progress/analytics.`,
      previewMissing:ids=>`⚠ ID(s) not found in the bank: ${ids.join(', ')}`,
      // root cause
      rcTitle:'Why did you miss this?', rcSub:'One tap — this powers your Directed Pass and analytics.', rcSkip:'Skip',
      // results
      resTitle:'Block results', score:'Score', bySystem:'By system', reviewQ:'Review questions', surgical:'⚑ Generate Surgical Review', surgicalSub:n=>`Builds a focused test from your most frequent error cause (${n} questions).`,
      backHome:'Back to QBank', reviewAll:'Review all answers', imageHint:'Click to enlarge image',
      // analytics
      analytics:'Analytics', anOverview:'Overview', anBySystem:'Performance by system', anByPass:'Pass comparison', anRootCause:'Error causes', anEmpty:'Answer some questions to unlock analytics.',
      disclaimer:'Correlation with real exam scores is orientative only and not a guarantee of performance.',
      // smartcards
      scTitle:'Create Flashcard', scFront:'Front (write the question to actively recall)', scBack:'Back (answer — pre-filled, editable)', scHint:'Tip: keep one idea per card. Front is required for active recall.', scSave:'Save flashcard', scSaved:'✓ Flashcard added to your deck (QBank SmartCards).', scCancel:'Cancel', scDeck:'QBank SmartCards',
      // notebook
      nbTitle:'Add to Notebook', nbPh:'Write a note about this question…', nbSave:'Save note', nbSaved:'✓ Saved to Notebook.',
      labTitle:'Common reference ranges', close:'Close',
      labHint:'Hover over each label to see its full name.',
      labRelevant:'Relevant to this question',
      resume:'Resume', empty:'No questions here yet.', flaggedEmpty:'You have not flagged any questions yet.' },
    pt:{ home:'Banco de Questões 1', createTest:'Criar Teste', reviewFlagged:'Revisar marcadas',
      perfTitle:'Seu desempenho', used:'Usadas', correct:'Acertos', incorrect:'Erros', omitted:'Omitidas', unused:'Não usadas', overall:'Nota geral',
      passes:'Passadas', pass:'Passada', dirigido:'Passada Dirigida', questions:'questões', continue:'Continuar', start:'Iniciar',
      passName:{1:'Aprendizado',2:'Consolidação',3:'Refinamento',99:'Domínio Total'},
      youAreHere:'Você está aqui', passDone:'Concluída', passProgress:'Progresso da passada',
      passProgressLine:(a,b)=>`${a} de ${b} questões respondidas nesta passada`,
      passSeqHint:'Conclua 100% desta passada para desbloquear a próxima.',
      passCompleteHint:pn=>pn>=3?'Todas as passadas concluídas. Excelente trabalho!':'Passada concluída — a próxima passada foi desbloqueada.',
      lockedHint:pn=>`Conclua a Passada ${pn-1} para desbloquear`,
      lockedBody:pn=> pn===99 ? 'Conclua a Passada 1 para desbloquear a Passada Dirigida.' : `Conclua a passada anterior (100%) para desbloquear esta. Você só pode iniciá-la quando a passada anterior estiver completa.`,
      lockedToast:'Esta passada está bloqueada. Conclua a anterior primeiro.',
      directedDesc:'Uma passada focada, feita apenas das questões que você continua errando ou marcou.',
      directedPending:'questões aguardando revisão',
      ctTitle:'Criar Teste', ctSystems:'Sistemas', ctDisciplines:'Disciplinas', ctStatus:'Status da questão', ctPass:'Passada', ctDifficulty:'Dificuldade', ctMode:'Modo', ctCount:'Número de questões', ctSystemFilter:'System', ctSystemHint:'Filtrar por sistema', ctAllSystems:'Todos os systems', ctSubjects:'Subject', ctSubjectsHint:'Filtrar por disciplina/subject', ctAllSubjects:'Todos os subjects', ctTopicFilter:'Topic', ctTopicHint:'Filtrar por tópico da Library 1 / tópico da questão', ctAllTopics:'Todos os topics', metaTitle:'Metadados da questão', metaSubject:'Subject', metaSystem:'System', metaTopic:'Topic', collapseAll:'Recolher tudo', expandAll:'Expandir tudo', maxPerBlock:'Máx. permitido',
      stAll:'Todas', stUnused:'Não usadas', stCorrect:'Acertadas', stIncorrect:'Erradas', stMarked:'Marcadas', stOmitted:'Omitidas',
      passAll:'Todas', pass1:'Primeira', pass2:'Segunda', pass3:'Terceira', pass99:'Dirigida',
      diffAll:'Todas', easy:'Fácil', medium:'Média', hard:'Difícil',
      tutor:'Tutor', timed:'Cronometrado', secsPerQ:'seg / questão',
      available:'disponíveis', generate:'Gerar Teste', noMatch:'Nenhuma questão corresponde a esses filtros. Afrouxe um filtro para continuar.',
      back:'‹ Voltar ao Banco',
      qOf:(a,b)=>`Questão ${a} de ${b}`, suspend:'Suspender', endBlock:'Encerrar Bloco', labValues:'Valores Lab', flag:'Marcar', unflag:'Desmarcar',
      submit:'Responder', next:'Próxima ›', prev:'‹ Anterior', confirmEnd:'Encerrar o bloco agora? Questões sem resposta serão registradas como omitidas.',
      confirmSuspend:'Suspender e sair? Seu progresso é salvo e você pode retomar depois.',
      correctBadge:'Correta', incorrectBadge:'Incorreta', omittedBadge:'Omitida',
      eduObjective:'Objetivo educacional', peerTitle:'Escolhas dos colegas', chosePct:p=>`${p}% escolheram`, avgClass:'média da turma',
      addFlash:'+ Criar Flashcard', addNote:'+ Caderno', explanation:'Explicação',
      previewBanner:n=>`🔍 MODO PREVIEW — ${n} questão${n===1?'':'ões'} recém-adicionada${n===1?'':'s'}, na ordem enviada. Somente leitura: respostas ficam desabilitadas e nada é salvo no seu progresso/análises.`,
      previewMissing:ids=>`⚠ ID(s) não encontrado(s) no banco: ${ids.join(', ')}`,
      rcTitle:'Por que você errou?', rcSub:'Um toque — isso alimenta sua Passada Dirigida e as análises.', rcSkip:'Pular',
      resTitle:'Resultado do bloco', score:'Nota', bySystem:'Por sistema', reviewQ:'Revisar questões', surgical:'⚑ Gerar Revisão Cirúrgica', surgicalSub:n=>`Monta um teste focado na sua causa de erro mais frequente (${n} questões).`,
      backHome:'Voltar ao Banco', reviewAll:'Revisar todas as respostas', imageHint:'Clique para ampliar a imagem',
      analytics:'Análises', anOverview:'Visão geral', anBySystem:'Desempenho por sistema', anByPass:'Comparação por passada', anRootCause:'Causas de erro', anEmpty:'Responda algumas questões para liberar as análises.',
      disclaimer:'A correlação com notas reais do exame é apenas orientativa e não garante desempenho.',
      scTitle:'Criar Flashcard', scFront:'Frente (escreva a pergunta para recordar ativamente)', scBack:'Verso (resposta — pré-preenchida, editável)', scHint:'Dica: uma ideia por card. A frente é obrigatória para recall ativo.', scSave:'Salvar flashcard', scSaved:'✓ Flashcard adicionado ao seu deck (QBank SmartCards).', scCancel:'Cancelar', scDeck:'QBank SmartCards',
      nbTitle:'Adicionar ao Caderno', nbPh:'Escreva uma nota sobre esta questão…', nbSave:'Salvar nota', nbSaved:'✓ Salvo no Caderno.',
      labTitle:'Faixas de referência comuns', close:'Fechar',
      labHint:'Passe o cursor sobre cada sigla para ver o nome completo.',
      labRelevant:'Relevante para esta questão',
      resume:'Retomar', empty:'Nenhuma questão aqui ainda.', flaggedEmpty:'Você ainda não marcou nenhuma questão.' }
  };
  const lang = () => document.documentElement.lang === 'pt-BR' ? 'pt' : 'en';

  /* ---------- tradução dinâmica do CONTEÚDO das questões (vinheta/stem/opções/explicação) ----------
     Usa o motor único e compartilhado window.CMI18N (js/i18n-content.js), que mantém um banco
     persistente (localStorage) de traduções EN->PT reaproveitável por todo o site — QBank,
     Flashcards, Medical Library etc. A interface (botões/labels) já traduz via T[lang]; isto
     traduz o texto das questões, que vem sempre em inglês no banco, sempre que a bandeira for
     trocada. O original nunca é sobrescrito, só a exibição. */
  const CM = window.CMI18N;
  function qbTransSpan(text, cls){ return CM ? CM.span(text, cls) : (text==null?'':esc(String(text))); }
  function translateVisibleQuestionTexts(){
    if(!root || !CM) return;
    CM.translateAllVisible(root);
  }
  /* ---------- FIX BUG #1: usar ptTranslation fixo (options/explC/explI) quando existir,
     em vez de depender só da tradução automática via API. Se o idioma ativo for PT e houver
     tradução fixa para o campo, usa-a diretamente (sem chamada à API, sem re-tradução).
     Caso contrário, cai no comportamento antigo (qbTransSpan -> API/cache). */
  function qbField(en, ptVal, cls){
    if(CM && CM.lang()==='pt' && ptVal){
      return `<span class="${cls||''}">${esc(String(ptVal))}</span>`;
    }
    return qbTransSpan(en, cls);
  }
  function ptOptionText(q, label){
    const arr = q.ptTranslation && q.ptTranslation.options;
    if(!arr) return null;
    const f = arr.find(o=>o.label===label);
    return f ? f.text : null;
  }
  function ptExplIText(q, option){
    const arr = q.ptTranslation && q.ptTranslation.explI;
    if(!arr) return null;
    const f = arr.find(e=>e.option===option);
    return f ? f.explanation : null;
  }

  const t = k => T[lang()][k];
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = p => p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

  /* ===================== CAMADA DE DADOS (QB.store) =====================
     localStorage hoje; troca para fetch('/api/qbank/*') amanhã sem tocar na UI. */
  const store = (function(){
    let db;
    try{ db = JSON.parse(localStorage.getItem(KEY)); }catch(e){}
    if(!db || typeof db!=='object') db = {};
    db.attempts = db.attempts || [];   // histórico imutável (Parte 4)
    db.tests    = db.tests    || [];
    db.notebook = db.notebook || [];
    db.flags    = db.flags    || {};   // { qid:true }
    db.links    = db.links    || {};   // { qid:[flashcardId] }  (Parte 15.8)
    const save = () => localStorage.setItem(KEY, JSON.stringify(db));
    save();
    return {
      questions(){ return SEED; },
      question(id){ return SEED.find(q=>q.id===id); },
      allAttempts(){ return db.attempts; },
      attemptsFor(qid){ return db.attempts.filter(a=>a.question_id===qid); },
      // Parte 4.1 — pass_number calculado por attempts anteriores
      passNumber(qid){ const n = this.attemptsFor(qid).length; return n===0?1:n===1?2:n===2?3:99; },
      lastAttempt(qid){ const a=this.attemptsFor(qid); return a.length?a[a.length-1]:null; },
      // status agregado de uma questão para o usuário
      statusOf(qid){ const a=this.attemptsFor(qid); if(!a.length) return 'unused'; const last=a[a.length-1]; return last.status; },
      isFlagged(qid){ return !!db.flags[qid]; },
      toggleFlag(qid){ db.flags[qid]=!db.flags[qid]; if(!db.flags[qid]) delete db.flags[qid]; save(); return !!db.flags[qid]; },
      addAttempt(a){ // INSERT-only, nunca sobrescreve (Parte 4.2)
        a.id = uid('att'); a.user_id = USER; a.created_at = new Date().toISOString();
        a.pass_number = this.passNumber(a.question_id);
        db.attempts.push(a); save(); return a; },
      saveTest(test){ const i=db.tests.findIndex(x=>x.id===test.id); if(i>=0) db.tests[i]=test; else db.tests.push(test); save(); },
      tests(){ return db.tests; },
      openTest(){ return db.tests.find(x=>x.status==='suspended'); },
      addNote(qid,content){ db.notebook.push({id:uid('nb'),question_id:qid,content,created_at:new Date().toISOString()}); save(); },
      linkFlashcard(qid,fcId){ (db.links[qid]=db.links[qid]||[]).push(fcId); save(); },
      linksFor(qid){ return db.links[qid]||[]; },
      // Parte 4.3 — pool da Passada Dirigida: último attempt incorreto OU flagged, excluindo 2 acertos consecutivos
      directedPool(){ return SEED.filter(q=>{ const a=this.attemptsFor(q.id); if(!a.length) return false;
        const last2=a.slice(-2); const twoRight = last2.length===2 && last2.every(x=>x.is_correct===1);
        if(twoRight) return false; const last=a[a.length-1];
        return last.status==='incorrect' || this.isFlagged(q.id); }); },

      /* ===== Parte 4.4 — PASSADAS DISCRETAS E SEQUENCIAIS (v51) =====
         Cada questão "pertence" à passada N quando já foi respondida N-1 vezes
         (ou seja, o número de attempts >= N). A passada N está concluída quando
         TODAS as questões do banco têm pelo menos N attempts. A passada dirigida
         (99) é dinâmica. Nada aqui altera o formato dos attempts — apenas os lê. */
      passProgress(pn){
        const total = SEED.length;
        if(pn===99){
          const pool = this.directedPool();
          return { total: pool.length, answered: 0, pct: 0, remaining: pool.length, done: false };
        }
        let answered = 0;
        SEED.forEach(q=>{ if(this.attemptsFor(q.id).length >= pn) answered++; });
        const pct = total ? Math.round(100*answered/total) : 0;
        return { total, answered, pct, remaining: total-answered, done: total>0 && answered===total };
      },
      // estatística agregada da passada pn (usa o attempt de índice pn-1 de cada questão)
      passStat(pn){
        let used=0,c=0,i=0,o=0;
        SEED.forEach(q=>{ const a=this.attemptsFor(q.id); if(a.length>=pn){ used++; const at=a[pn-1];
          if(at.status==='correct')c++; else if(at.status==='incorrect')i++; else o++; } });
        const answered=c+i; const overall=answered?Math.round(100*c/answered):0;
        return { used, correct:c, incorrect:i, omitted:o, unused:SEED.length-used, overall };
      },
      // limite manual de desbloqueio: chave couplemed_qb_unlock_<uid> = 1|2|3|99 (maior passada liberada)
      unlockCeiling(){
        try{ const v=parseInt(localStorage.getItem(`couplemed_qb_unlock_${USER}`)||'1',10); return isNaN(v)?1:v; }
        catch(e){ return 1; }
      },
      isAdmin(){ return USER==='john'; },
      // estado de uma passada: 'completed' | 'active' | 'locked'
      passState(pn){
        if(pn===99){
          const prevDone = this.passProgress(1).done;
          if(!prevDone && !this.isAdmin() && this.unlockCeiling()<99) return 'locked';
          return 'active';
        }
        if(pn===1) return this.passProgress(1).done ? 'completed' : 'active';
        if(this.passProgress(pn).done) return 'completed';
        const prevDone = this.passProgress(pn-1).done;
        if(prevDone) return 'active';
        if(this.isAdmin() || this.unlockCeiling()>=pn) return 'active';
        return 'locked';
      },
      // passada ativa "corrente": a menor passada desbloqueada e ainda não concluída
      currentPass(){
        for(const pn of [1,2,3]){ if(this.passState(pn)==='active') return pn; }
        if(this.passState(99)==='active') return 99;
        return 3;
      },
      raw:db, save };
  })();

  /* ===================== SELEÇÃO POR FILTROS (Parte 2) ===================== */
  function filterPool(f){
    return SEED.filter(q=>{
      if(f.subjects && f.subjects.length && !f.subjects.includes(q.category)) return false;
      if(f.difficulty!=='all' && q.difficulty!==f.difficulty) return false;
      // status
      const st = store.statusOf(q.id);
      if(f.status!=='all'){
        if(f.status==='unused' && st!=='unused') return false;
        if(f.status==='correct' && st!=='correct') return false;
        if(f.status==='incorrect' && st!=='incorrect') return false;
        if(f.status==='omitted' && st!=='omitted') return false;
        if(f.status==='marked' && !store.isFlagged(q.id)) return false;
      }
      // pass
      if(f.pass!=='all'){
        const pn = store.passNumber(q.id);
        if(f.pass==='99'){ if(!store.directedPool().some(x=>x.id===q.id)) return false; }
        else if(String(pn)!==String(f.pass)) return false;
      }
      return true;
    });
  }
  // disponibilidade ignorando a seleção de subtópicos (para contadores do accordion)
  function availablePool(f){
    return SEED.filter(q=>{
      if(f.difficulty!=='all' && q.difficulty!==f.difficulty) return false;
      const st = store.statusOf(q.id);
      if(f.status!=='all'){
        if(f.status==='unused' && st!=='unused') return false;
        if(f.status==='correct' && st!=='correct') return false;
        if(f.status==='incorrect' && st!=='incorrect') return false;
        if(f.status==='omitted' && st!=='omitted') return false;
        if(f.status==='marked' && !store.isFlagged(q.id)) return false;
      }
      if(f.pass!=='all'){
        const pn = store.passNumber(q.id);
        if(f.pass==='99'){ if(!store.directedPool().some(x=>x.id===q.id)) return false; }
        else if(String(pn)!==String(f.pass)) return false;
      }
      return true;
    });
  }

  /* ============================== ESTADO ============================== */
  let host, root, view={name:'home'};
  const passFromPage = { 'qbank1-pass-1':'1','qbank1-pass-2':'2','qbank1-pass-3':'3','qbank1-pass-4':'99' };

  function boot(){
    host = document.querySelector('#internalContent .internal-card');
    if(!host) return;
    host.classList.add('qb-host');
    document.querySelector('#internalContent').classList.add('qb-wide');
    root = host;
    // ?previewIds=ID1,ID2,... — modo de revisão isolada pré-commit (só leitura, não grava attempt/pass/sync)
    const previewIds = params.get('previewIds');
    if(previewIds){
      const ids = previewIds.split(',').map(s=>s.trim()).filter(Boolean);
      const found = ids.map(id=>SEED.find(q=>q.id===id)).filter(Boolean);
      const missing = ids.filter(id=>!SEED.some(q=>q.id===id));
      const test = { id:'preview', user_id:USER, test_type:'preview', filters:{}, mode:'tutor', secs:0,
        status:'preview', qids:found.map(q=>q.id), idx:0, answers:{}, strikes:{}, times:{},
        started_at:new Date().toISOString(), preview:true, previewMissing:missing };
      view = found.length ? { name:'test', test, showAns:true, qStart:Date.now() } : { name:'home', sel:store.currentPass() };
      render();
      new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
      return;
    }
    // pass folders abrem direto no Create Test pré-filtrado
    if(passFromPage[PAGE]) view = {name:'create', preset:{pass:passFromPage[PAGE]}};
    else {
      // home: pode receber ?pass=N (vindo do dashboard "Continue") para pré-selecionar a passada
      const pp = params.get('pass');
      const sel = pp==='99'||pp==='1'||pp==='2'||pp==='3' ? (pp==='99'?99:+pp) : store.currentPass();
      view = { name:'home', sel };
    }
    render();
    new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }

  function render(){
    if(!root) return;
    CM&&CM.bumpToken();
    if(view.name==='home') renderHome();
    else if(view.name==='create') renderCreate();
    else if(view.name==='test') renderTest();
    else if(view.name==='results') renderResults();
    else if(view.name==='analytics') renderAnalytics();
    translateVisibleQuestionTexts();
  }
  const go = v => { view=v; render(); window.scrollTo(0,0); };

  /* ============================== HOME ==============================
     v51 — Pass Navigator: cada passada é um espaço individual. O topo mostra
     um stepper premium (1 → 2 → 3 → Dirigida) com estado (ativa / concluída /
     bloqueada). O corpo abaixo mostra o dashboard SOMENTE da passada selecionada. */
  function renderHome(){
    if(view.sel==null) view.sel = store.currentPass();
    // se a passada selecionada estiver bloqueada (e o usuário não for admin), cai para a corrente
    if(store.passState(view.sel)==='locked' && !store.isAdmin()) view.sel = store.currentPass();
    const sel = view.sel;

    const passMeta = pn => ({
      label: pn===99 ? t('dirigido') : `${pn}ª ${t('pass')}`,
      name:  t('passName')[pn],
      n:     pn===99 ? '★' : pn
    });

    // ---- stepper ----
    const stepHTML = [1,2,3,99].map((pn,idx)=>{
      const st = store.passState(pn);
      const prog = store.passProgress(pn);
      const meta = passMeta(pn);
      const isSel = pn===sel;
      const pct = pn===99 ? (prog.total?100:0) : prog.pct;
      let cls = 'qb-step qb-step-'+st + (isSel?' qb-step-sel':'');
      const badge = st==='completed' ? '<span class="qb-step-check">✓</span>'
        : st==='locked' ? '<span class="qb-step-lock">🔒</span>'
        : `<span class="qb-step-n">${meta.n}</span>`;
      const clickable = st!=='locked' || store.isAdmin();
      const lockTip = pn===99 ? t('lockedBody')(99) : t('lockedHint')(pn);
      const subtitle = pn===99
        ? `${prog.total} ${t('questions')}`
        : `${prog.answered}/${prog.total} · ${pct}%`;
      const youAreHere = (pn===store.currentPass() && st==='active')
        ? `<span class="qb-step-here">${esc(t('youAreHere'))}</span>` : '';
      const connector = idx<3 ? '<span class="qb-step-conn"></span>' : '';
      return `<button class="${cls}" data-act="sel-pass" data-pn="${pn}" ${clickable?'':'disabled aria-disabled="true"'} title="${esc(st==='locked'?lockTip:meta.label)}">
          <span class="qb-step-badge">${badge}</span>
          <span class="qb-step-info">
            <strong>${esc(meta.label)}</strong>
            <small>${esc(meta.name)}</small>
            <span class="qb-step-sub">${esc(subtitle)}</span>
          </span>
          ${youAreHere}
        </button>${connector}`;
    }).join('');

    // ---- dashboard da passada selecionada ----
    const selState = store.passState(sel);
    const selProg  = store.passProgress(sel);
    const s = sel===99
      ? (function(){ const pool=store.directedPool(); let c=0,i=0; pool.forEach(q=>{const a=store.lastAttempt(q.id); if(a){ if(a.status==='incorrect')i++; }}); return {used:pool.length,correct:0,incorrect:pool.length,omitted:0,unused:0,overall:0}; })()
      : store.passStat(sel);
    const selMeta = passMeta(sel);

    let body;
    if(selState==='locked'){
      body = `<div class="qb-pass-locked">
        <div class="qb-locked-ico">🔒</div>
        <h3>${esc(selMeta.label)} — ${esc(selMeta.name)}</h3>
        <p>${esc(t('lockedBody')(sel))}</p>
      </div>`;
    } else if(sel===99){
      const pool=store.directedPool();
      body = `
        <div class="qb-pass-panel">
          <div class="qb-panel-head">
            <div>
              <span class="qb-panel-kicker">${esc(t('dirigido'))}</span>
              <h2 class="qb-panel-title">${esc(selMeta.name)}</h2>
              <p class="qb-panel-desc">${esc(t('directedDesc'))}</p>
            </div>
            <div class="qb-panel-actions">
              <button class="qb-btn ghost" data-act="analytics">${esc(t('analytics'))}</button>
              <button class="qb-btn primary" data-act="pass-card" data-pn="99" ${pool.length?'':'disabled'}>＋ ${esc(t('createTest'))}</button>
            </div>
          </div>
          <div class="qb-directed-count">
            <div class="qb-dir-num">${pool.length}</div>
            <div class="qb-dir-lbl">${esc(t('directedPending'))}</div>
          </div>
        </div>`;
    } else {
      const done = selProg.done;
      const primaryLabel = selProg.answered>0 && !done ? t('continue') : t('start');
      body = `
        <div class="qb-pass-panel">
          <div class="qb-panel-head">
            <div>
              <span class="qb-panel-kicker">${esc(selMeta.label)}${done?` · ${esc(t('passDone'))}`:''}</span>
              <h2 class="qb-panel-title">${esc(selMeta.name)}</h2>
              <p class="qb-panel-desc">${esc(t('passProgressLine')(selProg.answered,selProg.total))}</p>
            </div>
            <div class="qb-panel-actions">
              <button class="qb-btn ghost" data-act="analytics">${esc(t('analytics'))}</button>
              <button class="qb-btn ghost" data-act="flagged">⚑ ${esc(t('reviewFlagged'))}</button>
              <button class="qb-btn primary" data-act="pass-card" data-pn="${sel}" ${done?'disabled':''}>＋ ${esc(t('createTest'))}</button>
            </div>
          </div>

          <div class="qb-perf">
            <div class="qb-donut" style="--pct:${s.overall}">
              <div class="qb-donut-c"><strong>${s.overall}%</strong><small>${esc(t('overall'))}</small></div>
            </div>
            <div class="qb-perf-grid">
              <div class="qb-stat"><span class="qb-dot used"></span><b>${s.used}</b><small>${esc(t('used'))}</small></div>
              <div class="qb-stat"><span class="qb-dot ok"></span><b>${s.correct}</b><small>${esc(t('correct'))}</small></div>
              <div class="qb-stat"><span class="qb-dot bad"></span><b>${s.incorrect}</b><small>${esc(t('incorrect'))}</small></div>
              <div class="qb-stat"><span class="qb-dot om"></span><b>${s.omitted}</b><small>${esc(t('omitted'))}</small></div>
              <div class="qb-stat"><span class="qb-dot un"></span><b>${s.unused}</b><small>${esc(t('unused'))}</small></div>
            </div>
          </div>

          <div class="qb-pass-progress">
            <div class="qb-pass-progress-top">
              <span>${esc(t('passProgress'))}</span>
              <span>${selProg.answered} / ${selProg.total} · ${selProg.pct}%</span>
            </div>
            <div class="qb-progress-track"><span style="width:${selProg.pct}%"></span></div>
            ${done ? `<p class="qb-pass-hint qb-pass-hint-ok">✓ ${esc(t('passCompleteHint')(sel))}</p>`
                   : `<p class="qb-pass-hint">${esc(t('passSeqHint'))}</p>`}
          </div>
        </div>`;
    }

    root.innerHTML = `
      <div class="qb">
        <div class="qb-top">
          <h1>${esc(t('home'))}</h1>
        </div>

        <div class="qb-stepper">${stepHTML}</div>

        ${body}
      </div>`;
    wire();
  }

  /* =========================== CREATE TEST =========================== */
  function renderCreate(){
    const preset = view.preset || {};
    const pref = qbPrefDefaults();
    view.f = view.f || { systems:[], disciplines:[], subjects:[], status:'all', pass:preset.pass||'all', difficulty:'all', mode:pref.mode, secs:90, count:pref.count };
    const f = view.f;
    if(!f.systems) f.systems=[];
    if(!f.disciplines) f.disciplines=[];
    if(!f.subjects) f.subjects=[];
    if(!view.collapsed){ view.collapsed = {}; TAXONOMY.forEach(s=>view.collapsed[s.id]=true); }
    const avail = availablePool(f);
    const countBy = {};                      // subjectId -> nº disponível
    avail.forEach(q=>{ countBy[q.category]=(countBy[q.category]||0)+1; });

    const seg = (act,val,opts)=>opts.map(o=>`<button class="qb-seg ${val===o.v?'on':''}" data-act="${act}" data-v="${o.v}">${esc(o.l)}</button>`).join('');

    // accordion de um sistema
    const groupHTML = sys=>{
      const subIds = sys.subs.map(([slug])=>subjId(sys.id,slug));
      const selCount = subIds.filter(id=>f.subjects.includes(id)).length;
      const sysChecked = selCount===subIds.length;
      const sysPartial = selCount>0 && !sysChecked;
      const sysCount = subIds.reduce((n,id)=>n+(countBy[id]||0),0);
      const collapsed = !!view.collapsed[sys.id];
      const rows = sys.subs.map(([slug,name])=>{ const id=subjId(sys.id,slug); const on=f.subjects.includes(id); const c=countBy[id]||0;
        return `<label class="qb-tax-sub ${on?'on':''}">
          <input type="checkbox" data-act="tog-sub" data-v="${id}" ${on?'checked':''}>
          <span class="qb-tax-box"></span><span class="qb-tax-name">${esc(txLabel(name))}</span><span class="qb-tax-count">${c}</span>
        </label>`; }).join('');
      return `<div class="qb-tax-group">
        <div class="qb-tax-head">
          <label class="qb-tax-sys ${sysChecked?'on':''} ${sysPartial?'partial':''}">
            <input type="checkbox" data-act="tog-sys" data-v="${sys.id}" ${sysChecked?'checked':''}>
            <span class="qb-tax-box"></span><span class="qb-tax-name">${esc(txLabel(sys.name))}</span><span class="qb-tax-count">${sysCount}</span>
          </label>
          <button class="qb-tax-toggle" data-act="collapse" data-v="${sys.id}" aria-label="toggle">${collapsed?'＋':'—'}</button>
        </div>
        ${collapsed?'':`<div class="qb-tax-subs">${rows}</div>`}
      </div>`;
    };

    const pool = filterPool(f);
    const availN = pool.length;
    const maxN = Math.max(1, availN);
    const count = Math.min(f.count||1, maxN);
    const allCollapsed = TAXONOMY.every(s=>view.collapsed[s.id]);

    root.innerHTML = `
      <div class="qb qb-create">
        <button class="qb-link" data-act="home">${esc(t('back'))}</button>
        <h1>${esc(t('ctTitle'))}</h1>

        <div class="qb-row">
          <div class="qb-field"><label>${esc(t('ctStatus'))}</label><div class="qb-segs">${seg('status',f.status,[
            {v:'all',l:t('stAll')},{v:'unused',l:t('stUnused')},{v:'correct',l:t('stCorrect')},{v:'incorrect',l:t('stIncorrect')},{v:'marked',l:t('stMarked')},{v:'omitted',l:t('stOmitted')}])}</div></div>
        </div>
        <div class="qb-row">
          <div class="qb-field"><label>${esc(t('ctPass'))}</label><div class="qb-segs">${seg('pass',f.pass,[
            {v:'all',l:t('passAll')},{v:'1',l:t('pass1')},{v:'2',l:t('pass2')},{v:'3',l:t('pass3')},{v:'99',l:t('pass99')}])}</div></div>
          <div class="qb-field"><label>${esc(t('ctDifficulty'))}</label><div class="qb-segs">${seg('diff',f.difficulty,[
            {v:'all',l:t('diffAll')},{v:'easy',l:t('easy')},{v:'medium',l:t('medium')},{v:'hard',l:t('hard')}])}</div></div>
        </div>
        <div class="qb-row">
          <div class="qb-field"><label>${esc(t('ctMode'))}</label><div class="qb-segs">${seg('mode',f.mode,[
            {v:'tutor',l:t('tutor')},{v:'timed',l:t('timed')}])}</div>
            ${f.mode==='timed'?`<div class="qb-secs"><input type="range" min="30" max="150" step="15" value="${f.secs}" data-act="secs"><span>${f.secs} ${esc(t('secsPerQ'))}</span></div>`:''}
          </div>
        </div>

        <div class="qb-field qb-count-field"><label>${esc(t('ctCount'))}</label>
          <div class="qb-count"><input type="number" min="1" max="${maxN}" value="${count}" data-act="count-num" ${availN?'':'disabled'}><span class="qb-count-max">${esc(t('maxPerBlock'))} <b>${maxN}</b></span></div>
        </div>
        <div class="qb-gen">
          <div class="qb-avail"><strong>${availN}</strong> ${esc(t('available'))}</div>
          <button class="qb-btn primary big" data-act="generate" ${availN?'':'disabled'}>${esc(t('generate'))} →</button>
        </div>
        ${availN?'':`<p class="qb-nomatch">${esc(t('noMatch'))}</p>`}

        <div class="qb-tax-bar">
          <label class="qb-tax-sys master ${f.subjects.length?'partial':''}">
            <input type="checkbox" data-act="tog-all" ${f.subjects.length?'checked':''}>
            <span class="qb-tax-box"></span><span class="qb-tax-name">${esc(t('ctSystems'))}</span>
          </label>
          <button class="qb-link" data-act="collapse-all">${allCollapsed?esc(t('expandAll')):esc(t('collapseAll'))}</button>
        </div>
        <div class="qb-tax">${TAXONOMY.map(groupHTML).join('')}</div>
      </div>`;
    wire();
  }

  /* ====================== TESTE / RESOLUÇÃO (Parte 3) ====================== */
  function startTest(){
    const f=view.f; const pool=filterPool(f);
    const picked = shuffle(pool).slice(0, Math.min(f.count,pool.length));
    const test = { id:uid('test'), user_id:USER, test_type: f.pass==='99'?'surgical_review':'custom',
      filters:JSON.parse(JSON.stringify(f)), mode:f.mode, secs:f.secs, status:'in_progress',
      qids:picked.map(q=>q.id), idx:0, answers:{}, strikes:{}, times:{}, started_at:new Date().toISOString() };
    store.saveTest(test);
    go({name:'test', test, showAns:false, qStart:Date.now()});
  }
  function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[b[i],b[j]]=[b[j],b[i]];}return b;}

  function renderTest(){
    const T0=view.test, q=store.question(T0.qids[T0.idx]);
    const ans=T0.answers[q.id], answered=ans!=null;
    const revealed = (T0.mode==='tutor' && answered) || view.showAns;
    const strikes=T0.strikes[q.id]||{};
    const flagged=store.isFlagged(q.id);
    const opt = o=>{
      let cls='qb-opt'; const struck=strikes[o.label];
      if(revealed){ if(o.label===q.correct)cls+=' correct'; else if(o.label===ans)cls+=' chosen-wrong'; }
      else if(o.label===ans)cls+=' chosen';
      if(struck)cls+=' struck';
      return `<div class="${cls}" data-act="pick" data-o="${o.label}">
        <button class="qb-strike" data-act="strike" data-o="${o.label}" title="strikethrough">✕</button>
        <span class="qb-opt-l">${o.label}</span><span class="qb-opt-t">${qbField(o.text, ptOptionText(q,o.label))}</span>
        ${revealed&&o.label===q.correct?'<span class="qb-tick">✓</span>':''}
      </div>`;
    };
    const grid = T0.qids.map((qid,n)=>{
      const a=T0.answers[qid]; let cls='qb-grid-cell';
      if(n===T0.idx)cls+=' cur';
      if(a!=null){ const qq=store.question(qid); cls+= a===qq.correct?' g-ok':' g-bad'; }
      if(store.isFlagged(qid))cls+=' g-flag';
      return `<button class="${cls}" data-act="goto" data-n="${n}">${n+1}</button>`;
    }).join('');

    root.innerHTML = `
      <div class="qb qb-test">
        ${T0.preview?`<div class="qb-preview-banner">${esc(t('previewBanner')(T0.qids.length))}${(T0.previewMissing&&T0.previewMissing.length)?`<br>${esc(t('previewMissing')(T0.previewMissing))}`:''}</div>`:''}
        <div class="qb-test-head">
          <span class="qb-qnum">${esc(t('qOf')(T0.idx+1,T0.qids.length))}</span>
          <div class="qb-head-tools">
            <button class="qb-tool ${flagged?'on':''}" data-act="flag">⚑ ${esc(flagged?t('unflag'):t('flag'))}</button>
            <button class="qb-tool" data-act="labs">🧪 ${esc(t('labValues'))}</button>
            <span class="qb-timer" id="qbTimer">00:00</span>
            ${T0.preview?'':`<button class="qb-tool warn" data-act="suspend">${esc(t('suspend'))}</button>
            <button class="qb-tool danger" data-act="end">${esc(t('endBlock'))}</button>`}
          </div>
        </div>

        <div class="qb-test-body">
          <div class="qb-vignette">
            ${q.vignette?`<p>${qbField(q.vignette, q.ptTranslation && q.ptTranslation.vignette)}</p>`:''}
            ${renderQImage(q)}
            <p class="qb-stem">${qbField(q.q, q.ptTranslation && q.ptTranslation.q)}</p>
            <div class="qb-opts">${q.options.map(opt).join('')}</div>
            ${(!answered && !T0.preview)?`<button class="qb-btn primary" data-act="submit" ${ans!=null?'':'disabled'} id="qbSubmit">${esc(t('submit'))}</button>`:''}
            ${revealed?renderExplanation(q,ans,T0.preview):''}
          </div>
        </div>

        <div class="qb-nav">
          <button class="qb-btn ghost" data-act="prev" ${T0.idx===0?'disabled':''}>${esc(t('prev'))}</button>
          <div class="qb-grid">${grid}</div>
          <button class="qb-btn ghost" data-act="next" ${T0.idx===T0.qids.length-1?'disabled':''}>${esc(t('next'))}</button>
        </div>
      </div>`;
    wire();
    startTimer(q.id);
  }


  function renderQImage(q){
    if(!q || !q.img) return '';
    const imgs = Array.isArray(q.img) ? q.img : [q.img];
    return imgs.filter(Boolean).map(src => `<figure class="qb-question-image"><img src="${esc(src)}" alt="Question image" loading="lazy" decoding="async" /><figcaption>${esc(t('imageHint'))}</figcaption></figure>`).join('');
  }

  function renderExplanation(q,ans,preview){
    const correct = ans===q.correct;
    const badge = preview? `<span class="qb-badge ok">${esc(t('correctBadge'))}</span>`
      : ans==null? `<span class="qb-badge om">${esc(t('omittedBadge'))}</span>`
      : correct? `<span class="qb-badge ok">${esc(t('correctBadge'))}</span>`
      : `<span class="qb-badge bad">${esc(t('incorrectBadge'))}</span>`;
    const links = store.linksFor(q.id).length;
    const peerRows = q.options.map(o=>{
      const pct=(q.peer&&q.peer[o.label])||0;
      return `<div class="qb-peer-row ${o.label===q.correct?'is-correct':''}">
        <span class="qb-peer-l">${o.label}</span>
        <div class="qb-peer-bar"><span style="width:${pct}%"></span></div>
        <span class="qb-peer-pct">${pct}%</span></div>`;
    }).join('');
    const incorrectExpl = (q.explI||[]).map(e=>`<li><b>${esc(e.option)}.</b> ${qbField(e.explanation, ptExplIText(q,e.option))}</li>`).join('');
    return `<div class="qb-expl">
      <div class="qb-expl-head">${badge}
        <div class="qb-expl-actions">
          <button class="qb-btn tiny" data-act="flash">${esc(t('addFlash'))}${links?` (${links})`:''}</button>
          <button class="qb-btn tiny ghost" data-act="note">${esc(t('addNote'))}</button>
        </div>
      </div>
      <h3>${esc(t('explanation'))}</h3>
      <p class="qb-expl-correct">${qbField(q.explC, q.ptTranslation && q.ptTranslation.explC)}</p>
      ${incorrectExpl?`<ul class="qb-expl-incorrect">${incorrectExpl}</ul>`:''}
      <div class="qb-obj"><span>🎯 ${esc(t('eduObjective'))}</span><p>${qbField(q.objective, q.ptTranslation && q.ptTranslation.objective)}</p></div>
      ${qbPrefDefaults().peer ? `<div class="qb-peer"><h4>${esc(t('peerTitle'))}</h4>${peerRows}</div>` : ''}
      ${renderQuestionMeta(q)}
    </div>`;
  }

  function renderQuestionMeta(q){
    const m=metaFor(q);
    return `<div class="qb-meta-end">
      <h4>${esc(t('metaTitle'))}</h4>
      <div class="qb-meta-pills">
        <button class="qb-meta-pill" data-act="meta-filter" data-kind="subject" data-v="${esc(m.subjectId)}"><b>${esc(t('metaSubject'))}</b><span>${esc(m.subject)}</span></button>
        <button class="qb-meta-pill" data-act="meta-filter" data-kind="system" data-v="${esc(m.systemId)}"><b>${esc(t('metaSystem'))}</b><span>${esc(m.system)}</span></button>
        <button class="qb-meta-pill" data-act="meta-filter" data-kind="topic" data-v="${esc(m.topicId)}"><b>${esc(t('metaTopic'))}</b><span>${esc(m.topic)}</span></button>
      </div>
      <small>${esc(m.libraryPath)}</small>
    </div>`;
  }

  let timerH=null;
  function startTimer(qid){
    const el=document.getElementById('qbTimer'); if(!el)return;
    if(timerH)clearInterval(timerH);
    const start=Date.now();
    const T0=view.test;
    const secsLimit = T0.mode==='timed'? T0.secs : 0;
    const tick=()=>{ const s=Math.floor((Date.now()-start)/1000);
      const m=String(Math.floor(s/60)).padStart(2,'0'), ss=String(s%60).padStart(2,'0');
      el.textContent=`${m}:${ss}`;
      if(secsLimit && s>=secsLimit && view.test.answers[qid]==null){ // auto-omit no timed
        clearInterval(timerH); submitAnswer(true);
      }
    };
    tick(); timerH=setInterval(tick,1000);
    view.qStart=start;
  }

  function submitAnswer(auto){
    const T0=view.test;
    if(T0.preview) return; // preview mode: read-only, never records attempts/saves state
    const q=store.question(T0.qids[T0.idx]);
    const ans = auto? null : T0.pending;
    const time=Math.round((Date.now()-(view.qStart||Date.now()))/1000);
    T0.answers[q.id]= ans==null? (T0.answers[q.id]??null) : ans;
    // registra attempt imutável (Parte 3/4) — só na 1ª submissão desta questão neste bloco
    if(!T0._recorded) T0._recorded={};
    if(!T0._recorded[q.id]){
      const status = ans==null?'omitted': ans===q.correct?'correct':'incorrect';
      store.addAttempt({ question_id:q.id, test_id:T0.id, selected_option:ans,
        is_correct: ans==null?null:(ans===q.correct?1:0), status, time_spent_seconds:time,
        mode:T0.mode, flagged:store.isFlagged(q.id), strikethrough_options:Object.keys(T0.strikes[q.id]||{}) });
      T0._recorded[q.id]=true;
      store.saveTest(serializeTest(T0));
    }
    if(timerH)clearInterval(timerH);
    // Parte 5: modal causa-raiz em erro (modo tutor)
    if(T0.mode==='tutor' && ans!=null && ans!==q.correct){ view.showAns=true; render(); openRootCause(q); return; }
    view.showAns = (T0.mode==='tutor'); render();
  }

  function serializeTest(T0){ // grava sem campos voláteis
    const {id,user_id,test_type,filters,mode,secs,status,qids,idx,answers,strikes,started_at}=T0;
    return {id,user_id,test_type,filters,mode,secs,status,qids,idx,answers,strikes,started_at,
      total_count:qids.length,
      correct_count:qids.filter(q=>answers[q]===store.question(q).correct).length,
      incorrect_count:qids.filter(q=>answers[q]!=null&&answers[q]!==store.question(q).correct).length,
      omitted_count:qids.filter(q=>answers[q]==null).length };
  }

  function endBlock(){
    const T0=view.test;
    if(T0.preview) return; // preview mode: never records attempts/saves state
    // registra omitidas restantes
    if(!T0._recorded)T0._recorded={};
    T0.qids.forEach(qid=>{ if(!T0._recorded[qid]){ const q=store.question(qid);
      store.addAttempt({question_id:qid,test_id:T0.id,selected_option:null,is_correct:null,status:'omitted',
        time_spent_seconds:0,mode:T0.mode,flagged:store.isFlagged(qid),strikethrough_options:[]});
      T0._recorded[qid]=true; } });
    const done=serializeTest(T0); done.status='completed'; done.completed_at=new Date().toISOString();
    store.saveTest(done);
    if(timerH)clearInterval(timerH);
    go({name:'results', test:T0});
  }

  /* ===================== RESULTADOS (Parte 5.5 surgical) ===================== */
  function renderResults(){
    const T0=view.test;
    let c=0,i=0,o=0;
    T0.qids.forEach(qid=>{ const a=T0.answers[qid]; if(a==null)o++; else if(a===store.question(qid).correct)c++; else i++; });
    const answered=c+i, score= answered?Math.round(100*c/answered):0;
    // por sistema
    const bySys={};
    T0.qids.forEach(qid=>{ const q=store.question(qid),a=T0.answers[qid]; const s=q.system; bySys[s]=bySys[s]||{c:0,n:0};
      if(a!=null){bySys[s].n++; if(a===q.correct)bySys[s].c++;} });
    const sysRows=Object.entries(bySys).map(([s,v])=>{ const p=v.n?Math.round(100*v.c/v.n):0;
      return `<div class="qb-sys-row"><span>${esc(sysName(s))}</span><div class="qb-sys-bar"><span style="width:${p}%"></span></div><b>${p}%</b></div>`; }).join('');
    // causa-raiz mais frequente para surgical review
    const rc=rootCauseCounts(); const topRc=rc[0];
    const surgN = topRc? Math.min(15, store.allAttempts().filter(a=>a.root_cause_tag===topRc.tag).length):0;

    root.innerHTML=`
      <div class="qb qb-results">
        <button class="qb-link" data-act="home">${esc(t('backHome'))}</button>
        <h1>${esc(t('resTitle'))}</h1>
        <div class="qb-res-top">
          <div class="qb-donut" style="--pct:${score}"><div class="qb-donut-c"><strong>${score}%</strong><small>${esc(t('score'))}</small></div></div>
          <div class="qb-res-stats">
            <div><span class="qb-dot ok"></span><b>${c}</b> ${esc(t('correct'))}</div>
            <div><span class="qb-dot bad"></span><b>${i}</b> ${esc(t('incorrect'))}</div>
            <div><span class="qb-dot om"></span><b>${o}</b> ${esc(t('omitted'))}</div>
          </div>
        </div>
        <h2 class="qb-h2">${esc(t('bySystem'))}</h2>
        <div class="qb-sys">${sysRows||'<p class="qb-muted">—</p>'}</div>
        ${topRc?`<button class="qb-surgical" data-act="surgical"><strong>${esc(t('surgical'))}</strong><small>${esc(t('surgicalSub')(surgN||i))}</small></button>`:''}
        <div class="qb-res-actions">
          <button class="qb-btn ghost" data-act="review-block">${esc(t('reviewAll'))}</button>
          <button class="qb-btn primary" data-act="create">＋ ${esc(t('createTest'))}</button>
        </div>
      </div>`;
    wire();
  }

  /* ===================== ANALYTICS (Parte 7) ===================== */
  function rootCauseCounts(){
    const m={};
    store.allAttempts().forEach(a=>{ if(a.root_cause_tag) m[a.root_cause_tag]=(m[a.root_cause_tag]||0)+1; });
    return Object.entries(m).map(([tag,n])=>({tag,n})).sort((a,b)=>b.n-a.n);
  }
  function renderAnalytics(){
    const att=store.allAttempts();
    if(!att.length){ root.innerHTML=`<div class="qb"><button class="qb-link" data-act="home">${esc(t('back'))}</button><h1>${esc(t('analytics'))}</h1><p class="qb-empty">${esc(t('anEmpty'))}</p></div>`; return wire(); }
    // por sistema
    const sys={};
    att.forEach(a=>{ if(a.status==='omitted')return; const q=store.question(a.question_id); const s=q.system; sys[s]=sys[s]||{c:0,n:0}; sys[s].n++; if(a.is_correct)sys[s].c++; });
    const sysRows=Object.entries(sys).sort((a,b)=>a[0].localeCompare(b[0])).map(([s,v])=>{const p=v.n?Math.round(100*v.c/v.n):0;
      return `<div class="qb-sys-row"><span>${esc(sysName(s))}</span><div class="qb-sys-bar"><span style="width:${p}%"></span></div><b>${p}% <em>(${v.c}/${v.n})</em></b></div>`;}).join('');
    // por pass
    const pass={};
    att.forEach(a=>{ if(a.status==='omitted')return; pass[a.pass_number]=pass[a.pass_number]||{c:0,n:0}; pass[a.pass_number].n++; if(a.is_correct)pass[a.pass_number].c++; });
    const passRows=Object.entries(pass).sort((a,b)=>a[0]-b[0]).map(([p,v])=>{const pc=v.n?Math.round(100*v.c/v.n):0; const lbl=p==='99'?t('dirigido'):`${p}ª ${t('pass')}`;
      return `<div class="qb-sys-row"><span>${esc(lbl)}</span><div class="qb-sys-bar"><span style="width:${pc}%"></span></div><b>${pc}% <em>(${v.c}/${v.n})</em></b></div>`;}).join('');
    // causa raiz
    const rc=rootCauseCounts(); const rcMax=Math.max(1,...rc.map(x=>x.n));
    const rcName=id=>{const o=ROOT_CAUSES.find(r=>r.id===id);return o?o[lang()]:id;};
    const rcRows=rc.map(x=>`<div class="qb-sys-row"><span>${esc(rcName(x.tag))}</span><div class="qb-sys-bar rc"><span style="width:${Math.round(100*x.n/rcMax)}%"></span></div><b>${x.n}</b></div>`).join('');

    root.innerHTML=`
      <div class="qb qb-analytics">
        <button class="qb-link" data-act="home">${esc(t('back'))}</button>
        <h1>${esc(t('analytics'))}</h1>
        <section class="qb-an-block"><h2>${esc(t('anBySystem'))}</h2><div class="qb-sys">${sysRows}</div></section>
        <section class="qb-an-block"><h2>${esc(t('anByPass'))}</h2><div class="qb-sys">${passRows||'<p class="qb-muted">—</p>'}</div></section>
        ${rc.length?`<section class="qb-an-block"><h2>${esc(t('anRootCause'))}</h2><div class="qb-sys">${rcRows}</div></section>`:''}
        <p class="qb-disclaimer">${esc(t('disclaimer'))}</p>
      </div>`;
    wire();
  }

  /* ===================== MODAIS ===================== */
  function modal(html){
    const m=document.createElement('div'); m.className='qb-modal'; m.innerHTML=`<div class="qb-modal-card">${html}</div>`;
    m.addEventListener('click',e=>{if(e.target===m)m.remove();});
    document.body.appendChild(m); return m;
  }
  function openRootCause(q){
    const opts=ROOT_CAUSES.map(r=>`<button class="qb-rc-opt" data-rc="${r.id}">${esc(r[lang()])}</button>`).join('');
    const m=modal(`<h3>${esc(t('rcTitle'))}</h3><p class="qb-modal-sub">${esc(t('rcSub'))}</p><div class="qb-rc-opts">${opts}</div><button class="qb-btn ghost small" data-rc="skip">${esc(t('rcSkip'))}</button>`);
    m.querySelectorAll('[data-rc]').forEach(b=>b.addEventListener('click',()=>{
      const tag=b.dataset.rc;
      if(tag!=='skip'){ // grava no último attempt desta questão
        const list=store.attemptsFor(q.id); const last=list[list.length-1]; if(last){last.root_cause_tag=tag; store.save();}
      }
      m.remove();
    }));
  }
  function openFlashcard(q,ans){
    const back = `${q.explC}\n\n🎯 ${q.objective}`;
    const m=modal(`
      <h3>${esc(t('scTitle'))}</h3>
      <label class="qb-modal-lbl">${esc(t('scFront'))}</label>
      <textarea id="scFront" class="qb-ta" rows="2" placeholder=""></textarea>
      <label class="qb-modal-lbl">${esc(t('scBack'))}</label>
      <textarea id="scBack" class="qb-ta" rows="5">${esc(back)}</textarea>
      <p class="qb-modal-hint">${esc(t('scHint'))}</p>
      <div class="qb-modal-actions">
        <button class="qb-btn ghost" data-x="cancel">${esc(t('scCancel'))}</button>
        <button class="qb-btn primary" data-x="save" id="scSave" disabled>${esc(t('scSave'))}</button>
      </div>`);
    const front=m.querySelector('#scFront'), save=m.querySelector('#scSave');
    front.addEventListener('input',()=>{ save.disabled=!front.value.trim(); });
    front.focus();
    m.querySelector('[data-x="cancel"]').addEventListener('click',()=>m.remove());
    save.addEventListener('click',()=>{
      const fcId=saveSmartCard(q, front.value.trim(), m.querySelector('#scBack').value.trim(), ans);
      store.linkFlashcard(q.id,fcId);
      m.remove(); toast(t('scSaved')); render();
    });
  }
  // Parte 15.5/15.6 — grava no MESMO banco que o módulo Flashcards lê
  function saveSmartCard(q, front, back, ans){
    let fc; try{ fc=JSON.parse(localStorage.getItem(FC_KEY)); }catch(e){}
    if(!fc||!fc.decks||!fc.cards) fc={decks:[],cards:[],stats:{reviews:0,correct:0},days:{},sharedProgress:{},prefs:{}};
    let deck=fc.decks.find(d=>d.name===t('scDeck'));
    if(!deck){ deck={id:'deck_'+Date.now().toString(36),name:t('scDeck')}; fc.decks.push(deck); }
    const wasError = ans!=null && ans!==q.correct;
    const id='fc_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    const tomorrow = wasError? Date.now() : Date.now(); // priority high (erro) → ativo já; senão também novo
    fc.cards.push({ id, deckId:deck.id, front, back, image64:null,
      tags:['qbank', SYS_NAMES[q.system]||q.system], type:/\{\{c\d+::/.test(front)?'cloze':'basic',
      source:'qbank', shared:false, createdAt:new Date().toISOString().slice(0,10),
      state:'new', stepIdx:0, due:tomorrow, interval:0, ease:2.5, reps:0, lapses:0, suspended:false, flag: wasError?'red':null, buriedUntil:0,
      // metadados herdados (Parte 15.5)
      sourceQuestionId:q.id, priority: wasError?'high':'normal' });
    localStorage.setItem(FC_KEY, JSON.stringify(fc));
    return id;
  }
  function openNote(q){
    const m=modal(`<h3>${esc(t('nbTitle'))}</h3><textarea id="nbTa" class="qb-ta" rows="5" placeholder="${esc(t('nbPh'))}"></textarea>
      <div class="qb-modal-actions"><button class="qb-btn ghost" data-x="cancel">${esc(t('scCancel'))}</button><button class="qb-btn primary" data-x="save">${esc(t('nbSave'))}</button></div>`);
    m.querySelector('[data-x="cancel"]').addEventListener('click',()=>m.remove());
    m.querySelector('[data-x="save"]').addEventListener('click',()=>{ const v=m.querySelector('#nbTa').value.trim(); if(v)store.addNote(q.id,v); m.remove(); toast(t('nbSaved')); });
    m.querySelector('#nbTa').focus();
  }
  function openLabs(q){
    // Cada linha: sigla, faixa (EN), faixa (PT), significado (EN), significado (PT)
    // Autorizado por John (v38) apenas para o popup de VR — sem alterar questões/schema.
    const rows=[
      ['Na⁺','136–145 mEq/L','136–145 mEq/L','Sodium','Sódio'],
      ['K⁺','3.5–5.0 mEq/L','3.5–5.0 mEq/L','Potassium','Potássio'],
      ['Cl⁻','98–106 mEq/L','98–106 mEq/L','Chloride','Cloro'],
      ['HCO₃⁻','22–28 mEq/L','22–28 mEq/L','Bicarbonate','Bicarbonato'],
      ['BUN','7–20 mg/dL','7–20 mg/dL','Blood urea nitrogen','Nitrogênio ureico sanguíneo'],
      ['Creatinine','0.6–1.2 mg/dL','0,6–1,2 mg/dL','Creatinine','Creatinina'],
      ['Glucose (fasting)','70–100 mg/dL','70–100 mg/dL','Fasting blood glucose','Glicemia de jejum'],
      ['Ca²⁺','8.4–10.2 mg/dL','8,4–10,2 mg/dL','Calcium','Cálcio'],
      ['Hemoglobin','13.5–17.5 g/dL (M)','13,5–17,5 g/dL (H)','Hemoglobin','Hemoglobina'],
      ['Leukocytes','4,500–11,000/mm³','4.500–11.000/mm³','White blood cells','Leucócitos (glóbulos brancos)'],
      ['Platelets','150–400 ×10³/mm³','150–400 ×10³/mm³','Platelets','Plaquetas'],
      ['TSH','0.4–4.0 µU/mL','0,4–4,0 µU/mL','Thyroid-stimulating hormone','Hormônio tireoestimulante']
    ];
    const isPt = lang()==='pt';
    const renderRows = list => list.map(r=>{
      const range = isPt ? r[2] : r[1];
      const meaning = isPt ? r[4] : r[3];
      return `<tr>
        <td><span class="qb-lab-term" tabindex="0" data-tip="${esc(meaning)}">${r[0]}<span class="qb-lab-tip">${esc(meaning)}</span></span></td>
        <td>${esc(range)}</td>
      </tr>`;
    }).join('');
    // Valores pertinentes à questão atual (campo opcional q.labs, pesquisado individualmente por questão — ver QBANK_ADD_QUESTION.md Seção 24)
    const qRows = (q && Array.isArray(q.labs)) ? q.labs : [];
    const qSection = qRows.length ? `<p class="qb-modal-sub qb-lab-hint">${esc(t('labRelevant'))}</p>
      <table class="qb-labtable qb-labtable-tips qb-labtable-relevant"><tbody>${renderRows(qRows)}</tbody></table>` : '';
    const html=renderRows(rows);
    const m=modal(`<h3>${esc(t('labTitle'))}</h3>
      ${qSection}
      <p class="qb-modal-sub qb-lab-hint">${esc(t('labHint'))}</p>
      <table class="qb-labtable qb-labtable-tips"><tbody>${html}</tbody></table>
      <div class="qb-modal-actions"><button class="qb-btn primary" data-x="close">${esc(t('close'))}</button></div>`);
    m.querySelector('[data-x="close"]').addEventListener('click',()=>m.remove());
  }
  function toast(msg){ const el=document.createElement('div'); el.className='qb-toast'; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.classList.add('show'),10); setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),300);},2600); }

  /* ============================== EVENTOS ============================== */
  function wire(){
    root.querySelectorAll('[data-act]').forEach(el=>{
      const a=el.dataset.act;
      if(el.tagName==='INPUT' && (el.type==='checkbox')) el.addEventListener('change',onAct);
      else if(a==='count-num'||a==='secs'||a==='count') el.addEventListener('input',onNumInput);
      else el.addEventListener('click',onAct);
    });
  }
  function onNumInput(e){
    const a=e.target.dataset.act;
    if(a==='secs'){ view.f.secs=+e.target.value; render(); }
    else if(a==='count-num'||a==='count'){ view.f.count=Math.max(1,+e.target.value||1); }
  }
  function onAct(e){
    const el=e.currentTarget, act=el.dataset.act;
    if(['count','count-num','secs'].includes(act)) return;
    switch(act){
      case 'home': go({name:'home'}); break;
      case 'analytics': go({name:'analytics'}); break;
      case 'create': go({name:'create'}); break;
      case 'flagged': { view.f={systems:[],disciplines:[],subjects:[],status:'marked',pass:'all',difficulty:'all',mode:'tutor',secs:90,count:Math.max(1,Object.keys(store.raw.flags).length)}; if(!filterPool(view.f).length){toast(t('flaggedEmpty'));break;} go({name:'create',f:view.f}); break; }
      case 'sel-pass': { const pn=el.dataset.pn==='99'?99:+el.dataset.pn; if(store.passState(pn)==='locked' && !store.isAdmin()){ toast(t('lockedToast')); break; } view.sel=pn; render(); break; }
      case 'pass-card': { const pn=el.dataset.pn; if(store.passState(pn==='99'?99:+pn)==='locked' && !store.isAdmin()){ toast(t('lockedToast')); break; } const defMode=qbPrefDefaults().mode, defCount=qbPrefDefaults().count; view.f={systems:[],disciplines:[],subjects:[],status:'all',pass:pn,difficulty:'all',mode:defMode,secs:90,count:defCount}; go({name:'create',f:view.f,preset:{pass:pn}}); break; }
      case 'tog-sys': { const sys=TAXONOMY.find(s=>s.id===el.dataset.v); const ids=sys.subs.map(([slug])=>subjId(sys.id,slug)); const allOn=ids.every(id=>view.f.subjects.includes(id)); if(allOn){ view.f.subjects=view.f.subjects.filter(id=>!ids.includes(id)); } else { ids.forEach(id=>{ if(!view.f.subjects.includes(id)) view.f.subjects.push(id); }); } render(); break; }
      case 'tog-sub': { const id=el.dataset.v; const i=view.f.subjects.indexOf(id); i>=0?view.f.subjects.splice(i,1):view.f.subjects.push(id); render(); break; }
      case 'tog-system': { const id=el.dataset.v; const i=view.f.systems.indexOf(id); i>=0?view.f.systems.splice(i,1):view.f.systems.push(id); render(); break; }
      case 'tog-system-all': { view.f.systems=[]; render(); break; }
      case 'tog-disc': { const id=el.dataset.v; const i=view.f.disciplines.indexOf(id); i>=0?view.f.disciplines.splice(i,1):view.f.disciplines.push(id); render(); break; }
      case 'tog-disc-all': { view.f.disciplines=[]; render(); break; }
      case 'tog-topic': { const id=el.dataset.v; const i=view.f.subjects.indexOf(id); i>=0?view.f.subjects.splice(i,1):view.f.subjects.push(id); render(); break; }
      case 'tog-topic-all': { view.f.subjects=[]; render(); break; }
      case 'tog-all': { if(view.f.subjects.length){ view.f.subjects=[]; } else { const all=[]; TAXONOMY.forEach(s=>s.subs.forEach(([slug])=>all.push(subjId(s.id,slug)))); view.f.subjects=all; } render(); break; }
      case 'collapse': { const id=el.dataset.v; view.collapsed[id]=!view.collapsed[id]; render(); break; }
      case 'collapse-all': { const all=TAXONOMY.every(s=>view.collapsed[s.id]); TAXONOMY.forEach(s=>view.collapsed[s.id]=!all); render(); break; }
      case 'status': view.f.status=el.dataset.v; render(); break;
      case 'pass': view.f.pass=el.dataset.v; render(); break;
      case 'diff': view.f.difficulty=el.dataset.v; render(); break;
      case 'mode': view.f.mode=el.dataset.v; render(); break;
      case 'meta-filter': {
        const kind=el.dataset.kind, val=el.dataset.v;
        const nf={systems:[],disciplines:[],subjects:[],status:'all',pass:'all',difficulty:'all',mode:'tutor',secs:90,count:10};
        if(kind==='system'){
          const sys=TAXONOMY.find(x=>x.id===val);
          nf.subjects = sys ? sys.subs.map(([slug])=>subjId(sys.id,slug)).filter(id=>SEED.some(q=>q.category===id)) : [];
        }
        if(kind==='subject'){
          nf.subjects = [...new Set(SEED.filter(q=>metaFor(q).subjectId===val).map(q=>q.category))];
        }
        if(kind==='topic') nf.subjects=[val];
        go({name:'create',f:nf}); break;
      }
      case 'generate': startTest(); break;
      // teste
      case 'pick': { if(view.test.mode==='tutor' && view.test.answers[currentQ().id]!=null) break; if(view.showAns)break; view.test.pending=el.dataset.o; view.test.answers[currentQ().id]=null; markPending(el.dataset.o); break; }
      case 'strike': { e.stopPropagation(); const q=currentQ(); const s=view.test.strikes[q.id]=view.test.strikes[q.id]||{}; const o=el.dataset.o; s[o]?delete s[o]:s[o]=true; render(); break; }
      case 'submit': submitAnswer(false); break;
      case 'flag': store.toggleFlag(currentQ().id); render(); break;
      case 'labs': openLabs(currentQ()); break;
      case 'suspend': if(view.test.preview){ go({name:'home'}); break; } if(confirm(t('confirmSuspend'))){ const s=serializeTest(view.test); s.status='suspended'; store.saveTest(s); if(timerH)clearInterval(timerH); go({name:'home'});} break;
      case 'end': if(view.test.preview){ go({name:'home'}); break; } if(confirm(t('confirmEnd'))) endBlock(); break;
      case 'prev': if(view.test.idx>0){view.test.idx--; view.showAns=!!view.test.preview; view.test.pending=null; render();} break;
      case 'next': if(view.test.idx<view.test.qids.length-1){view.test.idx++; view.showAns=!!view.test.preview; view.test.pending=null; render();} break;
      case 'goto': { view.test.idx=+el.dataset.n; view.showAns=!!view.test.preview; view.test.pending=null; render(); break; }
      case 'flash': openFlashcard(currentQ(), view.test.answers[currentQ().id]); break;
      case 'note': openNote(currentQ()); break;
      // resultados
      case 'surgical': startSurgical(); break;
      case 'review-block': { view.test.idx=0; view.showAns=true; go({name:'test',test:view.test,showAns:true,qStart:Date.now()}); break; }
    }
  }
  const currentQ = ()=> store.question(view.test.qids[view.test.idx]);
  function markPending(o){ // atualiza seleção sem re-render completo
    root.querySelectorAll('.qb-opt').forEach(d=>d.classList.remove('chosen'));
    const d=[...root.querySelectorAll('.qb-opt')].find(x=>x.dataset.o===o); if(d)d.classList.add('chosen');
    const sub=document.getElementById('qbSubmit'); if(sub)sub.disabled=false;
  }
  function startSurgical(){
    const rc=rootCauseCounts()[0];
    const pool = rc? SEED.filter(q=>store.attemptsFor(q.id).some(a=>a.root_cause_tag===rc.tag)) : store.directedPool();
    const extra = store.directedPool();
    const set=[...new Set([...pool,...extra])].slice(0,15);
    if(!set.length){ toast(t('flaggedEmpty')); return; }
    view.f={subjects:[],status:'all',pass:'all',difficulty:'all',mode:'tutor',secs:90,count:set.length};
    const test={id:uid('test'),user_id:USER,test_type:'surgical_review',filters:{},mode:'tutor',secs:90,status:'in_progress',
      qids:set.map(q=>q.id),idx:0,answers:{},strikes:{},times:{},started_at:new Date().toISOString()};
    store.saveTest(test); go({name:'test',test,showAns:false,qStart:Date.now()});
  }

  window.addEventListener('couplemed:langchange', ()=>{
    if(!root) return;
    render();
  });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
