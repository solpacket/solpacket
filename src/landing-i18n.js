const {getLang,setLang,mountToggle}=require('./lang');
const ZH={navHow:'怎麼用',navTrust:'資金安全',navApp:'打開 App ↗',meta1:'第 01 期 — Devnet 版',meta2:'創刊 2026 · Solana',
h1:'把錢，',h2:'<i>折</i>進',h3:'一條<em>連結。</em>',stamp:'不託管 · 免註冊 · 不囉嗦 · 不託管 · 免註冊 ·',
lede:'把 SOL 裝進紅包、封好，連結丟到哪都行。誰先打開誰就領走——<u>不需要錢包地址</u>。',
cta:'包一個紅包',scroll:'往下滑，撕開它 ↓',forYou:'給你的 —',claimed:'SOL · 已領取',tear:'沿 此 撕 開 ✂ - - - -',
cap1:'<b>一、</b>封好。0.888 SOL 鎖進一次性託管錢包。',cap2:'<b>二、</b>撕開。金鑰就藏在連結 <code>#</code> 後面。',cap3:'<b>三、</b>領走。直接進對方錢包，0.4 秒到帳。',
ritual:'紅包的旅程，分四幕',howH:'一個<br><i>紅包</i><br>怎麼走。',
a1h:'包好。',a1p:'連上 Phantom 或 Solflare，SOL 或任何 SPL 代幣都行。設定總額、份數、平分或拼手氣，再寫句祝福、選個期限。',
a2h:'丟出連結。',a2p:'QR Code、複製，或一鍵分享到 X。金鑰在 <code>#</code> 後面——瀏覽器永遠不會把這段傳給我們的伺服器。',
a3h:'搶下去。',a3p:'貼上地址，或當場開一個新的瀏覽器錢包。排行榜會幫手氣最好的人加冕。',
a4h:'一毛不少。',a4p:'過期沒人領？按一下，剩下的每一個 lamport 都退回發送者。',
f1:'我們從不',f2:'碰你的',f3:'<em>錢。</em>',f4:'今晚',f5:'<i>就發一個。</i>',
exA:'證物 A',nAp:'每個紅包都有自己的一次性託管錢包，金鑰只存在你的連結裡。',exB:'證物 B',nBp:'伺服器只負責排隊分配，看不到金鑰，也動不了資金。',
n3:'託管，永遠',n4:'每包最多份數',n5:'每次領取手續費 SOL',foot:'Devnet 測試版 · 尚未審計 · 開源',
mq:'恭喜發財 ✺ 0.888 SOL ✺ 拼手氣 ✺ 一條連結 ✺ 大吉大利 ✺ 過期自動可退 ✺ 恭喜發財 ✺ 0.888 SOL ✺ 拼手氣 ✺ 一條連結 ✺ 大吉大利 ✺ 過期自動可退 ✺&nbsp;',
title:'SolPacket — Solana 上的紅包',desc:'把 SOL 和 SPL 代幣變成紅包連結。不託管，領取不需要錢包。'};
const EN={};document.querySelectorAll('[data-i18n]').forEach(e=>{const k=e.dataset.i18n;if(!(k in EN))EN[k]=e.innerHTML});
EN.title=document.title;const md=document.querySelector('meta[name=description]');EN.desc=md.content;
let lang=getLang();
function apply(l){const D=l==='zh'?ZH:EN;document.querySelectorAll('[data-i18n]').forEach(e=>{const v=D[e.dataset.i18n];if(v!=null)e.innerHTML=v});
 document.title=D.title;md.content=D.desc;document.documentElement.lang=l==='zh'?'zh-Hant-TW':'en';document.documentElement.classList.toggle('zh',l==='zh');
 document.querySelectorAll('a[href^="/app.html"]').forEach(a=>a.href='/app.html'+(l==='zh'?'?lang=zh':''))}
apply(lang);
module.exports={lang,onSwitch(fn){mountToggle(document.getElementById('lang'),lang,l=>{lang=l;apply(l);fn(l)})}};
