export interface VideoMetadata {
  duration: number
  width: number
  height: number
  filename: string
  size: number
  codec: string
  fps: number
}

export interface SplitProgress {
  currentSegment: number
  totalSegments: number
  percent: number
  status: 'idle' | 'splitting' | 'complete' | 'error'
  error?: string
}

declare global {
  interface Window {
    electron?: {
      openFile: () => Promise<string | null>
      saveFile: (defaultName: string) => Promise<string | null>
      getVideoMetadata: (filePath: string) => Promise<VideoMetadata>
      splitVideo: (
        filePath: string,
        segmentDuration: number,
        outputDir: string,
        namingPattern: string,
        maxResolution?: number | null
      ) => Promise<string[]>
      copyToDownloads: (sourcePath: string, filename?: string) => Promise<{ success: boolean; path: string }>
      onProgress: (callback: (progress: SplitProgress) => void) => () => void
      platform: string
      version: string
    }
  }
}

export {}

