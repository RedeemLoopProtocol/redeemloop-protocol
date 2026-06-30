export type Locale = "en" | "zh";

export type Localized<T = string> = Record<Locale, T>;

export type UseCaseId = "checkout" | "pos" | "live" | "ops";

export type UseCase = {
  id: UseCaseId;
  status: Localized;
  title: Localized;
  summary: Localized;
  merchant: Localized;
  customer: Localized;
  result: Localized;
  steps: Localized<string[]>;
  metrics: Array<{
    label: Localized;
    value: string;
  }>;
};

export type IntegrationRail = {
  rail: string;
  status: Localized;
  scope: Localized;
  next: Localized;
};

export const siteCopy = {
  en: {
    nav: {
      home: "Home",
      product: "Product",
      useCases: "Use cases",
      integrations: "Integrations",
      developers: "Developers",
      status: "Status",
      github: "GitHub",
      language: "ZH",
      languageAria: "Open Chinese version",
    },
    hero: {
      eyebrow: "Voucher payment infrastructure for merchant-owned assets",
      title: "Accept digital vouchers as payment, then mark the order paid.",
      body:
        "RedeemLoop gives merchants a narrow payment loop for existing FT, NFT, Rune, and inscription voucher assets: bind the asset, collect it into a merchant vault, verify receipt, and notify commerce.",
      primary: "Explore merchant flows",
      secondary: "Read integration guide",
      proofBadge: "Non-issuing protocol",
      proofBody:
        "RedeemLoop does not mint assets, custody keys, price tokens, or replace inventory and fulfillment systems.",
    },
    heroStats: [
      { value: "4", label: "EVM networks in beta" },
      { value: "2", label: "commerce adapters" },
      { value: "1", label: "PaymentIntent ledger" },
    ],
    trustMarkers: [
      "Merchant-owned voucher assets",
      "Merchant vault receipt confirmation",
      "Commerce mark-as-paid callback",
    ],
    product: {
      kicker: "Product",
      title: "A payment loop built for voucher commerce",
      body:
        "The homepage should explain the buying flow first. RedeemLoop sits between a store, a wallet, and a commerce backend, then records one PaymentIntent from checkout to paid status.",
    },
    productSteps: [
      {
        title: "Bind the voucher asset",
        body: "Map a SKU or entitlement to the merchant-owned voucher asset and receiving vault.",
      },
      {
        title: "Open a payment entry",
        body: "Use a checkout button, hosted URL, POS QR code, or livestream short link.",
      },
      {
        title: "Confirm merchant receipt",
        body: "Verify the transfer through an EVM receipt or adapter-backed proof path.",
      },
      {
        title: "Close the order loop",
        body: "Send a signed webhook or commerce adapter call that marks the order paid.",
      },
    ],
    useCases: {
      kicker: "Use cases",
      title: "One payment model for web, store, and livestream commerce",
      body:
        "Each channel uses the same PaymentIntent record, so support, reconciliation, and audit trails stay consistent. The section also includes 100 hypothetical brand simulations across 10 industries.",
    },
    integrations: {
      kicker: "Integrations",
      title: "Start with EVM checkout, then expand by adapter",
      body:
        "RedeemLoop keeps the public status clear: implemented integration support is separated from live certification evidence.",
      columns: {
        rail: "Rail",
        status: "Status",
        scope: "Scope",
        next: "Next proof",
      },
    },
    onboarding: {
      kicker: "Merchant path",
      title: "What a pilot merchant needs to connect",
      body:
        "A pilot can begin without changing asset issuance, pricing, inventory, or fulfillment. RedeemLoop only needs the asset binding, receiving vault, commerce order reference, and webhook target.",
    },
    onboardingSteps: [
      "Choose the voucher asset and supported chain.",
      "Register the merchant vault that receives payment.",
      "Bind SKUs or entitlements to the voucher requirement.",
      "Embed a checkout, POS, or short-link entry point.",
      "Verify receipt and let RedeemLoop mark the order paid.",
    ],
    developer: {
      kicker: "Developers",
      title: "Integrate against the same local sandbox used by the public demo",
      body:
        "The developer path is still one command-line workspace, but it now sits below the product story instead of defining the homepage.",
      codeLabel: "Local commands",
      docs: "Open docs",
      api: "API reference",
    },
    status: {
      kicker: "Pilot readiness",
      title: "Production claims stay conservative",
      body:
        "The official site can be polished without overstating support. Live wallet, store, and indexer certification remains the gate for production-ready language.",
    },
    footer: {
      line: "RedeemLoop is open-source voucher payment infrastructure for merchant pilots.",
      domain:
        "Recommended public domain: redeemloop.aifund.com. Keep pay.aifund.com for certified payment entry after live wallet and HTTPS checks.",
      explore: "Core paths",
      product: "Product",
      resources: "Resources",
      legal: "Protocol boundary",
      primaryLinks: [
        {
          label: "Product",
          href: "#product",
          body: "Asset binding, PaymentIntent, receipt confirmation, and mark-as-paid in one loop.",
        },
        {
          label: "Use cases",
          href: "#use-cases",
          body: "Checkout, POS QR, livestream links, merchant operations, and 100 brand simulations share one loop.",
        },
        {
          label: "Integrations",
          href: "#integrations",
          body: "EVM beta plus WooCommerce, Shopify, Rune, and inscription adapter tracks.",
        },
      ],
    },
  },
  zh: {
    nav: {
      home: "首页",
      product: "产品",
      useCases: "场景",
      integrations: "集成",
      developers: "开发者",
      status: "状态",
      github: "GitHub",
      language: "EN",
      languageAria: "打开英文版本",
    },
    hero: {
      eyebrow: "面向商户自有资产的提货券支付基础设施",
      title: "让数字提货券可以收款，并自动标记订单已支付。",
      body:
        "RedeemLoop 为商户已有的 FT、NFT、Rune 和铭文提货资产提供克制的支付闭环：绑定资产、收进商户 vault、确认收券，再通知电商系统完成付款状态。",
      primary: "查看商户场景",
      secondary: "阅读集成指南",
      proofBadge: "非发行型协议",
      proofBody:
        "RedeemLoop 不发行资产、不托管私钥、不做 token 定价，也不替代库存、履约和售后系统。",
    },
    heroStats: [
      { value: "4", label: "EVM 网络 beta" },
      { value: "2", label: "电商适配方向" },
      { value: "1", label: "统一 PaymentIntent" },
    ],
    trustMarkers: [
      "商户自有提货资产",
      "商户 vault 收券确认",
      "电商 mark-as-paid 回调",
    ],
    product: {
      kicker: "产品",
      title: "为提货券电商设计的支付闭环",
      body:
        "正式官网需要先讲清购买流程。RedeemLoop 位于店铺、钱包和电商后台之间，用同一条 PaymentIntent 记录串起 checkout、收券确认和订单已付款。",
    },
    productSteps: [
      {
        title: "绑定提货资产",
        body: "把 SKU 或权益映射到商户自有的提货资产和收券 vault。",
      },
      {
        title: "打开支付入口",
        body: "使用商品页按钮、hosted URL、POS QR 或直播短链进入支付。",
      },
      {
        title: "确认商户收券",
        body: "通过 EVM receipt 或 adapter proof 路径确认资产已进入商户 vault。",
      },
      {
        title: "关闭订单闭环",
        body: "发送签名 webhook 或电商适配调用，把订单标记为已付款。",
      },
    ],
    useCases: {
      kicker: "应用场景",
      title: "网页、门店、直播都使用同一套付款模型",
      body:
        "不同销售渠道共用同一个 PaymentIntent 记录，方便支持、对账和审计追踪。下方同时按 10 个行业放入 100 个品牌仿真案例。",
    },
    integrations: {
      kicker: "集成",
      title: "从 EVM checkout 开始，再按 adapter 扩展",
      body:
        "官网可以更正式，但公开状态必须清楚区分已经实现的集成能力和仍需真实认证的生产证据。",
      columns: {
        rail: "路径",
        status: "状态",
        scope: "范围",
        next: "下一步证明",
      },
    },
    onboarding: {
      kicker: "商户接入路径",
      title: "一个 pilot 商户需要准备什么",
      body:
        "接入不要求改变资产发行、定价、库存或履约。RedeemLoop 只需要资产绑定、收券 vault、电商订单引用和 webhook 目标。",
    },
    onboardingSteps: [
      "选择提货资产和支持的链。",
      "登记用于收款的商户 vault。",
      "把 SKU 或权益绑定到提货券要求。",
      "嵌入 checkout、POS 或短链支付入口。",
      "确认收券后由 RedeemLoop 标记订单已付款。",
    ],
    developer: {
      kicker: "开发者",
      title: "从公开 demo 使用的同一套本地 sandbox 开始",
      body:
        "开发者入口仍然保留命令行 workspace，但它应该位于产品叙事之后，而不是定义首页主视觉。",
      codeLabel: "本地命令",
      docs: "打开文档",
      api: "API 参考",
    },
    status: {
      kicker: "Pilot 状态",
      title: "生产级表述保持克制",
      body:
        "官网可以正式，但不能夸大支持范围。真实钱包、真实店铺和真实索引器认证仍然是 production-ready 表述的前置条件。",
    },
    footer: {
      line: "RedeemLoop 是面向商户 pilot 的开源提货券支付基础设施。",
      domain:
        "建议官网域名使用 redeemloop.aifund.com；pay.aifund.com 保留给完成真实钱包和 HTTPS 检查后的认证支付入口。",
      explore: "核心入口",
      product: "产品",
      resources: "资源",
      legal: "协议边界",
      primaryLinks: [
        {
          label: "产品",
          href: "#product",
          body: "资产绑定、PaymentIntent、收券确认和订单已付款组成同一条闭环。",
        },
        {
          label: "场景",
          href: "#use-cases",
          body: "商品页、POS QR、直播短链、商户运营和 100 个品牌仿真共用同一条闭环。",
        },
        {
          label: "集成",
          href: "#integrations",
          body: "EVM beta 起步，并标注 WooCommerce、Shopify、Rune 和铭文 adapter 状态。",
        },
      ],
    },
  },
} as const;

