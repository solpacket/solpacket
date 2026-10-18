// E2E: create 3-envelope random split, 3 claims, refund (SOL), then same for SPL token.
const C=require('../src/core'),{w}=C;const API=process.env.API||'http://localhost:5173',RPC=process.env.HB_RPC||'http://127.0.0.1:8899';
const conn=new w.Connection(RPC,'confirmed');const j=async(p,b)=>{const r=await fetch(API+p,b?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}:{});const d=await r.json();if(!r.ok)throw new Error(p+': '+d.error);return d};
const air=async(pk,s)=>{await conn.confirmTransaction(await conn.requestAirdrop(pk,s*1e9),'confirmed')};
const ok=(c,m)=>{if(!c)throw new Error('FAIL '+m);console.log('  ✓',m)};
async function run(mintMode){console.log(`\n== ${mintMode?'SPL token':'SOL'} ==`);
  const creator=w.Keypair.generate();await air(creator.publicKey,2);
  let mint=null,decimals=9,total=0.9e9;
  if(mintMode){mint=await C.spl.createMint(conn,creator,creator.publicKey,null,6);decimals=6;total=900e6;
    const ata=await C.spl.getOrCreateAssociatedTokenAccount(conn,creator,mint,creator.publicKey);await C.spl.mintTo(conn,creator,mint,ata.address,creator,1000e6);mint=mint.toBase58();}
  const escrow=w.Keypair.generate(),shares=C.splitShares(total,3,'random');console.log('  shares',shares);
  // claim 2 of 3 first, test duplicate, then 3rd, then 4th attempt -> empty
  const ftx=await C.buildFundTx(conn,creator.publicKey,escrow.publicKey,{mint,total,count:3});ftx.sign(creator);
  await conn.confirmTransaction(await conn.sendRawTransaction(ftx.serialize()),'confirmed');
  let env=await j('/api/envelopes',{escrow:escrow.publicKey.toBase58(),creator:creator.publicKey.toBase58(),mint,decimals,count:3,mode:'random',shares,message:'Happy New Year',expiry:Date.now()+3600e3});
  ok(env.remaining===3&&env.total===total,'created, total='+env.total);
  const link=`${API}/app.html#c=${env.id}&k=${C.encKey(escrow)}`;console.log('  link',link.slice(0,70)+'…');
  const kp=C.decKey(new URL(link).hash.match(/k=([^&]+)/)[1]);
  const claimers=[0,1,2].map(()=>w.Keypair.generate().publicKey.toBase58());
  for(const a of claimers){const r=await j(`/api/envelopes/${env.id}/reserve`,{address:a});
    env=await j(`/api/envelopes/${env.id}/claim`,{address:a,tx:await C.buildClaimTx(conn,kp,env,a,r.amount)});
    const bal=mint?Number((await conn.getTokenAccountBalance(C.spl.getAssociatedTokenAddressSync(new w.PublicKey(mint),new w.PublicKey(a)))).value.amount):await conn.getBalance(new w.PublicKey(a));
    ok(bal===r.amount,`claim ${a.slice(0,6)} got ${r.amount} (on-chain ${bal})`);}
  ok(env.claims.reduce((s,c)=>s+c.amount,0)===total&&env.remaining===0,'sum of claims == total, remaining 0');
  try{await j(`/api/envelopes/${env.id}/reserve`,{address:claimers[0]});ok(false,'dup')}catch(e){ok(/already/.test(e.message),'duplicate claim rejected')}
  try{await j(`/api/envelopes/${env.id}/reserve`,{address:w.Keypair.generate().publicKey.toBase58()});ok(false,'4th')}catch(e){ok(/empty/.test(e.message),'4th claimer rejected (empty)')}
  // tamper: reserve ok but submit tx paying more -> reject (new envelope)
  return {creator,mint,decimals};}
