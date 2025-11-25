import { LAMPORTS_PER_SOL } from '@solana/web3.js'

export interface PaymentValidationResult {
  isValid: boolean
  error?: string
}

export interface PaymentAmount {
  sol: number
  lamports: number
  formatted: string
}

/**
 * Convert SOL to lamports with precision handling
 */
export function solToLamports(sol: number): number {
  if (!isValidSolAmount(sol)) {
    throw new Error('Invalid SOL amount')
  }
  return Math.floor(sol * LAMPORTS_PER_SOL)
}

/**
 * Convert lamports to SOL with proper formatting
 */
export function lamportsToSol(lamports: number): number {
  if (!Number.isInteger(lamports) || lamports < 0) {
    throw new Error('Invalid lamports amount')
  }
  return lamports / LAMPORTS_PER_SOL
}

/**
 * Validate SOL amount for payments
 */
export function isValidSolAmount(amount: number): boolean {
  return (
    typeof amount === 'number' &&
    !isNaN(amount) &&
    isFinite(amount) &&
    amount > 0 &&
    amount <= 1000000 && // Max 1M SOL per transaction
    Number(amount.toFixed(9)) === amount // Max 9 decimal places
  )
}

/**
 * Validate wallet balance is sufficient for payment
 */
export function validateSufficientBalance(
  walletBalance: number,
  paymentAmount: number,
  networkFee: number = 0.000005 // Default Solana transaction fee
): PaymentValidationResult {
  if (!isValidSolAmount(paymentAmount)) {
    return {
      isValid: false,
      error: 'Invalid payment amount'
    }
  }

  const totalRequired = paymentAmount + networkFee

  if (walletBalance < totalRequired) {
    return {
      isValid: false,
      error: `Insufficient balance. Required: ${totalRequired.toFixed(6)} SOL, Available: ${walletBalance.toFixed(6)} SOL`
    }
  }

  return { isValid: true }
}

/**
 * Format payment amount for display
 */
export function formatPaymentAmount(sol: number): PaymentAmount {
  if (!isValidSolAmount(sol)) {
    throw new Error('Invalid SOL amount for formatting')
  }

  return {
    sol,
    lamports: solToLamports(sol),
    formatted: `${sol.toFixed(6)} SOL`
  }
}

/**
 * Calculate network fee estimate
 */
export function calculateNetworkFee(): number {
  // Standard Solana transaction fee
  return 0.000005
}

/**
 * Validate recipient address format
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false
  }

  // Basic Solana address validation (base58, 32-44 characters)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  return base58Regex.test(address)
}

/**
 * Generate payment summary for confirmation
 */
export function generatePaymentSummary(
  ticketPrice: number,
  quantity: number,
  recipientAddress: string
): {
  subtotal: PaymentAmount
  networkFee: PaymentAmount
  total: PaymentAmount
  recipient: string
  isValid: boolean
  error?: string
} {
  try {
    if (!isValidSolanaAddress(recipientAddress)) {
      return {
        subtotal: formatPaymentAmount(0),
        networkFee: formatPaymentAmount(0),
        total: formatPaymentAmount(0),
        recipient: recipientAddress,
        isValid: false,
        error: 'Invalid recipient address'
      }
    }

    const subtotal = ticketPrice * quantity
    const networkFee = calculateNetworkFee()
    const total = subtotal + networkFee

    if (!isValidSolAmount(subtotal) || !isValidSolAmount(total)) {
      return {
        subtotal: formatPaymentAmount(0),
        networkFee: formatPaymentAmount(0),
        total: formatPaymentAmount(0),
        recipient: recipientAddress,
        isValid: false,
        error: 'Invalid payment calculation'
      }
    }

    return {
      subtotal: formatPaymentAmount(subtotal),
      networkFee: formatPaymentAmount(networkFee),
      total: formatPaymentAmount(total),
      recipient: recipientAddress,
      isValid: true
    }
  } catch (error) {
    return {
      subtotal: formatPaymentAmount(0),
      networkFee: formatPaymentAmount(0),
      total: formatPaymentAmount(0),
      recipient: recipientAddress,
      isValid: false,
      error: error instanceof Error ? error.message : 'Payment calculation failed'
    }
  }
}
