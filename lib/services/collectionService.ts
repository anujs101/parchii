import { generateSigner, Umi } from '@metaplex-foundation/umi'
import { uploadMetadataToIPFS } from '@/lib/ipfs/ipfsService'
import { generateCollectionQR } from '@/lib/qr/qrService'
import { createApiError, ERROR_CODES } from '@/lib/errors/errorCodes'
import { prisma } from '@/lib/database/prisma';

export interface CollectionCreationInput {
  organizerPubkey: string;
  collectionPubkey?: string; // Optional: frontend-provided collection pubkey
  eventIds?: string[]; // Optional: specific events to associate with collection
}

export interface CollectionTransactionData {
  collectionMint: string;
  metadataUri: string;
  name: string;
  symbol: string;
  sellerFeeBasisPoints: number;
  creators: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
}

export interface CollectionCreationResult {
  success: boolean;
  collectionPubkey: string;
  requiresTransaction: boolean;
  transactionData?: CollectionTransactionData;
  ipfsHash: string;
  qrCode: string;
  message?: string;
}

/**
 * Create an organizer-based collection (server-side preparation)
 * Returns transaction for frontend wallet signing
 */
export async function prepareOrganizerCollectionCreation(
  umi: Umi,
  input: CollectionCreationInput
): Promise<CollectionCreationResult> {
  try {
    // Validate input
    if (!input.organizerPubkey || input.organizerPubkey.length !== 44) {
      throw createApiError(ERROR_CODES.INVALID_WALLET_ADDRESS);
    }

    // Check if organizer already has a collection
    const existingEvent = await prisma.event.findFirst({
      where: {
        organizerPubkey: input.organizerPubkey,
        collectionPubkey: { not: null }
      },
      select: { collectionPubkey: true, eventId: true }
    });

    if (existingEvent?.collectionPubkey) {
      // Update all organizer's events to use existing collection
      await prisma.event.updateMany({
        where: {
          organizerPubkey: input.organizerPubkey,
          collectionPubkey: null
        },
        data: {
          collectionPubkey: existingEvent.collectionPubkey,
          state: 'PUBLISHED'
        }
      });

      // Generate QR code for existing collection
      const qrResult = await generateCollectionQR(
        existingEvent.collectionPubkey,
        existingEvent.eventId,
        input.organizerPubkey
      );

      return {
        success: true,
        collectionPubkey: existingEvent.collectionPubkey,
        requiresTransaction: false,
        ipfsHash: '', // No new metadata needed
        qrCode: qrResult.dataUrl,
        message: 'Collection already exists and has been assigned to all events'
      };
    }

    // Get organizer's events that need collection
    const organizerEvents = await prisma.event.findMany({
      where: { 
        organizerPubkey: input.organizerPubkey,
        collectionPubkey: null,
        ...(input.eventIds ? { eventId: { in: input.eventIds } } : {})
      },
      select: { eventId: true, name: true, state: true }
    });

    if (organizerEvents.length === 0) {
      throw createApiError(ERROR_CODES.EVENT_NOT_FOUND, 'No events found that need collection creation');
    }

    // Create organizer-based collection metadata
    const collectionMetadata = {
      name: "Parchi Event Tickets",
      description: `Event tickets collection for organizer ${input.organizerPubkey}. All tickets from this organizer's events are minted in this collection.`,
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop&crop=center",
      external_url: "https://parchi.app",
      attributes: [
        { trait_type: "Organizer", value: input.organizerPubkey },
        { trait_type: "Platform", value: "Parchi" },
        { trait_type: "Type", value: "Organizer Collection" },
        { trait_type: "Events Count", value: organizerEvents.length.toString() }
      ]
    };

    // Upload collection metadata to IPFS
    const metadataResult = await uploadMetadataToIPFS(collectionMetadata);

    // Use frontend-provided collection pubkey or generate one (fallback)
    const collectionPubkey = input.collectionPubkey || generateSigner(umi).publicKey.toString();
    
    // Generate QR code for collection
    const qrResult = await generateCollectionQR(
      collectionPubkey,
      organizerEvents[0].eventId,
      input.organizerPubkey
    );

    // Prepare transaction data for frontend
    const transactionData: CollectionTransactionData = {
      collectionMint: collectionPubkey,
      metadataUri: metadataResult.url,
      name: "Parchi Event Tickets",
      symbol: "PARCHI",
      sellerFeeBasisPoints: 500, // 5% royalty
      creators: [{
        address: input.organizerPubkey,
        verified: true,
        share: 100
      }]
    };

    return {
      success: true,
      collectionPubkey: collectionPubkey,
      requiresTransaction: true,
      transactionData,
      ipfsHash: metadataResult.hash,
      qrCode: qrResult.dataUrl,
      message: 'Collection prepared for blockchain creation'
    };

  } catch (error: any) {
    console.error('Collection preparation failed:', error);
    
    if (error.code) {
      throw error; // Re-throw API errors
    }
    
    throw createApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Confirm collection creation after blockchain transaction
 */
export async function confirmOrganizerCollectionCreation(
  organizerPubkey: string,
  collectionPubkey: string,
  transactionSignature: string,
  metadataUri: string,
  eventIds?: string[]
): Promise<void> {
  try {
    console.log(`Starting collection confirmation for organizer: ${organizerPubkey}, collection: ${collectionPubkey}`);
    
    await prisma.$transaction(async (tx) => {
      // Get all events from this organizer that need collection
      const whereClause = {
        organizerPubkey,
        collectionPubkey: null,
        ...(eventIds ? { eventId: { in: eventIds } } : {})
      };

      console.log('Searching for events with whereClause:', whereClause);

      const events = await tx.event.findMany({
        where: whereClause,
        select: { eventId: true, name: true, state: true, collectionPubkey: true }
      });

      console.log(`Found ${events.length} events that need collection assignment:`, events);

      if (events.length === 0) {
        // Check if there are any events for this organizer at all
        const allOrganizerEvents = await tx.event.findMany({
          where: { organizerPubkey },
          select: { eventId: true, name: true, state: true, collectionPubkey: true }
        });
        
        console.log(`Total events for organizer: ${allOrganizerEvents.length}`, allOrganizerEvents);
        
        if (allOrganizerEvents.length === 0) {
          throw new Error('No events found for this organizer');
        } else {
          // All events already have collections, this might be a duplicate confirmation
          console.log('All events already have collections assigned');
          return; // Don't throw error, just return success
        }
      }

      // Update all organizer's events with collection information
      const updateResult = await tx.event.updateMany({
        where: whereClause,
        data: {
          collectionPubkey,
          collectionCreatedAt: new Date(),
          collectionTxSignature: transactionSignature,
          state: 'PUBLISHED' // Auto-publish events when collection is created
        }
      });

      console.log(`Updated ${updateResult.count} events with collection information`);
    });

    console.log(`Collection confirmed for organizer ${organizerPubkey}: ${collectionPubkey}`);
  } catch (error) {
    console.error('Collection confirmation failed:', error);
    throw new Error(`Failed to confirm collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get collection information for an event
 */
export async function getEventCollection(eventId: string): Promise<{
  collectionPubkey: string | null;
}> {
  try {
    const event = await prisma.event.findUnique({
      where: { eventId },
      select: {
        collectionPubkey: true
      }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    return {
      collectionPubkey: event.collectionPubkey
    };
  } catch (error) {
    console.error('Failed to get event collection:', error);
    throw error;
  }
}

/**
 * Validate collection pubkey format
 */
export function validateCollectionPubkey(pubkey: string): boolean {
  // Solana pubkeys are 44 characters in base58
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
  return base58Regex.test(pubkey);
}

/**
 * Get all events by organizer with collection status
 */
export async function getOrganizerEventsWithCollections(organizerPubkey: string) {
  try {
    const events = await prisma.event.findMany({
      where: { organizerPubkey },
      select: {
        eventId: true,
        name: true,
        state: true,
        collectionPubkey: true,
        collectionCreatedAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return events.map(event => ({
      ...event,
      hasCollection: !!event.collectionPubkey,
      canCreateCollection: event.state === 'DRAFT' && !event.collectionPubkey
    }));
  } catch (error) {
    console.error('Failed to get organizer events:', error);
    throw error;
  }
}
