import { useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'motion/react'
import { cn } from '@/lib/utils'

interface DurationSelectorProps {
  value: number | null
  onChange: (duration: number) => void
  customPresets?: number[]
  disabled?: boolean
}

const DEFAULT_PRESETS = [15, 30, 60, 90]

// Optimized springs - higher damping = less oscillation = smoother
const fluidSpring = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 25,
  mass: 0.8,
}

const bouncySpring = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 22,
  mass: 0.6,
}

// Smooth spring for the shared layout indicator
const indicatorSpring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`
}

export function DurationSelector({
  value,
  onChange,
  customPresets = [],
  disabled,
}: DurationSelectorProps) {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customValue, setCustomValue] = useState('')

  const allPresets = [...DEFAULT_PRESETS, ...customPresets].sort((a, b) => a - b)
  const isCustomValue = value !== null && !allPresets.includes(value)

  const handleCustomSubmit = () => {
    const parsed = parseInt(customValue, 10)
    if (parsed > 0) {
      onChange(parsed)
      setShowCustomInput(false)
      setCustomValue('')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="card-3d p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Split Duration
        </label>
        <AnimatePresence>
          {value !== null && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 10 }}
              transition={bouncySpring}
              className="text-sm font-bold text-primary"
            >
              {formatDuration(value)} clips
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Preset buttons with shared layout animation */}
      <LayoutGroup>
        <div className="flex flex-wrap gap-3">
          {allPresets.map((preset, index) => {
            const isSelected = value === preset
            return (
              <motion.button
                key={preset}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...bouncySpring, delay: Math.min(index * 0.03, 0.12) }}
                whileHover={{
                  scale: disabled ? 1 : 1.03,
                  y: disabled ? 0 : -2
                }}
                whileTap={{
                  scale: disabled ? 1 : 0.97,
                  y: disabled ? 0 : 1
                }}
                onClick={() => {
                  onChange(preset)
                  setShowCustomInput(false)
                }}
                disabled={disabled}
                className={cn(
                  'relative px-6 py-3 rounded-full text-base font-bold',
                  'transition-colors duration-200',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  isSelected ? 'text-white' : 'pill-3d text-foreground'
                )}
              >
                {/* Shared layout sliding background indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="duration-indicator"
                    className="absolute inset-0 rounded-full pill-3d-active"
                    transition={indicatorSpring}
                  />
                )}

                {/* Large number display */}
                <span className="relative z-10 display-number">{formatDuration(preset)}</span>
              </motion.button>
            )
          })}

          {/* Custom button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...bouncySpring, delay: 0.15 }}
            whileHover={{
              scale: disabled ? 1 : 1.03,
              y: disabled ? 0 : -2
            }}
            whileTap={{
              scale: disabled ? 1 : 0.97,
              y: disabled ? 0 : 1
            }}
            onClick={() => setShowCustomInput(true)}
            disabled={disabled}
            className={cn(
              'relative px-6 py-3 rounded-full text-base font-bold',
              'transition-colors duration-200',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'border-2 border-dashed',
              isCustomValue || showCustomInput
                ? 'text-white border-primary/50'
                : 'pill-3d text-muted-foreground border-border hover:border-primary/30'
            )}
          >
            {/* Shared layout sliding background for custom */}
            {(isCustomValue || showCustomInput) && (
              <motion.div
                layoutId="duration-indicator"
                className="absolute inset-0 rounded-full pill-3d-active"
                transition={indicatorSpring}
              />
            )}
            <span className="relative z-10">
              {isCustomValue ? formatDuration(value!) : 'Custom'}
            </span>
          </motion.button>
        </div>
      </LayoutGroup>

      {/* Custom input with 3D styling */}
      <AnimatePresence>
        {showCustomInput && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex gap-3 pt-2">
              <motion.input
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ ...fluidSpring, delay: 0.1 }}
                type="number"
                min="1"
                max="600"
                placeholder="Enter seconds..."
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                disabled={disabled}
                className={cn(
                  'flex-1 px-5 py-3 rounded-xl text-base font-medium',
                  'card-3d-inset',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  'placeholder:text-muted-foreground/50',
                  'disabled:opacity-50'
                )}
              />
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...bouncySpring, delay: 0.15 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95, y: 2 }}
                onClick={handleCustomSubmit}
                disabled={disabled || !customValue}
                className={cn(
                  'px-5 py-3 rounded-xl text-base font-bold',
                  'btn-3d text-white',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
                )}
              >
                Set
              </motion.button>
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...bouncySpring, delay: 0.2 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95, y: 2 }}
                onClick={() => {
                  setShowCustomInput(false)
                  setCustomValue('')
                }}
                disabled={disabled}
                className={cn(
                  'px-5 py-3 rounded-xl text-base font-bold',
                  'btn-3d-secondary text-foreground',
                  'disabled:opacity-40'
                )}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
