"use client"

import React, { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters'
import { createCollectionV1 } from '@metaplex-foundation/mpl-core'
import { publicKey as umiPublicKey, generateSigner, percentAmount } from '@metaplex-foundation/umi'
import { Loader2 } from "lucide-react"
import { createApiError, ERROR_CODES, isApiError } from '@/lib/errors/errorCodes'
import { Transaction } from '@solana/web3.js'
import { Plus } from 'lucide-react'

interface CreateCollectionButtonProps {
  organizerPubkey: string
  eventIds?: string[] // Optional: specific events to associate
  onCollectionCreated?: (collectionPubkey: string) => void
  disabled?: boolean
  className?: string
}

export function CreateCollectionButton({
  organizerPubkey,
  eventIds,
  onCollectionCreated,
  disabled = false,
  className = ''
}: CreateCollectionButtonProps) {
  const { connected, publicKey, sendTransaction, wallet } = useWallet()
  const { connection } = useConnection()
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateCollection = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to create a collection.",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)

    try {
      // Step 1: Generate collection signer on frontend (we need the private key to sign)
      if (!wallet) {
        throw new Error('Wallet not available')
      }
      
      const umi = createUmi(connection.rpcEndpoint).use(walletAdapterIdentity(wallet.adapter))
      const collectionSigner = generateSigner(umi)
      const collectionPubkey = collectionSigner.publicKey.toString()

      // Step 2: Call backend to prepare metadata with our collection pubkey
      const prepareResponse = await fetch('/api/collections/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizerPubkey: publicKey.toString(),
          collectionPubkey: collectionPubkey, // Send our generated pubkey to backend
          eventIds
        })
      })

      if (!prepareResponse.ok) {
        const error = await prepareResponse.json()
        throw new Error(error.message || 'Failed to prepare collection creation')
      }

      const result = await prepareResponse.json()

      if (!result.success) {
        throw new Error(result.message || 'Collection preparation failed')
      }

      // Step 3: If no transaction needed (existing collection), we're done
      if (!result.requiresTransaction) {
        toast({
          title: "Collection Ready!",
          description: result.message || "Collection already exists and has been assigned to all events.",
        })
        onCollectionCreated?.(result.collectionPubkey)
        return
      }

      // Step 4: Create collection transaction using our signer
      const createCollectionIx = createCollectionV1(umi, {
        collection: collectionSigner, // Use our signer that we can actually sign with
        name: result.transactionData.name,
        uri: result.transactionData.metadataUri
      })

      // Step 5: Send transaction to blockchain
      const txResult = await createCollectionIx.sendAndConfirm(umi, {
        confirm: { commitment: 'confirmed' },
        send: { commitment: 'confirmed' }
      })

      // Step 6: Update backend with transaction signature
      const payload = {
        organizerPubkey: publicKey.toString(),
        collectionPubkey: collectionPubkey,
        transactionSignature: await (await import('bs58')).encode(txResult.signature as Uint8Array),
        metadataUri: result.transactionData.metadataUri,
        eventIds
      };
      
      console.log('=== FRONTEND: Sending payload to /api/collections/confirm ===');
      console.log('Payload:', JSON.stringify(payload, null, 2));
      console.log('Payload field types:', {
        organizerPubkey: typeof payload.organizerPubkey,
        collectionPubkey: typeof payload.collectionPubkey,
        transactionSignature: typeof payload.transactionSignature,
        metadataUri: typeof payload.metadataUri,
        eventIds: typeof payload.eventIds
      });
      
      const confirmResponse = await fetch('/api/collections/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!confirmResponse.ok) {
        const error = await confirmResponse.json()
        console.log('=== FRONTEND: Received error response ===');
        console.log('Status:', confirmResponse.status);
        console.log('Error response:', JSON.stringify(error, null, 2));
        throw new Error(error.error || error.message || 'Failed to confirm collection creation')
      }
      
      console.log('=== FRONTEND: Collection confirmation successful ===');

      toast({
        title: "Collection Created!",
        description: "Collection created successfully! Events are now published and ready for ticket sales.",
      })

      onCollectionCreated?.(collectionPubkey)

    } catch (error: any) {
      console.error('Collection creation failed:', error)
      
      let errorMessage = 'Collection creation failed'
      
      if (isApiError(error)) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast({
        title: "Collection Creation Failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Button
      onClick={handleCreateCollection}
      disabled={disabled || !connected || isCreating}
      className={className}
      size="lg"
    >
      {isCreating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating Collection...
        </>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" />
          Create Collection & Publish Event
        </>
      )}
    </Button>
  )
}
