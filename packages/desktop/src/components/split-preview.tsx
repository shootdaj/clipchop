import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import type { SplitSegment } from '@/hooks/use-video-splitter'

interface SplitPreviewProps {
  segments: SplitSegment[]
  totalDuration: number
}

const bouncySpring = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 22,
  mass: 0.6,
}

// Linear transition - constant speed, no easing
const linearTransition = {
  duration: 0.2,
  ease: 'linear' as const,
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
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
          <AnimatePresence mode="popLayout">
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
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercent}%` }}
                  exit={{ width: 0 }}
                  transition={linearTransition}
                  className={cn(
                    'segment-bar',
                    'h-full border-r border-background/30 last:border-r-0',
                    'flex items-center justify-center',
                    'bg-gradient-to-b',
                    colors[index % colors.length],
                    'cursor-pointer',
                    'overflow-hidden'
                  )}
                >
                  {widthPercent > 6 && (
                    <span className="text-sm font-bold text-white/90 drop-shadow-md">
                      {index + 1}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Segment list with 3D items */}
      <ul className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
        {segments.map((segment, index) => (
          <motion.li
            key={segment.index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.2) }}
            className={cn(
              'flex items-center justify-between',
              'px-4 py-3 rounded-xl text-sm',
              'bg-gradient-to-r from-secondary/30 to-transparent',
              'border border-border/50',
              'transition-colors hover:border-primary/30'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-accent/20 text-primary flex items-center justify-center text-sm font-bold shadow-[0_2px_8px_rgba(168,85,247,0.3)]">
                {index + 1}
              </span>
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
      </ul>
    </motion.div>
  )
}
