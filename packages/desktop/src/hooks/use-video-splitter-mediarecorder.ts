import { useState, useCallback, useRef } from 'react'
import { calculateSegmentBoundaries } from '@/lib/video-utils'

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  filename: string
  size: number
}

export interface SplitSegment {
  index: number
  startTime: number
  endTime: number
  duration: number
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
  loadingMessage?: string
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

/**
 * MediaRecorder-based video splitter for mobile devices.
 * Uses the browser's built-in recording capabilities which handle
 * VFR (Variable Frame Rate) videos better than raw WebCodecs.
 *
 * Trade-off: Records in real-time (can't speed up), but produces
 * smooth output because the browser handles all timing internally.
 */
export function useVideoSplitter(): UseVideoSplitterReturn {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [segments, setSegments] = useState<SplitSegment[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<SplitProgress>({
    currentSegment: 0,
    totalSegments: 0,
    percent: 0,
    status: 'idle',
  })

  const videoRef = useRef<HTMLVideoElement | null>(null)

  const reset = useCallback(() => {
    setVideoFile(null)
    setMetadata(null)
    setSegments([])
    setProgress({
      currentSegment: 0,
      totalSegments: 0,
      percent: 0,
      status: 'idle',
    })
  }, [])

  const loadVideo = useCallback(async (file: File) => {
    try {
      setProgress(p => ({ ...p, status: 'loading' }))

      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true // Required for autoplay
      video.playsInline = true

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('Failed to load video metadata'))
        video.src = URL.createObjectURL(file)
      })

      // Wait for video to be fully seekable
      await new Promise<void>((resolve) => {
        if (video.readyState >= 2) {
          resolve()
        } else {
          video.oncanplay = () => resolve()
        }
      })

      setMetadata({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        filename: file.name,
        size: file.size,
      })

      videoRef.current = video
      setVideoFile(file)
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

  const recordSegment = useCallback(async (
    video: HTMLVideoElement,
    startTime: number,
    duration: number,
    outputWidth: number,
    outputHeight: number
  ): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Create a fresh video element for each segment to avoid state issues
        const segmentVideo = document.createElement('video')
        segmentVideo.src = video.src
        segmentVideo.muted = true
        segmentVideo.playsInline = true
        segmentVideo.preload = 'auto'

        // Wait for video to be ready
        await new Promise<void>((res, rej) => {
          segmentVideo.onloadeddata = () => res()
          segmentVideo.onerror = () => rej(new Error('Failed to load video'))
        })

        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = outputWidth
        canvas.height = outputHeight
        const ctx = canvas.getContext('2d')!

        // Seek to start
        segmentVideo.currentTime = startTime
        await new Promise<void>((res) => {
          segmentVideo.onseeked = () => res()
        })

        // Pre-draw first frame
        ctx.drawImage(segmentVideo, 0, 0, outputWidth, outputHeight)

        // Create stream from canvas (video only - audio is too problematic on mobile)
        const stream = canvas.captureStream(30)

        // Find supported codec
        const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
          .find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm'

        console.log(`Recording segment: ${startTime}s - ${startTime + duration}s, codec: ${mimeType}`)

        const chunks: Blob[] = []
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 2500000,
        })

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data)
        }

        recorder.onstop = () => {
          segmentVideo.pause()
          segmentVideo.src = ''
          resolve(new Blob(chunks, { type: mimeType }))
        }

        recorder.onerror = () => {
          segmentVideo.pause()
          segmentVideo.src = ''
          reject(new Error('Recording failed'))
        }

        // Start recording first
        recorder.start(100)

        // Then start playback
        segmentVideo.play()

        // Draw frames continuously
        const endTime = startTime + duration
        const drawLoop = () => {
          if (segmentVideo.currentTime >= endTime || segmentVideo.paused || segmentVideo.ended) {
            segmentVideo.pause()
            recorder.stop()
            return
          }
          ctx.drawImage(segmentVideo, 0, 0, outputWidth, outputHeight)
          requestAnimationFrame(drawLoop)
        }
        requestAnimationFrame(drawLoop)

        // Safety timeout
        setTimeout(() => {
          if (recorder.state === 'recording') {
            segmentVideo.pause()
            recorder.stop()
          }
        }, (duration + 2) * 1000)

      } catch (error) {
        reject(error)
      }
    })
  }, [])

  const splitVideo = useCallback(async (
    segmentDuration: number,
    namingPattern: 'sequential' | 'timestamp',
    maxResolution: number | null = null
  ): Promise<Blob[]> => {
    if (!videoRef.current || !metadata) {
      throw new Error('No video loaded')
    }

    const video = videoRef.current
    const calculatedSegments = calculateSegments(segmentDuration, namingPattern)
    const blobs: Blob[] = []

    // Calculate output dimensions
    let outputWidth = metadata.width
    let outputHeight = metadata.height

    // Mobile: force max 720p
    const effectiveMaxRes = maxResolution || 1280
    const maxDim = Math.max(metadata.width, metadata.height)
    if (maxDim > effectiveMaxRes) {
      const scale = effectiveMaxRes / maxDim
      outputWidth = Math.round(metadata.width * scale / 2) * 2
      outputHeight = Math.round(metadata.height * scale / 2) * 2
    }

    console.log(`MediaRecorder: ${metadata.width}x${metadata.height} → ${outputWidth}x${outputHeight}`)

    setProgress({
      currentSegment: 0,
      totalSegments: calculatedSegments.length,
      percent: 0,
      status: 'splitting',
    })

    try {
      for (let i = 0; i < calculatedSegments.length; i++) {
        const segment = calculatedSegments[i]

        setSegments(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'processing' } : s
        ))

        setProgress(p => ({
          ...p,
          currentSegment: i + 1,
          percent: (i / calculatedSegments.length) * 100,
        }))

        console.log(`Recording segment ${i + 1}/${calculatedSegments.length}: ${segment.startTime}s - ${segment.endTime}s`)

        const blob = await recordSegment(
          video,
          segment.startTime,
          segment.duration,
          outputWidth,
          outputHeight
        )

        blobs.push(blob)

        setSegments(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'complete', blob } : s
        ))
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
  }, [metadata, calculateSegments, recordSegment])

  return {
    metadata,
    segments,
    progress,
    inputSource: videoFile,
    loadVideo,
    calculateSegments,
    splitVideo,
    reset,
  }
}
