import { describe, expect, it } from "vitest";

import { quickStartCommands, readinessRows, scenarios, siteCopy } from "../src/content";

describe("site content", () => {
  it("keeps scenario model bilingual and actionable", () => {
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

  it("links the website to the local developer path", () => {
    expect(quickStartCommands).toContain("pnpm verify");
    expect(quickStartCommands).toContain("pnpm site:dev");
    expect(siteCopy.en.footer.domain).toContain("redeemloop.aifund.com");
    expect(siteCopy.zh.footer.domain).toContain("redeemloop.aifund.com");
  });
});
