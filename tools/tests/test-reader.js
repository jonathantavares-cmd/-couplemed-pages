/* Teste do leitor da Library 1 num DOM real (jsdom), sem browser.
   Comportamento verificado:
     - a página mostra SÓ texto; imagem abre ao clicar no nome ("image 1")
     - tradução vem do TRADUTOR GLOBAL do site (evento couplemed:langchange)
     - texto, legendas e imagens trocam juntos, inclusive com a imagem aberta */
const { JSDOM } = require(process.env.JSDOM_PATH || 'jsdom');
const fs = require('fs');
const REPO = require('path').resolve(__dirname, '../..');

const dom = new JSDOM(`<!doctype html><html lang="en"><body><div id="host"></div></body></html>`, {
  url: 'https://couplemed.test/app.html?page=library-1&u=john&folder=allergy-and-immunology&topic=anaphylaxis',
  pretendToBeVisual: true,
  runScripts: 'dangerously'
});
const { window } = dom;
window.Element.prototype.scrollIntoView = function(){};

const readerScript = window.document.createElement('script');
readerScript.textContent = fs.readFileSync(REPO + '/public/js/library1-reader.js','utf8');
window.document.head.appendChild(readerScript);

const document = window.document;
const localStorage = window.localStorage;

const downloads = [], blobs = [];
// jsdom não busca rede nem tem FileReader útil: stub para o download embutir a imagem
window.fetch = () => Promise.resolve({ ok:true, blob: () => Promise.resolve(new OrigBlob(['x'],{type:'image/webp'})) });
window.FileReader = function(){
  this.readAsDataURL = () => { this.result = 'data:image/webp;base64,eA=='; setTimeout(()=>this.onload && this.onload(), 0); };
};
const OrigBlob = window.Blob;
window.Blob = function(parts, opts){ const b = new OrigBlob(parts, opts); b.__text = (parts||[]).join(''); return b; };
window.URL.createObjectURL = b => { blobs.push(b); return 'blob:test-'+blobs.length; };
window.URL.revokeObjectURL = () => {};
const origCreate = window.document.createElement.bind(window.document);
window.document.createElement = function(tag){
  const el = origCreate(tag);
  if(tag==='a'){ el.click = function(){ if(el.download) downloads.push(el.download); }; }
  if(tag==='link'){ setTimeout(()=>el.dispatchEvent(new window.Event('load')),0); }
  if(tag==='script'){
    setTimeout(()=>{
      window.LIBRARY1_CONTENT = {
        'allergy-and-immunology': {
          'anaphylaxis': {
            assets: {
              'image-1': { kind:'image', n:1,
                en:{key:'x/image-1-en.webp', alt:'Management algorithm'},
                pt:{key:'x/image-1-pt.webp', alt:'Algoritmo de manejo'} },
              'image-2': { kind:'image', n:2,
                en:{key:'x/image-2-en.webp', alt:'Skin findings'},
                pt:{key:'x/image-2-pt.webp', alt:'Achados cutaneos'} },
              'table-1': { kind:'table', n:1,
                en:{key:'x/table-1-en.webp', alt:'Dosing'},
                pt:{key:'x/table-1-pt.webp', alt:'Doses'} }
            },
            en:{ title:'Anaphylaxis', html:'<h2>Clinical features</h2><p>Rapid onset of <strong>urticaria</strong> and hypotension (<a class="l1r-ref" data-ref="image-1">image 1</a>).</p><ul><li>Airway edema (<a class="l1r-ref" data-ref="image-2">image 2</a>)</li><li>Wheezing</li></ul><p>Dosing is summarized in (<a class="l1r-ref" data-ref="table-1">table 1</a>).</p>' },
            pt:{ title:'Anafilaxia', html:'<h2>Achados clinicos</h2><p>Inicio rapido de <strong>urticaria</strong> e hipotensao (<a class="l1r-ref" data-ref="image-1">imagem 1</a>).</p><ul><li>Edema de via aerea (<a class="l1r-ref" data-ref="image-2">imagem 2</a>)</li><li>Sibilancia</li></ul><p>As doses estao resumidas na (<a class="l1r-ref" data-ref="table-1">tabela 1</a>).</p>' }
          }
        }
      };
      el.dispatchEvent(new window.Event('load'));
    },0);
  }
  return el;
};

