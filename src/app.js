const C=require('./core'),{w,bs58}=C,QR=require('qrcode');
const T={en:{createTitle:'Send a SolPacket',createSub:'Funds sit in a one-time escrow wallet. Its key lives only in the link — our server never sees it.',connect:'Connect Phantom / Solflare',asset:'Asset',token:'SPL token',mint:'Token mint',total:'Total amount',count:'Envelopes',mode:'Split',random:'Lucky draw 🎲',equal:'Equal',msg:'Message',msgPh:'Good fortune & prosperity!',expiry:'Expiry (refundable after)',send:'Fund the envelope',ready:'Your SolPacket is ready 🧧',readySub:'Share the link — anyone with it can claim',copy:'Copy',shareX:'Share on X',openIt:'Open envelope page →',keepLink:'⚠️ The link IS the key: anyone holding it can claim. Share only with people you mean to. After expiry, use the same link (or local history) to refund the rest.',youGot:'You received',viewTx:'View transaction',addr:'Receiving address',useWallet:'Use my wallet',newWallet:'No wallet? Create one',backupT:'Back up this key first!',backupD:'Secret key of your new wallet. Stored only in this browser — lose it and it is gone. Importable into Phantom.',claim:'Claim',board:'Leaderboard',refundT:'Refund unclaimed funds',refund:'Refund to sender',trustNote:'Trust model: funds sit on-chain in a one-time wallet; the server only queues share allocation and cannot move money. But link = key: a malicious link holder can bypass the server and drain it. Share with trusted groups.',left:'{n}/{c} left',empty:'All envelopes claimed',expired:'Envelope expired',from:'From {a}',best:'Luckiest',noWallet:'No wallet extension found',cost:'You will pay ≈ {x} SOL (incl. {f} SOL fees & rent)',mintPh:'Mint address',addrPh:'Solana address',refunded:'✓ refunded',tweet:'🧧 I just dropped a SolPacket — grab your share before it is gone! via @solpacket_app',back:'← Home'},zh:{createTitle:'發一個 SolPacket 紅包',createSub:'資金放在一次性的託管錢包裡，金鑰只存在連結中——我們的伺服器永遠看不到。',connect:'連接 Phantom / Solflare',asset:'資產',token:'SPL 代幣',mint:'代幣 Mint 地址',total:'總金額',count:'紅包份數',mode:'分配方式',random:'拼手氣 🎲',equal:'平均分',msg:'祝福語',msgPh:'恭喜發財，大吉大利！',expiry:'期限（過期後可退回）',send:'把錢包進紅包',ready:'你的 SolPacket 準備好了 🧧',readySub:'分享連結——拿到連結的人都能領',copy:'複製',shareX:'分享到 X',openIt:'打開紅包頁面 →',keepLink:'⚠️ 連結就是金鑰：拿到連結的人就能領。只分享給你想給的人。過期後用同一條連結（或本機紀錄）把剩下的退回。',youGot:'你領到了',viewTx:'查看交易',addr:'收款地址',useWallet:'用我的錢包',newWallet:'沒有錢包？建立一個',backupT:'請先備份這把金鑰！',backupD:'這是你新錢包的私鑰，只存在這個瀏覽器裡——弄丟就救不回來了。可以匯入 Phantom。',claim:'領紅包',board:'手氣排行榜',refundT:'退回未領取的資金',refund:'退回給發送者',trustNote:'信任模型：資金放在鏈上的一次性錢包，伺服器只負責分配排隊，動不了錢。但連結＝金鑰：惡意的持有者可以繞過伺服器直接領光。請只在信任的群組分享。',left:'剩 {n}/{c} 份',empty:'紅包已經被領完了',expired:'紅包已過期',from:'來自 {a}',best:'手氣最佳',noWallet:'找不到錢包擴充功能',cost:'你將支付約 {x} SOL（含 {f} SOL 手續費與租金）',mintPh:'Mint 地址',addrPh:'Solana 地址',refunded:'✓ 已退回',tweet:'🧧 我剛發了一個 SolPacket 紅包，手快有，手慢無！via @solpacket_app',back:'← 首頁'}};
const LG=require('./lang');let L=LG.getLang();const t=(k,v={})=>(T[L][k]||k).replace(/\{(\w)\}/g,(_,x)=>v[x]);
const $=s=>document.querySelector(s);
function i18n(){document.documentElement.lang=L==='zh'?'zh-Hant-TW':'en';document.title=L==='zh'?'SolPacket — 發 SOL 紅包':'SolPacket — Send SOL red envelopes';document.querySelectorAll('[data-t]').forEach(e=>e.textContent=t(e.dataset.t));document.querySelectorAll('[data-tp]').forEach(e=>e.placeholder=t(e.dataset.tp));render&&render();if(cfg)calc();}

