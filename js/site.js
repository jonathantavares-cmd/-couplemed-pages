(function(){
  const USERS = { 'Ja@120622':'john', 'Aj@120622':'alysson', 'Gmed@07':'guest1', 'Gmed@77':'guest2' };
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
    en: {home:'Home',myNotebook:'My Notebook',notebooks:'Notebooks',notes:'Notes',studyPlanner:'Study Planner',weekPlanner:'Week Planner',monthPlanner:'Month Planner',studyMaterials:'Study Materials',medicalLibrary:'Medical Library',languages:'Languages / English',settings:'Settings',logout:'Logout',readyTitle:'Page ready to receive content',readyDesc:'This internal area opens with a white background by fixed rule. The sidebar remains navy like the initial platform.'},
    pt: {home:'Home',myNotebook:'Meu Caderno',notebooks:'Cadernos',notes:'Anotações',studyPlanner:'Planejador de Estudos',weekPlanner:'Planejador Semanal',monthPlanner:'Planejador Mensal',studyMaterials:'Materiais de Estudo',medicalLibrary:'Biblioteca Médica',languages:'Idiomas / Inglês',settings:'Configurações',logout:'Sair',readyTitle:'Página pronta para receber conteúdo',readyDesc:'Esta área interna abre com fundo branco por regra fixa. O menu lateral permanece azul navy como na plataforma inicial.'}
  };
  const $ = (s,root=document)=>root.querySelector(s); const $$=(s,root=document)=>[...root.querySelectorAll(s)];
  function params(){return new URLSearchParams(location.search)}
  function user(){return params().get('u')||sessionStorage.getItem('couplemed_active_user')||'guest1'}
  function page(){return params().get('page')||'home'}
  function preserveUserLinks(){const u=user(); $$('a[href^="app.html"]').forEach(a=>{const url=new URL(a.getAttribute('href'),location.href); url.searchParams.set('u',u); a.href=url.pathname.split('/').pop()+url.search;});}
  function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
  function draw(key,arr){let deck;try{deck=JSON.parse(localStorage.getItem(key)||'[]')}catch(e){deck=[]}if(!Array.isArray(deck)||!deck.length)deck=shuffle([...arr.keys()]);const idx=deck.shift();localStorage.setItem(key,JSON.stringify(deck));return arr[idx]||arr[0]}
  function initLogin(){const form=$('#loginForm'); if(!form)return; form.addEventListener('submit',e=>{e.preventDefault(); const pass=$('#password').value.trim(); const u=USERS[pass]; const msg=$('#loginMessage'); if(!u){msg.textContent='Invalid password.';return} sessionStorage.setItem('couplemed_active_user',u); $('.access-submit').classList.add('loading'); document.body.style.transition='opacity .45s ease'; document.body.style.opacity='.22'; setTimeout(()=>{location.href=(u==='john'||u==='alysson')?`transition.html?u=${u}`:`app.html?u=${u}`},460);});}
  function initTransition(){const q=$('#transitionQuote'); if(!q)return; const u=params().get('u'); if(!['john','alysson'].includes(u)){location.replace('index.html');return} sessionStorage.setItem('couplemed_active_user',u); q.textContent=draw(`couplemed_transition_deck_${u}`,quotes); setTimeout(()=>$('.transition-viewport').classList.add('fading'),6450); setTimeout(()=>location.href=`app.html?u=${u}`,7000);}
  function buildBooks(){['library-rd','library-uworld'].forEach(id=>{const el=$('#'+id); if(!el||el.dataset.done)return; const prefix=id.replace('library-',''); for(let i=1;i<=17;i++){const a=document.createElement('a'); a.textContent=`Book ${i}`; a.href=`app.html?page=${prefix}-book-${i}&u=${user()}`; a.dataset.pageLink=`${prefix}-book-${i}`; el.appendChild(a)} el.dataset.done='1';});}
  function qCount(){return Number(localStorage.getItem('couplemed_qbank_uworld_total')||0)}
  function updateRoundLabels(){const n=qCount(); $$('[data-round-label]').forEach(el=>{const r=el.dataset.roundLabel; el.textContent=`Pass/Round ${r} — ${n} questions`;});}
  function setLang(lang){sessionStorage.setItem(`couplemed_lang_current_${user()}`,lang); document.documentElement.lang=lang==='pt'?'pt-BR':'en'; $$('[data-i18n]').forEach(el=>{const k=el.dataset.i18n; if(I18N[lang][k])el.textContent=I18N[lang][k];}); const title=$('#internalTitle'), desc=$('#internalDescription'); if(title&&page()==='home')title.textContent=I18N[lang].readyTitle; if(desc)desc.textContent=I18N[lang].readyDesc;}
  function initPlatform(){if(!document.body.classList.contains('platform-page'))return; preserveUserLinks(); buildBooks(); updateRoundLabels(); const p=page(); document.body.dataset.page=p; if(p!=='home'){document.body.classList.add('internal'); $('#homeDashboard').hidden=true; $('#internalContent').hidden=false; const title=$('#internalTitle'); if(title) title.textContent = p.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');} else {document.body.classList.remove('internal');}
    $$('[data-toggle]').forEach(btn=>btn.addEventListener('click',()=>{const el=$('#'+btn.dataset.toggle); if(el)el.classList.toggle('open');}));
    $$('[data-page-link]').forEach(a=>{if(a.dataset.pageLink===p){a.classList.add('active'); let anc=a.closest('.submenu'); while(anc){anc.classList.add('open'); anc=anc.parentElement?anc.parentElement.closest('.submenu'):null;}}});
    $$('.flag-button').forEach(btn=>btn.addEventListener('click',()=>setLang(btn.dataset.lang))); setLang(sessionStorage.getItem(`couplemed_lang_current_${user()}`)==='pt'?'pt':'en');
    const applyTheme=t=>document.body.classList.toggle('light',t!=='dark'); applyTheme(p==='home'?'dark':'light'); const theme=$('#themeToggle'); if(theme)theme.addEventListener('click',()=>applyTheme(document.body.classList.contains('light')?'dark':'light'));
    const mobile=$('#mobileMenuButton'), side=$('#sidebar'), scrim=$('#sidebarScrim'); if(mobile)mobile.addEventListener('click',()=>{side.classList.add('open');scrim.classList.add('open')}); if(scrim)scrim.addEventListener('click',()=>{side.classList.remove('open');scrim.classList.remove('open')});
    const logout=$('#logoutLink'); if(logout)logout.addEventListener('click',()=>sessionStorage.removeItem('couplemed_active_user'));
  }
  initLogin(); initTransition(); initPlatform();
})();
