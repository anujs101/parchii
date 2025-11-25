import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';

export async function POST(request: NextRequest) {
  try {
    const { event_id, ticket_number, asset_prefix } = await request.json();

    if (!event_id || !ticket_number || !asset_prefix) {
      return NextResponse.json(
        { error: 'Missing required fields: event_id, ticket_number, asset_prefix' },
        { status: 400 }
      );
    }

    // Find ticket by QR data components using Prisma
    const ticket = await prisma.ticket.findFirst({
      where: {
        eventId: event_id,
        mintPubkey: {
          startsWith: asset_prefix
        }
      },
      include: {
        event: true
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...ticket,
      // Convert BigInt to string for JSON serialization
      purchasePrice: ticket.purchasePrice.toString()
    });

  } catch (error) {
    console.error('QR lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
