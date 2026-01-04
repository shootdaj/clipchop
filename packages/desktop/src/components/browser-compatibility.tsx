import { motion } from 'motion/react'
import { AlertCircle, Download } from 'lucide-react'
import { useState } from 'react'

export function BrowserCompatibility() {
  const [dismissed, setDismissed] = useState(false)
  const isElectron = typeof window !== 'undefined' && window.electron !== undefined
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
  
  if (isElectron) return null

  const hasWebCodecs = typeof window !== 'undefined' && 
    'VideoEncoder' in window && 
    'VideoDecoder' in window

  if (hasWebCodecs && !isMobile) return null
  
  if (dismissed) return null

  const handleInstall = () => {
    if ((window as any).showInstallPrompt) {
      (window as any).showInstallPrompt()
    } else {
      alert('To install: Tap the menu (⋮) in Chrome and select "Install app" or "Add to Home screen"')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card-3d p-4 mb-6 ${!hasWebCodecs ? 'border-2 border-destructive/50' : ''}`}
    >
      <div className="flex gap-3">
        {!hasWebCodecs ? (
          <>
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-sm mb-1">
                Limited Browser Support
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                Video encoding will be very slow on this browser. Update to Chrome 102+ for better performance.
              </p>
              {isMobile && (
                <button
                  onClick={handleInstall}
                  className="text-xs bg-primary/20 hover:bg-primary/30 text-primary font-semibold px-3 py-1.5 rounded-lg flex items-center gap-2"
                >
                  <Download className="w-3 h-3" />
                  Install as App
                </button>
              )}
            </div>
          </>
        ) : isMobile ? (
          <>
            <Download className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-sm mb-1">
                Install for Better Experience
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                Add to home screen for offline access and app-like experience
              </p>
              <button
                onClick={handleInstall}
                className="text-xs bg-primary hover:bg-primary/90 text-white font-semibold px-3 py-1.5 rounded-lg"
              >
                Install App
              </button>
            </div>
          </>
        ) : null}
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

