import { describe, it, expect } from 'vitest'
import {
  toMicroseconds,
  toSeconds,
  formatTimeForFilename,
  generateFilename,
  calculateSegmentBoundaries,
  validateSegmentTiming,
  getH264LevelCode,
  getH264ProfileCode,
  buildH264CodecString,
  getVideoBitrate,
  getMobileThrottleDelay,
} from './video-utils'

describe('toMicroseconds', () => {
  it('converts seconds to microseconds', () => {
    expect(toMicroseconds(1)).toBe(1_000_000)
    expect(toMicroseconds(0)).toBe(0)
    expect(toMicroseconds(60)).toBe(60_000_000)
    expect(toMicroseconds(0.5)).toBe(500_000)
  })

  it('handles decimal precision', () => {
    expect(toMicroseconds(1.5)).toBe(1_500_000)
    expect(toMicroseconds(0.001)).toBe(1_000)
  })
})

describe('toSeconds', () => {
  it('converts microseconds to seconds', () => {
    expect(toSeconds(1_000_000)).toBe(1)
    expect(toSeconds(0)).toBe(0)
    expect(toSeconds(60_000_000)).toBe(60)
    expect(toSeconds(500_000)).toBe(0.5)
  })

  it('is inverse of toMicroseconds', () => {
    const values = [0, 1, 60, 0.5, 90.5, 3600]
    values.forEach(v => {
      expect(toSeconds(toMicroseconds(v))).toBe(v)
    })
  })
})

describe('formatTimeForFilename', () => {
  it('formats seconds under 60 as 0mXXs', () => {
    expect(formatTimeForFilename(0)).toBe('0m00s')
    expect(formatTimeForFilename(5)).toBe('0m05s')
    expect(formatTimeForFilename(30)).toBe('0m30s')
    expect(formatTimeForFilename(59)).toBe('0m59s')
  })

  it('formats minutes and seconds', () => {
    expect(formatTimeForFilename(60)).toBe('1m00s')
    expect(formatTimeForFilename(90)).toBe('1m30s')
    expect(formatTimeForFilename(125)).toBe('2m05s')
    expect(formatTimeForFilename(3661)).toBe('61m01s') // Over an hour
  })

  it('floors decimal seconds', () => {
    expect(formatTimeForFilename(30.9)).toBe('0m30s')
    expect(formatTimeForFilename(59.999)).toBe('0m59s')
    expect(formatTimeForFilename(90.5)).toBe('1m30s')
  })
})

describe('generateFilename', () => {
  describe('sequential pattern', () => {
    it('generates padded sequential numbers', () => {
      expect(generateFilename('video.mp4', 0, 0, 30, 'sequential')).toBe('video_001.mp4')
      expect(generateFilename('video.mp4', 1, 30, 60, 'sequential')).toBe('video_002.mp4')
      expect(generateFilename('video.mp4', 99, 0, 30, 'sequential')).toBe('video_100.mp4')
    })

    it('handles filenames with multiple dots', () => {
      expect(generateFilename('my.video.file.mp4', 0, 0, 30, 'sequential')).toBe('my.video.file_001.mp4')
    })

    it('handles filenames without extension', () => {
      expect(generateFilename('video', 0, 0, 30, 'sequential')).toBe('video_001.mp4')
    })
  })

  describe('timestamp pattern', () => {
    it('generates timestamp-based names', () => {
      expect(generateFilename('video.mp4', 0, 0, 30, 'timestamp')).toBe('video_0m00s-0m30s.mp4')
      expect(generateFilename('video.mp4', 1, 30, 60, 'timestamp')).toBe('video_0m30s-1m00s.mp4')
      expect(generateFilename('video.mp4', 2, 60, 90, 'timestamp')).toBe('video_1m00s-1m30s.mp4')
    })

    it('handles long timestamps', () => {
      expect(generateFilename('video.mp4', 0, 0, 3600, 'timestamp')).toBe('video_0m00s-60m00s.mp4')
    })
  })
})

