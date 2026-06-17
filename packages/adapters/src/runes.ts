import type { VoucherAssetDescriptor, VoucherPaymentProof } from "@redeemloop/core";

export type BitcoinRuneWalletProvider = "unisat" | "xverse";
export type BitcoinNetwork = "mainnet" | "testnet" | "signet" | "regtest" | "fractal-mainnet" | "fractal-testnet";

export interface BitcoinRuneAccount {
  address: string;
  publicKey?: string;
  network: BitcoinNetwork;
  provider: BitcoinRuneWalletProvider;
}

export interface SignRunePsbtRequest {
  psbtBase64: string;
  finalize?: boolean;
  broadcast?: boolean;
}

export interface SignedRunePsbtResult {
  psbtBase64: string;
  txid?: string;
  rawTx?: string;
}

export interface BitcoinRuneWalletAdapter {
  provider: BitcoinRuneWalletProvider;
  connect(input?: { network?: BitcoinNetwork }): Promise<BitcoinRuneAccount>;
  signPsbt(input: SignRunePsbtRequest): Promise<SignedRunePsbtResult>;
  broadcast?(signedPsbtBase64: string): Promise<{ txid: string }>;
}

export interface UniSatRuneWalletAdapter extends BitcoinRuneWalletAdapter {
  provider: "unisat";
}

export interface XverseRuneWalletAdapter extends BitcoinRuneWalletAdapter {
  provider: "xverse";
}

export interface RuneUtxo {
  txid: string;
  vout: number;
  value: number;
  address: string;
  runeId: string;
  amount: string;
  scriptPubKey?: string;
  raw?: unknown;
}

export interface RuneBalance {
  address: string;
  runeId: string;
  amount: string;
  divisibility?: number;
  raw?: unknown;
}

export interface RuneIndexerAdapter {
  getRuneBalance(address: string, runeId: string): Promise<RuneBalance>;
  listRuneUtxos(address: string, runeId: string): Promise<RuneUtxo[]>;
  getRuneTransferProof(input: {
    intentId: string;
    txid: string;
    asset: VoucherAssetDescriptor;
    from: string;
    to: string;
    confirmations?: number;
  }): Promise<VoucherPaymentProof>;
}

export interface RuneTransferPsbtInput {
  network: BitcoinNetwork;
  from: string;
  to: string;
  asset: VoucherAssetDescriptor;
  amount?: string;
  feeRate?: number;
  changeAddress?: string;
  payerPublicKey?: string;
  utxos: RuneUtxo[];
}

export interface RuneTransferPsbtRequest {
  chainNamespace: "bitcoin" | "fractal";
  network: BitcoinNetwork;
  assetType: "rune";
  runeId: string;
  from: string;
  to: string;
  amount: string;
  feeRate: number;
  psbtBase64: string;
  inputs: Array<{ txid: string; vout: number; value: number; runeAmount: string }>;
  outputs: Array<{ address: string; runeAmount?: string; role: "merchant" | "change" }>;
  estimatedFee: string;
  alpha: true;
}

