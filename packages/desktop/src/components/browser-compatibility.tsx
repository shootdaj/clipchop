import { motion } from 'motion/react'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'

export function BrowserCompatibility() {
  const [dismissed, setDismissed] = useState(false)
  const isElectron = typeof window !== 'undefined' && window.electron !== undefined

  if (isElectron) return null

  const hasWebCodecs = typeof window !== 'undefined' &&
    'VideoEncoder' in window &&
    'VideoDecoder' in window

  if (hasWebCodecs) return null

  if (dismissed) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-3d p-4 mb-6 border-2 border-destructive/50"
    >
      <div className="flex gap-3">
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-sm mb-1">
            Limited Browser Support
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            Video encoding will be very slow on this browser. Update to Chrome 102+ for better performance.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          ✕
        </button>
      </div>
    </motion.div>
  )
}

