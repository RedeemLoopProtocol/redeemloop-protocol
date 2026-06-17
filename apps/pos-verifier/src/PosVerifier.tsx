"use client";

import {
  ArrowClockwise,
  CheckCircle,
  ClipboardText,
  CreditCard,
  Key,
  LinkSimple,
  QrCode,
  Receipt,
  ShieldCheck,
  Storefront,
  WarningCircle,
  Wallet,
} from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState, type ReactNode } from "react";
import { createWalletClient, custom, getAddress, isAddress, type Hex } from "viem";

import { createRedeemLink, shortenHash } from "./redeemLink";
import type { CommercePaymentResponse, CommerceProvider, RedemptionIntentResponse, RedemptionModeName } from "./types";

type StepStatus = "idle" | "busy" | "done" | "error";

interface FormState {
  apiBaseUrl: string;
  chainId: string;
  merchantId: string;
  storeId: string;
  terminalId: string;
  operatorWallet: string;
  token: string;
  merchantReceiver: string;
  commerceProvider: CommerceProvider;
  commerceOrderId: string;
  termsHash: string;
  amount: string;
  redemptionMode: RedemptionModeName;
}

const initialForm: FormState = {
  apiBaseUrl: "http://localhost:8787",
  chainId: "31337",
  merchantId: "coca-cola-japan",
  storeId: "tokyo-store-001",
  terminalId: "pos-07",
  operatorWallet: "0x0000000000000000000000000000000000000abc",
  token: "0x0000000000000000000000000000000000000def",
  merchantReceiver: "0x0000000000000000000000000000000000000abc",
  commerceProvider: "shopify",
  commerceOrderId: "148977776",
  termsHash: "coke-bottle-2026",
  amount: "1",
  redemptionMode: "COLLECT",
};