export function buildRuneTransferPsbtRequest(input: RuneTransferPsbtInput): RuneTransferPsbtRequest {
  assertRuneAsset(input.asset);
  if (input.utxos.length === 0) throw new Error("Rune PSBT request requires at least one rune UTXO");
  const amount = input.amount ?? input.asset.requiredAmount;
  const runeId = input.asset.runeId ?? input.asset.assetId;
  const selected = selectRuneUtxos(input.utxos, runeId, amount);
  const feeRate = input.feeRate ?? 5;
  const estimatedFee = String(Math.max(250, Math.ceil(selected.length * 68 * feeRate)));
  const changeAmount = subtractRuneAmount(sumRuneAmount(selected), amount);
  const outputs: RuneTransferPsbtRequest["outputs"] = [
    { address: input.to, runeAmount: amount, role: "merchant" },
  ];
  if (changeAmount !== "0") {
    outputs.push({ address: input.changeAddress ?? input.from, runeAmount: changeAmount, role: "change" });
  }
  const requestPayload = {
    kind: "redeemloop.rune-transfer-alpha",
    network: input.network,
    from: input.from,
    to: input.to,
    runeId,
    amount,
    feeRate,
    changeAddress: input.changeAddress ?? input.from,
    payerPublicKey: input.payerPublicKey,
    inputs: selected.map((utxo) => ({ txid: utxo.txid, vout: utxo.vout, value: utxo.value, runeAmount: utxo.amount })),
    outputs,
  };
  return {
    chainNamespace: input.asset.chainNamespace,
    network: input.network,
    assetType: "rune",
    runeId,
    from: input.from,
    to: input.to,
    amount,
    feeRate,
    psbtBase64: Buffer.from(JSON.stringify(requestPayload)).toString("base64"),
    inputs: requestPayload.inputs,
    outputs,
    estimatedFee,
    alpha: true,
  };
}

export class MockRuneIndexerAdapter implements RuneIndexerAdapter {
  constructor(private readonly fixtures: { balances?: RuneBalance[]; utxos?: RuneUtxo[] } = {}) {}

  async getRuneBalance(address: string, runeId: string): Promise<RuneBalance> {
    return this.fixtures.balances?.find((balance) => balance.address === address && balance.runeId === runeId) ?? {
      address,
      runeId,
      amount: "0",
    };
  }

  async listRuneUtxos(address: string, runeId: string): Promise<RuneUtxo[]> {
    return (this.fixtures.utxos ?? []).filter((utxo) => utxo.address === address && utxo.runeId === runeId);
  }

  async getRuneTransferProof(input: {
    intentId: string;
    txid: string;
    asset: VoucherAssetDescriptor;
    from: string;
    to: string;
    confirmations?: number;
  }): Promise<VoucherPaymentProof> {
    assertRuneAsset(input.asset);
    return {
      proofId: `proof_${input.txid}`,
      intentId: input.intentId,
      chainNamespace: input.asset.chainNamespace,
      chainId: input.asset.chainId,
      txid: input.txid,
      confirmations: input.confirmations ?? 1,
      from: input.from,
      to: input.to,
      assetType: "rune",
      assetId: input.asset.assetId,
      amount: input.asset.requiredAmount,
      status: (input.confirmations ?? 1) > 0 ? "confirmed" : "seen",
      rawProof: {
        alpha: true,
        runeId: input.asset.runeId ?? input.asset.assetId,
      },
    };
  }
}

function assertRuneAsset(
  asset: VoucherAssetDescriptor,
): asserts asset is VoucherAssetDescriptor & { chainNamespace: "bitcoin" | "fractal"; assetType: "rune" } {
  if ((asset.chainNamespace !== "bitcoin" && asset.chainNamespace !== "fractal") || asset.assetType !== "rune") {
    throw new Error("Rune PSBT requests require a Bitcoin or Fractal rune asset");
  }
  if (!asset.runeId && !asset.assetId) throw new Error("Rune asset requires runeId or assetId");
}

function selectRuneUtxos(utxos: RuneUtxo[], runeId: string, amount: string): RuneUtxo[] {
  const selected: RuneUtxo[] = [];
  let total = 0n;
  const required = BigInt(amount);
  for (const utxo of utxos) {
    if (utxo.runeId !== runeId) continue;
    selected.push(utxo);
    total += BigInt(utxo.amount);
    if (total >= required) return selected;
  }
  throw new Error("Insufficient rune UTXO amount");
}

function sumRuneAmount(utxos: RuneUtxo[]): string {
  return utxos.reduce((total, utxo) => total + BigInt(utxo.amount), 0n).toString();
}

function subtractRuneAmount(left: string, right: string): string {
  const value = BigInt(left) - BigInt(right);
  if (value < 0n) throw new Error("Insufficient rune amount");
  return value.toString();
}
