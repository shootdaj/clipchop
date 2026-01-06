# Clipchop - Multi-Platform Video Splitter

Video splitter app that cuts videos into smaller durations for social media (Instagram, TikTok, etc.)

**Last Updated**: 2026-01-06 (Session 9) - Mobile FFmpeg.wasm Fix, Stable v2.0.0 Release

**Stable Release**: v2.0.0 - https://github.com/shootdaj/clipchop/releases/tag/v2.0.0

---

## Quick Start

```bash
# Clone
git clone https://github.com/shootdaj/clipchop.git
cd clipchop

# Install dependencies
bun install

# Run web version
cd packages/desktop && bun run dev

# Run desktop (Electron) version
cd packages/desktop && bun run electron:dev
```

**Live Demo**: https://desktop-seven-lake.vercel.app

---

## Agent Handoff Protocol

**CRITICAL**: This project has NO memory between sessions. Always:

1. **Read this file first** - Contains current architecture and status
2. **Check `PROGRESS.md`** - Implementation history and completed tasks
3. **Update this file** - Add any major changes to Architecture or Current Status sections
4. **Update `PROGRESS.md`** - Log what you completed
5. **Use TodoWrite** - Track in-session progress
6. **Keep ALL platforms in sync** - When adding features or fixes, apply them to ALL app versions:
   - Desktop/Web (packages/desktop/src/App.tsx)
   - Flutter mobile (packages/clipchop_flutter)
   - Any future platforms

## DEPLOYMENT IS AUTOMATIC

**NEVER run `vercel` commands manually.** Deployment is 100% automatic:

1. **Push to master** → GitHub Actions triggers
2. **CI/CD builds** → Electron apps + Vercel web deployment
3. **Done** → No manual intervention needed

To deploy: Just `git push origin master`

## PRE-COMMIT TESTING REQUIREMENT

**ALWAYS run tests before committing:**

```bash
cd packages/desktop
bun run test           # Unit tests (must pass)
bun run test:e2e:smoke # Smoke tests (must pass)
```

---

## Current Status (v2.0.0 Stable - Jan 6, 2026)

### What's Working

**Desktop App (Electron)**:
- Fully functional on macOS/Windows/Linux
- Native FFmpeg with GPU acceleration (VideoToolbox/NVENC)
- 20-30x faster than web version
- Video rotation handled automatically
- All quality options (Full/HD/SD)
- Video preview with scrubbing
- Download to ~/Downloads

**Web App (Vercel)**:
- Live at https://desktop-seven-lake.vercel.app
- PWA installable on mobile devices
- Desktop browsers: WebCodecs (fast for desktop hardware)
- Mobile browsers: FFmpeg.wasm (handles VFR videos properly)
- Download functionality via blob URLs
- Version display in footer

**Mobile Support (v2.0.0 NEW)**:
- FFmpeg.wasm with background pre-loading
- Download progress tracking (MB downloaded/total)
- Mobile-optimized encoding (720p max, ultrafast preset)
- Handles Variable Frame Rate (VFR) phone videos correctly

**Testing**:
- 62 unit tests (vitest)
- E2E tests (Playwright)
- Smoke tests for quick iteration (~7s)