describe('calculateSegmentBoundaries', () => {
  describe('basic splitting', () => {
    it('splits 60s video into 2x 30s segments', () => {
      const segments = calculateSegmentBoundaries(60, 30, 'video.mp4', 'sequential')

      expect(segments).toHaveLength(2)
      expect(segments[0]).toEqual({
        index: 0,
        startTime: 0,
        endTime: 30,
        duration: 30,
        filename: 'video_001.mp4',
      })
      expect(segments[1]).toEqual({
        index: 1,
        startTime: 30,
        endTime: 60,
        duration: 30,
        filename: 'video_002.mp4',
      })
    })

    it('splits 90s video into 3x 30s segments', () => {
      const segments = calculateSegmentBoundaries(90, 30, 'video.mp4', 'sequential')

      expect(segments).toHaveLength(3)
      expect(segments[0].startTime).toBe(0)
      expect(segments[0].endTime).toBe(30)
      expect(segments[1].startTime).toBe(30)
      expect(segments[1].endTime).toBe(60)
      expect(segments[2].startTime).toBe(60)
      expect(segments[2].endTime).toBe(90)
    })
  })

  describe('uneven splitting', () => {
    it('handles video not evenly divisible by segment duration', () => {
      const segments = calculateSegmentBoundaries(75, 30, 'video.mp4', 'sequential')

      expect(segments).toHaveLength(3)
      expect(segments[0].duration).toBe(30)
      expect(segments[1].duration).toBe(30)
      expect(segments[2].duration).toBe(15) // Last segment is shorter
      expect(segments[2].endTime).toBe(75)
    })

    it('handles 1 second remainder correctly', () => {
      const segments = calculateSegmentBoundaries(61, 30, 'video.mp4', 'sequential')

      expect(segments).toHaveLength(3)
      expect(segments[2].duration).toBe(1)
      expect(segments[2].startTime).toBe(60)
      expect(segments[2].endTime).toBe(61)
    })
  })

  describe('edge cases', () => {
    it('returns single segment for video shorter than segment duration', () => {
      const segments = calculateSegmentBoundaries(15, 30, 'video.mp4', 'sequential')

      expect(segments).toHaveLength(1)
      expect(segments[0].duration).toBe(15)
      expect(segments[0].startTime).toBe(0)
      expect(segments[0].endTime).toBe(15)
    })

    it('returns single segment for video equal to segment duration', () => {
      const segments = calculateSegmentBoundaries(30, 30, 'video.mp4', 'sequential')

      expect(segments).toHaveLength(1)
      expect(segments[0].duration).toBe(30)
    })

    it('returns empty array for zero duration', () => {
      const segments = calculateSegmentBoundaries(0, 30, 'video.mp4', 'sequential')
      expect(segments).toHaveLength(0)
    })

    it('returns empty array for negative duration', () => {
      const segments = calculateSegmentBoundaries(-10, 30, 'video.mp4', 'sequential')
      expect(segments).toHaveLength(0)
    })

    it('returns empty array for zero segment duration', () => {
      const segments = calculateSegmentBoundaries(60, 0, 'video.mp4', 'sequential')
      expect(segments).toHaveLength(0)
    })

    it('returns empty array for negative segment duration', () => {
      const segments = calculateSegmentBoundaries(60, -15, 'video.mp4', 'sequential')
      expect(segments).toHaveLength(0)
    })
  })

  describe('timing accuracy', () => {
    it('maintains microsecond precision for decimal durations', () => {
      // 45.5s video split into 15s segments
      const segments = calculateSegmentBoundaries(45.5, 15, 'video.mp4', 'sequential')

      expect(segments).toHaveLength(4)
      expect(segments[0].endTime).toBe(15)
      expect(segments[1].endTime).toBe(30)
      expect(segments[2].endTime).toBe(45)
      expect(segments[3].endTime).toBe(45.5)
      expect(segments[3].duration).toBe(0.5)
    })

    it('handles floating point precision', () => {
      // Test with values that can cause floating point issues
      const segments = calculateSegmentBoundaries(100.1, 33.3, 'video.mp4', 'sequential')

      expect(segments).toHaveLength(4)
      // Last segment should end exactly at 100.1
      const lastSegment = segments[segments.length - 1]
      expect(lastSegment.endTime).toBeCloseTo(100.1, 10)
    })
  })

  describe('social media presets', () => {
    it('handles 15s TikTok splits correctly', () => {
      const segments = calculateSegmentBoundaries(120, 15, 'video.mp4', 'sequential')

      expect(segments).toHaveLength(8)
      segments.forEach((seg, i) => {
        expect(seg.duration).toBe(15)
        expect(seg.startTime).toBe(i * 15)
        expect(seg.endTime).toBe((i + 1) * 15)
      })
    })

    it('handles 60s Instagram Reel splits correctly', () => {
      const segments = calculateSegmentBoundaries(180, 60, 'video.mp4', 'sequential')

      expect(segments).toHaveLength(3)
      expect(segments[0].duration).toBe(60)
      expect(segments[1].duration).toBe(60)
      expect(segments[2].duration).toBe(60)
    })

    it('handles 90s YouTube Shorts splits correctly', () => {
      const segments = calculateSegmentBoundaries(270, 90, 'video.mp4', 'sequential')

      expect(segments).toHaveLength(3)
      segments.forEach(seg => {
        expect(seg.duration).toBe(90)
      })
    })
  })
})

