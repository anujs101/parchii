import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== UPDATE TICKET STATUS REQUEST ===');
    console.log('Params:', params);
    
    const { id } = params;
    console.log('Ticket ID:', id);
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { transactionSignature, status = 'ACTIVE' } = body;
    console.log(`Updating ticket ${id} with transaction signature: ${transactionSignature}, status: ${status}`);

    // Update ticket with transaction signature
    const updatedTicket = await prisma.ticket.update({
      where: { ticketId: id },
      data: {
        status: status,
        // Store transaction signature in a custom field if needed
        // For now, we'll just update the status
      }
    });

    console.log(`Successfully updated ticket ${id}`);

    // Convert BigInt fields to strings for JSON serialization
    const serializedTicket = {
      ...updatedTicket,
      purchasePrice: updatedTicket.purchasePrice.toString()
    };

    return NextResponse.json({
      success: true,
      ticket: serializedTicket
    });

  } catch (error) {
    console.error('=== UPDATE TICKET STATUS ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update ticket status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
