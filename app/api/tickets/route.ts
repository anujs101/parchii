import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { CreateTicketInput } from '@/lib/database/types';

export async function POST(request: NextRequest) {
  try {
    const ticketData: CreateTicketInput = await request.json();

    // Validate required fields
    if (!ticketData.event_id || !ticketData.owner_pubkey || !ticketData.asset_pubkey || !ticketData.qr_data) {
      return NextResponse.json(
        { error: 'Missing required fields: event_id, owner_pubkey, asset_pubkey, qr_data' },
        { status: 400 }
      );
    }

    try {
      // Insert ticket into database using Prisma
      const ticket = await prisma.ticket.create({
        data: {
          eventId: ticketData.event_id,
          holderPubkey: ticketData.owner_pubkey,
          mintPubkey: ticketData.asset_pubkey,
          purchasePrice: BigInt(0), // Will be updated with actual price
          metadataUri: ticketData.metadata_uri
        }
      });

      return NextResponse.json({
        success: true,
        ticket: {
          ...ticket,
          purchasePrice: ticket.purchasePrice.toString() // Convert BigInt to string
        },
        message: 'Ticket created successfully'
      });

    } catch (prismaError: any) {
      console.error('Database error:', prismaError);
      
      // Handle unique constraint violations
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: 'Ticket with this asset already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create ticket in database' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Ticket creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    const ownerPubkey = searchParams.get('owner_pubkey');
    const claimed = searchParams.get('claimed');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause for Prisma
    const where: any = {};
    
    if (eventId) {
      where.eventId = eventId;
    }

    if (ownerPubkey) {
      where.holderPubkey = ownerPubkey;
    }

    if (claimed !== null) {
      where.usedAt = claimed === 'true' ? { not: null } : null;
    }

    // Fetch tickets with Prisma
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          event: true
        },
        orderBy: { purchasedAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.ticket.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      tickets: tickets.map(ticket => ({
        ...ticket,
        purchasePrice: ticket.purchasePrice.toString() // Convert BigInt to string
      })),
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: total > offset + limit
    });

  } catch (error) {
    console.error('Tickets fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
