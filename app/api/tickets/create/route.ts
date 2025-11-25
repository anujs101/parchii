import { NextRequest, NextResponse } from 'next/server';
import { generateTicketQR } from '@/lib/qr/qrGenerator';
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
    const { eventId, ticketNumber, assetPubkey, buyerPubkey }: TicketCreationRequest =
      await request.json();

    if (!eventId || !ticketNumber || !assetPubkey || !buyerPubkey) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

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
        state: true,
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    if (!event.collectionPubkey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Collection not created for this event.',
        },
        { status: 400 }
      );
    }

    const collectionPubkey = event.collectionPubkey;

    // Generate QR code data
    const qrData = generateTicketQR(eventId, ticketNumber, assetPubkey);

    // ⬇️ Lazy import the image generator (prevents Vercel build crash)
    const { generateTicketImage } = await import('@/lib/ticket/imageGenerator');

    // Generate ticket image
    const ticketImageBuffer = await generateTicketImage(
      {
        name: event.name,
        description: event.description || '',
        startTime: event.startTime,
        venue: event.venue || undefined,
        posterUrl: event.posterUrl || undefined,
      },
      ticketNumber,
      qrData
    );

    // Upload PNG
    const imageResult = await uploadImageToIPFS(
      ticketImageBuffer,
      `${eventId}-ticket-${ticketNumber}.png`
    );

    // Create metadata JSON
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

    // Upload JSON to IPFS
    const metadataResult = await uploadMetadataToIPFS(ticketMetadata);

    // Store in DB
    const ticketRecord = await prisma.ticket.create({
      data: {
        eventId,
        holderPubkey: buyerPubkey,
        mintPubkey: assetPubkey,
        purchasePrice: BigInt(event.priceLamports),
        metadataUri: metadataResult.url,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      ticketId: ticketRecord.ticketId,
      metadataUri: metadataResult.url,
      imageUrl: imageResult.url,
      qrData,
      collectionPubkey,
    });
  } catch (error) {
    console.error('Ticket creation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create ticket and upload metadata',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
