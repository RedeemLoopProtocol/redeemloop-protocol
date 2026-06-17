"use client";

import { CheckCircle, Code, CreditCard, Package, Storefront, WarningCircle } from "@phosphor-icons/react";
import { RedeemLoopPayButton, RedeemLoopProvider, type RedeemLoopPayFlowResult } from "@redeemloop/react";
import { RedeemLoopClient } from "@redeemloop/sdk";
import { mountRedeemLoopPayButton, type RedeemLoopWidgetInstance } from "@redeemloop/widget";
import { useEffect, useMemo, useRef, useState } from "react";

const demo = {
  merchantId: "merchant_cafe",
  merchantName: "Merchant Cafe",
  vaultId: "vault_merchant_cafe_31337",
  bindingId: "bind_merchant_cafe_coffee_cup",
  entitlementId: "ent_coffee",
  token: "0x0000000000000000000000000000000000000def" as const,
  merchantVault: "0x0000000000000000000000000000000000000abc" as const,
  payerAddress: "0x0000000000000000000000000000000000000123" as const,
  chainId: 31337,
  assetId: "eip155:31337/erc20:0x0000000000000000000000000000000000000def",
  sku: "coffee-cup",
  orderId: "demo-order-1001",
  amount: "1",
  termsHash: "coffee-terms",
};

type StepStatus = "idle" | "busy" | "done" | "error";

