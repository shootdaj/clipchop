import { motion } from 'motion/react'
import { Download } from 'lucide-react'
import { VideoPreview } from './video-preview'

interface Segment {
  index: number
  filename: string
  blob?: Blob
  outputPath?: string
  status: 'pending' | 'processing' | 'complete' | 'error'
}

interface VideoPreviewGridProps {
  segments: Segment[]
  onDownload: (segment: Segment) => void
  onDownloadAll: () => void
}

// Optimized spring configs (removed overly bouncy ones that cause jank)
const fluidSpring = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 20,
  mass: 0.8,
}

export function VideoPreviewGrid({
  segments,
  onDownload,
  onDownloadAll
}: VideoPreviewGridProps) {
  const completedSegments = segments.filter(s => s.status === 'complete')

  const getVideoSource = (segment: Segment): string | Blob | undefined => {
    if (segment.blob) return segment.blob
    if (segment.outputPath) return segment.outputPath
    return undefined
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={fluidSpring}
      className="space-y-4"
    >
      {/* Header with Download All button */}
      <div className="flex items-center justify-between">
        <motion.h3
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={fluidSpring}
          className="text-lg font-semibold"
        >
          {completedSegments.length} clip{completedSegments.length !== 1 ? 's' : ''} ready
        </motion.h3>

        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={fluidSpring}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onDownloadAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium shadow-[0_4px_15px_rgba(168,85,247,0.4)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.5)] transition-shadow"
        >
          <Download className="w-4 h-4" />
          Download All
        </motion.button>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {completedSegments.map((segment, i) => {
          const src = getVideoSource(segment)
          if (!src) return null

          return (
            <motion.div
              key={segment.index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...fluidSpring, delay: Math.min(i * 0.03, 0.15) }}
            >
              <VideoPreview
                src={src}
                title={segment.filename}
                compact
                showDownload
                onDownload={() => onDownload(segment)}
              />
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
