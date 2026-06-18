"use client";

import { CheckCircle, CreditCard, Pulse, Wallet, WarningCircle } from "@phosphor-icons/react";
import { redeemLoopEvmChains } from "@redeemloop/adapters";
import { RedeemLoopPayButton, RedeemLoopProvider, type RedeemLoopPayEvent, type RedeemLoopPayFlowResult } from "@redeemloop/react";
import { RedeemLoopClient, type EvmRpcDiagnostic } from "@redeemloop/sdk";
import { useEffect, useMemo, useState } from "react";

type StepStatus = "idle" | "busy" | "done" | "error";

const defaultMerchant = {
  merchantId: "merchant_live_evm",
  merchantName: "Live EVM Merchant",
  entitlementId: "ent_live_evm_pickup",
  sku: "live-voucher-pickup",
  termsHash: "live-evm-terms",
};

export function EvmLiveCertification() {
  const [apiBaseUrl, setApiBaseUrl] = useState("http://localhost:8787");
  const [chainId, setChainId] = useState(1);
  const [tokenContract, setTokenContract] = useState("0x0000000000000000000000000000000000000def");
  const [merchantVault, setMerchantVault] = useState("0x0000000000000000000000000000000000000abc");
  const [requiredAmount, setRequiredAmount] = useState("1");
  const [walletPresent, setWalletPresent] = useState(false);
  const [seedStatus, setSeedStatus] = useState<StepStatus>("idle");
  const [diagnosticsStatus, setDiagnosticsStatus] = useState<StepStatus>("idle");
  const [bindingId, setBindingId] = useState("");
  const [events, setEvents] = useState<RedeemLoopPayEvent[]>([]);
  const [diagnostics, setDiagnostics] = useState<EvmRpcDiagnostic[]>([]);
  const [result, setResult] = useState<RedeemLoopPayFlowResult | null>(null);
  const [error, setError] = useState("");

  const client = useMemo(() => new RedeemLoopClient(apiBaseUrl), [apiBaseUrl]);
  const selectedChain = redeemLoopEvmChains.find((chain) => chain.chainId === chainId) ?? redeemLoopEvmChains[0];
  const orderId = useMemo(() => `live-evm-${chainId}-${Date.now().toString(16)}`, [chainId, bindingId]);

  useEffect(() => {
    setWalletPresent(typeof globalThis !== "undefined" && "ethereum" in globalThis);
  }, []);

  async function seedBinding() {
    setError("");
    setSeedStatus("busy");
    try {
      const nextBindingId = `bind_live_evm_${chainId}`;
      const vaultId = `vault_live_evm_${chainId}`;
      await client.createMerchant({ merchantId: defaultMerchant.merchantId, name: defaultMerchant.merchantName });
      await client.createMerchantVault({
        vaultId,
        merchantId: defaultMerchant.merchantId,
        chainNamespace: "eip155",
        chainId,
        address: merchantVault,
        label: `${selectedChain.shortName} receiving address`,
      });
      await client.createEntitlement({
        entitlementId: defaultMerchant.entitlementId,
        merchantId: defaultMerchant.merchantId,
        name: "Live EVM pickup",
        quantity: 1,
        termsHash: defaultMerchant.termsHash,
      });
      await client.createBinding({
        bindingId: nextBindingId,
        merchantId: defaultMerchant.merchantId,
        entitlementId: defaultMerchant.entitlementId,
        acceptedAssets: [
          {
            chainNamespace: "eip155",
            chainId,
            assetType: "erc20",
            assetId: `eip155:${chainId}/erc20:${tokenContract}`,
            contract: tokenContract as `0x${string}`,
            requiredAmount,
            termsHash: defaultMerchant.termsHash,
          },
        ],
        merchantVaults: {
          [`eip155:${chainId}`]: merchantVault,
        },
        settlementPolicy: "collect",
        commerceTargets: [
          {
            platform: "woocommerce",
            storeId: "live-woo-store",
            sku: defaultMerchant.sku,
          },
        ],
        status: "active",
        termsHash: defaultMerchant.termsHash,
      });
      setBindingId(nextBindingId);
      setEvents([]);
      setResult(null);
      setSeedStatus("done");
    } catch (cause) {
      setSeedStatus("error");
      setError(cause instanceof Error ? cause.message : "Failed to seed live EVM binding");
    }
  }

  async function runDiagnostics() {
    setDiagnosticsStatus("busy");
    setError("");
    try {
      const response = await client.getEvmRpcDiagnostics();
      setDiagnostics(response.chains);
      setDiagnosticsStatus(response.chains.some((chain) => chain.status !== "ok") ? "error" : "done");
    } catch (cause) {
      setDiagnosticsStatus("error");
      setError(cause instanceof Error ? cause.message : "Failed to check EVM RPC diagnostics");
    }
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1280px] gap-6">
        <section className="grid gap-5 rounded-lg border border-line bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-md border border-line bg-field p-3">
                <Wallet size={26} weight="duotone" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">EVM Live Certification</p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Wallet checkout runbook</h1>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                API Base URL
                <input className="input" value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Chain
                <select className="input" value={chainId} onChange={(event) => setChainId(Number(event.target.value))}>
                  {redeemLoopEvmChains.map((chain) => (
                    <option key={chain.chainId} value={chain.chainId}>
                      {chain.shortName} · {chain.chainId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Voucher ERC-20
                <input className="input font-mono" value={tokenContract} onChange={(event) => setTokenContract(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Merchant Vault
                <input className="input font-mono" value={merchantVault} onChange={(event) => setMerchantVault(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Required Amount
                <input className="input font-mono" value={requiredAmount} onChange={(event) => setRequiredAmount(event.target.value)} />
              </label>
              <div className="grid content-end">
                <button className="btn-flow" onClick={seedBinding} disabled={seedStatus === "busy"}>
                  <span className="flex items-center gap-3">
                    <CheckCircle size={20} weight="duotone" aria-hidden />
                    Seed live binding
                  </span>
                  <StatusLabel status={seedStatus} />
                </button>
              </div>
            </div>
          </div>

          <aside className="min-w-0 rounded-lg border border-line bg-field p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">Runtime</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">{selectedChain.name}</h2>
              </div>
              <StatusLabel status={walletPresent ? "done" : "error"} />
            </div>
            <dl className="grid gap-2 text-sm">
              <SummaryRow label="Wallet" value={walletPresent ? "Injected provider detected" : "No injected provider"} />
              <SummaryRow label="Chain ID" value={String(selectedChain.chainId)} />
              <SummaryRow label="Binding" value={bindingId || "Not seeded"} />
              <SummaryRow label="Order" value={orderId} />
            </dl>
            <button className="btn-flow mt-4" onClick={runDiagnostics} disabled={diagnosticsStatus === "busy"}>
              <span className="flex items-center gap-3">
                <Pulse size={20} weight="duotone" aria-hidden />
                Check RPC health
              </span>
              <StatusLabel status={diagnosticsStatus} />
            </button>
          </aside>
        </section>

        {error ? (
          <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <WarningCircle size={18} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="min-w-0 rounded-lg border border-line bg-white/90 p-5 shadow-panel sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Wallet Payment</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Live Pay Button</h2>
              </div>
              <CreditCard size={26} weight="duotone" aria-hidden />
            </div>
            <RedeemLoopProvider client={client}>
              <RedeemLoopPayButton
                bindingId={bindingId || `bind_live_evm_${chainId}`}
                orderId={orderId}
                channel="checkout"
                skuLines={[{ sku: defaultMerchant.sku, quantity: 1 }]}
                assetId={`eip155:${chainId}/erc20:${tokenContract}`}
                autoSendEvmTransaction
                autoRecheckEvmSettlement
                switchEvmChain
                disabled={!bindingId}
                labels={{
                  idle: "Connect wallet and pay",
                  working: "Waiting for wallet",
                  paid: "Paid and verified",
                  transferReady: "Transaction submitted",
                  error: "Check wallet",
                }}
                onEvent={(event) => setEvents((current) => [event, ...current].slice(0, 12))}
                onComplete={setResult}
                onError={(paymentError) => setError(paymentError.message)}
              />
            </RedeemLoopProvider>
            <pre className="output mt-5">
              {events.length
                ? events.map((event) => JSON.stringify(event)).join("\n")
                : bindingId
                  ? "Ready for a live wallet run."
                  : "Seed a binding before starting."}
            </pre>
          </div>

          <div className="grid min-w-0 gap-6">
            <div className="min-w-0 rounded-lg border border-line bg-white/90 p-5 shadow-panel sm:p-6">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">RPC Diagnostics</p>
              <div className="mt-4 grid gap-3">
                {diagnostics.length ? (
                  diagnostics.map((chain) => <DiagnosticRow key={chain.chainId} diagnostic={chain} />)
                ) : (
                  <div className="rounded-md border border-line bg-field p-4 text-sm text-zinc-600">No diagnostic run yet.</div>
                )}
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-line bg-white/90 p-5 shadow-panel sm:p-6">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Result</p>
              <pre className="output mt-4">{result ? JSON.stringify(result, null, 2) : "No completed payment yet."}</pre>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function DiagnosticRow({ diagnostic }: { diagnostic: EvmRpcDiagnostic }) {
  const status: StepStatus = diagnostic.status === "ok" ? "done" : "error";
  return (
    <div className="rounded-md border border-line bg-field p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium">{diagnostic.name}</h3>
          <p className="mt-1 break-all font-mono text-xs text-zinc-500">
            {diagnostic.rpcSource ?? "missing"} {diagnostic.rpcOrigin ? `· ${diagnostic.rpcOrigin}` : ""}
          </p>
        </div>
        <StatusLabel status={status} />
      </div>
      <dl className="mt-3 grid gap-2 text-sm">
        <SummaryRow label="Block" value={diagnostic.latestBlockNumber ?? "-"} />
        <SummaryRow label="Latency" value={diagnostic.latencyMs === undefined ? "-" : `${diagnostic.latencyMs}ms`} />
        {diagnostic.error ? <SummaryRow label="Error" value={diagnostic.error} /> : null}
      </dl>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line pt-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="break-all text-right font-mono text-zinc-800">{value}</dd>
    </div>
  );
}

function StatusLabel({ status }: { status: StepStatus }) {
  const label = status === "busy" ? "Working" : status === "done" ? "Ready" : status === "error" ? "Check" : "Idle";
  return <span className={`status status-${status}`}>{label}</span>;
}
