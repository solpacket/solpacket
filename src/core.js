// Shared client logic (browser + test scripts). Escrow secret stays client-side.
const w=require('@solana/web3.js'),spl=require('@solana/spl-token'),bs58=require('bs58').default||require('bs58');
const FEE=5000, ATA_RENT=2039280;
function splitShares(total,count,mode,min=1){total=BigInt(total);const M=BigInt(min);if(total<M*BigInt(count))throw new Error('amount too small');
  if(mode!=='random'){const b=total/BigInt(count),s=Array(count).fill(b);s[count-1]+=total-b*BigInt(count);return s.map(Number);}
  // "double-mean" WeChat-style random split, min 1 unit each
  const s=[];let left=total-M*BigInt(count),n=count;
  for(;n>1;n--){const max=left*2n/BigInt(n);const r=BigInt(Math.floor(Math.random()*Number(max)));const v=r>left?left:r;s.push(v+M);left-=v;}
  s.push(left+M);return s.sort(()=>Math.random()-.5).map(Number);}
function overhead(count,mint){return mint?890880+count*(FEE+ATA_RENT)+FEE:count*FEE;}
async function buildFundTx(conn,creator,escrow,{mint,total,count}){
  const tx=new w.Transaction();
  tx.add(w.SystemProgram.transfer({fromPubkey:creator,toPubkey:escrow,lamports:(mint?0:total)+overhead(count,mint)}));
  if(mint){const m=new w.PublicKey(mint),info=await spl.getMint(conn,m),src=spl.getAssociatedTokenAddressSync(m,creator),dst=spl.getAssociatedTokenAddressSync(m,escrow);
    tx.add(spl.createAssociatedTokenAccountIdempotentInstruction(creator,dst,escrow,m));
    tx.add(spl.createTransferCheckedInstruction(src,m,dst,creator,BigInt(total),info.decimals));}
  tx.feePayer=creator;tx.recentBlockhash=(await conn.getLatestBlockhash()).blockhash;return tx;}
async function buildClaimTx(conn,escrowKp,env,to,amount){
  const tx=new w.Transaction(),toPk=new w.PublicKey(to);
  if(env.mint){const m=new w.PublicKey(env.mint),dst=spl.getAssociatedTokenAddressSync(m,toPk);
    tx.add(spl.createAssociatedTokenAccountIdempotentInstruction(escrowKp.publicKey,dst,toPk,m));
    tx.add(spl.createTransferCheckedInstruction(spl.getAssociatedTokenAddressSync(m,escrowKp.publicKey),m,dst,escrowKp.publicKey,BigInt(amount),env.decimals));}
  else tx.add(w.SystemProgram.transfer({fromPubkey:escrowKp.publicKey,toPubkey:toPk,lamports:amount}));
  tx.feePayer=escrowKp.publicKey;tx.recentBlockhash=(await conn.getLatestBlockhash()).blockhash;tx.sign(escrowKp);return tx.serialize().toString('base64');}
async function buildRefundTx(conn,escrowKp,env){
  const tx=new w.Transaction(),cr=new w.PublicKey(env.creator),e=escrowKp.publicKey;
  if(env.mint){const m=new w.PublicKey(env.mint),src=spl.getAssociatedTokenAddressSync(m,e),bal=await conn.getTokenAccountBalance(src),dst=spl.getAssociatedTokenAddressSync(m,cr);
    tx.add(spl.createAssociatedTokenAccountIdempotentInstruction(e,dst,cr,m));
    if(BigInt(bal.value.amount)>0n)tx.add(spl.createTransferCheckedInstruction(src,m,dst,e,BigInt(bal.value.amount),env.decimals));
    tx.add(spl.createCloseAccountInstruction(src,cr,e));}
  const lam=await conn.getBalance(e);
  if(lam>FEE)tx.add(w.SystemProgram.transfer({fromPubkey:e,toPubkey:cr,lamports:lam-FEE}));
  tx.feePayer=e;tx.recentBlockhash=(await conn.getLatestBlockhash()).blockhash;tx.sign(escrowKp);return tx.serialize().toString('base64');}
const encKey=kp=>bs58.encode(kp.secretKey), decKey=s=>w.Keypair.fromSecretKey(bs58.decode(s));
module.exports={w,spl,bs58,splitShares,overhead,buildFundTx,buildClaimTx,buildRefundTx,encKey,decKey,FEE};
