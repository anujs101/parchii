import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;

    // Get event with ticket count
    const event = await prisma.event.findUnique({
      where: { eventId },
      select: {
        capacity: true,
        _count: {
          select: {
            tickets: true
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const minted = event._count.tickets;
    const remaining = event.capacity - minted;
    const hasCapacity = remaining > 0;

    return NextResponse.json({
      success: true,
      hasCapacity,
      remaining,
      total: event.capacity,
      minted
    });

  } catch (error) {
    console.error('Capacity check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
