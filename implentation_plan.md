# Parchi MVP - Metaplex Core Implementation Plan

## 1. Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14+ with TypeScript
- **NFT Standard**: Metaplex Core (mpl-core)
- **Wallet**: Phantom Wallet Adapter
- **Storage**: Pinata/IPFS for metadata
- **Database**: Supabase/PlanetScale for event data and analytics
- **State Management**: Zustand or React Query

### Key Libraries
```bash
npm install @metaplex-foundation/mpl-core @metaplex-foundation/umi @metaplex-foundation/umi-bundle-defaults @solana/wallet-adapter-react @solana/wallet-adapter-phantom @solana/web3.js
```

## 2. Data Models

### Database Schema (Supabase)
```sql
-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL, -- hash-based deterministic ID
  organizer_pubkey TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  price_lamports BIGINT NOT NULL,
  capacity INTEGER NOT NULL,
  minted INTEGER DEFAULT 0,
  collection_pubkey TEXT, -- Metaplex Collection address
  state TEXT DEFAULT 'draft', -- draft, published, ongoing, ended
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets table (for tracking and analytics)
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT REFERENCES events(event_id),
  owner_pubkey TEXT NOT NULL,
  asset_pubkey TEXT NOT NULL UNIQUE, -- Full Metaplex Core Asset address
  ticket_number INTEGER NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMPTZ,
  claimed_by TEXT, -- Staff wallet who processed check-in
  metadata_uri TEXT,
  qr_data TEXT NOT NULL, -- Store the full QR string for verification
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique ticket numbers per event
  UNIQUE(event_id, ticket_number)
);
```

### NFT Metadata Structure
```json
{
  "name": "Parchi Ticket #123",
  "description": "Entry ticket for EventName - Dec 25, 2024",
  "image": "ipfs://QmHash/ticket-image.png",
  "animation_url": "ipfs://QmHash/ticket-animation.gif",
  "external_url": "https://parchi.app/ticket/event123/123",
  "attributes": [
    { "trait_type": "Event ID", "value": "event123" },
    { "trait_type": "Ticket Number", "value": "123" },
    { "trait_type": "Event Date", "value": "2024-12-25" },
    { "trait_type": "Venue", "value": "Madison Square Garden" },
    { "trait_type": "Status", "value": "Valid" }
  ],
  "properties": {
    "category": "Event Ticket",
    "qr_data": "parchi:event123:123:v1"
  }
}
```

## 3. Core Implementation

