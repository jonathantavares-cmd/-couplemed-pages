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

const A1 = '/assets/library1/allergy-and-immunology/';

window.LIBRARY1_CONTENT['allergy-and-immunology'] = {

  /* ---------------------------------------------------------------- *
   * Acute rheumatic fever · Febre reumática aguda                    *
   * Origem: 30 prints (1-6 texto EN, 7-19 mídia EN, 20-29 mídia PT,  *
   * 30 texto PT). Incluído em 2026-07-25.                            *
   * ---------------------------------------------------------------- */
  'acute-rheumatic-fever': {

    assets: {
      'image-1': { kind:'image', n:1,
        en:{ src:A1+'acute-rheumatic-fever/image-1-en.jpg', alt:'Acute rheumatic heart disease' },
        pt:{ src:A1+'acute-rheumatic-fever/image-1-pt.jpg', alt:'Doença cardíaca reumática aguda' } },
      'image-2': { kind:'image', n:2,
        en:{ src:A1+'acute-rheumatic-fever/image-2-en.jpg', alt:'Erythema marginatum' },
        pt:{ src:A1+'acute-rheumatic-fever/image-2-pt.jpg', alt:'Eritema marginal' } },
      'image-3': { kind:'image', n:3,
        en:{ src:A1+'acute-rheumatic-fever/image-3-en.jpg', alt:'Henoch-Schönlein purpura' },
        pt:{ src:A1+'acute-rheumatic-fever/image-3-pt.jpg', alt:'Purpura Henoch-Schönlein' } },
      'image-4': { kind:'image', n:4,
        en:{ src:A1+'acute-rheumatic-fever/image-4-en.jpg', alt:'Erythema migrans' },
        pt:{ src:A1+'acute-rheumatic-fever/image-4-pt.jpg', alt:'Eritema migrans' } },
      'image-5': { kind:'image', n:5,
        en:{ src:A1+'acute-rheumatic-fever/image-5-en.jpg', alt:'Erythema infectiosum (fifth disease)' },
        pt:{ src:A1+'acute-rheumatic-fever/image-5-pt.jpg', alt:'Eritema infeccioso (cinta doença)' } },
      'figure-1': { kind:'figure', n:1,
        en:{ src:A1+'acute-rheumatic-fever/figure-1-en.jpg', alt:'Pathophysiology of acute rheumatic fever' },
        pt:{ src:A1+'acute-rheumatic-fever/figure-1-pt.jpg', alt:'Fisiopatologia da febre reumática aguda' } },
      'figure-2': { kind:'figure', n:2,
        en:{ src:A1+'acute-rheumatic-fever/figure-2-en.jpg', alt:'Mitral valve calcification' },
        pt:{ src:A1+'acute-rheumatic-fever/figure-2-pt.jpg', alt:'Calcificação da válvula mitral' } },
      'table-1': { kind:'table', n:1,
        en:{ src:A1+'acute-rheumatic-fever/table-1-en.png', alt:'Antibiotic prophylaxis for secondary prevention of rheumatic fever' },
        pt:{ src:A1+'acute-rheumatic-fever/table-1-pt.png', alt:'Profilaxia antibiótica para prevenção secundária de febre reumática' } },
      'table-2': { kind:'table', n:2,
        en:{ src:A1+'acute-rheumatic-fever/table-2-en.png', alt:'Streptococcal pharyngitis' },
        pt:{ src:A1+'acute-rheumatic-fever/table-2-pt.png', alt:'Faringite estreptocócica' } },
      'table-3': { kind:'table', n:3,
        en:{ src:A1+'acute-rheumatic-fever/table-3-en.png', alt:'Acute rheumatic fever' },
        pt:{ src:A1+'acute-rheumatic-fever/table-3-pt.png', alt:'Febre reumática aguda' } }
    },

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
