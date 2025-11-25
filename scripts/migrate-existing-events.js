const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateExistingEvents() {
  console.log('Starting migration of existing events...');

  try {
    // Find all events without collections
    const eventsWithoutCollections = await prisma.event.findMany({
      where: { 
        collectionPubkey: null,
        state: 'PUBLISHED' // Only migrate published events
      },
      select: {
        eventId: true,
        name: true,
        organizerPubkey: true,
        state: true
      }
    });

    console.log(`Found ${eventsWithoutCollections.length} events without collections`);

    if (eventsWithoutCollections.length === 0) {
      console.log('No events need migration');
      return;
    }

    // Group events by organizer
    const eventsByOrganizer = eventsWithoutCollections.reduce((acc, event) => {
      if (!acc[event.organizerPubkey]) {
        acc[event.organizerPubkey] = [];
      }
      acc[event.organizerPubkey].push(event);
      return acc;
    }, {});

    console.log(`Events grouped by ${Object.keys(eventsByOrganizer).length} organizers`);

    // For each organizer, we need to create a collection
    // Since we can't create blockchain transactions in this script,
    // we'll mark these events as needing collection creation
    for (const [organizerPubkey, events] of Object.entries(eventsByOrganizer)) {
      console.log(`Processing ${events.length} events for organizer ${organizerPubkey.slice(0, 8)}...`);

      // Update events to DRAFT state so collections can be created
      const eventIds = events.map(e => e.eventId);
      
      await prisma.event.updateMany({
        where: {
          eventId: { in: eventIds }
        },
        data: {
          state: 'DRAFT' // Reset to draft so organizer can create collection
        }
      });

      console.log(`Updated ${events.length} events to DRAFT state for organizer ${organizerPubkey.slice(0, 8)}`);
    }

    console.log('Migration completed successfully!');
    console.log('');
    console.log('NEXT STEPS:');
    console.log('1. Notify organizers that their events need collection creation');
    console.log('2. Organizers should use the "Create Collection" button in the UI');
    console.log('3. Events will be automatically published after collection creation');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateExistingEvents()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateExistingEvents };
