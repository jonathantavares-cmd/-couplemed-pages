/* CoupleMed — QBank UWorld v1
   ============================================================================
   Módulo de banco de questões estilo UWorld para USMLE Step 1.
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
  const QB_PAGES = ['qbank-uworld','uworld-pass-1','uworld-pass-2','uworld-pass-3','uworld-pass-4'];
  if(!QB_PAGES.includes(PAGE)) return;
  const USER = params.get('u') || 'guest1';
  const KEY = `couplemed_qb_${USER}`;
  const FC_KEY = `couplemed_fc_${USER}`;

  /* ======================= SEED (questões originais) =======================
     Substituível pelo pipeline de importação (Parte 16) ou pela API D1.
     Cada questão: vinheta estilo NBME, 5 alternativas, explicações e peer stats. */
  const SEED = [
    { id:'q_cv_as', system:'cardiovascular', discipline:'pathophysiology', category:'cardiovascular::valvular_heart_diseases', difficulty:'medium',
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

    { id:'q_renal_hyperk', system:'renal_urinary', discipline:'physiology', category:'renal_urinary::fluid_electrolytes_acidbase', difficulty:'hard',
      vignette:'A 59-year-old man with end-stage renal disease missed his last two dialysis sessions. He presents with weakness and palpitations. Serum potassium is 7.2 mEq/L. The ECG shows peaked T waves, a widened QRS, and loss of P waves.',
      q:'Which is the most appropriate immediate next step in management?',
      options:[{label:'A',text:'Intravenous calcium gluconate'},{label:'B',text:'Intravenous regular insulin with dextrose'},{label:'C',text:'Nebulized albuterol'},{label:'D',text:'Oral sodium polystyrene sulfonate'},{label:'E',text:'Urgent hemodialysis'}],
      correct:'A',
      explC:'With ECG changes of hyperkalemia, the FIRST step is IV calcium to stabilize the cardiac membrane. Calcium raises the threshold potential and antagonizes the depolarizing effect of potassium within minutes; it does not lower serum K+ but prevents lethal arrhythmia while other measures take effect.',
      explI:[{option:'B',explanation:'Insulin+dextrose shifts K+ intracellularly and is essential, but it is given AFTER membrane stabilization because it takes longer to act and does not immediately protect the myocardium.'},{option:'C',explanation:'Albuterol also shifts K+ intracellularly but is adjunctive and slower than membrane stabilization.'},{option:'D',explanation:'Cation-exchange resins remove K+ from the body over hours and do nothing for the acute arrhythmia risk.'},{option:'E',explanation:'Dialysis is the definitive treatment for total-body potassium in ESRD, but it takes time to arrange; calcium must be given first when ECG changes are present.'}],
      objective:'When hyperkalemia produces ECG changes, give IV calcium first to stabilize the myocardium before shifting or removing potassium.',
      peer:{A:52,B:31,C:2,D:4,E:11} },

    { id:'q_id_gc', system:'infectious_diseases', discipline:'microbiology', category:'infectious_diseases::hiv_sti', difficulty:'medium',
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

    { id:'q_neuro_levodopa', system:'nervous_system', discipline:'pharmacology', category:'nervous_system::neurodegenerative_dementias', difficulty:'hard',
      vignette:'A 68-year-old man has a resting pill-rolling tremor, cogwheel rigidity, bradykinesia, and a shuffling gait. He is started on a medication that is combined with carbidopa.',
      q:'What is the purpose of adding carbidopa to this therapy?',
      options:[{label:'A',text:'It inhibits peripheral DOPA decarboxylase, reducing peripheral side effects and increasing central levodopa delivery'},{label:'B',text:'It directly stimulates central dopamine receptors'},{label:'C',text:'It inhibits catechol-O-methyltransferase in the brain'},{label:'D',text:'It blocks central muscarinic receptors to reduce tremor'},{label:'E',text:'It crosses the blood-brain barrier to be converted to dopamine'}],
      correct:'A',
      explC:'Carbidopa inhibits peripheral aromatic L-amino acid (DOPA) decarboxylase but does not cross the blood-brain barrier. This decreases peripheral conversion of levodopa to dopamine, reducing nausea and hypotension while allowing more levodopa to reach the CNS.',
      explI:[{option:'B',explanation:'Direct dopamine-receptor agonism describes drugs like pramipexole/ropinirole, not carbidopa.'},{option:'C',explanation:'COMT inhibition is the mechanism of entacapone/tolcapone; carbidopa inhibits decarboxylase, not COMT.'},{option:'D',explanation:'Central antimuscarinic action describes benztropine/trihexyphenidyl used for tremor, not carbidopa.'},{option:'E',explanation:'Levodopa (not carbidopa) crosses the BBB and is converted to dopamine centrally; carbidopa acts only peripherally.'}],
      objective:'Explain that carbidopa blocks peripheral DOPA decarboxylase to reduce peripheral side effects and boost central levodopa availability.',
      peer:{A:61,B:8,C:18,D:6,E:7} },

    { id:'q_heme_ida', system:'heme_onc', discipline:'pathology', category:'heme_onc::rbc_disorders', difficulty:'medium',
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

    { id:'q_psych_mdd', system:'psychiatric_behavioral', discipline:'behavioral_science', category:'psychiatric_behavioral::mood_disorders', difficulty:'medium',
      vignette:'A 29-year-old woman reports six weeks of depressed mood and loss of interest in activities she used to enjoy. She also describes insomnia, poor concentration, low energy, feelings of worthlessness, and a 4-kg unintentional weight loss. She denies manic episodes, substance use, and has a normal physical exam and TSH.',
      q:'Which is the most likely diagnosis?',
      options:[{label:'A',text:'Major depressive disorder'},{label:'B',text:'Persistent depressive disorder (dysthymia)'},{label:'C',text:'Adjustment disorder with depressed mood'},{label:'D',text:'Bipolar II disorder'},{label:'E',text:'Normal grief'}],
      correct:'A',
      explC:'At least five SIG E CAPS symptoms (including depressed mood or anhedonia) present most of the day for ≥2 weeks meets criteria for major depressive disorder. This patient has depressed mood, anhedonia, insomnia, poor concentration, low energy, worthlessness, and weight change over six weeks.',
      explI:[{option:'B',explanation:'Persistent depressive disorder requires depressed mood for ≥2 YEARS with fewer acute symptoms; six weeks is too short.'},{option:'C',explanation:'Adjustment disorder requires an identifiable stressor and does not meet full MDD criteria; none is described here.'},{option:'D',explanation:'Bipolar II requires at least one hypomanic episode, which she explicitly denies.'},{option:'E',explanation:'Grief is tied to a specific loss and centers on the deceased; there is no bereavement described.'}],
      objective:'Apply DSM-5 criteria (≥5 SIG E CAPS symptoms for ≥2 weeks) to diagnose major depressive disorder.',
      peer:{A:70,B:12,C:10,D:5,E:3} },
  ];

  const ROOT_CAUSES = [
    {id:'knowledge_gap',              en:'Knowledge gap',                 pt:'Falta de conteúdo'},
    {id:'similar_diagnosis_confusion',en:'Confused similar diagnoses',    pt:'Confundi diagnósticos parecidos'},
    {id:'mechanism_misunderstanding', en:'Misunderstood the mechanism',   pt:'Entendi mal o mecanismo'},
    {id:'reading_error',              en:'Misread the vignette',          pt:'Erro de leitura da vinheta'},
    {id:'time_pressure',              en:'Time pressure',                 pt:'Pressão do tempo'},
  ];

  /* ===================== TAXONOMIA OFICIAL UWORLD (Systems → Subjects) =====================
     Extraída das telas reais do UWorld USMLE Step 1. Cada subtópico tem id namespaced
     por sistema (systemId::slug) para garantir unicidade. É a fonte única do accordion. */
  const TAXONOMY = [
    {id:'biochemistry', name:'Biochemistry (General Principles)', subs:[
      ['amino_acids_proteins_enzymes','Amino acids, proteins, and enzymes'],['bioenergetics_carb_metabolism','Bioenergetics and carbohydrate metabolism'],['cell_molecular_biology','Cell and molecular biology'],['lipid_metabolism','Lipid metabolism'],['misc','Miscellaneous']]},
    {id:'genetics', name:'Genetics (General Principles)', subs:[
      ['clinical_genetics','Clinical genetics'],['dna_structure_replication_repair','DNA structure, replication, and repair'],['gene_expression_regulation','Gene expression and regulation'],['protein_synthesis','Protein synthesis'],['rna_structure_synthesis_processing','RNA structure, synthesis, and processing'],['misc','Miscellaneous']]},
    {id:'microbiology', name:'Microbiology (General Principles)', subs:[
      ['bacteriology','Bacteriology'],['mycology','Mycology'],['parasitology','Parasitology'],['virology','Virology'],['misc','Miscellaneous']]},
    {id:'pathology', name:'Pathology (General Principles)', subs:[
      ['cellular_pathology','Cellular pathology'],['inflammation_repair','Inflammation and repair'],['neoplasia','Neoplasia']]},
    {id:'pharmacology', name:'Pharmacology (General Principles)', subs:[
      ['drug_metabolism_toxicity','Drug metabolism and toxicity'],['drug_receptors_pharmacodynamics','Drug receptors and pharmacodynamics'],['pharmacokinetics','Pharmacokinetics'],['misc','Miscellaneous']]},
    {id:'biostatistics_epidemiology', name:'Biostatistics & Epidemiology', subs:[
      ['epidemiology_population_health','Epidemiology and population health'],['measures_distribution_data','Measures and distribution of data'],['probability_principles_testing','Probability and principles of testing'],['study_design_interpretation','Study design and interpretation'],['misc','Miscellaneous']]},
    {id:'poisoning_environmental', name:'Poisoning & Environmental Exposure', subs:[
      ['environmental_exposure','Environmental exposure'],['toxicology','Toxicology']]},
    {id:'allergy_immunology', name:'Allergy & Immunology', subs:[
      ['anaphylaxis_allergic_reactions','Anaphylaxis and allergic reactions'],['autoimmune_diseases','Autoimmune diseases'],['immune_deficiencies','Immune deficiencies'],['transplant_medicine','Transplant medicine'],['principles_immunology','Principles of immunology'],['misc','Miscellaneous']]},
    {id:'cardiovascular', name:'Cardiovascular System', subs:[
      ['normal_cv','Normal structure and function of the cardiovascular system'],['aortic_peripheral_artery','Aortic and peripheral artery diseases'],['cardiac_arrhythmias','Cardiac arrhythmias'],['congenital_heart_disease','Congenital heart disease'],['coronary_heart_disease','Coronary heart disease'],['heart_failure_shock','Heart failure and shock'],['hypertension','Hypertension'],['myopericardial_diseases','Myopericardial diseases'],['valvular_heart_diseases','Valvular heart diseases'],['cardiovascular_drugs','Cardiovascular drugs'],['misc','Miscellaneous']]},
    {id:'dermatology', name:'Dermatology', subs:[
      ['normal_skin','Normal structure and function of skin'],['disorders_epidermal_appendages','Disorders of epidermal appendages'],['inflammatory_dermatoses_bullous','Inflammatory dermatoses and bullous diseases'],['skin_soft_tissue_infections','Skin and soft tissue infections'],['skin_tumors','Skin tumors and tumor-like lesions'],['misc','Miscellaneous']]},
    {id:'ent', name:'Ear, Nose & Throat (ENT)', subs:[
      ['disorders_ent','Disorders of the ear, nose, and throat']]},
    {id:'endocrine', name:'Endocrine, Diabetes & Metabolism', subs:[
      ['normal_endocrine','Normal structure and function of endocrine glands'],['congenital_dev_anomalies','Congenital and developmental anomalies'],['adrenal_disorders','Adrenal disorders'],['diabetes_mellitus','Diabetes mellitus'],['endocrine_tumors','Endocrine tumors'],['hypothalamus_pituitary','Hypothalamus and pituitary disorders'],['obesity_dyslipidemia','Obesity and dyslipidemia'],['reproductive_endocrinology','Reproductive endocrinology'],['thyroid_disorders','Thyroid disorders'],['misc','Miscellaneous']]},
    {id:'female_repro_breast', name:'Female Reproductive System & Breast', subs:[
      ['normal_female_repro','Normal structure and function of the female reproductive system and breast'],['congenital_dev_anomalies','Congenital and developmental anomalies'],['breast_disorders','Breast disorders'],['genital_tract_tumors','Genital tract tumors and tumor-like lesions'],['genitourinary_infections','Genitourinary tract infections'],['menstrual_disorders_contraception','Menstrual disorders and contraception'],['misc','Miscellaneous']]},
    {id:'gi_nutrition', name:'Gastrointestinal & Nutrition', subs:[
      ['normal_gi','Normal structure and function of the GI tract'],['congenital_dev_anomalies','Congenital and developmental anomalies'],['biliary_tract','Biliary tract disorders'],['disorders_nutrition','Disorders of nutrition'],['gastroesophageal','Gastroesophageal disorders'],['hepatic','Hepatic disorders'],['intestinal_colorectal','Intestinal and colorectal disorders'],['pancreatic','Pancreatic disorders'],['tumors_gi','Tumors of the GI tract'],['misc','Miscellaneous']]},
    {id:'heme_onc', name:'Hematology & Oncology', subs:[
      ['normal_heme','Normal hematologic structure and function'],['hemostasis_thrombosis','Hemostasis and thrombosis'],['plasma_cell','Plasma cell disorders'],['platelet_disorders','Platelet disorders'],['rbc_disorders','Red blood cell disorders'],['transfusion_medicine','Transfusion medicine'],['wbc_disorders','White blood cell disorders'],['principles_oncology','Principles of oncology'],['misc','Miscellaneous']]},
    {id:'infectious_diseases', name:'Infectious Diseases', subs:[
      ['antimicrobial_drugs','Antimicrobial drugs'],['bacterial_infections','Bacterial infections'],['fungal_infections','Fungal infections'],['hiv_sti','HIV and sexually transmitted infections'],['infection_control','Infection control'],['parasitic_helminthic','Parasitic and helminthic infections'],['viral_infections','Viral infections'],['misc','Miscellaneous']]},
    {id:'male_repro', name:'Male Reproductive System', subs:[
      ['normal_male_repro','Normal structure and function of the male reproductive system'],['disorders_male_repro','Disorders of the male reproductive system']]},
    {id:'nervous_system', name:'Nervous System', subs:[
      ['normal_nervous','Normal structure and function of the nervous system'],['congenital_dev_anomalies','Congenital and developmental anomalies'],['cerebrovascular_disease','Cerebrovascular disease'],['cns_infections','CNS infections'],['demyelinating_diseases','Demyelinating diseases'],['peripheral_nerves_muscles','Disorders of peripheral nerves and muscles'],['headache','Headache'],['neurodegenerative_dementias','Neurodegenerative disorders and dementias'],['seizures_epilepsy','Seizures and epilepsy'],['spinal_cord_disorders','Spinal cord disorders'],['traumatic_brain_injuries','Traumatic brain injuries'],['tumors_nervous','Tumors of the nervous system'],['hydrocephalus','Hydrocephalus'],['anesthesia','Anesthesia'],['sleep_disorders','Sleep disorders'],['misc','Miscellaneous']]},
    {id:'ophthalmology', name:'Ophthalmology', subs:[
      ['normal_eye','Normal structure and function of the eye and associated structures'],['disorders_eye','Disorders of the eye and associated structures']]},
    {id:'pregnancy_childbirth', name:'Pregnancy, Childbirth & Puerperium', subs:[
      ['normal_pregnancy','Normal pregnancy, childbirth, and puerperium'],['disorders_pregnancy','Disorders of pregnancy, childbirth, and puerperium']]},
    {id:'psychiatric_behavioral', name:'Psychiatric/Behavioral & Substance Use Disorder', subs:[
      ['normal_behavior_development','Normal behavior and development'],['anxiety_trauma','Anxiety and trauma-related disorders'],['mood_disorders','Mood disorders'],['neurodevelopmental_disorders','Neurodevelopmental disorders'],['personality_disorders','Personality disorders'],['psychotic_disorders','Psychotic disorders'],['substance_use_disorders','Substance use disorders'],['eating_disorders','Eating disorders'],['somatoform_disorders','Somatoform disorders'],['misc','Miscellaneous']]},
    {id:'pulmonary_critical_care', name:'Pulmonary & Critical Care', subs:[
      ['normal_pulmonary','Normal pulmonary structure and function'],['congenital_dev_anomalies','Congenital and developmental anomalies'],['critical_care','Critical care medicine'],['interstitial_lung','Interstitial lung disease'],['lung_cancer','Lung cancer'],['obstructive_lung','Obstructive lung disease'],['pulmonary_infections','Pulmonary infections'],['pulmonary_vascular','Pulmonary vascular disease'],['sleep_disorders','Sleep disorders'],['misc','Miscellaneous']]},
    {id:'renal_urinary', name:'Renal, Urinary Systems & Electrolytes', subs:[
      ['normal_renal','Normal structure and function of the kidneys and urinary system'],['congenital_dev_anomalies','Congenital and developmental anomalies'],['acute_kidney_injury','Acute kidney injury'],['bone_metabolism','Bone metabolism'],['chronic_kidney_disease','Chronic kidney disease'],['cystic_kidney','Cystic kidney diseases'],['fluid_electrolytes_acidbase','Fluid, electrolytes, and acid-base'],['glomerular_diseases','Glomerular diseases'],['neoplasms_kidney_urinary','Neoplasms of the kidneys and urinary tract'],['nephrolithiasis_obstruction','Nephrolithiasis and urinary tract obstruction'],['diabetes_insipidus','Diabetes insipidus'],['urinary_incontinence','Urinary incontinence'],['misc','Miscellaneous']]},
    {id:'rheum_ortho', name:'Rheumatology/Orthopedics & Sports', subs:[
      ['normal_msk','Normal structure and function of the musculoskeletal system'],['congenital_dev_anomalies','Congenital and developmental anomalies'],['arthritis_spondylo','Arthritis and spondyloarthropathies'],['autoimmune_vasculitides','Autoimmune disorders and vasculitides'],['bone_joint_injuries_infections','Bone/joint injuries and infections'],['bone_tumors','Bone tumors and tumor-like lesions'],['spinal_disorders_back_pain','Spinal disorders and back pain'],['metabolic_bone','Metabolic bone disorders'],['misc','Miscellaneous']]},
    {id:'social_sciences', name:'Social Sciences (Ethics/Legal/Professional)', subs:[
      ['communication_interpersonal','Communication and interpersonal skills'],['healthcare_policy_economics','Healthcare policy and economics'],['medical_ethics_jurisprudence','Medical ethics and jurisprudence'],['patient_safety','Patient safety'],['system_based_practice_qi','System based-practice and quality improvement'],['misc','Miscellaneous']]},
    {id:'multisystem', name:'Miscellaneous (Multisystem)', subs:[
      ['misc','Miscellaneous']]},
  ];
  const subjId = (sysId,slug)=>`${sysId}::${slug}`;
  const SYS_NAMES={}, SUBJ_NAMES={};
  TAXONOMY.forEach(s=>{ SYS_NAMES[s.id]=s.name; s.subs.forEach(([slug,name])=>{ SUBJ_NAMES[subjId(s.id,slug)]=name; }); });
  // Tradução PT da taxonomia (chaveada pelo rótulo em inglês; subtópicos repetidos deduplicam)
  const TAX_PT = {
    'Biochemistry (General Principles)':'Bioquímica (Princípios Gerais)','Genetics (General Principles)':'Genética (Princípios Gerais)','Microbiology (General Principles)':'Microbiologia (Princípios Gerais)','Pathology (General Principles)':'Patologia (Princípios Gerais)','Pharmacology (General Principles)':'Farmacologia (Princípios Gerais)','Biostatistics & Epidemiology':'Bioestatística & Epidemiologia','Poisoning & Environmental Exposure':'Intoxicação & Exposição Ambiental','Allergy & Immunology':'Alergia & Imunologia','Cardiovascular System':'Sistema Cardiovascular','Dermatology':'Dermatologia','Ear, Nose & Throat (ENT)':'Otorrinolaringologia (ENT)','Endocrine, Diabetes & Metabolism':'Endócrino, Diabetes & Metabolismo','Female Reproductive System & Breast':'Sistema Reprodutor Feminino & Mama','Gastrointestinal & Nutrition':'Gastrointestinal & Nutrição','Hematology & Oncology':'Hematologia & Oncologia','Infectious Diseases':'Doenças Infecciosas','Male Reproductive System':'Sistema Reprodutor Masculino','Nervous System':'Sistema Nervoso','Ophthalmology':'Oftalmologia','Pregnancy, Childbirth & Puerperium':'Gravidez, Parto & Puerpério','Psychiatric/Behavioral & Substance Use Disorder':'Psiquiátrico/Comportamental & Uso de Substâncias','Pulmonary & Critical Care':'Pneumologia & Terapia Intensiva','Renal, Urinary Systems & Electrolytes':'Renal, Sistema Urinário & Eletrólitos','Rheumatology/Orthopedics & Sports':'Reumatologia/Ortopedia & Esportes','Social Sciences (Ethics/Legal/Professional)':'Ciências Sociais (Ética/Legal/Profissional)','Miscellaneous (Multisystem)':'Diversos (Multissistêmico)',
    'Amino acids, proteins, and enzymes':'Aminoácidos, proteínas e enzimas','Bioenergetics and carbohydrate metabolism':'Bioenergética e metabolismo de carboidratos','Cell and molecular biology':'Biologia celular e molecular','Lipid metabolism':'Metabolismo lipídico','Miscellaneous':'Diversos','Clinical genetics':'Genética clínica','DNA structure, replication, and repair':'Estrutura, replicação e reparo do DNA','Gene expression and regulation':'Expressão e regulação gênica','Protein synthesis':'Síntese proteica','RNA structure, synthesis, and processing':'Estrutura, síntese e processamento do RNA','Bacteriology':'Bacteriologia','Mycology':'Micologia','Parasitology':'Parasitologia','Virology':'Virologia','Cellular pathology':'Patologia celular','Inflammation and repair':'Inflamação e reparo','Neoplasia':'Neoplasia','Drug metabolism and toxicity':'Metabolismo e toxicidade de fármacos','Drug receptors and pharmacodynamics':'Receptores e farmacodinâmica','Pharmacokinetics':'Farmacocinética','Epidemiology and population health':'Epidemiologia e saúde populacional','Measures and distribution of data':'Medidas e distribuição de dados','Probability and principles of testing':'Probabilidade e princípios de testes','Study design and interpretation':'Desenho e interpretação de estudos','Environmental exposure':'Exposição ambiental','Toxicology':'Toxicologia','Anaphylaxis and allergic reactions':'Anafilaxia e reações alérgicas','Autoimmune diseases':'Doenças autoimunes','Immune deficiencies':'Imunodeficiências','Transplant medicine':'Medicina de transplantes','Principles of immunology':'Princípios de imunologia','Normal structure and function of the cardiovascular system':'Estrutura e função normais do sistema cardiovascular','Aortic and peripheral artery diseases':'Doenças da aorta e artérias periféricas','Cardiac arrhythmias':'Arritmias cardíacas','Congenital heart disease':'Cardiopatia congênita','Coronary heart disease':'Doença coronariana','Heart failure and shock':'Insuficiência cardíaca e choque','Hypertension':'Hipertensão','Myopericardial diseases':'Doenças miopericárdicas','Valvular heart diseases':'Valvopatias','Cardiovascular drugs':'Fármacos cardiovasculares','Normal structure and function of skin':'Estrutura e função normais da pele','Disorders of epidermal appendages':'Distúrbios dos anexos epidérmicos','Inflammatory dermatoses and bullous diseases':'Dermatoses inflamatórias e doenças bolhosas','Skin and soft tissue infections':'Infecções de pele e partes moles','Skin tumors and tumor-like lesions':'Tumores cutâneos e lesões tumorais','Disorders of the ear, nose, and throat':'Distúrbios do ouvido, nariz e garganta','Normal structure and function of endocrine glands':'Estrutura e função normais das glândulas endócrinas','Congenital and developmental anomalies':'Anomalias congênitas e do desenvolvimento','Adrenal disorders':'Distúrbios adrenais','Diabetes mellitus':'Diabetes mellitus','Endocrine tumors':'Tumores endócrinos','Hypothalamus and pituitary disorders':'Distúrbios do hipotálamo e hipófise','Obesity and dyslipidemia':'Obesidade e dislipidemia','Reproductive endocrinology':'Endocrinologia reprodutiva','Thyroid disorders':'Distúrbios da tireoide','Normal structure and function of the female reproductive system and breast':'Estrutura e função normais do sistema reprodutor feminino e mama','Breast disorders':'Distúrbios mamários','Genital tract tumors and tumor-like lesions':'Tumores do trato genital e lesões tumorais','Genitourinary tract infections':'Infecções do trato geniturinário','Menstrual disorders and contraception':'Distúrbios menstruais e contracepção','Normal structure and function of the GI tract':'Estrutura e função normais do trato GI','Biliary tract disorders':'Distúrbios das vias biliares','Disorders of nutrition':'Distúrbios nutricionais','Gastroesophageal disorders':'Distúrbios gastroesofágicos','Hepatic disorders':'Distúrbios hepáticos','Intestinal and colorectal disorders':'Distúrbios intestinais e colorretais','Pancreatic disorders':'Distúrbios pancreáticos','Tumors of the GI tract':'Tumores do trato GI','Normal hematologic structure and function':'Estrutura e função hematológicas normais','Hemostasis and thrombosis':'Hemostasia e trombose','Plasma cell disorders':'Distúrbios de plasmócitos','Platelet disorders':'Distúrbios plaquetários','Red blood cell disorders':'Distúrbios das hemácias','Transfusion medicine':'Medicina transfusional','White blood cell disorders':'Distúrbios dos leucócitos','Principles of oncology':'Princípios de oncologia','Antimicrobial drugs':'Fármacos antimicrobianos','Bacterial infections':'Infecções bacterianas','Fungal infections':'Infecções fúngicas','HIV and sexually transmitted infections':'HIV e infecções sexualmente transmissíveis','Infection control':'Controle de infecção','Parasitic and helminthic infections':'Infecções parasitárias e helmínticas','Viral infections':'Infecções virais','Normal structure and function of the male reproductive system':'Estrutura e função normais do sistema reprodutor masculino','Disorders of the male reproductive system':'Distúrbios do sistema reprodutor masculino','Normal structure and function of the nervous system':'Estrutura e função normais do sistema nervoso','Cerebrovascular disease':'Doença cerebrovascular','CNS infections':'Infecções do SNC','Demyelinating diseases':'Doenças desmielinizantes','Disorders of peripheral nerves and muscles':'Distúrbios dos nervos periféricos e músculos','Headache':'Cefaleia','Neurodegenerative disorders and dementias':'Distúrbios neurodegenerativos e demências','Seizures and epilepsy':'Convulsões e epilepsia','Spinal cord disorders':'Distúrbios da medula espinhal','Traumatic brain injuries':'Traumatismos cranioencefálicos','Tumors of the nervous system':'Tumores do sistema nervoso','Hydrocephalus':'Hidrocefalia','Anesthesia':'Anestesia','Sleep disorders':'Distúrbios do sono','Normal structure and function of the eye and associated structures':'Estrutura e função normais do olho e estruturas associadas','Disorders of the eye and associated structures':'Distúrbios do olho e estruturas associadas','Normal pregnancy, childbirth, and puerperium':'Gravidez, parto e puerpério normais','Disorders of pregnancy, childbirth, and puerperium':'Distúrbios da gravidez, parto e puerpério','Normal behavior and development':'Comportamento e desenvolvimento normais','Anxiety and trauma-related disorders':'Transtornos de ansiedade e relacionados a trauma','Mood disorders':'Transtornos do humor','Neurodevelopmental disorders':'Transtornos do neurodesenvolvimento','Personality disorders':'Transtornos de personalidade','Psychotic disorders':'Transtornos psicóticos','Substance use disorders':'Transtornos por uso de substâncias','Eating disorders':'Transtornos alimentares','Somatoform disorders':'Transtornos somatoformes','Normal pulmonary structure and function':'Estrutura e função pulmonares normais','Critical care medicine':'Medicina intensiva','Interstitial lung disease':'Doença pulmonar intersticial','Lung cancer':'Câncer de pulmão','Obstructive lung disease':'Doença pulmonar obstrutiva','Pulmonary infections':'Infecções pulmonares','Pulmonary vascular disease':'Doença vascular pulmonar','Normal structure and function of the kidneys and urinary system':'Estrutura e função normais dos rins e sistema urinário','Acute kidney injury':'Injúria renal aguda','Bone metabolism':'Metabolismo ósseo','Chronic kidney disease':'Doença renal crônica','Cystic kidney diseases':'Doenças renais císticas','Fluid, electrolytes, and acid-base':'Fluidos, eletrólitos e ácido-base','Glomerular diseases':'Doenças glomerulares','Neoplasms of the kidneys and urinary tract':'Neoplasias dos rins e trato urinário','Nephrolithiasis and urinary tract obstruction':'Nefrolitíase e obstrução do trato urinário','Diabetes insipidus':'Diabetes insípido','Urinary incontinence':'Incontinência urinária','Normal structure and function of the musculoskeletal system':'Estrutura e função normais do sistema musculoesquelético','Arthritis and spondyloarthropathies':'Artrite e espondiloartropatias','Autoimmune disorders and vasculitides':'Distúrbios autoimunes e vasculites','Bone/joint injuries and infections':'Lesões e infecções ósseas/articulares','Bone tumors and tumor-like lesions':'Tumores ósseos e lesões tumorais','Spinal disorders and back pain':'Distúrbios da coluna e dor lombar','Metabolic bone disorders':'Distúrbios ósseos metabólicos','Communication and interpersonal skills':'Comunicação e habilidades interpessoais','Healthcare policy and economics':'Política e economia da saúde','Medical ethics and jurisprudence':'Ética médica e jurisprudência','Patient safety':'Segurança do paciente','System based-practice and quality improvement':'Prática baseada no sistema e melhoria da qualidade',
  };
  const txLabel = en => lang()==='pt' ? (TAX_PT[en]||en) : en;      // rótulo de taxonomia traduzido
  const sysName = id => txLabel(SYS_NAMES[id]||id);                  // nome de sistema por id, traduzido

  /* ============================= i18n ============================= */
  const T = {
    en:{ home:'QBank — UWorld', createTest:'Create Test', reviewFlagged:'Review flagged',
      perfTitle:'Your performance', used:'Used', correct:'Correct', incorrect:'Incorrect', omitted:'Omitted', unused:'Unused', overall:'Overall score',
      passes:'Passes', pass:'Pass', dirigido:'Directed Pass', questions:'questions', continue:'Continue', start:'Start',
      passName:{1:'Learning',2:'Consolidation',3:'Refinement',99:'Total Mastery'},
      // create test
      ctTitle:'Create Test', ctSystems:'Systems', ctDisciplines:'Disciplines', ctStatus:'Question status', ctPass:'Pass', ctDifficulty:'Difficulty', ctMode:'Mode', ctCount:'Number of questions', collapseAll:'Collapse all', expandAll:'Expand all', maxPerBlock:'Max allowed',
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
      // root cause
      rcTitle:'Why did you miss this?', rcSub:'One tap — this powers your Directed Pass and analytics.', rcSkip:'Skip',
      // results
      resTitle:'Block results', score:'Score', bySystem:'By system', reviewQ:'Review questions', surgical:'⚑ Generate Surgical Review', surgicalSub:n=>`Builds a focused test from your most frequent error cause (${n} questions).`,
      backHome:'Back to QBank', reviewAll:'Review all answers',
      // analytics
      analytics:'Analytics', anOverview:'Overview', anBySystem:'Performance by system', anByPass:'Pass comparison', anRootCause:'Error causes', anEmpty:'Answer some questions to unlock analytics.',
      disclaimer:'Correlation with real exam scores is orientative only and not a guarantee of performance.',
      // smartcards
      scTitle:'Create Flashcard', scFront:'Front (write the question to actively recall)', scBack:'Back (answer — pre-filled, editable)', scHint:'Tip: keep one idea per card. Front is required for active recall.', scSave:'Save flashcard', scSaved:'✓ Flashcard added to your deck (QBank SmartCards).', scCancel:'Cancel', scDeck:'QBank SmartCards',
      // notebook
      nbTitle:'Add to Notebook', nbPh:'Write a note about this question…', nbSave:'Save note', nbSaved:'✓ Saved to Notebook.',
      labTitle:'Common reference ranges', close:'Close',
      resume:'Resume', empty:'No questions here yet.', flaggedEmpty:'You have not flagged any questions yet.' },
    pt:{ home:'Banco de Questões — UWorld', createTest:'Criar Teste', reviewFlagged:'Revisar marcadas',
      perfTitle:'Seu desempenho', used:'Usadas', correct:'Acertos', incorrect:'Erros', omitted:'Omitidas', unused:'Não usadas', overall:'Nota geral',
      passes:'Passadas', pass:'Passada', dirigido:'Passada Dirigida', questions:'questões', continue:'Continuar', start:'Iniciar',
      passName:{1:'Aprendizado',2:'Consolidação',3:'Refinamento',99:'Domínio Total'},
      ctTitle:'Criar Teste', ctSystems:'Sistemas', ctDisciplines:'Disciplinas', ctStatus:'Status da questão', ctPass:'Passada', ctDifficulty:'Dificuldade', ctMode:'Modo', ctCount:'Número de questões', collapseAll:'Recolher tudo', expandAll:'Expandir tudo', maxPerBlock:'Máx. permitido',
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
      rcTitle:'Por que você errou?', rcSub:'Um toque — isso alimenta sua Passada Dirigida e as análises.', rcSkip:'Pular',
      resTitle:'Resultado do bloco', score:'Nota', bySystem:'Por sistema', reviewQ:'Revisar questões', surgical:'⚑ Gerar Revisão Cirúrgica', surgicalSub:n=>`Monta um teste focado na sua causa de erro mais frequente (${n} questões).`,
      backHome:'Voltar ao Banco', reviewAll:'Revisar todas as respostas',
      analytics:'Análises', anOverview:'Visão geral', anBySystem:'Desempenho por sistema', anByPass:'Comparação por passada', anRootCause:'Causas de erro', anEmpty:'Responda algumas questões para liberar as análises.',
      disclaimer:'A correlação com notas reais do exame é apenas orientativa e não garante desempenho.',
      scTitle:'Criar Flashcard', scFront:'Frente (escreva a pergunta para recordar ativamente)', scBack:'Verso (resposta — pré-preenchida, editável)', scHint:'Dica: uma ideia por card. A frente é obrigatória para recall ativo.', scSave:'Salvar flashcard', scSaved:'✓ Flashcard adicionado ao seu deck (QBank SmartCards).', scCancel:'Cancelar', scDeck:'QBank SmartCards',
      nbTitle:'Adicionar ao Caderno', nbPh:'Escreva uma nota sobre esta questão…', nbSave:'Salvar nota', nbSaved:'✓ Salvo no Caderno.',
      labTitle:'Faixas de referência comuns', close:'Fechar',
      resume:'Retomar', empty:'Nenhuma questão aqui ainda.', flaggedEmpty:'Você ainda não marcou nenhuma questão.' }
  };
  const lang = () => document.documentElement.lang === 'pt-BR' ? 'pt' : 'en';
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
  const passFromPage = { 'uworld-pass-1':'1','uworld-pass-2':'2','uworld-pass-3':'3','uworld-pass-4':'99' };

  function boot(){
    host = document.querySelector('#internalContent .internal-card');
    if(!host) return;
    host.classList.add('qb-host');
    document.querySelector('#internalContent').classList.add('qb-wide');
    root = host;
    // pass folders abrem direto no Create Test pré-filtrado
    if(passFromPage[PAGE]) view = {name:'create', preset:{pass:passFromPage[PAGE]}};
    render();
    new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }

  function render(){
    if(!root) return;
    if(view.name==='home') return renderHome();
    if(view.name==='create') return renderCreate();
    if(view.name==='test') return renderTest();
    if(view.name==='results') return renderResults();
    if(view.name==='analytics') return renderAnalytics();
  }
  const go = v => { view=v; render(); window.scrollTo(0,0); };

  /* ============================== HOME ============================== */
  function renderHome(){
    const total=SEED.length;
    const att=store.allAttempts();
    const seen=new Set(att.map(a=>a.question_id));
    const used=seen.size;
    let c=0,i=0,o=0;
    seen.forEach(qid=>{ const st=store.statusOf(qid); if(st==='correct')c++;else if(st==='incorrect')i++;else if(st==='omitted')o++; });
    const answered=c+i;
    const overall = answered? Math.round(100*c/answered):0;
    const passCard = (pn,pageLink)=>{
      const pool = pn===99? store.directedPool() : SEED.filter(q=>store.passNumber(q.id)===pn);
      const done = pn===99? 0 : att.filter(a=>a.pass_number===pn).length;
      const pctBase = pn===99? pool.length : total;
      const pct = pctBase? Math.round(100*Math.min(done,pctBase)/pctBase):0;
      const label = pn===99? t('dirigido') : `${pn}ª ${t('pass')}`;
      return `<button class="qb-pass" data-act="pass-card" data-pn="${pn}">
        <div class="qb-pass-head"><span class="qb-pass-n">${pn===99?'★':pn}</span>
          <div><strong>${esc(label)}</strong><small>${esc(t('passName')[pn])}</small></div></div>
        <div class="qb-pass-bar"><span style="width:${pct}%"></span></div>
        <div class="qb-pass-meta">${pool.length} ${t('questions')} · ${pct}%</div>
      </button>`;
    };
    root.innerHTML = `
      <div class="qb">
        <div class="qb-top">
          <h1>${esc(t('home'))}</h1>
          <div class="qb-top-actions">
            <button class="qb-btn ghost" data-act="analytics">${esc(t('analytics'))}</button>
            <button class="qb-btn ghost" data-act="flagged">⚑ ${esc(t('reviewFlagged'))}</button>
            <button class="qb-btn primary" data-act="create">＋ ${esc(t('createTest'))}</button>
          </div>
        </div>

        <div class="qb-perf">
          <div class="qb-donut" style="--pct:${overall}">
            <div class="qb-donut-c"><strong>${overall}%</strong><small>${esc(t('overall'))}</small></div>
          </div>
          <div class="qb-perf-grid">
            <div class="qb-stat"><span class="qb-dot used"></span><b>${used}</b><small>${esc(t('used'))}</small></div>
            <div class="qb-stat"><span class="qb-dot ok"></span><b>${c}</b><small>${esc(t('correct'))}</small></div>
            <div class="qb-stat"><span class="qb-dot bad"></span><b>${i}</b><small>${esc(t('incorrect'))}</small></div>
            <div class="qb-stat"><span class="qb-dot om"></span><b>${o}</b><small>${esc(t('omitted'))}</small></div>
            <div class="qb-stat"><span class="qb-dot un"></span><b>${total-used}</b><small>${esc(t('unused'))}</small></div>
          </div>
        </div>

        <h2 class="qb-h2">${esc(t('passes'))}</h2>
        <div class="qb-passes">${[1,2,3,99].map(pn=>passCard(pn)).join('')}</div>
      </div>`;
    wire();
  }

  /* =========================== CREATE TEST =========================== */
  function renderCreate(){
    const preset = view.preset || {};
    view.f = view.f || { subjects:[], status:'all', pass:preset.pass||'all', difficulty:'all', mode:'tutor', secs:90, count:10 };
    const f = view.f;
    if(!f.subjects) f.subjects=[];
    view.collapsed = view.collapsed || {};
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
        <span class="qb-opt-l">${o.label}</span><span class="qb-opt-t">${esc(o.text)}</span>
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
        <div class="qb-test-head">
          <span class="qb-qnum">${esc(t('qOf')(T0.idx+1,T0.qids.length))}</span>
          <div class="qb-head-tools">
            <button class="qb-tool ${flagged?'on':''}" data-act="flag">⚑ ${esc(flagged?t('unflag'):t('flag'))}</button>
            <button class="qb-tool" data-act="labs">🧪 ${esc(t('labValues'))}</button>
            <span class="qb-timer" id="qbTimer">00:00</span>
            <button class="qb-tool warn" data-act="suspend">${esc(t('suspend'))}</button>
            <button class="qb-tool danger" data-act="end">${esc(t('endBlock'))}</button>
          </div>
        </div>

        <div class="qb-test-body">
          <div class="qb-vignette">
            ${q.vignette?`<p>${esc(q.vignette)}</p>`:''}
            <p class="qb-stem">${esc(q.q)}</p>
            <div class="qb-opts">${q.options.map(opt).join('')}</div>
            ${!answered?`<button class="qb-btn primary" data-act="submit" ${ans!=null?'':'disabled'} id="qbSubmit">${esc(t('submit'))}</button>`:''}
            ${revealed?renderExplanation(q,ans):''}
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

  function renderExplanation(q,ans){
    const correct = ans===q.correct;
    const badge = ans==null? `<span class="qb-badge om">${esc(t('omittedBadge'))}</span>`
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
    const incorrectExpl = (q.explI||[]).map(e=>`<li><b>${esc(e.option)}.</b> ${esc(e.explanation)}</li>`).join('');
    return `<div class="qb-expl">
      <div class="qb-expl-head">${badge}
        <div class="qb-expl-actions">
          <button class="qb-btn tiny" data-act="flash">${esc(t('addFlash'))}${links?` (${links})`:''}</button>
          <button class="qb-btn tiny ghost" data-act="note">${esc(t('addNote'))}</button>
        </div>
      </div>
      <h3>${esc(t('explanation'))}</h3>
      <p class="qb-expl-correct">${esc(q.explC)}</p>
      ${incorrectExpl?`<ul class="qb-expl-incorrect">${incorrectExpl}</ul>`:''}
      <div class="qb-obj"><span>🎯 ${esc(t('eduObjective'))}</span><p>${esc(q.objective)}</p></div>
      <div class="qb-peer"><h4>${esc(t('peerTitle'))}</h4>${peerRows}</div>
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
    const T0=view.test, q=store.question(T0.qids[T0.idx]);
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
  function openLabs(){
    const rows=[['Na⁺','136–145 mEq/L'],['K⁺','3.5–5.0 mEq/L'],['Cl⁻','98–106 mEq/L'],['HCO₃⁻','22–28 mEq/L'],['BUN','7–20 mg/dL'],['Creatinine','0.6–1.2 mg/dL'],['Glucose (fasting)','70–100 mg/dL'],['Ca²⁺','8.4–10.2 mg/dL'],['Hemoglobin','13.5–17.5 g/dL (M)'],['Leukocytes','4,500–11,000/mm³'],['Platelets','150–400 ×10³/mm³'],['TSH','0.4–4.0 µU/mL']];
    const html=rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
    const m=modal(`<h3>${esc(t('labTitle'))}</h3><table class="qb-labtable"><tbody>${html}</tbody></table><div class="qb-modal-actions"><button class="qb-btn primary" data-x="close">${esc(t('close'))}</button></div>`);
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
      case 'flagged': { view.f={subjects:[],status:'marked',pass:'all',difficulty:'all',mode:'tutor',secs:90,count:Math.max(1,Object.keys(store.raw.flags).length)}; if(!filterPool(view.f).length){toast(t('flaggedEmpty'));break;} go({name:'create',f:view.f}); break; }
      case 'pass-card': { const pn=el.dataset.pn; view.f={subjects:[],status:'all',pass:pn,difficulty:'all',mode:'tutor',secs:90,count:10}; go({name:'create',f:view.f,preset:{pass:pn}}); break; }
      case 'tog-sys': { const sys=TAXONOMY.find(s=>s.id===el.dataset.v); const ids=sys.subs.map(([slug])=>subjId(sys.id,slug)); const allOn=ids.every(id=>view.f.subjects.includes(id)); if(allOn){ view.f.subjects=view.f.subjects.filter(id=>!ids.includes(id)); } else { ids.forEach(id=>{ if(!view.f.subjects.includes(id)) view.f.subjects.push(id); }); } render(); break; }
      case 'tog-sub': { const id=el.dataset.v; const i=view.f.subjects.indexOf(id); i>=0?view.f.subjects.splice(i,1):view.f.subjects.push(id); render(); break; }
      case 'tog-all': { if(view.f.subjects.length){ view.f.subjects=[]; } else { const all=[]; TAXONOMY.forEach(s=>s.subs.forEach(([slug])=>all.push(subjId(s.id,slug)))); view.f.subjects=all; } render(); break; }
      case 'collapse': { const id=el.dataset.v; view.collapsed[id]=!view.collapsed[id]; render(); break; }
      case 'collapse-all': { const all=TAXONOMY.every(s=>view.collapsed[s.id]); TAXONOMY.forEach(s=>view.collapsed[s.id]=!all); render(); break; }
      case 'status': view.f.status=el.dataset.v; render(); break;
      case 'pass': view.f.pass=el.dataset.v; render(); break;
      case 'diff': view.f.difficulty=el.dataset.v; render(); break;
      case 'mode': view.f.mode=el.dataset.v; render(); break;
      case 'generate': startTest(); break;
      // teste
      case 'pick': { if(view.test.mode==='tutor' && view.test.answers[currentQ().id]!=null) break; if(view.showAns)break; view.test.pending=el.dataset.o; view.test.answers[currentQ().id]=null; markPending(el.dataset.o); break; }
      case 'strike': { e.stopPropagation(); const q=currentQ(); const s=view.test.strikes[q.id]=view.test.strikes[q.id]||{}; const o=el.dataset.o; s[o]?delete s[o]:s[o]=true; render(); break; }
      case 'submit': submitAnswer(false); break;
      case 'flag': store.toggleFlag(currentQ().id); render(); break;
      case 'labs': openLabs(); break;
      case 'suspend': if(confirm(t('confirmSuspend'))){ const s=serializeTest(view.test); s.status='suspended'; store.saveTest(s); if(timerH)clearInterval(timerH); go({name:'home'});} break;
      case 'end': if(confirm(t('confirmEnd'))) endBlock(); break;
      case 'prev': if(view.test.idx>0){view.test.idx--; view.showAns=false; view.test.pending=null; render();} break;
      case 'next': if(view.test.idx<view.test.qids.length-1){view.test.idx++; view.showAns=false; view.test.pending=null; render();} break;
      case 'goto': { view.test.idx=+el.dataset.n; view.showAns=false; view.test.pending=null; render(); break; }
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

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
