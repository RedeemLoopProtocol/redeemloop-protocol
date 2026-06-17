# RedeemLoop Protocol / 兑环协议白皮书

**版本：v0.2 - Asset Binding and Voucher Payment Gateway**  
**日期：2026-06-17**  
**状态：给开源开发线程和 Codex 使用的产品与工程基准稿**

> RedeemLoop 不是法律、财务、税务或投资建议。RedeemLoop 不发行提货券资产，不为厂商资产背书，不托管资产，不承诺履约。RedeemLoop 是一个非常克制的多链提货券支付协议：厂商自带资产，RedeemLoop 只做绑定、验券、收券确认和电商支付通知。

---

## 目录

1. 摘要
2. 为什么不是发行平台
3. 核心定义
4. 商品不是 token 定价，token 是外部提货支付凭证
5. 用户体验
6. 厂商体验：Asset Binding Wizard
7. 支持的链上资产
8. 商品权益绑定模型
9. 支付与结算流程
10. 电商、店铺、实体店和直播渠道接入
11. 结算策略：collect、burn、escrow
12. Bitcoin、Fractal Bitcoin、Runes 与 Inscriptions
13. 安全、索引器和确认策略
14. 合规与责任边界
15. 第一版开发范围
16. Codex 施工原则
17. 术语表
18. 参考方向

---

## 1. 摘要

RedeemLoop Protocol / 兑环协议是一个多链提货券支付协议。它允许厂商、店铺、电商平台、实体零售、软件、小程序、直播带货和广告分发渠道，把已经存在的链上资产绑定为某个商品或服务的完整提货权益。

最简单的用户体验是：

```text
用户进入商品页
看到「使用提货券兑换」按钮
连接钱包
系统检测用户是否持有对应 FT / NFT / Rune / Inscription
用户把该资产发送到商户收券地址
RedeemLoop 确认链上到账
电商系统把订单视同已付款
原系统继续处理发货、物流、售后
```

RedeemLoop 的核心不是重新做电商系统，也不是重新做发币系统，而是补上今天主流电商平台缺少的一层：

```text
链上提货资产 -> 商品权益绑定 -> 钱包转券 -> 商户收券确认 -> 订单标记已付款
```

因此 RedeemLoop v0.2 的核心边界是：

```text
Bring Your Own Voucher Asset.
厂商自带提货资产。
RedeemLoop 只做绑定、验券、收券和付款通知。
```

---

## 2. 为什么不是发行平台

厂商采用什么链、发行什么 FT/NFT、是否使用 Bitcoin Runes、Fractal Bitcoin Runes、Ordinals Inscriptions、ERC-20、ERC-6909、ERC-1155 或 ERC-721，这些都应该由厂商自己决定。

RedeemLoop 不应成为发行平台，原因有四个。

第一，发行边界复杂。EVM 合约部署、Rune etching、Ordinal inscription、Fractal 生态工具、NFT mint、metadata、供应量、是否增发、是否可转让，都是不同生态的发行问题。如果核心模块内置发行器，会把一个本来清晰的支付协议拖成多链发行平台。

第二，责任边界会变脏。如果 RedeemLoop 帮厂商发行资产，用户和监管方很容易认为 RedeemLoop 参与了权益发行、资产设计、销售承诺甚至履约承诺。

第三，代码边界会变差。支付协议的核心应是 asset binding、payment intent、wallet transfer、settlement verification、webhook，而不是合约工厂、铭刻工具、Rune 发行流程和 tokenomics 配置。

第四，生态里已经存在大量发行工具。RedeemLoop 应该利用现有加密基础设施，而不是重复造轮子。

所以协议必须明确：

```text
RedeemLoop does not issue voucher assets.
RedeemLoop binds voucher assets to entitlements and settles voucher payments.
```

---

## 3. 核心定义

### 3.1 Voucher Asset / 提货资产

Voucher Asset 是厂商已经发行或已经拥有的链上资产。它可以是：

```text
EVM ERC-20
EVM ERC-6909
EVM ERC-1155
EVM ERC-721
Bitcoin Rune
Bitcoin Inscription
Fractal Bitcoin Rune
Fractal Bitcoin Inscription
其他可被 adapter 验证和转移的链上资产
```

RedeemLoop 不定义它如何发行，只描述它如何被绑定和支付。

### 3.2 Entitlement / 商品权益

Entitlement 是用户持有并支付提货资产后可以获得的完整商品或服务权益。

