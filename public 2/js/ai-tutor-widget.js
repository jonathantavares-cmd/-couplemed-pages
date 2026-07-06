/* CoupleMed — AI Tutor Widget v2 (bilíngue, temas, sincronizado com usuários e Flashcards) */
(function () {
  'use strict';
  let started = false;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  function init(){
    if (started || !document.body.classList.contains('platform-page')) return;
    started = true;

    const params = new URLSearchParams(location.search);
    const USER = params.get('u') || 'guest';
    const PAGE = params.get('page') || 'home';
    const CHAT_KEY = `couplemed_tutor_chat_${USER}`;
    const FC_KEY = `couplemed_fc_${USER}`;

    const MODES = [
      { id: 'socratico', pt: 'Tutor Socrático', en: 'Socratic Tutor' },
      { id: 'nbme',      pt: 'NBME Trainer',   en: 'NBME Trainer' },
      { id: 'caso',      pt: 'Discussão de Caso', en: 'Case Discussion' },
      { id: 'erro',      pt: 'Revisão de Erros',  en: 'Error Review' },
      { id: 'anki',      pt: 'Gerador de Flashcards', en: 'Flashcard Builder' }
    ];
    const T = {
      en: { title:'AI Tutor', ph:'Type your question or topic…', send:'Send',
        hello:'Hi! Pick a study mode above and tell me the topic (e.g., type III hypersensitivity, inferior MI ECG, sickle cell anemia).',
        modeChanged: l => `Mode switched to "${l}". Which topic do you want to study now?`,
        thinking:'Thinking…', connError:'Connection error. Please try again.', errPrefix:'Error: ',
        toFc:'⇄ Import into Flashcards', imported: n => `${n} card${n===1?'':'s'} imported into the "AI Tutor" deck in Flashcards.`,
        noneFound:'No "front :: back" lines found in this reply.', clear:'Clear chat' },
      pt: { title:'AI Tutor', ph:'Digite sua pergunta ou tema…', send:'Enviar',
        hello:'Olá! Escolha um modo de estudo acima e me diga o tema (ex.: hipersensibilidade tipo III, ECG em IAM inferior, anemia falciforme).',
        modeChanged: l => `Modo alterado para "${l}". Sobre qual tema você quer estudar agora?`,
        thinking:'Pensando…', connError:'Erro de conexão. Tente novamente.', errPrefix:'Erro: ',
        toFc:'⇄ Importar nos Flashcards', imported: n => `${n} card${n===1?'':'s'} importado${n===1?'':'s'} no deck "AI Tutor" dos Flashcards.`,
        noneFound:'Nenhuma linha "frente :: verso" encontrada nesta resposta.', clear:'Limpar conversa' }
    };
    const lang = () => document.documentElement.lang === 'pt-BR' ? 'pt' : 'en';
    const t = k => T[lang()][k];
    
    /* ---------- tradução dinâmica de respostas ----------
       Usa o motor único e compartilhado window.CMI18N (js/i18n-content.js) — mesmo banco
       persistente de traduções usado pelo QBank, Flashcards e Medical Library. */
    async function translateText(text, fromLang, toLang){
      if(text.length > 500) return text;
      if(!window.CMI18N) return text;
      return window.CMI18N.translateText(text, toLang, fromLang);
    }
    async function translateAssistantMessages(){
      const oldLang = lang() === 'pt' ? 'en' : 'pt';
      const newLang = lang();
      const panel = document.querySelector('.ai-tutor-messages');
      if(!panel) return;
      const msgs = panel.querySelectorAll('.ai-tutor-msg.assistant');
      for(const msg of msgs){
        const original = msg.dataset.original || msg.textContent;
        if(!msg.dataset.original) msg.dataset.original = original;
        const translated = await translateText(original, oldLang, newLang);
        msg.textContent = translated;
        msg.dataset.lang = newLang;
      }
    }

    /* ---------- estado persistente por usuário (sessão) ---------- */
    function loadChat(){
      try { const d = JSON.parse(sessionStorage.getItem(CHAT_KEY)); if (d && Array.isArray(d.historico)) return d; } catch(e){}
      return { historico: [], modo: 'socratico' };
    }
    const state = loadChat();
    const saveChat = () => sessionStorage.setItem(CHAT_KEY, JSON.stringify(state));
    let carregando = false;

    /* ---------- UI ---------- */
    const launcher = document.createElement('button');
    launcher.className = 'ai-tutor-launcher';
    launcher.setAttribute('aria-label', 'AI Tutor');
    launcher.innerHTML = '🎓';

    const panel = document.createElement('div');
    panel.className = 'ai-tutor-panel';
    panel.innerHTML = `
      <div class="ai-tutor-header">
        <h2></h2>
        <div><button class="ai-tutor-clear" title=""></button>
        <button class="ai-tutor-close" aria-label="Close">✕</button></div>
      </div>
      <div class="ai-tutor-modes"></div>
      <div class="ai-tutor-messages"></div>
      <div class="ai-tutor-inputbar">
        <textarea aria-label="AI Tutor message"></textarea>
        <button type="button" class="ai-tutor-send"></button>
      </div>`;
    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    const modesEl = panel.querySelector('.ai-tutor-modes');
    const msgsEl = panel.querySelector('.ai-tutor-messages');
    const textarea = panel.querySelector('textarea');
    const sendBtn = panel.querySelector('.ai-tutor-send');

    function applyTexts(){
      panel.querySelector('h2').textContent = t('title');
      textarea.placeholder = t('ph');
      sendBtn.textContent = t('send');
      panel.querySelector('.ai-tutor-clear').textContent = '⟲';
      panel.querySelector('.ai-tutor-clear').title = t('clear');
      modesEl.querySelectorAll('.ai-tutor-mode-btn').forEach(b => {
        const m = MODES.find(x => x.id === b.dataset.mode);
        b.textContent = m[lang()];
      });
    }

    MODES.forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'ai-tutor-mode-btn' + (m.id === state.modo ? ' active' : '');
      btn.dataset.mode = m.id;
      btn.addEventListener('click', () => {
        state.modo = m.id; state.historico = []; saveChat();
        modesEl.querySelectorAll('.ai-tutor-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        msgsEl.innerHTML = '';
        addMsg('assistant', t('modeChanged')(m[lang()]));
      });
      modesEl.appendChild(btn);
    });

    function addMsg(role, texto, opts){
      const div = document.createElement('div');
      div.className = `ai-tutor-msg ${role}`;
      div.textContent = texto;
      if(role === 'assistant'){
        div.dataset.original = texto;
        div.dataset.lang = lang();
      }
      if (opts && opts.fcButton) attachFcButton(div, texto);
      msgsEl.appendChild(div);
      msgsEl.scrollTop = msgsEl.scrollHeight;
      return div;
    }

    /* ---------- ponte com o módulo Flashcards ---------- */
    function parseCards(texto){
      return texto.split('\n').map(l => l.trim()).filter(l => l.includes('::'))
        .map(l => { const i = l.indexOf('::');
          return { front: l.slice(0, i).trim(), back: l.slice(i + 2).trim() }; })
        .filter(c => c.front && c.back);
    }
    function importToFlashcards(cards){
      let db;
      try { db = JSON.parse(localStorage.getItem(FC_KEY)); } catch(e){}
      if (!db || !db.decks || !db.cards) db = { decks: [], cards: [], stats: { reviews: 0, correct: 0 }, sharedProgress: {}, prefs: { source: 'mine' } };
      db.stats = db.stats || { reviews: 0, correct: 0 };
      db.sharedProgress = db.sharedProgress || {};
      db.prefs = db.prefs || { source: 'mine' };
      let deck = db.decks.find(d => d.name === 'AI Tutor');
      if (!deck) { deck = { id: 'dk_aitutor_' + USER, name: 'AI Tutor' }; db.decks.push(deck); }
      const today = new Date().toISOString().slice(0, 10);
      cards.forEach(c => db.cards.push({
        id: 'fc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        deckId: deck.id, front: c.front, back: c.back, tags: ['ai-tutor'], type: 'basic',
        source: 'ai_tutor', shared: false, createdAt: today,
        interval: 1, ease: 2.5, repetitions: 0, lapses: 0, dueDate: today
      }));
      localStorage.setItem(FC_KEY, JSON.stringify(db));
      return cards.length;
    }
    function attachFcButton(div, texto){
      const cards = parseCards(texto);
      if (!cards.length) return;
      const b = document.createElement('button');
      b.className = 'ai-tutor-fc-btn';
      b.textContent = t('toFc');
      b.addEventListener('click', () => {
        const n = importToFlashcards(cards);
        b.disabled = true;
        b.textContent = '✓ ' + t('imported')(n);
      });
      div.appendChild(document.createElement('br'));
      div.appendChild(b);
    }

    /* ---------- envio ---------- */
    async function enviar(){
      const texto = textarea.value.trim();
      if (!texto || carregando) return;
      textarea.value = '';
      addMsg('user', texto);
      state.historico.push({ role: 'user', content: texto });
      saveChat();
      carregando = true; sendBtn.disabled = true;
      const loadingEl = addMsg('assistant loading', t('thinking'));
      try {
        const res = await fetch('/tutor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pergunta: texto, historico: state.historico.slice(0, -1), modo: state.modo })
        });
        const data = await res.json();
        loadingEl.remove();
        if (data.error) { addMsg('assistant', t('errPrefix') + data.error); return; }
        addMsg('assistant', data.resposta, { fcButton: state.modo === 'anki' });
        state.historico.push({ role: 'assistant', content: data.resposta });
        saveChat();
      } catch (err) {
        loadingEl.remove();
        addMsg('assistant', t('connError'));
      } finally {
        carregando = false; sendBtn.disabled = false;
      }
    }
    sendBtn.addEventListener('click', enviar);
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
    });

    launcher.addEventListener('click', () => panel.classList.toggle('open'));
    panel.querySelector('.ai-tutor-close').addEventListener('click', () => panel.classList.remove('open'));
    panel.querySelector('.ai-tutor-clear').addEventListener('click', () => {
      state.historico = []; saveChat(); msgsEl.innerHTML = ''; addMsg('assistant', t('hello'));
    });

    /* ---------- restauração + idioma dinâmico ---------- */
    function restore(){
      msgsEl.innerHTML = '';
      if (state.historico.length){
        state.historico.forEach(m => addMsg(m.role === 'user' ? 'user' : 'assistant', m.content,
          { fcButton: m.role === 'assistant' && state.modo === 'anki' }));
      } else addMsg('assistant', t('hello'));
    }
    applyTexts();
    restore();
    new MutationObserver(() => { applyTexts(); translateAssistantMessages(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    /* Na página AI Tutor do menu, o painel já abre sozinho */
    if (PAGE === 'ai-tutor') panel.classList.add('open');
  }
})();
