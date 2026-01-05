import { useVideoSplitter as useElectronSplitter } from './use-video-splitter-electron'
import { useVideoSplitter as useWebCodecsSplitter } from './use-video-splitter'

export function useVideoSplitter() {
  const isElectron = typeof window !== 'undefined' && window.electron !== undefined

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
  } else {
    // Use WebCodecs for web (works on desktop, investigating mobile issues)
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

