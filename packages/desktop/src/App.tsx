import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { VideoUploader } from '@/components/video-uploader'
import { VideoInfo } from '@/components/video-info'
import { DurationSelector } from '@/components/duration-selector'
import { SplitPreview } from '@/components/split-preview'
import { BrowserCompatibility } from '@/components/browser-compatibility'
import { InstallPrompt } from '@/components/install-prompt'
import { useVideoSplitter } from '@/hooks/use-video-splitter-hybrid'
import { cn } from '@/lib/utils'

// Fluid spring configs - tuned for liquid feel (v2)
const fluidSpring = {
  type: 'spring' as const,
  stiffness: 120,
  damping: 14,
  mass: 1,
}

const bouncySpring = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 20,
  mass: 0.8,
}

const gentleSpring = {
  type: 'spring' as const,
  stiffness: 80,
  damping: 20,
  mass: 1.2,
}

function App() {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [namingPattern] = useState<'sequential' | 'timestamp'>('sequential')
  const [maxResolution, setMaxResolution] = useState<number | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>('')

  const {
    metadata,
    segments,
    progress,
    loadVideo,
    calculateSegments,
    splitVideo,
    reset,
  } = useVideoSplitter()

  useEffect(() => {
    if (metadata && selectedDuration) {
      calculateSegments(selectedDuration, namingPattern)
    }
  }, [metadata, selectedDuration, namingPattern, calculateSegments])

  useEffect(() => {
    if (progress.status === 'splitting' && !startTime) {
      setStartTime(Date.now())
    } else if (progress.status !== 'splitting') {
      setStartTime(null)
      setEstimatedTimeRemaining('')
    }
  }, [progress.status, startTime])

  useEffect(() => {
    if (progress.status === 'splitting' && startTime && progress.percent > 0) {
      const elapsed = (Date.now() - startTime) / 1000
      const estimatedTotal = (elapsed / progress.percent) * 100
      const remaining = estimatedTotal - elapsed
      
      if (remaining > 60) {
        const mins = Math.floor(remaining / 60)
        const secs = Math.floor(remaining % 60)
        setEstimatedTimeRemaining(`${mins}m ${secs}s remaining`)
      } else {
        setEstimatedTimeRemaining(`${Math.floor(remaining)}s remaining`)
      }
    }
  }, [progress.percent, progress.status, startTime])

  const handleFileSelect = async (file?: File) => {
    if (file) {
      await loadVideo(file as any)
    } else {
      await loadVideo()
    }
  }

  const handleSplit = async () => {
    if (!selectedDuration) return
    try {
      const blobs = await splitVideo(selectedDuration, namingPattern, maxResolution)
      console.log('Split complete:', blobs.length, 'segments')
    } catch (error) {
      console.error('Split failed:', error)
    }
  }

  const handleReset = () => {
    reset()
    setSelectedDuration(null)
    setStartTime(null)
    setEstimatedTimeRemaining('')
  }

  const isSplitting = progress.status === 'splitting'
  const isComplete = progress.status === 'complete'
  const canSplit = metadata && selectedDuration && segments.length > 0 && !isSplitting

  return (
    <>
      <InstallPrompt />
      <div className="min-h-screen gradient-bg p-4 md:p-8 relative overflow-hidden">
      {/* Animated floating orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Large purple orb - top left */}
        <motion.div
          animate={{
            x: [0, 50, 20, 0],
            y: [0, 30, -20, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="orb orb-purple w-[600px] h-[600px] -top-40 -left-40 animate-morph"
        />

        {/* Amber orb - bottom right */}
        <motion.div
          animate={{
            x: [0, -40, 30, 0],
            y: [0, -30, 40, 0],
            scale: [1, 0.9, 1.05, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="orb orb-amber w-[500px] h-[500px] -bottom-32 -right-32 animate-morph"
          style={{ animationDelay: '-5s' }}
        />

        {/* Small purple orb - center right */}
        <motion.div
          animate={{
            x: [0, -60, 20, 0],
            y: [0, 40, -30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="orb orb-purple w-[300px] h-[300px] top-1/3 -right-20 opacity-30"
        />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fluidSpring}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...bouncySpring, delay: 0.1 }}
          >
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight gradient-text">
              Clipchop
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...gentleSpring, delay: 0.3 }}
            className="text-muted-foreground mt-4 text-lg"
          >
            Split videos for social media
          </motion.p>
        </motion.header>

        <main className="space-y-6">
          <BrowserCompatibility />
          
          <AnimatePresence mode="wait">
            {!metadata ? (
              /* Upload state */
              <motion.div
                key="upload"
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={fluidSpring}
              >
                <VideoUploader
                  onFileSelect={handleFileSelect}
                  disabled={progress.status === 'loading'}
                />
                {progress.status === 'loading' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={fluidSpring}
                    className="flex items-center justify-center gap-3 mt-6"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full"
                    />
                    <span className="text-muted-foreground">Analyzing video...</span>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              /* Editor state */
              <motion.div
                key="editor"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={fluidSpring}
                className="space-y-6"
              >
                {/* Video info */}
                <VideoInfo metadata={metadata} onRemove={handleReset} />

                {/* Duration selector */}
                <DurationSelector
                  value={selectedDuration}
                  onChange={setSelectedDuration}
                  disabled={isSplitting}
                />

                {/* Quality/Resolution selector */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...fluidSpring, delay: 0.3 }}
                  className="card-3d p-6"
                >
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                    Output Quality
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98, y: 2 }}
                      onClick={() => setMaxResolution(null)}
                      disabled={isSplitting}
                      className={cn(
                        'px-6 py-3 rounded-full text-sm font-medium transition-all',
                        maxResolution === null ? 'pill-3d-active' : 'pill-3d',
                        isSplitting && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      Full Quality {metadata && `(${metadata.width}x${metadata.height})`}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98, y: 2 }}
                      onClick={() => setMaxResolution(1920)}
                      disabled={isSplitting}
                      className={cn(
                        'px-6 py-3 rounded-full text-sm font-medium transition-all',
                        maxResolution === 1920 ? 'pill-3d-active' : 'pill-3d',
                        isSplitting && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      HD (1920px)
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98, y: 2 }}
                      onClick={() => setMaxResolution(1280)}
                      disabled={isSplitting}
                      className={cn(
                        'px-6 py-3 rounded-full text-sm font-medium transition-all',
                        maxResolution === 1280 ? 'pill-3d-active' : 'pill-3d',
                        isSplitting && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      SD (1280px)
                    </motion.button>
                  </div>
                  {metadata && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs text-muted-foreground mt-3 space-y-1"
                    >
                      {maxResolution && (
                        <p>⚡ Downscaling will significantly speed up encoding</p>
                      )}
                      {!maxResolution && Math.max(metadata.width, metadata.height) > 1920 && (
                        <p className="text-amber-500">
                          ⚠️ 4K encoding is very slow in browsers. Consider using HD or SD for faster results.
                        </p>
                      )}
                      <p className="text-muted-foreground/70">
                        Estimated time: {maxResolution === 1280 ? '~2-5 min' : maxResolution === 1920 ? '~5-10 min' : '~15-30 min'} per minute of video
                      </p>
                    </motion.div>
                  )}
                </motion.div>

                {/* Split preview */}
                <AnimatePresence>
                  {segments.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={fluidSpring}
                    >
                      <SplitPreview
                        segments={segments}
                        totalDuration={metadata.duration}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Progress */}
                <AnimatePresence>
                  {isSplitting && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={fluidSpring}
                      className="card-3d p-6 space-y-4"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          Processing clip {progress.currentSegment} of {progress.totalSegments}
                        </span>
                        <span className="text-2xl font-bold gradient-text display-number">
                          {Math.round(progress.percent)}%
                        </span>
                      </div>
                      {estimatedTimeRemaining && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-muted-foreground text-center"
                        >
                          ⏱️ {estimatedTimeRemaining}
                        </motion.div>
                      )}
                      <div className="progress-3d h-4">
                        <motion.div
                          className="progress-3d-fill h-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress.percent}%` }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <motion.div layout className="flex gap-4">
                  {!isComplete ? (
                    <motion.button
                      whileHover={{ scale: canSplit ? 1.02 : 1, y: canSplit ? -2 : 0 }}
                      whileTap={{ scale: canSplit ? 0.98 : 1, y: canSplit ? 2 : 0 }}
                      onClick={handleSplit}
                      disabled={!canSplit}
                      className={cn(
                        'flex-1 py-4 px-8 rounded-2xl font-semibold text-lg text-white',
                        'btn-3d',
                        'disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
                        'disabled:shadow-none disabled:bg-muted',
                        canSplit && 'glow-pulse'
                      )}
                    >
                      {isSplitting ? (
                        <span className="flex items-center justify-center gap-3">
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full inline-block"
                          />
                          Splitting...
                        </span>
                      ) : (
                        'Split Video'
                      )}
                    </motion.button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={bouncySpring}
                      className="flex-1 space-y-5"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ ...bouncySpring, delay: 0.1 }}
                        className="flex items-center justify-center gap-3 text-center"
                      >
                        <motion.span
                          className="text-3xl"
                          animate={{
                            rotate: [0, -10, 10, -10, 0],
                            scale: [1, 1.2, 1.2, 1.2, 1]
                          }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                        >
                          ✨
                        </motion.span>
                        <p className="text-xl font-bold gradient-text">
                          {segments.length} clips ready!
                        </p>
                      </motion.div>
                      <div className="flex gap-4">
                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98, y: 2 }}
                          onClick={() => {
                            if (window.electron) {
                              const seg = segments[0] as any
                              if (seg && seg.outputPath) {
                                const outputPath = seg.outputPath
                                const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/'))
                                console.log('Files saved to:', outputDir)
                                alert(`Files saved to:\n${outputDir}`)
                              }
                            } else {
                              segments.forEach((seg: any) => {
                                if (seg.blob) {
                                  const url = URL.createObjectURL(seg.blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = seg.filename
                                  a.click()
                                  URL.revokeObjectURL(url)
                                }
                              })
                            }
                          }}
                          className="flex-1 py-4 px-6 rounded-2xl font-semibold btn-3d text-white glow-purple"
                        >
                          {window.electron ? 'Show Files' : 'Download All'}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98, y: 2 }}
                          onClick={handleReset}
                          className="py-4 px-6 rounded-2xl font-semibold btn-3d-secondary text-foreground"
                        >
                          New Video
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error display */}
          <AnimatePresence>
            {progress.status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={fluidSpring}
                className="card-3d p-5 border-destructive/50"
              >
                <p className="text-destructive text-sm font-medium">
                  {progress.error || 'Something went wrong'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center text-sm text-muted-foreground/50"
        >
          {typeof window !== 'undefined' && window.electron ? (
            <>⚡ Desktop App - GPU Accelerated</>
          ) : (
            <>All processing happens in your browser. No uploads.</>
          )}
        </motion.footer>
      </div>
    </div>
    </>
  )
}

export default App
