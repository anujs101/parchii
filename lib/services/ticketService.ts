import { Umi, generateSigner, publicKey, TransactionBuilder, transactionBuilder, some, sol } from '@metaplex-foundation/umi';
import { createTicketAsset } from '../metaplex/coreService';
import { PurchaseTransactionData } from '../database/types';

export interface TicketPurchaseInput {
  eventId: string;
  buyerPubkey: string;
  quantity: number;
}

export interface EventForPurchase {
  event_id: string;
  name: string;
  description: string;
  poster_url: string;
  start_time: Date;
  end_time: Date;
  price_lamports: number;
  capacity: number;
  minted: number;
  collection_pubkey: string;
  organizer_pubkey: string;
  venue?: string;
}

/**
 * Complete ticket purchase flow:
 * 1. Validate event availability and capacity
 * 2. Generate ticket number and asset
 * 3. Generate QR code with asset pubkey
 * 4. Create ticket image with embedded QR
 * 5. Upload image and metadata to IPFS
 * 6. Create Core Asset transaction
 * 7. Add payment instruction
 * 8. Return serialized transaction
 */
export async function purchaseTicket(
  umi: Umi,
  purchaseInput: TicketPurchaseInput
): Promise<PurchaseTransactionData> {
  const { eventId, buyerPubkey, quantity } = purchaseInput;

  if (quantity !== 1) {
    throw new Error('Only single ticket purchases are currently supported');
  }

  try {
    // 1. Validate event availability
    const event = await getEventForPurchase(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.minted >= event.capacity) {
      throw new Error('Event sold out');
    }

    // 2. Generate ticket number and asset (optimistic)
    const ticketNumber = event.minted + 1;
    const asset = generateSigner(umi);
    const assetPubkey = asset.publicKey.toString();

    // 3. Create ticket metadata and upload via backend API
    const ticketResponse = await fetch('/api/tickets/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        ticketNumber,
        assetPubkey,
        buyerPubkey
      })
    });

    if (!ticketResponse.ok) {
      throw new Error('Failed to create ticket and upload metadata');
    }

    const { ticketId, metadataUri, imageUrl, qrData, collectionPubkey } = await ticketResponse.json();

    // 4. Create Core Asset transaction using collection from backend
    const tempMetadata = {
      name: `${event.name} - Ticket #${ticketNumber}`,
      description: `Ticket for ${event.name}`,
      image: imageUrl,
      external_url: `https://parchi.app/ticket/${eventId}/${ticketNumber}`,
      attributes: [],
      properties: {
        category: 'ticket',
        qr_data: qrData
      }
    };

    const { transaction: assetTransaction } = await createTicketAsset(
      umi,
      publicKey(collectionPubkey),
      publicKey(buyerPubkey),
      tempMetadata,
      metadataUri,
      eventId,
      ticketNumber,
      qrData
    );

    // Debug: Check transaction instruction count
    console.log('=== TRANSACTION DEBUG ===');
    console.log('Asset transaction instruction count:', assetTransaction.getInstructions().length);
    
    // 6. Build complete Solana transaction with payment and NFT minting
    const transaction = await buildTicketPurchaseTransaction(
      umi,
      assetTransaction,
      buyerPubkey,
      event.organizer_pubkey,
      event.price_lamports
    );

    // 6. Return transaction data for frontend signing
    return {
      transaction,
      assetPubkey,
      ticketNumber,
      metadataUri,
      qrData,
      imageUrl,
      ticketId
    };

  } catch (error) {
    console.error('Ticket purchase failed:', error);
    throw new Error(`Failed to purchase ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update ticket status after successful blockchain transaction
 */
export async function updateTicketAfterMinting(
  ticketId: string,
  transactionSignature: string
): Promise<void> {
  try {
    const response = await fetch(`/api/tickets/${ticketId}/update-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'ACTIVE',
        transactionSignature
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update ticket status: ${response.statusText}`);
    }

    console.log('Ticket status updated successfully');
  } catch (error) {
    console.error('Failed to update ticket status:', error);
    throw error;
  }
}

/**
 * Get user's tickets for an event
 */
export async function getUserTickets(
  eventId: string,
  ownerPubkey: string
) {
  try {
    const response = await fetch(`/api/tickets?event_id=${eventId}&owner_pubkey=${ownerPubkey}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tickets: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get user tickets:', error);
    throw error;
  }
}