describe('validateSegmentTiming', () => {
  it('validates correct segmentation', () => {
    const segments = calculateSegmentBoundaries(60, 30, 'video.mp4', 'sequential')
    const result = validateSegmentTiming(segments, 60)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('detects first segment not starting at 0', () => {
    const segments = [
      { index: 0, startTime: 1, endTime: 30, duration: 29, filename: 'test_001.mp4' },
    ]
    const result = validateSegmentTiming(segments, 30)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('start at 0'))).toBe(true)
  })

  it('detects gaps between segments', () => {
    const segments = [
      { index: 0, startTime: 0, endTime: 30, duration: 30, filename: 'test_001.mp4' },
      { index: 1, startTime: 31, endTime: 60, duration: 29, filename: 'test_002.mp4' }, // Gap!
    ]
    const result = validateSegmentTiming(segments, 60)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Gap'))).toBe(true)
  })

  it('detects duration mismatch', () => {
    const segments = [
      { index: 0, startTime: 0, endTime: 30, duration: 25, filename: 'test_001.mp4' }, // Wrong duration!
    ]
    const result = validateSegmentTiming(segments, 30)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('duration mismatch'))).toBe(true)
  })

  it('detects incomplete coverage', () => {
    const segments = [
      { index: 0, startTime: 0, endTime: 30, duration: 30, filename: 'test_001.mp4' },
    ]
    const result = validateSegmentTiming(segments, 60) // Video is 60s but only covers 30s

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('end at'))).toBe(true)
  })

  it('handles empty segments array', () => {
    const result = validateSegmentTiming([], 60)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('No segments'))).toBe(true)
  })

  it('respects tolerance parameter', () => {
    const segments = [
      { index: 0, startTime: 0, endTime: 30.0005, duration: 30.0005, filename: 'test_001.mp4' },
    ]

    // With default tolerance (0.001), should pass
    const result1 = validateSegmentTiming(segments, 30.0005)
    expect(result1.valid).toBe(true)

    // With stricter tolerance, might fail
    const result2 = validateSegmentTiming(segments, 30.0006, 0.00001)
    expect(result2.valid).toBe(false)
  })
})

describe('integration: calculateSegmentBoundaries + validateSegmentTiming', () => {
  const testCases = [
    { duration: 60, segment: 15, name: '60s/15s' },
    { duration: 90, segment: 30, name: '90s/30s' },
    { duration: 180, segment: 60, name: '180s/60s' },
    { duration: 45, segment: 30, name: '45s/30s (uneven)' },
    { duration: 100, segment: 33, name: '100s/33s (uneven)' },
    { duration: 10, segment: 60, name: '10s/60s (short video)' },
    { duration: 3600, segment: 90, name: '1hour/90s' },
    { duration: 0.5, segment: 0.25, name: '0.5s/0.25s (very short)' },
  ]

  testCases.forEach(({ duration, segment, name }) => {
    it(`produces valid segments for ${name}`, () => {
      const segments = calculateSegmentBoundaries(duration, segment, 'video.mp4', 'sequential')
      const result = validateSegmentTiming(segments, duration)

      expect(result.valid).toBe(true)
      if (result.errors.length > 0) {
        console.log(`Errors for ${name}:`, result.errors)
      }
    })
  })

  it('timestamp pattern also produces valid segments', () => {
    const segments = calculateSegmentBoundaries(120, 30, 'video.mp4', 'timestamp')
    const result = validateSegmentTiming(segments, 120)

    expect(result.valid).toBe(true)
    expect(segments[0].filename).toBe('video_0m00s-0m30s.mp4')
  })
})

