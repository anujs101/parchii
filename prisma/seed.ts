import { PrismaClient, EventCategory, EventState } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing events...');
  
  // Clear existing events
  await prisma.ticket.deleteMany({});
  await prisma.gateVerification.deleteMany({});
  await prisma.event.deleteMany({});
  
  console.log('Creating new NFT ticketing test events...');

  // Create realistic NFT ticketing events
  const events = [
    {
      eventId: 'solana-breakpoint-2025',
      organizerPubkey: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      name: 'Solana Breakpoint 2025',
      description: 'The premier Solana conference bringing together developers, founders, and the global Solana community. Experience keynotes, technical workshops, and networking with industry leaders.',
      posterUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop&crop=center',
      startTime: new Date('2025-11-15T09:00:00Z'),
      endTime: new Date('2025-11-17T18:00:00Z'),
      priceLamports: BigInt(80000000), // 0.08 SOL
      capacity: 5000,
      venue: 'Amsterdam RAI Convention Centre',
      category: EventCategory.CONFERENCE,
      tags: ['solana', 'blockchain', 'web3', 'developers'],
      state: EventState.PUBLISHED
    },
    {
      eventId: 'nft-art-showcase-miami',
      organizerPubkey: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      name: 'Miami NFT Art Showcase',
      description: 'Exclusive NFT art exhibition featuring top digital artists on Solana. Each ticket is a unique NFT that grants access and serves as a collectible memento.',
      posterUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&crop=center',
      startTime: new Date('2025-12-08T19:00:00Z'),
      endTime: new Date('2025-12-08T23:00:00Z'),
      priceLamports: BigInt(150000000), // 0.15 SOL
      capacity: 300,
      venue: 'Wynwood Arts District Gallery',
      category: EventCategory.ART,
      tags: ['nft', 'art', 'digital', 'collectible'],
      state: EventState.PUBLISHED
    },
    {
      eventId: 'defi-workshop-singapore',
      organizerPubkey: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      name: 'DeFi Builders Workshop Singapore',
      description: 'Hands-on workshop for building DeFi protocols on Solana. Learn from core contributors and build your first DeFi application. Limited seats available.',
      posterUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=600&fit=crop&crop=center',
      startTime: new Date('2025-10-25T10:00:00Z'),
      endTime: new Date('2025-10-25T17:00:00Z'),
      priceLamports: BigInt(120000000), // 0.12 SOL
      capacity: 150,
      venue: 'Marina Bay Sands Convention Centre',
      category: EventCategory.WORKSHOP,
      tags: ['defi', 'workshop', 'solana', 'development'],
      state: EventState.PUBLISHED
    },
    {
      eventId: 'solana-gaming-summit',
      organizerPubkey: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      name: 'Solana Gaming Summit Tokyo',
      description: 'The future of blockchain gaming on Solana. Meet game developers, play exclusive demos, and discover the next generation of Web3 games.',
      posterUrl: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&h=600&fit=crop&crop=center',
      startTime: new Date('2025-09-20T11:00:00Z'),
      endTime: new Date('2025-09-21T20:00:00Z'),
      priceLamports: BigInt(100000000), // 0.10 SOL
      capacity: 800,
      venue: 'Tokyo International Forum',
      category: EventCategory.CONFERENCE,
      tags: ['gaming', 'web3', 'solana', 'nft'],
      state: EventState.PUBLISHED
    },
    {
      eventId: 'crypto-music-festival',
      organizerPubkey: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      name: 'Crypto Music Festival',
      description: 'First-ever music festival where tickets are NFTs! Enjoy performances by top artists while your ticket becomes a valuable collectible with exclusive perks.',
      posterUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop&crop=center',
      startTime: new Date('2025-08-30T16:00:00Z'),
      endTime: new Date('2025-08-31T02:00:00Z'),
      priceLamports: BigInt(200000000), // 0.20 SOL
      capacity: 2000,
      venue: 'Austin Music Park',
      category: EventCategory.CONCERT,
      tags: ['music', 'festival', 'nft', 'collectible'],
      state: EventState.PUBLISHED
    }
  ];

  for (const eventData of events) {
    const event = await prisma.event.create({
      data: eventData,
    });
    console.log(`✅ Created event: ${event.name} (${event.eventId})`);
  }

  console.log('🎉 Database seeded with NFT ticketing events successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
