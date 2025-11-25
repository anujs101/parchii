# Parchi QR Code System - Encoding & Verification

## 1. QR Code Data Structure

### What Gets Encoded
Each ticket's QR code contains a compact, unique identifier that allows for secure verification:

```typescript
interface QRPayload {
  v: number;           // Protocol version (1)
  e: string;           // Event ID (deterministic hash)
  t: number;           // Ticket number within event
  a: string;           // Asset pubkey (first 8 chars for quick lookup)
  ts: number;          // Timestamp when QR was generated
  c: string;           // Checksum (prevents tampering)
}

// Example QR payload
const qrData = {
  v: 1,
  e: "evt_7f9a2b3c4d5e6f",     // Short event ID
  t: 123,                      // Ticket #123 for this event
  a: "Abc12345",               // First 8 chars of asset pubkey
  ts: 1703520000,             // Generation timestamp
  c: "x7k9"                   // 4-char checksum
}
```

### QR String Format
```typescript
// Final QR string format
const qrString = `parchi:${base64url.encode(JSON.stringify(qrData))}`;

// Example output:
// "parchi:eyJ2IjoxLCJlIjoiZXZ0XzdmOWEyYjNjNGQ1ZTZmIiwidCI6MTIzLCJhIjoiQWJjMTIzNDUiLCJ0cyI6MTcwMzUyMDAwMCwiYyI6Ing3azkifQ"
```

## 2. QR Generation Process

```typescript
// utils/qrGenerator.ts
import crypto from 'crypto';
import { base64url } from 'jose';

export function generateTicketQR(
  eventId: string, 
  ticketNumber: number, 
  assetPubkey: string
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Create base payload
  const payload = {
    v: 1,
    e: eventId,
    t: ticketNumber,
    a: assetPubkey.slice(0, 8), // First 8 chars for quick lookup
    ts: timestamp
  };
  
  // Generate checksum to prevent tampering
  const checksumData = `${eventId}:${ticketNumber}:${assetPubkey}:${timestamp}`;
  const checksum = crypto
    .createHash('sha256')
    .update(checksumData)
    .digest('hex')
    .slice(0, 4); // First 4 chars
    
  payload.c = checksum;
  
  // Encode as base64url (URL-safe, no padding)
  const encoded = base64url.encode(JSON.stringify(payload));
  
  return `parchi:${encoded}`;
}

// Generate QR code image
export async function generateQRImage(qrData: string): Promise<string> {
  const QRCode = require('qrcode');
  
  const qrOptions = {
    errorCorrectionLevel: 'M',
    type: 'image/png',
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
```

## 3. Verification Flow

### Step-by-Step Verification Process

