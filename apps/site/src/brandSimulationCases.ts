import type { Locale, Localized } from "./content";

export type BrandSimulationStage = "issue" | "claim" | "redeem" | "loop";

export type BrandSimulationIndustryId =
  | "coffee-qsr"
  | "beauty"
  | "sports"
  | "fashion"
  | "electronics"
  | "gaming"
  | "grocery"
  | "travel"
  | "mobility"
  | "home-pet";

export type BrandSimulationBrand = {
  name: string;
  officialSite: string;
  storeEntry: string;
  offer: Localized;
};

export type BrandSimulationIndustry = {
  id: BrandSimulationIndustryId;
  label: Localized;
  summary: Localized;
  vendorFocus: Localized;
  userFocus: Localized;
  stages: Record<Exclude<BrandSimulationStage, "issue">, Localized>;
  brands: BrandSimulationBrand[];
};

const brand = (
  name: string,
  officialSite: string,
  storeEntry: string,
  offerEn: string,
  offerZh: string,
): BrandSimulationBrand => ({
  name,
  officialSite,
  storeEntry,
  offer: { en: offerEn, zh: offerZh },
});

export const brandSimulationCopy: Record<
  Locale,
  {
    kicker: string;
    title: string;
    body: string;
    disclaimer: string;
    industryLabel: string;
    libraryLabel: string;
    totalBrands: string;
    totalIndustries: string;
    loopSteps: string;
    vendorLane: string;
    userLane: string;
    officialSite: string;
    storeEntry: string;
    stages: Record<BrandSimulationStage, string>;
  }
> = {
  en: {
    kicker: "100-brand simulation library",
    title: "Hypothetical voucher journeys across official sites and stores",
    body:
      "Each industry reuses the same RedeemLoop lifecycle: merchant issues a voucher, customer claims it on the brand surface, checkout/POS verifies redemption, then the merchant launches the next loop.",
    disclaimer:
      "Non-affiliated simulations. Links are public references only; use generated placeholders instead of real logos, screenshots, product photography, or campaign assets.",
    industryLabel: "Industry",
    libraryLabel: "Simulation cases",
    totalBrands: "brand simulations",
    totalIndustries: "industry groups",
    loopSteps: "lifecycle stages",
    vendorLane: "Merchant angle",
    userLane: "User angle",
    officialSite: "Official site",
    storeEntry: "Store entry",
    stages: {
      issue: "Issue",
      claim: "Claim",
      redeem: "Redeem",
      loop: "Loop",
    },
  },
  zh: {
    kicker: "100 个品牌仿真案例库",
    title: "把兑换券放进品牌官网和店铺的完整体验",
    body:
      "每个行业复用同一条 RedeemLoop 生命周期：厂商发行兑换券，用户在品牌官网或店铺领取，结账/POS 完成核销，再由厂商把权益循环投放到下一次消费。",
    disclaimer:
      "以下为非合作仿真案例。链接仅作为公开参考；实现时使用中性占位图，不使用真实 logo、截图、商品摄影或品牌活动素材。",
    industryLabel: "行业",
    libraryLabel: "仿真案例",
    totalBrands: "品牌案例",
    totalIndustries: "行业分组",
    loopSteps: "生命周期步骤",
    vendorLane: "厂商视角",
    userLane: "用户视角",
    officialSite: "官网",
    storeEntry: "店铺入口",
    stages: {
      issue: "发行",
      claim: "领取",
      redeem: "使用",
      loop: "循环",
    },
  },
};

