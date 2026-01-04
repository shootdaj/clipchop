# Electron Conversion Plan - Clipchop Native App

## Overview

Convert the current web-based Clipchop app to an Electron desktop application with native FFmpeg for 20-30x faster video encoding performance.

**Estimated Time**: 8-12 hours
**Code Reuse**: ~90% (all React/UI code stays)
**New Code**: ~10% (Electron main process + FFmpeg wrapper)

---

## Phase 1: Project Setup (1-2 hours)

### 1.1 Install Electron Dependencies

```bash
bun add -D electron electron-builder
bun add -D concurrently wait-on cross-env
bun add @electron/remote
```

### 1.2 Install FFmpeg Dependencies

```bash
bun add fluent-ffmpeg
bun add -D @ffmpeg-installer/ffmpeg @ffprobe-installer/ffprobe
```

Alternative (smaller bundle):
```bash
bun add ffmpeg-static ffprobe-static
```

### 1.3 Update package.json

Add scripts:
```json
{
  "name": "clipchop",
  "version": "0.1.0",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "tsc -b && vite build && electron-builder",
    "electron:build:mac": "electron-builder --mac",
    "electron:build:win": "electron-builder --win",
    "electron:build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.clipchop.app",
    "productName": "Clipchop",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.video",
      "target": ["dmg", "zip"],
      "icon": "build/icon.icns",
      "hardenedRuntime": true,
      "gatekeeperAssess": false
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Video"
    },
    "extraResources": [
      {
        "from": "node_modules/@ffmpeg-installer/ffmpeg/ffmpeg",
        "to": "ffmpeg"
      },
      {
        "from": "node_modules/@ffprobe-installer/ffprobe/ffprobe",
        "to": "ffprobe"
      }
    ]
  }
}
```

### 1.4 Create Directory Structure

```
clipchop/
├── electron/
│   ├── main.ts           # Main process
│   ├── preload.ts        # Preload script
│   ├── ffmpeg.ts         # FFmpeg wrapper
│   └── ipc-handlers.ts   # IPC message handlers
├── src/                  # Existing React code (mostly unchanged)
│   ├── App.tsx
│   ├── components/
│   ├── hooks/
│   │   └── use-video-splitter-electron.ts  # New hook
│   └── lib/
├── build/                # App icons
│   ├── icon.icns
│   ├── icon.ico
│   └── icon.png
└── dist-electron/        # Compiled Electron code (gitignore)
```

---

## Phase 2: Electron Main Process (2-3 hours)

### 2.1 Create electron/main.ts

```typescript
import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { setupFFmpegHandlers } from './ipc-handlers'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a12',
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  setupFFmpegHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// File dialog handler
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'webm', 'mkv'] }
    ]
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

// Save file dialog handler
ipcMain.handle('dialog:saveFile', async (_event, defaultName: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [
      { name: 'Video', extensions: ['mp4'] }
    ]
  })
  
  if (!result.canceled && result.filePath) {
    return result.filePath
  }
  return null
})
```

### 2.2 Create electron/preload.ts

```typescript
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
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (defaultName: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  
  // Video operations
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
  
  // Progress updates
  onProgress: (callback: (progress: SplitProgress) => void) => {
    ipcRenderer.on('video:progress', (_event, progress) => callback(progress))
    return () => ipcRenderer.removeAllListeners('video:progress')
  },
  
  // Platform info
  platform: process.platform,
  version: process.versions.electron,
})
```

### 2.3 Create electron/ffmpeg.ts

