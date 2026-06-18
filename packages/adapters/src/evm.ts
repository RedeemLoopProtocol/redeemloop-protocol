import {
  decodeEventLog,
  encodeFunctionData,
  getAddress,
  parseAbi,
  parseAbiItem,
  type Address,
  type Hex,
} from "viem";
import type { VoucherAssetDescriptor, VoucherPaymentProof } from "@redeemloop/core";

export const erc20TransferAbi = parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]);
export const erc20BalanceOfAbi = parseAbi(["function balanceOf(address account) view returns (uint256)"]);
export const erc20TransferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

export interface EvmChainConfig {
  chainNamespace: "eip155";
  chainId: number;
  chainIdHex: Hex;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  aliases: string[];
}

export interface Eip1193RequestArguments {
  method: string;
  params?: readonly unknown[] | Record<string, unknown>;
}

export interface Eip1193Provider {
  request<T = unknown>(args: Eip1193RequestArguments): Promise<T>;
}

export type EvmWalletErrorCode =
  | "wallet_missing"
  | "wallet_request_rejected"
  | "wallet_request_pending"
  | "wallet_unauthorized"
  | "wallet_unsupported_method"
  | "wallet_chain_unsupported"
  | "wallet_chain_switch_failed"
  | "wallet_chain_add_failed"
  | "wallet_account_mismatch"
  | "wallet_insufficient_funds"
  | "wallet_transaction_rejected"
  | "wallet_transaction_failed"
  | "wallet_invalid_response"
  | "wallet_unknown_error";

export interface EvmWalletErrorOptions {
  code: EvmWalletErrorCode;
  message?: string;
  method?: string;
  providerCode?: number | string;
  retryable?: boolean;
  cause?: unknown;
}

export class EvmWalletError extends Error {
  readonly code: EvmWalletErrorCode;
  readonly method?: string;
  readonly providerCode?: number | string;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(options: EvmWalletErrorOptions) {
    super(options.message ?? defaultEvmWalletErrorMessage(options.code));
    this.name = "EvmWalletError";
    this.code = options.code;
    this.method = options.method;
    this.providerCode = options.providerCode;
    this.retryable = options.retryable ?? defaultEvmWalletRetryable(options.code);
    this.cause = options.cause;
  }
}

export interface EvmWalletAccount {
  address: Address;
  chainId: number;
  chainIdHex: Hex;
}

export interface EvmWalletAdapterOptions {
  chains?: readonly EvmChainConfig[];
}

export interface EvmWalletConnectInput {
  chainId?: number;
  switchChain?: boolean;
}

export interface EvmWalletSendInput {
  from?: string;
  switchChain?: boolean;
}

export interface EvmWalletAdapter {
  connect(input?: EvmWalletConnectInput): Promise<EvmWalletAccount>;
  switchChain(chainId: number): Promise<void>;
  addChain(chainId: number): Promise<void>;
  sendErc20Transfer(transfer: Erc20TransferRequest, input?: EvmWalletSendInput): Promise<Hex>;
}

export const redeemLoopEvmChains = [
  {
    chainNamespace: "eip155",
    chainId: 1,
    chainIdHex: "0x1",
    name: "Ethereum Mainnet",
    shortName: "ETH",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://ethereum-rpc.publicnode.com"],
    blockExplorerUrls: ["https://etherscan.io"],
    aliases: ["ethereum", "eth", "erc20"],
  },
  {
    chainNamespace: "eip155",
    chainId: 56,
    chainIdHex: "0x38",
    name: "BNB Smart Chain",
    shortName: "BSC",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-dataseed.binance.org"],
    blockExplorerUrls: ["https://bscscan.com"],
    aliases: ["bsc", "bnb", "binance-smart-chain", "bep20"],
  },
  {
    chainNamespace: "eip155",
    chainId: 137,
    chainIdHex: "0x89",
    name: "Polygon PoS",
    shortName: "POL",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
    aliases: ["polygon", "polygon-pos", "matic", "pol"],
  },
  {
    chainNamespace: "eip155",
    chainId: 42161,
    chainIdHex: "0xa4b1",
    name: "Arbitrum One",
    shortName: "ARB",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"],
    aliases: ["arbitrum", "arbitrum-one", "arb"],
  },
] as const satisfies readonly EvmChainConfig[];

