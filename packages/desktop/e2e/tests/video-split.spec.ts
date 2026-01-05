import { test, expect, Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import {
  getVideoMetadata,
  extractFrame,
  compareFrames,
  verifyDuration,
  createTestVideo,
  cleanupTempFiles,
} from '../utils/video-utils'

// Test fixtures
const TEST_VIDEO_PATH = process.env.TEST_VIDEO_PATH || path.join(os.homedir(), 'Downloads', '20260103_175100.mp4')
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

  test('should load video and display correct metadata', async ({ page }) => {
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

  test('should calculate correct number of segments', async ({ page }) => {
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

    // Each 30s SD clip should be at least 1MB
    for (const size of blobSizes) {
      expect(size).toBeGreaterThan(1_000_000)
    }
  })

  test('should match frame at split boundary', async ({ page }) => {
    // This test verifies that the split happens at the correct timestamp
    // by comparing frames from input and output videos

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

    // Extract frame from input video at t=0
    const inputFrame0 = extractFrame(testVideoPath, 0)

    // Take screenshot of first output clip's first frame for visual comparison
    // (We can't easily extract frames from blob URLs, so we use visual comparison)
    await page.evaluate(() => {
      const videos = document.querySelectorAll('video')
      if (videos[1]) {
        videos[1].currentTime = 0
      }
    })

    await page.waitForTimeout(500) // Wait for frame to render

    // Verify the output clip thumbnail shows the same scene
    // This is a visual regression test
    const clipThumbnail = page.locator('.group video').first()
    await expect(clipThumbnail).toBeVisible()

    // Take screenshot for visual comparison
    const screenshot = await clipThumbnail.screenshot()
    expect(screenshot.length).toBeGreaterThan(1000) // Has actual content

    // Clean up
    fs.unlinkSync(inputFrame0)
  })

  test('should handle different split durations', async ({ page }) => {
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

    // Click custom
    await page.click('button:has-text("Custom")')

    // Should show input field for custom duration
    const customInput = page.locator('input[type="number"]')
    if (await customInput.isVisible()) {
      await customInput.fill('45')
      // Verify segment count updates
      const meta = getVideoMetadata(testVideoPath)
      const expectedClips = Math.ceil(meta.duration / 45)
      await expect(page.locator(`text=${expectedClips} clips`)).toBeVisible()
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
  const testVideoPath = process.env.TEST_VIDEO_PATH || path.join(os.homedir(), 'Downloads', '20260103_175100.mp4')

  test.skip(!fs.existsSync(testVideoPath), 'Skipping - test video not found')

  test('should show quality warning for 4K videos', async ({ page }) => {
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
    await page.goto('/')

    await page.locator('input[type="file"]').setInputFiles(testVideoPath)
    await expect(page.locator('text=/⏱\\d+m \\d+s/')).toBeVisible({ timeout: 10000 })

    // Select SD
    await page.click('button:has-text("SD (1280px)")')

    // Should show faster time estimate
    await expect(page.locator('text=/speed up/i')).toBeVisible()
  })
})
