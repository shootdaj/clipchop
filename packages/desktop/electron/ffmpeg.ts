import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)
ffmpeg.setFfprobePath(ffprobeInstaller.path)

export interface VideoInfo {
  duration: number
  width: number
  height: number
  codec: string
  fps: number
  bitrate: number
  rotation?: number
}

export async function getVideoMetadata(filePath: string): Promise<VideoInfo & { rotation?: number }> {
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

      const fps = videoStream.r_frame_rate ? eval(videoStream.r_frame_rate) : 30
      
      let rotation = 0
      if ((videoStream as any).side_data_list) {
        const rotationData = (videoStream as any).side_data_list.find((d: any) => d.rotation !== undefined)
        if (rotationData) rotation = rotationData.rotation
      }
      if ((videoStream as any).rotation !== undefined) {
        rotation = (videoStream as any).rotation
      }
      if ((videoStream as any).tags?.rotate) {
        rotation = parseInt((videoStream as any).tags.rotate)
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        codec: videoStream.codec_name || 'unknown',
        fps: fps || 30,
        bitrate: metadata.format.bit_rate ? parseInt(String(metadata.format.bit_rate)) : 0,
        rotation,
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
  onProgress?: (progress: number, currentSegment: number, totalSegments: number) => void
}

export async function splitVideo(options: SplitOptions): Promise<string[]> {
  const { filePath, segmentDuration, outputDir, namingPattern, maxResolution, onProgress } = options
  
  const metadata = await getVideoMetadata(filePath)
  const totalDuration = metadata.duration
  const numSegments = Math.ceil(totalDuration / segmentDuration)
  
  const outputFiles: string[] = []
  const basename = path.basename(filePath, path.extname(filePath))
  
  const rotation = metadata.rotation || 0
  
  let baseWidth = metadata.width
  let baseHeight = metadata.height
  
  if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
    baseWidth = metadata.height
    baseHeight = metadata.width
  }
  
  let outputWidth = baseWidth
  let outputHeight = baseHeight
  
  if (maxResolution) {
    const maxDim = Math.max(baseWidth, baseHeight)
    if (maxDim > maxResolution) {
      const scaleFactor = maxResolution / maxDim
      outputWidth = Math.round(baseWidth * scaleFactor / 2) * 2
      outputHeight = Math.round(baseHeight * scaleFactor / 2) * 2
    }
  }
  
  
  let videoCodec = 'libx264'
  let hwaccel: string | null = null
  let extraOptions: string[] = ['-preset', 'fast', '-crf', '23']
  
  if (process.platform === 'darwin') {
    videoCodec = 'h264_videotoolbox'
    extraOptions = ['-b:v', maxResolution === 1280 ? '800k' : maxResolution === 1920 ? '1500k' : '5000k']
  } else if (process.platform === 'win32') {
    hwaccel = 'auto'
  }
  
  console.log(`Splitting video into ${numSegments} segments`)
  console.log(`Video codec: ${videoCodec}, Encoded: ${metadata.width}x${metadata.height}`)
  if (rotation !== 0) {
    console.log(`Rotation: ${rotation}° - FFmpeg will autorotate to ${baseWidth}x${baseHeight}`)
  }
  console.log(`Output: ${outputWidth}x${outputHeight}`)
  
  for (let i = 0; i < numSegments; i++) {
    const startTime = i * segmentDuration
    const duration = Math.min(segmentDuration, totalDuration - startTime)
    
    const timestamp = namingPattern === 'timestamp' 
      ? new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
      : ''
    const filename = namingPattern === 'sequential'
      ? `${basename}_${String(i + 1).padStart(2, '0')}.mp4`
      : `${basename}_${timestamp}_${String(i + 1).padStart(2, '0')}.mp4`
    
    const outputPath = path.join(outputDir, filename)
    
    await new Promise<void>((resolve, reject) => {
      let inputOpts = ['-accurate_seek', `-ss ${startTime}`];
      
      let command = ffmpeg(filePath)
        .inputOptions(inputOpts)
        .duration(duration)
        .videoCodec(videoCodec)
        .audioCodec('aac')
        .audioBitrate('128k')
        .outputOptions([...extraOptions, '-metadata:s:v', 'rotate=0'])
      
      if (outputWidth !== baseWidth || outputHeight !== baseHeight) {
        command = command.size(`${outputWidth}x${outputHeight}`)
      }
      
      if (hwaccel) {
        command = command.inputOptions([`-hwaccel ${hwaccel}`])
      }
      
      
      command
        .on('start', (cmd: string) => {
          console.log(`Starting segment ${i + 1}/${numSegments}`)
          console.log('FFmpeg command:', cmd)
        })
        .on('progress', (progress: any) => {
          const percent = (progress.percent || 0)
          const overall = ((i + percent / 100) / numSegments) * 100
          if (onProgress) onProgress(overall, i + 1, numSegments)
        })
        .on('end', () => {
          console.log(`Segment ${i + 1}/${numSegments} complete: ${filename}`)
          outputFiles.push(outputPath)
          resolve()
        })
        .on('error', (err: Error, stdout: string, stderr: string) => {
          if (stderr.includes('encoder') && videoCodec !== 'libx264') {
            console.log('Hardware encoding failed, retrying with libx264')
            
            let fallbackCmd = ffmpeg(filePath)
              .inputOptions(['-accurate_seek', `-ss ${startTime}`])
              .duration(duration)
              .videoCodec('libx264')
              .outputOptions(['-preset', 'fast', '-crf', '23', '-metadata:s:v', 'rotate=0'])
              .audioCodec('aac')
              .audioBitrate('128k')
            
            if (outputWidth !== baseWidth || outputHeight !== baseHeight) {
              fallbackCmd = fallbackCmd.size(`${outputWidth}x${outputHeight}`)
            }
            
            fallbackCmd.on('end', () => {
                console.log(`Segment ${i + 1}/${numSegments} complete (fallback): ${filename}`)
                outputFiles.push(outputPath)
                resolve()
              })
              .on('error', (fallbackErr: Error) => {
                console.error('Fallback encoding also failed:', fallbackErr)
                reject(fallbackErr)
              })
              .save(outputPath)
          } else {
            console.error('Encoding error:', err.message)
            reject(err)
          }
        })
        .save(outputPath)
    })
  }
  
  console.log(`All ${numSegments} segments complete!`)
  return outputFiles
}

