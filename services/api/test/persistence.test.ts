import { describe, expect, it } from "vitest";

import {
  createApiPersistence,
  createPostgresSnapshotPersistence,
  type PostgresSnapshotClient,
  type RedeemLoopApiSnapshot,
} from "../src/persistence.js";

const emptySnapshot: RedeemLoopApiSnapshot = {
  version: 1,
  savedAt: "2026-06-30T00:00:00.000Z",
  merchants: [],
  merchantVaults: [],
  merchantReceivers: [],
  commercePayments: [],
  entitlements: [],
  bindings: [],
  paymentIntents: [],
  settlementProofs: [],
  proofIdempotency: [],
  markPaidIdempotency: [],
  webhookEndpoints: [],
  webhookEvents: [],
  webhookDeliveries: [],
  auditLogs: [],
  shortLinks: [],
  publicPaymentSessions: [],
  registeredTerminals: [],
  terminalPaymentNonces: [],
  redemptionSubmissions: [],
};

describe("RedeemLoop persistence adapters", () => {
  it("stores and restores the API snapshot through the Postgres adapter boundary", async () => {
    const client = new FakePostgresSnapshotClient();
    const persistence = createPostgresSnapshotPersistence({
      client,
      snapshotKey: "merchant-pilot",
    });

    expect(persistence.enabled).toBe(true);
    expect(persistence.kind).toBe("postgres");
    expect(await persistence.load()).toBeUndefined();

    await persistence.save({
      ...emptySnapshot,
      merchants: [{ merchantId: "merchant_cafe", name: "Merchant Cafe" }],
    });

    expect(await persistence.load()).toMatchObject({
      version: 1,
      merchants: [{ merchantId: "merchant_cafe", name: "Merchant Cafe" }],
    });
    expect(client.queries.some((query) => query.includes("CREATE TABLE IF NOT EXISTS redeemloop_api_snapshots"))).toBe(true);

    await persistence.close?.();
    expect(client.closed).toBe(true);
  });

  it("prefers Postgres persistence when both database URL and file storage are configured", async () => {
    const persistence = createApiPersistence({
      databaseUrl: "postgres://redeemloop:redeemloop@localhost:5432/redeemloop",
      storageFile: ".redeemloop/state.json",
    });

    expect(persistence.kind).toBe("postgres");
    await persistence.close?.();
  });
});

class FakePostgresSnapshotClient implements PostgresSnapshotClient {
  readonly snapshots = new Map<string, RedeemLoopApiSnapshot>();
  readonly queries: string[] = [];
  closed = false;

  async query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, values: readonly unknown[] = []): Promise<{ rows: T[] }> {
    this.queries.push(sql);
    if (sql.includes("CREATE TABLE IF NOT EXISTS redeemloop_api_snapshots")) return { rows: [] };
    if (sql.startsWith("SELECT snapshot FROM redeemloop_api_snapshots")) {
      const snapshot = this.snapshots.get(String(values[0]));
      return { rows: snapshot ? ([{ snapshot }] as unknown as T[]) : [] };
    }
    if (sql.startsWith("INSERT INTO redeemloop_api_snapshots")) {
      this.snapshots.set(String(values[0]), JSON.parse(String(values[2])) as RedeemLoopApiSnapshot);
      return { rows: [] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  }

  async end(): Promise<void> {
    this.closed = true;
  }
}
