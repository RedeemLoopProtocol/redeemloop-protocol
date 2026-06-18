# RedeemLoop v0.8.0

## English

RedeemLoop v0.8.0 adds POS QR and livestream short-link pilot APIs.

### Added

- `POST /v1/pos/payment-intents`.
- Terminal-scoped POS QR payloads with `terminalNonce` replay protection.
- Terminal-scoped POS audit events.
- `POST /v1/short-links/payment-intents`.
- `GET /v1/short-links/:slug`.
- SDK helpers for POS PaymentIntent and short-link creation/resolution.
- Local POS console controls for terminal registration, POS QR creation, short-link creation, and PaymentIntent status refresh.
- Persistence for short links and terminal payment nonces.
- Bilingual POS QR and short-link pilot guide.

### Verification

- `pnpm --filter @redeemloop/api lint && pnpm --filter @redeemloop/api test`
- `pnpm --filter @redeemloop/sdk lint && pnpm --filter @redeemloop/sdk test`

### Known Limits

- POS QR and short links are pilot APIs, not a hosted payment page.
- QR rendering and branded hosted checkout remain deployment responsibilities.
- Terminal registration uses the current sandbox registry and should be backed by managed storage in production.

## 中文

RedeemLoop v0.8.0 新增 POS QR 和直播短链 pilot API。

### 新增

- `POST /v1/pos/payment-intents`。
- 支持 `terminalNonce` 防重放的 terminal-scoped POS QR payload。
- Terminal-scoped POS audit events。
- `POST /v1/short-links/payment-intents`。
- `GET /v1/short-links/:slug`。
- SDK 新增 POS PaymentIntent 和短链创建/解析 helper。
- 本地 POS console 新增 terminal registration、POS QR 创建、短链创建和 PaymentIntent status refresh 控件。
- 短链和 terminal payment nonce 支持持久化。
- 新增双语 POS QR 和短链 pilot guide。

### 验证

- `pnpm --filter @redeemloop/api lint && pnpm --filter @redeemloop/api test`
- `pnpm --filter @redeemloop/sdk lint && pnpm --filter @redeemloop/sdk test`

### 已知限制

- POS QR 和短链仍是 pilot API，不是托管支付页。
- QR 渲染和品牌化 hosted checkout 仍由部署方实现。
- Terminal registration 使用当前 sandbox registry；生产环境应迁移到托管存储。