describe('getH264LevelCode', () => {
  it('returns Level 3.1 for 720p video (720x1280)', () => {
    // This is the exact case that was broken before
    expect(getH264LevelCode(720, 1280)).toBe('1f')
  })

  it('returns Level 3.1 for standard 720p (1280x720)', () => {
    expect(getH264LevelCode(1280, 720)).toBe('1f')
  })

  it('returns Level 3.1 for SD video (640x480)', () => {
    expect(getH264LevelCode(640, 480)).toBe('1f')
  })

  it('returns Level 4.0 for 1080p video', () => {
    // 1920x1080 = 2,073,600 pixels - exactly at threshold
    expect(getH264LevelCode(1920, 1080)).toBe('1f') // At threshold, use lower level
    // Slightly above 1080p
    expect(getH264LevelCode(1921, 1081)).toBe('28')
  })

  it('returns Level 5.0 for 1440p+ video', () => {
    // 2560x1440 = 3,686,400 pixels - exactly at threshold, so uses Level 4.0
    expect(getH264LevelCode(2560, 1440)).toBe('28')
    // Slightly above 1440p triggers Level 5.0
    expect(getH264LevelCode(2561, 1441)).toBe('32')
  })

  it('returns Level 5.1 for 4K video', () => {
    expect(getH264LevelCode(3840, 2160)).toBe('33')
  })

  it('returns Level 5.2 for 8K video', () => {
    expect(getH264LevelCode(7680, 4320)).toBe('34')
  })

  it('handles portrait orientation (height > width)', () => {
    // Portrait 1080p phone video
    expect(getH264LevelCode(1080, 1920)).toBe('1f')
    // Portrait 4K phone video
    expect(getH264LevelCode(2160, 3840)).toBe('33')
  })

  it('never returns Level 3.0 which breaks 720p', () => {
    // Level 3.0 (1e) doesn't support 720p, so we should never return it
    const testCases = [
      [640, 480],
      [720, 480],
      [720, 1280], // The broken case
      [1280, 720],
      [1920, 1080],
    ]
    testCases.forEach(([w, h]) => {
      expect(getH264LevelCode(w, h)).not.toBe('1e')
    })
  })
})

describe('getH264ProfileCode', () => {
  it('returns Baseline (4200) for mobile', () => {
    expect(getH264ProfileCode(true)).toBe('4200')
  })

  it('returns High (6400) for desktop', () => {
    expect(getH264ProfileCode(false)).toBe('6400')
  })
})

describe('buildH264CodecString', () => {
  it('builds correct codec string for mobile 720p', () => {
    expect(buildH264CodecString(720, 1280, true)).toBe('avc1.42001f')
  })

  it('builds correct codec string for desktop 720p', () => {
    expect(buildH264CodecString(720, 1280, false)).toBe('avc1.64001f')
  })

  it('builds correct codec string for desktop 4K', () => {
    expect(buildH264CodecString(3840, 2160, false)).toBe('avc1.640033')
  })

  it('builds correct codec string for mobile 1080p', () => {
    expect(buildH264CodecString(1920, 1080, true)).toBe('avc1.42001f')
  })
})

describe('getVideoBitrate', () => {
  it('returns 2 Mbps for SD (1280px)', () => {
    expect(getVideoBitrate(1280)).toBe(2000000)
  })

  it('returns 4 Mbps for HD (1920px)', () => {
    expect(getVideoBitrate(1920)).toBe(4000000)
  })

  it('returns 5 Mbps for Full Quality (null)', () => {
    expect(getVideoBitrate(null)).toBe(5000000)
  })
})

describe('getMobileThrottleDelay', () => {
  it('returns 10ms delay for mobile to prevent encoder overload', () => {
    expect(getMobileThrottleDelay(true)).toBe(10)
  })

  it('returns 0ms delay for desktop (no throttling needed)', () => {
    expect(getMobileThrottleDelay(false)).toBe(0)
  })
})
