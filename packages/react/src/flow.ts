import type { RedeemLoopPaymentIntent, VoucherPaymentProof } from "@redeemloop/core";
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
  | "broadcasting"
  | "submitting_proof"
  | "complete";

export interface RedeemLoopPayFlowInput extends CreatePaymentIntentInput {
  payerAddress?: string;
  balance?: string;
  txid?: string;
  proofStatus?: VoucherPaymentProof["status"];
  autoSubmitProof?: boolean;
}

export interface RedeemLoopPayFlowResult {
  intent: RedeemLoopPaymentIntent;
  balanceCheck?: CheckBalanceResponse["balanceCheck"];
  transfer?: TransferRequestResponse["transfer"];
  broadcastedTxid?: string;
  proof?: SettlementProofResponse;
}

export interface RunRedeemLoopPayFlowOptions {
  onStep?: (step: RedeemLoopPayStep) => void;
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

  let balanceCheck: CheckBalanceResponse["balanceCheck"] | undefined;
  if (input.payerAddress) {
    options.onStep?.("checking_balance");
    const checked = await client.checkBalance(intent.intentId, {
      payerAddress: input.payerAddress,
      assetId: input.assetId,
      balance: input.balance,
    });
    intent = checked;
    balanceCheck = checked.balanceCheck;
  }

  options.onStep?.("requesting_transfer");
  const transferResponse = await client.requestTransfer(intent.intentId, {
    payerAddress: input.payerAddress,
    assetId: input.assetId,
  });
  intent = transferResponse;

  let broadcastedTxid: string | undefined;
  if (input.txid) {
    options.onStep?.("broadcasting");
    const broadcasted = await client.markBroadcasted(intent.intentId, { txid: input.txid });
    intent = broadcasted;
    broadcastedTxid = broadcasted.txid;
  }

  let proof: SettlementProofResponse | undefined;
  if (input.autoSubmitProof && input.txid && input.payerAddress) {
    const asset = intent.selectedAsset ?? intent.acceptedAssets[0];
    if (!asset) throw new Error("PaymentIntent has no accepted asset to submit proof for");
    options.onStep?.("submitting_proof");
    proof = await client.submitSettlementProof({
      intentId: intent.intentId,
      chainNamespace: asset.chainNamespace,
      chainId: asset.chainId,
      txid: input.txid,
      from: input.payerAddress,
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
  }

  options.onStep?.("complete");
  return {
    intent,
    balanceCheck,
    transfer: transferResponse.transfer,
    broadcastedTxid,
    proof,
  };
}
