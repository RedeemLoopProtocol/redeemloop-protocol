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
  psbtBase64?: string;
  psbtHex?: string;
  finalize?: boolean;
  broadcast?: boolean;
  signInputs?: Record<string, number[]>;
  providerOptions?: unknown;
}

export interface SignedRunePsbtResult {
  psbtBase64?: string;
  psbtHex?: string;
  txid?: string;
  rawTx?: string;
  raw?: unknown;
}

export interface RuneWalletTransferInput {
  to: string;
  runeId?: string;
  runeName?: string;
  amount: string;
  feeRate?: number;
}

export interface RuneWalletTransferResult {
  txid: string;
  provider: BitcoinRuneWalletProvider;
  raw?: unknown;
}

export interface BitcoinRuneWalletAdapter {
  provider: BitcoinRuneWalletProvider;
  connect(input?: { network?: BitcoinNetwork }): Promise<BitcoinRuneAccount>;
  signPsbt(input: SignRunePsbtRequest): Promise<SignedRunePsbtResult>;
  broadcast?(signedPsbt: string): Promise<{ txid: string }>;
  requestRuneTransfer?(input: RuneWalletTransferInput): Promise<RuneWalletTransferResult>;
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

export type RuneIndexerNetwork = "mainnet" | "signet" | "testnet4";

export interface XverseRuneIndexerOptions {
  apiKey: string;
  network?: RuneIndexerNetwork;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  includeUnconfirmedUtxos?: boolean;
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

export interface UniSatRuneProvider {
  requestAccounts(): Promise<string[]>;
  getPublicKey(): Promise<string>;
  getChain?(): Promise<{ network?: string; enum?: string; name?: string }>;
  getNetwork?(): Promise<string>;
  signPsbt(psbtHex: string, options?: unknown): Promise<string>;
  pushPsbt?(psbtHex: string): Promise<string>;
  sendRunes(address: string, runeid: string, amount: string, options?: { feeRate?: number }): Promise<{ txid: string } | string>;
}

export interface XverseRuneRequestResult<T> {
  status: "success" | "error";
  result?: T;
  error?: { code?: string | number; message?: string };
}

export type XverseRuneRequest = <T = unknown>(method: string, params?: unknown) => Promise<XverseRuneRequestResult<T>>;

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

export function createUniSatRuneWalletAdapter(provider: UniSatRuneProvider): UniSatRuneWalletAdapter {
  return {
    provider: "unisat",
    async connect(input) {
      const [address] = await provider.requestAccounts();
      if (!address) throw new Error("UniSat did not return an account");
      const [publicKey, chain] = await Promise.all([
        provider.getPublicKey().catch(() => undefined),
        getUniSatNetwork(provider),
      ]);
      return {
        provider: "unisat",
        address,
        publicKey,
        network: normalizeUniSatNetwork(input?.network ?? chain),
      };
    },
    async signPsbt(input) {
      const psbtHex = input.psbtHex ?? (input.psbtBase64 ? base64ToHex(input.psbtBase64) : undefined);
      if (!psbtHex) throw new Error("UniSat signing requires psbtHex or psbtBase64");
      const options = recordOfUnknown(input.providerOptions);
      if (input.finalize !== undefined) {
        options.autoFinalized = input.finalize;
      } else if (options.autoFinalized === undefined) {
        options.autoFinalized = false;
      }
      const signedHex = await provider.signPsbt(psbtHex, options);
      return {
        psbtHex: signedHex,
        psbtBase64: hexToBase64(signedHex),
      };
    },
    async broadcast(signedPsbt) {
      if (!provider.pushPsbt) throw new Error("UniSat provider does not expose pushPsbt");
      return { txid: await provider.pushPsbt(signedPsbt) };
    },
    async requestRuneTransfer(input) {
      const runeId = input.runeId;
      if (!runeId) throw new Error("UniSat Rune transfer requires runeId");
      assertPositiveAmountString(input.amount, "amount");
      const result = await provider.sendRunes(input.to, runeId, input.amount, { feeRate: input.feeRate });
      const txid = typeof result === "string" ? result : result.txid;
      return { txid, provider: "unisat", raw: result };
    },
  };
}

export function createXverseRuneWalletAdapter(request: XverseRuneRequest): XverseRuneWalletAdapter {
  return {
    provider: "xverse",
    async connect(input) {
      const response = await request<{ addresses?: Array<{ address: string; publicKey?: string; purpose?: string }> }>("getAddresses", {
        purposes: ["payment", "ordinals"],
      });
      if (response.status !== "success") throw new Error(response.error?.message ?? "Xverse getAddresses failed");
      const account = response.result?.addresses?.[0];
      if (!account) throw new Error("Xverse did not return an account");
      return {
        provider: "xverse",
        address: account.address,
        publicKey: account.publicKey,
        network: input?.network ?? "mainnet",
      };
    },
    async signPsbt(input) {
      if (!input.psbtBase64) throw new Error("Xverse signing requires psbtBase64");
      const params: Record<string, unknown> = {
        ...recordOfUnknown(input.providerOptions),
        psbt: input.psbtBase64,
      };
      if (input.signInputs) params.signInputs = input.signInputs;
      if (input.broadcast !== undefined) params.broadcast = input.broadcast;
      const response = await request<{ psbt: string; txid?: string }>("signPsbt", {
        ...params,
      });
      if (response.status !== "success") throw new Error(response.error?.message ?? "Xverse signPsbt failed");
      if (!response.result?.psbt) throw new Error("Xverse signPsbt did not return a PSBT");
      return {
        psbtBase64: response.result.psbt,
        txid: response.result.txid,
      };
    },
    async requestRuneTransfer(input) {
      const runeName = input.runeName;
      if (!runeName) throw new Error("Xverse Rune transfer requires runeName");
      const amount = runeAmountToSafeNumber(input.amount);
      const response = await request<{ txid: string }>("runes_transfer", {
        recipients: [
          {
            runeName,
            amount,
            address: input.to,
          },
        ],
      });
      if (response.status !== "success") throw new Error(response.error?.message ?? "Xverse runes_transfer failed");
      if (!response.result?.txid) throw new Error("Xverse runes_transfer did not return txid");
      return { txid: response.result.txid, provider: "xverse", raw: response.result };
    },
  };
}

export function createXverseRuneIndexerAdapter(options: XverseRuneIndexerOptions): RuneIndexerAdapter {
  const fetchJson = createXverseFetchJson(options);
  return {
    async getRuneBalance(address, runeId) {
      assertNonEmptyString(address, "address");
      assertNonEmptyString(runeId, "runeId");
      const response = await fetchJson<XverseRuneBalancesResponse>(
        `/v2/runes/address/${encodeURIComponent(address)}/balance?runeId=${encodeURIComponent(runeId)}`,
      );
      const balance = response.balances.find((item) => item.runeId === runeId);
      return {
        address,
        runeId,
        amount: balance?.confirmedBalance ?? "0",
        divisibility: balance?.divisibility,
        raw: balance,
      };
    },
    async listRuneUtxos(address, runeId) {
      assertNonEmptyString(address, "address");
      assertNonEmptyString(runeId, "runeId");
      const params = new URLSearchParams({
        runeId,
        includeUnconfirmed: String(options.includeUnconfirmedUtxos ?? true),
      });
      const response = await fetchJson<XverseRuneUtxosResponse>(
        `/v1/runes/address/${encodeURIComponent(address)}/utxo?${params.toString()}`,
      );
      const utxos: RuneUtxo[] = [];
      for (const item of response.items) {
        const rune = item.runes.find((candidate) => candidate.runeId === runeId);
        if (!rune) continue;
        utxos.push({
          txid: item.txid,
          vout: item.vout,
          value: normalizeSatoshiValue(item.amount),
          address,
          runeId,
          amount: rune.amount,
          raw: item,
        });
      }
      return utxos;
    },
    async getRuneTransferProof(input) {
      assertRuneAsset(input.asset);
      assertNonEmptyString(input.txid, "txid");
      assertNonEmptyString(input.to, "to");
      const runeIdentifier = input.asset.runeName ?? input.asset.runeId ?? input.asset.assetId;
      const response = await fetchJson<XverseRuneActivityResponse>(
        `/v1/ordinals/address/${encodeURIComponent(input.to)}/runes/${encodeURIComponent(runeIdentifier)}/activity?limit=25`,
      );
      const activity = response.items.find((item) => item.txid === input.txid);
      if (!activity) throw new Error("Rune transfer proof not found in Xverse activity response");
      if (activity.address && activity.address.toLowerCase() !== input.to.toLowerCase()) {
        throw new Error("Rune transfer proof recipient does not match merchant vault");
      }
      if (BigInt(activity.amount) < BigInt(input.asset.requiredAmount)) {
        throw new Error("Rune transfer proof amount is below required voucher amount");
      }
      const confirmations = input.confirmations ?? (activity.blockHeight ? 1 : 0);
      return {
        proofId: `proof_${input.txid}`,
        intentId: input.intentId,
        chainNamespace: input.asset.chainNamespace,
        chainId: input.asset.chainId,
        txid: input.txid,
        blockNumber: activity.blockHeight,
        confirmations,
        from: input.from,
        to: input.to,
        assetType: "rune",
        assetId: input.asset.assetId,
        amount: input.asset.requiredAmount,
        outputIndex: activity.index,
        status: confirmations > 0 ? "confirmed" : "seen",
        rawProof: {
          indexer: "xverse",
          activity,
        },
      };
    },
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

interface XverseRuneBalancesResponse {
  balances: Array<{
    runeId: string;
    runeName?: string;
    divisibility?: number;
    confirmedBalance: string;
    availableBalance?: string;
    projectedBalance?: string;
    raw?: unknown;
  }>;
  indexerHeight?: number;
}

interface XverseRuneUtxosResponse {
  items: Array<{
    txid: string;
    vout: number;
    amount: number | string;
    runes: Array<{
      runeName?: string;
      runeId: string;
      amount: string;
      divisibility?: number;
      symbol?: string;
    }>;
  }>;
}

interface XverseRuneActivityResponse {
  items: Array<{
    blockHeight?: number;
    blockTime?: string;
    txid: string;
    index?: number;
    type?: string;
    amount: string;
    address?: string;
  }>;
}

function createXverseFetchJson(options: XverseRuneIndexerOptions): <T>(path: string) => Promise<T> {
  assertNonEmptyString(options.apiKey, "apiKey");
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = (options.baseUrl ?? defaultXverseBaseUrl(options.network ?? "mainnet")).replace(/\/$/, "");
  return async <T>(path: string): Promise<T> => {
    const response = await fetchFn(`${baseUrl}${path}`, {
      headers: {
        accept: "application/json",
        "x-api-key": options.apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`Xverse Rune indexer request failed: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  };
}

function defaultXverseBaseUrl(network: RuneIndexerNetwork): string {
  if (network === "signet") return "https://api-signet.secretkeylabs.io";
  if (network === "testnet4") return "https://api-testnet4.secretkeylabs.io";
  return "https://api.secretkeylabs.io";
}

async function getUniSatNetwork(provider: UniSatRuneProvider): Promise<BitcoinNetwork> {
  if (provider.getChain) {
    const chain = await provider.getChain();
    return normalizeUniSatNetwork(chain.enum ?? chain.network ?? chain.name);
  }
  if (provider.getNetwork) {
    return normalizeUniSatNetwork(await provider.getNetwork());
  }
  return "mainnet";
}

function normalizeUniSatNetwork(value: unknown): BitcoinNetwork {
  if (typeof value !== "string") return "mainnet";
  const normalized = value.toLowerCase();
  if (normalized.includes("fractal") && normalized.includes("test")) return "fractal-testnet";
  if (normalized.includes("fractal")) return "fractal-mainnet";
  if (normalized === "testnet" || normalized.includes("bitcoin_testnet")) return "testnet";
  if (normalized === "livenet" || normalized.includes("bitcoin_mainnet")) return "mainnet";
  if (
    normalized === "mainnet" ||
    normalized === "signet" ||
    normalized === "regtest" ||
    normalized === "fractal-mainnet" ||
    normalized === "fractal-testnet"
  ) {
    return normalized;
  }
  return "mainnet";
}

function recordOfUnknown(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function base64ToHex(value: string): string {
  assertNonEmptyString(value, "psbtBase64");
  return Buffer.from(value, "base64").toString("hex");
}

function hexToBase64(value: string): string {
  assertNonEmptyString(value, "psbtHex");
  if (!/^[0-9a-fA-F]+$/.test(value) || value.length % 2 !== 0) throw new Error("psbtHex must be an even-length hex string");
  return Buffer.from(value, "hex").toString("base64");
}

function runeAmountToSafeNumber(amount: string): number {
  assertPositiveAmountString(amount, "amount");
  const value = Number(amount);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("Xverse Rune transfer amount must be a safe positive integer");
  return value;
}

function normalizeSatoshiValue(value: string | number): number {
  const normalized = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) throw new Error("Rune UTXO satoshi value must be a positive integer");
  return normalized;
}

function assertPositiveAmountString(value: unknown, fieldName: string): asserts value is string {
  assertNonEmptyString(value, fieldName);
  if (!/^[0-9]+$/.test(value) || BigInt(value) <= 0n) throw new Error(`${fieldName} must be a positive integer string`);
}

function assertNonEmptyString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${fieldName} is required`);
}
