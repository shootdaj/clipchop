import { useState, useCallback } from 'react'
import { MP4Clip, Combinator, OffscreenSprite } from '@webav/av-cliper'
import { toMicroseconds, calculateSegmentBoundaries } from '@/lib/video-utils'

export interface VideoMetadata {
  duration: number // seconds
  width: number
  height: number
  filename: string
  size: number // bytes
}

export interface SplitSegment {
  index: number
  startTime: number // seconds
  endTime: number // seconds
  duration: number // seconds
  filename: string
  blob?: Blob
  status: 'pending' | 'processing' | 'complete' | 'error'
  error?: string
}

export interface SplitProgress {
  currentSegment: number
  totalSegments: number
  percent: number
  status: 'idle' | 'loading' | 'splitting' | 'complete' | 'error'
  error?: string
}

interface UseVideoSplitterReturn {
  metadata: VideoMetadata | null
  segments: SplitSegment[]
  progress: SplitProgress
  inputSource: File | null
  loadVideo: (file: File) => Promise<void>
  calculateSegments: (segmentDuration: number, namingPattern: 'sequential' | 'timestamp') => SplitSegment[]
  splitVideo: (segmentDuration: number, namingPattern: 'sequential' | 'timestamp', maxResolution?: number | null) => Promise<Blob[]>
  reset: () => void
}

