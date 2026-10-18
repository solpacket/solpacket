const puppeteer=require('puppeteer-core');const B=process.env.BASE||'http://localhost:5173',S=__dirname+'/../shots/v3/';require('fs').mkdirSync(S,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const br=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader']});
 for(const [dev,vp] of [['desktop',{width:1440,height:900,deviceScaleFactor:1}],['mobile',{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}]]){
  for(const lang of ['en','zh']){
   const pg=await br.newPage();await pg.setViewport(vp);const errs=[];pg.on('pageerror',e=>errs.push(e.message));
   await pg.goto(B+'/',{waitUntil:'networkidle0'});await pg.evaluate(()=>localStorage.removeItem('lang'));await pg.reload({waitUntil:'networkidle0'});await sleep(2200);
   if(lang==='zh'){await pg.click('#lang button[data-l="zh"]');await sleep(1800);}  // runtime toggle, not reload
   const info=await pg.evaluate(()=>({lang:document.documentElement.lang,h1:document.querySelector('.ht').innerText.replace(/\n/g,' '),stored:localStorage.lang}));
   await pg.screenshot({path:S+`${dev}-${lang}-hero.png`});
   const top=await pg.evaluate(()=>document.querySelector('#open').getBoundingClientRect().top+scrollY);
   for(let y=0;y<=top+vp.height*2.8*0.72;y+=40){await pg.evaluate(y=>window.__lenis.scrollTo(y,{immediate:true}),y);await sleep(12)}
   await sleep(1200);await pg.screenshot({path:S+`${dev}-${lang}-envelope.png`});
   const cap=await pg.evaluate(()=>[...document.querySelectorAll('.caps li')].map(l=>getComputedStyle(l).opacity+':'+l.innerText.slice(0,12)).join(' | '));
   await pg.evaluate(()=>window.__lenis.scrollTo(document.documentElement.scrollHeight,{immediate:true}));await sleep(1500);await pg.screenshot({path:S+`${dev}-${lang}-footer.png`});
   // app page: zh comes from saved preference (localStorage) when lang=zh
   await pg.goto(B+'/app.html',{waitUntil:'networkidle0'});await sleep(1000);await pg.screenshot({path:S+`${dev}-${lang}-app.png`,fullPage:true});
   const at=await pg.evaluate(()=>document.querySelector('h1').innerText);
   console.log(dev,lang,JSON.stringify(info),'| caps',cap,'| app:',at,errs.length?'ERR '+errs:'');await pg.close();}}
 // ?lang=zh deep link on a fresh profile
 const ctx=await br.createBrowserContext();const pg=await ctx.newPage();await pg.goto(B+'/app.html?lang=zh',{waitUntil:'networkidle0'});console.log('?lang=zh app:',await pg.evaluate(()=>document.querySelector('h1').innerText+' stored='+localStorage.lang));
 await br.close()})().catch(e=>{console.error(e);process.exit(1)});