export function DemoStore() {
  const [apiBaseUrl, setApiBaseUrl] = useState("http://localhost:8787");
  const [seedStatus, setSeedStatus] = useState<StepStatus>("idle");
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState("");
  const [reactResult, setReactResult] = useState<RedeemLoopPayFlowResult | null>(null);
  const [widgetEvents, setWidgetEvents] = useState<string[]>([]);
  const widgetHostRef = useRef<HTMLDivElement | null>(null);
  const widgetInstanceRef = useRef<RedeemLoopWidgetInstance | null>(null);

  const client = useMemo(() => new RedeemLoopClient(apiBaseUrl), [apiBaseUrl]);
  const txids = useMemo(() => {
    const entropy = `${Date.now().toString(16)}${Math.floor(Math.random() * 0xffff).toString(16)}`;
    return {
      react: `0x${entropy}01`,
      widget: `0x${entropy}02`,
    };
  }, []);

  useEffect(() => {
    const host = widgetHostRef.current;
    if (!host || !seeded) return;

    host.innerHTML = "";
    widgetInstanceRef.current?.destroy();
    const instance = mountRedeemLoopPayButton(host, {
      apiBaseUrl,
      bindingId: demo.bindingId,
      orderId: `${demo.orderId}-widget`,
      sku: demo.sku,
      quantity: 1,
      payerAddress: demo.payerAddress,
      balance: "1",
      txid: txids.widget,
      autoSubmitProof: true,
      label: "Pay with script widget",
      paidLabel: "Widget paid",
    });
    widgetInstanceRef.current = instance;

    const eventNames = ["redeemloop:intent", "redeemloop:balance", "redeemloop:transfer", "redeemloop:broadcasted", "redeemloop:paid", "redeemloop:error"];
    const listeners = eventNames.map((eventName) => {
      const listener = (event: Event) => {
        const customEvent = event as CustomEvent;
        setWidgetEvents((current) => [`${eventName}: ${JSON.stringify(customEvent.detail)}`, ...current].slice(0, 6));
      };
      host.addEventListener(eventName, listener);
      return { eventName, listener };
    });

    return () => {
      listeners.forEach(({ eventName, listener }) => host.removeEventListener(eventName, listener));
      instance.destroy();
      if (widgetInstanceRef.current === instance) widgetInstanceRef.current = null;
    };
  }, [apiBaseUrl, seeded]);

  async function seedDemoBinding() {
    setError("");
    setSeedStatus("busy");
    try {
      await client.createMerchant({ merchantId: demo.merchantId, name: demo.merchantName });
      await client.createMerchantVault({
        vaultId: demo.vaultId,
        merchantId: demo.merchantId,
        chainNamespace: "eip155",
        chainId: demo.chainId,
        address: demo.merchantVault,
        label: "Cafe EVM receiving address",
      });
      await client.createEntitlement({
        entitlementId: demo.entitlementId,
        merchantId: demo.merchantId,
        name: "Coffee pickup",
        quantity: 1,
        termsHash: demo.termsHash,
      });
      await client.createBinding({
        bindingId: demo.bindingId,
        merchantId: demo.merchantId,
        entitlementId: demo.entitlementId,
        acceptedAssets: [
          {
            chainNamespace: "eip155",
            chainId: demo.chainId,
            assetType: "erc20",
            assetId: demo.assetId,
            contract: demo.token,
            requiredAmount: demo.amount,
            termsHash: demo.termsHash,
          },
        ],
        merchantVaults: {
          [`eip155:${demo.chainId}`]: demo.merchantVault,
        },
        settlementPolicy: "collect",
        commerceTargets: [
          {
            platform: "woocommerce",
            storeId: "woo-store",
            sku: demo.sku,
          },
        ],
        status: "active",
        termsHash: demo.termsHash,
      });
      setSeeded(true);
      setSeedStatus("done");
    } catch (cause) {
      setSeedStatus("error");
      setSeeded(false);
      setError(cause instanceof Error ? cause.message : "Failed to seed demo binding");
    }
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1280px] gap-6">
        <section className="grid gap-5 rounded-lg border border-line bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="min-w-0">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-md border border-line bg-field p-3">
                <Storefront size={26} weight="duotone" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">RedeemLoop Demo Store</p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Coffee pickup checkout</h1>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
              <div className="grid aspect-square place-items-center rounded-lg border border-line bg-field">
                <Package size={54} weight="duotone" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight">1 Coffee pickup entitlement</h2>
                <dl className="mt-4 grid gap-2 text-sm">
                  <SummaryRow label="SKU" value={demo.sku} />
                  <SummaryRow label="Voucher" value={`${demo.amount} ERC-20 unit`} />
                  <SummaryRow label="Receiver" value={demo.merchantVault} />
                </dl>
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-line bg-field p-4">
            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              API Base URL
              <input className="input" value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} />
            </label>
            <button className="btn-flow mt-4" onClick={seedDemoBinding} disabled={seedStatus === "busy"}>
              <span className="flex items-center gap-3">
                <CheckCircle size={20} weight="duotone" aria-hidden />
                Seed demo binding
              </span>
              <StatusLabel status={seedStatus} />
            </button>
            {error ? (
              <div className="mt-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <WarningCircle size={18} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="min-w-0 rounded-lg border border-line bg-white/90 p-5 shadow-panel sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">React Embed</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Pay Button package</h2>
              </div>
              <CreditCard size={26} weight="duotone" aria-hidden />
            </div>
            <RedeemLoopProvider client={client}>
              <RedeemLoopPayButton
                bindingId={demo.bindingId}
                orderId={`${demo.orderId}-react`}
                channel="checkout"
                skuLines={[{ sku: demo.sku, quantity: 1 }]}
                payerAddress={demo.payerAddress}
                balance="1"
                txid={txids.react}
                autoSubmitProof
                disabled={!seeded}
                labels={{
                  idle: "Pay with React button",
                  paid: "React payment paid",
                }}
                onComplete={setReactResult}
                onError={(paymentError) => setError(paymentError.message)}
              />
            </RedeemLoopProvider>
            <pre className="output mt-5">{reactResult ? JSON.stringify(reactResult, null, 2) : seeded ? "React button is ready." : "Seed the demo binding first."}</pre>
          </div>

          <div className="min-w-0 rounded-lg border border-line bg-white/90 p-5 shadow-panel sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Script Embed</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Widget mount</h2>
              </div>
              <Code size={26} weight="duotone" aria-hidden />
            </div>
            <div ref={widgetHostRef} className="min-h-11" />
            <pre className="output mt-5">{widgetEvents.length ? widgetEvents.join("\n\n") : seeded ? "Script widget is ready." : "Seed the demo binding first."}</pre>
          </div>
        </section>
      </div>
    </main>
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
