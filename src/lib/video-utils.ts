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
