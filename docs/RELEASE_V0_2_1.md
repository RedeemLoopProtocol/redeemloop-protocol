# RedeemLoop v0.2.1 Release Notes

## English

RedeemLoop v0.2.1 is the Merchant Embed Alpha release.

This version turns the v0.2 protocol/API baseline into a merchant-facing integration surface:

- Full SDK coverage for merchant setup, Asset Binding, PaymentIntent, balance check, transfer request, broadcast, settlement proof, receiving address, and webhook endpoint APIs.
- `@redeemloop/react` with `RedeemLoopProvider` and `RedeemLoopPayButton`.
- `@redeemloop/widget` for script-tag style stores.
- `/demo-store` in the local app to test both embed paths.
- API embed-origin controls through `REDEEMLOOP_EMBED_ALLOWED_ORIGINS` and verified merchant domains.

Known limits:

- Storage is still in-memory.
- Settlement proof is still client-submitted and should be treated as sandbox/demo trust only.
- WooCommerce and Shopify are still adapter surfaces, not installable production apps.

## 中文

RedeemLoop v0.2.1 是 Merchant Embed Alpha 版本。

这一版把 v0.2 的协议和 API 基线推进成商户可嵌入的集成表面：

- SDK 完整覆盖 merchant setup、Asset Binding、PaymentIntent、余额检查、转账请求、广播、settlement proof、收券地址和 webhook endpoint API。
- 新增 `@redeemloop/react`，包含 `RedeemLoopProvider` 和 `RedeemLoopPayButton`。
- 新增 `@redeemloop/widget`，面向 script-tag 风格店铺嵌入。
- 本地 app 新增 `/demo-store`，用于测试 React 和 widget 两种嵌入方式。
- API 增加嵌入来源控制：`REDEEMLOOP_EMBED_ALLOWED_ORIGINS` 和已验证商户域名。

已知限制：

- 存储仍为内存态。
- settlement proof 仍由客户端提交，只适合作为 sandbox/demo 信任模型。
- WooCommerce 和 Shopify 仍是 adapter 表面，不是可安装的生产应用。
