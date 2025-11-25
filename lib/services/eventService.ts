import { Umi, generateSigner, publicKey } from '@metaplex-foundation/umi';
import { WalletAdapter } from '@solana/wallet-adapter-base';
import { createEventCollection } from '../metaplex/coreService';
import { createEventId } from '../qr/qrGenerator';
import { uploadMetadataToIPFS, createCollectionMetadata } from '../ipfs/ipfsService';
import { CreateEventInput, EventCreationData } from '../database/types';

export interface EventCreationInput {
  name: string;
  description: string;
  posterUrl: string;
  startTime: Date;
  endTime: Date;
  priceLamports: number;
  capacity: number;
  venue?: string;
  category?: string;
  tags?: string[];
}

/**
 * Complete event creation flow:
 * 1. Generate deterministic event ID
 * 2. Create collection metadata
 * 3. Upload metadata to IPFS
 * 4. Create Metaplex Core collection
 * 5. Return transaction for signing
 */
export async function createEvent(
  umi: Umi,
  wallet: WalletAdapter,
  eventInput: EventCreationInput
): Promise<EventCreationData> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const organizerPubkey = wallet.publicKey.toString();

  try {
    // 1. Generate deterministic event ID
    const eventId = createEventId(
      organizerPubkey,
      eventInput.name,
      Date.now()
    );

    // 2. Create collection metadata
    const collectionMetadata = createCollectionMetadata(
      eventInput.name,
      eventInput.description,
      eventId,
      eventInput.posterUrl,
      eventInput.capacity,
      eventInput.startTime
    );

    // 3. Upload metadata to IPFS
    const metadataResult = await uploadMetadataToIPFS(collectionMetadata);

    // 4. Prepare event data for collection creation
    const eventData = {
      name: eventInput.name,
      description: eventInput.description,
      posterUrl: eventInput.posterUrl,
      startTime: eventInput.startTime,
      endTime: eventInput.endTime,
      priceLamports: eventInput.priceLamports,
      capacity: eventInput.capacity,
      organizerPubkey
    };

    // 5. Create Metaplex Core collection
    const { collection, transaction } = await createEventCollection(
      umi,
      eventData,
      eventId,
      metadataResult.url
    );

    // 6. Build the complete transaction
    const builtTransaction = await transaction.build(umi);
    const serializedTransaction = Buffer.from(
      umi.transactions.serialize(builtTransaction)
    ).toString('base64');

    return {
      eventId,
      collectionPubkey: collection.publicKey.toString(),
      metadataUri: metadataResult.url,
      transaction: serializedTransaction
    };

  } catch (error) {
    console.error('Event creation failed:', error);
    throw new Error(`Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save event to database after successful transaction
 */
export async function saveEventToDatabase(
  eventInput: EventCreationInput & {
    eventId: string;
    collectionPubkey: string;
    organizerPubkey: string;
    transactionSignature: string;
  }
): Promise<void> {
  const createEventData: CreateEventInput = {
    event_id: eventInput.eventId,
    organizer_pubkey: eventInput.organizerPubkey,
    name: eventInput.name,
    description: eventInput.description,
    poster_url: eventInput.posterUrl,
    start_time: eventInput.startTime,
    end_time: eventInput.endTime,
    price_lamports: eventInput.priceLamports,
    capacity: eventInput.capacity,
    collection_pubkey: eventInput.collectionPubkey,
    venue: eventInput.venue,
    category: eventInput.category,
    tags: eventInput.tags
  };

  // Save event to database using API endpoint
  try {
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...createEventData,
        transaction_signature: eventInput.transactionSignature
      })
    });

    if (!response.ok) {
      throw new Error(`Database save failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Event saved to database:', result);
  } catch (error) {
    console.error('Failed to save event to database:', error);
    throw error;
  }
}

/**
 * Validate event input data
 */
export function validateEventInput(input: EventCreationInput): void {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length < 3) {
    errors.push('Event name must be at least 3 characters long');
  }

  if (!input.description || input.description.trim().length < 10) {
    errors.push('Event description must be at least 10 characters long');
  }

  if (!input.posterUrl || !isValidUrl(input.posterUrl)) {
    errors.push('Valid poster URL is required');
  }

  if (!input.startTime || input.startTime <= new Date()) {
    errors.push('Start time must be in the future');
  }

  if (!input.endTime || input.endTime <= input.startTime) {
    errors.push('End time must be after start time');
  }

  if (!input.priceLamports || input.priceLamports < 0) {
    errors.push('Price must be a positive number');
  }

  if (!input.capacity || input.capacity < 1 || input.capacity > 100000) {
    errors.push('Capacity must be between 1 and 100,000');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
}

/**
 * Check if event capacity allows for more tickets
 */
export async function checkEventCapacity(
  eventId: string
): Promise<{ hasCapacity: boolean; remaining: number; total: number; minted: number }> {
  try {
    const response = await fetch(`/api/events/${eventId}/capacity`);
    
    if (!response.ok) {
      throw new Error(`Failed to check capacity: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to check event capacity:', error);
    throw error;
  }
}

/**
 * Get event by ID
 */
export async function getEvent(eventId: string) {
  try {
    const response = await fetch(`/api/events/${eventId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch event: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get event:', error);
    throw error;
  }
}

/**
 * Update event state (draft -> published -> ongoing -> ended)
 */
export async function updateEventState(
  eventId: string,
  newState: 'draft' | 'published' | 'ongoing' | 'ended',
  organizerPubkey: string
): Promise<void> {
  try {
    const response = await fetch(`/api/events/${eventId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state: newState,
        organizer_pubkey: organizerPubkey
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update event state: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to update event state:', error);
    throw error;
  }
}

// Helper functions
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
