import { motion } from 'motion/react'
import type { VideoMetadata } from '@/hooks/use-video-splitter'

interface VideoInfoProps {
  metadata: VideoMetadata
  onRemove: () => void
}

const fluidSpring = {
  type: 'spring' as const,
  stiffness: 120,
  damping: 14,
  mass: 1,
}

const bouncySpring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 25,
  mass: 0.5,
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins === 0) return `${secs}s`
  return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function VideoInfo({ metadata, onRemove }: VideoInfoProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={fluidSpring}
      className="card-3d p-5"
    >
      <div className="flex items-center gap-4">
        {/* Video icon with 3D effect */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...bouncySpring, delay: 0.1 }}
          className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center flex-shrink-0 shadow-[0_4px_15px_rgba(168,85,247,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]"
        >
          <svg
            className="w-7 h-7 text-primary icon-3d"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </motion.div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <motion.p
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...fluidSpring, delay: 0.15 }}
            className="font-bold text-lg truncate"
          >
            {metadata.filename}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...fluidSpring, delay: 0.2 }}
            className="flex flex-wrap gap-3 mt-2"
          >
            {[
              { label: formatDuration(metadata.duration), icon: '⏱' },
              { label: `${metadata.width}×${metadata.height}`, icon: '📐' },
              { label: formatSize(metadata.size), icon: '💾' },
            ].map((item, i) => (
              <motion.span
                key={item.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...bouncySpring, delay: 0.25 + i * 0.05 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-secondary/50 text-secondary-foreground"
              >
                <span className="text-[10px]">{item.icon}</span>
                {item.label}
              </motion.span>
            ))}
          </motion.div>
        </div>

        {/* Remove button with 3D effect */}
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...bouncySpring, delay: 0.3 }}
          whileHover={{ scale: 1.15, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onRemove}
          className="p-2.5 rounded-xl bg-gradient-to-br from-muted to-muted/50 text-muted-foreground hover:text-destructive hover:from-destructive/20 hover:to-destructive/10 transition-colors shadow-[0_2px_0_rgba(10,10,18,1),0_4px_8px_rgba(0,0,0,0.2)]"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  )
}
