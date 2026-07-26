
/* A QUANTIDADE DE QUESTÕES É LIVRE — 5 não é padrão (§11.2 do LIBRARY1_ADD_CONTENT.md).
   Este teste existe porque o primeiro tópico incluído teve 5 questões e isso podia ser lido
   como número obrigatório. Aqui o Create Test é exercitado com 1, 2 e 9 questões, e com
   NENHUMA (caso em que o botão não deve aparecer — e isso não é erro). */
const { JSDOM } = require(process.env.JSDOM_PATH || 'jsdom');
const fs=require('fs'); const REPO=require('path').resolve(__dirname,'../..');
function run(n){ return new Promise(res=>{
  const dom=new JSDOM('<!doctype html><html lang="en"><body><div id="host"></div></body></html>',
    {url:'https://couplemed.test/app.html?u=john',pretendToBeVisual:true,runScripts:'dangerously'});
  const w=dom.window; w.Element.prototype.scrollIntoView=function(){};
  const s=w.document.createElement('script');
  s.textContent=fs.readFileSync(REPO+'/public/js/library1-reader.js','utf8');
  w.document.head.appendChild(s);
  const oc=w.document.createElement.bind(w.document);
  w.document.createElement=function(t){ const el=oc(t);
    if(t==='link') setTimeout(()=>el.dispatchEvent(new w.Event('load')),0);
    if(t==='script') setTimeout(()=>{
      const quiz = n===0 ? undefined : Array.from({length:n},(_,i)=>({
        id:'Q'+i, vignette:'v'+i, q:'q'+i, options:['a','b'], correct:'A', peer:{A:80,B:20},
        difficulty:'easy', explC:'e', explI:{B:'x'}, objective:'o',
        ptTranslation:{vignette:'v',q:'q',options:['a','b'],explC:'e',explI:{B:'x'},objective:'o'}
      }));
      w.LIBRARY1_CONTENT={'s':{'t':{ ...(quiz?{quiz}:{}) ,
        en:{title:'T',html:'<p>x</p><p class="l1r-tags"><span>a</span></p>'},
        pt:{title:'T',html:'<p>x</p><p class="l1r-tags"><span>a</span></p>'}}}};
      el.dispatchEvent(new w.Event('load'));
    },0);
    return el; };
  const host=w.document.getElementById('host');
  w.CMLibrary1Reader.open(host,{name:'T',ptName:'T'},{name:'S',ptName:'S'},()=>{});
  setTimeout(()=>{
    const ct=host.querySelector('.l1r-ct');
    if(!ct) return res({n,btn:false});
    ct.querySelector('[data-ct="start"]').dispatchEvent(new w.Event('click',{bubbles:true}));
    const prog=host.querySelector('.l1r-q-progress');
    res({n, btn:true, count:(ct.textContent.match(/(\d+)\s+quest/)||[])[1], progress:prog&&prog.textContent.trim()});
  },90);
});}
(async()=>{
  let fail=0; const ok=(l,c,e)=>{console.log((c?'  ✅ ':'  ❌ ')+l+(c?'':'  <-- '+e)); if(!c)fail++;};
  for(const n of [1,2,9]){
    const r=await run(n);
    ok(`${n} questão(ões): botão aparece e conta certo`, r.btn && r.count===String(n), JSON.stringify(r));
    ok(`${n} questão(ões): progresso "1 / ${n}"`, r.progress===`1 / ${n}`, r.progress);
  }
  const z=await run(0);
  ok('0 questões: nenhum botão (não é erro)', z.btn===false);
  console.log(fail? '\n❌ '+fail+' FALHA(S)' : '\n✅ a quantidade de questões é livre — provado');
  process.exit(fail?1:0);
})();
