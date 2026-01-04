import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

interface VideoUploaderProps {
  onFileSelect: ((file?: File) => void) | (() => void)
  disabled?: boolean
}

// Fluid spring config
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

export function VideoUploader({ onFileSelect, disabled }: VideoUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const isElectron = typeof window !== 'undefined' && window.electron !== undefined

  const handleClick = useCallback(async () => {
    if (disabled) return
    setIsProcessing(true)
    try {
      await onFileSelect()
    } finally {
      setIsProcessing(false)
    }
  }, [disabled, onFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isElectron) return
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragOver(true)
  }, [disabled, isElectron])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (isElectron) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [isElectron])

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (isElectron) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('video/')) {
        setIsProcessing(true)
        setTimeout(() => {
          onFileSelect(file)
          setIsProcessing(false)
        }, 100)
      }
    }
  }, [disabled, onFileSelect, isElectron])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isElectron) return
    const files = e.target.files
    if (files && files.length > 0) {
      setIsProcessing(true)
      setTimeout(() => {
        onFileSelect(files[0])
        setIsProcessing(false)
      }, 100)
    }
  }, [onFileSelect, isElectron])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fluidSpring}
      className="w-full"
    >
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={isElectron ? handleClick : undefined}
        animate={{
          scale: isDragOver ? 1.02 : 1,
          y: isDragOver ? -4 : 0,
        }}
        whileHover={{ scale: disabled ? 1 : 1.01, y: disabled ? 0 : -2 }}
        whileTap={{ scale: disabled ? 1 : 0.99 }}
        transition={fluidSpring}
        className={cn(
          'relative flex flex-col items-center justify-center',
          'min-h-[360px] w-full',
          'card-3d cursor-pointer overflow-hidden',
          'transition-all duration-300',
          disabled && 'opacity-50 cursor-not-allowed',
          isDragOver && 'glow-purple'
        )}
      >
        {!isElectron && (
          <input
            type="file"
            accept="video/*"
            onChange={handleFileInput}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          />
        )}
        {/* Inner glow effect when dragging */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-amber-500/10"
            />
          )}
        </AnimatePresence>

        {/* Animated orbs inside card */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              x: [0, 20, 0],
              y: [0, -15, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-primary/10 blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -15, 0],
              y: [0, 20, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl"
          />
        </div>


        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={fluidSpring}
              className="flex flex-col items-center gap-4 relative z-0"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary"
              />
              <p className="text-muted-foreground font-medium">Processing...</p>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={fluidSpring}
              className="flex flex-col items-center gap-8 p-8 relative z-0"
            >
              {/* 3D floating icon */}
              <motion.div
                animate={isDragOver ? {
                  y: [0, -15, 0],
                  rotateX: [0, 10, 0],
                  rotateY: [0, -5, 5, 0],
                } : {
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: isDragOver ? 0.8 : 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative"
              >
                {/* Icon container with 3D effect */}
                <div className={cn(
                  'relative p-6 rounded-2xl',
                  'bg-gradient-to-br from-primary/20 to-accent/10',
                  'shadow-[0_8px_30px_rgba(168,85,247,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]',
                  isDragOver && 'shadow-[0_12px_40px_rgba(168,85,247,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]'
                )}>
                  {/* Glow ring */}
                  <motion.div
                    animate={{
                      opacity: isDragOver ? [0.6, 1, 0.6] : [0.2, 0.4, 0.2],
                      scale: isDragOver ? [1, 1.3, 1] : [1, 1.15, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/40 to-accent/20 blur-xl"
                  />
                  <svg
                    className={cn(
                      'relative w-14 h-14 transition-colors duration-300 icon-3d',
                      isDragOver ? 'text-primary' : 'text-muted-foreground'
                    )}
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
                </div>
              </motion.div>

              <div className="text-center space-y-3">
                <motion.p
                  animate={{
                    scale: isDragOver ? 1.05 : 1,
                  }}
                  transition={bouncySpring}
                  className={cn(
                    'text-2xl font-bold transition-colors duration-300',
                    isDragOver ? 'gradient-text' : 'text-foreground'
                  )}
                >
                  {isElectron ? 'Select your video' : (isDragOver ? 'Release to upload' : 'Drop your video here')}
                </motion.p>
                <p className="text-muted-foreground">
                  {isElectron ? (
                    <>Click to <span className="text-primary font-semibold">browse files</span></>
                  ) : (
                    <>or <span className="text-primary font-semibold hover:underline cursor-pointer">browse files</span></>
                  )}
                </p>
              </div>

              {/* Format badges with 3D effect */}
              <div className="flex gap-3 mt-2">
                {['MP4', 'WebM', 'MOV'].map((format, i) => (
                  <motion.span
                    key={format}
                    initial={{ opacity: 0, y: 15, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ ...bouncySpring, delay: 0.1 * (i + 1) }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    className={cn(
                      'px-4 py-1.5 text-xs font-semibold rounded-full',
                      'bg-gradient-to-b from-secondary to-secondary/80',
                      'border border-primary/20',
                      'shadow-[0_2px_0_rgba(10,10,18,1),0_4px_8px_rgba(0,0,0,0.2)]',
                      'text-secondary-foreground'
                    )}
                  >
                    {format}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
