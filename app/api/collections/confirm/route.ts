import { NextRequest, NextResponse } from 'next/server';

export interface CollectionConfirmationRequest {
  organizerPubkey: string;
  collectionPubkey: string;
  transactionSignature: string;
  metadataUri: string;
  eventIds?: string[];
}

export interface CollectionConfirmationResponse {
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<CollectionConfirmationResponse>> {
  console.log('=== BACKEND: Collection confirm endpoint hit ===');
  try {
    const { confirmOrganizerCollectionCreation, validateCollectionPubkey } = await import('@/lib/services/collectionService');
    const body: CollectionConfirmationRequest = await request.json();
    
    console.log('=== BACKEND: Received body ===');
    console.log('Body:', JSON.stringify(body, null, 2));
    console.log('Body field types:', {
      organizerPubkey: typeof body.organizerPubkey,
      collectionPubkey: typeof body.collectionPubkey,
      transactionSignature: typeof body.transactionSignature,
      metadataUri: typeof body.metadataUri,
      eventIds: typeof body.eventIds
    });
    console.log('Body field values:', {
      organizerPubkey: body.organizerPubkey,
      collectionPubkey: body.collectionPubkey,
      transactionSignature: body.transactionSignature ? `${String(body.transactionSignature).substring(0, 20)}...` : 'undefined',
      metadataUri: body.metadataUri,
      eventIds: body.eventIds
    });
    
    // Validate required fields
    const missingFields = [];
    if (!body.organizerPubkey) missingFields.push('organizerPubkey');
    if (!body.collectionPubkey) missingFields.push('collectionPubkey');
    if (!body.transactionSignature) missingFields.push('transactionSignature');
    if (!body.metadataUri) missingFields.push('metadataUri');
    
    if (missingFields.length > 0) {
      console.log('=== BACKEND: Validation failed - missing fields ===');
      console.log('Missing fields:', missingFields);
      console.log('Field presence check:', {
        organizerPubkey: !!body.organizerPubkey,
        collectionPubkey: !!body.collectionPubkey,
        transactionSignature: !!body.transactionSignature,
        metadataUri: !!body.metadataUri
      });
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          details: {
            received: Object.keys(body),
            missing: missingFields
          }
        },
        { status: 400 }
      );
    }

    console.log('=== BACKEND: Starting field format validation ===');
    
    // Validate collection pubkey format
    if (!validateCollectionPubkey(body.collectionPubkey)) {
      console.log('=== BACKEND: Validation failed - invalid collection pubkey format ===');
      console.log('Collection pubkey:', body.collectionPubkey);
      console.log('Collection pubkey length:', body.collectionPubkey?.length);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid collection public key format',
          details: {
            field: 'collectionPubkey',
            value: body.collectionPubkey,
            expected: '44 character base58 string'
          }
        },
        { status: 400 }
      );
    }

    // Validate organizer pubkey format
    if (!validateCollectionPubkey(body.organizerPubkey)) {
      console.log('=== BACKEND: Validation failed - invalid organizer pubkey format ===');
      console.log('Organizer pubkey:', body.organizerPubkey);
      console.log('Organizer pubkey length:', body.organizerPubkey?.length);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid organizer public key format',
          details: {
            field: 'organizerPubkey',
            value: body.organizerPubkey,
            expected: '44 character base58 string'
          }
        },
        { status: 400 }
      );
    }

    // Validate transaction signature format (87-88 characters base58)
    const txSigRegex = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
    if (!txSigRegex.test(body.transactionSignature)) {
      console.log('=== BACKEND: Validation failed - invalid transaction signature format ===');
      console.log('Transaction signature:', body.transactionSignature);
      console.log('Transaction signature type:', typeof body.transactionSignature);
      console.log('Transaction signature length:', body.transactionSignature?.length);
      console.log('Is string?', typeof body.transactionSignature === 'string');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid transaction signature format',
          details: {
            field: 'transactionSignature',
            value: body.transactionSignature,
            type: typeof body.transactionSignature,
            length: body.transactionSignature?.length,
            expected: '87-88 character base58 string'
          }
        },
        { status: 400 }
      );
    }
    
    console.log('=== BACKEND: All validations passed, proceeding to confirmOrganizerCollectionCreation ===');

    console.log('All validations passed, calling confirmOrganizerCollectionCreation...');
    
    // Confirm organizer collection creation
    await confirmOrganizerCollectionCreation(
      body.organizerPubkey,
      body.collectionPubkey,
      body.transactionSignature,
      body.metadataUri,
      body.eventIds
    );
    
    console.log('confirmOrganizerCollectionCreation completed successfully');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Collection confirmation failed:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to confirm collection creation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
