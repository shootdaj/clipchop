import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execSync } from 'child_process'
import {
  getVideoMetadata,
  extractFrame,
  compareFrames,
  verifyDuration,
  createTestVideo,
  cleanupTempFiles,
} from './video-utils'

// Test fixtures directory
const FIXTURES_DIR = path.join(os.tmpdir(), 'clipchop-unit-tests')
const TEST_VIDEO_PATH = path.join(FIXTURES_DIR, 'test-video.mp4')
const TEST_VIDEO_PORTRAIT_PATH = path.join(FIXTURES_DIR, 'test-video-portrait.mp4')

// Check if ffmpeg is available
const ffmpegAvailable = (() => {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
})()

describe.skipIf(!ffmpegAvailable)('Video Utils (ffmpeg-based)', () => {
  beforeAll(() => {
    // Create fixtures directory
    if (!fs.existsSync(FIXTURES_DIR)) {
      fs.mkdirSync(FIXTURES_DIR, { recursive: true })
    }

    // Create test videos
    console.log('Creating test videos...')
    createTestVideo(TEST_VIDEO_PATH, 10, 1280, 720) // 10s landscape
    createTestVideo(TEST_VIDEO_PORTRAIT_PATH, 5, 720, 1280) // 5s portrait
  })

  afterAll(() => {
    // Cleanup test videos
    cleanupTempFiles('clipchop-unit-tests')
    try {
      fs.rmSync(FIXTURES_DIR, { recursive: true, force: true })
    } catch { /* ignore */ }
  })

  describe('getVideoMetadata', () => {
    it('extracts correct metadata from landscape video', () => {
      const meta = getVideoMetadata(TEST_VIDEO_PATH)

      expect(meta.duration).toBeCloseTo(10, 0)
      expect(meta.width).toBe(1280)
      expect(meta.height).toBe(720)
      expect(meta.codec).toBe('h264')
    })

    it('extracts correct metadata from portrait video', () => {
      const meta = getVideoMetadata(TEST_VIDEO_PORTRAIT_PATH)

      expect(meta.duration).toBeCloseTo(5, 0)
      expect(meta.width).toBe(720)
      expect(meta.height).toBe(1280)
    })

    it('throws error for non-existent file', () => {
      expect(() => getVideoMetadata('/nonexistent/video.mp4')).toThrow()
    })
  })

  describe('extractFrame', () => {
    it('extracts frame at specific timestamp', () => {
      const framePath = extractFrame(TEST_VIDEO_PATH, 1)

      expect(fs.existsSync(framePath)).toBe(true)
      expect(framePath).toMatch(/\.jpg$/)

      // Verify it's a valid image by checking file size
      const stats = fs.statSync(framePath)
      expect(stats.size).toBeGreaterThan(1000) // Should be at least 1KB

      // Cleanup
      fs.unlinkSync(framePath)
    })

    it('extracts frame at beginning (0s)', () => {
      const framePath = extractFrame(TEST_VIDEO_PATH, 0)

      expect(fs.existsSync(framePath)).toBe(true)

      fs.unlinkSync(framePath)
    })

    it('extracts frame near end', () => {
      const framePath = extractFrame(TEST_VIDEO_PATH, 9)

      expect(fs.existsSync(framePath)).toBe(true)

      fs.unlinkSync(framePath)
    })

    it('uses custom output path when provided', () => {
      const customPath = path.join(FIXTURES_DIR, 'custom-frame.jpg')
      const framePath = extractFrame(TEST_VIDEO_PATH, 2, customPath)

      expect(framePath).toBe(customPath)
      expect(fs.existsSync(customPath)).toBe(true)

      fs.unlinkSync(customPath)
    })
  })

  describe('compareFrames', () => {
    it('returns 0 (identical) for same frame', () => {
      const frame1 = extractFrame(TEST_VIDEO_PATH, 5)
      const frame2 = extractFrame(TEST_VIDEO_PATH, 5)

      const diff = compareFrames(frame1, frame2)

      // Same timestamp should produce nearly identical frames
      expect(diff).toBeLessThan(0.1) // Less than 10% difference

      fs.unlinkSync(frame1)
      fs.unlinkSync(frame2)
    })

    it('returns some difference for frames at different times', () => {
      const frame1 = extractFrame(TEST_VIDEO_PATH, 1)
      const frame2 = extractFrame(TEST_VIDEO_PATH, 8)

      const diff = compareFrames(frame1, frame2)

      // Even synthetic test videos have some variation
      // The testsrc pattern has a timecode that changes, so there should be some difference
      expect(diff).toBeGreaterThan(0) // Not identical
      expect(diff).toBeLessThan(0.5) // But still quite similar (same pattern)

      fs.unlinkSync(frame1)
      fs.unlinkSync(frame2)
    })

    it('handles frames of different dimensions (scales for comparison)', () => {
      const frameLandscape = extractFrame(TEST_VIDEO_PATH, 2)
      const framePortrait = extractFrame(TEST_VIDEO_PORTRAIT_PATH, 2)

      // Should not throw, even with different dimensions
      const diff = compareFrames(frameLandscape, framePortrait)

      expect(typeof diff).toBe('number')
      expect(diff).toBeGreaterThanOrEqual(0)
      expect(diff).toBeLessThanOrEqual(1)

      fs.unlinkSync(frameLandscape)
      fs.unlinkSync(framePortrait)
    })

    it('returns 1 for non-existent file', () => {
      const frame1 = extractFrame(TEST_VIDEO_PATH, 2)

      const diff = compareFrames(frame1, '/nonexistent/frame.jpg')

      expect(diff).toBe(1)

      fs.unlinkSync(frame1)
    })
  })

  describe('verifyDuration', () => {
    it('returns true for matching duration', () => {
      const result = verifyDuration(TEST_VIDEO_PATH, 10, 0.5)

      expect(result).toBe(true)
    })

    it('returns true within tolerance', () => {
      const result = verifyDuration(TEST_VIDEO_PATH, 10.3, 0.5)

      expect(result).toBe(true)
    })

    it('returns false outside tolerance', () => {
      const result = verifyDuration(TEST_VIDEO_PATH, 15, 0.5)

      expect(result).toBe(false)
    })
  })

  describe('createTestVideo', () => {
    it('creates video with correct duration', () => {
      const videoPath = path.join(FIXTURES_DIR, 'custom-duration.mp4')

      createTestVideo(videoPath, 3, 640, 480)

      const meta = getVideoMetadata(videoPath)
      expect(meta.duration).toBeCloseTo(3, 0)

      fs.unlinkSync(videoPath)
    })

    it('creates video with correct dimensions', () => {
      const videoPath = path.join(FIXTURES_DIR, 'custom-dimensions.mp4')

      createTestVideo(videoPath, 2, 1920, 1080)

      const meta = getVideoMetadata(videoPath)
      expect(meta.width).toBe(1920)
      expect(meta.height).toBe(1080)

      fs.unlinkSync(videoPath)
    })

    it('creates video with H.264 codec', () => {
      const videoPath = path.join(FIXTURES_DIR, 'check-codec.mp4')

      createTestVideo(videoPath, 2, 640, 480)

      const meta = getVideoMetadata(videoPath)
      expect(meta.codec).toBe('h264')

      fs.unlinkSync(videoPath)
    })
  })

  describe('cleanupTempFiles', () => {
    it('removes files matching pattern', () => {
      // Create some temp files
      const tempDir = os.tmpdir()
      const testFiles = [
        path.join(tempDir, 'cleanup-test-1.txt'),
        path.join(tempDir, 'cleanup-test-2.txt'),
        path.join(tempDir, 'other-file.txt'),
      ]

      testFiles.forEach(f => fs.writeFileSync(f, 'test'))

      cleanupTempFiles('cleanup-test')

      // cleanup-test files should be removed
      expect(fs.existsSync(testFiles[0])).toBe(false)
      expect(fs.existsSync(testFiles[1])).toBe(false)
      // other-file should remain
      expect(fs.existsSync(testFiles[2])).toBe(true)

      fs.unlinkSync(testFiles[2])
    })
  })
})

describe('SSIM comparison interpretation', () => {
  it('should understand SSIM score meanings', () => {
    // SSIM returns values where 1 = identical, 0 = completely different
    // We convert to difference: 0 = identical, 1 = completely different

    // Identical images: SSIM = 1.0, difference = 0.0
    expect(1 - 1.0).toBe(0)

    // Very similar images: SSIM = 0.95, difference = 0.05
    expect(1 - 0.95).toBeCloseTo(0.05, 2)

    // Similar images: SSIM = 0.85, difference = 0.15
    expect(1 - 0.85).toBeCloseTo(0.15, 2)

    // Moderately similar: SSIM = 0.70, difference = 0.30
    expect(1 - 0.70).toBeCloseTo(0.30, 2)

    // Our threshold of 0.5 means SSIM >= 0.5 (50% structural similarity)
    const threshold = 0.5
    expect(1 - 0.6).toBeLessThan(threshold) // 60% similar = passes
    expect(1 - 0.4).toBeGreaterThan(threshold) // 40% similar = fails
  })
})
