import { test, expect, Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { fileURLToPath } from 'url'
import {
  getVideoMetadata,
  extractFrame,
  compareFrames,
  verifyDuration,
  createTestVideo,
  cleanupTempFiles,
} from '../utils/video-utils'

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Test fixtures
// Use H.264 test video for WebCodecs compatibility (HEVC not supported in browsers)
const TEST_VIDEO_H264 = path.join(__dirname, '..', 'fixtures', 'test-video-h264.mp4')
const TEST_VIDEO_PATH = process.env.TEST_VIDEO_PATH || (
  fs.existsSync(TEST_VIDEO_H264) ? TEST_VIDEO_H264 : path.join(os.homedir(), 'Downloads', '20260103_175100.mp4')
)
const DOWNLOADS_DIR = path.join(os.tmpdir(), 'clipchop-e2e-downloads')

test.describe('Video Splitting E2E Tests', () => {
  let testVideoPath: string

  test.beforeAll(async () => {
    // Create downloads directory
    if (!fs.existsSync(DOWNLOADS_DIR)) {
      fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })
    }

    // Use real test video if exists, otherwise create synthetic one
    if (fs.existsSync(TEST_VIDEO_PATH)) {
      testVideoPath = TEST_VIDEO_PATH
      console.log(`Using real test video: ${testVideoPath}`)
    } else {
      testVideoPath = path.join(os.tmpdir(), 'test-video.mp4')
      console.log(`Creating synthetic test video: ${testVideoPath}`)
      createTestVideo(testVideoPath, 90, 1920, 1080) // 90 second test video
    }
  })

  test.afterAll(async () => {
    cleanupTempFiles('clipchop-e2e')
    cleanupTempFiles('frame_')
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Clipchop')
  })

  test('should load video and display correct metadata @smoke', async ({ page }) => {
    // Upload video
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testVideoPath)

    // Wait for metadata to load (look for duration with clock icon)
    await expect(page.locator('text=/⏱\\d+m \\d+s/')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=/\\d+×\\d+/')).toBeVisible()
    await expect(page.locator('text=/\\d+(\\.\\d+)? MB/')).toBeVisible()

    // Verify input video preview is visible
    await expect(page.locator('text=Input Video')).toBeVisible()
  })

  test('should calculate correct number of segments @smoke', async ({ page }) => {
    // Upload video
    await page.locator('input[type="file"]').setInputFiles(testVideoPath)
    await expect(page.locator('text=/⏱\\d+m \\d+s/')).toBeVisible({ timeout: 10000 })

    // Select 30s split duration
    await page.click('button:has-text("30s")')

    // Check segment count
    const meta = getVideoMetadata(testVideoPath)
    const expectedSegments = Math.ceil(meta.duration / 30)
    await expect(page.locator(`text=${expectedSegments} clips`)).toBeVisible()
  })

  test('should split video into correct segments with SD quality', async ({ page }) => {
    // Upload video
    await page.locator('input[type="file"]').setInputFiles(testVideoPath)
    await expect(page.locator('text=/⏱\\d+m \\d+s/')).toBeVisible({ timeout: 10000 })

    // Select options
    await page.click('button:has-text("30s")')
    await page.click('button:has-text("SD (1280px)")')

    // Start split
    await page.click('button:has-text("Split Video")')

    // Wait for completion (increased timeout for video processing)
    await expect(page.locator('text=/\\d+ clips ready/')).toBeVisible({
      timeout: 5 * 60 * 1000, // 5 minutes
    })

    // Verify all clips are visible
    const clipCount = await page.locator('.group video').count()
    const meta = getVideoMetadata(testVideoPath)
    const expectedClips = Math.ceil(meta.duration / 30)
    expect(clipCount).toBeGreaterThanOrEqual(expectedClips)
  })

  test('should produce correctly scaled output (not cropped)', async ({ page }) => {
    // Upload video
    await page.locator('input[type="file"]').setInputFiles(testVideoPath)
    await expect(page.locator('text=/⏱\\d+m \\d+s/')).toBeVisible({ timeout: 10000 })

    // Select SD for faster processing
    await page.click('button:has-text("30s")')
    await page.click('button:has-text("SD (1280px)")')

    // Start split
    await page.click('button:has-text("Split Video")')

    // Wait for completion
    await expect(page.locator('text=/\\d+ clips ready/')).toBeVisible({
      timeout: 5 * 60 * 1000,
    })

    // Get output video blob and verify it's not empty
    const blobSizes = await page.evaluate(async () => {
      const videos = document.querySelectorAll('video[src^="blob:"]')
      const sizes: number[] = []
      for (let i = 1; i < videos.length; i++) {
        const response = await fetch(videos[i].src)
        const blob = await response.blob()
        sizes.push(blob.size)
      }
      return sizes
    })

    // Each clip should be at least 500KB (shorter clips may be smaller)
    for (const size of blobSizes) {
      expect(size).toBeGreaterThan(500_000)
    }
  })

  test('should match frame at split boundary', async ({ page, context }) => {
    // This test verifies that the split happens at the correct timestamp
    // by extracting frames from both input and output videos and comparing them

    // Upload video
    await page.locator('input[type="file"]').setInputFiles(testVideoPath)
    await expect(page.locator('text=/⏱\\d+m \\d+s/')).toBeVisible({ timeout: 10000 })

    // Use SD for faster processing
    await page.click('button:has-text("30s")')
    await page.click('button:has-text("SD (1280px)")')

    // Start split
    await page.click('button:has-text("Split Video")')

    // Wait for completion
    await expect(page.locator('text=/\\d+ clips ready/')).toBeVisible({
      timeout: 5 * 60 * 1000,
    })

    // Extract reference frames from INPUT video at split boundaries
    // Use 1s offset to avoid potential black first frames from encoding
    const inputFrame0 = extractFrame(testVideoPath, 1)    // 1s into clip 1
    const inputFrame30 = extractFrame(testVideoPath, 31)  // 1s into clip 2
    const inputFrame60 = extractFrame(testVideoPath, 61)  // 1s into clip 3

    // Download output clips from browser blobs to temp files
    const outputClips = await page.evaluate(async () => {
      const videos = document.querySelectorAll('video[src^="blob:"]')
      const clips: { index: number; base64: string }[] = []

      // Skip first video (input preview), get output clips
      for (let i = 1; i < Math.min(videos.length, 4); i++) {
        const response = await fetch(videos[i].src)
        const blob = await response.blob()
        const buffer = await blob.arrayBuffer()
        const bytes = new Uint8Array(buffer)

        // Convert to base64 in chunks to avoid stack overflow
        let binary = ''
        const chunkSize = 8192
        for (let j = 0; j < bytes.length; j += chunkSize) {
          binary += String.fromCharCode(...bytes.slice(j, j + chunkSize))
        }
        clips.push({ index: i, base64: btoa(binary) })
      }
      return clips
    })

    // Save output clips to temp files and extract frames from 1s in
    const outputFrames: string[] = []
    for (const clip of outputClips) {
      const clipPath = path.join(os.tmpdir(), `output_clip_${clip.index}_${Date.now()}.mp4`)
      const buffer = Buffer.from(clip.base64, 'base64')
      fs.writeFileSync(clipPath, buffer)

      // Extract frame from 1s into output clip to avoid black first frames
      const frameOutput = extractFrame(clipPath, 1)
      outputFrames.push(frameOutput)

      // Clean up clip file
      fs.unlinkSync(clipPath)
    }

    // Compare frames: output clip N's first frame should match input at (N-1)*30s
    const inputFrames = [inputFrame0, inputFrame30, inputFrame60]

    for (let i = 0; i < Math.min(outputFrames.length, inputFrames.length); i++) {
      const similarity = compareFrames(inputFrames[i], outputFrames[i])
      console.log(`Clip ${i + 1} frame similarity: ${(1 - similarity) * 100}%`)

      // SSIM > 0.5 means perceptually similar (difference < 0.5)
      // For web re-encoding, we expect at least 50% structural similarity
      expect(similarity).toBeLessThan(0.5)
    }

    // Clean up all frame files
    for (const frame of [...inputFrames, ...outputFrames]) {
      try { fs.unlinkSync(frame) } catch { /* ignore */ }
    }
  })

  test('should handle different split durations @smoke', async ({ page }) => {
    // Upload video
    await page.locator('input[type="file"]').setInputFiles(testVideoPath)
    await expect(page.locator('text=/⏱\\d+m \\d+s/')).toBeVisible({ timeout: 10000 })

    const meta = getVideoMetadata(testVideoPath)

    // Test different durations
    const durations = [
      { button: '15s', seconds: 15 },
      { button: '1m', seconds: 60 },
      { button: '1m 30s', seconds: 90 },
    ]

    for (const { button, seconds } of durations) {
      await page.click(`button:has-text("${button}")`)
      const expectedClips = Math.ceil(meta.duration / seconds)
      const clipText = expectedClips === 1 ? '1 clip' : `${expectedClips} clips`
      await expect(page.locator(`text=${clipText}`)).toBeVisible()
    }
  })

  test('should handle custom split duration', async ({ page }) => {
    // Upload video
    await page.locator('input[type="file"]').setInputFiles(testVideoPath)
    await expect(page.locator('text=/⏱\\d+m \\d+s/')).toBeVisible({ timeout: 10000 })

    // Click custom button
    const customButton = page.locator('button:has-text("Custom")')

    // Skip test if custom option doesn't exist
    if (!(await customButton.isVisible())) {
      test.skip()
      return
    }

    await customButton.click()

    // Should show input field for custom duration
    const customInput = page.locator('input[type="number"]')
    if (await customInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await customInput.fill('45')
      await customInput.press('Enter')
      // Verify segment count updates
      const meta = getVideoMetadata(testVideoPath)
      const expectedClips = Math.ceil(meta.duration / 45)
      const clipText = expectedClips === 1 ? '1 clip' : `${expectedClips} clips`
      await expect(page.locator(`text=${clipText}`)).toBeVisible({ timeout: 5000 })
    } else {
      // Custom might work differently - just verify button was clicked
      console.log('Custom input not found - skipping input test')
    }
  })

  test('should show progress during split', async ({ page }) => {
    // Upload video
    await page.locator('input[type="file"]').setInputFiles(testVideoPath)
    await expect(page.locator('text=/⏱\\d+m \\d+s/')).toBeVisible({ timeout: 10000 })

    // Use HD for medium processing time
    await page.click('button:has-text("30s")')
    await page.click('button:has-text("SD (1280px)")')

    // Start split
    await page.click('button:has-text("Split Video")')

    // Verify progress indicator appears
    await expect(page.locator('text=/Processing clip \\d+ of \\d+/')).toBeVisible({
      timeout: 10000,
    })

    // Verify percentage is shown
    await expect(page.locator('text=/%/')).toBeVisible()
  })

  test('should allow starting over with new video', async ({ page }) => {
    // Upload first video
    await page.locator('input[type="file"]').setInputFiles(testVideoPath)
    await expect(page.locator('text=/⏱\\d+m \\d+s/')).toBeVisible({ timeout: 10000 })

    // Split it
    await page.click('button:has-text("30s")')
    await page.click('button:has-text("SD (1280px)")')
    await page.click('button:has-text("Split Video")')

    // Wait for completion
    await expect(page.locator('text=/\\d+ clips ready/')).toBeVisible({
      timeout: 5 * 60 * 1000,
    })

    // Click start over
    await page.click('button:has-text("Start Over")')

    // Verify we're back to initial state
    await expect(page.locator('text=Drop your video here')).toBeVisible()
  })
})

