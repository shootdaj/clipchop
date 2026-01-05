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
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

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
        // Create canvas for drawing video frames
        const canvas = document.createElement('canvas')
        canvas.width = outputWidth
        canvas.height = outputHeight
        const ctx = canvas.getContext('2d')!

        canvasRef.current = canvas
        ctxRef.current = ctx

        // Seek to start time
        video.currentTime = startTime
        await new Promise<void>((res) => {
          video.onseeked = () => res()
        })

        // Create stream from canvas
        const canvasStream = canvas.captureStream(30) // 30fps output

        // Try to get audio track from video
        let combinedStream: MediaStream
        try {
          // Create audio context to capture audio
          const audioCtx = new AudioContext()
          const source = audioCtx.createMediaElementSource(video)
          const destination = audioCtx.createMediaStreamDestination()
          source.connect(destination)
          source.connect(audioCtx.destination) // Also output to speakers (muted anyway)

          // Combine video and audio tracks
          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destination.stream.getAudioTracks()
          ])
        } catch {
          // If audio capture fails, just use canvas stream
          console.log('Audio capture not supported, recording video only')
          combinedStream = canvasStream
        }

        // Determine best codec
        const mimeTypes = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4',
        ]

        let selectedMimeType = ''
        for (const mime of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mime)) {
            selectedMimeType = mime
            break
          }
        }

        if (!selectedMimeType) {
          throw new Error('No supported video format for MediaRecorder')
        }

        console.log(`MediaRecorder using: ${selectedMimeType}`)

        const chunks: Blob[] = []
        const recorder = new MediaRecorder(combinedStream, {
          mimeType: selectedMimeType,
          videoBitsPerSecond: 2000000, // 2 Mbps
        })

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data)
          }
        }

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: selectedMimeType })
          resolve(blob)
        }

        recorder.onerror = (e) => {
          reject(new Error('MediaRecorder error: ' + e))
        }

        // Start recording
        recorder.start(100) // Collect data every 100ms

        // Animation loop to draw video to canvas
        let animationId: number
        const drawFrame = () => {
          if (video.paused || video.ended || video.currentTime >= startTime + duration) {
            cancelAnimationFrame(animationId)
            video.pause()
            recorder.stop()
            return
          }

          // Scale video to fit canvas while maintaining aspect ratio
          const scale = Math.min(
            outputWidth / video.videoWidth,
            outputHeight / video.videoHeight
          )
          const drawWidth = video.videoWidth * scale
          const drawHeight = video.videoHeight * scale
          const offsetX = (outputWidth - drawWidth) / 2
          const offsetY = (outputHeight - drawHeight) / 2

          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, outputWidth, outputHeight)
          ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight)

          animationId = requestAnimationFrame(drawFrame)
        }

        // Start playback and drawing
        video.play()
        drawFrame()

        // Stop after duration
        setTimeout(() => {
          if (!video.paused) {
            video.pause()
            recorder.stop()
            cancelAnimationFrame(animationId)
          }
        }, duration * 1000 + 500) // Add 500ms buffer

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
