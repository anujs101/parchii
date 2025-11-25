import { Umi, publicKey } from '@metaplex-foundation/umi';
import { parseQRCode, validateQRIntegrity, QRPayload } from '../qr/qrGenerator';
import { fetchTicketAsset, getTicketAttributes, isTicketClaimed, validateAssetOwnership } from '../metaplex/coreService';
import { VerificationResult, CreateVerificationInput } from '../database/types';
import { Ticket, Event } from '@prisma/client';

export interface TicketRecord extends Ticket {
  event: Event;
}

export interface SignatureVerificationRequest {
  message: string;
  signature: string;
  publicKey: string;
}

/**
 * Complete gate verification flow with multi-layer security
 */
export class TicketVerifier {
  constructor(private umi: Umi) {}

  async verifyTicket(
    qrString: string, 
    staffWallet: string,
    requestInfo?: { ip?: string; userAgent?: string }
  ): Promise<VerificationResult> {
    try {
      // 1. Parse QR Code
      const qrData = this.parseQR(qrString);
      
      // 2. Basic validation
      await this.validateQRData(qrData);
      
      // 3. Database lookup
      const ticket = await this.findTicketInDatabase(qrData);
      
      // 4. On-chain verification
      const assetData = await this.verifyOnChain(ticket.mintPubkey || '');
      
      // 5. Attendance check
      await this.checkAttendanceStatus(ticket);
      
      // 6. Wallet signature verification (optional but recommended)
      // This would be handled by the frontend to request signature from attendee
      
      // 7. Mark as attended
      await this.markAttended(ticket.ticketId, staffWallet, requestInfo);
      
      // 8. Log verification
      await this.logVerification(ticket, staffWallet, 'success', requestInfo);
      
      return { 
        success: true, 
        ticket, 
        attendee: ticket.holderPubkey.slice(0, 8) + '...',
        ticketNumber: qrData.t
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failed verification attempt
      try {
        const qrData = this.parseQR(qrString);
        const ticket = await this.findTicketInDatabase(qrData);
        await this.logVerification(ticket, staffWallet, 'failed', requestInfo, errorMessage);
      } catch {
        // If we can't even parse QR or find ticket, log minimal info
        console.error('Verification failed with unparseable QR:', errorMessage);
      }
      
      return { success: false, error: errorMessage };
    }
  }
  
  // Parse and validate QR
  parseQR(qrString: string): QRPayload {
    try {
      return parseQRCode(qrString);
    } catch (error) {
      throw new Error(`Invalid QR code: ${error instanceof Error ? error.message : 'Parse failed'}`);
    }
  }
  
  // Validate QR data integrity
  async validateQRData(qrData: QRPayload): Promise<void> {
    // Check timestamp (QR shouldn't be too old)
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 365 * 24 * 60 * 60; // 1 year
    
    if (now - qrData.ts > maxAge) {
      throw new Error('QR code expired');
    }
    
    // Additional validation will happen after database lookup
    // when we have the full asset pubkey
  }
  
  // Find ticket in database
  async findTicketInDatabase(qrData: QRPayload): Promise<TicketRecord> {
    try {
      const response = await fetch('/api/tickets/by-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: qrData.e,
          ticket_number: qrData.t,
          asset_prefix: qrData.a
        })
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Ticket not found in database');
        }
        throw new Error(`Database lookup failed: ${response.statusText}`);
      }

      const ticket = await response.json();
      
      // Validate checksum now that we have full asset pubkey
      validateQRIntegrity(qrData, ticket.asset_pubkey);
      
