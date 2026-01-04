import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import type { SplitSegment } from '@/hooks/use-video-splitter'

interface SplitPreviewProps {
  segments: SplitSegment[]
  totalDuration: number
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

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function SplitPreview({ segments, totalDuration }: SplitPreviewProps) {
  if (segments.length === 0) return null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fluidSpring}
      className="card-3d p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Split Preview
        </h3>
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={bouncySpring}
          className="px-3 py-1 rounded-full text-sm font-bold bg-primary/20 text-primary"
        >
          {segments.length} clip{segments.length !== 1 ? 's' : ''}
        </motion.span>
      </div>

      {/* Visual timeline with 3D inset */}
      <div className="relative h-12 card-3d-inset rounded-xl overflow-hidden">
        <div className="absolute inset-0 flex">
          {segments.map((segment, index) => {
            const widthPercent = (segment.duration / totalDuration) * 100
            // Purple-based gradient colors
            const colors = [
              'from-violet-500/90 to-violet-600/90',
              'from-purple-500/90 to-purple-600/90',
              'from-fuchsia-500/90 to-fuchsia-600/90',
              'from-pink-500/90 to-pink-600/90',
              'from-indigo-500/90 to-indigo-600/90',
              'from-amber-500/90 to-amber-600/90',
            ]

            return (
              <motion.div
                key={segment.index}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ ...fluidSpring, delay: index * 0.05 }}
                style={{ width: `${widthPercent}%`, originX: 0 }}
                className={cn(
                  'segment-bar',
                  'h-full border-r border-background/30 last:border-r-0',
                  'flex items-center justify-center',
                  'bg-gradient-to-b',
                  colors[index % colors.length],
                  'cursor-pointer'
                )}
              >
                {widthPercent > 6 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="text-sm font-bold text-white/90 drop-shadow-md"
                  >
                    {index + 1}
                  </motion.span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Segment list with 3D items */}
      <motion.ul layout className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
        {segments.map((segment, index) => (
          <motion.li
            key={segment.index}
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ ...fluidSpring, delay: index * 0.03 }}
            whileHover={{ scale: 1.02, x: 4 }}
            className={cn(
              'flex items-center justify-between',
              'px-4 py-3 rounded-xl text-sm',
              'bg-gradient-to-r from-secondary/30 to-transparent',
              'border border-border/50',
              'cursor-pointer transition-colors hover:border-primary/30'
            )}
          >
            <div className="flex items-center gap-3">
              <motion.span
                whileHover={{ scale: 1.2, rotate: 10 }}
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-accent/20 text-primary flex items-center justify-center text-sm font-bold shadow-[0_2px_8px_rgba(168,85,247,0.3)]"
              >
                {index + 1}
              </motion.span>
              <span className="text-foreground font-medium">
                <span className="text-muted-foreground">{formatTime(segment.startTime)}</span>
                <span className="text-primary mx-2">→</span>
                <span className="text-muted-foreground">{formatTime(segment.endTime)}</span>
              </span>
            </div>
            <span className="text-muted-foreground/70 text-xs truncate max-w-[140px] font-mono">
              {segment.filename}
            </span>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  )
}
