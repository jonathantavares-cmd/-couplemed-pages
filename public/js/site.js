/* CoupleMed v36 — 2026-07-07

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
  /* v53 — As senhas saíram daqui.
     Até a v52 a constante USERS trazia as seis senhas em texto puro, e
     qualquer pessoa lia o arquivo abrindo couplemed.com/js/site.js. Agora a
     conferência acontece no servidor (POST /api/login) contra um hash PBKDF2
     na tabela `users` do D1. Este arquivo não conhece senha nenhuma.

     USER_META guarda só o que é cosmético e serve de fallback se o servidor
     ainda não respondeu: nome exibido, papel e o login original. */
  const USER_META = {
    john:    { displayName:'John',    role:'admin', originalLogin:'jonathan.tavares@hotmail.com' },
    alysson: { displayName:'Alysson', role:'user',  originalLogin:'alyssonaranha@gmail.com' },
    guest1:  { displayName:'Guest 1', role:'user',  originalLogin:'guest1' },
    guest2:  { displayName:'Guest 2', role:'user',  originalLogin:'guest2' },
    guest3:  { displayName:'Guest 3', role:'user',  originalLogin:'guest3' },
    guest4:  { displayName:'Guest 4', role:'user',  originalLogin:'guest4' }
  };
  /* Cache local dos usuários vindos do servidor (/api/me e /api/users).
     Existe para que todo o código síncrono já escrito continue funcionando sem
     virar async. Não é fonte de verdade: é uma fotografia do D1. */
  const USERS_CACHE_KEY = 'couplemed_users_cache';
  function usersCache(){try{return JSON.parse(localStorage.getItem(USERS_CACHE_KEY))||{}}catch(e){return {}}}
  function setUsersCache(o){try{localStorage.setItem(USERS_CACHE_KEY,JSON.stringify(o))}catch(e){}}
  function cacheUser(u){const c=usersCache();c[u.uid]={displayName:u.displayName||u.display_name,login:u.login,role:u.role,blocked:!!u.blocked};setUsersCache(c);}
  function getUserCustom(uid){const c=usersCache()[uid];return c?{displayName:c.displayName,login:c.login}:null}

  /* ---- ponte com a API de usuários (v53) ---- */
  async function cmSaveUser({uid,displayName,login,newPassword}){
    try{
      const r=await fetch('/api/users/update',{method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({uid,displayName,login,newPassword:newPassword||''})});
      if(r.ok){ const c=usersCache(); c[uid]={...(c[uid]||{}),displayName,login}; setUsersCache(c); return {ok:true}; }
      let e='unknown'; try{ e=(await r.json()).error||e; }catch(_){}
      return {ok:false,error:e};
    }catch(err){ return {ok:false,error:'network'}; }
  }

  function cmUserErr(code){
    return ({
      login_taken:        'Este login já pertence a outro usuário.',
      password_too_short: 'A senha precisa ter ao menos 6 caracteres.',
      forbidden:          'Você não tem permissão para isso.',
      unauthenticated:    'Sessão expirada. Faça login novamente.',
      network:            'Erro de conexão. Tente de novo.'
    })[code] || 'Não foi possível salvar.';
  }

  /* Recarrega a lista de usuários do servidor para o cache local.
     Só o admin recebe 200 aqui; para os demais o 403 é esperado e ignorado. */
  async function cmRefreshUsers(){
    try{
      const r=await fetch('/api/users',{credentials:'same-origin'});
      if(!r.ok)return false;
      const {users}=await r.json();
      const c={}; (users||[]).forEach(u=>{c[u.uid]={displayName:u.display_name,login:u.login,role:u.role,blocked:!!u.blocked}});
      setUsersCache(c); return true;
    }catch(e){ return false; }
  }
  window.cmRefreshUsers = cmRefreshUsers;

  /* ===== PREFERÊNCIAS DO USUÁRIO (v51/v52) — couplemed_prefs_<uid> =====
     Apenas o ESTADO INICIAL do site para aquele usuário. Nenhum controle existente
     é removido: o botão de tema e as bandeiras no topo continuam funcionando, e o
     Create Test / revisão de flashcards seguem livres para alterar a qualquer momento.
     v52: Tutor e Temporizador viraram switches independentes (antes eram um "mode"
     exclusivo) — dados antigos com só "mode" salvo são migrados na leitura.
     Formato: { theme:'dark'|'light', lang:'en'|'pt',
                qbank:{ tutor:bool, timed:bool, count:n, peer:bool },
                flashcards:{ order:'due'|'random'|'sequential', reversed:bool } } */
  const PREFS_DEFAULT={theme:'',lang:'',qbank:{tutor:true,timed:false,count:10,peer:true},flashcards:{order:'due',reversed:false}};
  function getPrefs(uid){
    let p={};
    try{ p=JSON.parse(localStorage.getItem('couplemed_prefs_'+uid))||{}; }catch(e){ p={}; }
    const qb = p.qbank||{};
    return {
      theme: p.theme==='dark'||p.theme==='light' ? p.theme : '',
      lang:  p.lang==='pt'||p.lang==='en' ? p.lang : '',
      qbank:{
        tutor: qb.tutor!=null ? !!qb.tutor : (qb.mode!=='timed'),
        timed: qb.timed!=null ? !!qb.timed : (qb.mode==='timed'),
        count: Math.max(1,Math.min(40,parseInt(qb.count,10)||10)),
        peer:  !(qb.peer===false)
      },
      flashcards:{
        order: (p.flashcards&&['due','random','sequential'].includes(p.flashcards.order))?p.flashcards.order:'due',
        reversed: !!(p.flashcards&&p.flashcards.reversed)
      }
    };
  }
  function setPrefs(uid,data){localStorage.setItem('couplemed_prefs_'+uid,JSON.stringify(data))}
  function touchLastAccess(uid){try{localStorage.setItem('couplemed_last_access_'+uid,new Date().toISOString())}catch(e){}}
  function getLastAccess(uid){try{return localStorage.getItem('couplemed_last_access_'+uid)||''}catch(e){return ''}}
  function isUserBlocked(uid){const c=usersCache()[uid];return !!(c&&c.blocked)}
  async function setUserBlocked(uid,blocked){
    const r=await fetch('/api/users/blocked',{method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({uid,blocked})});
    if(!r.ok)throw new Error('blocked_failed');
    const c=usersCache(); if(c[uid]){c[uid].blocked=!!blocked; setUsersCache(c);}
  }
  function getUserDisplay(uid){const c=getUserCustom(uid);return(c&&c.displayName)?c.displayName:(USER_META[uid]?USER_META[uid].displayName:uid)}
  /* findUserByCredentials() foi removida. A comparação de senha agora é feita
     pelo servidor — ver initLogin(). O navegador nunca vê a senha correta. */

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
    en: {home:'Home',myWorkspace:'My Workspace',notebooks:'Notebooks',notes:'Notes',studyPlanner:'Study Planner',studyMaterials:'Study Materials',medicalLibrary:'Medical Library',languages:'Languages',settings:'Settings',logout:'Logout',videoLectures:'Video Lectures',audioLessons:'Audio Lessons',aiTutorLabel:'AI Tutor',observership:'Observership',residencyMatch:'Residency Match',linksLabel:'Links',studyStreak:'STUDY<br>STREAK',oneDay:'1 Day',keepGoing:'Keep it going!',qbankProgress:'QBank 1 - Progress',pass1:'1 Pass',pass2:'2 Pass',pass3:'3 Pass',continueBtn:'Continue',questionBank:'QBank',flashcardsLabel:'Flashcards',performanceAnalytics:'Performance Analytics',library1Title:'Library 1',library2Title:'Library 2',library3Title:'Library 3',qbank1Title:'QBank 1',qbank2Title:'QBank 2',library1FolderTitle:'QBank 1',qbank1Pass1:'1 Pass',qbank1Pass2:'2 Pass',qbank1Pass3:'3 Pass',qbank1Pass4:'4 Pass',pass1Name:'Learning',pass2Name:'Consolidation',pass3Name:'Refinement',pass4Name:'Total Mastery',qbank1QuestionsAnswered:'Questions Answered',qbank1OnlyMissed:'Only questions you keep missing',instructionsTitle:'Instructions',step1Qbank1:'QBank 1',step1Qbank2:'QBank 2',settingsAdmin:'Administrator',settingsUsers:'Users',settingsLogin:'Login',settingsPassword:'Password',settingsUser:'User',settingsPerformance:'Performance',settingsEnabled:'Enabled',settingsBlocked:'Blocked',settingsReset:'Reset',settingsResetConfirm1:'Do you confirm the reset of the platform for user',settingsResetConfirm2:'Are you sure you confirm the reset of the platform for user',settingsResetConfirm2b:'This is the last warning. All saved information will be lost and the platform will be restarted from scratch.',settingsResetDone:'Platform reset successfully for user',settingsChangeData:'Change Data',settingsSave:'Save',settingsCancel:'Cancel',settingsDisplayName:'Username',settingsDataSaved:'Data saved successfully!',settingsQuestionsAnswered:'Questions answered',settingsCorrectRate:'Correct rate',settingsCardsTotal:'Total cards',settingsReviewsDone:'Reviews done',settingsNoData:'No data yet',settingsShowPass:'Show',settingsHidePass:'Hide',timeToday:'Today',timeWeek:'7 days',timeTotal:'Total',streakRecord:'Record',streakQuestions:'Questions',streakFlash:'Flashcards',streakRisk:'Study today to keep it!',streakRestart:'Start again today!',streakStart:'Start today!',dayOne:'Day',dayMany:'Days',weekLetters:'M,T,W,T,F,S,S',wsSubtitle:'Everything you need to organize your studies, in one place.',wsNotebooksDesc:'Structured notebooks for each subject and system.',wsNotesDesc:'Quick notes and annotations you capture while studying.',wsPlannerDesc:'Plan your passes, set targets and track your schedule.',wsLinksDesc:'Your saved references, resources and external tools.'},
    pt: {home:'Home',myWorkspace:'Meu Espaço de Trabalho',notebooks:'Cadernos',notes:'Anotações',studyPlanner:'Planejador de Estudos',studyMaterials:'Materiais de Estudo',medicalLibrary:'Biblioteca Médica',languages:'Idiomas',settings:'Configurações',logout:'Sair',videoLectures:'Aulas em Vídeo',audioLessons:'Aulas em Áudio',aiTutorLabel:'AI Tutor',observership:'Observership',residencyMatch:'Residency Match',linksLabel:'Links',studyStreak:'SEQUÊNCIA<br>DE ESTUDOS',oneDay:'1 Dia',keepGoing:'Continue assim!',qbankProgress:'QBank 1 - Progresso',pass1:'1ª Passada',pass2:'2ª Passada',pass3:'3ª Passada',continueBtn:'Continuar',questionBank:'Banco de Questões',flashcardsLabel:'Flashcards',performanceAnalytics:'Análise de Desempenho',library1Title:'Library 1',library2Title:'Library 2',library3Title:'Library 3',qbank1Title:'Banco de Questões 1',qbank2Title:'Banco de Questões 2',library1FolderTitle:'Banco de Questões 1',qbank1Pass1:'1ª Passada',qbank1Pass2:'2ª Passada',qbank1Pass3:'3ª Passada',qbank1Pass4:'4ª Passada',pass1Name:'Aprendizado',pass2Name:'Consolidação',pass3Name:'Refinamento',pass4Name:'Domínio Total',qbank1QuestionsAnswered:'Questões Respondidas',qbank1OnlyMissed:'Somente questões que você continua errando',instructionsTitle:'Instruções',step1Qbank1:'QBank 1',step1Qbank2:'QBank 2',settingsAdmin:'Administrador',settingsUsers:'Usuários',settingsLogin:'Login',settingsPassword:'Senha',settingsUser:'Usuário',settingsPerformance:'Desempenho',settingsEnabled:'Liberado',settingsBlocked:'Bloqueado',settingsReset:'Reset',settingsResetConfirm1:'Você confirma o reset da plataforma do usuário',settingsResetConfirm2:'Tem certeza que confirma o reset da plataforma do usuário',settingsResetConfirm2b:'Este é o último aviso. Todas as informações salvas pelo usuário serão perdidas e a plataforma do usuário será reiniciada do início.',settingsResetDone:'Plataforma resetada com sucesso para o usuário',settingsChangeData:'Alterar Dados',settingsSave:'Salvar',settingsCancel:'Cancelar',settingsDisplayName:'Nome de Usuário',settingsDataSaved:'Dados salvos com sucesso!',settingsQuestionsAnswered:'Questões respondidas',settingsCorrectRate:'Taxa de acerto',settingsCardsTotal:'Total de cards',settingsReviewsDone:'Revisões feitas',settingsNoData:'Sem dados ainda',settingsShowPass:'Mostrar',settingsHidePass:'Ocultar',timeToday:'Hoje',timeWeek:'7 dias',timeTotal:'Total',streakRecord:'Recorde',streakQuestions:'Questões',streakFlash:'Flashcards',streakRisk:'Estude hoje para manter!',streakRestart:'Recomece hoje!',streakStart:'Comece hoje!',dayOne:'Dia',dayMany:'Dias',weekLetters:'S,T,Q,Q,S,S,D',wsSubtitle:'Tudo o que você precisa para organizar seus estudos, em um só lugar.',wsNotebooksDesc:'Cadernos estruturados para cada matéria e sistema.',wsNotesDesc:'Anotações rápidas que você captura durante o estudo.',wsPlannerDesc:'Planeje suas passadas, defina metas e acompanhe seu cronograma.',wsLinksDesc:'Suas referências, recursos e ferramentas externas salvas.'}
  };
  /* ===== v51 — novas chaves i18n (merge para manter os objetos acima legíveis) ===== */
  Object.assign(I18N.en, {
    qbReview:'Review', qbStart:'Start',
    /* Settings — seções e navegação */
    stgSecProfile:'Profile', stgSecAppearance:'Appearance', stgSecQbank:'QBank', stgSecFlash:'Flashcards',
    stgSecData:'My Data', stgSecDanger:'Danger Zone', stgSecUsers:'User Management', stgSecUnlock:'Pass Unlock',
    stgSecSystem:'System Info',
    stgProfileDesc:'Your display name and login credentials.',
    stgAvatar:'Avatar',
    stgThemeLabel:'Default theme', stgThemeDark:'Dark', stgThemeLight:'Light',
    stgLangLabel:'Default language', stgLangEN:'English', stgLangPT:'Português',
    stgApprDesc:'How the platform opens for you. You can still switch theme and language anytime from the top bar.',
    stgQbMode:'Default test mode', stgQbTutor:'Tutor', stgQbTimed:'Timed',
    stgQbCount:'Default number of questions', stgQbPeer:'Show peer answer stats during tests',
    stgQbDesc:'These only set the starting values in Create Test — you can always change them per test.',
    stgFcOrder:'Review order', stgFcOrderDue:'Due first (spaced repetition)', stgFcOrderRandom:'Random', stgFcOrderSeq:'Sequential',
    stgFcReversed:'Show cards reversed (back first) by default',
    stgFcDesc:'Defaults for your flashcard review sessions.',
    stgDataDesc:'All your progress lives in this browser. Export a backup regularly so you never lose it.',
    stgExport:'Export backup', stgImport:'Import backup', stgImportDone:'Backup imported successfully!',
    stgImportErr:'Could not read this backup file.', stgImportConfirm:'Importing will overwrite your current progress in this browser. Continue?',
    stgExportHint:'Downloads a .json file with your QBank, flashcards, notes, streak and preferences.',
    stgDangerDesc:'Irreversible actions. Please be careful.',
    stgResetMine:'Reset my progress', stgResetMineC1:'This will erase ALL your progress (QBank, flashcards, notes, streak) in this browser. Continue?',
    stgResetMineC2:'Last warning — this cannot be undone. Really reset everything?', stgResetMineDone:'Your progress has been reset.',
    stgSaved:'Preferences saved',
    stgUnlockDesc:'Manually unlock the next pass for a user who asks. Pass 1 is always open.',
    stgUnlockState:'Current', stgUnlockLevel:'Unlocked up to', stgUnlockPass:'Pass', stgUnlockDirected:'Directed',
    stgUnlockSave:'Apply', stgUnlockAuto:'Automatic (sequential)',
    stgSysVersion:'Platform version', stgSysQuestions:'Questions in bank', stgSysFlash:'Flashcards (yours)', stgSysUser:'Signed in as',
    stgLastAccess:'Last access', stgNever:'Never', stgStreakCur:'Streak', stgTimeTotal:'Total time',
    stgPassCol:'Passes', stgUserStatus:'Status'
  });
  Object.assign(I18N.pt, {
    qbReview:'Revisar', qbStart:'Iniciar',
    stgSecProfile:'Perfil', stgSecAppearance:'Aparência', stgSecQbank:'QBank', stgSecFlash:'Flashcards',
    stgSecData:'Meus Dados', stgSecDanger:'Zona de Perigo', stgSecUsers:'Gestão de Usuários', stgSecUnlock:'Desbloqueio de Passadas',
    stgSecSystem:'Informações do Sistema',
    stgProfileDesc:'Seu nome de exibição e credenciais de acesso.',
    stgAvatar:'Avatar',
    stgThemeLabel:'Tema padrão', stgThemeDark:'Escuro', stgThemeLight:'Claro',
    stgLangLabel:'Idioma padrão', stgLangEN:'English', stgLangPT:'Português',
    stgApprDesc:'Como a plataforma abre para você. Você ainda pode trocar tema e idioma quando quiser na barra superior.',
    stgQbMode:'Modo de teste padrão', stgQbTutor:'Tutor', stgQbTimed:'Cronometrado',
    stgQbCount:'Número de questões padrão', stgQbPeer:'Mostrar estatística dos colegas durante os testes',
    stgQbDesc:'Isto apenas define os valores iniciais do Criar Teste — você sempre pode alterá-los em cada teste.',
    stgFcOrder:'Ordem de revisão', stgFcOrderDue:'Vencidos primeiro (repetição espaçada)', stgFcOrderRandom:'Aleatória', stgFcOrderSeq:'Sequencial',
    stgFcReversed:'Mostrar cards invertidos (verso primeiro) por padrão',
    stgFcDesc:'Padrões para suas sessões de revisão de flashcards.',
    stgDataDesc:'Todo o seu progresso fica neste navegador. Exporte um backup com frequência para nunca perdê-lo.',
    stgExport:'Exportar backup', stgImport:'Importar backup', stgImportDone:'Backup importado com sucesso!',
    stgImportErr:'Não foi possível ler este arquivo de backup.', stgImportConfirm:'Importar irá sobrescrever seu progresso atual neste navegador. Continuar?',
    stgExportHint:'Baixa um arquivo .json com seu QBank, flashcards, notas, sequência e preferências.',
    stgDangerDesc:'Ações irreversíveis. Tenha cuidado.',
    stgResetMine:'Resetar meu progresso', stgResetMineC1:'Isto apagará TODO o seu progresso (QBank, flashcards, notas, sequência) neste navegador. Continuar?',
    stgResetMineC2:'Último aviso — isto não pode ser desfeito. Deseja realmente resetar tudo?', stgResetMineDone:'Seu progresso foi resetado.',
    stgSaved:'Preferências salvas',
    stgUnlockDesc:'Desbloqueie manualmente a próxima passada de um usuário que solicitar. A Passada 1 está sempre aberta.',
    stgUnlockState:'Atual', stgUnlockLevel:'Liberado até', stgUnlockPass:'Passada', stgUnlockDirected:'Dirigida',
    stgUnlockSave:'Aplicar', stgUnlockAuto:'Automático (sequencial)',
    stgSysVersion:'Versão da plataforma', stgSysQuestions:'Questões no banco', stgSysFlash:'Flashcards (seus)', stgSysUser:'Logado como',
    stgLastAccess:'Último acesso', stgNever:'Nunca', stgStreakCur:'Sequência', stgTimeTotal:'Tempo total',
    stgPassCol:'Passadas', stgUserStatus:'Status'
  });
  const PAGE_TITLE_KEYS = {'my-workspace':'myWorkspace','notebooks':'notebooks','notes':'notes','study-planner':'studyPlanner','video-lectures':'videoLectures','audio-lessons':'audioLessons','library-1':'library1Title','library-2':'library2Title','library-3':'library3Title','qbank-1':'qbank1Title','qbank-2':'qbank2Title','settings':'settings','question-bank':'questionBank','performance':'performanceAnalytics'};
  const $ = (s,root=document)=>root.querySelector(s); const $$=(s,root=document)=>[...root.querySelectorAll(s)];
  function params(){return new URLSearchParams(location.search)}
  function user(){return params().get('u')||sessionStorage.getItem('couplemed_active_user')||'guest1'}
  function page(){return params().get('page')||'home'}
  function preserveUserLinks(){const u=user(); $$('a[href^="app.html"]').forEach(a=>{const url=new URL(a.getAttribute('href'),location.href); url.searchParams.set('u',u); a.href=url.pathname.split('/').pop()+url.search;});}
  function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
  function draw(key,arr){let deck;try{deck=JSON.parse(localStorage.getItem(key)||'[]')}catch(e){deck=[]}if(!Array.isArray(deck)||!deck.length)deck=shuffle([...arr.keys()]);const idx=deck.shift();localStorage.setItem(key,JSON.stringify(deck));return arr[idx]||arr[0]}
  function initLogin(){
    const form=$('#loginForm'); if(!form)return;
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const login=$('#login').value.trim().toLowerCase();
      const pass=$('#password').value.trim();
      const msg=$('#loginMessage');
      const btn=$('.access-submit');
      if(!login||!pass){msg.textContent='Invalid login or password.';return}
      msg.textContent=''; btn.classList.add('loading');
      let res;
      try{
        res=await fetch('/api/login',{method:'POST',credentials:'same-origin',
          headers:{'Content-Type':'application/json'},body:JSON.stringify({login,password:pass})});
      }catch(err){
        btn.classList.remove('loading');
        msg.textContent='Connection error. Please try again.';
        return;
      }
      if(res.status===403){btn.classList.remove('loading');msg.textContent='Your access has been blocked. Contact the administrator.';return}
      if(res.status===503){btn.classList.remove('loading');msg.textContent='Server not configured. Contact the administrator.';return}
      if(!res.ok){btn.classList.remove('loading');msg.textContent='Invalid login or password.';return}
      const data=await res.json();
      const u=data.uid;
      cacheUser({uid:u,displayName:data.displayName,login,role:data.role,blocked:0});
      sessionStorage.setItem('couplemed_active_user',u);
      document.body.style.transition='opacity .45s ease'; document.body.style.opacity='.22';
      setTimeout(()=>{location.href=(u==='john'||u==='alysson')?`transition.html?u=${u}`:`app.html?u=${u}`},460);
    });
  }
  function initTransition(){const q=$('#transitionQuote'); if(!q)return; const u=params().get('u'); if(!['john','alysson'].includes(u)){location.replace('index.html');return} sessionStorage.setItem('couplemed_active_user',u); q.textContent=draw(`couplemed_transition_deck_${u}`,quotes); setTimeout(()=>$('.transition-viewport').classList.add('fading'),6450); setTimeout(()=>location.href=`app.html?u=${u}`,7000);}
  const LIB_TITLE_KEY = {'library-1':'library1Title','library-2':'library2Title'};
  // Nomes reais das pastas de cada biblioteca, na ordem exata solicitada pelo usuário.
  const LIB_FOLDERS = {
    'library-2': [
      'Biochemistry','Immunology','Microbiology','Pathology','General Pharmacology',
      'Biostatistics','Public Health Science','Cardiovascular','Endocrinology',
      'Gastrointestinal System','Hematology & Oncology',
      'Musculoskeletal, Skin and Connective Tissue','Neurology','Psychiatry',
      'Nephrology','Reproductive System','Pulmonology'
    ]
  };
  // Biblioteca 1: 26 pastas, cada uma com sua lista de tópicos (ordem exata do arquivo enviado pelo usuário)
  const LIBRARY1_STRUCTURE = window.LIBRARY1_STRUCTURE || [];
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

    // Biblioteca 1 tem 2 níveis: lista de 26 pastas -> lista de tópicos dentro da pasta
    if(id==='library-1' && LIBRARY1_STRUCTURE.length){
      const openFolder = folderSlug ? LIBRARY1_STRUCTURE.find(f=>slugify(f.name)===folderSlug) : null;
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
      const folders=LIBRARY1_STRUCTURE.map(folder=>{
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

    // Biblioteca 2 (e demais bibliotecas simples): 1 nível, lista direta
    const folders=(LIB_FOLDERS[id]||[]).map(name=>{
      const slug=slugify(name);
      const pageLink=`${id.replace('library-','')}-${slug}`;
      return `<a class="lib-book" href="app.html?page=${pageLink}&u=${user()}" data-page-link="${pageLink}">${CM?CM.span(name):name}</a>`;
    }).join('');
    rp.innerHTML=`<h1 id="internalTitle">${libTitle}</h1><div class="lib-list">${folders}</div>`;
    CM&&CM.translateAllVisible(rp);
  }
  function renderStep1(lang){
    /* Instructions page removed — redirect handled in router */
    location.replace(`app.html?page=qbank-1&u=${user()}`);
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
    const prefixes=['couplemed_qb_'+uid,'couplemed_fc_'+uid,'couplemed_streak_'+uid,'couplemed_time_'+uid,'couplemed_lang_current_'+uid,'couplemed_transition_deck_'+uid,'couplemed_user_custom_'+uid,
      /* v51 */ 'couplemed_prefs_'+uid,'couplemed_qb_unlock_'+uid,'couplemed_last_access_'+uid];
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

  /* ============================== SETTINGS v51 ==============================
     Página reconstruída como painel com abas. Seções de todos os usuários:
     Perfil, Aparência, QBank, Flashcards, Meus Dados, Zona de Perigo.
     Seções exclusivas do admin: Gestão de Usuários, Desbloqueio de Passadas,
     Informações do Sistema.
     Regra de ouro: preferências definem apenas o ESTADO INICIAL do site — nenhum
     controle existente (tema, bandeiras, Create Test) é removido ou movido. */
  const STG_VERSION='v51';
  let stgTab=null;

  function stgEsc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function stgAvatarColor(uid){
    const palette=['#3d84ff','#7c5cff','#00b5ad','#f2994a','#eb5757','#27ae60'];
    let h=0; for(let i=0;i<uid.length;i++) h=(h*31+uid.charCodeAt(i))>>>0;
    return palette[h%palette.length];
  }
  function stgAvatar(uid,size){
    const name=getUserDisplay(uid)||uid;
    const initial=(name.trim()[0]||'?').toUpperCase();
    return `<span class="stg-avatar" style="--av:${stgAvatarColor(uid)};--avs:${size||44}px">${stgEsc(initial)}</span>`;
  }
  function stgFmtDate(iso,lang){
    if(!iso) return null;
    try{ const d=new Date(iso); return d.toLocaleDateString(lang==='pt'?'pt-BR':'en-US',{day:'2-digit',month:'short',year:'numeric'})+' · '+d.toLocaleTimeString(lang==='pt'?'pt-BR':'en-US',{hour:'2-digit',minute:'2-digit'}); }
    catch(e){ return null; }
  }
  function stgFmtSecs(sec){
    sec=Math.max(0,Math.round(sec||0));
    const h=Math.floor(sec/3600), m=Math.round((sec%3600)/60);
    return h? `${h}h ${m}m` : `${m}m`;
  }
  /* leituras somente-leitura de outros módulos (nunca escrevem) */
  function stgTotalTime(uid){
    let total=0;
    try{ const db=JSON.parse(localStorage.getItem('couplemed_time_'+uid))||{};
      Object.keys(db).forEach(day=>{ const mods=db[day]||{}; Object.keys(mods).forEach(k=>{ total+=(+mods[k]||0); }); });
    }catch(e){}
    return total;
  }
  function stgStreakBest(uid){
    try{ const s=JSON.parse(localStorage.getItem('couplemed_streak_'+uid))||{}; return +s.best||0; }catch(e){ return 0; }
  }
  function stgFlashCount(uid){
    let n=0;
    try{ const fc=JSON.parse(localStorage.getItem('couplemed_fc_'+uid))||{};
      if(Array.isArray(fc.cards)) n=fc.cards.length;
      else (fc.decks||[]).forEach(d=>{ n+=((d.cards||[]).length); });
    }catch(e){}
    return n;
  }
  /* percentual de cada passada de um usuário (mesmo modelo do qbank.js, somente leitura) */
  function stgPassSummary(uid,lang){
    const total=window.QBANK_TOTAL||0;
    if(!total) return '—';
    const map=qbAttemptsByQ(uid);
    return [1,2,3].map(pn=>{
      const p=qbPassProgress(map,total,pn);
      const st=qbPassState(uid,map,total,pn);
      const icon = st==='completed'?'✓' : st==='locked'?'🔒' : '';
      return `<span class="stg-pass-chip stg-pass-${st}">${pn}ª <b>${p.pct}%</b> ${icon}</span>`;
    }).join('');
  }

  /* ---------- backup: exportar / importar ---------- */
  function stgUserKeys(uid){
    const prefixes=['couplemed_qb_'+uid,'couplemed_fc_'+uid,'couplemed_streak_'+uid,'couplemed_time_'+uid,
      'couplemed_prefs_'+uid,'couplemed_user_custom_'+uid,'couplemed_lang_current_'+uid,
      'couplemed_notebook_'+uid,'couplemed_notes_'+uid,'couplemed_qb_unlock_'+uid,'couplemed_last_access_'+uid];
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(prefixes.some(p=>k===p||k.startsWith(p+'_'))) keys.push(k);
    }
    return keys;
  }
  function stgExportBackup(uid){
    const payload={_couplemed:'backup',_version:STG_VERSION,_user:uid,_exported_at:new Date().toISOString(),data:{}};
    stgUserKeys(uid).forEach(k=>{ payload.data[k]=localStorage.getItem(k); });
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=`couplemed_backup_${uid}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function stgImportBackup(uid,file,lang,onDone){
    const t=I18N[lang]||I18N.en;
    const reader=new FileReader();
    reader.onload=()=>{
      let payload;
      try{ payload=JSON.parse(reader.result); }catch(e){ alert(t.stgImportErr); return; }
      if(!payload||payload._couplemed!=='backup'||!payload.data){ alert(t.stgImportErr); return; }
      if(!confirm(t.stgImportConfirm)) return;
      /* remove as chaves atuais do usuário e reescreve as do backup, remapeando o uid */
      stgUserKeys(uid).forEach(k=>localStorage.removeItem(k));
      const srcUid=payload._user||uid;
      Object.keys(payload.data).forEach(k=>{
        const nk = srcUid===uid ? k : k.split(srcUid).join(uid);
        try{ localStorage.setItem(nk,payload.data[k]); }catch(e){}
      });
      alert(t.stgImportDone);
      onDone&&onDone();
    };
    reader.onerror=()=>alert(t.stgImportErr);
    reader.readAsText(file);
  }
  function stgResetSelf(uid,lang,onDone){
    const t=I18N[lang]||I18N.en;
    if(!confirm(t.stgResetMineC1)) return;
    if(!confirm(t.stgResetMineC2)) return;
    /* preserva credenciais customizadas do próprio usuário — só o progresso é apagado */
    const keep=localStorage.getItem('couplemed_user_custom_'+uid);
    const keepPrefs=localStorage.getItem('couplemed_prefs_'+uid);
    stgUserKeys(uid).forEach(k=>localStorage.removeItem(k));
    if(keep) localStorage.setItem('couplemed_user_custom_'+uid,keep);
    if(keepPrefs) localStorage.setItem('couplemed_prefs_'+uid,keepPrefs);
    alert(t.stgResetMineDone);
    onDone&&onDone();
  }

  /* ---------- blocos de UI reutilizáveis ---------- */
  function stgToggle(id,checked,label){
    return `<label class="stg-switch"><input type="checkbox" id="${id}" ${checked?'checked':''} /><span class="stg-switch-track"><span class="stg-switch-knob"></span></span><span class="stg-switch-lbl">${label}</span></label>`;
  }
  function stgSeg(name,value,options){
    return `<div class="stg-seg">${options.map(o=>`<button type="button" class="stg-seg-btn ${o.v===value?'on':''}" data-seg="${name}" data-v="${o.v}">${stgEsc(o.l)}</button>`).join('')}</div>`;
  }

  function renderSettings(lang){
    const rp=$('#regularPage'); if(!rp)return;
    const t=I18N[lang]||I18N.en;
    const u=user();
    const m=USER_META[u];
    if(!m){rp.innerHTML=`<h1 id="internalTitle">${t.settings}</h1>`;return}
    const isAdmin=m.role==='admin';

    const tabs=[
      {id:'profile',   label:t.stgSecProfile,    ico:'👤'},
      {id:'appearance',label:t.stgSecAppearance, ico:'🎨'},
      {id:'qbank',     label:t.stgSecQbank,      ico:'📋'},
      {id:'flash',     label:t.stgSecFlash,      ico:'🗂'},
      {id:'data',      label:t.stgSecData,       ico:'💾'},
      {id:'danger',    label:t.stgSecDanger,     ico:'⚠️'}
    ];
    if(isAdmin){
      tabs.push({id:'users', label:t.stgSecUsers,  ico:'👥', admin:true});
      tabs.push({id:'unlock',label:t.stgSecUnlock, ico:'🔓', admin:true});
      tabs.push({id:'system',label:t.stgSecSystem, ico:'🛠', admin:true});
    }
    if(!stgTab || !tabs.some(x=>x.id===stgTab)) stgTab=tabs[0].id;

    const navHTML=tabs.map(tb=>`<button class="stg-nav-item ${tb.id===stgTab?'on':''} ${tb.admin?'is-admin':''}" data-tab="${tb.id}"><span class="stg-nav-ico">${tb.ico}</span><span>${stgEsc(tb.label)}</span></button>`).join('');

    rp.innerHTML=`
      <h1 id="internalTitle">${t.settings}</h1>
      <div class="stg-shell">
        <aside class="stg-nav">
          <div class="stg-nav-user">${stgAvatar(u,40)}<div><strong>${stgEsc(getUserDisplay(u))}</strong><small>${isAdmin?stgEsc(t.settingsAdmin):stgEsc(t.settingsUser)}</small></div></div>
          ${navHTML}
        </aside>
        <section class="stg-panel" id="stgPanel"></section>
      </div>`;

    rp.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{ stgTab=btn.dataset.tab; renderSettings(lang); }));
    stgRenderPanel(lang);
  }

  function stgRenderPanel(lang){
    const panel=$('#stgPanel'); if(!panel)return;
    const t=I18N[lang]||I18N.en;
    const u=user();
    switch(stgTab){
      case 'profile':    stgProfile(panel,u,lang,t); break;
      case 'appearance': stgAppearance(panel,u,lang,t); break;
      case 'qbank':      stgQbank(panel,u,lang,t); break;
      case 'flash':      stgFlash(panel,u,lang,t); break;
      case 'data':       stgData(panel,u,lang,t); break;
      case 'danger':     stgDanger(panel,u,lang,t); break;
      case 'users':      stgUsers(panel,u,lang,t); break;
      case 'unlock':     stgUnlock(panel,u,lang,t); break;
      case 'system':     stgSystem(panel,u,lang,t); break;
    }
    stgWirePassEyes(panel,t);
  }

  function stgWirePassEyes(scope,t){
    /* O botão que revelava a senha guardada deixou de existir: não há mais
       senha guardada para revelar, só um hash. O olho abaixo continua servindo
       para conferir o que VOCÊ acabou de digitar. */
    scope.querySelectorAll('[data-action="toggle-pass-input"]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const inp=$('#'+btn.dataset.target); if(!inp)return;
        if(inp.type==='password'){ inp.type='text'; btn.textContent=t.settingsHidePass; }
        else { inp.type='password'; btn.textContent=t.settingsShowPass; }
      });
    });
  }
  function stgFlashSaved(el,t){
    if(!el)return; el.textContent=t.stgSaved; el.hidden=false; el.classList.add('stg-msg-success');
    setTimeout(()=>{ el.hidden=true; },1600);
  }

  /* ---------------- Perfil ---------------- */
  function stgProfile(panel,u,lang,t){
    const meta=USER_META[u];
    const custom=getUserCustom(u);
    const name=custom&&custom.displayName?custom.displayName:meta.displayName;
    const login=custom&&custom.login?custom.login:meta.originalLogin;
    /* A senha atual não é mais recuperável: só existe como hash no servidor.
       O admin pode DEFINIR uma nova, nunca LER a existente. */
    panel.innerHTML=`
      <div class="stg-card">
        <div class="stg-card-head"><h2>${stgEsc(t.stgSecProfile)}</h2><p>${stgEsc(t.stgProfileDesc)}</p></div>
        <div class="stg-profile-top">${stgAvatar(u,64)}<div class="stg-profile-id"><strong>${stgEsc(name)}</strong><small>${stgEsc(login)}</small></div></div>
        <div class="stg-view-block" id="stgSelfView">
          <div class="stg-info-row"><span class="stg-label">${t.settingsDisplayName}</span><span class="stg-value">${stgEsc(name)}</span></div>
          <div class="stg-info-row"><span class="stg-label">${t.settingsLogin}</span><span class="stg-value">${stgEsc(login)}</span></div>
          <div class="stg-info-row"><span class="stg-label">${t.settingsPassword}</span><span class="stg-value">••••••••</span><button type="button" class="stg-btn stg-btn-eye" data-action="toggle-pass">${t.settingsShowPass}</button></div>
          <button class="stg-btn stg-btn-edit" id="stgEditBtn">${t.settingsChangeData}</button>
        </div>
        <div class="stg-edit-form" id="stgSelfEdit" hidden>
          <div class="stg-field"><label>${t.settingsDisplayName}</label><input type="text" id="stgEditName" value="${stgEsc(name)}" /></div>
          <div class="stg-field"><label>${t.settingsLogin}</label><input type="text" id="stgEditLogin" value="${stgEsc(login)}" /></div>
          <div class="stg-field"><label>${t.settingsPassword}</label><div class="stg-pass-field"><input type="password" id="stgEditPass" value="" placeholder="••••••••" autocomplete="new-password" /><button type="button" class="stg-btn stg-btn-eye" data-action="toggle-pass-input" data-target="stgEditPass">${t.settingsShowPass}</button></div><small class="stg-hint">${t.stgPassKeepHint||'Deixe em branco para manter a senha atual.'}</small></div>
          <div class="stg-edit-actions">
            <button class="stg-btn stg-btn-save" id="stgSaveBtn">${t.settingsSave}</button>
            <button class="stg-btn stg-btn-cancel" id="stgCancelBtn">${t.settingsCancel}</button>
          </div>
          <div class="stg-msg" id="stgMsg" hidden></div>
        </div>
      </div>`;
    $('#stgEditBtn').addEventListener('click',()=>{ $('#stgSelfView').hidden=true; $('#stgSelfEdit').hidden=false; });
    $('#stgCancelBtn').addEventListener('click',()=>{ $('#stgSelfEdit').hidden=true; $('#stgSelfView').hidden=false; });
    $('#stgSaveBtn').addEventListener('click',async ()=>{
      const nm=$('#stgEditName').value.trim(), lg=$('#stgEditLogin').value.trim(), pw=$('#stgEditPass').value.trim();
      if(!nm||!lg)return;                       // senha em branco = manter a atual
      const msg=$('#stgMsg'); msg.hidden=false; msg.classList.remove('stg-msg-success');
      const r=await cmSaveUser({uid:u,displayName:nm,login:lg,newPassword:pw});
      if(!r.ok){ msg.textContent=cmUserErr(r.error); return; }
      msg.textContent=t.settingsDataSaved; msg.classList.add('stg-msg-success');
      const side=$('#sidebarUserName'); if(side)side.textContent=nm;
      setTimeout(()=>renderSettings(lang),1100);
    });
  }

  /* ---------------- Aparência ---------------- */
  function stgAppearance(panel,u,lang,t){
    const p=getPrefs(u);
    panel.innerHTML=`
      <div class="stg-card">
        <div class="stg-card-head"><h2>${stgEsc(t.stgSecAppearance)}</h2><p>${stgEsc(t.stgApprDesc)}</p></div>
        <div class="stg-field"><label>${t.stgThemeLabel}</label>
          ${stgSeg('theme',p.theme||'auto',[{v:'auto',l:t.stgUnlockAuto},{v:'dark',l:t.stgThemeDark},{v:'light',l:t.stgThemeLight}])}</div>
        <div class="stg-field"><label>${t.stgLangLabel}</label>
          ${stgSeg('lang',p.lang||'en',[{v:'en',l:t.stgLangEN},{v:'pt',l:t.stgLangPT}])}</div>
        <div class="stg-msg" id="stgApprMsg" hidden></div>
      </div>`;
    panel.querySelectorAll('[data-seg]').forEach(btn=>btn.addEventListener('click',()=>{
      const grp=btn.dataset.seg, v=btn.dataset.v;
      btn.parentElement.querySelectorAll('.stg-seg-btn').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on');
      const cur=getPrefs(u);
      if(grp==='theme') cur.theme = v==='auto'?'':v;
      if(grp==='lang') cur.lang = v;
      /* grava ANTES de aplicar: setLang() dispara um re-render da página */
      setPrefs(u,cur);
      if(grp==='theme' && v!=='auto') document.body.classList.toggle('light',v==='light');
      if(grp==='lang' && v!==lang){ setLang(v); return; } /* setLang re-renderiza a página inteira */
      stgFlashSaved($('#stgApprMsg'),t);
    }));
  }

  /* ---------------- Preferências do QBank ---------------- */
  function stgQbank(panel,u,lang,t){
    const p=getPrefs(u);
    panel.innerHTML=`
      <div class="stg-card">
        <div class="stg-card-head"><h2>${stgEsc(t.stgSecQbank)}</h2><p>${stgEsc(t.stgQbDesc)}</p></div>
        <div class="stg-field"><label>${t.stgQbMode}</label>
          <div class="stg-qbmode-row">${stgToggle('stgQbTutor',p.qbank.tutor,stgEsc(t.stgQbTutor))}${stgToggle('stgQbTimed',p.qbank.timed,stgEsc(t.stgQbTimed))}</div></div>
        <div class="stg-field"><label>${t.stgQbCount}</label>
          <input type="number" id="stgQbCount" min="1" max="40" value="${p.qbank.count}" class="stg-num" /></div>
        <div class="stg-field">${stgToggle('stgQbPeer',p.qbank.peer,stgEsc(t.stgQbPeer))}</div>
        <div class="stg-msg" id="stgQbMsg" hidden></div>
      </div>`;
    $('#stgQbTutor').addEventListener('change',e=>{
      const cur=getPrefs(u); cur.qbank.tutor=e.target.checked; setPrefs(u,cur); stgFlashSaved($('#stgQbMsg'),t);
    });
    $('#stgQbTimed').addEventListener('change',e=>{
      const cur=getPrefs(u); cur.qbank.timed=e.target.checked; setPrefs(u,cur); stgFlashSaved($('#stgQbMsg'),t);
    });
    $('#stgQbCount').addEventListener('change',e=>{
      const cur=getPrefs(u); cur.qbank.count=Math.max(1,Math.min(40,parseInt(e.target.value,10)||10));
      e.target.value=cur.qbank.count; setPrefs(u,cur); stgFlashSaved($('#stgQbMsg'),t);
    });
    $('#stgQbPeer').addEventListener('change',e=>{
      const cur=getPrefs(u); cur.qbank.peer=e.target.checked; setPrefs(u,cur); stgFlashSaved($('#stgQbMsg'),t);
    });
  }

  /* ---------------- Preferências de Flashcards ---------------- */
  function stgFlash(panel,u,lang,t){
    const p=getPrefs(u);
    panel.innerHTML=`
      <div class="stg-card">
        <div class="stg-card-head"><h2>${stgEsc(t.stgSecFlash)}</h2><p>${stgEsc(t.stgFcDesc)}</p></div>
        <div class="stg-field"><label>${t.stgFcOrder}</label>
          ${stgSeg('fcorder',p.flashcards.order,[{v:'due',l:t.stgFcOrderDue},{v:'random',l:t.stgFcOrderRandom},{v:'sequential',l:t.stgFcOrderSeq}])}</div>
        <div class="stg-field">${stgToggle('stgFcRev',p.flashcards.reversed,stgEsc(t.stgFcReversed))}</div>
        <div class="stg-msg" id="stgFcMsg" hidden></div>
      </div>`;
    panel.querySelectorAll('[data-seg="fcorder"]').forEach(btn=>btn.addEventListener('click',()=>{
      btn.parentElement.querySelectorAll('.stg-seg-btn').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on');
      const cur=getPrefs(u); cur.flashcards.order=btn.dataset.v; setPrefs(u,cur); stgFlashSaved($('#stgFcMsg'),t);
    }));
    $('#stgFcRev').addEventListener('change',e=>{
      const cur=getPrefs(u); cur.flashcards.reversed=e.target.checked; setPrefs(u,cur); stgFlashSaved($('#stgFcMsg'),t);
    });
  }

  /* ---------------- Meus Dados (backup) ---------------- */
  function stgData(panel,u,lang,t){
    const keys=stgUserKeys(u);
    let bytes=0; keys.forEach(k=>{ bytes+=(localStorage.getItem(k)||'').length; });
    const kb=(bytes/1024).toFixed(1);
    panel.innerHTML=`
      <div class="stg-card">
        <div class="stg-card-head"><h2>${stgEsc(t.stgSecData)}</h2><p>${stgEsc(t.stgDataDesc)}</p></div>
        <div class="stg-data-stats">
          <div class="stg-kpi"><b>${window.QBANK_TOTAL||0}</b><i>${stgEsc(t.stgSysQuestions)}</i></div>
          <div class="stg-kpi"><b>${stgFlashCount(u)}</b><i>${stgEsc(t.stgSysFlash)}</i></div>
          <div class="stg-kpi"><b>${kb} KB</b><i>${stgEsc(t.stgSecData)}</i></div>
        </div>
        <div class="stg-data-actions">
          <button class="stg-btn stg-btn-primary" id="stgExportBtn">⬇ ${stgEsc(t.stgExport)}</button>
          <button class="stg-btn" id="stgImportBtn">⬆ ${stgEsc(t.stgImport)}</button>
          <input type="file" id="stgImportFile" accept="application/json,.json" hidden />
        </div>
        <p class="stg-hint">${stgEsc(t.stgExportHint)}</p>
      </div>`;
    $('#stgExportBtn').addEventListener('click',()=>stgExportBackup(u));
    $('#stgImportBtn').addEventListener('click',()=>$('#stgImportFile').click());
    $('#stgImportFile').addEventListener('change',e=>{
      const f=e.target.files&&e.target.files[0]; if(!f)return;
      stgImportBackup(u,f,lang,()=>location.reload());
    });
  }

  /* ---------------- Zona de Perigo ---------------- */
  function stgDanger(panel,u,lang,t){
    panel.innerHTML=`
      <div class="stg-card stg-card-danger">
        <div class="stg-card-head"><h2>${stgEsc(t.stgSecDanger)}</h2><p>${stgEsc(t.stgDangerDesc)}</p></div>
        <button class="stg-btn stg-btn-reset" id="stgResetMine">${stgEsc(t.stgResetMine)}</button>
      </div>`;
    $('#stgResetMine').addEventListener('click',()=>stgResetSelf(u,lang,()=>location.reload()));
  }

  /* ---------------- Admin: gestão de usuários ---------------- */
  function stgUsers(panel,u,lang,t){
    let html=`<div class="stg-card"><div class="stg-card-head"><h2>${stgEsc(t.stgSecUsers)}</h2></div>`;
    Object.keys(USER_META).forEach(uid=>{
      if(uid===u)return;
      const meta=USER_META[uid];
      const custom=getUserCustom(uid);
      const blocked=isUserBlocked(uid);
      const displayName=getUserDisplay(uid);
      const curLogin=custom&&custom.login?custom.login:meta.originalLogin;

      const last=stgFmtDate(getLastAccess(uid),lang)||t.stgNever;
      html+=`<div class="stg-user-card" data-uid="${uid}">
        <div class="stg-user-header">
          ${stgAvatar(uid,44)}
          <div class="stg-user-id">
            <strong>${stgEsc(displayName)}</strong>
            <small>${stgEsc(curLogin)}</small>
          </div>
          <div class="stg-user-actions">
            <button class="stg-btn stg-btn-edit stg-btn-edit-inline" data-action="edit-user" data-uid="${uid}">${t.settingsChangeData}</button>
            <button class="stg-toggle ${blocked?'stg-toggle-off':'stg-toggle-on'}" data-action="toggle" data-uid="${uid}">
              <span class="stg-toggle-knob"></span>
              <span class="stg-toggle-label">${blocked?t.settingsBlocked:t.settingsEnabled}</span>
            </button>
            <button class="stg-btn stg-btn-reset" data-action="reset" data-uid="${uid}">${t.settingsReset}</button>
          </div>
        </div>
        <div class="stg-user-metrics">
          <div><i>${stgEsc(t.stgLastAccess)}</i><b>${stgEsc(last)}</b></div>
          <div><i>${stgEsc(t.stgStreakCur)}</i><b>${stgStreakBest(uid)}</b></div>
          <div><i>${stgEsc(t.stgTimeTotal)}</i><b>${stgFmtSecs(stgTotalTime(uid))}</b></div>
          <div><i>${stgEsc(t.settingsCardsTotal)}</i><b>${stgFlashCount(uid)}</b></div>
        </div>
        <div class="stg-user-passes"><i>${stgEsc(t.stgPassCol)}</i><div class="stg-pass-chips">${stgPassSummary(uid,lang)}</div></div>
        <div class="stg-view-block" id="stgUserView_${uid}">
          <div class="stg-info-row"><span class="stg-label">${t.settingsPassword}</span><span class="stg-value">••••••••</span></div>
        </div>
        <div class="stg-edit-form" id="stgUserEdit_${uid}" hidden>
          <div class="stg-field"><label>${t.settingsDisplayName}</label><input type="text" id="stgUName_${uid}" value="${stgEsc(displayName)}" /></div>
          <div class="stg-field"><label>${t.settingsLogin}</label><input type="text" id="stgULogin_${uid}" value="${stgEsc(curLogin)}" /></div>
          <div class="stg-field"><label>${t.settingsPassword}</label><div class="stg-pass-field"><input type="password" id="stgUPass_${uid}" value="" placeholder="••••••••" autocomplete="new-password" /><button type="button" class="stg-btn stg-btn-eye" data-action="toggle-pass-input" data-target="stgUPass_${uid}">${t.settingsShowPass}</button></div><small class="stg-hint">${t.stgPassKeepHint||'Deixe em branco para manter a senha atual.'}</small></div>
          <div class="stg-edit-actions">
            <button class="stg-btn stg-btn-save" data-action="save-user" data-uid="${uid}">${t.settingsSave}</button>
            <button class="stg-btn stg-btn-cancel" data-action="cancel-user" data-uid="${uid}">${t.settingsCancel}</button>
          </div>
          <div class="stg-msg" id="stgUMsg_${uid}" hidden></div>
        </div>
      </div>`;
    });
    html+=`</div>`;
    panel.innerHTML=html;

    panel.querySelectorAll('[data-action="toggle"]').forEach(btn=>btn.addEventListener('click',async ()=>{
      try{ await setUserBlocked(btn.dataset.uid,!isUserBlocked(btn.dataset.uid)); }
      catch(e){ return; }
      await cmRefreshUsers(); stgRenderPanel(lang);
    }));
    panel.querySelectorAll('[data-action="reset"]').forEach(btn=>btn.addEventListener('click',()=>resetUserPlatform(btn.dataset.uid,lang)));
    panel.querySelectorAll('[data-action="edit-user"]').forEach(btn=>btn.addEventListener('click',()=>{
      const uid=btn.dataset.uid; $('#stgUserView_'+uid).hidden=true; $('#stgUserEdit_'+uid).hidden=false;
    }));
    panel.querySelectorAll('[data-action="cancel-user"]').forEach(btn=>btn.addEventListener('click',()=>{
      const uid=btn.dataset.uid; $('#stgUserEdit_'+uid).hidden=true; $('#stgUserView_'+uid).hidden=false;
    }));
    panel.querySelectorAll('[data-action="save-user"]').forEach(btn=>btn.addEventListener('click',async ()=>{
      const uid=btn.dataset.uid;
      const nm=$('#stgUName_'+uid).value.trim(), lg=$('#stgULogin_'+uid).value.trim(), pw=$('#stgUPass_'+uid).value.trim();
      if(!nm||!lg)return;                       // senha em branco = manter a atual
      const msg=$('#stgUMsg_'+uid); msg.hidden=false; msg.classList.remove('stg-msg-success');
      const r=await cmSaveUser({uid,displayName:nm,login:lg,newPassword:pw});
      if(!r.ok){ msg.textContent=cmUserErr(r.error); return; }
      msg.textContent=t.settingsDataSaved; msg.classList.add('stg-msg-success');
      await cmRefreshUsers();
      setTimeout(()=>stgRenderPanel(lang),1100);
    }));
  }

  /* ---------------- Admin: desbloqueio de passadas ---------------- */
  function stgUnlock(panel,u,lang,t){
    const total=window.QBANK_TOTAL||0;
    let html=`<div class="stg-card"><div class="stg-card-head"><h2>${stgEsc(t.stgSecUnlock)}</h2><p>${stgEsc(t.stgUnlockDesc)}</p></div>`;
    Object.keys(USER_META).forEach(uid=>{
      if(uid===u)return;
      const ceiling=qbUnlockCeiling(uid);
      html+=`<div class="stg-unlock-row">
        <div class="stg-unlock-user">${stgAvatar(uid,36)}<strong>${stgEsc(getUserDisplay(uid))}</strong></div>
        <div class="stg-pass-chips">${stgPassSummary(uid,lang)}</div>
        <div class="stg-unlock-ctl">
          <label>${stgEsc(t.stgUnlockLevel)}</label>
          <select data-unlock="${uid}">
            <option value="1" ${ceiling===1?'selected':''}>${stgEsc(t.stgUnlockAuto)}</option>
            <option value="2" ${ceiling===2?'selected':''}>${stgEsc(t.stgUnlockPass)} 2</option>
            <option value="3" ${ceiling===3?'selected':''}>${stgEsc(t.stgUnlockPass)} 3</option>
            <option value="99" ${ceiling===99?'selected':''}>${stgEsc(t.stgUnlockDirected)}</option>
          </select>
        </div>
      </div>`;
    });
    html+=`<div class="stg-msg" id="stgUnlockMsg" hidden></div></div>`;
    panel.innerHTML=html;
    panel.querySelectorAll('[data-unlock]').forEach(sel=>sel.addEventListener('change',()=>{
      const uid=sel.dataset.unlock, v=sel.value;
      if(v==='1') localStorage.removeItem('couplemed_qb_unlock_'+uid);
      else localStorage.setItem('couplemed_qb_unlock_'+uid,v);
      stgFlashSaved($('#stgUnlockMsg'),t);
      setTimeout(()=>stgRenderPanel(lang),700);
    }));
  }

  /* ---------------- Admin: informações do sistema ---------------- */
  function stgSystem(panel,u,lang,t){
    panel.innerHTML=`
      <div class="stg-card">
        <div class="stg-card-head"><h2>${stgEsc(t.stgSecSystem)}</h2></div>
        <div class="stg-sys-grid">
          <div class="stg-kpi"><b>${STG_VERSION}</b><i>${stgEsc(t.stgSysVersion)}</i></div>
          <div class="stg-kpi"><b>${window.QBANK_TOTAL||0}</b><i>${stgEsc(t.stgSysQuestions)}</i></div>
          <div class="stg-kpi"><b>${stgFlashCount(u)}</b><i>${stgEsc(t.stgSysFlash)}</i></div>
          <div class="stg-kpi"><b>${stgEsc(getUserDisplay(u))}</b><i>${stgEsc(t.stgSysUser)}</i></div>
        </div>
      </div>`;
  }

  function buildBooks(){}
  function qCount(){
    // migração única: se existir a chave antiga e não a nova, copia o valor para preservar o progresso já salvo
    try{
      var oldTotal=localStorage.getItem('couplemed_qbank_uworld_total');
      var newTotal=localStorage.getItem('couplemed_qbank_1_total');
      if(oldTotal!==null && newTotal===null){ localStorage.setItem('couplemed_qbank_1_total', oldTotal); localStorage.removeItem('couplemed_qbank_uworld_total'); }
    }catch(e){}
    return Number(localStorage.getItem('couplemed_qbank_1_total')||0);
  }
  function updateRoundLabels(){const n=qCount(); $$('[data-round-label]').forEach(el=>{const r=el.dataset.roundLabel; el.textContent=`${r} Pass — ${n} questions`;});}
  const COMING_SOON_PAGES=['qbank-2','step-2','step-3','languages','observership','residency-match','links'];
  const QBANK_PAGES=['qbank-1','qbank1-pass-1','qbank1-pass-2','qbank1-pass-3','qbank1-pass-4','library-1','library-2'];
  const WS_ITEMS=[
    {page:'notebooks',   key:'notebooks',   descKey:'wsNotebooksDesc', cls:'ws-ico-nb',   svg:'<rect x="4" y="3" width="15" height="18" rx="2.2" stroke="currentColor" stroke-width="1.8"/><path d="M8 3v18" stroke="currentColor" stroke-width="1.8"/><path d="M12 8h4M12 12h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'},
    {page:'notes',       key:'notes',       descKey:'wsNotesDesc',     cls:'ws-ico-nt',   svg:'<path d="M5 4.5h14v10.5L14.5 20H5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M19 15h-4.5V20" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 9h7M8.5 12.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'},
    {page:'study-planner',key:'studyPlanner',descKey:'wsPlannerDesc',  cls:'ws-ico-pl',   svg:'<rect x="3.5" y="5" width="17" height="15" rx="2.2" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 9.5h17M8 5V3M16 5V3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 13.5h3M8 16.5h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'},
    {page:'links',       key:'linksLabel',  descKey:'wsLinksDesc',     cls:'ws-ico-lk',   svg:'<path d="M10 13.5a3.5 3.5 0 004.9.4l2.6-2.6a3.5 3.5 0 00-4.9-4.9l-1.3 1.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 10.5a3.5 3.5 0 00-4.9-.4l-2.6 2.6a3.5 3.5 0 004.9 4.9l1.3-1.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'}
  ];
  function wsEsc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function renderWorkspace(lang){
    const host=$('#workspacePage'); if(!host)return;
    const t=k=>(I18N[lang]&&I18N[lang][k]!==undefined)?I18N[lang][k]:k;
    const esc=wsEsc;
    const cards=WS_ITEMS.map(it=>`
      <a class="cm-ws-card" href="app.html?page=${it.page}&u=${encodeURIComponent(user())}">
        <span class="cm-ws-ico ${it.cls}"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${it.svg}</svg></span>
        <span class="cm-ws-body">
          <strong>${esc(t(it.key))}</strong>
          <span>${esc(t(it.descKey))}</span>
        </span>
        <span class="cm-ws-arrow" aria-hidden="true">→</span>
      </a>`).join('');
    host.innerHTML=`<div class="cm-ws-inner">
      <header class="cm-ws-head">
        <h1>${esc(t('myWorkspace'))}</h1>
        <p>${esc(t('wsSubtitle'))}</p>
      </header>
      <div class="cm-ws-grid">${cards}</div>
    </div>`;
    preserveUserLinks();
  }
  function updateDynamicContent(lang){
    const p=page(); if(p==='home')return;
    if(p==='settings'){ renderSettings(lang); return; }
    if(p==='my-workspace'){ renderWorkspace(lang); return; }
    if(p==='step1-instructions'){ location.replace(`app.html?page=qbank-1&u=${user()}`); return; }
    if(LIB_TITLE_KEY[p]){ renderLibrary(p,lang); return; }
    if(QBANK_PAGES.includes(p))return; // qbank.js monta e traduz sozinho
    const isCS=COMING_SOON_PAGES.includes(p);
    const isModule=p==='flashcards'||p==='ai-tutor';
    if(isCS||isModule)return;
    const title=$('#internalTitle');
    if(title){const key=PAGE_TITLE_KEYS[p]; title.textContent=(key&&I18N[lang][key])?I18N[lang][key]:p.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');}
  }
  function setLang(lang){sessionStorage.setItem(`couplemed_lang_current_${user()}`,lang); document.documentElement.lang=lang==='pt'?'pt-BR':'en'; $$('[data-i18n]').forEach(el=>{const k=el.dataset.i18n; if(I18N[lang][k]!==undefined)el.textContent=I18N[lang][k];}); $$('[data-i18n-html]').forEach(el=>{const k=el.dataset.i18nHtml; if(I18N[lang][k]!==undefined)el.innerHTML=I18N[lang][k];}); updateDynamicContent(lang); window.dispatchEvent(new CustomEvent('couplemed:langchange',{detail:{lang}}));}
  /* ============================== STUDY STREAK (v49) ==============================
     Sequencia de estudos 100% derivada de dados reais do usuario logado:
     - QBank: dias com >=1 attempt (couplemed_qb_<uid>.attempts[].created_at)
     - Flashcards: dias com >=1 revisao (couplemed_fc_<uid>.days[data].total)
     Estados do card:
       st-active  = estudou hoje (verde, "Continue assim!")
       st-risk    = sequencia viva, mas ainda nao estudou hoje (ambar, urgencia positiva)
       st-restart = sequencia quebrada ou primeiro acesso (neutro, convite a recomecar
                    mostrando o recorde — nunca vermelho punitivo)
     Persistencia: couplemed_streak_<uid> = { days:[...], best:n } — merge aditivo,
     o recorde nunca regride mesmo se dados antigos forem podados. */
  function cmLocalDay(d){const x=new Date(d);return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10)}
  function cmPrevDay(iso){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()-1);return cmLocalDay(d)}
  function cmStreakCompute(){
    const u=user();
    const set=new Set(); let questions=0, fcReviews=0;
    try{
      const qb=JSON.parse(localStorage.getItem('couplemed_qb_'+u)||'{}');
      const at=Array.isArray(qb.attempts)?qb.attempts:[];
      questions=at.length;
      at.forEach(a=>{if(a&&a.created_at)set.add(cmLocalDay(a.created_at))});
    }catch(e){}
    try{
      const fc=JSON.parse(localStorage.getItem('couplemed_fc_'+u)||'{}');
      const days=(fc&&fc.days)?fc.days:{};
      Object.keys(days).forEach(k=>{if(days[k]&&(days[k].total||0)>0)set.add(k)});
      if(fc&&fc.stats&&typeof fc.stats.reviews==='number'&&fc.stats.reviews>0)fcReviews=fc.stats.reviews;
      else Object.keys(days).forEach(k=>{fcReviews+=((days[k]&&days[k].total)||0)});
    }catch(e){}
    let saved={};try{saved=JSON.parse(localStorage.getItem('couplemed_streak_'+u))||{}}catch(e){}
    (Array.isArray(saved.days)?saved.days:[]).forEach(d=>{if(/^\d{4}-\d{2}-\d{2}$/.test(d))set.add(d)});
    const all=[...set].sort();
    let best=Number(saved.best)||0, run=0, prev=null;
    all.forEach(d=>{run=(prev&&cmPrevDay(d)===prev)?run+1:1;if(run>best)best=run;prev=d});
    const today=cmLocalDay(new Date()), yest=cmPrevDay(today);
    const anchor=set.has(today)?today:(set.has(yest)?yest:null);
    let current=0;if(anchor){let d=anchor;while(set.has(d)){current++;d=cmPrevDay(d)}}
    if(current>best)best=current;
    const state=set.has(today)?'active':(anchor?'risk':'restart');
    try{localStorage.setItem('couplemed_streak_'+u,JSON.stringify({days:all.slice(-120),best}))}catch(e){}
    return {set,current,best,state,today,questions,fcReviews};
  }
  function renderStreak(lang){
    const card=document.getElementById('streakCard'); if(!card)return;
    const t=I18N[lang]||I18N.en;
    const d=cmStreakCompute();
    card.classList.remove('st-active','st-risk','st-restart'); card.classList.add('st-'+d.state);
    const icons={
      active:'<path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
      risk:'<circle cx="12" cy="12" r="8.2" stroke="currentColor" stroke-width="2"/><path d="M12 7.8V12l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      restart:'<path d="M5.5 12a6.5 6.5 0 1 1 1.9 4.6M5.5 12V7.8M5.5 12H9.7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    };
    const ic=card.querySelector('.check');
    if(ic)ic.innerHTML='<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'+icons[d.state]+'</svg>';
    const n=d.state==='restart'?0:d.current;
    const strongEl=document.getElementById('streakDays');
    if(strongEl)strongEl.textContent=n+' '+(n===1?t.dayOne:t.dayMany);
    const msg=d.state==='active'?t.keepGoing:(d.state==='risk'?t.streakRisk:(d.best>0?t.streakRestart:t.streakStart));
    const msgEl=document.getElementById('streakMsg'); if(msgEl)msgEl.textContent=msg;
    const wk=document.getElementById('streakWeek');
    if(wk){
      const letters=(t.weekLetters||'M,T,W,T,F,S,S').split(',');
      const now=new Date(); const dow=(now.getDay()+6)%7; /* 0 = segunda-feira */
      let html='';
      for(let i=0;i<7;i++){
        const dt=new Date(now); dt.setDate(now.getDate()-dow+i);
        const iso=cmLocalDay(dt);
        const cls=((d.set.has(iso)?'on ':'')+(iso===d.today?'today':'')).trim();
        html+='<i'+(cls?' class="'+cls+'"':'')+'><b></b><em>'+letters[i]+'</em></i>';
      }
      wk.innerHTML=html;
    }
    const loc=lang==='pt'?'pt-BR':'en-US';
    const be=document.getElementById('streakBest'); if(be)be.textContent=d.best.toLocaleString(loc);
    const qe=document.getElementById('streakQ'); if(qe)qe.textContent=d.questions.toLocaleString(loc);
    const fe=document.getElementById('streakFC'); if(fe)fe.textContent=d.fcReviews.toLocaleString(loc);
  }
  window.addEventListener('couplemed:langchange',e=>{if(page()==='home')renderStreak(e.detail.lang)});

  /* ===== QBank progress no dashboard (v51) — passadas discretas e sequenciais =====
     Espelha, em modo somente-leitura, o modelo do qbank.js: a questão pertence à
     passada N quando já tem >= N attempts; a passada N conclui quando TODAS as
     questões têm >= N attempts. Não altera nenhum dado. */
  function qbAttemptsByQ(uid){
    const map={};
    try{ const db=JSON.parse(localStorage.getItem('couplemed_qb_'+uid)||'{}');
      (db.attempts||[]).forEach(a=>{ (map[a.question_id]=map[a.question_id]||[]).push(a); });
    }catch(e){}
    return map;
  }
  function qbUnlockCeiling(uid){ try{ const v=parseInt(localStorage.getItem('couplemed_qb_unlock_'+uid)||'1',10); return isNaN(v)?1:v; }catch(e){ return 1; } }
  function qbPassProgress(map,total,pn){
    let answered=0; for(const qid in map){ if(map[qid].length>=pn) answered++; }
    const pct=total?Math.round(100*answered/total):0;
    return { total, answered, pct, done: total>0 && answered===total };
  }
  function qbPassState(uid,map,total,pn){
    if(pn===1) return qbPassProgress(map,total,1).done?'completed':'active';
    if(qbPassProgress(map,total,pn).done) return 'completed';
    if(qbPassProgress(map,total,pn-1).done) return 'active';
    if(uid==='john' || qbUnlockCeiling(uid)>=pn) return 'active';
    return 'locked';
  }
  function renderQBankProgress(lang){
    const body=document.getElementById('qbankProgressBody'); if(!body)return;
    const t=I18N[lang]||I18N.en;
    const uid=user();
    const total=window.QBANK_TOTAL||0;
    const map=qbAttemptsByQ(uid);
    const passLabels={1:t.pass1,2:t.pass2,3:t.pass3};
    let html='';
    [1,2,3].forEach(pn=>{
      const prog=qbPassProgress(map,total,pn);
      const state=qbPassState(uid,map,total,pn);
      const locked=state==='locked';
      const done=state==='completed';
      const count = total? (prog.answered+' / '+total) : '0 / 0';
      const btnLabel = done ? (t.qbReview||'Review') : (prog.answered>0 ? t.continueBtn : (t.qbStart||'Start'));
      html+=`<div class="bar-line${locked?' bar-locked':''}${done?' bar-done':''}">
        <div class="bar-body">
          <div class="bar-top">
            <span class="bar-pass">${passLabels[pn]||('Pass '+pn)}${locked?' 🔒':''}${done?' ✓':''}</span>
            <span class="bar-count">${count}</span>
          </div>
          <div class="bar-bottom">
            <div class="bar-progress"><div class="bar-fill" style="width:${prog.pct}%"></div></div>
            <span class="bar-pct">${prog.pct}%</span>
          </div>
        </div>
        <button class="bar-btn" data-qb-pass="${pn}" ${locked?'disabled':''}>${btnLabel}</button>
      </div>`;
    });
    body.innerHTML=html;
    body.querySelectorAll('[data-qb-pass]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const pn=btn.dataset.qbPass;
        location.href='app.html?page=qbank-1&u='+encodeURIComponent(uid)+'&pass='+pn;
      });
    });
  }
  window.addEventListener('couplemed:langchange',e=>{if(page()==='home')renderQBankProgress(e.detail.lang)});

  /* ============================== STUDY TIME (v50) ==============================
     Tempo ativo de estudo na plataforma, por usuario e por dia, com detalhe por modulo.
     REGRAS DO HEARTBEAT (nao alterar sem autorizacao explicita):
     - Tique de 30s (CM_TICK) somado APENAS se: aba visivel (document.hidden===false)
       E houve interacao real (mouse/teclado/scroll/toque) nos ultimos 5 minutos.
     - Trava multi-aba: cada tique grava um timestamp em couplemed_time_<uid>_lock;
       se outra aba contou ha menos de ~28s, esta aba pula a vez (tempo nunca duplica).
     ARMAZENAMENTO: couplemed_time_<uid> = { "YYYY-MM-DD": { modulo: segundos, ... } }
     Modulos fixos (taxonomia estavel para o Performance Analytics futuro):
       qbank | flashcards | library | workspace | other
     O dashboard exibe Hoje / 7 dias / Total; o detalhe por modulo fica guardado. */
  const CM_TICK=30;                 /* segundos por tique */
  const CM_IDLE_MS=5*60*1000;      /* limite de inatividade: 5 min */
  let cmLastActivity=Date.now();
  function cmTimeKey(){return 'couplemed_time_'+user()}
  function cmModuleOf(p){
    if(/^qbank/.test(p))return 'qbank';
    if(p==='flashcards')return 'flashcards';
    if(/^library-/.test(p)||p==='medical-library')return 'library';
    if(p==='my-workspace'||/^notebook/.test(p))return 'workspace';
    return 'other';
  }
  function cmTimeDb(){let db;try{db=JSON.parse(localStorage.getItem(cmTimeKey()))||{}}catch(e){db={}}return db}
  function cmTimeTotals(){
    const db=cmTimeDb();
    const today=cmLocalDay(new Date());
    const week=new Set();for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);week.add(cmLocalDay(d))}
    let tToday=0,t7=0,tAll=0;
    Object.keys(db).forEach(day=>{
      const rec=db[day]||{};let s=0;
      Object.keys(rec).forEach(m=>{s+=Number(rec[m])||0});
      tAll+=s; if(day===today)tToday=s; if(week.has(day))t7+=s;
    });
    return {tToday,t7,tAll};
  }
  function cmFmtTime(sec){
    sec=Math.max(0,Math.floor(sec));
    const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);
    return h>0?(h+'h '+(m<10?'0':'')+m+'m'):(m+'m');
  }
  function renderStudyTime(){
    const t=cmTimeTotals();
    const a=document.getElementById('timeToday'); if(a)a.textContent=cmFmtTime(t.tToday);
    const b=document.getElementById('timeWeek');  if(b)b.textContent=cmFmtTime(t.t7);
    const c=document.getElementById('timeTotal'); if(c)c.textContent=cmFmtTime(t.tAll);
  }
  function cmStartTimeTracking(){
    ['mousemove','mousedown','keydown','scroll','touchstart'].forEach(ev=>
      window.addEventListener(ev,()=>{cmLastActivity=Date.now()},{passive:true}));
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){cmLastActivity=Date.now(); if(page()==='home')renderStudyTime();}
    });
    setInterval(()=>{
      if(document.hidden)return;                                  /* aba oculta: pausa */
      if(Date.now()-cmLastActivity>CM_IDLE_MS)return;             /* inativo >5min: pausa */
      const lockKey=cmTimeKey()+'_lock';
      const now=Date.now();
      const last=Number(localStorage.getItem(lockKey)||0);
      if(now-last<CM_TICK*1000-2000)return;                       /* outra aba ja contou */
      try{localStorage.setItem(lockKey,String(now))}catch(e){}
      const db=cmTimeDb();
      const day=cmLocalDay(new Date());
      const rec=db[day]=db[day]||{};
      const mod=cmModuleOf(page());
      rec[mod]=(Number(rec[mod])||0)+CM_TICK;
      try{localStorage.setItem(cmTimeKey(),JSON.stringify(db))}catch(e){}
      if(page()==='home')renderStudyTime();                       /* card se atualiza ao vivo */
    },CM_TICK*1000);
  }

  function initPlatform(){if(!document.body.classList.contains('platform-page'))return; preserveUserLinks(); buildBooks(); updateRoundLabels(); const p=page(); document.body.dataset.page=p; if(p!=='home'){document.body.classList.add('internal'); $('#homeDashboard').hidden=true; $('#internalContent').hidden=false;
    const isQBank=QBANK_PAGES.includes(p);
    const isCS=COMING_SOON_PAGES.includes(p);
    const isModule=p==='flashcards'||p==='ai-tutor'||isQBank;
    const cs=$('#comingSoonPage'); const rp=$('#regularPage'); const wp=$('#workspacePage');
    if(cs) cs.hidden=true;
    if(wp) wp.hidden=true;
    if(p==='my-workspace'){ if(wp)wp.hidden=false; if(rp)rp.hidden=true; }
    else if(isCS){if(cs)cs.hidden=false; if(rp)rp.hidden=true;}
    else{if(rp)rp.hidden=false;}
  } else {document.body.classList.remove('internal');}
    $$('[data-toggle]').forEach(btn=>btn.addEventListener('click',()=>{const el=$('#'+btn.dataset.toggle); if(el)el.classList.toggle('open');}));
    $$('[data-page-link]').forEach(a=>{if(a.dataset.pageLink===p){a.classList.add('active'); let anc=a.closest('.submenu'); while(anc){anc.classList.add('open'); anc=anc.parentElement?anc.parentElement.closest('.submenu'):null;}}});
    // itens de menu que são link (navegam) E toggle (abrem submenu) ao mesmo tempo: ao navegar
    // para a própria página do item, o submenu deve ficar aberto, já que o data-page-link acima
    // só cobre os links FILHOS do submenu, não o pai que os contém. (Step 1 é toggle puro; esta
    // regra fica disponível caso algum item futuro combine link + toggle.)
    $$('[data-toggle][data-page-link]').forEach(btn=>{ if(btn.dataset.pageLink===p){ const el=$('#'+btn.dataset.toggle); if(el)el.classList.add('open'); } });
    /* v51 — idioma inicial: sessão > preferência do usuário > inglês (padrão do site) */
    const prefs=getPrefs(user()); touchLastAccess(user());
    const sessLang=sessionStorage.getItem(`couplemed_lang_current_${user()}`);
    const bootLang = sessLang==='pt'||sessLang==='en' ? sessLang : (prefs.lang||'en');
    $$('.flag-button').forEach(btn=>btn.addEventListener('click',()=>setLang(btn.dataset.lang))); setLang(bootLang);
    const sidebarUserEl=$('#sidebarUserName'); if(sidebarUserEl){ sidebarUserEl.textContent=getUserDisplay(user()); }
    /* v51 — tema inicial: preferência do usuário; sem preferência, mantém o comportamento
       original (home escuro, páginas internas claras). O botão do topo continua livre. */
    const applyTheme=t=>document.body.classList.toggle('light',t!=='dark');
    applyTheme(prefs.theme || (p==='home'?'dark':'light'));
    const theme=$('#themeToggle'); if(theme)theme.addEventListener('click',()=>applyTheme(document.body.classList.contains('light')?'dark':'light'));
    const mobile=$('#mobileMenuButton'), side=$('#sidebar'), scrim=$('#sidebarScrim'); if(mobile)mobile.addEventListener('click',()=>{side.classList.add('open');scrim.classList.add('open')}); if(scrim)scrim.addEventListener('click',()=>{side.classList.remove('open');scrim.classList.remove('open')});
    const logout=$('#logoutLink'); if(logout)logout.addEventListener('click',async e=>{
      e.preventDefault();
      try{ await fetch('/api/logout',{method:'POST',credentials:'same-origin'}); }catch(err){}
      sessionStorage.removeItem('couplemed_active_user');
      localStorage.removeItem(USERS_CACHE_KEY);
      location.href='index.html';
    });
    initSiteSearch();
    cmStartTimeTracking();
    if(p==='home'){const hl=sessionStorage.getItem(`couplemed_lang_current_${user()}`)==='pt'?'pt':'en';renderStreak(hl);renderStudyTime();(function qbProg(tries){ if(window.QBANK_TOTAL){ renderQBankProgress(hl); return; } if(tries<40) setTimeout(()=>qbProg(tries+1),100); })(0);}
    /* — QBank sidebar: atualiza "0 / XXXX" com SEED.length real —
       Retry porque qbank.js pode carregar depois de site.js */
    (function fillQBankTotal(tries){
      var t = window.QBANK_TOTAL || 0;
      if(!t){ if(tries<40){ return setTimeout(function(){fillQBankTotal(tries+1);}, 100); } return; }
      document.querySelectorAll('.bar-count').forEach(function(el){
        var m = el.textContent.match(/^(\d+)\s*\//);
        el.textContent = (m?m[1]:'0') + ' / ' + t;
      });
    })(0);
  }

  /* ============================== BUSCA GLOBAL ==============================
     Estilo Spotlight/Google: cobre TUDO que existe na plataforma — menu,
     Medical Library (Library 1/2, pastas e tópicos), QBank (questões e notas do
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
    // Medical Library — Biblioteca 1: 26 pastas + tópicos dentro delas
    LIBRARY1_STRUCTURE.forEach(folder=>{
      const slug = slugify(folder.name);
      idx.push({ label: folder.name, snippetSource:'', href: `app.html?page=library-1&u=${user()}&folder=${slug}`, cat: 'Medical Library · Library 1' });
      folder.items.forEach(topic=>{
        idx.push({ label: topic, snippetSource:'', href: `app.html?page=library-1&u=${user()}&folder=${slug}`, cat: `Library 1 · ${folder.name}` });
      });
    });
    // Medical Library — Biblioteca 2: 17 pastas
    (LIB_FOLDERS['library-2']||[]).forEach(name=>{
      idx.push({ label: name, snippetSource:'', href: `app.html?page=library-2&u=${user()}`, cat: 'Medical Library · Library 2' });
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