export function PosVerifier() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [intent, setIntent] = useState<RedemptionIntentResponse | null>(null);
  const [signature, setSignature] = useState<Hex | "">("");
  const [commercePayment, setCommercePayment] = useState<CommercePaymentResponse | null>(null);
  const [submitResult, setSubmitResult] = useState<{ status: string; dryRun: boolean; txHash: string | null } | null>(
    null,
  );
  const [status, setStatus] = useState<Record<string, StepStatus>>({
    terminal: "idle",
    intent: "idle",
    wallet: "idle",
    signature: "idle",
    submit: "idle",
    receiver: "idle",
    commerceIntent: "idle",
    markPaid: "idle",
    paymentButton: "idle",
  });
  const [error, setError] = useState<string>("");

  const chainId = Number(form.chainId);
  const redeemLink = useMemo(() => (intent ? createRedeemLink(intent.authorization, chainId) : ""), [chainId, intent]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function registerTerminal() {
    await runStep("terminal", async () => {
      await registerTerminalRequest();
    });
  }

  async function connectWallet() {
    await runStep("wallet", async () => {
      if (!window.ethereum) {
        throw new Error("No injected wallet found. Open the demo in a wallet-enabled browser.");
      }
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const account = accounts[0];
      if (!account || !isAddress(account)) {
        throw new Error("Wallet did not return a valid EVM account.");
      }
      setWalletAddress(getAddress(account));
    });
  }

  async function createIntent() {
    await runStep("intent", async () => {
      const payload = await createIntentRequest(walletAddress || form.operatorWallet);
      setIntent(payload);
      setSignature("");
      setSubmitResult(null);
    });
  }

  async function signIntent() {
    await runStep("signature", async () => {
      if (!window.ethereum) {
        throw new Error("No injected wallet found.");
      }
      if (!intent) throw new Error("Create a redemption intent first.");
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const account = accounts[0];
      if (!account || !isAddress(account)) throw new Error("Wallet did not return a valid EVM account.");

      const walletClient = createWalletClient({
        account: getAddress(account),
        transport: custom(window.ethereum),
      });
      const signed = await walletClient.signTypedData({
        ...intent.typedData,
        message: {
          ...intent.typedData.message,
          tokenId: BigInt(intent.typedData.message.tokenId),
          amount: BigInt(intent.typedData.message.amount),
          nonce: BigInt(intent.typedData.message.nonce),
          deadline: BigInt(intent.typedData.message.deadline),
        },
      });
      setWalletAddress(getAddress(account));
      setSignature(signed);
    });
  }

  async function submitRedemption() {
    await runStep("submit", async () => {
      if (!intent) throw new Error("Create a redemption intent first.");
      if (!signature) throw new Error("Sign the redemption intent first.");
      const response = await fetch(`${form.apiBaseUrl}/v1/redemptions/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId,
          authorization: intent.authorization,
          signature,
        }),
      });
      const payload = (await assertOk(response)) as { status: string; dryRun: boolean; txHash: string | null };
      setSubmitResult(payload);
    });
  }

  async function saveMerchantReceiver() {
    await runStep("receiver", async () => {
      await saveMerchantReceiverRequest();
    });
  }

  async function createCommercePayment() {
    await runStep("commerceIntent", async () => {
      const payload = await createCommercePaymentRequest();
      setCommercePayment(payload);
    });
  }

  async function markCommercePaid() {
    await runStep("markPaid", async () => {
      const response = await fetch(`${form.apiBaseUrl}/v1/commerce/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: form.commerceProvider,
          chainId,
          merchantId: form.merchantId,
          orderId: form.commerceOrderId,
          voucherToken: form.token,
          amount: form.amount,
          receiver: form.merchantReceiver,
          txHash: submitResult?.txHash ?? undefined,
          redemptionId: intent?.authorization.nonce,
        }),
      });
      const payload = (await assertOk(response)) as CommercePaymentResponse;
      setCommercePayment(payload);
    });
  }

  async function runVoucherPaymentButton() {
    await runStep("paymentButton", async () => {
      await registerTerminalRequest();
      setStatus((current) => ({ ...current, terminal: "done" }));
      await saveMerchantReceiverRequest();
      setStatus((current) => ({ ...current, receiver: "done" }));
      const nextIntent = await createIntentRequest(walletAddress || form.operatorWallet);
      setIntent(nextIntent);
      setSignature("");
      setSubmitResult(null);
      setStatus((current) => ({ ...current, intent: "done" }));
      const payment = await createCommercePaymentRequest();
      setCommercePayment(payment);
      setStatus((current) => ({ ...current, commerceIntent: "done" }));
    });
  }

  async function registerTerminalRequest() {
    const response = await fetch(`${form.apiBaseUrl}/v1/terminals/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantId: form.merchantId,
        storeId: form.storeId,
        terminalId: form.terminalId,
        operatorWallet: form.operatorWallet,
      }),
    });
    await assertOk(response);
  }

  async function saveMerchantReceiverRequest() {
    const response = await fetch(`${form.apiBaseUrl}/v1/merchants/${encodeURIComponent(form.merchantId)}/receiving-address`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chainId,
        receivingAddress: form.merchantReceiver,
      }),
    });
    await assertOk(response);
  }

  async function createIntentRequest(user: string) {
    if (!isAddress(user)) throw new Error("Connect a wallet or provide a valid operator wallet first.");
    const response = await fetch(`${form.apiBaseUrl}/v1/redemptions/intents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chainId,
        user,
        token: form.token,
        amount: form.amount,
        merchantId: form.merchantId,
        storeId: form.storeId,
        terminalId: form.terminalId,
        termsHash: form.termsHash,
        redemptionMode: form.redemptionMode,
      }),
    });
    return (await assertOk(response)) as RedemptionIntentResponse;
  }

  async function createCommercePaymentRequest() {
    const response = await fetch(`${form.apiBaseUrl}/v1/commerce/payment-intents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: form.commerceProvider,
        chainId,
        merchantId: form.merchantId,
        orderId: form.commerceOrderId,
        voucherToken: form.token,
        amount: form.amount,
        receiver: form.merchantReceiver,
      }),
    });
    return (await assertOk(response)) as CommercePaymentResponse;
  }

  async function runStep(key: string, action: () => Promise<void>) {
    setError("");
    setStatus((current) => ({ ...current, [key]: "busy" }));
    try {
      await action();
      setStatus((current) => ({ ...current, [key]: "done" }));
    } catch (stepError) {
      setStatus((current) => ({ ...current, [key]: "error" }));
      setError(stepError instanceof Error ? stepError.message : "Unexpected POS verifier error");
    }
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1400px] gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)]">
        <section className="min-w-0 rounded-lg border border-line bg-white/88 p-5 shadow-panel backdrop-blur sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">RedeemLoop Phase 0</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">POS Verifier</h1>
            </div>
            <div className="rounded-md border border-line bg-field p-3">
              <Storefront size={26} weight="duotone" aria-hidden />
            </div>
          </div>

          <div className="grid gap-4">
            <Field label="API Base URL">
              <input
                className="input"
                value={form.apiBaseUrl}
                onChange={(event) => updateField("apiBaseUrl", event.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Chain ID">
                <input
                  className="input font-mono"
                  value={form.chainId}
                  onChange={(event) => updateField("chainId", event.target.value)}
                />
              </Field>
              <Field label="Amount">
                <input
                  className="input font-mono"
                  value={form.amount}
                  onChange={(event) => updateField("amount", event.target.value)}
                />
              </Field>
            </div>
            <Field label="Voucher Token">
              <input
                className="input font-mono"
                value={form.token}
                onChange={(event) => updateField("token", event.target.value)}
              />
            </Field>
            <Field label="Merchant Receiver">
              <input
                className="input font-mono"
                value={form.merchantReceiver}
                onChange={(event) => updateField("merchantReceiver", event.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Commerce Provider">
                <select
                  className="input"
                  value={form.commerceProvider}
                  onChange={(event) => updateField("commerceProvider", event.target.value as CommerceProvider)}
                >
                  <option value="shopify">Shopify</option>
                  <option value="woocommerce">WooCommerce</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>
              <Field label="Commerce Order ID">
                <input
                  className="input"
                  value={form.commerceOrderId}
                  onChange={(event) => updateField("commerceOrderId", event.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Merchant ID">
                <input
                  className="input"
                  value={form.merchantId}
                  onChange={(event) => updateField("merchantId", event.target.value)}
                />
              </Field>
              <Field label="Store ID">
                <input className="input" value={form.storeId} onChange={(event) => updateField("storeId", event.target.value)} />
              </Field>
            </div>
            <Field label="Terminal ID">
              <input
                className="input"
                value={form.terminalId}
                onChange={(event) => updateField("terminalId", event.target.value)}
              />
            </Field>
            <Field label="Operator Wallet">
              <input
                className="input font-mono"
                value={form.operatorWallet}
                onChange={(event) => updateField("operatorWallet", event.target.value)}
              />
            </Field>
            <Field label="Terms Hash or Terms Key">
              <input className="input" value={form.termsHash} onChange={(event) => updateField("termsHash", event.target.value)} />
            </Field>
            <Field label="Redemption Mode">
              <select
                className="input"
                value={form.redemptionMode}
                onChange={(event) => updateField("redemptionMode", event.target.value as RedemptionModeName)}
              >
                <option value="COLLECT">COLLECT</option>
                <option value="BURN">BURN</option>
              </select>
            </Field>
          </div>

          {error ? (
            <div className="mt-5 flex gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <WarningCircle size={20} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}
        </section>

        <section className="grid min-w-0 gap-6">
          <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <ActionPanel
              icon={<ShieldCheck size={24} weight="duotone" aria-hidden />}
              title="Terminal"
              status={status.terminal}
              primaryLabel="Register"
              onPrimary={registerTerminal}
            >
              <p className="text-sm leading-6 text-zinc-600">
                {form.storeId} / {form.terminalId}
              </p>
            </ActionPanel>
            <ActionPanel
              icon={<Wallet size={24} weight="duotone" aria-hidden />}
              title="Wallet"
              status={status.wallet}
              primaryLabel={walletAddress ? "Reconnect" : "Connect"}
              onPrimary={connectWallet}
            >
              <p className="break-all font-mono text-sm leading-6 text-zinc-600">
                {walletAddress ? shortenHash(walletAddress, 8) : "Waiting for wallet account"}
              </p>
            </ActionPanel>
            <ActionPanel
              icon={<CreditCard size={24} weight="duotone" aria-hidden />}
              title="Voucher Payment"
              status={status.paymentButton}
              primaryLabel="Pay"
              onPrimary={runVoucherPaymentButton}
            >
              <p className="break-all text-sm leading-6 text-zinc-600">
                {form.commerceProvider} / {form.commerceOrderId || "order"}
              </p>
            </ActionPanel>
          </div>

          <div className="rounded-lg border border-line bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6">
            <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Redemption</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">Authorization Flow</h2>
                  </div>
                  <QrCode size={28} weight="duotone" aria-hidden />
                </div>

                <div className="mt-6 grid gap-3">
                  <FlowButton icon={<ClipboardText size={20} aria-hidden />} label="Create Intent" status={status.intent} onClick={createIntent} />
                  <FlowButton icon={<Key size={20} aria-hidden />} label="Sign EIP-712" status={status.signature} onClick={signIntent} />
                  <FlowButton icon={<ArrowClockwise size={20} aria-hidden />} label="Submit Relayer" status={status.submit} onClick={submitRedemption} />
                </div>
              </div>

              <div className="w-full min-w-0 rounded-lg border border-line bg-field p-4 lg:w-[280px]">
                <div className="grid place-items-center rounded-md bg-white p-4">
                  {redeemLink ? (
                    <QRCodeSVG value={redeemLink} size={196} marginSize={2} fgColor="#171a1f" bgColor="#ffffff" />
                  ) : (
                    <div className="grid h-[196px] w-[196px] place-items-center border border-dashed border-line bg-field text-center text-sm text-zinc-500">
                      Create an intent
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-start gap-2 text-xs text-zinc-600">
                  <LinkSimple size={16} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
                  <p className="break-all font-mono">{redeemLink || "redeemloop://redeem"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6">
            <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Commerce</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">Mark-as-paid Flow</h2>
                  </div>
                  <Receipt size={28} weight="duotone" aria-hidden />
                </div>

                <div className="mt-6 grid gap-3">
                  <FlowButton
                    icon={<Storefront size={20} aria-hidden />}
                    label="Save Receiver"
                    status={status.receiver}
                    onClick={saveMerchantReceiver}
                  />
                  <FlowButton
                    icon={<CreditCard size={20} aria-hidden />}
                    label="Create Payment"
                    status={status.commerceIntent}
                    onClick={createCommercePayment}
                  />
                  <FlowButton icon={<CheckCircle size={20} aria-hidden />} label="Mark Paid" status={status.markPaid} onClick={markCommercePaid} />
                </div>
              </div>

              <div className="w-full min-w-0 rounded-lg border border-line bg-field p-4 lg:w-[320px]">
                <dl className="grid gap-3 text-sm">
                  <ResultRow label="Provider" value={form.commerceProvider} />
                  <ResultRow label="Order" value={form.commerceOrderId || "Missing"} />
                  <ResultRow label="Receiver" value={shortenHash(form.merchantReceiver, 8)} />
                  <ResultRow label="Payment" value={commercePayment ? commercePayment.status : "Not created"} />
                </dl>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
            <OutputPanel title="Authorization">
              <pre className="output">{intent ? JSON.stringify(intent.authorization, null, 2) : "No intent created yet."}</pre>
            </OutputPanel>
            <OutputPanel title="Result">
              {submitResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-accent">
                    <CheckCircle size={22} weight="duotone" aria-hidden />
                    <span className="font-medium">{submitResult.status}</span>
                  </div>
                  <dl className="grid gap-3 text-sm">
                    <ResultRow label="Dry Run" value={String(submitResult.dryRun)} />
                    <ResultRow label="Tx Hash" value={submitResult.txHash ? shortenHash(submitResult.txHash, 10) : "Not submitted"} />
                    <ResultRow label="Signature" value={signature ? shortenHash(signature, 10) : "Missing"} />
                  </dl>
                </div>
              ) : (
                <p className="text-sm leading-6 text-zinc-600">No relayer response yet.</p>
              )}
            </OutputPanel>
            <OutputPanel title="Commerce">
              <pre className="output">{commercePayment ? JSON.stringify(commercePayment, null, 2) : "No commerce payment yet."}</pre>
            </OutputPanel>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      {children}
    </label>
  );
}

function ActionPanel({
  icon,
  title,
  status,
  primaryLabel,
  onPrimary,
  children,
}: {
  icon: ReactNode;
  title: string;
  status: StepStatus;
  primaryLabel: string;
  onPrimary: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-white/90 p-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-line bg-field p-2">{icon}</div>
          <div>
            <h2 className="font-semibold tracking-tight">{title}</h2>
            <StatusLabel status={status} />
          </div>
        </div>
        <button className="btn-secondary" onClick={onPrimary} disabled={status === "busy"}>
          {primaryLabel}
        </button>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function FlowButton({ icon, label, status, onClick }: { icon: ReactNode; label: string; status: StepStatus; onClick: () => void }) {
  return (
    <button className="btn-flow" onClick={onClick} disabled={status === "busy"}>
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      <StatusLabel status={status} />
    </button>
  );
}

function OutputPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-white/90 p-5 shadow-panel">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">{title}</h2>
      {children}
    </div>
  );
}

function StatusLabel({ status }: { status: StepStatus }) {
  const label = status === "busy" ? "Working" : status === "done" ? "Ready" : status === "error" ? "Check" : "Idle";
  return <span className={`status status-${status}`}>{label}</span>;
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line pt-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="break-all text-right font-mono text-zinc-800">{value}</dd>
    </div>
  );
}

async function assertOk(response: Response): Promise<unknown> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : `Request failed with ${response.status}`);
  }
  return payload;
}
