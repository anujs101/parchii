"use client"

import React, { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, CheckCircle, XCircle, ExternalLink, Copy, AlertTriangle } from 'lucide-react'
import { TransactionService, TransactionResult, TransactionStatus } from '@/lib/solana/transactionService'
import { generatePaymentSummary, formatPaymentAmount } from '@/lib/solana/paymentUtils'
import { useToast } from '@/hooks/use-toast'

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  ticketPrice: number
  quantity: number
  eventTitle: string
  recipientAddress: string
  onSuccess?: (signature: string) => void
  onError?: (error: string) => void
}

type TransactionStep = 'confirmation' | 'processing' | 'success' | 'error'

export function TransactionModal({
  isOpen,
  onClose,
  ticketPrice,
  quantity,
  eventTitle,
  recipientAddress,
  onSuccess,
  onError
}: TransactionModalProps) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const { toast } = useToast()
  const router = useRouter()

  const [step, setStep] = useState<TransactionStep>('confirmation')
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null)
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate payment summary
  const paymentSummary = generatePaymentSummary(ticketPrice, quantity, recipientAddress)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('confirmation')
      setTransactionResult(null)
      setTransactionStatus(null)
      setIsProcessing(false)
      setError(null)
    }
  }, [isOpen])

  // Poll transaction status
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (transactionResult?.signature && step === 'processing') {
      const transactionService = new TransactionService(connection)
      
      interval = setInterval(async () => {
        try {
          const status = await transactionService.getTransactionStatus(transactionResult.signature!)
          setTransactionStatus(status)

          if (status.status === 'confirmed' || status.status === 'finalized') {
            setStep('success')
            onSuccess?.(transactionResult.signature!)
            
            // Redirect to success page after a short delay
            setTimeout(() => {
              const params = new URLSearchParams({
                event: eventTitle,
                quantity: quantity.toString(),
                amount: paymentSummary.total.formatted,
                signature: transactionResult.signature!,
                price: ticketPrice.toString()
              })
              router.push(`/purchase-success?${params.toString()}`)
            }, 2000)
            
            clearInterval(interval)
          } else if (status.status === 'failed') {
            setStep('error')
            setError(status.error || 'Transaction failed')
            onError?.(status.error || 'Transaction failed')
            clearInterval(interval)
          }
        } catch (err) {
          console.error('Error polling transaction status:', err)
        }
      }, 2000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [transactionResult?.signature, step, connection, onSuccess, onError])

  const handleConfirmPayment = async () => {
    if (!paymentSummary.isValid) {
      setError(paymentSummary.error || 'Invalid payment parameters')
      setStep('error')
      return
    }

    setIsProcessing(true)
    setStep('processing')

    try {
      const transactionService = new TransactionService(connection)
      
      const result = await transactionService.sendPayment({
        recipientAddress,
        amountSol: paymentSummary.total.sol,
        wallet,
        connection
      })

      setTransactionResult(result)

      if (result.success && result.signature) {
        // Continue polling for confirmation
        toast({
          title: "Transaction Submitted",
          description: "Your payment is being processed on the blockchain.",
        })
      } else {
        setStep('error')
        setError(result.error || 'Transaction failed')
        onError?.(result.error || 'Transaction failed')
      }
    } catch (err) {
      setStep('error')
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    if (step !== 'processing') {
      onClose()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Transaction signature copied to clipboard.",
    })
  }

  const openInExplorer = (signature: string) => {
    window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            {step === 'confirmation' && 'Confirm Payment'}
            {step === 'processing' && 'Processing Payment'}
            {step === 'success' && 'Payment Successful'}
            {step === 'error' && 'Payment Failed'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Details */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-slate-400">Event</h4>
            <p className="font-semibold text-white">{eventTitle}</p>
            <p className="text-sm text-slate-300">
              {quantity} ticket{quantity > 1 ? 's' : ''} × {formatPaymentAmount(ticketPrice).formatted}
            </p>
          </div>

          <Separator className="bg-slate-700" />

          {/* Payment Summary */}
          {paymentSummary.isValid && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-slate-400">Payment Summary</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-300">
                  <span>Subtotal</span>
                  <span>{paymentSummary.subtotal.formatted}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-300">
                  <span>Network Fee</span>
                  <span>{paymentSummary.networkFee.formatted}</span>
                </div>
                <Separator className="bg-slate-700" />
                <div className="flex justify-between font-semibold text-white">
                  <span>Total</span>
                  <span className="text-cyan-400">{paymentSummary.total.formatted}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {(error || !paymentSummary.isValid) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error || paymentSummary.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Transaction Status */}
          {step === 'processing' && transactionResult?.signature && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                <span className="text-sm text-slate-300">Confirming transaction...</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Transaction</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-300 hover:text-white hover:bg-slate-800"
                      onClick={() => copyToClipboard(transactionResult.signature!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-300 hover:text-white hover:bg-slate-800"
                      onClick={() => openInExplorer(transactionResult.signature!)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs font-mono bg-slate-800 text-slate-300 p-2 rounded break-all">
                  {transactionResult.signature}
                </p>
              </div>

              {transactionStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Status</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    transactionStatus.status === 'confirmed' || transactionStatus.status === 'finalized' 
                      ? 'bg-green-600/20 text-green-400 border border-green-600/30' 
                      : transactionStatus.status === 'failed' 
                        ? 'bg-red-600/20 text-red-400 border border-red-600/30' 
                        : 'bg-slate-600/20 text-slate-300 border border-slate-600/30'
                  }`}>
                    {transactionStatus.status}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {step === 'success' && transactionResult?.signature && (
            <div className="space-y-3 text-center">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
              <div>
                <h3 className="font-semibold text-green-400">Payment Successful!</h3>
                <p className="text-sm text-slate-300 mt-1">
                  Your tickets have been purchased successfully.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Transaction</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-300 hover:text-white hover:bg-slate-800"
                      onClick={() => copyToClipboard(transactionResult.signature!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-300 hover:text-white hover:bg-slate-800"
                      onClick={() => openInExplorer(transactionResult.signature!)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs font-mono bg-slate-800 text-slate-300 p-2 rounded break-all">
                  {transactionResult.signature}
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {step === 'error' && (
            <div className="space-y-3 text-center">
              <XCircle className="h-12 w-12 text-red-400 mx-auto" />
              <div>
                <h3 className="font-semibold text-red-400">Payment Failed</h3>
                <p className="text-sm text-slate-300 mt-1">
                  Please try again or contact support if the problem persists.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {step === 'confirmation' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleClose} 
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmPayment} 
                  disabled={!paymentSummary.isValid || isProcessing}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ${paymentSummary.total.formatted}`
                  )}
                </Button>
              </>
            )}

            {step === 'processing' && (
              <Button 
                variant="outline" 
                disabled 
                className="flex-1 border-slate-600 text-slate-400"
              >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </Button>
            )}

            {(step === 'success' || step === 'error') && (
              <Button 
                onClick={handleClose} 
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
              >
                {step === 'success' ? 'Done' : 'Close'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