```text
1 枚 COCA-COLA-BOTTLE = 兑换任意合作门店 1 瓶可口可乐
1 枚 COFFEE-AMERICANO = 兑换 1 杯美式咖啡
1 枚 WASH-STANDARD = 兑换 1 次标准洗车服务
1 枚 SAAS-MONTH = 兑换 1 个月软件服务
```

它不是积分，不是抵扣，不是优惠码，不是余额。它的语义是完整权益。

### 3.3 Asset Binding / 资产绑定

Asset Binding 是 RedeemLoop 的核心配置：

```text
某个链上资产 + 某个数量 + 某个商户收券地址 + 某个商品权益 + 某个电商 SKU 或权益组
```

### 3.4 Merchant Vault / 商户收券地址

Merchant Vault 是商户收取提货资产的钱包地址或合约地址。EVM 场景可以是 EOA、多签或合约金库；Bitcoin / Fractal 场景可以是 Taproot 地址或兼容钱包地址。

### 3.5 PaymentIntent / 提货券支付意图

PaymentIntent 是某次兑换交易的临时记录，用于把电商订单、用户钱包、资产转账和链上交易匹配起来。

### 3.6 Settlement / 结算

Settlement 是 RedeemLoop 确认指定资产已经从用户地址转入商户收券地址，或已经按规则 burn / escrow 的过程。

---

## 4. 商品不是 token 定价，token 是外部提货支付凭证

主流电商平台、店铺系统和 POS 系统今天通常不会原生支持这样的定价：

```text
商品价格 = 1 枚 Rune
商品价格 = 1 个 ERC-20
商品价格 = 1 个 Inscription
```

RedeemLoop 不应该要求平台重构价格系统。商品仍然用本地货币定价，库存、税务、订单报表、物流、售后都留在原电商系统中。

RedeemLoop 只作为一种外部支付方式：

```text
商品：可口可乐 330ml
平台价格：¥10
RedeemLoop 绑定：也可以用 1 枚 COCA-COLA-BOTTLE 提货券支付
```

对平台来说：

```text
支付方式 = RedeemLoop Voucher
支付状态 = 已付款
支付凭证 = 链、资产类型、资产 ID、金额、txid、商户收券地址
```

这避免了把 RedeemLoop 变成电商价格引擎，也避免了与税务、库存和平台结算系统发生深度冲突。

---

## 5. 用户体验

### 5.1 商品详情页

商品详情页显示：

```text
价格：¥10
可选支付：1 枚 COCA-COLA-BOTTLE 提货券
[ 使用提货券兑换 ]
```

用户点击后：

1. 弹出 RedeemLoop Pay 面板。
2. 用户选择钱包：MetaMask、WalletConnect、UniSat、Xverse、OKX Wallet 等。
3. 系统识别当前商品 SKU 或权益组。
4. 系统查询该商品绑定的可接受资产。
5. 系统检测用户地址余额或 inscription 所有权。
6. 用户确认兑换。
7. 系统创建电商待支付订单或绑定现有 checkout order。
8. 系统生成 PaymentIntent。
9. 用户钱包转出指定资产到商户收券地址。
10. RedeemLoop 验证到账。
11. 电商系统把订单标记为已付款。

用户不需要理解索引器、PSBT、EIP-712、UTXO、allowance、webhook 等工程细节。

### 5.2 结账页

在结账页中，RedeemLoop 可以表现为一种支付方式：

```text
支付方式
[ ] 信用卡
[ ] PayPal
[ ] 银行转账
[x] RedeemLoop 提货券
```

选择后，订单进入 awaiting payment。链上收券确认后，平台进入已付款/待发货状态。

### 5.3 实体店 POS

店员扫码或 POS 生成二维码：

```text
RedeemLoop PaymentIntent QR
```

用户手机钱包确认转券。POS 在收到确认后显示：

```text
已收到 1 枚 COCA-COLA-BOTTLE
可以交付商品
```

### 5.4 直播带货和广告渠道

直播间、小程序、广告落地页只需要放 RedeemLoop 短链或按钮：

```text
[ 持券兑换 ]
```

RedeemLoop 根据绑定信息完成钱包识别、PaymentIntent、转券和支付通知。

---

## 6. 厂商体验：Asset Binding Wizard

厂商后台不应提供“发行提货券”按钮，而应提供：

```text
绑定提货资产
Create Asset Binding
```

Asset Binding Wizard 的流程如下。

### Step 1：选择资产来源

