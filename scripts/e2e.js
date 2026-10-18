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
(async()=>{await run(false);await run(true);await refundTest();console.log('\nALL PASSED')})().catch(e=>{console.error(e);process.exit(1)});
