import { contextBridge, ipcRenderer } from 'electron'

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

contextBridge.exposeInMainWorld('electron', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (defaultName: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  
  getVideoMetadata: (filePath: string) => 
    ipcRenderer.invoke('video:getMetadata', filePath),
  
  splitVideo: (
    filePath: string,
    segmentDuration: number,
    outputDir: string,
    namingPattern: string,
    maxResolution?: number | null
  ) => ipcRenderer.invoke('video:split', {
    filePath,
    segmentDuration,
    outputDir,
    namingPattern,
    maxResolution
  }),
  
  onProgress: (callback: (progress: SplitProgress) => void) => {
    const subscription = (_event: any, progress: SplitProgress) => callback(progress)
    ipcRenderer.on('video:progress', subscription)
    return () => ipcRenderer.removeListener('video:progress', subscription)
  },
  
  platform: process.platform,
  version: process.versions.electron,
})

