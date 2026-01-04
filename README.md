# Clipchop - Native Video Splitter ⚡

Fast, native desktop app for splitting videos into smaller segments. Perfect for preparing content for social media platforms like Instagram, TikTok, and YouTube.

## ⚡ Performance

- **20-30x faster** than browser-based encoding
- Hardware GPU acceleration (VideoToolbox, NVENC, Quick Sync)
- Process 4K videos in minutes, not hours

### Encoding Speed Comparison

| Resolution | Web Version | Native (CPU) | Native (GPU) | Speedup |
|------------|-------------|--------------|--------------|---------|
| **4K** | 30-60 min | 10-20 min | **1-2 min** | **20-30x** |
| **1080p** | 4-8 min | 1.5-3 min | **10-20 sec** | **12-24x** |
| **720p** | 1.5-3 min | 30-60 sec | **5-10 sec** | **10-18x** |

## Features

- **Predefined Durations**: 15s, 30s, 60s, 90s (optimized for social media)
- **Custom Durations**: Specify any segment length
- **Quality Options**: Full quality, HD (1920px), or SD (1280px)
- **Smart Encoding**: Automatic hardware acceleration detection
- **Beautiful UI**: Modern 3D dark theme with fluid animations
- **Privacy First**: All processing happens locally on your machine

## Platform Support

### Desktop App (Electron) - Fast
- ✅ macOS 10.15+
- ✅ Windows 10+
- ✅ Linux (Ubuntu 18.04+)
- ⚡ 20-30x faster with GPU acceleration

### Web App (Browser) - Slow but Works Everywhere
- ✅ Android (Chrome 102+)
- ✅ iOS/Safari (limited support)
- ✅ Any desktop browser with WebCodecs support
- 🌐 No installation required

## Installation

### Desktop App

Download from [GitHub Releases](https://github.com/yourusername/clipchop/releases)

### Web App

Visit [clipchop.vercel.app](https://clipchop.vercel.app) (or your domain)

### Development

- Node.js 18+ or Bun
- macOS, Windows, or Linux

### Quick Start

```bash
# Install dependencies
bun install

# Run in development mode
bun run electron:dev

# Build for your platform
bun run electron:build
```

## Usage

1. **Launch the app**: Run `bun run electron:dev`
2. **Select video**: Click to browse and select your video file
3. **Choose duration**: Pick a preset (15s, 30s, etc.) or enter custom duration
4. **Select quality**: 
   - Full Quality: Original resolution (slowest, best quality)
   - HD: 1920px max dimension (balanced)
   - SD: 1280px max dimension (fastest)
5. **Split**: Click "Split Video" and wait for processing
6. **Download**: Files are automatically saved to temp folder

## Tech Stack

- **Framework**: Electron + React 18 + TypeScript
- **Video Processing**: FFmpeg (fluent-ffmpeg)
- **Hardware Acceleration**: 
  - macOS: VideoToolbox
  - Windows: NVENC (NVIDIA) / Quick Sync (Intel)
  - Linux: VA-API
- **UI**: Tailwind CSS + Motion (Framer Motion)
- **Build**: Vite + electron-builder

## Development

### Project Structure

```
clipchop/
├── electron/              # Electron main process
│   ├── main.ts           # Window management & app lifecycle
│   ├── preload.ts        # Secure IPC bridge
│   ├── ffmpeg.ts         # FFmpeg wrapper
│   └── ipc-handlers.ts   # IPC communication handlers
├── src/                  # React frontend
│   ├── components/       # UI components
│   ├── hooks/            # React hooks
│   ├── lib/              # Utilities
│   └── types/            # TypeScript definitions
├── dist/                 # Built web assets
└── dist-electron/        # Compiled Electron code
```

### Available Scripts

```bash
# Development
bun run dev              # Vite dev server only (web mode)
bun run electron:dev     # Full Electron app with hot reload

# Build
bun run build            # Build web assets
bun run electron:build   # Build Electron app for all platforms

# Platform-specific builds
bun run electron:build:mac    # macOS (DMG + ZIP)
bun run electron:build:win    # Windows (NSIS + Portable)
bun run electron:build:linux  # Linux (AppImage + deb)

# Testing
bun run test             # Run unit tests
bun run test:run         # Run tests once
```

## Hardware Acceleration

The app automatically detects and uses hardware acceleration:

### macOS
- Uses **VideoToolbox** (H.264 hardware encoding)
- Works on all Macs with hardware encoder
- 10-15x faster than software encoding

### Windows
- Tries **NVENC** (NVIDIA GPUs) first
- Falls back to **Quick Sync** (Intel CPUs)
- Falls back to software (libx264) if neither available
- 10-20x faster with GPU

### Linux
- Uses **VA-API** when available
- Falls back to software encoding
- 5-10x faster with hardware support

## Troubleshooting

### Slow Encoding
- Make sure you're using HD or SD quality for large videos
- Check that hardware acceleration is working (look at console logs)
- Close other apps that might be using GPU

### App Won't Launch
- Make sure all dependencies are installed: `bun install`
- Rebuild Electron files: `bun x tsc -p tsconfig.electron.json`
- Check console for errors

### Video Won't Open
- Supported formats: MP4, MOV, WebM, AVI, MKV
- Try converting to MP4 first if using exotic codec

## Performance Tips

1. **Use Quality Settings Wisely**:
   - 4K videos: Use HD or SD for much faster encoding
   - 1080p videos: HD or Full Quality works well
   - 720p videos: Full Quality is fine

2. **Hardware Acceleration**:
   - Ensure graphics drivers are up to date
   - Close GPU-intensive apps during encoding

3. **File Sizes**:
   - Larger bitrates = larger files but better quality
   - SD quality is perfect for social media

## Browser Compatibility (Web Version Deprecated)

The web version (WebCodecs-based) is deprecated due to poor performance. Use the native Electron app for production use.

## License

MIT

## Contributing

Contributions welcome! Please read the contribution guidelines first.

## Credits

- Built with [Electron](https://www.electronjs.org/)
- Video processing by [FFmpeg](https://ffmpeg.org/)
- UI components by [shadcn/ui](https://ui.shadcn.com/)
- Animations by [Motion](https://motion.dev/)

---

**Made with ⚡ for creators who value their time**