const toast=m=>{const d=document.createElement('div');d.className='toast';d.textContent=m;document.body.append(d);setTimeout(()=>d.remove(),3500)};
const api=async(p,b)=>{const r=await fetch(p,b?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}:{});const d=await r.json();if(!r.ok)throw new Error(d.error);return d};
const short=a=>a.slice(0,4)+'…'+a.slice(-4);let cfg,conn,render;
const fmt=(n,d)=>(n/10**d).toLocaleString(undefined,{maximumFractionDigits:Math.min(d,4)});
// Wallet: injected Phantom/Solflare, or a local burner (for testing/no-extension)
function provider(){return window.phantom?.solana||window.solflare||window.solana||null}
let wallet=null;
async function connect(){const p=provider();
  if(p){await p.connect();wallet={pk:new w.PublicKey(p.publicKey.toString()),sign:tx=>p.signTransaction(tx)};}
  else if(localStorage.burner||new URLSearchParams(location.search).has('burner')){const kp=localStorage.burner?C.decKey(localStorage.burner):w.Keypair.generate();localStorage.burner=C.encKey(kp);wallet={pk:kp.publicKey,sign:async tx=>{tx.partialSign(kp);return tx},burner:1};}
  else throw new Error(t('noWallet'));
  $('#who').textContent='✓ '+wallet.pk.toBase58();return wallet;}
const segVal=id=>$(`#${id} .on`).dataset.v;
document.querySelectorAll('.seg').forEach(s=>s.onclick=e=>{if(e.target.dataset.v){s.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===e.target));$('#mintbox').classList.toggle('hide',segVal('asset')!=='spl');calc()}});
function calc(){const n=+$('#count').value||1,spl=segVal('asset')==='spl',f=C.overhead(n,spl)/1e9;$('#cost').textContent=t('cost',{x:((spl?0:+$('#total').value||0)+f).toFixed(6),f:f.toFixed(6)})}
['#count','#total'].forEach(s=>$(s).oninput=calc);
async function create(){const b=$('#go');b.disabled=true;try{if(!wallet)await connect();
  const spl=segVal('asset')==='spl',count=+$('#count').value|0;let mint=null,decimals=9,symbol='SOL';
  if(spl){mint=$('#mint').value.trim();const m=await C.spl.getMint(conn,new w.PublicKey(mint));decimals=m.decimals;symbol='TOKEN';}
  const total=Math.round(+$('#total').value*10**decimals),shares=C.splitShares(total,count,segVal('mode'),spl?1:1e6);
  const escrow=w.Keypair.generate(),k=C.encKey(escrow);
  // remember locally so creator can refund later even without the link
  const hist=JSON.parse(localStorage.hist||'[]');hist.push({escrow:escrow.publicKey.toBase58(),k,at:Date.now()});localStorage.hist=JSON.stringify(hist);
  const tx=await C.buildFundTx(conn,wallet.pk,escrow.publicKey,{mint,total,count});const st=await wallet.sign(tx);
  const sig=await conn.sendRawTransaction(st.serialize());await conn.confirmTransaction(sig,'confirmed');
  const env=await api('/api/envelopes',{escrow:escrow.publicKey.toBase58(),creator:wallet.pk.toBase58(),mint,decimals,symbol,count,mode:segVal('mode'),shares,message:$('#msg').value||t('msgPh'),expiry:Date.now()+$('#exp').value*3600e3});
  hist[hist.length-1].id=env.id;localStorage.hist=JSON.stringify(hist);
  location.hash=`share=${env.id}&k=${k}`;route();}catch(e){toast(e.message)}finally{b.disabled=false}}
