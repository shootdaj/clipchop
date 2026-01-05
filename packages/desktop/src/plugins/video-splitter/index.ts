import { registerPlugin } from '@capacitor/core'
import type { VideoSplitterPlugin } from './definitions'

const VideoSplitter = registerPlugin<VideoSplitterPlugin>('VideoSplitter', {
  web: () => import('./web').then(m => new m.VideoSplitterWeb()),
})

export * from './definitions'
export { VideoSplitter }
