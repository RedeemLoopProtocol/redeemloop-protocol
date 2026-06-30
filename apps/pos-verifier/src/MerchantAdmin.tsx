"use client";

import { ArrowClockwise, Database, ListChecks, Storefront, WarningCircle } from "@phosphor-icons/react";
import { RedeemLoopClient, type AuditLog, type MerchantVault, type RedeemLoopPaymentIntent, type RedemptionBinding, type WebhookDelivery, type WebhookDiagnosticsResponse, type WebhookEndpoint, type WebhookEvent } from "@redeemloop/sdk";
import { useMemo, useState } from "react";

type StepStatus = "idle" | "busy" | "done" | "error";

interface AdminState {
  vaults: MerchantVault[];
  bindings: RedemptionBinding[];
  intents: RedeemLoopPaymentIntent[];
  webhookEndpoints: WebhookEndpoint[];
  webhookEvents: WebhookEvent[];
  webhookDeliveries: WebhookDelivery[];
  webhookDiagnostics?: WebhookDiagnosticsResponse;
  auditLogs: AuditLog[];
}

const emptyState: AdminState = {
  vaults: [],
  bindings: [],
  intents: [],
  webhookEndpoints: [],
  webhookEvents: [],
  webhookDeliveries: [],
  webhookDiagnostics: undefined,
  auditLogs: [],
};

export function MerchantAdmin() {
  const [apiBaseUrl, setApiBaseUrl] = useState("http://localhost:3002");
  const [apiKey, setApiKey] = useState("");
  const [merchantId, setMerchantId] = useState("merchant_cafe");
  const [state, setState] = useState<AdminState>(emptyState);
  const [status, setStatus] = useState<StepStatus>("idle");
  const [error, setError] = useState("");

  const client = useMemo(() => new RedeemLoopClient(apiBaseUrl, apiKey || undefined), [apiBaseUrl, apiKey]);

  async function refresh() {
    setStatus("busy");
    setError("");
    try {
      const [vaults, bindings, intents, webhookEndpoints, webhookEvents, webhookDeliveries, webhookDiagnostics, auditLogs] = await Promise.all([
        client.listMerchantVaults({ merchantId }),
        client.listBindings({ merchantId }),
        client.listPaymentIntents({ merchantId }),
        client.listWebhookEndpoints({ merchantId }),
        client.listWebhookEvents({ merchantId }),
        client.listWebhookDeliveries({ merchantId }),
        client.getWebhookDiagnostics({ merchantId }),
        client.listAuditLogs({ merchantId }),
      ]);
      setState({ vaults, bindings, intents, webhookEndpoints, webhookEvents, webhookDeliveries, webhookDiagnostics, auditLogs });
      setStatus("done");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Failed to refresh merchant admin data");
    }
  }

  async function seedPilotData() {
    setStatus("busy");
    setError("");
    try {
      await client.createMerchant({ merchantId, name: "Merchant Cafe" });
      await client.createMerchantVault({
        vaultId: `vault_${merchantId}_31337`,
        merchantId,
        chainNamespace: "eip155",
        chainId: 31337,
        address: "0x0000000000000000000000000000000000000abc",
        label: "Pilot EVM receiving address",
      });
      await client.createEntitlement({
        entitlementId: `ent_${merchantId}_coffee`,
        merchantId,
        name: "Coffee pickup",
        quantity: 1,
        termsHash: "coffee-terms",
      });
      await client.createBinding({
        bindingId: `bind_${merchantId}_coffee`,
        merchantId,
        entitlementId: `ent_${merchantId}_coffee`,
        acceptedAssets: [
          {
            chainNamespace: "eip155",
            chainId: 31337,
            assetType: "erc20",
            assetId: "eip155:31337/erc20:0x0000000000000000000000000000000000000def",
            contract: "0x0000000000000000000000000000000000000def",
            requiredAmount: "1",
            termsHash: "coffee-terms",
          },
        ],
        merchantVaults: {
          "eip155:31337": "0x0000000000000000000000000000000000000abc",
        },
        settlementPolicy: "collect",
        commerceTargets: [{ platform: "woocommerce", storeId: "woo-store", sku: "coffee-cup" }],
        status: "active",
        termsHash: "coffee-terms",
      });
      await client.createWebhookEndpoint({
        id: `wh_${merchantId}_pilot`,
        merchantId,
        url: "https://merchant.example/redeemloop/webhook",
        secret: "pilot-webhook-secret",
        events: ["payment_intent.paid"],
      });
      await refresh();
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Failed to seed pilot merchant data");
    }
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1280px] gap-6">
        <section className="grid gap-5 rounded-lg border border-line bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-md border border-line bg-field p-3">
                <Storefront size={26} weight="duotone" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Merchant Admin</p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Pilot operations console</h1>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                API Base URL
                <input className="input" value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Merchant ID
                <input className="input" value={merchantId} onChange={(event) => setMerchantId(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                API Key
                <input className="input" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
              </label>
            </div>
          </div>

          <aside className="grid content-between gap-4 rounded-lg border border-line bg-field p-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">Status</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-600">Admin data</span>
                <StatusLabel status={status} />
              </div>
            </div>
            <div className="grid gap-3">
              <button className="btn-flow" onClick={refresh} disabled={status === "busy"}>
                <span className="flex items-center gap-3">
                  <ArrowClockwise size={20} weight="duotone" aria-hidden />
                  Refresh
                </span>
              </button>
              <button className="btn-flow" onClick={seedPilotData} disabled={status === "busy"}>
                <span className="flex items-center gap-3">
                  <Database size={20} weight="duotone" aria-hidden />
                  Seed pilot data
                </span>
              </button>
            </div>
          </aside>
        </section>

        {error ? (
          <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <WarningCircle size={18} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <AdminPanel title="Vaults" rows={state.vaults} />
          <AdminPanel title="Bindings" rows={state.bindings} />
          <AdminPanel title="PaymentIntents" rows={state.intents} />
          <AdminPanel title="Webhook Endpoints" rows={state.webhookEndpoints} />
          <AdminPanel title="Webhook Events" rows={state.webhookEvents} />
          <AdminPanel title="Webhook Deliveries" rows={state.webhookDeliveries} />
          <AdminPanel title="Webhook Diagnostics" rows={state.webhookDiagnostics ? [state.webhookDiagnostics] : []} />
        </section>

        <section className="rounded-lg border border-line bg-white/90 p-5 shadow-panel sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Audit</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Merchant trail</h2>
            </div>
            <ListChecks size={26} weight="duotone" aria-hidden />
          </div>
          <pre className="output">{state.auditLogs.length ? JSON.stringify(state.auditLogs, null, 2) : "No audit logs loaded."}</pre>
        </section>
      </div>
    </main>
  );
}

function AdminPanel({ title, rows }: { title: string; rows: unknown[] }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-white/90 p-5 shadow-panel sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <span className="status status-idle">{rows.length}</span>
      </div>
      <pre className="output">{rows.length ? JSON.stringify(rows, null, 2) : "No records loaded."}</pre>
    </div>
  );
}

function StatusLabel({ status }: { status: StepStatus }) {
  const label = status === "busy" ? "Working" : status === "done" ? "Ready" : status === "error" ? "Check" : "Idle";
  return <span className={`status status-${status}`}>{label}</span>;
}
