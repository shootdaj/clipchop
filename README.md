# Clipchop - Video Splitter

Split videos into smaller segments for social media (Instagram, TikTok, YouTube).

**Version**: v2.0.0 (Stable)
**Live Demo**: https://desktop-seven-lake.vercel.app
**Releases**: https://github.com/shootdaj/clipchop/releases

---

## Performance

| Platform | Technology | 4K Video | VFR Support |
|----------|-----------|----------|-------------|
| **Desktop App** | Native FFmpeg + GPU | 1-2 min | Excellent |
| **Web (Desktop)** | WebCodecs | 5-15 min | Good |
| **Web (Mobile)** | FFmpeg.wasm | 15-30 min | Excellent |

Desktop app is **20-30x faster** with hardware GPU acceleration.

---

## Features

- **Smart Platform Detection**: Automatically uses the best technology for your device
- **Preset Durations**: 15s, 30s, 60s, 90s (optimized for social media)
- **Custom Durations**: Any segment length you need
- **Quality Options**: Full, HD (1920px), SD (1280px)
- **VFR Video Support**: Handles phone videos with variable frame rates
- **Privacy First**: All processing happens locally
- **Beautiful UI**: Modern 3D dark theme with smooth animations

---

## Quick Start

### Try Online (No Install)

Visit https://desktop-seven-lake.vercel.app

### Desktop App (Fastest)

Download from [GitHub Releases](https://github.com/shootdaj/clipchop/releases)

### Development

```bash
# Clone
git clone https://github.com/shootdaj/clipchop.git
cd clipchop

# Install
bun install

# Run web version
cd packages/desktop && bun run dev

# Run desktop version
cd packages/desktop && bun run electron:dev
```

---

## Platform Support

### Desktop App (Electron)
- macOS 10.15+ (VideoToolbox GPU acceleration)
- Windows 10+ (NVENC/Quick Sync GPU acceleration)
- Linux Ubuntu 18.04+ (VA-API)

### Web App (Browser)
- Chrome 102+ (Desktop) - WebCodecs
- Chrome (Mobile) - FFmpeg.wasm with VFR support
- PWA installable on Android

---

## Usage

1. **Select Video**: Drop a video or click to browse
2. **Choose Duration**: Pick a preset or enter custom
3. **Select Quality**: Full, HD, or SD
4. **Split**: Click "Split Video"
5. **Download**: Get your segments

---

## Tech Stack

- **Framework**: Electron + React 18 + TypeScript
- **Video Processing**:
  - Desktop: Native FFmpeg (fluent-ffmpeg)
  - Web Desktop: WebCodecs API
  - Web Mobile: FFmpeg.wasm
- **GPU Acceleration**: VideoToolbox (Mac), NVENC (Windows), VA-API (Linux)
- **UI**: Tailwind CSS v4 + Motion (Framer Motion)
- **Build**: Vite + electron-builder
- **CI/CD**: GitHub Actions (auto-deploys to Vercel + builds Electron)

---

## Project Structure

```
clipchop/
├── packages/desktop/          # Main app (Electron + Web)
│   ├── electron/              # Electron main process
│   │   ├── ffmpeg.ts          # FFmpeg wrapper with GPU
│   │   └── ipc-handlers.ts    # IPC handlers
│   ├── src/
│   │   ├── hooks/             # Video splitter hooks
│   │   │   ├── use-video-splitter-hybrid.ts    # Platform detection
│   │   │   ├── use-video-splitter-electron.ts  # Native FFmpeg
│   │   │   ├── use-video-splitter.ts           # WebCodecs
│   │   │   └── use-video-splitter-ffmpeg-wasm.ts # Mobile
│   │   └── components/        # React components
│   └── e2e/                   # Playwright tests
└── .github/workflows/         # CI/CD
```

---

## Scripts

```bash
# Development
bun run dev              # Web dev server
bun run electron:dev     # Electron app with hot reload

# Build
bun run build            # Web assets
bun run electron:build   # All platforms
bun run electron:build:mac    # macOS only
bun run electron:build:win    # Windows only

# Testing
bun run test             # Unit tests (62 tests)
bun run test:e2e:smoke   # Quick smoke tests
bun run test:e2e         # Full E2E suite
```

---

## Troubleshooting

### Mobile: "Failed to load video engine"
- Check network connection (30MB download required)
- Try refreshing the page
- Clear browser cache

### Choppy Video Output
- On mobile: Now uses FFmpeg.wasm (should be smooth)
- On desktop: Uses WebCodecs (should be smooth)

### Old Version Showing
- Clear service worker cache in DevTools
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

---

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Run tests: `bun run test && bun run test:e2e:smoke`
4. Commit: `git commit -m 'feat: Add amazing feature'`
5. Push and open Pull Request

---

## License

MIT

---

## Credits

- [Electron](https://www.electronjs.org/)
- [FFmpeg](https://ffmpeg.org/)
- [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm)
- [WebAV](https://github.com/nickreynolds/WebAV)
- [shadcn/ui](https://ui.shadcn.com/)
- [Motion](https://motion.dev/)

---

**Made for creators who value their time**
