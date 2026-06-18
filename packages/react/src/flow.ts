import type { RedeemLoopPaymentIntent, VoucherPaymentProof } from "@redeemloop/core";
import { EvmWalletError, createEip1193EvmWalletAdapter, type Eip1193Provider } from "@redeemloop/adapters";
import type {
  CheckBalanceResponse,
  CreatePaymentIntentInput,
  RedeemLoopClient,
  SettlementProofResponse,
  TransferRequestResponse,
} from "@redeemloop/sdk";

export type RedeemLoopPayStep =
  | "creating_intent"
  | "checking_balance"
  | "requesting_transfer"
  | "sending_wallet_transaction"
  | "broadcasting"
  | "rechecking_settlement"
  | "submitting_proof"
  | "complete";

export interface RedeemLoopPayFlowInput extends CreatePaymentIntentInput {
  payerAddress?: string;
  balance?: string;
  txid?: string;
  proofStatus?: VoucherPaymentProof["status"];
  autoSubmitProof?: boolean;
  autoSendEvmTransaction?: boolean;
  autoRecheckEvmSettlement?: boolean;
  switchEvmChain?: boolean;
  evmProvider?: Eip1193Provider;
}

export interface RedeemLoopPayFlowResult {
  intent: RedeemLoopPaymentIntent;
  balanceCheck?: CheckBalanceResponse["balanceCheck"];
  transfer?: TransferRequestResponse["transfer"];
  broadcastedTxid?: string;
  proof?: SettlementProofResponse;
}

export type RedeemLoopPayEventType =
  | "intent_created"
  | "balance_checked"
  | "transfer_requested"
  | "wallet_connected"
  | "wallet_transaction_submitted"
  | "transaction_broadcasted"
  | "settlement_rechecked"
  | "proof_submitted"
  | "payment_complete";

export interface RedeemLoopPayEvent {
  type: RedeemLoopPayEventType;
  intentId?: string;
  status?: RedeemLoopPaymentIntent["status"];
  chainId?: number;
  payerAddress?: string;
  txid?: string;
  timestamp: string;
}

export interface RunRedeemLoopPayFlowOptions {
  onStep?: (step: RedeemLoopPayStep) => void;
  onEvent?: (event: RedeemLoopPayEvent) => void;
}

