const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createMockCollection() {
  console.log('🎨 Creating mock collection for testing...\n');

  try {
    // Generate a unique mock collection pubkey
    const mockCollectionPubkey = `MockCollection${Date.now()}`.padEnd(44, '0');
    const organizerPubkey = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

    console.log(`📝 Mock Collection: ${mockCollectionPubkey}`);
    console.log(`👤 Organizer: ${organizerPubkey.slice(0, 8)}...`);

    // Update all events from this organizer with mock collection
    const result = await prisma.event.updateMany({
      where: { 
        organizerPubkey,
        collectionPubkey: null 
      },
      data: {
        collectionPubkey: mockCollectionPubkey,
        state: 'PUBLISHED'
      }
    });

    console.log(`✅ Updated ${result.count} events with collection`);
    console.log('✅ Events published and ready for ticket sales');

    // Show updated events
    const events = await prisma.event.findMany({
      where: { organizerPubkey },
      select: {
        eventId: true,
        name: true,
        state: true,
        collectionPubkey: true
      }
    });

    console.log('\n📊 Updated Events:');
    events.forEach(event => {
      console.log(`   ${event.name}: ${event.state} (${event.collectionPubkey.slice(0, 12)}...)`);
    });

    console.log('\n🎉 Mock collection created successfully!');
    console.log('🎫 You can now test ticket purchases');

  } catch (error) {
    console.error('❌ Failed to create mock collection:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  createMockCollection()
    .then(() => {
      console.log('\n✨ Mock collection setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createMockCollection };
