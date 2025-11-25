"use client"

import React, { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { TransactionModal } from './TransactionModal'
import { Wallet, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Transaction, VersionedTransaction } from '@solana/web3.js'
import { createUmiInstance } from '@/lib/metaplex/umiConfig'
import { purchaseTicket, updateTicketAfterMinting, validatePurchaseInput } from '@/lib/services/ticketService'

interface PaymentButtonProps {
  eventId: string
  ticketPrice: number
  quantity: number
  eventTitle: string
  disabled?: boolean
  onPaymentSuccess?: (signature: string, ticketData: any) => void
  onPaymentError?: (error: string) => void
  className?: string
}

export function PaymentButton({
  eventId,
  ticketPrice,
  quantity,
  eventTitle,
  disabled = false,
  onPaymentSuccess,
  onPaymentError,
  className = ''
}: PaymentButtonProps) {
  const { connected, connecting, publicKey, sendTransaction, wallet } = useWallet()
  const { connection } = useConnection()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePaymentClick = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to purchase tickets.",
        variant: "destructive"
      })
      return
    }

    if (quantity !== 1) {
      toast({
        title: "Invalid Quantity",
        description: "Only single ticket purchases are currently supported.",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)

    try {
      // Create UMI instance with wallet
      if (!wallet) {
        throw new Error('Wallet not available')
      }
      const umi = createUmiInstance(wallet.adapter)

      // Purchase ticket (this creates the transaction)
      console.log('=== STARTING TICKET PURCHASE ===');
      const purchaseData = await purchaseTicket(umi, {
        eventId,
        buyerPubkey: publicKey.toString(),
        quantity
      })
      console.log('Purchase data received:', purchaseData);

      // Deserialize transaction (handle both legacy and versioned)
      const transactionBuffer = Buffer.from(purchaseData.transaction, 'base64')
      let transaction: Transaction | VersionedTransaction
      
      try {
        // Try versioned transaction first
        transaction = VersionedTransaction.deserialize(transactionBuffer)
        console.log('Using versioned transaction');
      } catch {
        // Fall back to legacy transaction
        transaction = Transaction.from(transactionBuffer)
        console.log('Using legacy transaction');
      }
      
      console.log('=== SENDING TRANSACTION TO WALLET ===');
      const signature = await sendTransaction(transaction, connection)
      console.log('Transaction signature:', signature);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')

      // Update ticket status after successful minting
      await updateTicketAfterMinting(purchaseData.ticketId, signature)

      toast({
        title: "Purchase Successful!",
        description: `Ticket #${purchaseData.ticketNumber} purchased successfully.`,
      })

      onPaymentSuccess?.(signature, purchaseData)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Purchase failed'
      
      toast({
        title: "Purchase Failed",
        description: errorMessage,
        variant: "destructive"
      })

      onPaymentError?.(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const totalAmount = ticketPrice * quantity

  return (
    <Button
      onClick={handlePaymentClick}
      disabled={disabled || connecting || !connected || quantity === 0 || isProcessing}
      className={className}
      size="lg"
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : connecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : !connected ? (
        <>
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet to Pay
        </>
      ) : (
        `Buy Ticket - ${(totalAmount / 1e9).toFixed(4)} SOL`
      )}
    </Button>
  )
}