export async function runRedeemLoopPayFlow(
  client: RedeemLoopClient,
  input: RedeemLoopPayFlowInput,
  options: RunRedeemLoopPayFlowOptions = {},
): Promise<RedeemLoopPayFlowResult> {
  options.onStep?.("creating_intent");
  let intent = await client.createPaymentIntent({
    bindingId: input.bindingId,
    orderId: input.orderId,
    channel: input.channel,
    skuLines: input.skuLines,
    payerAddress: input.payerAddress,
    assetId: input.assetId,
    storeId: input.storeId,
    expiresAt: input.expiresAt,
    intentId: input.intentId,
  });
  emitPayEvent(options, { type: "intent_created", intentId: intent.intentId, status: intent.status });

  let payerAddress = input.payerAddress;

  let balanceCheck: CheckBalanceResponse["balanceCheck"] | undefined;
  if (payerAddress) {
    options.onStep?.("checking_balance");
    const checked = await client.checkBalance(intent.intentId, {
      payerAddress,
      assetId: input.assetId,
      balance: input.balance,
    });
    intent = checked;
    balanceCheck = checked.balanceCheck;
    emitPayEvent(options, {
      type: "balance_checked",
      intentId: intent.intentId,
      status: intent.status,
      chainId: balanceCheck.chainId,
      payerAddress,
    });
  }

  options.onStep?.("requesting_transfer");
  const transferResponse = await client.requestTransfer(intent.intentId, {
    payerAddress: input.payerAddress,
    assetId: input.assetId,
  });
  intent = transferResponse;
  emitPayEvent(options, {
    type: "transfer_requested",
    intentId: intent.intentId,
    status: intent.status,
    chainId: transferResponse.transfer.evm?.chainId,
    payerAddress,
  });

  let broadcastedTxid: string | undefined;
  if (input.autoSendEvmTransaction) {
    if (!transferResponse.transfer.evm) throw new Error("EVM wallet send requires an EVM transfer request");
    const provider = input.evmProvider ?? getInjectedEvmProvider();
    if (!provider) throw new EvmWalletError({ code: "wallet_missing" });
    options.onStep?.("sending_wallet_transaction");
    const wallet = createEip1193EvmWalletAdapter(provider);
    const account = await wallet.connect({
      chainId: transferResponse.transfer.evm.chainId,
      switchChain: input.switchEvmChain !== false,
    });
    if (payerAddress && payerAddress.toLowerCase() !== account.address.toLowerCase()) {
      throw new EvmWalletError({
        code: "wallet_account_mismatch",
        message: "Connected wallet account does not match the payer address on this PaymentIntent.",
      });
    }
    payerAddress = payerAddress ?? account.address;
    emitPayEvent(options, {
      type: "wallet_connected",
      intentId: intent.intentId,
      status: intent.status,
      chainId: account.chainId,
      payerAddress,
    });
    const txid = await wallet.sendErc20Transfer(transferResponse.transfer.evm, {
      from: payerAddress,
      switchChain: input.switchEvmChain !== false,
    });
    emitPayEvent(options, {
      type: "wallet_transaction_submitted",
      intentId: intent.intentId,
      status: intent.status,
      chainId: transferResponse.transfer.evm.chainId,
      payerAddress,
      txid,
    });
    options.onStep?.("broadcasting");
    const broadcasted = await client.markBroadcasted(intent.intentId, { txid });
    intent = broadcasted;
    broadcastedTxid = broadcasted.txid;
    emitPayEvent(options, {
      type: "transaction_broadcasted",
      intentId: intent.intentId,
      status: intent.status,
      chainId: transferResponse.transfer.evm.chainId,
      payerAddress,
      txid: broadcastedTxid,
    });
  } else if (input.txid) {
    options.onStep?.("broadcasting");
    const broadcasted = await client.markBroadcasted(intent.intentId, { txid: input.txid });
    intent = broadcasted;
    broadcastedTxid = broadcasted.txid;
    emitPayEvent(options, {
      type: "transaction_broadcasted",
      intentId: intent.intentId,
      status: intent.status,
      payerAddress,
      txid: broadcastedTxid,
    });
  }

  let proof: SettlementProofResponse | undefined;
  if (input.autoRecheckEvmSettlement && broadcastedTxid && payerAddress && transferResponse.transfer.evm) {
    options.onStep?.("rechecking_settlement");
    proof = await client.recheckEvmSettlement(intent.intentId, {
      txid: broadcastedTxid,
      from: payerAddress,
    });
    if (proof.paymentIntent) intent = proof.paymentIntent;
    emitPayEvent(options, {
      type: "settlement_rechecked",
      intentId: intent.intentId,
      status: intent.status,
      chainId: transferResponse.transfer.evm.chainId,
      payerAddress,
      txid: broadcastedTxid,
    });
  } else if (input.autoSubmitProof && broadcastedTxid && payerAddress) {
    const asset = intent.selectedAsset ?? intent.acceptedAssets[0];
    if (!asset) throw new Error("PaymentIntent has no accepted asset to submit proof for");
    options.onStep?.("submitting_proof");
    proof = await client.submitSettlementProof({
      intentId: intent.intentId,
      chainNamespace: asset.chainNamespace,
      chainId: asset.chainId,
      txid: broadcastedTxid,
      from: payerAddress,
      to: intent.merchantVault,
      assetType: asset.assetType,
      assetId: asset.assetId,
      contract: asset.contract,
      tokenId: asset.tokenId,
      amount: asset.requiredAmount,
      status: input.proofStatus ?? "confirmed",
      confirmations: input.proofStatus === "seen" ? 0 : 1,
    });
    if (proof.paymentIntent) intent = proof.paymentIntent;
    emitPayEvent(options, {
      type: "proof_submitted",
      intentId: intent.intentId,
      status: intent.status,
      chainId: asset.chainId,
      payerAddress,
      txid: broadcastedTxid,
    });
  }

  options.onStep?.("complete");
  emitPayEvent(options, {
    type: "payment_complete",
    intentId: intent.intentId,
    status: intent.status,
    payerAddress,
    txid: broadcastedTxid,
  });
  return {
    intent,
    balanceCheck,
    transfer: transferResponse.transfer,
    broadcastedTxid,
    proof,
  };
}

function getInjectedEvmProvider(): Eip1193Provider | undefined {
  if (typeof globalThis === "undefined") return undefined;
  return (globalThis as { ethereum?: Eip1193Provider }).ethereum;
}

function emitPayEvent(options: RunRedeemLoopPayFlowOptions, event: Omit<RedeemLoopPayEvent, "timestamp">): void {
  options.onEvent?.({ ...event, timestamp: new Date().toISOString() });
}
