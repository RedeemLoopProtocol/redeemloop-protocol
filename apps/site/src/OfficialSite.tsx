"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Browsers,
  ChartLineUp,
  CheckCircle,
  Code,
  Fingerprint,
  FlowArrow,
  GithubLogo,
  GlobeHemisphereEast,
  LinkSimple,
  Monitor,
  Moon,
  Network,
  QrCode,
  SealCheck,
  ShieldCheck,
  ShoppingCart,
  Storefront,
  Sun,
  Ticket,
  Translate,
  Users,
  Vault,
  Wallet,
  WebhooksLogo,
  X,
} from "@phosphor-icons/react";

import {
  brandSimulationCopy,
  brandSimulationIndustries,
  type BrandSimulationBrand,
  type BrandSimulationIndustryId,
  type BrandSimulationStage,
} from "./brandSimulationCases";
import {
  humanSignals,
  languageOptions,
  quickStartCommands,
  readinessRows,
  repoLinks,
  simulationVisualCards,
  siteCopy,
  useCases,
  type Locale,
  type SiteTheme,
  type UseCaseId,
} from "./content";

const assetPath = (path: string) => {
  const basePath = process.env.NEXT_PUBLIC_REDEEMLOOP_SITE_BASE_PATH ?? "";
  return `${basePath}/${path}`.replace(/\/{2,}/g, "/");
};

const viAssets = {
  logoMark: assetPath("vi/redeemloop-logo-mark.svg"),
  wordmark: assetPath("vi/redeemloop-wordmark.svg"),
};

const useCaseIcons = {
  checkout: ShoppingCart,
  pos: QrCode,
  live: LinkSimple,
  ops: Monitor,
} satisfies Record<UseCaseId, typeof ShoppingCart>;

const productIcons = [Ticket, Storefront, Fingerprint, WebhooksLogo] as const;
const onboardingIcons = [Ticket, Vault, FlowArrow, Browsers, SealCheck] as const;
const visualIcons = [Users, Storefront, QrCode, ChartLineUp] as const;
const missionIcons = [ShieldCheck, FlowArrow] as const;
const simulationStageOrder: BrandSimulationStage[] = ["issue", "claim", "redeem", "loop"];
const simulationStageIcons = {
  issue: Ticket,
  claim: Wallet,
  redeem: Storefront,
  loop: FlowArrow,
} satisfies Record<BrandSimulationStage, typeof Ticket>;

type SimulationPreviewTarget = {
  brand: BrandSimulationBrand;
  entryLabel: string;
  industryLabel: string;
  offer: string;
  url: string;
};

const preserveScrollAfter = (action: () => void) => {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  action();
  window.requestAnimationFrame(() => {
    window.scrollTo({ left: scrollX, top: scrollY, behavior: "auto" });
  });
};

const formatReferenceHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || url;
  }
};

