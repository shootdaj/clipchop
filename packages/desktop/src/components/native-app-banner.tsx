import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

const GITHUB_RELEASES_URL = 'https://github.com/shootdaj/clipchop/releases/latest'
const ANDROID_APK_URL = 'https://github.com/shootdaj/clipchop/releases/latest'

export function NativeAppBanner() {
  const [isWebBrowser, setIsWebBrowser] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if we're in web browser (not Electron)
    const isElectron = typeof window !== 'undefined' && window.electron
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )

    // Show on web browser only (mobile has its own warning)
    setIsWebBrowser(!isElectron && !mobile)
    setIsMobile(mobile)

    // Check if user has dismissed before
    const dismissed = localStorage.getItem('native-app-banner-dismissed')
    if (dismissed) setIsDismissed(true)
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('native-app-banner-dismissed', 'true')
  }

  // Don't show on Electron or if dismissed (mobile has its own warning)
  if (!isWebBrowser || isDismissed || isMobile) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 1 }}
        className={cn(
          'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50',
          'bg-gradient-to-r from-purple-600/95 to-violet-600/95',
          'backdrop-blur-sm shadow-2xl rounded-2xl',
          'border border-white/10'
        )}
      >
        <div className="px-5 py-4">
          <div className="flex items-start gap-4">
            <span className="text-3xl flex-shrink-0">⚡</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base">
                Want 20x faster processing?
              </p>
              <p className="text-white/80 text-sm mt-1">
                Download the native app for GPU-accelerated video splitting. Process 4K videos in minutes, not hours.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <a
                  href={GITHUB_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 rounded-full',
                    'bg-white text-purple-600 font-semibold text-sm',
                    'hover:bg-white/90 transition-colors',
                    'shadow-md'
                  )}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download for Desktop
                </a>
                <a
                  href={ANDROID_APK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 rounded-full',
                    'bg-white/20 text-white font-semibold text-sm',
                    'hover:bg-white/30 transition-colors'
                  )}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.523 2.272l1.27 1.27-2.453 2.453A8.96 8.96 0 0121 12.973C21 17.963 16.963 22 11.973 22S2.946 17.963 2.946 12.973C2.946 8.27 6.52 4.42 11.107 4h.02l-.002.002V9.5l4.398-4.228 2-3zM6.982 8.1l-.724.724A5.965 5.965 0 004.946 12.973c0 3.86 3.113 6.973 6.973 6.973 3.861 0 6.974-3.113 6.974-6.973 0-1.61-.55-3.091-1.47-4.27l-.648.648-.018.018-5.784 5.784v-6.5l-.004.004-3.987 .443z"/>
                  </svg>
                  Android APK
                </a>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/60 hover:text-white p-1 flex-shrink-0 transition-colors"
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
