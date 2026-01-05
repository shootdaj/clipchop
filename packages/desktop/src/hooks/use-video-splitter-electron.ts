import { useState, useCallback, useEffect } from 'react'
import { calculateSegmentBoundaries } from '@/lib/video-utils'

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  filename: string
  size: number
  codec: string
  fps: number
}

export interface SplitSegment {
  index: number
  startTime: number
  endTime: number
  duration: number
  filename: string
  outputPath?: string
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
  inputSource: string | null
  loadVideo: (filePath?: string) => Promise<void>
  calculateSegments: (segmentDuration: number, namingPattern: 'sequential' | 'timestamp') => SplitSegment[]
  splitVideo: (segmentDuration: number, namingPattern: 'sequential' | 'timestamp', maxResolution?: number | null) => Promise<string[]>
  reset: () => void
}

export function useVideoSplitter(): UseVideoSplitterReturn {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [segments, setSegments] = useState<SplitSegment[]>([])
  const [filePath, setFilePath] = useState<string | null>(null)
  const [progress, setProgress] = useState<SplitProgress>({
    currentSegment: 0,
    totalSegments: 0,
    percent: 0,
    status: 'idle',
  })

  useEffect(() => {
    if (!window.electron) return
    
    const cleanup = window.electron.onProgress((prog) => {
      setProgress(prev => ({
        ...prev,
        currentSegment: prog.currentSegment,
        totalSegments: prog.totalSegments,
        percent: prog.percent,
        status: prog.status,
        error: prog.error,
      }))
    })
    
    return cleanup
  }, [])

  const reset = useCallback(() => {
    setFilePath(null)
    setMetadata(null)
    setSegments([])
    setProgress({
      currentSegment: 0,
      totalSegments: 0,
      percent: 0,
      status: 'idle',
    })
  }, [])

  const loadVideo = useCallback(async (providedPath?: string) => {
    if (!window.electron) {
      throw new Error('Electron API not available')
    }

    try {
      setProgress(p => ({ ...p, status: 'loading' }))

      let path = providedPath
      if (!path) {
        const selectedPath = await window.electron.openFile()
        if (!selectedPath) {
          setProgress(p => ({ ...p, status: 'idle' }))
          return
        }
        path = selectedPath
      }

      const meta = await window.electron.getVideoMetadata(path)
      setMetadata(meta)
      setFilePath(path)
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
  ): Promise<string[]> => {
    if (!window.electron) {
      throw new Error('Electron API not available')
    }

    if (!filePath || !metadata) {
      throw new Error('No video loaded')
    }

    const calculatedSegments = calculateSegments(segmentDuration, namingPattern)

    setProgress({
      currentSegment: 0,
      totalSegments: calculatedSegments.length,
      percent: 0,
      status: 'splitting',
    })

    try {
      const outputDir = ''
      const outputFiles = await window.electron.splitVideo(
        filePath,
        segmentDuration,
        outputDir,
        namingPattern,
        maxResolution
      )

      setSegments(prev => prev.map((seg, idx) => ({
        ...seg,
        outputPath: outputFiles[idx],
        status: 'complete' as const,
      })))

      return outputFiles
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
    loadVideo,
    calculateSegments,
    splitVideo,
    reset,
  }
}

