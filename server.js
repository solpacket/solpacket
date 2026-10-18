// SolPacket — minimal coordinator server. It NEVER receives escrow secret keys.
const express=require('express'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const w=require('@solana/web3.js');
const CLUSTER=process.env.CLUSTER||'devnet';
const RPC=process.env.HB_RPC||(CLUSTER==='mainnet'?'https://api.mainnet-beta.solana.com':'https://api.devnet.solana.com');
const PORT=process.env.PORT||5173, DB=process.env.DB||path.join(__dirname,'data.json');
const conn=new w.Connection(RPC,'confirmed');
let db=fs.existsSync(DB)?JSON.parse(fs.readFileSync(DB)):{env:{}};
const save=()=>fs.writeFileSync(DB,JSON.stringify(db,null,1));
const app=express();app.use(express.json({limit:'64kb'}));app.use(express.static(path.join(__dirname,'public')));
const pub=e=>({id:e.id,escrow:e.escrow,mint:e.mint,decimals:e.decimals,symbol:e.symbol,total:e.total,count:e.count,mode:e.mode,message:e.message,expiry:e.expiry,creator:e.creator,createdAt:e.createdAt,refunded:e.refunded||null,
  claims:e.claims.filter(c=>c.sig).map(c=>({address:c.address,amount:c.amount,sig:c.sig,at:c.at})),remaining:e.count-e.claims.filter(c=>c.sig).length,
  remainingAmount:e.shares.slice(e.claims.filter(c=>c.sig).length).reduce((a,b)=>a+b,0)});
// Protocol fee (1%) -> treasury. Disabled when HB_TREASURY is unset.
const TREASURY=process.env.HB_TREASURY||null, FEE_BPS=TREASURY?100:0;
const HB_MINT=process.env.HB_HONGBAO_MINT||null, HOLDER_MIN=Number(process.env.HB_HOLDER_MIN||0);
async function holderExempt(owner){if(!HB_MINT||!(HOLDER_MIN>0))return false;
  try{const r=await conn.getParsedTokenAccountsByOwner(new w.PublicKey(owner),{mint:new w.PublicKey(HB_MINT)});
    return r.value.reduce((a,x)=>a+Number(x.account.data.parsed.info.tokenAmount.uiAmountString||0),0)>=HOLDER_MIN}catch{return false}}
async function feeBpsFor(creator){return FEE_BPS&&!(await holderExempt(creator))?FEE_BPS:0}
const feeOf=(total,bps)=>Number(BigInt(total)*BigInt(bps)/10000n);
// Verify the confirmed funding tx (signed by creator) moved >= fee to the treasury.
async function verifyFee(sig,creator,mint,fee){if(typeof sig!=='string'||!sig)throw'fee: fundSig required';
  if(Object.values(db.env).some(e=>e.fundSig===sig))throw'fee: fundSig reused';
  const tx=await conn.getParsedTransaction(sig,{commitment:'confirmed',maxSupportedTransactionVersion:0});
  if(!tx||tx.meta?.err)throw'fee: funding tx not found';
  if(!tx.transaction.message.accountKeys.some(k=>k.signer&&k.pubkey.toBase58()===creator))throw'fee: funding tx not signed by creator';
  let paid=0n;
  if(!mint){for(const ix of tx.transaction.message.instructions)if(ix.program==='system'&&ix.parsed?.type==='transfer'){const i=ix.parsed.info;if(i.source===creator&&i.destination===TREASURY)paid+=BigInt(i.lamports)}}
  else{const td=require('@solana/spl-token').getAssociatedTokenAddressSync(new w.PublicKey(mint),new w.PublicKey(TREASURY),true).toBase58();
    for(const ix of tx.transaction.message.instructions)if(ix.program==='spl-token'&&/^transfer/.test(ix.parsed?.type||'')){const i=ix.parsed.info;if(i.destination===td&&i.authority===creator)paid+=BigInt(i.tokenAmount?.amount||i.amount||0)}}
  if(paid<BigInt(fee))throw`fee: treasury received ${paid}, expected ${fee}`;}
const isPk=s=>{try{new w.PublicKey(s);return true}catch{return false}};
app.get('/api/config',(q,r)=>r.json({cluster:CLUSTER,rpc:process.env.HB_PUBLIC_RPC||RPC,feeBps:FEE_BPS,treasury:TREASURY,hongbaoMint:HB_MINT,holderMin:HB_MINT?HOLDER_MIN:0}));
app.get('/api/fee',async(q,r)=>{if(q.query.creator&&!isPk(q.query.creator))return r.status(400).json({error:'bad address'});
  r.json({feeBps:q.query.creator?await feeBpsFor(q.query.creator):FEE_BPS,treasury:TREASURY})});
// Create: creator registers metadata after funding escrow. Server verifies escrow balance on-chain.
app.post('/api/envelopes',async(q,r)=>{try{
  const b=q.body;if(!isPk(b.escrow)||!isPk(b.creator))throw'bad address';
  const count=b.count|0;if(count<1||count>200)throw'count 1-200';
  const shares=b.shares.map(Number);if(shares.length!==count||shares.some(x=>!(x>0)||!Number.isInteger(x)))throw'bad shares';
  const total=shares.reduce((a,c)=>a+c,0);
  if(db.env[Object.keys(db.env).find(k=>db.env[k].escrow===b.escrow)])throw'escrow reused';
  // verify funding
  if(b.mint){const ata=await require('@solana/spl-token').getAssociatedTokenAddress(new w.PublicKey(b.mint),new w.PublicKey(b.escrow));
    const bal=await conn.getTokenAccountBalance(ata);if(BigInt(bal.value.amount)<BigInt(total))throw'escrow underfunded';}
  else{const bal=await conn.getBalance(new w.PublicKey(b.escrow));if(bal<total)throw'escrow underfunded';}
  const bps=await feeBpsFor(b.creator),fee=feeOf(total,bps);if(fee>0)await verifyFee(b.fundSig,b.creator,b.mint||null,fee);
  const id=crypto.randomBytes(6).toString('base64url');
  db.env[id]={id,escrow:b.escrow,creator:b.creator,mint:b.mint||null,decimals:b.mint?b.decimals|0:9,symbol:(b.symbol||(b.mint?'TOKEN':'SOL')).slice(0,10),
    total,count,mode:b.mode==='random'?'random':'equal',shares,message:String(b.message||'').slice(0,140),
    expiry:Math.max(Date.now()+60e3,Number(b.expiry)||Date.now()+864e5),createdAt:Date.now(),claims:[],feeBps:bps,fee,fundSig:b.fundSig||null};save();r.json(pub(db.env[id]));
}catch(e){r.status(400).json({error:String(e.message||e)})}});
app.get('/api/envelopes/:id',(q,r)=>{const e=db.env[q.params.id];e?r.json(pub(e)):r.status(404).json({error:'not found'})});
// Reserve a share for an address (one per address). Reservations expire after 2 min if unsigned.
app.post('/api/envelopes/:id/reserve',(q,r)=>{const e=db.env[q.params.id];if(!e)return r.status(404).json({error:'not found'});
  const a=q.body.address;if(!isPk(a))return r.status(400).json({error:'bad address'});
  if(Date.now()>e.expiry||e.refunded)return r.status(400).json({error:'expired'});
  e.claims=e.claims.filter(c=>c.sig||Date.now()-c.at<120e3);
  let c=e.claims.find(c=>c.address===a);if(c&&c.sig)return r.status(400).json({error:'already claimed',claim:c});
  if(!c){if(e.claims.length>=e.count)return r.status(400).json({error:'empty'});c={address:a,idx:e.claims.length,amount:e.shares[e.claims.length],at:Date.now()};e.claims.push(c);save();}
  r.json({amount:c.amount,idx:c.idx});});
// Submit the escrow-signed claim tx; server checks it pays exactly the reserved amount to the reserved address, then relays.
app.post('/api/envelopes/:id/claim',async(q,r)=>{try{const e=db.env[q.params.id];if(!e)throw'not found';
  const c=e.claims.find(c=>c.address===q.body.address&&!c.sig);if(!c)throw'no reservation';
  const tx=w.Transaction.from(Buffer.from(q.body.tx,'base64'));
  if(!tx.feePayer.equals(new w.PublicKey(e.escrow))||!tx.verifySignatures())throw'bad tx';
  const ok=checkTx(tx,e,c);if(!ok)throw'tx does not match reservation';
  const sig=await conn.sendRawTransaction(tx.serialize());await conn.confirmTransaction(sig,'confirmed');
  c.sig=sig;c.at=Date.now();save();r.json(pub(e));
}catch(x){r.status(400).json({error:String(x.message||x)})}});
function checkTx(tx,e,c){const spl=require('@solana/spl-token');
  for(const ix of tx.instructions){const p=ix.programId.toBase58();
    if(p===w.SystemProgram.programId.toBase58()){const d=w.SystemInstruction.decodeTransfer(ix);
      if(e.mint||d.fromPubkey.toBase58()!==e.escrow||d.toPubkey.toBase58()!==c.address||Number(d.lamports)!==c.amount)return false;}
    else if(p===spl.ASSOCIATED_TOKEN_PROGRAM_ID.toBase58()){if(!e.mint)return false;}
    else if(p===spl.TOKEN_PROGRAM_ID.toBase58()){if(!e.mint)return false;const d=spl.decodeTransferCheckedInstruction(ix);
      if(Number(d.data.amount)!==c.amount||d.keys.owner.pubkey.toBase58()!==e.escrow)return false;
      if(!d.keys.destination.pubkey.equals(spl.getAssociatedTokenAddressSync(new w.PublicKey(e.mint),new w.PublicKey(c.address))))return false;}
    else if(p!=='ComputeBudget111111111111111111111111111111')return false;}
  return true;}
// Refund: after expiry, relay a sweep to the creator address only.
app.post('/api/envelopes/:id/refund',async(q,r)=>{try{const e=db.env[q.params.id];if(!e)throw'not found';
  if(Date.now()<e.expiry)throw'not expired yet';
  const tx=w.Transaction.from(Buffer.from(q.body.tx,'base64'));if(!tx.verifySignatures())throw'bad tx';
  const sig=await conn.sendRawTransaction(tx.serialize());await conn.confirmTransaction(sig,'confirmed');
  e.refunded={sig,at:Date.now()};save();r.json(pub(e));}catch(x){r.status(400).json({error:String(x.message||x)})}});
// test hook: shorten expiry (only when TEST=1)
if(process.env.TEST==='1')app.post('/api/test/expire/:id',(q,r)=>{db.env[q.params.id].expiry=Date.now()-1;save();r.json({ok:1})});
app.listen(PORT,()=>console.log(`hongbao on http://localhost:${PORT} cluster=${CLUSTER} rpc=${RPC}`));
