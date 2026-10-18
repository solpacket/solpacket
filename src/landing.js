import gsap from 'gsap';import {ScrollTrigger} from 'gsap/ScrollTrigger';import Lenis from 'lenis';
gsap.registerPlugin(ScrollTrigger);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(pointer:fine)').matches;
// paper confetti + gold coins
const cv=document.getElementById('fx'),cx=cv.getContext('2d');let P=[],dpr=Math.min(devicePixelRatio,2);
const size=()=>{cv.width=innerWidth*dpr;cv.height=innerHeight*dpr};size();addEventListener('resize',size);
const COL=['#c8102e','#d9a23a','#1a1210','#f1e4cc'];
function burst(n=80,x=innerWidth/2,y=innerHeight*.45){if(reduce)return;for(let i=0;i<n;i++){const a=-Math.PI/2+(Math.random()-.5)*2.4,s=6+Math.random()*12,coin=Math.random()<.45;
  P.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:coin?7+Math.random()*6:5+Math.random()*6,rot:Math.random()*6,vr:(Math.random()-.5)*.35,life:1,coin,c:COL[i%4]})}}
function tick(){cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,innerWidth,innerHeight);P=P.filter(p=>p.life>0&&p.y<innerHeight+40);
 for(const p of P){p.vy+=.32;p.vx*=.985;p.x+=p.vx+Math.sin(p.rot)*.6;p.y+=p.vy;p.rot+=p.vr;p.life-=.006;cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);cx.scale(Math.cos(p.rot*2),1);cx.globalAlpha=Math.min(1,p.life*2);
  if(p.coin){cx.fillStyle='#d9a23a';cx.strokeStyle='#1a1210';cx.lineWidth=2;cx.beginPath();cx.arc(0,0,p.r,0,7);cx.fill();cx.stroke();cx.strokeRect(-p.r*.3,-p.r*.3,p.r*.6,p.r*.6)}
  else{cx.fillStyle=p.c;cx.fillRect(-p.r/2,-p.r,p.r,p.r*1.6)}cx.restore()}
 requestAnimationFrame(tick)}tick();
