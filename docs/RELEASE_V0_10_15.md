# RedeemLoop v0.10.15 Release Notes

## English

v0.10.15 adds API rate-limit and CORS hardening for beta pilots.

### Added

- `/v1/*` API requests are rate-limited by bearer token or client IP.
- Rate-limit responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` on 429 responses.
- `/v1/config` exposes `cors` and `rateLimit` diagnostics.
- `pnpm beta:check:production` now fails when wildcard embed origins are allowed or API rate limiting is disabled.

### Changed

- Production env validation now fails when `REDEEMLOOP_EMBED_ALLOWED_ORIGINS=*`.
- Production env validation now fails when `RATE_LIMIT_DISABLED=true`.
- `.env.example` includes `RATE_LIMIT_WINDOW_MS=60000` and `RATE_LIMIT_MAX=300`.

### Verification

- `corepack pnpm --filter @redeemloop/api lint`
- `corepack pnpm --filter @redeemloop/api test`
- Production env check rejects wildcard CORS.
- Production env check rejects disabled rate limiting.
- Production env check passes with explicit origins and rate-limit settings.
- `corepack pnpm audit --audit-level moderate`
- `corepack pnpm verify`

### Remaining Beta Gap

This is process-local pilot hardening. Public beta publication still needs real Docker Compose, production readiness, funded EVM wallet, and WooCommerce test-store certification artifacts.

## 中文

v0.10.15 为 beta pilot 新增 API rate-limit 和 CORS 加固。

### 新增

- `/v1/*` API 请求会按 bearer token 或客户端 IP 做 rate limit。
- Rate-limit 响应包含 `X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset`，429 响应包含 `Retry-After`。
- `/v1/config` 会暴露 `cors` 和 `rateLimit` diagnostics。
- `pnpm beta:check:production` 现在会在允许 wildcard embed origins 或禁用 API rate limiting 时失败。

### 变更

- Production env validation 现在会在 `REDEEMLOOP_EMBED_ALLOWED_ORIGINS=*` 时失败。
- Production env validation 现在会在 `RATE_LIMIT_DISABLED=true` 时失败。
- `.env.example` 新增 `RATE_LIMIT_WINDOW_MS=60000` 和 `RATE_LIMIT_MAX=300`。

### 验证

- `corepack pnpm --filter @redeemloop/api lint`
- `corepack pnpm --filter @redeemloop/api test`
- Production env check 会拒绝 wildcard CORS。
- Production env check 会拒绝禁用 rate limiting。
- 使用明确 origins 和 rate-limit settings 时，production env check 通过。
- `corepack pnpm audit --audit-level moderate`
- `corepack pnpm verify`

### 剩余 Beta 缺口

这是 process-local pilot hardening。公开 beta 发布仍需要真实 Docker Compose、production readiness、funded EVM wallet 和 WooCommerce test-store certification artifacts。
