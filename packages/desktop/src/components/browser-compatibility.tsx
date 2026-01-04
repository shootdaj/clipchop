import { motion } from 'motion/react'
import { AlertCircle } from 'lucide-react'

export function BrowserCompatibility() {
  const isElectron = typeof window !== 'undefined' && window.electron !== undefined
  
  if (isElectron) return null

  const hasWebCodecs = typeof window !== 'undefined' && 
    'VideoEncoder' in window && 
    'VideoDecoder' in window

  if (hasWebCodecs) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-3d p-6 mb-6 border-2 border-destructive/50"
    >
      <div className="flex gap-4">
        <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold text-foreground mb-2">
            Browser Not Supported
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Your browser doesn't support WebCodecs API (required for video processing).
          </p>
          <p className="text-sm text-foreground font-semibold">
            ⚡ Download the desktop app for fast, native performance
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supported browsers: Chrome 102+, Edge 102+
          </p>
        </div>
      </div>
    </motion.div>
  )
}

