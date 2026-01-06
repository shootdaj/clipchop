import { useState, useCallback, useEffect } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
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
  ffmpegLoaded: boolean
  ffmpegLoadError: string | null
}

// Global state for ffmpeg loading (shared across instances)
let globalFFmpeg: FFmpeg | null = null
let globalLoadPromise: Promise<void> | null = null
let globalLoadError: string | null = null

// Detect mobile device
const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Pre-load ffmpeg.wasm in the background
export async function preloadFFmpeg(onProgress?: (percent: number, message: string) => void): Promise<void> {
  if (globalFFmpeg) {
    onProgress?.(100, 'FFmpeg ready')
    return
  }

  if (globalLoadPromise) {
    await globalLoadPromise
    return
  }

  if (globalLoadError) {
    throw new Error(globalLoadError)
  }

  globalLoadPromise = (async () => {
    const ffmpeg = new FFmpeg()

    ffmpeg.on('log', ({ message }) => {
      console.log('[ffmpeg]', message)
    })

    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm'
    const isMobile = isMobileDevice()

    try {
      onProgress?.(5, isMobile ? 'Loading video engine (30MB)...' : 'Loading FFmpeg...')
      console.log('Starting ffmpeg.wasm load...')

      // Download with progress tracking using fetch
      const downloadWithProgress = async (url: string, type: string): Promise<string> => {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)

        const contentLength = response.headers.get('content-length')
        const total = contentLength ? parseInt(contentLength, 10) : 0

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const chunks: Uint8Array[] = []
        let received = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
          received += value.length

          if (total > 0) {
            const percent = (received / total) * 100
            // Show progress for wasm download (the big one)
            if (url.includes('.wasm')) {
              const mb = (received / 1024 / 1024).toFixed(1)
              const totalMb = (total / 1024 / 1024).toFixed(1)
              onProgress?.(10 + (percent * 0.85), `Downloading: ${mb}/${totalMb} MB`)
            }
          }
        }

        const blob = new Blob(chunks, { type })
        return URL.createObjectURL(blob)
      }

      // Download files with progress
      onProgress?.(10, 'Downloading FFmpeg core...')
      const coreURL = await downloadWithProgress(`${baseURL}/ffmpeg-core.js`, 'text/javascript')

      onProgress?.(15, 'Downloading FFmpeg WASM (30MB)...')
      const wasmURL = await downloadWithProgress(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')

      onProgress?.(95, 'Initializing FFmpeg...')
      await ffmpeg.load({ coreURL, wasmURL })

      console.log('ffmpeg.wasm loaded successfully')
      globalFFmpeg = ffmpeg
      globalLoadError = null
      onProgress?.(100, 'FFmpeg ready')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('ffmpeg.wasm load error:', error)
      globalLoadError = `Failed to load video engine: ${errorMessage}`
      globalLoadPromise = null
      throw new Error(globalLoadError)
    }
  })()

  await globalLoadPromise
}

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
  const [ffmpegLoaded, setFfmpegLoaded] = useState(!!globalFFmpeg)
  const [ffmpegLoadError, setFfmpegLoadError] = useState<string | null>(globalLoadError)

  // Pre-load ffmpeg on mount for mobile devices
  useEffect(() => {
    const isMobile = isMobileDevice()
    if (isMobile && !globalFFmpeg && !globalLoadPromise) {
      console.log('Pre-loading ffmpeg.wasm for mobile...')
      preloadFFmpeg((percent, message) => {
        console.log(`FFmpeg load: ${percent.toFixed(0)}% - ${message}`)
      }).then(() => {
        setFfmpegLoaded(true)
        setFfmpegLoadError(null)
      }).catch((err) => {
        setFfmpegLoadError(err.message)
      })
    } else if (globalFFmpeg) {
      setFfmpegLoaded(true)
    }
  }, [])

  const loadFFmpeg = useCallback(async () => {
    if (globalFFmpeg) return

    await preloadFFmpeg((percent, message) => {
      setProgress(p => ({
        ...p,
        percent: percent * 0.5, // 0-50% for loading
        loadingMessage: message,
      }))
    })

    setFfmpegLoaded(true)
  }, [])

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
      setProgress(p => ({
        ...p,
        status: 'loading',
        loadingMessage: globalFFmpeg ? 'Analyzing video...' : 'Loading video engine...',
      }))

      // Load ffmpeg if not already loaded
      await loadFFmpeg()

      setProgress(p => ({ ...p, loadingMessage: 'Analyzing video...' }))

      const video = document.createElement('video')
      video.preload = 'metadata'

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve
        video.onerror = () => reject(new Error('Failed to load video metadata'))
        video.src = URL.createObjectURL(file)
      })

      setMetadata({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        filename: file.name,
        size: file.size,
      })

      setVideoFile(file)
      URL.revokeObjectURL(video.src)
      setProgress(p => ({ ...p, status: 'idle', loadingMessage: undefined }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load video'
      setProgress({
        currentSegment: 0,
        totalSegments: 0,
        percent: 0,
        status: 'error',
        error: errorMessage,
      })
      setFfmpegLoadError(errorMessage)
      throw error
    }
  }, [loadFFmpeg])

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
    if (!globalFFmpeg || !videoFile || !metadata) {
      throw new Error('FFmpeg not loaded or no video')
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
      const ffmpeg = globalFFmpeg

      // Set up progress tracking for encoding
      ffmpeg.on('progress', ({ progress: prog }) => {
        setProgress(p => ({
          ...p,
          percent: ((p.currentSegment - 1) / calculatedSegments.length + prog / calculatedSegments.length) * 100,
        }))
      })

      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))

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

        const outputName = segment.filename

        // Build ffmpeg args - mobile optimized
        const isMobile = isMobileDevice()
        const args: string[] = [
          '-ss', segment.startTime.toString(),
          '-i', 'input.mp4',
          '-t', segment.duration.toString(),
        ]

        // Video codec settings
        args.push('-c:v', 'libx264')
        args.push('-preset', isMobile ? 'ultrafast' : 'fast')

        // Mobile: force lower quality for speed
        if (isMobile) {
          args.push('-crf', '28') // Lower quality = faster encoding
          args.push('-tune', 'fastdecode')
        }

        // Handle resolution scaling
        if (maxResolution || (isMobile && Math.max(metadata.width, metadata.height) > 1280)) {
          const effectiveMax = maxResolution || 1280 // Force 720p max on mobile
          const maxDim = Math.max(metadata.width, metadata.height)
          if (maxDim > effectiveMax) {
            const scale = effectiveMax / maxDim
            const newWidth = Math.round(metadata.width * scale / 2) * 2
            const newHeight = Math.round(metadata.height * scale / 2) * 2
            args.push('-vf', `scale=${newWidth}:${newHeight}`)
          }
        }

        // Audio settings
        args.push('-c:a', 'aac')
        args.push('-b:a', isMobile ? '96k' : '128k')

        // Clear rotation metadata
        args.push('-metadata:s:v', 'rotate=0')

        // Output
        args.push(outputName)

        console.log(`FFmpeg args for segment ${i + 1}:`, args.join(' '))
        await ffmpeg.exec(args)

        const data = await ffmpeg.readFile(outputName)
        const blob = new Blob([data], { type: 'video/mp4' })
        blobs.push(blob)

        setSegments(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'complete', blob } : s
        ))

        await ffmpeg.deleteFile(outputName)
      }

      await ffmpeg.deleteFile('input.mp4')

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
  }, [videoFile, metadata, calculateSegments])

  return {
    metadata,
    segments,
    progress,
    inputSource: videoFile,
    loadVideo,
    calculateSegments,
    splitVideo,
    reset,
    ffmpegLoaded,
    ffmpegLoadError,
  }
}
