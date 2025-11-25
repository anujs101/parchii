import { NextRequest, NextResponse } from 'next/server';
import { createUmiInstance } from '@/lib/metaplex/umiConfig';
import { prepareOrganizerCollectionCreation, validateCollectionPubkey } from '@/lib/services/collectionService';
import { createApiError, ERROR_CODES, isApiError } from '@/lib/errors/errorCodes';

export interface CollectionCreationRequest {
  organizerPubkey: string;
  collectionPubkey?: string; // Optional: frontend-provided collection pubkey
  eventIds?: string[]; // Optional: specific events to associate
}

export async function POST(request: NextRequest) {
  try {
    const body: CollectionCreationRequest = await request.json();
    
    // Validate required fields
    if (!body.organizerPubkey) {
      const error = createApiError(ERROR_CODES.INVALID_REQUEST, 'Missing required field: organizerPubkey');
      return NextResponse.json(error, { status: 400 });
    }

    // Validate organizer pubkey format
    if (!validateCollectionPubkey(body.organizerPubkey)) {
      const error = createApiError(ERROR_CODES.INVALID_WALLET_ADDRESS);
      return NextResponse.json(error, { status: 400 });
    }

    // Create UMI instance
    const umi = createUmiInstance();

    // Validate collection pubkey if provided
    if (body.collectionPubkey && !validateCollectionPubkey(body.collectionPubkey)) {
      const error = createApiError(ERROR_CODES.INVALID_REQUEST, 'Invalid collection public key format');
      return NextResponse.json(error, { status: 400 });
    }

    // Prepare organizer collection creation
    const result = await prepareOrganizerCollectionCreation(umi, {
      organizerPubkey: body.organizerPubkey,
      collectionPubkey: body.collectionPubkey,
      eventIds: body.eventIds
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Collection creation preparation failed:', error);
    
    // Handle API errors
    if (isApiError(error)) {
      const statusCode = error.code === ERROR_CODES.EVENT_NOT_FOUND ? 404 : 
                        error.code === ERROR_CODES.INVALID_WALLET_ADDRESS ? 400 : 500;
      return NextResponse.json(error, { status: statusCode });
    }

    // Handle unknown errors
    const apiError = createApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    return NextResponse.json(apiError, { status: 500 });
  }
}