```typescript
// components/GateVerification.tsx
export class TicketVerifier {
  
  async verifyTicket(qrString: string, staffWallet: string): Promise<VerificationResult> {
    try {
      // 1. Parse QR Code
      const qrData = this.parseQR(qrString);
      
      // 2. Basic validation
      await this.validateQRData(qrData);
      
      // 3. Database lookup
      const ticket = await this.findTicketInDatabase(qrData);
      
      // 4. On-chain verification
      const assetData = await this.verifyOnChain(ticket.asset_pubkey);
      
      // 5. Attendance check
      await this.checkAttendanceStatus(ticket);
      
      // 6. Wallet signature verification
      const signatureValid = await this.requestOwnerSignature(
        ticket.owner_pubkey, 
        qrData
      );
      
      if (signatureValid) {
        // 7. Mark as attended
        await this.markAttended(ticket.id, staffWallet);
        return { success: true, ticket, attendee: ticket.owner_pubkey };
      }
      
      return { success: false, error: 'Invalid signature' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Parse and validate QR
  parseQR(qrString: string): QRPayload {
    if (!qrString.startsWith('parchi:')) {
      throw new Error('Invalid QR format');
    }
    
    const encoded = qrString.replace('parchi:', '');
    
    try {
      const decoded = JSON.parse(base64url.decode(encoded));
      
      // Validate structure
      if (!decoded.v || !decoded.e || !decoded.t || !decoded.a || !decoded.c) {
        throw new Error('Malformed QR data');
      }
      
      // Check protocol version
      if (decoded.v !== 1) {
        throw new Error('Unsupported QR version');
      }
      
      return decoded;
    } catch {
      throw new Error('Invalid QR encoding');
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
    
    // Validate checksum
    const ticket = await this.findTicketInDatabase(qrData);
    const expectedChecksum = this.calculateChecksum(
      qrData.e, 
      qrData.t, 
      ticket.asset_pubkey, 
      qrData.ts
    );
    
    if (qrData.c !== expectedChecksum) {
      throw new Error('QR code tampered or invalid');
    }
  }
  
  // Find ticket in database
  async findTicketInDatabase(qrData: QRPayload): Promise<TicketRecord> {
    const ticket = await db.tickets.findFirst({
      where: {
        event_id: qrData.e,
        ticket_number: qrData.t,
        asset_pubkey: {
          startsWith: qrData.a // Match first 8 chars
        }
      },
      include: {
        event: true
      }
    });
    
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    
    return ticket;
  }
  
  // Verify on-chain data
  async verifyOnChain(assetPubkey: string): Promise<AssetData> {
    const asset = await fetchAsset(umi, publicKey(assetPubkey));
    
    if (!asset) {
      throw new Error('Asset not found on-chain');
    }
    
    // Verify it's soulbound (has PermanentFreezeDelegate)
    const isSoulbound = asset.plugins?.some(
      plugin => plugin.type === 'PermanentFreezeDelegate' && plugin.frozen
    );
    
    if (!isSoulbound) {
      throw new Error('Invalid ticket: not soulbound');
    }
    
    return asset;
  }
  
  // Check if already attended
  async checkAttendanceStatus(ticket: TicketRecord): Promise<void> {
    if (ticket.claimed) {
      throw new Error(`Already checked in at ${ticket.claimed_at}`);
    }
    
    // Also check on-chain attribute
    const asset = await fetchAsset(umi, publicKey(ticket.asset_pubkey));
    const claimedAttr = asset.plugins?.attributes?.attributeList
      ?.find(attr => attr.key === 'claimed');
    
    if (claimedAttr?.value === 'true') {
      throw new Error('Ticket already used (on-chain verification)');
    }
  }
  
  // Request owner wallet signature
  async requestOwnerSignature(ownerPubkey: string, qrData: QRPayload): Promise<boolean> {
    // This triggers a wallet popup for the ticket owner
    const message = `Parchi Check-in\nEvent: ${qrData.e}\nTicket: #${qrData.t}\nTime: ${new Date().toISOString()}`;
    
    try {
      // In real implementation, this would be handled by the attendee's wallet
      const signature = await this.requestSignatureFromAttendee(ownerPubkey, message);
      
      // Verify signature matches the ticket owner
      const isValid = this.verifyMessageSignature(message, signature, ownerPubkey);
      
      return isValid;
    } catch {
      return false;
    }
  }
  
  // Mark as attended (both DB and on-chain)
  async markAttended(ticketId: string, staffWallet: string): Promise<void> {
    const now = new Date();
    
    // Update database
    await db.tickets.update({
      where: { id: ticketId },
      data: { 
        claimed: true, 
        claimed_at: now,
        claimed_by: staffWallet
      }
    });
    
    // Update on-chain attribute (optional, for redundancy)
    const ticket = await db.tickets.findUnique({ where: { id: ticketId } });
    
    await updateAttributes(umi, {
      asset: publicKey(ticket.asset_pubkey),
      attributes: [
        { key: 'claimed', value: 'true' },
        { key: 'claimed_at', value: now.toISOString() }
      ]
    }).sendAndConfirm(umi);
  }
}
```

## 4. Security Features

### Multi-Layer Verification
1. **QR Integrity**: Checksum prevents tampering
2. **Database Lookup**: Ensures ticket exists and is valid
3. **On-Chain Verification**: Confirms asset ownership and soulbound status  
4. **Wallet Signature**: Proves the ticket holder is present
5. **Double-Spend Prevention**: Database + on-chain claimed status

### Anti-Fraud Measures
```typescript
// Additional security checks
export class SecurityValidator {
  
  // Prevent screenshot fraud
  validateQRFreshness(timestamp: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 60; // QR valid for 1 minute after scan
    
    return (now - timestamp) < maxAge;
  }
  
  // Rate limiting per staff wallet
  async checkStaffRateLimit(staffWallet: string): Promise<boolean> {
    const recentScans = await db.verifications.count({
      where: {
        staff_wallet: staffWallet,
        created_at: {
          gte: new Date(Date.now() - 60000) // Last minute
        }
      }
    });
    
    return recentScans < 10; // Max 10 scans per minute
  }
  
  // Detect duplicate scans
  async preventDoubleEntry(assetPubkey: string): Promise<boolean> {
    const existingEntry = await db.verifications.findFirst({
      where: {
        asset_pubkey: assetPubkey,
        created_at: {
          gte: new Date(Date.now() - 300000) // Last 5 minutes
        }
      }
    });
    
    return !existingEntry;
  }
}
```

## 5. Gate App UX Flow

```typescript
// Simplified gate verification component
export function GateScanner() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  
  const handleScan = async (qrData: string) => {
    setScanResult(qrData);
    setVerificationResult({ loading: true });
    
    try {
      const verifier = new TicketVerifier();
      const result = await verifier.verifyTicket(qrData, staffWallet);
      
      setVerificationResult(result);
      
      if (result.success) {
        // Show success animation + attendee info
        showSuccessToast(`✅ ${result.attendee} - Welcome!`);
      } else {
        // Show error with specific reason
        showErrorToast(`❌ ${result.error}`);
      }
    } catch (error) {
      setVerificationResult({ 
        success: false, 
        error: error.message 
      });
    }
  };
  
  return (
    <div className="gate-scanner">
      <QRCodeScanner onScan={handleScan} />
      <VerificationStatus result={verificationResult} />
    </div>
  );
}
```

## 6. Why This Approach Is Secure

1. **Unique Per Ticket**: Each QR contains event + ticket number + asset pubkey
2. **Tamper-Proof**: Checksum validation prevents QR modification
3. **Owner Verification**: Requires wallet signature from ticket holder
4. **Double-Entry Prevention**: Database + on-chain claimed status
5. **Real-Time Validation**: Fresh on-chain lookups prevent replay attacks
6. **Staff Accountability**: All verifications logged with staff wallet

The QR code serves as a pointer to the real ticket data, while the actual security comes from on-chain ownership verification and wallet signature requirements.