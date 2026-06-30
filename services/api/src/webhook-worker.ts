interface DrainWebhookDeliveriesResponse {
  checkedAt: string;
  attempted: number;
  delivered: number;
  failed: number;
  deadLetter: number;
}

interface WebhookWorkerConfig {
  apiBaseUrl: string;
  apiKey?: string;
  merchantId?: string;
  workerId: string;
  intervalMs: number;
  requestTimeoutMs: number;
  limit: number;
  leaseMs?: number;
  once: boolean;
}

const config = readWebhookWorkerConfig(process.env);
let stopping = false;

process.on("SIGINT", () => {
  stopping = true;
});

process.on("SIGTERM", () => {
  stopping = true;
});

await runWebhookWorker(config);

async function runWebhookWorker(input: WebhookWorkerConfig): Promise<void> {
  console.log(`RedeemLoop webhook worker ${input.workerId} draining ${input.apiBaseUrl}`);
  while (!stopping) {
    try {
      const result = await drainOnce(input);
      console.log(
        JSON.stringify({
          workerId: input.workerId,
          checkedAt: result.checkedAt,
          attempted: result.attempted,
          delivered: result.delivered,
          failed: result.failed,
          deadLetter: result.deadLetter,
        }),
      );
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Webhook worker drain failed");
      if (input.once) {
        process.exitCode = 1;
        return;
      }
    }

    if (input.once) return;
    await sleep(input.intervalMs);
  }
}

async function drainOnce(input: WebhookWorkerConfig): Promise<DrainWebhookDeliveriesResponse> {
  const body: Record<string, unknown> = {
    limit: input.limit,
    workerId: input.workerId,
  };
  if (input.merchantId) body.merchantId = input.merchantId;
  if (input.leaseMs) body.leaseMs = input.leaseMs;

  const headers = new Headers({ "Content-Type": "application/json" });
  if (input.apiKey) headers.set("Authorization", `Bearer ${input.apiKey}`);

  const response = await fetch(new URL("/v1/webhook-deliveries/drain-pending", input.apiBaseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(input.requestTimeoutMs),
  });
  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(`Webhook worker drain failed with HTTP ${response.status}: ${rawBody}`);
  }
  return JSON.parse(rawBody) as DrainWebhookDeliveriesResponse;
}

function readWebhookWorkerConfig(env: NodeJS.ProcessEnv): WebhookWorkerConfig {
  return {
    apiBaseUrl: normalizeUrl(env.REDEEMLOOP_API_BASE_URL ?? env.API_BASE_URL ?? "http://127.0.0.1:3002"),
    apiKey: optionalString(env.REDEEMLOOP_WORKER_API_KEY ?? env.REDEEMLOOP_API_KEY),
    merchantId: optionalString(env.REDEEMLOOP_WORKER_MERCHANT_ID),
    workerId: optionalString(env.REDEEMLOOP_WORKER_ID) ?? `worker-${process.pid}`,
    intervalMs: positiveInteger(env.REDEEMLOOP_WORKER_INTERVAL_MS ?? "5000", "REDEEMLOOP_WORKER_INTERVAL_MS"),
    requestTimeoutMs: positiveInteger(env.REDEEMLOOP_WORKER_REQUEST_TIMEOUT_MS ?? "20000", "REDEEMLOOP_WORKER_REQUEST_TIMEOUT_MS"),
    limit: positiveInteger(env.REDEEMLOOP_WORKER_BATCH_SIZE ?? "25", "REDEEMLOOP_WORKER_BATCH_SIZE"),
    leaseMs: env.WEBHOOK_DELIVERY_LEASE_MS ? positiveInteger(env.WEBHOOK_DELIVERY_LEASE_MS, "WEBHOOK_DELIVERY_LEASE_MS") : undefined,
    once: env.REDEEMLOOP_WORKER_ONCE === "true",
  };
}

function normalizeUrl(value: string): string {
  const url = new URL(value);
  return url.toString();
}

function optionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function positiveInteger(value: string, name: string): number {
  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return numberValue;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
