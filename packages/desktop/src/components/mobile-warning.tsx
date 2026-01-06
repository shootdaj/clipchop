import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

const GITHUB_RELEASES_URL = 'https://github.com/shootdaj/clipchop/releases'

export function MobileWarning() {
  const [isMobileWeb, setIsMobileWeb] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if we're on mobile AND in web browser (not Electron)
    const isElectron = typeof window !== 'undefined' && window.electron
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )

    // Only show on mobile web, not in Electron app
    setIsMobileWeb(isMobile && !isElectron)
  }, [])

  if (!isMobileWeb || isDismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50',
          'bg-gradient-to-r from-amber-500/95 to-orange-500/95',
          'backdrop-blur-sm shadow-lg'
        )}
      >
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">
                Web version is very slow on mobile
              </p>
              <p className="text-white/90 text-xs mt-1">
                Processing a 1-minute video can take 30-60 minutes in the browser.
                For fast processing, download the native app instead.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <a
                  href={GITHUB_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                    'bg-white text-orange-600 font-semibold text-xs',
                    'hover:bg-white/90 transition-colors',
                    'shadow-md'
                  )}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.164 6.839 9.49.5.09.682-.218.682-.486 0-.24-.009-.875-.013-1.713-2.782.602-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.091-.647.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .27.18.58.688.482C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                  </svg>
                  Download Android APK
                </a>
                <button
                  onClick={() => setIsDismissed(true)}
                  className={cn(
                    'px-3 py-1.5 rounded-full',
                    'bg-white/20 text-white font-medium text-xs',
                    'hover:bg-white/30 transition-colors'
                  )}
                >
                  Continue anyway
                </button>
              </div>
            </div>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-white/80 hover:text-white p-1 flex-shrink-0"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
