/* CoupleMed v31 — 2026-07-06

   PADRÃO OBRIGATÓRIO DE I18N DE CONTEÚDO (vale para QUALQUER conteúdo novo — QBank,
   Flashcards, Medical Library, AI Tutor, e qualquer módulo futuro):
     - Todo texto dinâmico é criado/armazenado em INGLÊS.
     - Ao renderizar HTML, o texto NUNCA vai direto (nem via textContent nem via innerHTML
       cru) — sempre passa por window.CMI18N.span(text) (definido em js/i18n-content.js),
       que marca o elemento para tradução automática.
     - Depois de inserir o HTML no DOM, sempre chamar window.CMI18N.translateAllVisible(root)
       (ou deixar isso a cargo do render() do módulo, como já ocorre no QBank e na Medical
       Library) — isso troca o texto para PT quando o idioma ativo for português.
     - O motor mantém um banco de traduções persistente (localStorage), reaproveitado por
       todo o site, então o mesmo termo nunca é retraduzido à toa.
     - Ver js/i18n-content.js para a implementação e mais detalhes.
*/
(function(){
  const USERS = {
    'jonathan.tavares@hotmail.com': { pass:'Ja@120622', user:'john' },
    'alyssonaranha@gmail.com':      { pass:'Aj@120622', user:'alysson' },
    'guest1': { pass:'Gjesus@17', user:'guest1' },
    'guest2': { pass:'Gjesus@27', user:'guest2' },
    'guest3': { pass:'Gjesus@37', user:'guest3' },
    'guest4': { pass:'Gjesus@47', user:'guest4' }
  };
  const USER_META = {
    john:    { displayName:'John',    role:'admin', originalLogin:'jonathan.tavares@hotmail.com', originalPass:'Ja@120622' },
    alysson: { displayName:'Alysson', role:'user',  originalLogin:'alyssonaranha@gmail.com',      originalPass:'Aj@120622' },
    guest1:  { displayName:'Guest 1', role:'user',  originalLogin:'guest1',                       originalPass:'Gjesus@17' },
    guest2:  { displayName:'Guest 2', role:'user',  originalLogin:'guest2',                       originalPass:'Gjesus@27' },
    guest3:  { displayName:'Guest 3', role:'user',  originalLogin:'guest3',                       originalPass:'Gjesus@37' },
    guest4:  { displayName:'Guest 4', role:'user',  originalLogin:'guest4',                       originalPass:'Gjesus@47' }
  };
  function getUserCustom(uid){try{return JSON.parse(localStorage.getItem('couplemed_user_custom_'+uid))||null}catch(e){return null}}
  function setUserCustom(uid,data){localStorage.setItem('couplemed_user_custom_'+uid,JSON.stringify(data))}
  function isUserBlocked(uid){return localStorage.getItem('couplemed_user_blocked_'+uid)==='true'}
  function setUserBlocked(uid,blocked){if(blocked)localStorage.setItem('couplemed_user_blocked_'+uid,'true');else localStorage.removeItem('couplemed_user_blocked_'+uid)}
  function getUserDisplay(uid){const c=getUserCustom(uid);return(c&&c.displayName)?c.displayName:(USER_META[uid]?USER_META[uid].displayName:uid)}
  function findUserByCredentials(login,pass){
    /* 1. check original hardcoded credentials */
    const orig=USERS[login]; if(orig&&orig.pass===pass)return orig.user;
    /* 2. check custom credentials in localStorage */
    for(const uid of Object.keys(USER_META)){
      const c=getUserCustom(uid); if(!c)continue;
      if(c.login&&c.login.toLowerCase()===login&&c.password===pass)return uid;
    }
    return null;
  }

  const quotes = [
    '“Todos os seus sonhos podem se tornar realidade se você tiver coragem para persegui-los.”',
    '“A disciplina transforma sonhos distantes em conquistas inevitáveis.”',
    '“Quem suporta o processo merece viver o resultado.”',
    '“O sucesso começa no dia em que você decide não desistir.”',
    '“Grandes conquistas exigem coragem para continuar quando ninguém está vendo.”',
    '“O impossível só existe até alguém provar o contrário.”',
    '“Você não precisa ser perfeito, precisa ser constante.”',
    '“Cada esforço silencioso constrói uma vitória que um dia fará barulho.”',
    '“O caminho pode ser difícil, mas a recompensa pertence aos que persistem.”',
    '“Não espere estar pronto; comece, aprenda e evolua no caminho.”',
    '“A sua versão do futuro depende das escolhas que você faz hoje.”',
    '“O cansaço passa, mas a conquista permanece.”',
    '“Quem tem um propósito forte encontra força até nos dias difíceis.”',
    '“A vitória não é sorte; é consequência de preparo, foco e persistência.”',
    '“Você é capaz de muito mais do que imagina, especialmente quando decide tentar.”',
    '“Não diminua seus sonhos para caber no medo dos outros.”',
    '“A caminhada pode ser longa, mas cada passo aproxima você da realização.”',
    '“O fracasso só vence quando você para de tentar.”',
    '“Grandes histórias são escritas por pessoas que se recusaram a desistir.”',
    '“Acredite no processo, mesmo quando os resultados ainda não aparecem.”',
    '“O seu esforço de hoje será a liberdade do seu amanhã.”',
    '“Ninguém constrói uma grande vida fugindo dos grandes desafios.”',
    '“O medo pode até caminhar com você, mas não deve decidir por você.”',
    '“Cada dificuldade vencida aumenta a sua força para conquistar o próximo nível.”',
    '“A persistência faz o talento florescer.”',
    '“Sonhos grandes exigem atitudes maiores que as desculpas.”',
    '“O sucesso pertence a quem continua mesmo quando seria mais fácil parar.”',
    '“Você não está atrasado; está sendo preparado.”',
    '“Transforme pressão em força, dúvida em foco e medo em movimento.”',
    '“A diferença entre sonhar e realizar está na coragem de agir todos os dias.”',
    '“Quem planta esforço colhe resultados.”',
    '“Não tenha medo de recomeçar; grandes mudanças nascem de novas decisões.”',
    '“A sua determinação precisa ser maior que os seus obstáculos.”',
    '“O mundo abre caminho para quem sabe aonde quer chegar.”',
    '“O impossível perde força diante de uma mente decidida.”',
    '“A constância é o segredo dos que chegam longe.”',
    '“Não pare porque está difícil; avance porque vale a pena.”',
    '“Você não precisa vencer todos os dias, mas precisa continuar todos os dias.”',
    '“Cada “não” pode ser apenas uma preparação para o grande “sim”.”',
    '“O futuro recompensa quem não negocia com a própria desistência.”',
    '“Acredite na força que existe dentro de você, mesmo quando ninguém mais enxergar.”',
    '“O sucesso é construído nos dias em que a motivação falta, mas a disciplina fica.”',
    '“Toda grande conquista começou com alguém que decidiu tentar mais uma vez.”',
    '“O tamanho do seu sonho deve ser maior que o tamanho do seu medo.”',
    '“Não existe evolução sem esforço, nem conquista sem coragem.”',
    '“A vida muda quando você para de esperar e começa a construir.”',
    '“O seu limite de hoje pode ser o seu ponto de partida amanhã.”',
    '“Quem persiste com fé, foco e trabalho transforma destino em escolha.”',
    '“A coragem não é ausência de medo; é a decisão de seguir apesar dele.”',
    '“Continue. O resultado que você procura pode estar depois da próxima tentativa.”',
    '“Tudo posso naquele que me fortalece.” — Filipenses 4:13',
    '“Entregue o seu caminho ao Senhor; confie nele, e Ele agirá.” — Salmos 37:5',
    '“Confie no Senhor de todo o coração e não dependa apenas do seu próprio entendimento.” — Provérbios 3:5',
    '“Seja forte e corajoso; o Senhor estará com você por onde andar.” — Josué 1:9',
    '“Não tema, porque Deus está com você e o fortalece.” — Isaías 41:10',
    '“Deus tem planos de paz, futuro e esperança.” — Jeremias 29:11',
    '“O Senhor é meu pastor; nada me faltará.” — Salmos 23:1',
    '“Deus é refúgio, força e socorro presente.” — Salmos 46:1',
    '“Todas as coisas cooperam para o bem dos que amam a Deus.” — Romanos 8:28',
    '“Busque primeiro o Reino de Deus, e o restante será acrescentado.” — Mateus 6:33',
    '“Deus não nos deu espírito de medo, mas de poder, amor e equilíbrio.” — 2 Timóteo 1:7',
    '“Quem precisa de sabedoria deve pedir a Deus.” — Tiago 1:5',
    '“A Palavra de Deus ilumina o caminho.” — Salmos 119:105',
    '“Os que esperam no Senhor renovam suas forças.” — Isaías 40:31',
    '“Consagre seus planos ao Senhor, e eles serão firmados.” — Provérbios 16:3',
    '“Faça tudo de coração, como para o Senhor.” — Colossenses 3:23',
    '“Corra com perseverança a carreira proposta.” — Hebreus 12:1',
    '“Não se canse de fazer o bem; no tempo certo haverá colheita.” — Gálatas 6:9',
    '“O socorro vem do Senhor, Criador dos céus e da terra.” — Salmos 121:1-2',
    '“A paz de Cristo guarda o coração e afasta o medo.” — João 14:27',
    '“Venha a Cristo quando estiver cansado, e Ele dará descanso.” — Mateus 11:28',
    '“Entregue suas ansiedades a Deus, porque Ele cuida de você.” — 1 Pedro 5:7',
    '“Quem habita no esconderijo do Altíssimo descansa seguro.” — Salmos 91:1',
    '“Seja forte; Deus não o deixará nem o abandonará.” — Deuteronômio 31:6',
    '“Alegre-se na esperança, seja paciente e perseverante em oração.” — Romanos 12:12',
    '“Deus pode fazer infinitamente mais do que pedimos ou imaginamos.” — Efésios 3:20',
    '“O Senhor está perto dos que têm o coração quebrantado.” — Salmos 34:18',
    '“As misericórdias do Senhor se renovam a cada manhã.” — Lamentações 3:22-23',
    '“Lance seu fardo sobre o Senhor, e Ele o sustentará.” — Salmos 55:22',
    '“Vigie, permaneça firme, seja forte e corajoso.” — 1 Coríntios 16:13',
    '“Guarde o coração, pois dele procedem as fontes da vida.” — Provérbios 4:23',
    '“O Senhor é luz e salvação; não há motivo para temer.” — Salmos 27:1',
    '“Deus conserva em paz aquele que confia nele.” — Isaías 26:3',
    '“Permanecendo em Cristo, há fruto verdadeiro.” — João 15:5',
    '“A graça de Deus basta, e o poder se aperfeiçoa na fraqueza.” — 2 Coríntios 12:9',
    '“Pratique a justiça, ame a misericórdia e caminhe humildemente com Deus.” — Miquéias 6:8',
    '“Que Deus confirme o trabalho das nossas mãos.” — Salmos 90:17',
    '“Do Senhor vêm sabedoria, conhecimento e entendimento.” — Provérbios 2:6',
    '“Que sua luz brilhe e glorifique a Deus.” — Mateus 5:16',
    '“Que Deus encha o coração de alegria, paz e esperança.” — Romanos 15:13',
    '“Com o Senhor à frente, não serei abalado.” — Salmos 16:8',
    '“Nas águas e no fogo, Deus permanece com você.” — Isaías 43:2',
    '“Alegre-se, ore e agradeça em todas as circunstâncias.” — 1 Tessalonicenses 5:16-18',
    '“A fé dá firmeza ao que se espera.” — Hebreus 11:1',
    '“Para Deus, todas as coisas são possíveis.” — Marcos 10:27',
    '“Que palavras e pensamentos sejam agradáveis ao Senhor.” — Salmos 19:14',
    '“A força se revela nos dias difíceis.” — Provérbios 24:10',
    '“Seja forte; o seu trabalho terá recompensa.” — 2 Crônicas 15:7',
    '“Fortaleça o coração e espere no Senhor.” — Salmos 31:24',
    '“O amor perfeito lança fora o medo.” — 1 João 4:18',
    '“Em Cristo há paz, mesmo em meio às aflições.” — João 16:33',
    '“Este é o dia que o Senhor fez; alegremo-nos nele.” — Salmos 118:24',
    '“O Senhor guiará continuamente e fortalecerá sua alma.” — Isaías 58:11',
    '“Planos bem feitos conduzem ao crescimento.” — Provérbios 21:5',
    '“Há tempo certo para cada propósito.” — Eclesiastes 3:1',
    '“Somos formados de modo admirável por Deus.” — Salmos 139:14',
    '“A perseverança produz caráter, e o caráter fortalece a esperança.” — Romanos 5:3-4',
    '“O Senhor é fiel e guarda os seus.” — 2 Tessalonicenses 3:3',
    '“Em Deus a alma encontra descanso.” — Salmos 62:1',
    '“O nome do Senhor é torre forte e segura.” — Provérbios 18:10',
    '“Deus promete não abandonar os seus.” — Hebreus 13:5',
    '“Que o Senhor abençoe, guarde e conceda paz.” — Números 6:24-26'
  ];
  const I18N = {
    en: {home:'Home',myWorkspace:'My Workspace',notebooks:'Notebooks',notes:'Notes',studyPlanner:'Study Planner',studyMaterials:'Study Materials',medicalLibrary:'Medical Library',languages:'Languages / English',settings:'Settings',logout:'Logout',videoLectures:'Video Lectures',audioLessons:'Audio Lessons',aiTutorLabel:'AI Tutor',observership:'Observership',residencyMatch:'Residency Match',linksLabel:'Links',studyStreak:'STUDY<br>STREAK',oneDay:'1 Day',keepGoing:'Keep it going!',qbankProgress:'QBank - UWorld Progress',pass1:'1 Pass',pass2:'2 Pass',pass3:'3 Pass',continueBtn:'Continue',questionBank:'QBank',flashcardsLabel:'Flashcards',performanceAnalytics:'Performance Analytics',libraryUworldTitle:'UWorld Library',libraryRdTitle:'RD Library',firstAidLibraryTitle:'First Aid Library',qbankUworldTitle:'QBank UWorld',qbankRdTitle:'QBank RD',uwFolderTitle:'QBank - UWorld',uwPass1:'1 Pass',uwPass2:'2 Pass',uwPass3:'3 Pass',uwPass4:'4 Pass',pass1Name:'Learning',pass2Name:'Consolidation',pass3Name:'Refinement',pass4Name:'Total Mastery',uwQuestionsAnswered:'Questions Answered',uwOnlyMissed:'Only questions you keep missing',instructionsTitle:'Instructions',step1Uworld:'QBank - UWorld',step1Rd:'QBank - RD',settingsAdmin:'Administrator',settingsUsers:'Users',settingsLogin:'Login',settingsPassword:'Password',settingsUser:'User',settingsPerformance:'Performance',settingsEnabled:'Enabled',settingsBlocked:'Blocked',settingsReset:'Reset',settingsResetConfirm1:'Do you confirm the reset of the platform for user',settingsResetConfirm2:'Are you sure you confirm the reset of the platform for user',settingsResetConfirm2b:'This is the last warning. All saved information will be lost and the platform will be restarted from scratch.',settingsResetDone:'Platform reset successfully for user',settingsChangeData:'Change Data',settingsSave:'Save',settingsCancel:'Cancel',settingsDisplayName:'Username',settingsDataSaved:'Data saved successfully!',settingsQuestionsAnswered:'Questions answered',settingsCorrectRate:'Correct rate',settingsCardsTotal:'Total cards',settingsReviewsDone:'Reviews done',settingsNoData:'No data yet'},
    pt: {home:'Home',myWorkspace:'Meu Espaço de Trabalho',notebooks:'Cadernos',notes:'Anotações',studyPlanner:'Planejador de Estudos',studyMaterials:'Materiais de Estudo',medicalLibrary:'Biblioteca Médica',languages:'Idiomas / Inglês',settings:'Configurações',logout:'Sair',videoLectures:'Aulas em Vídeo',audioLessons:'Aulas em Áudio',aiTutorLabel:'AI Tutor',observership:'Observership',residencyMatch:'Residency Match',linksLabel:'Links',studyStreak:'SEQUÊNCIA<br>DE ESTUDOS',oneDay:'1 Dia',keepGoing:'Continue assim!',qbankProgress:'QBank - UWorld Progresso',pass1:'1ª Passada',pass2:'2ª Passada',pass3:'3ª Passada',continueBtn:'Continuar',questionBank:'Banco de Questões',flashcardsLabel:'Flashcards',performanceAnalytics:'Análise de Desempenho',libraryUworldTitle:'Biblioteca UWorld',libraryRdTitle:'Biblioteca RD',firstAidLibraryTitle:'Biblioteca First Aid',qbankUworldTitle:'Banco de Questões UWorld',qbankRdTitle:'Banco de Questões RD',uwFolderTitle:'Banco de Questões - UWorld',uwPass1:'1ª Passada',uwPass2:'2ª Passada',uwPass3:'3ª Passada',uwPass4:'4ª Passada',pass1Name:'Aprendizado',pass2Name:'Consolidação',pass3Name:'Refinamento',pass4Name:'Domínio Total',uwQuestionsAnswered:'Questões Respondidas',uwOnlyMissed:'Somente questões que você continua errando',instructionsTitle:'Instruções',step1Uworld:'QBank - UWorld',step1Rd:'QBank - RD',settingsAdmin:'Administrador',settingsUsers:'Usuários',settingsLogin:'Login',settingsPassword:'Senha',settingsUser:'Usuário',settingsPerformance:'Desempenho',settingsEnabled:'Liberado',settingsBlocked:'Bloqueado',settingsReset:'Reset',settingsResetConfirm1:'Você confirma o reset da plataforma do usuário',settingsResetConfirm2:'Tem certeza que confirma o reset da plataforma do usuário',settingsResetConfirm2b:'Este é o último aviso. Todas as informações salvas pelo usuário serão perdidas e a plataforma do usuário será reiniciada do início.',settingsResetDone:'Plataforma resetada com sucesso para o usuário',settingsChangeData:'Alterar Dados',settingsSave:'Salvar',settingsCancel:'Cancelar',settingsDisplayName:'Nome de Usuário',settingsDataSaved:'Dados salvos com sucesso!',settingsQuestionsAnswered:'Questões respondidas',settingsCorrectRate:'Taxa de acerto',settingsCardsTotal:'Total de cards',settingsReviewsDone:'Revisões feitas',settingsNoData:'Sem dados ainda'}
  };
  const PAGE_TITLE_KEYS = {'notebooks':'notebooks','notes':'notes','study-planner':'studyPlanner','video-lectures':'videoLectures','audio-lessons':'audioLessons','library-uworld':'libraryUworldTitle','library-rd':'libraryRdTitle','first-aid-library':'firstAidLibraryTitle','qbank-uworld':'qbankUworldTitle','qbank-rd':'qbankRdTitle','settings':'settings','question-bank':'questionBank','performance':'performanceAnalytics'};
  const $ = (s,root=document)=>root.querySelector(s); const $$=(s,root=document)=>[...root.querySelectorAll(s)];
  function params(){return new URLSearchParams(location.search)}
  function user(){return params().get('u')||sessionStorage.getItem('couplemed_active_user')||'guest1'}
  function page(){return params().get('page')||'home'}
  function preserveUserLinks(){const u=user(); $$('a[href^="app.html"]').forEach(a=>{const url=new URL(a.getAttribute('href'),location.href); url.searchParams.set('u',u); a.href=url.pathname.split('/').pop()+url.search;});}
  function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
  function draw(key,arr){let deck;try{deck=JSON.parse(localStorage.getItem(key)||'[]')}catch(e){deck=[]}if(!Array.isArray(deck)||!deck.length)deck=shuffle([...arr.keys()]);const idx=deck.shift();localStorage.setItem(key,JSON.stringify(deck));return arr[idx]||arr[0]}
  function initLogin(){const form=$('#loginForm'); if(!form)return; form.addEventListener('submit',e=>{e.preventDefault(); const login=$('#login').value.trim().toLowerCase(); const pass=$('#password').value.trim(); const msg=$('#loginMessage'); const u=findUserByCredentials(login,pass); if(!u){msg.textContent='Invalid login or password.';return} if(isUserBlocked(u)){msg.textContent='Your access has been blocked. Contact the administrator.';return} sessionStorage.setItem('couplemed_active_user',u); $('.access-submit').classList.add('loading'); document.body.style.transition='opacity .45s ease'; document.body.style.opacity='.22'; setTimeout(()=>{location.href=(u==='john'||u==='alysson')?`transition.html?u=${u}`:`app.html?u=${u}`},460);});}
  function initTransition(){const q=$('#transitionQuote'); if(!q)return; const u=params().get('u'); if(!['john','alysson'].includes(u)){location.replace('index.html');return} sessionStorage.setItem('couplemed_active_user',u); q.textContent=draw(`couplemed_transition_deck_${u}`,quotes); setTimeout(()=>$('.transition-viewport').classList.add('fading'),6450); setTimeout(()=>location.href=`app.html?u=${u}`,7000);}
  const LIB_TITLE_KEY = {'library-uworld':'libraryUworldTitle','library-rd':'libraryRdTitle'};
  // Nomes reais das pastas de cada biblioteca, na ordem exata solicitada pelo usuário.
  const LIB_FOLDERS = {
    'library-rd': [
      'Biochemistry','Immunology','Microbiology','Pathology','General Pharmacology',
      'Biostatistics','Public Health Science','Cardiovascular','Endocrinology',
      'Gastrointestinal System','Hematology & Oncology',
      'Musculoskeletal, Skin and Connective Tissue','Neurology','Psychiatry',
      'Nephrology','Reproductive System','Pulmonology'
    ]
  };
  // UWorld: 26 pastas, cada uma com sua lista de tópicos (ordem exata do arquivo enviado pelo usuário)
  const UWORLD_STRUCTURE = window.UWORLD_STRUCTURE || [];
  const slugify = s => s.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  function libBack(id,lang){
    history.pushState(null,'',`app.html?page=${id}&u=${user()}`);
    renderLibrary(id,lang);
  }
  function libOpenFolder(id,lang,slug){
    history.pushState(null,'',`app.html?page=${id}&u=${user()}&folder=${slug}`);
    renderLibrary(id,lang);
  }
  function renderLibrary(id,lang){
    const rp=$('#regularPage'); if(!rp) return;
    const titleKey=LIB_TITLE_KEY[id];
    const libTitle=(titleKey&&I18N[lang][titleKey])?I18N[lang][titleKey]:id;
    const folderSlug=params().get('folder');
    const CM=window.CMI18N;
    CM&&CM.bumpToken();

    // UWorld tem 2 níveis: lista de 26 pastas -> lista de tópicos dentro da pasta
    if(id==='library-uworld' && UWORLD_STRUCTURE.length){
      const openFolder = folderSlug ? UWORLD_STRUCTURE.find(f=>slugify(f.name)===folderSlug) : null;
      if(openFolder){
        const items=openFolder.items.map(topic=>
          `<a class="lib-book lib-topic" href="#" data-no-nav>${CM?CM.span(topic):topic}</a>`
        ).join('');
        rp.innerHTML=`<button type="button" class="lib-back" id="libBackBtn">‹ ${libTitle}</button><h1 id="internalTitle">${CM?CM.span(openFolder.name):openFolder.name}</h1><div class="lib-list">${items}</div>`;
        rp.querySelectorAll('.lib-topic[data-no-nav]').forEach(a=>a.addEventListener('click',e=>e.preventDefault()));
        $('#libBackBtn').addEventListener('click',()=>libBack(id,lang));
        CM&&CM.translateAllVisible(rp);
        return;
      }
      const folders=UWORLD_STRUCTURE.map(folder=>{
        const slug=slugify(folder.name);
        return `<a class="lib-book" href="app.html?page=${id}&u=${user()}&folder=${slug}" data-folder-slug="${slug}">${CM?CM.span(folder.name):folder.name}</a>`;
      }).join('');
      rp.innerHTML=`<h1 id="internalTitle">${libTitle}</h1><div class="lib-list">${folders}</div>`;
      rp.querySelectorAll('.lib-list a[data-folder-slug]').forEach(a=>{
        a.addEventListener('click',e=>{e.preventDefault(); libOpenFolder(id,lang,a.dataset.folderSlug);});
      });
      CM&&CM.translateAllVisible(rp);
      return;
    }

    // RD (e demais bibliotecas simples): 1 nível, lista direta
    const folders=(LIB_FOLDERS[id]||[]).map(name=>{
      const slug=slugify(name);
      const pageLink=`${id.replace('library-','')}-${slug}`;
      return `<a class="lib-book" href="app.html?page=${pageLink}&u=${user()}" data-page-link="${pageLink}">${CM?CM.span(name):name}</a>`;
    }).join('');
    rp.innerHTML=`<h1 id="internalTitle">${libTitle}</h1><div class="lib-list">${folders}</div>`;
    CM&&CM.translateAllVisible(rp);
  }
  function renderStep1(lang){
    const rp=$('#regularPage'); if(!rp) return;
    rp.innerHTML=`<div class="step1-page">
      <h1 id="internalTitle" class="step1-title"></h1>
      <div class="step1-bars">
        <a class="step1-bar step1-bar-uworld" href="app.html?page=qbank-uworld&u=${user()}" data-page-link="qbank-uworld">${I18N[lang].step1Uworld}</a>
        <a class="step1-bar step1-bar-rd" href="app.html?page=qbank-rd&u=${user()}" data-page-link="qbank-rd">${I18N[lang].step1Rd}</a>
      </div>
    </div>`;
    $('#internalTitle').textContent=I18N[lang].instructionsTitle;
  }
  /* ============================== SETTINGS PAGE ==============================
     Admin (john): vê todos os usuários, seus dados originais, botão de
     performance analytics, toggle liberado/bloqueado, e botão de reset.
     Demais usuários: vêem apenas seus próprios dados com opção de alterar. */

  function getPerformanceData(uid){
    const result={qbank:{total:0,correct:0},flashcards:{cards:0,reviews:0}};
    try{
      const qb=JSON.parse(localStorage.getItem('couplemed_qb_'+uid)||'{}');
      if(qb&&qb.answers){
        const answers=Array.isArray(qb.answers)?qb.answers:Object.values(qb.answers||{});
        result.qbank.total=answers.length;
        result.qbank.correct=answers.filter(a=>a.correct||a.isCorrect).length;
      }
      /* fallback: try flat arrays */
      if(result.qbank.total===0&&qb){
        const keys=Object.keys(qb);
        keys.forEach(k=>{
          if(qb[k]&&typeof qb[k]==='object'&&qb[k].answered!==undefined){
            result.qbank.total++;
            if(qb[k].correct||qb[k].isCorrect)result.qbank.correct++;
          }
        });
      }
    }catch(e){}
    try{
      const fc=JSON.parse(localStorage.getItem('couplemed_fc_'+uid)||'{}');
      if(fc){
        const decks=fc.decks||[];
        decks.forEach(d=>{
          const cards=d.cards||[];
          result.flashcards.cards+=cards.length;
          cards.forEach(c=>{result.flashcards.reviews+=(c.reps||0)});
        });
      }
    }catch(e){}
    return result;
  }

  function resetUserPlatform(uid,lang){
    const name=getUserDisplay(uid);
    const t=I18N[lang];
    const msg1=t.settingsResetConfirm1+' '+name+'?';
    if(!confirm(msg1))return;
    const msg2=t.settingsResetConfirm2+' '+name+'?\n\n'+t.settingsResetConfirm2b;
    if(!confirm(msg2))return;
    /* Remove all user-scoped localStorage keys */
    const prefixes=['couplemed_qb_'+uid,'couplemed_fc_'+uid,'couplemed_lang_current_'+uid,'couplemed_transition_deck_'+uid,'couplemed_user_custom_'+uid];
    const toRemove=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(prefixes.some(p=>k===p||k.startsWith(p+'_')))toRemove.push(k);
    }
    toRemove.forEach(k=>localStorage.removeItem(k));
    alert(t.settingsResetDone+' '+name+'.');
    renderSettings(lang);
  }

  function renderPerformancePanel(uid,lang){
    const t=I18N[lang];
    const data=getPerformanceData(uid);
    const pct=data.qbank.total>0?Math.round((data.qbank.correct/data.qbank.total)*100):0;
    return `<div class="stg-perf-panel">
      <div class="stg-perf-section">
        <h4>QBank</h4>
        ${data.qbank.total>0?`<p>${t.settingsQuestionsAnswered}: <strong>${data.qbank.total}</strong></p><p>${t.settingsCorrectRate}: <strong>${pct}%</strong></p>`:`<p class="stg-no-data">${t.settingsNoData}</p>`}
      </div>
      <div class="stg-perf-section">
        <h4>Flashcards</h4>
        ${data.flashcards.cards>0?`<p>${t.settingsCardsTotal}: <strong>${data.flashcards.cards}</strong></p><p>${t.settingsReviewsDone}: <strong>${data.flashcards.reviews}</strong></p>`:`<p class="stg-no-data">${t.settingsNoData}</p>`}
      </div>
    </div>`;
  }

  function renderSettings(lang){
    const rp=$('#regularPage'); if(!rp)return;
    const t=I18N[lang];
    const u=user();
    const isAdmin=USER_META[u]&&USER_META[u].role==='admin';

    if(isAdmin){
      /* ======= ADMIN VIEW ======= */
      const me=USER_META[u];
      let html=`<h1 id="internalTitle">${t.settings}</h1>`;
      html+=`<div class="stg-admin-card stg-admin-self">
        <div class="stg-admin-badge">${t.settingsAdmin}</div>
        <div class="stg-info-row"><span class="stg-label">${t.settingsUser}:</span> <span class="stg-value">${me.displayName}</span></div>
        <div class="stg-info-row"><span class="stg-label">${t.settingsLogin}:</span> <span class="stg-value">${me.originalLogin}</span></div>
        <div class="stg-info-row"><span class="stg-label">${t.settingsPassword}:</span> <span class="stg-value stg-pass">${me.originalPass}</span></div>
      </div>`;
      html+=`<h2 class="stg-section-title">${t.settingsUsers}</h2>`;
      Object.keys(USER_META).forEach(uid=>{
        if(uid===u)return; /* skip self */
        const m=USER_META[uid];
        const custom=getUserCustom(uid);
        const blocked=isUserBlocked(uid);
        const displayName=getUserDisplay(uid);
        html+=`<div class="stg-admin-card stg-user-card" data-uid="${uid}">
          <div class="stg-user-header">
            <div class="stg-user-name">${displayName}</div>
            <div class="stg-user-actions">
              <button class="stg-btn stg-btn-perf" data-action="perf" data-uid="${uid}">${t.settingsPerformance}</button>
              <div class="stg-toggle-wrap">
                <button class="stg-toggle ${blocked?'stg-toggle-off':'stg-toggle-on'}" data-action="toggle" data-uid="${uid}">
                  <span class="stg-toggle-knob"></span>
                  <span class="stg-toggle-label">${blocked?t.settingsBlocked:t.settingsEnabled}</span>
                </button>
              </div>
              <button class="stg-btn stg-btn-reset" data-action="reset" data-uid="${uid}">${t.settingsReset}</button>
            </div>
          </div>
          <div class="stg-info-row"><span class="stg-label">${t.settingsLogin}:</span> <span class="stg-value">${m.originalLogin}</span></div>
          <div class="stg-info-row"><span class="stg-label">${t.settingsPassword}:</span> <span class="stg-value stg-pass">${m.originalPass}</span></div>
          ${custom?`<div class="stg-custom-note">
            <span class="stg-custom-badge">Custom</span>
            ${custom.displayName?`<div class="stg-info-row"><span class="stg-label">${t.settingsDisplayName}:</span> <span class="stg-value">${custom.displayName}</span></div>`:''}
            ${custom.login?`<div class="stg-info-row"><span class="stg-label">${t.settingsLogin}:</span> <span class="stg-value">${custom.login}</span></div>`:''}
            ${custom.password?`<div class="stg-info-row"><span class="stg-label">${t.settingsPassword}:</span> <span class="stg-value stg-pass">${custom.password}</span></div>`:''}
          </div>`:''}
          <div class="stg-perf-container" id="stgPerf_${uid}" hidden></div>
        </div>`;
      });
      rp.innerHTML=html;

      /* Wire admin buttons */
      rp.querySelectorAll('[data-action="perf"]').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const uid=btn.dataset.uid;
          const panel=$('#stgPerf_'+uid);
          if(!panel)return;
          if(!panel.hidden){panel.hidden=true;btn.classList.remove('active');return}
          panel.innerHTML=renderPerformancePanel(uid,lang);
          panel.hidden=false;
          btn.classList.add('active');
        });
      });
      rp.querySelectorAll('[data-action="toggle"]').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const uid=btn.dataset.uid;
          const nowBlocked=isUserBlocked(uid);
          setUserBlocked(uid,!nowBlocked);
          renderSettings(lang);
        });
      });
      rp.querySelectorAll('[data-action="reset"]').forEach(btn=>{
        btn.addEventListener('click',()=>resetUserPlatform(btn.dataset.uid,lang));
      });

    } else {
      /* ======= REGULAR USER VIEW ======= */
      const m=USER_META[u];
      if(!m){rp.innerHTML=`<h1 id="internalTitle">${t.settings}</h1>`;return}
      const custom=getUserCustom(u);
      const currentName=custom&&custom.displayName?custom.displayName:m.displayName;
      const currentLogin=custom&&custom.login?custom.login:m.originalLogin;
      const currentPass=custom&&custom.password?custom.password:m.originalPass;

      let html=`<h1 id="internalTitle">${t.settings}</h1>`;
      html+=`<div class="stg-user-self-card" id="stgUserView">
        <div class="stg-info-row"><span class="stg-label">${t.settingsDisplayName}:</span> <span class="stg-value" id="stgShowName">${currentName}</span></div>
        <div class="stg-info-row"><span class="stg-label">${t.settingsLogin}:</span> <span class="stg-value" id="stgShowLogin">${currentLogin}</span></div>
        <div class="stg-info-row"><span class="stg-label">${t.settingsPassword}:</span> <span class="stg-value stg-pass" id="stgShowPass">${currentPass}</span></div>
        <button class="stg-btn stg-btn-edit" id="stgEditBtn">${t.settingsChangeData}</button>
      </div>
      <div class="stg-user-self-card stg-edit-form" id="stgUserEdit" hidden>
        <div class="stg-field"><label>${t.settingsDisplayName}</label><input type="text" id="stgEditName" value="${currentName.replace(/"/g,'&quot;')}" /></div>
        <div class="stg-field"><label>${t.settingsLogin}</label><input type="text" id="stgEditLogin" value="${currentLogin.replace(/"/g,'&quot;')}" /></div>
        <div class="stg-field"><label>${t.settingsPassword}</label><input type="text" id="stgEditPass" value="${currentPass.replace(/"/g,'&quot;')}" /></div>
        <div class="stg-edit-actions">
          <button class="stg-btn stg-btn-save" id="stgSaveBtn">${t.settingsSave}</button>
          <button class="stg-btn stg-btn-cancel" id="stgCancelBtn">${t.settingsCancel}</button>
        </div>
        <div class="stg-msg" id="stgMsg" hidden></div>
      </div>`;
      rp.innerHTML=html;

      $('#stgEditBtn').addEventListener('click',()=>{
        $('#stgUserView').hidden=true;
        $('#stgUserEdit').hidden=false;
      });
      $('#stgCancelBtn').addEventListener('click',()=>{
        $('#stgUserEdit').hidden=true;
        $('#stgUserView').hidden=false;
      });
      $('#stgSaveBtn').addEventListener('click',()=>{
        const newName=$('#stgEditName').value.trim();
        const newLogin=$('#stgEditLogin').value.trim();
        const newPass=$('#stgEditPass').value.trim();
        if(!newName||!newLogin||!newPass){return}
        setUserCustom(u,{displayName:newName,login:newLogin,password:newPass});
        const msg=$('#stgMsg');
        msg.textContent=t.settingsDataSaved;
        msg.hidden=false;
        msg.classList.add('stg-msg-success');
        setTimeout(()=>renderSettings(lang),1200);
      });
    }
  }

  function buildBooks(){}
  function qCount(){return Number(localStorage.getItem('couplemed_qbank_uworld_total')||0)}
  function updateRoundLabels(){const n=qCount(); $$('[data-round-label]').forEach(el=>{const r=el.dataset.roundLabel; el.textContent=`${r} Pass — ${n} questions`;});}
  const COMING_SOON_PAGES=['qbank-rd','step-2','step-3','languages','observership','residency-match','links'];
  const QBANK_PAGES=['qbank-uworld','uworld-pass-1','uworld-pass-2','uworld-pass-3','uworld-pass-4','library-uworld','library-rd'];
  function updateDynamicContent(lang){
    const p=page(); if(p==='home')return;
    if(p==='settings'){ renderSettings(lang); return; }
    if(p==='step-1'){ renderStep1(lang); return; }
    if(LIB_TITLE_KEY[p]){ renderLibrary(p,lang); return; }
    if(QBANK_PAGES.includes(p))return; // qbank.js monta e traduz sozinho
    const isCS=COMING_SOON_PAGES.includes(p);
    const isModule=p==='flashcards'||p==='ai-tutor';
    if(isCS||isModule)return;
    const title=$('#internalTitle');
    if(title){const key=PAGE_TITLE_KEYS[p]; title.textContent=(key&&I18N[lang][key])?I18N[lang][key]:p.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');}
  }
  function setLang(lang){sessionStorage.setItem(`couplemed_lang_current_${user()}`,lang); document.documentElement.lang=lang==='pt'?'pt-BR':'en'; $$('[data-i18n]').forEach(el=>{const k=el.dataset.i18n; if(I18N[lang][k]!==undefined)el.textContent=I18N[lang][k];}); $$('[data-i18n-html]').forEach(el=>{const k=el.dataset.i18nHtml; if(I18N[lang][k]!==undefined)el.innerHTML=I18N[lang][k];}); updateDynamicContent(lang);}
  function initPlatform(){if(!document.body.classList.contains('platform-page'))return; preserveUserLinks(); buildBooks(); updateRoundLabels(); const p=page(); document.body.dataset.page=p; if(p!=='home'){document.body.classList.add('internal'); $('#homeDashboard').hidden=true; $('#internalContent').hidden=false;
    const isQBank=QBANK_PAGES.includes(p);
    const isCS=COMING_SOON_PAGES.includes(p);
    const isModule=p==='flashcards'||p==='ai-tutor'||isQBank;
    const cs=$('#comingSoonPage'); const rp=$('#regularPage');
    if(cs) cs.hidden=true;
    if(isCS){if(cs)cs.hidden=false; if(rp)rp.hidden=true;}
    else{if(rp)rp.hidden=false;}
  } else {document.body.classList.remove('internal');}
    $$('[data-toggle]').forEach(btn=>btn.addEventListener('click',()=>{const el=$('#'+btn.dataset.toggle); if(el)el.classList.toggle('open');}));
    $$('[data-page-link]').forEach(a=>{if(a.dataset.pageLink===p){a.classList.add('active'); let anc=a.closest('.submenu'); while(anc){anc.classList.add('open'); anc=anc.parentElement?anc.parentElement.closest('.submenu'):null;}}});
    // itens de menu que são link (navegam) E toggle (abrem submenu) ao mesmo tempo: ao navegar
    // para a própria página do item (ex: Step 1 -> step-1), o submenu deve ficar aberto, já que
    // o data-page-link acima só cobre os links FILHOS do submenu, não o pai que os contém.
    $$('[data-toggle][data-page-link]').forEach(btn=>{ if(btn.dataset.pageLink===p){ const el=$('#'+btn.dataset.toggle); if(el)el.classList.add('open'); } });
    $$('.flag-button').forEach(btn=>btn.addEventListener('click',()=>setLang(btn.dataset.lang))); setLang(sessionStorage.getItem(`couplemed_lang_current_${user()}`)==='pt'?'pt':'en');
    const applyTheme=t=>document.body.classList.toggle('light',t!=='dark'); applyTheme(p==='home'?'dark':'light'); const theme=$('#themeToggle'); if(theme)theme.addEventListener('click',()=>applyTheme(document.body.classList.contains('light')?'dark':'light'));
    const mobile=$('#mobileMenuButton'), side=$('#sidebar'), scrim=$('#sidebarScrim'); if(mobile)mobile.addEventListener('click',()=>{side.classList.add('open');scrim.classList.add('open')}); if(scrim)scrim.addEventListener('click',()=>{side.classList.remove('open');scrim.classList.remove('open')});
    const logout=$('#logoutLink'); if(logout)logout.addEventListener('click',()=>sessionStorage.removeItem('couplemed_active_user'));
    initSiteSearch();
    /* — QBank sidebar: atualiza "0 / XXXX" com SEED.length real — */
    (function(){var t=window.QBANK_TOTAL||0;if(!t)return;document.querySelectorAll('.bar-count').forEach(function(el){var m=el.textContent.match(/^(\d+)\s*\//);el.textContent=(m?m[1]:'0')+' / '+t;});})();
  }

  /* ============================== BUSCA GLOBAL ==============================
     Estilo Spotlight/Google: cobre TUDO que existe na plataforma — menu,
     Medical Library (UWorld/RD, pastas e tópicos), QBank (questões e notas do
     notebook do usuário) e Flashcards (decks e cards). Novo conteúdo criado
     pelo usuário entra automaticamente, pois o índice é reconstruído a cada
     busca lendo os dados atuais (localStorage) via "providers" que cada módulo
     expõe em window.CMSearchProviders — sem acoplamento entre os arquivos.

     Bilíngue e rápido: a query é comparada contra o texto original em inglês
     E contra qualquer tradução já em cache (window.CMI18N). Além disso, se a
     query não achar nada tentando casar direto, ela é traduzida uma vez
     (EN<->PT, uma única chamada de API) e a busca é refeita — isso cobre o
     caso de o usuário digitar um termo que nunca apareceu traduzido antes. */
  function normalizeSearch(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  }
  function buildSearchIndex(){
    const idx = [];
    const seen = new Set();
    const addLink = (a, catOverride) => {
      const href = a.getAttribute('href');
      if(!href || !href.startsWith('app.html')) return;
      const label = a.textContent.trim();
      if(!label) return;
      const key = label+'|'+href;
      if(seen.has(key)) return;
      seen.add(key);
      idx.push({ label, snippetSource:'', href, cat: catOverride || 'Menu' });
    };
    // menu lateral + cards de ação da dashboard — todo ponto de navegação clicável
    $$('[data-page-link]').forEach(a=>addLink(a));
    $$('.mini-card.action').forEach(a=>addLink(a));
    // Medical Library — UWorld: 26 pastas + 1838 tópicos dentro delas
    UWORLD_STRUCTURE.forEach(folder=>{
      const slug = slugify(folder.name);
      idx.push({ label: folder.name, snippetSource:'', href: `app.html?page=library-uworld&u=${user()}&folder=${slug}`, cat: 'Medical Library · UWorld' });
      folder.items.forEach(topic=>{
        idx.push({ label: topic, snippetSource:'', href: `app.html?page=library-uworld&u=${user()}&folder=${slug}`, cat: `UWorld · ${folder.name}` });
      });
    });
    // Medical Library — RD: 17 pastas
    (LIB_FOLDERS['library-rd']||[]).forEach(name=>{
      idx.push({ label: name, snippetSource:'', href: `app.html?page=library-rd&u=${user()}`, cat: 'Medical Library · RD' });
    });
    // conteúdo dinâmico do usuário: QBank (questões + notebook) e Flashcards (decks + cards),
    // lido sob demanda dos módulos correspondentes — sempre reflete o estado atual.
    const providers = window.CMSearchProviders || {};
    ['qbank','flashcards'].forEach(name=>{
      if(typeof providers[name] !== 'function') return;
      try{ providers[name]().forEach(item=>idx.push(item)); }catch(e){}
    });
    return idx;
  }

  // gera um trecho (estilo Google) ao redor do ponto onde o termo foi encontrado
  function makeSnippet(text, qNorm, maxLen){
    maxLen = maxLen || 140;
    if(!text) return '';
    const norm = normalizeSearch(text);
    const pos = norm.indexOf(qNorm);
    if(pos === -1) return text.slice(0, maxLen) + (text.length>maxLen?'…':'');
    const start = Math.max(0, pos - 50);
    const end = Math.min(text.length, pos + qNorm.length + 90);
    let snippet = text.slice(start, end);
    if(start>0) snippet = '…' + snippet;
    if(end<text.length) snippet += '…';
    return snippet;
  }

  // tenta casar a query contra o label, o snippetSource (texto completo do item) e
  // qualquer tradução já em cache (PT<->EN) — cobre busca nos dois idiomas sem
  // precisar retraduzir nada que já foi visto antes.
  function itemMatchesQuery(item, qNorm){
    if(normalizeSearch(item.label).includes(qNorm)) return {field:'label'};
    if(item.snippetSource && normalizeSearch(item.snippetSource).includes(qNorm)) return {field:'snippet'};
    const CM = window.CMI18N;
    if(CM && CM.getCached){
      const cachedLabelPt = CM.getCached(item.label, 'pt');
      if(cachedLabelPt && normalizeSearch(cachedLabelPt).includes(qNorm)) return {field:'label'};
      if(item.snippetSource){
        const cachedSnippetPt = CM.getCached(item.snippetSource, 'pt');
        if(cachedSnippetPt && normalizeSearch(cachedSnippetPt).includes(qNorm)) return {field:'snippet', translated:cachedSnippetPt};
      }
    }
    return null;
  }

  function renderResults(results, matches, qNorm){
    if(!matches.length){
      const curLang = document.documentElement.lang==='pt-BR' ? 'pt' : 'en';
      results.innerHTML = `<div class="search-empty">${curLang==='pt'?'Nada encontrado.':'Nothing found.'}</div>`;
      results.hidden = false;
      return;
    }
    const byCat = {};
    matches.forEach(m=>{ (byCat[m.cat] = byCat[m.cat]||[]).push(m); });
    let html = '';
    Object.keys(byCat).forEach(cat=>{
      html += `<div class="search-result-cat">${cat}</div>`;
      byCat[cat].forEach(m=>{
        const snippetText = m.match && m.match.field==='snippet'
          ? makeSnippet(m.match.translated || m.snippetSource, qNorm)
          : '';
        html += `<a class="search-result-item" href="${m.href}"><span class="search-result-title">${m.label}</span>${snippetText?`<span class="search-result-snippet">${snippetText}</span>`:''}</a>`;
      });
    });
    results.innerHTML = html;
    results.hidden = false;
  }

  function initSiteSearch(){
    const wrap = $('.site-search'), toggle = $('#siteSearchToggle'), input = $('#siteSearchInput'), results = $('#siteSearchResults');
    if(!wrap || !toggle || !input || !results) return;
    if(wrap.dataset.wired) return; // evita múltiplos binds entre re-renders
    wrap.dataset.wired = '1';

    function openSearch(){ wrap.classList.add('open'); input.focus(); }
    function closeSearch(){ wrap.classList.remove('open'); results.hidden = true; input.value=''; }
    toggle.addEventListener('click', ()=>{ wrap.classList.contains('open') ? closeSearch() : openSearch(); });
    document.addEventListener('click', e=>{ if(!wrap.contains(e.target)) closeSearch(); });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeSearch(); });

    let debounceTimer=null, searchToken=0;
    input.addEventListener('input', ()=>{
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, 120);
    });

    async function runSearch(){
      const myToken = ++searchToken;
      const raw = input.value;
      const qNorm = normalizeSearch(raw);
      if(qNorm.length < 2){ results.hidden = true; results.innerHTML=''; return; }
      // índice reconstruído a cada busca — reflete conteúdo criado pelo usuário em tempo real
      const idx = buildSearchIndex();
      let matches = idx.map(item=>{
        const m = itemMatchesQuery(item, qNorm);
        return m ? Object.assign({}, item, {match:m}) : null;
      }).filter(Boolean).slice(0,30);

      if(matches.length){ renderResults(results, matches, qNorm); return; }

      // nada encontrado com correspondência direta/cache — tenta traduzir a PRÓPRIA
      // query uma vez (rápido, uma chamada) e busca de novo com o termo traduzido,
      // cobrindo o caso de o usuário digitar em português algo nunca visto em cache.
      const CM = window.CMI18N;
      if(!CM){ renderResults(results, [], qNorm); return; }
      const curLang = document.documentElement.lang==='pt-BR' ? 'pt' : 'en';
      const otherLang = curLang==='pt' ? 'en' : 'pt';
      const translatedQuery = await CM.translateText(raw, otherLang, curLang);
      if(searchToken !== myToken) return; // usuário já digitou algo novo
      const qNorm2 = normalizeSearch(translatedQuery);
      if(qNorm2 && qNorm2 !== qNorm){
        matches = idx.map(item=>{
          const m = itemMatchesQuery(item, qNorm2);
          return m ? Object.assign({}, item, {match:m}) : null;
        }).filter(Boolean).slice(0,30);
      }
      renderResults(results, matches, qNorm2 || qNorm);
    }
  }
  initLogin(); initTransition(); initPlatform();
})();