```typescript
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import { app } from 'electron'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'

// Set FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegInstaller.path)
ffmpeg.setFfprobePath(ffprobeInstaller.path)

export interface VideoInfo {
  duration: number
  width: number
  height: number
  codec: string
  fps: number
  bitrate: number
}

export async function getVideoMetadata(filePath: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video')
      if (!videoStream) {
        reject(new Error('No video stream found'))
        return
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        codec: videoStream.codec_name || 'unknown',
        fps: eval(videoStream.r_frame_rate || '30') || 30,
        bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate) : 0,
      })
    })
  })
}

export interface SplitOptions {
  filePath: string
  segmentDuration: number
  outputDir: string
  namingPattern: 'sequential' | 'timestamp'
  maxResolution?: number | null
  onProgress?: (progress: number) => void
}

export async function splitVideo(options: SplitOptions): Promise<string[]> {
  const { filePath, segmentDuration, outputDir, namingPattern, maxResolution, onProgress } = options
  
  const metadata = await getVideoMetadata(filePath)
  const totalDuration = metadata.duration
  const numSegments = Math.ceil(totalDuration / segmentDuration)
  
  const outputFiles: string[] = []
  const basename = path.basename(filePath, path.extname(filePath))
  
  // Determine output resolution
  let scale: string | null = null
  if (maxResolution) {
    const maxDim = Math.max(metadata.width, metadata.height)
    if (maxDim > maxResolution) {
      const isPortrait = metadata.height > metadata.width
      if (isPortrait) {
        scale = `-2:${maxResolution}`
      } else {
        scale = `${maxResolution}:-2`
      }
    }
  }
  
  // Determine encoding settings
  let videoCodec = 'libx264'
  let preset = 'medium'
  let crf = '23'
  
  // Try to use hardware acceleration
  if (process.platform === 'darwin') {
    // macOS - VideoToolbox
    videoCodec = 'h264_videotoolbox'
    preset = undefined as any
    crf = undefined as any
  } else if (process.platform === 'win32') {
    // Windows - try NVENC, fall back to CPU
    videoCodec = 'h264_nvenc'
    preset = 'fast'
    crf = undefined as any
  }
  
  for (let i = 0; i < numSegments; i++) {
    const startTime = i * segmentDuration
    const duration = Math.min(segmentDuration, totalDuration - startTime)
    
    const timestamp = namingPattern === 'timestamp' 
      ? new Date().toISOString().replace(/[:.]/g, '-')
      : ''
    const filename = namingPattern === 'sequential'
      ? `${basename}_${String(i + 1).padStart(2, '0')}.mp4`
      : `${basename}_${timestamp}_${String(i + 1).padStart(2, '0')}.mp4`
    
    const outputPath = path.join(outputDir, filename)
    
    await new Promise<void>((resolve, reject) => {
      let command = ffmpeg(filePath)
        .setStartTime(startTime)
        .setDuration(duration)
        .videoCodec(videoCodec)
        .audioCodec('aac')
        .audioBitrate('128k')
      
      if (preset) command = command.outputOptions([`-preset ${preset}`])
      if (crf) command = command.outputOptions([`-crf ${crf}`])
      if (scale) command = command.size(scale)
      
      // Add fallback for hardware acceleration failure
      command
        .on('start', (cmd) => {
          console.log('FFmpeg command:', cmd)
        })
        .on('progress', (progress) => {
          const percent = (progress.percent || 0)
          const overall = ((i + percent / 100) / numSegments) * 100
          if (onProgress) onProgress(overall)
        })
        .on('end', () => {
          outputFiles.push(outputPath)
          resolve()
        })
        .on('error', (err, stdout, stderr) => {
          // If hardware encoding fails, retry with software
          if (stderr.includes('encoder') && videoCodec !== 'libx264') {
            console.log('Hardware encoding failed, falling back to libx264')
            
            ffmpeg(filePath)
              .setStartTime(startTime)
              .setDuration(duration)
              .videoCodec('libx264')
              .outputOptions(['-preset fast', '-crf 23'])
              .audioCodec('aac')
              .audioBitrate('128k')
              .size(scale || undefined as any)
              .on('end', () => {
                outputFiles.push(outputPath)
                resolve()
              })
              .on('error', reject)
              .save(outputPath)
          } else {
            reject(err)
          }
        })
        .save(outputPath)
    })
  }
  
  return outputFiles
}
```

### 2.4 Create electron/ipc-handlers.ts