if(reduce){document.getElementById('cnt').textContent='0.888';document.querySelectorAll('.num').forEach(e=>e.textContent=e.dataset.to)}
else{
 const lenis=new Lenis({lerp:.09});lenis.on('scroll',ScrollTrigger.update);gsap.ticker.add(t=>lenis.raf(t*1000));gsap.ticker.lagSmoothing(0);window.__lenis=lenis;
 // hero: lines rise from their masks
 document.querySelectorAll('.ht .l').forEach(l=>{l.innerHTML=`<span class="w">${l.innerHTML}</span>`});
 gsap.from('.ht .w',{yPercent:110,rotate:4,stagger:.12,duration:1.2,ease:'expo.out'});
 gsap.from('.meta,.side>*,.scroll',{y:24,opacity:0,stagger:.1,delay:.5,duration:.9,ease:'power3.out'});
 gsap.from('.stamp',{scale:2.4,opacity:0,rotate:-60,delay:.9,duration:.5,ease:'back.out(2)',onComplete:()=>gsap.to('.stamp',{rotate:'+=360',duration:40,repeat:-1,ease:'none'})});
 gsap.from('.d1 path',{strokeDasharray:300,strokeDashoffset:300,delay:1.2,duration:1.2,ease:'power2.out'});
 gsap.to('.ht .l1',{xPercent:-12,scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
 gsap.to('.ht .l3',{xPercent:10,scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
 gsap.to('.stamp',{y:200,scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
 // marquee speeds with scroll velocity
 gsap.to('.marquee',{rotate:2,scrollTrigger:{trigger:'.marquee',start:'top bottom',end:'bottom top',scrub:true}});
 // envelope tears open
 let fired=false;const cnt={v:0},cntEl=document.getElementById('cnt');
 const tl=gsap.timeline({scrollTrigger:{trigger:'#open',start:'top top',end:'+=280%',scrub:.8,pin:true,
   onUpdate:s=>{if(s.progress>.52&&!fired){fired=true;const r=document.querySelector('.env').getBoundingClientRect();burst(110,r.left+r.width/2,r.top+r.height*.2)}if(s.progress<.35)fired=false}}});
 tl.from('.env',{y:'60vh',rotate:-18,rotateX:30,duration:1,ease:'power2.out'}).from('.bigbg',{scale:.6,opacity:0,duration:1},0)
  .to('.c1',{opacity:1,duration:.2},.6).to('.c1',{opacity:0,duration:.2},1.3)
  .to('.env',{rotate:-3,x:-6,duration:.15,yoyo:true,repeat:3},1.2)
  .to('.env .strip',{rotate:-24,x:40,y:-60,duration:.5,ease:'power2.in'},1.6).to('.env .strip',{x:'60vw',y:'-50vh',rotate:-140,opacity:0,duration:.5},2.1)
  .to('.c2',{opacity:1,duration:.2},1.6).to('.c2',{opacity:0,duration:.2},2.3)
  .set('.letter',{zIndex:5},2.2).to('.letter',{yPercent:-58,rotate:-4,duration:.9,ease:'back.out(1.6)'},2.2)
  .to(cnt,{v:.888,duration:.9,onUpdate:()=>cntEl.textContent=cnt.v.toFixed(3)},2.3)
  .to('.c3',{opacity:1,duration:.2},2.6).to('.bigbg',{color:'#c8102e',opacity:.15,duration:.6},2.6)
  .to(['.c3','.env'],{y:-60,opacity:0,duration:.4},3.5);
 // horizontal acts
 const track=document.querySelector('.track');
 const hz=gsap.to(track,{x:()=>-(track.scrollWidth-innerWidth),ease:'none',scrollTrigger:{trigger:'.hpin',start:'top top',end:()=>'+='+track.scrollWidth,scrub:1,pin:true,invalidateOnRefresh:true}});
 gsap.utils.toArray('.act').forEach(a=>{gsap.from(a,{yPercent:30,rotate:12,opacity:0,ease:'none',scrollTrigger:{trigger:a,containerAnimation:hz,start:'left 100%',end:'left 60%',scrub:true}});
  gsap.from(a.querySelectorAll('.ill path,.ill rect,.ill circle'),{strokeDasharray:400,strokeDashoffset:400,ease:'none',scrollTrigger:{trigger:a,containerAnimation:hz,start:'left 80%',end:'center 50%',scrub:true}})});
 // folding paper headlines
 gsap.utils.toArray('.fold').forEach(f=>gsap.from(f.children,{rotateX:-95,opacity:0,stagger:.15,duration:1,ease:'power3.out',scrollTrigger:{trigger:f,start:'top 80%'}}));
 gsap.utils.toArray('.note').forEach((n,i)=>gsap.from(n,{y:120,rotate:i%2?14:-14,opacity:0,duration:.9,ease:'back.out(1.4)',scrollTrigger:{trigger:n,start:'top 88%'}}));
 document.querySelectorAll('.num').forEach(e=>{const o={v:0};gsap.to(o,{v:+e.dataset.to,duration:1.6,ease:'power2.out',scrollTrigger:{trigger:e,start:'top 85%'},onUpdate:()=>e.textContent=Math.round(o.v)})});
 ScrollTrigger.create({trigger:'.final',start:'top 40%',onEnter:()=>burst(140,innerWidth/2,innerHeight*.7)});
 // magnetic buttons + cursor
 if(fine){const c=document.createElement('div');c.className='cursor';document.body.appendChild(c);const qx=gsap.quickTo(c,'x',{duration:.25}),qy=gsap.quickTo(c,'y',{duration:.25});
  addEventListener('mousemove',e=>{qx(e.clientX);qy(e.clientY)});
  document.querySelectorAll('.mag').forEach(b=>{b.addEventListener('mouseenter',()=>c.classList.add('big'));b.addEventListener('mouseleave',()=>{c.classList.remove('big');gsap.to(b,{x:0,y:0,rotate:0,duration:.5,ease:'elastic.out(1,.4)'})});
   b.addEventListener('mousemove',e=>{const r=b.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;gsap.to(b,{x:x*.3,y:y*.4,rotate:x*.02,duration:.3})})})}
}
