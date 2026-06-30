import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { brandSimulationCopy, brandSimulationIndustries } from "../src/brandSimulationCases";
import {
  humanSignals,
  languageOptions,
  quickStartCommands,
  readinessRows,
  scenarios,
  simulationVisualCards,
  siteCopy,
} from "../src/content";

const containsHan = (value: unknown): boolean => /[\p{Script=Han}]/u.test(JSON.stringify(value));
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const officialSite = readFileSync(new URL("../src/OfficialSite.tsx", import.meta.url), "utf8");
const pageMetadata = [
  "../app/(en)/en/page.tsx",
  "../app/(en)/layout.tsx",
  "../app/(zh)/page.tsx",
  "../app/(zh)/layout.tsx",
].map((file) => readFileSync(new URL(file, import.meta.url), "utf8")).join("\n");

describe("site content", () => {
  it("keeps merchant use cases bilingual and actionable", () => {
    expect(scenarios).toHaveLength(4);

    for (const scenario of scenarios) {
      expect(scenario.title.en.length).toBeGreaterThan(4);
      expect(scenario.title.zh.length).toBeGreaterThan(2);
      expect(scenario.steps.en.length).toBeGreaterThanOrEqual(5);
      expect(scenario.steps.zh).toHaveLength(scenario.steps.en.length);
      expect(scenario.metrics.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps public readiness wording conservative", () => {
    const allStatuses = readinessRows.map((row) => `${row.status.en} ${row.status.zh}`).join(" ");

    expect(allStatuses).toContain("beta");
    expect(allStatuses).toContain("alpha");
    expect(allStatuses).not.toContain("production-ready");
  });

  it("keeps the hero product-facing instead of construction-facing", () => {
    const heroText = `${siteCopy.en.hero.title} ${siteCopy.en.hero.body} ${siteCopy.zh.hero.title} ${siteCopy.zh.hero.body}`;

    expect(siteCopy.en.hero.title).toContain("Accept digital vouchers");
    expect(siteCopy.zh.hero.title).toContain("数字提货券可以收款");
    expect(heroText).not.toContain("alpha/pilot infrastructure");
    expect(heroText).not.toContain("live certification");
    expect(heroText).not.toContain("施工");
  });

  it("states the mission inside the Phase 0 beta boundary", () => {
    expect(siteCopy.en.mission.noClaimBody).toContain("outside the protocol boundary");
    expect(siteCopy.zh.mission.noClaimBody).toContain("不属于协议核心边界");
    expect(siteCopy.en.mission.missionBody).toContain("PaymentIntent");
    expect(siteCopy.zh.mission.wish).toContain("真实 evidence");
    expect(siteCopy.en.mission.loopSteps).toHaveLength(6);
    expect(siteCopy.zh.mission.loopSteps).toHaveLength(siteCopy.en.mission.loopSteps.length);
  });

  it("does not use broad crypto voucher launch language on the official site", () => {
    expect(JSON.stringify(siteCopy.en)).not.toMatch(/crypto-native|BRC-20|Santa-Claus|token-launch/);
    expect(JSON.stringify(siteCopy.zh)).not.toMatch(/圣诞老人|每一张加密兑换券|BRC20|有地方可兑/);
    expect(pageMetadata).not.toMatch(/crypto-native|加密原生兑换券|每一张加密兑换券|有地方可兑/);
  });

  it("links the website to the local developer path", () => {
    expect(quickStartCommands).toContain("pnpm verify");
    expect(quickStartCommands).toContain("pnpm site:dev");
    expect(siteCopy.en.footer.domain).toContain("redeemloop.aifund.com");
    expect(siteCopy.zh.footer.domain).toContain("redeemloop.aifund.com");
  });

  it("keeps footer product entries descriptive", () => {
    expect(siteCopy.en.footer.primaryLinks.map((link) => link.href)).toEqual(["#mission", "#use-cases", "#integrations"]);
    expect(siteCopy.zh.footer.primaryLinks.map((link) => link.label)).toEqual(["使命", "场景", "集成"]);

    for (const locale of ["en", "zh"] as const) {
      for (const link of siteCopy[locale].footer.primaryLinks) {
        expect(link.body.length).toBeGreaterThan(24);
      }
    }
  });

  it("does not use smooth anchor scrolling", () => {
    expect(css).not.toContain("scroll-behavior: smooth");
    expect(css).toContain("scroll-behavior: auto");
  });

  it("keeps the language menu limited to pure Chinese and English releases", () => {
    expect(languageOptions.map((language) => language.code).sort()).toEqual(["en", "zh"]);
    expect(languageOptions.map((language) => language.href).sort()).toEqual(["/", "/en"]);

    for (const language of languageOptions) {
      expect(language.label.en).not.toMatch(/[\p{Script=Han}]/u);
      expect(language.label.zh.length).toBeGreaterThan(1);
    }
  });

  it("adds visual simulation content without presenting it as real evidence", () => {
    expect(simulationVisualCards).toHaveLength(4);
    expect(humanSignals).toHaveLength(3);
    expect(siteCopy.en.simulationStudio.disclaimer).toContain("simulated");
    expect(siteCopy.zh.simulationStudio.disclaimer).toContain("仿真");

    for (const card of simulationVisualCards) {
      expect(card.body.en.length).toBeGreaterThan(24);
      expect(card.proof.zh.length).toBeGreaterThan(6);
    }
  });

  it("exposes the 100-brand simulation library by industry", () => {
    const brands = brandSimulationIndustries.flatMap((industry) => industry.brands);

    expect(brandSimulationIndustries).toHaveLength(10);
    expect(brands).toHaveLength(100);
    expect(new Set(brands.map((brand) => brand.name)).size).toBe(100);

    for (const industry of brandSimulationIndustries) {
      expect(industry.brands).toHaveLength(10);
      expect(industry.label.en.length).toBeGreaterThan(4);
      expect(industry.label.zh.length).toBeGreaterThan(2);
      expect(industry.stages.claim.en.length).toBeGreaterThan(12);
      expect(industry.stages.claim.zh.length).toBeGreaterThan(6);
      expect(industry.stages.redeem.en.length).toBeGreaterThan(12);
      expect(industry.stages.loop.zh.length).toBeGreaterThan(6);

      for (const brand of industry.brands) {
        expect(brand.officialSite).toMatch(/^https:\/\//);
        expect(brand.storeEntry).toMatch(/^https:\/\//);
        expect(brand.offer.en.length).toBeGreaterThan(12);
        expect(brand.offer.zh.length).toBeGreaterThan(4);
      }
    }
  });

  it("keeps brand previews inside RedeemLoop without live iframe embeds", () => {
    expect(officialSite).toContain("ScenarioPreviewOverlay");
    expect(officialSite).toContain("非合作仿真");
    expect(officialSite).not.toContain("<iframe");
    expect(css).toContain(".preview-voucher-layer");
    expect(css).toContain("preview-reference-blur");
  });

  it("keeps English website copy free of Chinese characters", () => {
    const englishScenarioCopy = scenarios.map((scenario) => ({
      status: scenario.status.en,
      title: scenario.title.en,
      summary: scenario.summary.en,
      merchant: scenario.merchant.en,
      customer: scenario.customer.en,
      result: scenario.result.en,
      steps: scenario.steps.en,
      metrics: scenario.metrics.map((metric) => metric.label.en),
    }));
    const englishReadinessCopy = readinessRows.map((row) => ({
      rail: row.rail,
      status: row.status.en,
      scope: row.scope.en,
      next: row.next.en,
    }));
    const englishSimulationCopy = {
      section: brandSimulationCopy.en,
      studio: siteCopy.en.simulationStudio,
      languageMenu: siteCopy.en.languageMenu,
      languageOptions: languageOptions.map((language) => language.label.en),
      visualCards: simulationVisualCards.map((card) => ({
        title: card.title.en,
        body: card.body.en,
        proof: card.proof.en,
      })),
      signals: humanSignals.map((signal) => ({
        label: signal.label.en,
        note: signal.note.en,
      })),
      industries: brandSimulationIndustries.map((industry) => ({
        label: industry.label.en,
        summary: industry.summary.en,
        vendorFocus: industry.vendorFocus.en,
        userFocus: industry.userFocus.en,
        stages: {
          claim: industry.stages.claim.en,
          redeem: industry.stages.redeem.en,
          loop: industry.stages.loop.en,
        },
        brands: industry.brands.map((brand) => ({
          name: brand.name,
          officialSite: brand.officialSite,
          storeEntry: brand.storeEntry,
          offer: brand.offer.en,
        })),
      })),
    };

    expect(containsHan(siteCopy.en)).toBe(false);
    expect(containsHan(englishScenarioCopy)).toBe(false);
    expect(containsHan(englishReadinessCopy)).toBe(false);
    expect(containsHan(englishSimulationCopy)).toBe(false);
  });
});