export const supportedRedeemLoopEvmChainIds = redeemLoopEvmChains.map((chain) => chain.chainId);

export interface Erc20BalanceCheckInput {
  account: string;
  asset: VoucherAssetDescriptor;
  requiredAmount?: string;
  balance?: string;
}

export interface Erc20BalanceCheckRequest {
  chainNamespace: "eip155";
  chainId: number;
  assetType: "erc20";
  account: Address;
  contract: Address;
  requiredAmount: string;
  call: {
    chainId: number;
    to: Address;
    data: Hex;
    functionName: "balanceOf";
    args: [Address];
  };
  providedBalance?: string;
  hasSufficientBalance?: boolean;
  shortfall?: string;
}

export interface Erc20TransferRequestInput {
  from?: string;
  to: string;
  asset: VoucherAssetDescriptor;
  amount?: string;
}

export interface Erc20TransferRequest {
  chainNamespace: "eip155";
  chainId: number;
  assetType: "erc20";
  from?: Address;
  to: Address;
  contract: Address;
  amount: string;
  transaction: {
    chainId: number;
    from?: Address;
    to: Address;
    data: Hex;
    value: "0x0";
    functionName: "transfer";
    args: [Address, string];
  };
}

export interface Erc20PaymentProofInput {
  proofId: string;
  intentId: string;
  asset: VoucherAssetDescriptor;
  txid: string;
  from: string;
  to: string;
  amount?: string;
  blockNumber?: number;
  blockHash?: string;
  confirmations?: number;
  logIndex?: number;
  status?: VoucherPaymentProof["status"];
  rawProof?: unknown;
}

export interface Erc20ReceiptLog {
  address: string;
  topics: readonly Hex[];
  data: Hex;
  logIndex?: number;
}

export interface Erc20TransactionReceiptLike {
  transactionHash?: Hex;
  blockNumber?: bigint | number;
  blockHash?: Hex;
  status?: "success" | "reverted" | string;
  logs: Erc20ReceiptLog[];
}

export interface VerifyErc20TransferReceiptInput {
  proofId?: string;
  intentId: string;
  txid: string;
  receipt: Erc20TransactionReceiptLike;
  asset: VoucherAssetDescriptor;
  from: string;
  to: string;
  amount?: string;
  currentBlockNumber?: bigint | number;
  minConfirmations?: number;
  rawProof?: unknown;
}

export function getRedeemLoopEvmChainConfig(chainIdOrAlias: number | string, chains: readonly EvmChainConfig[] = redeemLoopEvmChains): EvmChainConfig {
  if (typeof chainIdOrAlias === "number") {
    const config = chains.find((chain) => chain.chainId === chainIdOrAlias);
    if (config) return config;
  } else {
    const normalized = chainIdOrAlias.trim().toLowerCase();
    const numeric = normalized.startsWith("0x") ? Number.parseInt(normalized, 16) : Number(normalized);
    const config = Number.isSafeInteger(numeric)
      ? chains.find((chain) => chain.chainId === numeric)
      : chains.find((chain) => chain.aliases.includes(normalized) || chain.shortName.toLowerCase() === normalized);
    if (config) return config;
  }
  throw new Error(`Unsupported EVM chain: ${chainIdOrAlias}`);
}

export function evmChainIdToHex(chainId: number): Hex {
  if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error("chainId must be a positive integer");
  return `0x${chainId.toString(16)}` as Hex;
}

export function parseEvmChainId(value: unknown): number {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value !== "string" || !value.trim()) throw new Error("chainId must be a hex or decimal string");
  const normalized = value.trim().toLowerCase();
  const parsed = normalized.startsWith("0x") ? Number.parseInt(normalized, 16) : Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error("chainId must be a positive integer");
  return parsed;
}