```text
你是否已经拥有一个链上提货资产？
[ 是，我已经发行好了 ]
[ 否，查看发行参考指南 ]
```

如果厂商还没有资产，RedeemLoop 只提供发行参考文档，不进入发行流程。

### Step 2：选择资产类型

```text
EVM ERC-20
EVM ERC-6909
EVM ERC-1155
EVM ERC-721
Bitcoin Rune
Bitcoin Inscription
Fractal Bitcoin Rune
Fractal Bitcoin Inscription
```

### Step 3：填写资产描述符

EVM ERC-20 示例：

```json
{
  "chainNamespace": "eip155",
  "chainId": 56,
  "assetType": "erc20",
  "contract": "0x...",
  "requiredAmount": "1",
  "decimals": 0
}
```

Bitcoin Rune 示例：

```json
{
  "chainNamespace": "bitcoin",
  "assetType": "rune",
  "runeId": "840000:123",
  "runeName": "COCA-COLA-BOTTLE",
  "requiredAmount": "1",
  "divisibility": 0
}
```

Fractal Rune 示例：

```json
{
  "chainNamespace": "fractal",
  "assetType": "rune",
  "runeId": "210000:45",
  "runeName": "COCA-COLA-BOTTLE",
  "requiredAmount": "1",
  "divisibility": 0
}
```

### Step 4：绑定商品权益

```json
{
  "entitlementId": "coca-cola:any-bottle",
  "name": "任意一瓶可口可乐",
  "quantity": 1,
  "region": "global",
  "validity": "perpetual",
  "termsHash": "0x..."
}
```

### Step 5：绑定电商 SKU 或权益组

单 SKU：

```json
{
  "platform": "woocommerce",
  "storeId": "tokyo-store-001",
  "sku": "COKE-330ML-JP"
}
```

全球权益组：

```json
{
  "entitlementId": "coca-cola:any-bottle",
  "skuMappings": [
    { "country": "JP", "platform": "shopify", "sku": "COKE-330ML-JP" },
    { "country": "US", "platform": "square-pos", "sku": "COKE-12OZ-US" },
    { "country": "TH", "platform": "shopline", "sku": "COKE-325ML-TH" }
  ]
}
```

### Step 6：验证商户控制权

RedeemLoop 至少应支持：

```text
域名验证
收券地址签名验证
电商插件/API key 验证
```

### Step 7：生成植入代码

```html
<script src="https://cdn.redeemloop.org/pay/v0/redeemloop-pay.js"></script>
<div data-rl-pay-button data-binding-id="rlb_coke_global_001"></div>
```

---

## 7. 支持的链上资产

RedeemLoop 的资产支持应通过 adapter 扩展，而不是在核心中硬编码。

### 7.1 EVM ERC-20

适合单一同质化商品券。建议 `decimals = 0`，避免 0.001 瓶可乐这类语义混乱。

### 7.2 EVM ERC-6909

适合一个厂商在一个合约中管理多种同质化商品权益。

### 7.3 EVM ERC-1155

适合兼容成熟 SFT/NFT 生态，也适合按批次、地区、有效期拆 tokenId。

### 7.4 EVM ERC-721

适合唯一权益、收藏权益、编号商品、门票座位、序列号资产。

### 7.5 Bitcoin Runes

适合 Bitcoin 生态 FT 提货券。对于普通商品，建议 divisibility = 0。

### 7.6 Bitcoin Inscriptions

适合唯一权益、纪念权益、收藏权益、单张票据。

### 7.7 Fractal Bitcoin Runes 与 Inscriptions

Fractal Bitcoin 生态可以作为 Bitcoin 原生资产场景的扩展支持。实现方式与 Bitcoin 类似：钱包连接、PSBT、索引器确认、商户收券地址。

---

## 8. 商品权益绑定模型

核心对象是 RedemptionBinding：

```ts
interface RedemptionBinding {
  bindingId: string;
  merchantId: string;
  entitlementId: string;
  acceptedAssets: VoucherAssetDescriptor[];
  merchantVaults: Record<string, string>;
  settlementPolicy: "collect" | "burn" | "escrow";
  commerceTargets: CommerceTarget[];
  status: "draft" | "active" | "paused" | "archived";
  termsHash: string;
  createdAt: string;
  updatedAt: string;
}
```

这张表是 RedeemLoop 的核心。它不是发行表，也不是 token price 表，而是：

```text
哪个链上资产可以作为哪个商品权益的完整支付凭证。
```

---

## 9. 支付与结算流程

