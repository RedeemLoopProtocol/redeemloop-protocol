"use client";

import { useMemo, useState } from "react";
import {
  ArrowSquareOut,
  Barcode,
  CheckCircle,
  ClockCounterClockwise,
  GithubLogo,
  GlobeHemisphereEast,
  LinkSimple,
  Monitor,
  QrCode,
  ShieldCheck,
  ShoppingCart,
  Storefront,
} from "@phosphor-icons/react";

import { quickStartCommands, readinessRows, repoLinks, scenarios, siteCopy, type Locale, type ScenarioId } from "./content";

const scenarioIcons = {
  checkout: ShoppingCart,
  pos: QrCode,
  live: LinkSimple,
  ops: Monitor,
} satisfies Record<ScenarioId, typeof ShoppingCart>;

export function OfficialSite() {
  const [locale, setLocale] = useState<Locale>("en");
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId>("checkout");
  const copy = siteCopy[locale];
  const activeScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === activeScenarioId) ?? scenarios[0],
    [activeScenarioId],
  );

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a className="flex items-center gap-3" href="#top" aria-label="RedeemLoop Protocol">
            <span className="grid size-9 place-items-center rounded-md border border-ink bg-ink text-sm font-black text-chalk">
              RL
            </span>
            <span className="hidden text-sm font-semibold uppercase tracking-[0.14em] sm:inline">RedeemLoop</span>
          </a>
          <nav className="hidden items-center gap-1 text-sm font-medium text-muted md:flex" aria-label="Primary">
            <a className="rounded-md px-3 py-2 hover:bg-field hover:text-ink" href="#scenarios">
              {copy.nav.scenarios}
            </a>
            <a className="rounded-md px-3 py-2 hover:bg-field hover:text-ink" href="#status">
              {copy.nav.status}
            </a>
            <a className="rounded-md px-3 py-2 hover:bg-field hover:text-ink" href={repoLinks.docs}>
              {copy.nav.docs}
            </a>
            <a className="rounded-md px-3 py-2 hover:bg-field hover:text-ink" href={repoLinks.releases}>
              {copy.nav.releases}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex size-10 items-center justify-center rounded-md border border-line bg-chalk text-ink transition hover:border-pine hover:text-pine"
              type="button"
              onClick={() => setLocale((current) => (current === "en" ? "zh" : "en"))}
              title={copy.nav.language}
              aria-label={copy.nav.language}
            >
              <GlobeHemisphereEast size={19} weight="bold" />
            </button>
            <a
              className="inline-flex size-10 items-center justify-center rounded-md border border-line bg-ink text-chalk transition hover:bg-pine"
              href={repoLinks.github}
              title={copy.nav.github}
              aria-label={copy.nav.github}
            >
              <GithubLogo size={20} weight="bold" />
            </a>
          </div>
        </div>
      </header>

      <section id="top" className="border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:px-8 lg:py-14">
          <div className="flex flex-col justify-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-rust">{copy.hero.eyebrow}</p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-normal text-ink sm:text-6xl lg:text-7xl">
              {copy.hero.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{copy.hero.body}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a className="btn-primary" href="#scenarios">
                <Storefront size={19} weight="bold" />
                {copy.hero.primary}
              </a>
              <a className="btn-secondary" href={repoLinks.integration}>
                <ArrowSquareOut size={19} weight="bold" />
                {copy.hero.secondary}
              </a>
            </div>
            <div className="mt-7 max-w-2xl border-l-4 border-brass bg-chalk px-4 py-3 text-sm leading-6 text-muted">
              {copy.hero.alpha}
            </div>
          </div>

          <ScenarioConsole
            locale={locale}
            activeScenarioId={activeScenarioId}
            setActiveScenarioId={setActiveScenarioId}
          />
        </div>
      </section>

      <section className="border-b border-line bg-chalk" id="scenarios">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="section-kicker">{copy.protocol.title}</p>
            <h2 className="section-title">{activeScenario.title[locale]}</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted">{activeScenario.summary[locale]}</p>
            <div className="mt-7 grid gap-3">
              <RoleLine label={copy.console.merchant} value={activeScenario.merchant[locale]} />
              <RoleLine label={copy.console.customer} value={activeScenario.customer[locale]} />
              <RoleLine label={copy.console.result} value={activeScenario.result[locale]} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {scenarios.map((scenario) => {
              const Icon = scenarioIcons[scenario.id];
              const selected = scenario.id === activeScenarioId;
              return (
                <button
                  key={scenario.id}
                  className={`scenario-tile ${selected ? "scenario-tile-active" : ""}`}
                  type="button"
                  onClick={() => setActiveScenarioId(scenario.id)}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-md border border-line bg-paper text-pine">
                      <Icon size={21} weight="bold" />
                    </span>
                    <span className="rounded-full border border-line bg-chalk px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                      {scenario.status[locale]}
                    </span>
                  </span>
                  <span className="mt-5 block text-left text-xl font-black tracking-normal text-ink">{scenario.title[locale]}</span>
                  <span className="mt-3 block text-left text-sm leading-6 text-muted">{scenario.summary[locale]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-line" id="status">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-7 max-w-3xl">
            <p className="section-kicker">{copy.status.title}</p>
            <h2 className="section-title">{copy.status.body}</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-line bg-chalk shadow-panel">
            <div className="grid min-w-[760px] grid-cols-[1fr_1fr_1.35fr_1.2fr] border-b border-line bg-ink px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-chalk">
              <span>Rail</span>
              <span>Status</span>
              <span>Scope</span>
              <span>Next proof</span>
            </div>
            <div className="overflow-x-auto">
              {readinessRows.map((row) => (
                <div
                  key={row.rail}
                  className="grid min-w-[760px] grid-cols-[1fr_1fr_1.35fr_1.2fr] border-b border-line px-5 py-4 text-sm last:border-b-0"
                >
                  <span className="font-bold text-ink">{row.rail}</span>
                  <span className="text-rust">{row.status[locale]}</span>
                  <span className="text-muted">{row.scope[locale]}</span>
                  <span className="text-muted">{row.next[locale]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-chalk">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <p className="section-kicker">{copy.developer.title}</p>
            <h2 className="section-title">{copy.developer.body}</h2>
          </div>
          <div className="rounded-lg border border-ink bg-night p-5 font-mono text-sm text-chalk shadow-panel">
            <div className="mb-4 flex items-center justify-between border-b border-white/15 pb-3">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-brass">{copy.developer.codeLabel}</span>
              <Barcode size={21} weight="bold" className="text-brass" />
            </div>
            {quickStartCommands.map((command) => (
              <div key={command} className="flex min-h-8 items-center gap-3">
                <span className="text-moss">$</span>
                <code>{command}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <BoundaryColumn title={copy.boundary.does} items={copy.boundary.doesItems} good />
          <BoundaryColumn title={copy.boundary.doesNot} items={copy.boundary.doesNotItems} />
        </div>
      </section>

      <footer className="bg-ink text-chalk">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <p className="text-lg font-black">RedeemLoop Protocol</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-chalk/72">{copy.footer.line}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-chalk/72">{copy.footer.domain}</p>
          </div>
          <div className="flex flex-wrap items-start gap-3 lg:justify-end">
            <a className="footer-link" href={repoLinks.github}>
              <GithubLogo size={18} weight="bold" />
              GitHub
            </a>
            <a className="footer-link" href={repoLinks.releases}>
              <ClockCounterClockwise size={18} weight="bold" />
              Releases
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ScenarioConsole({
  locale,
  activeScenarioId,
  setActiveScenarioId,
}: {
  locale: Locale;
  activeScenarioId: ScenarioId;
  setActiveScenarioId: (id: ScenarioId) => void;
}) {
  const copy = siteCopy[locale];
  const activeScenario = scenarios.find((scenario) => scenario.id === activeScenarioId) ?? scenarios[0];
  const Icon = scenarioIcons[activeScenario.id];

  return (
    <div className="rounded-lg border border-ink bg-chalk p-4 shadow-panel sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-rust">{copy.console.title}</p>
          <p className="mt-1 text-2xl font-black tracking-normal">{activeScenario.title[locale]}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm font-bold text-pine">
          <Icon size={18} weight="bold" />
          {activeScenario.status[locale]}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2" role="tablist" aria-label={copy.console.title}>
        {scenarios.map((scenario) => {
          const ScenarioIcon = scenarioIcons[scenario.id];
          const selected = scenario.id === activeScenario.id;
          return (
            <button
              key={scenario.id}
              className={`tab-button ${selected ? "tab-button-active" : ""}`}
              type="button"
              onClick={() => setActiveScenarioId(scenario.id)}
              aria-selected={selected}
              role="tab"
              title={scenario.title[locale]}
            >
              <ScenarioIcon size={20} weight="bold" />
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3">
        {activeScenario.steps[locale].map((step, index) => (
          <div key={step} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-line bg-paper px-3 py-3">
            <span className="grid size-8 place-items-center rounded-md bg-ink font-mono text-xs font-bold text-chalk">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 text-sm font-bold text-ink">{step}</span>
            {index < activeScenario.steps[locale].length - 1 ? (
              <span className="h-px w-10 bg-line" aria-hidden="true" />
            ) : (
              <CheckCircle size={20} weight="fill" className="text-pine" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {activeScenario.metrics.map((metric) => (
          <div key={metric.label.en} className="min-h-[86px] rounded-md border border-line bg-field p-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{metric.label[locale]}</p>
            <p className="mt-3 break-words font-mono text-sm font-bold text-ink">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-l-4 border-pine bg-paper px-4 py-3">
      <span className="text-xs font-black uppercase tracking-[0.15em] text-pine">{label}</span>
      <span className="text-sm leading-6 text-muted">{value}</span>
    </div>
  );
}

function BoundaryColumn({ title, items, good = false }: { title: string; items: readonly string[]; good?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-chalk p-5 shadow-panel">
      <div className="mb-5 flex items-center gap-3">
        <span className={`grid size-10 place-items-center rounded-md ${good ? "bg-pine text-chalk" : "bg-rust text-chalk"}`}>
          <ShieldCheck size={21} weight="bold" />
        </span>
        <h2 className="text-2xl font-black tracking-normal">{title}</h2>
      </div>
      <ul className="grid gap-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-muted">
            <span className={`mt-2 size-2 shrink-0 rounded-full ${good ? "bg-pine" : "bg-rust"}`} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
