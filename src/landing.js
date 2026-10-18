import gsap from 'gsap';import {ScrollTrigger} from 'gsap/ScrollTrigger';import Lenis from 'lenis';
gsap.registerPlugin(ScrollTrigger);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
// coin particle canvas
const cv=document.getElementById('fx'),cx=cv.getContext('2d');let P=[],dpr=Math.min(devicePixelRatio,2);
const size=()=>{cv.width=innerWidth*dpr;cv.height=innerHeight*dpr};size();addEventListener('resize',size);
function burst(n=70,x=innerWidth/2,y=innerHeight*.45){if(reduce)return;for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=4+Math.random()*9;P.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-6,r:4+Math.random()*7,rot:Math.random()*6,vr:(Math.random()-.5)*.4,life:1,gold:Math.random()>.25})}}
function tick(){cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,innerWidth,innerHeight);P=P.filter(p=>p.life>0);
  for(const p of P){p.vy+=.28;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;p.life-=.009;cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);cx.scale(Math.abs(Math.cos(p.rot*2)),1);cx.globalAlpha=Math.max(p.life,0);
    cx.fillStyle=p.gold?'#ffc94d':'#ff2d4b';cx.shadowColor=cx.fillStyle;cx.shadowBlur=12;cx.beginPath();p.gold?cx.arc(0,0,p.r,0,7):cx.rect(-p.r/2,-p.r,p.r,p.r*2);cx.fill();cx.restore();}
  requestAnimationFrame(tick)}tick();
if(!reduce){
  const lenis=new Lenis({lerp:.1});lenis.on('scroll',ScrollTrigger.update);gsap.ticker.add(t=>lenis.raf(t*1000));gsap.ticker.lagSmoothing(0);
  // hero char reveal
  document.querySelectorAll('.split').forEach(el=>{el.innerHTML=el.innerHTML.replace(/(<[^>]+>)|([^<])/g,(m,tag,c)=>tag||(c.trim()?`<span class="ch">${c}</span>`:c))});
  gsap.from('.split .ch',{yPercent:120,rotate:12,opacity:0,stagger:.05,duration:1,ease:'expo.out'});
  gsap.from(['.kicker','.sub','.cta'],{y:30,opacity:0,stagger:.12,delay:.5,duration:1,ease:'power3.out'});
  // parallax layers
  document.querySelectorAll('[data-speed]').forEach(el=>gsap.to(el,{y:()=>innerHeight*el.dataset.speed,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}}));
  gsap.to('.hero h1',{scale:.82,opacity:.2,filter:'blur(6px)',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
  // pinned envelope opening
  let fired=false;const cnt={v:0};
  const tl=gsap.timeline({scrollTrigger:{trigger:'#open',start:'top top',end:'+=260%',scrub:.8,pin:true,
    onUpdate:s=>{if(s.progress>.55&&!fired){fired=true;burst(90)}if(s.progress<.4)fired=false;}}});
  tl.from('.E',{scale:.4,rotateY:-35,rotateX:20,y:120,duration:1})
    .to('.c1',{opacity:1,duration:.3},0.3).to('.c1',{opacity:0,duration:.3},1.2)
    .to('.E .seal',{rotateY:540,scale:1.25,duration:.6},1.1).to('.E .seal',{scale:0,opacity:0,duration:.3},1.7)
    .to('.c2',{opacity:1,duration:.3},1.3).to('.c2',{opacity:0,duration:.3},2.1)
    .to('.E .flap',{rotateX:-180,duration:.7,ease:'power2.inOut'},1.8).set('.E .flap',{zIndex:1},2.15)
    .to('.E .letter',{yPercent:-62,duration:.9,ease:'back.out(1.4)'},2.3)
    .to(cnt,{v:0.888,duration:.9,onUpdate:()=>document.getElementById('cnt').textContent=cnt.v.toFixed(3)},2.3)
    .to('.E',{scale:1.1,duration:.6},2.6).to('.c3',{opacity:1,duration:.3},2.6).to(['.c3','.E'],{opacity:0,y:-40,duration:.4},3.4);
  // horizontal pinned panels with morph
  const track=document.querySelector('.track');
  const hz=gsap.to(track,{x:()=>-(track.scrollWidth-innerWidth),ease:'none',scrollTrigger:{trigger:'.hpin',start:'top top',end:()=>'+='+(track.scrollWidth),scrub:1,pin:true,invalidateOnRefresh:true}});
  gsap.utils.toArray('.panel').forEach(p=>gsap.fromTo(p,{rotateY:25,scale:.85,opacity:.4,borderRadius:80},{rotateY:0,scale:1,opacity:1,borderRadius:28,ease:'none',scrollTrigger:{trigger:p,containerAnimation:hz,start:'left 95%',end:'center 55%',scrub:true}}));
  // text reveals
  gsap.utils.toArray('.reveal').forEach(el=>gsap.from(el,{y:60,opacity:0,clipPath:'inset(0 0 100% 0)',duration:1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 85%'}}));
  ScrollTrigger.create({trigger:'.final',start:'top 40%',onEnter:()=>burst(120,innerWidth/2,innerHeight*.6)});
  window.__lenis=lenis;
}
