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

    // ═══════════════════════════════════════════════════════════════
    // BATCH 01 — Male Reproductive System (10 questions)
    // ═══════════════════════════════════════════════════════════════
    { id:'CMQ-STEP1-MRS-0001', system:'male-reproductive-system', discipline:'microbiology', category:'male-reproductive-system::urinary_tract_infection', difficulty:'medium',
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

    { id:'CMQ-STEP1-MRS-0002', system:'male-reproductive-system', discipline:'pharmacology', category:'male-reproductive-system::benign_prostatic_hyperplasia', difficulty:'medium',
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

    { id:'CMQ-STEP1-MRS-0003', system:'male-reproductive-system', discipline:'pathophysiology', category:'male-reproductive-system::testicular_torsion', difficulty:'medium',
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

    { id:'CMQ-STEP1-MRS-0004', system:'male-reproductive-system', discipline:'genetics', category:'male-reproductive-system::klinefelter_syndrome', difficulty:'medium',
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

    { id:'CMQ-STEP1-MRS-0005', system:'male-reproductive-system', discipline:'behavioral_science', category:'male-reproductive-system::male_sexual_dysfunction', difficulty:'easy',
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

    { id:'CMQ-STEP1-MRS-0006', system:'male-reproductive-system', discipline:'histology', category:'male-reproductive-system::blood_testis_barrier', difficulty:'medium',
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

    { id:'CMQ-STEP1-MRS-0007', system:'male-reproductive-system', discipline:'anatomy', category:'male-reproductive-system::vasectomy', difficulty:'easy',
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

    { id:'CMQ-STEP1-MRS-0008', system:'male-reproductive-system', discipline:'genetics', category:'male-reproductive-system::androgen_insensitivity', difficulty:'hard',
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

    { id:'CMQ-STEP1-MRS-0009', system:'male-reproductive-system', discipline:'anatomy', category:'male-reproductive-system::urethral_injury', difficulty:'medium',
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

    { id:'CMQ-STEP1-MRS-0010', system:'male-reproductive-system', discipline:'pathology', category:'male-reproductive-system::testicular_cancer', difficulty:'medium',
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
    { id:'CMQ-STEP1-CVS-0001', system:'cardiovascular', discipline:'pharmacology', category:'cardiovascular::lipid_lowering_therapy', difficulty:'medium',
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

    { id:'CMQ-STEP1-CVS-0004', system:'cardiovascular', discipline:'physiology', category:'cardiovascular::shock_hemodynamics', difficulty:'hard',
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

    { id:'CMQ-STEP1-CVS-0005', system:'cardiovascular', discipline:'pathophysiology', category:'cardiovascular::cor_pulmonale', difficulty:'medium',
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

    { id:'CMQ-STEP1-CVS-0006', system:'cardiovascular', discipline:'pharmacology', category:'cardiovascular::heart_block', difficulty:'medium',
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

    { id:'CMQ-STEP1-CVS-0007', system:'cardiovascular', discipline:'physiology', category:'cardiovascular::myocardial_infarction', difficulty:'medium',
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

    { id:'CMQ-STEP1-CVS-0008', system:'cardiovascular', discipline:'pharmacology', category:'cardiovascular::supraventricular_arrhythmia', difficulty:'easy',
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

    { id:'CMQ-STEP1-CVS-0009', system:'cardiovascular', discipline:'physiology', category:'cardiovascular::sympathomimetic_agents', difficulty:'hard',
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
    en:{ home:'QBank 1', createTest:'Create Test', reviewFlagged:'Review flagged',
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
    pt:{ home:'Banco de Questões 1', createTest:'Criar Teste', reviewFlagged:'Revisar marcadas',
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
    // pass folders abrem direto no Create Test pré-filtrado
    if(passFromPage[PAGE]) view = {name:'create', preset:{pass:passFromPage[PAGE]}};
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
            ${q.vignette?`<p>${qbField(q.vignette, q.ptTranslation && q.ptTranslation.vignette)}</p>`:''}
            <p class="qb-stem">${qbField(q.q, q.ptTranslation && q.ptTranslation.q)}</p>
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