/**
 * Get ticket by asset pubkey
 */
export async function getTicketByAsset(assetPubkey: string) {
  try {
    const response = await fetch(`/api/tickets/${assetPubkey}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch ticket: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get ticket by asset:', error);
    throw error;
  }
}

/**
 * Mark ticket as claimed
 */
export async function markTicketClaimed(
  ticketId: string,
  staffWallet: string,
  attendeeSignature?: string
): Promise<void> {
  try {
    const response = await fetch(`/api/tickets/${ticketId}/claim`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        claimed_by: staffWallet,
        attendee_signature: attendeeSignature,
        claimed_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to mark ticket as claimed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to mark ticket as claimed:', error);
    throw error;
  }
}

/**
 * Validate purchase input
 */
export function validatePurchaseInput(input: TicketPurchaseInput): void {
  const errors: string[] = [];

  if (!input.eventId || input.eventId.trim().length === 0) {
    errors.push('Event ID is required');
  }

  if (!input.buyerPubkey || input.buyerPubkey.trim().length === 0) {
    errors.push('Buyer public key is required');
  }

  if (!input.quantity || input.quantity < 1 || input.quantity > 10) {
    errors.push('Quantity must be between 1 and 10');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
}

/**
 * Check if user can purchase tickets (rate limiting, duplicate prevention)
 */
export async function canUserPurchase(
  eventId: string,
  buyerPubkey: string,
  quantity: number
): Promise<{ canPurchase: boolean; reason?: string }> {
  try {
    const response = await fetch('/api/tickets/can-purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_id: eventId,
        buyer_pubkey: buyerPubkey,
        quantity
      })
    });

    if (!response.ok) {
      throw new Error(`Purchase check failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to check purchase eligibility:', error);
    return { canPurchase: false, reason: 'Unable to verify purchase eligibility' };
  }
}

// Helper functions
async function getEventForPurchase(eventId: string): Promise<EventForPurchase | null> {
  try {
    // Use absolute URL for API call to work in both client and server contexts
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/events/${eventId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch event: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success || !data.event) {
      return null;
    }

    // Convert API response to expected format
    const event = data.event;
    
    return {
      event_id: event.eventId,
      name: event.name,
      description: event.description,
      poster_url: event.posterUrl,
      start_time: new Date(event.startTime),
      end_time: new Date(event.endTime),
      price_lamports: parseInt(event.priceLamports),
      capacity: event.capacity,
      minted: event.mintedTickets || 0,
      collection_pubkey: event.collectionPubkey || '',
      venue: event.venue || '',
      organizer_pubkey: event.organizerPubkey
    };
  } catch (error) {
    console.error('Failed to get event for purchase:', error);
    throw error;
  }
}


/**
 * Build a complete Solana transaction for ticket purchase including payment and NFT minting
 */
async function buildTicketPurchaseTransaction(
  umi: Umi,
  assetTransaction: TransactionBuilder,
  buyerPubkey: string,
  organizerPubkey: string,
  priceLamports: number
): Promise<string> {
  try {
    // For now, just return the NFT minting transaction
    // Payment will be handled in a future update
    const builtTransaction = await assetTransaction.buildAndSign(umi);
    
    // Serialize transaction for frontend
    const serializedTransaction = Buffer.from(
      umi.transactions.serialize(builtTransaction)
    ).toString('base64');

    return serializedTransaction;
  } catch (error) {
    console.error('Failed to build ticket purchase transaction:', error);
    throw new Error('Transaction building failed');
  }
}