export function createEip1193EvmWalletAdapter(provider: Eip1193Provider, options: EvmWalletAdapterOptions = {}): EvmWalletAdapter {
  const chains = options.chains ?? redeemLoopEvmChains;
  return {
    async connect(input = {}) {
      const accounts = await requestEvmWallet<string[]>(provider, "eth_requestAccounts");
      const address = normalizeWalletAccount(accounts);
      if (input.chainId !== undefined && input.switchChain !== false) {
        await ensureEvmWalletChain(provider, input.chainId, chains);
      }
      const chainIdHex = await requestEvmWallet<string>(provider, "eth_chainId");
      const chainId = parseEvmChainId(chainIdHex);
      return { address, chainId, chainIdHex: evmChainIdToHex(chainId) };
    },
    async switchChain(chainId) {
      await ensureEvmWalletChain(provider, chainId, chains);
    },
    async addChain(chainId) {
      await addEvmWalletChain(provider, getRedeemLoopEvmChainConfig(chainId, chains));
    },
    async sendErc20Transfer(transfer, input = {}) {
      if (input.switchChain !== false) {
        await ensureEvmWalletChain(provider, transfer.chainId, chains);
      }
      const from = input.from ?? transfer.transaction.from ?? normalizeWalletAccount(await requestEvmWallet<string[]>(provider, "eth_requestAccounts"));
      const txid = await requestEvmWallet<unknown>(provider, "eth_sendTransaction", [
        {
          from: getAddress(from),
          to: transfer.transaction.to,
          data: transfer.transaction.data,
          value: transfer.transaction.value,
        },
      ]);
      if (typeof txid !== "string" || !/^0x[0-9a-fA-F]+$/.test(txid)) {
        throw new EvmWalletError({
          code: "wallet_invalid_response",
          method: "eth_sendTransaction",
          message: "Wallet did not return a transaction hash.",
        });
      }
      return txid as Hex;
    },
  };
}

export async function ensureEvmWalletChain(
  provider: Eip1193Provider,
  chainId: number,
  chains: readonly EvmChainConfig[] = redeemLoopEvmChains,
): Promise<void> {
  const target = evmChainIdToHex(chainId);
  const current = await requestEvmWallet<string>(provider, "eth_chainId").catch(() => undefined);
  if (current && parseEvmChainId(current) === chainId) return;
  try {
    await requestEvmWallet(provider, "wallet_switchEthereumChain", [{ chainId: target }]);
  } catch (error) {
    if (!isUnknownChainError(error)) throw error;
    await addEvmWalletChain(provider, getRedeemLoopEvmChainConfig(chainId, chains));
    try {
      await requestEvmWallet(provider, "wallet_switchEthereumChain", [{ chainId: target }]);
    } catch (switchError) {
      throw normalizeEvmWalletError(switchError, "wallet_chain_switch_failed", "wallet_switchEthereumChain");
    }
  }
}

export async function addEvmWalletChain(provider: Eip1193Provider, chain: EvmChainConfig): Promise<void> {
  try {
    await requestEvmWallet(provider, "wallet_addEthereumChain", [
      {
        chainId: chain.chainIdHex,
        chainName: chain.name,
        nativeCurrency: chain.nativeCurrency,
        rpcUrls: chain.rpcUrls,
        blockExplorerUrls: chain.blockExplorerUrls,
      },
    ]);
  } catch (error) {
    throw normalizeEvmWalletError(error, "wallet_chain_add_failed", "wallet_addEthereumChain");
  }
}

export function normalizeEvmWalletError(
  error: unknown,
  fallbackCode: EvmWalletErrorCode = "wallet_unknown_error",
  method?: string,
): EvmWalletError {
  if (error instanceof EvmWalletError) return error;
  const record = error && typeof error === "object" ? (error as { code?: unknown; message?: unknown }) : {};
  const providerCode = typeof record.code === "number" || typeof record.code === "string" ? record.code : undefined;
  const providerMessage = typeof record.message === "string" ? record.message : undefined;
  const normalizedMessage = providerMessage?.toLowerCase() ?? "";
  const code = classifyEvmWalletErrorCode(providerCode, normalizedMessage, fallbackCode, method);
  return new EvmWalletError({
    code,
    method,
    providerCode,
    message: defaultEvmWalletErrorMessage(code),
    cause: error,
  });
}

