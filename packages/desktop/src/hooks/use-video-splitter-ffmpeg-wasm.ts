import { useState, useCallback, useRef } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
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
  loadVideo: (file: File) => Promise<void>
  calculateSegments: (segmentDuration: number, namingPattern: 'sequential' | 'timestamp') => SplitSegment[]
  splitVideo: (segmentDuration: number, namingPattern: 'sequential' | 'timestamp', maxResolution?: number | null) => Promise<Blob[]>
  reset: () => void
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
  
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const loadedRef = useRef(false)

  const loadFFmpeg = useCallback(async () => {
    if (loadedRef.current) return
    
    const ffmpeg = new FFmpeg()
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
    
    ffmpeg.on('log', ({ message }) => {
      console.log(message)
    })
    
    ffmpeg.on('progress', ({ progress: prog }) => {
      setProgress(p => ({ ...p, percent: prog * 100 }))
    })
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    
    ffmpegRef.current = ffmpeg
    loadedRef.current = true
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
      setProgress(p => ({ ...p, status: 'loading' }))
      
      await loadFFmpeg()
      
      const video = document.createElement('video')
      video.preload = 'metadata'
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve
        video.onerror = reject
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
    if (!ffmpegRef.current || !videoFile || !metadata) {
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
      const ffmpeg = ffmpegRef.current
      
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
        const args = [
          '-ss', segment.startTime.toString(),
          '-i', 'input.mp4',
          '-t', segment.duration.toString(),
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-c:a', 'aac',
          '-metadata:s:v', 'rotate=0',
          outputName
        ]
        
        if (maxResolution) {
          const scale = maxResolution === 1280 ? '720:1280' : maxResolution === 1920 ? '1080:1920' : null
          if (scale) {
            args.splice(6, 0, '-vf', `scale=${scale}`)
          }
        }

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
    loadVideo,
    calculateSegments,
    splitVideo,
    reset,
  }
}

