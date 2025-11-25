import {
  create,
  fetchAsset,
  fetchCollection,
  updateAuthority,
  addPlugin,
  updatePlugin,
  removePlugin,
  AssetV1,
  CollectionV1,
  PluginType,
} from '@metaplex-foundation/mpl-core';
import { Umi, PublicKey, Signer, TransactionBuilder, generateSigner, publicKey } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';

export interface EventData {
  name: string;
  description: string;
  posterUrl: string;
  startTime: Date;
  endTime: Date;
  priceLamports: number;
  capacity: number;
  organizerPubkey: string;
}

export interface TicketMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  properties: {
    category: string;
    qr_data: string;
  };
}

/**
 * Create a new event collection on Metaplex Core
 */
export async function createEventCollection(
  umi: Umi,
  eventData: EventData,
  eventId: string,
  metadataUri: string
): Promise<{ collection: Signer; transaction: TransactionBuilder }> {
  const collection = generateSigner(umi);
  
  const transaction = create(umi, {
    asset: collection,
    name: `${eventData.name} - Tickets`,
    uri: metadataUri,
    plugins: [
      // Make collection soulbound - prevents transfers
      {
        type: 'PermanentFreezeDelegate',
        frozen: true,
      },
      // Allow updates for capacity management
      {
        type: 'UpdateDelegate',
        additionalDelegates: [],
      },
      // Add custom attributes for event data
      {
        type: 'Attributes',
        attributeList: [
          { key: 'event_id', value: eventId },
          { key: 'organizer', value: eventData.organizerPubkey },
          { key: 'capacity', value: eventData.capacity.toString() },
          { key: 'price_lamports', value: eventData.priceLamports.toString() },
          { key: 'start_time', value: eventData.startTime.toISOString() },
          { key: 'end_time', value: eventData.endTime.toISOString() },
        ]
      }
    ],
  });
  
  return { collection, transaction };
}

/**
 * Create a soulbound ticket NFT
 */
export async function createTicketAsset(
  umi: Umi,
  collectionPubkey: PublicKey,
  ownerPubkey: PublicKey,
  ticketMetadata: TicketMetadata,
  metadataUri: string,
  eventId: string,
  ticketNumber: number,
  qrData: string
): Promise<{ asset: Signer; transaction: TransactionBuilder }> {
  const asset = generateSigner(umi);
  
  // Create asset with minimal plugins to reduce transaction complexity
  const transaction = create(umi, {
    asset,
    name: ticketMetadata.name,
    uri: metadataUri,
    owner: ownerPubkey,
    // Simplified plugins to reduce instruction count
    plugins: [
      // Only essential verification data
      {
        type: 'Attributes',
        attributeList: [
          { key: 'event_id', value: eventId },
          { key: 'ticket_number', value: ticketNumber.toString() },
          { key: 'qr_data', value: qrData }
        ]
      }
    ],
  });
  
  return { asset, transaction };
}

/**
 * Update ticket metadata URI after IPFS upload
 */
export async function updateTicketMetadataUri(
  umi: Umi,
  assetPubkey: PublicKey,
  metadataUri: string
): Promise<TransactionBuilder> {
  return updatePlugin(umi, {
    asset: assetPubkey,
    plugin: {
      type: 'Attributes',
      attributeList: [
        { key: 'metadata_uri', value: metadataUri }
      ]
    }
  });
}

/**
 * Mark ticket as claimed during gate verification
 */
export async function markTicketClaimed(
  umi: Umi,
  assetPubkey: PublicKey,
  staffWallet: string
): Promise<TransactionBuilder> {
  const now = new Date().toISOString();
  
  return updatePlugin(umi, {
    asset: assetPubkey,
    plugin: {
      type: 'Attributes',
      attributeList: [
        { key: 'claimed', value: 'true' },
        { key: 'claimed_at', value: now },
        { key: 'claimed_by', value: staffWallet }
      ]
    }
  });
}

/**
 * Fetch and verify ticket asset
 */
export async function fetchTicketAsset(
  umi: Umi,
  assetPubkey: PublicKey
): Promise<AssetV1> {
  try {
    const asset = await fetchAsset(umi, assetPubkey);
    
    if (!asset) {
      throw new Error('Asset not found on-chain');
    }
    
    // Verify it's soulbound (has PermanentFreezeDelegate)
    const isSoulbound = (asset as any).plugins?.some(
      (plugin: any) => plugin.type === 'PermanentFreezeDelegate' && 
                 'frozen' in plugin && 
                 plugin.frozen === true
    );
    
    if (!isSoulbound) {
      throw new Error('Invalid ticket: not soulbound');
    }
    
    return asset;
  } catch (error) {
    throw new Error(`Failed to fetch asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch collection data
 */
export async function fetchEventCollection(
  umi: Umi,
  collectionPubkey: PublicKey
): Promise<CollectionV1> {
  try {
    const collection = await fetchCollection(umi, collectionPubkey);
    
    if (!collection) {
      throw new Error('Collection not found on-chain');
    }
    
    return collection;
  } catch (error) {
    throw new Error(`Failed to fetch collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get ticket attributes from asset
 */
export function getTicketAttributes(asset: AssetV1): Record<string, string> {
  const attributes: Record<string, string> = {};
  
  const attributesPlugin = (asset as any).plugins?.find((plugin: any) => plugin.type === 'Attributes');
  if (attributesPlugin && 'attributeList' in attributesPlugin) {
    attributesPlugin.attributeList.forEach((attr: any) => {
      attributes[attr.key] = attr.value;
    });
  }
  
  return attributes;
}

/**
 * Check if ticket is claimed
 */
export function isTicketClaimed(asset: AssetV1): boolean {
  const attributes = getTicketAttributes(asset);
  return attributes.claimed === 'true';
}

/**
 * Validate asset ownership
 */
export function validateAssetOwnership(asset: AssetV1, expectedOwner: PublicKey): boolean {
  return asset.owner.toString() === expectedOwner.toString();
}

/**
 * Get current collection size (minted tickets)
 */
export async function getCollectionSize(
  umi: Umi,
  collectionPubkey: PublicKey
): Promise<number> {
  try {
    const collection = await fetchEventCollection(umi, collectionPubkey);
    return collection.currentSize;
  } catch (error) {
    throw new Error(`Failed to get collection size: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if event has capacity for more tickets
 */
export async function checkEventCapacity(
  umi: Umi,
  collectionPubkey: PublicKey,
  maxCapacity: number
): Promise<{ hasCapacity: boolean; currentSize: number; remaining: number }> {
  const currentSize = await getCollectionSize(umi, collectionPubkey);
  const remaining = maxCapacity - currentSize;
  
  return {
    hasCapacity: remaining > 0,
    currentSize,
    remaining
  };
}
