/**
 * QR Code Generation Service
 * Generates QR codes for collections and tickets
 */

import QRCode from 'qrcode';

export interface QRCodeData {
  type: 'collection' | 'ticket';
  collectionPubkey?: string;
  ticketId?: string;
  eventId: string;
  organizerPubkey: string;
  timestamp: number;
}

export interface QRCodeResult {
  dataUrl: string;
  data: QRCodeData;
}

/**
 * Generate QR code for collection
 */
export async function generateCollectionQR(
  collectionPubkey: string,
  eventId: string,
  organizerPubkey: string
): Promise<QRCodeResult> {
  try {
    const qrData: QRCodeData = {
      type: 'collection',
      collectionPubkey,
      eventId,
      organizerPubkey,
      timestamp: Date.now()
    };
    
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    
    return {
      dataUrl: qrCodeDataURL,
      data: qrData
    };
    
  } catch (error) {
    console.error('Collection QR generation failed:', error);
    throw new Error('Failed to generate collection QR code');
  }
}

/**
 * Generate QR code for ticket
 */
export async function generateTicketQR(
  ticketId: string,
  eventId: string,
  organizerPubkey: string,
  collectionPubkey: string
): Promise<QRCodeResult> {
  try {
    const qrData: QRCodeData = {
      type: 'ticket',
      ticketId,
      eventId,
      organizerPubkey,
      collectionPubkey,
      timestamp: Date.now()
    };
    
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H' // Higher error correction for tickets
    });
    
    return {
      dataUrl: qrCodeDataURL,
      data: qrData
    };
    
  } catch (error) {
    console.error('Ticket QR generation failed:', error);
    throw new Error('Failed to generate ticket QR code');
  }
}

/**
 * Validate QR code data
 */
export function validateQRData(qrString: string): QRCodeData | null {
  try {
    const data = JSON.parse(qrString) as QRCodeData;
    
    // Validate required fields
    if (!data.type || !data.eventId || !data.organizerPubkey || !data.timestamp) {
      return null;
    }
    
    // Validate type-specific fields
    if (data.type === 'collection' && !data.collectionPubkey) {
      return null;
    }
    
    if (data.type === 'ticket' && (!data.ticketId || !data.collectionPubkey)) {
      return null;
    }
    
    // Check timestamp is not too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - data.timestamp > maxAge) {
      return null;
    }
    
    return data;
    
  } catch (error) {
    console.error('QR validation failed:', error);
    return null;
  }
}
