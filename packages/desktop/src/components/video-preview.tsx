import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Download } from 'lucide-react'

interface VideoPreviewProps {
  src: string | Blob | File
  title?: string
  onDownload?: () => void
  showDownload?: boolean
  compact?: boolean
}

// Optimized spring config
const fluidSpring = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 20,
  mass: 0.8,
}

export function VideoPreview({
  src,
  title,
  onDownload,
  showDownload = true,
  compact = false
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isVertical, setIsVertical] = useState(false)

  useEffect(() => {
    let url = ''

    if ((typeof Blob !== 'undefined' && src instanceof Blob) || (typeof File !== 'undefined' && src instanceof File)) {
      url = URL.createObjectURL(src)
      setVideoUrl(url)
    } else if (typeof src === 'string') {
      // Check if it's a file path (Electron) or already a URL
      if (src.startsWith('file://') || src.startsWith('http') || src.startsWith('blob:')) {
        setVideoUrl(src)
      } else {
        // Assume it's a file path, convert to file:// URL
        setVideoUrl(`file://${src}`)
      }
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [src])

  const handleError = () => setError('Failed to load video')
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const { videoWidth, videoHeight } = videoRef.current
      setIsVertical(videoHeight > videoWidth)
    }
  }

  if (!videoUrl) {
    return (
      <div className={`card-3d ${compact ? 'p-2' : 'p-4'} flex items-center justify-center`}>
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fluidSpring}
      className={`card-3d overflow-hidden ${compact ? '' : ''}`}
    >
      {/* Video container - adapts to vertical/horizontal videos */}
      <div className={`relative group ${isVertical ? 'flex justify-center' : ''}`}>
        {error ? (
          <div className={`${compact ? 'h-32' : 'h-48'} w-full bg-muted/50 flex items-center justify-center`}>
            <span className="text-destructive text-sm">{error}</span>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            onError={handleError}
            onLoadedMetadata={handleLoadedMetadata}
            className={`${isVertical
              ? (compact ? 'h-40 w-auto max-w-full' : 'h-64 w-auto max-w-full')
              : (compact ? 'w-full h-32' : 'w-full h-48')} object-contain bg-black/50 rounded-t-xl`}
          />
        )}

        {/* Download overlay button */}
        {showDownload && onDownload && !error && (
          <motion.button
            initial={{ opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation()
              onDownload()
            }}
            className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Title bar */}
      {title && (
        <div className={`${compact ? 'px-2 py-1.5' : 'px-4 py-2'} border-t border-border/50`}>
          <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium truncate text-foreground/80`}>
            {title}
          </p>
        </div>
      )}
    </motion.div>
  )
}
