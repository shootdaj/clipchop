export interface SplitOptions {
  filePath: string
  segmentDuration: number // seconds
  outputDir?: string
}

export interface SplitResult {
  segments: SegmentInfo[]
  totalDuration: number
}

export interface SegmentInfo {
  index: number
  path: string
  startTime: number
  endTime: number
  duration: number
}

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  rotation: number
}

export interface VideoSplitterPlugin {
  getMetadata(options: { filePath: string }): Promise<VideoMetadata>
  splitVideo(options: SplitOptions): Promise<SplitResult>
  pickVideo(): Promise<{ filePath: string; fileName: string }>
}
