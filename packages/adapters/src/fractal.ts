import type { VoucherAssetDescriptor, VoucherPaymentProof } from "@redeemloop/core";
import type { RuneBalance, RuneIndexerAdapter, RuneUtxo } from "./runes.js";
import { MockRuneIndexerAdapter } from "./runes.js";
import { MockVoucherOwnershipAdapter, type VoucherOwnershipAdapter, type VoucherOwnershipProof } from "./ownership.js";

export type FractalNetwork = "fractal-mainnet" | "fractal-testnet";

export interface FractalRuneIndexerAdapter extends RuneIndexerAdapter {
  network: FractalNetwork;
  alpha: true;
}

export interface FractalInscriptionAdapter extends VoucherOwnershipAdapter {
  network: FractalNetwork;
  alpha: true;
}

export function createMockFractalRuneIndexerAdapter(input: {
  network?: FractalNetwork;
  balances?: RuneBalance[];
  utxos?: RuneUtxo[];
} = {}): FractalRuneIndexerAdapter {
  const delegate = new MockRuneIndexerAdapter({ balances: input.balances, utxos: input.utxos });
  const network = input.network ?? "fractal-testnet";
  return {
    network,
    alpha: true,
    getRuneBalance(address, runeId) {
      return delegate.getRuneBalance(address, runeId);
    },
    listRuneUtxos(address, runeId) {
      return delegate.listRuneUtxos(address, runeId);
    },
    async getRuneTransferProof(proofInput) {
      assertFractalRuneAsset(proofInput.asset);
      const proof = await delegate.getRuneTransferProof(proofInput);
      return {
        ...proof,
        chainNamespace: "fractal",
        rawProof: {
          ...(recordOf(proof.rawProof)),
          alpha: true,
          indexer: "mock-fractal-rune",
          network,
        },
      };
    },
  };
}

export function createMockFractalInscriptionAdapter(input: {
  network?: FractalNetwork;
  owners?: Record<string, string>;
} = {}): FractalInscriptionAdapter {
  const delegate = new MockVoucherOwnershipAdapter({ owners: input.owners });
  const network = input.network ?? "fractal-testnet";
  return {
    network,
    alpha: true,
    async getOwnershipProof(ownershipInput): Promise<VoucherOwnershipProof> {
      assertFractalInscriptionAsset(ownershipInput.asset);
      const proof = await delegate.getOwnershipProof(ownershipInput);
      return {
        ...proof,
        rawProof: {
          ...(recordOf(proof.rawProof)),
          indexer: "mock-fractal-inscription",
          network,
        },
      };
    },
    async getTransferProof(transferInput): Promise<VoucherPaymentProof> {
      assertFractalInscriptionAsset(transferInput.asset);
      const proof = await delegate.getTransferProof(transferInput);
      return {
        ...proof,
        chainNamespace: "fractal",
        rawProof: {
          ...(recordOf(proof.rawProof)),
          indexer: "mock-fractal-inscription",
          network,
        },
      };
    },
  };
}

function assertFractalRuneAsset(asset: VoucherAssetDescriptor): void {
  if (asset.chainNamespace !== "fractal" || asset.assetType !== "rune") {
    throw new Error("Fractal Rune adapter requires a fractal rune asset");
  }
}

function assertFractalInscriptionAsset(asset: VoucherAssetDescriptor): void {
  if (asset.chainNamespace !== "fractal" || asset.assetType !== "inscription") {
    throw new Error("Fractal inscription adapter requires a fractal inscription asset");
  }
}

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
