import { NextRequest, NextResponse } from 'next/server';
import { generateTicketQR } from '@/lib/qr/qrGenerator';
import { generateTicketImage } from '@/lib/ticket/imageGenerator';
import { uploadImageToIPFS, uploadMetadataToIPFS, createTicketMetadata } from '@/lib/ipfs/ipfsService';
import { prisma } from '@/lib/database/prisma';

export interface TicketCreationRequest {
  eventId: string;
  ticketNumber: number;
  assetPubkey: string;
  buyerPubkey: string;
}

export interface TicketCreationResponse {
  success: boolean;
  ticketId?: string;
  metadataUri?: string;
  imageUrl?: string;
  qrData?: string;
  collectionPubkey?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<TicketCreationResponse>> {
  try {
    const { eventId, ticketNumber, assetPubkey, buyerPubkey }: TicketCreationRequest = await request.json();

    // Validate required fields
    if (!eventId || !ticketNumber || !assetPubkey || !buyerPubkey) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: eventId, ticketNumber, assetPubkey, buyerPubkey' 
        },
        { status: 400 }
      );
    }

    // Get event details
    const event = await prisma.event.findUnique({
      where: { eventId },
      select: {
        name: true,
        description: true,
        startTime: true,
        venue: true,
        posterUrl: true,
        priceLamports: true,
        organizerPubkey: true,
        collectionPubkey: true,
        state: true
      }
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // 1. Get real collection pubkey from database
    if (!event.collectionPubkey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Collection not created for this event. Please create a collection first.' 
        },
        { status: 400 }
      );
    }

    const collectionPubkey = event.collectionPubkey;

    // 2. Generate QR code data
    const qrData = generateTicketQR(eventId, ticketNumber, assetPubkey);

    // 2. Generate ticket image with embedded QR code
    const ticketImageBuffer = await generateTicketImage(
      {
        name: event.name,
        description: event.description || '',
        startTime: event.startTime,
        venue: event.venue || undefined,
        posterUrl: event.posterUrl || undefined
      },
      ticketNumber,
      qrData
    );

    // 3. Upload ticket image to IPFS
    const imageResult = await uploadImageToIPFS(
      ticketImageBuffer,
      `${eventId}-ticket-${ticketNumber}.png`
    );

    // 4. Create ticket metadata
    const ticketMetadata = createTicketMetadata(
      event.name,
      ticketNumber,
      eventId,
      event.startTime,
      event.venue || undefined,
      imageResult.url,
      qrData,
      `https://parchi.app/ticket/${eventId}/${ticketNumber}`
    );

    // 5. Upload metadata to IPFS
    const metadataResult = await uploadMetadataToIPFS(ticketMetadata);

    // 6. Create ticket record in database
    const ticketRecord = await prisma.ticket.create({
      data: {
        eventId,
        holderPubkey: buyerPubkey,
        mintPubkey: assetPubkey,
        purchasePrice: BigInt(event.priceLamports),
        metadataUri: metadataResult.url,
        status: 'ACTIVE' // Will be updated after blockchain confirmation
      }
    });

    return NextResponse.json({
      success: true,
      ticketId: ticketRecord.ticketId,
      metadataUri: metadataResult.url,
      imageUrl: imageResult.url,
      qrData,
      collectionPubkey
    });

  } catch (error) {
    console.error('Ticket creation failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create ticket and upload metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

