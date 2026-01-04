# ⚠️ AGENT: READ THIS FILE FIRST BEFORE ANY WORK ⚠️

If you are starting a new session, **STOP** and read this entire file BEFORE doing anything else.

---

# Clipchop - Multi-Platform Video Splitter

Video splitter app that cuts videos into smaller durations for social media (Instagram, TikTok, etc.)

**Last Updated**: 2026-01-04 (Session 5) - Electron + Web + Mobile

---

## 🚨 Agent Handoff Protocol

**CRITICAL**: This project has NO memory between sessions. Always:

1. **Read this file first** - Contains current architecture and status
2. **Check `PROGRESS.md`** - Implementation history and completed tasks
3. **Update this file** - Add any major changes to Architecture or Current Status sections
4. **Update `PROGRESS.md`** - Log what you completed
5. **Use TodoWrite** - Track in-session progress

---

## Current Status (Session 5 - Jan 4, 2026)

### ✅ What's Working

**Desktop App (Electron)**:
- ✅ Fully functional on macOS/Windows/Linux
- ✅ Native FFmpeg with GPU acceleration (VideoToolbox/NVENC)
- ✅ 20-30x faster than web version
- ✅ Video rotation fixed (uses FFmpeg autorotate)
- ✅ All quality options working (Full/HD/SD)
- ✅ Time estimates with progress updates
- ✅ Local development: `bun run dev:desktop` from root