export const useCases: UseCase[] = [
  {
    id: "checkout",
    status: {
      en: "EVM beta",
      zh: "EVM beta",
    },
    title: {
      en: "Product checkout",
      zh: "商品页 checkout",
    },
    summary: {
      en: "Add a voucher tender button beside a SKU and let the wallet send the required asset.",
      zh: "在商品 SKU 旁添加提货券支付按钮，由钱包转入所需资产。",
    },
    merchant: {
      en: "Publishes the voucher requirement and receiving vault for the product.",
      zh: "发布商品所需的提货券要求和收券 vault。",
    },
    customer: {
      en: "Connects a wallet, sends the voucher asset, and returns to a paid order.",
      zh: "连接钱包、转入提货券资产，并返回已付款订单。",
    },
    result: {
      en: "The commerce backend receives a signed mark-as-paid event.",
      zh: "电商后台收到签名的 mark-as-paid 事件。",
    },
    steps: {
      en: ["Asset binding", "PaymentIntent", "Wallet transfer", "Receipt check", "Order paid"],
      zh: ["资产绑定", "PaymentIntent", "钱包转券", "收券确认", "订单已支付"],
    },
    metrics: [
      {
        label: { en: "Supported chains", zh: "已支持链" },
        value: "ETH / BSC / POL / ARB",
      },
      {
        label: { en: "Commerce", zh: "电商适配" },
        value: "Woo / Shopify",
      },
    ],
  },
  {
    id: "pos",
    status: {
      en: "Pilot API",
      zh: "Pilot API",
    },
    title: {
      en: "POS QR checkout",
      zh: "POS QR 收银",
    },
    summary: {
      en: "Create a token-scoped payment URL for an in-store order and show it as a QR code.",
      zh: "为门店订单创建带 token 的付款链接，并以二维码展示。",
    },
    merchant: {
      en: "Registers a terminal and creates a one-order hosted payment URL.",
      zh: "登记终端，并为单笔订单创建 hosted payment URL。",
    },
    customer: {
      en: "Scans the QR code and pays from a wallet-enabled phone.",
      zh: "用户扫码后在手机钱包里完成支付。",
    },
    result: {
      en: "The terminal can poll the same PaymentIntent until receipt is confirmed.",
      zh: "终端轮询同一条 PaymentIntent，直到收券确认。",
    },
    steps: {
      en: ["Terminal", "QR URL", "Wallet", "Receipt", "Paid signal"],
      zh: ["终端", "二维码链接", "钱包", "收券", "付款信号"],
    },
    metrics: [
      {
        label: { en: "Customer link", zh: "用户链接" },
        value: "/pay/:intentId",
      },
      {
        label: { en: "Replay guard", zh: "防重放" },
        value: "terminal nonce",
      },
    ],
  },
  {
    id: "live",
    status: {
      en: "Pilot API",
      zh: "Pilot API",
    },
    title: {
      en: "Livestream short link",
      zh: "直播带货短链",
    },
    summary: {
      en: "Share a short hosted checkout link tied to one voucher-backed SKU.",
      zh: "分享绑定单个提货券 SKU 的 hosted checkout 短链。",
    },
    merchant: {
      en: "Creates an expiring short link with order metadata and a voucher binding.",
      zh: "创建带有效期、订单元数据和提货券 binding 的短链。",
    },
    customer: {
      en: "Opens the link without receiving merchant credentials or admin access.",
      zh: "用户打开短链，但不会接触商户凭证或后台权限。",
    },
    result: {
      en: "The same receipt and commerce callback loop completes the sale.",
      zh: "同一套收券和电商回调闭环完成交易。",
    },
    steps: {
      en: ["Short link", "Hosted checkout", "Wallet", "Receipt", "Commerce callback"],
      zh: ["短链", "Hosted checkout", "钱包", "收券", "电商回调"],
    },
    metrics: [
      {
        label: { en: "Customer link", zh: "用户链接" },
        value: "/s/:slug",
      },
      {
        label: { en: "Credential model", zh: "凭证模型" },
        value: "token-scoped",
      },
    ],
  },
  {
    id: "ops",
    status: {
      en: "Local pilot",
      zh: "本地 pilot",
    },
    title: {
      en: "Merchant operations",
      zh: "商户运营",
    },
    summary: {
      en: "Inspect vaults, bindings, PaymentIntents, webhook deliveries, and audit events.",
      zh: "查看 vault、binding、PaymentIntent、webhook delivery 和 audit event。",
    },
    merchant: {
      en: "Uses the admin console to seed a pilot setup and replay failed delivery.",
      zh: "通过后台创建 pilot 配置，并重放失败的投递。",
    },
    customer: {
      en: "Only sees the hosted payment page or embedded tender button.",
      zh: "用户只看到 hosted payment page 或嵌入式支付按钮。",
    },
    result: {
      en: "Support teams get a traceable payment and delivery history.",
      zh: "支持团队获得可追踪的付款和投递历史。",
    },
    steps: {
      en: ["Vault", "Binding", "Intent", "Webhook", "Audit"],
      zh: ["Vault", "Binding", "Intent", "Webhook", "Audit"],
    },
    metrics: [
      {
        label: { en: "Admin route", zh: "后台路由" },
        value: "/merchant-admin",
      },
      {
        label: { en: "Worker hook", zh: "Worker 入口" },
        value: "drain-pending",
      },
    ],
  },
];

