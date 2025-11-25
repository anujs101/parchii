// app/api/gate/scan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import crypto from 'crypto';

const DEFAULT_EXPIRES = Number(process.env.GATE_JWT_EXP ?? 120); // seconds

function base64UrlToUtf8Node(input: string) {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return Buffer.from(b64, 'base64').toString('utf8');
}

function calculateChecksumServer(eventId: string, ticketNumber: number, assetPubkey: string, timestamp: number) {
  const checksumData = `${eventId}:${ticketNumber}:${assetPubkey}:${timestamp}`;
  return crypto.createHash('sha256').update(checksumData).digest('hex').slice(0, 4);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }

    const { qrString, staffId, gateId } = body as { qrString?: string; staffId?: string; gateId?: string };

    if (!qrString) {
      return NextResponse.json({ ok: false, error: 'missing_qrString' }, { status: 400 });
    }

    let decodedText: string;
    try {
      const raw = String(qrString);
      if (raw.startsWith('parchi:')) {
        const payload = raw.slice('parchi:'.length);
        try {
          decodedText = base64UrlToUtf8Node(payload);
        } catch (e) {
          console.error('parchi decode failed', e);
          return NextResponse.json({ ok: false, error: 'invalid_qr_format' }, { status: 400 });
        }
      } else {
        try {
          decodedText = decodeURIComponent(raw);
        } catch {
          decodedText = raw;
        }
      }
    } catch (err) {
      return NextResponse.json({ ok: false, error: 'invalid_qr_format' }, { status: 400 });
    }

    let qrPayload: any;
    try {
      qrPayload = JSON.parse(decodedText);
    } catch (err) {
      return NextResponse.json({ ok: false, error: 'invalid_qr_format' }, { status: 400 });
    }

    const ticketIdFromQr = qrPayload?.t ?? qrPayload?.ticketId ?? null; // can be number or string
    const mintPubkeyRaw = qrPayload?.m ?? qrPayload?.mint ?? qrPayload?.mintPubkey ?? qrPayload?.a ?? null;
    const eventIdFromQr = qrPayload?.e ?? qrPayload?.eventId ?? null;
    const tsFromQr = qrPayload?.ts ?? null;
    const checksumFromQr = qrPayload?.c ?? null;
    const versionFromQr = qrPayload?.v ?? null;

    if (!ticketIdFromQr && !mintPubkeyRaw) {
      return NextResponse.json({ ok: false, error: 'qr_missing_fields' }, { status: 400 });
    }

    if (versionFromQr && versionFromQr !== 1) {
      return NextResponse.json({ ok: false, error: 'unsupported_qr_version' }, { status: 400 });
    }

    if (typeof tsFromQr === 'number') {
      const now = Math.floor(Date.now() / 1000);
      const maxAge = 365 * 24 * 60 * 60; // 1 year
      if (now - tsFromQr > maxAge) {
        return NextResponse.json({ ok: false, error: 'qr_expired' }, { status: 400 });
      }
    }

    let ticket: any | null = null;

    if (ticketIdFromQr && typeof ticketIdFromQr === 'string') {
      ticket = await prisma.ticket.findUnique({
        where: { ticketId: ticketIdFromQr },
      });
    }

    if (!ticket && mintPubkeyRaw && typeof mintPubkeyRaw === 'string') {
      const mp = mintPubkeyRaw.trim();

      if (mp.length <= 16) {
        ticket = await prisma.ticket.findFirst({
          where: { mintPubkey: { startsWith: mp } as any },
        });
      } else {
        ticket = await prisma.ticket.findFirst({
          where: { mintPubkey: mp },
        });
      }
    }

    if (!ticket) {
      return NextResponse.json({ ok: false, error: 'ticket_not_found' }, { status: 404 });
    }

    // checksum validation (unchanged)
    if (checksumFromQr && tsFromQr && ticket.mintPubkey) {
      try {
        const fullAssetPubkey = ticket.mintPubkey;
        const ticketNumberForChecksum =
          typeof qrPayload?.t === 'number' ? qrPayload.t : Number(qrPayload?.t ?? 0);

        const expectedChecksum = calculateChecksumServer(
          eventIdFromQr ?? ticket.eventId,
          ticketNumberForChecksum,
          fullAssetPubkey,
          tsFromQr
        );

        if (checksumFromQr !== expectedChecksum) {
          return NextResponse.json({ ok: false, error: 'qr_tampered' }, { status: 400 });
        }
      } catch (err) {
        console.error('checksum validation failed', err);
        return NextResponse.json({ ok: false, error: 'invalid_qr_format' }, { status: 400 });
      }
    }

    // === Relaxed & diagnostic mint matching ===
    if (qrPayload?.m && ticket.mintPubkey) {
      const qrMint = String(qrPayload.m).trim();
      const dbMint = String(ticket.mintPubkey).trim();

      const qrLower = qrMint.toLowerCase();
      const dbLower = dbMint.toLowerCase();

      // Full equality (case-insensitive)
      const fullEq = qrLower === dbLower;

      // Allow prefix match when QR mint is a short prefix (<= 16 chars)
      const isShortPrefix = qrMint.length <= 16;
      const prefixMatch = isShortPrefix && dbLower.startsWith(qrLower);

      if (!fullEq && !prefixMatch) {
        console.warn('mint_mismatch', { qrMint, dbMint, ticketId: ticket.ticketId });
        return NextResponse.json({
          ok: false,
          error: 'mint_mismatch',
          details: 'QR mint does not match ticket mint',
          qrMint,
          dbMint,
        }, { status: 400 });
      }
      // if matched by prefix or equality: continue
    }

    if (ticket.status !== 'ACTIVE') {
      return NextResponse.json({ ok: false, error: 'ticket_not_active', status: ticket.status }, { status: 409 });
    }

    let verificationRecordId: string | null = null;
    try {
      const gv = await prisma.gateVerification.create({
        data: {
          eventId: eventIdFromQr ?? ticket.eventId,
          ticketId: ticket.ticketId,
          verifierPubkey: staffId ?? 'unknown-staff',
          status: 'PENDING',
          createdAt: new Date(),
          location: gateId ?? undefined,
          meta: {
            expiresInSeconds: DEFAULT_EXPIRES,
            issuedAt: new Date().toISOString(),
            gateId: gateId ?? null,
            staffId: staffId ?? null,
            rawQrPayload: qrPayload,
          } as any,
        } as any,
      });
      verificationRecordId = gv.verificationId;
    } catch (gvErr) {
      console.error('Failed to create GateVerification row at scan time:', gvErr);
      verificationRecordId = null;
    }

    return NextResponse.json({
      ok: true,
      ticketId: ticket.ticketId,
      eventId: eventIdFromQr ?? ticket.eventId ?? null,
      verificationId: verificationRecordId,
      expiresInSeconds: DEFAULT_EXPIRES,
      message: 'scan_ok',
    });
  } catch (err: any) {
    console.error('api/gate/scan error:', err);
    return NextResponse.json({ ok: false, error: 'server_error', details: err?.message ?? String(err) }, { status: 500 });
  }
}