const host = document.getElementById('host');
const topic  = { name:'Anaphylaxis', ptName:'Anafilaxia' };
const folder = { name:'Allergy & Immunology', ptName:'Alergia e Imunologia' };

let failures = 0;
const ok = (label, cond, extra) => {
  console.log(`${cond?'  ✅':'  ❌'} ${label}${cond?'':'  <-- '+(extra||'')}`);
  if(!cond) failures++;
};
// simula o tradutor global do site (site.js setLang -> couplemed:langchange)
const globalLang = lang => {
  document.documentElement.lang = lang==='pt' ? 'pt-BR' : 'en';
  window.dispatchEvent(new window.CustomEvent('couplemed:langchange', { detail:{ lang } }));
};

let backCalled = false;
window.CMLibrary1Reader.open(host, topic, folder, ()=>{ backCalled = true; });

setTimeout(()=>{
  const q = s => host.querySelector(s);
  const art = q('#l1rArticle');

  console.log('\n== TOOLBAR ==');
  ok('barra superior', !!q('.l3r-toolbar') && !!q('#l1rBack'));
  ok('título pasta · tópico', q('#l1rTitle').textContent === 'Allergy & Immunology · Anaphylaxis', q('#l1rTitle').textContent);
  ok('busca e download EN/PT', !!q('#l1rSearchInput') && !!q('#l1rDownloadEn') && !!q('#l1rDownloadPt'));
  ok('barra inferior (classe da Library 3)', !!q('.l3r-toolbar-bottom'));
  ok('marca-texto + 4 cores + borracha + undo/redo', !!q('#l1rHighlightBtn') && host.querySelectorAll('.l3r-swatch[data-color]').length===4 && !!q('#l1rEraserToggleBtn') && !!q('#l1rUndo'));
  ok('SEM botão de idioma próprio (usa o tradutor do site)', host.querySelectorAll('.l1r-langbtn').length===0);

  console.log('\n== PÁGINA MOSTRA SÓ TEXTO ==');
  ok('nenhuma imagem aberta na página', art.querySelectorAll('img').length===0, `achou ${art.querySelectorAll('img').length} <img>`);
  ok('nenhuma figura embutida', art.querySelectorAll('figure').length===0);
  ok('SEM painel lateral de preview', !host.querySelector('#l1rAside') && !host.querySelector('.l1r-thumb'));
  ok('as 3 referências estão no texto', art.querySelectorAll('[data-ref]').length===3);
  ok('referência aparece no ponto certo (dentro do parágrafo)', art.querySelector('p [data-ref="image-1"]') !== null);

  console.log('\n== IMAGEM ABRE SÓ AO CLICAR NO NOME ==');
  art.querySelector('[data-ref="image-1"]').dispatchEvent(new window.Event('click',{bubbles:true}));
  let lb = document.querySelector('.l1r-lightbox');
  ok('clicar em "image 1" abre a imagem', !!lb);
  ok('abre a imagem certa, no idioma corrente', lb.querySelector('img').getAttribute('src')==='/assets/library1/x/image-1-en.webp', lb.querySelector('img').getAttribute('src'));
  ok('legenda vem do alt', lb.querySelector('[data-ex-cap]').textContent==='Management algorithm');
  ok('é uma JANELA centrada, não imagem solta', !!lb.querySelector('.l1r-ex') && !!lb.querySelector('[data-ex-body]'));
  ok('cabeçalho com contador do grupo', lb.querySelector('[data-ex-count]').textContent==='1/2', lb.querySelector('[data-ex-count]').textContent);
  ok('abre ajustada à janela (100%)', lb.querySelector('[data-ex-zoomlabel]').textContent==='100%');
  lb.querySelector('[data-ex-zoom="1"]').dispatchEvent(new window.Event('click',{bubbles:true}));
  ok('botão + amplia', lb.querySelector('[data-ex-zoomlabel]').textContent==='125%', lb.querySelector('[data-ex-zoomlabel]').textContent);
  ok('ampliada, a imagem pode exceder a janela e rolar', lb.querySelector('[data-ex-body]').classList.contains('l1r-ex-zoomed'));
  lb.querySelector('[data-ex-zoom="-1"]').dispatchEvent(new window.Event('click',{bubbles:true}));
  ok('botão − reduz', lb.querySelector('[data-ex-zoomlabel]').textContent==='100%');
  lb.querySelector('[data-ex-zoom="1"]').dispatchEvent(new window.Event('click',{bubbles:true}));
  lb.querySelector('[data-ex-zoom="0"]').dispatchEvent(new window.Event('click',{bubbles:true}));
  ok('⟳ volta a caber na janela', lb.querySelector('[data-ex-zoomlabel]').textContent==='100%' && !lb.querySelector('[data-ex-body]').classList.contains('l1r-ex-zoomed'));
  ok('zoom nunca fica abaixo de 100% (não encolhe além do ajuste)', (lb.querySelector('[data-ex-zoom="-1"]').dispatchEvent(new window.Event('click',{bubbles:true})), lb.querySelector('[data-ex-zoomlabel]').textContent==='100%'));
  document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}));
  ok('Esc fecha e a página volta a ser só texto', !document.querySelector('.l1r-lightbox') && art.querySelectorAll('img').length===0);
  art.querySelector('[data-ref="table-1"]').dispatchEvent(new window.Event('click',{bubbles:true}));
  ok('"table 1" abre a tabela', document.querySelector('.l1r-lightbox img').getAttribute('src')==='/assets/library1/x/table-1-en.webp');
  ok('grupo de 1 item esconde as setas', document.querySelector('[data-lb-nav="1"]').hidden);
  document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}));

  console.log('\n== TRADUTOR GLOBAL DO SITE ==');
  ok('abre no idioma do site (EN)', art.textContent.includes('Rapid onset'));
  globalLang('pt');
  ok('clicar no tradutor traduz o TEXTO', art.textContent.includes('Inicio rapido'), art.textContent.slice(0,50));
  ok('título do artigo traduz', q('.l1r-h1').textContent==='Anafilaxia');
  ok('título da toolbar traduz', q('#l1rTitle').textContent==='Alergia e Imunologia · Anafilaxia', q('#l1rTitle').textContent);
  ok('botão voltar traduz', q('#l1rBack').textContent.includes('Voltar'), q('#l1rBack').textContent);
  ok('placeholder da busca traduz', /Buscar/.test(q('#l1rSearchInput').getAttribute('placeholder')), q('#l1rSearchInput').getAttribute('placeholder'));
  ok('referências traduzidas no texto', /imagem 1/.test(art.textContent) && /tabela 1/.test(art.textContent));
  art.querySelector('[data-ref="image-1"]').dispatchEvent(new window.Event('click',{bubbles:true}));
  ok('IMAGEM abre na versão em português', document.querySelector('.l1r-lightbox img').getAttribute('src')==='/assets/library1/x/image-1-pt.webp',
     document.querySelector('.l1r-lightbox img').getAttribute('src'));
  ok('legenda da imagem em português', document.querySelector('[data-ex-cap]').textContent==='Algoritmo de manejo');

  console.log('\n== TROCA COM A IMAGEM JÁ ABERTA ==');
  globalLang('en');
  ok('tradutor troca a imagem aberta na hora', document.querySelector('.l1r-lightbox img').getAttribute('src')==='/assets/library1/x/image-1-en.webp');
  ok('e a legenda junto', document.querySelector('[data-ex-cap]').textContent==='Management algorithm');
  document.querySelector('[data-lb-nav="1"]').dispatchEvent(new window.Event('click',{bubbles:true}));
  ok('setas andam dentro do mesmo grupo', document.querySelector('.l1r-lightbox img').getAttribute('src')==='/assets/library1/x/image-2-en.webp');
  document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}));

  console.log('\n== FONTE ==');
  q('#l1rFontUp').dispatchEvent(new window.Event('click'));
  ok('A+ aumenta', q('#l1rFontLabel').textContent==='110%');
  q('#l1rFontDown').dispatchEvent(new window.Event('click'));
  ok('A− volta', q('#l1rFontLabel').textContent==='100%');

  console.log('\n== MARCAÇÃO ==');
  const strong = art.querySelector('strong');
  const range = document.createRange(); range.selectNodeContents(strong);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  host.querySelector('.l3r-swatch[data-color="#FFE600"]').dispatchEvent(new window.Event('click'));
  ok('marcação no texto certo', art.querySelectorAll('.l1r-hl').length===1 && art.querySelector('.l1r-hl').textContent==='urticaria', art.querySelector('.l1r-hl') && art.querySelector('.l1r-hl').textContent);
  ok('persistida', JSON.parse(localStorage.getItem('couplemed_lib1hl_john'))['allergy-and-immunology/anaphylaxis'].length===1);
  globalLang('pt');
  ok('marcação EN não vaza para o PT', art.querySelectorAll('.l1r-hl').length===0);
  globalLang('en');
  ok('marcação volta no EN', art.querySelectorAll('.l1r-hl').length===1);
  q('#l1rUndo').dispatchEvent(new window.Event('click'));
  ok('undo', art.querySelectorAll('.l1r-hl').length===0);
  q('#l1rRedo').dispatchEvent(new window.Event('click'));
  ok('redo', art.querySelectorAll('.l1r-hl').length===1);
  q('#l1rEraserToggleBtn').dispatchEvent(new window.Event('click'));
  q('#l1rEraserClickBtn').dispatchEvent(new window.Event('click'));
  art.querySelector('.l1r-hl').dispatchEvent(new window.Event('click',{bubbles:true}));
  ok('borracha apaga', art.querySelectorAll('.l1r-hl').length===0);

  console.log('\n== BUSCA ==');
  const si = q('#l1rSearchInput');
  si.value = 'a'; si.dispatchEvent(new window.Event('input'));
  setTimeout(()=>{
    ok('encontra ocorrências', art.querySelectorAll('.l1r-hit').length>3, `${art.querySelectorAll('.l1r-hit').length}`);
    ok('contador', /1 of \d+/.test(q('#l1rSearchCount').textContent), q('#l1rSearchCount').textContent);
    ok('referências sobrevivem à busca', art.querySelectorAll('[data-ref]').length===3);
    si.value=''; si.dispatchEvent(new window.Event('input'));
    setTimeout(()=>{
      ok('limpar busca restaura', art.querySelectorAll('.l1r-hit').length===0 && art.textContent.includes('Rapid onset of urticaria'));

      console.log('\n== DOWNLOAD: imagens EMBUTIDAS no corpo ==');
      q('#l1rDownloadEn').dispatchEvent(new window.Event('click'));
      setTimeout(()=>{
      q('#l1rDownloadPt').dispatchEvent(new window.Event('click'));
      setTimeout(()=>{
      const en = (blobs[0] && blobs[0].__text) || '';
      const pt = (blobs[1] && blobs[1].__text) || '';
      ok('EN e PT com nomes distintos', downloads.length===2 && downloads[0]==='anaphylaxis-en.html' && downloads[1]==='anafilaxia-pt.html', downloads.join(', '));
      ok('as 3 mídias entram no arquivo EN', (en.match(/<figure class="fig">/g)||[]).length===3, `${(en.match(/<figure class="fig">/g)||[]).length} figuras`);
      ok('imagem embutida em data URI (abre offline)', /src="data:image\/webp/.test(en));
      ok('figura vem logo após o bloco que a referencia', /<\/p><figure class="fig">/.test(en));
      ok('legenda numerada', /<b>Image 1\.<\/b>/.test(en));
      ok('arquivo PT traz as figuras em português', /<b>Imagem 1\.<\/b>/.test(pt) && /Algoritmo de manejo/.test(pt), pt.slice(0,0));
      ok('PT usa a imagem PT', /alt="Algoritmo de manejo"/.test(pt));
      ok('referência vira texto simples (não há clique num arquivo salvo)', !/data-ref=/.test(en) && /class="ref"/.test(en));
      ok('figura não quebra entre páginas ao imprimir', /page-break-inside:avoid/.test(en));

      console.log('\n== VOLTAR / VAZIO ==');
      q('#l1rBack').dispatchEvent(new window.Event('click'));
      ok('callback de voltar', backCalled);
      window.LIBRARY1_CONTENT['allergy-and-immunology'] = {};
      window.CMLibrary1Reader.open(host, {name:'Vaccines',ptName:'Vacinas'}, folder, ()=>{});
      setTimeout(()=>{
        ok('tópico sem conteúdo não quebra', !!host.querySelector('.l1r-empty'));
        console.log(`\n${failures? '❌ '+failures+' FALHA(S)' : '✅ TODOS OS TESTES PASSARAM'}`);
        process.exit(failures?1:0);
      }, 60);
      }, 300);
      }, 300);
    }, 400);
  }, 400);
}, 90);
