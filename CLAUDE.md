# Clipchop - Multi-Platform Video Splitter

Video splitter app that cuts videos into smaller durations for social media (Instagram, TikTok, etc.)

**Last Updated**: 2026-01-09 (Session 13) - v3.3.0 Native Share Intent Handling

**Latest Release**: https://github.com/shootdaj/clipchop/releases/tag/v3.3.0

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

# Run Flutter Android (requires Flutter SDK)
cd packages/clipchop_flutter && flutter run
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

### ⚠️ CRITICAL: Never Manually Create Tags or Releases

**NEVER use `git tag` or `gh release create` manually.** This breaks the build system!

**Why**: The workflow uses `semantic-release` to create tags. If a tag already exists:
- semantic-release skips publishing
- `new_release_published` outputs `false`
- Electron/Flutter builds are skipped
- Release has no downloadable apps

**Correct way to release**:
```bash
git commit -m "feat: your feature"   # Triggers minor version bump
git commit -m "fix: your fix"        # Triggers patch version bump
git push origin master               # Builds everything automatically
```

**If builds were skipped** (tag was created manually):
1. Delete the tag: `gh release delete vX.Y.Z --yes && git push origin --delete vX.Y.Z`
2. Push an empty commit: `git commit --allow-empty -m "chore: trigger rebuild"`
3. Push: `git push origin master`

**Or use manual workflow dispatch**:
- Go to Actions → Release → Run workflow
- Enter `force_version` (e.g., `3.3.0`) to rebuild without semantic-release

## PRE-COMMIT TESTING REQUIREMENT

**ALWAYS run and test locally before claiming to be finished:**

1. **Run automated tests:**
```bash
cd packages/desktop
bun run test           # Unit tests (must pass)
bun run test:e2e:smoke # Smoke tests (must pass)
```

2. **Manual verification:**
- Use Chrome DevTools to debug web version
- Use Android emulator/connected device for Flutter app
- Test actual video splitting with real files
- Verify UI animations and interactions work correctly

3. **Build verification:**
- Build locally before pushing to CI/CD
- Test the built artifacts (APK, Electron app) on actual devices when possible

**NEVER claim something is "done" or "fixed" without actual verification.**

---

## Current Status (v3.3.0 - Jan 9, 2026)

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
- Native app download banner (prompts users to get 20x faster native app)

**Mobile Support**:
- FFmpeg.wasm with background pre-loading
- Download progress tracking (MB downloaded/total)
- Mobile-optimized encoding (720p max, ultrafast preset)
- Handles Variable Frame Rate (VFR) phone videos correctly

**Testing**:
- 62 unit tests (vitest)
- E2E tests (Playwright)
- Smoke tests for quick iteration (~7s)

**Flutter Android App (v3.3.0 STABLE)**:
- Native Flutter app at `packages/clipchop_flutter`
- Uses `ffmpeg_kit_flutter_new` (community fork, actively maintained)
- Full native FFmpeg with hardware acceleration
- Matches web app UI (dark purple/amber theme, 3D cards)
- **APK Download**: Available on [GitHub Releases](https://github.com/shootdaj/clipchop/releases/tag/v3.3.0)
- Manual build: `cd packages/clipchop_flutter && flutter build apk --release`
- **ProGuard fix**: Release builds now work correctly (plugin code preserved)
- **Version display**: Shows app version in footer
- **NEW: Receive shared videos**: Share videos from Gallery/Photos to Clipchop to open and split them
- **Share to social**: Share split clips directly to Instagram, TikTok, etc.

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
- **Stable v3.3.0**: https://github.com/shootdaj/clipchop/releases/tag/v3.3.0

### CI/CD (GitHub Actions)

All handled by `.github/workflows/release.yml`:
- Semantic versioning from commit messages
- Electron builds for macOS/Windows/Linux
- Flutter APK build for Android
- Vercel deployment with pre-built assets

All artifacts uploaded to GitHub Releases automatically.

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
| 13 | 2026-01-09 | **v3.3.0**: Native share intent handling - receive videos from Gallery/Photos, share split clips to social media |
| 12 | 2026-01-07 | **v3.0.0 Major Release**: ProGuard fix for Flutter release builds, native app download banner on web, cross-platform content sync, version display in Flutter |
| 11 | 2026-01-07 | Elapsed time display, cleanup deprecated React Native |
| 10 | 2026-01-06 | Flutter Android app, native FFmpeg, CI/CD for APK |
| 9 | 2026-01-06 | FFmpeg.wasm mobile fix, v2.0.0 stable release |
| 8 | 2026-01-05 | Unified CI/CD, version display fix |
| 7 | 2026-01-05 | Audio sync fix, E2E tests |

For full history, see `PROGRESS.md`

---

## Useful Tips

### Send Files to Phone via QR Code
Generate a QR code for any URL that can be scanned on mobile:
```bash
# Open QR code in browser (works for any URL)
open "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=YOUR_URL_HERE"

# Example: Send APK to phone
open "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://github.com/shootdaj/clipchop/releases/download/v2.5.7/ClipChop-2.5.7-android.apk"
```

### Terminal QR Code (if qrcode-terminal is installed)
```bash
echo "https://your-url.com" | npx qrcode-terminal
```

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

### Flutter Release Build: MissingPluginException
- **Cause**: R8/ProGuard stripping plugin native code during minification
- **Fix**: Add keep rules in `android/app/proguard-rules.pro`:
  ```
  -keep class com.mr.flutter.plugin.filepicker.** { *; }
  -keep class com.arthenica.** { *; }
  ```
- **Full rules**: See `packages/clipchop_flutter/android/app/proguard-rules.pro`
- **Debug vs Release**: Debug builds work fine; only release builds need ProGuard rules

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
**Stable Release**: v3.3.0
