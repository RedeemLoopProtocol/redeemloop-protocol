export type Locale = "en" | "zh";

export type Localized<T = string> = Record<Locale, T>;

export type UseCaseId = "checkout" | "pos" | "live" | "ops";

export type SiteTheme = "light" | "dark";

export type LanguageOption = {
  code: Locale;
  label: Localized;
  href: string;
};

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

export type SimulationVisualCard = {
  title: Localized;
  body: Localized;
  proof: Localized;
};

export type HumanSignal = {
  label: Localized;
  value: string;
  note: Localized;
};

export const languageOptions: LanguageOption[] = [
  { code: "en", label: { en: "English", zh: "英文" }, href: "/en" },
  { code: "zh", label: { en: "Chinese", zh: "中文" }, href: "/" },
];

export const siteCopy = {
  en: {
    nav: {
      home: "Home",
      mission: "Mission",
      product: "Product",
      useCases: "Use cases",
      integrations: "Integrations",
      developers: "Developers",
      status: "Status",
      github: "GitHub",
      language: "ZH",
      languageAria: "Open Chinese version",
    },
    languageMenu: {
      label: "Language",
      current: "English",
      implementedNote: "Chinese and English are live in this version.",
    },
    theme: {
      label: "Theme",
      light: "Light",
      dark: "Dark",
      lightAria: "Use light theme",
      darkAria: "Use dark theme",
    },
    hero: {
      eyebrow: "Voucher payment infrastructure for merchant-owned assets",
      title: "Accept digital vouchers as payment, then mark the order paid.",
      body:
        "RedeemLoop gives a shop team a narrow payment loop for voucher assets they already own: bind the asset, collect it into a merchant vault, verify receipt, and let the order desk see paid status without a second spreadsheet.",
      primary: "Explore merchant flows",
      secondary: "Read integration guide",
      proofBadge: "Non-issuing protocol",
      proofBody:
        "RedeemLoop does not mint assets, custody keys, price tokens, or replace inventory and fulfillment systems.",
    },
    heroStats: [
      { value: "4", label: "EVM networks in beta" },
      { value: "2", label: "commerce adapter tracks" },
      { value: "1", label: "PaymentIntent ledger" },
    ],
    trustMarkers: [
      "Merchant-owned voucher assets",
      "Merchant vault receipt confirmation",
      "Commerce mark-as-paid callback",
    ],
    mission: {
      kicker: "Mission",
      title: "Make merchant-owned vouchers redeemable in real commerce.",
      body:
        "RedeemLoop is not a token issuer or marketplace. Its mission is to make an existing voucher asset legible to a store, a wallet, a merchant vault, and a commerce backend.",
      belief:
        "The first public beta stays deliberately narrow: prove that one voucher payment can move from checkout to receipt confirmation to mark-as-paid without pretending to replace fulfillment, tax, support, or asset issuance.",
      noClaimTitle: "What stays outside RedeemLoop",
      noClaimBody:
        "Asset issuance, custody, token pricing, secondary markets, logistics, tax, and after-sales systems remain outside the protocol boundary.",
      missionTitle: "What RedeemLoop builds",
      missionBody:
        "Asset Binding, Voucher Tender, PaymentIntent state, merchant vault receipt confirmation, signed webhooks, and commerce mark-as-paid adapters.",
      loopTitle: "The loop we serve",
      loopSteps: [
        "Merchant owns or accepts the voucher asset",
        "SKU or entitlement is bound to that asset",
        "Customer tenders the voucher at checkout, POS, or short link",
        "Merchant vault receipt is confirmed",
        "Commerce order is marked paid",
        "Audit and webhook records keep the payment traceable",
      ],
      wish:
        "The beta release should earn trust by proving one narrow loop with real evidence before broader adapters claim production readiness.",
      attributes: [
        "Merchant-owned assets",
        "Non-custodial receipt checks",
        "Commerce status closure",
        "Evidence-gated beta claims",
      ],
    },
    product: {
      kicker: "Product",
      title: "A payment loop built for voucher commerce",
      body:
        "RedeemLoop sits between the storefront, the wallet, and the commerce backend. A clerk or support lead can follow one PaymentIntent from checkout to paid status instead of stitching together screenshots, wallet hashes, and order notes.",
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
    simulationStudio: {
      kicker: "Simulation studio",
      title: "Less brochure, more shop-floor rehearsal",
      body:
        "The website can show synthetic people, neutral shop mocks, POS counters, receipts, and lift charts. They are clearly marked as simulations until a real merchant grants permission to use real customers, stores, and performance data.",
      disclaimer:
        "Visuals and lift numbers are simulated. They should help a merchant picture the workflow, not imply a real case study.",
      networkTitle: "Network and host topology",
      networkBody:
        "A lightweight animated diagram can show the browser, wallet, merchant host, API, indexer, vault, and commerce webhook passing one PaymentIntent through the loop.",
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
          label: "Mission",
          href: "#mission",
          body: "RedeemLoop keeps asset issuance, custody, pricing, and fulfillment outside the protocol boundary.",
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
      mission: "使命",
      product: "产品",
      useCases: "场景",
      integrations: "集成",
      developers: "开发者",
      status: "状态",
      github: "GitHub",
      language: "EN",
      languageAria: "打开英文版本",
    },
    languageMenu: {
      label: "语言",
      current: "中文",
      planned: "规划中",
      implementedNote: "当前版本提供中文和英文。",
    },
    theme: {
      label: "主题",
      light: "浅色",
      dark: "深色",
      lightAria: "切换为浅色主题",
      darkAria: "切换为深色主题",
    },
    hero: {
      eyebrow: "面向商户自有资产的提货券支付基础设施",
      title: "让数字提货券可以收款，并自动标记订单已支付。",
      body:
        "RedeemLoop 给店铺团队一条克制的提货券收款路径：把已有资产绑到商品，收进商户 vault，确认收券，再让订单台看到已付款，不再靠截图、哈希和人工备注拼对账。",
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
    mission: {
      kicker: "使命愿景",
      title: "让商户自有提货券进入真实电商收款闭环。",
      body:
        "RedeemLoop 不是发币工具，也不是交易市场。它要解决的是：一张已经存在的提货资产，如何被店铺、钱包、商户 vault 和电商后台共同识别。",
      belief:
        "首个公开 beta 必须保持克制：先证明一笔提货券支付可以从 checkout 走到收券确认和订单已支付，而不是假装替代履约、税务、客服或资产发行。",
      noClaimTitle: "RedeemLoop 不做什么",
      noClaimBody:
        "资产发行、托管、token 定价、二级市场、物流、税务和售后系统，都不属于协议核心边界。",
      missionTitle: "RedeemLoop 坚持建设的部分",
      missionBody:
        "Asset Binding、Voucher Tender、PaymentIntent 状态、商户 vault 收券确认、签名 webhook，以及电商 mark-as-paid adapter。",
      loopTitle: "兑环服务的闭环",
      loopSteps: [
        "商户拥有或接受这类提货资产",
        "SKU 或权益绑定到该资产",
        "用户在 checkout、POS 或短链中 tender 提货券",
        "商户 vault 收券被确认",
        "电商订单标记为已支付",
        "审计和 webhook 记录保留支付轨迹",
      ],
      wish:
        "Beta 发布要先用真实 evidence 证明这一条窄闭环，再让更广的 adapter 路径逐步进入 production-ready 声明。",
      attributes: [
        "商户自有资产",
        "非托管收券确认",
        "电商状态闭环",
        "Evidence-gated beta 声明",
      ],
    },
    product: {
      kicker: "产品",
      title: "为提货券电商准备的付款闭环",
      body:
        "RedeemLoop 站在店铺、钱包和电商后台之间。店员或客服负责人可以沿着一条 PaymentIntent 从 checkout 看到订单已付款，不再靠截图、钱包哈希和订单备注拼接状态。",
    },
    productSteps: [
      {
        title: "绑定提货资产",
        body: "把 SKU 或权益映射到商户自有提货资产和收券 vault。",
      },
      {
        title: "打开付款入口",
        body: "使用 checkout 按钮、hosted URL、POS QR 或直播短链。",
      },
      {
        title: "确认商户收券",
        body: "通过 EVM receipt 或 adapter proof，确认资产已经进入商户 vault。",
      },
      {
        title: "关闭订单闭环",
        body: "发送签名 webhook 或电商 adapter 调用，把订单标记为已支付。",
      },
    ],
    useCases: {
      kicker: "应用场景",
      title: "网页、门店、直播都使用同一套兑换闭环",
      body:
        "不同销售渠道共用同一个兑换记录，方便支持、对账和审计追踪。下方同时按 10 个行业放入 100 个品牌仿真案例。",
    },
    integrations: {
      kicker: "集成",
      title: "从 EVM 兑换入口开始，再按 adapter 扩展",
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
        "接入不要求改变资产发行、定价、库存或履约。RedeemLoop 只需要兑换券资产绑定、收券 vault、订单或权益引用和 webhook 目标。",
    },
    onboardingSteps: [
      "选择兑换券资产和支持的链。",
      "登记用于收款的商户 vault。",
      "把 SKU、服务或权益绑定到兑换券要求。",
      "嵌入 checkout、POS 或短链兑换入口。",
      "确认收券后由 RedeemLoop 触发订单履约或已确认状态。",
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
    simulationStudio: {
      kicker: "仿真影棚",
      title: "少一点说明书，多一点真实店铺排练感",
      body:
        "官网可以展示合成真人视角、中性网店 mock、门店 POS、收据、提升图表和节点动线。只要没有真实商户授权，就清楚标注为仿真，不冒充真实用户、真实门店或真实增长。",
      disclaimer:
        "画面和提升数据都是仿真，用来帮助商户想象流程，不代表已经发生的真实案例。",
      networkTitle: "网络、节点和主机拓扑",
      networkBody:
        "可以用轻量动图展示浏览器、钱包、商户主机、API、索引器、vault 和电商 webhook 如何围绕一条 PaymentIntent 传递状态。",
    },
    footer: {
      line: "RedeemLoop 是面向商户 pilot 的开源提货券支付基础设施。",
      domain:
        "建议官网域名使用 redeemloop.aifund.com；pay.aifund.com 保留给完成真实钱包和 HTTPS 检查后的认证兑换入口。",
      explore: "核心入口",
      product: "产品",
      resources: "资源",
      legal: "协议边界",
      primaryLinks: [
        {
          label: "使命",
          href: "#mission",
          body: "RedeemLoop 把资产发行、托管、定价和履约留在协议边界之外。",
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

export const simulationVisualCards: SimulationVisualCard[] = [
  {
    title: { en: "Synthetic user scene", zh: "合成真人视角" },
    body: {
      en: "A shopper sees a voucher on a product page, claims it in a hosted wallet flow, and shows the receipt at pickup.",
      zh: "用户在商品页看到兑换券，进入托管钱包领取，到店自取时展示核销收据。",
    },
    proof: { en: "Generated people, no real identity claims.", zh: "使用合成人像，不冒充真实用户。" },
  },
  {
    title: { en: "Neutral storefront mock", zh: "中性网店 mock" },
    body: {
      en: "A brand-like shop page shows the claim CTA, cart tender, paid receipt, and next-loop voucher.",
      zh: "仿品牌网店展示领取 CTA、购物车兑换、已确认收据和下一轮权益。",
    },
    proof: { en: "No copied brand UI or campaign assets.", zh: "不复制真实品牌 UI 或活动素材。" },
  },
  {
    title: { en: "Store and POS rehearsal", zh: "门店与 POS 排练" },
    body: {
      en: "A cashier scans a POS QR, sees receipt confirmation, and hands the customer a clear pickup instruction.",
      zh: "收银员扫描 POS QR，看到收券确认，再把清楚的兑换说明交给用户。",
    },
    proof: { en: "Shows operational handoff, not only checkout.", zh: "展示门店交接，而不只是线上结账。" },
  },
  {
    title: { en: "Simulated lift chart", zh: "仿真提升图表" },
    body: {
      en: "Charts can model claim rate, redemption rate, repeat voucher uptake, and support workload changes.",
      zh: "图表可模拟领取率、核销率、复投领取和客服工作量变化。",
    },
    proof: { en: "Clearly labeled as modeled numbers.", zh: "明确标注为模型数据。" },
  },
];

export const humanSignals: HumanSignal[] = [
  {
    label: { en: "Claim-to-redeem", zh: "领取到核销" },
    value: "42.8%",
    note: { en: "Simulated for a two-week coffee pickup drop.", zh: "按两周咖啡自取活动模拟。" },
  },
  {
    label: { en: "Support touches", zh: "客服介入" },
    value: "-18.6%",
    note: { en: "Fewer manual checks when receipts are visible.", zh: "收据可见后，人工查验减少。" },
  },
  {
    label: { en: "Next-loop uptake", zh: "复投领取" },
    value: "27.4%",
    note: { en: "Users accepted a follow-up add-on voucher.", zh: "用户继续领取下一张加购券。" },
  },
];

export const useCases: UseCase[] = [
  {
    id: "checkout",
    status: {
      en: "EVM beta",
      zh: "EVM beta",
    },
    title: {
      en: "Product checkout",
      zh: "商品页兑换",
    },
    summary: {
      en: "Add a voucher tender button beside a SKU and let the wallet send the required asset.",
      zh: "在商品 SKU 旁添加兑换券按钮，由钱包提交所需资产。",
    },
    merchant: {
      en: "Publishes the voucher requirement and receiving vault for the product.",
      zh: "发布商品所需的兑换券要求和收券 vault。",
    },
    customer: {
      en: "Connects a wallet, sends the voucher asset, and returns to a paid order.",
      zh: "连接钱包、提交兑换券资产，并返回已确认订单。",
    },
    result: {
      en: "The commerce backend receives a signed mark-as-paid event.",
      zh: "履约后台收到签名确认事件。",
    },
    steps: {
      en: ["Asset binding", "PaymentIntent", "Wallet transfer", "Receipt check", "Order paid"],
      zh: ["资产绑定", "PaymentIntent", "钱包提交", "收券确认", "订单确认"],
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
      zh: "为门店订单创建带 token 范围的兑换链接，并以二维码展示。",
    },
    merchant: {
      en: "Registers a terminal and creates a one-order hosted payment URL.",
      zh: "登记终端，并为单笔订单创建 hosted redeem URL。",
    },
    customer: {
      en: "Scans the QR code and pays from a wallet-enabled phone.",
      zh: "用户扫码后在手机钱包里完成兑换确认。",
    },
    result: {
      en: "The terminal can poll the same PaymentIntent until receipt is confirmed.",
      zh: "终端轮询同一条 PaymentIntent，直到收券确认。",
    },
    steps: {
      en: ["Terminal", "QR URL", "Wallet", "Receipt", "Paid signal"],
      zh: ["终端", "二维码链接", "钱包", "收券", "确认信号"],
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
      zh: "分享绑定单个兑换券 SKU 的 hosted checkout 短链。",
    },
    merchant: {
      en: "Creates an expiring short link with order metadata and a voucher binding.",
      zh: "创建带有效期、订单元数据和兑换券 binding 的短链。",
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
      zh: "用户只看到 hosted redeem page 或嵌入式兑换按钮。",
    },
    result: {
      en: "Support teams get a traceable payment and delivery history.",
      zh: "支持团队获得可追踪的兑换和投递历史。",
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
    next: { en: "Funded wallet certification", zh: "真实钱包流程认证" },
  },
  {
    rail: "WooCommerce",
    status: { en: "Sandbox alpha", zh: "Sandbox alpha" },
    scope: { en: "Gateway settings, SKU mapping, webhook mark-as-paid", zh: "兑换设置、SKU 映射、webhook mark-as-paid" },
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
