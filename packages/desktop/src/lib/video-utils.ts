// Pure utility functions for video splitting - extracted for testability

export interface SegmentCalculation {
  index: number
  startTime: number // seconds
  endTime: number // seconds
  duration: number // seconds
  filename: string
}

// Convert seconds to microseconds (WebAV uses μs)
export const toMicroseconds = (seconds: number): number => seconds * 1_000_000

// Convert microseconds to seconds
export const toSeconds = (microseconds: number): number => microseconds / 1_000_000

// Format time for filename (e.g., "1m30s")
export const formatTimeForFilename = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}m${secs.toString().padStart(2, '0')}s`
}

// Generate filename based on pattern
export const generateFilename = (
  originalName: string,
  index: number,
  startTime: number,
  endTime: number,
  pattern: 'sequential' | 'timestamp'
): string => {
  const baseName = originalName.replace(/\.[^/.]+$/, '') // Remove extension

  if (pattern === 'timestamp') {
    return `${baseName}_${formatTimeForFilename(startTime)}-${formatTimeForFilename(endTime)}.mp4`
  }

  // Sequential pattern
  return `${baseName}_${String(index + 1).padStart(3, '0')}.mp4`
}

// Calculate segment boundaries for a video
export const calculateSegmentBoundaries = (
  totalDuration: number,
  segmentDuration: number,
  originalFilename: string,
  namingPattern: 'sequential' | 'timestamp'
): SegmentCalculation[] => {
  if (totalDuration <= 0 || segmentDuration <= 0) {
    return []
  }

  const segments: SegmentCalculation[] = []
  let currentTime = 0
  let index = 0

  while (currentTime < totalDuration) {
    const endTime = Math.min(currentTime + segmentDuration, totalDuration)
    const actualDuration = endTime - currentTime

    segments.push({
      index,
      startTime: currentTime,
      endTime,
      duration: actualDuration,
      filename: generateFilename(originalFilename, index, currentTime, endTime, namingPattern),
    })

    currentTime = endTime
    index++
  }

  return segments
}

// H.264 level codes based on resolution
// Level 3.0 (1e) only supports up to 720x480
// Level 3.1 (1f) supports up to 1280x720
// Level 4.0 (28) supports up to 1920x1080
// Level 5.0+ supports 4K and above
export const getH264LevelCode = (width: number, height: number): string => {
  const totalPixels = width * height

  if (totalPixels > 8912896) {
    return '34' // Level 5.2 for 4K+
  } else if (totalPixels > 5652480) {
    return '33' // Level 5.1
  } else if (totalPixels > 3686400) {
    return '32' // Level 5.0
  } else if (totalPixels > 2073600) {
    return '28' // Level 4.0
  } else {
    return '1f' // Level 3.1 (safe for 720p-1080p)
  }
}

// Get H.264 profile code based on device type
// Baseline (42) for mobile compatibility, High (64) for desktop compression
export const getH264ProfileCode = (isMobile: boolean): string => {
  return isMobile ? '4200' : '6400'
}

// Build full H.264 codec string (e.g., "avc1.64001f")
export const buildH264CodecString = (width: number, height: number, isMobile: boolean): string => {
  const profile = getH264ProfileCode(isMobile)
  const level = getH264LevelCode(width, height)
  return `avc1.${profile}${level}`
}

// Get appropriate bitrate based on resolution
export const getVideoBitrate = (maxResolution: number | null): number => {
  if (maxResolution === 1280) {
    return 2000000 // 2 Mbps for SD
  } else if (maxResolution === 1920) {
    return 4000000 // 4 Mbps for HD
  }
  return 5000000 // 5 Mbps default
}

// Validate segment timing accuracy
export const validateSegmentTiming = (
  segments: SegmentCalculation[],
  expectedTotalDuration: number,
  tolerance: number = 0.001 // 1ms tolerance
): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (segments.length === 0) {
    errors.push('No segments generated')
    return { valid: false, errors }
  }

  // Check first segment starts at 0
  if (segments[0].startTime !== 0) {
    errors.push(`First segment should start at 0, got ${segments[0].startTime}`)
  }

  // Check segments are contiguous
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1]
    const curr = segments[i]
    if (Math.abs(prev.endTime - curr.startTime) > tolerance) {
      errors.push(`Gap between segment ${i - 1} end (${prev.endTime}) and segment ${i} start (${curr.startTime})`)
    }
  }

  // Check each segment's duration matches its boundaries
  for (const segment of segments) {
    const calculatedDuration = segment.endTime - segment.startTime
    if (Math.abs(calculatedDuration - segment.duration) > tolerance) {
      errors.push(`Segment ${segment.index} duration mismatch: ${segment.duration} vs calculated ${calculatedDuration}`)
    }
  }

  // Check total coverage
  const lastSegment = segments[segments.length - 1]
  if (Math.abs(lastSegment.endTime - expectedTotalDuration) > tolerance) {
    errors.push(`Last segment should end at ${expectedTotalDuration}, got ${lastSegment.endTime}`)
  }

  return { valid: errors.length === 0, errors }
}