```typescript
import { ipcMain, BrowserWindow, app } from 'electron'
import { getVideoMetadata, splitVideo } from './ffmpeg'
import path from 'path'
import fs from 'fs'
import os from 'os'

export function setupFFmpegHandlers() {
  ipcMain.handle('video:getMetadata', async (_event, filePath: string) => {
    try {
      const metadata = await getVideoMetadata(filePath)
      const stats = fs.statSync(filePath)
      
      return {
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        filename: path.basename(filePath),
        size: stats.size,
        codec: metadata.codec,
        fps: metadata.fps,
      }
    } catch (error) {
      throw new Error(`Failed to get metadata: ${error}`)
    }
  })
  
  ipcMain.handle('video:split', async (_event, options) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    
    try {
      // Create temp output directory
      const tempDir = path.join(os.tmpdir(), 'clipchop-output')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      
      const outputFiles = await splitVideo({
        ...options,
        outputDir: tempDir,
        onProgress: (percent) => {
          mainWindow?.webContents.send('video:progress', {
            percent,
            status: 'splitting',
          })
        }
      })
      
      mainWindow?.webContents.send('video:progress', {
        percent: 100,
        status: 'complete',
      })
      
      return outputFiles
    } catch (error) {
      mainWindow?.webContents.send('video:progress', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  })
}
```

---

## Phase 3: React/Frontend Changes (2-3 hours)

### 3.1 Create src/types/electron.d.ts

```typescript
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
    electron: {
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
      onProgress: (callback: (progress: SplitProgress) => void) => () => void
      platform: string
      version: string
    }
  }
}

export {}
```

### 3.2 Create src/hooks/use-video-splitter-electron.ts

```typescript
import { useState, useCallback, useEffect } from 'react'
import { calculateSegmentBoundaries } from '@/lib/video-utils'

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  filename: string
  size: number
  codec: string
  fps: number
}

export interface SplitSegment {
  index: number
  startTime: number
  endTime: number
  duration: number
  filename: string
  outputPath?: string
  status: 'pending' | 'processing' | 'complete' | 'error'
  error?: string
}

export interface SplitProgress {
  currentSegment: number
  totalSegments: number
  percent: number
  status: 'idle' | 'loading' | 'splitting' | 'complete' | 'error'
  error?: string
}

interface UseVideoSplitterReturn {
  metadata: VideoMetadata | null
  segments: SplitSegment[]
  progress: SplitProgress
  loadVideo: (filePath?: string) => Promise<void>
  calculateSegments: (segmentDuration: number, namingPattern: 'sequential' | 'timestamp') => SplitSegment[]
  splitVideo: (segmentDuration: number, namingPattern: 'sequential' | 'timestamp', maxResolution?: number | null) => Promise<string[]>
  reset: () => void
}

export function useVideoSplitter(): UseVideoSplitterReturn {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [segments, setSegments] = useState<SplitSegment[]>([])
  const [filePath, setFilePath] = useState<string | null>(null)
  const [progress, setProgress] = useState<SplitProgress>({
    currentSegment: 0,
    totalSegments: 0,
    percent: 0,
    status: 'idle',
  })

  useEffect(() => {
    if (!window.electron) return
    
    const cleanup = window.electron.onProgress((prog) => {
      setProgress(prev => ({
        ...prev,
        percent: prog.percent,
        status: prog.status,
        error: prog.error,
      }))
    })
    
    return cleanup
  }, [])

  const reset = useCallback(() => {
    setFilePath(null)
    setMetadata(null)
    setSegments([])
    setProgress({
      currentSegment: 0,
      totalSegments: 0,
      percent: 0,
      status: 'idle',
    })
  }, [])

  const loadVideo = useCallback(async (providedPath?: string) => {
    try {
      setProgress(p => ({ ...p, status: 'loading' }))

      let path = providedPath
      if (!path) {
        path = await window.electron.openFile()
      }
      
      if (!path) {
        setProgress(p => ({ ...p, status: 'idle' }))
        return
      }

      const meta = await window.electron.getVideoMetadata(path)
      setMetadata(meta)
      setFilePath(path)
      setProgress(p => ({ ...p, status: 'idle' }))
    } catch (error) {
      setProgress({
        currentSegment: 0,
        totalSegments: 0,
        percent: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to load video',
      })
      throw error
    }
  }, [])

  const calculateSegments = useCallback((
    segmentDuration: number,
    namingPattern: 'sequential' | 'timestamp'
  ): SplitSegment[] => {
    if (!metadata) return []

    const boundaries = calculateSegmentBoundaries(
      metadata.duration,
      segmentDuration,
      metadata.filename,
      namingPattern
    )

    const newSegments: SplitSegment[] = boundaries.map(b => ({
      ...b,
      status: 'pending' as const,
    }))

    setSegments(newSegments)
    return newSegments
  }, [metadata])

  const splitVideo = useCallback(async (
    segmentDuration: number,
    namingPattern: 'sequential' | 'timestamp',
    maxResolution: number | null = null
  ): Promise<string[]> => {
    if (!filePath || !metadata) {
      throw new Error('No video loaded')
    }

    const calculatedSegments = calculateSegments(segmentDuration, namingPattern)

    setProgress({
      currentSegment: 0,
      totalSegments: calculatedSegments.length,
      percent: 0,
      status: 'splitting',
    })

    try {
      const outputDir = ''  // Will use temp dir in main process
      const outputFiles = await window.electron.splitVideo(
        filePath,
        segmentDuration,
        outputDir,
        namingPattern,
        maxResolution
      )

      // Update segments with output paths
      setSegments(prev => prev.map((seg, idx) => ({
        ...seg,
        outputPath: outputFiles[idx],
        status: 'complete' as const,
      })))

      return outputFiles
    } catch (error) {
      setProgress(p => ({
        ...p,
        status: 'error',
        error: error instanceof Error ? error.message : 'Split failed',
      }))
      throw error
    }
  }, [filePath, metadata, calculateSegments])

  return {
    metadata,
    segments,
    progress,
    loadVideo,
    calculateSegments,
    splitVideo,
    reset,
  }
}
```