推荐标准流程是：

```text
Order Intent first
Voucher Transfer second
Mark Paid third
```

也就是说，系统应先创建待支付订单或支付意图，再引导用户转券。不要让用户在没有订单的情况下直接转券，否则会出现地址、库存、SKU、订单号和用户身份无法匹配的问题。

### 9.1 PaymentIntent

```ts
interface RedeemLoopPaymentIntent {
  intentId: string;
  bindingId: string;
  merchantId: string;
  storeId?: string;
  channel: "website" | "checkout" | "pos" | "miniapp" | "livestream" | "ad";
  orderId: string;
  skuLines: Array<{ sku: string; quantity: number }>;
  acceptedAssets: VoucherAssetDescriptor[];
  selectedAsset?: VoucherAssetDescriptor;
  payerAddress?: string;
  merchantVault: string;
  settlementPolicy: "collect" | "burn" | "escrow";
  status: "created" | "wallet_connected" | "transfer_requested" | "seen" | "confirmed" | "paid" | "expired" | "failed";
  expiresAt: string;
}
```

### 9.2 EVM 支付

EVM 最小路径：

```text
balanceOf(user) >= requiredAmount
用户调用 transfer(merchantVault, requiredAmount)
settlement worker 监听 Transfer event
确认 from、to、amount、contract、chainId 匹配 PaymentIntent
通知 commerce adapter markOrderPaid
```

如果需要合约化收券，可后续增加 router 或 permit 体验，但 MVP 不强制。

### 9.3 Bitcoin / Fractal 支付

BTC / Fractal 路径：

```text
检查用户 UTXO 和 Rune / Inscription 持有情况
构造 PSBT
钱包签名
广播交易
索引器看到资产转入 merchant vault
确认 runeId/inscriptionId、数量、from、to、txid 匹配
通知 commerce adapter markOrderPaid
```

---

## 10. 电商、店铺、实体店和直播渠道接入

RedeemLoop 的 commerce adapter 只需要做四件事：

```text
读取商品上下文
创建待支付订单或绑定已有订单
在收券确认后标记订单已付款
记录 RedeemLoop payment metadata
```

不要做：

```text
物流
售后
税务
库存系统
发票系统
客服系统
价格系统
```

### 10.1 WooCommerce

第一版最适合作为原生支付插件实现。插件添加 `RedeemLoop Voucher` 支付方式，用户下单后弹钱包，确认收券后调用订单 `payment_complete`。

### 10.2 Shopify

第一版建议走外部/手动支付桥或商品页按钮 + 后台 mark paid 流程。不要在 MVP 阶段强行做平台原生支付应用，因为平台支付应用通常有审核、权限和商业准入要求。

### 10.3 自建商城

提供 REST API 和 JS SDK：创建订单、创建 PaymentIntent、确认付款、回调 mark paid。

### 10.4 POS

提供二维码和店员确认页。低价值商品可配置 mempool seen 作为预确认，高价值商品等待确认数。

### 10.5 直播和广告

使用短链生成 PaymentIntent。收券后跳回商户订单页或兑换成功页。

---

## 11. 结算策略：collect、burn、escrow

### 11.1 collect - 默认推荐

用户把券转给商户金库。商户可以再次销售、空投、奖励或渠道分发。总量恒定，权益循环。

适合：饮料券、咖啡券、洗车券、标准服务券、品牌营销券、全球门店通用券。

### 11.2 burn - 一次性权益

用户兑换后资产销毁。适合不可再流转的门票、一次性服务、活动入场资格。

### 11.3 escrow - 后续阶段

用于高价值商品或预售。用户先把券转入托管地址，商户接单后释放给商户，失败时退回用户。

---

## 12. Bitcoin、Fractal Bitcoin、Runes 与 Inscriptions

RedeemLoop 必须把 Bitcoin / Fractal 作为一等公民，但实现方式与 EVM 不同。

EVM 的关键是合约调用和事件监听。Bitcoin / Fractal 的关键是：

```text
PSBT 构造
钱包签名
UTXO 选择
Rune / Inscription 索引器
商户收券地址
多索引器确认
```

第一版可以先提供 adapter interface 和 descriptor，不要求立即完整实现所有运行时。

必须设计 indexer abstraction，避免绑定单一 API 服务商：

```ts
interface IndexerAdapter {
  getBalance(address: string, asset: VoucherAssetDescriptor): Promise<AssetBalance>;
  getTransferProof(txid: string, asset: VoucherAssetDescriptor): Promise<TransferProof>;
  watchVault(vault: string, asset: VoucherAssetDescriptor): AsyncIterable<TransferProof>;
}
```

