import crypto from 'crypto';
import { base64url } from 'jose';
import QRCode from 'qrcode';

export interface QRPayload {
  v: number;           // Protocol version (1)
  e: string;           // Event ID (deterministic hash)
  t: number;           // Ticket number within event
  a: string;           // Asset pubkey (first 8 chars for quick lookup)
  ts: number;          // Timestamp when QR was generated
  c: string;           // Checksum (prevents tampering)
}

/**
 * Generate a secure QR code for a ticket
 * This must be called AFTER the asset is created to include the asset pubkey
 */
export function generateTicketQR(
  eventId: string, 
  ticketNumber: number, 
  assetPubkey: string
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Create base payload
  const payload: Omit<QRPayload, 'c'> = {
    v: 1,                                    // Version
    e: eventId,                             // Event ID
    t: ticketNumber,                        // Ticket number
    a: assetPubkey.slice(0, 8),            // First 8 chars of asset pubkey
    ts: timestamp                           // Generation timestamp
  };
  
  // Generate tamper-proof checksum
  const checksumData = `${eventId}:${ticketNumber}:${assetPubkey}:${timestamp}`;
  const checksum = crypto
    .createHash('sha256')
    .update(checksumData)
    .digest('hex')
    .slice(0, 4); // First 4 chars for compact size
    
  const finalPayload: QRPayload = {
    ...payload,
    c: checksum
  };
  
  // Encode as compact base64url (URL-safe, no padding)
  const encoded = base64url.encode(JSON.stringify(finalPayload));
  
  return `parchi:${encoded}`;
}

/**
 * Parse and validate QR code string
 */
export function parseQRCode(qrString: string): QRPayload {
  if (!qrString.startsWith('parchi:')) {
    throw new Error('Invalid QR format - must start with "parchi:"');
  }
  
  const encoded = qrString.replace('parchi:', '');
  
  try {
    const decodedBytes = base64url.decode(encoded);
    const decodedString = new TextDecoder().decode(decodedBytes);
    const decoded = JSON.parse(decodedString);
    
    // Validate structure
    if (!decoded.v || !decoded.e || !decoded.t || !decoded.a || !decoded.c || !decoded.ts) {
      throw new Error('Malformed QR data - missing required fields');
    }
    
    // Check protocol version
    if (decoded.v !== 1) {
      throw new Error(`Unsupported QR version: ${decoded.v}`);
    }
    
    // Validate types
    if (typeof decoded.t !== 'number' || decoded.t <= 0) {
      throw new Error('Invalid ticket number');
    }
    
    if (typeof decoded.ts !== 'number' || decoded.ts <= 0) {
      throw new Error('Invalid timestamp');
    }
    
    return decoded as QRPayload;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Invalid QR encoding');
  }
}

/**
 * Validate QR data integrity and freshness
 */
export function validateQRIntegrity(qrData: QRPayload, fullAssetPubkey: string): void {
  // Check timestamp (QR shouldn't be too old)
  const now = Math.floor(Date.now() / 1000);
  const maxAge = 365 * 24 * 60 * 60; // 1 year
  
  if (now - qrData.ts > maxAge) {
    throw new Error('QR code expired');
  }
  
  // Validate checksum to prevent tampering
  const expectedChecksum = calculateChecksum(
    qrData.e, 
    qrData.t, 
    fullAssetPubkey, 
    qrData.ts
  );
  
  if (qrData.c !== expectedChecksum) {
    throw new Error('QR code tampered or invalid checksum');
  }
  
  // Validate asset pubkey prefix
  if (!fullAssetPubkey.startsWith(qrData.a)) {
    throw new Error('Asset pubkey mismatch');
  }
}

/**
 * Calculate checksum for validation
 */
export function calculateChecksum(
  eventId: string,
  ticketNumber: number,
  assetPubkey: string,
  timestamp: number
): string {
  const checksumData = `${eventId}:${ticketNumber}:${assetPubkey}:${timestamp}`;
  return crypto
    .createHash('sha256')
    .update(checksumData)
    .digest('hex')
    .slice(0, 4);
}

/**
 * Generate QR code image as data URL
 */
export async function generateQRImage(qrData: string): Promise<string> {
  const qrOptions = {
    errorCorrectionLevel: 'M' as const,
    type: 'image/png' as const,
    quality: 0.92,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 256
  };
  
  return await QRCode.toDataURL(qrData, qrOptions);
}

/**
 * Generate QR code as buffer for embedding in ticket images
 * Server-side only - uses Node.js toBuffer method
 */
export async function generateQRBuffer(qrData: string, size: number = 256): Promise<Buffer> {
  const qrOptions = {
    errorCorrectionLevel: 'M' as const,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: size
  };
  
  try {
    return await QRCode.toBuffer(qrData, qrOptions);
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create deterministic event ID
 */
export function createEventId(organizerPubkey: string, eventName: string, timestamp: number): string {
  const data = `${organizerPubkey}:${eventName}:${Math.floor(timestamp / 1000)}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return `evt_${hash.slice(0, 16)}`;
}