### 3.3 Update src/App.tsx

Replace the import:
```typescript
// OLD
import { useVideoSplitter } from '@/hooks/use-video-splitter'

// NEW
import { useVideoSplitter } from '@/hooks/use-video-splitter-electron'
```

Update file upload handler:
```typescript
const handleFileSelect = async () => {
  await loadVideo()  // No file parameter - uses dialog
}
```

Update download handler to use native file save:
```typescript
onClick={async () => {
  for (const seg of segments) {
    if (seg.outputPath) {
      const savePath = await window.electron.saveFile(seg.filename)
      if (savePath) {
        // Copy file from temp to save location
        // This will be handled by a new IPC handler
      }
    }
  }
}}
```

### 3.4 Update src/components/video-uploader.tsx

Remove file input, use button to trigger native dialog:
```typescript
<button
  onClick={async () => {
    if (window.electron) {
      const filePath = await window.electron.openFile()
      if (filePath && onFileSelect) {
        onFileSelect(filePath)
      }
    }
  }}
  disabled={disabled}
  className="..."
>
  Select Video
</button>
```

---

## Phase 4: Build Configuration (1 hour)

### 4.1 Create electron-builder.yml

```yaml
appId: com.clipchop.app
productName: Clipchop
copyright: Copyright © 2026

directories:
  output: release

files:
  - dist/**/*
  - dist-electron/**/*
  - package.json

extraResources:
  - from: node_modules/@ffmpeg-installer/ffmpeg
    to: ffmpeg
    filter: ffmpeg*
  - from: node_modules/@ffprobe-installer/ffprobe
    to: ffprobe
    filter: ffprobe*

mac:
  category: public.app-category.video
  target:
    - dmg
    - zip
  icon: build/icon.icns
  minimumSystemVersion: "10.15.0"

win:
  target:
    - nsis
    - portable
  icon: build/icon.ico

linux:
  target:
    - AppImage
    - deb
  category: Video
  icon: build/icon.png

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

### 4.2 Update vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',  // Important for Electron
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
})
```

### 4.3 Create electron TypeScript config

Create `tsconfig.electron.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "outDir": "dist-electron",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["electron/**/*"],
  "exclude": ["node_modules", "dist", "dist-electron"]
}
```

### 4.4 Create Icons

Generate app icons:
- macOS: 1024x1024 PNG → convert to .icns
- Windows: 256x256 PNG → convert to .ico  
- Linux: 512x512 PNG

Place in `build/` directory.

---

## Phase 5: Testing & Polish (2-3 hours)

### 5.1 Development Testing Checklist