      return ticket;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to find ticket in database');
    }
  }
  
  // Verify on-chain data
  async verifyOnChain(assetPubkey: string) {
    try {
      const asset = await fetchTicketAsset(this.umi, publicKey(assetPubkey));
      
      // Additional on-chain validations
      const attributes = getTicketAttributes(asset);
      
      // Verify it's a valid ticket with required attributes
      if (!attributes.event_id || !attributes.ticket_number) {
        throw new Error('Invalid ticket: missing required attributes');
      }
      
      return asset;
    } catch (error) {
      throw new Error(`On-chain verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Check if already attended
  async checkAttendanceStatus(ticket: TicketRecord): Promise<void> {
    if (ticket.usedAt) {
      throw new Error(`Already checked in at ${ticket.usedAt ? new Date(ticket.usedAt).toLocaleString() : 'unknown time'}`);
    }
    
    // Also check on-chain attribute as backup
    try {
      const asset = await fetchTicketAsset(this.umi, publicKey(ticket.mintPubkey || ''));
      if (isTicketClaimed(asset)) {
        throw new Error('Ticket already used (verified on-chain)');
      }
    } catch (error) {
      // If on-chain check fails, rely on database status
      console.warn('On-chain attendance check failed:', error);
    }
  }
  
  // Request owner wallet signature for physical presence verification
  async requestOwnerSignature(
    ownerPubkey: string, 
    qrData: QRPayload,
    challengeMessage?: string
  ): Promise<boolean> {
    const message = challengeMessage || 
      `Parchi Check-in\nEvent: ${qrData.e}\nTicket: #${qrData.t}\nTime: ${new Date().toISOString()}`;
    
    try {
      // This would integrate with a signature verification service
      const response = await fetch('/api/verify-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          owner_pubkey: ownerPubkey
        })
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.valid === true;
    } catch {
      return false;
    }
  }
  
  // Mark as attended (database)
  async markAttended(
    ticketId: string, 
    staffWallet: string,
    requestInfo?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/claim`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claimed: true,
          claimed_at: new Date().toISOString(),
          claimed_by: staffWallet,
          verification_ip: requestInfo?.ip,
          verification_user_agent: requestInfo?.userAgent
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to mark ticket as claimed: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Database update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Log verification attempt
  async logVerification(
    ticket: TicketRecord,
    staffWallet: string,
    status: 'success' | 'failed' | 'duplicate',
    requestInfo?: { ip?: string; userAgent?: string },
    errorMessage?: string
  ): Promise<void> {
    try {
      const verificationData: CreateVerificationInput = {
        ticket_id: ticket.ticketId,
        event_id: ticket.eventId,
        staff_wallet: staffWallet,
        verification_status: status,
        error_message: errorMessage,
        ip_address: requestInfo?.ip,
        user_agent: requestInfo?.userAgent
      };

      const response = await fetch('/api/verifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationData)
      });

      if (!response.ok) {
        console.error('Failed to log verification:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to log verification:', error);
      // Don't throw here as verification might have succeeded
    }
  }
}

/**
 * Security validator for additional fraud prevention
 */
export class SecurityValidator {
  
  // Prevent screenshot fraud by checking QR freshness
  validateQRFreshness(timestamp: number, maxAgeMinutes: number = 5): boolean {
    const now = Math.floor(Date.now() / 1000);
    const maxAge = maxAgeMinutes * 60;
    
    return (now - timestamp) < maxAge;
  }
  
  // Rate limiting per staff wallet
  async checkStaffRateLimit(staffWallet: string, maxScansPerMinute: number = 10): Promise<boolean> {
    try {
      const response = await fetch(`/api/staff/${staffWallet}/rate-limit`);
      
      if (!response.ok) {
        return true; // Allow if check fails
      }

      const result = await response.json();
      return result.scans_last_minute < maxScansPerMinute;
    } catch {
      return true; // Allow if check fails
    }
  }
  
  // Detect duplicate scans
  async preventDoubleEntry(assetPubkey: string, timeWindowMinutes: number = 5): Promise<boolean> {
    try {
      const response = await fetch(`/api/tickets/${assetPubkey}/recent-verifications?minutes=${timeWindowMinutes}`);
      
      if (!response.ok) {
        return true; // Allow if check fails
      }

      const result = await response.json();
      return result.recent_verifications === 0;
    } catch {
      return true; // Allow if check fails
    }
  }

  // Validate staff permissions for event
  async validateStaffPermissions(staffWallet: string, eventId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/events/${eventId}/staff/${staffWallet}/permissions`);
      
      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.can_verify === true;
    } catch {
      return false;
    }
  }
}

/**
 * Create verification service instance
 */
export function createVerificationService(umi: Umi) {
  return {
    verifier: new TicketVerifier(umi),
    security: new SecurityValidator()
  };
}