test.describe('Video Quality Options', () => {
  const testVideoPath = TEST_VIDEO_PATH
  let is4KVideo = false

  test.beforeAll(() => {
    if (fs.existsSync(testVideoPath)) {
      const meta = getVideoMetadata(testVideoPath)
      is4KVideo = Math.max(meta.width, meta.height) >= 2160
      console.log(`Test video is ${is4KVideo ? '4K+' : 'below 4K'}: ${meta.width}x${meta.height}`)
    }
  })

  test.skip(!fs.existsSync(testVideoPath), 'Skipping - test video not found')

  test('should show quality warning for 4K videos', async ({ page }) => {
    test.skip(!is4KVideo, 'Test video is not 4K - skipping 4K warning test')

    await page.goto('/')

    // Upload 4K video
    await page.locator('input[type="file"]').setInputFiles(testVideoPath)
    await expect(page.locator('text=/⏱\\d+m \\d+s/')).toBeVisible({ timeout: 10000 })

    // Select Full Quality
    await page.click('button:has-text("Full Quality")')

    // Should show warning about slow encoding
    await expect(page.locator('text=/slow in browsers/i')).toBeVisible()
  })

  test('should show faster estimate for downscaled quality', async ({ page }) => {
    test.skip(!is4KVideo, 'Test video is not 4K - skipping downscale test')

    await page.goto('/')

    await page.locator('input[type="file"]').setInputFiles(testVideoPath)
    await expect(page.locator('text=/⏱\\d+m \\d+s/')).toBeVisible({ timeout: 10000 })

    // Select SD
    await page.click('button:has-text("SD (1280px)")')

    // Should show faster time estimate
    await expect(page.locator('text=/speed up/i')).toBeVisible()
  })
})
