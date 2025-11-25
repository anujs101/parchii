/**
 * IPFS Service for uploading metadata and images
 * Using Pinata as the IPFS provider
 */

export interface IPFSUploadResult {
  hash: string;
  url: string;
  size: number;
}

export interface TicketMetadata {
  name: string;
  description: string;
  image: string;
  animation_url?: string;
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

export interface CollectionMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

/**
 * Upload image buffer to IPFS
 */
export async function uploadImageToIPFS(
  imageBuffer: Buffer,
  filename: string = 'ticket-image.png'
): Promise<IPFSUploadResult> {
  const pinataJWT = process.env.PINATA_JWT;
  const pinataApiKey = process.env.PINATA_API_KEY;
  const pinataSecretKey = process.env.PINATA_SECRET_API_KEY;

  // Prefer JWT authentication if available
  if (!pinataJWT && (!pinataApiKey || !pinataSecretKey)) {
    throw new Error('Pinata API credentials not configured');
  }

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
    formData.append('file', blob, filename);

    const metadata = JSON.stringify({
      name: filename,
      keyvalues: {
        type: 'ticket-image',
        timestamp: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', options);

    // Set up authentication headers
    const headers: Record<string, string> = {};
    if (pinataJWT) {
      headers['Authorization'] = `Bearer ${pinataJWT}`;
    } else if (pinataApiKey && pinataSecretKey) {
      headers['pinata_api_key'] = pinataApiKey;
      headers['pinata_secret_api_key'] = pinataSecretKey;
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      hash: result.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
      size: result.PinSize
    };
  } catch (error) {
    console.error('IPFS image upload failed:', error);
    throw new Error(`Failed to upload image to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload JSON metadata to IPFS (supports both ticket and collection metadata)
 */
export async function uploadMetadataToIPFS(metadata: TicketMetadata | CollectionMetadata): Promise<IPFSUploadResult> {
  const pinataJWT = process.env.PINATA_JWT;
  const pinataApiKey = process.env.PINATA_API_KEY;
  const pinataSecretKey = process.env.PINATA_SECRET_API_KEY;

  // Prefer JWT authentication if available
  if (!pinataJWT && (!pinataApiKey || !pinataSecretKey)) {
    throw new Error('Pinata API credentials not configured');
  }

  try {
    const pinataMetadata = {
      name: 'metadata.json',
      keyvalues: {
        type: 'metadata',
        timestamp: new Date().toISOString()
      }
    };

    const options = {
      cidVersion: 0,
    };

    // Set up authentication headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (pinataJWT) {
      headers['Authorization'] = `Bearer ${pinataJWT}`;
    } else if (pinataApiKey && pinataSecretKey) {
      headers['pinata_api_key'] = pinataApiKey;
      headers['pinata_secret_api_key'] = pinataSecretKey;
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata,
        pinataOptions: options
      }),
    });

    if (!response.ok) {
      throw new Error(`Pinata metadata upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      hash: result.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
      size: result.PinSize
    };
  } catch (error) {
    console.error('IPFS metadata upload failed:', error);
    throw new Error(`Failed to upload metadata to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create ticket metadata object
 */
export function createTicketMetadata(
  eventName: string,
  ticketNumber: number,
  eventId: string,
  eventDate: Date,
  venue: string | undefined,
  imageUrl: string,
  qrData: string,
  externalUrl: string
): TicketMetadata {
  return {
    name: `${eventName} - Ticket #${ticketNumber}`,
    description: `Entry ticket for ${eventName} - ${eventDate.toLocaleDateString()}`,
    image: imageUrl,
    external_url: externalUrl,
    attributes: [
      { trait_type: "Event ID", value: eventId },
      { trait_type: "Ticket Number", value: ticketNumber.toString() },
      { trait_type: "Event Date", value: eventDate.toISOString().split('T')[0] },
      { trait_type: "Event Name", value: eventName },
      ...(venue ? [{ trait_type: "Venue", value: venue }] : []),
      { trait_type: "Blockchain", value: "Solana" },
      { trait_type: "Standard", value: "Metaplex Core" }
    ],
    properties: {
      category: "Event Ticket",
      qr_data: qrData
    }
  };
}

/**
 * Create collection metadata object
 */
export function createCollectionMetadata(
  eventName: string,
  eventDescription: string,
  eventId: string,
  posterUrl: string,
  capacity: number,
  startTime: Date
): CollectionMetadata {
  return {
    name: `${eventName} - Tickets`,
    description: `Official tickets for ${eventName}. ${eventDescription}`,
    image: posterUrl,
    external_url: `https://parchi.app/event/${eventId}`,
    attributes: [
      { trait_type: "Event ID", value: eventId },
      { trait_type: "Total Supply", value: capacity.toString() },
      { trait_type: "Event Date", value: startTime.toISOString().split('T')[0] },
      { trait_type: "Collection Type", value: "Event Tickets" }
    ]
  };
}

/**
 * Validate IPFS URL
 */
export function isValidIPFSUrl(url: string): boolean {
  return url.startsWith('https://gateway.pinata.cloud/ipfs/') || 
         url.startsWith('ipfs://') ||
         !!url.match(/^https?:\/\/.*\.ipfs\./);
}

/**
 * Convert IPFS hash to gateway URL
 */
export function ipfsHashToUrl(hash: string): string {
  if (hash.startsWith('Qm') || hash.startsWith('bafy')) {
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }
  return hash;
}
