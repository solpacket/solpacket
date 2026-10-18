const puppeteer=require('puppeteer-core'),C=require('../src/core'),{w}=C;const B='http://localhost:5173',S=__dirname+'/../shots/';
const conn=new w.Connection('http://127.0.0.1:8899','confirmed');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const br=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader']});
 const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 pg.on('pageerror',e=>console.log('PAGEERR',e.message));
 // landing scroll positions
 await pg.goto(B+'/',{waitUntil:'networkidle0'});await sleep(1800);
 const H=await pg.evaluate(()=>document.documentElement.scrollHeight);console.log('landing height',H);
 let rec=null;try{rec=await pg.screencast({path:S+'landing-scroll.webm'})}catch(e){console.log('no screencast',e.message)}
 const stops=[0,.08,.14,.2,.26,.33,.45,.55,.65,.8,1];let i=0;
 for(let y=0;y<=H;y+=24){await pg.evaluate(y=>window.__lenis?window.__lenis.scrollTo(y,{immediate:true}):scrollTo(0,y),y);await sleep(30);
   if(stops[i]!==undefined&&y>=stops[i]*(H-844)){await sleep(500);await pg.screenshot({path:S+`landing-${String(i).padStart(2,'0')}.png`});i++;}}
 if(rec)await rec.stop();
 // app: create
 const kp=w.Keypair.generate();await conn.confirmTransaction(await conn.requestAirdrop(kp.publicKey,2e9),'confirmed');
 await pg.evaluateOnNewDocument(k=>{localStorage.burner=k;0},C.encKey(kp));
 await pg.goto(B+'/app.html',{waitUntil:'networkidle0'});await pg.click('#connect');await sleep(400);
 await pg.$eval('#msg',e=>e.value='Happy New Year 🧧');await pg.screenshot({path:S+'app-1-create.png',fullPage:true});
 await pg.click('#go');await pg.waitForFunction(()=>location.hash.startsWith('#share'),{timeout:30000});await sleep(500);
 await pg.screenshot({path:S+'app-2-share.png',fullPage:true});const link=await pg.$eval('#link',e=>e.value);
 // claim as 2 fresh users (new in-browser wallet)
 for(let n=0;n<2;n++){const ctx=await br.createBrowserContext();const p=await ctx.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
   await p.evaluateOnNewDocument(()=>0);await p.goto(link,{waitUntil:'networkidle0'});await sleep(600);
   if(n===0)await p.screenshot({path:S+'app-3-claim.png',fullPage:true});
   await p.click('#newWallet');await sleep(200);if(n===0)await p.screenshot({path:S+'app-4-newwallet-backup.png',fullPage:true});
   await p.click('#claim');await p.waitForSelector('#got:not(.hide)',{timeout:30000});await sleep(1400);
   await p.screenshot({path:S+`app-5-result-${n+1}.png`,fullPage:true});await ctx.close();}
 await pg.evaluate(()=>{localStorage.lang='en'});await pg.goto(link,{waitUntil:'networkidle0'});await sleep(800);await pg.screenshot({path:S+'app-6-claim-en.png',fullPage:true});
 await br.close();console.log('done')})().catch(e=>{console.error(e);process.exit(1)});