export const brandSimulationIndustries: BrandSimulationIndustry[] = [
  {
    id: "coffee-qsr",
    label: { en: "Coffee and QSR", zh: "咖啡与快餐" },
    summary: {
      en: "Prepaid pickup, meal bundles, receipt QR claims, and counter or app redemption.",
      zh: "预付自取、套餐权益、收据二维码领取，以及柜台或 App 核销。",
    },
    vendorFocus: {
      en: "Bind vouchers to drink, meal, or pickup SKUs by store cluster and publish them through loyalty, receipts, app tiles, and in-store QR placements.",
      zh: "按门店组把券绑定到饮品、套餐或自取 SKU，并通过会员页、收据、App 卡片和门店二维码投放。",
    },
    userFocus: {
      en: "Claim the voucher from the brand surface, open the hosted wallet flow, then scan or apply it during mobile order or counter checkout.",
      zh: "用户从品牌入口领取券，进入托管钱包流程，并在移动点单或柜台结账时扫码/抵扣使用。",
    },
    stages: {
      claim: {
        en: "Rewards page, app promo tile, receipt QR, counter tent card, or packaging QR.",
        zh: "会员页、App 活动卡、收据二维码、柜台桌牌或包装二维码。",
      },
      redeem: {
        en: "Mobile order tender, POS QR scan, drive-thru code, or cashier-assisted redemption.",
        zh: "移动点单支付、POS 扫码、得来速核销码或收银员辅助兑换。",
      },
      loop: {
        en: "Return a daypart, add-on, side-item, or repeat-visit voucher after the paid receipt.",
        zh: "核销后回发分时段、加购、小食或复访券。",
      },
    },
    brands: [
      brand("Starbucks", "https://www.starbucks.com/", "https://www.starbucks.com/menu/", "Seasonal drink pickup voucher bound to one beverage SKU.", "绑定单杯饮品 SKU 的季节饮品自取券。"),
      brand("McDonald's", "https://www.mcdonalds.com/", "https://www.mcdonalds.com/us/en-us/full-menu.html", "Meal-combo voucher for a limited-time menu.", "限时菜单套餐兑换券。"),
      brand("Chipotle", "https://www.chipotle.com/", "https://www.chipotle.com/order", "Burrito bowl entitlement with add-on rules.", "含加料规则的卷饼碗权益券。"),
      brand("Domino's", "https://www.dominos.com/", "https://www.dominos.com/en/pages/order/", "Carryout pizza bundle voucher.", "到店自取披萨套餐券。"),
      brand("KFC", "https://www.kfc.com/", "https://www.kfc.com/menu", "Family bucket voucher per store cluster.", "按门店组投放的家庭桶兑换券。"),
      brand("Burger King", "https://www.bk.com/", "https://www.bk.com/menu", "Flame-grilled combo voucher.", "火烤汉堡套餐兑换券。"),
      brand("Subway", "https://www.subway.com/", "https://www.subway.com/en-us/menunutrition/menu", "Footlong voucher with topping constraints.", "带配料限制的 Footlong 兑换券。"),
      brand("Dunkin'", "https://www.dunkindonuts.com/", "https://www.dunkindonuts.com/en/menu", "Coffee run voucher for beverage plus donut.", "咖啡加甜甜圈组合券。"),
      brand("Sweetgreen", "https://www.sweetgreen.com/", "https://order.sweetgreen.com/", "Salad bowl voucher tied to local store inventory.", "绑定本地门店库存的沙拉碗兑换券。"),
      brand("Panera Bread", "https://www.panerabread.com/", "https://www.panerabread.com/en-us/menu.html", "Soup and sandwich pickup voucher.", "汤品加三明治自取券。"),
    ],
  },
  {
    id: "beauty",
    label: { en: "Beauty and personal care", zh: "美妆与个护" },
    summary: {
      en: "Sample-to-full-size conversion, consultation credits, refill loops, and membership drops.",
      zh: "试用转正装、咨询服务额度、补货循环和会员投放。",
    },
    vendorFocus: {
      en: "Create vouchers for samples, services, refill windows, and consultation-driven bundles, then measure conversion to full-size purchases.",
      zh: "围绕试用装、服务、补货周期和咨询后套装发券，并追踪正装转化。",
    },
    userFocus: {
      en: "Claim a trial or service credit from a diagnostic, product page, appointment page, or package QR and redeem it online or at a store counter.",
      zh: "用户从测肤、商品页、预约页或包装二维码领取试用/服务券，并在线上或门店柜台核销。",
    },
    stages: {
      claim: {
        en: "Product detail page, member portal, routine finder, shade finder, appointment page, event QR, or packaging QR.",
        zh: "商品详情页、会员中心、护肤方案、色号工具、预约页、活动二维码或包装二维码。",
      },
      redeem: {
        en: "Ecommerce checkout, boutique counter, salon desk, consultation booking, or refill order.",
        zh: "电商结账、专柜、沙龙前台、咨询预约或补货订单。",
      },
      loop: {
        en: "Send refill, full-size, companion-product, birthday, or routine-completion vouchers after redemption.",
        zh: "核销后投放补货券、正装券、搭配单品券、生日券或方案补全券。",
      },
    },
    brands: [
      brand("Sephora", "https://www.sephora.com/", "https://www.sephora.com/shop/skincare", "Trial-to-full-size voucher for a beauty launch.", "新品试用转正装兑换券。"),
      brand("Ulta Beauty", "https://www.ulta.com/", "https://www.ulta.com/shop", "Salon service credit plus product voucher.", "沙龙服务额度加商品兑换券。"),
      brand("Glossier", "https://www.glossier.com/", "https://www.glossier.com/collections/shop-all", "Routine starter voucher.", "基础护肤流程 starter 券。"),
      brand("Fenty Beauty", "https://fentybeauty.com/", "https://fentybeauty.com/collections/all", "Shade discovery voucher for complexion products.", "底妆色号发现兑换券。"),
      brand("The Ordinary", "https://theordinary.com/", "https://theordinary.com/en-us/category/shop-all", "Regimen education voucher.", "护肤方案教育兑换券。"),
      brand("Lush", "https://www.lush.com/us/en_us", "https://www.lush.com/us/en_us/c/all", "Fresh product voucher with store pickup.", "新鲜个护商品到店自取券。"),
      brand("Clinique", "https://www.clinique.com/", "https://www.clinique.com/products/", "Skincare consultation voucher.", "护肤咨询权益券。"),
      brand("Kiehl's", "https://www.kiehls.com/", "https://www.kiehls.com/skincare/", "Apothecary consultation voucher.", "专柜护肤咨询券。"),
      brand("Aesop", "https://www.aesop.com/us/", "https://www.aesop.com/us/c/skin/", "Routine discovery and boutique consultation voucher.", "护理方案发现与精品店咨询券。"),
      brand("MAC Cosmetics", "https://www.maccosmetics.com/", "https://www.maccosmetics.com/products/", "Makeup service or launch shade voucher.", "彩妆服务或新品色号兑换券。"),
    ],
  },
  {
    id: "sports",
    label: { en: "Sports and outdoor", zh: "运动与户外" },
    summary: {
      en: "Gear drops, activity passes, repair credits, classes, rentals, and member-only access.",
      zh: "装备发售、活动通行、维修额度、课程租赁和会员专属权益。",
    },
    vendorFocus: {
      en: "Bind vouchers to launches, member challenges, service desks, rental inventory, and repair workflows.",
      zh: "把券绑定到新品发售、会员挑战、服务台、租赁库存和维修流程。",
    },
    userFocus: {
      en: "Claim access from a member page, event, challenge, or store QR, then redeem for gear, service, rental, or class participation.",
      zh: "用户从会员页、活动、挑战或门店二维码领取，并兑换装备、服务、租赁或课程。",
    },
    stages: {
      claim: {
        en: "Member app, drop page, run club page, trail event QR, co-op dashboard, or repair-care page.",
        zh: "会员 App、发售页、跑团页、活动二维码、合作社后台或维修养护页。",
      },
      redeem: {
        en: "Reserved-size checkout, store counter, repair desk, rental desk, class booking, or event check-in.",
        zh: "预留尺码结账、门店柜台、维修台、租赁台、课程预约或活动签到。",
      },
      loop: {
        en: "Recycle into accessory, repair, training, class, trip-prep, or seasonal upgrade vouchers.",
        zh: "循环为配件、维修、训练、课程、出行准备或季节升级券。",
      },
    },
    brands: [
      brand("Nike", "https://www.nike.com/", "https://www.nike.com/w/new-3n82y", "Member drop access voucher.", "会员新品发售资格券。"),
      brand("Adidas", "https://www.adidas.com/us", "https://www.adidas.com/us/new_arrivals", "Training collection voucher.", "训练系列商品兑换券。"),
      brand("Lululemon", "https://shop.lululemon.com/", "https://shop.lululemon.com/c/women", "Studio class plus apparel voucher.", "课程加服饰权益券。"),
      brand("Gymshark", "https://www.gymshark.com/", "https://www.gymshark.com/collections/new-releases", "Fitness challenge completion voucher.", "健身挑战完成奖励券。"),
      brand("Patagonia", "https://www.patagonia.com/", "https://www.patagonia.com/shop/", "Repair credit and gear voucher.", "维修额度加装备兑换券。"),
      brand("The North Face", "https://www.thenorthface.com/", "https://www.thenorthface.com/en-us/shop-all", "Expedition kit voucher.", "远行装备包兑换券。"),
      brand("REI", "https://www.rei.com/", "https://www.rei.com/c/all", "Co-op member class or rental voucher.", "合作社会员课程或租赁券。"),
      brand("Under Armour", "https://www.underarmour.com/", "https://www.underarmour.com/en-us/c/new-arrivals/", "Training gear voucher.", "训练装备兑换券。"),
      brand("New Balance", "https://www.newbalance.com/", "https://www.newbalance.com/new-arrivals/", "Run club shoe trial voucher.", "跑团鞋款试穿兑换券。"),
      brand("On", "https://www.on.com/en-us/", "https://www.on.com/en-us/shop", "Runner event shoe voucher.", "跑者活动鞋款兑换券。"),
    ],
  },
  {
    id: "fashion",
    label: { en: "Fashion and luxury", zh: "时尚与奢侈品" },
    summary: {
      en: "Collection drops, boutique appointments, tailoring, aftercare, recycling, and authenticated perks.",
      zh: "系列发售、精品店预约、改衣售后、回收循环和认证权益。",
    },
    vendorFocus: {
      en: "Issue controlled access, service, and aftercare vouchers without implying asset issuance, pricing, authentication, or resale custody.",
      zh: "发行准入、服务和售后权益券，同时避免暗示 RedeemLoop 负责发行、定价、鉴定或转售托管。",
    },
    userFocus: {
      en: "Claim an appointment or service entitlement from the official surface, then redeem it in an official store, boutique, or checkout flow.",
      zh: "用户从官方入口领取预约或服务权益，并在官方店铺、精品店或结账流程中核销。",
    },
    stages: {
      claim: {
        en: "Collection page, member invite, boutique appointment page, receipt QR, care page, or recycling page.",
        zh: "系列页、会员邀请、精品店预约页、收据二维码、护理页或回收页。",
      },
      redeem: {
        en: "Drop checkout, boutique check-in, alteration desk, aftercare service, or official ecommerce checkout.",
        zh: "发售结账、精品店签到、改衣台、售后服务或官方电商结账。",
      },
      loop: {
        en: "Return tailoring, care, accessory, archive access, recycling, or next-collection vouchers.",
        zh: "回发改衣、养护、配件、档案款准入、回收或下一季系列券。",
      },
    },
    brands: [
      brand("Zara", "https://www.zara.com/us/", "https://www.zara.com/us/en/new-in-l1180.html", "New collection access voucher.", "新品系列准入券。"),
      brand("H&M", "https://www2.hm.com/en_us/index.html", "https://www2.hm.com/en_us/women/new-arrivals.html", "Conscious collection voucher.", "可持续系列兑换券。"),
      brand("Uniqlo", "https://www.uniqlo.com/us/en/", "https://www.uniqlo.com/us/en/new-arrivals", "LifeWear seasonal voucher.", "LifeWear 季节商品兑换券。"),
      brand("Gucci", "https://www.gucci.com/us/en/", "https://www.gucci.com/us/en/ca/new-in-c-new-in", "Boutique appointment and access voucher.", "精品店预约与准入券。"),
      brand("Louis Vuitton", "https://us.louisvuitton.com/eng-us/homepage", "https://us.louisvuitton.com/eng-us/new/for-women/_/N-tfr7qdp", "Clienteling appointment voucher.", "私享导购预约券。"),
      brand("Chanel", "https://www.chanel.com/us/", "https://www.chanel.com/us/fashion/", "Boutique service invitation voucher.", "精品店服务邀请券。"),
      brand("Prada", "https://www.prada.com/us/en.html", "https://www.prada.com/us/en/new-in.html", "Seasonal collection access voucher.", "季节系列准入券。"),
      brand("Burberry", "https://us.burberry.com/", "https://us.burberry.com/new-arrivals/", "Outerwear care voucher.", "外套养护权益券。"),
      brand("Ralph Lauren", "https://www.ralphlauren.com/", "https://www.ralphlauren.com/men-new-arrivals", "Member styling voucher.", "会员造型服务券。"),
      brand("Levi's", "https://www.levi.com/US/en_US/", "https://www.levi.com/US/en_US/new-arrivals/c/levi_clothing_new_arrivals_us", "Tailoring or recycling voucher.", "改衣或回收循环券。"),
    ],
  },
  {
    id: "electronics",
    label: { en: "Electronics and consumer tech", zh: "电子与消费科技" },
    summary: {
      en: "Upgrade credits, accessory bundles, support appointments, owner perks, and launch add-ons.",
      zh: "升级额度、配件组合、支持预约、用户权益和新品加购。",
    },
    vendorFocus: {
      en: "Link vouchers to device ownership, serial/receipt checks, accessory bundles, service appointments, and support-assisted checkout.",
      zh: "把券绑定到设备权益、序列号/收据校验、配件套装、服务预约和客服辅助结账。",
    },
    userFocus: {
      en: "Claim from an account, device support page, receipt, product page, or store appointment and redeem at checkout or support.",
      zh: "用户从账户、设备支持页、收据、商品页或门店预约领取，并在结账或客服流程中使用。",
    },
    stages: {
      claim: {
        en: "Owner account, product detail page, support page, service appointment, receipt QR, or launch event page.",
        zh: "用户账户、商品详情页、支持页、服务预约、收据二维码或新品活动页。",
      },
      redeem: {
        en: "Accessory checkout, store pickup, support desk, warranty add-on, care plan, or upgrade order.",
        zh: "配件结账、门店自取、支持台、保修加购、服务计划或升级订单。",
      },
      loop: {
        en: "Return upgrade, accessory, care, renewal, trade-in, or setup-service vouchers.",
        zh: "循环为升级、配件、养护、续费、以旧换新或安装服务券。",
      },
    },
    brands: [
      brand("Apple", "https://www.apple.com/", "https://www.apple.com/store", "Accessory or AppleCare-style voucher.", "配件或 AppleCare 风格服务券。"),
      brand("Samsung", "https://www.samsung.com/us/", "https://www.samsung.com/us/shop/all-deals/", "Device upgrade credit voucher.", "设备升级额度券。"),
      brand("Sony", "https://electronics.sony.com/", "https://electronics.sony.com/all-electronics/c/all-electronics", "Audio or camera accessory voucher.", "音频或相机配件券。"),
      brand("Dell", "https://www.dell.com/en-us", "https://www.dell.com/en-us/shop/deals", "Business device bundle voucher.", "商用设备组合券。"),
      brand("HP", "https://www.hp.com/us-en/home.html", "https://www.hp.com/us-en/shop", "Printer or PC setup voucher.", "打印机或 PC 设置服务券。"),
      brand("Lenovo", "https://www.lenovo.com/us/en/", "https://www.lenovo.com/us/en/d/deals/", "Laptop upgrade voucher.", "笔记本升级券。"),
      brand("Microsoft", "https://www.microsoft.com/en-us/", "https://www.microsoft.com/en-us/store/b/sale", "Surface accessory voucher.", "Surface 配件券。"),
      brand("Bose", "https://www.bose.com/", "https://www.bose.com/c/new-arrivals", "Audio bundle voucher.", "音频组合兑换券。"),
      brand("Logitech", "https://www.logitech.com/en-us", "https://www.logitech.com/en-us/shop", "Workspace accessory voucher.", "办公桌面配件券。"),
      brand("GoPro", "https://gopro.com/en/us/", "https://gopro.com/en/us/shop/cameras", "Action camera accessory voucher.", "运动相机配件券。"),
    ],
  },
  {
    id: "gaming",
    label: { en: "Gaming and entertainment", zh: "游戏与娱乐" },
    summary: {
      en: "Digital content, merch, launch bonuses, tournament access, account-linked claims, and event loops.",
      zh: "数字内容、周边、新品奖励、赛事准入、账号领取和活动循环。",
    },
    vendorFocus: {
      en: "Use vouchers as account-linked entitlements for digital content, merch, events, tournaments, and limited-time drops.",
      zh: "把券作为绑定账号的数字内容、周边、活动、赛事和限时发售权益。",
    },
    userFocus: {
      en: "Claim from an account portal, game page, launcher, event page, or stream overlay, then redeem against store, account, or merch checkout.",
      zh: "用户从账户中心、游戏页、启动器、活动页或直播挂件领取，并在商店、账号或周边结账中使用。",
    },
    stages: {
      claim: {
        en: "Game account page, launcher tile, event page, store page, stream overlay, or tournament registration.",
        zh: "游戏账号页、启动器卡片、活动页、商店页、直播挂件或赛事报名。",
      },
      redeem: {
        en: "Platform checkout, DLC entitlement, merch cart, event check-in, tournament registration, or in-game account link.",
        zh: "平台结账、DLC 权益、周边购物车、活动签到、赛事报名或游戏内账号绑定。",
      },
      loop: {
        en: "Return season, merch, battle-pass, event, referral, or next-launch vouchers.",
        zh: "循环为赛季、周边、通行证、活动、推荐或下一次发售券。",
      },
    },
    brands: [
      brand("Nintendo", "https://www.nintendo.com/us/", "https://www.nintendo.com/us/store/", "Game launch bonus voucher.", "游戏首发奖励券。"),
      brand("PlayStation", "https://www.playstation.com/en-us/", "https://direct.playstation.com/en-us", "Console accessory or game voucher.", "主机配件或游戏兑换券。"),
      brand("Xbox", "https://www.xbox.com/en-US/", "https://www.xbox.com/en-US/games", "Game Pass-style trial voucher.", "Game Pass 风格试用券。"),
      brand("Steam", "https://store.steampowered.com/", "https://store.steampowered.com/search/?filter=popularnew", "Game wallet or DLC voucher.", "游戏钱包或 DLC 兑换券。"),
      brand("Epic Games Store", "https://store.epicgames.com/en-US/", "https://store.epicgames.com/en-US/browse", "Creator campaign game voucher.", "创作者活动游戏券。"),
      brand("Roblox", "https://www.roblox.com/", "https://www.roblox.com/giftcards", "Robux or avatar item voucher.", "Robux 或虚拟形象道具券。"),
      brand("Riot Games", "https://www.riotgames.com/en", "https://merch.riotgames.com/en-us/", "Event merch voucher.", "赛事周边兑换券。"),
      brand("Blizzard", "https://www.blizzard.com/en-us/", "https://gear.blizzard.com/", "DLC or merch voucher.", "DLC 或周边兑换券。"),
      brand("EA", "https://www.ea.com/", "https://www.ea.com/games", "Sports season content voucher.", "体育赛季内容券。"),
      brand("Ubisoft", "https://www.ubisoft.com/en-us/", "https://store.ubisoft.com/us/home", "Game store credit voucher.", "游戏商店额度券。"),
    ],
  },
  {
    id: "grocery",
    label: { en: "Grocery and retail", zh: "商超与零售" },
    summary: {
      en: "Basket credits, pickup passes, private-label bundles, member benefits, category vouchers, and replenishment loops.",
      zh: "购物篮额度、自提通行、私有品牌组合、会员权益、品类券和补货循环。",
    },
    vendorFocus: {
      en: "Publish category, household, pickup, and member vouchers that reconcile through online checkout, POS, or marketplace order flows.",
      zh: "投放品类、家庭、提货和会员券，并通过线上结账、POS 或平台订单流对账。",
    },
    userFocus: {
      en: "Claim from weekly ads, member apps, receipts, aisle QR codes, product pages, or pickup reminders and redeem against baskets.",
      zh: "用户从每周广告、会员 App、收据、货架二维码、商品页或自提提醒领取，并在购物篮中使用。",
    },
    stages: {
      claim: {
        en: "Weekly ad, member dashboard, receipt QR, aisle QR, product page, pickup page, or app deal card.",
        zh: "每周广告、会员中心、收据二维码、货架二维码、商品页、自提页或 App 优惠卡。",
      },
      redeem: {
        en: "Web cart, grocery pickup, self-checkout, cashier scan, marketplace checkout, or member counter.",
        zh: "网页购物车、杂货自提、自助结账、收银扫码、平台结账或会员柜台。",
      },
      loop: {
        en: "Return replenishment, category, private-label, pickup, household, or next-trip vouchers.",
        zh: "循环为补货、品类、私有品牌、自提、家庭组合或下次到店券。",
      },
    },
    brands: [
      brand("Walmart", "https://www.walmart.com/", "https://www.walmart.com/shop/deals", "Grocery basket credit voucher.", "杂货购物篮额度券。"),
      brand("Target", "https://www.target.com/", "https://www.target.com/c/new-arrivals/-/N-5xtub", "Category offer voucher.", "品类优惠兑换券。"),
      brand("Costco", "https://www.costco.com/", "https://www.costco.com/new-lower-prices.html", "Member warehouse bundle voucher.", "会员仓储组合券。"),
      brand("Whole Foods", "https://www.wholefoodsmarket.com/", "https://www.wholefoodsmarket.com/products", "Prepared foods voucher.", "熟食/即食商品券。"),
      brand("Trader Joe's", "https://www.traderjoes.com/", "https://www.traderjoes.com/home/products", "Seasonal grocery discovery voucher.", "季节杂货发现券。"),
      brand("Kroger", "https://www.kroger.com/", "https://www.kroger.com/pl/new-arrivals", "Pickup basket voucher.", "自提购物篮券。"),
      brand("Aldi", "https://www.aldi.us/", "https://www.aldi.us/weekly-specials/our-weekly-ads/", "Weekly specials voucher.", "每周特价兑换券。"),
      brand("Publix", "https://www.publix.com/", "https://www.publix.com/shop-online", "Deli or bakery voucher.", "熟食或烘焙兑换券。"),
      brand("Instacart", "https://www.instacart.com/", "https://www.instacart.com/store", "Marketplace basket credit voucher.", "平台购物篮额度券。"),
      brand("Best Buy", "https://www.bestbuy.com/", "https://www.bestbuy.com/site/electronics/new-arrivals/pcmcat748300666861.c", "Retail category credit voucher.", "零售品类额度券。"),
    ],
  },
  {
    id: "travel",
    label: { en: "Travel and hospitality", zh: "旅行与酒店" },
    summary: {
      en: "Stay credits, upgrades, lounges, ancillary services, experiences, booking add-ons, and check-in loops.",
      zh: "住宿额度、升级权益、休息室、附加服务、体验、预订加购和入住循环。",
    },
    vendorFocus: {
      en: "Attach vouchers to booking references, loyalty tiers, trip segments, add-ons, upgrades, experiences, and post-trip retargeting.",
      zh: "把券关联到预订号、会员等级、行程段、附加服务、升级、体验和行后复投。",
    },
    userFocus: {
      en: "Claim during booking, pre-trip email, app check-in, loyalty dashboard, or itinerary page and redeem during booking or arrival.",
      zh: "用户在预订、出行前邮件、App 入住、会员中心或行程页领取，并在预订或到店时核销。",
    },
    stages: {
      claim: {
        en: "Booking page, loyalty dashboard, itinerary page, pre-trip email, app check-in, or experience marketplace.",
        zh: "预订页、会员中心、行程页、出行前邮件、App 入住或体验市场。",
      },
      redeem: {
        en: "Booking checkout, front desk, kiosk, mobile key, lounge desk, ancillary checkout, or experience booking.",
        zh: "预订结账、前台、自助机、手机房卡、休息室、附加服务结账或体验预约。",
      },
      loop: {
        en: "Return upgrade, ancillary, destination, return-trip, loyalty, or referral vouchers after fulfillment.",
        zh: "履约后回发升级、附加服务、目的地、返程、会员或推荐券。",
      },
    },
    brands: [
      brand("Airbnb", "https://www.airbnb.com/", "https://www.airbnb.com/s/experiences", "Experience credit voucher.", "体验活动额度券。"),
      brand("Marriott", "https://www.marriott.com/", "https://www.marriott.com/search/default.mi", "Room upgrade voucher.", "房型升级券。"),
      brand("Hilton", "https://www.hilton.com/en/", "https://www.hilton.com/en/book/", "Stay credit voucher.", "住宿额度券。"),
      brand("Hyatt", "https://www.hyatt.com/", "https://www.hyatt.com/explore-hotels", "Suite or dining voucher.", "套房或餐饮权益券。"),
      brand("Delta", "https://www.delta.com/", "https://www.delta.com/flight-search/book-a-flight", "Ancillary travel voucher.", "行李/选座等附加服务券。"),
      brand("United", "https://www.united.com/", "https://www.united.com/en/us/fsr/choose-flights", "Seat or lounge voucher.", "座位或休息室权益券。"),
      brand("American Airlines", "https://www.aa.com/", "https://www.aa.com/booking/find-flights", "Trip add-on voucher.", "行程加购券。"),
      brand("Southwest", "https://www.southwest.com/", "https://www.southwest.com/air/booking/", "Travel credit voucher.", "旅行额度券。"),
      brand("Expedia", "https://www.expedia.com/", "https://www.expedia.com/Hotel-Search", "Package booking voucher.", "机酒套餐预订券。"),
      brand("Booking.com", "https://www.booking.com/", "https://www.booking.com/searchresults.html", "Hotel booking reward voucher.", "酒店预订奖励券。"),
    ],
  },
  {
    id: "mobility",
    label: { en: "Auto, bike and mobility", zh: "汽车、自行车与出行" },
    summary: {
      en: "Owner benefits, service credits, accessories, maintenance, charging or ride passes, and dealer/store redemption.",
      zh: "车主权益、服务额度、配件、保养、充电/骑行通行和经销/门店核销。",
    },
    vendorFocus: {
      en: "Bind vouchers to owner accounts, service centers, dealer workflows, accessories, maintenance intervals, and post-purchase loops.",
      zh: "把券绑定到车主账户、服务中心、经销流程、配件、保养周期和购后循环。",
    },
    userFocus: {
      en: "Claim from an owner app, product page, dealer email, service reminder, QR at the shop, or launch page and redeem during service or checkout.",
      zh: "用户从车主 App、商品页、经销邮件、保养提醒、门店二维码或发布页领取，并在服务或结账中核销。",
    },
    stages: {
      claim: {
        en: "Owner app, dealer page, product page, service reminder, launch event, repair desk, or shop QR.",
        zh: "车主 App、经销页、商品页、保养提醒、发布活动、维修台或门店二维码。",
      },
      redeem: {
        en: "Accessory checkout, dealer counter, service center, tune-up desk, charging session, or pickup appointment.",
        zh: "配件结账、经销柜台、服务中心、调校台、充电会话或取车预约。",
      },
      loop: {
        en: "Return maintenance, accessory, battery-care, charging, next-service, or rider community vouchers.",
        zh: "循环为保养、配件、电池养护、充电、下次服务或骑行社群券。",
      },
    },
    brands: [
      brand("Tesla", "https://www.tesla.com/", "https://shop.tesla.com/", "Accessory or charging voucher.", "配件或充电权益券。"),
      brand("Rivian", "https://rivian.com/", "https://rivian.com/gear-shop", "Adventure gear voucher.", "户外装备兑换券。"),
      brand("Harley-Davidson", "https://www.harley-davidson.com/us/en/index.html", "https://www.harley-davidson.com/us/en/shop/c/motorcycle-parts", "Parts or service voucher.", "零件或服务兑换券。"),
      brand("Trek", "https://www.trekbikes.com/us/en_US/", "https://www.trekbikes.com/us/en_US/equipment/c/EQ/", "Bike tune-up voucher.", "自行车调校服务券。"),
      brand("Specialized", "https://www.specialized.com/us/en", "https://www.specialized.com/us/en/shop", "Rider service voucher.", "骑行服务券。"),
      brand("Giant", "https://www.giant-bicycles.com/us", "https://www.giant-bicycles.com/us/bikes", "Bike accessory voucher.", "自行车配件券。"),
      brand("Cannondale", "https://www.cannondale.com/en-us", "https://www.cannondale.com/en-us/bikes", "Owner tune voucher.", "车主调校权益券。"),
      brand("Polestar", "https://www.polestar.com/us/", "https://www.polestar.com/us/shop/", "EV accessory voucher.", "电动车配件券。"),
      brand("Lucid", "https://lucidmotors.com/", "https://store.lucidmotors.com/", "Luxury EV service voucher.", "高端电动车服务券。"),
      brand("Rad Power Bikes", "https://www.radpowerbikes.com/", "https://www.radpowerbikes.com/collections/electric-bikes", "E-bike accessory voucher.", "电助力自行车配件券。"),
    ],
  },
  {
    id: "home-pet",
    label: { en: "Home, furniture and pet", zh: "家居、家具与宠物" },
    summary: {
      en: "Room bundles, design services, delivery or assembly, DIY project credits, grooming, wellness, and replenishment.",
      zh: "整屋组合、设计服务、配送安装、DIY 项目额度、美容、健康和补货。",
    },
    vendorFocus: {
      en: "Issue project, room, service, replenishment, and pet-care vouchers tied to carts, appointments, delivery, and recurring purchase loops.",
      zh: "围绕项目、房间、服务、补货和宠物护理发券，并绑定购物车、预约、配送和复购循环。",
    },
    userFocus: {
      en: "Claim from room planners, registry pages, recipe pages, project guides, autoship profiles, or store QR codes and redeem in cart or service flow.",
      zh: "用户从房间规划、礼品清单、食谱、项目指南、自动补货档案或门店二维码领取，并在购物车或服务流程中使用。",
    },
    stages: {
      claim: {
        en: "Planner, registry, recipe, project guide, new-arrivals page, autoship profile, service page, or store QR.",
        zh: "规划工具、礼品清单、食谱、项目指南、新品页、自动补货档案、服务页或门店二维码。",
      },
      redeem: {
        en: "Ecommerce cart, design appointment, delivery or assembly service, install service, grooming booking, or autoship order.",
        zh: "电商购物车、设计预约、配送/安装服务、施工服务、美容预约或自动补货订单。",
      },
      loop: {
        en: "Return decor, delivery, assembly, maintenance, replenishment, wellness, or next-project vouchers.",
        zh: "循环为装饰、配送、安装、维护、补货、健康或下一个项目券。",
      },
    },
    brands: [
      brand("IKEA", "https://www.ikea.com/us/en/", "https://www.ikea.com/us/en/cat/products-products/", "Room bundle voucher.", "房间组合兑换券。"),
      brand("Wayfair", "https://www.wayfair.com/", "https://www.wayfair.com/daily-sales/", "Home project voucher.", "家居项目兑换券。"),
      brand("Williams Sonoma", "https://www.williams-sonoma.com/", "https://www.williams-sonoma.com/shop/new/", "Kitchen class or product voucher.", "厨房课程或商品券。"),
      brand("Pottery Barn", "https://www.potterybarn.com/", "https://www.potterybarn.com/shop/new/", "Room refresh voucher.", "房间焕新兑换券。"),
      brand("Crate & Barrel", "https://www.crateandbarrel.com/", "https://www.crateandbarrel.com/new/", "Registry or room bundle voucher.", "礼品清单或房间组合券。"),
      brand("West Elm", "https://www.westelm.com/", "https://www.westelm.com/shop/new/", "Design consultation voucher.", "设计咨询券。"),
      brand("The Home Depot", "https://www.homedepot.com/", "https://www.homedepot.com/c/New_Lower_Prices", "DIY project voucher.", "DIY 项目兑换券。"),
      brand("Lowe's", "https://www.lowes.com/", "https://www.lowes.com/pl/New-arrivals/4294618630", "Home improvement bundle voucher.", "家装组合兑换券。"),
      brand("Chewy", "https://www.chewy.com/", "https://www.chewy.com/b/new-pet-11561", "Pet replenishment voucher.", "宠物补货券。"),
      brand("Petco", "https://www.petco.com/", "https://www.petco.com/shop/en/petcostore", "Grooming or product voucher.", "宠物美容或商品券。"),
    ],
  },
];
