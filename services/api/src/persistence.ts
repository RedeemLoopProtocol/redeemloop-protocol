import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import pg from "pg";

const { Pool } = pg;

export interface RedeemLoopApiSnapshot {
  version: 1;
  savedAt: string;
  merchants: unknown[];
  merchantVaults: unknown[];
  merchantReceivers: unknown[];
  commercePayments: unknown[];
  entitlements: unknown[];
  bindings: unknown[];
  paymentIntents: unknown[];
  settlementProofs: unknown[];
  proofIdempotency: Array<[string, string]>;
  markPaidIdempotency: string[];
  webhookEndpoints: unknown[];
  webhookEvents?: unknown[];
  webhookDeliveries?: unknown[];
  webhookWorkerDrains?: unknown[];
  auditLogs?: unknown[];
  shortLinks?: unknown[];
  publicPaymentSessions?: unknown[];
  registeredTerminals: string[];
  terminalPaymentNonces?: string[];
  redemptionSubmissions: string[];
}

export type ApiPersistenceKind = "none" | "json-file" | "postgres";

export interface ApiPersistence {
  enabled: boolean;
  kind: ApiPersistenceKind;
  load: () => Promise<RedeemLoopApiSnapshot | undefined>;
  save: (snapshot: RedeemLoopApiSnapshot) => Promise<void>;
  close?: () => Promise<void>;
}

export interface ApiPersistenceConfig {
  storageFile?: string;
  databaseUrl?: string;
  snapshotKey?: string;
}

export function createApiPersistence(config: ApiPersistenceConfig): ApiPersistence {
  if (config.databaseUrl) {
    return createPostgresSnapshotPersistence({
      connectionString: config.databaseUrl,
      snapshotKey: config.snapshotKey,
    });
  }
  return createJsonFilePersistence(config.storageFile);
}

export function createJsonFilePersistence(filePath: string | undefined): ApiPersistence {
  if (!filePath) {
    return {
      enabled: false,
      kind: "none",
      load: async () => undefined,
      save: async () => undefined,
    };
  }

  return {
    enabled: true,
    kind: "json-file",
    load: async () => {
      try {
        const raw = await readFile(filePath, "utf8");
        return JSON.parse(raw) as RedeemLoopApiSnapshot;
      } catch (error) {
        if (isMissingFileError(error)) return undefined;
        throw error;
      }
    },
    save: async (snapshot) => {
      await mkdir(dirname(filePath), { recursive: true });
      const tmpPath = `${filePath}.${process.pid}.tmp`;
      await writeFile(tmpPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
      await rename(tmpPath, filePath);
    },
  };
}

export interface PostgresSnapshotPersistenceOptions {
  connectionString?: string;
  snapshotKey?: string;
  client?: PostgresSnapshotClient;
}

export interface PostgresSnapshotClient {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(sql: string, values?: readonly unknown[]) => Promise<{ rows: T[] }>;
  end?: () => Promise<void>;
}

export const postgresSnapshotSchemaSql = `
CREATE TABLE IF NOT EXISTS redeemloop_api_snapshots (
  id text PRIMARY KEY,
  snapshot_version integer NOT NULL,
  snapshot jsonb NOT NULL,
  saved_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;

export function createPostgresSnapshotPersistence(options: PostgresSnapshotPersistenceOptions): ApiPersistence {
  const snapshotKey = options.snapshotKey ?? "default";
  const client = options.client ?? createPostgresPool(options.connectionString);
  let schemaReady: Promise<void> | undefined;

  async function ensureSchema() {
    schemaReady ??= client.query(postgresSnapshotSchemaSql).then(() => undefined);
    await schemaReady;
  }

  return {
    enabled: true,
    kind: "postgres",
    load: async () => {
      await ensureSchema();
      const result = await client.query<{ snapshot: RedeemLoopApiSnapshot }>(
        "SELECT snapshot FROM redeemloop_api_snapshots WHERE id = $1",
        [snapshotKey],
      );
      return result.rows[0]?.snapshot;
    },
    save: async (snapshot) => {
      await ensureSchema();
      await client.query(
        `INSERT INTO redeemloop_api_snapshots (id, snapshot_version, snapshot, saved_at, updated_at)
         VALUES ($1, $2, $3::jsonb, $4::timestamptz, now())
         ON CONFLICT (id)
         DO UPDATE SET
           snapshot_version = EXCLUDED.snapshot_version,
           snapshot = EXCLUDED.snapshot,
           saved_at = EXCLUDED.saved_at,
           updated_at = now()`,
        [snapshotKey, snapshot.version, JSON.stringify(snapshot), snapshot.savedAt],
      );
    },
    close: async () => {
      await client.end?.();
    },
  };
}

function createPostgresPool(connectionString: string | undefined): PostgresSnapshotClient {
  if (!connectionString) throw new Error("REDEEMLOOP_DATABASE_URL is required for Postgres persistence");
  return new Pool({ connectionString }) as PostgresSnapshotClient;
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT";
}
