import { useVideoSplitter as useElectronSplitter } from './use-video-splitter-electron'
import { useVideoSplitter as useWebCodecsSplitter } from './use-video-splitter'
import { useVideoSplitter as useFFmpegWasmSplitter } from './use-video-splitter-ffmpeg-wasm'

// Detect mobile/tablet devices
const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export function useVideoSplitter() {
  const isElectron = typeof window !== 'undefined' && window.electron !== undefined
  const isMobile = isMobileDevice()

  if (isElectron) {
    const electronHook = useElectronSplitter()
    return {
      ...electronHook,
      loadVideo: async (fileOrPath?: File | string) => {
        if (typeof fileOrPath === 'string' || fileOrPath === undefined) {
          return electronHook.loadVideo(fileOrPath)
        }
        return electronHook.loadVideo(undefined)
      }
    }
  } else if (isMobile) {
    // Mobile: Use ffmpeg.wasm - same FFmpeg engine as desktop, handles VFR properly
    console.log('Using ffmpeg.wasm for mobile device')
    const ffmpegHook = useFFmpegWasmSplitter()
    return {
      ...ffmpegHook,
      loadVideo: async (fileOrPath?: File | string) => {
        if (fileOrPath instanceof File) {
          return ffmpegHook.loadVideo(fileOrPath)
        }
        throw new Error('File required for web mode')
      }
    }
  } else {
    // Desktop browser: Use WebCodecs (fast, works well on desktop hardware)
    console.log('Using WebCodecs for desktop browser')
    const webCodecsHook = useWebCodecsSplitter()
    return {
      ...webCodecsHook,
      loadVideo: async (fileOrPath?: File | string) => {
        if (fileOrPath instanceof File) {
          return webCodecsHook.loadVideo(fileOrPath)
        }
        throw new Error('File required for web mode')
      }
    }
  }
}

