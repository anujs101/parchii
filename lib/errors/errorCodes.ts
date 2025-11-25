/**
 * Error codes and handling for the Parchi platform
 */

export const ERROR_CODES = {
  // Authentication & Wallet
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  INVALID_WALLET_ADDRESS: 'INVALID_WALLET_ADDRESS',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  
  // Collection Management
  COLLECTION_ALREADY_EXISTS: 'COLLECTION_ALREADY_EXISTS',
  COLLECTION_NOT_FOUND: 'COLLECTION_NOT_FOUND',
  INVALID_COLLECTION_DATA: 'INVALID_COLLECTION_DATA',
  
  // IPFS & Metadata
  IPFS_UPLOAD_FAILED: 'IPFS_UPLOAD_FAILED',
  METADATA_INVALID: 'METADATA_INVALID',
  PINATA_CONFIG_MISSING: 'PINATA_CONFIG_MISSING',
  
  // Blockchain Transactions
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  TRANSACTION_TIMEOUT: 'TRANSACTION_TIMEOUT',
  TRANSACTION_NOT_CONFIRMED: 'TRANSACTION_NOT_CONFIRMED',
  INVALID_TRANSACTION_SIGNATURE: 'INVALID_TRANSACTION_SIGNATURE',
  
  // Event Management
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  INVALID_ORGANIZER: 'INVALID_ORGANIZER',
  EVENT_NOT_PUBLISHED: 'EVENT_NOT_PUBLISHED',
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // General
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_REQUEST: 'INVALID_REQUEST'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: string;
  timestamp: number;
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.WALLET_NOT_CONNECTED]: 'Please connect your wallet to continue',
  [ERROR_CODES.INVALID_WALLET_ADDRESS]: 'Invalid wallet address provided',
  [ERROR_CODES.INSUFFICIENT_FUNDS]: 'Insufficient funds to complete transaction',
  
  [ERROR_CODES.COLLECTION_ALREADY_EXISTS]: 'Collection already exists for this organizer',
  [ERROR_CODES.COLLECTION_NOT_FOUND]: 'Collection not found',
  [ERROR_CODES.INVALID_COLLECTION_DATA]: 'Invalid collection data provided',
  
  [ERROR_CODES.IPFS_UPLOAD_FAILED]: 'Failed to upload metadata to IPFS',
  [ERROR_CODES.METADATA_INVALID]: 'Invalid metadata format',
  [ERROR_CODES.PINATA_CONFIG_MISSING]: 'IPFS service configuration missing',
  
  [ERROR_CODES.TRANSACTION_FAILED]: 'Transaction failed to execute',
  [ERROR_CODES.TRANSACTION_TIMEOUT]: 'Transaction timed out',
  [ERROR_CODES.TRANSACTION_NOT_CONFIRMED]: 'Transaction not confirmed on blockchain',
  [ERROR_CODES.INVALID_TRANSACTION_SIGNATURE]: 'Invalid transaction signature',
  
  [ERROR_CODES.EVENT_NOT_FOUND]: 'Event not found',
  [ERROR_CODES.INVALID_ORGANIZER]: 'Invalid organizer credentials',
  [ERROR_CODES.EVENT_NOT_PUBLISHED]: 'Event is not published yet',
  
  [ERROR_CODES.DATABASE_ERROR]: 'Database operation failed',
  [ERROR_CODES.VALIDATION_ERROR]: 'Data validation failed',
  
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'An internal server error occurred',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded, please try again later',
  [ERROR_CODES.INVALID_REQUEST]: 'Invalid request format'
};

/**
 * Create a standardized API error response
 */
export function createApiError(
  code: ErrorCode,
  details?: string,
  customMessage?: string
): ApiError {
  return {
    code,
    message: customMessage || ERROR_MESSAGES[code],
    details,
    timestamp: Date.now()
  };
}

/**
 * Check if an error is a known API error
 */
export function isApiError(error: any): error is ApiError {
  return error && typeof error === 'object' && 'code' in error && 'message' in error;
}
