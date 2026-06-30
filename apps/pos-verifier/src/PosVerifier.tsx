"use client";

import {
  CheckCircle,
  ClipboardText,
  CreditCard,
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
import { getAddress, isAddress } from "viem";

import { createPaymentLink, shortenHash } from "./redeemLink";
import type { BalanceCheckResponse, BindingResponse, CommerceProvider, PaymentIntentResponse, PosPaymentIntentResponse, SettlementProofResponse, ShortLinkPaymentIntentResponse } from "./types";

type StepStatus = "idle" | "busy" | "done" | "error";

interface FormState {
  apiBaseUrl: string;
  merchantId: string;
  merchantName: string;
  chainId: string;
  token: string;
  assetId: string;
  merchantVault: string;
  entitlementId: string;
  entitlementName: string;
  termsHash: string;
  amount: string;
  sku: string;
  commerceProvider: CommerceProvider;
  storeId: string;
  orderId: string;
  terminalId: string;
  terminalNonce: string;
  shortSlug: string;
  shortBaseUrl: string;
  payerAddress: string;
  walletBalance: string;
  txid: string;
}

const initialForm: FormState = {
  apiBaseUrl: "http://localhost:3002",
  merchantId: "merchant_cafe",
  merchantName: "Merchant Cafe",
  chainId: "31337",
  token: "0x0000000000000000000000000000000000000def",
  assetId: "eip155:31337/erc20:0x0000000000000000000000000000000000000def",
  merchantVault: "0x0000000000000000000000000000000000000abc",
  entitlementId: "ent_coffee",
  entitlementName: "Coffee pickup",
  termsHash: "coffee-terms",
  amount: "1",
  sku: "coffee-cup",
  commerceProvider: "woocommerce",
  storeId: "woo-store",
  orderId: "42",
  terminalId: "pos-07",
  terminalNonce: "nonce-1",
  shortSlug: "live-drop",
  shortBaseUrl: "http://localhost:3000",
  payerAddress: "0x0000000000000000000000000000000000000123",
  walletBalance: "1",
  txid: "0x1234",
};

export function PosVerifier() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [binding, setBinding] = useState<BindingResponse | null>(null);
  const [intent, setIntent] = useState<PaymentIntentResponse | null>(null);
  const [balanceCheck, setBalanceCheck] = useState<BalanceCheckResponse["balanceCheck"] | null>(null);
  const [transferRequest, setTransferRequest] = useState<PaymentIntentResponse["transfer"] | null>(null);
  const [proof, setProof] = useState<SettlementProofResponse | null>(null);
  const [posQr, setPosQr] = useState<PosPaymentIntentResponse["qr"] | null>(null);
  const [shortLink, setShortLink] = useState<ShortLinkPaymentIntentResponse["shortLink"] | null>(null);
  const [status, setStatus] = useState<Record<string, StepStatus>>({
    binding: "idle",
    wallet: "idle",
    intent: "idle",
    balance: "idle",
    transfer: "idle",
    proof: "idle",
    payButton: "idle",
    terminal: "idle",
    posQr: "idle",
    shortLink: "idle",
    poll: "idle",
  });
  const [error, setError] = useState<string>("");

  const chainId = Number(form.chainId);
  const paymentLink = useMemo(() => (intent ? createPaymentLink(intent) : ""), [intent]);
  const effectivePayer = walletAddress || form.payerAddress;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function connectWallet() {
    await runStep("wallet", async () => {
      if (!window.ethereum) throw new Error("No injected wallet found. Use the payer address field or open a wallet-enabled browser.");
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const account = accounts[0];
      if (!account || !isAddress(account)) throw new Error("Wallet did not return a valid EVM account.");
      setWalletAddress(getAddress(account));
      updateField("payerAddress", getAddress(account));
    });
  }

  async function createAssetBinding() {
    await runStep("binding", async () => {
      const created = await createAssetBindingRequest();
      setBinding(created);
      setIntent(null);
      setBalanceCheck(null);
      setTransferRequest(null);
      setProof(null);
    });
  }

  async function createIntent() {
    await runStep("intent", async () => {
      const activeBinding = binding ?? (await createAssetBindingRequest());
      setBinding(activeBinding);
      const created = await createPaymentIntentRequest(activeBinding.bindingId);
      setIntent(created);
      setBalanceCheck(null);
      setTransferRequest(null);
      setProof(null);
    });
  }

  async function requestTransfer() {
    await runStep("transfer", async () => {
      const activeIntent = intent ?? (await createPaymentIntentRequest((binding ?? (await createAssetBindingRequest())).bindingId));
      const requested = await requestTransferRequest(activeIntent.intentId);
      setIntent(requested);
      setTransferRequest(requested.transfer ?? null);
    });
  }

  async function checkBalance() {
    await runStep("balance", async () => {
      const activeBinding = binding ?? (await createAssetBindingRequest());
      setBinding(activeBinding);
      const activeIntent = intent ?? (await createPaymentIntentRequest(activeBinding.bindingId));
      const checked = await checkBalanceRequest(activeIntent.intentId);
      setIntent(checked);
      setBalanceCheck(checked.balanceCheck);
      setTransferRequest(null);
    });
  }

  async function confirmReceipt() {
    await runStep("proof", async () => {
      const activeBinding = binding ?? (await createAssetBindingRequest());
      setBinding(activeBinding);
      const activeIntent = intent ?? (await createPaymentIntentRequest(activeBinding.bindingId));
      if (!balanceCheck) {
        const checked = await checkBalanceRequest(activeIntent.intentId);
        setIntent(checked);
        setBalanceCheck(checked.balanceCheck);
      }
      const requested = activeIntent.status === "transfer_requested" ? activeIntent : await requestTransferRequest(activeIntent.intentId);
      setIntent(requested);
      setTransferRequest(requested.transfer ?? null);
      const confirmed = await submitSettlementProofRequest(requested);
      setProof(confirmed);
      if (confirmed.paymentIntent) setIntent({ ...confirmed.paymentIntent, transfer: requested.transfer });
    });
  }

  async function runVoucherPaymentButton() {
    await runStep("payButton", async () => {
      const activeBinding = await createAssetBindingRequest();
      setBinding(activeBinding);
      setStatus((current) => ({ ...current, binding: "done" }));
      const created = await createPaymentIntentRequest(activeBinding.bindingId);
      setIntent(created);
      setStatus((current) => ({ ...current, intent: "done" }));
      const checked = await checkBalanceRequest(created.intentId);
      setIntent(checked);
      setBalanceCheck(checked.balanceCheck);
      setStatus((current) => ({ ...current, balance: "done" }));
      const requested = await requestTransferRequest(created.intentId);
      setIntent(requested);
      setTransferRequest(requested.transfer ?? null);
      setStatus((current) => ({ ...current, transfer: "done" }));
      const confirmed = await submitSettlementProofRequest(requested);
      setProof(confirmed);
      if (confirmed.paymentIntent) setIntent({ ...confirmed.paymentIntent, transfer: requested.transfer });
      setStatus((current) => ({ ...current, proof: "done" }));
    });
  }

  async function registerTerminal() {
    await runStep("terminal", async () => {
      await postJson("/v1/terminals/register", {
        merchantId: form.merchantId,
        storeId: form.storeId,
        terminalId: form.terminalId,
        operatorWallet: form.merchantVault,
      });
    });
  }

  async function createPosQrIntent() {
    await runStep("posQr", async () => {
      const activeBinding = binding ?? (await createAssetBindingRequest("pos"));
      setBinding(activeBinding);
      await postJson("/v1/terminals/register", {
        merchantId: form.merchantId,
        storeId: form.storeId,
        terminalId: form.terminalId,
        operatorWallet: form.merchantVault,
      });
      const created = await postJson<PosPaymentIntentResponse>("/v1/pos/payment-intents", {
        bindingId: activeBinding.bindingId,
        storeId: form.storeId,
        terminalId: form.terminalId,
        terminalNonce: form.terminalNonce,
        baseUrl: form.shortBaseUrl,
        orderId: form.orderId,
        payerAddress: effectivePayer,
      });
      setIntent(created.paymentIntent);
      setPosQr(created.qr);
    });
  }

  async function createShortLinkIntent() {
    await runStep("shortLink", async () => {
      const activeBinding = binding ?? (await createAssetBindingRequest("livestream"));
      setBinding(activeBinding);
      const created = await postJson<ShortLinkPaymentIntentResponse>("/v1/short-links/payment-intents", {
        bindingId: activeBinding.bindingId,
        slug: form.shortSlug,
        baseUrl: form.shortBaseUrl,
        channel: "livestream",
        orderId: form.orderId,
        payerAddress: effectivePayer,
      });
      setIntent(created.paymentIntent);
      setShortLink(created.shortLink);
    });
  }

  async function refreshPaymentIntent() {
    await runStep("poll", async () => {
      if (!intent) throw new Error("No PaymentIntent to refresh.");
      const response = await fetch(`${form.apiBaseUrl}/v1/payment-intents/${encodeURIComponent(intent.intentId)}`);
      setIntent((await assertOk(response)) as PaymentIntentResponse);
    });
  }

  async function createAssetBindingRequest(platformOverride?: CommerceProvider | "pos" | "livestream") {
    const bindingId = `bind_${safeId(form.merchantId)}_${safeId(form.sku)}`;

    await postJson("/v1/merchants", {
      merchantId: form.merchantId,
      name: form.merchantName,
    });
    await postJson("/v1/merchant-vaults", {
      vaultId: `vault_${safeId(form.merchantId)}_${chainId}`,
      merchantId: form.merchantId,
      chainNamespace: "eip155",
      chainId,
      address: form.merchantVault,
    });
    await postJson("/v1/entitlements", {
      entitlementId: form.entitlementId,
      merchantId: form.merchantId,
      name: form.entitlementName,
      quantity: 1,
      termsHash: form.termsHash,
    });
    return postJson<BindingResponse>("/v1/bindings", {
      bindingId,
      merchantId: form.merchantId,
      entitlementId: form.entitlementId,
      acceptedAssets: [
        {
          chainNamespace: "eip155",
          chainId,
          assetType: "erc20",
          assetId: form.assetId,
          contract: form.token,
          requiredAmount: form.amount,
          termsHash: form.termsHash,
        },
      ],
      merchantVaults: {
        [`eip155:${chainId}`]: form.merchantVault,
      },
      settlementPolicy: "collect",
      commerceTargets: [
        {
          platform: platformOverride ?? form.commerceProvider,
          storeId: form.storeId,
          sku: form.sku,
        },
      ],
      status: "active",
      termsHash: form.termsHash,
    });
  }

  async function createPaymentIntentRequest(bindingId: string) {
    return postJson<PaymentIntentResponse>("/v1/payment-intents", {
      bindingId,
      orderId: form.orderId,
      channel: "checkout",
      skuLines: [{ sku: form.sku, quantity: 1 }],
      payerAddress: effectivePayer,
    });
  }

  async function requestTransferRequest(intentId: string) {
    return postJson<PaymentIntentResponse>(`/v1/payment-intents/${encodeURIComponent(intentId)}/transfer-requested`, {
      payerAddress: effectivePayer,
    });
  }

  async function checkBalanceRequest(intentId: string) {
    return postJson<BalanceCheckResponse>(`/v1/payment-intents/${encodeURIComponent(intentId)}/check-balance`, {
      payerAddress: effectivePayer,
      balance: form.walletBalance,
    });
  }

  async function submitSettlementProofRequest(activeIntent: PaymentIntentResponse) {
    const asset = activeIntent.selectedAsset ?? activeIntent.acceptedAssets[0];
    return postJson<SettlementProofResponse>("/v1/settlement/proofs", {
      intentId: activeIntent.intentId,
      chainNamespace: asset.chainNamespace,
      chainId: asset.chainId,
      txid: form.txid,
      blockNumber: 12,
      confirmations: 3,
      from: effectivePayer,
      to: activeIntent.merchantVault,
      assetType: asset.assetType,
      assetId: asset.assetId,
      contract: asset.contract,
      amount: asset.requiredAmount,
      status: "confirmed",
    });
  }

  async function postJson<T>(path: string, payload: unknown): Promise<T> {
    const response = await fetch(`${form.apiBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return (await assertOk(response)) as T;
  }

  async function runStep(key: string, action: () => Promise<void>) {
    setError("");
    setStatus((current) => ({ ...current, [key]: "busy" }));
    try {
      await action();
      setStatus((current) => ({ ...current, [key]: "done" }));
    } catch (stepError) {
      setStatus((current) => ({ ...current, [key]: "error" }));
      setError(stepError instanceof Error ? stepError.message : "Unexpected payment console error");
    }
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1400px] gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)]">
        <section className="min-w-0 rounded-lg border border-line bg-white/88 p-5 shadow-panel backdrop-blur sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">RedeemLoop Phase 0</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Asset Binding Console</h1>
            </div>
            <div className="rounded-md border border-line bg-field p-3">
              <Storefront size={26} weight="duotone" aria-hidden />
            </div>
          </div>

          <div className="grid gap-4">
            <Field label="API Base URL">
              <input className="input" value={form.apiBaseUrl} onChange={(event) => updateField("apiBaseUrl", event.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Merchant ID">
                <input className="input" value={form.merchantId} onChange={(event) => updateField("merchantId", event.target.value)} />
              </Field>
              <Field label="Merchant Name">
                <input className="input" value={form.merchantName} onChange={(event) => updateField("merchantName", event.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Chain ID">
                <input className="input font-mono" value={form.chainId} onChange={(event) => updateField("chainId", event.target.value)} />
              </Field>
              <Field label="Required Amount">
                <input className="input font-mono" value={form.amount} onChange={(event) => updateField("amount", event.target.value)} />
              </Field>
            </div>
            <Field label="Existing ERC-20 Contract">
              <input className="input font-mono" value={form.token} onChange={(event) => updateField("token", event.target.value)} />
            </Field>
            <Field label="Asset ID">
              <input className="input font-mono" value={form.assetId} onChange={(event) => updateField("assetId", event.target.value)} />
            </Field>
            <Field label="Merchant Receiving Address">
              <input className="input font-mono" value={form.merchantVault} onChange={(event) => updateField("merchantVault", event.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Entitlement ID">
                <input className="input" value={form.entitlementId} onChange={(event) => updateField("entitlementId", event.target.value)} />
              </Field>
              <Field label="Entitlement Name">
                <input className="input" value={form.entitlementName} onChange={(event) => updateField("entitlementName", event.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Commerce Provider">
                <select className="input" value={form.commerceProvider} onChange={(event) => updateField("commerceProvider", event.target.value as CommerceProvider)}>
                  <option value="woocommerce">WooCommerce</option>
                  <option value="shopify">Shopify</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>
              <Field label="Store ID">
                <input className="input" value={form.storeId} onChange={(event) => updateField("storeId", event.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SKU">
                <input className="input" value={form.sku} onChange={(event) => updateField("sku", event.target.value)} />
              </Field>
              <Field label="Order ID">
                <input className="input" value={form.orderId} onChange={(event) => updateField("orderId", event.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Terminal ID">
                <input className="input" value={form.terminalId} onChange={(event) => updateField("terminalId", event.target.value)} />
              </Field>
              <Field label="Terminal Nonce">
                <input className="input" value={form.terminalNonce} onChange={(event) => updateField("terminalNonce", event.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Short Slug">
                <input className="input" value={form.shortSlug} onChange={(event) => updateField("shortSlug", event.target.value)} />
              </Field>
              <Field label="Short Base URL">
                <input className="input" value={form.shortBaseUrl} onChange={(event) => updateField("shortBaseUrl", event.target.value)} />
              </Field>
            </div>
            <Field label="Terms Hash or Terms Key">
              <input className="input" value={form.termsHash} onChange={(event) => updateField("termsHash", event.target.value)} />
            </Field>
            <Field label="Payer Address">
              <input className="input font-mono" value={form.payerAddress} onChange={(event) => updateField("payerAddress", event.target.value)} />
            </Field>
            <Field label="Wallet Balance">
              <input className="input font-mono" value={form.walletBalance} onChange={(event) => updateField("walletBalance", event.target.value)} />
            </Field>
            <Field label="Receipt Tx ID">
              <input className="input font-mono" value={form.txid} onChange={(event) => updateField("txid", event.target.value)} />
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
              title="Asset Binding"
              status={status.binding}
              primaryLabel="Create"
              onPrimary={createAssetBinding}
            >
              <p className="break-all text-sm leading-6 text-zinc-600">{binding ? binding.bindingId : "No binding created"}</p>
            </ActionPanel>
            <ActionPanel
              icon={<Wallet size={24} weight="duotone" aria-hidden />}
              title="Wallet"
              status={status.wallet}
              primaryLabel={walletAddress ? "Reconnect" : "Connect"}
              onPrimary={connectWallet}
            >
              <p className="break-all font-mono text-sm leading-6 text-zinc-600">
                {effectivePayer ? shortenHash(effectivePayer, 8) : "Payer address required"}
              </p>
            </ActionPanel>
            <ActionPanel
              icon={<CreditCard size={24} weight="duotone" aria-hidden />}
              title="Voucher Tender"
              status={status.payButton}
              primaryLabel="Run"
              onPrimary={runVoucherPaymentButton}
            >
              <p className="break-all text-sm leading-6 text-zinc-600">
                {form.commerceProvider} / {form.orderId || "order"}
              </p>
            </ActionPanel>
            <ActionPanel
              icon={<QrCode size={24} weight="duotone" aria-hidden />}
              title="POS QR"
              status={status.posQr}
              primaryLabel="Create"
              onPrimary={createPosQrIntent}
            >
              <p className="break-all text-sm leading-6 text-zinc-600">{posQr ? posQr.terminalNonce : "Register terminal and create QR"}</p>
            </ActionPanel>
            <ActionPanel
              icon={<LinkSimple size={24} weight="duotone" aria-hidden />}
              title="Short Link"
              status={status.shortLink}
              primaryLabel="Create"
              onPrimary={createShortLinkIntent}
            >
              <p className="break-all text-sm leading-6 text-zinc-600">{shortLink ? shortLink.url : "Livestream payment link"}</p>
            </ActionPanel>
            <ActionPanel
              icon={<ShieldCheck size={24} weight="duotone" aria-hidden />}
              title="Terminal"
              status={status.terminal}
              primaryLabel="Register"
              onPrimary={registerTerminal}
            >
              <p className="break-all text-sm leading-6 text-zinc-600">{form.storeId} / {form.terminalId}</p>
            </ActionPanel>
          </div>

          <div className="rounded-lg border border-line bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6">
            <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">PaymentIntent</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">Voucher Payment Flow</h2>
                  </div>
                  <QrCode size={28} weight="duotone" aria-hidden />
                </div>

                <div className="mt-6 grid gap-3">
                  <FlowButton icon={<ClipboardText size={20} aria-hidden />} label="Create PaymentIntent" status={status.intent} onClick={createIntent} />
                  <FlowButton icon={<Wallet size={20} aria-hidden />} label="Check Balance" status={status.balance} onClick={checkBalance} />
                  <FlowButton icon={<CreditCard size={20} aria-hidden />} label="Request Transfer" status={status.transfer} onClick={requestTransfer} />
                  <FlowButton icon={<Receipt size={20} aria-hidden />} label="Confirm Receipt" status={status.proof} onClick={confirmReceipt} />
                </div>
              </div>

              <div className="w-full min-w-0 rounded-lg border border-line bg-field p-4 lg:w-[280px]">
                <div className="grid place-items-center rounded-md bg-white p-4">
                  {posQr ? (
                    <QRCodeSVG value={JSON.stringify(posQr)} size={196} marginSize={2} fgColor="#171a1f" bgColor="#ffffff" />
                  ) : paymentLink ? (
                    <QRCodeSVG value={paymentLink} size={196} marginSize={2} fgColor="#171a1f" bgColor="#ffffff" />
                  ) : (
                    <div className="grid h-[196px] w-[196px] place-items-center border border-dashed border-line bg-field text-center text-sm text-zinc-500">
                      Create PaymentIntent
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-start gap-2 text-xs text-zinc-600">
                  <LinkSimple size={16} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
                  <p className="break-all font-mono">{posQr ? posQr.paymentUrl : shortLink ? shortLink.url : paymentLink || "redeemloop://pay"}</p>
                </div>
                <button className="btn-secondary mt-4 w-full" onClick={refreshPaymentIntent} disabled={!intent || status.poll === "busy"}>
                  Refresh status
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6">
            <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Receipt Confirmation</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">Mark-as-paid Adapter</h2>
                  </div>
                  <CheckCircle size={28} weight="duotone" aria-hidden />
                </div>

                <dl className="mt-6 grid gap-3 text-sm">
                  <ResultRow label="Intent" value={intent ? intent.status : "Not created"} />
                  <ResultRow label="Balance" value={balanceCheck ? (balanceCheck.hasSufficientBalance ? "Sufficient" : `Short ${balanceCheck.shortfall}`) : "Not checked"} />
                  <ResultRow label="Transfer" value={transferRequest?.evm ? "ERC-20 calldata ready" : "Waiting"} />
                  <ResultRow label="Receiver" value={shortenHash(form.merchantVault, 8)} />
                  <ResultRow label="Proof" value={proof ? proof.status : "Not submitted"} />
                  <ResultRow label="Commerce" value={proof?.commerce ? `${proof.commerce.provider} dry-run` : "Waiting"} />
                </dl>
              </div>

              <div className="w-full min-w-0 rounded-lg border border-line bg-field p-4 lg:w-[320px]">
                <dl className="grid gap-3 text-sm">
                  <ResultRow label="Asset" value={shortenHash(form.assetId, 8)} />
                  <ResultRow label="Amount" value={form.amount} />
                  <ResultRow label="Order" value={form.orderId || "Missing"} />
                  <ResultRow label="Tx" value={shortenHash(form.txid, 8)} />
                </dl>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
            <OutputPanel title="Binding">
              <pre className="output">{binding ? JSON.stringify(binding, null, 2) : "No binding created yet."}</pre>
            </OutputPanel>
            <OutputPanel title="PaymentIntent">
              <pre className="output">{intent ? JSON.stringify(intent, null, 2) : "No PaymentIntent created yet."}</pre>
            </OutputPanel>
            <OutputPanel title="Balance Check">
              <pre className="output">{balanceCheck ? JSON.stringify(balanceCheck, null, 2) : "No balance check created yet."}</pre>
            </OutputPanel>
            <OutputPanel title="Transfer Request">
              <pre className="output">{transferRequest ? JSON.stringify(transferRequest, null, 2) : "No transfer request created yet."}</pre>
            </OutputPanel>
            <OutputPanel title="Proof">
              <pre className="output">{proof ? JSON.stringify(proof, null, 2) : "No receipt proof submitted yet."}</pre>
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
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : `Request failed with ${response.status}`);
  return payload;
}

function safeId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}
