/* CoupleMed — Motor único de tradução dinâmica de CONTEÚDO (não confundir com i18n de UI/labels,
   que cada módulo mantém em seu próprio dicionário T[lang]).

   PADRÃO DO PROJETO (vale para QUALQUER conteúdo novo adicionado ao site — QBank, Flashcards,
   Medical Library, AI Tutor, e o que vier depois):
     1. Todo conteúdo de texto é criado/armazenado em INGLÊS.
     2. Ao marcar um elemento com data-cm-i18n-text + data-cm-original="<texto em inglês>",
        este motor cuida de exibir a tradução para PT quando o idioma ativo for português,
        e o texto original quando for inglês — sem o módulo precisar reimplementar nada.
     3. Toda tradução obtida é armazenada em cache PERSISTENTE (localStorage), com chave
        própria por texto+idioma — ou seja, o "banco" de traduções cresce com o uso e nunca
        precisa re-traduzir o mesmo texto duas vezes, mesmo em sessões diferentes.
     4. Nunca se aceita cegamente o que a API de tradução devolve: respostas de erro
        conhecidas (ex.: "PLEASE SELECT TWO DISTINCT LANGUAGES") são filtradas e o texto
        original é mantido nesses casos.

   Uso básico por qualquer módulo:
     window.CMI18N.span(text)              -> retorna o HTML de um <span> marcado e escapado
     window.CMI18N.translateAllVisible(root)-> traduz todos os spans marcados dentro de `root`
     window.CMI18N.lang()                   -> 'en' | 'pt' (idioma ativo no momento)
*/
(function(){
  'use strict';

  const TRANSLATE_API = 'https://api.mymemory.translated.net/get';
  const CACHE_KEY = 'couplemed_i18n_content_cache_v1'; // banco persistente EN->PT (e futuros idiomas)
  const CHUNK = 480; // limite seguro por request da MyMemory API

  // Respostas de erro/aviso que a API às vezes devolve dentro de translatedText em vez de
  // uma tradução real. Nunca podem virar conteúdo exibido — nesses casos mantém-se o original.
  const BAD_TRANSLATION_PATTERNS = [
    /select two distinct languages/i,
    /invalid (source|target) language/i,
    /must be a valid language pair/i,
    /is an invalid target language/i,
    /is an invalid source language/i,
    /mymemory warning/i,
    /quota.*exceeded/i,
    /no translation/i,
  ];
  function isBadTranslation(out){
    if(!out || typeof out!=='string') return true;
    return BAD_TRANSLATION_PATTERNS.some(re=>re.test(out));
  }

  function esc(s){
    return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // ---------- banco persistente (localStorage) ----------
  let bank = null;
  function loadBank(){
    if(bank) return bank;
    try{ bank = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
    catch(e){ bank = {}; }
    return bank;
  }
  let saveTimer = null;
  function saveBankDebounced(){
    if(saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(()=>{
      try{ localStorage.setItem(CACHE_KEY, JSON.stringify(loadBank())); }catch(e){}
    }, 300);
  }
  function bankKey(text, targetLang){ return targetLang + '::' + text; }
  function getCached(text, targetLang){
    return loadBank()[bankKey(text, targetLang)];
  }
  function setCached(text, targetLang, translated){
    loadBank()[bankKey(text, targetLang)] = translated;
    saveBankDebounced();
  }

  // ---------- idioma ativo ----------
  function lang(){ return document.documentElement.lang === 'pt-BR' ? 'pt' : 'en'; }

  // ---------- tradução de um texto (com cache e proteção contra respostas ruins) ----------
  async function translateChunk(text, targetLang, sourceLang){
    const url = `${TRANSLATE_API}?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    try{
      const resp = await fetch(url);
      const data = await resp.json();
      const out = data && data.responseData && data.responseData.translatedText;
      return (out && !isBadTranslation(out)) ? out : text;
    }catch(e){ return text; }
  }
  async function translateText(text, targetLang, sourceLang){
    if(!text || !text.trim()) return text;
    if(targetLang === (sourceLang||'en')) return text; // já está no idioma de origem, nada a fazer
    const cached = getCached(text, targetLang);
    if(cached) return cached;
    let out;
    if(text.length <= CHUNK){
      out = await translateChunk(text, targetLang, sourceLang||'en');
    } else {
      // quebra por sentenças para não estourar o limite da API, preservando ordem
      const parts = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
      const chunks = []; let cur = '';
      parts.forEach(p=>{
        if((cur+p).length > CHUNK){ if(cur) chunks.push(cur); cur = p; }
        else cur += p;
      });
      if(cur) chunks.push(cur);
      const pieces = [];
      for(const c of chunks) pieces.push(await translateChunk(c, targetLang, sourceLang||'en'));
      out = pieces.join(' ');
    }
    setCached(text, targetLang, out);
    return out;
  }

  // ---------- integração via DOM: marcação declarativa ----------
  // Qualquer módulo gera: `<span data-cm-i18n-text data-cm-original="texto em inglês">texto em inglês</span>`
  function span(text, cls){
    if(text==null || text==='') return '';
    const safe = esc(String(text));
    return `<span class="${cls||''}" data-cm-i18n-text data-cm-original="${safe}">${safe}</span>`;
  }

  let renderToken = 0;
  function bumpToken(){ return ++renderToken; }
  async function translateAllVisible(root, sourceLang){
    if(!root) return;
    const myToken = renderToken;
    const targetLang = lang();
    const nodes = root.querySelectorAll('[data-cm-i18n-text]');
    nodes.forEach(async el=>{
      const original = el.dataset.cmOriginal;
      if(!original) return;
      const translated = targetLang==='en' ? original : await translateText(original, targetLang, sourceLang||'en');
      if(renderToken !== myToken) return; // usuário já navegou para outra tela nesse meio tempo
      el.textContent = translated;
    });
  }

  window.CMI18N = {
    lang, span, translateText, translateAllVisible, bumpToken,
    isBadTranslation, // exposto para eventuais testes/depuração
    getCached, setCached, // para módulos com necessidades específicas (ex: origem autodetect)
  };
})();
