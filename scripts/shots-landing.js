const puppeteer=require('puppeteer-core');const B=process.env.BASE||'http://localhost:5173',S=__dirname+'/../shots/v2/';require('fs').mkdirSync(S,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const br=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader']});
 for(const [name,vp] of [['desktop',{width:1440,height:900,deviceScaleFactor:1}],['mobile',{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}]]){
  const pg=await br.newPage();await pg.setViewport(vp);pg.on('pageerror',e=>console.log('PAGEERR',e.message));
  await pg.goto(B+'/',{waitUntil:'networkidle0'});await sleep(2200);
  const H=await pg.evaluate(()=>document.documentElement.scrollHeight);console.log(name,'height',H);
  let rec=null;if(name==='desktop')try{rec=await pg.screencast({path:S+'landing-scroll.webm'})}catch(e){console.log('no screencast',e.message)}
  const stops=[0,.06,.12,.17,.22,.27,.33,.42,.52,.62,.75,.88,1];let i=0;
  for(let y=0;y<=H;y+=30){await pg.evaluate(y=>window.__lenis.scrollTo(y,{immediate:true}),y);await sleep(rec?35:15);
   if(stops[i]!==undefined&&y>=stops[i]*(H-vp.height)-30){await sleep(700);await pg.screenshot({path:S+`${name}-${String(i).padStart(2,'0')}.png`});i++;}}
  if(rec)await rec.stop();await pg.close();}
 await br.close();console.log('done')})().catch(e=>{console.error(e);process.exit(1)});
