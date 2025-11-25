/**
 * Database types for Parchi ticketing platform - Now using Prisma
 */

// Import Prisma client for type inference
import { PrismaClient } from '@prisma/client'

// Create type aliases from Prisma client
const prisma = new PrismaClient()
export type Event = Awaited<ReturnType<typeof prisma.event.findFirst>>
export type Ticket = Awaited<ReturnType<typeof prisma.ticket.findFirst>>
export type GateVerification = Awaited<ReturnType<typeof prisma.gateVerification.findFirst>>

// Enum types
export enum EventState {
  DRAFT = 'draft',
  PUBLISHED = 'published', 
  ONGOING = 'ongoing',
  ENDED = 'ended'
}

export enum VerificationStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  DUPLICATE = 'duplicate'
}

// Extended types with relations
export interface EventWithStats extends NonNullable<Event> {
  totalTickets: number;
  mintedTickets: number;
  claimedTickets: number;
  remainingTickets: number;
  revenueLamports: bigint;
}

export interface TicketWithEvent extends NonNullable<Ticket> {
  event: NonNullable<Event>;
}

export interface EventStats {
  total_tickets: number;
  minted_tickets: number;
  claimed_tickets: number;
  remaining_tickets: number;
  revenue_lamports: number;
}

// Input types for creating records
export interface CreateEventInput {
  event_id: string;
  organizer_pubkey: string;
  name: string;
  description?: string;
  poster_url?: string;
  start_time: Date;
  end_time: Date;
  price_lamports: number;
  capacity: number;
  collection_pubkey?: string;
  venue?: string;
  category?: string;
  tags?: string[];
}

export interface CreateTicketInput {
  event_id: string;
  owner_pubkey: string;
  asset_pubkey: string;
  ticket_number: number;
  qr_data: string;
  metadata_uri?: string;
  image_url?: string;
  transaction_signature?: string;
}

export interface CreateVerificationInput {
  ticket_id: string;
  event_id: string;
  staff_wallet: string;
  verification_status: 'success' | 'failed' | 'duplicate';
  error_message?: string;
  attendee_signature?: string;
  ip_address?: string;
  user_agent?: string;
}

// Update types
export interface UpdateEventInput {
  name?: string;
  description?: string;
  poster_url?: string;
  start_time?: Date;
  end_time?: Date;
  price_lamports?: number;
  capacity?: number;
  state?: 'draft' | 'published' | 'ongoing' | 'ended';
  venue?: string;
  category?: string;
  tags?: string[];
}

export interface UpdateTicketInput {
  claimed?: boolean;
  claimed_at?: Date;
  claimed_by?: string;
  metadata_uri?: string;
  image_url?: string;
}

// Query filters
export interface EventFilters {
  organizer_pubkey?: string;
  state?: 'draft' | 'published' | 'ongoing' | 'ended';
  category?: string;
  start_date?: Date;
  end_date?: Date;
  search?: string;
}

export interface TicketFilters {
  event_id?: string;
  owner_pubkey?: string;
  claimed?: boolean;
  ticket_numbers?: number[];
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Verification result types
export interface VerificationResult {
  success: boolean;
  ticket?: Ticket & { event: Event };
  attendee?: string;
  ticketNumber?: number;
  error?: string;
  loading?: boolean;
}

// Transaction types
export interface PurchaseTransactionData {
  transaction: string; // Base64 encoded transaction
  assetPubkey: string;
  ticketNumber: number;
  metadataUri: string;
  qrData: string;
  imageUrl: string;
  ticketId: string;
}

export interface EventCreationData {
  eventId: string;
  collectionPubkey: string;
  metadataUri: string;
  transaction: string;
}
