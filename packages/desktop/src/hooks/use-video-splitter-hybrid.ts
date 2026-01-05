import { useVideoSplitter as useElectronSplitter } from './use-video-splitter-electron'
import { useVideoSplitter as useFFmpegWasmSplitter } from './use-video-splitter-ffmpeg-wasm'

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
    // Use ffmpeg.wasm for all web - same FFmpeg logic as Electron desktop
    // WebCodecs/av-cliper had issues with VFR sources causing choppy output
    const wasmHook = useFFmpegWasmSplitter()
    return {
      ...wasmHook,
      loadVideo: async (fileOrPath?: File | string) => {
        if (fileOrPath instanceof File) {
          return wasmHook.loadVideo(fileOrPath)
        }
        throw new Error('File required for web mode')
      }
    }
  }
}

