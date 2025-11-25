import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { WalletAdapter } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

/**
 * Create and configure UMI instance for Metaplex Core operations
 */
export function createUmiInstance(wallet?: WalletAdapter) {
  // Use devnet for development, mainnet for production
  const endpoint = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl('mainnet-beta')
    : clusterApiUrl('devnet');
  
  const umi = createUmi(endpoint);
  
  // Install Metaplex Core plugin
  umi.use(mplCore());
  
  // Set wallet identity if provided
  if (wallet) {
    umi.use(walletAdapterIdentity(wallet));
  }
  
  return umi;
}

/**
 * Get UMI instance with wallet context
 */
export function getUmiWithWallet(wallet: WalletAdapter) {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }
  
  return createUmiInstance(wallet);
}
