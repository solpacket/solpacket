# Contributing

1. Fork, then `npm install`.
2. Start a local validator: `solana-test-validator`.
3. `TEST=1 HB_RPC=http://127.0.0.1:8899 npm run dev`
4. `npm run e2e` must pass before opening a PR; `npm run shots` regenerates screenshots into `shots/`.

Rules: never commit keypairs, `.env`, `data.json`, or private RPC URLs. Test keypairs are generated at runtime. Keep PRs small and describe trust-model impact if you touch claim/refund logic.
