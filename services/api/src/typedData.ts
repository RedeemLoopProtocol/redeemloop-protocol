import {
  type Address,
  type Hex,
  getAddress,
  isAddress,
  isHex,
  keccak256,
  size,
  toBytes,
} from "viem";

export type RedemptionModeName = "BURN" | "COLLECT";
export type RedemptionModeValue = 0 | 1;

export interface RedemptionIntentInput {
  chainId: number;
  user: string;
  token: string;
  amount: string;
  merchantId: string;
  storeId: string;
  terminalId: string;
  termsHash: string;
  redemptionMode: RedemptionModeName | RedemptionModeValue;
  deadlineSeconds?: number;
}

export interface RedeemAuthorizationJson {
  user: Address;
  voucherToken: Address;
  tokenId: string;
  amount: string;
  merchantId: Hex;
  storeId: Hex;
  terminalId: Hex;
  termsHash: Hex;
  redemptionMode: RedemptionModeValue;
  nonce: string;
  deadline: string;
}

export interface RedeemAuthorizationTypedDataMessage {
  user: Address;
  voucherToken: Address;
  tokenId: bigint;
  amount: bigint;
  merchantId: Hex;
  storeId: Hex;
  terminalId: Hex;
  termsHash: Hex;
  redemptionMode: RedemptionModeValue;
  nonce: bigint;
  deadline: bigint;
}

export const redeemAuthorizationTypes = {
  RedeemAuthorization: [
    { name: "user", type: "address" },
    { name: "voucherToken", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "amount", type: "uint256" },
    { name: "merchantId", type: "bytes32" },
    { name: "storeId", type: "bytes32" },
    { name: "terminalId", type: "bytes32" },
    { name: "termsHash", type: "bytes32" },
    { name: "redemptionMode", type: "uint8" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export function buildTypedData(authorization: RedeemAuthorizationJson, chainId: number) {
  const normalizedChainId = normalizeChainId(chainId);
  return {
    domain: {
      name: "RedeemLoopRedemption",
      version: "1",
      chainId: normalizedChainId,
      verifyingContract: authorization.voucherToken,
    },
    types: redeemAuthorizationTypes,
    primaryType: "RedeemAuthorization" as const,
    message: toTypedDataMessage(authorization),
  };
}

export function buildTypedDataJson(authorization: RedeemAuthorizationJson, chainId: number) {
  const normalizedChainId = normalizeChainId(chainId);
  return {
    domain: {
      name: "RedeemLoopRedemption",
      version: "1",
      chainId: normalizedChainId,
      verifyingContract: authorization.voucherToken,
    },
    types: redeemAuthorizationTypes,
    primaryType: "RedeemAuthorization" as const,
    message: authorization,
  };
}

export function toTypedDataMessage(authorization: RedeemAuthorizationJson): RedeemAuthorizationTypedDataMessage {
  return {
    user: authorization.user,
    voucherToken: authorization.voucherToken,
    tokenId: BigInt(authorization.tokenId),
    amount: BigInt(authorization.amount),
    merchantId: authorization.merchantId,
    storeId: authorization.storeId,
    terminalId: authorization.terminalId,
    termsHash: authorization.termsHash,
    redemptionMode: authorization.redemptionMode,
    nonce: BigInt(authorization.nonce),
    deadline: BigInt(authorization.deadline),
  };
}

export function toContractAuthorization(authorization: RedeemAuthorizationJson) {
  return {
    user: authorization.user,
    voucherToken: authorization.voucherToken,
    tokenId: BigInt(authorization.tokenId),
    amount: BigInt(authorization.amount),
    merchantId: authorization.merchantId,
    storeId: authorization.storeId,
    terminalId: authorization.terminalId,
    termsHash: authorization.termsHash,
    redemptionMode: authorization.redemptionMode,
    nonce: BigInt(authorization.nonce),
    deadline: BigInt(authorization.deadline),
  };
}

export function normalizeAddress(value: string, fieldName: string): Address {
  if (!isAddress(value)) {
    throw new Error(`${fieldName} must be an EVM address`);
  }
  return getAddress(value);
}

export function normalizeBytes32(value: string, fieldName: string): Hex {
  if (isHex(value) && size(value) === 32) {
    return value;
  }
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
  return keccak256(toBytes(value));
}

export function normalizeMode(value: RedemptionIntentInput["redemptionMode"]): RedemptionModeValue {
  if (value === 0 || value === "BURN") return 0;
  if (value === 1 || value === "COLLECT") return 1;
  throw new Error("redemptionMode must be BURN or COLLECT");
}

export function normalizeAmount(value: string, fieldName = "amount"): string {
  if (!isPositiveIntegerString(value)) {
    throw new Error(`${fieldName} must be a positive integer string`);
  }
  return value;
}

export function normalizeUintString(value: string, fieldName: string): string {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${fieldName} must be an unsigned integer string`);
  }
  return value;
}

export function normalizeChainId(value: unknown, fieldName = "chainId"): number {
  const chainId = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error(`${fieldName} must be a positive safe integer`);
  }
  return chainId;
}

export function normalizeDeadlineSeconds(value: unknown): number {
  const deadlineSeconds = value === undefined ? 600 : Number(value);
  if (!Number.isSafeInteger(deadlineSeconds) || deadlineSeconds <= 0 || deadlineSeconds > 86_400) {
    throw new Error("deadlineSeconds must be an integer between 1 and 86400");
  }
  return deadlineSeconds;
}

function isPositiveIntegerString(value: string): boolean {
  return /^[1-9][0-9]*$/.test(value);
}
