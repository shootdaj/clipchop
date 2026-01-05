import { ipcMain, BrowserWindow, app } from 'electron'
import { getVideoMetadata, splitVideo } from './ffmpeg'
import path from 'path'
import fs from 'fs'
import os from 'os'

export function setupFFmpegHandlers() {
  // Handler to copy files to Downloads folder
  ipcMain.handle('file:copyToDownloads', async (_event, { sourcePath, filename }) => {
    try {
      const downloadsPath = app.getPath('downloads')
      const sourceFilename = filename || path.basename(sourcePath)
      const destPath = path.join(downloadsPath, sourceFilename)

      // Handle filename conflicts by adding number suffix
      let finalPath = destPath
      let counter = 1
      while (fs.existsSync(finalPath)) {
        const ext = path.extname(sourceFilename)
        const base = path.basename(sourceFilename, ext)
        finalPath = path.join(downloadsPath, `${base} (${counter})${ext}`)
        counter++
      }

      fs.copyFileSync(sourcePath, finalPath)
      console.log('Copied to downloads:', finalPath)
      return { success: true, path: finalPath }
    } catch (error) {
      console.error('Failed to copy to downloads:', error)
      throw new Error(`Failed to copy file: ${error}`)
    }
  })
  ipcMain.handle('video:getMetadata', async (_event, filePath: string) => {
    try {
      console.log('Getting metadata for:', filePath)
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
      console.error('Failed to get metadata:', error)
      throw new Error(`Failed to get metadata: ${error}`)
    }
  })
  
  ipcMain.handle('video:split', async (_event, options) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    
    try {
      const tempDir = path.join(os.tmpdir(), 'clipchop-output')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      
      console.log('Starting video split with options:', {
        ...options,
        outputDir: tempDir
      })
      
      const outputFiles = await splitVideo({
        ...options,
        outputDir: tempDir,
        onProgress: (percent: number, currentSegment: number, totalSegments: number) => {
          mainWindow?.webContents.send('video:progress', {
            percent,
            currentSegment,
            totalSegments,
            status: 'splitting',
          })
        }
      })
      
      console.log('Video split complete, output files:', outputFiles)
      
      mainWindow?.webContents.send('video:progress', {
        percent: 100,
        currentSegment: outputFiles.length,
        totalSegments: outputFiles.length,
        status: 'complete',
      })
      
      return outputFiles
    } catch (error) {
      console.error('Video split failed:', error)
      mainWindow?.webContents.send('video:progress', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  })
}

