# Parchi - Web3 Event Ticketing Platform

A secure, transparent, and innovative event ticketing platform built on Solana blockchain using Metaplex Core NFTs.

## 🌟 Features

- **Soulbound NFT Tickets**: Non-transferable tickets using Metaplex Core's PermanentFreezeDelegate
- **QR Code Verification**: Tamper-proof QR codes with checksum validation
- **Gate Verification**: Multi-layer security for event entry
- **IPFS Storage**: Decentralized metadata and image storage
- **Real-time Updates**: Live ticket availability and verification status
- **Mobile Responsive**: Optimized for all devices including gate scanners

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 with TypeScript
- **Blockchain**: Solana (Devnet/Mainnet)
- **NFT Standard**: Metaplex Core (mpl-core)
- **Database**: Supabase
- **Storage**: IPFS via Pinata
- **Wallet**: Solana Wallet Adapter

### Key Components
1. **QR Code System**: Unique, tamper-proof QR codes with asset pubkey
2. **Metaplex Core Integration**: Soulbound NFT tickets with on-chain attributes
3. **Gate Verification**: Multi-layer validation with signature verification
4. **Event Management**: Complete event lifecycle from creation to verification

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Supabase account
- Pinata account (for IPFS)
- Solana wallet (Phantom, Solflare, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd parchi
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Pinata (IPFS)
   PINATA_API_KEY=your_pinata_api_key
   PINATA_SECRET_API_KEY=your_pinata_secret_key

   # Solana
   NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
   ```

4. **Database Setup**
   Run the SQL schema in your Supabase dashboard:
   ```bash
   # Copy the contents of lib/database/schema.sql
   # and execute in Supabase SQL editor
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📋 Implementation Flow

### 1. Event Creation
```typescript
// Event organizers create events with collection setup
const eventData = await createEvent(umi, wallet, {
  name: "My Event",
  description: "Event description",
  posterUrl: "https://...",
  startTime: new Date(),
  endTime: new Date(),
  priceLamports: 100000000, // 0.1 SOL
  capacity: 100,
  venue: "Event Venue"
});
```

### 2. Ticket Purchase
```typescript
// Users purchase tickets (creates soulbound NFTs)
const purchaseData = await purchaseTicket(umi, {
  eventId: "evt_...",
  buyerPubkey: wallet.publicKey.toString(),
  quantity: 1
});
```

### 3. Gate Verification
```typescript
// Staff verify tickets at event gates
const verifier = new TicketVerifier(umi);
const result = await verifier.verifyTicket(qrString, staffWallet);
```

## 🔒 Security Features

### QR Code Security
- **Tamper-proof**: SHA-256 checksum validation
- **Unique**: Contains event ID, ticket number, and asset pubkey
- **Time-bound**: Timestamp validation prevents replay attacks

### Multi-layer Verification
1. **QR Integrity**: Checksum and structure validation
2. **Database Lookup**: Ticket existence and status check
3. **On-chain Verification**: Asset ownership and soulbound status
4. **Signature Verification**: Optional wallet signature for presence proof
5. **Double-entry Prevention**: Database and on-chain claimed status

### Soulbound Implementation
```typescript
// Tickets are permanently frozen to prevent transfers
plugins: [
  {
    type: 'PermanentFreezeDelegate',
    frozen: true,
  }
]
```

## 🎯 API Endpoints

### Events
- `POST /api/events` - Create event
- `GET /api/events` - List events
- `GET /api/events/[id]` - Get event details
- `GET /api/events/[id]/capacity` - Check capacity

### Tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets` - List tickets
- `POST /api/tickets/by-qr` - Find ticket by QR data
- `PATCH /api/tickets/[id]/claim` - Mark ticket as claimed

## 🧪 Testing

### Manual Testing Flow

1. **Event Creation**
   - Navigate to `/create-event`
   - Fill in event details
   - Connect wallet and create event
   - Verify collection creation on Solana Explorer

2. **Ticket Purchase**
   - Navigate to event page
   - Connect wallet and purchase ticket
   - Verify NFT creation and metadata on IPFS
   - Check ticket in wallet

3. **Gate Verification**
   - Use QR scanner component
   - Scan ticket QR code
   - Verify multi-layer validation
   - Confirm ticket marked as claimed

### Environment Variables for Testing
```env
# Use devnet for testing
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com

# Test with devnet SOL (get from faucet)
# https://faucet.solana.com/
```

## 🔧 Configuration

### Wallet Configuration
The app supports multiple Solana wallets:
- Phantom
- Solflare
- Backpack
- Glow

### Network Configuration
- **Development**: Devnet
- **Production**: Mainnet-beta

### IPFS Configuration
Using Pinata for reliable IPFS storage:
- Images: Ticket designs with embedded QR codes
- Metadata: NFT metadata following Metaplex standards

## 📱 Mobile Optimization

### Gate Scanner App
- Responsive QR scanner interface
- Real-time verification feedback
- Offline capability planning
- Staff authentication

### Ticket Display
- Mobile-optimized ticket view
- QR code display
- Wallet integration
- Share functionality

## 🚨 Error Handling

### Common Issues
1. **Wallet Connection**: Clear wallet cache, refresh page
2. **Transaction Failures**: Check SOL balance, network status
3. **QR Scanning**: Ensure good lighting, stable camera
4. **Database Errors**: Check Supabase connection, API limits

### Debug Mode
Enable detailed logging:
```env
NODE_ENV=development
```

## 🔄 Deployment

### Vercel Deployment
1. Connect GitHub repository
2. Set environment variables
3. Deploy to production

### Environment Setup
- Production RPC endpoint
- Mainnet wallet configuration
- Production database
- IPFS production settings

## 📊 Analytics & Monitoring

### Event Analytics
- Ticket sales tracking
- Verification statistics
- Revenue analytics
- Attendance rates

### System Monitoring
- Transaction success rates
- API response times
- Database performance
- IPFS upload success

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- GitHub Issues
- Documentation
- Community Discord

---

**Built with ❤️ using Solana, Metaplex Core, and Next.js**