export function useVideoSplitter(): UseVideoSplitterReturn {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [segments, setSegments] = useState<SplitSegment[]>([])
  const [clip, setClip] = useState<MP4Clip | null>(null)
  const [inputFile, setInputFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<SplitProgress>({
    currentSegment: 0,
    totalSegments: 0,
    percent: 0,
    status: 'idle',
  })

  const reset = useCallback(() => {
    if (clip) {
      clip.destroy()
    }
    setClip(null)
    setInputFile(null)
    setMetadata(null)
    setSegments([])
    setProgress({
      currentSegment: 0,
      totalSegments: 0,
      percent: 0,
      status: 'idle',
    })
  }, [clip])

  const loadVideo = useCallback(async (file: File) => {
    try {
      setProgress(p => ({ ...p, status: 'loading' }))
      setInputFile(file)

      // Create MP4Clip from file stream
      const newClip = new MP4Clip(file.stream())
      await newClip.ready

      const meta = newClip.meta
      setMetadata({
        duration: meta.duration / 1_000_000, // Convert μs to seconds
        width: meta.width,
        height: meta.height,
        filename: file.name,
        size: file.size,
      })

      setClip(newClip)
      setProgress(p => ({ ...p, status: 'idle' }))
    } catch (error) {
      setProgress({
        currentSegment: 0,
        totalSegments: 0,
        percent: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to load video',
      })
      throw error
    }
  }, [])

  const calculateSegments = useCallback((
    segmentDuration: number,
    namingPattern: 'sequential' | 'timestamp'
  ): SplitSegment[] => {
    if (!metadata) return []

    const boundaries = calculateSegmentBoundaries(
      metadata.duration,
      segmentDuration,
      metadata.filename,
      namingPattern
    )

    const newSegments: SplitSegment[] = boundaries.map(b => ({
      ...b,
      status: 'pending' as const,
    }))

    setSegments(newSegments)
    return newSegments
  }, [metadata])

  const splitVideo = useCallback(async (
    segmentDuration: number,
    namingPattern: 'sequential' | 'timestamp',
    maxResolution: number | null = null
  ): Promise<Blob[]> => {
    if (!clip || !metadata) {
      throw new Error('No video loaded')
    }

    const calculatedSegments = calculateSegments(segmentDuration, namingPattern)
    const blobs: Blob[] = []

    setProgress({
      currentSegment: 0,
      totalSegments: calculatedSegments.length,
      percent: 0,
      status: 'splitting',
    })

    try {
      // We need to work with a fresh clip for splitting
      // Clone the original for each split operation
      let remainingClip = clip

      for (let i = 0; i < calculatedSegments.length; i++) {
        const segment = calculatedSegments[i]

        // Update segment status
        setSegments(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'processing' } : s
        ))

        setProgress(p => ({
          ...p,
          currentSegment: i + 1,
          percent: (i / calculatedSegments.length) * 100,
        }))

        let segmentClip: MP4Clip

        if (i === calculatedSegments.length - 1) {
          // Last segment - use remaining clip
          segmentClip = remainingClip
        } else {
          // Split at the segment duration
          const [before, after] = await remainingClip.split(toMicroseconds(segment.duration))
          segmentClip = before
          remainingClip = after
        }

        // Export segment to blob
        let outputWidth = metadata.width
        let outputHeight = metadata.height

        if (maxResolution !== null) {
          const maxDimension = Math.max(metadata.width, metadata.height)
          if (maxDimension > maxResolution) {
            const scale = maxResolution / maxDimension
            outputWidth = Math.round(metadata.width * scale / 2) * 2
            outputHeight = Math.round(metadata.height * scale / 2) * 2
            console.log(`Downscaling from ${metadata.width}x${metadata.height} to ${outputWidth}x${outputHeight}`)
          }
        }
        
        const totalPixels = outputWidth * outputHeight
        // Use Baseline profile (42) for maximum mobile compatibility
        // High profile (64) causes choppy playback on many phones
        let levelCode = '1f' // Level 3.1 default

        if (totalPixels > 8912896) {
          levelCode = '34' // Level 5.2 for 4K+
        } else if (totalPixels > 5652480) {
          levelCode = '33' // Level 5.1
        } else if (totalPixels > 3686400) {
          levelCode = '32' // Level 5.0
        } else if (totalPixels > 2073600) {
          levelCode = '28' // Level 4.0
        } else if (totalPixels > 921600) {
          levelCode = '1f' // Level 3.1
        } else {
          levelCode = '1e' // Level 3.0 for smaller videos
        }

        let bitrate = 5000000

        if (maxResolution !== null) {
          if (maxResolution === 1280) {
            bitrate = 2000000 // 2 Mbps for SD
          } else if (maxResolution === 1920) {
            bitrate = 4000000 // 4 Mbps for HD
          }
        }

        // Use Baseline profile on mobile for compatibility, High on desktop for compression
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        const codecProfile = isMobile ? '4200' : '6400'

        console.log(`Device: ${isMobile ? 'mobile' : 'desktop'}, bitrate: ${bitrate}, codec: avc1.${codecProfile}${levelCode}`)

        const combinator = new Combinator({
          width: outputWidth,
          height: outputHeight,
          videoCodec: `avc1.${codecProfile}${levelCode}`,
          bitrate,
          // On mobile, prefer software encoding - slower but more consistent, no dropped frames
          __unsafe_hardwareAcceleration__: isMobile ? 'prefer-software' : 'prefer-hardware',
        } as Parameters<typeof Combinator>[0])

        const sprite = new OffscreenSprite(segmentClip)
        await sprite.ready
        // Use the clip's actual duration after split (may differ from segment.duration due to keyframe alignment)
        // This ensures audio and video stay in sync
        const actualClipDuration = segmentClip.meta.duration
        console.log(`Segment ${i + 1}: expected duration ${segment.duration}s, actual clip duration ${actualClipDuration / 1_000_000}s`)
        sprite.time = { offset: 0, duration: actualClipDuration }
        // Set rect to scale video to fill the output canvas
        sprite.rect.x = 0
        sprite.rect.y = 0
        sprite.rect.w = outputWidth
        sprite.rect.h = outputHeight
        await combinator.addSprite(sprite, { main: true })
        
        console.log(`Starting to encode segment ${i + 1}/${calculatedSegments.length}`)

        const outputStream = combinator.output()
        const reader = outputStream.getReader()
        const chunks: Uint8Array[] = []
        let chunkCount = 0
        let totalBytes = 0

        console.log('Starting to read output stream...')
        
        // Adaptive throttling - only slow down if device is struggling
        let lastChunkTime = performance.now()
        let slowChunkCount = 0
        const SLOW_THRESHOLD = 100 // If chunk takes >100ms, device is struggling

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log(`Segment ${i + 1} complete: ${chunkCount} chunks, ${totalBytes} bytes, slow chunks: ${slowChunkCount}`)
            break
          }
          if (value) {
            const now = performance.now()
            const chunkTime = now - lastChunkTime
            lastChunkTime = now

            chunks.push(value)
            chunkCount++
            totalBytes += value.length

            // Adaptive throttling: if chunks are taking too long, the encoder is struggling
            // Give it a breather to catch up
            if (chunkTime > SLOW_THRESHOLD) {
              slowChunkCount++
              // Proportional delay based on how slow we are
              const delay = Math.min(chunkTime * 0.5, 50) // Max 50ms delay
              await new Promise(resolve => setTimeout(resolve, delay))
            }

            if (chunkCount === 1 || chunkCount % 50 === 0) {
              console.log(`Segment ${i + 1}: ${chunkCount} chunks, ${totalBytes} bytes, avg chunk time: ${chunkTime.toFixed(1)}ms`)
              const segmentProgress = (i / calculatedSegments.length) * 100
              const estimatedChunkProgress = Math.min(segmentProgress + 5, ((i + 1) / calculatedSegments.length) * 100)
              setProgress(p => ({
                ...p,
                percent: estimatedChunkProgress,
              }))
            }
          }
        }

        const blob = new Blob(chunks, { type: 'video/mp4' })
        blobs.push(blob)

        // Update segment with blob
        setSegments(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'complete', blob } : s
        ))

        // Cleanup
        if (i !== calculatedSegments.length - 1) {
          segmentClip.destroy()
        }
      }

      setProgress(p => ({
        ...p,
        percent: 100,
        status: 'complete',
      }))

      return blobs
    } catch (error) {
      setProgress(p => ({
        ...p,
        status: 'error',
        error: error instanceof Error ? error.message : 'Split failed',
      }))
      throw error
    }
  }, [clip, metadata, calculateSegments])

  return {
    metadata,
    segments,
    progress,
    inputSource: inputFile,
    loadVideo,
    calculateSegments,
    splitVideo,
    reset,
  }
}
