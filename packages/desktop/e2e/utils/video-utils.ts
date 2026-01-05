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
 * Compare two images using ImageMagick (returns difference percentage)
 * Lower value = more similar (0 = identical)
 */
export function compareFrames(image1: string, image2: string): number {
  try {
    // Use ImageMagick compare with SSIM metric
    const result = execSync(
      `compare -metric RMSE "${image1}" "${image2}" null: 2>&1 || true`,
      { encoding: 'utf-8' }
    )
    // Parse result like "1234.56 (0.0123)"
    const match = result.match(/\(([\d.]+)\)/)
    return match ? parseFloat(match[1]) : 1
  } catch {
    // If compare fails (different dimensions), resize and retry
    const tmpResized = path.join(os.tmpdir(), `resized_${Date.now()}.jpg`)
    const dims = execSync(
      `identify -format "%wx%h" "${image1}"`,
      { encoding: 'utf-8' }
    ).trim()

    execSync(`convert "${image2}" -resize ${dims}! "${tmpResized}"`)

    const result = execSync(
      `compare -metric RMSE "${image1}" "${tmpResized}" null: 2>&1 || true`,
      { encoding: 'utf-8' }
    )
    fs.unlinkSync(tmpResized)

    const match = result.match(/\(([\d.]+)\)/)
    return match ? parseFloat(match[1]) : 1
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
