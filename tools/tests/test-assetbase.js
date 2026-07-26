/* Prova que a virada de mídia para o R2 é só definir window.LIBRARY1_ASSET_BASE:
   o MESMO conteúdo, sem nenhuma edição, passa a apontar para o R2. */
const { JSDOM } = require(process.env.JSDOM_PATH || 'jsdom');
const fs = require('fs');
const REPO = require('path').resolve(__dirname, '../..');

function run(assetBase, label){
  return new Promise(res => {
    const dom = new JSDOM(`<!doctype html><html lang="en"><body><div id="host"></div></body></html>`, {
      url: 'https://couplemed.test/app.html?u=john', pretendToBeVisual: true, runScripts: 'dangerously'
    });
    const w = dom.window;
    w.Element.prototype.scrollIntoView = function(){};
    if(assetBase) w.eval(`window.LIBRARY1_ASSET_BASE = ${JSON.stringify(assetBase)};`);

    const s = w.document.createElement('script');
    s.textContent = fs.readFileSync(REPO + '/public/js/library1-reader.js','utf8');
    w.document.head.appendChild(s);

    // carrega o arquivo de conteúdo REAL do repositório
    const origCreate = w.document.createElement.bind(w.document);
    w.document.createElement = function(tag){
      const el = origCreate(tag);
      if(tag==='link') setTimeout(()=>el.dispatchEvent(new w.Event('load')),0);
      if(tag==='script') setTimeout(()=>{
        w.eval(fs.readFileSync(REPO + '/public/js/library1-content/allergy-and-immunology.js','utf8'));
        el.dispatchEvent(new w.Event('load'));
      },0);
      return el;
    };

    const host = w.document.getElementById('host');
    w.CMLibrary1Reader.open(host,
      { name:'Acute rheumatic fever', ptName:'Febre reumática aguda' },
      { name:'Allergy & Immunology', ptName:'Alergia e Imunologia' }, ()=>{});

    setTimeout(()=>{
      const refs = host.querySelectorAll('#l1rArticle [data-ref]');
      // a mídia só existe no DOM depois de clicar na referência (a página é só texto)
      const first = host.querySelector('#l1rArticle [data-ref="image-1"]');
      if(first) first.dispatchEvent(new w.Event('click', { bubbles:true }));
      const lbImg = w.document.querySelector('.l1r-lightbox img');
      res({ label, src: lbImg && lbImg.getAttribute('src'), refs: refs.length,
            imgsNaPagina: host.querySelectorAll('#l1rArticle img').length });
    }, 120);
  });
}

(async ()=>{
  let fail = 0;
  const ok = (l,c,extra)=>{ console.log(`${c?'  ✅':'  ❌'} ${l}${c?'':'  <-- '+extra}`); if(!c) fail++; };

  const site = await run(null, 'site');
  console.log('\n== HOJE: mídia servida do próprio site ==');
  ok('conteúdo real carrega', site.refs===10, `${site.refs} refs`);
  ok('página não mostra imagem aberta', site.imgsNaPagina===0, `${site.imgsNaPagina} <img> no artigo`);
  ok('URL aponta para public/assets', site.src==='/assets/library1/allergy-and-immunology/acute-rheumatic-fever/image-1-en.webp', site.src);
  ok('é WebP', /\.webp$/.test(site.src||''), site.src);

  const r2 = await run('/api/library1/img/lib1/', 'r2');
  console.log('\n== DEPOIS DA VIRADA: window.LIBRARY1_ASSET_BASE = /api/library1/img/lib1/ ==');
  ok('mesmo conteúdo, sem nenhuma edição', r2.refs===10, `${r2.refs} refs`);
  ok('URL passa a apontar para o R2', r2.src==='/api/library1/img/lib1/allergy-and-immunology/acute-rheumatic-fever/image-1-en.webp', r2.src);

  console.log(`\n${fail? '❌ '+fail+' FALHA(S)' : '✅ A virada para o R2 é uma linha — provado'}`);
  process.exit(fail?1:0);
})();
