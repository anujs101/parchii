import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    
    console.log('Fetching event with ID:', eventId);
    console.log('Prisma client:', typeof prisma);

    if (!prisma) {
      throw new Error('Prisma client not initialized');
    }

    const event = await prisma.event.findUnique({
      where: { eventId }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get actual minted ticket count from database
    const mintedCount = await prisma.ticket.count({
      where: {
        eventId: eventId,
        status: {
          in: ['ACTIVE', 'USED'] // Count both active and used tickets as minted
        }
      }
    });

    // Convert BigInt to string for JSON serialization
    const eventWithStringPrice = {
      ...event,
      priceLamports: event.priceLamports.toString(),
      mintedTickets: mintedCount
    };

    return NextResponse.json({
      success: true,
      event: eventWithStringPrice
    });

  } catch (error) {
    console.error('Event fetch error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const updates = await request.json();

    // Remove fields that shouldn't be updated directly
    const { eventId: _, organizerPubkey: __, collectionPubkey: ___, createdAt: ____, ...allowedUpdates } = updates;

    const event = await prisma.event.update({
      where: { eventId },
      data: allowedUpdates
    });

    return NextResponse.json({
      success: true,
      event,
      message: 'Event updated successfully'
    });

  } catch (error) {
    console.error('Event update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
