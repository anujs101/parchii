// lib/gate/gateHelpers.ts
import jwt from 'jsonwebtoken';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Connection, PublicKey } from '@solana/web3.js';
import { randomBytes as nodeRandomBytes } from 'crypto';

const maybeSecret = process.env.GATE_JWT_SECRET;
if (!maybeSecret) {
  throw new Error('Missing GATE_JWT_SECRET environment variable');
}
const JWT_SECRET: string = maybeSecret;


/**
 * Create a short-lived challenge JWT bound to a ticket + mint.
 * - payload: { ticketId, mintPubkey, nonce? }
 * - returns compact JWT string (HS256)
 */
export function createChallengeJwt(
  payload: { ticketId: string; mintPubkey: string; nonce?: string },
  expiresInSeconds = 120
): string {
  const body = {
    ticketId: payload.ticketId,
    mintPubkey: payload.mintPubkey,
    nonce: payload.nonce ?? cryptoRandomBase58(10),
  };
  // HS256 by default
  return jwt.sign(body, JWT_SECRET, { algorithm: 'HS256', expiresIn: expiresInSeconds });
}

/**
 * Verify and decode a challenge JWT.
 * Throws if invalid/expired.
 * Returns payload: { ticketId, mintPubkey, nonce, iat, exp }
 */
export function verifyChallengeJwt(token: string): {
  ticketId: string;
  mintPubkey: string;
  nonce: string;
  iat?: number;
  exp?: number;
} {
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
  if (!decoded || typeof decoded !== 'object') throw new Error('invalid_jwt_payload');
  const { ticketId, mintPubkey, nonce, iat, exp } = decoded;
  if (!ticketId || !mintPubkey || !nonce) throw new Error('invalid_jwt_payload_fields');
  return { ticketId, mintPubkey, nonce, iat, exp };
}

/**
 * Canonical message string the wallet MUST sign.
 * Exact bytes matter. Keep this format stable.
 */
export function canonicalMessageForJwt(jwtToken: string): string {
  return `Parchi Check-in\n${jwtToken}`;
}

/**
 * Verify an ed25519 signature (base58 encoded) over the given message.
 * - message: string or Uint8Array (we will encode strings as UTF-8)
 * - signatureBase58: base58-encoded signature
 * - pubkeyBase58: base58-encoded ed25519 public key
 *
 * Returns boolean.
 */
export function verifyEd25519Signature(
  message: string | Uint8Array,
  signatureBase58: string,
  pubkeyBase58: string
): boolean {
  const msgBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  let sig: Uint8Array;
  let pubkey: Uint8Array;
  try {
    sig = bs58.decode(signatureBase58);
    pubkey = bs58.decode(pubkeyBase58);
  } catch (e) {
    // decoding failed
    return false;
  }
  if (!sig || !pubkey) return false;
  try {
    return nacl.sign.detached.verify(msgBytes, sig, pubkey);
  } catch {
    return false;
  }
}

/**
 * Check on-chain that `ownerPubkeyBase58` has at least one token of `mintPubkeyBase58`.
 * Uses Solana RPC connection passed in.
 *
 * Returns true if amount > 0.
 */
export async function walletOwnsMint(
  connection: Connection,
  ownerPubkeyBase58: string,
  mintPubkeyBase58: string
): Promise<boolean> {
  try {
    const owner = new PublicKey(ownerPubkeyBase58);
    const mint = new PublicKey(mintPubkeyBase58);

    // This returns all token accounts for owner filtered by mint
    const resp = await connection.getParsedTokenAccountsByOwner(owner, { mint });

    // Iterate results and check tokenAmount.uiAmount (or amount) > 0
    for (const { account } of resp.value) {
      const parsed = (account?.data as any)?.parsed;
      const tokenAmount = parsed?.info?.tokenAmount;
      // tokenAmount.uiAmount can be null; fallback to amount string
      const uiAmount = tokenAmount?.uiAmount;
      const amountRaw = tokenAmount?.amount;
      if ((typeof uiAmount === 'number' && uiAmount > 0) || (typeof amountRaw === 'string' && BigInt(amountRaw) > BigInt(0))) {
        return true;
      }
    }
    return false;
  } catch (err) {
    // Bubble up or return false depending on caller preference.
    // We return false here to indicate ownership not found on RPC errors,
    // but you may want to throw and handle RPC/network errors specially.
    console.error('walletOwnsMint error:', err);
    return false;
  }
}

/**
 * Generate a cryptographically-random base58 string.
 * Works in Node and in environments with crypto.getRandomValues.
 */
export function cryptoRandomBase58(length = 8): string {
  // generate 'length' bytes and base58-encode them, then trim/pad to requested length
  let bytes: Uint8Array;
  if (typeof (globalThis as any).crypto?.getRandomValues === 'function') {
    bytes = new Uint8Array(length);
    (globalThis as any).crypto.getRandomValues(bytes);
  } else {
    // Node fallback
    const b = nodeRandomBytes(length);
    bytes = new Uint8Array(b);
  }
  // bs58-encode; result length may be longer than 'length', trim to requested length
  return bs58.encode(bytes).slice(0, Math.max(4, length));
}
