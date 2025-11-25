import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  SendTransactionError,
  TransactionSignature,
  ConfirmOptions,
  Commitment,
  TransactionConfirmationStatus
} from '@solana/web3.js'
import { WalletContextState } from '@solana/wallet-adapter-react'
import { 
  solToLamports, 
  validateSufficientBalance, 
  isValidSolanaAddress,
  calculateNetworkFee 
} from './paymentUtils'

export interface TransactionResult {
  success: boolean
  signature?: string
  error?: string
  confirmationStatus?: TransactionConfirmationStatus
}

export interface PaymentTransactionParams {
  recipientAddress: string
  amountSol: number
  wallet: WalletContextState
  connection: Connection
}

export interface TransactionStatus {
  signature: string
  status: 'pending' | 'confirmed' | 'finalized' | 'failed'
  confirmations: number
  error?: string
}

export class TransactionService {
  private connection: Connection
  private confirmOptions: ConfirmOptions

  constructor(connection: Connection) {
    this.connection = connection
    this.confirmOptions = {
      commitment: 'confirmed' as Commitment,
      preflightCommitment: 'confirmed' as Commitment,
      skipPreflight: false
    }
  }

  /**
   * Create and send a SOL payment transaction
   */
  async sendPayment(params: PaymentTransactionParams): Promise<TransactionResult> {
    const { recipientAddress, amountSol, wallet } = params

    try {
      // Validate inputs
      const validation = this.validatePaymentParams(params)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Check wallet connection
      if (!wallet.connected || !wallet.publicKey || !wallet.sendTransaction) {
        return {
          success: false,
          error: 'Wallet not connected or does not support transactions'
        }
      }

      // Get wallet balance
      const balance = await this.getWalletBalance(wallet.publicKey)
      const balanceValidation = validateSufficientBalance(balance, amountSol)
      
      if (!balanceValidation.isValid) {
        return {
          success: false,
          error: balanceValidation.error
        }
      }

      // Create transaction
      const transaction = await this.createPaymentTransaction(
        wallet.publicKey,
        new PublicKey(recipientAddress),
        amountSol
      )

      // Send transaction
      const signature = await wallet.sendTransaction(transaction, this.connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      })

      // Wait for confirmation
      const confirmation = await this.confirmTransaction(signature)

      return {
        success: confirmation.success,
        signature,
        error: confirmation.error,
        confirmationStatus: confirmation.status
      }

    } catch (error) {
      return {
        success: false,
        error: this.parseTransactionError(error)
      }
    }
  }

  /**
   * Create a payment transaction
   */
  private async createPaymentTransaction(
    fromPubkey: PublicKey,
    toPubkey: PublicKey,
    amountSol: number
  ): Promise<Transaction> {
    const lamports = solToLamports(amountSol)
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports
      })
    )

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed')
    transaction.recentBlockhash = blockhash
    transaction.lastValidBlockHeight = lastValidBlockHeight
    transaction.feePayer = fromPubkey

    return transaction
  }

  /**
   * Confirm transaction on blockchain
   */
  async confirmTransaction(signature: string): Promise<{
    success: boolean
    status?: TransactionConfirmationStatus
    error?: string
  }> {
    try {
      const confirmation = await this.connection.confirmTransaction(
        signature,
        'confirmed'
      )

      if (confirmation.value.err) {
        return {
          success: false,
          error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        }
      }

      // Get transaction status
      const status = await this.connection.getSignatureStatus(signature)
      
      return {
        success: true,
        status: status.value?.confirmationStatus || 'confirmed'
      }

    } catch (error) {
      return {
        success: false,
        error: this.parseTransactionError(error)
      }
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature: string): Promise<TransactionStatus> {
    try {
      const status = await this.connection.getSignatureStatus(signature)
      
      if (!status.value) {
        return {
          signature,
          status: 'pending',
          confirmations: 0,
          error: 'Transaction not found'
        }
      }

      const confirmationStatus = status.value.confirmationStatus
      let transactionStatus: 'pending' | 'confirmed' | 'finalized' | 'failed'

      if (status.value.err) {
        transactionStatus = 'failed'
      } else if (confirmationStatus === 'finalized') {
        transactionStatus = 'finalized'
      } else if (confirmationStatus === 'confirmed') {
        transactionStatus = 'confirmed'
      } else {
        transactionStatus = 'pending'
      }

      return {
        signature,
        status: transactionStatus,
        confirmations: status.value.confirmations || 0,
        error: status.value.err ? JSON.stringify(status.value.err) : undefined
      }

    } catch (error) {
      return {
        signature,
        status: 'failed',
        confirmations: 0,
        error: this.parseTransactionError(error)
      }
    }
  }

  /**
   * Get wallet SOL balance
   */
  async getWalletBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey, 'confirmed')
      return balance / 1000000000 // Convert lamports to SOL
    } catch (error) {
      throw new Error(`Failed to get wallet balance: ${this.parseTransactionError(error)}`)
    }
  }

  /**
   * Validate payment parameters
   */
  private validatePaymentParams(params: PaymentTransactionParams): {
    isValid: boolean
    error?: string
  } {
    const { recipientAddress, amountSol, wallet } = params

    if (!isValidSolanaAddress(recipientAddress)) {
      return {
        isValid: false,
        error: 'Invalid recipient address'
      }
    }

    if (!wallet.publicKey) {
      return {
        isValid: false,
        error: 'Wallet not connected'
      }
    }

    if (amountSol <= 0) {
      return {
        isValid: false,
        error: 'Payment amount must be greater than 0'
      }
    }

    if (amountSol > 1000000) {
      return {
        isValid: false,
        error: 'Payment amount exceeds maximum limit'
      }
    }

    return { isValid: true }
  }

  /**
   * Parse transaction errors into user-friendly messages
   */
  private parseTransactionError(error: unknown): string {
    if (error instanceof SendTransactionError) {
      return `Transaction failed: ${error.message}`
    }

    if (error instanceof Error) {
      // Common Solana error patterns
      if (error.message.includes('insufficient funds')) {
        return 'Insufficient SOL balance for this transaction'
      }
      
      if (error.message.includes('blockhash not found')) {
        return 'Transaction expired. Please try again'
      }
      
      if (error.message.includes('User rejected')) {
        return 'Transaction was rejected by user'
      }

      if (error.message.includes('Network request failed')) {
        return 'Network error. Please check your connection and try again'
      }

      return error.message
    }

    return 'An unexpected error occurred during the transaction'
  }

  /**
   * Estimate transaction fee
   */
  async estimateTransactionFee(
    fromPubkey: PublicKey,
    toPubkey: PublicKey,
    amountSol: number
  ): Promise<number> {
    try {
      const transaction = await this.createPaymentTransaction(fromPubkey, toPubkey, amountSol)
      const fee = await this.connection.getFeeForMessage(transaction.compileMessage(), 'confirmed')
      
      if (fee.value === null) {
        return calculateNetworkFee() // Fallback to standard fee
      }

      return fee.value / 1000000000 // Convert lamports to SOL
    } catch (error) {
      return calculateNetworkFee() // Fallback to standard fee
    }
  }
}
