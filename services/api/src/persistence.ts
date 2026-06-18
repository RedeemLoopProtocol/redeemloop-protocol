import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

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
  auditLogs?: unknown[];
  shortLinks?: unknown[];
  registeredTerminals: string[];
  terminalPaymentNonces?: string[];
  redemptionSubmissions: string[];
}

export interface JsonFilePersistence {
  enabled: boolean;
  load: () => Promise<RedeemLoopApiSnapshot | undefined>;
  save: (snapshot: RedeemLoopApiSnapshot) => Promise<void>;
}

export function createJsonFilePersistence(filePath: string | undefined): JsonFilePersistence {
  if (!filePath) {
    return {
      enabled: false,
      load: async () => undefined,
      save: async () => undefined,
    };
  }

  return {
    enabled: true,
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

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT";
}
