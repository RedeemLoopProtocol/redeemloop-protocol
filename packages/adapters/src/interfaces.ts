import type { VoucherAssetDescriptor, VoucherPaymentProof } from "@redeemloop/core";

export interface AssetBalance {
  address: string;
  asset: VoucherAssetDescriptor;
  amount: string;
  raw?: unknown;
}

export interface WalletAccount {
  address: string;
  publicKey?: string;
  chainNamespace: "eip155" | "bitcoin" | "fractal";
  chainId?: number;
}

export interface EvmAdapter {
  getBalance(address: string, asset: VoucherAssetDescriptor): Promise<AssetBalance>;
  requestTransfer(input: {
    from: string;
    to: string;
    asset: VoucherAssetDescriptor;
    amount: string;
  }): Promise<{ txid: string }>;
  getTransferProof(txid: string, asset: VoucherAssetDescriptor): Promise<VoucherPaymentProof>;
}

export interface PsbtTransferInput {
  from: string;
  to: string;
  asset: VoucherAssetDescriptor;
  amount: string;
  feeRate?: number;
}

export interface PsbtBuildResult {
  psbtBase64: string;
  estimatedFee?: string;
  changeAddress?: string;
}

export interface PsbtBuilderAdapter {
  buildTransferPsbt(input: PsbtTransferInput): Promise<PsbtBuildResult>;
}

export interface BitcoinWalletAdapter {
  connect(): Promise<WalletAccount>;
  signPsbt(psbtBase64: string): Promise<string>;
  broadcast?(signedPsbtBase64: string): Promise<string>;
}

export interface IndexerAdapter {
  getBalance(address: string, asset: VoucherAssetDescriptor): Promise<AssetBalance>;
  getTransferProof(txid: string, asset: VoucherAssetDescriptor): Promise<VoucherPaymentProof>;
  watchVault?(vault: string, asset: VoucherAssetDescriptor): AsyncIterable<VoucherPaymentProof>;
}
