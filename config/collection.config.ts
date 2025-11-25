/**
 * Collection Management Configuration
 */

export const COLLECTION_CONFIG = {
  // Solana Network Configuration
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  SOLANA_CLUSTER: process.env.SOLANA_CLUSTER || 'devnet',
  
  // Collection Creation Settings
  COLLECTION_CREATOR_FEE: parseFloat(process.env.COLLECTION_CREATOR_FEE || '0.01'),
  MAX_COLLECTION_RETRIES: parseInt(process.env.MAX_COLLECTION_RETRIES || '3'),
  COLLECTION_CONFIRMATION_TIMEOUT: parseInt(process.env.COLLECTION_CONFIRMATION_TIMEOUT || '30000'),
  
  // Collection Metadata Defaults
  DEFAULT_COLLECTION_IMAGE: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop&crop=center',
  PLATFORM_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://parchi.app',
  
  // Validation Rules
  COLLECTION_PUBKEY_LENGTH: 44,
  TRANSACTION_SIGNATURE_LENGTH: 88,
  
  // Rate Limiting
  COLLECTION_CREATION_RATE_LIMIT: parseInt(process.env.COLLECTION_CREATION_RATE_LIMIT || '5'), // per hour
  
  // Error Messages
  ERRORS: {
    WALLET_NOT_CONNECTED: 'Wallet not connected',
    UNAUTHORIZED_ORGANIZER: 'Only event organizer can create collection',
    EVENT_NOT_FOUND: 'Event not found',
    COLLECTION_EXISTS: 'Collection already exists for this event',
    INVALID_EVENT_STATE: 'Collection can only be created for draft events',
    INVALID_PUBKEY_FORMAT: 'Invalid public key format',
    INVALID_SIGNATURE_FORMAT: 'Invalid transaction signature format',
    TRANSACTION_FAILED: 'Blockchain transaction failed',
    CONFIRMATION_TIMEOUT: 'Transaction confirmation timeout',
    NETWORK_ERROR: 'Network error occurred'
  }
} as const;

/**
 * Validate collection pubkey format
 */
export function validateCollectionPubkey(pubkey: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{44}$/;
  return base58Regex.test(pubkey);
}

/**
 * Validate transaction signature format
 */
export function validateTransactionSignature(signature: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
  return base58Regex.test(signature);
}

/**
 * Get collection name for organizer
 */
export function getOrganizerCollectionName(organizerPubkey: string): string {
  return `Parchi Event Tickets - ${organizerPubkey.slice(0, 8)}`;
}

/**
 * Get collection description for organizer
 */
export function getOrganizerCollectionDescription(organizerPubkey: string): string {
  return `Official event tickets collection for organizer ${organizerPubkey}. All tickets from this organizer's events are minted in this collection.`;
}