export const scenarios = useCases;

export const readinessRows: IntegrationRail[] = [
  {
    rail: "EVM ERC-20",
    status: { en: "Pilot beta", zh: "Pilot beta" },
    scope: { en: "Ethereum, BNB Smart Chain, Polygon PoS, Arbitrum One", zh: "Ethereum、BNB Smart Chain、Polygon PoS、Arbitrum One" },
    next: { en: "Funded wallet certification", zh: "真实钱包付费认证" },
  },
  {
    rail: "WooCommerce",
    status: { en: "Sandbox alpha", zh: "Sandbox alpha" },
    scope: { en: "Gateway settings, SKU mapping, webhook mark-as-paid", zh: "支付设置、SKU 映射、webhook mark-as-paid" },
    next: { en: "Real WordPress runtime certification", zh: "真实 WordPress 运行认证" },
  },
  {
    rail: "Shopify",
    status: { en: "Private-app alpha", zh: "Private-app alpha" },
    scope: { en: "Admin API diagnostics and mocked mark-as-paid tests", zh: "Admin API 诊断和 mocked mark-as-paid 测试" },
    next: { en: "Live store and token certification", zh: "真实店铺和 token 认证" },
  },
  {
    rail: "Bitcoin Rune",
    status: { en: "Adapter beta", zh: "Adapter beta" },
    scope: { en: "UniSat, Xverse, Xverse indexer adapter, API recheck", zh: "UniSat、Xverse、Xverse indexer adapter、API recheck" },
    next: { en: "Funded UniSat or Xverse flow", zh: "有资金的 UniSat 或 Xverse 流程" },
  },
  {
    rail: "Fractal / Inscription / NFT",
    status: { en: "Adapter alpha", zh: "Adapter alpha" },
    scope: { en: "Stable adapter shapes, not live certified", zh: "稳定 adapter 形态，未做真实认证" },
    next: { en: "Indexer and wallet partner tests", zh: "索引器和钱包伙伴测试" },
  },
];

export const quickStartCommands = ["pnpm install", "pnpm verify", "pnpm api:dev", "pnpm pos:dev", "pnpm site:dev"];

export const repoLinks = {
  github: "https://github.com/RedeemLoopProtocol/redeemloop-protocol",
  docs: "https://github.com/RedeemLoopProtocol/redeemloop-protocol/tree/main/docs",
  api: "https://github.com/RedeemLoopProtocol/redeemloop-protocol/blob/main/docs/API_REFERENCE.md",
  boundary: "https://github.com/RedeemLoopProtocol/redeemloop-protocol/blob/main/docs/BOUNDARY.md",
  integration: "https://github.com/RedeemLoopProtocol/redeemloop-protocol/blob/main/docs/INTEGRATION_GUIDE.md",
  releases: "https://github.com/RedeemLoopProtocol/redeemloop-protocol/releases",
  sandbox: "https://github.com/RedeemLoopProtocol/redeemloop-protocol/blob/main/docs/PUBLIC_SANDBOX.md",
};