$('#go').onclick=create;$('#connect').onclick=()=>connect().catch(e=>toast(e.message));
function show(v){['create','share','claim'].forEach(x=>$('#v-'+x).classList.toggle('hide',x!==v));window.scrollTo(0,0)}
const H=()=>Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
async function route(){const h=H();render=null;
  if(h.share){show('share');const link=`${location.origin}/app.html#c=${h.share}&k=${h.k}`;$('#link').value=link;QR.toCanvas($('#qr'),link,{width:180,margin:1,color:{dark:'#7a0a1a'}});
    $('#copy').onclick=()=>{navigator.clipboard?.writeText(link);toast('✓')};$('#open').href=link;$('#open').onclick=()=>setTimeout(route,0);
    $('#tw').href='https://x.com/intent/tweet?text='+encodeURIComponent(t('tweet'))+'&url='+encodeURIComponent(location.origin+'/app.html');return;}
  if(h.c){show('claim');let env;const kp=C.decKey(h.k);let mine=localStorage['claim_'+h.c];
    const load=async()=>{env=await api('/api/envelopes/'+h.c);render()};
    render=()=>{if(!env)return;$('#cmsg').textContent=env.message||'🧧';$('#cfrom').textContent=t('from',{a:short(env.creator)});
      $('#left').textContent=t('left',{n:env.remaining,c:env.count});$('#barI').style.width=(100*(env.count-env.remaining)/env.count)+'%';
      const top=Math.max(...env.claims.map(c=>c.amount));
      $('#board').innerHTML=env.claims.map(c=>`<li><span class="mono">${short(c.address)} ${c.amount===top&&env.claims.length>1?`<span class="best">👑 ${t('best')}</span>`:''}</span><b>${fmt(c.amount,env.decimals)} ${env.symbol}</b></li>`).join('')||'<li class="mut">—</li>';
      const me=mine&&env.claims.find(c=>c.address===mine);
      if(me){$('#got').classList.remove('hide');$('#claimform').classList.add('hide');$('#gotAmt').textContent=fmt(me.amount,env.decimals)+' '+env.symbol;$('#gotTx').href=`https://explorer.solana.com/tx/${me.sig}?cluster=${cfg.cluster==='mainnet'?'mainnet-beta':cfg.cluster}`;$('#env').classList.add('open')}
      else if(env.remaining===0||Date.now()>env.expiry){$('#claimform').innerHTML=`<p style="text-align:center" class="mut">${t(env.remaining?'expired':'empty')}</p>`}
      const exp=Date.now()>env.expiry;$('#refundbox').classList.toggle('hide',!(exp&&env.remaining>0&&!env.refunded));
      $('#refundD').textContent=fmt(env.remainingAmount,env.decimals)+' '+env.symbol+' → '+short(env.creator);};
    $('#useWallet').onclick=async()=>{try{await connect();$('#addr').value=wallet.pk.toBase58()}catch(e){toast(e.message)}};
    $('#newWallet').onclick=()=>{const n=w.Keypair.generate();localStorage['wallet_'+n.publicKey]=C.encKey(n);$('#addr').value=n.publicKey.toBase58();$('#sk').textContent=C.encKey(n);$('#backup').classList.remove('hide');$('#copysk').onclick=()=>{navigator.clipboard?.writeText(C.encKey(n));toast('✓')}};
    const doClaim=async()=>{const b=$('#claim');b.disabled=true;try{const a=$('#addr').value.trim();new w.PublicKey(a);
      $('#env').classList.add('open');const r=await api(`/api/envelopes/${h.c}/reserve`,{address:a});
      env=await api(`/api/envelopes/${h.c}/claim`,{address:a,tx:await C.buildClaimTx(conn,kp,env,a,r.amount)});mine=localStorage['claim_'+h.c]=a;render();burst();}catch(e){toast(e.message);$('#env').classList.remove('open')}finally{b.disabled=false}};
    $('#claim').onclick=doClaim;$('#seal').onclick=doClaim;
    $('#refund').onclick=async()=>{try{env=await api(`/api/envelopes/${h.c}/refund`,{tx:await C.buildRefundTx(conn,kp,env)});toast(t('refunded'));render()}catch(e){toast(e.message)}};
    await load();setInterval(load,8000);return;}
  show('create');calc();}
function burst(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;for(let i=0;i<36;i++){const s=document.createElement('div');s.textContent=['🪙','✨','🧧'][i%3];Object.assign(s.style,{position:'fixed',left:'50%',top:'30%',fontSize:'22px',zIndex:60,pointerEvents:'none',transition:'transform 1.2s cubic-bezier(.2,.8,.3,1),opacity 1.2s'});document.body.append(s);
  requestAnimationFrame(()=>{s.style.transform=`translate(${(Math.random()-.5)*600}px,${(Math.random()-.2)*500}px) rotate(${Math.random()*720}deg)`;s.style.opacity=0});setTimeout(()=>s.remove(),1300)}}
(async()=>{cfg=await api('/api/config');conn=new w.Connection(cfg.rpc,'confirmed');$('#cl').textContent=cfg.cluster==='mainnet'?'Mainnet':cfg.cluster;LG.mountToggle($('#lang'),L,l=>{L=l;i18n();const tw=$('#tw');if(tw.href)tw.href=tw.href.replace(/text=[^&]*/,'text='+encodeURIComponent(t('tweet')))});i18n();route();window.onhashchange=route;})();