async function refundTest(){console.log('\n== refund after expiry (2 of 3 unclaimed) ==');
  const creator=w.Keypair.generate();await air(creator.publicKey,2);const escrow=w.Keypair.generate(),total=0.6e9,shares=C.splitShares(total,3,'equal');
  const ftx=await C.buildFundTx(conn,creator.publicKey,escrow.publicKey,{total,count:3});ftx.sign(creator);await conn.confirmTransaction(await conn.sendRawTransaction(ftx.serialize()),'confirmed');
  let env=await j('/api/envelopes',{escrow:escrow.publicKey.toBase58(),creator:creator.publicKey.toBase58(),count:3,mode:'equal',shares,expiry:Date.now()+3600e3});
  const a=w.Keypair.generate().publicKey.toBase58(),r=await j(`/api/envelopes/${env.id}/reserve`,{address:a});
  // tamper attempt: pay 2x reserved amount
  try{await j(`/api/envelopes/${env.id}/claim`,{address:a,tx:await C.buildClaimTx(conn,escrow,env,a,r.amount*2)});ok(false,'tamper')}catch(e){ok(/match/.test(e.message),'tampered claim (2x amount) rejected by server')}
  env=await j(`/api/envelopes/${env.id}/claim`,{address:a,tx:await C.buildClaimTx(conn,escrow,env,a,r.amount)});ok(env.remaining===2,'1 claimed');
  try{await j(`/api/envelopes/${env.id}/refund`,{tx:await C.buildRefundTx(conn,escrow,env)});ok(false,'early')}catch(e){ok(/not expired/.test(e.message),'refund before expiry rejected')}
  await j(`/api/test/expire/${env.id}`,{});const before=await conn.getBalance(creator.publicKey);
  try{await j(`/api/envelopes/${env.id}/reserve`,{address:w.Keypair.generate().publicKey.toBase58()});ok(false,'x')}catch(e){ok(/expired/.test(e.message),'claim after expiry rejected')}
  env=await j(`/api/envelopes/${env.id}/refund`,{tx:await C.buildRefundTx(conn,escrow,env)});
  const after=await conn.getBalance(creator.publicKey),esc=await conn.getBalance(escrow.publicKey);
  ok(after-before>=0.4e9&&esc===0,`refunded ${(after-before)/1e9} SOL to creator, escrow now ${esc}`);}
