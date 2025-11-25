import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { EventState } from '@/lib/database/types';

export async function POST(request: NextRequest) {
  try {
    const eventData = await request.json();

    // Validate required fields
    if (!eventData.organizerPubkey || !eventData.name) {
      return NextResponse.json(
        { error: 'Missing required fields: organizerPubkey, name' },
        { status: 400 }
      );
    }

    // Generate eventId from name (slug format)
    const eventId = eventData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);

    // Insert event into database using Prisma
    const event = await prisma.event.create({
      data: {
        eventId,
        organizerPubkey: eventData.organizerPubkey,
        name: eventData.name,
        description: eventData.description,
        posterUrl: eventData.posterUrl,
        startTime: new Date(eventData.startTime),
        endTime: new Date(eventData.endTime),
        priceLamports: BigInt(eventData.priceLamports),
        capacity: eventData.capacity,
        venue: eventData.venue,
        category: eventData.category,
        tags: eventData.tags || [],
        state: 'DRAFT' // Events start as DRAFT until collection is created
      }
    });

    // Convert BigInt to string for JSON serialization
    const eventResponse = {
      ...event,
      priceLamports: event.priceLamports.toString()
    };

    return NextResponse.json({
      success: true,
      event: eventResponse,
      message: 'Event created successfully'
    });

  } catch (error) {
    console.error('Event creation error:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizer = searchParams.get('organizer');
    const state = searchParams.get('state');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause for Prisma
    const where: any = {};
    
    if (organizer) {
      where.organizerPubkey = organizer;
    }
    
    if (state) {
      where.state = state;
    }
    
    if (category) {
      where.category = category;
    }

    // Fetch events using Prisma
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.event.count({ where })
    ]);

    // Convert BigInt to string for JSON serialization
    const eventsWithStringPrice = events.map((event: any) => ({
      ...event,
      priceLamports: event.priceLamports.toString()
    }));

    return NextResponse.json({
      success: true,
      events: eventsWithStringPrice,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: total > offset + limit
    });

  } catch (error) {
    console.error('Events fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
