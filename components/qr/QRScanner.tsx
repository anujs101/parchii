"use client"

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'

interface QRScannerProps {
  onResult: (text: string) => void
  onError?: (error: string) => void
  facingMode?: 'environment' | 'user'
  className?: string
}

export default function QRScanner({ onResult, onError, facingMode = 'environment', className }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [controls, setControls] = useState<IScannerControls | null>(null)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const onResultRef = useRef<typeof onResult | null>(null)
  const onErrorRef = useRef<typeof onError | null>(null)

  // Keep latest callbacks without restarting the scanner
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])
  useEffect(() => {
    onErrorRef.current = onError ?? null
  }, [onError])

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    // Improve detection on low-contrast/blurred frames
    try {
      const hints = new Map()
      hints.set(DecodeHintType.TRY_HARDER, true)
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE])
      reader.setHints(hints)
      ;(reader as any).timeBetweenDecodingAttempts = 150
    } catch {}

    async function start() {
      try {
        const previewVideo = videoRef.current
        if (!previewVideo) return

        // Attempt device-based decoding first for broader compatibility
        let deviceId: string | undefined
        try {
          const inputs = await BrowserMultiFormatReader.listVideoInputDevices()
          // Prefer a back/rear/environment camera if available
          const preferred = inputs.find(
            (d) => /back|rear|environment/i.test(d.label)
          ) || inputs[0]
          deviceId = preferred?.deviceId
        } catch {}

        let resultControls: IScannerControls
        try {
          resultControls = await reader.decodeFromVideoDevice(
            deviceId,
            previewVideo,
            (result, err) => {
              if (result) {
                onResultRef.current?.(result.getText())
              } else if (err && onError) {
                const name = (err as any)?.name || ''
                if (name && name !== 'NotFoundException') {
                  onErrorRef.current?.(name)
                }
              }
            }
          )
        } catch (e) {
          // Fallback: constraint-based decoding
          resultControls = await reader.decodeFromConstraints(
            {
              video: {
                facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            },
            previewVideo,
            (result, err) => {
              if (result) {
                onResultRef.current?.(result.getText())
              } else if (err && onError) {
                const name = (err as any)?.name || ''
                if (name && name !== 'NotFoundException') {
                  onErrorRef.current?.(name)
                }
              }
            }
          )
        }

        // Ensure playback starts (some browsers require explicit play)
        try { await previewVideo.play() } catch {}

        setControls(resultControls)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Camera access error'
        setPermissionError(message)
        onError?.(message)
      }
    }

    start()

    return () => {
      controls?.stop()
      setControls(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode])

  return (
    <div className={className}>
      {permissionError ? (
        <div className="text-sm text-red-500">{permissionError}</div>
      ) : (
        <video ref={videoRef} className="w-full h-full object-cover rounded-md" muted playsInline />
      )}
    </div>
  )
}