export function formatEvmWalletErrorForMerchant(error: unknown): string {
  const normalized = normalizeEvmWalletError(error);
  return `${normalized.code}: ${normalized.message}`;
}

export function buildErc20TransferRequest(input: Erc20TransferRequestInput): Erc20TransferRequest {
  assertErc20Asset(input.asset);
  const amount = input.amount ?? input.asset.requiredAmount;
  assertPositiveIntegerString(amount, "amount");
  const receiver = getAddress(input.to);
  const contract = getAddress(input.asset.contract);
  const from = input.from ? getAddress(input.from) : undefined;
  const data = encodeFunctionData({
    abi: erc20TransferAbi,
    functionName: "transfer",
    args: [receiver, BigInt(amount)],
  });

  return {
    chainNamespace: "eip155",
    chainId: input.asset.chainId,
    assetType: "erc20",
    from,
    to: receiver,
    contract,
    amount,
    transaction: {
      chainId: input.asset.chainId,
      from,
      to: contract,
      data,
      value: "0x0",
      functionName: "transfer",
      args: [receiver, amount],
    },
  };
}

export function buildErc20BalanceCheckRequest(input: Erc20BalanceCheckInput): Erc20BalanceCheckRequest {
  assertErc20Asset(input.asset);
  const account = getAddress(input.account);
  const contract = getAddress(input.asset.contract);
  const requiredAmount = input.requiredAmount ?? input.asset.requiredAmount;
  assertPositiveIntegerString(requiredAmount, "requiredAmount");
  const data = encodeFunctionData({
    abi: erc20BalanceOfAbi,
    functionName: "balanceOf",
    args: [account],
  });
  const evaluated = input.balance === undefined ? {} : evaluateErc20Balance(input.balance, requiredAmount);

  return {
    chainNamespace: "eip155",
    chainId: input.asset.chainId,
    assetType: "erc20",
    account,
    contract,
    requiredAmount,
    call: {
      chainId: input.asset.chainId,
      to: contract,
      data,
      functionName: "balanceOf",
      args: [account],
    },
    providedBalance: input.balance,
    ...evaluated,
  };
}

export function evaluateErc20Balance(balance: string, requiredAmount: string): {
  hasSufficientBalance: boolean;
  shortfall: string;
} {
  assertNonNegativeIntegerString(balance, "balance");
  assertPositiveIntegerString(requiredAmount, "requiredAmount");
  const balanceValue = BigInt(balance);
  const requiredValue = BigInt(requiredAmount);
  return {
    hasSufficientBalance: balanceValue >= requiredValue,
    shortfall: balanceValue >= requiredValue ? "0" : String(requiredValue - balanceValue),
  };
}

export function createErc20PaymentProof(input: Erc20PaymentProofInput): VoucherPaymentProof {
  assertErc20Asset(input.asset);
  const amount = input.amount ?? input.asset.requiredAmount;
  assertPositiveIntegerString(amount, "amount");
  return {
    proofId: input.proofId,
    intentId: input.intentId,
    chainNamespace: "eip155",
    chainId: input.asset.chainId,
    txid: input.txid,
    blockNumber: input.blockNumber,
    blockHash: input.blockHash,
    confirmations: input.confirmations ?? 0,
    from: getAddress(input.from),
    to: getAddress(input.to),
    assetType: "erc20",
    assetId: input.asset.assetId,
    contract: getAddress(input.asset.contract),
    amount,
    logIndex: input.logIndex,
    status: input.status ?? "seen",
    rawProof: input.rawProof,
  };
}

