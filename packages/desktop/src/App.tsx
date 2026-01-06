import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { VideoUploader } from '@/components/video-uploader'
import { VideoInfo } from '@/components/video-info'
import { VideoPreview } from '@/components/video-preview'
import { VideoPreviewGrid } from '@/components/video-preview-grid'
import { DurationSelector } from '@/components/duration-selector'
import { SplitPreview } from '@/components/split-preview'
import { BrowserCompatibility } from '@/components/browser-compatibility'
import { InstallPrompt } from '@/components/install-prompt'
import { useVideoSplitter } from '@/hooks/use-video-splitter-hybrid'
import { cn } from '@/lib/utils'

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

const gentleSpring = {
  type: 'spring' as const,
  stiffness: 150,
  damping: 25,
  mass: 0.9,
}

function App() {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [namingPattern] = useState<'sequential' | 'timestamp'>('sequential')
  const [maxResolution, setMaxResolution] = useState<number | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>('')
  const [elapsedTime, setElapsedTime] = useState<string>('')

  const {
    metadata,
    segments,
    progress,
    inputSource,
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
      setElapsedTime('')
    } else if (progress.status === 'complete' && startTime) {
      // Calculate and store final elapsed time
      const elapsed = (Date.now() - startTime) / 1000
      if (elapsed >= 60) {
        const mins = Math.floor(elapsed / 60)
        const secs = Math.floor(elapsed % 60)
        setElapsedTime(`${mins}m ${secs}s`)
      } else {
        setElapsedTime(`${Math.floor(elapsed)}s`)
      }
      setStartTime(null)
      setEstimatedTimeRemaining('')
    } else if (progress.status !== 'splitting' && progress.status !== 'complete') {
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
    setElapsedTime('')
  }

  const isSplitting = progress.status === 'splitting'
  const isComplete = progress.status === 'complete'
  const canSplit = metadata && selectedDuration && segments.length > 0 && !isSplitting

  return (
    <>
      <InstallPrompt />
      <div className="min-h-screen gradient-bg p-4 md:p-8 relative overflow-hidden">
      {/* Animated floating orbs - using CSS animations for better performance */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Large purple orb - top left - CSS animation only */}
        <div className="orb orb-purple w-[600px] h-[600px] -top-40 -left-40 animate-float-slow" />

        {/* Amber orb - bottom right - CSS animation only */}
        <div
          className="orb orb-amber w-[500px] h-[500px] -bottom-32 -right-32 animate-float-medium"
          style={{ animationDelay: '-5s' }}
        />

        {/* Small purple orb - center right - CSS animation only */}
        <div className="orb orb-purple w-[300px] h-[300px] top-1/3 -right-20 opacity-30 animate-float-fast" />
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
                    <span className="text-muted-foreground">{progress.loadingMessage || 'Analyzing video...'}</span>
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

                {/* Input video preview */}
                {inputSource && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={fluidSpring}
                  >
                    <VideoPreview
                      src={inputSource}
                      title="Input Video"
                    />
                  </motion.div>
                )}

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
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
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
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
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
                {!isComplete ? (
                  <div className="flex gap-4">
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
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={fluidSpring}
                    className="space-y-5"
                  >
                    {/* Success message with elapsed time */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={fluidSpring}
                      className="card-3d p-5 border-green-500/30 bg-green-500/5"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-green-500 text-xl">✓</span>
                          <span className="text-green-500 font-semibold">
                            Successfully created {segments.length} clips!
                          </span>
                        </div>
                        {elapsedTime && (
                          <span className="text-green-500/70 text-sm">
                            Completed in {elapsedTime}
                          </span>
                        )}
                      </div>
                    </motion.div>

                    {/* Video preview grid with download buttons */}
                    <VideoPreviewGrid
                      segments={segments}
                      onDownload={(segment) => {
                        if (window.electron) {
                          const seg = segment as any
                          if (seg.outputPath) {
                            window.electron.copyToDownloads(seg.outputPath, seg.filename)
                              .then(() => console.log('Downloaded:', seg.filename))
                              .catch((err: Error) => console.error('Download failed:', err))
                          }
                        } else {
                          const seg = segment as any
                          if (seg.blob) {
                            const url = URL.createObjectURL(seg.blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = seg.filename
                            a.click()
                            URL.revokeObjectURL(url)
                          }
                        }
                      }}
                      onDownloadAll={() => {
                        const electron = window.electron
                        if (electron) {
                          segments.forEach((seg: any) => {
                            if (seg.outputPath) {
                              electron.copyToDownloads(seg.outputPath, seg.filename)
                                .then(() => console.log('Downloaded:', seg.filename))
                                .catch((err: Error) => console.error('Download failed:', err))
                            }
                          })
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
                    />

                    {/* New Video button */}
                    <div className="flex justify-center">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98, y: 2 }}
                        onClick={handleReset}
                        className="py-3 px-8 rounded-2xl font-semibold btn-3d-secondary text-foreground"
                      >
                        Start Over with New Video
                      </motion.button>
                    </div>
                  </motion.div>
                )}
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
          <div>
            {typeof window !== 'undefined' && window.electron ? (
              <>⚡ Desktop App - GPU Accelerated</>
            ) : (
              <>All processing happens in your browser. No uploads.</>
            )}
          </div>
          <div className="mt-2 text-xs">v{__APP_VERSION__} ({__GIT_SHA__})</div>
        </motion.footer>
      </div>
    </div>
    </>
  )
}

export default App
