"use client";

import {
  ArrowClockwise,
  CheckCircle,
  CreditCard,
  LinkSimple,
  ShieldCheck,
  Storefront,
  WarningCircle,
  Wallet,
} from "@phosphor-icons/react";
import { createEip1193EvmWalletAdapter, EvmWalletError, formatEvmWalletErrorForMerchant } from "@redeemloop/adapters";
import { RedeemLoopClient, type PublicPaymentSessionResponse, type PublicTransferRequestResponse } from "@redeemloop/sdk";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { shortenHash } from "./redeemLink";

type HostedLookup = "short-link" | "intent";
type StepStatus = "idle" | "busy" | "done" | "error";

interface HostedPaymentPageProps {
  lookup: HostedLookup;
}

const defaultApiBaseUrl = process.env.NEXT_PUBLIC_REDEEMLOOP_API_BASE_URL ?? "http://localhost:3002";

export function HostedPaymentPage({ lookup }: HostedPaymentPageProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const routeId = firstParam(lookup === "short-link" ? params.slug : params.intentId);
  const checkoutToken = searchParams.get("checkoutToken") ?? searchParams.get("token") ?? "";
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultApiBaseUrl);
  const [session, setSession] = useState<PublicPaymentSessionResponse | null>(null);
  const [transfer, setTransfer] = useState<PublicTransferRequestResponse["transfer"] | null>(null);
  const [txid, setTxid] = useState("");
  const [status, setStatus] = useState<StepStatus>("idle");
  const [refreshStatus, setRefreshStatus] = useState<StepStatus>("idle");
  const [error, setError] = useState("");
  const [events, setEvents] = useState<string[]>([]);

  const client = useMemo(() => new RedeemLoopClient(apiBaseUrl), [apiBaseUrl]);
  const intent = session?.paymentIntent;
  const asset = intent?.selectedAsset ?? intent?.acceptedAssets[0];
  const isPaid = intent?.status === "paid";
  const expiresAt = intent ? new Date(intent.expiresAt) : null;
  const expired = expiresAt ? expiresAt.getTime() <= Date.now() && !isPaid : false;

  useEffect(() => {
    void loadSession();
  }, [client, routeId, checkoutToken, lookup]);

  async function loadSession() {
    if (!routeId || !checkoutToken) {
      setError("Payment link is missing its checkout token.");
      return;
    }
    setRefreshStatus("busy");
    setError("");
    try {
      const loaded =
        lookup === "short-link"
          ? await client.getPublicShortLink(routeId, { checkoutToken })
          : await client.getPublicPaymentSession(routeId, { checkoutToken });
      setSession(loaded);
      setRefreshStatus("done");
      pushEvent(`Loaded ${loaded.paymentIntent.intentId} as ${loaded.paymentIntent.status}`);
    } catch (cause) {
      setRefreshStatus("error");
      setError(messageFromError(cause));
    }
  }

  async function payWithWallet() {
    if (!intent) return;
    if (!asset) {
      setError("PaymentIntent has no accepted voucher asset.");
      return;
    }
    if (asset.chainNamespace !== "eip155" || asset.assetType !== "erc20") {
      setError("Hosted payment page currently supports EVM ERC-20 voucher tender.");
      return;
    }
    if (!window.ethereum) {
      setError("No injected EVM wallet found.");
      return;
    }

    setStatus("busy");
    setError("");
    try {
      const wallet = createEip1193EvmWalletAdapter(window.ethereum);
      const account = await wallet.connect({
        chainId: asset.chainId,
        switchChain: true,
      });
      pushEvent(`Wallet connected ${shortenHash(account.address, 8)}`);

      const connected = await client.connectPublicPaymentSessionWallet(intent.intentId, {
        checkoutToken,
        payerAddress: account.address,
      });
      setSession(connected);

      const requested = await client.requestPublicPaymentSessionTransfer(intent.intentId, {
        checkoutToken,
        payerAddress: account.address,
        assetId: asset.assetId,
      });
      if (!requested.transfer.evm) throw new Error("EVM transfer request is missing.");
      setSession(requested);
      setTransfer(requested.transfer);
      pushEvent("Transfer request prepared");

      const submittedTxid = await wallet.sendErc20Transfer(requested.transfer.evm, {
        from: account.address,
        switchChain: true,
      });
      setTxid(submittedTxid);
      pushEvent(`Wallet submitted ${shortenHash(submittedTxid, 8)}`);

      const broadcasted = await client.markPublicPaymentSessionBroadcasted(intent.intentId, {
        checkoutToken,
        txid: submittedTxid,
      });
      setSession(broadcasted);
      pushEvent("Transaction broadcast recorded");

      const proof = await client.recheckPublicPaymentSessionEvmSettlement(intent.intentId, {
        checkoutToken,
        txid: submittedTxid,
        from: account.address,
      });
      if (proof.paymentIntent) {
        setSession((current) => current ? { ...current, paymentIntent: proof.paymentIntent! } : current);
      }
      setStatus(proof.paymentIntent?.status === "paid" ? "done" : "idle");
      pushEvent(`Settlement rechecked as ${proof.paymentIntent?.status ?? proof.status}`);
    } catch (cause) {
      setStatus("error");
      setError(messageFromError(cause));
    }
  }

  function pushEvent(event: string) {
    setEvents((current) => [`${new Date().toLocaleTimeString()} ${event}`, ...current].slice(0, 6));
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1180px] gap-6 lg:grid-cols-[minmax(0,1.1fr)_380px]">
        <section className="min-w-0 rounded-lg border border-line bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">RedeemLoop Hosted Payment</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Voucher tender checkout
              </h1>
            </div>
            <div className="rounded-md border border-line bg-field p-3">
              <Storefront size={28} weight="duotone" aria-hidden />
            </div>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-[132px_minmax(0,1fr)]">
            <div className="grid aspect-square place-items-center rounded-lg border border-line bg-field">
              <CreditCard size={58} weight="duotone" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={intent?.status ?? "loading"} />
                {session?.publicSession.channel ? <span className="status status-idle">{session.publicSession.channel}</span> : null}
              </div>
              <h2 className="mt-4 break-words text-2xl font-semibold tracking-tight">
                {intent?.orderId ?? "Loading payment"}
              </h2>
              <dl className="mt-5 grid gap-3 text-sm">
                <SummaryRow label="Merchant" value={intent?.merchantId ?? "Waiting"} />
                <SummaryRow label="Intent" value={intent?.intentId ?? routeId ?? "Waiting"} />
                <SummaryRow label="Asset" value={asset ? readableAsset(asset) : "Waiting"} />
                <SummaryRow label="Amount" value={asset?.requiredAmount ?? "Waiting"} />
                <SummaryRow label="Receiver" value={intent?.merchantVault ? shortenHash(intent.merchantVault, 8) : "Waiting"} />
                <SummaryRow label="Expires" value={expiresAt ? expiresAt.toLocaleString() : "Waiting"} />
              </dl>
            </div>
          </div>

          {error ? (
            <div className="mt-6 flex gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <WarningCircle size={20} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button className="btn-flow" onClick={payWithWallet} disabled={!intent || status === "busy" || isPaid || expired}>
              <span className="flex items-center gap-3">
                {isPaid ? <CheckCircle size={20} weight="duotone" aria-hidden /> : <Wallet size={20} weight="duotone" aria-hidden />}
                {isPaid ? "Payment complete" : status === "busy" ? "Waiting for wallet" : "Pay with EVM wallet"}
              </span>
              <StatusText status={isPaid ? "done" : status} />
            </button>
            <button className="btn-flow" onClick={loadSession} disabled={refreshStatus === "busy"}>
              <span className="flex items-center gap-3">
                <ArrowClockwise size={20} weight="duotone" aria-hidden />
                Refresh payment status
              </span>
              <StatusText status={refreshStatus} />
            </button>
          </div>
        </section>

        <aside className="grid min-w-0 gap-6">
          <section className="rounded-lg border border-line bg-white/90 p-5 shadow-panel backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Session</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">Payment link</h2>
              </div>
              <ShieldCheck size={24} weight="duotone" aria-hidden />
            </div>
            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              API Base URL
              <input className="input" value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} />
            </label>
            <dl className="mt-5 grid gap-3 text-sm">
              <SummaryRow label="Lookup" value={lookup === "short-link" ? "Short link" : "Intent"} />
              <SummaryRow label="Route" value={routeId ?? "Missing"} />
              <SummaryRow label="Token" value={checkoutToken ? `${checkoutToken.slice(0, 8)}...` : "Missing"} />
              <SummaryRow label="Tx" value={txid ? shortenHash(txid, 8) : "Waiting"} />
            </dl>
          </section>

          <section className="rounded-lg border border-line bg-white/90 p-5 shadow-panel backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Settlement</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">Events</h2>
              </div>
              <LinkSimple size={24} weight="duotone" aria-hidden />
            </div>
            <pre className="output">{events.length ? events.join("\n") : "No checkout events yet."}</pre>
          </section>

          <section className="rounded-lg border border-line bg-field p-5">
            <dl className="grid gap-3 text-sm">
              <SummaryRow label="Transfer" value={transfer?.evm ? "ERC-20 calldata ready" : "Waiting"} />
              <SummaryRow label="Chain" value={asset?.chainId ? String(asset.chainId) : "Waiting"} />
              <SummaryRow label="Policy" value={intent?.settlementPolicy ?? "Waiting"} />
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readableAsset(asset: NonNullable<PublicPaymentSessionResponse["paymentIntent"]["acceptedAssets"][number]>): string {
  if (asset.chainNamespace === "eip155" && asset.contract) return `${asset.assetType.toUpperCase()} ${shortenHash(asset.contract, 8)}`;
  return asset.assetId;
}

function messageFromError(cause: unknown): string {
  if (cause instanceof EvmWalletError) return formatEvmWalletErrorForMerchant(cause);
  if (cause instanceof Error) return cause.message;
  return "Hosted payment failed.";
}

function StatusPill({ status }: { status: string }) {
  const className =
    status === "paid" || status === "confirmed"
      ? "status status-done"
      : status === "failed" || status === "expired" || status === "cancelled"
        ? "status status-error"
        : status === "loading"
          ? "status status-busy"
          : "status status-idle";
  return <span className={className}>{status}</span>;
}

function StatusText({ status }: { status: StepStatus }) {
  const label = status === "busy" ? "Working" : status === "done" ? "Done" : status === "error" ? "Check" : "Ready";
  return <span className={`status status-${status}`}>{label}</span>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line pt-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="break-all text-right font-mono text-zinc-800">{value}</dd>
    </div>
  );
}
