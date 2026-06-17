import { RedeemLoopClient, type TransferRequestResponse } from "@redeemloop/sdk";

export interface RedeemLoopWidgetOptions {
  apiBaseUrl: string;
  apiKey?: string;
  intentId?: string;
  bindingId?: string;
  orderId?: string;
  sku?: string;
  quantity?: number;
  payerAddress?: string;
  balance?: string;
  txid?: string;
  autoSubmitProof?: boolean;
  label?: string;
  workingLabel?: string;
  transferReadyLabel?: string;
  paidLabel?: string;
  errorLabel?: string;
}

export interface RedeemLoopWidgetInstance {
  button: HTMLButtonElement;
  destroy: () => void;
}

export function mountRedeemLoopPayButton(element: HTMLElement, options: RedeemLoopWidgetOptions): RedeemLoopWidgetInstance {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = options.label ?? "Pay with voucher";
  button.dataset.redeemloopState = "idle";
  button.style.minHeight = "44px";
  button.style.border = "1px solid #171a1f";
  button.style.borderRadius = "6px";
  button.style.background = "#171a1f";
  button.style.color = "#ffffff";
  button.style.padding = "0 16px";
  button.style.fontWeight = "700";
  button.style.cursor = "pointer";
  element.append(button);

  const client = new RedeemLoopClient(options.apiBaseUrl, options.apiKey);

  async function handleClick() {
    setButtonState(button, "working", options.workingLabel ?? "Preparing payment");
    try {
      const intent = options.intentId
        ? await client.getPaymentIntent(options.intentId)
        : await client.createPaymentIntent({
            bindingId: requireOption(options.bindingId, "bindingId"),
            orderId: requireOption(options.orderId, "orderId"),
            channel: "checkout",
            skuLines: options.sku ? [{ sku: options.sku, quantity: options.quantity ?? 1 }] : undefined,
            payerAddress: options.payerAddress,
          });
      dispatchWidgetEvent(element, "redeemloop:intent", intent);

      const checked = options.payerAddress
        ? await client.checkBalance(intent.intentId, {
            payerAddress: options.payerAddress,
            balance: options.balance,
          })
        : intent;
      if ("balanceCheck" in checked) dispatchWidgetEvent(element, "redeemloop:balance", checked.balanceCheck);

      let transferResponse = await client.requestTransfer(intent.intentId, {
        payerAddress: options.payerAddress,
      });
      dispatchWidgetEvent(element, "redeemloop:transfer", transferResponse.transfer);

      if (options.txid) {
        await client.markBroadcasted(intent.intentId, { txid: options.txid });
        dispatchWidgetEvent(element, "redeemloop:broadcasted", { txid: options.txid });
      }

      if (options.autoSubmitProof && options.txid && options.payerAddress) {
        const proof = await submitWidgetProof(client, transferResponse, options);
        setButtonState(button, "paid", options.paidLabel ?? "Paid");
        dispatchWidgetEvent(element, "redeemloop:paid", proof);
        return;
      }

      setButtonState(button, "transfer_ready", options.transferReadyLabel ?? "Transfer request ready");
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error("RedeemLoop payment failed");
      setButtonState(button, "error", options.errorLabel ?? "Check payment");
      dispatchWidgetEvent(element, "redeemloop:error", { message: error.message });
    }
  }

  button.addEventListener("click", handleClick);

  return {
    button,
    destroy: () => {
      button.removeEventListener("click", handleClick);
      button.remove();
    },
  };
}

export function autoMountRedeemLoopWidgets(root: ParentNode = document): RedeemLoopWidgetInstance[] {
  const elements = [...root.querySelectorAll<HTMLElement>("[data-redeemloop-pay-button]")].filter(
    (element) => element.dataset.redeemloopMounted !== "true",
  );
  return elements.map((element) => {
    const options = readWidgetOptions(element);
    element.dataset.redeemloopMounted = "true";
    return mountRedeemLoopPayButton(element, options);
  });
}

export function readWidgetOptions(element: HTMLElement): RedeemLoopWidgetOptions {
  const apiBaseUrl = requireDataset(element, "apiBaseUrl");
  const intentId = element.dataset.intentId;
  const bindingId = element.dataset.bindingId;
  const orderId = element.dataset.orderId;
  if (!intentId && (!bindingId || !orderId)) {
    throw new Error("data-intent-id or both data-binding-id and data-order-id are required");
  }
  return {
    apiBaseUrl,
    apiKey: element.dataset.apiKey,
    intentId,
    bindingId,
    orderId,
    sku: element.dataset.sku,
    quantity: element.dataset.quantity ? Number(element.dataset.quantity) : undefined,
    payerAddress: element.dataset.payerAddress,
    balance: element.dataset.balance,
    txid: element.dataset.txid,
    autoSubmitProof: element.dataset.autoSubmitProof === "true",
    label: element.dataset.label,
    workingLabel: element.dataset.workingLabel,
    transferReadyLabel: element.dataset.transferReadyLabel,
    paidLabel: element.dataset.paidLabel,
    errorLabel: element.dataset.errorLabel,
  };
}

if (typeof document !== "undefined") {
  queueMicrotask(() => autoMountRedeemLoopWidgets());
}

async function submitWidgetProof(client: RedeemLoopClient, transferResponse: TransferRequestResponse, options: RedeemLoopWidgetOptions) {
  const asset = transferResponse.selectedAsset ?? transferResponse.acceptedAssets[0];
  if (!asset) throw new Error("PaymentIntent has no accepted asset to submit proof for");
  return client.submitSettlementProof({
    intentId: transferResponse.intentId,
    chainNamespace: asset.chainNamespace,
    chainId: asset.chainId,
    txid: options.txid!,
    from: options.payerAddress!,
    to: transferResponse.merchantVault,
    assetType: asset.assetType,
    assetId: asset.assetId,
    contract: asset.contract,
    tokenId: asset.tokenId,
    amount: asset.requiredAmount,
    confirmations: 1,
    status: "confirmed",
  });
}

function setButtonState(button: HTMLButtonElement, state: string, label: string): void {
  button.dataset.redeemloopState = state;
  button.textContent = label;
  button.disabled = state === "working" || state === "paid";
  button.style.cursor = button.disabled ? "not-allowed" : "pointer";
  button.style.background = state === "paid" ? "#176b58" : state === "error" ? "#991b1b" : "#171a1f";
}

function dispatchWidgetEvent(element: HTMLElement, eventName: string, detail: unknown): void {
  element.dispatchEvent(
    new CustomEvent(eventName, {
      bubbles: true,
      detail,
    }),
  );
}

function requireDataset(element: HTMLElement, key: string): string {
  const value = element.dataset[key];
  if (!value) throw new Error(`data-${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)} is required`);
  return value;
}

function requireOption(value: string | undefined, fieldName: string): string {
  if (!value) throw new Error(`${fieldName} is required`);
  return value;
}
