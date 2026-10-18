# Security Policy

SolPacket is **unaudited beta software**. Do not use it with funds you cannot afford to lose.

## Known trust assumptions
- **The link is the key.** The escrow secret key is in the URL fragment (`#k=...`). Anyone who has the link can bypass the server and sweep the escrow. Share links only with people you intend to pay.
- The server enforces one-share-per-address, expiry and exact amounts only for clients that go through it.
- Refunds are signed with the same escrow key; the server only relays sweeps after expiry.

## Reporting a vulnerability
Please do **not** open a public issue. Report privately via [GitHub Security Advisories](https://github.com/solpacket/solpacket/security/advisories/new) or send a DM to [@solpacket_app](https://x.com/solpacket_app) on X. We aim to respond within 72 hours.
