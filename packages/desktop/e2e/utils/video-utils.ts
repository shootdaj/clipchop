import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  codec: string
  bitrate: number
}

/**
 * Get video metadata using ffprobe
 */
export function getVideoMetadata(videoPath: string): VideoMetadata {
  const result = execSync(
    `ffprobe -v quiet -print_format json -show_streams -show_format "${videoPath}"`,
    { encoding: 'utf-8' }
  )
  const data = JSON.parse(result)
  const videoStream = data.streams.find((s: any) => s.codec_type === 'video')

  return {
    duration: parseFloat(data.format.duration),
    width: videoStream.width,
    height: videoStream.height,
    codec: videoStream.codec_name,
    bitrate: parseInt(data.format.bit_rate) || 0,
  }
}

/**
 * Extract a frame from video at specific timestamp
 */
export function extractFrame(
  videoPath: string,
  timestamp: number,
  outputPath?: string
): string {
  const output = outputPath || path.join(
    os.tmpdir(),
    `frame_${Date.now()}_${timestamp}s.jpg`
  )

  execSync(
    `ffmpeg -y -ss ${timestamp} -i "${videoPath}" -frames:v 1 -q:v 2 "${output}"`,
    { stdio: 'pipe' }
  )

  return output
}

/**
 * Compare two images using ffmpeg SSIM metric (better correlation with human perception)
 * Returns a value between 0 and 1 (0 = identical, 1 = completely different)
 */
export function compareFrames(image1: string, image2: string): number {
  try {
    // Verify files exist
    if (!fs.existsSync(image1)) {
      console.error(`Image 1 does not exist: ${image1}`)
      return 1
    }
    if (!fs.existsSync(image2)) {
      console.error(`Image 2 does not exist: ${image2}`)
      return 1
    }

    console.log(`Comparing frames:\n  Image 1: ${image1} (${fs.statSync(image1).size} bytes)\n  Image 2: ${image2} (${fs.statSync(image2).size} bytes)`)

    // Get dimensions of first image
    const probe1 = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${image1}"`,
      { encoding: 'utf-8' }
    ).trim()
    const [width, height] = probe1.split(',').map(Number)

    // Use ffmpeg SSIM for perceptual comparison (better than PSNR for human perception)
    // Scale image2 to match image1 dimensions, then compare
    const ffmpegCmd = `ffmpeg -i "${image1}" -i "${image2}" -filter_complex "[1:v]scale=${width}:${height}[scaled];[0:v][scaled]ssim" -f null - 2>&1`

    const fullOutput = execSync(ffmpegCmd, { encoding: 'utf-8' })
    const ssimLine = fullOutput.split('\n').find(line => line.includes('SSIM'))

    if (!ssimLine) {
      console.log('SSIM not found in output')
      return 1
    }

    // Parse SSIM All value (0-1 scale, 1 = identical)
    // Example: "SSIM Y:0.850000 (8.23) U:0.950000 (13.01) V:0.930000 (11.55) All:0.870000 (8.87)"
    const match = ssimLine.match(/All:([\d.]+)/)
    if (match) {
      const ssim = parseFloat(match[1])
      // SSIM is already 0-1 where 1 = identical
      // Convert to our scale where 0 = identical, 1 = different
      const difference = 1 - ssim
      console.log(`SSIM: ${ssim.toFixed(4)} -> difference score: ${difference.toFixed(4)} (${(ssim * 100).toFixed(1)}% similar)`)
      return difference
    }

    console.log('Could not parse SSIM value')
    return 1

  } catch (error) {
    console.error('Frame comparison error:', error)
    return 1
  }
}

/**
 * Verify video has correct duration within tolerance
 */
export function verifyDuration(
  videoPath: string,
  expectedDuration: number,
  toleranceSeconds = 0.5
): boolean {
  const meta = getVideoMetadata(videoPath)
  return Math.abs(meta.duration - expectedDuration) <= toleranceSeconds
}

/**
 * Verify video dimensions
 */
export function verifyDimensions(
  videoPath: string,
  expectedWidth: number,
  expectedHeight: number
): boolean {
  const meta = getVideoMetadata(videoPath)
  return meta.width === expectedWidth && meta.height === expectedHeight
}

/**
 * Create a small test video (for CI)
 */
export function createTestVideo(
  outputPath: string,
  duration: number = 10,
  width: number = 1280,
  height: number = 720
): void {
  execSync(
    `ffmpeg -y -f lavfi -i testsrc=duration=${duration}:size=${width}x${height}:rate=30 ` +
    `-f lavfi -i sine=frequency=440:duration=${duration} ` +
    `-c:v libx264 -c:a aac -shortest "${outputPath}"`,
    { stdio: 'pipe' }
  )
}

/**
 * Clean up temporary files
 */
export function cleanupTempFiles(pattern: string): void {
  const tmpDir = os.tmpdir()
  const files = fs.readdirSync(tmpDir)
  files
    .filter(f => f.includes(pattern))
    .forEach(f => {
      try {
        fs.unlinkSync(path.join(tmpDir, f))
      } catch { /* ignore */ }
    })
}
