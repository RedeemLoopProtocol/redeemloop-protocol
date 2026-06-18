import type { VoucherAssetDescriptor, VoucherPaymentProof } from "@redeemloop/core";

export type VoucherOwnershipStatus = "owned" | "not_owned" | "unknown";

export interface VoucherOwnershipProof {
  owner: string;
  asset: VoucherAssetDescriptor;
  status: VoucherOwnershipStatus;
  checkedAt: string;
  rawProof?: unknown;
  alpha: true;
}

export interface VoucherOwnershipAdapter {
  getOwnershipProof(input: { owner: string; asset: VoucherAssetDescriptor }): Promise<VoucherOwnershipProof>;
  getTransferProof(input: {
    intentId: string;
    txid: string;
    asset: VoucherAssetDescriptor;
    from: string;
    to: string;
    confirmations?: number;
  }): Promise<VoucherPaymentProof>;
}

export class MockVoucherOwnershipAdapter implements VoucherOwnershipAdapter {
  constructor(private readonly fixtures: { owners?: Record<string, string> } = {}) {}

  async getOwnershipProof(input: { owner: string; asset: VoucherAssetDescriptor }): Promise<VoucherOwnershipProof> {
    assertOwnershipAsset(input.asset);
    const currentOwner = this.fixtures.owners?.[ownershipAssetKey(input.asset)];
    return {
      owner: input.owner,
      asset: input.asset,
      status: currentOwner === undefined ? "unknown" : normalizeOwner(currentOwner) === normalizeOwner(input.owner) ? "owned" : "not_owned",
      checkedAt: new Date().toISOString(),
      rawProof: {
        alpha: true,
        currentOwner,
      },
      alpha: true,
    };
  }

  async getTransferProof(input: {
    intentId: string;
    txid: string;
    asset: VoucherAssetDescriptor;
    from: string;
    to: string;
    confirmations?: number;
  }): Promise<VoucherPaymentProof> {
    assertOwnershipAsset(input.asset);
    const confirmations = input.confirmations ?? 1;
    return {
      proofId: `proof_${input.txid}`,
      intentId: input.intentId,
      chainNamespace: input.asset.chainNamespace,
      chainId: input.asset.chainId,
      txid: input.txid,
      confirmations,
      from: input.from,
      to: input.to,
      assetType: input.asset.assetType,
      assetId: input.asset.assetId,
      contract: input.asset.contract,
      tokenId: input.asset.tokenId,
      amount: input.asset.requiredAmount,
      status: confirmations > 0 ? "confirmed" : "seen",
      rawProof: {
        alpha: true,
        ownershipAssetKey: ownershipAssetKey(input.asset),
      },
    };
  }
}

export function ownershipAssetKey(asset: VoucherAssetDescriptor): string {
  if (asset.assetType === "inscription") return `${asset.chainNamespace}:inscription:${asset.inscriptionId ?? asset.assetId}`;
  if (asset.assetType === "erc721" || asset.assetType === "erc1155") return `${asset.chainNamespace}:${asset.assetType}:${asset.contract ?? ""}:${asset.tokenId ?? asset.assetId}`;
  throw new Error("Ownership proof adapters support inscription, erc721, and erc1155 assets");
}

function assertOwnershipAsset(asset: VoucherAssetDescriptor): void {
  if (asset.assetType !== "inscription" && asset.assetType !== "erc721" && asset.assetType !== "erc1155") {
    throw new Error("Ownership proof adapters support inscription, erc721, and erc1155 assets");
  }
}

function normalizeOwner(owner: string): string {
  return owner.toLowerCase();
}
