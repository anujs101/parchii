// app/gate/ScanPage.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import QRScanner from '@/components/qr/QRScanner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, AlertCircle, QrCode } from 'lucide-react';

type ScanResponse = {
  ok: boolean;
  // the server should return whatever ticket / verification identifiers it uses
  ticketId?: string | null;
  verificationId?: string | null;
  eventId?: string | null;
  details?: string;
  error?: string;
  // optional: a human message for display
  message?: string;
};

export default function ScanPage() {
  // UI state
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('Scan a ticket QR to verify');
  const [manualText, setManualText] = useState<string>('');

  // Gate flow state (keeps ticket / verification ids from server)
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  // Busy / error states
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // small local storage for verify result to display
  const [verifyResult, setVerifyResult] = useState<any>(null);

  // constants (adjust as needed)
  const STAFF_ID = 'staff-1';
  const GATE_ID = 'gate-1';

  // cleanup on unmount (no WalletConnect references any more)
  useEffect(() => {
    return () => {
      // nothing to cleanup now
    };
  }, []);

  // helper: decode base64url used in your QR encoding (kept compatible with existing generator)
  function base64UrlToUtf8(base64url: string): string {
    let b64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin.split('').map(ch => ch.charCodeAt(0)));
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  }

  // Accepts "parchi:<base64url>" or raw JSON / other strings
  function normalizeQrStringForServer(raw: string): string {
    const s = raw.trim();
    if (s.startsWith('parchi:')) {
      const payload = s.slice('parchi:'.length);
      try {
        const jsonText = base64UrlToUtf8(payload);
        const obj = JSON.parse(jsonText);
        const mapped = {
          m: obj.a ?? obj.m ?? obj.mintPubkey ?? null,
          e: obj.e ?? obj.eventId ?? null,
          t: obj.t ?? obj.ticketId ?? null,
          ts: obj.ts ?? null,
          c: obj.c ?? null,
        };
        return JSON.stringify(mapped);
      } catch (err) {
        return s;
      }
    }
    return s;
  }

  // --- API: scan ---
  const callScanApi = useCallback(async (qrString: string) => {
    setBusy(true);
    setError(null);
    setVerifyResult(null);

    try {
      const res = await fetch('/api/gate/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrString, staffId: STAFF_ID, gateId: GATE_ID }),
      });
      const data: ScanResponse = await res.json();
      if (!data.ok) throw new Error(data.error || data.details || 'scan_failed');

      // UI-friendly fields
      setTicketId(data.ticketId ?? null);
      setVerificationId(data.verificationId ?? null);
      setEventId(data.eventId ?? null);
      setMessage(data.message ?? 'Scan accepted — verifying automatically');

      return data;
    } catch (err: any) {
      console.error('scan api error', err);
      setError(err?.message ?? 'scan_error');
      setMessage(err?.message ?? 'Scan failed');
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  // --- API: verify (no signature required) ---
  const callVerifyApi = useCallback(async (payload: {
    verificationId?: string | null;
    ticketId?: string | null;
    staffId?: string;
    gateId?: string;
  }) => {
    setBusy(true);
    setError(null);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/gate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setVerifyResult({ ok: false, error: data.error, details: data.details });
        throw new Error(data.error || 'verify_failed');
      }
      setVerifyResult(data);
      return data;
    } catch (err: any) {
      console.error('verify api error', err);
      setError(err?.message ?? 'verify_error');
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  // --- Top-level flow: when a QR is scanned (camera or manual) ---
  const handleScan = useCallback(async (text: string) => {
    const normalizedForServer = normalizeQrStringForServer(text);
    if (!normalizedForServer) return;
    if (normalizedForServer === lastScan) return; // avoid duplicates
    setLastScan(normalizedForServer);
    setStatus('processing');
    setMessage('Verifying ticket...');

    try {
      // 1) call backend scan to parse QR & prepare verification (DB lookup)
      const scanData = await callScanApi(normalizedForServer);

      // 2) server should return verificationId or ticketId which we use to verify
      const vid = scanData.verificationId ?? null;
      const tid = scanData.ticketId ?? null;
      if (!vid && !tid) {
        throw new Error('No verification ID or ticket ID returned from scan');
      }

      // 3) call verify endpoint (server will check DB / ownership / NFT)
      const verify = await callVerifyApi({
        verificationId: vid ?? undefined,
        ticketId: tid ?? undefined,
        staffId: STAFF_ID,
        gateId: GATE_ID,
      });

      // 4) show success or error based on response
      if (verify.ok) {
        setStatus('success');
        setMessage(`Entry granted • Ticket ${verify.ticketId ?? tid ?? ''}`);
        setVerifyResult(verify);
      } else {
        setStatus('error');
        setMessage(verify.error ?? 'Verification failed');
        setVerifyResult(verify);
      }
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Verification error';
      setStatus('error');
      setMessage(msg);
    }
  }, [lastScan, callScanApi, callVerifyApi]);

  // Reset handler
  function doReset() {
    setLastScan(null);
    setStatus('idle');
    setMessage('Scan a ticket QR to verify');
    setManualText('');
    setVerificationId(null);
    setTicketId(null);
    setEventId(null);
    setVerifyResult(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Gate Scanner</h1>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 grid md:grid-cols-2 gap-4">
            {/* left: camera scanner */}
            <div className="aspect-square bg-black/60 rounded-lg overflow-hidden flex items-center justify-center">
              <QRScanner
                onResult={(text) => {
                  handleScan(text).catch((e) => {
                    console.warn('handleScan error', e);
                  });
                }}
                onError={(err) => {
                  if (status === 'idle') {
                    setStatus('error');
                    setMessage(typeof err === 'string' ? err : 'Scanner error');
                  }
                }}
                className="w-full h-full"
              />
            </div>

            {/* right: status + manual */}
            <div className="flex flex-col items-center justify-center text-center space-y-3 p-4">
              {status === 'success' && <CheckCircle className="w-12 h-12 text-emerald-400" />}
              {status === 'error' && <AlertCircle className="w-12 h-12 text-red-400" />}
              {status === 'idle' && <QrCode className="w-12 h-12 text-cyan-400" />}
              {status === 'processing' && <QrCode className="w-12 h-12 animate-pulse text-white" />}

              <p className="text-white/80">{message}</p>

              <div className="w-full space-y-2 pt-2">
                <Input
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder='Paste QR text here (e.g., {"t":"ticketId","m":"mintPubkey"})'
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-white/20 text-white/80 flex-1"
                    disabled={!manualText || status === 'processing'}
                    onClick={() => handleScan(manualText.trim()).catch(() => {})}
                  >
                    Verify QR Manually
                  </Button>

                  <Button
                    variant="outline"
                    className="border-white/20 text-white/80"
                    onClick={doReset}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <div className="w-full pt-2">
                <div className="min-h-[180px] border border-white/5 rounded p-3 flex flex-col items-center justify-center">
                  <div className="text-white/50">Scan result & verification live status</div>
                </div>

                <div className="mt-3 text-left text-xs text-white/70">
                  <div>Ticket: {ticketId ?? '—'}</div>
                  <div>VerificationId: {verificationId ?? '—'}</div>
                  <div>Event: {eventId ?? '—'}</div>
                </div>

                <div className="mt-3">
                  <div className="text-left text-sm text-white/80">Verify result:</div>
                  <pre className="text-xs text-white/70 max-h-36 overflow-auto p-2 bg-white/2 rounded mt-2">{JSON.stringify(verifyResult, null, 2)}</pre>
                </div>

                {error && (
                  <div className="mt-2 text-sm text-red-400">
                    Error: {error}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