// Protocol fee: spawn a second server with HB_TREASURY + holder exemption configured.
async function feeTest(){console.log('\n== 1% protocol fee (HB_TREASURY) + holder exemption ==');
  const treasury=w.Keypair.generate().publicKey.toBase58(),boss=w.Keypair.generate();await air(boss.publicKey,2);
  const hbMint=await C.spl.createMint(conn,boss,boss.publicKey,null,6);
  const port=5291,FAPI='http://localhost:'+port,db=require('os').tmpdir()+'/hb-fee-'+Date.now()+'.json';
  const srv=require('child_process').spawn(process.execPath,[__dirname+'/../server.js'],{env:{...process.env,PORT:port,DB:db,HB_RPC:RPC,HB_TREASURY:treasury,HB_HONGBAO_MINT:hbMint.toBase58(),HB_HOLDER_MIN:'1000',TEST:''},stdio:'ignore'});
  const fj=async(p,b)=>{const r=await fetch(FAPI+p,b?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}:{});const d=await r.json();if(!r.ok)throw new Error(p+': '+d.error);return d};
  try{for(let i=0;i<50;i++){try{await fj('/api/config');break}catch{await new Promise(r=>setTimeout(r,200))}}
    const cfg=await fj('/api/config');ok(cfg.feeBps===100&&cfg.treasury===treasury,'config exposes 1% fee + treasury');
    const fund=async(creator,{mint=null,total,fee})=>{const escrow=w.Keypair.generate(),tx=await C.buildFundTx(conn,creator.publicKey,escrow.publicKey,{mint,total,count:2,fee,treasury});tx.sign(creator);
      const sig=await conn.sendRawTransaction(tx.serialize());await conn.confirmTransaction(sig,'confirmed');return {escrow,sig}};
    const reg=(creator,f,{mint=null,total,decimals=9})=>fj('/api/envelopes',{fundSig:f.sig,escrow:f.escrow.publicKey.toBase58(),creator:creator.publicKey.toBase58(),mint,decimals,count:2,mode:'equal',shares:C.splitShares(total,2,'equal'),expiry:Date.now()+3600e3});
    const a=w.Keypair.generate();await air(a.publicKey,3);const total=0.3e9,fee=C.feeAmount(total,100);ok(fee===3e6,"fee = 1% of 0.3 SOL = 0.003 SOL");
    // no fee paid -> rejected
    let f=await fund(a,{total,fee:0});try{await reg(a,f,{total});ok(false,'nofee')}catch(e){ok(/fee/.test(e.message),'funding without fee rejected: '+e.message.split(': ').slice(1).join(': '))}
    // underpaid -> rejected
    f=await fund(a,{total,fee:fee-1});try{await reg(a,f,{total});ok(false,'under')}catch(e){ok(/expected/.test(e.message),'underpaid fee rejected')}
    // missing fundSig -> rejected
    f=await fund(a,{total,fee});try{await fj('/api/envelopes',{escrow:f.escrow.publicKey.toBase58(),creator:a.publicKey.toBase58(),count:2,mode:'equal',shares:C.splitShares(total,2,'equal')});ok(false,'nosig')}catch(e){ok(/fundSig required/.test(e.message),'missing fundSig rejected')}
    const before=await conn.getBalance(new w.PublicKey(treasury));const env=await reg(a,f,{total});
    ok(env.total===total&&(await conn.getBalance(new w.PublicKey(treasury)))-before>=0,'fee paid -> envelope created');
    {const tb=await conn.getBalance(new w.PublicKey(treasury));ok(tb===2*fee-1,'treasury on-chain = (fee-1)+fee lamports ('+tb/1e9+' SOL)')}
    // reuse of the same funding tx -> rejected
    const e2=w.Keypair.generate();try{await fj('/api/envelopes',{fundSig:f.sig,escrow:f.escrow.publicKey.toBase58(),creator:a.publicKey.toBase58(),count:2,mode:'equal',shares:C.splitShares(total,2,'equal')});ok(false,'reuse')}catch(e){ok(/reuse/.test(e.message),'funding tx/escrow reuse rejected')}
    // SPL fee in tokens to treasury ATA
    const tm=await C.spl.createMint(conn,a,a.publicKey,null,6),ata=await C.spl.getOrCreateAssociatedTokenAccount(conn,a,tm,a.publicKey);await C.spl.mintTo(conn,a,tm,ata.address,a,1000e6);
    const st=500e6,sf=C.feeAmount(st,100);f=await fund(a,{mint:tm.toBase58(),total:st,fee:sf});await reg(a,f,{mint:tm.toBase58(),total:st,decimals:6});
    const tb=await conn.getTokenAccountBalance(C.spl.getAssociatedTokenAddressSync(tm,new w.PublicKey(treasury),true));ok(Number(tb.value.amount)===sf,'SPL fee '+sf+' units landed in treasury ATA');
    // holder exemption: >= HB_HOLDER_MIN $HONGBAO -> 0% and no fee needed
    const h=w.Keypair.generate();await air(h.publicKey,3);const hata=await C.spl.getOrCreateAssociatedTokenAccount(conn,boss,hbMint,h.publicKey);await C.spl.mintTo(conn,boss,hbMint,hata.address,boss,1000e6);
    ok((await fj('/api/fee?creator='+h.publicKey.toBase58())).feeBps===0,'holder (1000 $HONGBAO) quoted 0%');
    ok((await fj('/api/fee?creator='+a.publicKey.toBase58())).feeBps===100,'non-holder quoted 1%');
    f=await fund(h,{total,fee:0});const he=await fj('/api/envelopes',{escrow:f.escrow.publicKey.toBase58(),creator:h.publicKey.toBase58(),count:2,mode:'equal',shares:C.splitShares(total,2,'equal')});ok(he.remaining===2,'holder created envelope fee-free');
  }finally{srv.kill();try{require('fs').unlinkSync(db)}catch{}}}
(async()=>{await run(false);await run(true);await refundTest();await feeTest();console.log('\nALL PASSED')})().catch(e=>{console.error(e);process.exit(1)});
