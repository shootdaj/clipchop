import { WebPlugin } from '@capacitor/core'
import type { VideoSplitterPlugin, SplitOptions, SplitResult, VideoMetadata } from './definitions'

export class VideoSplitterWeb extends WebPlugin implements VideoSplitterPlugin {
  async getMetadata(options: { filePath: string }): Promise<VideoMetadata> {
    // Web implementation would use the existing WebCodecs approach
    // For now, throw an error indicating native is required for best performance
    console.log('Web getMetadata called with:', options)
    throw new Error('Video splitting on web is slow. Please use the native app for best performance.')
  }

  async splitVideo(_options: SplitOptions): Promise<SplitResult> {
    // Web implementation would use existing useVideoSplitter hook
    // But we want to push users to native for performance
    throw new Error('Video splitting on web is slow. Please use the native app for best performance.')
  }

  async pickVideo(): Promise<{ filePath: string; fileName: string }> {
    // Create a file input and trigger it
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'video/*'
      input.onchange = () => {
        const file = input.files?.[0]
        if (file) {
          // For web, we return a blob URL
          const url = URL.createObjectURL(file)
          resolve({ filePath: url, fileName: file.name })
        } else {
          reject(new Error('No file selected'))
        }
      }
      input.click()
    })
  }
}
