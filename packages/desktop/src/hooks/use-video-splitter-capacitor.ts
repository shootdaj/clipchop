import { useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { VideoSplitter, VideoMetadata as NativeMetadata, SegmentInfo } from '@/plugins/video-splitter'

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
  path?: string
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

interface UseVideoSplitterCapacitorReturn {
  metadata: VideoMetadata | null
  segments: SplitSegment[]
  progress: SplitProgress
  inputSource: string | null
  isNative: boolean
  loadVideo: () => Promise<void>
  calculateSegments: (segmentDuration: number) => SplitSegment[]
  splitVideo: (segmentDuration: number) => Promise<string[]>
  reset: () => void
}

export function useVideoSplitterCapacitor(): UseVideoSplitterCapacitorReturn {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [segments, setSegments] = useState<SplitSegment[]>([])
  const [filePath, setFilePath] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [progress, setProgress] = useState<SplitProgress>({
    currentSegment: 0,
    totalSegments: 0,
    percent: 0,
    status: 'idle',
  })

  const isNative = Capacitor.isNativePlatform()

  const reset = useCallback(() => {
    setFilePath(null)
    setFileName(null)
    setMetadata(null)
    setSegments([])
    setProgress({
      currentSegment: 0,
      totalSegments: 0,
      percent: 0,
      status: 'idle',
    })
  }, [])

  const loadVideo = useCallback(async () => {
    try {
      setProgress(p => ({ ...p, status: 'loading' }))

      // Use native file picker
      const result = await VideoSplitter.pickVideo()
      setFilePath(result.filePath)
      setFileName(result.fileName)

      // Get metadata using native API
      const meta = await VideoSplitter.getMetadata({ filePath: result.filePath })

      setMetadata({
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        filename: result.fileName,
        size: 0, // Not available from native API
      })

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

  const calculateSegments = useCallback((segmentDuration: number): SplitSegment[] => {
    if (!metadata || !fileName) return []

    const newSegments: SplitSegment[] = []
    let currentTime = 0
    let index = 0
    const baseName = fileName.replace(/\.[^/.]+$/, '')

    while (currentTime < metadata.duration) {
      const endTime = Math.min(currentTime + segmentDuration, metadata.duration)
      const duration = endTime - currentTime

      newSegments.push({
        index,
        startTime: currentTime,
        endTime,
        duration,
        filename: `${baseName}_${String(index + 1).padStart(3, '0')}.mp4`,
        status: 'pending',
      })

      currentTime = endTime
      index++
    }

    setSegments(newSegments)
    return newSegments
  }, [metadata, fileName])

  const splitVideo = useCallback(async (segmentDuration: number): Promise<string[]> => {
    if (!filePath || !metadata) {
      throw new Error('No video loaded')
    }

    const calculatedSegments = calculateSegments(segmentDuration)

    setProgress({
      currentSegment: 0,
      totalSegments: calculatedSegments.length,
      percent: 0,
      status: 'splitting',
    })

    try {
      // Update all segments to processing
      setSegments(prev => prev.map(s => ({ ...s, status: 'processing' as const })))

      // Call native split
      const result = await VideoSplitter.splitVideo({
        filePath,
        segmentDuration,
      })

      // Update segments with paths
      const paths = result.segments.map((seg: SegmentInfo) => seg.path)

      setSegments(prev => prev.map((s, i) => ({
        ...s,
        path: result.segments[i]?.path,
        status: 'complete' as const,
      })))

      setProgress({
        currentSegment: calculatedSegments.length,
        totalSegments: calculatedSegments.length,
        percent: 100,
        status: 'complete',
      })

      return paths
    } catch (error) {
      setProgress(p => ({
        ...p,
        status: 'error',
        error: error instanceof Error ? error.message : 'Split failed',
      }))
      throw error
    }
  }, [filePath, metadata, calculateSegments])

  return {
    metadata,
    segments,
    progress,
    inputSource: filePath,
    isNative,
    loadVideo,
    calculateSegments,
    splitVideo,
    reset,
  }
}
