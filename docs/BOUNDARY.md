# RedeemLoop 协议边界

RedeemLoop v0.2 的最重要原则：

```text
RedeemLoop is not an issuer.
RedeemLoop is a voucher payment and settlement layer.
```

中文：

```text
RedeemLoop 不是提货资产发行平台。
RedeemLoop 是提货券支付与结算层。
```

## 核心边界

厂商自己决定：

- 用哪条链。
- 用 FT、NFT、Rune、Inscription 还是其他资产。
- 如何发行。
- 发行多少。
- 是否可增发。
- 是否可转让。
- 是否带收藏图像。
- 是否在二级市场流转。
- 如何定义商品权益条款。

RedeemLoop 只负责：

- 资产描述符登记。
- 商品权益绑定。
- 商户收券地址验证。
- 用户钱包持券检测。
- 用户转券到商户收券地址。
- 链上到账确认。
- 通知电商/POS/店铺系统：订单已付款。

## 明确不做

不得在 core、sdk、merchant-console 主路径里实现：

- 一键发币。
- EVM 合约部署器。
- Rune etching。
- Ordinal inscription。
- NFT minting。
- 厂商私钥托管。
- tokenomics 设计器。
- 二级市场。
- 订单、物流、售后、税务替代系统。
- token-native pricing engine。

## 允许做但必须隔离

可以在 `examples/` 或 `docs/` 中提供：

- ERC-20 提货券合约示例。
- ERC-6909 多商品券示例。
- Rune 发行 checklist。
- Inscription 权益说明模板。
- 外部发行工具链接。

这些内容不得被 `packages/core`、`packages/sdk`、`services/api` 强依赖。

## UI 命名规范

使用：

```text
绑定提货资产
创建资产绑定
配置提货券支付
添加链上支付资产
Create Asset Binding
Bind Voucher Asset
Configure Voucher Payment
```

禁止使用：

```text
发行提货券
创建代币
一键发币
Launch Token
Issue RWA
Mint Voucher
Etch Rune
Inscribe Ordinal
```
