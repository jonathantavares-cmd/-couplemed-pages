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

    // BATCH 03 — Biochemistry (15 questions)
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
    { id:'CMQ-STEP1-BCH-0006', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::homocysteine', difficulty:'medium',
      vignette:'A 34-year-old previously healthy man comes to the emergency department due to a 3-hour history of chest pain, diaphoresis, and dyspnea. He does not smoke, exercises regularly, and eats a balanced diet. His father died at age 56 from a myocardial infarction. His blood pressure is 110/70 mm Hg and pulse is 110/min and regular. Physical examination is unremarkable. ECG shows ST elevation in the anterolateral leads. Coronary angiogram reveals proximal left anterior descending artery stenosis and thrombosis, which is treated with angioplasty and stent placement. Laboratory results are as follows:\n\nTotal cholesterol: 160 mg/dL\nLow-density lipoprotein: 90 mg/dL\nGlucose, serum: 98 mg/dL\nHomocysteine, plasma: 21.5 µmol/L (normal: 4-14 µmol/L)\n\nFurther testing reveals a homozygous mutation in the methylene tetrahydrofolate reductase gene that leads to decreased enzymatic activity.',
      q:'Due to this defect, the patient most likely has impairment converting homocysteine to which of the following?',
      options:[
        {label:'A', text:'Cystathionine'},
        {label:'B', text:'Cysteine'},
        {label:'C', text:'Methionine'},
        {label:'D', text:'Methylmalonyl-CoA'},
        {label:'E', text:'Succinyl-CoA'},
      ],
      correct:'C',
      explC:'Significant elevations in plasma homocysteine levels have been associated with thrombotic events, including venous thromboses, coronary artery disease, and ischemic stroke. The mechanism is thought to be due to direct and indirect induction of endothelial damage.\n\nHomocysteine, an intermediary amino acid, can be metabolized to methionine via remethylation or to cystathionine via transsulfuration. Remethylation to methionine occurs with the donation of a methyl group from methyl-tetrahydrofolate via methionine synthase, with vitamin B12 (cobalamin) as an important cofactor. Methyl-tetrahydrofolate is regenerated by the enzyme methylene tetrahydrofolate reductase (MTHFR), using FAD as a cofactor. Transsulfuration occurs by conversion of methionine to cystathionine (via cystathionine-β-synthase) and subsequently to cysteine (via the enzyme cystathionase), using vitamin B6 as a cofactor.\n\nElevations in plasma homocysteine can occur due to genetic mutations in critical enzymes and vitamin (cofactor) deficiencies. MTHFR deficiency is the most common genetic cause of hyperhomocysteinemia. Low levels of the B vitamins cobalamin, pyridoxine, and folate are associated with hyperhomocysteinemia. Endothelial damage may be due to several factors, including homocysteine causing direct injury, being a precursor to the vasodilator hydrogen sulfide, and increasing oxidative stress. Despite this, interventions to lower homocysteine levels (eg, vitamin B supplementation) have not demonstrated a decrease in cardiovascular risk or mortality, and there is some concern that the association between hyperhomocysteinemia and thrombotic events may reflect confounding.',
      explI:[
        {option:'A', explanation:'Although MTHFR deficiency is the most common genetic cause of hyperhomocysteinemia, the most common cause of homocystinuria (an autosomal recessive condition associated with hyperhomocysteinemia) is cystathionine-β-synthase deficiency. However, the degree of hyperhomocysteinemia in homocystinuria is severe, associated with multisystem toxicity from a young age, manifesting intellectual disability, Marfanoid body habitus, and ectopia lentis (dislocated lens), not seen in this patient.'},
        {option:'B', explanation:'Although MTHFR deficiency is the most common genetic cause of hyperhomocysteinemia, the most common cause of homocystinuria (an autosomal recessive condition associated with hyperhomocysteinemia) is cystathionine-β-synthase deficiency. However, the degree of hyperhomocysteinemia in homocystinuria is severe, associated with multisystem toxicity from a young age, manifesting intellectual disability, Marfanoid body habitus, and ectopia lentis (dislocated lens), not seen in this patient.'},
        {option:'D', explanation:'Vitamin B12 is a cofactor for the enzyme methylmalonyl-CoA mutase in the conversion of methylmalonyl-CoA to succinyl-CoA, a reaction that occurs in the breakdown of odd-chain fatty acids and some amino acids. As a result, patients with vitamin B12 deficiency have elevated methylmalonyl-CoA levels that subsequently result in buildup of neurotoxic methylmalonic acid. Symptomatic consequences include lethargy, seizures, paresthesias, and hypotonia. Homocysteine is elevated in both folate and vitamin B12 deficiencies, but methylmalonyl-CoA is elevated in vitamin B12 deficiency only.'},
        {option:'E', explanation:'Vitamin B12 is a cofactor for the enzyme methylmalonyl-CoA mutase in the conversion of methylmalonyl-CoA to succinyl-CoA, a reaction that occurs in the breakdown of odd-chain fatty acids and some amino acids. As a result, patients with vitamin B12 deficiency have elevated methylmalonyl-CoA levels that subsequently result in buildup of neurotoxic methylmalonic acid. Symptomatic consequences include lethargy, seizures, paresthesias, and hypotonia. Homocysteine is elevated in both folate and vitamin B12 deficiencies, but methylmalonyl-CoA is elevated in vitamin B12 deficiency only.'},
      ],
      objective:'Significant elevations in levels of plasma homocysteine are associated with thrombotic events. Homocysteine can be metabolized to methionine via remethylation or to cystathionine via transsulfuration. Hyperhomocysteinemia is most commonly due to genetic mutations in critical enzymes or deficiencies of vitamin B12, vitamin B6, and folate.',
      peer:{A:9, B:10, C:67, D:10, E:2},
      img:'assets/qbank/CMQ-STEP1-BCH-0006_folate_methionine_cycle.png',
      ptTranslation:{
        vignette:'Um homem de 34 anos previamente hígido vem ao pronto-socorro devido a um quadro de 3 horas de dor torácica, diaforese e dispneia. Ele não fuma, pratica exercícios regularmente e tem uma dieta equilibrada. Seu pai morreu aos 56 anos de infarto do miocárdio. Sua pressão arterial é 110/70 mmHg e o pulso é 110/min e regular. O exame físico é inexpressivo. O ECG mostra supradesnivelamento do segmento ST nas derivações anterolaterais. O angiograma coronariano revela estenose e trombose proximal da artéria descendente anterior esquerda, tratadas com angioplastia e colocação de stent. Os resultados laboratoriais são os seguintes:\n\nColesterol total: 160 mg/dL\nLipoproteína de baixa densidade: 90 mg/dL\nGlicose sérica: 98 mg/dL\nHomocisteína plasmática: 21,5 µmol/L (normal: 4-14 µmol/L)\n\nExames adicionais revelam uma mutação homozigótica no gene da metilenotetrahidrofolato redutase que leva à diminuição da atividade enzimática.',
        q:'Devido a esse defeito, o paciente muito provavelmente apresenta comprometimento na conversão de homocisteína em qual das seguintes substâncias?',
        objective:'Elevações significativas nos níveis de homocisteína plasmática estão associadas a eventos trombóticos. A homocisteína pode ser metabolizada em metionina via remetilação ou em cistationina via transsulfuração. A hiper-homocisteinemia é mais comumente causada por mutações genéticas em enzimas críticas ou por deficiências de vitamina B12, vitamina B6 e ácido fólico.',
        options:[
          {label:'A', text:'Cistationina'},
          {label:'B', text:'Cisteína'},
          {label:'C', text:'Metionina'},
          {label:'D', text:'Metilmalonil-CoA'},
          {label:'E', text:'Succinil-CoA'},
        ],
        explC:'Elevações significativas nos níveis de homocisteína plasmática têm sido associadas a eventos trombóticos, incluindo tromboses venosas, doença arterial coronariana e acidente vascular cerebral isquêmico. Acredita-se que o mecanismo seja devido à indução direta e indireta de dano endotelial.\n\nA homocisteína, um aminoácido intermediário, pode ser metabolizada em metionina via remetilação ou em cistationina via transsulfuração. A remetilação em metionina ocorre com a doação de um grupo metil do metil-tetrahidrofolato via metionina sintase, tendo a vitamina B12 (cobalamina) como cofator importante. O metil-tetrahidrofolato é regenerado pela enzima metilenotetrahidrofolato redutase (MTHFR), usando FAD como cofator. A transsulfuração ocorre pela conversão de metionina em cistationina (via cistationina-β-sintase) e, subsequentemente, em cisteína (via a enzima cistationase), usando vitamina B6 como cofator.\n\nElevações na homocisteína plasmática podem ocorrer devido a mutações genéticas em enzimas críticas e deficiências de vitaminas (cofatores). A deficiência de MTHFR é a causa genética mais comum de hiper-homocisteinemia. Níveis baixos das vitaminas do complexo B — cobalamina, piridoxina e ácido fólico — estão associados à hiper-homocisteinemia. O dano endotelial pode ser devido a vários fatores, incluindo a lesão direta causada pela homocisteína, o fato de ela ser precursora do vasodilatador sulfeto de hidrogênio, e o aumento do estresse oxidativo. Apesar disso, intervenções para reduzir os níveis de homocisteína (por exemplo, suplementação de vitaminas do complexo B) não demonstraram redução do risco cardiovascular ou da mortalidade, e há certa preocupação de que a associação entre hiper-homocisteinemia e eventos trombóticos possa refletir confundimento.',
        explI:[
          {option:'A', explanation:'Embora a deficiência de MTHFR seja a causa genética mais comum de hiper-homocisteinemia, a causa mais comum de homocistinúria (uma condição autossômica recessiva associada à hiper-homocisteinemia) é a deficiência de cistationina-β-sintase. Entretanto, o grau de hiper-homocisteinemia na homocistinúria é grave, associado a toxicidade multissistêmica desde jovem, manifestando-se com deficiência intelectual, hábito marfanoide e ectopia lentis (deslocamento do cristalino), não observados neste paciente.'},
          {option:'B', explanation:'Embora a deficiência de MTHFR seja a causa genética mais comum de hiper-homocisteinemia, a causa mais comum de homocistinúria (uma condição autossômica recessiva associada à hiper-homocisteinemia) é a deficiência de cistationina-β-sintase. Entretanto, o grau de hiper-homocisteinemia na homocistinúria é grave, associado a toxicidade multissistêmica desde jovem, manifestando-se com deficiência intelectual, hábito marfanoide e ectopia lentis (deslocamento do cristalino), não observados neste paciente.'},
          {option:'D', explanation:'A vitamina B12 é cofator da enzima metilmalonil-CoA mutase na conversão de metilmalonil-CoA em succinil-CoA, reação que ocorre na degradação de ácidos graxos de cadeia ímpar e de alguns aminoácidos. Como resultado, pacientes com deficiência de vitamina B12 apresentam níveis elevados de metilmalonil-CoA, que subsequentemente resultam no acúmulo de ácido metilmalônico neurotóxico. As consequências sintomáticas incluem letargia, convulsões, parestesias e hipotonia. A homocisteína está elevada tanto na deficiência de ácido fólico quanto na de vitamina B12, mas o metilmalonil-CoA está elevado apenas na deficiência de vitamina B12.'},
          {option:'E', explanation:'A vitamina B12 é cofator da enzima metilmalonil-CoA mutase na conversão de metilmalonil-CoA em succinil-CoA, reação que ocorre na degradação de ácidos graxos de cadeia ímpar e de alguns aminoácidos. Como resultado, pacientes com deficiência de vitamina B12 apresentam níveis elevados de metilmalonil-CoA, que subsequentemente resultam no acúmulo de ácido metilmalônico neurotóxico. As consequências sintomáticas incluem letargia, convulsões, parestesias e hipotonia. A homocisteína está elevada tanto na deficiência de ácido fólico quanto na de vitamina B12, mas o metilmalonil-CoA está elevado apenas na deficiência de vitamina B12.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0007', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::homocysteine', difficulty:'easy',
      vignette:'A 12-year-old boy is brought to the emergency department with severe chest pain. He has had intermittent substernal chest pain for the past few months that typically occurs after heavy activity. The boy\'s activities have been limited due to the chest pain, and he is no longer able to play on the soccer team. The patient does not use tobacco or illicit drugs. His temperature is 36.7 C (98 F), blood pressure is 130/80 mm Hg, pulse is 132/min, respirations are 24/min, and pulse oximetry is 98% on room air. BMI is 17 kg/m². Physical examination shows an anxious-appearing boy with a rapid but regular pulse. No abnormalities are seen. Troponin is elevated, and ECG reveals ST segment elevations in leads II, III, and aVF. After acute stabilization and treatment, further laboratory workup shows an increased serum methionine level.',
      q:'Which of the following amino acids is most likely essential in this patient?',
      options:[
        {label:'A', text:'Asparagine'},
        {label:'B', text:'Cysteine'},
        {label:'C', text:'Isoleucine'},
        {label:'D', text:'Leucine'},
        {label:'E', text:'Tyrosine'},
        {label:'F', text:'Valine'},
      ],
      correct:'B',
      explC:'The amino acid methionine can be metabolized into S-adenosyl-methionine (SAM), which acts as a methyl-donor for many methyltransferase reactions. After the transfer of a methyl group, SAM is converted into S-adenosyl-homocysteine, which is broken down to form adenosine and homocysteine. Subsequently, the conversion of homocysteine to cystathionine requires the enzyme cystathionine synthase, the amino acid serine, and the cofactor vitamin B6. Cystathionine is then converted to cysteine by the enzyme cystathionase, which also requires vitamin B6 as a cofactor. Alternatively, the enzyme methionine synthase uses vitamin B12 as a cofactor to revert homocysteine back to methionine.\n\nThis patient most likely has homocystinuria, a condition that leads to hypercoagulability and thromboembolic occlusion. Because homocysteine is prothrombotic, individuals with complete cystathionine synthase deficiency can develop premature acute coronary syndrome, as seen in this patient (based on his troponin level and ECG findings). Other clinical features include ectopia lentis (ocular lens displacement) and intellectual disability.\n\nThe most common cause of homocystinuria is a defect in cystathionine synthase. Affected patients cannot form cysteine from homocysteine; therefore, cysteine is essential in their diet. In addition, homocysteine buildup results in hypermethioninemia, as seen in this patient.',
      explI:[
        {option:'A', explanation:'The enzyme asparagine synthase converts aspartate to asparagine, the amino acid that is essential for rapidly dividing tumor cells that cannot produce it quickly enough on their own. The chemotherapy drug asparaginase decreases asparagine concentration in tumor cells and leads to lysis of these rapidly growing cells.'},
        {option:'C', explanation:'Maple syrup urine disease is an amino acid disorder caused by deficiency of branched-chain α-ketoacid dehydrogenase. This deficiency leads to toxic buildup of branched-chain amino acids (leucine, isoleucine, and valine) and their metabolites, resulting in feeding difficulties, seizures, cerebral edema, and a sweet odor of the urine.'},
        {option:'D', explanation:'Maple syrup urine disease is an amino acid disorder caused by deficiency of branched-chain α-ketoacid dehydrogenase. This deficiency leads to toxic buildup of branched-chain amino acids (leucine, isoleucine, and valine) and their metabolites, resulting in feeding difficulties, seizures, cerebral edema, and a sweet odor of the urine.'},
        {option:'E', explanation:'Phenylalanine hydroxylase catalyzes the hydroxylation of the essential amino acid phenylalanine to form tyrosine. Deficiency of phenylalanine hydroxylase is the most common cause of phenylketonuria, which results in severe intellectual disability if left untreated.'},
        {option:'F', explanation:'Maple syrup urine disease is an amino acid disorder caused by deficiency of branched-chain α-ketoacid dehydrogenase. This deficiency leads to toxic buildup of branched-chain amino acids (leucine, isoleucine, and valine) and their metabolites, resulting in feeding difficulties, seizures, cerebral edema, and a sweet odor of the urine.'},
      ],
      objective:'Homocystinuria is most commonly caused by a defect in cystathionine synthase, resulting in an inability to form cysteine from homocysteine. Cysteine becomes essential in affected patients, and homocysteine buildup leads to elevated methionine. Homocysteine is prothrombotic, resulting in premature thromboembolic events (eg, atherosclerosis, acute coronary syndrome) in these patients.',
      peer:{A:4, B:72, C:1, D:3, E:14, F:2},
      img:'assets/qbank/CMQ-STEP1-BCH-0007_methionine_cycle_cystathionine_synthase.png',
      labs:[
        ['Methionine, plasma', '10–40 µmol/L (varies by lab/method)', '10–40 µmol/L (varia por laboratório/método)', 'Elevated in classic homocystinuria (cystathionine β-synthase deficiency) due to remethylation of accumulated homocysteine back to methionine', 'Elevada na homocistinúria clássica (deficiência de cistationina β-sintase) pela remetilação da homocisteína acumulada de volta a metionina'],
        ['Total homocysteine, plasma', '5–15 µmol/L (fasting)', '5–15 µmol/L (em jejum)', 'Markedly elevated (often >100 µmol/L) in classic homocystinuria due to cystathionine β-synthase deficiency', 'Marcadamente elevada (frequentemente >100 µmol/L) na homocistinúria clássica por deficiência de cistationina β-sintase'],
      ],
      ptTranslation:{
        vignette:'Um menino de 12 anos é levado ao pronto-socorro com dor torácica intensa. Ele tem apresentado dor torácica subesternal intermitente nos últimos meses, que tipicamente ocorre após atividade física intensa. As atividades do menino têm sido limitadas por causa da dor torácica, e ele não consegue mais jogar no time de futebol. O paciente não usa tabaco nem drogas ilícitas. Sua temperatura é 36,7°C (98°F), pressão arterial é 130/80 mmHg, pulso é 132/min, respirações são 24/min, e a oximetria de pulso é 98% em ar ambiente. O IMC é 17 kg/m². O exame físico mostra um menino ansioso com pulso rápido, porém regular. Nenhuma anormalidade é observada. A troponina está elevada, e o ECG revela supradesnivelamento do segmento ST nas derivações II, III e aVF. Após estabilização e tratamento agudos, a investigação laboratorial adicional mostra um nível sérico de metionina aumentado.',
        q:'Qual dos seguintes aminoácidos é mais provavelmente essencial neste paciente?',
        objective:'A homocistinúria é mais comumente causada por um defeito na cistationina sintase, resultando em incapacidade de formar cisteína a partir da homocisteína. A cisteína torna-se essencial nos pacientes afetados, e o acúmulo de homocisteína leva à elevação da metionina. A homocisteína é pró-trombótica, resultando em eventos tromboembólicos prematuros (por exemplo, aterosclerose, síndrome coronariana aguda) nesses pacientes.',
        options:[
          {label:'A', text:'Asparagina'},
          {label:'B', text:'Cisteína'},
          {label:'C', text:'Isoleucina'},
          {label:'D', text:'Leucina'},
          {label:'E', text:'Tirosina'},
          {label:'F', text:'Valina'},
        ],
        explC:'O aminoácido metionina pode ser metabolizado em S-adenosil-metionina (SAM), que atua como doador de metil em muitas reações de metiltransferase. Após a transferência de um grupo metil, a SAM é convertida em S-adenosil-homocisteína, que é degradada para formar adenosina e homocisteína. Em seguida, a conversão de homocisteína em cistationina requer a enzima cistationina sintase, o aminoácido serina e o cofator vitamina B6. A cistationina é então convertida em cisteína pela enzima cistationase, que também requer vitamina B6 como cofator. Alternativamente, a enzima metionina sintase usa vitamina B12 como cofator para reconverter homocisteína em metionina.\n\nEste paciente muito provavelmente tem homocistinúria, uma condição que leva a hipercoagulabilidade e oclusão tromboembólica. Como a homocisteína é pró-trombótica, indivíduos com deficiência completa de cistationina sintase podem desenvolver síndrome coronariana aguda prematura, como observado neste paciente (com base em seu nível de troponina e achados eletrocardiográficos). Outras características clínicas incluem ectopia lentis (deslocamento do cristalino ocular) e deficiência intelectual.\n\nA causa mais comum de homocistinúria é um defeito na cistationina sintase. Os pacientes afetados não conseguem formar cisteína a partir da homocisteína; portanto, a cisteína torna-se essencial na dieta. Além disso, o acúmulo de homocisteína resulta em hipermetioninemia, como observado neste paciente.',
        explI:[
          {option:'A', explanation:'A enzima asparagina sintase converte aspartato em asparagina, aminoácido essencial para células tumorais de rápida divisão que não conseguem produzi-lo rapidamente o suficiente por conta própria. O medicamento quimioterápico asparaginase diminui a concentração de asparagina nas células tumorais e leva à lise dessas células de crescimento rápido.'},
          {option:'C', explanation:'A doença da urina em xarope de bordo é um distúrbio de aminoácidos causado por deficiência da α-cetoácido desidrogenase de cadeia ramificada. Essa deficiência leva ao acúmulo tóxico de aminoácidos de cadeia ramificada (leucina, isoleucina e valina) e seus metabólitos, resultando em dificuldades alimentares, convulsões, edema cerebral e odor adocicado da urina.'},
          {option:'D', explanation:'A doença da urina em xarope de bordo é um distúrbio de aminoácidos causado por deficiência da α-cetoácido desidrogenase de cadeia ramificada. Essa deficiência leva ao acúmulo tóxico de aminoácidos de cadeia ramificada (leucina, isoleucina e valina) e seus metabólitos, resultando em dificuldades alimentares, convulsões, edema cerebral e odor adocicado da urina.'},
          {option:'E', explanation:'A fenilalanina hidroxilase catalisa a hidroxilação do aminoácido essencial fenilalanina para formar tirosina. A deficiência de fenilalanina hidroxilase é a causa mais comum de fenilcetonúria, que resulta em deficiência intelectual grave se não tratada.'},
          {option:'F', explanation:'A doença da urina em xarope de bordo é um distúrbio de aminoácidos causado por deficiência da α-cetoácido desidrogenase de cadeia ramificada. Essa deficiência leva ao acúmulo tóxico de aminoácidos de cadeia ramificada (leucina, isoleucina e valina) e seus metabólitos, resultando em dificuldades alimentares, convulsões, edema cerebral e odor adocicado da urina.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0008', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::urea_cycle', difficulty:'hard',
      vignette:'A 3-year-old boy is brought to the office due to abnormal motor development. He was born at 40 weeks gestation and had an unremarkable perinatal course. The boy developed normally during the first year of life. However, for the past 2 years, he has had progressive bilateral leg stiffness and abnormal involuntary movements. His cognitive and motor development is also delayed. There is no significant family history of neurological or muscular disorders. The patient\'s height, weight, and head circumference are below the 3rd percentile. Examination shows bilateral spastic paresis of his lower extremities and frequent choreoathetoid movements. Comprehensive laboratory testing reveals significantly elevated arginine levels in plasma and cerebrospinal fluid.',
      q:'The deficient enzyme in this patient is normally involved in the production of which of the following?',
      options:[
        {label:'A', text:'γ-aminobutyric acid'},
        {label:'B', text:'Glutamine'},
        {label:'C', text:'Homocysteine'},
        {label:'D', text:'Orotic acid'},
        {label:'E', text:'Serotonin'},
        {label:'F', text:'Urea'},
      ],
      correct:'F',
      explC:'This patient has features of arginase deficiency, including progressive development of spastic diplegia, abnormal movements, and growth delay in the setting of elevated arginine levels. Arginase is a urea cycle enzyme that produces urea and ornithine from arginine. Diagnosis is based on elevated arginine levels on plasma amino acid testing. Treatment of arginase deficiency consists of a low-protein diet devoid of arginine. Administration of a synthetic protein made of essential amino acids usually results in a dramatic decrease in plasma arginine concentration and an improvement in neurological abnormalities. Unlike other urea cycle disorders, patients with arginase deficiency have mild or no hyperammonemia.',
      explI:[
        {option:'A', explanation:'The amino acid derivative γ-aminobutyrate (GABA) is a well-known inhibitor of presynaptic transmission in the retina and central nervous system. GABA is formed from glutamate decarboxylation, a reaction catalyzed by glutamate decarboxylase.'},
        {option:'B', explanation:'Glutamine is the major amino acid in the blood because it transports excess ammonia from peripheral tissues to the kidney. In the nephron, the amide nitrogen is hydrolyzed to regenerate glutamate and a free ammonium ion, which can then be excreted in the urine.'},
        {option:'C', explanation:'Deficiencies of vitamins B6, B12, and folate (B9) are associated with hyperhomocysteinemia, which in turn is associated with atherosclerosis and thrombotic events.'},
        {option:'D', explanation:'Orotic acid is overproduced when a block in the urea cycle leads to excess carbamoyl phosphate, which is metabolized by dihydroorotate dehydrogenase to orotic acid. Excessive amounts of orotic acid are usually found in citrullinemia and ornithine transcarbamylase deficiency. These urea cycle disorders are also accompanied by hyperammonemia.'},
        {option:'E', explanation:'Serotonin (5-hydroxytryptamine) is formed by the hydroxylation and decarboxylation of tryptophan by tryptophan hydroxylase. In addition, serotonin is degraded by monoamine oxidase and also undergoes neuronal reuptake.'},
      ],
      objective:'Arginase is a urea cycle enzyme that produces urea and ornithine from arginine. Arginase deficiency results in progressive spastic diplegia, growth delay, and abnormal movements. Treatment includes an arginine-free, low-protein diet.',
      peer:{A:17, B:9, C:7, D:11, E:2, F:49},
      img:'assets/qbank/CMQ-STEP1-BCH-0008_urea_cycle_arginase_deficiency.png',
      labs:[
        ['Arginine, plasma', '40–115 µmol/L', '40–115 µmol/L', 'Markedly elevated (often >300 µmol/L, 3- to 4-fold the upper limit of normal) in arginase deficiency due to impaired conversion of arginine to ornithine and urea', 'Marcadamente elevada (geralmente >300 µmol/L, 3 a 4 vezes o limite superior da normalidade) na deficiência de arginase, por conversão prejudicada de arginina em ornitina e ureia'],
      ],
      ptTranslation:{
        vignette:'Um menino de 3 anos é levado ao consultório devido a desenvolvimento motor anormal. Ele nasceu com 40 semanas de gestação e teve um curso perinatal sem intercorrências. O menino se desenvolveu normalmente durante o primeiro ano de vida. No entanto, nos últimos 2 anos, ele apresenta rigidez progressiva bilateral das pernas e movimentos involuntários anormais. Seu desenvolvimento cognitivo e motor também está atrasado. Não há história familiar significativa de distúrbios neurológicos ou musculares. A altura, o peso e o perímetro cefálico do paciente estão abaixo do percentil 3. O exame mostra paresia espástica bilateral dos membros inferiores e movimentos coreoatetoides frequentes. Exames laboratoriais abrangentes revelam níveis significativamente elevados de arginina no plasma e no líquido cefalorraquidiano.',
        q:'A enzima deficiente neste paciente está normalmente envolvida na produção de qual das seguintes substâncias?',
        objective:'A arginase é uma enzima do ciclo da ureia que produz ureia e ornitina a partir da arginina. A deficiência de arginase resulta em diplegia espástica progressiva, atraso do crescimento e movimentos anormais. O tratamento inclui uma dieta pobre em proteínas e isenta de arginina.',
        options:[
          {label:'A', text:'Ácido γ-aminobutírico'},
          {label:'B', text:'Glutamina'},
          {label:'C', text:'Homocisteína'},
          {label:'D', text:'Ácido orótico'},
          {label:'E', text:'Serotonina'},
          {label:'F', text:'Ureia'},
        ],
        explC:'Este paciente apresenta características de deficiência de arginase, incluindo desenvolvimento progressivo de diplegia espástica, movimentos anormais e atraso do crescimento associados a níveis elevados de arginina. A arginase é uma enzima do ciclo da ureia que produz ureia e ornitina a partir da arginina. O diagnóstico é baseado em níveis elevados de arginina no exame de aminoácidos plasmáticos. O tratamento da deficiência de arginase consiste em uma dieta pobre em proteínas e isenta de arginina. A administração de uma proteína sintética composta por aminoácidos essenciais geralmente resulta em uma queda acentuada da concentração plasmática de arginina e melhora das anormalidades neurológicas. Diferentemente de outros distúrbios do ciclo da ureia, pacientes com deficiência de arginase apresentam hiperamonemia leve ou ausente.',
        explI:[
          {option:'A', explanation:'O derivado de aminoácido ácido γ-aminobutírico (GABA) é um conhecido inibidor da transmissão pré-sináptica na retina e no sistema nervoso central. O GABA é formado pela descarboxilação do glutamato, reação catalisada pela glutamato descarboxilase.'},
          {option:'B', explanation:'A glutamina é o principal aminoácido no sangue, pois transporta o excesso de amônia dos tecidos periféricos até o rim. No néfron, o nitrogênio da amida é hidrolisado para regenerar glutamato e um íon amônio livre, que pode então ser excretado na urina.'},
          {option:'C', explanation:'Deficiências das vitaminas B6, B12 e ácido fólico (B9) estão associadas à hiper-homocisteinemia, que por sua vez está associada a aterosclerose e eventos trombóticos.'},
          {option:'D', explanation:'O ácido orótico é superproduzido quando um bloqueio no ciclo da ureia leva ao excesso de carbamoil fosfato, que é metabolizado pela di-hidro-orotato desidrogenase em ácido orótico. Quantidades excessivas de ácido orótico costumam ser encontradas na citrulinemia e na deficiência de ornitina transcarbamilase. Esses distúrbios do ciclo da ureia também são acompanhados de hiperamonemia.'},
          {option:'E', explanation:'A serotonina (5-hidroxitriptamina) é formada pela hidroxilação e descarboxilação do triptofano pela triptofano hidroxilase. Além disso, a serotonina é degradada pela monoamina oxidase e também sofre recaptação neuronal.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0009', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::urea_cycle', difficulty:'hard',
      vignette:'A 4-day-old boy born to a 23-year-old woman is brought to the office for evaluation of poor feeding and vomiting. The pregnancy was uneventful and the mother had a normal delivery. Family history is noncontributory. The patient\'s temperature is 37.2 C (99 F), blood pressure is 60/30 mm Hg, pulse is 110/min, and respirations are 56/min. Physical examination reveals a lethargic newborn with exaggerated deep tendon reflexes and clonus. Further investigation reveals that the patient has an inherited condition that results in impaired transport of ornithine from the cytosol to the mitochondria.',
      q:'Nutritional restriction of which of the following substances can improve this patient\'s condition?',
      options:[
        {label:'A', text:'Branched-chain amino acids'},
        {label:'B', text:'Fructose'},
        {label:'C', text:'Galactose'},
        {label:'D', text:'Medium-chain triglycerides'},
        {label:'E', text:'Phenylalanine'},
        {label:'F', text:'Proteins'},
        {label:'G', text:'Pyridoxine'},
      ],
      correct:'F',
      explC:'Impaired transport of ornithine into the mitochondria can be caused by ornithine translocase deficiency, which results in a defect in the hepatic urea cycle. The urea cycle converts ammonia, which is generated from the catabolism of amino acids, into urea for excretion in urine. Urea cycle defects cause ammonia to accumulate in the blood, resulting in progressive lethargy, vomiting, seizures, and cerebral edema (may cause hyperreflexia and abnormal posturing when severe) in infancy and early childhood; milder defects caused by partial enzyme deficiencies may not manifest until adulthood.\n\nEffective treatment of urea cycle disorders requires balancing dietary protein intake and metabolic requirements. Protein restriction is the main treatment for urea cycle disorders, such that the body receives the essential amino acids needed for growth and development but not in excess such that excessive ammonia is formed. Medications that provide an alternate pathway to excrete nitrogen (eg, phenylacetate) are also used to help remove ammonia from the blood.',
      explI:[
        {option:'A', explanation:'Restriction of branched-chain amino acids (eg, valine, leucine, isoleucine) is used to treat maple syrup urine disease (branched-chain alpha-ketoacid dehydrogenase deficiency) and propionic acidemia (propionyl-CoA carboxylase).'},
        {option:'B', explanation:'Fructose and sucrose restriction is the treatment for fructose 1-phosphate aldolase (aldolase B) deficiency. This condition causes vomiting and hypoglycemia in infants after fruit or juice is introduced.'},
        {option:'C', explanation:'Galactose and lactose are excluded from the diet in patients with classic galactosemia (absent galactose-1-phosphate uridyltransferase). Galactosemia presents in neonates with jaundice, vomiting, poor feeding, lethargy, hypoglycemia, and galactose-1-phosphate accumulation.'},
        {option:'D', explanation:'Medium-chain triglycerides are restricted in medium-chain acyl-CoA dehydrogenase deficiency, a condition characterized by lethargy, seizures, and hypoketotic hypoglycemia following a period of fasting.'},
        {option:'E', explanation:'A phenylalanine-free diet is recommended in patients with phenylketonuria (phenylalanine hydroxylase deficiency). Failure to convert phenylalanine to tyrosine leads to accumulation of phenylalanine and intellectual disability if the condition is left untreated.'},
        {option:'G', explanation:'Pyridoxine (vitamin B6) can be used to treat homocystinuria, which is caused by a defect in vitamin B6-dependent cystathionine synthase. This condition is characterized by elevated homocysteine levels, ectopia lentis, intellectual disability, Marfanoid body habitus, and increased occurrence of thromboembolic events.'},
      ],
      objective:'Ornithine transport into mitochondria is necessary for proper function of the urea cycle, which is the major disposal pathway for waste nitrogen generated by catabolism of amino acids. Urea cycle defects typically cause neurological damage due to the accumulation of ammonia. Protein restriction improves this condition by reducing the amount of amino acid turnover.',
      peer:{A:19, B:2, C:3, D:14, E:8, F:47, G:4},
      img:'assets/qbank/CMQ-STEP1-BCH-0009_urea_cycle_ornithine_translocase.png',
      labs:[
        ['Ammonia (venous), neonate (1–7 days)', '≤110 µmol/L (≈154 µg/dL)', '≤110 µmol/L (≈154 µg/dL)', 'Elevated in urea cycle disorders, including HHH syndrome (ornithine translocase deficiency), due to impaired ammonia clearance', 'Elevada nos distúrbios do ciclo da ureia, incluindo a síndrome HHH (deficiência do transportador de ornitina), por depuração prejudicada de amônia'],
        ['Ornithine, plasma', '30–110 µmol/L', '30–110 µmol/L', 'Elevated (often 200–700 µmol/L or higher) in HHH syndrome due to impaired mitochondrial import of ornithine', 'Elevada (geralmente 200–700 µmol/L ou mais) na síndrome HHH por importação mitocondrial prejudicada de ornitina'],
      ],
      ptTranslation:{
        vignette:'Um menino de 4 dias de vida, filho de uma mulher de 23 anos, é levado ao consultório para avaliação de dificuldade de alimentação e vômitos. A gestação transcorreu sem intercorrências e a mãe teve um parto normal. A história familiar não é contributiva. A temperatura do paciente é 37,2°C (99°F), a pressão arterial é 60/30 mmHg, o pulso é 110/min, e as respirações são 56/min. O exame físico revela um recém-nascido letárgico com reflexos tendinosos profundos exagerados e clônus. Investigação adicional revela que o paciente tem uma condição hereditária que resulta em transporte prejudicado de ornitina do citosol para a mitocôndria.',
        q:'A restrição nutricional de qual das seguintes substâncias pode melhorar a condição deste paciente?',
        objective:'O transporte de ornitina para a mitocôndria é necessário para o funcionamento adequado do ciclo da ureia, que é a principal via de eliminação do nitrogênio residual gerado pelo catabolismo de aminoácidos. Os distúrbios do ciclo da ureia tipicamente causam dano neurológico devido ao acúmulo de amônia. A restrição proteica melhora essa condição ao reduzir a quantidade de renovação (turnover) de aminoácidos.',
        options:[
          {label:'A', text:'Aminoácidos de cadeia ramificada'},
          {label:'B', text:'Frutose'},
          {label:'C', text:'Galactose'},
          {label:'D', text:'Triglicerídeos de cadeia média'},
          {label:'E', text:'Fenilalanina'},
          {label:'F', text:'Proteínas'},
          {label:'G', text:'Piridoxina'},
        ],
        explC:'O transporte prejudicado de ornitina para a mitocôndria pode ser causado pela deficiência do translocador de ornitina, que resulta em um defeito no ciclo hepático da ureia. O ciclo da ureia converte a amônia, gerada pelo catabolismo de aminoácidos, em ureia para excreção na urina. Defeitos do ciclo da ureia causam acúmulo de amônia no sangue, resultando em letargia progressiva, vômitos, convulsões e edema cerebral (pode causar hiperreflexia e postura anormal quando grave) na infância e primeira infância; defeitos mais leves causados por deficiências enzimáticas parciais podem não se manifestar até a idade adulta.\n\nO tratamento eficaz dos distúrbios do ciclo da ureia exige equilibrar a ingestão proteica da dieta com as necessidades metabólicas. A restrição proteica é o principal tratamento para os distúrbios do ciclo da ureia, de forma que o organismo receba os aminoácidos essenciais necessários para o crescimento e desenvolvimento, mas não em excesso, de modo a evitar a formação excessiva de amônia. Medicamentos que oferecem uma via alternativa para excreção de nitrogênio (por exemplo, fenilacetato) também são usados para ajudar a remover a amônia do sangue.',
        explI:[
          {option:'A', explanation:'A restrição de aminoácidos de cadeia ramificada (por exemplo, valina, leucina, isoleucina) é usada para tratar a doença da urina em xarope de bordo (deficiência da alfa-cetoácido desidrogenase de cadeia ramificada) e a acidemia propiônica (propionil-CoA carboxilase).'},
          {option:'B', explanation:'A restrição de frutose e sacarose é o tratamento para a deficiência de frutose 1-fosfato aldolase (aldolase B). Essa condição causa vômitos e hipoglicemia em lactentes após a introdução de frutas ou sucos.'},
          {option:'C', explanation:'A galactose e a lactose são excluídas da dieta em pacientes com galactosemia clássica (ausência de galactose-1-fosfato uridiltransferase). A galactosemia se apresenta em neonatos com icterícia, vômitos, dificuldade de alimentação, letargia, hipoglicemia e acúmulo de galactose-1-fosfato.'},
          {option:'D', explanation:'Os triglicerídeos de cadeia média são restringidos na deficiência de acil-CoA desidrogenase de cadeia média, uma condição caracterizada por letargia, convulsões e hipoglicemia hipocetótica após um período de jejum.'},
          {option:'E', explanation:'Uma dieta isenta de fenilalanina é recomendada em pacientes com fenilcetonúria (deficiência de fenilalanina hidroxilase). A incapacidade de converter fenilalanina em tirosina leva ao acúmulo de fenilalanina e a deficiência intelectual se a condição não for tratada.'},
          {option:'G', explanation:'A piridoxina (vitamina B6) pode ser usada para tratar a homocistinúria, causada por um defeito na cistationina sintase dependente de vitamina B6. Essa condição é caracterizada por níveis elevados de homocisteína, ectopia lentis, deficiência intelectual, hábito marfanoide e maior ocorrência de eventos tromboembólicos.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0010', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::protein_structure', difficulty:'medium',
      vignette:'A dermatology researcher is studying the role of different amino acids in wound healing. She cultures mature dermal fibroblasts in growth media. After several days, the fibroblasts begin synthesizing polypeptide chains that assemble into triple helical structures, followed by fibrils. The fibrillar proteins are hydrolyzed and separated into their constituent amino acids via paper chromatography.',
      q:'Which of the following amino acids is most likely to be found in highest quantity in these proteins?',
      options:[
        {label:'A', text:'Alanine'},
        {label:'B', text:'Cysteine'},
        {label:'C', text:'Glycine'},
        {label:'D', text:'Leucine'},
        {label:'E', text:'Lysine'},
        {label:'F', text:'Proline'},
      ],
      correct:'C',
      explC:'Collagen is the most abundant protein in the human body and is synthesized by fibroblasts, osteoblasts, and chondroblasts. It consists of 3 polypeptide alpha chains held together by hydrogen bonds, forming a rope-like triple helix (collagen molecule). Collagen molecules self-assemble into fibrils, which subsequently crosslink to form collagen fibers.\n\nThe triple helical conformation of collagen molecules occurs due to the simple and repetitive amino acid sequence within each alpha chain, in which glycine (Gly) occupies every third amino acid position (Gly-X-Y). Glycine is the most abundant amino acid in collagen and, due to its small size, is the only amino acid that can fit into the confined space between individual alpha chains.',
      explI:[
        {option:'A, B, D, E, and F', explanation:'None of the other amino acids are as abundant as glycine in collagen. X often represents proline and Y is often hydroxyproline or hydroxylysine. Proline residues are essential for alpha helix formation because their ring configuration introduces a kink in the polypeptide chain, enhancing the rigidity of the helical structure. Hydroxylysine is necessary for cross-linking, which greatly increases the tensile strength of assembled collagen fibers.'},
      ],
      objective:'Glycine is the most abundant amino acid in collagen. The triple helical conformation of collagen molecules occurs due to the repetitive amino acid sequence within each alpha chain, in which glycine (Gly) occupies every third amino acid position (Gly-X-Y).',
      peer:{A:1, B:3, C:54, D:2, E:13, F:24},
      ptTranslation:{
        vignette:'Uma pesquisadora de dermatologia está estudando o papel de diferentes aminoácidos na cicatrização de feridas. Ela cultiva fibroblastos dérmicos maduros em meio de cultura. Após vários dias, os fibroblastos começam a sintetizar cadeias polipeptídicas que se organizam em estruturas helicoidais triplas, seguidas de fibrilas. As proteínas fibrilares são hidrolisadas e separadas em seus aminoácidos constituintes por cromatografia em papel.',
        q:'Qual dos seguintes aminoácidos é mais provavelmente encontrado em maior quantidade nessas proteínas?',
        objective:'A glicina é o aminoácido mais abundante no colágeno. A conformação em hélice tripla das moléculas de colágeno ocorre devido à sequência repetitiva de aminoácidos dentro de cada cadeia alfa, na qual a glicina (Gly) ocupa a cada três posições de aminoácido (Gly-X-Y).',
        options:[
          {label:'A', text:'Alanina'},
          {label:'B', text:'Cisteína'},
          {label:'C', text:'Glicina'},
          {label:'D', text:'Leucina'},
          {label:'E', text:'Lisina'},
          {label:'F', text:'Prolina'},
        ],
        explC:'O colágeno é a proteína mais abundante do corpo humano e é sintetizado por fibroblastos, osteoblastos e condroblastos. Ele é composto por 3 cadeias polipeptídicas alfa unidas por ligações de hidrogênio, formando uma hélice tripla semelhante a uma corda (molécula de colágeno). As moléculas de colágeno se auto-organizam em fibrilas, que posteriormente se ligam de forma cruzada para formar fibras de colágeno.\n\nA conformação em hélice tripla das moléculas de colágeno ocorre devido à sequência de aminoácidos simples e repetitiva dentro de cada cadeia alfa, na qual a glicina (Gly) ocupa a cada três posições de aminoácido (Gly-X-Y). A glicina é o aminoácido mais abundante no colágeno e, devido ao seu tamanho reduzido, é o único aminoácido capaz de se encaixar no espaço confinado entre as cadeias alfa individuais.',
        explI:[
          {option:'A, B, D, E, and F', explanation:'Nenhum dos outros aminoácidos é tão abundante quanto a glicina no colágeno. X frequentemente representa a prolina, e Y frequentemente representa a hidroxiprolina ou a hidroxilisina. Os resíduos de prolina são essenciais para a formação da hélice alfa, pois sua configuração em anel introduz uma dobra na cadeia polipeptídica, aumentando a rigidez da estrutura helicoidal. A hidroxilisina é necessária para as ligações cruzadas, que aumentam consideravelmente a força de tensão das fibras de colágeno montadas.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0011', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::vitamins_cofactors', difficulty:'medium',
      vignette:'A 12-year-old boy is brought to the office due to gait instability and pruritic skin rash for the past several weeks. His mother reports that he has also been irritable and had loose stools during this time. The patient\'s childhood development has been unremarkable except for several episodes of similar skin rash that resolved spontaneously. Examination shows scaly, erythematous skin lesions in sun-exposed areas and cerebellar ataxia. Laboratory evaluation shows increased levels of neutral amino acids in the urine.',
      q:'This patient\'s symptoms would most likely respond to which of the following supplements?',
      options:[
        {label:'A', text:'Ascorbate'},
        {label:'B', text:'Niacin'},
        {label:'C', text:'Pyridoxine'},
        {label:'D', text:'Riboflavin'},
        {label:'E', text:'Thiamine'},
        {label:'F', text:'Vitamin E'},
      ],
      correct:'B',
      explC:'This patient likely has Hartnup disease, an autosomal recessive metabolic disorder caused by inactivating mutations affecting the neutral amino acid transporter. This results in impaired transport of neutral amino acids, particularly tryptophan, in the small intestine and proximal tubule of the kidney.\n\nTryptophan is an essential amino acid and a precursor for niacin, serotonin, and melatonin. Conversion of tryptophan to niacin is responsible for the generation of up to half of the nicotinamide adenine dinucleotide (NAD+) required for redox reactions; the clinical manifestations of Hartnup disease are primarily due to niacin deficiency. Patients present with intermittent attacks of pellagra-like skin eruptions (development of a red, rough rash following sun exposure) and cerebellar ataxia in early childhood that become less severe with increasing age.\n\nThe diagnosis is confirmed by detecting excessive amounts of neutral amino acids (alanine, serine, threonine, valine, leucine, isoleucine, phenylalanine, tyrosine, and tryptophan) in the urine (neutral aminoaciduria). A high-protein diet along with daily niacin or nicotinamide supplementation generally results in significant symptom improvement.',
      explI:[
        {option:'A', explanation:'Ascorbate (vitamin C) is a water-soluble vitamin required for hydroxylation of proline and lysine residues during collagen synthesis. Deficiency results in scurvy, a disease characterized by bone pain, easy bruising, and poor wound healing.'},
        {option:'C', explanation:'Pyridoxine (vitamin B6) acts as a coenzyme in the decarboxylation and transamination of amino acids, including the metabolism of tryptophan to niacin. Deficiency of pyridoxine leads to anemia, peripheral neuropathy, and dermatitis. Supplementation in Hartnup disease is not effective due to underlying tryptophan malabsorption.'},
        {option:'D', explanation:'The coenzymes flavin mononucleotide (FMN) and flavin adenine dinucleotide (FAD) form the prosthetic groups of several enzymes important in electron transport; both are synthesized from riboflavin (vitamin B2). Clinical features of deficiency include sore throat, stomatitis, glossitis, normocytic anemia, and seborrheic dermatitis.'},
        {option:'E', explanation:'Thiamine use by the body is maximal in states of accelerated carbohydrate metabolism because thiamine acts as a cofactor for the enzymes transketolase (pentose phosphate pathway), α-ketoglutarate dehydrogenase (TCA cycle), and pyruvate dehydrogenase (forms acetyl-CoA).'},
        {option:'F', explanation:'Vitamin E is a fat-soluble vitamin that functions as a scavenger of free radicals (antioxidant). Deficiency of vitamin E is rare but can result in neurologic dysfunction (ataxia, hyporeflexia, loss of sensation) as well as hemolytic anemia.'},
      ],
      objective:'Hartnup disease is caused by impaired transport of neutral amino acids in the small intestine and proximal tubule of the kidney. Symptoms include pellagra-like skin eruptions and cerebellar ataxia, which occur as a result of niacin deficiency. The diagnosis can be confirmed through detection of excessive amounts of neutral amino acids in the urine.',
      peer:{A:3, B:54, C:12, D:4, E:11, F:13},
      img:'assets/qbank/CMQ-STEP1-BCH-0011_niacin_metabolism.png',
      labs:[
        ['Urinary neutral amino acids (eg, tryptophan)', 'Absent to trace', 'Ausentes a traços',
         'Markedly increased in Hartnup disease due to impaired renal and intestinal reabsorption of neutral amino acids (neutral aminoaciduria)',
         'Marcadamente aumentados na doença de Hartnup por reabsorção renal e intestinal prejudicada de aminoácidos neutros (aminoacidúria neutra)'],
      ],
      ptTranslation:{
        vignette:'Um menino de 12 anos é levado ao consultório devido a instabilidade de marcha e erupção cutânea pruriginosa há várias semanas. Sua mãe relata que ele também tem estado irritado e apresentado fezes amolecidas durante esse período. O desenvolvimento infantil do paciente não teve intercorrências, exceto por diversos episódios de erupção cutânea semelhante que se resolveram espontaneamente. O exame mostra lesões cutâneas escamosas e eritematosas em áreas expostas ao sol e ataxia cerebelar. A avaliação laboratorial mostra níveis aumentados de aminoácidos neutros na urina.',
        q:'Os sintomas deste paciente provavelmente responderiam a qual dos seguintes suplementos?',
        objective:'A doença de Hartnup é causada por transporte prejudicado de aminoácidos neutros no intestino delgado e no túbulo proximal do rim. Os sintomas incluem erupções cutâneas semelhantes à pelagra e ataxia cerebelar, que ocorrem em decorrência da deficiência de niacina. O diagnóstico pode ser confirmado pela detecção de quantidades excessivas de aminoácidos neutros na urina.',
        options:[
          {label:'A', text:'Ascorbato'},
          {label:'B', text:'Niacina'},
          {label:'C', text:'Piridoxina'},
          {label:'D', text:'Riboflavina'},
          {label:'E', text:'Tiamina'},
          {label:'F', text:'Vitamina E'},
        ],
        explC:'Este paciente provavelmente tem doença de Hartnup, um distúrbio metabólico autossômico recessivo causado por mutações inativadoras que afetam o transportador de aminoácidos neutros. Isso resulta em transporte prejudicado de aminoácidos neutros, particularmente triptofano, no intestino delgado e no túbulo proximal do rim.\n\nO triptofano é um aminoácido essencial e precursor da niacina, serotonina e melatonina. A conversão de triptofano em niacina é responsável pela geração de até metade da nicotinamida adenina dinucleotídeo (NAD+) necessária para as reações redox; as manifestações clínicas da doença de Hartnup se devem principalmente à deficiência de niacina. Os pacientes apresentam crises intermitentes de erupções cutâneas semelhantes à pelagra (desenvolvimento de erupção vermelha e áspera após exposição solar) e ataxia cerebelar no início da infância, que se tornam menos graves com o avanço da idade.\n\nO diagnóstico é confirmado pela detecção de quantidades excessivas de aminoácidos neutros (alanina, serina, treonina, valina, leucina, isoleucina, fenilalanina, tirosina e triptofano) na urina (aminoacidúria neutra). Uma dieta rica em proteínas associada à suplementação diária de niacina ou nicotinamida geralmente resulta em melhora significativa dos sintomas.',
        explI:[
          {option:'A', explanation:'O ascorbato (vitamina C) é uma vitamina hidrossolúvel necessária para a hidroxilação dos resíduos de prolina e lisina durante a síntese de colágeno. Sua deficiência resulta em escorbuto, doença caracterizada por dor óssea, hematomas fáceis e má cicatrização de feridas.'},
          {option:'C', explanation:'A piridoxina (vitamina B6) atua como coenzima na descarboxilação e transaminação de aminoácidos, incluindo o metabolismo de triptofano em niacina. A deficiência de piridoxina leva a anemia, neuropatia periférica e dermatite. A suplementação na doença de Hartnup não é eficaz devido à má absorção subjacente de triptofano.'},
          {option:'D', explanation:'As coenzimas flavina mononucleotídeo (FMN) e flavina adenina dinucleotídeo (FAD) formam os grupos prostéticos de diversas enzimas importantes no transporte de elétrons; ambas são sintetizadas a partir da riboflavina (vitamina B2). As características clínicas da deficiência incluem dor de garganta, estomatite, glossite, anemia normocítica e dermatite seborreica.'},
          {option:'E', explanation:'O uso de tiamina pelo organismo é máximo em estados de metabolismo acelerado de carboidratos, pois a tiamina atua como cofator das enzimas transcetolase (via das pentoses-fosfato), alfa-cetoglutarato desidrogenase (ciclo do TCA) e piruvato desidrogenase (forma acetil-CoA).'},
          {option:'F', explanation:'A vitamina E é uma vitamina lipossolúvel que funciona como sequestradora de radicais livres (antioxidante). A deficiência de vitamina E é rara, mas pode resultar em disfunção neurológica (ataxia, hiporreflexia, perda de sensibilidade), além de anemia hemolítica.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0012', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::protein_structure', difficulty:'easy',
      vignette:'A 24-year-old woman comes to the office for a preemployment medical evaluation. The patient has no known medical problems but reports that her skin bruises and scars easily. She says that most of her family members have a very "flexible" body, and her brother works in a circus as a contortionist. The patient takes no medications and has no allergies. She does not use tobacco, alcohol, or drugs. Physical examination findings are shown in the exhibit.',
      q:'This patient most likely has an inherited defect in which of the following proteins?',
      options:[
        {label:'A', text:'Collagen'},
        {label:'B', text:'Elastin'},
        {label:'C', text:'Fibrillin-1'},
        {label:'D', text:'Hyaluronic acid'},
        {label:'E', text:'Laminin'},
        {label:'F', text:'Proteoglycan'},
      ],
      correct:'A',
      explC:'The extracellular matrix is a network of interstitial proteins that maintain normal tissue architecture. Collagen is a major component of connective tissue and consists of 3 polypeptide α chains held together by hydrogen bonds to form a ropelike triple helix structure (tropocollagen). Lysyl oxidase then forms covalent bonds between individual tropocollagen molecules, generating mature collagen fibers. The variation in amino acid sequences in the collagen α chains gives rise to collagen diversity in different tissues. Collagen types I, II, III, and V provide tensile strength in skin, bones, cartilage, tendons, and blood vessels.\n\nEhlers-Danlos syndrome (EDS) is a group of hereditary disorders involving a defect in collagen synthesis. EDS usually manifests clinically as hypermobile joints, overelastic skin, and fragile tissue susceptible to bruising, wounds, and hemarthrosis. Common mutations leading to EDS phenotypes include deficiencies of the lysyl hydroxylase and procollagen peptidase enzymes responsible for collagen synthesis.',
      explI:[
        {option:'B', explanation:'Elastin, a fibrous protein in the connective tissue, is named for the elastic properties it imparts to skin, blood vessels, and lung alveoli. Elastin fibers can be stretched to several times their original length but will recoil when the stretching forces are withdrawn. Elastin is synthesized from the polypeptide precursor tropoelastin.'},
        {option:'C', explanation:'Fibrillin-1 is a major component of the microfibrils that form a sheath around elastin. Microfibrils are abundantly present in blood vessels and in the suspensory ligaments of the lens. Defects in the fibrillin-1 gene cause classic autosomal dominant Marfan syndrome.'},
        {option:'D', explanation:'Hyaluronic acid is another major component of the soft tissue\'s extracellular matrix, including synovial fluid and skin. Exogenous injection can be used to restore viscoelasticity to the synovial fluid in osteoarthritis; soft-tissue fillers can also be used in patients concerned about age-related volume loss (eg, nasolabial folds).'},
        {option:'E', explanation:'Laminins are heterotrimeric glycoproteins that bind to type IV collagen underlying epithelial cells. They contribute to the organization and function of the basal lamina (basement membrane).'},
        {option:'F', explanation:'Proteoglycans are composed of glycosaminoglycans (GAGs), which provide compressibility to tissues. Patients with deficiencies in lysosomal enzymes cannot break down GAGs, resulting in mucopolysaccharidoses (eg, Hurler syndrome, Hunter syndrome) characterized by soft tissue and skeletal disease.'},
      ],
      objective:'Ehlers-Danlos syndrome (EDS) is a heritable connective tissue disease associated with abnormal collagen formation. EDS usually manifests clinically as overflexible (hypermobile) joints, overelastic (hyperelastic) skin, and fragile tissue susceptible to bruising, wounding, and hemarthrosis.',
      peer:{A:74, B:15, C:9, D:0, E:0, F:0},
      img:'assets/qbank/CMQ-STEP1-BCH-0012_collagen_synthesis.png',
      ptTranslation:{
        vignette:'Uma mulher de 24 anos vai ao consultório para uma avaliação médica pré-admissional. A paciente não tem problemas médicos conhecidos, mas relata que sua pele forma hematomas e cicatrizes com facilidade. Ela diz que a maioria dos membros de sua família tem um corpo muito "flexível", e seu irmão trabalha em um circo como contorcionista. A paciente não usa medicamentos e não tem alergias. Ela não usa tabaco, álcool ou drogas. Os achados do exame físico são mostrados no exhibit.',
        q:'Este paciente provavelmente tem um defeito hereditário em qual das seguintes proteínas?',
        objective:'A síndrome de Ehlers-Danlos (SED) é uma doença hereditária do tecido conjuntivo associada à formação anormal de colágeno. A SED geralmente se manifesta clinicamente com articulações hiperextensíveis (hipermóveis), pele hiperelástica e tecido frágil suscetível a hematomas, feridas e hemartrose.',
        options:[
          {label:'A', text:'Colágeno'},
          {label:'B', text:'Elastina'},
          {label:'C', text:'Fibrilina-1'},
          {label:'D', text:'Ácido hialurônico'},
          {label:'E', text:'Laminina'},
          {label:'F', text:'Proteoglicano'},
        ],
        explC:'A matriz extracelular é uma rede de proteínas intersticiais que mantém a arquitetura tecidual normal. O colágeno é um componente importante do tecido conjuntivo e é formado por 3 cadeias polipeptídicas alfa unidas por ligações de hidrogênio, formando uma estrutura em hélice tripla semelhante a uma corda (tropocolágeno). A lisil oxidase então forma ligações covalentes entre moléculas individuais de tropocolágeno, gerando fibras de colágeno maduras. A variação nas sequências de aminoácidos nas cadeias alfa do colágeno origina a diversidade de colágeno nos diferentes tecidos. Os colágenos tipos I, II, III e V fornecem resistência à tração na pele, ossos, cartilagem, tendões e vasos sanguíneos.\n\nA síndrome de Ehlers-Danlos (SED) é um grupo de distúrbios hereditários que envolvem um defeito na síntese de colágeno. A SED geralmente se manifesta clinicamente com articulações hipermóveis, pele hiperelástica e tecido frágil suscetível a hematomas, feridas e hemartrose. Mutações comuns que levam aos fenótipos de SED incluem deficiências das enzimas lisil hidroxilase e procolágeno peptidase, responsáveis pela síntese de colágeno.',
        explI:[
          {option:'B', explanation:'A elastina, uma proteína fibrosa do tecido conjuntivo, recebe esse nome pelas propriedades elásticas que confere à pele, aos vasos sanguíneos e aos alvéolos pulmonares. As fibras de elastina podem ser esticadas a várias vezes seu comprimento original, mas retraem quando as forças de estiramento são removidas. A elastina é sintetizada a partir do precursor polipeptídico tropoelastina.'},
          {option:'C', explanation:'A fibrilina-1 é um componente importante das microfibrilas que formam uma bainha ao redor da elastina. As microfibrilas estão abundantemente presentes nos vasos sanguíneos e nos ligamentos suspensores do cristalino. Defeitos no gene da fibrilina-1 causam a síndrome de Marfan clássica, de herança autossômica dominante.'},
          {option:'D', explanation:'O ácido hialurônico é outro componente importante da matriz extracelular do tecido mole, incluindo o líquido sinovial e a pele. A injeção exógena pode ser usada para restaurar a viscoelasticidade do líquido sinovial na osteoartrite; preenchedores de tecido mole também podem ser usados em pacientes preocupados com a perda de volume relacionada à idade (por exemplo, sulcos nasolabiais).'},
          {option:'E', explanation:'As lamininas são glicoproteínas heterotriméricas que se ligam ao colágeno tipo IV subjacente às células epiteliais. Elas contribuem para a organização e função da lâmina basal (membrana basal).'},
          {option:'F', explanation:'Os proteoglicanos são compostos por glicosaminoglicanos (GAGs), que conferem compressibilidade aos tecidos. Pacientes com deficiências em enzimas lisossômicas não conseguem degradar os GAGs, resultando em mucopolissacaridoses (por exemplo, síndrome de Hurler, síndrome de Hunter), caracterizadas por doença de tecidos moles e esqueléticas.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0013', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::organic_acidemias', difficulty:'hard',
      vignette:'A 7-day-old neonate born to a 28-year-old woman is brought to the office due to progressive lethargy, vomiting, and poor feeding. The mother reports an uneventful pregnancy and perinatal course. She exclusively breastfeeds the infant and has no medical problems in any of her other children. On examination, the infant is somnolent and dehydrated with decreased muscle tone. Laboratory studies reveal metabolic acidosis with an elevated anion gap, ketosis, and hypoglycemia. Further evaluation reveals a markedly elevated propionic acid level due to defective conversion of propionyl-CoA to methylmalonyl-CoA.',
      q:'This patient is most likely unable to use which of the following amino acids for energy production?',
      options:[
        {label:'A', text:'Alanine'},
        {label:'B', text:'Aspartate'},
        {label:'C', text:'Glutamate'},
        {label:'D', text:'Lysine'},
        {label:'E', text:'Phenylalanine'},
        {label:'F', text:'Valine'},
      ],
      correct:'F',
      explC:'Catabolism of several essential amino acids (valine, isoleucine, methionine, and threonine) along with odd-chain fatty acids results in the generation of propionyl-CoA. Propionyl-CoA is subsequently converted to methylmalonyl-CoA in a reaction catalyzed by biotin-dependent propionyl-CoA carboxylase. Isomerization of methylmalonyl-CoA then generates succinyl-CoA, which enters the TCA cycle.\n\nThis patient\'s presentation is consistent with propionic acidemia, an autosomal recessive organic acidemia caused by congenital deficiency of propionyl-CoA carboxylase. This enzyme catalyzes the conversion of propionyl-CoA to methylmalonyl-CoA. In its absence, excess propionic acid accumulates in the bloodstream, causing severe metabolic acidosis. Hypoglycemia and ketosis frequently develop secondary to the acidosis. Affected patients present 1-2 weeks after birth with lethargy, poor feeding, vomiting, and hypotonia. Treatment involves starting a low-protein diet containing minimal amounts of valine, isoleucine, methionine, and threonine.',
      explI:[
        {option:'A', explanation:'Alanine transaminase catalyzes the transfer of an amino group from alanine to α-ketoglutarate, generating pyruvate that can be used for gluconeogenesis.'},
        {option:'B', explanation:'Aspartate is a nonessential amino acid; it can be converted into oxaloacetate for use in the TCA cycle by aspartate transaminase.'},
        {option:'C', explanation:'Glutamate is deaminated by glutamate dehydrogenase to form the TCA cycle intermediate α-ketoglutarate.'},
        {option:'D', explanation:'Lysine and leucine are essential amino acids that are strictly ketogenic. They are metabolized into acetyl-CoA, which is a precursor for ketone bodies.'},
        {option:'E', explanation:'Phenylalanine is converted to tyrosine by the enzyme phenylalanine hydroxylase. Tyrosine is further converted into fumarate (TCA cycle intermediate) and acetoacetate (ketone body).'},
      ],
      objective:'Propionyl-CoA is derived from the metabolism of valine, isoleucine, methionine, threonine, and odd-chain fatty acids. Congenital deficiency of propionyl-CoA carboxylase, the enzyme responsible for the conversion of propionyl-CoA to methylmalonyl-CoA, leads to the development of propionic acidemia. The condition presents with lethargy, poor feeding, vomiting, and hypotonia 1-2 weeks after birth.',
      peer:{A:15, B:10, C:11, D:13, E:17, F:31},
      img:'assets/qbank/CMQ-STEP1-BCH-0013_organic_acidemia_pathway.png',
      labs:[
        ['Ammonia (venous), neonate (1–7 days)', '≤110 µmol/L (≈154 µg/dL)', '≤110 µmol/L (≈154 µg/dL)',
         'Often elevated in organic acidemias (eg, propionic acidemia) due to secondary impairment of the urea cycle by accumulated organic acids',
         'Frequentemente elevada nas acidemias orgânicas (ex.: acidemia propiônica) por comprometimento secundário do ciclo da ureia pelos ácidos orgânicos acumulados'],
        ['Propionylcarnitine (C3), plasma', '<4.33 µmol/L', '<4.33 µmol/L',
         'Markedly elevated in propionic acidemia; the primary biomarker used in newborn screening (tandem mass spectrometry) for this condition',
         'Marcadamente elevada na acidemia propiônica; principal biomarcador usado na triagem neonatal (espectrometria de massa em tandem) para essa condição'],
      ],
      ptTranslation:{
        vignette:'Um neonato de 7 dias de vida, filho de uma mulher de 28 anos, é levado ao consultório devido a letargia progressiva, vômitos e dificuldade de alimentação. A mãe relata gestação e parto sem intercorrências. Ela amamenta o lactente exclusivamente e não tem problemas médicos em nenhum de seus outros filhos. Ao exame, o lactente está sonolento e desidratado, com tônus muscular diminuído. Os exames laboratoriais revelam acidose metabólica com ânion-gap elevado, cetose e hipoglicemia. A investigação adicional revela um nível marcadamente elevado de ácido propiônico devido à conversão defeituosa de propionil-CoA em metilmalonil-CoA.',
        q:'Este paciente provavelmente é incapaz de utilizar qual dos seguintes aminoácidos para produção de energia?',
        objective:'O propionil-CoA é derivado do metabolismo de valina, isoleucina, metionina, treonina e ácidos graxos de cadeia ímpar. A deficiência congênita da propionil-CoA carboxilase, a enzima responsável pela conversão de propionil-CoA em metilmalonil-CoA, leva ao desenvolvimento de acidemia propiônica. A condição se apresenta com letargia, dificuldade de alimentação, vômitos e hipotonia 1-2 semanas após o nascimento.',
        options:[
          {label:'A', text:'Alanina'},
          {label:'B', text:'Aspartato'},
          {label:'C', text:'Glutamato'},
          {label:'D', text:'Lisina'},
          {label:'E', text:'Fenilalanina'},
          {label:'F', text:'Valina'},
        ],
        explC:'O catabolismo de diversos aminoácidos essenciais (valina, isoleucina, metionina e treonina), juntamente com ácidos graxos de cadeia ímpar, resulta na geração de propionil-CoA. O propionil-CoA é subsequentemente convertido em metilmalonil-CoA em uma reação catalisada pela propionil-CoA carboxilase, dependente de biotina. A isomerização do metilmalonil-CoA então gera succinil-CoA, que entra no ciclo do TCA.\n\nA apresentação deste paciente é consistente com acidemia propiônica, uma acidemia orgânica autossômica recessiva causada por deficiência congênita da propionil-CoA carboxilase. Essa enzima catalisa a conversão de propionil-CoA em metilmalonil-CoA. Na sua ausência, o ácido propiônico se acumula na corrente sanguínea, causando acidose metabólica grave. Hipoglicemia e cetose frequentemente se desenvolvem secundariamente à acidose. Os pacientes afetados apresentam-se 1-2 semanas após o nascimento com letargia, dificuldade de alimentação, vômitos e hipotonia. O tratamento envolve o início de uma dieta hipoproteica contendo quantidades mínimas de valina, isoleucina, metionina e treonina.',
        explI:[
          {option:'A', explanation:'A alanina transaminase catalisa a transferência de um grupo amino da alanina para o alfa-cetoglutarato, gerando piruvato, que pode ser utilizado para a gliconeogênese.'},
          {option:'B', explanation:'O aspartato é um aminoácido não essencial; pode ser convertido em oxaloacetato para uso no ciclo do TCA pela aspartato transaminase.'},
          {option:'C', explanation:'O glutamato é desaminado pela glutamato desidrogenase para formar o intermediário do ciclo do TCA alfa-cetoglutarato.'},
          {option:'D', explanation:'A lisina e a leucina são aminoácidos essenciais estritamente cetogênicos. São metabolizadas em acetil-CoA, que é precursor de corpos cetônicos.'},
          {option:'E', explanation:'A fenilalanina é convertida em tirosina pela enzima fenilalanina hidroxilase. A tirosina é posteriormente convertida em fumarato (intermediário do ciclo do TCA) e acetoacetato (corpo cetônico).'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0014', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::lysosomal_storage_diseases', difficulty:'medium',
      vignette:'A 2-year-old boy is being evaluated at the office for failure to thrive and developmental delay. Medical history is significant for recurrent ear infections since 6 months of age. Physical examination shows corneal clouding, hepatosplenomegaly, and restricted joint mobility. Further evaluation shows deficient phosphorylation of mannose residues on certain glycoproteins in the Golgi apparatus.',
      q:'In unaffected patients, these proteins are normally transported to which of the following cellular locations?',
      options:[
        {label:'A', text:'Endoplasmic reticulum'},
        {label:'B', text:'Extracellular space'},
        {label:'C', text:'Lysosome'},
        {label:'D', text:'Mitochondria'},
        {label:'E', text:'Plasma membrane'},
      ],
      correct:'C',
      explC:'This patient has inclusion cell (I-cell) disease, an autosomal recessive lysosomal storage disorder. I-cell disease occurs due to defects in protein targeting, a process by which proteins are transported to their appropriate intra- or extracellular location.\n\nNormally, posttranslational modifications (eg, folding, glycosylation, phosphorylation) function as markers that help guide proteins to their final destination. For lysosome-bound proteins (ie, acid hydrolases), a Golgi body phosphotransferase enzyme catalyzes the phosphorylation of mannose residues on the proteins. Once tagged with mannose-6-phosphate, these proteins traverse the Golgi network and are ultimately transported to the lysosome, where they serve as catalysts for degradation of cellular components.\n\nIn I-cell disease, a defective phosphotransferase enzyme results in deficient phosphorylation (ie, incorrect targeting) of mannose residues on acid hydrolases, which are then inappropriately secreted to the extracellular space. This leads to lack of degradation of lysosomal cellular debris, which accumulates within the lysosome, forming the characteristic inclusion bodies. Patients with this disorder typically have failure to thrive, respiratory tract infections, and cognitive deficits in the first year of life, along with characteristic physical features (eg, coarse facies, corneal clouding, hepatosplenomegaly).',
      explI:[
        {option:'A', explanation:'The endoplasmic reticulum (ER) is the site of protein synthesis prior to transport to the Golgi apparatus for protein modification and vesicular trafficking. Retrograde transport from the Golgi apparatus to the ER occurs via specialized protein-coated vesicles (eg, COPI).'},
        {option:'B', explanation:'Following translation in the ER, secretory proteins traverse the Golgi apparatus and are packaged into vesicles that ultimately fuse with the plasma membrane, facilitating extracellular protein secretion. Lysosomal proteins are inappropriately transferred to the extracellular space in patients with I-cell disease.'},
        {option:'D', explanation:'Most mitochondrial proteins are synthesized in the cytosol and contain specific mitochondrial targeting sequences. Translocases detect these sequences and shuttle the proteins into and between the different mitochondrial compartments.'},
        {option:'E', explanation:'Peripheral membrane proteins may be modified through a process in which a hydrophobic lipid anchor is covalently attached to the protein. This process facilitates protein interaction with the plasma membrane.'},
      ],
      objective:'Inclusion cell disease is a lysosomal storage disorder in which a defect in protein targeting prevents the phosphorylation of mannose residues required to tag acid hydrolases for transport to lysosomes. Without these lysosomal proteins, cellular debris cannot be degraded and therefore accumulates within lysosomes, forming inclusion bodies characteristic of the disease.',
      peer:{A:8, B:7, C:68, D:3, E:12},
      img:'assets/qbank/CMQ-STEP1-BCH-0014_mannose_6_phosphate_lysosomal_targeting.png',
      labs:[
        ['Serum lysosomal enzymes (eg, hexosaminidase, arylsulfatase A)', 'Reference range varies by assay/laboratory', 'Faixa de referência varia conforme o método/laboratório',
         'Markedly elevated (~10–20× normal) in I-cell disease, because enzymes lacking the mannose-6-phosphate tag are secreted into the extracellular space instead of delivered to lysosomes (paradoxically low activity within cultured fibroblasts)',
         'Marcadamente elevadas (~10–20× o normal) na doença de células I, pois as enzimas sem a marcação manose-6-fosfato são secretadas para o espaço extracelular em vez de entregues aos lisossomos (atividade paradoxalmente baixa em fibroblastos cultivados)'],
      ],
      ptTranslation:{
        vignette:'Um menino de 2 anos está sendo avaliado no consultório por deficit de crescimento (failure to thrive) e atraso do desenvolvimento. A história médica é significativa para infecções de ouvido recorrentes desde os 6 meses de idade. O exame físico mostra opacificação corneana, hepatoesplenomegalia e mobilidade articular restrita. A avaliação adicional mostra fosforilação deficiente de resíduos de manose em determinadas glicoproteínas no aparelho de Golgi.',
        q:'Em pacientes não afetados, essas proteínas são normalmente transportadas para qual dos seguintes locais celulares?',
        objective:'A doença de células I é um distúrbio de armazenamento lisossômico em que um defeito na sinalização proteica impede a fosforilação de resíduos de manose necessária para marcar as hidrolases ácidas para transporte aos lisossomos. Sem essas proteínas lisossômicas, os detritos celulares não podem ser degradados e, portanto, se acumulam dentro dos lisossomos, formando as inclusões características da doença.',
        options:[
          {label:'A', text:'Retículo endoplasmático'},
          {label:'B', text:'Espaço extracelular'},
          {label:'C', text:'Lisossomo'},
          {label:'D', text:'Mitocôndria'},
          {label:'E', text:'Membrana plasmática'},
        ],
        explC:'Este paciente tem doença de células de inclusão (doença de células I), um distúrbio lisossômico de armazenamento autossômico recessivo. A doença de células I ocorre devido a defeitos na sinalização proteica, o processo pelo qual as proteínas são transportadas para seu local intra ou extracelular apropriado.\n\nNormalmente, modificações pós-traducionais (por exemplo, dobramento, glicosilação, fosforilação) funcionam como marcadores que ajudam a guiar as proteínas até seu destino final. Para as proteínas destinadas ao lisossomo (isto é, hidrolases ácidas), uma enzima fosfotransferase do complexo de Golgi catalisa a fosforilação de resíduos de manose nas proteínas. Uma vez marcadas com manose-6-fosfato, essas proteínas atravessam a rede do Golgi e são finalmente transportadas ao lisossomo, onde atuam como catalisadoras na degradação de componentes celulares.\n\nNa doença de células I, uma enzima fosfotransferase defeituosa resulta em fosforilação deficiente (isto é, sinalização incorreta) dos resíduos de manose nas hidrolases ácidas, que são então inadequadamente secretadas para o espaço extracelular. Isso leva à falta de degradação de detritos celulares lisossômicos, que se acumulam dentro do lisossomo, formando as inclusões características. Pacientes com esse distúrbio tipicamente apresentam deficit de crescimento, infecções do trato respiratório e deficits cognitivos no primeiro ano de vida, além de características físicas típicas (por exemplo, fácies grosseira, opacificação corneana, hepatoesplenomegalia).',
        explI:[
          {option:'A', explanation:'O retículo endoplasmático (RE) é o local de síntese proteica antes do transporte ao aparelho de Golgi para modificação proteica e tráfego vesicular. O transporte retrógrado do Golgi para o RE ocorre por meio de vesículas revestidas especializadas (por exemplo, COPI).'},
          {option:'B', explanation:'Após a tradução no RE, as proteínas secretórias atravessam o aparelho de Golgi e são empacotadas em vesículas que finalmente se fundem com a membrana plasmática, facilitando a secreção proteica extracelular. As proteínas lisossômicas são inadequadamente transferidas para o espaço extracelular em pacientes com doença de células I.'},
          {option:'D', explanation:'A maioria das proteínas mitocondriais é sintetizada no citosol e contém sequências específicas de direcionamento mitocondrial. Translocases detectam essas sequências e transportam as proteínas para dentro e entre os diferentes compartimentos mitocondriais.'},
          {option:'E', explanation:'Proteínas periféricas de membrana podem ser modificadas por meio de um processo no qual uma âncora lipídica hidrofóbica é covalentemente ligada à proteína. Esse processo facilita a interação da proteína com a membrana plasmática.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0015', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::amino_acids_proteins_enzymes', difficulty:'medium',
      vignette:'A 4-month-old boy is brought to the office for his first visit since arriving in the United States. The patient was recently adopted, and his mother says that he appears tremulous compared to her other children. Over the past week, the patient has also had episodes of upward eye deviation and bilateral arm and leg shaking for approximately 2 minutes at a time. Biologic family history is unavailable. Temperature is 36.7 C (98.1 F), blood pressure is 90/40 mm Hg, pulse is 120/min, and respirations are 30/min. Examination shows a fair-skinned infant with blue eyes and a musty body odor.',
      q:'This patient is most likely to require supplementation with which of the following amino acids?',
      options:[
        {label:'A', text:'Cysteine'},
        {label:'B', text:'Isoleucine'},
        {label:'C', text:'Leucine'},
        {label:'D', text:'Phenylalanine'},
        {label:'E', text:'Tyrosine'},
        {label:'F', text:'Valine'},
      ],
      correct:'E',
      explC:'This patient\'s neurologic abnormalities (eg, tremors, seizures) in the setting of musty body odor and light skin/eye color are suggestive of phenylketonuria (PKU), an autosomal recessive disease in which patients have impaired metabolism of phenylalanine, an essential amino acid. PKU is caused by deficiency of phenylalanine hydroxylase, which catalyzes the conversion of phenylalanine to tyrosine.\n\nMost patients with PKU are identified via routine newborn screening (ie, via elevated phenylalanine levels) and treated with a phenylalanine-restricted diet starting in the neonatal period (Choice D). This diet is typically sufficient to prevent manifestations of disease, which are largely due to hyperphenylalaninemia. However, tyrosine is considered an essential amino acid in patients with PKU because it cannot be synthesized from phenylalanine and is required for the production of proteins, catecholamines, and melanin. Therefore, although tyrosine is usually available in a well-varied diet, tyrosine supplementation may be required if intake is insufficient.\n\nWithout treatment, hyperphenylalaninemia results in the following findings:\n\n• Irreversible neurologic injury: Excess phenylalanine is thought to affect normal neuronal development and increase oxidative stress in the brain, leading to developmental delay, intellectual disability, microcephaly, and seizures.\n\n• Reduced melanin production (eg, light skin, blue eyes): Excess levels of phenylalanine inhibit tyrosinase, an enzyme essential in the production of melanin. Low levels of tyrosine also contribute to hypopigmentation in patients who are tyrosine deficient.\n\n• Musty odor: Excess phenylalanine metabolites cause malodorous breath, skin, and urine.',
      explI:[
        {option:'A', explanation:'Cysteine supplementation may be required in homocystinuria, a condition in which cystathionine synthase deficiency leads to reduced cysteine production and homocysteine and methionine accumulation. Fair complexion and seizures may be seen in infancy; other characteristic features (eg, downward lens dislocation, thrombosis) usually present later. However, musty body odor would not be expected.'},
        {option:'B, C, and F', explanation:'The branched-chain amino acids (isoleucine, leucine, valine) are elevated in maple syrup urine disease, which is due to branched-chain alpha-ketoacid dehydrogenase deficiency. Buildup of branched-chain amino acids and their metabolites leads to ketonuria (urine with a sweet odor) and encephalopathy within a week of birth; management is dietary restriction of these amino acids.'},
      ],
      objective:'Untreated phenylketonuria leads to irreversible neurologic abnormalities (eg, intellectual disability, seizures), as well as reduced melanin production and a musty odor. Pathophysiology involves impaired metabolism of phenylalanine to tyrosine, and treatment includes a phenylalanine-restricted diet that may require supplemental tyrosine.',
      peer:{A:6, B:1, C:2, D:23, E:64, F:1},
      img:'assets/qbank/CMQ-STEP1-BCH-0015_phenylketonuria_pathway.png',
      labs:[
        ['Phenylalanine, plasma', '<2 mg/dL (<120 µmol/L)', '<2 mg/dL (<120 µmol/L)',
         'Markedly elevated (classically >20 mg/dL) in untreated phenylketonuria due to phenylalanine hydroxylase deficiency',
         'Marcadamente elevada (classicamente >20 mg/dL) na fenilcetonúria não tratada por deficiência de fenilalanina hidroxilase'],
      ],
      ptTranslation:{
        vignette:'Um menino de 4 meses é levado ao consultório para sua primeira consulta desde a chegada aos Estados Unidos. O paciente foi recentemente adotado, e sua mãe diz que ele parece trêmulo em comparação com seus outros filhos. Na última semana, o paciente também teve episódios de desvio ocular para cima e tremores bilaterais de braços e pernas por aproximadamente 2 minutos de cada vez. A história familiar biológica não está disponível. A temperatura é 36,7°C (98,1°F), a pressão arterial é 90/40 mmHg, o pulso é 120/min, e as respirações são 30/min. O exame mostra um lactente de pele clara, com olhos azuis e odor corporal almiscarado.',
        q:'Este paciente provavelmente necessitará de suplementação com qual dos seguintes aminoácidos?',
        objective:'A fenilcetonúria não tratada leva a anormalidades neurológicas irreversíveis (por exemplo, deficiência intelectual, convulsões), além de redução da produção de melanina e odor almiscarado. A fisiopatologia envolve metabolismo prejudicado de fenilalanina em tirosina, e o tratamento inclui uma dieta com restrição de fenilalanina que pode exigir suplementação de tirosina.',
        options:[
          {label:'A', text:'Cisteína'},
          {label:'B', text:'Isoleucina'},
          {label:'C', text:'Leucina'},
          {label:'D', text:'Fenilalanina'},
          {label:'E', text:'Tirosina'},
          {label:'F', text:'Valina'},
        ],
        explC:'As anormalidades neurológicas deste paciente (por exemplo, tremores, convulsões) associadas a odor corporal almiscarado e pele/olhos claros sugerem fenilcetonúria (PKU), uma doença autossômica recessiva na qual os pacientes têm metabolismo prejudicado de fenilalanina, um aminoácido essencial. A PKU é causada por deficiência de fenilalanina hidroxilase, que catalisa a conversão de fenilalanina em tirosina.\n\nA maioria dos pacientes com PKU é identificada por meio da triagem neonatal de rotina (isto é, por níveis elevados de fenilalanina) e tratada com uma dieta restrita em fenilalanina iniciada no período neonatal (Alternativa D). Essa dieta geralmente é suficiente para prevenir as manifestações da doença, que se devem, em grande parte, à hiperfenilalaninemia. No entanto, a tirosina é considerada um aminoácido essencial em pacientes com PKU, pois não pode ser sintetizada a partir da fenilalanina e é necessária para a produção de proteínas, catecolaminas e melanina. Portanto, embora a tirosina geralmente esteja disponível em uma dieta variada, a suplementação de tirosina pode ser necessária se a ingestão for insuficiente.\n\nSem tratamento, a hiperfenilalaninemia resulta nos seguintes achados:\n\n• Lesão neurológica irreversível: acredita-se que o excesso de fenilalanina afete o desenvolvimento neuronal normal e aumente o estresse oxidativo no cérebro, levando a atraso do desenvolvimento, deficiência intelectual, microcefalia e convulsões.\n\n• Produção reduzida de melanina (por exemplo, pele clara, olhos azuis): níveis excessivos de fenilalanina inibem a tirosinase, uma enzima essencial na produção de melanina. Níveis baixos de tirosina também contribuem para a hipopigmentação em pacientes com deficiência de tirosina.\n\n• Odor almiscarado: metabólitos excessivos de fenilalanina causam odor desagradável no hálito, na pele e na urina.',
        explI:[
          {option:'A', explanation:'A suplementação de cisteína pode ser necessária na homocistinúria, uma condição em que a deficiência de cistationina sintase leva à redução da produção de cisteína e ao acúmulo de homocisteína e metionina. Pele clara e convulsões podem ser observadas na infância; outras características típicas (por exemplo, deslocamento do cristalino para baixo, trombose) geralmente se manifestam mais tarde. No entanto, o odor corporal almiscarado não seria esperado.'},
          {option:'B, C, and F', explanation:'Os aminoácidos de cadeia ramificada (isoleucina, leucina, valina) estão elevados na doença da urina em xarope de bordo, causada pela deficiência da alfa-cetoácido desidrogenase de cadeia ramificada. O acúmulo de aminoácidos de cadeia ramificada e seus metabólitos leva à cetonúria (urina com odor adocicado) e encefalopatia dentro de uma semana após o nascimento; o manejo consiste na restrição dietética desses aminoácidos.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0016', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'A 14-month-old boy is evaluated for failure to thrive and developmental delay. His mother reports that at 12 months he could barely lift his head and had difficulty sitting unsupported. The toddler has not started babbling or forming words. He is at the 10th percentile for height and 5th percentile for weight. Laboratory results are as follows: Hemoglobin 8.6 g/dL, mean corpuscular volume 114 fL, reticulocytes 1%, and plasma ammonia 42 µg/dL (normal: 40-80 µg/dL). Urine specimens contain large amounts of orotic acid crystals.',
      q:'Supplementation with which of the following substances would most likely benefit this patient?',
      options:[
        {label:'A', text:'Ascorbic acid'},
        {label:'B', text:'Folic acid'},
        {label:'C', text:'Guanine'},
        {label:'D', text:'Iron'},
        {label:'E', text:'Pyridoxine'},
        {label:'F', text:'Uridine'},
      ],
      correct:'F',
      explC:'This patient likely has hereditary orotic aciduria, a rare autosomal recessive disorder of de novo pyrimidine synthesis that results in developmental delay (eg, low height/weight, absent developmental milestones), megaloblastic anemia (eg, elevated mean corpuscular volume, low reticulocyte count), and elevated urinary orotic acid levels. Increased urinary orotic acid may also be seen in ornithine transcarbamylase deficiency; however, patients with this condition classically have failure to thrive and hyperammonemic encephalopathy within the first few weeks of life (due to impaired urea synthesis).\n\nHereditary orotic aciduria occurs due to a defect in uridine 5\'-monophosphate (UMP) synthase, a polypeptide containing 2 enzymatic domains (orotate phosphoribosyltransferase and OMP decarboxylase) that catalyze the final conversion of orotic acid to UMP. Impaired conversion of orotic acid to UMP results in the excretion of large amounts of orotic acid in the urine and the clinical features described above. Uridine supplementation can bypass this enzymatic defect and improve symptoms as uridine is converted to UMP via nucleoside kinases.',
      explI:[
        {option:'A', explanation:'Ascorbic acid (vitamin C) is required for hydroxylation of proline and lysine residues in collagen synthesis; therefore, it plays an important role in connective tissue maintenance and wound healing.'},
        {option:'B', explanation:'Folate participates in single carbon transfer reactions, as in the de novo synthesis of purines and thymidine. Folate supplements will improve megaloblastic anemia resulting from folate deficiency but will not improve the anemia in orotic aciduria.'},
        {option:'C', explanation:'Guanine and adenine are purine bases present in DNA and RNA. Orotic aciduria is a defect in the synthesis of pyrimidine bases, so supplementation with purines would not affect orate synthesis.'},
        {option:'D', explanation:'Iron supplementation improves iron deficiency anemia, classically a microcytic hypochromic anemia.'},
        {option:'E', explanation:'Pyridoxine (vitamin B6) supplementation is indicated during treatment with isoniazid. Pyridoxine is a cofactor in transamination, deamination, decarboxylation, and condensation reactions.'},
      ],
      objective:'Orotic aciduria is a rare autosomal recessive disorder of de novo pyrimidine synthesis that occurs due to a defect in uridine 5\'-monophosphate (UMP) synthase. Children typically present with developmental delay, megaloblastic anemia, and large amounts of urinary orotic acid. Uridine supplementation can improve symptoms as uridine is converted to UMP via nucleoside kinases.',
      peer:{A:2, B:26, C:5, D:1, E:22, F:39},
      img:'assets/qbank/CMQ-STEP1-BCH-0016_de_novo_pyrimidine_synthesis.png',
      labs:[
        ['Orotic acid (urine)', '1.12–2.52 mmol/mol creatinine (age 13 mo–10 y)', '1,12–2,52 mmol/mol creatinina (13 meses–10 anos)',
         'Markedly elevated in hereditary orotic aciduria (UMP synthase deficiency) due to impaired conversion of orotic acid to UMP',
         'Marcadamente elevado na aciduria orótica hereditária (deficiência de UMP sintase) por conversão prejudicada de ácido orótico em UMP'],
        ['Folate, serum', '14–51 ng/mL (infant reference range)', '14–51 ng/mL (faixa de referência para lactentes)',
         'Typically normal in hereditary orotic aciduria — helps distinguish it from folate-deficiency megaloblastic anemia',
         'Tipicamente normal na aciduria orótica hereditária — ajuda a diferenciá-la da anemia megaloblástica por deficiência de folato'],
      ],
      ptTranslation:{
        vignette:'Um menino de 14 meses é avaliado por falha no crescimento e atraso no desenvolvimento. Sua mãe relata que, aos 12 meses, ele mal conseguia levantar a cabeça e tinha dificuldade para sentar sem apoio. O bebê ainda não começou a balbuciar nem a formar palavras. Ele está no percentil 10 para altura e no percentil 5 para peso. Os resultados laboratoriais são os seguintes: hemoglobina 8,6 g/dL, volume corpuscular médio 114 fL, reticulócitos 1%, e amônia plasmática 42 µg/dL (normal: 40-80 µg/dL). Amostras de urina contêm grandes quantidades de cristais de ácido orótico.',
        q:'A suplementação com qual das seguintes substâncias provavelmente mais beneficiaria este paciente?',
        objective:'A aciduria orótica é um distúrbio autossômico recessivo raro da síntese de pirimidinas de novo que ocorre devido a um defeito na uridina 5\'-monofosfato (UMP) sintase. As crianças tipicamente apresentam atraso do desenvolvimento, anemia megaloblástica e grandes quantidades de ácido orótico urinário. A suplementação de uridina pode melhorar os sintomas, já que a uridina é convertida em UMP pelas nucleosídeo cinases.',
        options:[
          {label:'A', text:'Ácido ascórbico'},
          {label:'B', text:'Ácido fólico'},
          {label:'C', text:'Guanina'},
          {label:'D', text:'Ferro'},
          {label:'E', text:'Piridoxina'},
          {label:'F', text:'Uridina'},
        ],
        explC:'Este paciente provavelmente tem aciduria orótica hereditária, um distúrbio autossômico recessivo raro da síntese de pirimidinas de novo que resulta em atraso do desenvolvimento (por exemplo, baixa estatura/peso, ausência de marcos do desenvolvimento), anemia megaloblástica (por exemplo, volume corpuscular médio elevado, contagem baixa de reticulócitos) e níveis elevados de ácido orótico urinário. O aumento do ácido orótico urinário também pode ser observado na deficiência de ornitina transcarbamilase; entretanto, pacientes com essa condição classicamente apresentam falha no crescimento e encefalopatia hiperamonêmica já nas primeiras semanas de vida (devido à síntese de ureia prejudicada).\n\nA aciduria orótica hereditária ocorre devido a um defeito na uridina 5\'-monofosfato (UMP) sintase, um polipeptídeo com 2 domínios enzimáticos (orotato fosforribosiltransferase e OMP descarboxilase) que catalisam a conversão final do ácido orótico em UMP. A conversão prejudicada de ácido orótico em UMP resulta na excreção de grandes quantidades de ácido orótico na urina e nas características clínicas descritas acima. A suplementação de uridina pode contornar esse defeito enzimático e melhorar os sintomas, já que a uridina é convertida em UMP pelas nucleosídeo cinases.',
        explI:[
          {option:'A', explanation:'O ácido ascórbico (vitamina C) é necessário para a hidroxilação dos resíduos de prolina e lisina na síntese de colágeno; portanto, desempenha um papel importante na manutenção do tecido conjuntivo e na cicatrização de feridas.'},
          {option:'B', explanation:'O folato participa de reações de transferência de um carbono, como na síntese de novo de purinas e timidina. A suplementação de folato melhora a anemia megaloblástica resultante de deficiência de folato, mas não melhora a anemia na aciduria orótica.'},
          {option:'C', explanation:'Guanina e adenina são bases púricas presentes no DNA e no RNA. A aciduria orótica é um defeito na síntese das bases pirimídicas, portanto a suplementação com purinas não afetaria a síntese de orotato.'},
          {option:'D', explanation:'A suplementação de ferro melhora a anemia por deficiência de ferro, classicamente uma anemia microcítica hipocrômica.'},
          {option:'E', explanation:'A suplementação de piridoxina (vitamina B6) é indicada durante o tratamento com isoniazida. A piridoxina é um cofator em reações de transaminação, desaminação, descarboxilação e condensação.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0017', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'An autopsy is performed on a 9-month-old boy who died due to refractory seizures. The patient\'s family had recently immigrated to the United States, and he had a history of severe developmental delay and seizures. Examination shows microcephaly and skin with diffuse hypopigmentation. Further work-up reveals deficiency of a cofactor required for the formation of neurotransmitters found predominantly in the substantia nigra and locus caeruleus.',
      q:'The absence of this cofactor is most likely to directly affect the function of which of the following enzymes?',
      options:[
        {label:'A', text:'Branched-chain alpha-ketoacid dehydrogenase'},
        {label:'B', text:'Dopamine hydroxylase'},
        {label:'C', text:'Homogentisic acid oxidase'},
        {label:'D', text:'Phenylalanine hydroxylase'},
      ],
      correct:'D',
      explC:'This patient\'s constellation of findings is consistent with impaired tetrahydrobiopterin (BH4) synthesis, a disorder affecting phenylalanine metabolism. BH4 is converted from its unreduced form (BH2) by dihydropteridine reductase; it is an essential cofactor for the following hydroxylase enzymes:\n\n• Phenylalanine hydroxylase: This enzyme converts phenylalanine to tyrosine, and impaired conversion leads to hyperphenylalaninemia; impaired BH4 synthesis causes the same findings as phenylketonuria. The excess phenylalanine causes irreversible neurologic injury (microcephaly, developmental delay, seizures) when untreated. Elevated phenylalanine is also a competitive inhibitor of tyrosinase, an enzyme essential in the production of melanin; reduced melanin production explains this patient\'s hypopigmentation.\n\n• Tyrosine hydroxylase: Impaired conversion of tyrosine to L-dopa results in reduced catecholamine production because L-dopa is the precursor for dopamine (substantia nigra), norepinephrine (locus caeruleus), and epinephrine. Impaired neurotransmitter production also leads to progressive neurologic findings, including extrapyramidal signs (eg, dystonia, truncal hypotonia) and autonomic dysfunction.\n\n• Tryptophan hydroxylase: Impaired conversion of tryptophan to serotonin results in dysregulation of mood, appetite, sleep, and muscle contraction.',
      explI:[
        {option:'A', explanation:'Branched-chain alpha-ketoacid dehydrogenase is a complex of enzymes that catalyzes the oxidative decarboxylation of the alpha-ketoacid derivatives of the branched-chain amino acids (leucine, isoleucine, valine). Deficiency causes maple syrup urine disease, which can affect neurotransmitter (eg, dopamine, serotonin) production and cause seizures. Diffuse hypopigmentation would not be seen.'},
        {option:'B', explanation:'Dopamine hydroxylase synthesizes norepinephrine from dopamine, and deficiency causes a rare form of dysautonomia (eg, orthostatic hypotension, hypothermia), not microcephaly or hypopigmentation.'},
        {option:'C', explanation:'Homogentisic acid oxidase catalyzes a step in the degradation of tyrosine to fumarate (involved in the tricarboxylic acid cycle). Deficiency causes alkaptonuria, an autosomal recessive disease that causes homogentisic acid accumulation; findings include connective tissue hyperpigmentation, arthropathy (in adults), and urine that darkens after several hours.'},
      ],
      objective:'Tetrahydrobiopterin (BH4) is an essential cofactor for hydroxylase enzymes involved in the metabolism of phenylalanine, tyrosine, and tryptophan. Impaired BH4 synthesis causes hyperphenylalaninemia and reduced levels of neurotransmitters (eg, dopamine, serotonin), causing progressive neurologic findings (developmental delay, seizures, microcephaly).',
      peer:{A:7, B:40, C:5, D:46},
      img:'assets/qbank/CMQ-STEP1-BCH-0017_tetrahydrobiopterin_synthesis.png',
      labs:[
        ['Phenylalanine, plasma', '<2 mg/dL (<120 µmol/L)', '<2 mg/dL (<120 µmol/L)',
         'Elevated in tetrahydrobiopterin (BH4) deficiency, since BH4 is a required cofactor for phenylalanine hydroxylase — mimics classic phenylketonuria',
         'Elevada na deficiência de tetrahidrobiopterina (BH4), já que a BH4 é cofator necessário para a fenilalanina hidroxilase — mimetiza a fenilcetonúria clássica'],
      ],
      ptTranslation:{
        vignette:'É realizada uma autópsia em um menino de 9 meses que morreu devido a convulsões refratárias. A família do paciente havia imigrado recentemente para os Estados Unidos, e ele tinha história de atraso grave do desenvolvimento e convulsões. O exame mostra microcefalia e pele com hipopigmentação difusa. Uma investigação adicional revela deficiência de um cofator necessário para a formação de neurotransmissores encontrados predominantemente na substância negra e no locus ceruleus.',
        q:'A ausência desse cofator provavelmente afeta diretamente a função de qual das seguintes enzimas?',
        objective:'A tetrahidrobiopterina (BH4) é um cofator essencial para as enzimas hidroxilases envolvidas no metabolismo da fenilalanina, tirosina e triptofano. A síntese prejudicada de BH4 causa hiperfenilalaninemia e níveis reduzidos de neurotransmissores (por exemplo, dopamina, serotonina), causando achados neurológicos progressivos (atraso do desenvolvimento, convulsões, microcefalia).',
        options:[
          {label:'A', text:'Alfa-cetoácido desidrogenase de cadeia ramificada'},
          {label:'B', text:'Dopamina hidroxilase'},
          {label:'C', text:'Homogentisato oxidase'},
          {label:'D', text:'Fenilalanina hidroxilase'},
        ],
        explC:'O conjunto de achados deste paciente é consistente com síntese prejudicada de tetrahidrobiopterina (BH4), um distúrbio que afeta o metabolismo da fenilalanina. A BH4 é convertida a partir de sua forma não reduzida (BH2) pela di-hidropteridina redutase; ela é um cofator essencial para as seguintes enzimas hidroxilases:\n\n• Fenilalanina hidroxilase: Esta enzima converte fenilalanina em tirosina, e a conversão prejudicada leva à hiperfenilalaninemia; a síntese prejudicada de BH4 causa os mesmos achados da fenilcetonúria. O excesso de fenilalanina causa lesão neurológica irreversível (microcefalia, atraso do desenvolvimento, convulsões) quando não tratado. A fenilalanina elevada também é um inibidor competitivo da tirosinase, enzima essencial na produção de melanina; a produção reduzida de melanina explica a hipopigmentação deste paciente.\n\n• Tirosina hidroxilase: A conversão prejudicada de tirosina em L-dopa resulta em produção reduzida de catecolaminas, pois a L-dopa é o precursor da dopamina (substância negra), da noradrenalina (locus ceruleus) e da adrenalina. A produção prejudicada de neurotransmissores também leva a achados neurológicos progressivos, incluindo sinais extrapiramidais (por exemplo, distonia, hipotonia troncular) e disfunção autonômica.\n\n• Triptofano hidroxilase: A conversão prejudicada de triptofano em serotonina resulta em desregulação do humor, apetite, sono e contração muscular.',
        explI:[
          {option:'A', explanation:'A alfa-cetoácido desidrogenase de cadeia ramificada é um complexo enzimático que catalisa a descarboxilação oxidativa dos derivados alfa-cetoácidos dos aminoácidos de cadeia ramificada (leucina, isoleucina, valina). Sua deficiência causa a doença da urina em xarope de bordo, que pode afetar a produção de neurotransmissores (por exemplo, dopamina, serotonina) e causar convulsões. Hipopigmentação difusa não seria esperada.'},
          {option:'B', explanation:'A dopamina hidroxilase sintetiza noradrenalina a partir da dopamina, e sua deficiência causa uma forma rara de disautonomia (por exemplo, hipotensão ortostática, hipotermia), não microcefalia ou hipopigmentação.'},
          {option:'C', explanation:'A homogentisato oxidase catalisa uma etapa da degradação da tirosina em fumarato (envolvido no ciclo do ácido tricarboxílico). Sua deficiência causa alcaptonúria, uma doença autossômica recessiva que causa acúmulo de ácido homogentísico; os achados incluem hiperpigmentação do tecido conjuntivo, artropatia (em adultos) e urina que escurece após várias horas.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0018', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'A research scientist is studying biochemical reactions that take place in the liver. He cultures hepatocytes in a growth media enriched with glutamate labeled with nitrogen isotopes. After some time, he finds that the nitrogen isotopes are transferred to oxaloacetate, forming aspartate in the process.',
      q:'Which of the following substances is most likely involved in this reaction?',
      options:[
        {label:'A', text:'Biotin'},
        {label:'B', text:'Folic acid'},
        {label:'C', text:'Niacin'},
        {label:'D', text:'Pyridoxine'},
        {label:'E', text:'Riboflavin'},
        {label:'F', text:'Thiamine'},
      ],
      correct:'D',
      explC:'Pyridoxine (vitamin B6) is necessary for the transamination and decarboxylation of amino acids, for gluconeogenesis, and for other essential biochemical processes. Transamination reactions typically occur between an amino acid and an α-keto acid. The amino group is transferred to the α-keto acid from the amino acid, and the α-keto acid thereby becomes an amino acid. For example, glutamate (amino acid) reacts with oxaloacetate (α-keto acid) to form aspartate (the resulting amino acid) and α-ketoglutarate (the resulting α-keto acid).\n\nTransaminases (aminotransferases) are the enzymes that catalyze transamination reactions, and pyridoxal phosphate (active vitamin B6) serves as an essential cofactor for the transaminase.',
      explI:[
        {option:'A', explanation:'Biotin (vitamin B7) is a cofactor for all 4 carboxylase enzymes: pyruvate carboxylase, acetyl-CoA carboxylase, propionyl-CoA carboxylase, and 3-methylcrotonyl-CoA-carboxylase. Nutritional deficiency may result from consumption of large amounts of avidin, a protein found in egg whites.'},
        {option:'B', explanation:'Folic acid (vitamin B9) is an essential cofactor in nucleic acid synthesis, and a deficiency of either folate or vitamin B12 results in megaloblastic anemia.'},
        {option:'C', explanation:'Many dehydrogenases use the cofactors NAD+ and NADP+, which are formed from niacin. Niacin (vitamin B3, or nicotinic acid) deficiency is known as pellagra and is classically associated with the "4 Ds": dermatitis, dementia, diarrhea, and, if untreated, death.'},
        {option:'E', explanation:'Riboflavin (vitamin B2) is used in dehydrogenase reactions involving the cofactors FMN and FAD.'},
        {option:'F', explanation:'Thiamine (vitamin B1) serves as a coenzyme for a number of important enzymes, including transketolase, α-ketoglutarate dehydrogenase, and pyruvate dehydrogenase. Thiamine deficiency may present as Wernicke encephalopathy (eg, encephalopathy, ataxia, ophthalmoplegia) or beriberi (eg, peripheral neuropathy, dilated cardiomyopathy).'},
      ],
      objective:'Transamination reactions typically occur between an amino acid and an α-keto acid. The amino group from the amino acid is transferred to the α-keto acid, and the α-keto acid in turn becomes an amino acid. Pyridoxal phosphate (active vitamin B6) serves as a cofactor in amino acid transamination and decarboxylation reactions.',
      peer:{A:16, B:3, C:17, D:40, E:7, F:14},
      img:'assets/qbank/CMQ-STEP1-BCH-0018_transamination_deamination_amino_acids.png',
      ptTranslation:{
        vignette:'Um cientista pesquisador está estudando reações bioquímicas que ocorrem no fígado. Ele cultiva hepatócitos em um meio de cultura enriquecido com glutamato marcado com isótopos de nitrogênio. Depois de algum tempo, ele constata que os isótopos de nitrogênio são transferidos para o oxaloacetato, formando aspartato no processo.',
        q:'Qual das seguintes substâncias provavelmente está envolvida nessa reação?',
        objective:'As reações de transaminação normalmente ocorrem entre um aminoácido e um α-cetoácido. O grupo amino do aminoácido é transferido para o α-cetoácido, que por sua vez se torna um aminoácido. O fosfato de piridoxal (vitamina B6 ativa) atua como cofator nas reações de transaminação e descarboxilação de aminoácidos.',
        options:[
          {label:'A', text:'Biotina'},
          {label:'B', text:'Ácido fólico'},
          {label:'C', text:'Niacina'},
          {label:'D', text:'Piridoxina'},
          {label:'E', text:'Riboflavina'},
          {label:'F', text:'Tiamina'},
        ],
        explC:'A piridoxina (vitamina B6) é necessária para a transaminação e a descarboxilação de aminoácidos, para a gliconeogênese e para outros processos bioquímicos essenciais. As reações de transaminação normalmente ocorrem entre um aminoácido e um α-cetoácido. O grupo amino é transferido do aminoácido para o α-cetoácido, que assim se torna um aminoácido. Por exemplo, o glutamato (aminoácido) reage com o oxaloacetato (α-cetoácido) para formar aspartato (o aminoácido resultante) e α-cetoglutarato (o α-cetoácido resultante).\n\nAs transaminases (aminotransferases) são as enzimas que catalisam as reações de transaminação, e o fosfato de piridoxal (vitamina B6 ativa) atua como cofator essencial para a transaminase.',
        explI:[
          {option:'A', explanation:'A biotina (vitamina B7) é cofator das 4 enzimas carboxilases: piruvato carboxilase, acetil-CoA carboxilase, propionil-CoA carboxilase e 3-metilcrotonil-CoA carboxilase. A deficiência nutricional pode resultar do consumo de grandes quantidades de avidina, uma proteína encontrada na clara do ovo.'},
          {option:'B', explanation:'O ácido fólico (vitamina B9) é um cofator essencial na síntese de ácidos nucleicos, e a deficiência de folato ou de vitamina B12 resulta em anemia megaloblástica.'},
          {option:'C', explanation:'Muitas desidrogenases usam os cofatores NAD+ e NADP+, que são formados a partir da niacina. A deficiência de niacina (vitamina B3, ou ácido nicotínico) é conhecida como pelagra e está classicamente associada aos "4 Ds" (em inglês): dermatite, demência, diarreia e, se não tratada, morte.'},
          {option:'E', explanation:'A riboflavina (vitamina B2) é usada em reações de desidrogenase envolvendo os cofatores FMN e FAD.'},
          {option:'F', explanation:'A tiamina (vitamina B1) atua como coenzima de diversas enzimas importantes, incluindo transcetolase, α-cetoglutarato desidrogenase e piruvato desidrogenase. A deficiência de tiamina pode se manifestar como encefalopatia de Wernicke (por exemplo, encefalopatia, ataxia, oftalmoplegia) ou beribéri (por exemplo, neuropatia periférica, cardiomiopatia dilatada).'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0019', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'medium',
      vignette:'Succinate dehydrogenase (SDH) is an enzyme complex located within the inner mitochondrial membrane that catalyzes the oxidation of succinate to fumarate. An experiment is conducted to determine if malate alters the rate of SDH activity. Reaction velocity is measured with and without a fixed quantity of malate as succinate concentration is gradually increased. Obtained results are shown below.\n\nSuccinate concentration (mM) | Rate of reaction without malate (µmol/L/sec) | Rate of reaction with malate (µmol/L/sec)\n2 | 80 | 40\n8 | 200 | 120\n16 | 280 | 200\n64 | 400 | 400\n128 | 400 | 400',
      q:'Which of the following is the most accurate statement about malate in this experiment?',
      options:[
        {label:'A', text:'It alters the maximal velocity of the reaction'},
        {label:'B', text:'It binds the enzyme at a different site than succinate'},
        {label:'C', text:'It covalently binds the enzyme'},
        {label:'D', text:'It decreases affinity of the enzyme for succinate'},
        {label:'E', text:'It is a competitive inhibitor of the enzyme'},
      ],
      correct:'E',
      explC:'The Michaelis-Menten model describes the behavior of enzyme-driven reactions by comparing the rate of reaction (V) to the concentration of the substrate (S). Maximal velocity (Vmax) represents the speed at which the reaction occurs when the enzyme\'s active sites are completely saturated with substrate. The Michaelis constant (Km) defines the substrate concentration at which half of the enzyme\'s binding sites are occupied by substrate (½ Vmax). Substrates with high affinity for the enzyme typically have a low Km.\n\nCompetitive inhibition occurs when an inhibitor binds to an enzyme and prevents it from binding the substrate. Most competitive inhibitors (including malate) bind at the active site (substrate-binding pocket) and physically impede substrate binding. Because these inhibitors compete with the substrate for binding to the active site, additional substrate is required to reach ½ Vmax, thereby increasing apparent Km. Competitive inhibitors have no effect on enzyme function, and therefore Vmax is unchanged.\n\nIn this example, Vmax remains constant (at 400 µmol/L/sec) while Km increases (from 8 to 16 mM) in the presence of malate. Therefore, malate is a competitive inhibitor of succinate dehydrogenase for succinate.',
      explI:[
        {option:'A', explanation:'Vmax depends on how fast an enzyme can catalyze a reaction when there are enough substrate molecules to fully saturate its active sites. Competitive inhibitors do not affect Vmax, as higher substrate concentrations are able to overcome the inhibition.'},
        {option:'B', explanation:'Most competitive inhibitors, such as malate, bind in the substrate-binding pocket. In contrast, most noncompetitive inhibitors bind at allosteric sites, resulting in a conformational change of the enzyme that decreases enzymatic activity and slows the rate of reaction (Vmax). Noncompetitive inhibition does not change the apparent Km and cannot be overcome with higher substrate concentrations.'},
        {option:'C', explanation:'Irreversible inhibitors bind to enzymes through strong covalent bonds; this typically renders the enzyme permanently ineffective, decreasing the Vmax.'},
        {option:'D', explanation:'Competitive inhibitors interfere with substrate binding due to the inhibitor\'s own high affinity for the enzyme\'s active site. This causes the measured Km value to increase; however, the actual enzyme affinity for the substrate remains unchanged.'},
      ],
      objective:'Competitive inhibitors compete with substrate for active binding sites on enzymes. Additional substrate is required to achieve the same rate of reaction, increasing the measured value of the Michaelis constant (Km). Competitive inhibitors do not affect enzyme function; therefore, maximal velocity (Vmax) is unchanged in their presence.',
      peer:{A:5, B:9, C:3, D:13, E:67},
      img:['assets/qbank/CMQ-STEP1-BCH-0019_succinate_dehydrogenase_table.png','assets/qbank/CMQ-STEP1-BCH-0019_competitive_inhibition_km_vmax.png'],
      ptTranslation:{
        vignette:'A succinato desidrogenase (SDH) é um complexo enzimático localizado na membrana mitocondrial interna que catalisa a oxidação de succinato a fumarato. Um experimento é conduzido para determinar se o malato altera a taxa de atividade da SDH. A velocidade da reação é medida com e sem uma quantidade fixa de malato, à medida que a concentração de succinato é gradualmente aumentada. Os resultados obtidos são mostrados abaixo.\n\nConcentração de succinato (mM) | Taxa de reação sem malato (µmol/L/seg) | Taxa de reação com malato (µmol/L/seg)\n2 | 80 | 40\n8 | 200 | 120\n16 | 280 | 200\n64 | 400 | 400\n128 | 400 | 400',
        q:'Qual das seguintes é a afirmação mais precisa sobre o malato neste experimento?',
        objective:'Os inibidores competitivos competem com o substrato pelos sítios de ligação ativos das enzimas. É necessário substrato adicional para atingir a mesma taxa de reação, aumentando o valor medido da constante de Michaelis (Km). Os inibidores competitivos não afetam a função da enzima; portanto, a velocidade máxima (Vmáx) permanece inalterada na presença deles.',
        options:[
          {label:'A', text:'Ele altera a velocidade máxima da reação'},
          {label:'B', text:'Ele se liga à enzima em um sítio diferente do succinato'},
          {label:'C', text:'Ele se liga covalentemente à enzima'},
          {label:'D', text:'Ele diminui a afinidade da enzima pelo succinato'},
          {label:'E', text:'Ele é um inibidor competitivo da enzima'},
        ],
        explC:'O modelo de Michaelis-Menten descreve o comportamento das reações catalisadas por enzimas comparando a taxa de reação (V) com a concentração do substrato (S). A velocidade máxima (Vmáx) representa a velocidade da reação quando os sítios ativos da enzima estão completamente saturados pelo substrato. A constante de Michaelis (Km) define a concentração de substrato na qual metade dos sítios de ligação da enzima está ocupada pelo substrato (½ Vmáx). Substratos com alta afinidade pela enzima tipicamente têm Km baixo.\n\nA inibição competitiva ocorre quando um inibidor se liga a uma enzima e impede que ela se ligue ao substrato. A maioria dos inibidores competitivos (incluindo o malato) se liga ao sítio ativo (bolsão de ligação do substrato) e impede fisicamente a ligação do substrato. Como esses inibidores competem com o substrato pela ligação ao sítio ativo, é necessário substrato adicional para atingir ½ Vmáx, aumentando assim o Km aparente. Os inibidores competitivos não afetam a função da enzima, portanto o Vmáx permanece inalterado.\n\nNeste exemplo, o Vmáx permanece constante (em 400 µmol/L/seg), enquanto o Km aumenta (de 8 para 16 mM) na presença de malato. Portanto, o malato é um inibidor competitivo da succinato desidrogenase para o succinato.',
        explI:[
          {option:'A', explanation:'O Vmáx depende da velocidade com que uma enzima consegue catalisar uma reação quando há moléculas de substrato suficientes para saturar totalmente seus sítios ativos. Os inibidores competitivos não afetam o Vmáx, pois concentrações mais altas de substrato conseguem superar a inibição.'},
          {option:'B', explanation:'A maioria dos inibidores competitivos, como o malato, se liga ao bolsão de ligação do substrato. Em contraste, a maioria dos inibidores não competitivos se liga a sítios alostéricos, resultando em uma mudança conformacional da enzima que diminui a atividade enzimática e reduz a taxa de reação (Vmáx). A inibição não competitiva não altera o Km aparente e não pode ser superada com concentrações mais altas de substrato.'},
          {option:'C', explanation:'Os inibidores irreversíveis se ligam às enzimas por meio de ligações covalentes fortes; isso geralmente torna a enzima permanentemente ineficaz, diminuindo o Vmáx.'},
          {option:'D', explanation:'Os inibidores competitivos interferem na ligação do substrato devido à alta afinidade do próprio inibidor pelo sítio ativo da enzima. Isso faz com que o valor medido de Km aumente; entretanto, a afinidade real da enzima pelo substrato permanece inalterada.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0020', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'A 2-year-old boy is evaluated for easy bruising. His parents report that he develops marked bruising and open wounds following minor trauma. The skin is difficult to suture due to its extreme fragility. Physical examination reveals hyperextensible skin, multiple ecchymoses over the forearms and pretibial regions, and an umbilical hernia. A skin biopsy is performed, and histochemical evaluation of the biopsy reveals a defect in extracellular processing of collagen.',
      q:'Which of the following steps of collagen synthesis is most likely impaired in this patient?',
      options:[
        {label:'A', text:'Glycosylation of hydroxylysine residues'},
        {label:'B', text:'Interchain C-terminal disulfide bond formation'},
        {label:'C', text:'N-terminal propeptide removal'},
        {label:'D', text:'Proline residue hydroxylation'},
        {label:'E', text:'Triple helix formation'},
      ],
      correct:'C',
      explC:'This child likely has Ehlers-Danlos syndrome (EDS), a group of rare hereditary disorders characterized by defective collagen synthesis. The condition can be caused by a deficiency in procollagen peptidase, the enzyme that cleaves terminal propeptides from procollagen in the extracellular space. Impaired propeptide removal results in the formation of soluble collagen that does not properly crosslink. Consequently, patients often have joint laxity, hyperextensible skin, fragile tissue with easy bruising, and poor wound healing.\n\nEach collagen molecule consists of 3 polypeptide α-chains held together by hydrogen bonds, forming a triple helix. Collagen assumes this conformation because each of the α-chains has a simple, repetitive amino acid sequence represented as (Gly-X-Y)n. The smallest amino acid, glycine (Gly), is necessary at every third position to ensure compact coiling of the helix. Many of the amino acids represented by X and Y are proline residues, which kink the polypeptide chain and enhance the rigidity of the helical structure due to their ring configuration.\n\nMature collagen is synthesized by fibroblasts, osteoblasts, and chondroblasts through the following steps:\n\n1. As translation begins in the cytoplasm, an amino acid signal sequence at the N-terminus of the α-chain facilitates ribosomal binding to the rough endoplasmic reticulum (RER) and passage of the growing polypeptide chain (pre-pro-α-chain) into the RER.\n\n2. Inside the RER, the hydrophobic signal sequence is cleaved to yield the pro-α-chain. Proline and lysine at the Y positions of the pro-α-chain are hydroxylated to hydroxyproline and hydroxylysine, respectively. Glycosylation of select hydroxylysine residues also occurs within the RER.\n\n3. The central helical region of the pro-α-chain is flanked by N- and C-terminal propeptides. Disulfide bond formation between the C-terminal propeptide region of 3 α-chains brings the chains into an alignment favorable for assembly into a triple helix (procollagen molecule).\n\n4. Procollagen molecules are then transported through the Golgi apparatus into the extracellular space. The N- and C-terminal propeptides are cleaved by procollagen peptidases, converting procollagen into less soluble tropocollagen.\n\n5. Tropocollagen monomers self-assemble into collagen fibrils. Finally, lysyl oxidase helps create covalent crosslinks between collagen fibrils to form strong collagen fibers.',
      explI:[
        {option:'A', explanation:'Glycosylation of select hydroxylysine residues occurs within the RER, following hydroxylation of proline and lysine residues in the pro-α-chain.'},
        {option:'B and E', explanation:'The central helical region of the pro-α-chain is flanked by N- and C-terminal propeptides. Disulfide bond formation between the C-terminal propeptide region of 3 α-chains brings the chains into an alignment favorable for assembly into a triple helix (procollagen molecule).'},
        {option:'D', explanation:'Inside the RER, the hydrophobic signal sequence is cleaved to yield the pro-α-chain. Proline and lysine at the Y positions of the pro-α-chain are hydroxylated to hydroxyproline and hydroxylysine, respectively.'},
      ],
      objective:'Ehlers-Danlos syndrome is a group of rare hereditary disorders characterized by defective collagen synthesis. It can be caused by procollagen peptidase deficiency, which results in impaired cleavage of terminal propeptides in the extracellular space. Patients often have joint laxity, hyperextensible skin, and tissue fragility due to the formation of soluble collagen that does not properly crosslink.',
      peer:{A:11, B:18, C:23, D:17, E:29},
      img:'assets/qbank/CMQ-STEP1-BCH-0020_collagen_synthesis_steps.png',
      ptTranslation:{
        vignette:'Um menino de 2 anos é avaliado por hematomas fáceis. Os pais relatam que ele desenvolve hematomas acentuados e feridas abertas após traumas leves. A pele é difícil de suturar devido à sua fragilidade extrema. O exame físico revela pele hiperextensível, múltiplas equimoses sobre os antebraços e regiões pré-tibiais, e uma hérnia umbilical. Uma biópsia de pele é realizada, e a avaliação histoquímica da biópsia revela um defeito no processamento extracelular do colágeno.',
        q:'Qual das seguintes etapas da síntese de colágeno provavelmente está prejudicada neste paciente?',
        objective:'A síndrome de Ehlers-Danlos é um grupo de distúrbios hereditários raros caracterizados por síntese defeituosa de colágeno. Pode ser causada por deficiência de procolágeno peptidase, que resulta em clivagem prejudicada dos propeptídeos terminais no espaço extracelular. Os pacientes frequentemente apresentam frouxidão articular, pele hiperextensível e fragilidade tecidual devido à formação de colágeno solúvel que não se reticula adequadamente.',
        options:[
          {label:'A', text:'Glicosilação de resíduos de hidroxilisina'},
          {label:'B', text:'Formação de ligação dissulfeto C-terminal entre cadeias'},
          {label:'C', text:'Remoção do propeptídeo N-terminal'},
          {label:'D', text:'Hidroxilação de resíduos de prolina'},
          {label:'E', text:'Formação da hélice tripla'},
        ],
        explC:'Esta criança provavelmente tem síndrome de Ehlers-Danlos (SED), um grupo de distúrbios hereditários raros caracterizados por síntese defeituosa de colágeno. A condição pode ser causada por uma deficiência de procolágeno peptidase, a enzima que cliva os propeptídeos terminais do procolágeno no espaço extracelular. A remoção prejudicada dos propeptídeos resulta na formação de colágeno solúvel que não se reticula adequadamente. Consequentemente, os pacientes frequentemente apresentam frouxidão articular, pele hiperextensível, tecido frágil com hematomas fáceis e cicatrização deficiente de feridas.\n\nCada molécula de colágeno consiste em 3 cadeias polipeptídicas alfa unidas por ligações de hidrogênio, formando uma hélice tripla. O colágeno assume essa conformação porque cada uma das cadeias alfa tem uma sequência de aminoácidos simples e repetitiva, representada como (Gli-X-Y)n. O menor aminoácido, glicina (Gli), é necessário a cada terceira posição para garantir o enrolamento compacto da hélice. Muitos dos aminoácidos representados por X e Y são resíduos de prolina, que dobram a cadeia polipeptídica e aumentam a rigidez da estrutura helicoidal devido à sua configuração em anel.\n\nO colágeno maduro é sintetizado por fibroblastos, osteoblastos e condroblastos através das seguintes etapas:\n\n1. Quando a tradução começa no citoplasma, uma sequência sinal de aminoácidos no N-terminal da cadeia alfa facilita a ligação ribossômica ao retículo endoplasmático rugoso (RER) e a passagem da cadeia polipeptídica em crescimento (cadeia pré-pró-alfa) para dentro do RER.\n\n2. Dentro do RER, a sequência sinal hidrofóbica é clivada para gerar a cadeia pró-alfa. Prolina e lisina nas posições Y da cadeia pró-alfa são hidroxiladas a hidroxiprolina e hidroxilisina, respectivamente. A glicosilação de resíduos selecionados de hidroxilisina também ocorre dentro do RER.\n\n3. A região helicoidal central da cadeia pró-alfa é flanqueada por propeptídeos N- e C-terminais. A formação de ligações dissulfeto entre a região do propeptídeo C-terminal de 3 cadeias alfa traz as cadeias para um alinhamento favorável à montagem em uma hélice tripla (molécula de procolágeno).\n\n4. As moléculas de procolágeno são então transportadas através do aparelho de Golgi para o espaço extracelular. Os propeptídeos N- e C-terminais são clivados pelas procolágeno peptidases, convertendo o procolágeno em tropocolágeno, menos solúvel.\n\n5. Os monômeros de tropocolágeno se autoagregam em fibrilas de colágeno. Por fim, a lisil oxidase ajuda a criar ligações cruzadas covalentes entre as fibrilas de colágeno para formar fibras de colágeno resistentes.',
        explI:[
          {option:'A', explanation:'A glicosilação de resíduos selecionados de hidroxilisina ocorre dentro do RER, após a hidroxilação dos resíduos de prolina e lisina na cadeia pró-alfa.'},
          {option:'B and E', explanation:'A região helicoidal central da cadeia pró-alfa é flanqueada por propeptídeos N- e C-terminais. A formação de ligações dissulfeto entre a região do propeptídeo C-terminal de 3 cadeias alfa traz as cadeias para um alinhamento favorável à montagem em uma hélice tripla (molécula de procolágeno).'},
          {option:'D', explanation:'Dentro do RER, a sequência sinal hidrofóbica é clivada para gerar a cadeia pró-alfa. Prolina e lisina nas posições Y da cadeia pró-alfa são hidroxiladas a hidroxiprolina e hidroxilisina, respectivamente.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0021', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'medium',
      vignette:'A 47-year-old homeless man comes to the emergency department due to a "pins-and-needles" sensation in his legs. He also has painful lesions on his lips and corners of his mouth. He has had no loss of consciousness, nausea, vomiting, or diplopia. The patient drinks alcohol heavily on a daily basis and has a history of intravenous heroin use. On physical examination, he appears unkempt and ill appearing. Temperature is 36.8 C (98.2 F), blood pressure is 146/90 mm Hg, and pulse is 106/min. He has glossitis and angular stomatitis. Abdominal examination reveals hepatomegaly. Laboratory evaluation shows very low urinary riboflavin excretion.',
      q:'Activity of which of the following enzymes is most likely directly impaired in this patient?',
      options:[
        {label:'A', text:'Fumarase'},
        {label:'B', text:'Glucose-6-phosphate dehydrogenase'},
        {label:'C', text:'HMG-CoA reductase'},
        {label:'D', text:'Isocitrate dehydrogenase'},
        {label:'E', text:'Malate dehydrogenase'},
        {label:'F', text:'Succinate dehydrogenase'},
        {label:'G', text:'Succinate thiokinase'},
      ],
      correct:'F',
      explC:'This patient\'s low urinary riboflavin excretion suggests a significant deficiency in riboflavin intake. Symptomatic riboflavin deficiency is rare in the United States but can be seen with chronic alcohol use and in severely malnourished patients. Clinical manifestations include angular stomatitis, cheilitis, glossitis, seborrheic dermatitis, eye changes (eg, keratitis, corneal neovascularization), and anemia.\n\nThe riboflavin (vitamin B2)-containing coenzymes are key constituents of the electron transport chain. Typically, riboflavin is first phosphorylated to become flavin mononucleotide (FMN), which can then be integrated into a coenzyme-flavin complex or further phosphorylated to flavin adenine dinucleotide (FAD). FMN and FAD participate as coenzymes in numerous reduction-oxidation reactions and are converted into reduced, energy-carrying states (FMNH2 and FADH2) through the acceptance of electrons.\n\nFMN serves as a component of complex I, whereas FAD functions as a component of succinate dehydrogenase (complex II). Complex II participates in both the electron transport chain and tricarboxylic acid (TCA) cycle. During the TCA cycle, succinate dehydrogenase converts succinate to fumarate and transfers electrons to coenzyme Q (ubiquinone) via FAD. Complex II also accepts electrons from other sources of FADH2, such as fatty acid oxidation.',
      explI:[
        {option:'A, D, E, and G', explanation:'Isocitrate dehydrogenase, succinate thiokinase, malate dehydrogenase, and fumarase are enzymes that participate in the TCA cycle but do not use FAD or FMN as cofactors.'},
        {option:'B', explanation:'Reduced glutathione is an antioxidant that minimizes oxidative damage in many cells. Glutathione reductase regenerates reduced glutathione using nicotinamide adenine dinucleotide phosphate (NADPH) as an electron donor and FAD as a cofactor. Although glucose-6-phosphate dehydrogenase (G6PD) is the rate-limiting enzyme in the pentose phosphate pathway and supplies the necessary NADPH, it does not use FAD as a cofactor.'},
        {option:'C', explanation:'HMG-CoA reductase is the rate-limiting enzyme in the cholesterol synthesis pathway. FMN and FAD are not used as cofactors.'},
      ],
      objective:'Riboflavin is a precursor of the coenzymes FMN and FAD. FAD participates in the tricarboxylic acid cycle and electron transport chain by acting as an electron acceptor for succinate dehydrogenase (complex II), which converts succinate into fumarate.',
      peer:{A:7, B:7, C:6, D:14, E:9, F:50, G:4},
      img:'assets/qbank/CMQ-STEP1-BCH-0021_citric_acid_cycle_succinate_dehydrogenase.png',
      labs:[
        ['Riboflavin, urinary excretion', '≥120 µg/day (or ≥27 µg/g creatinine)', '≥120 µg/dia (ou ≥27 µg/g de creatinina)',
         'Decreased in riboflavin (vitamin B2) deficiency, reflecting reduced substrate for FAD/FMN synthesis',
         'Diminuída na deficiência de riboflavina (vitamina B2), refletindo substrato reduzido para a síntese de FAD/FMN'],
      ],
      ptTranslation:{
        vignette:'Um homem de 47 anos, morador de rua, vem ao pronto-socorro devido a uma sensação de "formigamento" nas pernas. Ele também apresenta lesões dolorosas nos lábios e nos cantos da boca. Não teve perda de consciência, náuseas, vômitos ou diplopia. O paciente consome álcool pesadamente todos os dias e tem histórico de uso de heroína intravenosa. Ao exame físico, apresenta-se desleixado e com aspecto de doente. A temperatura é 36,8 C (98,2 F), a pressão arterial é 146/90 mmHg e o pulso é 106/min. Ele apresenta glossite e estomatite angular. O exame abdominal revela hepatomegalia. A avaliação laboratorial mostra excreção urinária de riboflavina muito baixa.',
        q:'A atividade de qual das seguintes enzimas está mais provavelmente diretamente prejudicada neste paciente?',
        objective:'A riboflavina é precursora das coenzimas FMN e FAD. O FAD participa do ciclo do ácido tricarboxílico e da cadeia de transporte de elétrons ao atuar como aceptor de elétrons da succinato desidrogenase (complexo II), que converte succinato em fumarato.',
        options:[
          {label:'A', text:'Fumarase'},
          {label:'B', text:'Glicose-6-fosfato desidrogenase'},
          {label:'C', text:'HMG-CoA redutase'},
          {label:'D', text:'Isocitrato desidrogenase'},
          {label:'E', text:'Malato desidrogenase'},
          {label:'F', text:'Succinato desidrogenase'},
          {label:'G', text:'Succinato tiocinase'},
        ],
        explC:'A baixa excreção urinária de riboflavina deste paciente sugere uma deficiência significativa na ingestão de riboflavina. A deficiência sintomática de riboflavina é rara nos Estados Unidos, mas pode ser observada no uso crônico de álcool e em pacientes gravemente desnutridos. As manifestações clínicas incluem estomatite angular, queilite, glossite, dermatite seborreica, alterações oculares (por exemplo, ceratite, neovascularização corneana) e anemia.\n\nAs coenzimas contendo riboflavina (vitamina B2) são constituintes-chave da cadeia de transporte de elétrons. Tipicamente, a riboflavina é primeiro fosforilada para se tornar flavina mononucleotídeo (FMN), que pode então ser integrada a um complexo coenzima-flavina ou ser ainda mais fosforilada a flavina adenina dinucleotídeo (FAD). FMN e FAD participam como coenzimas em numerosas reações de oxirredução e são convertidas em estados reduzidos e ricos em energia (FMNH2 e FADH2) através da aceitação de elétrons.\n\nFMN é um componente do complexo I, enquanto o FAD funciona como componente da succinato desidrogenase (complexo II). O complexo II participa tanto da cadeia de transporte de elétrons quanto do ciclo do ácido tricarboxílico (ciclo de Krebs). Durante o ciclo de Krebs, a succinato desidrogenase converte succinato em fumarato e transfere elétrons para a coenzima Q (ubiquinona) via FAD. O complexo II também aceita elétrons de outras fontes de FADH2, como a beta-oxidação de ácidos graxos.',
        explI:[
          {option:'A, D, E, and G', explanation:'Isocitrato desidrogenase, succinato tiocinase, malato desidrogenase e fumarase são enzimas que participam do ciclo de Krebs, mas não utilizam FAD ou FMN como cofatores.'},
          {option:'B', explanation:'A glutationa reduzida é um antioxidante que minimiza o dano oxidativo em muitas células. A glutationa redutase regenera a glutationa reduzida usando nicotinamida adenina dinucleotídeo fosfato (NADPH) como doador de elétrons e FAD como cofator. Embora a glicose-6-fosfato desidrogenase (G6PD) seja a enzima limitante da via das pentoses fosfato e forneça o NADPH necessário, ela não utiliza FAD como cofator.'},
          {option:'C', explanation:'A HMG-CoA redutase é a enzima limitante da via de síntese do colesterol. FMN e FAD não são utilizados como cofatores.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0022', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'An 8-month-old boy is evaluated for developmental delay, failure to thrive, and episodic seizures. Physical examination shows ophthalmoplegia and hypotonia. Laboratory studies reveal an elevated serum lactate level. Further histochemical studies show severely reduced pyruvate dehydrogenase enzyme activity in both freshly isolated peripheral blood lymphocytes and cultured fibroblasts.',
      q:'Increasing which of the following substances in his diet is most likely to help this patient generate energy without further elevating lactate levels?',
      options:[
        {label:'A', text:'Alanine'},
        {label:'B', text:'Asparagine'},
        {label:'C', text:'Galactose'},
        {label:'D', text:'Glycerol'},
        {label:'E', text:'Lysine'},
        {label:'F', text:'Serine'},
      ],
      correct:'E',
      explC:'This patient has pyruvate dehydrogenase deficiency, an inherited inborn error of metabolism often presenting in infancy with lactic acidosis and neurologic defects. The disease results from deficient activity of the pyruvate dehydrogenase complex, a multi-enzyme complex generating acetyl-CoA from pyruvate, thereby linking glycolysis and the TCA cycle. Dietary carbohydrates are broken down into pyruvate via glycolysis; in patients with pyruvate dehydrogenase deficiency, the lack of enzymatic activity leads to a buildup of pyruvate, which is shunted to lactate via lactate dehydrogenase, generating a potentially life-threatening lactic acidosis.\n\nDisease management involves the implementation of a ketogenic diet: a high-fat, low-carbohydrate diet with moderate levels of protein. This diet forces the production of ketone bodies from fat and amino acid catabolism to fuel the body in the place of glucose. The near-absence of glucose in the diet decreases the amount of pyruvate generated, thereby decreasing lactate levels.\n\nAmino acid catabolism results in formation of intermediates that are referred to as glucogenic, ketogenic, or both. Glucogenic amino acid metabolism produces pyruvate or TCA cycle intermediates, which can be converted to glucose via gluconeogenesis. Ketogenic amino acid metabolism generates the ketone body precursor acetyl-CoA. Lysine and leucine are exclusively ketogenic amino acids; they cannot be metabolized to pyruvate and consumption will not lead to increased production of lactic acid.',
      explI:[
        {option:'A and F', explanation:'The non-essential glucogenic amino acids alanine and serine can be converted to pyruvate through a transamination reaction catalyzed by alanine transaminase and a deamination reaction catalyzed by serine dehydratase, respectively.'},
        {option:'B', explanation:'Asparagine is catabolized to aspartate and subsequently transaminated to produce glutamate and oxaloacetate, an intermediate of the TCA cycle. Oxaloacetate by itself cannot be used to produce energy; it must first undergo condensation with acetyl-CoA to form citrate.'},
        {option:'C', explanation:'The monosaccharide galactose is metabolized in the glycolytic pathway; dietary intake will result in elevated levels of lactate in patients with pyruvate dehydrogenase deficiency.'},
        {option:'D', explanation:'Glycerol is metabolized to glyceraldehyde 3-phosphate, a glycolysis intermediate. It can be used as a substrate to form pyruvate and, subsequently, lactate.'},
      ],
      objective:'Pyruvate dehydrogenase complex deficiency is an inherited inborn error of metabolism causing lactic acidosis and neurologic defects. Patients are unable to convert pyruvate to acetyl-CoA, resulting in a shunting of pyruvate to lactic acid. In these patients, metabolism of exclusively ketogenic amino acids (eg, lysine, leucine) can provide energy in the form of acetyl-CoA without increasing lactate production.',
      peer:{A:33, B:9, C:8, D:14, E:31, F:2},
      labs:[
        ['Lactate, plasma (infant)', '0.22–2.98 mmol/L (approx. <2 mmol/L at rest)', '0,22–2,98 mmol/L (aprox. <2 mmol/L em repouso)',
         'Elevated in pyruvate dehydrogenase deficiency due to shunting of pyruvate to lactate',
         'Elevado na deficiência de piruvato desidrogenase pelo desvio do piruvato para lactato'],
      ],
      ptTranslation:{
        vignette:'Um menino de 8 meses é avaliado por atraso no desenvolvimento, falha no crescimento e convulsões episódicas. O exame físico mostra oftalmoplegia e hipotonia. Os exames laboratoriais revelam nível sérico elevado de lactato. Estudos histoquímicos adicionais mostram atividade enzimática da piruvato desidrogenase severamente reduzida tanto em linfócitos do sangue periférico recém-isolados quanto em fibroblastos cultivados.',
        q:'Aumentar qual das seguintes substâncias na dieta dele provavelmente mais ajudaria este paciente a gerar energia sem elevar ainda mais os níveis de lactato?',
        objective:'A deficiência do complexo piruvato desidrogenase é um erro inato do metabolismo hereditário que causa acidose láctica e déficits neurológicos. Os pacientes são incapazes de converter piruvato em acetil-CoA, resultando no desvio do piruvato para ácido láctico. Nesses pacientes, o metabolismo de aminoácidos exclusivamente cetogênicos (por exemplo, lisina, leucina) pode fornecer energia na forma de acetil-CoA sem aumentar a produção de lactato.',
        options:[
          {label:'A', text:'Alanina'},
          {label:'B', text:'Asparagina'},
          {label:'C', text:'Galactose'},
          {label:'D', text:'Glicerol'},
          {label:'E', text:'Lisina'},
          {label:'F', text:'Serina'},
        ],
        explC:'Este paciente tem deficiência de piruvato desidrogenase, um erro inato do metabolismo hereditário que frequentemente se apresenta na infância com acidose láctica e déficits neurológicos. A doença resulta de atividade deficiente do complexo piruvato desidrogenase, um complexo multienzimático que gera acetil-CoA a partir do piruvato, ligando assim a glicólise ao ciclo de Krebs. Os carboidratos da dieta são degradados a piruvato pela glicólise; em pacientes com deficiência de piruvato desidrogenase, a falta de atividade enzimática leva a um acúmulo de piruvato, que é desviado para lactato pela lactato desidrogenase, gerando uma acidose láctica potencialmente fatal.\n\nO manejo da doença envolve a implementação de uma dieta cetogênica: uma dieta rica em gordura e pobre em carboidratos, com níveis moderados de proteína. Essa dieta força a produção de corpos cetônicos a partir do catabolismo de gordura e aminoácidos para suprir energia ao corpo no lugar da glicose. A quase ausência de glicose na dieta diminui a quantidade de piruvato gerado, diminuindo assim os níveis de lactato.\n\nO catabolismo de aminoácidos resulta na formação de intermediários chamados glicogênicos, cetogênicos, ou ambos. O metabolismo de aminoácidos glicogênicos produz piruvato ou intermediários do ciclo de Krebs, que podem ser convertidos em glicose pela gliconeogênese. O metabolismo de aminoácidos cetogênicos gera o precursor de corpos cetônicos, acetil-CoA. Lisina e leucina são aminoácidos exclusivamente cetogênicos; eles não podem ser metabolizados a piruvato, e seu consumo não levará ao aumento da produção de ácido láctico.',
        explI:[
          {option:'A and F', explanation:'Os aminoácidos glicogênicos não essenciais alanina e serina podem ser convertidos em piruvato por meio de uma reação de transaminação catalisada pela alanina transaminase e de uma reação de desaminação catalisada pela serina desidratase, respectivamente.'},
          {option:'B', explanation:'A asparagina é catabolizada a aspartato e, em seguida, transaminada para produzir glutamato e oxaloacetato, um intermediário do ciclo de Krebs. O oxaloacetato isoladamente não pode ser usado para produzir energia; ele precisa primeiro sofrer condensação com acetil-CoA para formar citrato.'},
          {option:'C', explanation:'O monossacarídeo galactose é metabolizado pela via glicolítica; sua ingestão na dieta resultará em níveis elevados de lactato em pacientes com deficiência de piruvato desidrogenase.'},
          {option:'D', explanation:'O glicerol é metabolizado a gliceraldeído 3-fosfato, um intermediário da glicólise. Ele pode ser usado como substrato para formar piruvato e, subsequentemente, lactato.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0023', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'medium',
      vignette:'An 8-year-old boy is evaluated for exercise intolerance. The patient experiences fatigue, muscle pain, and cramps during exercise as well as severe muscle stiffness following strenuous activity. Physical examination is unremarkable. A forearm ischemic exercise test is performed by applying a blood pressure cuff on the patient\'s exercising forearm and sampling blood lactate several minutes after the exercise. The patient\'s blood samples show no rise in lactate levels. Biochemical analysis of a muscle biopsy reveals absent lactate dehydrogenase activity.',
      q:'In this patient, strenuous exercise leads to inhibition of glycolysis in skeletal muscle due to intracellular depletion of which of the following substances?',
      options:[
        {label:'A', text:'AMP'},
        {label:'B', text:'Carnitine'},
        {label:'C', text:'Citrate'},
        {label:'D', text:'FADH2'},
        {label:'E', text:'NAD+'},
        {label:'F', text:'Pyruvate'},
      ],
      correct:'E',
      explC:'In glycolysis, glucose is metabolized to pyruvate. Under aerobic conditions, pyruvate is converted to acetyl-CoA to enter the tricarboxylic acid (TCA) cycle. When oxygen is depleted (eg, in exercising muscle), pyruvate is converted to lactate (anaerobic glycolysis).\n\nDuring glycolysis, glyceraldehyde-3-phosphate (G3P) is converted to 1-3-bisphosphoglycerate (BPG) by the enzyme G3P dehydrogenase. This enzyme reduces NAD+ to NADH. NAD+ is present in limited amounts in most cells, and it must be regenerated from NADH for glycolysis to continue. Under aerobic conditions, NAD+ is converted to NADH in the TCA cycle. NADH is then reconverted to NAD+ in the electron transport chain as the energy in NADH is utilized to synthesize ATP.\n\nIn anaerobic glycolysis, NAD+ is regenerated from NADH when pyruvate is converted to lactate via lactate dehydrogenase. In patients with lactate dehydrogenase deficiency, glycolysis is inhibited in strenuously exercising muscle as muscle cells cannot regenerate NAD+. Consequently, high-intensity physical activity leads to muscle breakdown, pain, and fatigue as insufficient amounts of energy are being produced in the exercising muscle.',
      explI:[
        {option:'A', explanation:'During muscle contraction, glycogen is broken down via glycogen phosphorylase for energy production by the glycolytic pathway. Epinephrine causes cyclic AMP-mediated phosphorylation of glycogen phosphorylase, which activates this enzyme. Non-phosphorylation-dependent activation of glycogen phosphorylase can occur during muscle contraction via increased intracellular calcium concentrations and via AMP under extreme conditions.'},
        {option:'B', explanation:'Carnitine is an amino acid derivative responsible for transporting fatty acids into the mitochondria for beta-oxidation. Carnitine is synthesized from lysine and methionine; vitamin C is essential for this synthesis.'},
        {option:'C', explanation:'Citrate is formed from the condensation of acetyl CoA with oxaloacetate in the first step of the TCA cycle. Increased citrate concentrations decrease glycolysis as citrate is a powerful allosteric inhibitor of phosphofructokinase-1. In exercising muscles under anaerobic conditions, oxidative phosphorylation of glucose through the citric acid cycle is not a dominant pathway; therefore, excess citrate is not produced.'},
        {option:'D', explanation:'FADH2 is not produced in glycolysis. FADH2 is produced from FAD during the conversion of succinate to fumarate in the TCA cycle by the enzyme succinate dehydrogenase.'},
        {option:'F', explanation:'In glycolysis, pyruvate is formed from phosphoenolpyruvate by a unidirectional enzyme called pyruvate kinase. In the absence of lactate dehydrogenase activity, pyruvate will accumulate in the cell under anaerobic conditions.'},
      ],
      objective:'Under anaerobic conditions, NADH transfers electrons to pyruvate to form lactate and regenerate NAD+. NAD+ is required to convert glyceraldehyde-3-phosphate to 1-3-bisphosphoglycerate in glycolysis.',
      peer:{A:6, B:3, C:4, D:3, E:63, F:19},
      img:'assets/qbank/CMQ-STEP1-BCH-0023_anaerobic_glycolysis_lactate_dehydrogenase.png',
      labs:[
        ['Lactate, venous (post-ischemic forearm exercise)', 'Normal: 3- to 5-fold rise above baseline within 5 min (baseline <2.2 mmol/L)', 'Normal: aumento de 3 a 5 vezes acima do basal em 5 min (basal <2,2 mmol/L)',
         'Fails to rise in lactate dehydrogenase deficiency (glycogen storage disease XI) due to impaired anaerobic glycolysis',
         'Não se eleva na deficiência de lactato desidrogenase (glicogenose tipo XI) por glicólise anaeróbica prejudicada'],
      ],
      ptTranslation:{
        vignette:'Um menino de 8 anos é avaliado por intolerância ao exercício. O paciente apresenta fadiga, dor muscular e cãibras durante o exercício, além de rigidez muscular importante após atividade extenuante. O exame físico é normal. Um teste de exercício isquêmico do antebraço é realizado aplicando-se um manguito de pressão arterial no antebraço do paciente durante o exercício e coletando amostras de lactato sanguíneo vários minutos após o exercício. As amostras de sangue do paciente não mostram elevação nos níveis de lactato. A análise bioquímica de uma biópsia muscular revela ausência de atividade da lactato desidrogenase.',
        q:'Neste paciente, o exercício extenuante leva à inibição da glicólise no músculo esquelético devido à depleção intracelular de qual das seguintes substâncias?',
        objective:'Em condições anaeróbicas, o NADH transfere elétrons ao piruvato para formar lactato e regenerar NAD+. O NAD+ é necessário para converter gliceraldeído-3-fosfato em 1,3-bisfosfoglicerato na glicólise.',
        options:[
          {label:'A', text:'AMP'},
          {label:'B', text:'Carnitina'},
          {label:'C', text:'Citrato'},
          {label:'D', text:'FADH2'},
          {label:'E', text:'NAD+'},
          {label:'F', text:'Piruvato'},
        ],
        explC:'Na glicólise, a glicose é metabolizada a piruvato. Em condições aeróbicas, o piruvato é convertido em acetil-CoA para entrar no ciclo do ácido tricarboxílico (ciclo de Krebs). Quando o oxigênio está depletado (por exemplo, no músculo em exercício), o piruvato é convertido em lactato (glicólise anaeróbica).\n\nDurante a glicólise, o gliceraldeído-3-fosfato (G3P) é convertido em 1,3-bisfosfoglicerato (BPG) pela enzima G3P desidrogenase. Essa enzima reduz NAD+ a NADH. O NAD+ está presente em quantidades limitadas na maioria das células e precisa ser regenerado a partir do NADH para que a glicólise continue. Em condições aeróbicas, o NAD+ é regenerado no ciclo de Krebs. O NADH é então reconvertido em NAD+ na cadeia de transporte de elétrons, à medida que a energia do NADH é utilizada para sintetizar ATP.\n\nNa glicólise anaeróbica, o NAD+ é regenerado a partir do NADH quando o piruvato é convertido em lactato pela lactato desidrogenase. Em pacientes com deficiência de lactato desidrogenase, a glicólise é inibida no músculo sob exercício intenso, pois as células musculares não conseguem regenerar NAD+. Consequentemente, a atividade física de alta intensidade leva a lesão muscular, dor e fadiga, já que quantidades insuficientes de energia são produzidas no músculo em exercício.',
        explI:[
          {option:'A', explanation:'Durante a contração muscular, o glicogênio é degradado pela glicogênio fosforilase para produção de energia pela via glicolítica. A epinefrina causa fosforilação da glicogênio fosforilase mediada por AMP cíclico, o que ativa essa enzima. A ativação da glicogênio fosforilase independente de fosforilação pode ocorrer durante a contração muscular por meio do aumento das concentrações intracelulares de cálcio e, em condições extremas, por meio do AMP.'},
          {option:'B', explanation:'A carnitina é um derivado de aminoácido responsável por transportar ácidos graxos para dentro da mitocôndria para a beta-oxidação. A carnitina é sintetizada a partir de lisina e metionina; a vitamina C é essencial para essa síntese.'},
          {option:'C', explanation:'O citrato é formado pela condensação de acetil-CoA com oxaloacetato na primeira etapa do ciclo de Krebs. O aumento das concentrações de citrato diminui a glicólise, já que o citrato é um potente inibidor alostérico da fosfofrutoquinase-1. Em músculos em exercício sob condições anaeróbicas, a fosforilação oxidativa da glicose pelo ciclo do ácido cítrico não é uma via predominante; portanto, o excesso de citrato não é produzido.'},
          {option:'D', explanation:'O FADH2 não é produzido na glicólise. O FADH2 é produzido a partir do FAD durante a conversão de succinato em fumarato no ciclo de Krebs, pela enzima succinato desidrogenase.'},
          {option:'F', explanation:'Na glicólise, o piruvato é formado a partir do fosfoenolpiruvato por uma enzima unidirecional chamada piruvato cinase. Na ausência de atividade da lactato desidrogenase, o piruvato se acumula na célula sob condições anaeróbicas.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0024', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'A 35-year-old man comes to the office with progressively worsening fatigue associated with dark urine and back pain. Two days ago, the patient ate some large, flat beans brought home by his wife after a business trip to Egypt. Physical examination shows jaundice and pallor. Laboratory results reveal a hemoglobin level of 8 g/dL. Further evaluation reveals deficiency of an enzyme involved in the conversion of glucose-6-phosphate to ribulose-5-phosphate.',
      q:'The substance generated during this conversion is necessary for which of the following biochemical processes?',
      options:[
        {label:'A', text:'ADP phosphorylation'},
        {label:'B', text:'Fatty acid synthesis'},
        {label:'C', text:'Glycogen storage'},
        {label:'D', text:'Ketone body synthesis'},
        {label:'E', text:'Protein degradation'},
      ],
      correct:'B',
      explC:'This patient most likely has glucose-6-phosphate dehydrogenase (G6PD) deficiency. G6PD catalyzes the first step in the pentose phosphate pathway (PPP), the oxidative portion of which generates 2 molecules of NADPH while converting glucose-6-phosphate to ribulose-5-phosphate. The nonoxidative reactions of the PPP reversibly convert ribulose-5-phosphate into ribose-5-phosphate (substrate for nucleotide synthesis) or glycolytic intermediates that can be used for energy production.\n\nBecause the PPP is the main source of NADPH, the pathway is particularly active in:\n- Cells experiencing high oxidative stress (eg, erythrocytes) in which NADPH is used to regenerate reduced glutathione, an antioxidant that helps maintain cell integrity\n- Organs such as the liver and adrenal cortex that are involved in reductive biosynthesis (eg, synthesis of fatty acids, cholesterol, steroids) and cytochrome P450 metabolism\n- Phagocytic cells generating a respiratory burst via NADPH oxidase\n\nIn patients with G6PD deficiency, erythrocytes are unable to maintain a sufficient supply of reduced glutathione during periods of increased oxidative stress, which can occur with certain infections (eg, pneumonia, viral hepatitis), consumption of fava beans, or specific medications (eg, primaquine, sulfa drugs). The resulting oxidative damage causes acute hemolytic anemia and jaundice.',
      explI:[
        {option:'A', explanation:'NADH can be used as a reducing agent to convert ADP to ATP during oxidative phosphorylation. In contrast to NADH, NADPH cannot be used to convert ADP into ATP.'},
        {option:'C', explanation:'Glycogenesis is the process by which glucose is stored for later use through the addition of glucose molecules to glycogen chains. It does not require NADPH.'},
        {option:'D', explanation:'Ketone bodies are formed mainly in the liver during times of fasting when there is increased fat degradation. Cytosolic HMG-CoA synthase is the starting point of cholesterol synthesis whereas the mitochondrial version of the enzyme is the rate-limiting step in ketone body synthesis. Unlike cholesterol synthesis, ketone body production does not require NADPH.'},
        {option:'E', explanation:'Protein catabolism begins with the hydrolysis of polypeptides into amino acids. These subsequently undergo transamination reactions that funnel the amine nitrogen predominately into glutamate, which is oxidatively deaminated to produce ammonia. The urea cycle then converts ammonia into urea for elimination in the urine.'},
      ],
      objective:'Glucose-6-phosphate dehydrogenase is the rate-limiting enzyme in the pentose phosphate pathway, the major source of cellular NADPH. This molecule is necessary for reducing glutathione (protects red blood cells from oxidative damage) and for the biosynthesis of cholesterol, fatty acids, and steroids.',
      peer:{A:30, B:43, C:10, D:8, E:7},
      img:'assets/qbank/CMQ-STEP1-BCH-0024_pentose_phosphate_pathway.png',
      labs:[
        ['Bilirubin, indirect (unconjugated)', '0.2–0.8 mg/dL (adult)', '0,2–0,8 mg/dL (adulto)',
         'Elevated in G6PD deficiency due to acute hemolysis',
         'Elevada na deficiência de G6PD por hemólise aguda'],
      ],
      ptTranslation:{
        vignette:'Um homem de 35 anos vem ao consultório com fadiga progressivamente piorando, associada a urina escura e dor lombar. Há dois dias, o paciente comeu algumas favas grandes e achatadas que sua esposa trouxe para casa após uma viagem de negócios ao Egito. O exame físico mostra icterícia e palidez. Os resultados laboratoriais revelam um nível de hemoglobina de 8 g/dL. A avaliação adicional revela deficiência de uma enzima envolvida na conversão de glicose-6-fosfato em ribulose-5-fosfato.',
        q:'A substância gerada durante essa conversão é necessária para qual dos seguintes processos bioquímicos?',
        objective:'A glicose-6-fosfato desidrogenase é a enzima limitante da via das pentoses fosfato, a principal fonte de NADPH celular. Essa molécula é necessária para a redução da glutationa (que protege as hemácias do dano oxidativo) e para a biossíntese de colesterol, ácidos graxos e esteroides.',
        options:[
          {label:'A', text:'Fosforilação de ADP'},
          {label:'B', text:'Síntese de ácidos graxos'},
          {label:'C', text:'Armazenamento de glicogênio'},
          {label:'D', text:'Síntese de corpos cetônicos'},
          {label:'E', text:'Degradação de proteínas'},
        ],
        explC:'Este paciente provavelmente tem deficiência de glicose-6-fosfato desidrogenase (G6PD). A G6PD catalisa a primeira etapa da via das pentoses fosfato (VPP), cuja porção oxidativa gera 2 moléculas de NADPH ao converter glicose-6-fosfato em ribulose-5-fosfato. As reações não oxidativas da VPP convertem reversivelmente a ribulose-5-fosfato em ribose-5-fosfato (substrato para a síntese de nucleotídeos) ou em intermediários glicolíticos que podem ser usados para produção de energia.\n\nComo a VPP é a principal fonte de NADPH, a via é particularmente ativa em:\n- Células que sofrem alto estresse oxidativo (por exemplo, eritrócitos), nas quais o NADPH é usado para regenerar a glutationa reduzida, um antioxidante que ajuda a manter a integridade celular\n- Órgãos como o fígado e o córtex adrenal, envolvidos em biossíntese redutiva (por exemplo, síntese de ácidos graxos, colesterol, esteroides) e no metabolismo via citocromo P450\n- Células fagocíticas que geram explosão respiratória via NADPH oxidase\n\nEm pacientes com deficiência de G6PD, os eritrócitos são incapazes de manter um suprimento suficiente de glutationa reduzida durante períodos de estresse oxidativo aumentado, o que pode ocorrer com certas infecções (por exemplo, pneumonia, hepatite viral), consumo de favas, ou medicamentos específicos (por exemplo, primaquina, sulfas). O dano oxidativo resultante causa anemia hemolítica aguda e icterícia.',
        explI:[
          {option:'A', explanation:'O NADH pode ser usado como agente redutor para converter ADP em ATP durante a fosforilação oxidativa. Diferentemente do NADH, o NADPH não pode ser usado para converter ADP em ATP.'},
          {option:'C', explanation:'A glicogênese é o processo pelo qual a glicose é armazenada para uso posterior por meio da adição de moléculas de glicose às cadeias de glicogênio. Não requer NADPH.'},
          {option:'D', explanation:'Os corpos cetônicos são formados principalmente no fígado durante períodos de jejum, quando há aumento da degradação de gordura. A HMG-CoA sintase citosólica é o ponto de partida da síntese de colesterol, enquanto a versão mitocondrial da enzima é a etapa limitante da síntese de corpos cetônicos. Diferentemente da síntese de colesterol, a produção de corpos cetônicos não requer NADPH.'},
          {option:'E', explanation:'O catabolismo proteico começa com a hidrólise de polipeptídeos em aminoácidos. Esses aminoácidos sofrem então reações de transaminação que canalizam o nitrogênio amínico predominantemente para o glutamato, que é desaminado oxidativamente para produzir amônia. O ciclo da ureia então converte a amônia em ureia para eliminação na urina.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0025', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'An 11-year-old girl is evaluated for blurry vision. The patient was adopted internationally at age 9. She has no history of head or eye trauma or exposure to ionizing radiation. Motor and cognitive milestones have been achieved at the appropriate age. She has a good appetite and does not follow any specific diet. The patient takes no medications and has no allergies. Vaccinations are up to date. Vital signs are normal. She is at the 40th percentile for height and weight. Other than bilateral lens opacities, the rest of her examination is normal. Urine is positive for reducing substances.',
      q:'Deficient activity of which of the following enzymes is the most likely cause of this patient\'s eye condition?',
      options:[
        {label:'A', text:'Aldolase B'},
        {label:'B', text:'Alpha-galactosidase A'},
        {label:'C', text:'Fructokinase'},
        {label:'D', text:'Galactokinase'},
        {label:'E', text:'Glucose-6-phosphatase'},
        {label:'F', text:'Hexosaminidase A'},
        {label:'G', text:'Sphingomyelinase'},
      ],
      correct:'D',
      explC:'This patient most likely has a form of galactosemia, a condition that results from deficiency of enzymes involved in galactose metabolism. Her late presentation, normal growth, and the isolated presence of cataracts are particularly suggestive of galactokinase (GALK) deficiency.\n\nAfter lactose is broken down to galactose and glucose, galactose is normally phosphorylated to galactose-1-phosphate by GALK. Deficiency causes galactose buildup and this excess is converted to galactitol, an osmotic agent that causes cataracts. Excess galactose also spills into the urine and causes it to test positive for a reducing substance.\n\nSerious systemic manifestations are typically not seen in GALK deficiency, and cataracts are frequently the only manifestation (some developmental milestones [eg, social smile] may be impacted if they occur early in life). In contrast, galactose-1-phosphate uridyl transferase (GALT) deficiency results in a more serious form of galactosemia. This is related to the accumulation of galactose-1-phosphate, a toxic metabolite that causes hepatic and renal dysfunction; patients with GALT deficiency present early, in the neonatal period, with vomiting, lethargy, and failure to thrive.',
      explI:[
        {option:'A', explanation:'Patients with aldolase B deficiency (hereditary fructose intolerance) cannot metabolize fructose and develop hypoglycemia, hypophosphatemia, and failure to thrive. Although reducing substances can be positive in the urine, cataracts are not present.'},
        {option:'B', explanation:'Alpha-galactosidase A deficiency (X-linked recessive) results in Fabry disease, which can present with cataracts. However, neurological findings (eg, numbness, tingling, burning pain in the hands and feet) and angiokeratomas are also characteristic.'},
        {option:'C', explanation:'Fructokinase deficiency leads to essential fructosuria, a benign condition that can result in a positive test for reducing substance but not cataracts.'},
        {option:'E', explanation:'Glucose-6-phosphatase converts glucose-6-phosphate to glucose. Glucose-6-phosphatase deficiency causes glycogen storage disease type 1 (von Gierke disease). The main clinical manifestations are hypoglycemia, lactic acidosis, hepatomegaly, and hypertriglyceridemia. Cataracts are not seen.'},
        {option:'F', explanation:'Tay-Sachs disease results from hexosaminidase A deficiency. Affected infants have retinal cherry-red spots and loss of motor skills. Cataracts are not seen.'},
        {option:'G', explanation:'Sphingomyelinase deficiency is seen in Niemann-Pick disease and leads to accumulation of sphingomyelin. Characteristics include hepatosplenomegaly, motor neuropathy, anemia, and macular cherry-red spots but not cataracts.'},
      ],
      objective:'Lenticular accumulation of galactitol in the lenses of patients with galactosemia can cause osmotic damage and development of cataracts. Cataracts are frequently the only manifestation of galactokinase deficiency.',
      peer:{A:17, B:7, C:11, D:47, E:2, F:6, G:6},
      img:'assets/qbank/CMQ-STEP1-BCH-0025_galactose_metabolism_pathway.png',
      labs:[
        ['Urine reducing substances (Clinitest)', 'Negative', 'Negativo',
         'Positive (non-glucose reducing substance) in galactosemia/galactokinase deficiency due to urinary galactose excretion; Clinistix (glucose oxidase-specific) remains negative',
         'Positivo (substância redutora não-glicose) na galactosemia/deficiência de galactocinase por excreção urinária de galactose; o Clinistix (específico para glicose) permanece negativo'],
      ],
      ptTranslation:{
        vignette:'Uma menina de 11 anos é avaliada por visão turva. A paciente foi adotada internacionalmente aos 9 anos de idade. Não tem história de trauma craniano ou ocular, nem exposição à radiação ionizante. Os marcos motores e cognitivos foram alcançados na idade apropriada. Ela tem bom apetite e não segue nenhuma dieta específica. A paciente não toma nenhum medicamento e não tem alergias. As vacinas estão em dia. Os sinais vitais são normais. Ela está no percentil 40 para altura e peso. Além de opacidades bilaterais do cristalino, o restante do exame é normal. A urina é positiva para substâncias redutoras.',
        q:'A atividade deficiente de qual das seguintes enzimas é a causa mais provável da condição ocular desta paciente?',
        objective:'O acúmulo lenticular de galactitol no cristalino de pacientes com galactosemia pode causar dano osmótico e desenvolvimento de catarata. A catarata é frequentemente a única manifestação da deficiência de galactocinase.',
        options:[
          {label:'A', text:'Aldolase B'},
          {label:'B', text:'Alfa-galactosidase A'},
          {label:'C', text:'Frutocinase'},
          {label:'D', text:'Galactocinase'},
          {label:'E', text:'Glicose-6-fosfatase'},
          {label:'F', text:'Hexosaminidase A'},
          {label:'G', text:'Esfingomielinase'},
        ],
        explC:'Esta paciente provavelmente tem uma forma de galactosemia, uma condição que resulta da deficiência de enzimas envolvidas no metabolismo da galactose. Sua apresentação tardia, crescimento normal e a presença isolada de catarata são particularmente sugestivos de deficiência de galactocinase (GALK).\n\nApós a lactose ser degradada em galactose e glicose, a galactose é normalmente fosforilada a galactose-1-fosfato pela GALK. A deficiência causa acúmulo de galactose, e esse excesso é convertido em galactitol, um agente osmótico que causa catarata. O excesso de galactose também extravasa para a urina, tornando-a positiva para substância redutora.\n\nManifestações sistêmicas graves tipicamente não são vistas na deficiência de GALK, e a catarata frequentemente é a única manifestação (alguns marcos do desenvolvimento [por exemplo, sorriso social] podem ser afetados se ocorrerem precocemente na vida). Em contraste, a deficiência de galactose-1-fosfato uridiltransferase (GALT) resulta em uma forma mais grave de galactosemia. Isso está relacionado ao acúmulo de galactose-1-fosfato, um metabólito tóxico que causa disfunção hepática e renal; pacientes com deficiência de GALT apresentam-se precocemente, no período neonatal, com vômitos, letargia e falha no crescimento.',
        explI:[
          {option:'A', explanation:'Pacientes com deficiência de aldolase B (intolerância hereditária à frutose) não conseguem metabolizar frutose e desenvolvem hipoglicemia, hipofosfatemia e falha no crescimento. Embora substâncias redutoras possam ser positivas na urina, catarata não está presente.'},
          {option:'B', explanation:'A deficiência de alfa-galactosidase A (recessiva ligada ao X) resulta na doença de Fabry, que pode se apresentar com catarata. Entretanto, achados neurológicos (por exemplo, dormência, formigamento, dor em queimação nas mãos e pés) e angioqueratomas também são característicos.'},
          {option:'C', explanation:'A deficiência de frutocinase leva à frutosúria essencial, uma condição benigna que pode resultar em teste positivo para substância redutora, mas não em catarata.'},
          {option:'E', explanation:'A glicose-6-fosfatase converte glicose-6-fosfato em glicose. A deficiência de glicose-6-fosfatase causa a doença do armazenamento de glicogênio tipo 1 (doença de von Gierke). As principais manifestações clínicas são hipoglicemia, acidose láctica, hepatomegalia e hipertrigliceridemia. Catarata não é observada.'},
          {option:'F', explanation:'A doença de Tay-Sachs resulta da deficiência de hexosaminidase A. Os bebês afetados apresentam manchas vermelho-cereja na retina e perda de habilidades motoras. Catarata não é observada.'},
          {option:'G', explanation:'A deficiência de esfingomielinase é observada na doença de Niemann-Pick e leva ao acúmulo de esfingomielina. As características incluem hepatoesplenomegalia, neuropatia motora, anemia e manchas vermelho-cereja maculares, mas não catarata.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0026', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'A 2-month-old boy is brought to the emergency department due to irritability and vomiting. The patient is exclusively breastfed but has not been tolerating feeds since yesterday. Urine output has decreased. The mother has a history of obesity and had gastric bypass surgery several years prior to pregnancy. Temperature is 37 C (98.6 F), pulse is 190/min, and respirations are 60/min. The patient is in moderate respiratory distress and has an enlarged liver. Physical examination is otherwise normal. Chest radiography reveals cardiomegaly. Further work-up shows impaired carbohydrate metabolism with increased serum levels of lactate and decreased erythrocyte transketolase activity.',
      q:'Which of the following additional enzymes is most likely to have impaired activity in this patient?',
      options:[
        {label:'A', text:'Alpha-1,4-glucosidase'},
        {label:'B', text:'Alpha-L-iduronidase'},
        {label:'C', text:'Galactose-1-phosphate uridyltransferase'},
        {label:'D', text:'Glucose-6-phosphatase'},
        {label:'E', text:'Pyruvate dehydrogenase'},
      ],
      correct:'E',
      explC:'Thiamine deficiency — Risk factors: malnutrition (eg, chronic alcohol use, anorexia, gastric bypass surgery). Pathophysiology: impaired reactions of thiamine-dependent enzymes* → decreased glucose metabolism and ATP production. Presentation: beriberi — "wet": cardiomyopathy, heart failure; "dry": symmetric peripheral neuropathy (motor and sensory); Wernicke encephalopathy: encephalopathy, oculomotor dysfunction, ataxia. Management: thiamine supplementation. *Thiamine is a cofactor for transketolase, pyruvate dehydrogenase, and alpha-ketoglutarate dehydrogenase.\n\nThis patient has decreased activity of erythrocyte transketolase (ETKA), a thiamine-dependent enzyme in the pentose phosphate pathway. This finding is essentially diagnostic for thiamine (vitamin B1) deficiency. The primary risk factor for thiamine deficiency is malnutrition; in this case, gastric bypass surgery without appropriate micronutrient supplementation likely led to maternal thiamine deficiency and, in turn, to deficiency in this exclusively breastfed infant.\n\nIn addition to involvement in transketolase activity, thiamine is a cofactor for other enzymes involved in glucose metabolism (eg, 2-carbon transfer, decarboxylation), including alpha-ketoglutarate dehydrogenase and pyruvate dehydrogenase (converts pyruvate to acetyl-CoA). Impaired pyruvate dehydrogenase activity diverts pyruvate to the anaerobic glycolysis pathway, which produces lactate. Lactic acidosis leads to decreased peripheral vascular resistance, which contributes to the classic finding of high-output heart failure. However, over time, direct impairment of myocyte energy production leads to reduced cardiac contractility and a low-output state.\n\nMyocardial dysfunction due to thiamine deficiency is referred to as wet beriberi. Infantile beriberi is rare but often fulminant, with symptoms related to pulmonary/systemic fluid overload, including feeding intolerance and respiratory distress, as well as cardiomegaly and hepatomegaly, as seen in this patient. Wet beriberi can be fatal without prompt thiamine supplementation.',
      explI:[
        {option:'A', explanation:'Alpha-1,4-glucosidase deficiency (Pompe disease) causes cardiomegaly due to glycogen accumulation in myocytes; heart failure can lead to hepatomegaly. Infants typically have profound weakness and hypotonia, findings not present in this patient. Moreover, ETKA and lactate would be normal.'},
        {option:'B', explanation:'Alpha-L-iduronidase deficiency (Hurler syndrome) results in the accumulation of glycosaminoglycans and often presents with hepatomegaly; heart failure can also occur. In contrast to this patient, characteristic coarse facial features and recurrent respiratory infections are expected; serum lactate and ETKA would be normal.'},
        {option:'C', explanation:'Galactose-1-phosphate uridyltransferase deficiency (galactosemia) results in impaired galactose metabolism. Hepatomegaly and vomiting are common and typically develop in the first week of life and are associated with jaundice and hypotonia. ETKA would be normal.'},
        {option:'D', explanation:'Glucose-6-phosphatase deficiency (von Gierke disease) results in accumulation of glycogen in the liver, causing hepatomegaly; lactic acidosis is common. However, cardiomegaly would not be seen, and ETKA would be normal.'},
      ],
      objective:'Decreased erythrocyte transketolase activity is seen with deficiency of thiamine (vitamin B1), which is a cofactor for several enzymes (eg, pyruvate dehydrogenase) involved in glucose metabolism. Severe deficiency can lead to heart failure (wet beriberi), which in infants may manifest as respiratory distress and feeding intolerance with cardiomegaly and hepatomegaly.',
      peer:{A:26, B:3, C:14, D:17, E:38},
      labs:[
        ['Erythrocyte transketolase activity coefficient (ETKAC)', '<1.15 (normal/sufficient); 1.15–1.25 moderate risk; >1.25 high risk of deficiency', '<1,15 (normal/suficiente); 1,15–1,25 risco moderado; >1,25 alto risco de deficiência',
         'Elevated (>1.25) in thiamine (vitamin B1) deficiency, reflecting low basal transketolase activity that increases markedly after TPP addition',
         'Elevado (>1,25) na deficiência de tiamina (vitamina B1), refletindo baixa atividade basal de transcetolase que aumenta marcadamente após adição de TPP'],
      ],
      ptTranslation:{
        vignette:'Um menino de 2 meses é levado ao pronto-socorro por irritabilidade e vômitos. O paciente é amamentado exclusivamente, mas não vem tolerando as mamadas desde ontem. O débito urinário diminuiu. A mãe tem história de obesidade e realizou cirurgia bariátrica (bypass gástrico) vários anos antes da gravidez. A temperatura é 37 C (98,6 F), o pulso é 190/min e a frequência respiratória é 60/min. O paciente está em desconforto respiratório moderado e apresenta fígado aumentado. O exame físico é normal, fora isso. A radiografia de tórax revela cardiomegalia. Uma investigação adicional mostra metabolismo de carboidratos prejudicado, com níveis séricos aumentados de lactato e atividade diminuída de transcetolase eritrocitária.',
        q:'Qual das seguintes enzimas adicionais provavelmente também tem atividade prejudicada neste paciente?',
        objective:'A atividade diminuída de transcetolase eritrocitária é observada na deficiência de tiamina (vitamina B1), que é cofator de diversas enzimas (por exemplo, piruvato desidrogenase) envolvidas no metabolismo da glicose. A deficiência grave pode levar à insuficiência cardíaca (beribéri úmido), que em lactentes pode se manifestar como desconforto respiratório e intolerância alimentar, com cardiomegalia e hepatomegalia.',
        options:[
          {label:'A', text:'Alfa-1,4-glicosidase'},
          {label:'B', text:'Alfa-L-iduronidase'},
          {label:'C', text:'Galactose-1-fosfato uridiltransferase'},
          {label:'D', text:'Glicose-6-fosfatase'},
          {label:'E', text:'Piruvato desidrogenase'},
        ],
        explC:'Deficiência de tiamina — Fatores de risco: desnutrição (por exemplo, uso crônico de álcool, anorexia, cirurgia bariátrica). Fisiopatologia: reações prejudicadas de enzimas dependentes de tiamina* → diminuição do metabolismo da glicose e da produção de ATP. Apresentação: beribéri — "úmido": cardiomiopatia, insuficiência cardíaca; "seco": neuropatia periférica simétrica (motora e sensorial); encefalopatia de Wernicke: encefalopatia, disfunção oculomotora, ataxia. Manejo: suplementação de tiamina. *A tiamina é cofator da transcetolase, da piruvato desidrogenase e da alfa-cetoglutarato desidrogenase.\n\nEste paciente apresenta atividade diminuída de transcetolase eritrocitária (ETKA), uma enzima dependente de tiamina na via das pentoses fosfato. Esse achado é essencialmente diagnóstico de deficiência de tiamina (vitamina B1). O principal fator de risco para deficiência de tiamina é a desnutrição; neste caso, a cirurgia bariátrica sem suplementação adequada de micronutrientes provavelmente levou à deficiência materna de tiamina e, por consequência, à deficiência neste lactente exclusivamente amamentado.\n\nAlém de sua participação na atividade da transcetolase, a tiamina é cofator de outras enzimas envolvidas no metabolismo da glicose (por exemplo, transferência de 2 carbonos, descarboxilação), incluindo a alfa-cetoglutarato desidrogenase e a piruvato desidrogenase (que converte piruvato em acetil-CoA). A atividade prejudicada da piruvato desidrogenase desvia o piruvato para a via da glicólise anaeróbica, que produz lactato. A acidose láctica leva à diminuição da resistência vascular periférica, o que contribui para o achado clássico de insuficiência cardíaca de alto débito. Entretanto, ao longo do tempo, o prejuízo direto à produção de energia dos miócitos leva à redução da contratilidade cardíaca e a um estado de baixo débito.\n\nA disfunção miocárdica por deficiência de tiamina é chamada de beribéri úmido. O beribéri infantil é raro, mas frequentemente fulminante, com sintomas relacionados à sobrecarga hídrica pulmonar/sistêmica, incluindo intolerância alimentar e desconforto respiratório, além de cardiomegalia e hepatomegalia, como visto neste paciente. O beribéri úmido pode ser fatal sem suplementação imediata de tiamina.',
        explI:[
          {option:'A', explanation:'A deficiência de alfa-1,4-glicosidase (doença de Pompe) causa cardiomegalia devido ao acúmulo de glicogênio nos miócitos; a insuficiência cardíaca pode levar à hepatomegalia. Os bebês afetados tipicamente apresentam fraqueza profunda e hipotonia, achados não presentes neste paciente. Além disso, a ETKA e o lactato estariam normais.'},
          {option:'B', explanation:'A deficiência de alfa-L-iduronidase (síndrome de Hurler) resulta no acúmulo de glicosaminoglicanos e frequentemente se apresenta com hepatomegalia; insuficiência cardíaca também pode ocorrer. Diferentemente deste paciente, esperam-se traços faciais grosseiros característicos e infecções respiratórias recorrentes; o lactato sérico e a ETKA estariam normais.'},
          {option:'C', explanation:'A deficiência de galactose-1-fosfato uridiltransferase (galactosemia) resulta em metabolismo prejudicado da galactose. Hepatomegalia e vômitos são comuns e tipicamente se desenvolvem na primeira semana de vida, associados a icterícia e hipotonia. A ETKA estaria normal.'},
          {option:'D', explanation:'A deficiência de glicose-6-fosfatase (doença de von Gierke) resulta em acúmulo de glicogênio no fígado, causando hepatomegalia; a acidose láctica é comum. Entretanto, cardiomegalia não seria observada, e a ETKA estaria normal.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0027', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'easy',
      vignette:'A 27-year-old man is brought to the emergency department due to confusion. His roommate says that he has been binge drinking for the last 5 days and probably has had very little to eat. The patient\'s medical history is significant for alcohol-related seizures 1 year ago. He had been sober until 2 weeks ago, when he started drinking again. The patient\'s past medical history is otherwise unremarkable. On examination, he responds to voice but does not follow commands. Fingerstick glucose is 35 mg/dL and urine is strongly positive for ketones.',
      q:'Suppression of which of the following is the primary cause of this patient\'s hypoglycemia?',
      options:[
        {label:'A', text:'Gluconeogenesis'},
        {label:'B', text:'Glycogenolysis'},
        {label:'C', text:'Insulin clearance'},
        {label:'D', text:'Insulin sensitivity'},
        {label:'E', text:'Lipolysis'},
      ],
      correct:'A',
      explC:'The metabolism of ethanol by alcohol dehydrogenase and aldehyde dehydrogenase reduces NAD+ to NADH and increases the NADH/NAD+ ratio. This inhibits all other pathways requiring NAD+, including reactions required for gluconeogenesis. In particular, lactate cannot be converted to pyruvate toward lactate. In addition, excess NADH inhibits the conversion of malate to oxaloacetate. Pyruvate and oxaloacetate are intermediates in gluconeogenesis; therefore, conversion of these molecules to lactate and malate inhibits gluconeogenesis.',
      explI:[
        {option:'B', explanation:'Alcohol does not inhibit glycogenolysis, and so in the initial phase of binge drinking (heavy alcohol intake with reduced nutritional carbohydrate intake), hepatic glycogenolysis is able to maintain euglycemia. However, after a prolonged binge, hepatic glycogen is eventually depleted and blood glucose levels drop.'},
        {option:'C and D', explanation:'Ethanol has no direct effect on insulin sensitivity. Impaired clearance of insulin is a major contributor to hypoglycemia in patients with advanced renal insufficiency.'},
        {option:'E', explanation:'Excess NADH inhibits free fatty acid oxidation, thereby diverting free fatty acids away from lipolysis to the formation of triglycerides. This contributes to alcohol-induced hepatic steatosis but does not cause hypoglycemia.'},
      ],
      objective:'Ethanol inhibits gluconeogenesis and can cause hypoglycemia once hepatic glycogen stores are depleted.',
      peer:{A:72, B:13, C:2, D:4, E:6},
      img:'assets/qbank/CMQ-STEP1-BCH-0027_ethanol_inhibition_citric_acid_cycle.png',
      labs:[
        ['Glucose, plasma (fasting)', '70–100 mg/dL', '70–100 mg/dL',
         'Decreased (eg, 35 mg/dL here) when ethanol inhibits gluconeogenesis after hepatic glycogen depletion',
         'Diminuída (ex.: 35 mg/dL neste caso) quando o etanol inibe a gliconeogênese após depleção do glicogênio hepático'],
        ['Beta-hydroxybutyrate, serum', '<0.5 mmol/L (fasting/nonketotic)', '<0,5 mmol/L (jejum/não cetótico)',
         'Elevated in alcoholic ketoacidosis due to increased NADH-driven ketogenesis and reduced insulin',
         'Elevada na cetoacidose alcoólica pelo aumento da cetogênese induzida por NADH e redução da insulina'],
      ],
      ptTranslation:{
        vignette:'Um homem de 27 anos é levado ao pronto-socorro devido a confusão mental. Seu colega de quarto diz que ele está bebendo compulsivamente nos últimos 5 dias e provavelmente comeu muito pouco. O histórico médico do paciente é significativo para convulsões relacionadas ao álcool há 1 ano. Ele havia permanecido sóbrio até 2 semanas atrás, quando voltou a beber. O restante do histórico médico pregresso do paciente é irrelevante. Ao exame, ele responde à voz, mas não segue comandos. A glicemia capilar (dextro) é de 35 mg/dL e a urina é fortemente positiva para cetonas.',
        q:'A supressão de qual dos seguintes processos é a principal causa da hipoglicemia deste paciente?',
        objective:'O etanol inibe a gliconeogênese e pode causar hipoglicemia quando os estoques de glicogênio hepático se esgotam.',
        options:[
          {label:'A', text:'Gliconeogênese'},
          {label:'B', text:'Glicogenólise'},
          {label:'C', text:'Depuração de insulina'},
          {label:'D', text:'Sensibilidade à insulina'},
          {label:'E', text:'Lipólise'},
        ],
        explC:'O metabolismo do etanol pela álcool desidrogenase e pela aldeído desidrogenase reduz NAD+ a NADH e aumenta a razão NADH/NAD+. Isso inibe todas as outras vias que requerem NAD+, incluindo as reações necessárias para a gliconeogênese. Em particular, o lactato não pode ser convertido em piruvato, e a reação é, ao contrário, direcionada do piruvato para o lactato. Além disso, o excesso de NADH inibe a conversão de malato em oxaloacetato. Piruvato e oxaloacetato são intermediários da gliconeogênese; portanto, a conversão dessas moléculas em lactato e malato inibe a gliconeogênese.',
        explI:[
          {option:'B', explanation:'O álcool não inibe a glicogenólise; assim, na fase inicial do consumo excessivo de álcool (ingestão alcoólica pesada com redução da ingestão nutricional de carboidratos), a glicogenólise hepática consegue manter a euglicemia. Entretanto, após um período prolongado de consumo excessivo, o glicogênio hepático se esgota e os níveis de glicose sanguínea caem.'},
          {option:'C and D', explanation:'O etanol não tem efeito direto sobre a sensibilidade à insulina. A depuração prejudicada de insulina é um importante contribuinte para a hipoglicemia em pacientes com insuficiência renal avançada.'},
          {option:'E', explanation:'O excesso de NADH inibe a oxidação de ácidos graxos livres, desviando os ácidos graxos livres da lipólise para a formação de triglicerídeos. Isso contribui para a esteatose hepática induzida pelo álcool, mas não causa hipoglicemia.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0028', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'Nutrition researchers investigating the relationship between fructose consumption and cardiovascular disease conduct a prospective cohort study on a population of randomly selected young adults. Study participants undergo semiannual measurement of waist circumference, blood pressure, and serum cholesterol and triglyceride concentrations. Dietary fructose consumption is assessed through the use of questionnaires and by measuring urinary fructose excretion. A 23-year-old man enrolled in the study is found to excrete large amounts of fructose in his urine compared to other study participants despite maintaining a moderate fructose intake. Further evaluation shows a hereditary defect in fructose metabolism, but he is asymptomatic and has no other medical problems.',
      q:'This patient most likely remains able to metabolize fructose due to the compensatory activity of which of the following enzymes?',
      options:[
        {label:'A', text:'Aldolase B'},
        {label:'B', text:'Aldose reductase'},
        {label:'C', text:'Fructokinase'},
        {label:'D', text:'Hexokinase'},
        {label:'E', text:'UDP-galactose-4-epimerase'},
      ],
      correct:'D',
      explC:'Fructose is obtained in the diet primarily from fruits and food sweeteners such as table sugar (sucrose) and high-fructose corn syrup. Fructose is absorbed in the proximal intestine through the GLUT5 fructose transporter. It is normally phosphorylated by fructokinase in the liver, yielding fructose-1-phosphate, which is converted by aldolase B to dihydroxyacetone phosphate (DHAP) and glyceraldehyde (Choice C). Glyceraldehyde and DHAP can be converted to glyceraldehyde-3-phosphate, which can then be metabolized in the glycolytic pathway.\n\nFructokinase deficiency (essential fructosuria) is an asymptomatic, autosomal recessive disorder that causes dietary fructose to be excreted unchanged in the urine. In fructokinase deficiency, hexokinase takes over the role of fructose metabolism, converting dietary fructose into fructose-6-phosphate. Fructose-6-phosphate can be metabolized in the glycolytic pathway or converted to glucose-6-phosphate or glucose-1-phosphate, which can be used in the pentose phosphate pathway or for glycogen synthesis, respectively.',
      explI:[
        {option:'A', explanation:'Aldolase B plays a nonessential role in glycolysis due to the redundant function of aldolase A. However, it is particularly important during fructose metabolism as deficiency of this enzyme leads to toxic accumulation of fructose-1-phosphate (hereditary fructose intolerance). This life-threatening disorder presents in infancy after the introduction of fructose-containing foods.'},
        {option:'B', explanation:'Aldose reductase is the enzyme that converts glucose to sorbitol. Aldose reductase has a low affinity for glucose, and normally only very small amounts of glucose are metabolized by this enzyme. The amount of glucose metabolized by the aldose reductase pathway increases significantly in diabetes mellitus and contributes to chronic complications such as neuropathy and retinopathy.'},
        {option:'E', explanation:'UDP-galactose-4-epimerase is involved in the metabolism of galactose; it does not play a role in fructose metabolism.'},
      ],
      objective:'Essential fructosuria is a benign disorder of fructose metabolism caused by fructokinase deficiency. In patients with essential fructosuria, some of the dietary fructose load is converted by hexokinase to fructose-6-phosphate, which can then enter glycolysis in normal individuals.',
      peer:{A:25, B:11, C:22, D:37, E:3},
      img:'assets/qbank/CMQ-STEP1-BCH-0028_disorders_fructose_metabolism.png',
      labs:[
        ['Urine reducing substances (Clinitest)', 'Negative', 'Negativo',
         'Positive (non-glucose reducing substance) in essential fructosuria due to urinary fructose excretion; Clinistix (glucose oxidase-specific) remains negative',
         'Positivo (substância redutora não-glicose) na frutosúria essencial por excreção urinária de frutose; o Clinistix (específico para glicose) permanece negativo'],
      ],
      ptTranslation:{
        vignette:'Pesquisadores de nutrição que investigam a relação entre o consumo de frutose e a doença cardiovascular conduzem um estudo de coorte prospectivo em uma população de adultos jovens selecionados aleatoriamente. Os participantes do estudo são submetidos a medições semestrais de circunferência da cintura, pressão arterial e concentrações séricas de colesterol e triglicerídeos. O consumo alimentar de frutose é avaliado por meio de questionários e pela medição da excreção urinária de frutose. Um homem de 23 anos incluído no estudo apresenta excreção de grandes quantidades de frutose na urina em comparação aos outros participantes do estudo, apesar de manter uma ingestão moderada de frutose. Uma avaliação adicional revela um defeito hereditário no metabolismo da frutose, mas ele é assintomático e não tem outros problemas médicos.',
        q:'Este paciente provavelmente ainda consegue metabolizar frutose devido à atividade compensatória de qual das seguintes enzimas?',
        objective:'A frutosúria essencial é um distúrbio benigno do metabolismo da frutose causado pela deficiência de frutocinase. Em pacientes com frutosúria essencial, parte da carga alimentar de frutose é convertida pela hexocinase em frutose-6-fosfato, que pode então entrar na glicólise, como ocorre em indivíduos normais.',
        options:[
          {label:'A', text:'Aldolase B'},
          {label:'B', text:'Aldose redutase'},
          {label:'C', text:'Frutocinase'},
          {label:'D', text:'Hexocinase'},
          {label:'E', text:'UDP-galactose-4-epimerase'},
        ],
        explC:'A frutose é obtida na dieta principalmente de frutas e adoçantes alimentares, como o açúcar de mesa (sacarose) e o xarope de milho rico em frutose. A frutose é absorvida no intestino proximal por meio do transportador de frutose GLUT5. Ela é normalmente fosforilada pela frutocinase no fígado, produzindo frutose-1-fosfato, que é convertida pela aldolase B em di-hidroxiacetona fosfato (DHAP) e gliceraldeído (Alternativa C). O gliceraldeído e o DHAP podem ser convertidos em gliceraldeído-3-fosfato, que pode então ser metabolizado na via glicolítica.\n\nA deficiência de frutocinase (frutosúria essencial) é um distúrbio autossômico recessivo assintomático que faz com que a frutose alimentar seja excretada inalterada na urina. Na deficiência de frutocinase, a hexocinase assume o papel do metabolismo da frutose, convertendo a frutose alimentar em frutose-6-fosfato. A frutose-6-fosfato pode ser metabolizada na via glicolítica ou convertida em glicose-6-fosfato ou glicose-1-fosfato, que podem ser usadas na via das pentoses fosfato ou para a síntese de glicogênio, respectivamente.',
        explI:[
          {option:'A', explanation:'A aldolase B desempenha um papel não essencial na glicólise devido à função redundante da aldolase A. Entretanto, ela é particularmente importante durante o metabolismo da frutose, já que a deficiência dessa enzima leva ao acúmulo tóxico de frutose-1-fosfato (intolerância hereditária à frutose). Esse distúrbio potencialmente fatal se manifesta na infância após a introdução de alimentos contendo frutose.'},
          {option:'B', explanation:'A aldose redutase é a enzima que converte glicose em sorbitol. A aldose redutase tem baixa afinidade pela glicose, e normalmente apenas quantidades muito pequenas de glicose são metabolizadas por essa enzima. A quantidade de glicose metabolizada pela via da aldose redutase aumenta significativamente no diabetes mellitus e contribui para complicações crônicas, como neuropatia e retinopatia.'},
          {option:'E', explanation:'A UDP-galactose-4-epimerase está envolvida no metabolismo da galactose; ela não desempenha papel no metabolismo da frutose.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0029', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'medium',
      vignette:'A 5-month-old boy is brought to the office due to poor feeding. His mother says that he has difficulty holding his head up while breastfeeding and his suckling seems weaker than usual. Weight is at the 5th percentile. Length and head circumference are tracking along the 25th percentile. Physical examination shows hepatomegaly and hypotonia in all 4 limbs. Cardiac auscultation shows a gallop rhythm, and chest x-ray reveals severe cardiomegaly. Muscle biopsy shows enlarged lysosomes containing periodic acid-Schiff (PAS)–positive material.',
      q:'Which of the following enzymes is most likely deficient in this patient?',
      options:[
        {label:'A', text:'Acid alpha-glucosidase'},
        {label:'B', text:'Galactokinase'},
        {label:'C', text:'Glucose-6-phosphatase'},
        {label:'D', text:'Glycogen debrancher enzyme'},
        {label:'E', text:'Glycogen phosphorylase'},
        {label:'F', text:'Pyruvate kinase'},
      ],
      correct:'A',
      explC:'This patient most likely has glycogen storage disease type II (Pompe disease). This condition is caused by deficiency of acid alpha-glucosidase (alpha-1,4 glucosidase or acid maltase), an enzyme responsible for breaking down glycogen within the acidic environment of lysosomes. Although most glycogen is degraded in the cytoplasm, a small percentage is inadvertently engulfed by lysosomes, especially in cells containing high amounts of glycogen such as hepatocytes and myocytes. Deficiency of acid maltase results in pathologic accumulation of glycogen within liver and muscle lysosomes. Cardiac and skeletal muscle are particularly susceptible because the ballooning lysosomes interfere with contractile function.\n\nThe classic form of the disease presents in early infancy with marked cardiomegaly, severe generalized hypotonia, macroglossia, and hepatomegaly. Blood glucose levels are normal, unlike with glycogen storage diseases that primarily affect the liver (eg, von Gierke disease). A key distinguishing feature is that muscle biopsy will show accumulation of glycogen in lysosomes.',
      explI:[
        {option:'B', explanation:'Galactokinase catalyzes the phosphorylation of galactose to galactose-1-phosphate in the first committed step of galactose catabolism. Galactokinase deficiency causes neonatal cataract formation due to accumulation of galactitol in the lens.'},
        {option:'C, D, and E', explanation:'Other glycogen storage diseases are caused by deficiencies of glucose-6-phosphatase, glycogen phosphorylase, and glycogen debrancher enzyme (debranching enzyme). However, glycogen accumulation within lysosomal vacuoles is specific for acid alpha-glucosidase deficiency.'},
        {option:'F', explanation:'Pyruvate kinase deficiency causes chronic hemolytic anemia, splenomegaly, and iron overload as a result of impaired erythrocyte survival.'},
      ],
      objective:'Acid maltase (alpha-glucosidase) deficiency presents in early infancy with cardiomegaly, macroglossia, and profound muscular hypotonia. Abnormal glycogen accumulation within lysosomal vesicles is seen on muscle biopsy.',
      peer:{A:52, B:5, C:8, D:18, E:11, F:3},
      img:'assets/qbank/CMQ-STEP1-BCH-0029_impairments_glycogenolysis.png',
      labs:[
        ['Creatine kinase, serum (child ≥2 months)', '≤90 U/L', '≤90 U/L',
         'Mildly to moderately elevated in Pompe disease (acid alpha-glucosidase deficiency) due to lysosomal glycogen accumulation in myocytes',
         'Discretamente a moderadamente elevada na doença de Pompe (deficiência de alfa-glicosidase ácida) pelo acúmulo lisossômico de glicogênio nos miócitos'],
      ],
      ptTranslation:{
        vignette:'Um menino de 5 meses é levado ao consultório devido a dificuldade de alimentação. Sua mãe diz que ele tem dificuldade de sustentar a cabeça durante a amamentação e que a sucção dele parece mais fraca que o normal. O peso está no percentil 5. O comprimento e o perímetro cefálico estão acompanhando o percentil 25. O exame físico mostra hepatomegalia e hipotonia nos 4 membros. A ausculta cardíaca revela ritmo de galope, e a radiografia de tórax revela cardiomegalia importante. A biópsia muscular mostra lisossomos aumentados contendo material positivo para ácido periódico de Schiff (PAS).',
        q:'Qual das seguintes enzimas está mais provavelmente deficiente neste paciente?',
        objective:'A deficiência de maltase ácida (alfa-glicosidase) manifesta-se no início da infância com cardiomegalia, macroglossia e hipotonia muscular profunda. O acúmulo anormal de glicogênio dentro de vesículas lisossômicas é observado na biópsia muscular.',
        options:[
          {label:'A', text:'Alfa-glicosidase ácida'},
          {label:'B', text:'Galactocinase'},
          {label:'C', text:'Glicose-6-fosfatase'},
          {label:'D', text:'Enzima desramificadora do glicogênio'},
          {label:'E', text:'Glicogênio fosforilase'},
          {label:'F', text:'Piruvato cinase'},
        ],
        explC:'Este paciente provavelmente tem doença do armazenamento de glicogênio tipo II (doença de Pompe). Essa condição é causada pela deficiência de alfa-glicosidase ácida (alfa-1,4-glicosidase ou maltase ácida), uma enzima responsável por degradar o glicogênio dentro do ambiente ácido dos lisossomos. Embora a maior parte do glicogênio seja degradada no citoplasma, uma pequena porcentagem é inadvertidamente englobada pelos lisossomos, especialmente em células com altas quantidades de glicogênio, como hepatócitos e miócitos. A deficiência de maltase ácida resulta em acúmulo patológico de glicogênio nos lisossomos hepáticos e musculares. O músculo cardíaco e o esquelético são particularmente suscetíveis porque os lisossomos dilatados interferem na função contrátil.\n\nA forma clássica da doença se manifesta no início da infância com cardiomegalia acentuada, hipotonia generalizada grave, macroglossia e hepatomegalia. Os níveis de glicose sanguínea são normais, diferentemente das doenças de armazenamento de glicogênio que afetam principalmente o fígado (por exemplo, doença de von Gierke). Uma característica distintiva fundamental é que a biópsia muscular mostrará acúmulo de glicogênio nos lisossomos.',
        explI:[
          {option:'B', explanation:'A galactocinase catalisa a fosforilação da galactose a galactose-1-fosfato na primeira etapa comprometida do catabolismo da galactose. A deficiência de galactocinase causa formação de catarata neonatal devido ao acúmulo de galactitol no cristalino.'},
          {option:'C, D, and E', explanation:'Outras doenças de armazenamento de glicogênio são causadas por deficiências de glicose-6-fosfatase, glicogênio fosforilase e enzima desramificadora do glicogênio (debranching enzyme). Entretanto, o acúmulo de glicogênio dentro de vacúolos lisossômicos é específico da deficiência de alfa-glicosidase ácida.'},
          {option:'F', explanation:'A deficiência de piruvato cinase causa anemia hemolítica crônica, esplenomegalia e sobrecarga de ferro em decorrência da sobrevida prejudicada dos eritrócitos.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0030', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'A 35-year-old woman comes to the emergency department with nausea, vomiting, and fever. Her symptoms began 24 hours ago, and she has been unable to eat or drink anything since. She has a 3-year-old daughter who had similar symptoms 2 days earlier but is now fine. Laboratory studies show a blood glucose level of 82 mg/dL despite her 24-hour fast. Maintenance of this patient\'s blood glucose levels is facilitated by hepatic conversion of pyruvate into glucose.',
      q:'Which of the following substances directly stimulates the first enzyme involved in this process?',
      options:[
        {label:'A', text:'Acetyl-CoA'},
        {label:'B', text:'Alanine'},
        {label:'C', text:'Citrate'},
        {label:'D', text:'Fructose 2,6-bisphosphate'},
        {label:'E', text:'Lactate'},
        {label:'F', text:'Oxaloacetate'},
      ],
      correct:'A',
      explC:'During gluconeogenesis, substances such as lactate and alanine are converted to pyruvate. However, pyruvate cannot be converted to phosphoenolpyruvate directly as pyruvate kinase is unidirectional. To convert pyruvate to phosphoenolpyruvate, pyruvate first undergoes biotin-dependent carboxylation to oxaloacetate in the mitochondria. This reaction is catalyzed by pyruvate carboxylase. The activity of pyruvate carboxylase is increased by acetyl-CoA. This critical regulatory step diverts pyruvate to pyruvate dehydrogenase when acetyl-CoA levels are too low, preventing the cell from becoming energy starved. When acetyl-CoA levels are high (as with increased beta oxidation of fatty acids during fasting), pyruvate carboxylase can operate at full capacity and convert most of the pyruvate into oxaloacetate for use in gluconeogenesis.',
      explI:[
        {option:'B', explanation:'Muscle converts pyruvate to alanine via transamination, which is then transported to the liver where it is converted back to pyruvate for use in gluconeogenesis. Alanine allosterically inhibits pyruvate kinase, preventing phosphoenolpyruvate from being consumed by glycolysis during the gluconeogenic state.'},
        {option:'C', explanation:'Citrate is formed within mitochondria in the first reaction of the Krebs cycle, and elevated levels act as an indicator of high cellular energy stores and abundant biosynthetic intermediates. Citrate is therefore an important positive regulator of acetyl-CoA carboxylase and fructose-1,6-bisphosphatase, key enzymes involved in fatty acid synthesis and gluconeogenesis, respectively.'},
        {option:'D', explanation:'Regulation of glycolysis and gluconeogenesis occurs mainly through the inverse regulation of phosphofructokinase-1 and fructose 1,6-bisphosphatase by fructose 2,6-bisphosphate. High levels of fructose 2,6-bisphosphate activate phosphofructokinase-1 and accelerate glycolysis; low levels disinhibit fructose 1,6-bisphosphatase and promote gluconeogenesis.'},
        {option:'E', explanation:'Lactate is an important source of carbon atoms for glucose synthesis during gluconeogenesis. During anaerobic glycolysis in skeletal muscle, pyruvate is reduced to lactate by lactate dehydrogenase. Lactate formed in the contracting muscles is released into the bloodstream and transported to the liver, where it is converted back into glucose.'},
        {option:'F', explanation:'Oxaloacetate is the product of pyruvate carboxylase during gluconeogenesis. As such, increased levels of oxaloacetate would decrease the activity of the enzyme.'},
      ],
      objective:'Acetyl-CoA stimulates gluconeogenesis by increasing the activity of pyruvate carboxylase when acetyl-CoA is abundant. This regulatory step allows pyruvate to be shunted toward acetyl-CoA production when acetyl-CoA levels are low, preventing the cell from becoming depleted of energy.',
      peer:{A:39, B:7, C:12, D:17, E:6, F:17},
      img:'assets/qbank/CMQ-STEP1-BCH-0030_metabolic_fate_pyruvate.png',
      labs:[
        ['Glucose, plasma (24-hour fast, adult)', '70–100 mg/dL (maintained via hepatic gluconeogenesis during prolonged fasting)', '70–100 mg/dL (mantida pela gliconeogênese hepática durante jejum prolongado)',
         'Remains within the normal range here (82 mg/dL) due to intact hepatic gluconeogenesis despite a 24-hour fast',
         'Permanece dentro da faixa normal neste caso (82 mg/dL) devido à gliconeogênese hepática íntegra apesar do jejum de 24 horas'],
      ],
      ptTranslation:{
        vignette:'Uma mulher de 35 anos vem ao pronto-socorro com náuseas, vômitos e febre. Os sintomas começaram há 24 horas, e ela não consegue comer ou beber nada desde então. Ela tem uma filha de 3 anos que teve sintomas semelhantes 2 dias antes, mas que agora está bem. Os exames laboratoriais mostram um nível de glicose sanguínea de 82 mg/dL apesar do jejum de 24 horas. A manutenção dos níveis de glicose sanguínea desta paciente é facilitada pela conversão hepática de piruvato em glicose.',
        q:'Qual das seguintes substâncias estimula diretamente a primeira enzima envolvida nesse processo?',
        objective:'O acetil-CoA estimula a gliconeogênese ao aumentar a atividade da piruvato carboxilase quando o acetil-CoA está abundante. Essa etapa regulatória permite que o piruvato seja desviado para a produção de acetil-CoA quando os níveis de acetil-CoA estão baixos, evitando que a célula fique depletada de energia.',
        options:[
          {label:'A', text:'Acetil-CoA'},
          {label:'B', text:'Alanina'},
          {label:'C', text:'Citrato'},
          {label:'D', text:'Frutose 2,6-bisfosfato'},
          {label:'E', text:'Lactato'},
          {label:'F', text:'Oxaloacetato'},
        ],
        explC:'Durante a gliconeogênese, substâncias como lactato e alanina são convertidas em piruvato. Entretanto, o piruvato não pode ser convertido diretamente em fosfoenolpiruvato, já que a piruvato cinase é uma reação unidirecional. Para converter piruvato em fosfoenolpiruvato, o piruvato primeiro sofre carboxilação dependente de biotina a oxaloacetato na mitocôndria. Essa reação é catalisada pela piruvato carboxilase. A atividade da piruvato carboxilase é aumentada pelo acetil-CoA. Essa etapa regulatória crítica desvia o piruvato para a piruvato desidrogenase quando os níveis de acetil-CoA estão muito baixos, evitando que a célula fique com depleção de energia. Quando os níveis de acetil-CoA estão altos (como ocorre com o aumento da beta-oxidação de ácidos graxos durante o jejum), a piruvato carboxilase pode operar em capacidade máxima e converter a maior parte do piruvato em oxaloacetato para uso na gliconeogênese.',
        explI:[
          {option:'B', explanation:'O músculo converte piruvato em alanina por transaminação, que é então transportada para o fígado, onde é convertida novamente em piruvato para uso na gliconeogênese. A alanina inibe alostericamente a piruvato cinase, impedindo que o fosfoenolpiruvato seja consumido pela glicólise durante o estado gliconeogênico.'},
          {option:'C', explanation:'O citrato é formado dentro da mitocôndria na primeira reação do ciclo de Krebs, e níveis elevados atuam como indicador de altas reservas energéticas celulares e de abundantes intermediários biossintéticos. Portanto, o citrato é um importante regulador positivo da acetil-CoA carboxilase e da frutose-1,6-bisfosfatase, enzimas-chave envolvidas na síntese de ácidos graxos e na gliconeogênese, respectivamente.'},
          {option:'D', explanation:'A regulação da glicólise e da gliconeogênese ocorre principalmente pela regulação inversa da fosfofrutocinase-1 e da frutose 1,6-bisfosfatase pela frutose 2,6-bisfosfato. Níveis altos de frutose 2,6-bisfosfato ativam a fosfofrutocinase-1 e aceleram a glicólise; níveis baixos desinibem a frutose 1,6-bisfosfatase e favorecem a gliconeogênese.'},
          {option:'E', explanation:'O lactato é uma importante fonte de átomos de carbono para a síntese de glicose durante a gliconeogênese. Durante a glicólise anaeróbica no músculo esquelético, o piruvato é reduzido a lactato pela lactato desidrogenase. O lactato formado nos músculos em contração é liberado na corrente sanguínea e transportado até o fígado, onde é convertido novamente em glicose.'},
          {option:'F', explanation:'O oxaloacetato é o produto da piruvato carboxilase durante a gliconeogênese. Sendo assim, o aumento dos níveis de oxaloacetato diminuiria a atividade da enzima.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0032', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'medium',
      vignette:'A 20-year-old man is evaluated in the emergency department for weakness, malaise, and dark urine. The patient was treated for a bacterial skin infection several days ago. Physical examination shows scleral icterus. Laboratory results reveal anemia with an elevated reticulocyte count. Abnormal erythrocytes are seen on peripheral smear.',
      q:'Which of the following substrate flow pathways is most likely deficient in this patient?',
      options:[
        {label:'A', text:'A'},
        {label:'B', text:'B'},
        {label:'C', text:'C'},
        {label:'D', text:'D'},
        {label:'E', text:'E'},
        {label:'F', text:'F'},
        {label:'G', text:'G'},
      ],
      correct:'C',
      explC:'This patient is likely suffering from glucose-6-phosphate dehydrogenase (G6PD) deficiency, an X-linked recessive disorder resulting in episodic bouts of hemolysis when red blood cells experience increased oxidative stress.\n\nG6PD is the rate-limiting enzyme of the pentose phosphate pathway (PPP). This enzyme catalyzes the conversion of glucose-6-phosphate to 6-phosphogluconolactone, which is subsequently converted to 6-phosphogluconate. The PPP serves to generate both NADPH and ribose-5-phosphate, a precursor for nucleotide synthesis. Red blood cells utilize reduced NADPH to maintain a steady supply of glutathione, a molecule capable of neutralizing free radicals and therefore protecting the cells against oxidative damage. As the PPP is the only mechanism for red blood cells to generate NADPH, enzymatic defects in the pathway increase their susceptibility to oxidative damage.\n\nIncreased oxidative stress can occur as a result of exposure to medications (eg, antimalarials, sulfonamides), certain foods (eg, fava beans), and infection. This patient was likely treated with a sulfonamide drug for his bacterial skin infection, which precipitated hemolytic anemia. Oxidative damage to red blood cells also causes hemoglobin to denature, forming insoluble Heinz bodies that are removed in the spleen (produces characteristic bite cells).',
      explI:[
        {option:'A and B', explanation:'Phosphoglucomutase interconverts glucose-6-phosphate and glucose-1-phosphate. This enzyme links glycogenesis, glycogenolysis, and glycolysis.'},
        {option:'D', explanation:'This reaction is the final step in both gluconeogenesis and glycogenolysis in the liver. It is catalyzed by glucose-6-phosphatase and results in the liberation of a free glucose molecule. Enzyme deficiency results in glycogen storage disease type I.'},
        {option:'E', explanation:'This reaction is the first step in glycolysis and is catalyzed by hexokinase or glucokinase. Hexokinase deficiency is a rare cause of hemolytic anemia, and glucokinase deficiency has been linked to hyperglycemic states and diabetes.'},
        {option:'F and G', explanation:'Interconversion of glucose-6-phosphate and fructose-6-phosphate is catalyzed by the bidirectional enzyme phosphoglucose isomerase. Enzyme deficiency is responsible for a small percentage of hemolytic anemias.'},
      ],
      objective:'Glucose-6-phosphate dehydrogenase (G6PD) is the rate-limiting enzyme of the pentose phosphate pathway. G6PD deficiency is a common X-linked recessive disorder resulting in episodes of hemolytic anemia during times of increased oxidative stress (eg, use of antimalarials/sulfonamide, infections).',
      peer:{A:7, B:6, C:56, D:11, E:5, F:9, G:2},
      img:['assets/qbank/CMQ-STEP1-BCH-0032_g6pd_substrate_flow_diagram.png', 'assets/qbank/CMQ-STEP1-BCH-0032_pentose_phosphate_pathway.png'],
      labs:[
        ['Reticulocyte count', '0.5–2.5% (adult)', '0,5–2,5% (adulto)',
         'Elevated here, reflecting a compensatory bone marrow response to acute hemolysis in G6PD deficiency',
         'Elevada neste caso, refletindo resposta medular compensatória à hemólise aguda na deficiência de G6PD'],
        ['Haptoglobin, serum', '30–200 mg/dL', '30–200 mg/dL',
         'Decreased in intravascular hemolysis (eg, G6PD deficiency) due to consumption while binding free hemoglobin',
         'Diminuída na hemólise intravascular (ex.: deficiência de G6PD) pelo consumo ao ligar-se à hemoglobina livre'],
      ],
      ptTranslation:{
        vignette:'Um homem de 20 anos é avaliado no pronto-socorro por fraqueza, mal-estar e urina escura. O paciente foi tratado para uma infecção bacteriana de pele há vários dias. O exame físico mostra icterícia escleral. Os resultados laboratoriais revelam anemia com contagem de reticulócitos elevada. Eritrócitos anormais são vistos no esfregaço de sangue periférico.',
        q:'Qual das seguintes vias de fluxo de substrato está mais provavelmente deficiente neste paciente?',
        objective:'A glicose-6-fosfato desidrogenase (G6PD) é a enzima limitante da via das pentoses fosfato. A deficiência de G6PD é um distúrbio recessivo ligado ao X comum que causa episódios de anemia hemolítica em momentos de estresse oxidativo aumentado (por exemplo, uso de antimaláricos/sulfonamidas, infecções).',
        options:[
          {label:'A', text:'A'},
          {label:'B', text:'B'},
          {label:'C', text:'C'},
          {label:'D', text:'D'},
          {label:'E', text:'E'},
          {label:'F', text:'F'},
          {label:'G', text:'G'},
        ],
        explC:'Este paciente provavelmente sofre de deficiência de glicose-6-fosfato desidrogenase (G6PD), um distúrbio recessivo ligado ao X que resulta em episódios de hemólise quando os eritrócitos sofrem estresse oxidativo aumentado.\n\nA G6PD é a enzima limitante da via das pentoses fosfato (VPP). Essa enzima catalisa a conversão de glicose-6-fosfato em 6-fosfogluconolactona, que é subsequentemente convertida em 6-fosfogliconato. A VPP tem a função de gerar tanto NADPH quanto ribose-5-fosfato, um precursor para a síntese de nucleotídeos. Os eritrócitos utilizam o NADPH reduzido para manter um suprimento constante de glutationa, uma molécula capaz de neutralizar radicais livres e, assim, proteger as células contra dano oxidativo. Como a VPP é o único mecanismo dos eritrócitos para gerar NADPH, defeitos enzimáticos nessa via aumentam sua suscetibilidade ao dano oxidativo.\n\nO aumento do estresse oxidativo pode ocorrer em decorrência da exposição a medicamentos (por exemplo, antimaláricos, sulfonamidas), certos alimentos (por exemplo, favas) e infecções. Este paciente provavelmente foi tratado com um medicamento sulfonamídico para sua infecção bacteriana de pele, o que precipitou a anemia hemolítica. O dano oxidativo aos eritrócitos também causa desnaturação da hemoglobina, formando corpúsculos de Heinz insolúveis que são removidos no baço (produz as características "bite cells").',
        explI:[
          {option:'A and B', explanation:'A fosfoglicomutase interconverte glicose-6-fosfato e glicose-1-fosfato. Essa enzima conecta a glicogênese, a glicogenólise e a glicólise.'},
          {option:'D', explanation:'Essa reação é a etapa final tanto na gliconeogênese quanto na glicogenólise no fígado. É catalisada pela glicose-6-fosfatase e resulta na liberação de uma molécula livre de glicose. A deficiência dessa enzima resulta na doença de armazenamento de glicogênio tipo I.'},
          {option:'E', explanation:'Essa reação é a primeira etapa da glicólise e é catalisada pela hexocinase ou pela glicocinase. A deficiência de hexocinase é uma causa rara de anemia hemolítica, e a deficiência de glicocinase tem sido associada a estados hiperglicêmicos e diabetes.'},
          {option:'F and G', explanation:'A interconversão de glicose-6-fosfato e frutose-6-fosfato é catalisada pela enzima bidirecional fosfoglicose isomerase. A deficiência dessa enzima é responsável por uma pequena porcentagem das anemias hemolíticas.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0033', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'medium',
      vignette:'A 23-year-old apparently healthy man who recently immigrated to the United States comes to an outpatient clinic to establish care. When asked about his past medical history, he says that he has no significant medical problems. However, his mother told him that he was born with "a problem metabolizing sugar." The patient maintains no dietary restrictions and regularly eats vegetables, fruits, meats, and processed foods. Urine samples show a repeatedly positive copper reduction test, but glucose oxidase dipstick testing is negative.',
      q:'Which of the following enzymes is most likely to be deficient in this patient?',
      options:[
        {label:'A', text:'Acid α-glucosidase'},
        {label:'B', text:'Aldolase B'},
        {label:'C', text:'Fructokinase'},
        {label:'D', text:'Galactose-1-phosphate uridyl transferase'},
        {label:'E', text:'Lactase'},
      ],
      correct:'C',
      explC:'This asymptomatic patient with history of an inborn error of sugar metabolism most likely has essential fructosuria. This benign, autosomal recessive disorder causes some of the dietary fructose load to be secreted in the urine unchanged due to defective metabolism by fructokinase. Fructose, similar to glucose and galactose, is a reducing sugar and can be detected by a copper reduction test, which nonspecifically detects the presence of reducing sugars. A urine dipstick, however, uses glucose oxidase to ascertain the presence of urinary glucose and will not test positive in the presence of fructose or galactose.',
      explI:[
        {option:'A', explanation:'Acid α-glucosidase (or acid maltase) deficiency causes glycogen storage disease type II (Pompe disease). Affected infants have cardiomyopathy, muscle weakness, and hypotonia.'},
        {option:'B', explanation:'Aldolase B deficiency is a life-threatening disorder caused by the inability to metabolize fructose-1-phosphate (a toxic intermediate that accumulates in cells and depletes intracellular phosphate). Patients become acutely symptomatic after ingesting fructose-containing foods and eventually develop liver failure. Treatment includes elimination of dietary fructose.'},
        {option:'D', explanation:'Galactosemia is an autosomal recessive disorder caused by galactose-1-phosphate uridyl transferase deficiency. It is characterized by neonatal jaundice, vomiting, cataract formation, hepatomegaly, and failure to thrive. Treatment includes elimination of all milk products from the diet and feeding with soy-based infant formula.'},
        {option:'E', explanation:'Lactase is a mucosal enzyme responsible for the digestion of lactose. Acquired lactase deficiency is the most common cause of selective carbohydrate malabsorption. Patients with lactase deficiency experience gastrointestinal symptoms (eg, bloating, diarrhea) following the ingestion of dairy products.'},
      ],
      objective:'Unlike hereditary fructose intolerance (aldolase B deficiency) and classic galactosemia (galactose-1-phosphate uridyl transferase deficiency), essential fructosuria (fructokinase deficiency) is a benign disorder. Although affected patients are asymptomatic, their urine will test positive for a reducing sugar due to the presence of unmetabolized fructose.',
      peer:{A:8, B:12, C:62, D:10, E:6},
      img:'assets/qbank/CMQ-STEP1-BCH-0033_disorders_fructose_metabolism.png',
      labs:[
        ['Urine copper reduction test (Benedict/Clinitest)', 'Negative', 'Negativo',
         'Repeatedly positive (non-glucose reducing sugar) in essential fructosuria due to urinary fructose excretion, while the glucose oxidase dipstick remains negative',
         'Repetidamente positivo (açúcar redutor não-glicose) na frutosúria essencial por excreção urinária de frutose, enquanto a fita de glicose-oxidase permanece negativa'],
      ],
      ptTranslation:{
        vignette:'Um homem de 23 anos aparentemente saudável, que imigrou recentemente para os Estados Unidos, vem a uma clínica ambulatorial para estabelecer cuidados. Quando questionado sobre seu histórico médico pregresso, ele diz que não tem problemas médicos significativos. Entretanto, sua mãe lhe contou que ele nasceu com "um problema no metabolismo do açúcar". O paciente não mantém nenhuma restrição alimentar e come regularmente vegetais, frutas, carnes e alimentos processados. Amostras de urina mostram um teste de redução de cobre repetidamente positivo, mas o teste de glicose-oxidase na fita reagente é negativo.',
        q:'Qual das seguintes enzimas está mais provavelmente deficiente neste paciente?',
        objective:'Diferentemente da intolerância hereditária à frutose (deficiência de aldolase B) e da galactosemia clássica (deficiência de galactose-1-fosfato uridiltransferase), a frutosúria essencial (deficiência de frutocinase) é um distúrbio benigno. Embora os pacientes afetados sejam assintomáticos, a urina deles testará positivo para um açúcar redutor devido à presença de frutose não metabolizada.',
        options:[
          {label:'A', text:'Alfa-glicosidase ácida'},
          {label:'B', text:'Aldolase B'},
          {label:'C', text:'Frutocinase'},
          {label:'D', text:'Galactose-1-fosfato uridiltransferase'},
          {label:'E', text:'Lactase'},
        ],
        explC:'Este paciente assintomático com histórico de um erro inato do metabolismo de açúcares provavelmente tem frutosúria essencial. Esse distúrbio autossômico recessivo benigno faz com que parte da carga alimentar de frutose seja secretada na urina de forma inalterada devido ao metabolismo defeituoso pela frutocinase. A frutose, assim como a glicose e a galactose, é um açúcar redutor e pode ser detectada por um teste de redução de cobre, que detecta de forma inespecífica a presença de açúcares redutores. Uma fita reagente de urina, entretanto, usa glicose-oxidase para verificar a presença de glicose urinária e não testará positivo na presença de frutose ou galactose.',
        explI:[
          {option:'A', explanation:'A deficiência de alfa-glicosidase ácida (ou maltase ácida) causa a doença de armazenamento de glicogênio tipo II (doença de Pompe). Os bebês afetados apresentam cardiomiopatia, fraqueza muscular e hipotonia.'},
          {option:'B', explanation:'A deficiência de aldolase B é um distúrbio potencialmente fatal causado pela incapacidade de metabolizar a frutose-1-fosfato (um intermediário tóxico que se acumula nas células e depleta o fosfato intracelular). Os pacientes tornam-se agudamente sintomáticos após ingerir alimentos contendo frutose e eventualmente desenvolvem insuficiência hepática. O tratamento inclui a eliminação da frutose da dieta.'},
          {option:'D', explanation:'A galactosemia é um distúrbio autossômico recessivo causado pela deficiência de galactose-1-fosfato uridiltransferase. É caracterizada por icterícia neonatal, vômitos, formação de catarata, hepatomegalia e falha no crescimento. O tratamento inclui a eliminação de todos os produtos lácteos da dieta e a alimentação com fórmula infantil à base de soja.'},
          {option:'E', explanation:'A lactase é uma enzima mucosa responsável pela digestão da lactose. A deficiência adquirida de lactase é a causa mais comum de má absorção seletiva de carboidratos. Os pacientes com deficiência de lactase apresentam sintomas gastrointestinais (por exemplo, distensão abdominal, diarreia) após a ingestão de produtos lácteos.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0034', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'medium',
      vignette:'A 15-year-old boy is brought to the clinic due to poor exercise endurance. He recently began weight lifting with friends but has had difficulty performing the exercises. The patient states that his arms "feel like jelly after just a few repetitions." He also has severe muscle cramping and has noticed occasional urine discoloration after training sessions. Further evaluation reveals that the patient\'s exercise tolerance can be greatly improved by drinking an oral glucose solution before beginning a strenuous activity. Vital signs are normal, and examination is unremarkable.',
      q:'This patient is most likely deficient in an enzyme that catalyzes which of the following conversions?',
      options:[
        {label:'A', text:'A'},
        {label:'B', text:'B'},
        {label:'C', text:'C'},
        {label:'D', text:'D'},
        {label:'E', text:'E'},
      ],
      correct:'A',
      explC:'This patient most likely has McArdle disease (glycogen storage disease type V). This condition is caused by a deficiency of myophosphorylase, an isoenzyme of glycogen phosphorylase present in muscle tissue. Deficiency leads to decreased breakdown of glycogen during exercise, resulting in poor exercise tolerance, muscle cramps, and rhabdomyolysis (eg, red urine). The prognosis is generally good, and symptoms can be improved by consuming simple sugars before beginning physical activity.\n\nDuring glycogenolysis, glycogen phosphorylase shortens glycogen chains by cleaving 1,4-alpha-glycosidic linkages between glucose residues, liberating glucose-1-phosphate in the process. This occurs until 4 residues remain before a branch point (the limit dextrin). At this point, the debranching enzyme performs 2 enzymatic functions:\n1. Glucosyltransferase cleaves the 3 outer glucose residues of the 4 that are left by glycogen phosphorylase and transfers them to a nearby branch\n2. The enzyme alpha-1,6-glucosidase removes the single remaining branch residue, producing free glucose and a linear glycogen chain that can be further shortened by glycogen phosphorylase',
      explI:[
        {option:'B', explanation:'Glucose-1-phosphate generated by glycogenolysis is converted by phosphoglucomutase to glucose-6-phosphate. Unlike myophosphorylase, phosphoglucomutase is present in both skeletal muscle and liver. Phosphoglucomutase deficiency is extremely rare, presenting with muscle weakness and fasting hypoglycemia.'},
        {option:'C', explanation:'Glucose-6-phosphate is converted to 6-phosphogluconate through a series of reactions by glucose-6-phosphate dehydrogenase and 6-phosphogluconolactonase in the pentose phosphate pathway. This pathway maintains adequate levels of reduced glutathione, which is needed to protect from oxidative injury (eg, prevent red cell hemolysis).'},
        {option:'D', explanation:'Glucose-6-phosphate is converted to fructose-6-phosphate by glucose-6-phosphate isomerase during glycolysis. A deficiency here would disrupt glycolysis, affecting cells that rely on it as their energy source (eg, red blood cells). Patients have chronic hemolytic anemia.'},
        {option:'E', explanation:'Within the liver and kidney, glucose-6-phosphatase converts glucose-6-phosphate to glucose to help maintain blood glucose levels during fasting. A deficiency here leads to glycogen storage disease type I (von Gierke disease), presenting in infancy with hypoglycemia.'},
      ],
      objective:'Myophosphorylase deficiency (McArdle disease, or glycogen storage disease type V) causes failure of muscle glycogenolysis, resulting in decreased exercise tolerance, muscle pain, cramping, and myoglobinuria shortly after initiating physical activity.',
      peer:{A:64, B:10, C:3, D:3, E:17},
      img:['assets/qbank/CMQ-STEP1-BCH-0034_mcardle_substrate_flow_diagram.png', 'assets/qbank/CMQ-STEP1-BCH-0034_glycogenolysis_pathway.png'],
      labs:[
        ['Creatine kinase, serum (adult)', '30–200 U/L (assay-dependent)', '30–200 U/L (depende do método)',
         'Markedly elevated after exertion in McArdle disease (myophosphorylase deficiency) due to exercise-induced rhabdomyolysis',
         'Marcadamente elevada após esforço na doença de McArdle (deficiência de miofosforilase) por rabdomiólise induzida pelo exercício'],
      ],
      ptTranslation:{
        vignette:'Um menino de 15 anos é levado ao consultório devido a baixa resistência ao exercício. Ele começou recentemente a levantar peso com amigos, mas tem tido dificuldade em realizar os exercícios. O paciente diz que seus braços "ficam como gelatina depois de só algumas repetições". Ele também tem cãibras musculares intensas e notou descoloração ocasional da urina após as sessões de treino. Uma avaliação adicional revela que a tolerância ao exercício do paciente pode ser bastante melhorada ao beber uma solução oral de glicose antes de iniciar uma atividade extenuante. Os sinais vitais são normais, e o exame é normal.',
        q:'Este paciente provavelmente tem deficiência de uma enzima que catalisa qual das seguintes conversões?',
        objective:'A deficiência de miofosforilase (doença de McArdle, ou doença de armazenamento de glicogênio tipo V) causa falha na glicogenólise muscular, resultando em redução da tolerância ao exercício, dor muscular, cãibras e mioglobinúria logo após o início da atividade física.',
        options:[
          {label:'A', text:'A'},
          {label:'B', text:'B'},
          {label:'C', text:'C'},
          {label:'D', text:'D'},
          {label:'E', text:'E'},
        ],
        explC:'Este paciente provavelmente tem doença de McArdle (doença de armazenamento de glicogênio tipo V). Essa condição é causada pela deficiência de miofosforilase, uma isoenzima da glicogênio fosforilase presente no tecido muscular. A deficiência leva à redução da degradação do glicogênio durante o exercício, resultando em baixa tolerância ao exercício, cãibras musculares e rabdomiólise (por exemplo, urina avermelhada). O prognóstico é geralmente bom, e os sintomas podem ser melhorados com o consumo de açúcares simples antes de iniciar a atividade física.\n\nDurante a glicogenólise, a glicogênio fosforilase encurta as cadeias de glicogênio ao clivar as ligações 1,4-alfa-glicosídicas entre resíduos de glicose, liberando glicose-1-fosfato no processo. Isso ocorre até restarem 4 resíduos antes de um ponto de ramificação (a dextrina limite). Nesse ponto, a enzima desramificadora realiza 2 funções enzimáticas:\n1. A glicosiltransferase cliva os 3 resíduos externos de glicose dos 4 deixados pela glicogênio fosforilase e os transfere para um ramo próximo\n2. A enzima alfa-1,6-glicosidase remove o resíduo de ramificação único restante, produzindo glicose livre e uma cadeia linear de glicogênio que pode ser posteriormente encurtada pela glicogênio fosforilase',
        explI:[
          {option:'B', explanation:'A glicose-1-fosfato gerada pela glicogenólise é convertida pela fosfoglicomutase em glicose-6-fosfato. Diferentemente da miofosforilase, a fosfoglicomutase está presente tanto no músculo esquelético quanto no fígado. A deficiência de fosfoglicomutase é extremamente rara, manifestando-se com fraqueza muscular e hipoglicemia de jejum.'},
          {option:'C', explanation:'A glicose-6-fosfato é convertida em 6-fosfogliconato por meio de uma série de reações pela glicose-6-fosfato desidrogenase e pela 6-fosfogluconolactonase na via das pentoses fosfato. Essa via mantém níveis adequados de glutationa reduzida, necessária para proteger contra lesão oxidativa (por exemplo, prevenir a hemólise de eritrócitos).'},
          {option:'D', explanation:'A glicose-6-fosfato é convertida em frutose-6-fosfato pela glicose-6-fosfato isomerase durante a glicólise. Uma deficiência aqui prejudicaria a glicólise, afetando células que dependem dela como fonte de energia (por exemplo, eritrócitos). Os pacientes apresentam anemia hemolítica crônica.'},
          {option:'E', explanation:'No fígado e no rim, a glicose-6-fosfatase converte glicose-6-fosfato em glicose para ajudar a manter os níveis de glicose sanguínea durante o jejum. Uma deficiência aqui leva à doença de armazenamento de glicogênio tipo I (doença de von Gierke), que se manifesta na infância com hipoglicemia.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0035', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'A 52-year-old man is being evaluated in the emergency department for abdominal pain associated with watery diarrhea. His symptoms have been progressive over the last month. He says that he is depressed and often has difficulty remembering things. The patient has a 20-year history of alcohol use disorder. On examination, he appears disheveled. A pigmented scaly skin rash is present in the malar distribution of his face, neck, and back of his hands. The rash has been present for several months and worsens on exposure to sunlight. It is determined that the patient\'s symptoms are secondary to lack of a specific nutrient.',
      q:'Which of the following enzymes is most likely to be directly affected by this patient\'s nutrient deficiency?',
      options:[
        {label:'A', text:'Citrate synthase'},
        {label:'B', text:'Hexokinase'},
        {label:'C', text:'Isocitrate dehydrogenase'},
        {label:'D', text:'Phosphoglycerate kinase'},
        {label:'E', text:'Succinate dehydrogenase'},
      ],
      correct:'C',
      explC:'This patient likely has pellagra, a disease characterized by photosensitive dermatitis, diarrhea, and dementia occurring secondary to vitamin B3 (niacin) deficiency. Pellagra is predominantly seen in malnourished populations (eg, those with alcohol use disorder or malabsorption).\n\nNiacin is a precursor for nicotinamide adenine dinucleotide (NAD) and nicotinamide adenine dinucleotide phosphate (NADP), two important cofactors for many dehydrogenase and reductase enzymes. NAD is required for catabolic reactions (eg, glycolysis, beta-oxidation) as well as cell signaling and DNA repair, whereas NADP is necessary for many anabolic reactions such as fatty acid and cholesterol synthesis. NAD is a key constituent of the citric acid cycle; it serves as a cofactor for isocitrate dehydrogenase, alpha-ketoglutarate dehydrogenase, and malate dehydrogenase.',
      explI:[
        {option:'A', explanation:'Citrate synthase is an enzyme of the citric acid cycle; it does not require NAD or NADP as a cofactor.'},
        {option:'B and D', explanation:'Hexokinase and phosphoglycerate kinase are enzymes used in glycolysis; they do not require NAD or NADP as cofactors.'},
        {option:'E', explanation:'Succinate dehydrogenase is an enzyme of the citric acid cycle; it catalyzes the conversion of succinate to fumarate using flavin adenine dinucleotide (FAD) as a cofactor.'},
      ],
      objective:'Niacin is a precursor for nicotinamide adenine dinucleotide (NAD) and nicotinamide adenine dinucleotide phosphate (NADP), two important cofactors for many dehydrogenase and reductase enzymes. Niacin deficiency results in pellagra (ie, diarrhea, dementia, and dermatitis).',
      peer:{A:12, B:5, C:42, D:10, E:30},
      img:'assets/qbank/CMQ-STEP1-BCH-0035_niacin_dependent_tca_enzymes.png',
      labs:[
        ['N1-methylnicotinamide, urinary (24h)', '>17.5 µmol/day (adequate); <5.8 µmol/day (deficient)', '>17,5 µmol/dia (adequado); <5,8 µmol/dia (deficiente)',
         'Decreased (<5.8 µmol/day) in niacin (vitamin B3) deficiency/pellagra, reflecting reduced niacin methylation and excretion',
         'Diminuída (<5,8 µmol/dia) na deficiência de niacina (vitamina B3)/pelagra, refletindo redução da metilação e excreção de niacina'],
      ],
      ptTranslation:{
        vignette:'Um homem de 52 anos está sendo avaliado no pronto-socorro por dor abdominal associada a diarreia aquosa. Seus sintomas têm sido progressivos ao longo do último mês. Ele diz que está deprimido e frequentemente tem dificuldade para se lembrar das coisas. O paciente tem histórico de 20 anos de transtorno por uso de álcool. Ao exame, ele aparenta estar desleixado. Uma erupção cutânea pigmentada e escamosa está presente na distribuição malar da face, no pescoço e no dorso das mãos. A erupção está presente há vários meses e piora com a exposição ao sol. Determina-se que os sintomas do paciente são secundários à falta de um nutriente específico.',
        q:'Qual das seguintes enzimas está mais provavelmente diretamente afetada pela deficiência nutricional deste paciente?',
        objective:'A niacina é precursora da nicotinamida adenina dinucleotídeo (NAD) e da nicotinamida adenina dinucleotídeo fosfato (NADP), dois importantes cofatores de muitas enzimas desidrogenases e redutases. A deficiência de niacina resulta em pelagra (ou seja, diarreia, demência e dermatite).',
        options:[
          {label:'A', text:'Citrato sintase'},
          {label:'B', text:'Hexocinase'},
          {label:'C', text:'Isocitrato desidrogenase'},
          {label:'D', text:'Fosfoglicerato cinase'},
          {label:'E', text:'Succinato desidrogenase'},
        ],
        explC:'Este paciente provavelmente tem pelagra, uma doença caracterizada por dermatite fotossensível, diarreia e demência, ocorrendo secundariamente à deficiência de vitamina B3 (niacina). A pelagra é observada predominantemente em populações desnutridas (por exemplo, aquelas com transtorno por uso de álcool ou má absorção).\n\nA niacina é precursora da nicotinamida adenina dinucleotídeo (NAD) e da nicotinamida adenina dinucleotídeo fosfato (NADP), dois importantes cofatores de muitas enzimas desidrogenases e redutases. O NAD é necessário para reações catabólicas (por exemplo, glicólise, beta-oxidação), além de sinalização celular e reparo do DNA, enquanto o NADP é necessário para muitas reações anabólicas, como a síntese de ácidos graxos e colesterol. O NAD é um constituinte fundamental do ciclo do ácido cítrico; ele atua como cofator da isocitrato desidrogenase, da alfa-cetoglutarato desidrogenase e da malato desidrogenase.',
        explI:[
          {option:'A', explanation:'A citrato sintase é uma enzima do ciclo do ácido cítrico; ela não requer NAD ou NADP como cofator.'},
          {option:'B and D', explanation:'A hexocinase e a fosfoglicerato cinase são enzimas usadas na glicólise; elas não requerem NAD ou NADP como cofatores.'},
          {option:'E', explanation:'A succinato desidrogenase é uma enzima do ciclo do ácido cítrico; ela catalisa a conversão de succinato em fumarato usando flavina adenina dinucleotídeo (FAD) como cofator.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0036', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'medium',
      vignette:'A 6-month-old boy is brought to the emergency department by his mother because of recent onset of vomiting, irritability, and jaundice. The infant was born at term and had been healthy until the onset of these symptoms. All of his vaccinations are up-to-date. He had been breast-fed exclusively until 1 week ago, when cereals and fruit juices were introduced into his diet. Further evaluation reveals hepatomegaly and abnormal liver function tests.',
      q:'Which of the following enzymes is most likely to be deficient in this patient?',
      options:[
        {label:'A', text:'Galactose-1-phosphate uridyl transferase'},
        {label:'B', text:'Aldolase B'},
        {label:'C', text:'Fructokinase'},
        {label:'D', text:'Galactokinase'},
        {label:'E', text:'Acid α-glucosidase'},
      ],
      correct:'B',
      explC:'Dietary fructose is obtained mainly from fruits, vegetables, honey, table sugar (sucrose), and processed foods. Fructose is rapidly absorbed in the proximal small bowel by the hexose transporter GLUT 5. Initial metabolism of fructose involves three enzymes: fructokinase, aldolase B, and triokinase. Fructose is phosphorylated on the first carbon by hepatic fructokinase, yielding fructose-1-phosphate. Metabolism of fructose-1-phosphate by aldolase B generates dihydroxyacetone phosphate (DHAP) and glyceraldehyde. Glyceraldehyde is then phosphorylated to glyceraldehyde-3-phosphate (G3P), an intermediate of glycolysis, by triokinase. DHAP can also be converted to G3P by triose phosphate isomerase.\n\nAldolase B deficiency causes the potentially life-threatening disorder known as hereditary fructose intolerance. Patients typically present when fructose-containing foods are introduced into the diet. The primary manifestations are vomiting and hypoglycemia about 20-30 minutes after fructose ingestion. Hypoglycemia results from intracellular accumulation of fructose-1-phosphate and depletion of inorganic phosphate, which inhibit glycogenolysis and gluconeogenesis. Failure to thrive, hepatomegaly, and jaundice can also occur. Undiagnosed individuals may eventually develop liver and renal failure. Elimination of dietary fructose is the mainstay of treatment and results in symptom improvement with a good long-term prognosis.',
      explI:[
        {option:'A and D', explanation:'Galactose-1-phosphate uridyl transferase deficiency (classic galactosemia) is an autosomal recessive disorder characterized by vomiting, feeding intolerance, neonatal jaundice, hepatomegaly, and death if untreated. Symptoms start soon after breastfeeding is initiated. Galactokinase deficiency is a more benign disorder of galactose metabolism that results in the formation of neonatal cataracts.'},
        {option:'C', explanation:'Fructokinase deficiency causes essential fructosuria, a benign autosomal recessive disorder. Fructose from the diet is absorbed and secreted freely in the urine due to impairment of the first step in fructose metabolism.'},
        {option:'E', explanation:'Glycogenolysis is accomplished mainly by glycogen phosphorylase and debranching enzyme, but a small amount is also broken down by the lysosomal enzyme alpha-1,4-glucosidase. Alpha-glucosidase (or acid maltase) deficiency causes Pompe disease. This disease presents not with hypoglycemia, but with cardiomyopathy and hypotonia.'},
      ],
      objective:'Aldolase B deficiency causes hereditary fructose intolerance. This disease manifests after introduction of fructose into the diet with vomiting and hypoglycemia about 20-30 minutes after fructose ingestion. These infants can present with failure to thrive, jaundice, and hepatomegaly.',
      peer:{A:10, B:63, C:20, D:3, E:2},
      img:'assets/qbank/CMQ-STEP1-BCH-0036_hereditary_fructose_intolerance_pathway.png',
      labs:[
        ['ALT (alanine aminotransferase), serum (infant)', '<35–40 U/L (assay-dependent pediatric reference)', '<35–40 U/L (referência pediátrica, depende do método)',
         'Elevated in hereditary fructose intolerance due to hepatocellular injury from fructose-1-phosphate accumulation',
         'Elevada na intolerância hereditária à frutose por lesão hepatocelular decorrente do acúmulo de frutose-1-fosfato'],
      ],
      ptTranslation:{
        vignette:'Um menino de 6 meses é levado ao pronto-socorro por sua mãe devido ao início recente de vômitos, irritabilidade e icterícia. O bebê nasceu a termo e havia sido saudável até o início desses sintomas. Todas as suas vacinas estão em dia. Ele foi amamentado exclusivamente até 1 semana atrás, quando cereais e sucos de frutas foram introduzidos em sua dieta. Uma avaliação adicional revela hepatomegalia e testes de função hepática anormais.',
        q:'Qual das seguintes enzimas está mais provavelmente deficiente neste paciente?',
        objective:'A deficiência de aldolase B causa intolerância hereditária à frutose. Essa doença se manifesta após a introdução da frutose na dieta, com vômitos e hipoglicemia cerca de 20-30 minutos após a ingestão de frutose. Esses bebês podem apresentar falha no crescimento, icterícia e hepatomegalia.',
        options:[
          {label:'A', text:'Galactose-1-fosfato uridiltransferase'},
          {label:'B', text:'Aldolase B'},
          {label:'C', text:'Frutocinase'},
          {label:'D', text:'Galactocinase'},
          {label:'E', text:'Alfa-glicosidase ácida'},
        ],
        explC:'A frutose alimentar é obtida principalmente de frutas, vegetais, mel, açúcar de mesa (sacarose) e alimentos processados. A frutose é rapidamente absorvida no intestino delgado proximal pelo transportador de hexoses GLUT 5. O metabolismo inicial da frutose envolve três enzimas: frutocinase, aldolase B e trioquinase. A frutose é fosforilada no primeiro carbono pela frutocinase hepática, produzindo frutose-1-fosfato. O metabolismo da frutose-1-fosfato pela aldolase B gera di-hidroxiacetona fosfato (DHAP) e gliceraldeído. O gliceraldeído é então fosforilado a gliceraldeído-3-fosfato (G3P), um intermediário da glicólise, pela trioquinase. O DHAP também pode ser convertido em G3P pela triose fosfato isomerase.\n\nA deficiência de aldolase B causa o distúrbio potencialmente fatal conhecido como intolerância hereditária à frutose. Os pacientes tipicamente se apresentam quando alimentos contendo frutose são introduzidos na dieta. As principais manifestações são vômitos e hipoglicemia cerca de 20-30 minutos após a ingestão de frutose. A hipoglicemia resulta do acúmulo intracelular de frutose-1-fosfato e da depleção de fosfato inorgânico, que inibem a glicogenólise e a gliconeogênese. Falha no crescimento, hepatomegalia e icterícia também podem ocorrer. Indivíduos não diagnosticados podem eventualmente desenvolver insuficiência hepática e renal. A eliminação da frutose da dieta é o pilar do tratamento e resulta em melhora dos sintomas com bom prognóstico a longo prazo.',
        explI:[
          {option:'A and D', explanation:'A deficiência de galactose-1-fosfato uridiltransferase (galactosemia clássica) é um distúrbio autossômico recessivo caracterizado por vômitos, intolerância alimentar, icterícia neonatal, hepatomegalia e morte se não tratado. Os sintomas começam logo após o início da amamentação. A deficiência de galactocinase é um distúrbio mais benigno do metabolismo da galactose que resulta na formação de catarata neonatal.'},
          {option:'C', explanation:'A deficiência de frutocinase causa frutosúria essencial, um distúrbio autossômico recessivo benigno. A frutose da dieta é absorvida e secretada livremente na urina devido ao comprometimento da primeira etapa do metabolismo da frutose.'},
          {option:'E', explanation:'A glicogenólise é realizada principalmente pela glicogênio fosforilase e pela enzima desramificadora, mas uma pequena quantidade também é degradada pela enzima lisossômica alfa-1,4-glicosidase. A deficiência de alfa-glicosidase (ou maltase ácida) causa a doença de Pompe. Essa doença não se manifesta com hipoglicemia, mas com cardiomiopatia e hipotonia.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0031', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'A 6-month-old girl is brought to the office by her mother for a check-up appointment. The mother states, "My baby doesn\'t seem to be growing much despite feeding as often as my previous children. I\'m worried that something is wrong with her." Height and weight are below the 10th percentile. Physical examination shows hepatomegaly and hypotonia. Laboratory results show hypoglycemia and ketoacidosis. Liver biopsy shows hepatic fibrosis without fat accumulation. Further analysis reveals excessive amounts of abnormally structured polysaccharides within the cytosol of the hepatocytes.',
      q:'Which of the following enzymes is most likely deficient in this patient?',
      options:[
        {label:'A', text:'Acid alpha-glucosidase'},
        {label:'B', text:'Glucose-6-phosphatase'},
        {label:'C', text:'Glycogen debrancher enzyme'},
        {label:'D', text:'Liver glycogen phosphorylase'},
        {label:'E', text:'Muscle glycogen phosphorylase'},
        {label:'F', text:'Pyruvate kinase'},
      ],
      correct:'C',
      explC:'Glycogen debrancher deficiency (Cori disease) usually presents early in life with hypoglycemia, hepatomegaly, and ketoacidosis. Muscle involvement (eg, weakness, hypotonia) helps distinguish it from other glycogen storage diseases that involve only the liver (eg, von Gierke disease). Another key feature is cytosolic accumulation of abnormal glycogen containing short outer chains, contributing to hepatic fibrosis.\n\nDuring glycogenolysis, glycogen phosphorylase shortens glycogen chains by cleaving linkages between glucose residues, liberating glucose-1-phosphate. This occurs until 4 residues remain before a branch point (ie, limit dextrin). From here, debranching enzymes (glycogen debrancher) perform 2 functions:\n1. Glucosyltransferase cleaves the outer 3 of the 4 glucose residues, transferring them to a nearby branch.\n2. Alpha-1,6-glucosidase removes the single remaining residue, producing free glucose and a linear glycogen chain that can be further shortened by glycogen phosphorylase.',
      explI:[
        {option:'A', explanation:'Small amounts of glycogen are engulfed by lysosomes and broken down by acid alpha-glucosidase (acid maltase). Acid maltase deficiency (Pompe disease) is characterized by cardiomegaly, severe generalized hypotonia, and lysosomal glycogen accumulation (hypoglycemia is not seen).'},
        {option:'B', explanation:'Glucose-6-phosphatase deficiency (von Gierke disease) affects mainly the liver and kidney because the enzyme is not expressed in significant quantities in muscle tissue. Major symptoms include hypoglycemia, lactic acidosis, and hyperlipidemia. Hepatic steatosis is a cardinal manifestation.'},
        {option:'D', explanation:'Liver glycogen phosphorylase deficiency (Hers disease) presents in early childhood with mild hypoglycemia, ketosis, and hepatomegaly. However, it does not affect skeletal muscles and shows an excess of normally structured glycogen (not abnormally short "limit dextrins") on liver biopsy.'},
        {option:'E', explanation:'Muscle glycogen phosphorylase deficiency (McArdle disease) presents with decreased exercise tolerance, muscle cramping during strenuous activity, and myoglobinuria. Blood lactate is often very low after exercise, and muscle biopsy shows an excess of normally structured glycogen.'},
        {option:'F', explanation:'Pyruvate kinase (PK) converts phosphoenolpyruvate to pyruvate during glycolysis. PK deficiency causes chronic hemolytic anemia because glycolysis is the main source of energy for erythrocytes.'},
      ],
      objective:'Glycogen debrancher deficiency (Cori disease) causes accumulation of glycogen with abnormally short outer chains (limit dextrins) due to the inability to degrade branch points. Patients have hypoglycemia, ketoacidosis, hepatomegaly, muscle weakness, and hypotonia.',
      peer:{A:7, B:24, C:43, D:19, E:2, F:2},
      img:'assets/qbank/CMQ-STEP1-BCH-0031_impairments_glycogenolysis.png',
      labs:[
        ['Glucose, plasma (infant hypoglycemia threshold)', '<45 mg/dL (infant); normal fasting 70–100 mg/dL', '<45 mg/dL (lactente); jejum normal 70–100 mg/dL',
         'Decreased below this threshold in glycogen debrancher deficiency (Cori disease) due to impaired glycogenolysis distal to the limit dextrin',
         'Diminuída abaixo deste limiar na deficiência da enzima desramificadora do glicogênio (doença de Cori) por glicogenólise prejudicada além da dextrina limite'],
      ],
      ptTranslation:{
        vignette:'Uma menina de 6 meses é levada ao consultório por sua mãe para uma consulta de rotina. A mãe relata: "Minha bebê não parece estar crescendo muito, apesar de se alimentar com a mesma frequência que meus filhos anteriores. Estou preocupada que algo esteja errado com ela." A altura e o peso estão abaixo do percentil 10. O exame físico mostra hepatomegalia e hipotonia. Os resultados laboratoriais mostram hipoglicemia e cetoacidose. A biópsia hepática mostra fibrose hepática sem acúmulo de gordura. Uma análise adicional revela quantidades excessivas de polissacarídeos com estrutura anormal no citosol dos hepatócitos.',
        q:'Qual das seguintes enzimas está mais provavelmente deficiente nesta paciente?',
        objective:'A deficiência da enzima desramificadora do glicogênio (doença de Cori) causa acúmulo de glicogênio com cadeias externas anormalmente curtas (dextrinas limite) devido à incapacidade de degradar os pontos de ramificação. Os pacientes apresentam hipoglicemia, cetoacidose, hepatomegalia, fraqueza muscular e hipotonia.',
        options:[
          {label:'A', text:'Alfa-glicosidase ácida'},
          {label:'B', text:'Glicose-6-fosfatase'},
          {label:'C', text:'Enzima desramificadora do glicogênio'},
          {label:'D', text:'Glicogênio fosforilase hepática'},
          {label:'E', text:'Glicogênio fosforilase muscular'},
          {label:'F', text:'Piruvato cinase'},
        ],
        explC:'A deficiência da enzima desramificadora do glicogênio (doença de Cori) geralmente se manifesta precocemente na vida com hipoglicemia, hepatomegalia e cetoacidose. O envolvimento muscular (por exemplo, fraqueza, hipotonia) ajuda a diferenciá-la de outras doenças de armazenamento de glicogênio que envolvem apenas o fígado (por exemplo, doença de von Gierke). Outra característica fundamental é o acúmulo citosólico de glicogênio anormal contendo cadeias externas curtas, contribuindo para a fibrose hepática.\n\nDurante a glicogenólise, a glicogênio fosforilase encurta as cadeias de glicogênio ao clivar as ligações entre resíduos de glicose, liberando glicose-1-fosfato. Isso ocorre até restarem 4 resíduos antes de um ponto de ramificação (ou seja, a dextrina limite). A partir daí, as enzimas desramificadoras (glycogen debrancher) realizam 2 funções:\n1. A glicosiltransferase cliva os 3 resíduos externos dos 4 resíduos de glicose, transferindo-os para um ramo próximo.\n2. A alfa-1,6-glicosidase remove o resíduo único restante, produzindo glicose livre e uma cadeia linear de glicogênio que pode ser posteriormente encurtada pela glicogênio fosforilase.',
        explI:[
          {option:'A', explanation:'Pequenas quantidades de glicogênio são englobadas pelos lisossomos e degradadas pela alfa-glicosidase ácida (maltase ácida). A deficiência de maltase ácida (doença de Pompe) é caracterizada por cardiomegalia, hipotonia generalizada grave e acúmulo lisossômico de glicogênio (hipoglicemia não é observada).'},
          {option:'B', explanation:'A deficiência de glicose-6-fosfatase (doença de von Gierke) afeta principalmente o fígado e o rim, pois a enzima não é expressa em quantidades significativas no tecido muscular. Os principais sintomas incluem hipoglicemia, acidose láctica e hiperlipidemia. A esteatose hepática é uma manifestação cardinal.'},
          {option:'D', explanation:'A deficiência de glicogênio fosforilase hepática (doença de Hers) manifesta-se no início da infância com hipoglicemia leve, cetose e hepatomegalia. Entretanto, não afeta os músculos esqueléticos e mostra excesso de glicogênio com estrutura normal (não "dextrinas limite" anormalmente curtas) na biópsia hepática.'},
          {option:'E', explanation:'A deficiência de glicogênio fosforilase muscular (doença de McArdle) manifesta-se com redução da tolerância ao exercício, cãibras musculares durante atividade intensa e mioglobinúria. O lactato sanguíneo costuma estar muito baixo após o exercício, e a biópsia muscular mostra excesso de glicogênio com estrutura normal.'},
          {option:'F', explanation:'A piruvato cinase (PK) converte fosfoenolpiruvato em piruvato durante a glicólise. A deficiência de PK causa anemia hemolítica crônica, pois a glicólise é a principal fonte de energia para os eritrócitos.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0037', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'medium',
      vignette:'A 5-day-old term newborn is brought to the emergency department for multiple episodes of emesis. The breastfed infant has been having fewer wet diapers over the last 2 days. Vital signs show tachycardia, tachypnea, and hypotension. Physical examination shows an icteric, lethargic baby with a sunken fontanelle, dry mucous membranes, and hepatomegaly. A blood culture is drawn and empiric antibiotics are initiated. Hematologic studies show leukocytosis with bandemia. Serum studies show hypoglycemia and elevated transaminases. The ammonia level is normal. Preliminary results from arterial blood culture show gram-negative rods. The infant is placed on a special formula and gradually improves over the next few days.',
      q:'Which of the following steps in metabolism is most likely impaired in this infant?',
      options:[
        {label:'A', text:'A'},
        {label:'B', text:'B'},
        {label:'C', text:'C'},
        {label:'D', text:'D'},
        {label:'E', text:'E'},
      ],
      correct:'D',
      explC:'Lactose (milk sugar) is degraded by lactase, the intestinal disaccharidase, to galactose and glucose. Galactose is then phosphorylated to galactose-1-phosphate by the enzyme galactokinase (GALK). Galactose-1-phosphate is converted to glucose-1-phosphate by epimerization with transfer of uridine diphosphate (UDP) from UDP-glucose to UDP-galactose. This reaction is catalyzed by galactose-1-phosphate uridyl transferase (GALT). UDP-galactose is then epimerized to UDP-glucose by UDP-galactose-4-epimerase. Although GALT deficiency is the most common form, a defect in any of these three enzymes can cause galactosemia.\n\nGalactosemia can present with vomiting and lethargy soon after initiation of breastfeeding. In GALT deficiency, toxicity of accumulated galactose-1-phosphate is responsible for impaired liver function (transaminitis, hyperbilirubinemia), hypoglycemia, and renal dysfunction (hyperchloremic metabolic acidosis, aminoaciduria). Patients are also predisposed to Escherichia coli (gram-negative rod) sepsis.\n\nRestricting lactose intake (eg, breast milk) and initiation of soy milk-based formula can result in regression of cataracts and improvement in renal and liver function. Soy milk consists of sucrose, which is metabolized to glucose and fructose. Glucose and fructose do not need GALT or GALK to enter the glycolytic pathway and generate energy.',
      explI:[
        {option:'A', explanation:'Lactase hydrolyzes lactose to galactose in the small intestine. Primary lactase deficiency causes lactose intolerance and is rare in neonates.'},
        {option:'B', explanation:'Aldose reductase converts galactose to galactitol. GALT and GALK deficiency can lead to galactitol accumulation in the lens, which can lead to cataract formation in patients with galactosemia. However, aldose reductase deficiency does not cause galactosemia.'},
        {option:'C', explanation:'GALK phosphorylates galactose and its deficiency typically causes less severe manifestations of galactosemia with cataract formation (due to galactitol) being the most common manifestation. Because galactose-1-phosphate does not accumulate, liver and renal functions are preserved.'},
        {option:'E', explanation:'Phosphoglucomutase isomerizes glucose-1-phosphate to glucose-6-phosphate, which then enters the glycolytic pathway. Its deficiency is rare. In GALT deficiency, accumulation of galactose-1-phosphate blocks phosphoglucomutase, thereby preventing energy production via glycolysis.'},
      ],
      objective:'Classic galactosemia results from deficiency of galactose-1-phosphate uridyl transferase. Clinical features include vomiting, lethargy, jaundice, and Escherichia coli sepsis. Cessation of breastfeeding and switching to soy milk-based formula is recommended.',
      peer:{A:16, B:3, C:16, D:51, E:11},
      img:'assets/qbank/CMQ-STEP1-BCH-0037_galactose_metabolism_lettered_diagram.png',
      labs:[
        ['Galactose-1-phosphate, erythrocyte', '<1.0 mg/dL', '<1,0 mg/dL',
         'Markedly elevated (often >10 mg/dL) in classic galactosemia (GALT deficiency) due to accumulation of the toxic metabolite',
         'Marcadamente elevada (geralmente >10 mg/dL) na galactosemia clássica (deficiência de GALT) pelo acúmulo do metabólito tóxico'],
      ],
      ptTranslation:{
        vignette:'Um recém-nascido a termo de 5 dias é levado ao pronto-socorro por múltiplos episódios de vômito. O bebê amamentado tem tido menos fraldas molhadas nos últimos 2 dias. Os sinais vitais mostram taquicardia, taquipneia e hipotensão. O exame físico mostra um bebê ictérico, letárgico, com fontanela deprimida, mucosas secas e hepatomegalia. Uma hemocultura é coletada e antibióticos empíricos são iniciados. Os estudos hematológicos mostram leucocitose com bandemia. Os exames séricos mostram hipoglicemia e transaminases elevadas. O nível de amônia é normal. Os resultados preliminares da hemocultura arterial mostram bacilos gram-negativos. O bebê é colocado em uma fórmula especial e melhora gradualmente nos dias seguintes.',
        q:'Qual das seguintes etapas do metabolismo está mais provavelmente prejudicada neste bebê?',
        objective:'A galactosemia clássica resulta da deficiência de galactose-1-fosfato uridiltransferase. As características clínicas incluem vômitos, letargia, icterícia e sepse por Escherichia coli. A suspensão da amamentação e a troca para fórmula à base de soja são recomendadas.',
        options:[
          {label:'A', text:'A'},
          {label:'B', text:'B'},
          {label:'C', text:'C'},
          {label:'D', text:'D'},
          {label:'E', text:'E'},
        ],
        explC:'A lactose (açúcar do leite) é degradada pela lactase, a dissacaridase intestinal, em galactose e glicose. A galactose é então fosforilada a galactose-1-fosfato pela enzima galactocinase (GALK). A galactose-1-fosfato é convertida em glicose-1-fosfato por epimerização com transferência de difosfato de uridina (UDP) de UDP-glicose para UDP-galactose. Essa reação é catalisada pela galactose-1-fosfato uridiltransferase (GALT). A UDP-galactose é então epimerizada a UDP-glicose pela UDP-galactose-4-epimerase. Embora a deficiência de GALT seja a forma mais comum, um defeito em qualquer uma dessas três enzimas pode causar galactosemia.\n\nA galactosemia pode se manifestar com vômitos e letargia logo após o início da amamentação. Na deficiência de GALT, a toxicidade do acúmulo de galactose-1-fosfato é responsável pela função hepática prejudicada (transaminite, hiperbilirrubinemia), hipoglicemia e disfunção renal (acidose metabólica hiperclorêmica, aminoacidúria). Os pacientes também têm predisposição à sepse por Escherichia coli (bacilo gram-negativo).\n\nA restrição da ingestão de lactose (por exemplo, leite materno) e o início de fórmula à base de leite de soja podem resultar em regressão de catarata e melhora da função renal e hepática. O leite de soja é composto de sacarose, que é metabolizada em glicose e frutose. Glicose e frutose não precisam de GALT ou GALK para entrar na via glicolítica e gerar energia.',
        explI:[
          {option:'A', explanation:'A lactase hidrolisa a lactose em galactose e glicose no intestino delgado. A deficiência primária de lactase causa intolerância à lactose e é rara em neonatos.'},
          {option:'B', explanation:'A aldose redutase converte galactose em galactitol. A deficiência de GALT e de GALK pode levar ao acúmulo de galactitol no cristalino, o que pode causar catarata em pacientes com galactosemia. Entretanto, a deficiência de aldose redutase não causa galactosemia.'},
          {option:'C', explanation:'A GALK fosforila a galactose, e sua deficiência tipicamente causa manifestações menos graves de galactosemia, sendo a catarata (devido ao galactitol) a manifestação mais comum. Como a galactose-1-fosfato não se acumula, as funções hepática e renal são preservadas.'},
          {option:'E', explanation:'A fosfoglicomutase isomeriza glicose-1-fosfato em glicose-6-fosfato, que então entra na via glicolítica. Sua deficiência é rara. Na deficiência de GALT, o acúmulo de galactose-1-fosfato bloqueia a fosfoglicomutase, impedindo assim a produção de energia pela glicólise.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0038', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'A 43-year-old man prospecting for gold in Arizona becomes stuck in the desert after his truck breaks down. He brought a large supply of water with him but only a few granola bars as food. After 3 days, he is able to flag down a passing vehicle and obtain transportation to the nearest settlement. During this ordeal, his liver begins to synthesize large quantities of glucose from source molecules such as alanine, lactate, and glycerol. As part of this process, phosphoenolpyruvate is formed from oxaloacetate in a reaction that requires a specific nucleoside triphosphate as a cofactor.',
      q:'Which of the following reactions directly synthesizes this cofactor?',
      options:[
        {label:'A', text:'A'},
        {label:'B', text:'B'},
        {label:'C', text:'C'},
        {label:'D', text:'D'},
        {label:'E', text:'E'},
        {label:'F', text:'F'},
        {label:'G', text:'G'},
        {label:'H', text:'H'},
      ],
      correct:'E',
      explC:'ATP can also be generated by substrate-level phosphorylation, which involves the direct transfer of a phosphate group from a reactive intermediate to a nucleotide diphosphate (eg, ADP, GDP). Succinyl-CoA synthetase converts succinyl-CoA to succinate and uses the high-energy thioester present in succinyl-CoA to drive GTP synthesis. This GTP can then be used to transphosphorylate ADP to ATP, or it may be utilized by specific GTP-hydrolyzing enzymes, such as phosphoenolpyruvate carboxykinase (converts oxaloacetate to phosphoenolpyruvate during gluconeogenesis).',
      explI:[
        {option:'C, D, F, and H', explanation:'The majority of ATP used for cellular processes is generated by the oxidation of acetate in the tricarboxylic acid (TCA) cycle. The enzymes of the TCA cycle are located in the mitochondria and generate reduced nicotinamide adenine dinucleotide (NADH) and flavin adenine dinucleotide (FADH2). These molecules drive the process of oxidative phosphorylation, which converts their reducing potential into high-energy ATP via the electron transport chain.'},
      ],
      objective:'GTP is synthesized by succinyl-CoA synthetase during the conversion of succinyl-CoA to succinate in the citric acid cycle. During gluconeogenesis, phosphoenolpyruvate carboxykinase uses GTP to synthesize phosphoenolpyruvate from oxaloacetate.',
      peer:{A:3, B:3, C:10, D:20, E:39, F:11, G:4, H:5},
      img:['assets/qbank/CMQ-STEP1-BCH-0038_tca_cycle_lettered_diagram.png', 'assets/qbank/CMQ-STEP1-BCH-0038_tca_cycle_gtp_pepck.png'],
      ptTranslation:{
        vignette:'Um homem de 43 anos que prospecta ouro no Arizona fica preso no deserto depois que seu caminhão quebra. Ele trouxe um grande suprimento de água, mas apenas algumas barras de granola como alimento. Após 3 dias, ele consegue parar um veículo que passava e obter transporte até o povoado mais próximo. Durante essa provação, seu fígado começa a sintetizar grandes quantidades de glicose a partir de moléculas de origem como alanina, lactato e glicerol. Como parte desse processo, o fosfoenolpiruvato é formado a partir do oxaloacetato em uma reação que requer um nucleosídeo trifosfato específico como cofator.',
        q:'Qual das seguintes reações sintetiza diretamente esse cofator?',
        objective:'O GTP é sintetizado pela succinil-CoA sintetase durante a conversão de succinil-CoA em succinato no ciclo do ácido cítrico. Durante a gliconeogênese, a fosfoenolpiruvato carboxicinase utiliza GTP para sintetizar fosfoenolpiruvato a partir de oxaloacetato.',
        options:[
          {label:'A', text:'A'},
          {label:'B', text:'B'},
          {label:'C', text:'C'},
          {label:'D', text:'D'},
          {label:'E', text:'E'},
          {label:'F', text:'F'},
          {label:'G', text:'G'},
          {label:'H', text:'H'},
        ],
        explC:'O ATP também pode ser gerado por fosforilação em nível de substrato, que envolve a transferência direta de um grupo fosfato de um intermediário reativo para um nucleotídeo difosfato (por exemplo, ADP, GDP). A succinil-CoA sintetase converte succinil-CoA em succinato e utiliza o tioéster de alta energia presente na succinil-CoA para impulsionar a síntese de GTP. Esse GTP pode então ser usado para transfosforilar ADP a ATP, ou pode ser utilizado por enzimas específicas hidrolisadoras de GTP, como a fosfoenolpiruvato carboxicinase (que converte oxaloacetato em fosfoenolpiruvato durante a gliconeogênese).',
        explI:[
          {option:'C, D, F, and H', explanation:'A maior parte do ATP utilizado nos processos celulares é gerada pela oxidação do acetato no ciclo do ácido tricarboxílico (ciclo de Krebs). As enzimas do ciclo de Krebs estão localizadas nas mitocôndrias e geram nicotinamida adenina dinucleotídeo reduzida (NADH) e flavina adenina dinucleotídeo (FADH2). Essas moléculas impulsionam o processo de fosforilação oxidativa, que converte seu potencial redutor em ATP de alta energia por meio da cadeia de transporte de elétrons.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0039', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'medium',
      vignette:'Erythroblasts isolated from a bone marrow biopsy sample of a patient with neonatal jaundice are incubated in a medium containing radiolabeled glucose. The cells are unable to generate NADPH from glucose metabolism but are able to convert fructose-6-phosphate to ribose-5-phosphate, which is required for nucleic acid synthesis.',
      q:'Which of the following enzymes is essential for the latter conversion?',
      options:[
        {label:'A', text:'Aconitase'},
        {label:'B', text:'Enolase'},
        {label:'C', text:'Glucose-6-phosphate dehydrogenase'},
        {label:'D', text:'Glutathione reductase'},
        {label:'E', text:'Transketolase'},
      ],
      correct:'E',
      explC:'The pentose phosphate pathway (HMP shunt) generates NADPH for use in reductive reactions and ribose-5-phosphate, a precursor for the synthesis of nucleotides. The pathway consists of 2 types of reactions, oxidative (irreversible) and nonoxidative (reversible), both of which can function independently depending on cellular requirements.\n\nActivity of the nonoxidative reactions is governed by the cellular demand for ribose-5-phosphate. When ribose-5-phosphate is produced in excess, transketolase and transaldolase can produce the glycolytic intermediates glyceraldehyde-3-phosphate and fructose-6-phosphate for ATP generation. When ribose-5-phosphate demand exceeds the production capabilities of the oxidative pathway, the nonoxidative pathway functions in reverse and transketolase and transaldolase catalyze the conversion of fructose-6-phosphate and glyceraldehyde-3-phosphate to ribose-5-phosphate.',
      explI:[
        {option:'A', explanation:'Aconitase catalyzes the isomerization of citrate to isocitrate in the citric acid cycle.'},
        {option:'B', explanation:'Enolase catalyzes the conversion of 2-phosphoglycerate to phosphoenolpyruvate in glycolysis.'},
        {option:'C', explanation:'Glucose-6-phosphate dehydrogenase catalyzes the initial and rate-limiting step of the pentose phosphate pathway. Deficiency of this enzyme results in hemolytic anemia due to the inability to generate NADPH in the oxidative portion of the pathway. However, nonoxidative reactions are responsible for conversion of fructose-6-phosphate to ribose-5-phosphate.'},
        {option:'D', explanation:'Glutathione reductase catalyzes the reduction of glutathione disulfide to glutathione using NADPH. Glutathione aids red blood cells in resisting oxidative stress.'},
      ],
      objective:'The pentose phosphate pathway consists of an oxidative (irreversible) branch and a nonoxidative (reversible) branch, and each can function independently based on cellular requirements. Transketolase, an enzyme of the nonoxidative branch, is responsible in part for the interconversion of ribose-5-phosphate (nucleotide precursor) and fructose-6-phosphate (glycolytic intermediate).',
      peer:{A:3, B:11, C:19, D:8, E:57},
      img:'assets/qbank/CMQ-STEP1-BCH-0039_pentose_phosphate_pathway.png',
      ptTranslation:{
        vignette:'Eritroblastos isolados de uma amostra de biópsia de medula óssea de um paciente com icterícia neonatal são incubados em um meio contendo glicose radiomarcada. As células são incapazes de gerar NADPH a partir do metabolismo da glicose, mas são capazes de converter frutose-6-fosfato em ribose-5-fosfato, necessária para a síntese de ácidos nucleicos.',
        q:'Qual das seguintes enzimas é essencial para essa última conversão?',
        objective:'A via das pentoses fosfato consiste em um ramo oxidativo (irreversível) e um ramo não oxidativo (reversível), e cada um pode funcionar de forma independente, de acordo com as necessidades celulares. A transcetolase, uma enzima do ramo não oxidativo, é responsável, em parte, pela interconversão entre ribose-5-fosfato (precursor de nucleotídeos) e frutose-6-fosfato (intermediário glicolítico).',
        options:[
          {label:'A', text:'Aconitase'},
          {label:'B', text:'Enolase'},
          {label:'C', text:'Glicose-6-fosfato desidrogenase'},
          {label:'D', text:'Glutationa redutase'},
          {label:'E', text:'Transcetolase'},
        ],
        explC:'A via das pentoses fosfato (via do HMP) gera NADPH para uso em reações redutoras e ribose-5-fosfato, um precursor para a síntese de nucleotídeos. A via consiste em 2 tipos de reações, oxidativa (irreversível) e não oxidativa (reversível), ambas capazes de funcionar de forma independente, dependendo das necessidades celulares.\n\nA atividade das reações não oxidativas é regida pela demanda celular de ribose-5-fosfato. Quando a ribose-5-fosfato é produzida em excesso, a transcetolase e a transaldolase podem produzir os intermediários glicolíticos gliceraldeído-3-fosfato e frutose-6-fosfato para geração de ATP. Quando a demanda de ribose-5-fosfato excede a capacidade de produção da via oxidativa, a via não oxidativa funciona em sentido inverso, e a transcetolase e a transaldolase catalisam a conversão de frutose-6-fosfato e gliceraldeído-3-fosfato em ribose-5-fosfato.',
        explI:[
          {option:'A', explanation:'A aconitase catalisa a isomerização de citrato a isocitrato no ciclo do ácido cítrico.'},
          {option:'B', explanation:'A enolase catalisa a conversão de 2-fosfoglicerato em fosfoenolpiruvato na glicólise.'},
          {option:'C', explanation:'A glicose-6-fosfato desidrogenase catalisa a etapa inicial e limitante da via das pentoses fosfato. A deficiência dessa enzima resulta em anemia hemolítica devido à incapacidade de gerar NADPH na porção oxidativa da via. Entretanto, as reações não oxidativas são responsáveis pela conversão de frutose-6-fosfato em ribose-5-fosfato.'},
          {option:'D', explanation:'A glutationa redutase catalisa a redução da glutationa dissulfeto a glutationa usando NADPH. A glutationa auxilia os eritrócitos a resistir ao estresse oxidativo.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0040', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'hard',
      vignette:'A 31-year-old man comes to the office for a routine checkup. He has no significant medical problems and does not take any medications. The patient works as a fitness trainer and lifts weights recreationally. He has been consuming carbohydrate-rich food prior to his weightlifting sessions and claims that it increases muscle strength. A literature review shows that the rate of glycogenolysis within myocytes increases several hundredfold during active skeletal muscle contraction.',
      q:'Which of the following substances is most likely responsible for increasing the reaction rate during active contraction?',
      options:[
        {label:'A', text:'ATP'},
        {label:'B', text:'Ca2+'},
        {label:'C', text:'cAMP'},
        {label:'D', text:'Glucose-6-phosphate'},
        {label:'E', text:'Lactate'},
      ],
      correct:'B',
      explC:'Glycogen is broken down by the enzyme glycogen phosphorylase, which is regulated through phosphorylation (active state) and dephosphorylation (inactive state). Phosphorylase kinase (PK) is the enzyme responsible for the phosphorylation of glycogen phosphorylase, whereas phosphoprotein phosphatase catalyzes its dephosphorylation.\n\nPK is regulated differently in liver than in muscles. Glycogen stored in the liver is used to maintain blood glucose levels during the fasting state, whereas glycogen in the muscles is used to provide energy for muscle contraction. In the liver, PK is activated primarily through the binding of epinephrine and glucagon to Gs protein-coupled receptors, which increases cAMP concentrations and causes phosphorylation of PK (via protein kinase A).\n\nSkeletal muscle lacks glucagon receptors, but muscle PK can still be phosphorylated in response to an epinephrine-induced increase in cAMP concentrations. However, increased intracellular calcium is a more powerful activator of muscle PK. Release of sarcoplasmic calcium stores following neuromuscular acetylcholine stimulation allows for synchronization of skeletal muscle contraction and glycogen breakdown, providing the energy necessary for anaerobic muscle contraction.',
      explI:[
        {option:'A and D', explanation:'Phosphorylated glycogen phosphorylase (active form) is allosterically inhibited by ATP and glucose-6-phosphate in both liver and muscle cells. Increased intracellular ATP levels help to decrease the rate of glycogenolysis upon cessation of active muscle contraction.'},
        {option:'C', explanation:'Although increased cAMP stimulates muscle glycogen breakdown via the action of epinephrine on beta-1 adrenergic receptors, it is not responsible for synchronization of active muscle contraction and glycogen breakdown.'},
        {option:'E', explanation:'Lactate is produced in tissues during anaerobic glycolysis, such as in muscles during strenuous exercise as a result of relatively hypoxic conditions. The lactate produced by the muscles can be converted to glucose in the liver via gluconeogenesis.'},
      ],
      objective:'Synchronization of glycogen degradation with skeletal muscle contraction occurs due to release of sarcoplasmic calcium following neuromuscular stimulation. Increased intracellular calcium causes activation of phosphorylase kinase, stimulating glycogen phosphorylase to increase glycogenolysis.',
      peer:{A:15, B:39, C:22, D:6, E:15},
      img:'assets/qbank/CMQ-STEP1-BCH-0040_regulation_glycogenolysis_calcium.png',
      ptTranslation:{
        vignette:'Um homem de 31 anos vem ao consultório para um check-up de rotina. Ele não tem problemas médicos significativos e não toma nenhum medicamento. O paciente trabalha como personal trainer e levanta peso recreativamente. Ele tem consumido alimentos ricos em carboidratos antes de suas sessões de musculação e afirma que isso aumenta a força muscular. Uma revisão da literatura mostra que a taxa de glicogenólise dentro dos miócitos aumenta várias centenas de vezes durante a contração muscular esquelética ativa.',
        q:'Qual das seguintes substâncias é mais provavelmente responsável por aumentar a taxa da reação durante a contração ativa?',
        objective:'A sincronização da degradação do glicogênio com a contração muscular esquelética ocorre devido à liberação de cálcio sarcoplasmático após a estimulação neuromuscular. O aumento do cálcio intracelular causa a ativação da fosforilase cinase, estimulando a glicogênio fosforilase a aumentar a glicogenólise.',
        options:[
          {label:'A', text:'ATP'},
          {label:'B', text:'Ca2+'},
          {label:'C', text:'AMPc'},
          {label:'D', text:'Glicose-6-fosfato'},
          {label:'E', text:'Lactato'},
        ],
        explC:'O glicogênio é degradado pela enzima glicogênio fosforilase, que é regulada por fosforilação (estado ativo) e desfosforilação (estado inativo). A fosforilase cinase (PK) é a enzima responsável pela fosforilação da glicogênio fosforilase, enquanto a fosfoproteína fosfatase catalisa sua desfosforilação.\n\nA PK é regulada de forma diferente no fígado e nos músculos. O glicogênio armazenado no fígado é usado para manter os níveis de glicose sanguínea durante o estado de jejum, enquanto o glicogênio nos músculos é usado para fornecer energia para a contração muscular. No fígado, a PK é ativada principalmente pela ligação de epinefrina e glucagon a receptores acoplados à proteína Gs, o que aumenta as concentrações de AMPc e causa a fosforilação da PK (via proteína cinase A).\n\nO músculo esquelético não possui receptores de glucagon, mas a PK muscular ainda pode ser fosforilada em resposta a um aumento das concentrações de AMPc induzido pela epinefrina. Entretanto, o aumento do cálcio intracelular é um ativador mais potente da PK muscular. A liberação dos estoques de cálcio sarcoplasmático após a estimulação por acetilcolina neuromuscular permite a sincronização da contração muscular esquelética com a degradação do glicogênio, fornecendo a energia necessária para a contração muscular anaeróbica.',
        explI:[
          {option:'A and D', explanation:'A glicogênio fosforilase fosforilada (forma ativa) é inibida alostericamente por ATP e glicose-6-fosfato tanto em células hepáticas quanto musculares. O aumento dos níveis intracelulares de ATP ajuda a diminuir a taxa de glicogenólise após a cessação da contração muscular ativa.'},
          {option:'C', explanation:'Embora o aumento do AMPc estimule a degradação do glicogênio muscular por meio da ação da epinefrina em receptores beta-1 adrenérgicos, ele não é responsável pela sincronização entre a contração muscular ativa e a degradação do glicogênio.'},
          {option:'E', explanation:'O lactato é produzido nos tecidos durante a glicólise anaeróbica, como nos músculos durante exercício extenuante, em decorrência de condições relativamente hipóxicas. O lactato produzido pelos músculos pode ser convertido em glicose no fígado por meio da gliconeogênese.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0041', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::bioenergetics_carb_metabolism', difficulty:'easy',
      vignette:'A 6-month-old full-term boy is brought to the emergency department with lethargy and vomiting. He was born by uncomplicated spontaneous vaginal delivery and has been growing and developing normally. The patient was breastfed exclusively until 2 days ago when homemade pureed food was added to his diet. He has had no fever or diarrhea. His parents are healthy and he has had no sick contacts. Examination shows a pale, diaphoretic, and ill-appearing infant. Serum glucose is 30 mg/dL. Diagnostic testing confirms aldolase B deficiency.',
      q:'Which of the following should be removed from this patient\'s diet?',
      options:[
        {label:'A', text:'Amylose'},
        {label:'B', text:'Cellulose'},
        {label:'C', text:'Galactose'},
        {label:'D', text:'Glucose'},
        {label:'E', text:'Lactose'},
        {label:'F', text:'Maltose'},
        {label:'G', text:'Sucrose'},
      ],
      correct:'G',
      explC:'Carbohydrates are classified as monosaccharides, disaccharides, and polysaccharides. Disaccharides and polysaccharides must be broken down to their monosaccharide components for energy production and utilization.\n\nAldolase B metabolizes fructose-1-phosphate, a product of fructose metabolism, to dihydroxyacetone phosphate (DHAP) and glyceraldehyde, which can then enter the glycolytic pathway. Aldolase B deficiency can result in fructose-1-phosphate accumulation; this toxic metabolite depletes intracellular phosphate and inhibits the activation of hepatic phosphorylase and gluconeogenesis. The resulting condition, hereditary fructose intolerance (eg, fructosemia), is an autosomal recessive disorder.\n\nBecause gluconeogenesis is impaired, fructosemia typically presents with life-threatening hypoglycemia. Consequences of hypoglycemia include lethargy, sweating, vomiting, and dehydration. These symptoms manifest after intake of fructose or sucrose, such as from formula or fruit. Strict abstinence from dietary fructose and sucrose can result in dramatic recovery.',
      explI:[
        {option:'A and D', explanation:'Starch (similar to glycogen in mammals) is the major storage form of carbohydrates in plants and contains only glucose molecules. Starch consists of an unbranched portion composed of amylose and a branched portion called amylopectin. Patients with fructosemia have normal metabolism of glucose.'},
        {option:'B', explanation:'Cellulose is a linear polysaccharide of glucose that is mainly present in the cell wall of plant cells. Cellulose is an insoluble, indigestible dietary fiber that is responsible for the bulk of fecal matter.'},
        {option:'C, E, and F', explanation:'Breast milk contains the disaccharides lactose (composed of galactose and glucose) and maltose (composed of 2 glucose molecules). Patients with aldolase B deficiency can consume these disaccharides as their breakdown will not produce fructose. However, patients with galactosemia cannot metabolize galactose in breast milk or cow\'s milk-based formula. These patients typically present in the first few days of life with jaundice, vomiting, poor feeding, and hepatomegaly.'},
      ],
      objective:'Aldolase B deficiency, or hereditary fructose intolerance, leads to accumulation of the toxic metabolite fructose-1-phosphate. Patients have hypoglycemia and vomiting when fructose or sucrose is consumed. Treatment involves strict removal of both carbohydrates from the diet.',
      peer:{A:1, B:1, C:16, D:1, E:4, F:4, G:71},
      img:'assets/qbank/CMQ-STEP1-BCH-0041_disorders_fructose_metabolism.png',
      labs:[
        ['Glucose, plasma (infant hypoglycemia threshold)', '<45 mg/dL (infant); normal fasting 70–100 mg/dL', '<45 mg/dL (lactente); jejum normal 70–100 mg/dL',
         'Decreased here (30 mg/dL) in hereditary fructose intolerance (aldolase B deficiency) due to fructose-1-phosphate-induced inhibition of glycogenolysis and gluconeogenesis',
         'Diminuída neste caso (30 mg/dL) na intolerância hereditária à frutose (deficiência de aldolase B) pela inibição da glicogenólise e gliconeogênese induzida pela frutose-1-fosfato'],
      ],
      ptTranslation:{
        vignette:'Um menino nascido a termo de 6 meses é levado ao pronto-socorro com letargia e vômitos. Ele nasceu por parto vaginal espontâneo sem intercorrências e vem crescendo e se desenvolvendo normalmente. O paciente foi amamentado exclusivamente até 2 dias atrás, quando um alimento caseiro em purê foi adicionado à sua dieta. Ele não teve febre nem diarreia. Seus pais são saudáveis e ele não teve contatos com pessoas doentes. O exame mostra um bebê pálido, diaforético e com aspecto de doente. A glicose sérica é de 30 mg/dL. O teste diagnóstico confirma deficiência de aldolase B.',
        q:'Qual dos seguintes deve ser removido da dieta deste paciente?',
        objective:'A deficiência de aldolase B, ou intolerância hereditária à frutose, leva ao acúmulo do metabólito tóxico frutose-1-fosfato. Os pacientes apresentam hipoglicemia e vômitos quando frutose ou sacarose são consumidas. O tratamento envolve a remoção estrita de ambos os carboidratos da dieta.',
        options:[
          {label:'A', text:'Amilose'},
          {label:'B', text:'Celulose'},
          {label:'C', text:'Galactose'},
          {label:'D', text:'Glicose'},
          {label:'E', text:'Lactose'},
          {label:'F', text:'Maltose'},
          {label:'G', text:'Sacarose'},
        ],
        explC:'Os carboidratos são classificados em monossacarídeos, dissacarídeos e polissacarídeos. Dissacarídeos e polissacarídeos precisam ser degradados em seus componentes monossacarídeos para produção e utilização de energia.\n\nA aldolase B metaboliza a frutose-1-fosfato, um produto do metabolismo da frutose, em di-hidroxiacetona fosfato (DHAP) e gliceraldeído, que podem então entrar na via glicolítica. A deficiência de aldolase B pode resultar em acúmulo de frutose-1-fosfato; esse metabólito tóxico depleta o fosfato intracelular e inibe a ativação da fosforilase hepática e da gliconeogênese. A condição resultante, a intolerância hereditária à frutose (por exemplo, frutosemia), é um distúrbio autossômico recessivo.\n\nComo a gliconeogênese está prejudicada, a frutosemia tipicamente se manifesta com hipoglicemia potencialmente fatal. As consequências da hipoglicemia incluem letargia, sudorese, vômitos e desidratação. Esses sintomas se manifestam após a ingestão de frutose ou sacarose, como a partir de fórmula ou frutas. A abstinência estrita de frutose e sacarose na dieta pode resultar em recuperação dramática.',
        explI:[
          {option:'A and D', explanation:'O amido (semelhante ao glicogênio em mamíferos) é a principal forma de armazenamento de carboidratos nas plantas e contém apenas moléculas de glicose. O amido consiste em uma porção não ramificada composta por amilose e uma porção ramificada chamada amilopectina. Pacientes com frutosemia têm metabolismo normal da glicose.'},
          {option:'B', explanation:'A celulose é um polissacarídeo linear de glicose presente principalmente na parede celular das células vegetais. A celulose é uma fibra alimentar insolúvel e indigerível, responsável pela maior parte do volume fecal.'},
          {option:'C, E, and F', explanation:'O leite materno contém os dissacarídeos lactose (composta por galactose e glicose) e maltose (composta por 2 moléculas de glicose). Pacientes com deficiência de aldolase B podem consumir esses dissacarídeos, pois sua degradação não produzirá frutose. Entretanto, pacientes com galactosemia não conseguem metabolizar a galactose presente no leite materno ou em fórmulas à base de leite de vaca. Esses pacientes tipicamente se apresentam nos primeiros dias de vida com icterícia, vômitos, alimentação deficiente e hepatomegalia.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0042', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::lipid_metabolism', difficulty:'hard',
      vignette:'An 8-year-old boy is brought to the emergency department due to vomiting and lethargy. The patient had been on an overnight hiking trip with his family. During the trip, the family lost their food pack while canoeing and had to hike back to their car. The child became weak and was carried for the last mile. None of the family has eaten for approximately 24 hours. On examination, the patient appears listless. Mild hepatomegaly is noted. Laboratory results are as follows:\nGlucose 22 mg/dL\nAcetoacetate not detected\nAspartate aminotransferase 47 U/L\nAlanine aminotransferase 53 U/L\nThe patient begins seizing shortly after arriving at the emergency department.',
      q:'Which of the following enzymes is most likely deficient in this patient?',
      options:[
        {label:'A', text:'Acetyl-CoA carboxylase'},
        {label:'B', text:'Acid alpha-glucosidase'},
        {label:'C', text:'Acyl-CoA dehydrogenase'},
        {label:'D', text:'Glucose 6-phosphatase'},
        {label:'E', text:'Glycogen phosphorylase'},
      ],
      correct:'C',
      explC:'This patient developed hypoketotic hypoglycemia after fasting, which is consistent with a defect in fatty acid beta-oxidation in the mitochondria. Beta-oxidation of fatty acids yields FADH2 and NADH for ATP production and generates acetyl-CoA for use in the citric acid cycle or ketone body production. Ketone bodies are an important energy source during periods of fasting; adults generally require more than 1-2 days of fasting before ketone use becomes substantial, whereas children have limited glucose reserves and begin using ketone bodies after as little as 8-10 hours.\n\nImpaired beta-oxidation can be caused by a variety of enzymatic defects, the most common of which is medium chain acyl-CoA dehydrogenase deficiency. Affected individuals may remain asymptomatic for long periods until they experience a significant fast, during which they are unable to oxidize fatty acids to maintain glucose and ketone body production. Classic manifestations include hypoketotic hypoglycemia (eg, undetectable acetoacetate level), mild hepatomegaly, and liver dysfunction. Because the resulting metabolic crisis can have severe consequences (eg, seizures, sudden infant death), fatty acid oxidation disorders are part of standard newborn screening.\n\nTreatment of acyl-CoA dehydrogenase deficiency consists of prevention of fat catabolism. This means avoiding prolonged fasting as well as promptly supplying glucose during periods of illness.',
      explI:[
        {option:'A', explanation:'Acetyl-CoA carboxylase is the rate-limiting enzyme that catalyzes the first step in fatty acid synthesis. Acetyl-CoA carboxylase is normally suppressed during prolonged fasting.'},
        {option:'B, D, and E', explanation:'Acid alpha-glucosidase, glucose 6-phosphatase, and glycogen phosphorylase are involved in glycogenolysis. Deficiency of any of these enzymes can lead to glycogen storage disease. However, patients with glycogen storage disease have normal fatty acid oxidation and produce ketones during periods of fasting.'},
      ],
      objective:'Impaired beta-oxidation of fatty acids causes hypoglycemia after prolonged fasting and insufficient levels of ketone bodies. Acyl-CoA dehydrogenase catalyzes the first step in the beta-oxidation pathway and is the most commonly deficient enzyme.',
      peer:{A:16, B:3, C:31, D:25, E:23},
      img:'assets/qbank/CMQ-STEP1-BCH-0042_fatty_acid_oxidation_pathway.png',
      labs:[
        ['Glucose, plasma (child, fasting)', '70–100 mg/dL', '70–100 mg/dL',
         'Markedly decreased here (22 mg/dL) during a prolonged fast in a fatty acid oxidation disorder (eg, MCAD/acyl-CoA dehydrogenase deficiency)',
         'Marcadamente diminuída neste caso (22 mg/dL) durante jejum prolongado em um distúrbio da beta-oxidação de ácidos graxos (ex.: deficiência de MCAD/acil-CoA desidrogenase)'],
        ['Acetoacetate (ketone body), serum', 'Detectable and rising during prolonged fasting (qualitatively positive)', 'Detectável e crescente durante jejum prolongado (qualitativamente positivo)',
         'Inappropriately absent/undetectable here despite hypoglycemia and fasting — the hallmark of hypoketotic hypoglycemia in fatty acid oxidation disorders',
         'Ausente/indetectável de forma inapropriada neste caso, apesar da hipoglicemia e do jejum — a marca registrada da hipoglicemia hipocetótica nos distúrbios da beta-oxidação de ácidos graxos'],
      ],
      ptTranslation:{
        vignette:'Um menino de 8 anos é levado ao pronto-socorro por vômitos e letargia. O paciente estava em uma viagem de trilha durante a noite com sua família. Durante a viagem, a família perdeu o pacote de comida enquanto praticava canoagem e teve que caminhar de volta até o carro. A criança ficou fraca e foi carregada na última milha. Nenhum membro da família comeu por aproximadamente 24 horas. Ao exame, o paciente aparenta estar apático. Hepatomegalia leve é notada. Os resultados laboratoriais são os seguintes:\nGlicose 22 mg/dL\nAcetoacetato não detectado\nAspartato aminotransferase 47 U/L\nAlanina aminotransferase 53 U/L\nO paciente começa a convulsionar pouco depois de chegar ao pronto-socorro.',
        q:'Qual das seguintes enzimas está mais provavelmente deficiente neste paciente?',
        objective:'A beta-oxidação prejudicada de ácidos graxos causa hipoglicemia após jejum prolongado e níveis insuficientes de corpos cetônicos. A acil-CoA desidrogenase catalisa a primeira etapa da via de beta-oxidação e é a enzima mais comumente deficiente.',
        options:[
          {label:'A', text:'Acetil-CoA carboxilase'},
          {label:'B', text:'Alfa-glicosidase ácida'},
          {label:'C', text:'Acil-CoA desidrogenase'},
          {label:'D', text:'Glicose 6-fosfatase'},
          {label:'E', text:'Glicogênio fosforilase'},
        ],
        explC:'Este paciente desenvolveu hipoglicemia hipocetótica após o jejum, o que é compatível com um defeito na beta-oxidação de ácidos graxos na mitocôndria. A beta-oxidação de ácidos graxos produz FADH2 e NADH para a produção de ATP e gera acetil-CoA para uso no ciclo do ácido cítrico ou na produção de corpos cetônicos. Os corpos cetônicos são uma fonte de energia importante durante períodos de jejum; adultos geralmente precisam de mais de 1-2 dias de jejum antes que o uso de cetonas se torne substancial, enquanto crianças têm reservas limitadas de glicose e começam a usar corpos cetônicos após apenas 8-10 horas.\n\nA beta-oxidação prejudicada pode ser causada por diversos defeitos enzimáticos, sendo o mais comum a deficiência de acil-CoA desidrogenase de cadeia média. Indivíduos afetados podem permanecer assintomáticos por longos períodos até vivenciarem um jejum significativo, durante o qual são incapazes de oxidar ácidos graxos para manter a produção de glicose e corpos cetônicos. As manifestações clássicas incluem hipoglicemia hipocetótica (por exemplo, nível de acetoacetato indetectável), hepatomegalia leve e disfunção hepática. Como a crise metabólica resultante pode ter consequências graves (por exemplo, convulsões, morte súbita), os distúrbios de oxidação de ácidos graxos fazem parte da triagem neonatal padrão.\n\nO tratamento da deficiência de acil-CoA desidrogenase consiste na prevenção do catabolismo de gordura. Isso significa evitar jejum prolongado, além de fornecer glicose prontamente durante períodos de doença.',
        explI:[
          {option:'A', explanation:'A acetil-CoA carboxilase é a enzima limitante que catalisa a primeira etapa da síntese de ácidos graxos. A acetil-CoA carboxilase é normalmente suprimida durante o jejum prolongado.'},
          {option:'B, D, and E', explanation:'A alfa-glicosidase ácida, a glicose 6-fosfatase e a glicogênio fosforilase estão envolvidas na glicogenólise. A deficiência de qualquer uma dessas enzimas pode levar à doença de armazenamento de glicogênio. Entretanto, pacientes com doença de armazenamento de glicogênio têm oxidação normal de ácidos graxos e produzem cetonas durante períodos de jejum.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0043', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::lipid_metabolism', difficulty:'hard',
      vignette:'A research scientist studying the metabolic pathways that contribute to obesity feeds experimental animals a high-carbohydrate, high-protein diet for a prolonged period. A sample of liver tissue is then obtained from the animals, and the activity of various enzymes involved in fatty acid metabolism is measured and recorded. It is determined that beta-oxidation of fatty acids is inhibited within these cells as a result of the diet.',
      q:'An increase in which of the following substances is most likely responsible for the observed effect?',
      options:[
        {label:'A', text:'Acetoacetate'},
        {label:'B', text:'Carnitine'},
        {label:'C', text:'Citrate'},
        {label:'D', text:'Malonyl-CoA'},
        {label:'E', text:'NADPH'},
      ],
      correct:'D',
      explC:'In the well-fed state, the abundance of ATP in hepatocytes inhibits isocitrate dehydrogenase, leading to high levels of citrate in the mitochondria. Citrate is transferred to the cytosol via the citrate shuttle and cleaved by ATP citrate lyase to form acetyl-CoA. High citrate levels (in addition to elevated insulin caused by high carbohydrate intake) causes upregulation of Acetyl-CoA carboxylase. This cytosolic enzyme catalyzes the conversion of acetyl-CoA to malonyl-CoA in the rate-limiting step of de novo fatty acid synthesis. Fatty acid synthase then catalyzes the condensation of malonyl-CoA with acetyl-CoA to create a 4-carbon molecule that will undergo subsequent condensation reactions to form a 16-carbon fatty acid.\n\nBeta-oxidation of fatty acids takes place primarily within the mitochondrial matrix. Mitochondrial membranes are impermeable to fatty acids due to their negative charge, so a specialized membrane carrier (carnitine) must be used to shuttle them into the matrix. Malonyl-CoA inhibits carnitine acyltransferase, preventing the transfer of acyl groups into the mitochondria. This inhibitory action functions to prevent the breakdown of newly synthesized fatty acids.',
      explI:[
        {option:'A', explanation:'Ketone bodies (eg, acetoacetate) are a major source of fuel for muscle, brain, and cardiac tissue that are produced during times of starvation or fasting when oxaloacetate is in short supply and acetyl-CoA is in excess.'},
        {option:'B', explanation:'Carnitine is an amino acid that is essential for the transport of fatty acids through the mitochondrial membrane. It is a necessary component of fatty acid oxidation.'},
        {option:'C', explanation:'Citrate is an intermediate in the TCA cycle. It can be exported out of the mitochondrial matrix and into the cytosol, where it is broken down into acetyl-CoA for use in de novo fatty acid synthesis.'},
        {option:'E', explanation:'NADPH is a reducing molecule necessary for the synthesis of fatty acids. In contrast, beta-oxidation of fats produces FADH2 and NADH-reducing equivalents.'},
      ],
      objective:'Cytosolic acetyl-CoA carboxylase converts acetyl-CoA to malonyl-CoA during the rate-limiting step of de novo fatty acid synthesis. Malonyl-CoA also inhibits the action of mitochondrial carnitine acyltransferase, thereby inhibiting beta-oxidation of newly formed fatty acids.',
      peer:{A:10, B:18, C:18, D:39, E:13},
      ptTranslation:{
        vignette:'Um cientista pesquisador que estuda as vias metabólicas que contribuem para a obesidade alimenta animais experimentais com uma dieta rica em carboidratos e rica em proteínas por um período prolongado. Uma amostra de tecido hepático é então obtida dos animais, e a atividade de várias enzimas envolvidas no metabolismo de ácidos graxos é medida e registrada. Determina-se que a beta-oxidação de ácidos graxos está inibida nessas células como resultado da dieta.',
        q:'Um aumento em qual das seguintes substâncias é mais provavelmente responsável pelo efeito observado?',
        objective:'A acetil-CoA carboxilase citosólica converte acetil-CoA em malonil-CoA durante a etapa limitante da síntese de novo de ácidos graxos. O malonil-CoA também inibe a ação da carnitina aciltransferase mitocondrial, inibindo assim a beta-oxidação de ácidos graxos recém-formados.',
        options:[
          {label:'A', text:'Acetoacetato'},
          {label:'B', text:'Carnitina'},
          {label:'C', text:'Citrato'},
          {label:'D', text:'Malonil-CoA'},
          {label:'E', text:'NADPH'},
        ],
        explC:'No estado alimentado, a abundância de ATP nos hepatócitos inibe a isocitrato desidrogenase, levando a altos níveis de citrato na mitocôndria. O citrato é transferido para o citosol via o transportador de citrato e clivado pela ATP citrato liase para formar acetil-CoA. Os altos níveis de citrato (além da insulina elevada causada pela alta ingestão de carboidratos) causam a regulação positiva da acetil-CoA carboxilase. Essa enzima citosólica catalisa a conversão de acetil-CoA em malonil-CoA na etapa limitante da síntese de novo de ácidos graxos. A ácido graxo sintase então catalisa a condensação do malonil-CoA com acetil-CoA para criar uma molécula de 4 carbonos que sofrerá reações de condensação subsequentes para formar um ácido graxo de 16 carbonos.\n\nA beta-oxidação de ácidos graxos ocorre principalmente dentro da matriz mitocondrial. As membranas mitocondriais são impermeáveis a ácidos graxos devido à sua carga negativa, portanto um transportador de membrana especializado (carnitina) deve ser usado para transportá-los até a matriz. O malonil-CoA inibe a carnitina aciltransferase, impedindo a transferência de grupos acila para a mitocôndria. Essa ação inibitória funciona para evitar a degradação de ácidos graxos recém-sintetizados.',
        explI:[
          {option:'A', explanation:'Corpos cetônicos (por exemplo, acetoacetato) são uma importante fonte de combustível para o músculo, o cérebro e o tecido cardíaco, sendo produzidos em períodos de inanição ou jejum, quando o oxaloacetato está em falta e o acetil-CoA está em excesso.'},
          {option:'B', explanation:'A carnitina é um aminoácido essencial para o transporte de ácidos graxos através da membrana mitocondrial. É um componente necessário da oxidação de ácidos graxos.'},
          {option:'C', explanation:'O citrato é um intermediário do ciclo de Krebs. Ele pode ser exportado da matriz mitocondrial para o citosol, onde é degradado em acetil-CoA para uso na síntese de novo de ácidos graxos.'},
          {option:'E', explanation:'O NADPH é uma molécula redutora necessária para a síntese de ácidos graxos. Em contraste, a beta-oxidação de gorduras produz equivalentes redutores FADH2 e NADH.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0044', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::lipid_metabolism', difficulty:'hard',
      vignette:'A 5-year-old girl is brought to the clinic due to several months of fatigue and difficulty walking. She ambulates normally at first but rapidly becomes weak and tired. The patient has not been ill recently and is usually happy and playful. She has a history of mild motor delays but is otherwise developmentally normal. Vital signs are within normal limits. Examination shows mildly decreased power in all extremities but no ataxia. Cardiac auscultation reveals a 1/6 systolic murmur and an S3 gallop. Laboratory results are as follows:\nSerum chemistry\nGlucose 37 mg/dL\nCreatine kinase 304 U/L\nUrinalysis\nProtein none\nGlucose negative\nKetones negative\nLeukocyte esterase negative\nNitrites negative\nMuscle biopsy shows a very low carnitine content.',
      q:'This patient most likely has deficient synthesis of which of the following substances?',
      options:[
        {label:'A', text:'Acetoacetate'},
        {label:'B', text:'Arachidonic acid'},
        {label:'C', text:'Glutathione'},
        {label:'D', text:'Homocysteine'},
        {label:'E', text:'Lactate'},
        {label:'F', text:'Palmitate'},
      ],
      correct:'A',
      explC:'This patient\'s myopathy (eg, elevated creatine kinase, weakness), cardiomyopathy (eg, S3 gallop), and hypoketotic hypoglycemia (eg, absence of ketones in the urine) in the setting of decreased muscle carnitine content is consistent with primary carnitine deficiency. The condition is caused by a defect in the protein responsible for carnitine transport across the mitochondrial membrane. Without sufficient carnitine, fatty acids cannot be transported from the cytoplasm into the mitochondria as acyl-carnitine (carnitine shuttle). The mitochondria therefore cannot beta-oxidize the fatty acids into acetyl CoA, the carbon substrate for the citric acid cycle. As a result, cardiac and skeletal myocytes cannot generate ATP from fatty acids (leading to muscle weakness, cardiomyopathy) and the liver is unable to synthesize ketone bodies (manifests as hypoketotic hypoglycemia).\n\nHypoketotic hypoglycemia is also seen in other fatty acid oxidation disorders (eg, acyl CoA dehydrogenase deficiency).',
      explI:[
        {option:'B', explanation:'Arachidonic acid can be ingested or synthesized from phospholipids in the cell membrane. Its eicosanoid derivatives (eg, prostanoids, leukotrienes) are important modulators of inflammation. It is not affected by carnitine levels.'},
        {option:'C', explanation:'Glutathione is a tripeptide that can be synthesized from amino acids (glutamate, cysteine, and glycine). It is an important antioxidant and plays a role in DNA synthesis and repair.'},
        {option:'D', explanation:'Homocysteine is an amino acid that is synthesized from methionine. Using vitamin cofactors, it can be converted to cysteine (pyridoxine) or recycled into methionine (cobalamin).'},
        {option:'E', explanation:'Lactate is produced from pyruvate under anaerobic conditions. Patients with carnitine deficiency synthesize lactate normally but may produce increased lactate during times of catabolic stress due to inability to utilize fatty acids for energy.'},
        {option:'F', explanation:'Palmitate is a fatty acid that can be ingested or synthesized from carbohydrates. Palmitate synthesis occurs in the cytosol and would not be affected by carnitine deficiency.'},
      ],
      objective:'Carnitine deficiency impairs fatty acid transport from the cytoplasm into mitochondria, preventing beta-oxidation of fatty acids into acetyl CoA. This leads to cardiac and skeletal myocyte injury (lack of ATP from citric acid cycle) and impaired ketone body production by the liver during fasting periods.',
      peer:{A:42, B:4, C:8, D:8, E:9, F:27},
      img:'assets/qbank/CMQ-STEP1-BCH-0044_fatty_acid_oxidation_pathway.png',
      labs:[
        ['Glucose, plasma (child, fasting)', '70–100 mg/dL', '70–100 mg/dL',
         'Decreased here (37 mg/dL), consistent with hypoketotic hypoglycemia in primary carnitine deficiency',
         'Diminuída neste caso (37 mg/dL), compatível com hipoglicemia hipocetótica na deficiência primária de carnitina'],
        ['Creatine kinase, serum (child ≥2 months–15 years)', '≤90 U/L', '≤90 U/L',
         'Elevated here (304 U/L), reflecting skeletal myopathy from impaired fatty acid beta-oxidation in myocytes',
         'Elevada neste caso (304 U/L), refletindo miopatia esquelética pela beta-oxidação de ácidos graxos prejudicada nos miócitos'],
      ],
      ptTranslation:{
        vignette:'Uma menina de 5 anos é levada à clínica devido a vários meses de fadiga e dificuldade para caminhar. Ela deambula normalmente no início, mas rapidamente fica fraca e cansada. A paciente não esteve doente recentemente e costuma ser feliz e brincalhona. Ela tem histórico de atrasos motores leves, mas é, fora isso, normal quanto ao desenvolvimento. Os sinais vitais estão dentro dos limites normais. O exame mostra força discretamente diminuída em todas as extremidades, mas sem ataxia. A ausculta cardíaca revela um sopro sistólico 1/6 e uma terceira bulha (galope de B3). Os resultados laboratoriais são os seguintes:\nBioquímica sérica\nGlicose 37 mg/dL\nCreatina cinase 304 U/L\nUrinálise\nProteína ausente\nGlicose negativa\nCetonas negativas\nEsterase leucocitária negativa\nNitritos negativos\nA biópsia muscular mostra um conteúdo de carnitina muito baixo.',
        q:'Esta paciente provavelmente tem síntese deficiente de qual das seguintes substâncias?',
        objective:'A deficiência de carnitina prejudica o transporte de ácidos graxos do citoplasma para as mitocôndrias, impedindo a beta-oxidação de ácidos graxos em acetil-CoA. Isso leva à lesão de miócitos cardíacos e esqueléticos (por falta de ATP do ciclo do ácido cítrico) e à produção prejudicada de corpos cetônicos pelo fígado durante períodos de jejum.',
        options:[
          {label:'A', text:'Acetoacetato'},
          {label:'B', text:'Ácido araquidônico'},
          {label:'C', text:'Glutationa'},
          {label:'D', text:'Homocisteína'},
          {label:'E', text:'Lactato'},
          {label:'F', text:'Palmitato'},
        ],
        explC:'A miopatia desta paciente (por exemplo, creatina cinase elevada, fraqueza), a cardiomiopatia (por exemplo, galope de B3) e a hipoglicemia hipocetótica (por exemplo, ausência de cetonas na urina), no contexto de conteúdo muscular de carnitina diminuído, são compatíveis com deficiência primária de carnitina. A condição é causada por um defeito na proteína responsável pelo transporte de carnitina através da membrana mitocondrial. Sem carnitina suficiente, os ácidos graxos não podem ser transportados do citoplasma para a mitocôndria como acil-carnitina (lançadeira da carnitina). A mitocôndria, portanto, não consegue realizar a beta-oxidação dos ácidos graxos em acetil-CoA, o substrato de carbono para o ciclo do ácido cítrico. Como resultado, os miócitos cardíacos e esqueléticos não conseguem gerar ATP a partir de ácidos graxos (levando a fraqueza muscular, cardiomiopatia), e o fígado é incapaz de sintetizar corpos cetônicos (manifestando-se como hipoglicemia hipocetótica).\n\nA hipoglicemia hipocetótica também é observada em outros distúrbios de oxidação de ácidos graxos (por exemplo, deficiência de acil-CoA desidrogenase).',
        explI:[
          {option:'B', explanation:'O ácido araquidônico pode ser ingerido ou sintetizado a partir de fosfolipídios da membrana celular. Seus derivados eicosanoides (por exemplo, prostanoides, leucotrienos) são importantes moduladores da inflamação. Ele não é afetado pelos níveis de carnitina.'},
          {option:'C', explanation:'A glutationa é um tripeptídeo que pode ser sintetizado a partir de aminoácidos (glutamato, cisteína e glicina). É um antioxidante importante e desempenha papel na síntese e reparo do DNA.'},
          {option:'D', explanation:'A homocisteína é um aminoácido sintetizado a partir da metionina. Com o uso de cofatores vitamínicos, ela pode ser convertida em cisteína (piridoxina) ou reciclada em metionina (cobalamina).'},
          {option:'E', explanation:'O lactato é produzido a partir do piruvato em condições anaeróbicas. Pacientes com deficiência de carnitina sintetizam lactato normalmente, mas podem produzir lactato aumentado durante períodos de estresse catabólico devido à incapacidade de utilizar ácidos graxos para energia.'},
          {option:'F', explanation:'O palmitato é um ácido graxo que pode ser ingerido ou sintetizado a partir de carboidratos. A síntese de palmitato ocorre no citosol e não seria afetada pela deficiência de carnitina.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0045', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'hard',
      vignette:'A 54-year-old man comes to the emergency department with a 3-month history of fatigue and exertional dyspnea. He has early satiety and frequent upper abdominal discomfort. On physical examination, the patient has palpable splenomegaly but no lymphadenopathy. Laboratory tests are as follows:\nComplete blood count\nHemoglobin 9.2 mg/dL\nPlatelets 80,000/mm3\nLeukocytes 56,000/mm3\nReverse transcription polymerase chain reaction is used to diagnose chronic myelogenous leukemia in this patient.',
      q:'Which of the following is most likely to be detected by this test?',
      options:[
        {label:'A', text:'Chromosomal position of the BCR and ABL genes'},
        {label:'B', text:'DNA rearrangement in the BCR promoter region'},
        {label:'C', text:'Fusion protein containing BCR and ABL domains'},
        {label:'D', text:'Messenger RNA transcript containing BCR and ABL exons'},
        {label:'E', text:'Point mutation in the ABL enhancer region'},
      ],
      correct:'D',
      explC:'Reverse transcription polymerase chain reaction (RT-PCR) is used to detect and quantify levels of messenger RNA (mRNA) in a sample. It is similar to regular PCR in that it uses sequence-specific primers, thermostable DNA polymerase, and a pool of deoxyribonucleoside triphosphates to amplify a DNA template. In RT-PCR, this template is generated by the action of reverse transcriptase on the mRNA sample, producing a complementary DNA (cDNA) strand that can then be amplified by PCR. Because cDNA is complementary to the mRNA sequence, it contains the exons of a gene along with the 5\' and 3\' untranslated regions.\n\nChronic myelogenous leukemia (CML) is characterized by uncontrolled proliferation of the myeloid stem cell line due to a chromosomal translocation. This translocation causes the BCR gene on chromosome 22 to fuse with the ABL gene on chromosome 9, forming the BCR-ABL fusion gene. The BCR-ABL fusion protein product is a constitutively active tyrosine kinase that accelerates cell division and increases genetic instability. RT-PCR can be used to identify mRNA transcribed from the BCR-ABL fusion gene and therefore diagnose CML.',
      explI:[
        {option:'A', explanation:'Fluorescence in situ hybridization (FISH) techniques allow direct localization of genes to their respective chromosomes by using a labeled DNA probe complementary to the sequence of interest.'},
        {option:'B and E', explanation:'RT-PCR amplification uses an mRNA template, so it cannot detect changes in the parts of the gene that are not transcribed (eg, promoter and enhancer regions). Other PCR techniques that use chromosomal DNA can detect changes in these nontranscribed regions.'},
        {option:'C', explanation:'RT-PCR is used to detect levels of mRNA expression; it does not identify proteins. A Western blot study can detect the BCR-ABL protein by using monoclonal antibodies directed against BCR or ABL.'},
      ],
      objective:'Reverse transcription polymerase chain reaction (RT-PCR) is used to detect and quantify levels of mRNA in a sample. It uses reverse transcription to create a complementary DNA template that is then amplified using the standard PCR procedure. RT-PCR can be used to diagnose chronic myelogenous leukemia by identifying an mRNA transcript containing both BCR and ABL exons in affected cells.',
      peer:{A:25, B:11, C:30, D:27, E:4},
      ptTranslation:{
        vignette:'Um homem de 54 anos vem ao pronto-socorro com histórico de 3 meses de fadiga e dispneia aos esforços. Ele tem saciedade precoce e desconforto abdominal superior frequente. Ao exame físico, o paciente apresenta esplenomegalia palpável, mas sem linfadenopatia. Os exames laboratoriais são os seguintes:\nHemograma completo\nHemoglobina 9,2 mg/dL\nPlaquetas 80.000/mm3\nLeucócitos 56.000/mm3\nA reação em cadeia da polimerase com transcrição reversa é usada para diagnosticar leucemia mieloide crônica neste paciente.',
        q:'Qual das seguintes opções é mais provavelmente detectada por esse teste?',
        objective:'A reação em cadeia da polimerase com transcrição reversa (RT-PCR) é usada para detectar e quantificar níveis de mRNA em uma amostra. Ela usa a transcrição reversa para criar um molde de DNA complementar que é então amplificado usando o procedimento padrão de PCR. A RT-PCR pode ser usada para diagnosticar leucemia mieloide crônica ao identificar um transcrito de mRNA contendo éxons tanto de BCR quanto de ABL nas células afetadas.',
        options:[
          {label:'A', text:'Posição cromossômica dos genes BCR e ABL'},
          {label:'B', text:'Rearranjo de DNA na região promotora do BCR'},
          {label:'C', text:'Proteína de fusão contendo domínios de BCR e ABL'},
          {label:'D', text:'Transcrito de mRNA contendo éxons de BCR e ABL'},
          {label:'E', text:'Mutação pontual na região intensificadora (enhancer) do ABL'},
        ],
        explC:'A reação em cadeia da polimerase com transcrição reversa (RT-PCR) é usada para detectar e quantificar níveis de RNA mensageiro (mRNA) em uma amostra. É semelhante à PCR convencional, pois usa primers específicos de sequência, DNA polimerase termoestável e um conjunto de desoxirribonucleosídeos trifosfatados para amplificar um molde de DNA. Na RT-PCR, esse molde é gerado pela ação da transcriptase reversa sobre a amostra de mRNA, produzindo uma fita de DNA complementar (cDNA) que pode então ser amplificada por PCR. Como o cDNA é complementar à sequência do mRNA, ele contém os éxons de um gene, junto com as regiões não traduzidas 5\' e 3\'.\n\nA leucemia mieloide crônica (LMC) é caracterizada pela proliferação descontrolada da linhagem de células-tronco mieloides devido a uma translocação cromossômica. Essa translocação faz com que o gene BCR no cromossomo 22 se funda com o gene ABL no cromossomo 9, formando o gene de fusão BCR-ABL. O produto proteico de fusão BCR-ABL é uma tirosina cinase constitutivamente ativa que acelera a divisão celular e aumenta a instabilidade genética. A RT-PCR pode ser usada para identificar o mRNA transcrito a partir do gene de fusão BCR-ABL e, assim, diagnosticar a LMC.',
        explI:[
          {option:'A', explanation:'As técnicas de hibridização in situ por fluorescência (FISH) permitem a localização direta de genes em seus respectivos cromossomos por meio do uso de uma sonda de DNA marcada, complementar à sequência de interesse.'},
          {option:'B and E', explanation:'A amplificação por RT-PCR usa um molde de mRNA, portanto não consegue detectar alterações nas partes do gene que não são transcritas (por exemplo, regiões promotoras e intensificadoras). Outras técnicas de PCR que usam DNA cromossômico podem detectar alterações nessas regiões não transcritas.'},
          {option:'C', explanation:'A RT-PCR é usada para detectar níveis de expressão de mRNA; ela não identifica proteínas. Um estudo de Western blot pode detectar a proteína BCR-ABL usando anticorpos monoclonais direcionados contra BCR ou ABL.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0046', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::homocysteine', difficulty:'medium',
      vignette:'A 20-year-old woman comes to the clinic for evaluation of fatigue that has progressively worsened over the past month. The patient was recently diagnosed with celiac disease, but she has not strictly adhered to a gluten-free diet. Laboratory evaluation reveals macrocytic anemia with a low folate level but normal vitamin B12 level. Oral folic acid is prescribed.',
      q:'Which of the following biochemical changes is most likely to occur in this patient after starting treatment? (Homocysteine / Methionine / Methylmalonic acid)',
      options:[
        {label:'A', text:'Homocysteine ↓, Methionine ↑, Methylmalonic acid: no change'},
        {label:'B', text:'Homocysteine ↓, Methionine ↑, Methylmalonic acid ↓'},
        {label:'C', text:'Homocysteine ↑, Methionine ↓, Methylmalonic acid: no change'},
        {label:'D', text:'Homocysteine ↑, Methionine ↓, Methylmalonic acid ↑'},
        {label:'E', text:'Homocysteine: no change, Methionine: no change, Methylmalonic acid ↑'},
      ],
      correct:'A',
      explC:'Folate is a naturally occurring vitamin found in animal and plant products, most notably liver and leafy green vegetables; it is also fortified in many cereals and grains. Therefore, folate deficiency is rare in persons who consume a varied diet. However, deficiency can occur in the setting of increased cell turnover (eg, pregnancy, chronic hemolytic anemia), medications that interfere with folate metabolism (eg, methotrexate, antiseizure agents), and intestinal malabsorption. This patient with celiac disease, who is noncompliant with dietary restrictions, likely developed folate deficiency due to inflammation in the wall of the jejunum, where intestinal folate absorption occurs.\n\nFolate has a crucial role in the generation of purines and pyrimidines by converting homocysteine to methionine. Specifically, 5-methyl-tetrahydrofolate donates its methyl group to vitamin B12, forming methylcobalamin, then methylcobalamin donates its methyl group to homocysteine to form methionine. In folate deficiency, homocysteine cannot be converted to methionine, leading to homocysteine accumulation (Choice C). In contrast, folate supplementation results in the rapid conversion of homocysteine to methionine, leading to low homocysteine and high methionine.\n\nMethylmalonic acid is a biomarker for vitamin B12 because conversion of methylmalonyl-coenzyme A (CoA) to succinyl-CoA requires vitamin B12. Because methylmalonyl-CoA is not a folate-dependent enzyme, it is unaffected by changes in folate level.',
      explI:[
        {option:'B', explanation:'Decreased homocysteine, increased methionine, and decreased methylmalonic acid would be expected after vitamin B12 supplementation, not folate supplementation.'},
        {option:'D', explanation:'Increased homocysteine, decreased methionine, and increased methylmalonic acid would be expected in vitamin B12 deficiency.'},
        {option:'E', explanation:'Isolated methylmalonic acidemia occurs in a rare autosomal recessive condition and is unrelated to folate deficiency and supplementation.'},
      ],
      objective:'Reduced forms of folate serve as methyl group donors in the synthesis of methionine. Folate deficiency leads to impaired methionine synthesis with accumulation of homocysteine, a precursor to methionine. Methylmalonic acid metabolism is unaffected by folate deficiency.',
      peer:{A:54, B:12, C:20, D:6, E:6},
      img:'assets/qbank/CMQ-STEP1-BCH-0046_methionine_cycle.png',
      labs:[
        ['Folate, serum', '2.7–17.0 ng/mL (varies by lab)', '2,7–17,0 ng/mL (varia por laboratório)',
         'Decreased here, consistent with folate deficiency from malabsorption in poorly controlled celiac disease',
         'Diminuído neste caso, compatível com deficiência de folato por má absorção na doença celíaca mal controlada'],
        ['Vitamin B12 (cobalamin), serum', '200–900 pg/mL (varies by lab)', '200–900 pg/mL (varia por laboratório)',
         'Normal here, distinguishing isolated folate deficiency from concurrent B12 deficiency (which would also raise methylmalonic acid)',
         'Normal neste caso, distinguindo a deficiência isolada de folato da deficiência concomitante de B12 (que também elevaria o ácido metilmalônico)'],
      ],
      ptTranslation:{
        vignette:'Uma mulher de 20 anos vem à clínica para avaliação de fadiga que tem piorado progressivamente ao longo do último mês. A paciente foi recentemente diagnosticada com doença celíaca, mas não tem aderido estritamente a uma dieta sem glúten. A avaliação laboratorial revela anemia macrocítica com nível baixo de folato, mas nível normal de vitamina B12. Ácido fólico oral é prescrito.',
        q:'Qual das seguintes alterações bioquímicas provavelmente ocorrerá nesta paciente após o início do tratamento? (Homocisteína / Metionina / Ácido metilmalônico)',
        objective:'Formas reduzidas de folato atuam como doadoras de grupos metila na síntese de metionina. A deficiência de folato leva à síntese prejudicada de metionina, com acúmulo de homocisteína, um precursor da metionina. O metabolismo do ácido metilmalônico não é afetado pela deficiência de folato.',
        options:[
          {label:'A', text:'Homocisteína ↓, Metionina ↑, Ácido metilmalônico: sem alteração'},
          {label:'B', text:'Homocisteína ↓, Metionina ↑, Ácido metilmalônico ↓'},
          {label:'C', text:'Homocisteína ↑, Metionina ↓, Ácido metilmalônico: sem alteração'},
          {label:'D', text:'Homocisteína ↑, Metionina ↓, Ácido metilmalônico ↑'},
          {label:'E', text:'Homocisteína: sem alteração, Metionina: sem alteração, Ácido metilmalônico ↑'},
        ],
        explC:'O folato é uma vitamina naturalmente encontrada em produtos animais e vegetais, principalmente fígado e vegetais folhosos verde-escuros; também é adicionado (fortificado) em muitos cereais e grãos. Portanto, a deficiência de folato é rara em pessoas que consomem uma dieta variada. Entretanto, a deficiência pode ocorrer em contextos de maior renovação celular (por exemplo, gravidez, anemia hemolítica crônica), medicamentos que interferem no metabolismo do folato (por exemplo, metotrexato, anticonvulsivantes) e má absorção intestinal. Esta paciente com doença celíaca, não aderente às restrições dietéticas, provavelmente desenvolveu deficiência de folato devido à inflamação na parede do jejuno, local onde ocorre a absorção intestinal de folato.\n\nO folato tem papel fundamental na geração de purinas e pirimidinas ao converter homocisteína em metionina. Especificamente, o 5-metil-tetra-hidrofolato doa seu grupo metila à vitamina B12, formando metilcobalamina; em seguida, a metilcobalamina doa seu grupo metila à homocisteína para formar metionina. Na deficiência de folato, a homocisteína não pode ser convertida em metionina, levando ao acúmulo de homocisteína (Alternativa C). Em contraste, a suplementação de folato resulta na rápida conversão de homocisteína em metionina, levando a homocisteína baixa e metionina alta.\n\nO ácido metilmalônico é um biomarcador para vitamina B12, pois a conversão de metilmalonil-coenzima A (CoA) em succinil-CoA requer vitamina B12. Como a metilmalonil-CoA não depende de uma enzima folato-dependente, ela não é afetada por alterações no nível de folato.',
        explI:[
          {option:'B', explanation:'Homocisteína diminuída, metionina aumentada e ácido metilmalônico diminuído seriam esperados após a suplementação de vitamina B12, não de folato.'},
          {option:'D', explanation:'Homocisteína aumentada, metionina diminuída e ácido metilmalônico aumentado seriam esperados na deficiência de vitamina B12.'},
          {option:'E', explanation:'A acidemia metilmalônica isolada ocorre em uma condição autossômica recessiva rara e não está relacionada à deficiência ou suplementação de folato.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0047', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::lysosomal_storage_diseases', difficulty:'medium',
      vignette:'An autopsy is being performed on a 4-year-old boy who recently died from a myocardial infarction. The child had a history of intellectual disability. Autopsy shows a prominent forehead and broad nose. There is a diffuse haze over the corneas bilaterally. The heart, liver, and spleen are enlarged.',
      q:'Sampling of the coronary arteries is most likely to reveal intimal accumulation of which of the following substances?',
      options:[
        {label:'A', text:'Cholesterol'},
        {label:'B', text:'Glucocerebroside'},
        {label:'C', text:'Glycogen'},
        {label:'D', text:'Heparan sulfate'},
        {label:'E', text:'Sphingomyelin'},
      ],
      correct:'D',
      explC:'This patient most likely had Hurler syndrome (type I mucopolysaccharidosis), an autosomal recessive disorder characterized by severe intellectual disability, corneal clouding, and coarse facial features (eg, frontal bossing, broad nose, flat midface). Hepatosplenomegaly and heart disease are also typical findings.\n\nMucopolysaccharidoses are lysosomal storage disorders resulting from the defective metabolism of glycosaminoglycans (GAGs). GAGs are long, unbranched polysaccharides that are an important component of the ground substance within the extracellular matrix of connective tissues. Hurler syndrome is caused by a deficiency of alpha-L-iduronidase, which hydrolyzes dermatan and heparan sulfate. Hunter syndrome, a less severe disease than Hurler syndrome, also results in an accumulation of dermatan and heparan sulfate but characteristically does not cause corneal clouding.\n\nPatients with Hurler syndrome have a shortened life expectancy. Death, typically in early childhood, is usually caused by cardiac complications (eg, myocardial infarction); this child\'s death from coronary artery disease was likely due to deposition of dermatan and heparan sulfate within the vessels.',
      explI:[
        {option:'A', explanation:'Premature coronary artery disease is seen with familial hypercholesterolemia. Cholesterol deposits can lead to tendon xanthomas, xanthelasmas (ie, eyelid plaques), and/or corneal arcus (ie, gray ring around the cornea) but not coarse facial features, intellectual disability, or a diffuse corneal haze.'},
        {option:'B', explanation:'Accumulation of glucocerebroside within mononuclear cells is seen in Gaucher disease, an autosomal recessive defect in beta-glucocerebrosidase. This condition is characterized by bruising due to thrombocytopenia, hepatosplenomegaly, progressive neurologic deterioration, and severe bone pain. Premature coronary artery disease does not occur.'},
        {option:'C', explanation:'Glycogen storage diseases cause defective metabolism of glycogen in the liver and/or muscles. The presentation can include hypoglycemia, lactic acidosis, hepatomegaly, growth retardation, and/or muscle fatigue/cramping. Cardiomegaly can occur with Pompe disease, but corneal clouding is not a feature.'},
        {option:'E', explanation:'Niemann-Pick disease results from a deficiency of sphingomyelinase, which leads to the accumulation of sphingomyelin within phagocytes. This disease is characterized by hepatosplenomegaly and progressive neurologic deterioration, but eye findings include a cherry-red spot on the macula, not corneal clouding.'},
      ],
      objective:'Hurler syndrome is a mucopolysaccharidosis caused by a deficiency of alpha-L-iduronidase, which hydrolyzes dermatan and heparan sulfate. Accumulation of these substances results in the characteristic features of intellectual disability, coarse facial features, corneal clouding, and hepatosplenomegaly. Early death due to cardiac complications (eg, myocardial infarction) is expected.',
      peer:{A:9, B:17, C:11, D:47, E:13},
      img:'assets/qbank/CMQ-STEP1-BCH-0047_mucopolysaccharidoses_table.png',
      ptTranslation:{
        vignette:'Uma autópsia está sendo realizada em um menino de 4 anos que recentemente morreu de infarto do miocárdio. A criança tinha histórico de deficiência intelectual. A autópsia mostra testa proeminente e nariz largo. Há uma opacidade difusa sobre as córneas bilateralmente. O coração, o fígado e o baço estão aumentados.',
        q:'A amostragem das artérias coronárias mais provavelmente revelará acúmulo intimal de qual das seguintes substâncias?',
        objective:'A síndrome de Hurler é uma mucopolissacaridose causada pela deficiência de alfa-L-iduronidase, que hidrolisa dermatan e heparan sulfato. O acúmulo dessas substâncias resulta nas características típicas de deficiência intelectual, traços faciais grosseiros, opacidade corneana e hepatoesplenomegalia. Morte precoce por complicações cardíacas (por exemplo, infarto do miocárdio) é esperada.',
        options:[
          {label:'A', text:'Colesterol'},
          {label:'B', text:'Glicocerebrosídeo'},
          {label:'C', text:'Glicogênio'},
          {label:'D', text:'Heparan sulfato'},
          {label:'E', text:'Esfingomielina'},
        ],
        explC:'Este paciente provavelmente teve síndrome de Hurler (mucopolissacaridose tipo I), um distúrbio autossômico recessivo caracterizado por deficiência intelectual grave, opacidade corneana e traços faciais grosseiros (por exemplo, bossa frontal, nariz largo, face médio-plana). Hepatoesplenomegalia e doença cardíaca também são achados típicos.\n\nAs mucopolissacaridoses são distúrbios de armazenamento lisossômico resultantes do metabolismo defeituoso de glicosaminoglicanos (GAGs). Os GAGs são polissacarídeos longos e não ramificados que são um componente importante da substância fundamental dentro da matriz extracelular dos tecidos conjuntivos. A síndrome de Hurler é causada pela deficiência de alfa-L-iduronidase, que hidrolisa dermatan e heparan sulfato. A síndrome de Hunter, uma doença menos grave que a síndrome de Hurler, também resulta em acúmulo de dermatan e heparan sulfato, mas caracteristicamente não causa opacidade corneana.\n\nPacientes com síndrome de Hurler têm expectativa de vida reduzida. A morte, tipicamente na primeira infância, geralmente é causada por complicações cardíacas (por exemplo, infarto do miocárdio); a morte desta criança por doença arterial coronariana provavelmente se deveu à deposição de dermatan e heparan sulfato dentro dos vasos.',
        explI:[
          {option:'A', explanation:'A doença arterial coronariana prematura é observada na hipercolesterolemia familiar. Depósitos de colesterol podem levar a xantomas tendinosos, xantelasmas (ou seja, placas palpebrais) e/ou arco corneano (ou seja, anel cinza ao redor da córnea), mas não a traços faciais grosseiros, deficiência intelectual ou opacidade corneana difusa.'},
          {option:'B', explanation:'O acúmulo de glicocerebrosídeo dentro de células mononucleares é observado na doença de Gaucher, um defeito autossômico recessivo na beta-glicocerebrosidase. Essa condição é caracterizada por hematomas devido a trombocitopenia, hepatoesplenomegalia, deterioração neurológica progressiva e dor óssea intensa. Doença arterial coronariana prematura não ocorre.'},
          {option:'C', explanation:'As doenças de armazenamento de glicogênio causam metabolismo defeituoso do glicogênio no fígado e/ou músculos. A apresentação pode incluir hipoglicemia, acidose láctica, hepatomegalia, retardo do crescimento e/ou fadiga/cãibras musculares. Cardiomegalia pode ocorrer na doença de Pompe, mas opacidade corneana não é uma característica.'},
          {option:'E', explanation:'A doença de Niemann-Pick resulta de deficiência de esfingomielinase, que leva ao acúmulo de esfingomielina dentro de fagócitos. Essa doença é caracterizada por hepatoesplenomegalia e deterioração neurológica progressiva, mas os achados oculares incluem uma mancha vermelho-cereja na mácula, não opacidade corneana.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0048', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'hard',
      vignette:'A mutation in a non-coding DNA sequence is believed to affect expression of the gene coding for a specific fetal enzyme. Liver and bone marrow cells from the fetus and his parents are obtained.',
      q:'Which of the following is the best method to determine if this gene is being transcribed in cultures of the isolated cells?',
      options:[
        {label:'A', text:'Northern blot'},
        {label:'B', text:'Western blot'},
        {label:'C', text:'Southern blot'},
        {label:'D', text:'Southwestern blot'},
        {label:'E', text:'Enzyme-linked immunosorbent assay'},
      ],
      correct:'A',
      explC:'The Southern, Western, Northern and Southwestern blot procedures are techniques used to analyze and identify DNA fragments, proteins, mRNA, and DNA-bound proteins, respectively. The best method for determining whether a gene is undergoing transcription is to analyze for the presence of its mRNA using a Northern blot. In the case described above, Northern blot analysis of each of the cell culture samples can determine if mRNA corresponding to the gene of interest is being transcribed.\n\nAll of the "blot" tests rely on the same basic techniques. First, the components of the unknown sample – DNA for Southern blots, mRNA for Northern blots, protein for Western blots, and DNA-bound protein for Southwestern blots – are separated by size and charge via gel electrophoresis. The resultant bands are then blotted onto a nitrocellulose membrane and incubated with a labeled hybridization probe or antibody to identify the specific DNA fragment, mRNA molecule or protein of interest.',
      explI:[
        {option:'B', explanation:'A complete failure of gene expression would lead to a failure to produce the protein, which can be detected by Western blotting. However, the question is asking how to determine if the gene is being transcribed (genes may be transcribed but not properly expressed if there is a problem with protein translation). As transcription refers to the production of mRNA from a DNA template, a test that detects specific mRNA sequences (Northern blot) would be most appropriate.'},
        {option:'C and D', explanation:'This patient\'s mutation in a non-coding DNA sequence (likely affecting a promoter or enhancer region) is resulting in decreased gene expression. A Southern or Southwestern blot could potentially be used to detect the mutated DNA sequence and assess for transcription factor binding. However, the degree of transcription of the affected gene is better assessed through direct detection of its associated mRNA.'},
        {option:'E', explanation:'ELISA (enzyme-linked immunosorbent assay) is a test commonly employed to measure the amount of a protein in body fluids. It can be quantitative, for example, to measure plasma insulin levels.'},
      ],
      objective:'Northern blots detect target mRNA in a sample and can be used to assess the degree of gene transcription.',
      peer:{A:42, B:16, C:28, D:5, E:6},
      img:'assets/qbank/CMQ-STEP1-BCH-0048_northern_blot_technique.png',
      ptTranslation:{
        vignette:'Acredita-se que uma mutação em uma sequência de DNA não codificante afete a expressão do gene que codifica uma enzima fetal específica. Células hepáticas e da medula óssea do feto e de seus pais são obtidas.',
        q:'Qual dos seguintes é o melhor método para determinar se esse gene está sendo transcrito em culturas das células isoladas?',
        objective:'Os Northern blots detectam o mRNA-alvo em uma amostra e podem ser usados para avaliar o grau de transcrição gênica.',
        options:[
          {label:'A', text:'Northern blot'},
          {label:'B', text:'Western blot'},
          {label:'C', text:'Southern blot'},
          {label:'D', text:'Southwestern blot'},
          {label:'E', text:'Ensaio de imunoabsorção enzimática (ELISA)'},
        ],
        explC:'Os procedimentos de Southern blot, Western blot, Northern blot e Southwestern blot são técnicas usadas para analisar e identificar, respectivamente, fragmentos de DNA, proteínas, mRNA e proteínas ligadas ao DNA. O melhor método para determinar se um gene está sendo transcrito é analisar a presença de seu mRNA usando um Northern blot. No caso descrito acima, a análise por Northern blot de cada uma das amostras de cultura de células pode determinar se o mRNA correspondente ao gene de interesse está sendo transcrito.\n\nTodos os testes de "blot" baseiam-se nas mesmas técnicas fundamentais. Primeiro, os componentes da amostra desconhecida — DNA para Southern blots, mRNA para Northern blots, proteína para Western blots e proteína ligada ao DNA para Southwestern blots — são separados por tamanho e carga por meio de eletroforese em gel. As bandas resultantes são então transferidas (blotted) para uma membrana de nitrocelulose e incubadas com uma sonda de hibridização marcada ou anticorpo para identificar o fragmento de DNA, molécula de mRNA ou proteína específicos de interesse.',
        explI:[
          {option:'B', explanation:'Uma falha completa na expressão gênica levaria à falha na produção da proteína, o que pode ser detectado por Western blot. Entretanto, a pergunta é sobre como determinar se o gene está sendo transcrito (genes podem ser transcritos, mas não adequadamente expressos, se houver um problema na tradução da proteína). Como a transcrição se refere à produção de mRNA a partir de um molde de DNA, um teste que detecta sequências específicas de mRNA (Northern blot) seria o mais apropriado.'},
          {option:'C and D', explanation:'A mutação deste paciente em uma sequência de DNA não codificante (provavelmente afetando uma região promotora ou intensificadora) está resultando em expressão gênica diminuída. Um Southern ou Southwestern blot poderia potencialmente ser usado para detectar a sequência de DNA mutada e avaliar a ligação de fatores de transcrição. Entretanto, o grau de transcrição do gene afetado é melhor avaliado por meio da detecção direta de seu mRNA associado.'},
          {option:'E', explanation:'O ELISA (ensaio de imunoabsorção enzimática) é um teste comumente empregado para medir a quantidade de uma proteína em fluidos corporais. Pode ser quantitativo, por exemplo, para medir níveis plasmáticos de insulina.'},
        ]
      }
    },
    // BATCH 04 — Biochemistry (17 questions)
    { id:'CMQ-STEP1-BCH-0049', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'easy',
      vignette:'Foreign antigen recognition at the cell surface by cytotoxic T-lymphocytes stimulates a response that results in rapid cell death.',
      q:'Which of the following act as effectors of this response?',
      options:[
        {label:'A', text:'Matrix metalloproteinases'},
        {label:'B', text:'Acid hydrolases'},
        {label:'C', text:'Caspases'},
        {label:'D', text:'Phospholipase A2'},
        {label:'E', text:'Protein kinase A'},
      ],
      correct:'C',
      explC:'The two primary modes of cell death are necrosis (which is induced by injury) and apoptosis (which is initiated by the host organism in response to cell damage, age-related atrophy, or specific stages of embryogenesis).  Apoptosis is helpful in the elimination of cells that are no longer necessary and in the maintenance of a constant number of cells in rapidly growing tissues.  Tumor cells, for example, die by apoptosis.  The death of B and T lymphocytes and virally-infected cells also occurs through apoptosis.  The remains of cells that die by this method are phagocytized by macrophages.\n\nThe process of apoptosis involves the following steps:\n\n1. Initiation: Apoptosis is triggered by different stimuli and can occur through either the intrinsic, mitochondria-mediated pathway or the extrinsic, receptor-initiated pathway.  Cells damaged by ultraviolet light, heat, hypoxia, toxins, or radiation display intrinsic apoptotic signals (eg, phosphatidylserine or thrombospondin) on their plasma membranes.  Extrinsic apoptosis, in contrast, is induced by the tumor necrosis factor (TNF) when bound to tumor necrosis factor receptor 1 (TNFR1) or the Fas ligand when bound to cell surface Fas.\n\n2. Control: Intrinsic apoptosis is mediated by a group of bcl-2 proteins.  Some of the components of this system are pro-apoptotic (eg, Bak, Bax, and Bim proteins), while others are anti-apoptotic (eg, Bcl-x and Bcl-2 proteins).  Apoptotic signals tip the balance between these two forces, resulting in changes of the inner mitochondrial membrane.  These changes are responsible for the formation of the mitochondrial permeability transition (MPT) and the release of cytochrome c and other pro-apoptotic proteins into the cytoplasm, which then activate caspases.  In extrinsic apoptosis, the binding of the death ligand and the death receptor allows for pro-caspase molecules to be brought into close proximity.\n\n3. Destruction: Both the intrinsic and extrinsic pathways converge at this step, resulting in caspase activation.  Caspases are proteolytic enzymes that destroy cell components.  They contain cysteine and are able to cleave aspartic acid residues (cysteine-aspartic-acid-proteases).  The eleven caspases that have been identified are classified as either initiator or effector caspases.  Initiator caspases activate the effector caspases, which then cleave the cellular proteins.',
      explI:[
        {option:'A', explanation:'Metalloproteinases are zinc-containing enzymes that degrade the components of the extracellular matrix (eg, collagen, laminin, fibronectin).  Metalloproteinases are essential for proper tissue remodeling during wound healing.'},
        {option:'B', explanation:'Acid hydrolases do not participate in apoptosis.'},
        {option:'D', explanation:'Phospholipase A2 does not participate in apoptosis.'},
        {option:'E', explanation:'Protein kinase A is a component of the cAMP-associated signaling system.  The binding of a ligand to a G-protein-linked receptor results in adenylyl cyclase activation and the release of cAMP.  Elevated levels of cAMP activate protein kinase A.'},
      ],
      objective:'Apoptosis can occur through either the intrinsic (mitochondria-mediated) pathway or the extrinsic (receptor-initiated) pathway.  Both pathways converge in the activation of caspases.  Caspases are proteolytic enzymes that cleave cellular proteins.',
      peer:{A:6, B:9, C:77, D:3, E:2},
      ptTranslation:{
        vignette:'O reconhecimento de antígenos estranhos na superfície celular por linfócitos T citotóxicos estimula uma resposta que resulta em morte celular rápida.',
        q:'Qual das seguintes opções atua como efetora dessa resposta?',
        objective:'A apoptose pode ocorrer pela via intrínseca (mediada pela mitocôndria) ou pela via extrínseca (iniciada por receptor).  Ambas as vias convergem na ativação das caspases.  Caspases são enzimas proteolíticas que clivam proteínas celulares.',
        options:[
          {label:'A', text:'Metaloproteinases da matriz'},
          {label:'B', text:'Hidrolases ácidas'},
          {label:'C', text:'Caspases'},
          {label:'D', text:'Fosfolipase A2'},
          {label:'E', text:'Proteína quinase A'},
        ],
        explC:'Os dois modos primários de morte celular são a necrose (induzida por lesão) e a apoptose (iniciada pelo próprio organismo em resposta a dano celular, atrofia relacionada à idade, ou estágios específicos da embriogênese).  A apoptose é útil na eliminação de células que não são mais necessárias e na manutenção de um número constante de células em tecidos de crescimento rápido.  Células tumorais, por exemplo, morrem por apoptose.  A morte de linfócitos B e T e de células infectadas por vírus também ocorre por apoptose.  Os restos das células que morrem por esse método são fagocitados por macrófagos.\n\nO processo de apoptose envolve as seguintes etapas:\n\n1. Iniciação: A apoptose é desencadeada por diferentes estímulos e pode ocorrer pela via intrínseca, mediada pela mitocôndria, ou pela via extrínseca, iniciada por receptor.  Células danificadas por luz ultravioleta, calor, hipóxia, toxinas ou radiação exibem sinais apoptóticos intrínsecos (por exemplo, fosfatidilserina ou trombospondina) em suas membranas plasmáticas.  A apoptose extrínseca, em contraste, é induzida pelo fator de necrose tumoral (TNF) ao se ligar ao receptor 1 do fator de necrose tumoral (TNFR1) ou pelo ligante Fas ao se ligar ao Fas de superfície celular.\n\n2. Controle: A apoptose intrínseca é mediada por um grupo de proteínas bcl-2.  Alguns dos componentes desse sistema são pró-apoptóticos (por exemplo, proteínas Bak, Bax e Bim), enquanto outros são antiapoptóticos (por exemplo, proteínas Bcl-x e Bcl-2).  Os sinais apoptóticos alteram o equilíbrio entre essas duas forças, resultando em mudanças na membrana mitocondrial interna.  Essas mudanças são responsáveis pela formação da transição de permeabilidade mitocondrial (MPT) e pela liberação do citocromo c e de outras proteínas pró-apoptóticas para o citoplasma, que então ativam as caspases.  Na apoptose extrínseca, a ligação entre o ligante de morte e o receptor de morte permite que moléculas de pró-caspase sejam aproximadas.\n\n3. Destruição: Tanto a via intrínseca quanto a extrínseca convergem nesta etapa, resultando na ativação das caspases.  Caspases são enzimas proteolíticas que destroem componentes celulares.  Elas contêm cisteína e são capazes de clivar resíduos de ácido aspártico (proteases de cisteína-ácido aspártico).  As onze caspases identificadas são classificadas como caspases iniciadoras ou efetoras.  As caspases iniciadoras ativam as caspases efetoras, que então clivam as proteínas celulares.',
        explI:[
          {option:'A', explanation:'As metaloproteinases são enzimas que contêm zinco e degradam os componentes da matriz extracelular (por exemplo, colágeno, laminina, fibronectina).  As metaloproteinases são essenciais para o remodelamento adequado do tecido durante a cicatrização de feridas.'},
          {option:'B', explanation:'As hidrolases ácidas não participam da apoptose.'},
          {option:'D', explanation:'A fosfolipase A2 não participa da apoptose.'},
          {option:'E', explanation:'A proteína quinase A é um componente do sistema de sinalização associado ao AMPc.  A ligação de um ligante a um receptor acoplado à proteína G resulta na ativação da adenilil ciclase e na liberação de AMPc.  Níveis elevados de AMPc ativam a proteína quinase A.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0050', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'medium',
      vignette:'The resting membrane potential for an isolated muscle cell is -70 mV.  Equilibrium potentials for important ions are given below:\n\nENa = + 60 mV\nEK = - 80 mV\nECl = - 70 mV\nECa = + 125 mV',
      q:'Which of the following most likely forms the resting membrane potential of the cell?',
      options:[
        {label:'A', text:'High potassium conductance and some sodium conductance'},
        {label:'B', text:'High chloride conductance and some sodium conductance'},
        {label:'C', text:'High calcium conductance and some chloride conductance'},
        {label:'D', text:'High potassium conductance and some chloride conductance'},
        {label:'E', text:'High potassium conductance only'},
      ],
      correct:'A',
      explC:'The resting potential refers to the difference in charge across the cell membrane at rest (when there is no signaling activity).  The membrane prevents the free diffusion of ions, and generally there is an excess of positive ions outside the cell and an excess of negative ions in the cytoplasm.  This separation of positive and negative charges across the cell membrane gives rise to an electrical potential difference that ranges from -60 to -80 mV; the typical resting membrane potential of a cell is -70 mV.\n\nThe cytoplasm of a typical cell is characterized by a low concentration of Na and high concentration of K.  The extracellular fluid is inversely rich in Na and low in K.  This difference in Na and K concentration is maintained by the Na,K-ATPase, which pumps three Na ions out of the cell for every 2 K ions allowed into the cell.\n\nEvery charged ion that the cell membrane is permeable to attempts to push the resting membrane potential of the cell toward its equilibrium potential.  The resting membrane potential can therefore be viewed as a combination of the equilibrium potentials of the ions that can penetrate the cell membrane.  Each permeable ion does not contribute equally to the membrane potential; it is obvious that the greater the permeability of a given ion, the greater its contribution to the resting membrane potential will be.  Ions with little permeability will contribute very little to the resting membrane potential.  In the resting cell the permeability of the membrane for K is much higher than that for Na.  Outflow of K ions through non-gated channels maintains the negative charge inside the membrane, which approaches the equilibrium potential for K.  There are, however, a small number of channels that allow the flow of Na into the cell.  This small influx of Na ions decreases the membrane potential, and for this reason the resting potential of the membrane is always less negative than the equilibrium potential for K (Choice A).',
      explI:[
        {option:'B', explanation:'If the chloride equilibrium potential is -70 mV and the resting membrane potential is -70 mV, then chloride would need to be the only membrane permeable ion with no contribution from others.  Chloride, in reality, plays little role in the determination of the resting membrane potential.'},
        {option:'C', explanation:'High calcium conductance would make the resting membrane potential positive, and the question stem states that the membrane potential is -70 mV.'},
        {option:'D', explanation:'High potassium conductance does occur at rest and is the largest contributor to the resting membrane potential.  Chloride plays little to no role in the determination of the resting membrane potential.'},
        {option:'E', explanation:'If a high potassium conductance were the only contributor to the resting membrane potential, then the membrane potential would be the same as the potassium equilibrium potential.'},
      ],
      objective:'The resting membrane potential is the difference in the electrical charges across the cell membrane under steady-state conditions.  The ions that are most permeable to the cell membrane make the largest contribution to the resting membrane potential.  In general, a high potassium efflux and some sodium influx are responsible for the value of the resting membrane potential, which is typically about -70 mV.',
      peer:{A:54, B:5, C:3, D:14, E:22},
      ptTranslation:{
        vignette:'O potencial de membrana em repouso de uma célula muscular isolada é de -70 mV.  Os potenciais de equilíbrio dos íons importantes são apresentados abaixo:\n\nENa = + 60 mV\nEK = - 80 mV\nECl = - 70 mV\nECa = + 125 mV',
        q:'Qual das opções a seguir mais provavelmente forma o potencial de membrana em repouso da célula?',
        objective:'O potencial de membrana em repouso é a diferença nas cargas elétricas através da membrana celular em condições de estado estacionário.  Os íons mais permeáveis à membrana celular são os que mais contribuem para o potencial de membrana em repouso.  Em geral, um alto efluxo de potássio e algum influxo de sódio são responsáveis pelo valor do potencial de membrana em repouso, que é tipicamente cerca de -70 mV.',
        options:[
          {label:'A', text:'Alta condutância de potássio e alguma condutância de sódio'},
          {label:'B', text:'Alta condutância de cloreto e alguma condutância de sódio'},
          {label:'C', text:'Alta condutância de cálcio e alguma condutância de cloreto'},
          {label:'D', text:'Alta condutância de potássio e alguma condutância de cloreto'},
          {label:'E', text:'Apenas alta condutância de potássio'},
        ],
        explC:'O potencial de repouso refere-se à diferença de carga através da membrana celular em repouso (quando não há atividade de sinalização).  A membrana impede a difusão livre de íons, e geralmente há um excesso de íons positivos fora da célula e um excesso de íons negativos no citoplasma.  Essa separação de cargas positivas e negativas através da membrana celular dá origem a uma diferença de potencial elétrico que varia de -60 a -80 mV; o potencial de membrana em repouso típico de uma célula é de -70 mV.\n\nO citoplasma de uma célula típica é caracterizado por baixa concentração de Na e alta concentração de K.  O líquido extracelular é inversamente rico em Na e pobre em K.  Essa diferença nas concentrações de Na e K é mantida pela Na,K-ATPase, que bombeia três íons Na para fora da célula para cada 2 íons K que entram na célula.\n\nTodo íon carregado ao qual a membrana celular é permeável tenta empurrar o potencial de membrana em repouso da célula em direção ao seu potencial de equilíbrio.  O potencial de membrana em repouso pode, portanto, ser visto como uma combinação dos potenciais de equilíbrio dos íons que conseguem penetrar a membrana celular.  Cada íon permeável não contribui igualmente para o potencial de membrana; é evidente que quanto maior a permeabilidade de um determinado íon, maior será sua contribuição para o potencial de membrana em repouso.  Íons com pouca permeabilidade contribuirão muito pouco para o potencial de membrana em repouso.  Na célula em repouso, a permeabilidade da membrana ao K é muito maior do que ao Na.  O efluxo de íons K através de canais não controlados por comporta mantém a carga negativa dentro da membrana, que se aproxima do potencial de equilíbrio do K.  Existem, porém, um pequeno número de canais que permitem o influxo de Na para dentro da célula.  Esse pequeno influxo de íons Na diminui o potencial de membrana, e por essa razão o potencial de repouso da membrana é sempre menos negativo do que o potencial de equilíbrio do K (Alternativa A).',
        explI:[
          {option:'B', explanation:'Se o potencial de equilíbrio do cloreto é -70 mV e o potencial de membrana em repouso é -70 mV, então o cloreto precisaria ser o único íon permeável à membrana, sem contribuição de nenhum outro.  O cloreto, na realidade, exerce pouco papel na determinação do potencial de membrana em repouso.'},
          {option:'C', explanation:'Uma alta condutância de cálcio tornaria o potencial de membrana em repouso positivo, e o enunciado afirma que o potencial de membrana é -70 mV.'},
          {option:'D', explanation:'A alta condutância de potássio de fato ocorre em repouso e é a maior contribuinte para o potencial de membrana em repouso.  O cloreto exerce pouco ou nenhum papel na determinação do potencial de membrana em repouso.'},
          {option:'E', explanation:'Se uma alta condutância de potássio fosse a única contribuinte para o potencial de membrana em repouso, então o potencial de membrana seria igual ao potencial de equilíbrio do potássio.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0051', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'easy',
      vignette:'Two graphs illustrating the transport rate of solutes across the plasma membrane are shown on the slide below.',
      q:'Which of the following best explains the difference in the shape of the curves?',
      options:[
        {label:'A', text:'Different amounts of membrane surface area for diffusion'},
        {label:'B', text:'Different degrees of membrane thickness'},
        {label:'C', text:'The 2 solutes have different molecular weights'},
        {label:'D', text:'The 2 solutes have different oil/water partition coefficients'},
        {label:'E', text:'The presence of a protein transporter'},
      ],
      correct:'E',
      img:'assets/qbank/CMQ-STEP1-BCH-0051_diffusion_rate_curves.png',
      explC:'The image above illustrates the difference between the rate of transport of solute across the cell membrane in simple diffusion (line 2) and carrier-mediated transport (line 1).\n\nThere are two types of diffusion:\n\n• Simple diffusion – molecules move through a membrane without the help of carrier proteins.\n• Facilitated diffusion – requires carrier proteins.\n\nCarrier proteins are typically transmembrane proteins that possess binding sites for the substrate they transport.  Binding is followed by movement of the substrate across the cell membrane to the intracellular space, where it is released into the cytoplasm.  Because there is a finite number of carrier proteins in the cell membrane, transporter saturation occurs with facilitated diffusion, and can be seen as a flattening of the curve (maximum diffusion speed), even as solute concentration continues to increase.  This maximum rate of transport is referred to as the transport maximum (Tm) and is similar in principle to the Vmax in standard enzyme kinetics.',
      explI:[
        {option:'A, B, C, and D', explanation:'These other factors are important for determining the rate of diffusion (ie, slope of the line), but would not explain the flattening of the curve in line 1 (which is best accounted for by saturation of a protein carrier).  In general, the rate of diffusion increases with:\n\n• Higher concentration gradients across the membrane\n• Lower molecular weight\n• Larger diffusion surface area\n• Thinner membrane thickness\n\nFor molecules that move through the membrane via simple diffusion, the degree of lipophilicity is also important; molecules with a high oil-water partition coefficient are more easily able to cross the membrane and will diffuse faster.'},
      ],
      objective:'Carrier-mediated transport includes facilitated diffusion and active transport.  Movement of substrate across the cell membrane by these mechanisms depends on the presence of carrier proteins that can become saturated at high substrate concentrations.',
      peer:{A:4, B:1, C:5, D:11, E:76},
      ptTranslation:{
        vignette:'Dois gráficos ilustrando a taxa de transporte de solutos através da membrana plasmática são mostrados no slide abaixo.',
        q:'Qual das opções a seguir melhor explica a diferença na forma das curvas?',
        objective:'O transporte mediado por carreador inclui a difusão facilitada e o transporte ativo.  O movimento do substrato através da membrana celular por esses mecanismos depende da presença de proteínas carreadoras que podem se saturar em altas concentrações de substrato.',
        options:[
          {label:'A', text:'Diferentes quantidades de área de superfície de membrana para difusão'},
          {label:'B', text:'Diferentes graus de espessura de membrana'},
          {label:'C', text:'Os 2 solutos têm pesos moleculares diferentes'},
          {label:'D', text:'Os 2 solutos têm coeficientes de partição óleo/água diferentes'},
          {label:'E', text:'A presença de um transportador proteico'},
        ],
        explC:'A imagem acima ilustra a diferença entre a taxa de transporte de soluto através da membrana celular na difusão simples (linha 2) e no transporte mediado por carreador (linha 1).\n\nExistem dois tipos de difusão:\n\n• Difusão simples – as moléculas se movem através de uma membrana sem a ajuda de proteínas carreadoras.\n• Difusão facilitada – requer proteínas carreadoras.\n\nAs proteínas carreadoras são tipicamente proteínas transmembrana que possuem sítios de ligação para o substrato que transportam.  A ligação é seguida pelo movimento do substrato através da membrana celular até o espaço intracelular, onde é liberado no citoplasma.  Como existe um número finito de proteínas carreadoras na membrana celular, a saturação do transportador ocorre na difusão facilitada, e pode ser observada como um achatamento da curva (velocidade máxima de difusão), mesmo que a concentração do soluto continue aumentando.  Essa taxa máxima de transporte é chamada de transporte máximo (Tm) e é semelhante em princípio ao Vmáx da cinética enzimática padrão.',
        explI:[
          {option:'A, B, C, and D', explanation:'Esses outros fatores são importantes para determinar a taxa de difusão (ou seja, a inclinação da linha), mas não explicariam o achatamento da curva na linha 1 (que é mais bem explicado pela saturação de um carreador proteico).  Em geral, a taxa de difusão aumenta com:\n\n• Maiores gradientes de concentração através da membrana\n• Menor peso molecular\n• Maior área de superfície de difusão\n• Membrana mais fina\n\nPara moléculas que atravessam a membrana por difusão simples, o grau de lipofilicidade também é importante; moléculas com um alto coeficiente de partição óleo-água conseguem atravessar a membrana mais facilmente e se difundem mais rápido.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0052', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'hard',
      vignette:'A 68-year-old man comes to the office due to an enlarging mole on his right forearm.  The patient is a retired farmer and received a significant amount of sun exposure over the course of his life.  On examination, he has a black-brown macular lesion on the dorsum of his right forearm measuring approximately 1 cm in diameter with an irregular border.  Excisional biopsy is performed and histopathology reveals malignant melanoma.  Immunohistochemical analysis indicates that the malignant cells have decreased integrin expression.',
      q:'These cells are most likely to exhibit poor adhesion to which of the following components of the extracellular matrix?',
      options:[
        {label:'A', text:'Actin'},
        {label:'B', text:'Fibronectin'},
        {label:'C', text:'Hyaluronic acid'},
        {label:'D', text:'Keratan sulfate'},
        {label:'E', text:'Keratin'},
      ],
      correct:'B',
      explC:'Cellular adhesion is the means by which one cell binds to another cell, surface, or matrix.  The integrins are a family of transmembrane protein receptors that interact with the extracellular matrix by binding to specific proteins, including collagen, fibronectin, and laminin.  Other adhesion molecule classes include the cadherins, selectins, and Ig superfamily members.\n\nFibronectins are large glycoproteins produced by fibroblasts and some epithelial cells.  Fibronectin binds to integrins, matrix collagen, and glycosaminoglycans, serving as a mediator of cell adhesion and migration.  Differential expression of integrin subtypes affects adhesion properties of individual cells, and correlates with malignant behavior in a number of tumors, including melanoma.',
      explI:[
        {option:'A and E', explanation:'The intracellular domains of the integrins interact with a number of structural proteins, including microfilaments (actin) within the cytoplasm and intermediate filaments (keratin).  However, the extracellular domains do not interact with these structures.'},
        {option:'C and D', explanation:'Hyaluronic acid is a glycosaminoglycan that contributes to water retention in the extracellular matrix, and determines the stiffness of the matrix.  Keratan sulfate is a glycosaminoglycan in the extracellular matrix that may play a role in maintaining type I collagen fibril organization in a number of tissues (eg, cornea).  However, neither of these is a ligand for integrins.'},
      ],
      objective:'Adhesion of cells to the extracellular matrix involves integrin-mediated binding to fibronectin, collagen, and laminin.  Differential expression of integrin subtypes affects adhesion properties of individual cells, and has been found to correlate with malignant behavior in a number of tumors.',
      peer:{A:13, B:48, C:12, D:9, E:16},
      ptTranslation:{
        vignette:'Um homem de 68 anos vem ao consultório devido a uma pinta em crescimento no antebraço direito.  O paciente é um fazendeiro aposentado e teve exposição solar significativa ao longo da vida.  Ao exame, apresenta uma lesão macular negro-acastanhada no dorso do antebraço direito medindo aproximadamente 1 cm de diâmetro, com borda irregular.  Uma biópsia excisional é realizada, e a histopatologia revela melanoma maligno.  A análise imuno-histoquímica indica que as células malignas apresentam expressão diminuída de integrina.',
        q:'Essas células provavelmente exibem má adesão a qual dos seguintes componentes da matriz extracelular?',
        objective:'A adesão das células à matriz extracelular envolve a ligação mediada por integrinas à fibronectina, ao colágeno e à laminina.  A expressão diferencial de subtipos de integrina afeta as propriedades de adesão de células individuais, e foi observado que se correlaciona com o comportamento maligno em diversos tumores.',
        options:[
          {label:'A', text:'Actina'},
          {label:'B', text:'Fibronectina'},
          {label:'C', text:'Ácido hialurônico'},
          {label:'D', text:'Sulfato de queratana'},
          {label:'E', text:'Queratina'},
        ],
        explC:'A adesão celular é o meio pelo qual uma célula se liga a outra célula, superfície ou matriz.  As integrinas são uma família de receptores proteicos transmembrana que interagem com a matriz extracelular ligando-se a proteínas específicas, incluindo colágeno, fibronectina e laminina.  Outras classes de moléculas de adesão incluem as caderinas, selectinas e membros da superfamília das imunoglobulinas (Ig).\n\nAs fibronectinas são glicoproteínas grandes produzidas por fibroblastos e algumas células epiteliais.  A fibronectina se liga a integrinas, colágeno da matriz e glicosaminoglicanos, servindo como mediadora da adesão e migração celular.  A expressão diferencial de subtipos de integrina afeta as propriedades de adesão de células individuais, e se correlaciona com o comportamento maligno em diversos tumores, incluindo o melanoma.',
        explI:[
          {option:'A and E', explanation:'Os domínios intracelulares das integrinas interagem com diversas proteínas estruturais, incluindo microfilamentos (actina) dentro do citoplasma e filamentos intermediários (queratina).  Entretanto, os domínios extracelulares não interagem com essas estruturas.'},
          {option:'C and D', explanation:'O ácido hialurônico é um glicosaminoglicano que contribui para a retenção de água na matriz extracelular e determina a rigidez da matriz.  O sulfato de queratana é um glicosaminoglicano da matriz extracelular que pode desempenhar um papel na manutenção da organização das fibrilas de colágeno tipo I em diversos tecidos (por exemplo, córnea).  Entretanto, nenhum dos dois é um ligante para as integrinas.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0053', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'medium',
      vignette:'Biologists investigating the morphologic changes associated with reversible cellular injury perform a procedure on anesthetized mice to assess the effects of transient hepatic ischemia.  During the experiment, they clamp the hepatic artery and obtain liver biopsy samples at varying intervals.  The samples are then examined by electron microscopy.  Cells that are exposed to longer ischemic periods are found to have reduced numbers of ribosomes attached to the endoplasmic reticulum.',
      q:'This structural change is most likely to impair which of the following cellular functions?',
      options:[
        {label:'A', text:'ATP production'},
        {label:'B', text:'Drug detoxification'},
        {label:'C', text:'Synthesis of cell membrane proteins'},
        {label:'D', text:'Synthesis of cytosolic proteins'},
        {label:'E', text:'Synthesis of steroid hormones'},
      ],
      correct:'C',
      explC:'Ribosomes are cellular organelles that synthesize proteins.  Each ribosome consists of 2 subunits.  The small ribosomal 40S subunit is responsible for binding mRNA (the protein synthesis template) and tRNA (carries amino acids).  The larger 60S subunit contains peptidyl transferase, the enzyme that catalyzes peptide bond formation between amino acids.  All ribosomes begin protein translation in the cytoplasm, but some translocate to the rough endoplasmic reticulum (RER) during protein synthesis depending on the protein\'s target destination.\n\n• Free ribosomes remain floating in the cytosol throughout protein synthesis.  They are responsible for translating proteins found within the cytosol, nucleosol, peroxisome matrix, and nuclear-encoded mitochondrial proteins (Choice D).\n• Attached ribosomes bind to the RER after protein translation begins.  They synthesize most secretory proteins, the integral membrane proteins of the nucleus and cell membrane, and proteins within the ER, Golgi network, and lysosomes.\n\nThe RER is particularly well developed in protein-secreting cells (eg, pancreatic and plasma cells).  Ribosomes attach to the RER via the translocon, a protein complex containing ribophorins that bind the large 60S subunit.',
      explI:[
        {option:'A', explanation:'ATP is produced in the cytosol during glycolysis and in the mitochondria via oxidative phosphorylation.  The proteins in both of these cellular compartments are synthesized by free ribosomes in the cytosol.'},
        {option:'B and E', explanation:'Steroid hormone synthesis and drug detoxification are performed by various proteins found within the smooth ER (SER).  The SER does not bind to ribosomes as it lacks the translocon complex.'},
      ],
      objective:'The rough endoplasmic reticulum (RER) is covered with ribosomes and is involved in the transfer of proteins to the cell membrane and extracellular space.  The RER is well developed in protein-secreting cells.  The smooth ER lacks surface ribosomes and functions in lipid synthesis, carbohydrate metabolism, and detoxification of harmful substances.',
      peer:{A:3, B:3, C:63, D:25, E:4},
      ptTranslation:{
        vignette:'Biólogos que investigam as alterações morfológicas associadas à lesão celular reversível realizam um procedimento em camundongos anestesiados para avaliar os efeitos da isquemia hepática transitória.  Durante o experimento, eles clampeiam a artéria hepática e obtêm amostras de biópsia hepática em intervalos variados.  As amostras são então examinadas por microscopia eletrônica.  As células expostas a períodos isquêmicos mais longos apresentam número reduzido de ribossomos ligados ao retículo endoplasmático.',
        q:'Essa alteração estrutural provavelmente prejudica qual das seguintes funções celulares?',
        objective:'O retículo endoplasmático rugoso (RER) é recoberto por ribossomos e está envolvido na transferência de proteínas para a membrana celular e para o espaço extracelular.  O RER é bem desenvolvido em células secretoras de proteínas.  O RE liso não possui ribossomos em sua superfície e funciona na síntese de lipídios, no metabolismo de carboidratos e na desintoxicação de substâncias nocivas.',
        options:[
          {label:'A', text:'Produção de ATP'},
          {label:'B', text:'Desintoxicação de fármacos'},
          {label:'C', text:'Síntese de proteínas de membrana celular'},
          {label:'D', text:'Síntese de proteínas citosólicas'},
          {label:'E', text:'Síntese de hormônios esteroides'},
        ],
        explC:'Os ribossomos são organelas celulares que sintetizam proteínas.  Cada ribossomo consiste em 2 subunidades.  A subunidade ribossômica pequena 40S é responsável por se ligar ao mRNA (o molde da síntese proteica) e ao tRNA (que carrega aminoácidos).  A subunidade maior 60S contém a peptidil transferase, a enzima que catalisa a formação de ligações peptídicas entre aminoácidos.  Todos os ribossomos iniciam a tradução proteica no citoplasma, mas alguns se translocam para o retículo endoplasmático rugoso (RER) durante a síntese proteica, dependendo do destino final da proteína.\n\n• Os ribossomos livres permanecem flutuando no citosol durante toda a síntese proteica.  Eles são responsáveis por traduzir proteínas encontradas no citosol, no nucleosol, na matriz do peroxissomo e proteínas mitocondriais codificadas pelo núcleo (Alternativa D).\n• Os ribossomos aderidos se ligam ao RER após o início da tradução proteica.  Eles sintetizam a maioria das proteínas secretórias, as proteínas integrais de membrana do núcleo e da membrana celular, e proteínas dentro do RE, da rede de Golgi e dos lisossomos.\n\nO RER é particularmente bem desenvolvido em células secretoras de proteínas (por exemplo, células pancreáticas e plasmócitos).  Os ribossomos se ligam ao RER por meio do translocon, um complexo proteico contendo ribosforinas que se ligam à subunidade grande 60S.',
        explI:[
          {option:'A', explanation:'O ATP é produzido no citosol durante a glicólise e nas mitocôndrias por meio da fosforilação oxidativa.  As proteínas em ambos os compartimentos celulares são sintetizadas por ribossomos livres no citosol.'},
          {option:'B and E', explanation:'A síntese de hormônios esteroides e a desintoxicação de fármacos são realizadas por diversas proteínas encontradas no RE liso (REL).  O REL não se liga a ribossomos, pois não possui o complexo translocon.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0054', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'medium',
      vignette:'A 9-month-old boy is brought to the clinic for a routine follow-up.  His mother is concerned because the patient is not yet able to sit up unsupported.  He was born at term and has had muscle weakness since birth.  Vital signs are normal.  The patient is alert but has diminished tone.  Examination shows a prominent forehead with a depressed nasal bridge.  Eye examination shows epicanthal folds.  Analysis of lysosomal acid hydrolases shows an increased concentration within the serum and a decreased level within the cultured skin fibroblast cells.',
      q:'This patient most likely has a defect in which of the following steps of enzyme production?',
      options:[
        {label:'A', text:'DNA methylation'},
        {label:'B', text:'Posttranslational modification'},
        {label:'C', text:'Protein folding'},
        {label:'D', text:'Splicing'},
        {label:'E', text:'Translation'},
      ],
      correct:'B',
      explC:'Protein synthesis is a process involving the following steps:\n\n1. Transcription of DNA into pre-mRNA within the nucleus\n2. Posttranscriptional modification (ie, pre-mRNA processing), including splicing of introns and the addition of a 5\' cap and poly-A tail\n3. Translation of mRNA to protein at the ribosomes\n4. Folding of the amino acid chain into a protein structure\n5. Posttranslational modification and trafficking to the correct destinations\n\nAn error can occur at any of these stages and result in disease.  Inclusion cell (I-cell) disease is a defect in posttranslational modification in the Golgi body.  Normally, proteins designated for lysosomes are tagged with mannose-6-phosphate.  However, in I-cell disease, a defect in a phosphotransferase enzyme prevents phosphorylation of mannose.  Lysosomal acid hydrolases are therefore transported inappropriately to the extracellular space, causing an increase in serum concentration and a decrease in intracellular concentration, as seen in this patient.  Without acid hydrolases to degrade cellular debris within lysosomes, the waste products (eg, mucolipids, mucopolysaccharides) accumulate and form inclusion bodies characteristic of the disease.\n\nI-cell disease presents in infancy with features similar to Hurler syndrome, including skeletal abnormalities (eg, coarse facial features), developmental delay, cloudy corneas, and recurrent respiratory infections.  I-cell disease is generally fatal in childhood.',
      explI:[
        {option:'A', explanation:'DNA methylation silences gene transcription so that the affected protein would be completely absent.  A pathologic example of DNA methylation is the inhibition of tumor suppressor genes as a mechanism for cancer development.'},
        {option:'C', explanation:'A defect in protein folding, as seen with the CFTR protein in cystic fibrosis, would result in abnormal protein functioning.  Protein concentration may be normal or low due to more rapid degradation of the abnormal protein.'},
        {option:'D and E', explanation:'Splicing mutations can result in inappropriate removal of exons or persistence of introns; this creates aberrant mRNA that is presented for translation and results in production of an abnormal protein.  Similarly, a defect in translation results in insufficient or abnormal protein synthesis, which is reflected both in the serum and intracellularly.'},
      ],
      objective:'Posttranslational modification of proteins is important for targeting proteins to the correct location.  This step is defective in I-cell disease, which is characterized by a lack of mannose residue phosphorylation, resulting in inappropriate trafficking of acid hydrolases to the extracellular space instead of to lysosomes.',
      peer:{A:6, B:64, C:15, D:8, E:4},
      ptTranslation:{
        vignette:'Um menino de 9 meses é levado à clínica para acompanhamento de rotina.  Sua mãe está preocupada porque o paciente ainda não consegue sentar sem apoio.  Ele nasceu a termo e tem fraqueza muscular desde o nascimento.  Os sinais vitais são normais.  O paciente está alerta, mas apresenta tônus diminuído.  O exame mostra testa proeminente com ponte nasal deprimida.  O exame ocular mostra pregas epicânticas.  A análise das hidrolases ácidas lisossômicas mostra concentração aumentada no soro e nível diminuído nas células de fibroblastos cutâneos cultivadas.',
        q:'Esse paciente provavelmente tem um defeito em qual das seguintes etapas da produção enzimática?',
        objective:'A modificação pós-traducional das proteínas é importante para direcionar as proteínas ao local correto.  Essa etapa está defeituosa na doença de células I, que é caracterizada pela ausência de fosforilação dos resíduos de manose, resultando no direcionamento inadequado das hidrolases ácidas para o espaço extracelular em vez dos lisossomos.',
        options:[
          {label:'A', text:'Metilação do DNA'},
          {label:'B', text:'Modificação pós-traducional'},
          {label:'C', text:'Dobramento de proteínas'},
          {label:'D', text:'Splicing'},
          {label:'E', text:'Tradução'},
        ],
        explC:'A síntese proteica é um processo que envolve as seguintes etapas:\n\n1. Transcrição do DNA em pré-mRNA dentro do núcleo\n2. Modificação pós-transcricional (ou seja, processamento do pré-mRNA), incluindo o splicing de íntrons e a adição de um cap 5\' e de uma cauda poli-A\n3. Tradução do mRNA em proteína nos ribossomos\n4. Dobramento da cadeia de aminoácidos em uma estrutura proteica\n5. Modificação pós-traducional e direcionamento aos destinos corretos\n\nUm erro pode ocorrer em qualquer uma dessas etapas e resultar em doença.  A doença de célula de inclusão (doença de células I) é um defeito na modificação pós-traducional no complexo de Golgi.  Normalmente, as proteínas destinadas aos lisossomos são marcadas com manose-6-fosfato.  Entretanto, na doença de células I, um defeito em uma enzima fosfotransferase impede a fosforilação da manose.  As hidrolases ácidas lisossômicas são, portanto, transportadas inadequadamente para o espaço extracelular, causando aumento da concentração sérica e diminuição da concentração intracelular, como visto neste paciente.  Sem as hidrolases ácidas para degradar os restos celulares dentro dos lisossomos, os produtos de degradação (por exemplo, mucolipídios, mucopolissacarídeos) se acumulam e formam os corpos de inclusão característicos da doença.\n\nA doença de células I se apresenta na infância com características semelhantes às da síndrome de Hurler, incluindo anormalidades esqueléticas (por exemplo, traços faciais grosseiros), atraso no desenvolvimento, córneas turvas e infecções respiratórias recorrentes.  A doença de células I geralmente é fatal na infância.',
        explI:[
          {option:'A', explanation:'A metilação do DNA silencia a transcrição gênica, de modo que a proteína afetada estaria completamente ausente.  Um exemplo patológico de metilação do DNA é a inibição de genes supressores de tumor como mecanismo de desenvolvimento de câncer.'},
          {option:'C', explanation:'Um defeito no dobramento proteico, como visto na proteína CFTR na fibrose cística, resultaria em funcionamento anormal da proteína.  A concentração da proteína pode ser normal ou baixa devido à degradação mais rápida da proteína anormal.'},
          {option:'D and E', explanation:'Mutações de splicing podem resultar na remoção inadequada de éxons ou na persistência de íntrons; isso cria um mRNA aberrante que é apresentado para tradução e resulta na produção de uma proteína anormal.  De forma semelhante, um defeito na tradução resulta em síntese proteica insuficiente ou anormal, o que se reflete tanto no soro quanto intracelularmente.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0055', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'hard',
      vignette:'Molecular biologists perform a series of experiments to characterize the electrophysiologic properties of human muscle cells.  The resting membrane potential for an isolated muscle cell is determined to be -70 mV.  The equilibrium potentials for important ions under normal physiologic conditions are as follows:\n\nENa = + 60 mV\nEK = - 90 mV\nECl = - 75 mV\nECa = + 125 mV\nEMg = 0 mV',
      q:'If physiologic conditions are maintained, which of the following ions would most likely flow out of the cell after opening of their respective ion channels?',
      options:[
        {label:'A', text:'Magnesium and calcium'},
        {label:'B', text:'Magnesium and chloride'},
        {label:'C', text:'Potassium and chloride'},
        {label:'D', text:'Potassium only'},
        {label:'E', text:'Sodium and calcium'},
      ],
      correct:'D',
      explC:'Na+, K+, and Cl- are the main ions that determine the electrical potential difference (voltage) across a membrane (membrane potential).  Under normal physiologic conditions, there is a low concentration of Na+ and Cl- in the cell and a high concentration of K+ in the cytoplasm.  Conversely, the extracellular space has a high concentration of Na+ and Cl- ions and low concentration of K+ ions.\n\nBecause intracellular K+ concentration is much greater than its extracellular concentration, opening of cellular potassium channels leads to K+ efflux from the cell along the K+ concentration gradient.  Within the cell, the positive charge of the K+ ions is normally neutralized by the negative charge of intracellular anions (eg, phosphates and proteins) that are trapped in the cell.  As K+ ions leave the cell, negatively charged anions accumulate along the inner side of the cell membrane.  This continually increasing negative charge attracts the positively charged K+ ions back into the cell.  When the difference in concentration (diffusion potential) of K+ inside and outside the cell is large, the efflux of K+ ions will continue despite the increasing negative charge.  At a certain point, however, the negative intracellular charge (electrical potential) of the membrane becomes large enough that the number of K+ ions it attracts into the cell equals the number of K+ ions that leave the cell along the concentration gradient.  The electrical potential difference that moves K+ ions into the cell at the same rate as they leave the cell along the concentration gradient is called the equilibrium potential.',
      explI:[
        {option:'A', explanation:'Extracellular gradient drives Ca2+ into cell, making membrane potential more positive.'},
        {option:'B and C', explanation:'Extracellular gradient drives Cl- into cell, making membrane potential more negative.'},
        {option:'E', explanation:'Extracellular gradient drives Na+ into cell, making membrane potential more positive.'},
      ],
      objective:'When a specific ion channel opens, the respective ions will flow across the membrane in a direction that brings the resting membrane potential closer to that ion\'s equilibrium potential.',
      peer:{A:1, B:1, C:42, D:41, E:13},
      ptTranslation:{
        vignette:'Biólogos moleculares realizam uma série de experimentos para caracterizar as propriedades eletrofisiológicas de células musculares humanas.  O potencial de membrana em repouso de uma célula muscular isolada é determinado como -70 mV.  Os potenciais de equilíbrio dos íons importantes em condições fisiológicas normais são os seguintes:\n\nENa = + 60 mV\nEK = - 90 mV\nECl = - 75 mV\nECa = + 125 mV\nEMg = 0 mV',
        q:'Se as condições fisiológicas forem mantidas, qual dos seguintes íons mais provavelmente fluiria para fora da célula após a abertura de seus respectivos canais iônicos?',
        objective:'Quando um canal iônico específico se abre, os respectivos íons fluem através da membrana em uma direção que aproxima o potencial de membrana em repouso do potencial de equilíbrio daquele íon.',
        options:[
          {label:'A', text:'Magnésio e cálcio'},
          {label:'B', text:'Magnésio e cloreto'},
          {label:'C', text:'Potássio e cloreto'},
          {label:'D', text:'Apenas potássio'},
          {label:'E', text:'Sódio e cálcio'},
        ],
        explC:'Na+, K+ e Cl- são os principais íons que determinam a diferença de potencial elétrico (voltagem) através de uma membrana (potencial de membrana).  Em condições fisiológicas normais, há baixa concentração de Na+ e Cl- na célula e alta concentração de K+ no citoplasma.  Por outro lado, o espaço extracelular tem alta concentração de íons Na+ e Cl- e baixa concentração de íons K+.\n\nComo a concentração intracelular de K+ é muito maior do que a extracelular, a abertura dos canais celulares de potássio leva ao efluxo de K+ da célula ao longo do gradiente de concentração de K+.  Dentro da célula, a carga positiva dos íons K+ é normalmente neutralizada pela carga negativa de ânions intracelulares (por exemplo, fosfatos e proteínas) que ficam retidos na célula.  À medida que os íons K+ deixam a célula, ânions carregados negativamente se acumulam ao longo da face interna da membrana celular.  Essa carga negativa crescente atrai os íons K+ carregados positivamente de volta para a célula.  Quando a diferença de concentração (potencial de difusão) de K+ dentro e fora da célula é grande, o efluxo de íons K+ continuará apesar da carga negativa crescente.  Em determinado ponto, porém, a carga intracelular negativa (potencial elétrico) da membrana se torna grande o suficiente para que o número de íons K+ que ela atrai para dentro da célula seja igual ao número de íons K+ que saem da célula ao longo do gradiente de concentração.  A diferença de potencial elétrico que move os íons K+ para dentro da célula na mesma taxa em que saem ao longo do gradiente de concentração é chamada de potencial de equilíbrio.',
        explI:[
          {option:'A', explanation:'O gradiente extracelular impulsiona o Ca2+ para dentro da célula, tornando o potencial de membrana mais positivo.'},
          {option:'B and C', explanation:'O gradiente extracelular impulsiona o Cl- para dentro da célula, tornando o potencial de membrana mais negativo.'},
          {option:'E', explanation:'O gradiente extracelular impulsiona o Na+ para dentro da célula, tornando o potencial de membrana mais positivo.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0056', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'easy',
      vignette:'Molecular biologists studying signal transduction apply an agent to human cells that activates G-protein-dependent phospholipase C.',
      q:'Which of the following intracellular substances is most likely to increase immediately after exposure to this agent?',
      options:[
        {label:'A', text:'Ca2+'},
        {label:'B', text:'cAMP'},
        {label:'C', text:'cGMP'},
        {label:'D', text:'Cl-'},
        {label:'E', text:'mRNA'},
        {label:'F', text:'NO'},
      ],
      correct:'A',
      explC:'A variety of hormone receptors are known to exert their intracellular effects via the phosphoinositol system.  Examples include α1-adrenergic, M1 and M3 cholinergic, V1 (vasopressin), H1 (histamine), oxytocin, angiotensin II, TRH, and GnRH receptors.  This signal transduction pathway proceeds through the following steps:\n\n1. Binding of a ligand to its cell surface receptor causes the exchange of GDP for GTP on the α-subunit of a Gq-protein associated with the receptor.  The activated α-subunit undergoes a conformational change and exposes a phospholipase C (PLC) activating site.\n\n2. After activation, PLC hydrolyzes phosphatidyl inositol bisphosphate (PIP2) into diacylglycerol (DAG) and inositol triphosphate (IP3).\n\n3. DAG is able to directly stimulate protein kinase C (PKC), but the major activator of PKC is increased intracellular Ca2+ that occurs due to IP3-mediated release of intracellular Ca2+ stores from the endoplasmic reticulum.  PKC is the major effector molecule in this pathway; it directly modulates the activity of other proteins via phosphorylation.',
      explI:[
        {option:'B and C', explanation:'Intracellular cAMP and cGMP concentrations increase during activation of adenylate or guanylate cyclase second messenger systems, respectively.  Levels can also increase following cyclic nucleotide phosphodiesterase inhibition, as seen on exposure to sildenafil, which selectively inhibits cGMP phosphodiesterase and results in smooth muscle relaxation in blood vessels.'},
        {option:'D', explanation:'Intracellular Cl- concentration increases slightly after inhibitory neurotransmitters (eg, GABA, glycine) act on the neuron to increase Cl- membrane conductance (hyperpolarization).'},
        {option:'E', explanation:'The intracellular concentration of mRNA increases during cellular states of elevated protein synthesis (eg, during cell division).'},
        {option:'F', explanation:'Nitric oxide (NO) is a paracrine signaling molecule with a lifetime of a few seconds.  It can freely cross cell membranes and functions as a critical component of endothelium-mediated vasodilation.  NO is synthesized from arginine and O2 by the enzyme NO-synthase.'},
      ],
      objective:'The phosphoinositol second messenger system begins with ligand-receptor binding and Gq-protein activation leading to activation of phospholipase C (PLC).  PLC then hydrolyzes phosphatidyl inositol bisphosphate and forms diacylglycerol and inositol triphosphate (IP3).  Finally, IP3 activates protein kinase C via an increase in intracellular Ca2+.',
      peer:{A:75, B:11, C:10, D:0, E:0, F:1},
      ptTranslation:{
        vignette:'Biólogos moleculares que estudam a transdução de sinal aplicam a células humanas um agente que ativa a fosfolipase C dependente de proteína G.',
        q:'Qual das seguintes substâncias intracelulares provavelmente aumenta imediatamente após a exposição a esse agente?',
        objective:'O sistema de segundo mensageiro do fosfoinositol começa com a ligação ligante-receptor e a ativação da proteína Gq, levando à ativação da fosfolipase C (PLC).  A PLC então hidrolisa o fosfatidilinositol bisfosfato, formando diacilglicerol e inositol trifosfato (IP3).  Por fim, o IP3 ativa a proteína quinase C por meio de um aumento no Ca2+ intracelular.',
        options:[
          {label:'A', text:'Ca2+'},
          {label:'B', text:'AMPc'},
          {label:'C', text:'GMPc'},
          {label:'D', text:'Cl-'},
          {label:'E', text:'mRNA'},
          {label:'F', text:'NO'},
        ],
        explC:'Uma variedade de receptores hormonais é conhecida por exercer seus efeitos intracelulares por meio do sistema do fosfoinositol.  Exemplos incluem os receptores α1-adrenérgicos, colinérgicos M1 e M3, V1 (vasopressina), H1 (histamina), ocitocina, angiotensina II, TRH e GnRH.  Essa via de transdução de sinal ocorre através das seguintes etapas:\n\n1. A ligação de um ligante ao seu receptor de superfície celular causa a troca de GDP por GTP na subunidade α de uma proteína Gq associada ao receptor.  A subunidade α ativada sofre uma mudança conformacional e expõe um sítio ativador da fosfolipase C (PLC).\n\n2. Após a ativação, a PLC hidrolisa o fosfatidilinositol bisfosfato (PIP2) em diacilglicerol (DAG) e inositol trifosfato (IP3).\n\n3. O DAG é capaz de estimular diretamente a proteína quinase C (PKC), mas o principal ativador da PKC é o aumento do Ca2+ intracelular que ocorre devido à liberação, mediada pelo IP3, dos estoques intracelulares de Ca2+ do retículo endoplasmático.  A PKC é a principal molécula efetora dessa via; ela modula diretamente a atividade de outras proteínas por meio de fosforilação.',
        explI:[
          {option:'B and C', explanation:'As concentrações intracelulares de AMPc e GMPc aumentam durante a ativação dos sistemas de segundo mensageiro da adenilato ciclase ou da guanilato ciclase, respectivamente.  Os níveis também podem aumentar após a inibição da fosfodiesterase de nucleotídeos cíclicos, como visto na exposição ao sildenafil, que inibe seletivamente a fosfodiesterase do GMPc e resulta em relaxamento da musculatura lisa nos vasos sanguíneos.'},
          {option:'D', explanation:'A concentração intracelular de Cl- aumenta discretamente após neurotransmissores inibitórios (por exemplo, GABA, glicina) agirem sobre o neurônio para aumentar a condutância de membrana ao Cl- (hiperpolarização).'},
          {option:'E', explanation:'A concentração intracelular de mRNA aumenta em estados celulares de síntese proteica elevada (por exemplo, durante a divisão celular).'},
          {option:'F', explanation:'O óxido nítrico (NO) é uma molécula de sinalização parácrina com meia-vida de poucos segundos.  Ele pode atravessar livremente as membranas celulares e funciona como um componente essencial da vasodilatação mediada pelo endotélio.  O NO é sintetizado a partir da arginina e do O2 pela enzima NO-sintase.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0057', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'hard',
      vignette:'A researcher is studying the structure of different hormone receptors.  Receptor proteins are isolated and purified from a homogenized tissue sample.  Detailed structural analysis shows that one of the receptor proteins contains a 30–amino acid motif coordinating a zinc ion, as shown below.',
      q:'Which of the following hormones most likely binds to the receptor containing this structure?',
      options:[
        {label:'A', text:'ACTH'},
        {label:'B', text:'Antidiuretic hormone'},
        {label:'C', text:'Epinephrine'},
        {label:'D', text:'Insulin'},
        {label:'E', text:'Thyroid hormone'},
      ],
      correct:'E',
      img:'assets/qbank/CMQ-STEP1-BCH-0057_zinc_finger_motif.png',
      explC:'The zinc finger structure represents the most commonly identified DNA-binding domain in humans.  Zinc finger motifs are composed of amino acid chains bound together around a zinc ion via linkages with cysteine (and sometimes histidine) residues.  This forms a stable, finger-shaped structure containing 2 antiparallel beta strands and an alpha helix.  Unique combinations of amino acids as well as the specific histidine and cysteine linkages determine DNA-binding specificity.  Many transcription factors use multiple zinc finger motifs to recognize specific genes and alter their activity.\n\nAlthough most hormones alter transcription regulation to some degree in target cells, only intracellular receptors located in the cytoplasm or nucleus can act directly as transcription factors.  These intracellular receptors typically bind lipid-soluble hormones because the ligand must diffuse across the cell membrane to reach the receptor.  Once bound to their ligand, these receptors bind directly to target DNA sequences via zinc fingers to regulate gene expression.  Examples include receptors for thyroid hormone, steroids (eg, estrogen, aldosterone, cortisol), and fat-soluble vitamins.',
      explI:[
        {option:'A, B, C, and D', explanation:'In contrast to lipid-soluble hormones, non–lipid-soluble hormones interact with transmembrane receptors found on the cell membrane.  These receptors use a signal transduction cascade involving second messengers with subsequent activation of non–receptor-associated transcription factors; they do not contain DNA-binding domains.  Examples include the G protein–coupled receptors that bind ACTH, antidiuretic hormone, and epinephrine as well as receptors with intrinsic tyrosine kinase activity (eg, insulin receptor).'},
      ],
      objective:'Zinc finger motifs are composed of amino acid chains bound together around a zinc ion.  They recognize specific DNA sequences and are used by many transcription factors to bind DNA and alter activity of target genes.  Intracellular receptors that act as transcription factors and contain zinc finger binding domains include those that bind thyroid hormone, steroids, and fat-soluble vitamins.',
      peer:{A:15, B:8, C:11, D:21, E:41},
      ptTranslation:{
        vignette:'Um pesquisador está estudando a estrutura de diferentes receptores hormonais.  Proteínas receptoras são isoladas e purificadas a partir de uma amostra de tecido homogeneizado.  Uma análise estrutural detalhada mostra que uma das proteínas receptoras contém um motivo de 30 aminoácidos que coordena um íon zinco, como mostrado abaixo.',
        q:'Qual dos seguintes hormônios provavelmente se liga ao receptor que contém essa estrutura?',
        objective:'Os motivos em dedo de zinco são compostos por cadeias de aminoácidos unidas ao redor de um íon zinco.  Eles reconhecem sequências específicas de DNA e são usados por muitos fatores de transcrição para se ligar ao DNA e alterar a atividade de genes-alvo.  Os receptores intracelulares que atuam como fatores de transcrição e contêm domínios de ligação em dedo de zinco incluem aqueles que se ligam ao hormônio tireoidiano, a esteroides e a vitaminas lipossolúveis.',
        options:[
          {label:'A', text:'ACTH'},
          {label:'B', text:'Hormônio antidiurético'},
          {label:'C', text:'Epinefrina'},
          {label:'D', text:'Insulina'},
          {label:'E', text:'Hormônio tireoidiano'},
        ],
        explC:'A estrutura em dedo de zinco (zinc finger) representa o domínio de ligação ao DNA mais comumente identificado em humanos.  Os motivos em dedo de zinco são compostos por cadeias de aminoácidos unidas ao redor de um íon zinco por meio de ligações com resíduos de cisteína (e às vezes histidina).  Isso forma uma estrutura estável, em formato de dedo, contendo 2 fitas beta antiparalelas e uma hélice alfa.  Combinações únicas de aminoácidos, assim como as ligações específicas de histidina e cisteína, determinam a especificidade de ligação ao DNA.  Muitos fatores de transcrição usam múltiplos motivos em dedo de zinco para reconhecer genes específicos e alterar sua atividade.\n\nEmbora a maioria dos hormônios altere a regulação da transcrição em algum grau nas células-alvo, apenas os receptores intracelulares localizados no citoplasma ou no núcleo podem atuar diretamente como fatores de transcrição.  Esses receptores intracelulares tipicamente se ligam a hormônios lipossolúveis, pois o ligante precisa se difundir através da membrana celular para alcançar o receptor.  Uma vez ligados ao seu ligante, esses receptores se ligam diretamente a sequências específicas de DNA-alvo por meio de dedos de zinco, para regular a expressão gênica.  Exemplos incluem os receptores do hormônio tireoidiano, de esteroides (por exemplo, estrogênio, aldosterona, cortisol) e de vitaminas lipossolúveis.',
        explI:[
          {option:'A, B, C, and D', explanation:'Em contraste com os hormônios lipossolúveis, os hormônios não lipossolúveis interagem com receptores transmembrana encontrados na membrana celular.  Esses receptores utilizam uma cascata de transdução de sinal envolvendo segundos mensageiros, com ativação subsequente de fatores de transcrição não associados ao receptor; eles não contêm domínios de ligação ao DNA.  Exemplos incluem os receptores acoplados à proteína G que se ligam a ACTH, hormônio antidiurético e epinefrina, bem como receptores com atividade intrínseca de tirosina quinase (por exemplo, o receptor de insulina).'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0058', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'medium',
      vignette:'A 69-year-old woman with Alzheimer disease is brought to the emergency department after getting lost while taking a walk in her neighborhood.  Her son has been unable to contact the patient for the last 2 days, and today the police found her wandering in a park.  The patient says that she drank water from a park fountain but has not had anything to eat for over 24 hours.  On physical examination, she is mildly confused with dry mucous membranes.  Laboratory studies show a blood glucose level of 92 mg/dL.',
      q:'Which of the following hormones binds to an intracellular receptor to help maintain this patient\'s laboratory findings within the normal range?',
      options:[
        {label:'A', text:'Cortisol'},
        {label:'B', text:'Epinephrine'},
        {label:'C', text:'Glucagon'},
        {label:'D', text:'Growth hormone'},
        {label:'E', text:'Insulin'},
        {label:'F', text:'Norepinephrine'},
      ],
      correct:'A',
      explC:'This patient has experienced a prolonged fast, but her blood glucose level is normal.  As blood glucose levels fall in the fasting state, hypoglycemia is prevented due to suppression of insulin secretion and activation of counterregulatory hormones.  Glucagon is the primary hormone secreted acutely in response to falling glucose levels; it stimulates hepatic glycogenolysis and gluconeogenesis.  Concurrently, epinephrine further stimulates glycogenolysis and gluconeogenesis, increases the release of gluconeogenic substrates from muscle and fat, and limits glucose utilization by some insulin-sensitive peripheral tissues.\n\nAs the fast continues, secretion of cortisol and growth hormone increases; these hormones attenuate hypoglycemia by altering transcription of key enzymes.  In the inactivated state, intracellular cortisol receptors are found in the cytoplasm in association with heat shock proteins.  Binding of cortisol to the carboxy terminal portion of the receptor causes the release of the heat shock proteins and allows receptor dimerization.  The activated homodimers are then transported to the nucleus, where they control gene expression by binding to hormone-responsive DNA elements in the promoter region of target genes.  Cortisol increases transcription of gluconeogenic enzymes as well as those involved in lipolysis and proteolysis.',
      explI:[
        {option:'B, C, and F', explanation:'Catecholamines (eg, epinephrine, norepinephrine) and glucagon attenuate hypoglycemia.  However, they exert their metabolic effects via extracellular, transmembrane, G protein–coupled receptors that activate adenyl cyclase and increase cyclic AMP production.'},
        {option:'D', explanation:'Growth hormone acts via an extracellular, transmembrane receptor that activates a JAK-STAT pathway.  Growth hormone antagonizes insulin action, increases gluconeogenesis, and promotes lipolysis (provides gluconeogenic substrates).'},
        {option:'E', explanation:'In addition to the production of counterregulatory hormones, the inhibition of insulin release from pancreatic beta cells plays a primary role in preventing hypoglycemia during fasting.  However, insulin acts on an extracellular transmembrane receptor with intrinsic tyrosine kinase activity.'},
      ],
      objective:'In a fasting state, glucagon and epinephrine bind to transmembrane receptors and prevent hypoglycemia by increasing hepatic glycogenolysis and gluconeogenesis.  Prolonged fasting increases the secretion of cortisol, a steroid hormone that binds to an intracellular receptor and acts to increase transcription of enzymes involved in gluconeogenesis, lipolysis, and proteolysis.',
      peer:{A:55, B:3, C:34, D:2, E:3, F:0},
      ptTranslation:{
        vignette:'Uma mulher de 69 anos com doença de Alzheimer é levada ao pronto-socorro depois de se perder durante uma caminhada em seu bairro.  Seu filho não conseguiu contatá-la nos últimos 2 dias, e hoje a polícia a encontrou perambulando em um parque.  A paciente diz que bebeu água de uma fonte do parque, mas não comeu nada nas últimas 24 horas.  Ao exame físico, ela está discretamente confusa, com mucosas secas.  Os exames laboratoriais mostram glicemia de 92 mg/dL.',
        q:'Qual dos seguintes hormônios se liga a um receptor intracelular para ajudar a manter os achados laboratoriais desta paciente dentro da faixa normal?',
        objective:'Em estado de jejum, o glucagon e a epinefrina se ligam a receptores transmembrana e previnem a hipoglicemia ao aumentar a glicogenólise e a gliconeogênese hepáticas.  O jejum prolongado aumenta a secreção de cortisol, um hormônio esteroide que se liga a um receptor intracelular e atua aumentando a transcrição de enzimas envolvidas na gliconeogênese, lipólise e proteólise.',
        options:[
          {label:'A', text:'Cortisol'},
          {label:'B', text:'Epinefrina'},
          {label:'C', text:'Glucagon'},
          {label:'D', text:'Hormônio do crescimento'},
          {label:'E', text:'Insulina'},
          {label:'F', text:'Norepinefrina'},
        ],
        explC:'Esta paciente passou por um jejum prolongado, mas sua glicemia está normal.  À medida que os níveis de glicose caem no estado de jejum, a hipoglicemia é prevenida pela supressão da secreção de insulina e pela ativação de hormônios contrarreguladores.  O glucagon é o principal hormônio secretado agudamente em resposta à queda da glicose; ele estimula a glicogenólise e a gliconeogênese hepáticas.  Concomitantemente, a epinefrina estimula ainda mais a glicogenólise e a gliconeogênese, aumenta a liberação de substratos gliconeogênicos do músculo e do tecido adiposo, e limita a utilização de glicose por alguns tecidos periféricos sensíveis à insulina.\n\nÀ medida que o jejum continua, a secreção de cortisol e de hormônio do crescimento aumenta; esses hormônios atenuam a hipoglicemia ao alterar a transcrição de enzimas-chave.  No estado inativo, os receptores intracelulares de cortisol são encontrados no citoplasma em associação com proteínas de choque térmico.  A ligação do cortisol à porção carboxiterminal do receptor causa a liberação das proteínas de choque térmico e permite a dimerização do receptor.  Os homodímeros ativados são então transportados para o núcleo, onde controlam a expressão gênica ao se ligarem a elementos de DNA responsivos a hormônios na região promotora de genes-alvo.  O cortisol aumenta a transcrição de enzimas gliconeogênicas, bem como daquelas envolvidas na lipólise e na proteólise.',
        explI:[
          {option:'B, C, and F', explanation:'As catecolaminas (por exemplo, epinefrina, norepinefrina) e o glucagon atenuam a hipoglicemia.  Entretanto, eles exercem seus efeitos metabólicos por meio de receptores extracelulares, transmembrana, acoplados à proteína G, que ativam a adenilil ciclase e aumentam a produção de AMP cíclico.'},
          {option:'D', explanation:'O hormônio do crescimento age por meio de um receptor extracelular, transmembrana, que ativa uma via JAK-STAT.  O hormônio do crescimento antagoniza a ação da insulina, aumenta a gliconeogênese e promove a lipólise (fornecendo substratos gliconeogênicos).'},
          {option:'E', explanation:'Além da produção de hormônios contrarreguladores, a inibição da liberação de insulina pelas células beta pancreáticas desempenha um papel primário na prevenção da hipoglicemia durante o jejum.  Entretanto, a insulina age em um receptor extracelular transmembrana com atividade intrínseca de tirosina quinase.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0059', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'easy',
      vignette:'A 42-year-old woman comes to the clinic for follow-up evaluation.  She has a 15-year history of resting tremor, bradykinesia, and cogwheel rigidity consistent with Parkinson disease.  One of her siblings recently started having similar symptoms.  As part of a research study, genetic analysis is performed on the patient and the affected sibling.  The results show a loss-of-function mutation that leads to accumulation of misfolded proteins.',
      q:'Which of the following biochemical processes is most likely defective in this patient?',
      options:[
        {label:'A', text:'Acetylation'},
        {label:'B', text:'Gamma-carboxylation'},
        {label:'C', text:'Glucuronidation'},
        {label:'D', text:'Phosphorylation'},
        {label:'E', text:'Ubiquitination'},
      ],
      correct:'E',
      explC:'Ubiquitin is a protein found in eukaryotic cells that is attached to other substrate proteins in a highly regulated process termed ubiquitination.  The proteasome recognizes ubiquitinated proteins and uses ATP energy to drive the proteins through its tubular structure, degrading them into small peptides; attachment of 4 or more ubiquitin monomers is typically required before proteasomal degradation can take place.  Ubiquitination plays a role in many cell functions requiring the breakdown of specific proteins, including antigen processing, muscle wasting, cell cycle regulation, and disposal of misfolded proteins.\n\nImpairment of the ubiquitin-proteasome system can contribute to the development of neurodegenerative disorders (eg, Parkinson disease, Alzheimer disease).  Failure to properly degrade abnormal proteins can cause aggregation of misfolded proteins and eventual obstruction of intracellular molecular traffic, leading to cell death.  Mutations in genes involved in the ubiquitin-proteasome system (eg, Parkin, PINK1, and DJ-1) are associated with autosomal recessive forms of Parkinson disease that have an early age of onset (age <50).',
      explI:[
        {option:'A', explanation:'Heterochromatin refers to condensed DNA that has a low level of transcriptional activity, whereas euchromatin (loosely arranged) has high levels of transcriptional activity.  Histone acetylation promotes the formation of euchromatin; this process is impaired in Huntington disease, but is unrelated to the pathogenesis of Parkinson disease.'},
        {option:'B', explanation:'Vitamin K–dependent gamma-carboxylation is critical for the functioning of clotting factors II, VII, IX, and X and of anticoagulative proteins C and S.  Warfarin inhibits reduction of vitamin K to its active form, which in turn prevents carboxylation of vitamin K–dependent clotting factors.'},
        {option:'C', explanation:'One step in the hepatic processing of bilirubin includes bilirubin conjugation with glucuronic acid in the endoplasmic reticulum.  Patients with Crigler-Najjar syndrome lack the enzyme needed to catalyze bilirubin glucuronidation, causing severe unconjugated hyperbilirubinemia.'},
        {option:'D', explanation:'Phosphorylation, or the addition of a phosphate group (PO4^3-) to a protein or other organic molecule, is commonly involved in the regulation of enzymatic activity.  Hyperphosphorylation of tau proteins can contribute to abnormal protein aggregation in Alzheimer disease, not Parkinson disease.'},
      ],
      objective:'Ubiquitin is a protein that undergoes attachment to other proteins, labeling them for degradation by proteasomes.  Impairment of the ubiquitin-proteasome system leads to the accumulation of misfolded proteins, which can contribute to the development of neurodegenerative disorders (eg, Parkinson disease).',
      peer:{A:7, B:4, C:2, D:6, E:77},
      ptTranslation:{
        vignette:'Uma mulher de 42 anos vem à clínica para avaliação de acompanhamento.  Ela tem um histórico de 15 anos de tremor de repouso, bradicinesia e rigidez em roda denteada, consistentes com doença de Parkinson.  Um de seus irmãos começou recentemente a apresentar sintomas semelhantes.  Como parte de um estudo de pesquisa, uma análise genética é realizada na paciente e no irmão afetado.  Os resultados mostram uma mutação de perda de função que leva ao acúmulo de proteínas mal dobradas.',
        q:'Qual dos seguintes processos bioquímicos provavelmente está defeituoso nesta paciente?',
        objective:'A ubiquitina é uma proteína que sofre ligação a outras proteínas, marcando-as para degradação pelos proteassomos.  O comprometimento do sistema ubiquitina-proteassomo leva ao acúmulo de proteínas mal dobradas, o que pode contribuir para o desenvolvimento de distúrbios neurodegenerativos (por exemplo, doença de Parkinson).',
        options:[
          {label:'A', text:'Acetilação'},
          {label:'B', text:'Gama-carboxilação'},
          {label:'C', text:'Glicuronidação'},
          {label:'D', text:'Fosforilação'},
          {label:'E', text:'Ubiquitinação'},
        ],
        explC:'A ubiquitina é uma proteína encontrada em células eucarióticas que é ligada a outras proteínas-substrato em um processo altamente regulado chamado ubiquitinação.  O proteassomo reconhece proteínas ubiquitinadas e usa energia do ATP para conduzi-las através de sua estrutura tubular, degradando-as em pequenos peptídeos; a ligação de 4 ou mais monômeros de ubiquitina é tipicamente necessária antes que a degradação proteassômica possa ocorrer.  A ubiquitinação desempenha um papel em muitas funções celulares que exigem a degradação de proteínas específicas, incluindo processamento de antígenos, perda de massa muscular, regulação do ciclo celular e descarte de proteínas mal dobradas.\n\nO comprometimento do sistema ubiquitina-proteassomo pode contribuir para o desenvolvimento de distúrbios neurodegenerativos (por exemplo, doença de Parkinson, doença de Alzheimer).  A falha em degradar adequadamente proteínas anormais pode causar a agregação de proteínas mal dobradas e a eventual obstrução do tráfego molecular intracelular, levando à morte celular.  Mutações em genes envolvidos no sistema ubiquitina-proteassomo (por exemplo, Parkin, PINK1 e DJ-1) estão associadas a formas autossômicas recessivas da doença de Parkinson com início precoce (idade <50 anos).',
        explI:[
          {option:'A', explanation:'A heterocromatina se refere ao DNA condensado que apresenta baixo nível de atividade transcricional, enquanto a eucromatina (frouxamente organizada) apresenta altos níveis de atividade transcricional.  A acetilação de histonas promove a formação de eucromatina; esse processo está prejudicado na doença de Huntington, mas não está relacionado à patogênese da doença de Parkinson.'},
          {option:'B', explanation:'A gama-carboxilação dependente de vitamina K é fundamental para o funcionamento dos fatores de coagulação II, VII, IX e X e das proteínas anticoagulantes C e S.  A varfarina inibe a redução da vitamina K à sua forma ativa, o que por sua vez impede a carboxilação dos fatores de coagulação dependentes de vitamina K.'},
          {option:'C', explanation:'Uma das etapas do processamento hepático da bilirrubina inclui a conjugação da bilirrubina com ácido glicurônico no retículo endoplasmático.  Pacientes com síndrome de Crigler-Najjar não possuem a enzima necessária para catalisar a glicuronidação da bilirrubina, causando hiperbilirrubinemia não conjugada grave.'},
          {option:'D', explanation:'A fosforilação, ou seja, a adição de um grupo fosfato (PO4^3-) a uma proteína ou outra molécula orgânica, está comumente envolvida na regulação da atividade enzimática.  A hiperfosforilação das proteínas tau pode contribuir para a agregação proteica anormal na doença de Alzheimer, não na doença de Parkinson.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0060', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'medium',
      vignette:'A 54-year-old woman is evaluated for progressive constipation, anorexia, and a 5.4-kg (12-lb) weight loss over the past several months.  Physical examination is unremarkable.  Stool guaiac test is positive, and a colonoscopy is performed.  An exophytic mass is identified in the sigmoid colon.  The patient undergoes a left hemicolectomy, and histopathology of the surgical specimen is positive for adenocarcinoma.  Molecular testing of the cancer cells reveals a mutation in the KRAS gene that results in constitutive activation of the Ras protein.',
      q:'Under normal circumstances, this protein is only active when bound to which of the following substances?',
      options:[
        {label:'A', text:'ATP'},
        {label:'B', text:'Ca2+'},
        {label:'C', text:'cAMP'},
        {label:'D', text:'GTP'},
        {label:'E', text:'IP3'},
      ],
      correct:'D',
      explC:'RAS genes code for a family of small G-proteins involved in signal transduction in the Ras-MAPK pathway.  Ras proteins exist in 2 different states: an inactive GDP-bound state and an active GTP-bound state.  Ras becomes activated when a growth factor ligand binds to a receptor tyrosine kinase located on the cell membrane, causing autophosphorylation of the receptor.  This triggers binding of adaptor proteins that interact with Ras, promoting GDP removal and GTP binding.  Activated Ras then begins a phosphorylation cascade that results in the activation of mitogen-activated protein kinase (MAPK), which enters the nucleus to influence gene transcription.\n\nRas proteins have intrinsic GTPase activity that allows them to hydrolyze GTP; this mechanism prevents accumulation of active Ras (GTP-bound) in the absence of hormonal signaling.  RAS gene mutations can lead to decreased intrinsic GTPase activity; this results in a constitutively activated Ras protein that causes constant and unregulated cell proliferation.  RAS mutations are commonly identified in cancerous tumors, specifically colorectal and pancreatic malignancies.',
      explI:[
        {option:'A and C', explanation:'ATP serves as a phosphate source for kinase-dependent phosphorylation reactions involved in numerous intracellular signaling pathways.  It is also used as a substrate to produce cyclic AMP (cAMP) in the cAMP second messenger system.'},
        {option:'B', explanation:'Ca2+ is important for cell signaling as its intracellular presence alters the function of many proteins and enzymes.  Ca2+ is required for many basic physiologic activities including apoptosis, muscular contraction, and neuronal transmission.'},
        {option:'E', explanation:'IP3 is the water-soluble component of the IP3/DAG second messenger system.  IP3 acts on the endoplasmic reticulum to cause intracellular Ca2+ release while DAG remains membrane-bound and activates membrane-bound protein kinases.'},
      ],
      objective:'Regulation of the Ras-MAPK signal transduction pathway requires a balance between active (GTP-bound) and inactive (GDP-bound) Ras proteins.  RAS gene mutations, which result in constitutively activated Ras proteins, are implicated in the development of malignant tumors.',
      peer:{A:12, B:7, C:16, D:53, E:9},
      ptTranslation:{
        vignette:'Uma mulher de 54 anos é avaliada por constipação progressiva, anorexia e perda de 5,4 kg (12 lb) ao longo dos últimos meses.  O exame físico é inespecífico.  A pesquisa de sangue oculto nas fezes é positiva, e uma colonoscopia é realizada.  Uma massa exofítica é identificada no colo sigmoide.  A paciente é submetida a uma hemicolectomia esquerda, e a histopatologia do espécime cirúrgico é positiva para adenocarcinoma.  O teste molecular das células tumorais revela uma mutação no gene KRAS que resulta em ativação constitutiva da proteína Ras.',
        q:'Em circunstâncias normais, essa proteína só está ativa quando ligada a qual das seguintes substâncias?',
        objective:'A regulação da via de transdução de sinal Ras-MAPK requer um equilíbrio entre proteínas Ras ativas (ligadas ao GTP) e inativas (ligadas ao GDP).  Mutações no gene RAS, que resultam em proteínas Ras constitutivamente ativadas, estão implicadas no desenvolvimento de tumores malignos.',
        options:[
          {label:'A', text:'ATP'},
          {label:'B', text:'Ca2+'},
          {label:'C', text:'AMPc'},
          {label:'D', text:'GTP'},
          {label:'E', text:'IP3'},
        ],
        explC:'Os genes RAS codificam uma família de pequenas proteínas G envolvidas na transdução de sinal na via Ras-MAPK.  As proteínas Ras existem em 2 estados diferentes: um estado inativo ligado ao GDP e um estado ativo ligado ao GTP.  A Ras é ativada quando um ligante de fator de crescimento se liga a um receptor tirosina quinase localizado na membrana celular, causando a autofosforilação do receptor.  Isso desencadeia a ligação de proteínas adaptadoras que interagem com a Ras, promovendo a remoção do GDP e a ligação do GTP.  A Ras ativada então inicia uma cascata de fosforilação que resulta na ativação da proteína quinase ativada por mitógeno (MAPK), que entra no núcleo para influenciar a transcrição gênica.\n\nAs proteínas Ras têm atividade GTPase intrínseca que lhes permite hidrolisar o GTP; esse mecanismo impede o acúmulo de Ras ativa (ligada ao GTP) na ausência de sinalização hormonal.  Mutações no gene RAS podem levar à diminuição da atividade GTPase intrínseca; isso resulta em uma proteína Ras constitutivamente ativada que causa proliferação celular constante e não regulada.  Mutações em RAS são comumente identificadas em tumores cancerosos, especificamente em neoplasias malignas colorretais e pancreáticas.',
        explI:[
          {option:'A and C', explanation:'O ATP serve como fonte de fosfato para reações de fosforilação dependentes de quinases envolvidas em numerosas vias de sinalização intracelular.  Ele também é usado como substrato para produzir AMP cíclico (AMPc) no sistema de segundo mensageiro do AMPc.'},
          {option:'B', explanation:'O Ca2+ é importante para a sinalização celular, pois sua presença intracelular altera a função de muitas proteínas e enzimas.  O Ca2+ é necessário para muitas atividades fisiológicas básicas, incluindo apoptose, contração muscular e transmissão neuronal.'},
          {option:'E', explanation:'O IP3 é o componente hidrossolúvel do sistema de segundo mensageiro IP3/DAG.  O IP3 age sobre o retículo endoplasmático para causar a liberação de Ca2+ intracelular, enquanto o DAG permanece ligado à membrana e ativa proteínas quinases ligadas à membrana.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0061', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'easy',
      vignette:'Researchers are working to identify new targets for drug development to treat idiopathic pulmonary fibrosis.  After obtaining lung tissue samples from affected patients, they conduct a series of experiments to measure the expression and activity of various profibrotic proteins.  The results for one such protein, galectin-3, are as follows:\n\nmRNA concentration — normal\nProtein concentration — increased\nProtein activity — intact',
      q:'Which of the following processes best explains these findings?',
      options:[
        {label:'A', text:'Mutation in the Galectin-3 promotor region'},
        {label:'B', text:'Decreased methylation of the Galectin-3 gene'},
        {label:'C', text:'Shortening of the Galectin-3 mRNA poly-(A) tail'},
        {label:'D', text:'Decreased ubiquitination of the Galectin-3 protein'},
        {label:'E', text:'Hyperphosphorylation of the Galectin-3 protein'},
      ],
      correct:'D',
      explC:'The researchers\' study of galectin-3 revealed an increased intracellular protein level despite unchanged cellular mRNA concentration.  Regulation of protein expression occurs at multiple levels, as follows:\n\n• Transcriptional: mRNA production rate is determined by the binding of transcription factors and RNA polymerase.  Genetic changes (eg, alterations in promoter sequence) and epigenetic modifications that affect chromatin openness (eg, histone methylation or acetylation) can also affect the rate of gene transcription by altering access and binding of transcription factors.  However, transcriptional regulation results in altered mRNA levels (Choices A and B).\n\n• Posttranscriptional: After the gene is transcribed, the pre-mRNA undergoes further processing and regulation.  Posttranscriptional control regulates the rate of mRNA decay.  Examples of posttranscriptional control include polyadenylation and RNA interference (eg, endogenous microRNAs).  The poly(A) tail protects eukaryotic mRNA from digestion by endogenous ribonucleases.  Therefore, truncation of the poly(A) tail leads to increased mRNA degradation and lower mRNA abundance (Choice C).\n\n• Posttranslational: After translation of mRNA, the polypeptide product undergoes posttranslational modifications (PTMs), which can affect both protein abundance and activity.  One of the most widespread modifications is ubiquitination (by ubiquitin ligases, typically on lysine residues), which tags the protein for destruction in the proteasome (ie, lowering the protein half-life).  Therefore, decreased ubiquitination often leads to increased protein abundance despite unchanged mRNA levels, as seen with galectin-3 (Choice D).  Another common PTM is protein phosphorylation (by kinases, typically on serine/threonine residues), which regulates the activity (ie, on/off switching) of proteins independently of their abundance (Choice E).\n\nMost proteins undergo ubiquitination at some point in their lifespans.  Therefore, even isolated alterations of the ubiquitin-proteasome system (eg, loss of a single E3 ubiquitin ligase function) have been implicated in the broad dysregulation of protein levels, which may contribute to elusive conditions (eg, idiopathic pulmonary fibrosis).',
      explI:[
        {option:'A and B', explanation:'Genetic changes (eg, alterations in promoter sequence) and epigenetic modifications that affect chromatin openness (eg, histone methylation or acetylation) affect the rate of gene transcription by altering access and binding of transcription factors, resulting in altered mRNA levels.'},
        {option:'C', explanation:'The poly(A) tail protects eukaryotic mRNA from digestion by endogenous ribonucleases.  Therefore, truncation of the poly(A) tail leads to increased mRNA degradation and lower mRNA abundance.'},
        {option:'E', explanation:'Protein phosphorylation (by kinases, typically on serine/threonine residues) regulates the activity (ie, on/off switching) of proteins independently of their abundance.'},
      ],
      objective:'Posttranslational modifications can alter protein abundance and activity despite unchanged levels of corresponding mRNA.  Ubiquitination targets a protein for proteasomal destruction, thereby lowering its abundance.',
      peer:{A:8, B:12, C:2, D:71, E:5},
      ptTranslation:{
        vignette:'Pesquisadores estão trabalhando para identificar novos alvos para o desenvolvimento de fármacos no tratamento da fibrose pulmonar idiopática.  Após obter amostras de tecido pulmonar de pacientes afetados, eles conduzem uma série de experimentos para medir a expressão e a atividade de várias proteínas profibróticas.  Os resultados para uma dessas proteínas, a galectina-3, são os seguintes:\n\nConcentração de mRNA — normal\nConcentração de proteína — aumentada\nAtividade da proteína — intacta',
        q:'Qual dos seguintes processos melhor explica esses achados?',
        objective:'Modificações pós-traducionais podem alterar a abundância e a atividade de uma proteína, apesar de níveis inalterados do mRNA correspondente.  A ubiquitinação marca uma proteína para destruição proteassômica, reduzindo assim sua abundância.',
        options:[
          {label:'A', text:'Mutação na região promotora da Galectina-3'},
          {label:'B', text:'Diminuição da metilação do gene da Galectina-3'},
          {label:'C', text:'Encurtamento da cauda poli-(A) do mRNA da Galectina-3'},
          {label:'D', text:'Diminuição da ubiquitinação da proteína Galectina-3'},
          {label:'E', text:'Hiperfosforilação da proteína Galectina-3'},
        ],
        explC:'O estudo dos pesquisadores sobre a galectina-3 revelou um aumento do nível intracelular da proteína, apesar da concentração de mRNA celular inalterada.  A regulação da expressão proteica ocorre em múltiplos níveis, como segue:\n\n• Transcricional: a taxa de produção de mRNA é determinada pela ligação de fatores de transcrição e da RNA polimerase.  Alterações genéticas (por exemplo, alterações na sequência do promotor) e modificações epigenéticas que afetam a abertura da cromatina (por exemplo, metilação ou acetilação de histonas) também podem afetar a taxa de transcrição gênica ao alterar o acesso e a ligação dos próprios fatores de transcrição.  Entretanto, a regulação transcricional resulta em níveis alterados de mRNA (Alternativas A e B).\n\n• Pós-transcricional: após a transcrição do gene, o pré-mRNA passa por processamento e regulação adicionais.  O controle pós-transcricional regula a taxa de degradação do mRNA.  Exemplos de controle pós-transcricional incluem a poliadenilação e a interferência por RNA (por exemplo, microRNAs endógenos).  A cauda poli(A) protege o mRNA eucariótico da digestão por ribonucleases endógenas.  Portanto, o encurtamento da cauda poli(A) leva ao aumento da degradação do mRNA e à menor abundância de mRNA (Alternativa C).\n\n• Pós-traducional: após a tradução do mRNA, o produto polipeptídico sofre modificações pós-traducionais (MPTs), que podem afetar tanto a abundância quanto a atividade da proteína.  Uma das modificações mais difundidas é a ubiquitinação (por ligases de ubiquitina, tipicamente em resíduos de lisina), que marca a proteína para destruição no proteassomo (ou seja, reduzindo a meia-vida da proteína).  Portanto, a diminuição da ubiquitinação frequentemente leva ao aumento da abundância proteica, apesar de níveis inalterados de mRNA, como observado com a galectina-3 (Alternativa D).  Outra MPT comum é a fosforilação proteica (por quinases, tipicamente em resíduos de serina/treonina), que regula a atividade (ou seja, o "liga/desliga") das proteínas independentemente de sua abundância (Alternativa E).\n\nA maioria das proteínas sofre ubiquitinação em algum momento de sua vida útil.  Portanto, mesmo alterações isoladas do sistema ubiquitina-proteassomo (por exemplo, perda de função de uma única ligase de ubiquitina E3) têm sido implicadas na desregulação ampla dos níveis proteicos, o que pode contribuir para condições de causa pouco esclarecida (por exemplo, fibrose pulmonar idiopática).',
        explI:[
          {option:'A and B', explanation:'Alterações genéticas (por exemplo, alterações na sequência do promotor) e modificações epigenéticas que afetam a abertura da cromatina (por exemplo, metilação ou acetilação de histonas) afetam a taxa de transcrição gênica ao alterar o acesso e a ligação dos fatores de transcrição, resultando em níveis alterados de mRNA.'},
          {option:'C', explanation:'A cauda poli(A) protege o mRNA eucariótico da digestão por ribonucleases endógenas.  Portanto, o encurtamento da cauda poli(A) leva ao aumento da degradação do mRNA e à menor abundância de mRNA.'},
          {option:'E', explanation:'A fosforilação proteica (por quinases, tipicamente em resíduos de serina/treonina) regula a atividade (ou seja, o "liga/desliga") das proteínas, independentemente de sua abundância.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0062', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'hard',
      vignette:'A 14-year-old boy is brought to the emergency department after accidental ingestion of a chicken bone that lodged in his esophagus.  Upper endoscopy is performed and the bone is successfully removed.  However, the patient is incidentally found to have mild hypercalcemia on laboratory testing.  On follow-up with his primary care provider 2 weeks later, he has no symptoms and clinical examination is unremarkable.  Further questioning reveals that several of his family members also have mild hypercalcemia.  Subsequent laboratory studies show a borderline high parathyroid hormone concentration, a very low urinary calcium level, and normal 25-hydroxyvitamin D level.',
      q:'A mutation in which of the following receptors is most likely responsible for this patient\'s laboratory abnormalities?',
      options:[
        {label:'A', text:'Intracellular receptor with a DNA-binding domain'},
        {label:'B', text:'Membrane-bound receptor coupled with a G protein'},
        {label:'C', text:'Transmembrane ligand-gated ion channel'},
        {label:'D', text:'Transmembrane receptor associated with intrinsic tyrosine kinase activity'},
        {label:'E', text:'Transmembrane receptor causing activation of Janus kinase/STAT pathway'},
      ],
      correct:'B',
      explC:'Calcium-sensing receptors (CaSRs) are transmembrane Gq protein–coupled (metabotropic) receptors that regulate the secretion of parathyroid hormone (PTH) in response to changes in circulating calcium levels.  Binding of calcium to CaSRs leads to the inhibition of PTH release, whereas low calcium levels allow increased PTH release.\n\nFamilial hypocalciuric hypercalcemia (FHH) is a benign autosomal dominant disorder caused by defective CaSRs in the parathyroid gland and kidneys.  In FHH, higher serum calcium levels are required to suppress the secretion of PTH.  This raises the set point of calcium-induced regulation of PTH secretion.  Patients with FHH have mild asymptomatic hypercalcemia, reduced urinary excretion of calcium, and high normal or mildly elevated PTH.',
      explI:[
        {option:'A', explanation:'Steroid hormones, thyroid hormone, and vitamin D act by binding to intracellular receptors with DNA-binding domains that interact with the regulatory DNA sequences of target genes.'},
        {option:'C', explanation:'Transmembrane ligand-gated ion channels (ionotropic receptors) allow a regulated flux of calcium, sodium, potassium, and chloride ions across the cell membrane.  Neurotransmitters that work via ion channel–linked receptors include acetylcholine, serotonin, N-methyl-D-aspartate, and gamma-aminobutyric acid.'},
        {option:'D', explanation:'Insulin and insulin-like growth factor work by stimulating transmembrane receptors with intrinsic tyrosine kinase activity in the intracellular domain, initiating a downstream phosphorylation cascade.'},
        {option:'E', explanation:'Janus kinase (JAK) is a cytoplasmic protein activated by ligand binding to transmembrane receptors.  JAKs activate cytoplasmic transcription factors called signal transducers and activators of transcription (STAT), which enter the nucleus to promote gene transcription.  Examples of hormones using a JAK/STAT messenger system include erythropoietin, growth hormone, and prolactin.'},
      ],
      objective:'Calcium-sensing receptors are G protein–coupled receptors that regulate the secretion of parathyroid hormone in response to changes in circulating calcium levels.  Familial hypocalciuric hypercalcemia is a benign autosomal dominant disorder caused by defective calcium-sensing receptors in the parathyroid gland and kidneys.',
      peer:{A:10, B:47, C:21, D:12, E:8},
      labs:[
        ['Parathyroid hormone, intact (serum)', '10–65 pg/mL', '10–65 pg/mL', 'Borderline high or mildly elevated in familial hypocalciuric hypercalcemia (FHH) despite hypercalcemia — an inappropriately "normal" PTH in the setting of high calcium suggests a defective calcium-sensing receptor rather than autonomous parathyroid disease', 'Discretamente elevado ou no limite superior na hipercalcemia hipocalciúrica familiar (HHF), apesar da hipercalcemia — um PTH inapropriadamente "normal" diante de cálcio alto sugere defeito no receptor sensor de cálcio, e não doença paratireóidea autônoma'],
        ['Calcium, urine (24-hour)', '100–300 mg/day', '100–300 mg/dia', 'Very low in FHH due to increased renal tubular calcium reabsorption from the defective calcium-sensing receptor, distinguishing it from primary hyperparathyroidism (which typically shows normal-to-high urinary calcium)', 'Muito baixo na HHF devido ao aumento da reabsorção tubular renal de cálcio decorrente do receptor sensor de cálcio defeituoso, o que a distingue do hiperparatireoidismo primário (que tipicamente mostra cálcio urinário normal a alto)'],
      ],
      ptTranslation:{
        vignette:'Um menino de 14 anos é levado ao pronto-socorro após ingestão acidental de um osso de frango que ficou preso em seu esôfago.  Uma endoscopia digestiva alta é realizada, e o osso é removido com sucesso.  Entretanto, o paciente apresenta, incidentalmente, hipercalcemia leve nos exames laboratoriais.  No retorno com seu médico de atenção primária 2 semanas depois, ele está assintomático e o exame clínico é inespecífico.  Uma investigação mais aprofundada revela que vários membros de sua família também têm hipercalcemia leve.  Exames laboratoriais subsequentes mostram concentração de paratormônio no limite superior da normalidade, nível urinário de cálcio muito baixo, e nível normal de 25-hidroxivitamina D.',
        q:'Uma mutação em qual dos seguintes receptores é mais provavelmente responsável pelas alterações laboratoriais deste paciente?',
        objective:'Os receptores sensores de cálcio são receptores acoplados à proteína G que regulam a secreção do paratormônio em resposta a alterações nos níveis circulantes de cálcio.  A hipercalcemia hipocalciúrica familiar é um distúrbio autossômico dominante benigno causado por receptores sensores de cálcio defeituosos na glândula paratireoide e nos rins.',
        options:[
          {label:'A', text:'Receptor intracelular com domínio de ligação ao DNA'},
          {label:'B', text:'Receptor de membrana acoplado a uma proteína G'},
          {label:'C', text:'Canal iônico transmembrana ativado por ligante'},
          {label:'D', text:'Receptor transmembrana associado a atividade intrínseca de tirosina quinase'},
          {label:'E', text:'Receptor transmembrana que causa ativação da via Janus quinase/STAT'},
        ],
        explC:'Os receptores sensores de cálcio (CaSRs) são receptores transmembrana acoplados à proteína Gq (metabotrópicos) que regulam a secreção do paratormônio (PTH) em resposta a alterações nos níveis circulantes de cálcio.  A ligação do cálcio aos CaSRs leva à inibição da liberação de PTH, enquanto níveis baixos de cálcio permitem o aumento da liberação de PTH.\n\nA hipercalcemia hipocalciúrica familiar (HHF) é um distúrbio autossômico dominante benigno causado por CaSRs defeituosos na glândula paratireoide e nos rins.  Na HHF, níveis séricos mais altos de cálcio são necessários para suprimir a secreção de PTH.  Isso eleva o ponto de ajuste (set point) da regulação da secreção de PTH induzida pelo cálcio.  Pacientes com HHF apresentam hipercalcemia leve e assintomática, excreção urinária reduzida de cálcio, e PTH no limite superior da normalidade ou discretamente elevado.',
        explI:[
          {option:'A', explanation:'Hormônios esteroides, o hormônio tireoidiano e a vitamina D agem se ligando a receptores intracelulares com domínios de ligação ao DNA, que interagem com as sequências regulatórias de DNA dos genes-alvo.'},
          {option:'C', explanation:'Os canais iônicos transmembrana ativados por ligante (receptores ionotrópicos) permitem um fluxo regulado de íons cálcio, sódio, potássio e cloreto através da membrana celular.  Neurotransmissores que atuam por meio de receptores ligados a canais iônicos incluem acetilcolina, serotonina, N-metil-D-aspartato e ácido gama-aminobutírico.'},
          {option:'D', explanation:'A insulina e o fator de crescimento semelhante à insulina agem estimulando receptores transmembrana com atividade intrínseca de tirosina quinase no domínio intracelular, iniciando uma cascata de fosforilação a jusante.'},
          {option:'E', explanation:'A Janus quinase (JAK) é uma proteína citoplasmática ativada pela ligação do ligante a receptores transmembrana.  As JAKs ativam fatores de transcrição citoplasmáticos chamados transdutores de sinal e ativadores de transcrição (STAT), que entram no núcleo para promover a transcrição gênica.  Exemplos de hormônios que utilizam um sistema de mensageiro JAK/STAT incluem a eritropoetina, o hormônio do crescimento e a prolactina.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0063', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'hard',
      vignette:'Researchers analyzing eukaryotic genome structure and function perform an experiment to extract DNA from exocrine pancreatic cells.  During the purification process, they isolate small circular DNA molecules that resemble bacterial chromosome.  Further analysis shows that these molecules code for proteins, transfer RNA, and ribosomal RNA.',
      q:'From which of the following cellular structures did these DNA molecules most likely originate?',
      options:[
        {label:'A', text:'A'},
        {label:'B', text:'B'},
        {label:'C', text:'C'},
        {label:'D', text:'D'},
        {label:'E', text:'E'},
      ],
      correct:'D',
      img:'assets/qbank/CMQ-STEP1-BCH-0063_pancreatic_acinar_cell_em.png',
      explC:'Nuclear chromosomes contain most of the DNA found in human cells.  However, mitochondria also contain their own DNA called mitochondrial DNA (mtDNA).  This DNA exists as a small circular chromosome with a slightly different genetic code than that of nuclear DNA, consistent with the endosymbiotic theory that mitochondria originated as prokaryotic cells that were later engulfed by ancient eukaryotes.\n\nOver time, most of the genes coding for mitochondrial proteins have migrated to nuclear DNA.  However, mtDNA still codes for about 13 proteins (some involved in oxidative metabolic pathways) and the ribosomal and transfer RNA needed for mitochondrial protein synthesis.  Each mitochondrion contains 1-10 copies of maternally derived mtDNA.  As a result, diseases arising from mutations in mtDNA are transmitted from the mother to all of her offspring.\n\nMitochondria can be identified on electron microscopy by their characteristic double membrane and wavy cristae.',
      explI:[
        {option:'A', explanation:'The rough endoplasmic reticulum has a stippled appearance secondary to the presence of numerous ribosomes bound to its membranes.  These ribosomes are involved in the synthesis of integral membrane proteins and proteins destined for export or packaging into granules or organelles.'},
        {option:'B', explanation:'The dark region identified within the nucleus is the nucleolus, the site of synthesis and assembly of eukaryotic ribosomal components.  There is no lipid membrane separating the nucleolus from the rest of the nucleus.'},
        {option:'C', explanation:'The lighter "electron-lucent" regions within the nucleus signify euchromatin (unpackaged DNA being actively transcribed).'},
        {option:'E', explanation:'This electron-dense membrane-bound spherical structure represents an exocrine granule containing enzymes and other proteins packaged for secretion.'},
      ],
      objective:'Mitochondrial DNA (mtDNA) is the most common non-nuclear DNA found in eukaryotic cells.  It resembles prokaryotic DNA and is maternally derived.  Mutations involving mtDNA (or nuclear DNA that codes for mitochondrial proteins) can cause a variety of mitochondrial disorders, including Leigh syndrome and MELAS.',
      peer:{A:5, B:30, C:13, D:46, E:4},
      ptTranslation:{
        vignette:'Pesquisadores que analisam a estrutura e a função do genoma eucariótico realizam um experimento para extrair DNA de células acinares pancreáticas exócrinas.  Durante o processo de purificação, eles isolam pequenas moléculas de DNA circular que se assemelham a um cromossomo bacteriano.  Análises adicionais mostram que essas moléculas codificam proteínas, RNA transportador e RNA ribossômico.',
        q:'A partir de qual das seguintes estruturas celulares essas moléculas de DNA provavelmente se originaram?',
        objective:'O DNA mitocondrial (mtDNA) é o DNA não nuclear mais comum encontrado em células eucarióticas.  Ele se assemelha ao DNA procariótico e é de herança materna.  Mutações envolvendo o mtDNA (ou o DNA nuclear que codifica proteínas mitocondriais) podem causar diversos distúrbios mitocondriais, incluindo a síndrome de Leigh e a MELAS.',
        options:[
          {label:'A', text:'A'},
          {label:'B', text:'B'},
          {label:'C', text:'C'},
          {label:'D', text:'D'},
          {label:'E', text:'E'},
        ],
        explC:'Os cromossomos nucleares contêm a maior parte do DNA encontrado nas células humanas.  Entretanto, as mitocôndrias também possuem seu próprio DNA, chamado DNA mitocondrial (mtDNA).  Esse DNA existe como um pequeno cromossomo circular, com um código genético ligeiramente diferente do DNA nuclear, o que é consistente com a teoria endossimbiótica de que as mitocôndrias se originaram de células procarióticas que foram posteriormente englobadas por eucariotos ancestrais.\n\nCom o tempo, a maioria dos genes que codificam proteínas mitocondriais migrou para o DNA nuclear.  Entretanto, o mtDNA ainda codifica cerca de 13 proteínas (algumas envolvidas em vias metabólicas oxidativas) e o RNA ribossômico e transportador necessários para a síntese proteica mitocondrial.  Cada mitocôndria contém de 1 a 10 cópias de mtDNA de herança materna.  Como resultado, doenças decorrentes de mutações no mtDNA são transmitidas da mãe para todos os seus filhos.\n\nAs mitocôndrias podem ser identificadas na microscopia eletrônica por sua característica membrana dupla e cristas onduladas.',
        explI:[
          {option:'A', explanation:'O retículo endoplasmático rugoso tem aparência pontilhada devido à presença de numerosos ribossomos ligados às suas membranas.  Esses ribossomos estão envolvidos na síntese de proteínas integrais de membrana e de proteínas destinadas à exportação ou ao empacotamento em grânulos ou organelas.'},
          {option:'B', explanation:'A região escura identificada dentro do núcleo é o nucléolo, o local de síntese e montagem dos componentes ribossômicos eucarióticos.  Não há membrana lipídica separando o nucléolo do restante do núcleo.'},
          {option:'C', explanation:'As regiões mais claras, "eletron-lúcidas", dentro do núcleo indicam eucromatina (DNA desempacotado sendo ativamente transcrito).'},
          {option:'E', explanation:'Essa estrutura esférica eletrondensa, delimitada por membrana, representa um grânulo exócrino contendo enzimas e outras proteínas empacotadas para secreção.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0064', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'hard',
      vignette:'Researchers lyse human cells and isolate a specific messenger RNA template using gel electrophoresis.  Reverse transcription polymerase chain reaction is then used to synthesize complementary DNA (cDNA) from the RNA template.  Next, the cDNA is modified into an expression vector containing an optimized bacterial promoter, ribosomal binding site, and terminator sequence.  After insertion of the vector into appropriate bacterial hosts, the transformed bacteria are cultured in a bioreactor and produce large quantities of a protein containing a domain that binds to a specific DNA sequence.',
      q:'This protein is most likely the receptor for which of the following hormones?',
      options:[
        {label:'A', text:'Glucagon'},
        {label:'B', text:'Growth hormone'},
        {label:'C', text:'Insulin'},
        {label:'D', text:'Insulin-like growth factor'},
        {label:'E', text:'Parathyroid hormone'},
        {label:'F', text:'Progesterone'},
      ],
      correct:'F',
      explC:'Prokaryotes and eukaryotes use divergent cellular machinery for protein synthesis and require different signaling sequences for efficient transcription and translation.  Expression cloning is a type of DNA cloning where the signals necessary for optimal protein expression are included in the DNA vector.  In this example, eukaryotic complementary DNA (containing the coding sequence for the protein of interest) is modified with prokaryotic promoter sequences (eg, the Pribnow box, −35 sequence) and a ribosomal binding site (Shine-Dalgarno sequence).  The vector is then incorporated into a suitable bacterial host (eg, Escherichia coli) and subsequently transcribed and translated into protein.\n\nThe protein produced in the bioreactor contains a DNA-binding domain.  DNA-binding proteins are a diverse group that include transcription factors (Myc, CREB), steroid receptors (cortisol, aldosterone, progesterone), thyroid hormone receptor, fat-soluble vitamin receptors (vitamin D, retinoic acid), and DNA transcription and replication proteins.\n\nOf the choices listed, only the progesterone receptor can bind to DNA.  The receptors for most steroid hormones, including progesterone, are located in the cytoplasm and translocate to the nucleus upon ligand binding.  In contrast, receptors for thyroid hormone and vitamins A and D are located within the nucleus at all times.  Following activation by ligand binding, both receptor types attach to DNA at hormone response elements located in the promoter region of target genes.',
      explI:[
        {option:'A and E', explanation:'Parathyroid hormone and glucagon act on Gs protein-coupled receptors found on the cell membrane.  Binding their respective ligands subsequently activates adenylyl cyclase and increases intracellular cyclic AMP concentration.'},
        {option:'B', explanation:'Growth hormone receptor is a membrane-bound receptor that works via activating the JAK-STAT pathway.'},
        {option:'C and D', explanation:'The receptors for insulin-like growth factor-1 (IGF-1) and insulin are structurally similar and located at the cell membrane.  The intracellular domains of these receptors have intrinsic tyrosine kinase activity, which is activated on ligand binding.  Autophosphorylation of the tyrosine residues on the intracellular part of the receptors then triggers downstream signaling.'},
      ],
      objective:'DNA-binding proteins include transcription factors (Myc, CREB), steroid receptors (cortisol, aldosterone, progesterone), thyroid hormone receptor, fat-soluble vitamin receptors (vitamin D, retinoic acid), and DNA transcription and replication proteins.',
      peer:{A:3, B:13, C:15, D:17, E:3, F:46},
      ptTranslation:{
        vignette:'Pesquisadores lisam células humanas e isolam um molde específico de RNA mensageiro por eletroforese em gel.  A transcrição reversa por reação em cadeia da polimerase é então usada para sintetizar DNA complementar (cDNA) a partir do molde de RNA.  Em seguida, o cDNA é modificado em um vetor de expressão contendo um promotor bacteriano otimizado, um sítio de ligação ribossômico e uma sequência terminadora.  Após a inserção do vetor em hospedeiros bacterianos apropriados, as bactérias transformadas são cultivadas em um biorreator e produzem grandes quantidades de uma proteína que contém um domínio que se liga a uma sequência específica de DNA.',
        q:'Essa proteína é mais provavelmente o receptor de qual dos seguintes hormônios?',
        objective:'As proteínas de ligação ao DNA incluem fatores de transcrição (Myc, CREB), receptores de esteroides (cortisol, aldosterona, progesterona), o receptor do hormônio tireoidiano, receptores de vitaminas lipossolúveis (vitamina D, ácido retinoico) e proteínas de transcrição e replicação do DNA.',
        options:[
          {label:'A', text:'Glucagon'},
          {label:'B', text:'Hormônio do crescimento'},
          {label:'C', text:'Insulina'},
          {label:'D', text:'Fator de crescimento semelhante à insulina'},
          {label:'E', text:'Paratormônio'},
          {label:'F', text:'Progesterona'},
        ],
        explC:'Procariotos e eucariotos utilizam maquinarias celulares divergentes para a síntese proteica e requerem sequências de sinalização diferentes para uma transcrição e tradução eficientes.  A clonagem de expressão é um tipo de clonagem de DNA em que os sinais necessários para a expressão proteica ideal são incluídos no vetor de DNA.  Neste exemplo, o DNA complementar eucariótico (contendo a sequência codificadora da proteína de interesse) é modificado com sequências promotoras procarióticas (por exemplo, a caixa de Pribnow, sequência −35) e um sítio de ligação ribossômico (sequência de Shine-Dalgarno).  O vetor é então incorporado a um hospedeiro bacteriano adequado (por exemplo, Escherichia coli) e, em seguida, transcrito e traduzido em proteína.\n\nA proteína produzida no biorreator contém um domínio de ligação ao DNA.  As proteínas de ligação ao DNA são um grupo diverso que inclui fatores de transcrição (Myc, CREB), receptores de esteroides (cortisol, aldosterona, progesterona), o receptor do hormônio tireoidiano, receptores de vitaminas lipossolúveis (vitamina D, ácido retinoico) e proteínas de transcrição e replicação do DNA.\n\nDentre as opções listadas, apenas o receptor de progesterona pode se ligar ao DNA.  Os receptores da maioria dos hormônios esteroides, incluindo a progesterona, estão localizados no citoplasma e se translocam para o núcleo após a ligação do ligante.  Em contraste, os receptores do hormônio tireoidiano e das vitaminas A e D estão localizados dentro do núcleo o tempo todo.  Após a ativação pela ligação do ligante, ambos os tipos de receptores se ligam ao DNA em elementos responsivos a hormônios localizados na região promotora dos genes-alvo.',
        explI:[
          {option:'A and E', explanation:'O paratormônio e o glucagon agem em receptores acoplados à proteína Gs encontrados na membrana celular.  A ligação de seus respectivos ligantes ativa subsequentemente a adenilil ciclase e aumenta a concentração intracelular de AMP cíclico.'},
          {option:'B', explanation:'O receptor do hormônio do crescimento é um receptor ligado à membrana que age ativando a via JAK-STAT.'},
          {option:'C and D', explanation:'Os receptores do fator de crescimento semelhante à insulina 1 (IGF-1) e da insulina são estruturalmente semelhantes e estão localizados na membrana celular.  Os domínios intracelulares desses receptores possuem atividade intrínseca de tirosina quinase, que é ativada pela ligação do ligante.  A autofosforilação dos resíduos de tirosina na porção intracelular dos receptores então desencadeia a sinalização a jusante.'},
        ]
      }
    },
    { id:'CMQ-STEP1-BCH-0065', system:'biochemistry', discipline:'biochemistry', category:'biochemistry::cell_molecular_biology', difficulty:'medium',
      vignette:'Biochemists working for a national endocrinology institute are investigating the specifics underlying glucose transport across adipose cell membranes.  One of their experiments shows that, in the presence of insulin, D-glucose transport across the plasma membrane of adipocytes is much faster than L-glucose transport.',
      q:'Which of the following transport processes best describes the mechanism for glucose entry into these cells?',
      options:[
        {label:'A', text:'Simple diffusion'},
        {label:'B', text:'Receptor-mediated endocytosis'},
        {label:'C', text:'Carrier-mediated transport'},
        {label:'D', text:'Primary active transport'},
        {label:'E', text:'Co-transport'},
      ],
      correct:'C',
      explC:'Glucose is the major source of energy for all cells of the body.  In the majority of tissues, glucose transport across the cell membrane occurs along its concentration gradient, from higher concentrations outside the cell toward lower concentrations inside the cell.  However, glucose cannot passively diffuse across the cell membrane in any significant amount and requires carrier proteins to aid its crossing.  Transport across the cell membrane by carrier proteins (which undergo conformational changes as the substrate is transported, unlike channel proteins) is termed carrier-mediated transport.  Transport that is facilitated by transmembrane proteins without the expenditure of energy is called facilitated diffusion.\n\nTransmembrane carrier proteins that belong to the GLUT family transport glucose by facilitated diffusion.  These proteins are stereoselective and preferentially catalyze the entry of D-glucose rather than L-glucose into cells.  GLUT4 is the insulin-sensitive transporter found in skeletal muscle cells and adipocytes.  In these cells, the GLUT4 protein is stored in cytoplasmic vesicles.  Under the influence of insulin, the transporter protein is incorporated into the cell membrane.  An increased number of transporters in the membrane leads to an increased rate of glucose uptake by the cells.  Another important glucose transporter is GLUT2.  It facilitates export of glucose from the liver, small intestine, and kidneys into the circulation and also helps to control insulin secretion in the pancreas.',
      explI:[
        {option:'A', explanation:'Simple diffusion refers to the movement of particles along their concentration gradient directly through the cell membrane.  Transport of gases (O2 and CO2) occurs via simple diffusion, as the membrane is very permeable to small, nonpolar molecules.'},
        {option:'B', explanation:'Endocytosis allows cellular uptake through the formation of membrane-bound, typically clathrin-coated, vesicles.  Uptake of cholesterol by cells occurs by means of receptor-mediated endocytosis (mediated by the LDL receptor).'},
        {option:'D and E', explanation:'Active transport refers to the movement of a substance against its concentration gradient.  This process requires energy as well as transport proteins.  In primary active transport, the energy required for transport against the concentration gradient is provided by the hydrolysis of ATP.  In secondary active transport, this energy is generated by co-transport of a separate substance down its concentration gradient.  Transport of glucose against the concentration gradient occurs via the Na/glucose symporter, which is found in the intestinal and renal tubular epithelium and is used to transfer glucose intracellularly from the lumen.'},
      ],
      objective:'Transport of glucose into the cells of most tissues occurs by means of facilitated diffusion.  Glucose moves from areas of high concentration to areas of low concentration with the help of transmembrane glucose transporter proteins (GLUT).  These carrier proteins are stereoselective and have preference for D-glucose.',
      peer:{A:4, B:17, C:59, D:7, E:11},
      ptTranslation:{
        vignette:'Bioquímicos que trabalham para um instituto nacional de endocrinologia estão investigando os detalhes do transporte de glicose através das membranas das células adiposas.  Um de seus experimentos mostra que, na presença de insulina, o transporte de D-glicose através da membrana plasmática dos adipócitos é muito mais rápido do que o transporte de L-glicose.',
        q:'Qual dos seguintes processos de transporte melhor descreve o mecanismo de entrada de glicose nessas células?',
        objective:'O transporte de glicose para dentro das células da maioria dos tecidos ocorre por meio de difusão facilitada.  A glicose se move de áreas de alta concentração para áreas de baixa concentração com a ajuda de proteínas transportadoras de glicose transmembrana (GLUT).  Essas proteínas carreadoras são estereosseletivas e têm preferência pela D-glicose.',
        options:[
          {label:'A', text:'Difusão simples'},
          {label:'B', text:'Endocitose mediada por receptor'},
          {label:'C', text:'Transporte mediado por carreador'},
          {label:'D', text:'Transporte ativo primário'},
          {label:'E', text:'Cotransporte'},
        ],
        explC:'A glicose é a principal fonte de energia para todas as células do corpo.  Na maioria dos tecidos, o transporte de glicose através da membrana celular ocorre a favor do seu gradiente de concentração, de concentrações mais altas fora da célula para concentrações mais baixas dentro dela.  Entretanto, a glicose não consegue se difundir passivamente através da membrana celular em quantidade significativa e requer proteínas carreadoras para auxiliar sua travessia.  O transporte através da membrana celular por proteínas carreadoras (que sofrem mudanças conformacionais à medida que o substrato é transportado, diferentemente das proteínas de canal) é chamado de transporte mediado por carreador.  O transporte facilitado por proteínas transmembrana sem gasto de energia é chamado de difusão facilitada.\n\nAs proteínas carreadoras transmembrana que pertencem à família GLUT transportam glicose por difusão facilitada.  Essas proteínas são estereosseletivas e catalisam preferencialmente a entrada de D-glicose, e não de L-glicose, nas células.  A GLUT4 é o transportador sensível à insulina encontrado nas células do músculo esquelético e nos adipócitos.  Nessas células, a proteína GLUT4 é armazenada em vesículas citoplasmáticas.  Sob a influência da insulina, a proteína transportadora é incorporada à membrana celular.  Um número aumentado de transportadores na membrana leva a uma maior taxa de captação de glicose pelas células.  Outro transportador de glicose importante é o GLUT2.  Ele facilita a exportação de glicose do fígado, do intestino delgado e dos rins para a circulação, e também ajuda a controlar a secreção de insulina no pâncreas.',
        explI:[
          {option:'A', explanation:'A difusão simples se refere ao movimento de partículas a favor do seu gradiente de concentração diretamente através da membrana celular.  O transporte de gases (O2 e CO2) ocorre por difusão simples, já que a membrana é muito permeável a moléculas pequenas e apolares.'},
          {option:'B', explanation:'A endocitose permite a captação celular por meio da formação de vesículas ligadas à membrana, tipicamente revestidas por clatrina.  A captação de colesterol pelas células ocorre por meio de endocitose mediada por receptor (mediada pelo receptor de LDL).'},
          {option:'D and E', explanation:'O transporte ativo se refere ao movimento de uma substância contra seu gradiente de concentração.  Esse processo requer energia, além de proteínas transportadoras.  No transporte ativo primário, a energia necessária para o transporte contra o gradiente de concentração é fornecida pela hidrólise do ATP.  No transporte ativo secundário, essa energia é gerada pelo cotransporte de uma substância separada a favor do seu gradiente de concentração.  O transporte de glicose contra o gradiente de concentração ocorre por meio do simportador Na/glicose, encontrado no epitélio tubular renal e intestinal, e é usado para transferir glicose para o interior da célula a partir do lúmen.'},
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
      ['amino_acids_proteins_enzymes','Amino acids, proteins, and enzymes'],['bioenergetics_carb_metabolism','Bioenergetics and carbohydrate metabolism'],['cell_molecular_biology','Cell and molecular biology'],['lipid_metabolism','Lipid metabolism'],['second_messengers','Second messengers'],['urea_cycle','Urea cycle'],['vitamins_cofactors','Vitamins and cofactors'],['homocysteine','Homocysteine'],['protein_structure','Protein structure'],['organic_acidemias','Organic acidemias'],['lysosomal_storage_diseases','Lysosomal storage diseases'],['misc','Others']]},
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
    'Amino acids, proteins, and enzymes':'Aminoácidos, proteínas e enzimas','Bioenergetics and carbohydrate metabolism':'Bioenergética e metabolismo de carboidratos','Cell and molecular biology':'Biologia celular e molecular','Lipid metabolism':'Metabolismo lipídico','Second messengers':'Segundos mensageiros','Urea cycle':'Ciclo da ureia','Vitamins and cofactors':'Vitaminas e cofatores','Homocysteine':'Homocisteína','Protein structure':'Estrutura proteica','Organic acidemias':'Acidemias orgânicas','Lysosomal storage diseases':'Doenças de depósito lisossômico','Miscellaneous':'Outros','Others':'Outros','Clinical genetics':'Genética clínica','DNA structure, replication, and repair':'Estrutura, replicação e reparo do DNA','Gene expression and regulation':'Expressão e regulação gênica','Protein synthesis':'Síntese proteica','RNA structure, synthesis, and processing':'Estrutura, síntese e processamento do RNA','Bacteriology':'Bacteriologia','Mycology':'Micologia','Parasitology':'Parasitologia','Virology':'Virologia','Cellular pathology':'Patologia celular','Inflammation and repair':'Inflamação e reparo','Neoplasia':'Neoplasia','Drug metabolism and toxicity':'Metabolismo e toxicidade de fármacos','Drug receptors and pharmacodynamics':'Receptores e farmacodinâmica','Pharmacokinetics':'Farmacocinética','Epidemiology and population health':'Epidemiologia e saúde populacional','Measures and distribution of data':'Medidas e distribuição de dados','Probability and principles of testing':'Probabilidade e princípios de testes','Study design and interpretation':'Desenho e interpretação de estudos','Environmental exposure':'Exposição ambiental','Toxicology':'Toxicologia','Anaphylaxis and allergic reactions':'Anafilaxia e reações alérgicas','Autoimmune diseases':'Doenças autoimunes','Immune deficiencies':'Imunodeficiências','Transplant medicine':'Medicina de transplantes','Principles of immunology':'Princípios de imunologia','Normal structure and function of the cardiovascular system':'Estrutura e função normais do sistema cardiovascular','Aortic and peripheral artery diseases':'Doenças da aorta e artérias periféricas','Cardiac arrhythmias':'Arritmias cardíacas','Congenital heart disease':'Cardiopatia congênita','Coronary heart disease':'Doença coronariana','Heart failure and shock':'Insuficiência cardíaca e choque','Hypertension':'Hipertensão','Myopericardial diseases':'Doenças miopericárdicas','Valvular heart diseases':'Valvopatias','Cardiovascular drugs':'Fármacos cardiovasculares','Normal structure and function of skin':'Estrutura e função normais da pele','Disorders of epidermal appendages':'Distúrbios dos anexos epidérmicos','Inflammatory dermatoses and bullous diseases':'Dermatoses inflamatórias e doenças bolhosas','Skin and soft tissue infections':'Infecções de pele e partes moles','Skin tumors and tumor-like lesions':'Tumores cutâneos e lesões tumorais','Disorders of the ear, nose, and throat':'Distúrbios do ouvido, nariz e garganta','Normal structure and function of endocrine glands':'Estrutura e função normais das glândulas endócrinas','Congenital and developmental anomalies':'Anomalias congênitas e do desenvolvimento','Adrenal disorders':'Distúrbios adrenais','Diabetes mellitus':'Diabetes mellitus','Endocrine tumors':'Tumores endócrinos','Hypothalamus and pituitary disorders':'Distúrbios do hipotálamo e hipófise','Obesity and dyslipidemia':'Obesidade e dislipidemia','Reproductive endocrinology':'Endocrinologia reprodutiva','Thyroid disorders':'Distúrbios da tireoide','Normal structure and function of the female reproductive system and breast':'Estrutura e função normais do sistema reprodutor feminino e mama','Breast disorders':'Distúrbios mamários','Genital tract tumors and tumor-like lesions':'Tumores do trato genital e lesões tumorais','Genitourinary tract infections':'Infecções do trato geniturinário','Menstrual disorders and contraception':'Distúrbios menstruais e contracepção','Normal structure and function of the GI tract':'Estrutura e função normais do trato GI','Biliary tract disorders':'Distúrbios das vias biliares','Disorders of nutrition':'Distúrbios nutricionais','Gastroesophageal disorders':'Distúrbios gastroesofágicos','Hepatic disorders':'Distúrbios hepáticos','Intestinal and colorectal disorders':'Distúrbios intestinais e colorretais','Pancreatic disorders':'Distúrbios pancreáticos','Tumors of the GI tract':'Tumores do trato GI','Normal hematologic structure and function':'Estrutura e função hematológicas normais','Hemostasis and thrombosis':'Hemostasia e trombose','Plasma cell disorders':'Distúrbios de plasmócitos','Platelet disorders':'Distúrbios plaquetários','Red blood cell disorders':'Distúrbios das hemácias','Transfusion medicine':'Medicina transfusional','White blood cell disorders':'Distúrbios dos leucócitos','Principles of oncology':'Princípios de oncologia','Antimicrobial drugs':'Fármacos antimicrobianos','Bacterial infections':'Infecções bacterianas','Fungal infections':'Infecções fúngicas','HIV and sexually transmitted infections':'HIV e infecções sexualmente transmissíveis','Infection control':'Controle de infecção','Parasitic and helminthic infections':'Infecções parasitárias e helmínticas','Viral infections':'Infecções virais','Normal structure and function of the male reproductive system':'Estrutura e função normais do sistema reprodutor masculino','Disorders of the male reproductive system':'Distúrbios do sistema reprodutor masculino','Normal structure and function of the nervous system':'Estrutura e função normais do sistema nervoso','Cerebrovascular disease':'Doença cerebrovascular','CNS infections':'Infecções do SNC','Demyelinating diseases':'Doenças desmielinizantes','Disorders of peripheral nerves and muscles':'Distúrbios dos nervos periféricos e músculos','Headache':'Cefaleia','Neurodegenerative disorders and dementias':'Distúrbios neurodegenerativos e demências','Seizures and epilepsy':'Convulsões e epilepsia','Spinal cord disorders':'Distúrbios da medula espinhal','Traumatic brain injuries':'Traumatismos cranioencefálicos','Tumors of the nervous system':'Tumores do sistema nervoso','Hydrocephalus':'Hidrocefalia','Anesthesia':'Anestesia','Sleep disorders':'Distúrbios do sono','Normal structure and function of the eye and associated structures':'Estrutura e função normais do olho e estruturas associadas','Disorders of the eye and associated structures':'Distúrbios do olho e estruturas associadas','Normal pregnancy, childbirth, and puerperium':'Gravidez, parto e puerpério normais','Disorders of pregnancy, childbirth, and puerperium':'Distúrbios da gravidez, parto e puerpério','Normal behavior and development':'Comportamento e desenvolvimento normais','Anxiety and trauma-related disorders':'Transtornos de ansiedade e relacionados a trauma','Mood disorders':'Transtornos do humor','Neurodevelopmental disorders':'Transtornos do neurodesenvolvimento','Personality disorders':'Transtornos de personalidade','Psychotic disorders':'Transtornos psicóticos','Substance use disorders':'Transtornos por uso de substâncias','Eating disorders':'Transtornos alimentares','Somatoform disorders':'Transtornos somatoformes','Normal pulmonary structure and function':'Estrutura e função pulmonares normais','Critical care medicine':'Medicina intensiva','Interstitial lung disease':'Doença pulmonar intersticial','Lung cancer':'Câncer de pulmão','Obstructive lung disease':'Doença pulmonar obstrutiva','Pulmonary infections':'Infecções pulmonares','Pulmonary vascular disease':'Doença vascular pulmonar','Normal structure and function of the kidneys and urinary system':'Estrutura e função normais dos rins e sistema urinário','Acute kidney injury':'Injúria renal aguda','Bone metabolism':'Metabolismo ósseo','Chronic kidney disease':'Doença renal crônica','Cystic kidney diseases':'Doenças renais císticas','Fluid, electrolytes, and acid-base':'Fluidos, eletrólitos e ácido-base','Glomerular diseases':'Doenças glomerulares','Neoplasms of the kidneys and urinary tract':'Neoplasias dos rins e trato urinário','Nephrolithiasis and urinary tract obstruction':'Nefrolitíase e obstrução do trato urinário','Diabetes insipidus':'Diabetes insípido','Urinary incontinence':'Incontinência urinária','Normal structure and function of the musculoskeletal system':'Estrutura e função normais do sistema musculoesquelético','Arthritis and spondyloarthropathies':'Artrite e espondiloartropatias','Autoimmune disorders and vasculitides':'Distúrbios autoimunes e vasculites','Bone/joint injuries and infections':'Lesões e infecções ósseas/articulares','Bone tumors and tumor-like lesions':'Tumores ósseos e lesões tumorais','Spinal disorders and back pain':'Distúrbios da coluna e dor lombar','Metabolic bone disorders':'Distúrbios ósseos metabólicos','Communication and interpersonal skills':'Comunicação e habilidades interpessoais','Healthcare policy and economics':'Política e economia da saúde','Medical ethics and jurisprudence':'Ética médica e jurisprudência','Patient safety':'Segurança do paciente','System based-practice and quality improvement':'Prática baseada no sistema e melhoria da qualidade',
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