**Web App (Vercel)**:
- ✅ Deployed to https://desktop-seven-lake.vercel.app
- ✅ PWA support with manifest and service worker
- ✅ Works on Chrome 102+ desktop browsers
- ⚠️ VERY SLOW (30-60 min for 4K videos) - WebCodecs limitation
- ⚠️ Limited Android support (Chrome < 102 won't work)
- ✅ Shows install prompt for PWA on mobile

### ⚠️ Known Issues

**Web Version**:
- Slow performance (inherent to browser-based encoding)
- Service worker cache can cause stale assets (users need hard refresh)
- Android Chrome may not support WebCodecs depending on version

**Mobile Native App (React Native)**:
- ❌ BLOCKED: All FFmpeg packages deprecated
  - `ffmpeg-kit-react-native`: 404 errors, deprecated
  - `react-native-ffmpeg`: jcenter() removed, deprecated
- 🔧 Code ready in `packages/mobile` but won't build
- 📱 Waiting for maintained FFmpeg package

---

## Architecture

### Monorepo Structure

```
clipchop/
├── packages/
│   ├── shared/          # Shared business logic (75% reuse)
│   │   └── src/
│   │       ├── video-utils.ts    # Split calculations
│   │       └── utils.ts          # Utilities
│   ├── desktop/         # Electron + Web (hybrid)
│   │   ├── electron/    # Electron main process
│   │   │   ├── main.ts
│   │   │   ├── preload.ts
│   │   │   ├── ffmpeg.ts         # FFmpeg wrapper
│   │   │   └── ipc-handlers.ts
│   │   └── src/         # React frontend
│   │       ├── hooks/
│   │       │   ├── use-video-splitter.ts           # WebCodecs (web)
│   │       │   ├── use-video-splitter-electron.ts  # FFmpeg (Electron)
│   │       │   ├── use-video-splitter-ffmpeg-wasm.ts # FFmpeg.wasm (universal)
│   │       │   └── use-video-splitter-hybrid.ts    # Auto-detection
│   │       └── components/
│   └── mobile/          # React Native (Android/iOS) - BLOCKED
│       ├── android/
│       ├── ios/
│       └── src/
└── .github/workflows/   # CI/CD
    ├── electron-release.yml      # Desktop builds
    ├── mobile-release.yml        # Mobile builds (failing)
    ├── github-pages.yml          # Web deployment
    └── vercel-deploy.yml         # Web deployment (unused)
```

### Platform Support Matrix

| Platform | Technology | Speed | Status | Deploy Method |
|----------|-----------|-------|--------|---------------|
| **Windows** | Electron + FFmpeg | ⚡ 1-2 min | ✅ Working | GitHub Releases |
| **macOS** | Electron + FFmpeg | ⚡ 1-2 min | ✅ Working | GitHub Releases |
| **Linux** | Electron + FFmpeg | ⚡ 1-2 min | ✅ Working | GitHub Releases |
| **Web (Desktop)** | WebCodecs | 🐌 30-60 min | ✅ Working | Vercel |
| **Android** | WebCodecs (PWA) | 🐌 30-60 min | ⚠️ Limited | Vercel |
| **Android Native** | React Native + FFmpeg | ⚡ 2-5 min | ❌ Blocked | GitHub Actions |
| **iOS Native** | React Native + FFmpeg | ⚡ 2-5 min | ❌ Blocked | GitHub Actions |

---

## Tech Stack (Current)

### Desktop (Electron)
- **Framework**: Electron 39 + React 18 + TypeScript
- **Video Processing**: FFmpeg (fluent-ffmpeg)
- **Hardware Acceleration**: VideoToolbox (Mac), NVENC (Windows), VA-API (Linux)
- **Build**: Vite + electron-builder
- **Performance**: 20-30x faster than web

### Web (Browser)
- **Framework**: React 18 + TypeScript
- **Video Processing**: WebCodecs API (browser-native) OR @webav/av-cliper
- **Animation**: Motion (Framer Motion)
- **Components**: shadcn/ui + custom 3D components
- **Styling**: Tailwind CSS v4
- **Hosting**: Vercel
- **PWA**: manifest.json + service worker

### Mobile (React Native) - BLOCKED
- **Framework**: React Native 0.83
- **Video Processing**: BLOCKED (no working FFmpeg package)
- **Build**: Gradle (Android), Xcode (iOS)
- **Status**: Code ready, dependencies broken

### Shared
- **Language**: TypeScript
- **Package Manager**: Bun (root + desktop), npm (mobile)
- **Code Sharing**: ~75% logic reused across platforms

---

## Key Technical Details

### Video Processing Approaches

**1. Desktop (Electron)** - CURRENT PRODUCTION
```typescript
// Uses native FFmpeg via fluent-ffmpeg
ffmpeg(filePath)
  .inputOptions(['-accurate_seek', `-ss ${startTime}`])
  .duration(duration)
  .videoCodec('h264_videotoolbox')  // or h264_nvenc on Windows
```
- Automatic rotation handling via FFmpeg's autorotate
- Hardware GPU encoding
- Extremely fast

**2. Web (Browser)** - PRODUCTION
```typescript
// Uses WebCodecs or WebAV
const clip = new MP4Clip(file.stream())
await clip.split(timeInMicroseconds)
```
- Slow (software-only)
- Requires COOP/COEP headers
- Chrome 102+ only

**3. Mobile Native** - BLOCKED
```typescript
// Would use FFmpeg Kit
await RNFFmpeg.execute(command)
```
- All packages deprecated
- Can't build until resolved

### Critical Bug Fixes (Session 5)

**Video Rotation Issue** (RESOLVED):
- Problem: Videos rotated 90° wrong
- Root Cause: FFmpeg auto-rotates during decode, we rotated again (double rotation)
- Solution: Let FFmpeg autorotate, don't apply transpose filter
- Code: Removed all transpose logic, dimensions calculated post-rotation

**4K Encoding Performance** (RESOLVED for Desktop):
- Problem: Web took 30-60 minutes for 4K
- Solution: Electron with GPU acceleration
- Result: Now 1-2 minutes (20-30x speedup)

**PWA Installation** (RESOLVED):
- Problem: Icons were 1x1 pixel placeholders
- Solution: Created proper 192x192 and 512x512 PNGs
- Result: PWA now installable on Android

---

## Running the Apps

### Desktop Development
```bash
cd /Users/anshul/Anshul/Code/clipchop
bun run dev:desktop
# or
cd packages/desktop && bun run electron:dev
```

### Web Development
```bash
cd packages/desktop && bun run dev
# Opens at http://localhost:5173
```

### Mobile Development (Currently Broken)
```bash
cd packages/mobile
npm install --legacy-peer-deps
npx react-native run-android  # Requires Android SDK
```

### Building for Production

**Desktop**:
```bash
cd packages/desktop
bun run electron:build        # All platforms
bun run electron:build:mac    # Mac only
bun run electron:build:win    # Windows only
```

**Web**:
```bash
cd packages/desktop
bun run build
# Deploy: cd dist && vercel --prod --yes
```

---

## Deployment

### Production URLs

**Web App**: https://desktop-seven-lake.vercel.app  
**Desktop Releases**: https://github.com/shootdaj/clipchop/releases  
**Mobile**: N/A (blocked)

### CI/CD Workflows

**GitHub Actions**:
- `.github/workflows/electron-release.yml` - Triggered by `v*` tags
- `.github/workflows/mobile-release.yml` - Triggered by `mobile-v*` tags (failing)
- `.github/workflows/github-pages.yml` - Triggered by push to master
- `.github/workflows/vercel-deploy.yml` - (not used, manual deploy)

**Manual Deployments**:
```bash
# Web to Vercel
cd packages/desktop && bun run build && cd dist && vercel --prod --yes

# Desktop release
git tag v1.0.0 && git push origin v1.0.0
```

---

## Critical Files to Update

When making changes, update these:

1. **This file** (`CLAUDE.md`) - Architecture, status, known issues
2. **`PROGRESS.md`** - Session history, what was completed
3. **`packages/desktop/src/hooks/use-video-splitter-hybrid.ts`** - Auto-detects Electron vs Web
4. **`packages/desktop/electron/ffmpeg.ts`** - Video encoding logic

---

## Current Blockers

### Mobile Native App
**Issue**: No working FFmpeg package for React Native  
**Packages Tried**:
- `ffmpeg-kit-react-native` v6.0.2 - Deprecated, 404 errors
- `react-native-ffmpeg` v0.5.2 - Deprecated, jcenter() removed

**Resolution Options**:
1. Wait for `@ffmpeg/ffmpeg` React Native port
2. Build custom native modules (Java/Kotlin + Swift)
3. Use web version for mobile (current workaround)

**Code Status**: Complete and ready in `packages/mobile/`, just can't build

---

## Performance Benchmarks (User's 1:34 4K Video)

| Platform | Time to Split | Speedup vs Web |
|----------|--------------|----------------|
| **Desktop (Electron)** | 1-2 minutes | 20-30x faster |
| **Web (Desktop Chrome)** | 30-60 minutes | 1x (baseline) |
| **Android Chrome (PWA)** | 30-60 minutes | 1x |
| **Android Native (RN)** | Would be 2-5 min | Blocked |

---

## Repository Info

**GitHub**: https://github.com/shootdaj/clipchop  
**Branch**: master  
**Latest Commits** (as of Session 5):
- 16241f4: PWA icons fixed
- 8621915: PWA support added
- c4edac8: React Native mobile app created
- d0b8849: Electron conversion complete

---

## Next Agent Should Know

### If Continuing Mobile Work:
1. Check if FFmpeg packages are maintained again
2. Alternative: Implement custom native modules
3. Consider Capacitor as FFmpeg wrapper alternative

### If Optimizing Web:
1. Current web version works but is slow (inherent limitation)
2. FFmpeg.wasm hook created (`use-video-splitter-ffmpeg-wasm.ts`) but not integrated
3. Could add for broader browser support (even slower than WebCodecs)

### If Fixing PWA:
1. Service worker caches aggressively - can cause stale asset issues
2. Icons must be proper-sized PNGs (not placeholders)
3. Manifest requires absolute paths for icons on Vercel

### Common Issues to Watch For:
- **Module format conflicts**: Desktop needs CommonJS for Electron, ESM for Vite
- **Workspace dependencies**: npm doesn't understand Bun's `workspace:*` syntax
- **Video rotation**: Always use FFmpeg autorotate, never manual transpose
- **Cache problems**: Service worker can serve stale HTML/assets

---

## Development Tips

**Testing Video Rotation**:
```bash
# Use test-all-transpose.sh to verify rotation handling
./test-all-transpose.sh
# Check which output looks correct before changing code
```

**Debugging Electron**:
- Console logs appear in terminal where you ran `electron:dev`
- DevTools open automatically in dev mode
- Check `dist-electron/` for compiled output

**Debugging Web**:
- Service worker can cache old versions - clear in DevTools
- COOP/COEP headers required - verify in Network tab
- WebCodecs availability: `'VideoEncoder' in window`

---

## File Organization

**Shared Code** (packages/shared):
- `video-utils.ts` - All split timing calculations
- Used by desktop AND mobile

**Desktop/Web Code** (packages/desktop):
- Same React components for both
- Hooks auto-detect Electron vs Web mode
- FFmpeg for Electron, WebCodecs for Web

**Mobile Code** (packages/mobile):
- React Native app
- Copies of shared utilities (workspace dependency doesn't work with npm)
- Currently can't build due to FFmpeg package issues

**Documentation**:
- `CLAUDE.md` (this file) - Agent handoff
- `PROGRESS.md` - Session history
- `ELECTRON_CONVERSION_PLAN.md` - Conversion technical details
- `PERFORMANCE_ANALYSIS.md` - Speed benchmarks
- `CI_CD_SETUP.md` - Deployment instructions
- `DEPLOYMENT_READY.md` - Deploy checklist
- `FINAL_STATUS.md` - Session 5 summary

---

## Quick Reference

### Start Electron App
```bash
cd packages/desktop && bun run electron:dev
```

### Test Web Version
```bash
cd packages/desktop && bun run dev
# Visit http://localhost:5173
```

### Deploy to Vercel
```bash
cd packages/desktop && bun run build && cd dist && vercel --prod --yes
```

### Create Desktop Release
```bash
git tag v1.0.0
git push origin v1.0.0
# GitHub Actions builds all platforms
```

---

## Important Notes

1. **Don't remove debug logs** until user confirms success (if in debug mode)
2. **Always test rotation** with actual phone videos (have rotation metadata)
3. **Never guess at fixes** - use runtime evidence and tests
4. **Vercel caching** - Users may need to clear cache to see updates
5. **Module systems** - Be careful with CommonJS vs ESM in Electron

---

## External Dependencies

**Critical**:
- FFmpeg binaries (bundled with Electron app via @ffmpeg-installer)
- WebCodecs API (browser support varies)
- Vercel CLI (`bun add -g vercel`) for deployment

**Optional**:
- Android SDK (for mobile development - currently blocked)
- Xcode (for iOS development - currently blocked)

---

## Success Criteria Met

- ✅ Desktop app 20-30x faster
- ✅ Works on Windows/Mac/Linux
- ✅ Web version deployed (slow but functional)
- ✅ PWA installable on mobile
- ✅ Video rotation handling correct
- ✅ Multi-platform with code reuse
- ⚠️ Android native blocked (package issues)

---

**For detailed session history, see `PROGRESS.md`**  
**For deployment instructions, see `CI_CD_SETUP.md`**  
**For performance data, see `PERFORMANCE_ANALYSIS.md`**
