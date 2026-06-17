import type { Address, Hex } from "viem";

export type RedemptionModeValue = 0 | 1;
export type RedemptionModeName = "BURN" | "COLLECT";
export type CommerceProvider = "shopify" | "woocommerce" | "custom";

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

export interface RedemptionIntentResponse {
  authorization: RedeemAuthorizationJson;
  typedData: {
    domain: {
      name: string;
      version: string;
      chainId: number;
      verifyingContract: Address;
    };
    types: {
      RedeemAuthorization: readonly { name: string; type: string }[];
    };
    primaryType: "RedeemAuthorization";
    message: RedeemAuthorizationJson;
  };
  expiresAt: string;
}

export interface CommercePaymentResponse {
  paymentId: string;
  provider: CommerceProvider;
  merchantId: Hex;
  chainId: number;
  orderId: string;
  voucherToken: Address;
  amount: string;
  receiver: Address;
  merchantReceiver?: Address;
  status: "intent_created" | "verified" | "paid";
  dryRun: boolean;
  txHash?: Hex;
  redemptionId?: string;
  commerce?: {
    provider: CommerceProvider;
    orderId: string;
    markedPaid: boolean;
    dryRun: boolean;
    request: {
      method: "POST" | "PUT";
      url: string;
      headers: string[];
      body: unknown;
    };
  };
}
