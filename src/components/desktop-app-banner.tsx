import { motion } from 'motion/react'
import { Download } from 'lucide-react'

export function DesktopAppBanner() {
  const isElectron = typeof window !== 'undefined' && window.electron !== undefined
  
  if (isElectron) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="card-3d p-4 mb-6 border-2 border-primary/30"
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10">
          <Download className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">
            ⚡ Want 20-30x Faster Encoding?
          </h3>
          <p className="text-sm text-muted-foreground">
            Download the desktop app for GPU-accelerated encoding. 4K videos process in minutes, not hours.
          </p>
        </div>
        <motion.a
          href="https://github.com/yourusername/clipchop/releases"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 px-6 py-3 rounded-xl font-semibold btn-3d text-white text-sm"
        >
          Download
        </motion.a>
      </div>
    </motion.div>
  )
}

