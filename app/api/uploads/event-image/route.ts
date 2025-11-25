import { NextRequest, NextResponse } from 'next/server'
import { uploadImageToIPFS } from '@/lib/ipfs/ipfsService'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg']

export async function POST(request: NextRequest) {
  try {
    if (!process.env.PINATA_JWT && (!process.env.PINATA_API_KEY || !process.env.PINATA_SECRET_API_KEY)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pinata credentials are not configured',
        },
        { status: 500 },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Missing file upload' },
        { status: 400 },
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type. Only PNG and JPG are allowed.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await uploadImageToIPFS(buffer, file.name || 'event-image.png')

    return NextResponse.json({ success: true, url: uploadResult.url })
  } catch (error) {
    console.error('Event image upload failed:', error)

    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload image',
        details: message,
      },
      { status: 500 },
    )
  }
}
