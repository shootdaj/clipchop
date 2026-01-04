import { useVideoSplitter as useElectronSplitter } from './use-video-splitter-electron'
import { useVideoSplitter as useWebSplitter } from './use-video-splitter'

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
    const webHook = useWebSplitter()
    return {
      ...webHook,
      loadVideo: async (fileOrPath?: File | string) => {
        if (fileOrPath instanceof File) {
          return webHook.loadVideo(fileOrPath)
        }
        throw new Error('File required for web mode')
      }
    }
  }
}