export function verifyErc20TransferReceipt(input: VerifyErc20TransferReceiptInput): VoucherPaymentProof {
  assertErc20Asset(input.asset);
  if (input.receipt.status === "reverted") throw new Error("EVM transaction receipt is reverted");
  const txid = input.receipt.transactionHash ?? input.txid;
  if (txid.toLowerCase() !== input.txid.toLowerCase()) throw new Error("EVM transaction receipt hash does not match txid");
  const contract = getAddress(input.asset.contract);
  const expectedFrom = getAddress(input.from);
  const expectedTo = getAddress(input.to);
  const amount = input.amount ?? input.asset.requiredAmount;
  assertPositiveIntegerString(amount, "amount");
  const expectedAmount = BigInt(amount);
  const matchingLog = input.receipt.logs.find((log) => {
    if (getAddress(log.address) !== contract) return false;
    try {
      const decoded = decodeEventLog({
        abi: [erc20TransferEvent],
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      if (decoded.eventName !== "Transfer") return false;
      const args = decoded.args as { from: Address; to: Address; value: bigint };
      return getAddress(args.from) === expectedFrom && getAddress(args.to) === expectedTo && args.value === expectedAmount;
    } catch {
      return false;
    }
  });
  if (!matchingLog) throw new Error("No matching ERC-20 Transfer log found for PaymentIntent");

  const confirmations = confirmationCount(input.receipt.blockNumber, input.currentBlockNumber);
  const minConfirmations = input.minConfirmations ?? 1;

  return {
    proofId: input.proofId ?? `proof_evm_${input.txid.slice(2, 14)}_${matchingLog.logIndex ?? 0}`,
    intentId: input.intentId,
    chainNamespace: "eip155",
    chainId: input.asset.chainId,
    txid: input.txid,
    blockNumber: input.receipt.blockNumber === undefined ? undefined : Number(input.receipt.blockNumber),
    blockHash: input.receipt.blockHash,
    confirmations,
    from: expectedFrom,
    to: expectedTo,
    assetType: "erc20",
    assetId: input.asset.assetId,
    contract,
    amount,
    logIndex: matchingLog.logIndex,
    status: confirmations >= minConfirmations ? "confirmed" : "seen",
    rawProof: input.rawProof,
  };
}

export function assertErc20Asset(asset: VoucherAssetDescriptor): asserts asset is VoucherAssetDescriptor & {
  chainNamespace: "eip155";
  chainId: number;
  assetType: "erc20";
  contract: Address;
} {
  if (asset.chainNamespace !== "eip155") throw new Error("EVM transfer requests require chainNamespace=eip155");
  if (asset.assetType !== "erc20") throw new Error("EVM transfer requests currently support ERC-20 voucher assets");
  if (!Number.isSafeInteger(asset.chainId) || Number(asset.chainId) <= 0) throw new Error("asset.chainId must be a positive integer");
  if (!asset.contract) throw new Error("asset.contract is required for ERC-20 transfer requests");
  getAddress(asset.contract);
  assertPositiveIntegerString(asset.requiredAmount, "asset.requiredAmount");
}

function assertPositiveIntegerString(value: string, fieldName: string): void {
  if (!/^[0-9]+$/.test(value) || BigInt(value) <= 0n) {
    throw new Error(`${fieldName} must be a positive integer string`);
  }
}

function assertNonNegativeIntegerString(value: string, fieldName: string): void {
  if (!/^[0-9]+$/.test(value)) {
    throw new Error(`${fieldName} must be a non-negative integer string`);
  }
}

function confirmationCount(receiptBlock: bigint | number | undefined, currentBlock: bigint | number | undefined): number {
  if (receiptBlock === undefined) return 0;
  const receiptBlockValue = BigInt(receiptBlock);
  const currentBlockValue = currentBlock === undefined ? receiptBlockValue : BigInt(currentBlock);
  if (currentBlockValue < receiptBlockValue) return 0;
  const confirmations = currentBlockValue - receiptBlockValue + 1n;
  return confirmations > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(confirmations);
}

function normalizeWalletAccount(accounts: unknown): Address {
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string") throw new Error("Wallet did not return an EVM account");
  return getAddress(accounts[0]);
}

function isUnknownChainError(error: unknown): boolean {
  if (error instanceof EvmWalletError) return error.code === "wallet_chain_unsupported" || error.providerCode === 4902;
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; message?: unknown };
  return record.code === 4902 || (typeof record.message === "string" && /unrecognized|unknown|not added/i.test(record.message));
}

async function requestEvmWallet<T = unknown>(provider: Eip1193Provider, method: string, params?: readonly unknown[]): Promise<T> {
  try {
    return await provider.request<T>(params === undefined ? { method } : { method, params });
  } catch (error) {
    throw normalizeEvmWalletError(error, fallbackCodeForWalletMethod(method), method);
  }
}

function classifyEvmWalletErrorCode(
  providerCode: number | string | undefined,
  message: string,
  fallbackCode: EvmWalletErrorCode,
  method?: string,
): EvmWalletErrorCode {
  if (providerCode === 4001 || /user rejected|user denied|rejected the request|denied transaction|declined/i.test(message)) {
    return method === "eth_sendTransaction" ? "wallet_transaction_rejected" : "wallet_request_rejected";
  }
  if (providerCode === -32002 || /already pending|request is pending/i.test(message)) return "wallet_request_pending";
  if (providerCode === 4100 || /unauthorized|not authorized/i.test(message)) return "wallet_unauthorized";
  if (providerCode === 4200 || /unsupported method|method not supported/i.test(message)) return "wallet_unsupported_method";
  if (providerCode === 4900 || providerCode === 4901 || providerCode === 4902) return "wallet_chain_unsupported";
  if (/insufficient funds|insufficient balance|gas required exceeds allowance|intrinsic gas/i.test(message)) return "wallet_insufficient_funds";
  if (/revert|execution reverted|transaction failed/i.test(message)) return "wallet_transaction_failed";
  return fallbackCode;
}

function fallbackCodeForWalletMethod(method: string): EvmWalletErrorCode {
  if (method === "eth_sendTransaction") return "wallet_transaction_failed";
  if (method === "wallet_switchEthereumChain") return "wallet_chain_switch_failed";
  if (method === "wallet_addEthereumChain") return "wallet_chain_add_failed";
  return "wallet_unknown_error";
}

function defaultEvmWalletErrorMessage(code: EvmWalletErrorCode): string {
  switch (code) {
    case "wallet_missing":
      return "No injected EVM wallet provider was found. Ask the customer to install or open a supported wallet.";
    case "wallet_request_rejected":
      return "The customer rejected the wallet request. Ask them to retry and approve the wallet prompt.";
    case "wallet_request_pending":
      return "A wallet request is already pending. Ask the customer to open their wallet and finish the current prompt.";
    case "wallet_unauthorized":
      return "The wallet has not authorized this site. Ask the customer to connect the correct account.";
    case "wallet_unsupported_method":
      return "The connected wallet does not support the required EVM wallet method.";
    case "wallet_chain_unsupported":
      return "The wallet does not recognize the requested EVM network.";
    case "wallet_chain_switch_failed":
      return "The wallet could not switch to the required EVM network.";
    case "wallet_chain_add_failed":
      return "The wallet could not add the required EVM network.";
    case "wallet_account_mismatch":
      return "The connected wallet account does not match the payer address on this PaymentIntent.";
    case "wallet_insufficient_funds":
      return "The wallet does not have enough native gas or voucher balance to submit this transaction.";
    case "wallet_transaction_rejected":
      return "The customer rejected the transaction signature.";
    case "wallet_transaction_failed":
      return "The wallet could not submit the transaction.";
    case "wallet_invalid_response":
      return "The wallet returned an invalid response.";
    case "wallet_unknown_error":
      return "The wallet returned an unknown error.";
  }
}

function defaultEvmWalletRetryable(code: EvmWalletErrorCode): boolean {
  return !["wallet_account_mismatch", "wallet_unsupported_method"].includes(code);
}
