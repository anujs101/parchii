import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import { generateQRBuffer } from '../qr/qrGenerator';

export interface EventInfo {
  name: string;
  description: string;
  startTime: Date;
  venue?: string;
  posterUrl?: string;
}

export interface TicketDesignOptions {
  width: number;
  height: number;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  qrSize: number;
  qrPosition: 'right' | 'bottom';
}

const DEFAULT_DESIGN: TicketDesignOptions = {
  width: 600,  // Square format for better wallet display
  height: 600, // 1:1 aspect ratio prevents cropping
  backgroundColor: '#1e293b', // slate-800
  textColor: '#ffffff',
  accentColor: '#06b6d4', // cyan-500
  qrSize: 140, // Larger QR code for better scanning
  qrPosition: 'bottom' // Bottom position works better in square format
};

/**
 * Generate ticket image with embedded QR code
 * This is called AFTER asset creation when we have the QR data
 */
export async function generateTicketImage(
  eventInfo: EventInfo,
  ticketNumber: number,
  qrData: string,
  design: Partial<TicketDesignOptions> = {}
): Promise<Buffer> {
  const options = { ...DEFAULT_DESIGN, ...design };
  const canvas = createCanvas(options.width, options.height);
  const ctx = canvas.getContext('2d');

  // Set up canvas
  ctx.fillStyle = options.backgroundColor;
  ctx.fillRect(0, 0, options.width, options.height);

  // Add gradient background
  await addGradientBackground(ctx, options);

  // Add event poster if available
  if (eventInfo.posterUrl) {
    await addEventPoster(ctx, eventInfo.posterUrl, options);
  }

  // Add ticket content
  await addTicketContent(ctx, eventInfo, ticketNumber, options);

  // Generate and embed QR code
  await addQRCode(ctx, qrData, options);

  // Add decorative elements
  addDecorations(ctx, options);

  return canvas.toBuffer('image/png');
}

/**
 * Add gradient background
 */
async function addGradientBackground(
  ctx: CanvasRenderingContext2D,
  options: TicketDesignOptions
): Promise<void> {
  const gradient = ctx.createLinearGradient(0, 0, options.width, options.height);
  gradient.addColorStop(0, options.backgroundColor);
  gradient.addColorStop(0.5, adjustBrightness(options.backgroundColor, 0.1));
  gradient.addColorStop(1, adjustBrightness(options.backgroundColor, -0.1));
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, options.width, options.height);
}

/**
 * Add event poster as background element
 */
async function addEventPoster(
  ctx: CanvasRenderingContext2D,
  posterUrl: string,
  options: TicketDesignOptions
): Promise<void> {
  try {
    const poster = await loadImage(posterUrl);
    
    // Add poster with overlay
    ctx.globalAlpha = 0.3;
    ctx.drawImage(poster, 0, 0, options.width, options.height);
    ctx.globalAlpha = 1.0;
    
    // Add overlay gradient
    const overlay = ctx.createLinearGradient(0, 0, options.width, 0);
    overlay.addColorStop(0, `${options.backgroundColor}CC`);
    overlay.addColorStop(1, `${options.backgroundColor}99`);
    
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, options.width, options.height);
  } catch (error) {
    console.warn('Failed to load event poster:', error);
  }
}

/**
 * Add ticket text content optimized for square format
 */
