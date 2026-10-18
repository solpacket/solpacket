<p align="center"><img src="docs/landing-hero.png" width="720" alt="SolPacket landing — Money, folded into a link."></p>

<h1 align="center">SolPacket 🧧</h1>
<p align="center"><b>On-chain red envelopes for Solana.</b><br>One link. One red envelope. No wallet needed to claim.</p>
<p align="center"><a href="https://solpacket.fun">solpacket.fun</a> · <a href="https://x.com/solpacket_app">@solpacket_app</a></p>

> ⚠️ **Beta / unaudited. Devnet by default.** Read the [trust model](#trust-model) before using real funds.

## Features
- **Create**: connect Phantom / Solflare, send SOL or any SPL token, set total, number of packets, *equal* or *lucky-draw* (random) split, message and expiry.
- **Share**: QR code, copy link, one-tap share to X.
- **Claim**: paste any address, use your wallet, or generate an in-browser wallet (with key backup prompt).
- **Leaderboard**: live list of claimers and amounts, luckiest-draw crown, remaining progress.
- **Refund**: after expiry, unclaimed funds sweep back to the creator.
- **Landing page**: editorial red-and-gold paper design (cream stock, ink type, 開 watermark). Scroll tears open a red envelope and bursts coins and confetti, then a horizontal "how it works" run of pinned cards (GSAP ScrollTrigger + Lenis); `prefers-reduced-motion` fallback.
- **EN / 繁體中文**: language toggle in the nav on both the landing and the app. Defaults to English, remembers your choice, `?lang=zh` deep link.

<p align="center"><img src="docs/landing-scroll.gif" width="560" alt="Scrolling the landing: the envelope tears open"></p>

| Tear-open envelope | How it works |
|---|---|
| <img src="docs/landing-envelope.png" width="400"> | <img src="docs/landing-how-it-works.png" width="400"> |

| Create | Share | Claim | Claimed |
|---|---|---|---|
| <img src="docs/app-create.png" width="200"> | <img src="docs/app-share.png" width="200"> | <img src="docs/app-claim.png" width="200"> | <img src="docs/app-result.png" width="200"> |

<sub>Share screen: QR code and link blurred (the link contains the escrow key).</sub>

## How it works
1. The creator's browser generates a **one-time escrow keypair** and funds it (amount + tiny fee/rent buffer) from the creator's wallet.
2. The browser registers the envelope (escrow pubkey, precomputed shares, expiry) with the server. The server verifies the escrow balance on-chain.
3. The share link is `/app.html#c=<id>&k=<escrow secret>`. The part after `#` is never sent to the server.
4. A claimer reserves a share (`/reserve`), their browser signs a transfer from the escrow with the key from the link, and the server **validates the transaction** (exact recipient, exact amount, allowed programs only) before relaying it.
5. After expiry the escrow can be swept back to the creator (`/refund`).

```
public/      static site (landing + app)      src/core.js   tx building (shared by browser & tests)
src/app.js   create/claim UI                  src/landing.js scroll animations
server.js    coordinator API (no keys)        scripts/      e2e + screenshot scripts
```

## Trust model
- ✅ **No custody**: funds sit in an on-chain escrow; the server never sees its key and cannot move funds.
- ✅ The server enforces one claim per address, share amounts, and expiry for honest clients.
- ⚠️ **Link = key.** Anyone holding the link can bypass the server and drain the escrow. Share only with groups you trust.
- ⚠️ Refund safety relies on the same key — a link holder could also sweep before expiry.

The fix is an on-chain program (see roadmap) where claims require a server-signed one-time voucher and refunds can only go to the creator.

## Quickstart (local validator)
```bash
npm install
solana-test-validator                       # in another terminal
TEST=1 HB_RPC=http://127.0.0.1:8899 npm run dev   # http://localhost:5173
npm run e2e                                 # SOL + SPL random split, 3 claims, refund
npm run shots                               # headless screenshots -> shots/ (needs Chrome)
```
Devnet: `cp .env.example .env`, set `CLUSTER=devnet`, then `npm run dev` (fund your wallet from a devnet faucet).

## Environment variables
| Var | Default | Notes |
|---|---|---|
| `CLUSTER` | `devnet` | `devnet` or `mainnet` |
| `HB_RPC` | public cluster RPC | server-side RPC |
| `HB_PUBLIC_RPC` | `HB_RPC` | RPC given to browsers — never put a private key-bearing URL here |
| `PORT` | `5173` | |
| `DB` | `./data.json` | JSON store |
| `TEST` | – | `1` enables the test-only expire endpoint |
| `HB_TREASURY` | – | Treasury address for the 1% protocol fee. Unset = fee disabled (UI shows 0%) |
| `HB_HONGBAO_MINT` | – | $HONGBAO mint for the holder exemption (optional) |
| `HB_HOLDER_MIN` | – | Wallets holding ≥ this many whole $HONGBAO pay no fee (optional) |

## Protocol fee & $HONGBAO
- When `HB_TREASURY` is set, the creator's funding transaction includes a **1% fee** transfer to the treasury (lamports for SOL packets, tokens to the treasury's ATA for SPL packets). The create form shows the fee in the cost line.
- The server **verifies the fee on-chain**: it fetches the confirmed funding tx (`fundSig`), checks it was signed by the creator and that the treasury received ≥ 1% of the total; each funding tx can only register one packet.
- Holder exemption: with `HB_HONGBAO_MINT` + `HB_HOLDER_MIN` set, creators holding at least that many $HONGBAO pay 0%. `GET /api/fee?creator=<address>` returns the applicable rate.
- **Buybacks and burns are done manually** from the treasury wallet; every buyback/burn tx is posted publicly. Nothing is automated on-chain yet. Devnet beta, not audited, not financial advice.

## Roadmap
- [ ] Anchor program escrow (PDA vault, server-signed ed25519 claim vouchers, creator-only refund)
- [ ] Independent security audit before mainnet
- [ ] Wallet-adapter / wallet-standard support for more wallets, mobile deep links
- [ ] Postgres storage, rate limiting, abuse protection
- [ ] Token metadata (symbol/logo), "my packets" dashboard
- [ ] Claim directly to exchange deposit address / email login

## Links
- Website: https://solpacket.fun
- X: https://x.com/solpacket_app
- Repo: https://github.com/solpacket/solpacket

## License
[MIT](LICENSE)
