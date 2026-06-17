import type { RedeemAuthorizationJson } from "./types";

export function createRedeemLink(authorization: RedeemAuthorizationJson, chainId: number): string {
  const params = new URLSearchParams({
    chainId: String(chainId),
    token: authorization.voucherToken,
    amount: authorization.amount,
    storeId: authorization.storeId,
    terminalId: authorization.terminalId,
    nonce: authorization.nonce,
  });

  return `redeemloop://redeem?${params.toString()}`;
}

export function shortenHash(value: string, visible = 6): string {
  if (value.length <= visible * 2 + 2) return value;
  return `${value.slice(0, visible + 2)}...${value.slice(-visible)}`;
}