async function addTicketContent(
  ctx: CanvasRenderingContext2D,
  eventInfo: EventInfo,
  ticketNumber: number,
  options: TicketDesignOptions
): Promise<void> {
  const padding = 30;
  const centerX = options.width / 2;
  
  // For square format, we'll use a centered vertical layout
  let yPosition = padding + 40;

  // Event title (centered, larger)
  ctx.fillStyle = options.textColor;
  ctx.font = 'bold 32px Arial, sans-serif';
  ctx.textAlign = 'center';
  
  const titleLines = wrapText(ctx, eventInfo.name, options.width - padding * 2);
  titleLines.forEach(line => {
    ctx.fillText(line, centerX, yPosition);
    yPosition += 40;
  });

  // Ticket number (prominent, centered)
  ctx.fillStyle = options.accentColor;
  ctx.font = 'bold 28px Arial, sans-serif';
  yPosition += 15;
  ctx.fillText(`Ticket #${ticketNumber}`, centerX, yPosition);

  // Event date (centered)
  ctx.fillStyle = options.textColor;
  ctx.font = '18px Arial, sans-serif';
  yPosition += 35;
  const dateStr = eventInfo.startTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeStr = eventInfo.startTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  ctx.fillText(`${dateStr} at ${timeStr}`, centerX, yPosition);

  // Venue (centered)
  if (eventInfo.venue) {
    yPosition += 25;
    ctx.fillStyle = adjustBrightness(options.textColor, -0.2);
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText(`📍 ${eventInfo.venue}`, centerX, yPosition);
  }

  // Leave space for QR code at bottom
  // Blockchain badge (centered, above QR)
  const qrAreaTop = options.height - options.qrSize - padding - 40;
  ctx.fillStyle = options.accentColor;
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText('🔗 Verified on Solana Blockchain', centerX, qrAreaTop - 15);

  // Parchi branding (bottom right)
  ctx.fillStyle = adjustBrightness(options.textColor, -0.3);
  ctx.font = '10px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Powered by Parchi', options.width - padding, options.height - padding);
}

/**
 * Add QR code to ticket
 */
async function addQRCode(
  ctx: CanvasRenderingContext2D,
  qrData: string,
  options: TicketDesignOptions
): Promise<void> {
  try {
    const qrBuffer = await generateQRBuffer(qrData, options.qrSize);
    const qrImage = await loadImage(qrBuffer);

    // Center QR code at bottom for square format
    const qrX = (options.width - options.qrSize) / 2;
    const qrY = options.height - options.qrSize - 30;

    // Add QR background with rounded corners effect
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX - 10, qrY - 10, options.qrSize + 20, options.qrSize + 20);
    
    // Add QR code
    ctx.drawImage(qrImage, qrX, qrY, options.qrSize, options.qrSize);

    // Add QR label (centered above QR)
    ctx.fillStyle = options.textColor;
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Scan to Verify', qrX + options.qrSize / 2, qrY + options.qrSize + 25);
  } catch (error) {
    console.error('Failed to add QR code to ticket:', error);
    throw new Error('QR code generation failed');
  }
}

/**
 * Add decorative elements optimized for square format
 */
function addDecorations(
  ctx: CanvasRenderingContext2D,
  options: TicketDesignOptions
): void {
  // Add modern border with gradient
  const borderGradient = ctx.createLinearGradient(0, 0, options.width, options.height);
  borderGradient.addColorStop(0, options.accentColor);
  borderGradient.addColorStop(0.5, adjustBrightness(options.accentColor, 0.2));
  borderGradient.addColorStop(1, options.accentColor);
  
  ctx.strokeStyle = borderGradient;
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, options.width - 16, options.height - 16);

  // Add subtle inner border
  ctx.strokeStyle = adjustBrightness(options.accentColor, -0.3);
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, options.width - 24, options.height - 24);

  // Add corner accents (more prominent for wallet visibility)
  const cornerSize = 25;
  ctx.fillStyle = options.accentColor;
  
  // Top-left corner
  ctx.fillRect(8, 8, cornerSize, 4);
  ctx.fillRect(8, 8, 4, cornerSize);
  
  // Top-right corner
  ctx.fillRect(options.width - 32, 8, cornerSize, 4);
  ctx.fillRect(options.width - 12, 8, 4, cornerSize);
  
  // Bottom-left corner
  ctx.fillRect(8, options.height - 12, cornerSize, 4);
  ctx.fillRect(8, options.height - 32, 4, cornerSize);
  
  // Bottom-right corner
  ctx.fillRect(options.width - 32, options.height - 12, cornerSize, 4);
  ctx.fillRect(options.width - 12, options.height - 32, 4, cornerSize);
}

/**
 * Wrap text to fit within specified width
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text || typeof text !== 'string') {
    return [''];
  }
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

/**
 * Adjust color brightness
 */
function adjustBrightness(color: string, amount: number): string {
  // Simple brightness adjustment for hex colors
  if (color.startsWith('#')) {
    const num = parseInt(color.slice(1), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount * 255));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount * 255));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount * 255));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
  return color;
}
