// Shared language selection: ?lang= wins (and is saved), then localStorage, default English.
const OK=['en','zh'];
function getLang(){let q=new URLSearchParams(location.search).get('lang');if(q){q=q.toLowerCase().startsWith('zh')?'zh':'en';try{localStorage.lang=q}catch(e){}return q}
 try{if(OK.includes(localStorage.lang))return localStorage.lang}catch(e){}return 'en'}
function setLang(l){try{localStorage.lang=l}catch(e){}const u=new URL(location.href);if(u.searchParams.has('lang')){u.searchParams.set('lang',l);history.replaceState(null,'',u)}
 document.documentElement.lang=l==='zh'?'zh-Hant-TW':'en'}
function mountToggle(el,cur,onChange){el.innerHTML='<button type="button" data-l="en">EN</button><span>/</span><button type="button" data-l="zh">中文</button>';
 const paint=l=>el.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.l===l);b.setAttribute('aria-pressed',b.dataset.l===l)});paint(cur);
 el.onclick=e=>{const l=e.target.dataset&&e.target.dataset.l;if(l&&l!==cur){cur=l;setLang(l);paint(l);onChange(l)}}}
module.exports={getLang,setLang,mountToggle};
