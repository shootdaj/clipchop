import { useVideoSplitter as useElectronSplitter } from './use-video-splitter-electron'
import { useVideoSplitter as useWebCodecsSplitter } from './use-video-splitter'
import { useVideoSplitter as useMediaRecorderSplitter } from './use-video-splitter-mediarecorder'

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
    // Mobile: Use MediaRecorder API - handles VFR videos better than WebCodecs
    // Records in real-time but produces smooth output
    console.log('Using MediaRecorder for mobile device')
    const mediaRecorderHook = useMediaRecorderSplitter()
    return {
      ...mediaRecorderHook,
      loadVideo: async (fileOrPath?: File | string) => {
        if (fileOrPath instanceof File) {
          return mediaRecorderHook.loadVideo(fileOrPath)
        }
        throw new Error('File required for web mode')
      }
    }
  } else {
    // Desktop: Use WebCodecs (fast, works well on desktop hardware)
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

