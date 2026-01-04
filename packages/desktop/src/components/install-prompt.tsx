import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Download, X } from 'lucide-react'

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const isElectron = typeof window !== 'undefined' && window.electron !== undefined
  
  useEffect(() => {
    if (isElectron) return
    
    const handler = () => {
      setShowPrompt(true)
    }
    
    window.addEventListener('beforeinstallprompt', handler)
    
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [isElectron])

  if (isElectron || !showPrompt) return null

  const handleInstall = () => {
    if ((window as any).showInstallPrompt) {
      (window as any).showInstallPrompt()
      setShowPrompt(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-6 left-6 right-6 md:left-auto md:w-96 z-50"
      >
        <div className="card-3d p-4 border-2 border-primary/40">
          <button
            onClick={() => setShowPrompt(false)}
            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-1">
                Install Clipchop
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Add to home screen for quick access
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleInstall}
                className="w-full py-2 px-4 rounded-lg btn-3d text-white text-sm font-semibold"
              >
                Install App
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

