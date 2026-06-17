# 施工线程对齐文档 - RedeemLoop v0.2

本文件是给“施工线程”使用的发布基准。请以本文为准，统一覆盖旧版表达，改用 v0.2 的 Asset Binding、Voucher Tender、PaymentIntent、收券确认和 mark-as-paid 口径。

## 一句话目标

```text
RedeemLoop v0.2 = 多链提货券支付网关 + 非发行型资产绑定协议。
```

## 必须对齐的新边界

旧方向中容易误解的点已经移出第一版主线：

```text
资产创建属于外部工具
订单、交付和售后属于原商业系统
结算策略由 binding 配置
电商平台只需要外部支付确认
FT / Rune 优先，NFT 只是可选分支
```

v0.2 修正为：

```text
厂商自带资产，RedeemLoop 只绑定
原电商系统创建订单，RedeemLoop 只 mark paid
collect 可把资产收回商户金库，默认推荐
电商平台不需要 token 定价，只需要外部支付确认
FT / Rune 优先，NFT 只是可选分支
```

## 第一版发布包必须包含

- README.md
- whitepaper/RedeemLoop_Whitepaper.md
- whitepaper/RedeemLoop_Whitepaper.pdf
- docs/BOUNDARY.md
- docs/CONSTRUCTION.md
- docs/PROTOCOL_SPEC.md
- docs/INTEGRATION_GUIDE.md
- docs/COMMERCE_ADAPTERS.md
- docs/API_AND_DATA_MODEL.md
- docs/SECURITY_COMPLIANCE.md
- docs/CODEX_PROMPT.md

## 第一版代码骨架必须包含

- `packages/core/src/types.ts`
- `packages/adapters/src/interfaces.ts`
- `packages/sdk/src/client.ts` placeholder

## 开发顺序

```text
1. Core model and validators
2. PaymentIntent state machine
3. API CRUD
4. Merchant Console Asset Binding Wizard
5. EVM ERC-20 payment flow
6. Demo commerce mark-paid flow
7. Widget and React button
8. Webhook signing/idempotency
9. Bitcoin/Fractal interfaces
10. POS QR demo
```

## 禁止项

施工线程不得引入：

- 发币按钮。
- 发行向导。
- Rune etching 功能。
- Ordinal inscription 功能。
- NFT mint 功能。
- 二级市场。
- token price engine。
- 物流售后模块。

## 发布口径

对外描述使用：

```text
RedeemLoop is a voucher payment protocol for existing crypto assets.
```

中文：

```text
RedeemLoop 是让现有链上资产成为商品完整提货支付凭证的开源协议。
```