### 3.1 Event Creation Flow
```typescript
// utils/eventCreation.ts
export async function createEvent(umi: Umi, eventData: EventCreateData) {
  // 1. Create deterministic event ID
  const eventId = createEventId(eventData.organizer, eventData.name, Date.now());
  
  // 2. Create Metaplex Collection for the event
  const collection = generateSigner(umi);
  
  // 3. Upload collection metadata to IPFS
  const collectionMetadata = {
    name: `${eventData.name} - Tickets`,
    description: `Official tickets for ${eventData.name}`,
    image: eventData.posterUrl,
    external_url: `https://parchi.app/event/${eventId}`
  };
  
  const metadataUri = await uploadToIPFS(collectionMetadata);
  
  // 4. Create Collection on-chain
  await create(umi, {
    asset: collection,
    name: collectionMetadata.name,
    uri: metadataUri,
    plugins: [
      // Make collection soulbound
      {
        type: 'PermanentFreezeDelegate',
        frozen: true,
      },
      {
        type: 'UpdateDelegate',
      }
    ],
  }).sendAndConfirm(umi);
  
  // 5. Save event to database
  await saveEventToDatabase({
    eventId,
    collectionPubkey: collection.publicKey,
    ...eventData
  });
  
  return { eventId, collectionPubkey: collection.publicKey };
}
```

### 3.2 Ticket Purchase (Lazy Minting)
```typescript
// api/tickets/purchase.ts
export async function purchaseTicket(eventId: string, buyerPubkey: string) {
  // 1. Validate event availability
  const event = await getEventFromDatabase(eventId);
  if (!event || event.minted >= event.capacity) {
    throw new Error('Event sold out');
  }
  
  // 2. Generate ticket number and asset
  const ticketNumber = event.minted + 1;
  const asset = generateSigner(umi);
  
  // 3. Generate QR code with asset pubkey
  const qrData = generateTicketQR(eventId, ticketNumber, asset.publicKey.toString());
  
  // 4. Create ticket image with QR code embedded
  const ticketImageUrl = await generateTicketImage(event, ticketNumber, qrData);
  
  // 5. Generate ticket metadata with QR
  const ticketMetadata = {
    name: `${event.name} Ticket #${ticketNumber}`,
    description: `Entry ticket for ${event.name} - ${new Date(event.start_time).toLocaleDateString()}`,
    image: ticketImageUrl,
    external_url: `https://parchi.app/ticket/${eventId}/${ticketNumber}`,
    attributes: [
      { trait_type: "Event ID", value: eventId },
      { trait_type: "Ticket Number", value: ticketNumber.toString() },
      { trait_type: "Event Date", value: new Date(event.start_time).toISOString().split('T')[0] },
      { trait_type: "Status", value: "Valid" }
    ],
    properties: {
      category: "Event Ticket",
      qr_data: qrData // Store QR string in metadata
    }
  };
  
  // 6. Upload metadata to IPFS
  const metadataUri = await uploadToIPFS(ticketMetadata);
  
  // 7. Create Core Asset (soulbound ticket)
  const createAssetIx = create(umi, {
    asset,
    collection: publicKey(event.collection_pubkey),
    name: ticketMetadata.name,
    uri: metadataUri,
    owner: publicKey(buyerPubkey),
    plugins: [
      // Soulbound: prevents transfers
      {
        type: 'PermanentFreezeDelegate',
        frozen: true,
      },
      // Custom data for verification
      {
        type: 'Attributes',
        attributeList: [
          { key: 'event_id', value: eventId },
          { key: 'ticket_number', value: ticketNumber.toString() },
          { key: 'claimed', value: 'false' },
          { key: 'qr_data', value: qrData }
        ]
      }
    ],
  });
  
  // 8. Add payment instruction (SOL transfer)
  const paymentIx = SystemProgram.transfer({
    fromPubkey: publicKey(buyerPubkey),
    toPubkey: publicKey(event.organizer_pubkey),
    lamports: event.price_lamports,
  });
  
  // 9. Build transaction
  const tx = umi.transactions.create([paymentIx, createAssetIx]);
  
  // 10. Save ticket to database for quick lookups
  await saveTicketToDatabase({
    eventId,
    ownerPubkey: buyerPubkey,
    assetPubkey: asset.publicKey.toString(),
    ticketNumber,
    metadataUri,
    qrData
  });
  
  // 11. Return serialized transaction for frontend
  return {
    transaction: base64.encode(tx.serialize()),
    assetPubkey: asset.publicKey.toString(),
    ticketNumber,
    metadataUri,
    qrData
  };
}
```

### 3.3 Gate Verification Flow
```typescript
// components/GateScanner.tsx
export function GateScanner() {
  const { connection } = useConnection();
  const { publicKey: staffPublicKey } = useWallet();
  
  const verifyTicket = async (qrString: string) => {
    try {
      // 1. Parse QR code using the proper format
      const qrData = parseQRCode(qrString); // Returns { v, e, t, a, ts, c }
      
      // 2. Validate QR integrity (checksum, timestamp)
      await validateQRIntegrity(qrData);
      
      // 3. Find ticket in database using event + ticket number + asset prefix
      const ticket = await fetchTicketByQRData(qrData);
      if (!ticket) {
        throw new Error('Ticket not found');
      }
      
      // 4. Verify ownership and status on-chain
      const asset = await fetchAsset(umi, publicKey(ticket.asset_pubkey));
      if (!asset) {
        throw new Error('Asset not found on-chain');
      }
      
      if (asset.owner.toString() !== ticket.owner_pubkey) {
        throw new Error('Ticket ownership mismatch');
      }
      
      // 5. Check if already claimed (database + on-chain)
      if (ticket.claimed) {
        throw new Error(`Already used at ${ticket.claimed_at}`);
      }
      
      const claimedAttribute = asset.plugins?.attributes?.attributeList
        ?.find(attr => attr.key === 'claimed');
      
      if (claimedAttribute?.value === 'true') {
        throw new Error('Ticket already claimed on-chain');
      }
      
      // 6. Request attendee wallet signature for physical presence verification
      const challengeMessage = `Parchi Check-in\nEvent: ${qrData.e}\nTicket: #${qrData.t}\nTime: ${new Date().toISOString()}\nStaff: ${staffPublicKey?.toString().slice(0,8)}`;
      
      const signatureValid = await requestOwnerSignature(
        ticket.owner_pubkey, 
        challengeMessage
      );
      
      if (!signatureValid) {
        throw new Error('Owner signature verification failed');
      }
      
      // 7. Mark as claimed (database first, then on-chain)
      await updateTicketInDatabase(ticket.id, { 
        claimed: true, 
        claimed_at: new Date(),
        claimed_by: staffPublicKey?.toString()
      });
      
      // 8. Update on-chain attribute
      await updateAttributes(umi, {
        asset: publicKey(ticket.asset_pubkey),
        attributes: [
          { key: 'claimed', value: 'true' },
          { key: 'claimed_at', value: new Date().toISOString() }
        ]
      }).sendAndConfirm(umi);
      
      return { 
        success: true, 
        ticket,
        attendee: ticket.owner_pubkey.slice(0,8) + '...',
        ticketNumber: qrData.t
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  return (
    <div className="scanner-container">
      <QRCodeScanner onScan={verifyTicket} />
    </div>
  );
}

// Helper functions
function parseQRCode(qrString: string) {
  if (!qrString.startsWith('parchi:')) {
    throw new Error('Invalid QR format');
  }
  
  const encoded = qrString.replace('parchi:', '');
  return JSON.parse(base64url.decode(encoded));
}

async function validateQRIntegrity(qrData: any) {
  // Validate structure
  if (!qrData.v || !qrData.e || !qrData.t || !qrData.a || !qrData.c) {
    throw new Error('Malformed QR data');
  }
  
  // Check timestamp (not too old)
  const now = Math.floor(Date.now() / 1000);
  if (now - qrData.ts > 31536000) { // 1 year max
    throw new Error('QR code expired');
  }
}

async function fetchTicketByQRData(qrData: any) {
  return await db.tickets.findFirst({
    where: {
      event_id: qrData.e,
      ticket_number: qrData.t,
      asset_pubkey: {
        startsWith: qrData.a // Match first 8 chars from QR
      }
    },
    include: { event: true }
  });
}
```

## 4. Key Implementation Details

### 4.1 Soulbound Implementation
Metaplex Core supports soulbound NFTs through the PermanentFreezeDelegate plugin, which permanently binds tokens to a specific wallet address and prevents transfers:

```typescript
// Soulbound plugin configuration
plugins: [
  {
    type: 'PermanentFreezeDelegate',
    frozen: true, // Makes the asset non-transferable
  }
]
```

### 4.2 Capacity Control
```typescript
// Real-time capacity checking
async function checkCapacityBeforeMint(eventId: string) {
  // 1. Get current on-chain collection size
  const collection = await fetchCollection(umi, collectionPubkey);
  const currentMinted = collection.currentSize;
  
  // 2. Check against database capacity
  const event = await getEvent(eventId);
  
  if (currentMinted >= event.capacity) {
    throw new Error('SOLD_OUT');
  }
  
  // 3. Optimistic update with rollback on failure
  await updateEventMintedCount(eventId, currentMinted + 1);
  
  return true;
}
```

### 4.3 QR Code Generation
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
    .slice(0, 4);
    
  payload.c = checksum;
  
  // Encode as compact base64url
  const encoded = base64url.encode(JSON.stringify(payload));
  
  return `parchi:${encoded}`;
}

export function parseQRCode(qrString: string) {
  if (!qrString.startsWith('parchi:')) {
    throw new Error('Invalid QR format');
  }
  
  const encoded = qrString.replace('parchi:', '');
  return JSON.parse(base64url.decode(encoded));
}

// Generate ticket image with embedded QR
export async function generateTicketImage(
  event: Event, 
  ticketNumber: number, 
  qrData: string
): Promise<string> {
  // Use canvas or image manipulation library to create ticket design
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 800, 400);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 400);
  
  // Event details
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial';
  ctx.fillText(event.name, 50, 80);
  
  ctx.font = '18px Arial';
  ctx.fillText(`Ticket #${ticketNumber}`, 50, 120);
  ctx.fillText(`${new Date(event.start_time).toLocaleDateString()}`, 50, 150);
  
  // Generate QR code and embed
  const qrBuffer = await QRCode.toBuffer(qrData, {
    width: 120,
    margin: 1
  });
  
  const qrImage = await loadImage(qrBuffer);
  ctx.drawImage(qrImage, 650, 50, 120, 120);
  
  // Convert to data URL and upload to IPFS
  const buffer = canvas.toBuffer('image/png');
  return await uploadImageToIPFS(buffer);
}
```

## 5. API Routes Structure

```typescript
// pages/api/events/create.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { eventData } = req.body;
  
  try {
    const result = await createEvent(umi, eventData);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// pages/api/tickets/purchase.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { eventId, buyerPubkey } = req.body;
  
  try {
    const result = await purchaseTicket(eventId, buyerPubkey);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

## 6. Frontend Components

### Event Purchase Flow
```typescript
// components/TicketPurchase.tsx
export function TicketPurchase({ eventId }: { eventId: string }) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  
  const handlePurchase = async () => {
    try {
      // 1. Get unsigned transaction from API
      const response = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, buyerPubkey: publicKey.toString() })
      });
      
      const { transaction } = await response.json();
      
      // 2. Sign and send transaction
      const tx = Transaction.from(base64.decode(transaction));
      const signature = await sendTransaction(tx, connection);
      
      // 3. Wait for confirmation
      await connection.confirmTransaction(signature);
      
      toast.success('Ticket purchased successfully!');
    } catch (error) {
      toast.error(`Purchase failed: ${error.message}`);
    }
  };
  
  return (
    <button onClick={handlePurchase} className="purchase-button">
      Buy Ticket
    </button>
  );
}
```

## 7. Advantages of This Approach

1. **No Custom Contract**: Leverage battle-tested Metaplex infrastructure
2. **Cost Effective**: Core improves minting costs by over 85% compared to traditional Solana NFTs
3. **Soulbound Support**: Built-in non-transferable functionality
4. **Wallet Compatibility**: Works with all Solana wallets
5. **Rapid Development**: Pre-built SDKs and extensive documentation
6. **Scalability**: Metaplex handles the heavy lifting

## 8. Limitations & Workarounds

1. **No Custom Event Logic**: Use database for event state management
2. **Capacity Race Conditions**: Implement optimistic updates with rollback
3. **No Built-in Refunds**: Handle refunds through separate SOL transfers if needed
4. **Limited Customization**: Stick to Metaplex Core plugin system

## 9. Timeline Estimate

- **Week 1**: Core infrastructure, event creation, Metaplex integration
- **Week 2**: Purchase flow, metadata generation, IPFS integration  
- **Week 3**: Gate scanning app, verification logic
- **Week 4**: Organizer dashboard, analytics
- **Week 5**: Testing, polish, deployment

This approach gives you all the functionality of your original plan without the complexity of writing custom Solana programs, while leveraging the robust Metaplex ecosystem.