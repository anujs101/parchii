// app/api/gate/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';

/**
 * POST /api/gate/verify
 * Body (one of verificationId OR ticketId is required):
 * {
 *   ticketId?: string,
 *   verificationId?: string,
 *   staffId?: string,   // will be used as verifierPubkey in GateVerification
 *   gateId?: string
 * }
 *
 * This endpoint performs a server-side verification:
 *  - ensures the ticket exists and is ACTIVE
 *  - atomically flips ticket.status -> USED
 *  - creates or updates a GateVerification row (status -> VERIFIED)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

    const {
      ticketId,
      verificationId,
      staffId,
      gateId,
    }: {
      ticketId?: string;
      verificationId?: string;
      staffId?: string;
      gateId?: string;
    } = body;

    if (!ticketId && !verificationId) {
      return NextResponse.json({ ok: false, error: 'missing_ticket_or_verification_id' }, { status: 400 });
    }

    // Atomic transaction: mark ticket USED only if it was ACTIVE, then create/update GateVerification
    try {
      const result = await prisma.$transaction(async (tx) => {
        // If we only have verificationId (and not ticketId), fetch the verification row first
        let resolvedTicketId = ticketId ?? null;

        if (!resolvedTicketId && verificationId) {
          const existing = await tx.gateVerification.findUnique({
            where: { verificationId },
            select: { ticketId: true },
          });
          if (!existing) throw new Error('verification_record_not_found');
          resolvedTicketId = existing.ticketId;
        }

        if (!resolvedTicketId) {
          throw new Error('could_not_resolve_ticket_id');
        }

        // 1) Attempt to atomically mark ticket as USED if it is ACTIVE
        const updateRes = await tx.ticket.updateMany({
          where: { ticketId: resolvedTicketId, status: 'ACTIVE' },
          data: {
            status: 'USED',
            usedAt: new Date(),
          },
        });

        if (updateRes.count === 0) {
          // nothing updated — ticket not ACTIVE (either used/cancelled/doesn't exist)
          throw new Error('already_redeemed_or_invalid');
        }

        // 2) fetch eventId for GateVerification.eventId
        const ticketRow = await tx.ticket.findUnique({
          where: { ticketId: resolvedTicketId },
          select: { eventId: true },
        });
        const eventId = ticketRow?.eventId ?? null;

        // 3) if verificationId provided -> update that row (ensure it matches ticketId)
        if (verificationId) {
          const existing = await tx.gateVerification.findUnique({ where: { verificationId } });
          if (!existing) throw new Error('verification_record_not_found');
          if (existing.ticketId !== resolvedTicketId) throw new Error('verification_ticket_mismatch');

          const updated = await tx.gateVerification.update({
            where: { verificationId },
            data: {
              status: 'VERIFIED',
              verifiedAt: new Date(),
              verifierPubkey: staffId ?? existing.verifierPubkey ?? 'unknown-staff',
              location: gateId ?? existing.location ?? undefined,
              meta: {
                ...(existing.meta as Record<string, any>),
                serverVerifiedAt: new Date().toISOString(),
                gateId: gateId ?? null,
                staffId: staffId ?? null,
              } as any,
            },
          });

          return { ticketId: resolvedTicketId, verificationId: updated.verificationId, createdOrUpdated: 'updated' };
        } else {
          // 4) create new GateVerification row
          const gv = await tx.gateVerification.create({
            data: {
              eventId,
              ticketId: resolvedTicketId,
              verifierPubkey: staffId ?? 'unknown-staff',
              status: 'VERIFIED',
              verifiedAt: new Date(),
              location: gateId ?? undefined,
              meta: {
                serverVerifiedAt: new Date().toISOString(),
                gateId: gateId ?? null,
                staffId: staffId ?? null,
              } as any,
            } as any,
          });

          return { ticketId: resolvedTicketId, verificationId: gv.verificationId, createdOrUpdated: 'created' };
        }
      });

      return NextResponse.json({ ok: true, message: 'verified_and_used', ticketId: result.ticketId, verificationId: result.verificationId });
    } catch (txErr: any) {
      const msg = String(txErr?.message ?? txErr);
      if (msg.includes('already_redeemed_or_invalid')) {
        return NextResponse.json({ ok: false, error: 'already_redeemed_or_invalid' }, { status: 409 });
      }
      if (msg.includes('verification_record_not_found')) {
        return NextResponse.json({ ok: false, error: 'verification_record_not_found' }, { status: 400 });
      }
      if (msg.includes('verification_ticket_mismatch')) {
        return NextResponse.json({ ok: false, error: 'verification_ticket_mismatch' }, { status: 400 });
      }
      if (msg.includes('could_not_resolve_ticket_id')) {
        return NextResponse.json({ ok: false, error: 'could_not_resolve_ticket_id' }, { status: 400 });
      }

      console.error('Transaction error in /api/gate/verify:', txErr);
      return NextResponse.json({ ok: false, error: 'server_error', details: msg }, { status: 500 });
    }
  } catch (err: any) {
    console.error('api/gate/verify error:', err);
    return NextResponse.json({ ok: false, error: 'server_error', details: err?.message ?? String(err) }, { status: 500 });
  }
}