- [ ] App launches in dev mode
- [ ] File dialog opens
- [ ] Video metadata loads correctly
- [ ] Split preview calculates correctly
- [ ] Progress bar updates during split
- [ ] Output files are created
- [ ] Download/save dialog works
- [ ] Hardware acceleration is used (check logs)
- [ ] CPU fallback works if GPU unavailable
- [ ] All quality levels work (Full/HD/SD)
- [ ] Error handling works
- [ ] App closes cleanly

### 5.2 Build Testing Checklist

- [ ] Production build completes
- [ ] App bundle size is reasonable (< 200MB)
- [ ] FFmpeg binaries are included
- [ ] App launches from .dmg/.exe/.AppImage
- [ ] Auto-updater config (if implemented)
- [ ] Code signing (macOS)
- [ ] Notarization (macOS)

### 5.3 Performance Testing

Test with your 1:34 4K video:
- [ ] Record encoding time
- [ ] Verify 20-30x speedup achieved
- [ ] Check CPU usage
- [ ] Check memory usage
- [ ] Verify output quality
- [ ] Test all resolution options

---

## Phase 6: Distribution (1 hour)

### 6.1 GitHub Releases Setup

Create `.github/workflows/build.yml`:
```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: oven-sh/setup-bun@v1
      
      - run: bun install
      
      - run: bun run electron:build
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: release/*
```

### 6.2 Auto-Update Setup (Optional)

Add to `electron/main.ts`:
```typescript
import { autoUpdater } from 'electron-updater'

if (!isDev) {
  autoUpdater.checkForUpdatesAndNotify()
}
```

---

## Phase 7: Documentation (30 min)

### 7.1 Update README.md

Add sections:
- Download links
- System requirements
- Installation instructions
- Hardware acceleration notes
- Comparison to web version

### 7.2 Create CHANGELOG.md

Document:
- v1.0.0: Native Electron app with FFmpeg
- Performance improvements
- New features

---

## Migration Checklist

### Pre-Migration
- [ ] Backup current working web version
- [ ] Create `electron` branch in git
- [ ] Install all dependencies

### Core Implementation
- [ ] Phase 1: Project setup complete
- [ ] Phase 2: Electron main process working
- [ ] Phase 3: React integration complete
- [ ] Phase 4: Build configuration done

### Testing
- [ ] Phase 5: Development testing passed
- [ ] Phase 5: Production build tested
- [ ] Phase 5: Performance benchmarks met

### Deployment
- [ ] Phase 6: Distribution setup
- [ ] Phase 7: Documentation updated

### Post-Migration
- [ ] Merge to main
- [ ] Tag v1.0.0 release
- [ ] Update website/landing page

---

## Timeline

| Day | Tasks | Hours |
|-----|-------|-------|
| **Day 1 AM** | Phase 1-2: Setup + Main Process | 3-4 |
| **Day 1 PM** | Phase 3: React Integration | 3-4 |
| **Day 2 AM** | Phase 4-5: Build + Testing | 3-4 |
| **Day 2 PM** | Phase 6-7: Distribution + Docs | 1-2 |

**Total: 10-14 hours** (spread over 1.5-2 days)

---

## Success Criteria

✅ **Must Have:**
- App builds and runs on macOS
- File selection works
- Video splitting works
- 10x faster than web version minimum
- Basic error handling

✅ **Should Have:**
- Hardware acceleration working
- 20x+ faster than web
- Windows build working
- Linux build working
- Download manager

✅ **Nice to Have:**
- Auto-updates
- Better progress UI
- Batch processing
- Preset management
- Code signing

---

## Risk Mitigation

### Risk 1: FFmpeg Binary Size
**Impact**: Large app bundle
**Mitigation**: Use static builds, compress, or download on first run

### Risk 2: Hardware Acceleration Not Available
**Impact**: Slower encoding
**Mitigation**: Graceful fallback to CPU encoding (still 3-5x faster than web)

### Risk 3: Platform-Specific Bugs
**Impact**: App doesn't work on some systems
**Mitigation**: Test on multiple systems, provide fallbacks

### Risk 4: Code Signing Issues (macOS)
**Impact**: Users get security warnings
**Mitigation**: Apple Developer account ($99/year) for signing + notarization

---

## Next Steps

1. Review this plan
2. Commit current web version
3. Create `electron` branch
4. Start Phase 1

Ready to begin?