---

## 13. 安全、索引器和确认策略

关键风险：

```text
用户转错资产
用户转错地址
重复支付匹配
mempool 交易被替换
索引器错误
商户收券地址被篡改
Webhook 伪造
订单已取消但转券成功
资产绑定被恶意修改
```

必须实现：

```text
PaymentIntent 过期时间
bindingId 与 termsHash 固定
商户收券地址签名验证
Webhook HMAC 或非对称签名
幂等 mark paid
confirmations policy
多索引器交叉校验接口
审计日志
暂停绑定
暂停商户
人工补录/退款/退券流程
```

---

## 14. 合规与责任边界

RedeemLoop 的核心合规边界是：

```text
RedeemLoop 不发行资产
RedeemLoop 不销售资产
RedeemLoop 不托管资产
RedeemLoop 不做交易市场
RedeemLoop 不为厂商履约担保
RedeemLoop 不把 token 宣传为投资品
```

厂商必须自己承担：

```text
商品权益条款
是否可退款
有效期
区域限制
缺货处理
资产发行合规
消费者保护
税务与发票
履约责任
```

RedeemLoop 文档、UI 和 README 都应避免使用“发币”“投资”“收益”“币价”“涨幅”等表达。

---

## 15. 第一版开发范围

v0.2 第一版发布范围：

```text
必须做：
- 协议类型定义
- Asset Binding Wizard，不含发行
- RedemptionBinding CRUD
- PaymentIntent CRUD
- EVM ERC-20 balance check
- EVM ERC-20 transfer-to-vault 支付流程
- settlement worker
- webhook mark paid
- demo store 或 WooCommerce adapter
- script widget
- React button
- 商户收券地址验证
- Webhook 签名与幂等处理

必须预留：
- Bitcoin Rune descriptor
- Fractal Rune descriptor
- Inscription descriptor
- PSBT builder interface
- indexer adapter interface
- collect/burn/escrow settlement policy

明确不做：
- 内置发行器
- tokenomics 向导
- 二级市场
- 物流、售后、库存和税务系统
- 平台原生 token 定价引擎
- 链上跨链桥
```

---

## 16. Codex 施工原则

Codex 和开发线程必须遵守以下规则：

```text
1. 不实现发行器。
2. 不实现 token price engine。
3. 不实现 marketplace。
4. 不实现 commerce backend replacement。
5. 核心包只包含绑定、支付、验券、结算、通知。
6. examples 可以放发行参考，但 core 不依赖 examples。
7. Bitcoin / Fractal 先做接口和 descriptor，再逐步做 runtime。
8. EVM ERC-20 是最快 MVP，但架构必须多链。
9. 所有 webhook 必须签名、可重放防护、幂等。
10. 所有 PaymentIntent 必须有明确过期时间、状态机和审计日志。
```

---

## 17. 术语表

**Voucher Asset**：厂商自带的链上提货资产。  
**Entitlement**：商品或服务的完整权益。  
**Asset Binding**：把链上资产绑定到权益和商户收券地址。  
**Merchant Vault**：商户收券地址。  
**PaymentIntent**：一次提货券支付请求。  
**Settlement**：确认收券、销毁或托管的过程。  
**Collect**：用户转券给商户，商户可再次分发。  
**Burn**：兑换后销毁。  
**Escrow**：托管结算。  
**Commerce Adapter**：把收券成功转为订单已付款的平台适配器。  
**Indexer Adapter**：用于读取 Bitcoin / Fractal / EVM 资产状态和交易证明的索引器适配层。

---

## 18. 参考方向

本白皮书的工程方向可参考以下开放标准与生态概念：

- ERC-20：EVM 同质化 token 基础标准。
- ERC-6909：EVM 多 token / multi-token 方向。
- ERC-1155：多 token / 半同质化 token 生态。
- ERC-721：非同质化 token 标准。
- EIP-712：结构化签名。
- ERC-4337：智能账户与账户抽象，后续可用于更顺滑的钱包体验。
- Bitcoin PSBT：Bitcoin 钱包签名交易的核心交互方式。
- Ordinals / Inscriptions：Bitcoin / Fractal 唯一链上对象方向。
- Runes：Bitcoin / Fractal 同质化资产方向。

这些标准和生态是 RedeemLoop 的适配对象，不是 RedeemLoop 的发行责任。