**Flutter Android App (NEW)**:
- Native Flutter app at `packages/clipchop_flutter`
- Uses `ffmpeg_kit_flutter_new` (community fork, actively maintained)
- Full native FFmpeg with hardware acceleration
- Matches web app UI (dark purple/amber theme, 3D cards)
- **APK Download**: Available on [GitHub Releases](https://github.com/shootdaj/clipchop/releases)
- Auto-built via GitHub Actions on each release
- Manual build: `cd packages/clipchop_flutter && flutter build apk --release`

### Known Limitations

- **Web on Mobile**: Slow encoding (WebAssembly limitation)
- **Large Files**: 30MB ffmpeg.wasm download on first use
- **Service Worker**: May cache old versions (clear cache if issues)

---

## Architecture

### Video Processing Approaches

| Platform | Technology | Speed | VFR Handling |
|----------|-----------|-------|--------------|
| **Desktop (Electron)** | Native FFmpeg | 1-2 min | Excellent |
| **Flutter Android** | Native FFmpeg | 1-2 min | Excellent |
| **Web (Desktop Browser)** | WebCodecs | 5-15 min | Good |
| **Web (Mobile Browser)** | FFmpeg.wasm | 15-30 min | Excellent |

### Key Files

```
clipchop/
├── packages/desktop/              # Electron + Web app
│   ├── src/hooks/
│   │   ├── use-video-splitter-hybrid.ts    # Auto-detects platform
│   │   ├── use-video-splitter-electron.ts  # Native FFmpeg
│   │   ├── use-video-splitter.ts           # WebCodecs
│   │   └── use-video-splitter-ffmpeg-wasm.ts # FFmpeg.wasm for mobile
│   ├── electron/
│   │   ├── ffmpeg.ts                       # FFmpeg wrapper
│   │   └── ipc-handlers.ts                 # Electron IPC
│   └── src/App.tsx                         # Main UI
├── packages/clipchop_flutter/     # Flutter Android app (NEW)
│   ├── lib/services/ffmpeg_service.dart    # FFmpeg processing
│   ├── lib/services/video_state.dart       # State management
│   ├── lib/screens/home_screen.dart        # Main screen
│   └── lib/widgets/                        # UI components
└── .github/workflows/
    └── release.yml                         # CI/CD (Electron + Vercel)
```

### Platform Detection Logic

```typescript
// use-video-splitter-hybrid.ts
if (window.electron) {
  // Desktop: Use native FFmpeg (fastest)
} else if (isMobileDevice()) {
  // Mobile: Use ffmpeg.wasm (handles VFR properly)
} else {
  // Desktop browser: Use WebCodecs (fast, good quality)
}
```

---

## Running the Apps

### Development

```bash
# Web version
cd packages/desktop && bun run dev
# Opens at http://localhost:5173

# Electron version
cd packages/desktop && bun run electron:dev

# Flutter Android (requires Android SDK)
cd packages/clipchop_flutter && flutter build apk --release
# APK at: build/app/outputs/flutter-apk/app-release.apk
```

### Building

```bash
# Web (auto-deploys on push to master)
bun run build

# Electron
bun run electron:build        # All platforms
bun run electron:build:mac    # Mac only
bun run electron:build:win    # Windows only
```

### Testing

```bash
bun run test           # Unit tests (62 tests, ~3s)
bun run test:e2e:smoke # Quick smoke tests (~7s)
bun run test:e2e       # Full E2E suite
bun run test:all       # Everything
```

---

## Deployment

### Production URLs

- **Web App**: https://desktop-seven-lake.vercel.app
- **Desktop Releases**: https://github.com/shootdaj/clipchop/releases
- **Stable v2.0.0**: https://github.com/shootdaj/clipchop/releases/tag/v2.0.0

### CI/CD (GitHub Actions)

All handled by `.github/workflows/release.yml`:
- Semantic versioning from commit messages
- Electron builds for macOS/Windows/Linux
- Vercel deployment with pre-built assets

### Commit Message Conventions

- `feat: description` → Minor version bump
- `fix: description` → Patch version bump
- `chore: description` → No version bump

---

## FFmpeg.wasm Mobile Implementation (v2.0.0)

### How It Works

1. **Background Pre-loading**: Starts downloading 30MB wasm when app loads on mobile
2. **Progress Tracking**: Shows "Downloading: 15.2/30.6 MB" during download
3. **Global State**: FFmpeg instance shared across components (loads once)
4. **Mobile Optimizations**:
   - `ultrafast` preset
   - CRF 28 (lower quality = faster)
   - Max 720p resolution
   - 96k audio bitrate

### Why FFmpeg.wasm for Mobile?

- **VFR Handling**: Phone videos have Variable Frame Rate
- **WebCodecs Issue**: Choppy output on mobile (timing mismatch)
- **FFmpeg.wasm**: Same engine as desktop FFmpeg, handles VFR correctly

### Key Code

```typescript
// Pre-load on app mount for mobile
useEffect(() => {
  if (isMobile && !globalFFmpeg) {
    preloadFFmpeg((percent, message) => {
      console.log(`FFmpeg load: ${percent}% - ${message}`)
    })
  }
}, [])
```

---

## Reverting to Stable Version

If something breaks, you can always go back to v2.0.0:

```bash
git checkout v2.0.0
bun install
bun run build
```

Or check out any tagged release:
```bash
git tag -l  # List all versions
git checkout v1.6.15  # Checkout specific version
```

---

## Session History

| Session | Date | Changes |
|---------|------|---------|
| 9 | 2026-01-06 | FFmpeg.wasm mobile fix, v2.0.0 stable release |
| 8 | 2026-01-05 | Unified CI/CD, version display fix |
| 7 | 2026-01-05 | Audio sync fix, E2E tests |
| 6 | 2026-01-05 | Video preview, animation fixes |
| 5 | 2026-01-04 | Electron conversion, 20-30x speedup |

For full history, see `PROGRESS.md`

---

## Troubleshooting

### "Failed to load video engine" on Mobile
- Check network connection (30MB download required)
- Try refreshing the page
- Clear browser cache and try again

### Choppy Video Output
- On mobile: Should now use FFmpeg.wasm automatically
- On desktop: Check if using WebCodecs (should be smooth)

### Old Version Showing
- Clear service worker cache in DevTools
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### Version Shows "0.0.0-development"
- This means it's running in dev mode
- Production builds get version from git tags

---

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Run tests: `bun run test && bun run test:e2e:smoke`
4. Commit: `git commit -m 'feat: Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open Pull Request

---

## License

MIT

---

**Repository**: https://github.com/shootdaj/clipchop
**Live Demo**: https://desktop-seven-lake.vercel.app
**Stable Release**: v2.0.0