export function OfficialSite({ locale }: { locale: Locale }) {
  const copy = siteCopy[locale];
  const [activeUseCaseId, setActiveUseCaseId] = useState<UseCaseId>("checkout");
  const [theme, setTheme] = useState<SiteTheme>("light");
  const activeUseCase = useCases.find((useCase) => useCase.id === activeUseCaseId) ?? useCases[0];
  const skipLabel = locale === "en" ? "Skip to content" : "跳到正文";

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("redeemloop-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    }
  }, []);

  const selectTheme = (nextTheme: SiteTheme) => {
    setTheme(nextTheme);
    window.localStorage.setItem("redeemloop-theme", nextTheme);
  };

  return (
    <main className={`min-h-screen bg-paper text-ink theme-${theme}`} lang={locale === "en" ? "en" : "zh-CN"} data-theme={theme}>
      <a className="skip-link" href="#main-content">
        {skipLabel}
      </a>
      <SiteHeader locale={locale} theme={theme} onThemeChange={selectTheme} />

      <section id="top" className="relative isolate overflow-hidden border-b border-line/80 bg-[linear-gradient(180deg,#ffffff_0%,#f3f6f9_100%)]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_20%,rgba(10,123,110,0.16),transparent_26rem)]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-20 lg:pt-16">
          <div className="flex min-w-0 flex-col justify-center">
            <BrandSignature locale={locale} className="mb-8" size="hero" inverted={theme === "dark"} />
            <p className="section-kicker">{copy.hero.eyebrow}</p>
            <h1 className="mt-4 max-w-4xl text-balance text-5xl font-extrabold leading-[1.02] tracking-normal text-ink sm:text-6xl lg:text-7xl">
              {copy.hero.title}
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted">{copy.hero.body}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a className="btn-primary" href="#use-cases">
                <Storefront size={19} weight="bold" />
                {copy.hero.primary}
              </a>
              <a className="btn-secondary" href={repoLinks.integration}>
                {copy.hero.secondary}
                <ArrowRight size={18} weight="bold" />
              </a>
            </div>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {copy.heroStats.map((stat) => (
                <div key={stat.label} className="metric-block">
                  <span className="font-mono text-3xl font-bold tabular-nums text-ink">{stat.value}</span>
                  <span className="mt-2 text-sm leading-5 text-muted">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <HeroCommercePanel locale={locale} />
        </div>
      </section>

      <div id="main-content">
        <MissionSection locale={locale} />

        <section className="border-b border-line/80 bg-white" id="product">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-20">
            <div>
              <p className="section-kicker">{copy.product.kicker}</p>
              <h2 className="section-title">{copy.product.title}</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted">{copy.product.body}</p>
              <div className="mt-8 rounded-2xl border border-line bg-paper p-5">
                <p className="text-sm font-semibold text-ink">{copy.hero.proofBadge}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{copy.hero.proofBody}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {copy.productSteps.map((step, index) => {
                const Icon = productIcons[index] ?? Ticket;

                return (
                  <article key={step.title} className="feature-card">
                    <span className="icon-surface">
                      <Icon size={23} weight="bold" />
                    </span>
                    <span className="mt-5 block font-mono text-xs font-bold text-pine">0{index + 1}</span>
                    <h3 className="mt-2 text-2xl font-bold tracking-normal text-ink">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted">{step.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-line/80 bg-paper" id="use-cases">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
              <div>
                <p className="section-kicker">{copy.useCases.kicker}</p>
                <h2 className="section-title">{copy.useCases.title}</h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-muted">{copy.useCases.body}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {useCases.map((useCase) => {
                  const Icon = useCaseIcons[useCase.id];
                  const selected = useCase.id === activeUseCase.id;

                  return (
                    <button
                      key={useCase.id}
                      className={`use-case-card ${selected ? "use-case-card-active" : ""}`}
                      type="button"
                      onClick={() => preserveScrollAfter(() => setActiveUseCaseId(useCase.id))}
                    >
                      <span className="flex items-start justify-between gap-4">
                        <span className="icon-surface">
                          <Icon size={22} weight="bold" />
                        </span>
                        <span className="status-chip">{useCase.status[locale]}</span>
                      </span>
                      <span className="mt-5 block text-left text-xl font-bold tracking-normal text-ink">{useCase.title[locale]}</span>
                      <span className="mt-3 block text-left text-sm leading-6 text-muted">{useCase.summary[locale]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <UseCaseDetail locale={locale} activeUseCaseId={activeUseCaseId} />
            <BrandSimulationLibrary locale={locale} />
          </div>
        </section>

        <SimulationStudio locale={locale} />

        <section className="border-b border-line/80 bg-white" id="integrations">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-20">
            <div>
              <p className="section-kicker">{copy.integrations.kicker}</p>
              <h2 className="section-title">{copy.integrations.title}</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted">{copy.integrations.body}</p>
            </div>
            <IntegrationTable locale={locale} />
          </div>
        </section>

        <section className="border-b border-line/80 bg-paper">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
            <div>
              <p className="section-kicker">{copy.onboarding.kicker}</p>
              <h2 className="section-title">{copy.onboarding.title}</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted">{copy.onboarding.body}</p>
            </div>
            <div className="grid gap-3">
              {copy.onboardingSteps.map((step, index) => {
                const Icon = onboardingIcons[index] ?? CheckCircle;

                return (
                  <div key={step} className="onboarding-row">
                    <span className="grid size-10 place-items-center rounded-md bg-field text-pine">
                      <Icon size={21} weight="bold" />
                    </span>
                    <span className="text-sm font-semibold leading-6 text-ink">{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-line/80 bg-white" id="developers">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
            <div>
              <p className="section-kicker">{copy.developer.kicker}</p>
              <h2 className="section-title">{copy.developer.title}</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted">{copy.developer.body}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a className="btn-primary" href={repoLinks.docs}>
                  <Code size={19} weight="bold" />
                  {copy.developer.docs}
                </a>
                <a className="btn-secondary" href={repoLinks.api}>
                  {copy.developer.api}
                  <ArrowRight size={18} weight="bold" />
                </a>
              </div>
            </div>
            <DeveloperConsole locale={locale} />
          </div>
        </section>

        <section className="border-b border-line/80 bg-paper" id="status">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-20">
            <div>
              <p className="section-kicker">{copy.status.kicker}</p>
              <h2 className="section-title">{copy.status.title}</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted">{copy.status.body}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {copy.trustMarkers.map((marker) => (
                <div key={marker} className="rounded-2xl border border-line bg-white p-5 shadow-[0_16px_34px_-30px_rgba(13,27,42,0.35)]">
                  <ShieldCheck className="text-pine" size={24} weight="bold" />
                  <p className="mt-4 text-sm font-semibold leading-6 text-ink">{marker}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <SiteFooter locale={locale} />
    </main>
  );
}

function MissionSection({ locale }: { locale: Locale }) {
  const copy = siteCopy[locale];
  const cards = [
    {
      title: copy.mission.noClaimTitle,
      body: copy.mission.noClaimBody,
    },
    {
      title: copy.mission.missionTitle,
      body: copy.mission.missionBody,
    },
  ];

  return (
    <section className="mission-section" id="mission">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:px-8 lg:py-20">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">{copy.mission.kicker}</p>
          <h2 className="mt-3 max-w-4xl text-balance text-4xl font-extrabold leading-tight tracking-normal text-white sm:text-5xl">
            {copy.mission.title}
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70">{copy.mission.body}</p>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/70">{copy.mission.belief}</p>
          <p className="mission-wish">{copy.mission.wish}</p>
        </div>

        <div className="grid content-start gap-5">
          <div className="flex flex-wrap gap-2">
            {copy.mission.attributes.map((attribute) => (
              <span key={attribute} className="mission-chip">
                {attribute}
              </span>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((card, index) => {
              const Icon = missionIcons[index] ?? ShieldCheck;

              return (
                <article key={card.title} className="mission-card">
                  <span className="mission-icon">
                    <Icon size={23} weight="bold" />
                  </span>
                  <h3 className="mt-5 text-2xl font-bold tracking-normal text-white">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">{card.body}</p>
                </article>
              );
            })}
          </div>

          <article className="mission-loop">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">{copy.mission.loopTitle}</p>
            <div className="mt-4 grid gap-3">
              {copy.mission.loopSteps.map((step, index) => (
                <div key={step} className="mission-loop-row">
                  <span className="font-mono text-xs font-bold text-moss">{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-sm font-semibold leading-6 text-white/80">{step}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function SiteHeader({
  locale,
  theme,
  onThemeChange,
}: {
  locale: Locale;
  theme: SiteTheme;
  onThemeChange: (theme: SiteTheme) => void;
}) {
  const copy = siteCopy[locale];
  const brandSubtitle = locale === "en" ? "Protocol" : "兑环协议";

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a className="flex items-center gap-3" href="#top" aria-label="RedeemLoop Protocol">
          <img className="size-11 object-contain" src={viAssets.logoMark} alt="RedeemLoop circular voucher logo mark" />
          <span className="hidden leading-none sm:block">
            <span className="block text-[15px] font-extrabold tracking-normal">
              <span className="text-ink">Redeem</span>
              <span className="text-pine">Loop</span>
            </span>
            <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-pine">{brandSubtitle}</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 text-sm font-semibold text-ink/70 lg:flex" aria-label="Primary">
          <a className="nav-link" href="#top">{copy.nav.home}</a>
          <a className="nav-link" href="#mission">{copy.nav.mission}</a>
          <a className="nav-link" href="#product">{copy.nav.product}</a>
          <a className="nav-link" href="#use-cases">{copy.nav.useCases}</a>
          <a className="nav-link" href="#integrations">{copy.nav.integrations}</a>
          <a className="nav-link" href="#developers">{copy.nav.developers}</a>
          <a className="nav-link" href="#status">{copy.nav.status}</a>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageMenu locale={locale} />
          <ThemeToggle locale={locale} theme={theme} onThemeChange={onThemeChange} />
          <a
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-pine px-3 text-sm font-semibold text-white transition hover:bg-[#086e63] active:translate-y-px"
            href={repoLinks.github}
            title={copy.nav.github}
            aria-label={copy.nav.github}
          >
            <GithubLogo size={19} weight="bold" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}

function LanguageMenu({ locale }: { locale: Locale }) {
  const copy = siteCopy[locale];
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  return (
    <div
      ref={menuRef}
      className="language-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        className="language-menu-trigger"
        type="button"
        aria-label={copy.languageMenu.label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Translate size={18} weight="bold" />
        <span className="hidden sm:inline">{copy.languageMenu.current}</span>
      </button>
      {open ? <div className="language-menu-panel">
        <p className="px-3 pb-2 text-xs leading-5 text-muted">{copy.languageMenu.implementedNote}</p>
        <div className="grid max-h-[360px] gap-1 overflow-y-auto pr-1">
          {languageOptions.map((language) => {
            const selected = language.code === locale;

            return (
              <Link key={language.code} className={`language-option ${selected ? "language-option-active" : ""}`} href={language.href} onClick={() => setOpen(false)}>
                <span className="font-mono text-xs uppercase">{language.code}</span>
                <span className="min-w-0 flex-1">{language.label[locale]}</span>
                {selected ? <CheckCircle size={16} weight="fill" className="text-pine" /> : null}
              </Link>
            );
          })}
        </div>
      </div> : null}
    </div>
  );
}

function ThemeToggle({
  locale,
  theme,
  onThemeChange,
}: {
  locale: Locale;
  theme: SiteTheme;
  onThemeChange: (theme: SiteTheme) => void;
}) {
  const copy = siteCopy[locale];

  return (
    <div className="theme-toggle" aria-label={copy.theme.label} role="group">
      <button
        className={`theme-toggle-button ${theme === "light" ? "theme-toggle-button-active" : ""}`}
        type="button"
        onClick={() => onThemeChange("light")}
        aria-label={copy.theme.lightAria}
        aria-pressed={theme === "light"}
        title={copy.theme.light}
      >
        <Sun size={17} weight="bold" />
      </button>
      <button
        className={`theme-toggle-button ${theme === "dark" ? "theme-toggle-button-active" : ""}`}
        type="button"
        onClick={() => onThemeChange("dark")}
        aria-label={copy.theme.darkAria}
        aria-pressed={theme === "dark"}
        title={copy.theme.dark}
      >
        <Moon size={17} weight="bold" />
      </button>
    </div>
  );
}

function BrandSignature({
  locale,
  className = "",
  size = "compact",
  inverted = false,
}: {
  locale: Locale;
  className?: string;
  size?: "compact" | "hero";
  inverted?: boolean;
}) {
  if (locale === "zh") {
    if (inverted) {
      return (
        <div className={`inline-flex max-w-full flex-col ${className}`} aria-label="RedeemLoop 兑环协议">
          <span className="block whitespace-nowrap text-[40px] font-extrabold leading-none tracking-normal">
            <span className="text-white">Redeem</span>
            <span className="text-moss">Loop</span>
          </span>
          <span className="mt-3 flex items-center gap-3 text-[15px] font-bold leading-none tracking-[0.28em] text-moss">
            <span className="h-px w-14 bg-moss/70" aria-hidden="true" />
            <span>兑环协议</span>
            <span className="h-px w-14 bg-moss/70" aria-hidden="true" />
          </span>
        </div>
      );
    }

    return (
      <img
        className={`${size === "hero" ? "h-auto w-full max-w-[360px]" : "h-auto w-full max-w-[280px]"} ${className}`}
        src={viAssets.wordmark}
        alt="RedeemLoop 兑环协议"
      />
    );
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <img
        className={`${size === "hero" ? "size-20" : "size-12"} shrink-0 object-contain`}
        src={viAssets.logoMark}
        alt="RedeemLoop circular voucher logo mark"
      />
      <span className="leading-none">
        <span className={`${size === "hero" ? "text-4xl sm:text-5xl" : "text-2xl"} block font-extrabold tracking-normal`}>
          <span className={inverted ? "text-white" : "text-ink"}>Redeem</span>
          <span className="text-pine">Loop</span>
        </span>
        <span className={`mt-2 block text-xs font-semibold uppercase tracking-[0.22em] ${inverted ? "text-white/72" : "text-pine"}`}>
          Protocol
        </span>
      </span>
    </div>
  );
}

function HeroCommercePanel({ locale }: { locale: Locale }) {
  const labels =
    locale === "en"
      ? {
          title: "Voucher checkout",
          order: "Order",
          item: "Voucher-backed SKU",
          tender: "Voucher tender",
          wallet: "Wallet transfer",
          vault: "Merchant vault",
          paid: "Commerce order paid",
          amount: "12 vouchers",
          network: "Polygon PoS",
        }
      : {
          title: "兑换券入口",
          order: "订单",
          item: "兑换券权益",
          tender: "兑换券确认",
          wallet: "钱包提交",
          vault: "商户 vault",
          paid: "订单已确认",
          amount: "12 张券",
          network: "Polygon PoS",
        };

  return (
    <div className="relative min-w-0">
      <div className="hero-panel">
        <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">{labels.title}</p>
            <p className="mt-2 text-2xl font-bold tracking-normal text-ink">{labels.order} RL-1048</p>
          </div>
          <img className="size-14 object-contain" src={viAssets.logoMark} alt="RedeemLoop mark" />
        </div>

        <div className="grid gap-4 py-5 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-3">
            <div className="checkout-row">
              <span className="grid size-10 place-items-center rounded-md bg-field text-pine">
                <Ticket size={21} weight="bold" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{labels.item}</span>
                <span className="mt-1 block text-xs text-muted">{labels.amount}</span>
              </span>
            </div>
            <div className="checkout-row">
              <span className="grid size-10 place-items-center rounded-md bg-field text-pine">
                <Wallet size={21} weight="bold" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{labels.wallet}</span>
                <span className="mt-1 block text-xs text-muted">{labels.network}</span>
              </span>
            </div>
            <div className="checkout-row">
              <span className="grid size-10 place-items-center rounded-md bg-field text-pine">
                <Vault size={21} weight="bold" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{labels.vault}</span>
                <span className="mt-1 block font-mono text-xs text-muted">0x7B6E...1842</span>
              </span>
            </div>
          </div>

          <div className="grid min-h-36 min-w-36 place-items-center rounded-2xl border border-line bg-white p-4">
            <QrCode size={84} weight="regular" className="text-ink" />
          </div>
        </div>

        <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
          {[labels.tender, labels.vault, labels.paid].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-md bg-field px-3 py-2 text-sm font-semibold text-pine">
              <CheckCircle size={17} weight="fill" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UseCaseDetail({ locale, activeUseCaseId }: { locale: Locale; activeUseCaseId: UseCaseId }) {
  const copy = siteCopy[locale];
  const activeUseCase = useCases.find((useCase) => useCase.id === activeUseCaseId) ?? useCases[0];

  return (
    <div className="mt-8 grid gap-5 rounded-[22px] border border-line bg-white p-5 shadow-panel lg:grid-cols-[0.95fr_1.05fr] lg:p-6">
      <div>
        <p className="text-sm font-semibold text-pine">{activeUseCase.status[locale]}</p>
        <h3 className="mt-2 text-3xl font-bold tracking-normal text-ink">{activeUseCase.title[locale]}</h3>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">{activeUseCase.summary[locale]}</p>
        <div className="mt-6 grid gap-3">
          <RoleLine label={locale === "en" ? "Merchant" : "商户"} value={activeUseCase.merchant[locale]} />
          <RoleLine label={locale === "en" ? "Customer" : "用户"} value={activeUseCase.customer[locale]} />
          <RoleLine label={locale === "en" ? "Result" : "结果"} value={activeUseCase.result[locale]} />
        </div>
      </div>

      <div className="grid content-start gap-4">
        <div className="grid gap-3">
          {activeUseCase.steps[locale].map((step, index) => (
            <div key={step} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-line bg-paper px-3 py-3">
              <span className="grid size-8 place-items-center rounded-md bg-pine font-mono text-xs font-bold text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 text-sm font-semibold text-ink">{step}</span>
              {index < activeUseCase.steps[locale].length - 1 ? (
                <span className="h-px w-10 bg-line" aria-hidden="true" />
              ) : (
                <CheckCircle size={20} weight="fill" className="text-pine" />
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {activeUseCase.metrics.map((metric) => (
            <div key={metric.label.en} className="min-h-[86px] rounded-xl border border-line bg-field p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{metric.label[locale]}</p>
              <p className="mt-3 break-words font-mono text-sm font-bold text-ink">{metric.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BrandSimulationLibrary({ locale }: { locale: Locale }) {
  const copy = brandSimulationCopy[locale];
  const [activeIndustryId, setActiveIndustryId] = useState<BrandSimulationIndustryId>("coffee-qsr");
  const [previewTarget, setPreviewTarget] = useState<SimulationPreviewTarget | null>(null);
  const activeIndustry =
    brandSimulationIndustries.find((industry) => industry.id === activeIndustryId) ?? brandSimulationIndustries[0];
  const totalBrands = brandSimulationIndustries.reduce((total, industry) => total + industry.brands.length, 0);

  return (
    <div className="mt-12 border-t border-line pt-10">
      <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="section-kicker">{copy.kicker}</p>
          <h3 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-normal text-ink sm:text-4xl">
            {copy.title}
          </h3>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted">{copy.body}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              { value: totalBrands.toString(), label: copy.totalBrands },
              { value: brandSimulationIndustries.length.toString(), label: copy.totalIndustries },
              { value: "5", label: copy.loopSteps },
            ].map((item) => (
              <div key={item.label} className="metric-block min-h-24">
                <span className="font-mono text-3xl font-bold text-ink">{item.value}</span>
                <span className="mt-2 block text-sm leading-5 text-muted">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{copy.industryLabel}</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {brandSimulationIndustries.map((industry, index) => {
              const selected = industry.id === activeIndustry.id;

              return (
                <button
                  key={industry.id}
                  className={`industry-tab ${selected ? "industry-tab-active" : ""}`}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => preserveScrollAfter(() => setActiveIndustryId(industry.id))}
                >
                  <span className="font-mono text-xs font-bold tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1 text-left">{industry.label[locale]}</span>
                  <span className="font-mono text-xs">{industry.brands.length}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-4">
          <div className="simulation-lane">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">{copy.vendorLane}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{activeIndustry.vendorFocus[locale]}</p>
          </div>
          <div className="simulation-lane">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">{copy.userLane}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{activeIndustry.userFocus[locale]}</p>
          </div>
        </div>

        <div className="rounded-[18px] border border-line bg-white p-5 shadow-[0_16px_36px_-30px_rgba(13,27,42,0.35)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">{copy.libraryLabel}</p>
              <h4 className="mt-2 text-2xl font-bold tracking-normal text-ink">{activeIndustry.label[locale]}</h4>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{activeIndustry.summary[locale]}</p>
            </div>
            <span className="status-chip">
              {locale === "en" ? `${activeIndustry.brands.length} brands` : `${activeIndustry.brands.length} 个品牌`}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {activeIndustry.brands.map((brand) => (
          <article key={`${activeIndustry.id}-${brand.name}`} className="brand-scenario-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">{activeIndustry.label[locale]}</p>
                <h4 className="mt-2 text-2xl font-bold tracking-normal text-ink">{brand.name}</h4>
              </div>
              <Ticket size={25} weight="bold" className="text-pine" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="scenario-link"
                type="button"
                onClick={() =>
                  setPreviewTarget({
                    brand,
                    entryLabel: copy.officialSite,
                    industryLabel: activeIndustry.label[locale],
                    offer: brand.offer[locale],
                    url: brand.officialSite,
                  })
                }
              >
                <GlobeHemisphereEast size={16} weight="bold" />
                {copy.officialSite}
              </button>
              <button
                className="scenario-link"
                type="button"
                onClick={() =>
                  setPreviewTarget({
                    brand,
                    entryLabel: copy.storeEntry,
                    industryLabel: activeIndustry.label[locale],
                    offer: brand.offer[locale],
                    url: brand.storeEntry,
                  })
                }
              >
                <Storefront size={16} weight="bold" />
                {copy.storeEntry}
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {simulationStageOrder.map((stage) => {
                const value = stage === "issue" ? brand.offer[locale] : activeIndustry.stages[stage][locale];

                return <SimulationStageRow key={stage} stage={stage} label={copy.stages[stage]} value={value} />;
              })}
            </div>
          </article>
        ))}
      </div>

      <p className="mt-5 rounded-md border border-line bg-white px-4 py-3 text-xs leading-5 text-muted">{copy.disclaimer}</p>
      {previewTarget ? <ScenarioPreviewOverlay locale={locale} target={previewTarget} onClose={() => setPreviewTarget(null)} /> : null}
    </div>
  );
}

function SimulationStageRow({ stage, label, value }: { stage: BrandSimulationStage; label: string; value: string }) {
  const Icon = simulationStageIcons[stage];

  return (
    <div className="scenario-stage-row">
      <span className="grid size-9 place-items-center rounded-md bg-field text-pine">
        <Icon size={18} weight="bold" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-ink">{value}</span>
      </span>
    </div>
  );
}

function ScenarioPreviewOverlay({
  locale,
  target,
  onClose,
}: {
  locale: Locale;
  target: SimulationPreviewTarget;
  onClose: () => void;
}) {
  const host = formatReferenceHost(target.url);
  const labels =
    locale === "en"
      ? {
          aria: "RedeemLoop simulated voucher insertion preview",
          close: "Close preview",
          badge: "Hypothetical simulation",
          entry: "Entry",
          reference: "Public URL reference",
          browserNote: "Neutralized reference backdrop",
          title: "Voucher layer after RedeemLoop is introduced",
          body:
            "The reference site is represented as a blurred, generic store surface. No live page is embedded or copied.",
          issue: "Issue",
          claim: "Claim",
          redeem: "Redeem",
          loop: "Loop",
          issueBody: "Merchant configures the campaign and voucher supply.",
          claimBody: "Customer sees a contextual claim prompt in the same shopping flow.",
          redeemBody: "Checkout or store staff scans and settles against the merchant vault.",
          loopBody: "Unused budget and redemption signals return to the next drop.",
          status: "Simulated overlay",
          statusBody: "This is not an endorsement, integration, or live deployment by the referenced brand.",
          safety: "Brand-safe presentation",
          safetyBody:
            "The original brand surface is intentionally blurred and abstracted so users feel the placement without mistaking it for a real installation.",
          footer: "Public URL is displayed only as a reference. RedeemLoop does not load, frame, scrape, or reproduce that page here.",
          productA: "Hero product",
          productB: "Best seller",
          productC: "Pickup shelf",
        }
      : {
          aria: "RedeemLoop 兑换券植入仿真预览",
          close: "关闭预览",
          badge: "非合作仿真",
          entry: "入口",
          reference: "公开 URL 参考",
          browserNote: "已中性化的参考背景",
          title: "植入 RedeemLoop 后的兑换券效果层",
          body: "背景只用模糊、抽象的店铺界面表达场景，不加载、不复制真实品牌页面内容。",
          issue: "发行",
          claim: "领取",
          redeem: "核销",
          loop: "循环",
          issueBody: "品牌方配置活动、券包和投放节奏。",
          claimBody: "用户在同一购物路径中看到上下文领取提示。",
          redeemBody: "结账页或门店人员扫码核销，并回写商户 vault。",
          loopBody: "未使用预算和核销信号回流到下一轮投放。",
          status: "仿真效果层",
          statusBody: "这不是被引用品牌的背书、合作或真实上线部署。",
          safety: "品牌安全表达",
          safetyBody: "原品牌页面被刻意虚化和抽象化，只让用户感受植入位置，不误认为已经真实安装。",
          footer: "公开 URL 只作为参考展示。RedeemLoop 在此不加载、不嵌入、不抓取、不复刻该页面。",
          productA: "旗舰产品",
          productB: "经典热卖",
          productC: "门店货架",
        };

  const flowSteps = [
    { icon: Ticket, label: labels.issue, body: labels.issueBody },
    { icon: Wallet, label: labels.claim, body: labels.claimBody },
    { icon: QrCode, label: labels.redeem, body: labels.redeemBody },
    { icon: FlowArrow, label: labels.loop, body: labels.loopBody },
  ];
  const ghostProducts = [labels.productA, labels.productB, labels.productC];

  return (
    <div className="preview-backdrop" onClick={onClose}>
      <div className="preview-shell" role="dialog" aria-modal="true" aria-label={labels.aria} onClick={(event) => event.stopPropagation()}>
        <button className="preview-close" type="button" onClick={onClose} aria-label={labels.close}>
          <X size={20} weight="bold" />
        </button>

        <div className="preview-reference-layer">
          <div className="preview-browser-bar">
            <span className="preview-browser-dot bg-[#ff6b64]" aria-hidden="true" />
            <span className="preview-browser-dot bg-[#f6c85f]" aria-hidden="true" />
            <span className="preview-browser-dot bg-[#62c27b]" aria-hidden="true" />
            <span className="preview-address">{host}</span>
          </div>

          <div className="preview-ghost-page" aria-hidden="true">
            <div className="preview-ghost-nav">
              <span className="preview-ghost-brand">{target.brand.name}</span>
              <span className="preview-ghost-pill" />
              <span className="preview-ghost-pill preview-ghost-pill-short" />
              <span className="preview-ghost-pill" />
            </div>
            <div className="preview-ghost-hero">
              <span className="preview-ghost-kicker" />
              <span className="preview-ghost-title" />
              <span className="preview-ghost-copy" />
              <span className="preview-ghost-button" />
            </div>
            <div className="preview-ghost-grid">
              {ghostProducts.map((product) => (
                <span key={product} className="preview-ghost-card">
                  <span className="preview-ghost-image" />
                  <span className="preview-ghost-product">{product}</span>
                  <span className="preview-ghost-price" />
                </span>
              ))}
            </div>
          </div>

          <div className="preview-voucher-layer">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="preview-badge">{labels.badge}</p>
                <h3 className="mt-3 text-2xl font-bold leading-tight tracking-normal">{labels.title}</h3>
              </div>
              <span className="preview-status">{labels.status}</span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">{target.offer}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-2 sm:grid-cols-3">
                {[labels.claim, labels.redeem, labels.loop].map((step, index) => (
                  <span key={step} className="preview-mini-step">
                    <span className="font-mono text-xs text-moss">0{index + 1}</span>
                    <span>{step}</span>
                  </span>
                ))}
              </div>
              <span className="preview-qr-mini" aria-hidden="true">
                <QrCode size={48} weight="regular" />
              </span>
            </div>
          </div>
        </div>

        <aside className="preview-detail-panel">
          <div>
            <p className="section-kicker">{labels.badge}</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight tracking-normal text-ink">{target.brand.name}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{labels.body}</p>
          </div>

          <div className="grid gap-3">
            <RoleLine label={labels.entry} value={`${target.industryLabel} / ${target.entryLabel}`} />
            <RoleLine label={labels.reference} value={host} />
            <RoleLine label={labels.browserNote} value={labels.safetyBody} />
          </div>

          <div className="grid gap-3">
            {flowSteps.map((step) => {
              const Icon = step.icon;

              return (
                <div key={step.label} className="preview-flow-row">
                  <span className="grid size-10 place-items-center rounded-md bg-field text-pine">
                    <Icon size={20} weight="bold" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{step.label}</span>
                    <span className="mt-1 block text-sm leading-6 text-muted">{step.body}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="rounded-[16px] border border-line bg-paper p-4">
            <p className="text-sm font-bold text-ink">{labels.safety}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{labels.statusBody}</p>
          </div>

          <p className="text-xs leading-5 text-muted">{labels.footer}</p>
        </aside>
      </div>
    </div>
  );
}

function SimulationStudio({ locale }: { locale: Locale }) {
  const copy = siteCopy[locale];
  const networkLabels =
    locale === "en"
      ? {
          browser: "shop browser",
          wallet: "wallet",
          host: "merchant host",
          api: "RedeemLoop API",
          indexer: "indexer",
          vault: "vault",
          commerce: "commerce",
          intent: "PaymentIntent RL-1048",
          receipt: "receipt confirmed",
        }
      : {
          browser: "网店浏览器",
          wallet: "钱包",
          host: "商户主机",
          api: "RedeemLoop API",
          indexer: "索引器",
          vault: "vault",
          commerce: "电商后台",
          intent: "PaymentIntent RL-1048",
          receipt: "收券已确认",
        };

  return (
    <section className="border-b border-line/80 bg-white" id="simulation-studio">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
        <div>
          <p className="section-kicker">{copy.simulationStudio.kicker}</p>
          <h2 className="section-title">{copy.simulationStudio.title}</h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">{copy.simulationStudio.body}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {simulationVisualCards.map((card, index) => {
              const Icon = visualIcons[index] ?? Storefront;

              return (
                <article key={card.title.en} className="visual-card">
                  <span className="icon-surface">
                    <Icon size={22} weight="bold" />
                  </span>
                  <h3 className="mt-4 text-xl font-bold tracking-normal text-ink">{card.title[locale]}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{card.body[locale]}</p>
                  <p className="mt-4 rounded-md bg-field px-3 py-2 text-xs font-semibold leading-5 text-pine">{card.proof[locale]}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="grid content-start gap-5">
          <div className="network-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">{copy.simulationStudio.networkTitle}</p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">{copy.simulationStudio.networkBody}</p>
              </div>
              <Network size={28} weight="bold" className="shrink-0 text-moss" />
            </div>

            <div className="network-map" aria-label={copy.simulationStudio.networkTitle}>
              <span className="network-line network-line-a" aria-hidden="true" />
              <span className="network-line network-line-b" aria-hidden="true" />
              <span className="network-line network-line-c" aria-hidden="true" />
              <span className="network-pulse network-pulse-a" aria-hidden="true" />
              <span className="network-pulse network-pulse-b" aria-hidden="true" />
              <span className="network-pulse network-pulse-c" aria-hidden="true" />
              <NetworkNode className="left-[4%] top-[15%]" label={networkLabels.browser} />
              <NetworkNode className="left-[15%] bottom-[16%]" label={networkLabels.wallet} />
              <NetworkNode className="left-[42%] top-[8%]" label={networkLabels.host} />
              <NetworkNode className="left-[44%] bottom-[18%]" label={networkLabels.api} strong />
              <NetworkNode className="right-[8%] top-[12%]" label={networkLabels.indexer} />
              <NetworkNode className="right-[12%] bottom-[16%]" label={networkLabels.vault} />
              <div className="network-intent">
                <span className="font-mono text-xs text-moss">{networkLabels.intent}</span>
                <span className="mt-2 block text-sm font-semibold text-white">{networkLabels.receipt}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {humanSignals.map((signal) => (
              <div key={signal.label.en} className="human-signal">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{signal.label[locale]}</p>
                <p className="mt-3 font-mono text-3xl font-bold text-ink">{signal.value}</p>
                <p className="mt-2 text-xs leading-5 text-muted">{signal.note[locale]}</p>
              </div>
            ))}
          </div>

          <p className="rounded-md border border-line bg-paper px-4 py-3 text-xs leading-5 text-muted">
            {copy.simulationStudio.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}

function NetworkNode({ className, label, strong = false }: { className: string; label: string; strong?: boolean }) {
  return (
    <span className={`network-node ${strong ? "network-node-strong" : ""} ${className}`}>
      <span className="network-node-dot" />
      <span className="network-node-label">{label}</span>
    </span>
  );
}

function IntegrationTable({ locale }: { locale: Locale }) {
  const copy = siteCopy[locale];

  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-white shadow-panel">
      <div className="grid min-w-[780px] grid-cols-[1fr_1fr_1.45fr_1.25fr] border-b border-line bg-ink px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white">
        <span>{copy.integrations.columns.rail}</span>
        <span>{copy.integrations.columns.status}</span>
        <span>{copy.integrations.columns.scope}</span>
        <span>{copy.integrations.columns.next}</span>
      </div>
      <div className="overflow-x-auto">
        {readinessRows.map((row) => (
          <div
            key={row.rail}
            className="grid min-w-[780px] grid-cols-[1fr_1fr_1.45fr_1.25fr] border-b border-line px-5 py-4 text-sm last:border-b-0"
          >
            <span className="font-bold text-ink">{row.rail}</span>
            <span className="font-semibold text-pine">{row.status[locale]}</span>
            <span className="text-muted">{row.scope[locale]}</span>
            <span className="text-muted">{row.next[locale]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeveloperConsole({ locale }: { locale: Locale }) {
  const copy = siteCopy[locale];

  return (
    <div className="rounded-[18px] border border-line bg-ink p-5 font-mono text-sm text-white shadow-panel">
      <div className="mb-4 flex items-center justify-between border-b border-white/12 pb-3">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-field">{copy.developer.codeLabel}</span>
        <Code size={21} weight="bold" className="text-field" />
      </div>
      {quickStartCommands.map((command) => (
        <div key={command} className="flex min-h-8 items-center gap-3">
          <span className="text-moss">$</span>
          <code>{command}</code>
        </div>
      ))}
    </div>
  );
}

function RoleLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-xl border border-line bg-paper px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-pine">{label}</span>
      <span className="text-sm leading-6 text-muted">{value}</span>
    </div>
  );
}

function SiteFooter({ locale }: { locale: Locale }) {
  const copy = siteCopy[locale];
  const resourceLinks = [
    { label: copy.nav.developers, href: repoLinks.docs },
    { label: "API", href: repoLinks.api },
    { label: "Releases", href: repoLinks.releases },
  ];
  const boundaryLinks = [
    { label: "Boundary", href: repoLinks.boundary },
    { label: "GitHub", href: repoLinks.github },
    { label: "Sandbox", href: repoLinks.sandbox },
  ];

  return (
    <footer className="relative isolate overflow-hidden bg-ink text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(94,182,170,0.18),transparent_26rem)]" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8 lg:py-14">
        <div className="self-start rounded-[20px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.8)] sm:p-6">
          <BrandSignature locale={locale} className="max-w-[300px]" inverted />
          <p className="mt-6 max-w-xl text-sm leading-6 text-white/76">{copy.footer.line}</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/62">{copy.footer.domain}</p>
        </div>

        <div className="grid content-start gap-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">{copy.footer.explore}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {copy.footer.primaryLinks.map((link) => (
                <a
                  key={link.href}
                  className="group rounded-[16px] border border-white/10 bg-white/[0.045] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-moss/70 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
                  href={link.href}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-base font-bold text-white">{link.label}</span>
                    <ArrowRight className="text-moss transition group-hover:translate-x-0.5" size={17} weight="bold" />
                  </span>
                  <span className="mt-3 block text-sm leading-6 text-white/64">{link.body}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FooterGroup title={copy.footer.resources} links={resourceLinks} />
            <FooterGroup title={copy.footer.legal} links={boundaryLinks} />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-bold text-white">{title}</p>
      <div className="mt-3 grid gap-2">
        {links.map((link) => (
          <a
            key={`${title}-${link.label}`}
            className="inline-flex min-h-8 items-center text-sm leading-6 text-white/68 transition hover:text-field focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
            href={link.href}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
