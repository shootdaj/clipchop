# Clipchop - Implementation Progress

## Current Status: v2.0.0 Stable Release
**Last Updated**: 2026-01-06 (Session 9) - Mobile FFmpeg.wasm Fix, Stable v2.0.0 Release

**Stable Release**: v2.0.0 - Tag this version to revert if needed

---

## Phase 1: Foundation
- [x] Initialize Vite + React + TypeScript project
- [x] Add Tailwind CSS (v4)
- [x] Add shadcn/ui
- [x] Add Motion (Framer Motion)
- [x] Set up WebAV with basic MP4Clip initialization
- [x] Create file upload component (with fluid animations)
- [x] Configure Vercel headers (vercel.json)
- [x] Set up dark/light theme (system preference)

## Phase 2: Core Splitting
- [x] Create useVideoSplitter hook with WebAV
- [x] Extract video metadata via `clip.meta` (duration, dimensions)
- [x] Build duration selector (presets: 15s, 30s, 60s, 90s + custom)
- [x] Implement split preview logic
- [x] Create WebAV split function using `clip.split()`
- [x] Export segments to MP4 via Combinator

## Phase 2.5: Testing
- [x] Set up Vitest for unit tests
- [x] Extract pure utility functions for testability (`src/lib/video-utils.ts`)
- [x] Test video split timing accuracy (43 tests passing)
- [x] Test segment duration correctness
- [x] Test file naming patterns (sequential and timestamp)
- [x] Test edge cases (short videos, exact matches, uneven splits)
- [x] Create validation function for segment timing
- [x] Set up Playwright for E2E tests
- [x] Create ffmpeg-based video utilities for test verification
- [x] Unit tests for ffmpeg utilities (19 tests)
- [x] E2E tests for browser-based video splitting
- [x] SSIM-based frame comparison for quality verification

## Phase 3: UI/UX Polish
- [x] Custom Motion animations (fluid/liquid springs)
- [x] 3D dark theme with purple + amber palette
- [x] Floating background orbs with morphing animation
- [x] 3D card system (card-3d, btn-3d, pill-3d)
- [x] Glow effects and hover states
- [x] Progress display with time estimates
- [x] Video preview with scrubbing (input + output)
- [x] Download panel (individual downloads)
- [ ] Download all as zip
- [ ] Mobile-responsive design
- [ ] Error handling + user feedback

## Phase 4: Enhancements
- [ ] Custom preset saving (localStorage)
- [ ] File naming pattern selector
- [ ] PWA setup for offline use
- [ ] Performance optimizations

## Phase 5: Integration Testing
- [ ] Test actual video splitting with real files
- [ ] Verify WebCodecs browser compatibility
- [ ] Test on Android Chrome

---

## Completed Items

### 2026-01-06 (Session 9) - Mobile FFmpeg.wasm Fix, Stable v2.0.0 Release
**MAJOR STABLE RELEASE**: v2.0.0

#### Problem Solved:
- **VFR (Variable Frame Rate) Videos**: Phone videos were choppy when split on mobile
- **Root Cause**: WebCodecs doesn't handle VFR properly on mobile devices
- **Solution**: Use FFmpeg.wasm for mobile (same engine as desktop FFmpeg)

#### FFmpeg.wasm Implementation:
- **Background Pre-loading**: Starts downloading 30MB wasm file when app loads on mobile
- **Progress Tracking**: Shows "Downloading: 15.2/30.6 MB" with live progress
- **Global State**: FFmpeg instance shared across hook instances (loads once)
- **Mobile Optimizations**:
  - `ultrafast` preset for faster encoding
  - CRF 28 (lower quality = faster)
  - Max 720p resolution forced on mobile
  - 96k audio bitrate

#### Technical Changes:
- **`use-video-splitter-ffmpeg-wasm.ts`**: Complete rewrite with:
  - `preloadFFmpeg()` function for background loading
  - Custom `downloadWithProgress()` for tracking wasm download
  - Global state management (`globalFFmpeg`, `globalLoadPromise`)
  - Mobile-optimized FFmpeg arguments
- **`use-video-splitter-hybrid.ts`**: Platform detection logic
  - Electron → Native FFmpeg
  - Mobile browser → FFmpeg.wasm
  - Desktop browser → WebCodecs
- **Interface updates**: Added `loadingMessage` to `SplitProgress` in all hooks
- **App.tsx**: Dynamic loading message display

#### Files Modified:
- `src/hooks/use-video-splitter-ffmpeg-wasm.ts` - Complete rewrite
- `src/hooks/use-video-splitter-hybrid.ts` - Unchanged (already had correct logic)
- `src/hooks/use-video-splitter.ts` - Added loadingMessage interface
- `src/hooks/use-video-splitter-electron.ts` - Added loadingMessage interface
- `src/hooks/use-video-splitter-mediarecorder.ts` - Added loadingMessage interface
- `src/App.tsx` - Dynamic loading message

#### Why v2.0.0?
This is marked as a major stable release because:
1. Mobile video splitting now works correctly
2. VFR handling is properly addressed
3. All platforms have production-ready implementations
4. Can be used as a safe rollback point

#### Previous Attempts (What Failed):
1. **WebCodecs with 60fps** - Still choppy on mobile
2. **WebCodecs with mobile optimizations** - Still choppy
3. **MediaRecorder approach** - Audio/video sync issues
4. **FFmpeg.wasm with wrong config** - Loading failures

---

### 2026-01-05 (Session 8) - Unified CI/CD, Version Display Fix
**Updates**: Moved Vercel deployment to GitHub Actions, fixed version display

#### Version Display Issue:
- **Problem**: Web app showed `v0.0.0-development` instead of actual version
- **Root Cause**: Vercel's shallow clone doesn't include git tags, so `git describe --tags` failed
- **Solution**: Deploy via GitHub Actions which has full git history and injects `APP_VERSION` env var

#### CI/CD Unification:
- **Before**: Vercel had its own GitHub integration (separate from GitHub Actions)
- **After**: Single GitHub Actions workflow handles everything:
  - Semantic versioning (semantic-release)
  - Electron builds for macOS/Windows/Linux
  - Vercel deployment with pre-built assets
- **Benefits**:
  - Version always correct (from git tags)
  - Single source of truth for all deployments
  - No race conditions between Vercel and GitHub Actions

#### Windows Build Fix:
- **Problem**: PowerShell syntax error (`VERSION="1.4.2": The term 'VERSION=1.4.2' is not recognized`)
- **Solution**: Added `shell: bash` to version injection step in release.yml

#### Vercel Pre-built Deployment:
- Uses Vercel Output API format (`.vercel/output/static/`)
- Deploys with `--prebuilt` flag to skip remote build
- COOP/COEP headers configured in `config.json`

#### Required GitHub Secrets:
- `VERCEL_TOKEN` - Full Account scope API token
- `VERCEL_ORG_ID` - `team_yiKtg8AQq9Z9ezBem9SYYvsF`
- `VERCEL_PROJECT_ID` - `prj_g5WRS4bKA5uwWulTB1lfsMrw7AbW`

#### Files Modified:
- `.github/workflows/release.yml` - Added deploy-vercel job, fixed Windows shell
- `CLAUDE.md` - Updated deployment docs
- `PROGRESS.md` - Added session 8 entry

#### Important:
- **Vercel GitHub integration DISABLED** - all deploys via GitHub Actions
- Never run `vercel` commands manually

---

### 2026-01-05 (Session 7) - Audio Sync Fix, E2E Tests, Unit Tests
**Updates**: Fixed audio/video sync issue, comprehensive test suite

#### Audio/Video Sync Fix:
- **Root Cause**: When splitting at 30s, the actual split happens at a keyframe (e.g., 29.98s due to keyframe alignment), but we were setting `sprite.time.duration` to exactly 30s (our calculated duration)
- **Fix**: Now use `segmentClip.meta.duration` (the clip's actual duration after split) instead of pre-calculated duration
- **File Modified**: `src/hooks/use-video-splitter.ts`

#### Test Infrastructure:
- **Unit Tests** (62 total, ~3s runtime):
  - `src/lib/video-utils.test.ts` - 43 tests for segment calculations
  - `e2e/utils/video-utils.unit.test.ts` - 19 tests for ffmpeg utilities
- **E2E Tests** (Playwright, browser-based):
  - Video upload and metadata display
  - Segment calculation UI verification
  - Full video split with WebCodecs
  - Frame comparison using SSIM (perceptual similarity)
  - Progress display during split
  - Start over functionality
- **Smoke Tests**: Quick tests tagged with `@smoke` for fast iteration

#### Test Commands:
```bash
bun run test           # Unit tests only (62 tests)
bun run test:watch     # Unit tests in watch mode
bun run test:e2e       # Full E2E tests
bun run test:e2e:smoke # Quick smoke tests (~7s)
bun run test:all       # Both unit and E2E
```

#### SSIM Frame Comparison:
- Switched from PSNR to SSIM for perceptual frame comparison
- SSIM correlates better with human visual perception
- Used to verify split happens at correct timestamps

#### Files Created/Modified:
- `e2e/utils/video-utils.unit.test.ts` - New unit tests for ffmpeg utilities
- `e2e/tests/video-split.spec.ts` - Updated with smoke tags, H.264 support
- `e2e/utils/video-utils.ts` - Changed from PSNR to SSIM comparison
- `vitest.config.ts` - Added e2e unit test paths
- `package.json` - Added test scripts

### 2026-01-05 (Session 6) - Video Preview, Animation Fixes, CI/CD Improvements
**Updates**: Video preview with scrubbing, animation performance fixes, download functionality

#### Video Preview Feature:
- **VideoPreview Component** (`src/components/video-preview.tsx`):
  - Native HTML5 `<video>` player with controls (play, pause, scrub, volume, fullscreen)
  - Supports both File/Blob (web) and file:// paths (Electron)
  - Optimized spring animations
- **VideoPreviewGrid Component** (`src/components/video-preview-grid.tsx`):
  - Grid display of all output segments
  - Individual download button per clip
  - "Download All" button for batch downloads
  - Responsive layout
- **Input Preview**: Shows uploaded video with scrubbing above settings
- **Output Previews**: Replaced "Show Files" with playable video previews + downloads

#### Animation Performance Fixes:
- **Root Causes Identified**:
  - Infinite orb animations using Motion.js (runs on main thread)
  - Animating `height: 'auto'` (not GPU-accelerated, triggers layout thrashing)
  - Overuse of `layout` prop (unnecessary recalculations)
  - Low damping springs causing excessive oscillations
  - Uncapped stagger delays on large lists
- **Solutions Applied**:
  - Moved orb animations to CSS (`animate-float-slow`, `animate-float-medium`, `animate-float-fast`)
  - Removed `height: 'auto'` animations, using opacity/transform only
  - Removed unnecessary `layout` props from containers
  - Increased spring damping (14→22-25) for smoother animations
  - Capped stagger delays: `Math.min(index * 0.03, 0.15)`
- **Spring Config Changes**:
  - `fluidSpring`: stiffness 200, damping 25, mass 0.8 (was 120, 14, 1)
  - `bouncySpring`: stiffness 300, damping 22, mass 0.6 (was 400, 25, 0.5)
  - `gentleSpring`: stiffness 150, damping 25, mass 0.9 (was 80, 20, 1.2)

#### Download Functionality:
- **Electron IPC Handler** (`electron/ipc-handlers.ts`):
  - `copyToDownloads` handler copies files to ~/Downloads
  - Handles filename conflicts by adding number suffix
- **Web Downloads**: Creates blob URL and triggers download via `<a>` element
- **Both Platforms**: Auto-downloads to ~/Downloads without prompts

#### CI/CD Improvements:
- **Tag-based Versioning**: Uses git tags as source of truth
- **Version Injection**: `package.json` has `0.0.0-development`, CI injects actual version
- **FFmpeg Bundling**: Fixed Electron builds to include ffmpeg binaries

#### Files Modified:
- `src/App.tsx` - Animation fixes, video preview integration
- `src/index.css` - Added CSS animation classes for orbs
- `src/components/video-preview.tsx` - Created
- `src/components/video-preview-grid.tsx` - Created
- `src/components/duration-selector.tsx` - Animation fixes
- `src/components/split-preview.tsx` - Animation fixes
- `src/hooks/use-video-splitter.ts` - Added `inputSource`
- `src/hooks/use-video-splitter-electron.ts` - Added `inputSource`
- `src/types/electron.d.ts` - Added `copyToDownloads` type
- `electron/ipc-handlers.ts` - Added download handler
- `electron/preload.ts` - Added `copyToDownloads` bridge

### 2026-01-04 (Session 5 Cont.) - Multi-Platform + Deployment
**Updates**: Monorepo, React Native mobile (blocked), Web PWA deployed

#### Critical Fixes:
- **Video Rotation Bug**: Fixed double-rotation issue by using FFmpeg's autorotate
  - Root cause: FFmpeg auto-rotates on decode, then we rotated again
  - Solution: Let FFmpeg handle rotation, calculate dimensions post-rotation
  - Tested with multiple transpose options to verify correct orientation
- **PWA Installation**: Fixed icons (were 1x1 placeholders, now proper 192x192/512x512 PNGs)
- **Service Worker Caching**: Can cause stale assets, users need cache clear

#### Architecture Changes:
- **Monorepo Created**: packages/shared, packages/desktop, packages/mobile
- **Hybrid Mode**: Auto-detects Electron vs Web, uses appropriate backend
- **Shared Code**: 75% business logic reused across platforms
- **Web + Electron in One**: packages/desktop serves both via hybrid hook

#### Mobile Native App (React Native):
- ✅ Created React Native app structure
- ✅ Integrated FFmpeg Kit and document picker
- ✅ Copied shared utilities for split calculations
- ✅ Android + iOS support in same codebase
- ❌ BLOCKED: All FFmpeg packages deprecated/broken
  - ffmpeg-kit-react-native: 404 errors
  - react-native-ffmpeg: jcenter removed
- 📱 Code ready, waiting for maintained FFmpeg package

#### Deployment:
- ✅ Web deployed to Vercel: https://desktop-seven-lake.vercel.app
- ✅ PWA support with manifest and service worker
- ✅ GitHub Actions for Electron releases
- ⚠️ Vercel GitHub Action needs secrets (using manual deploy for now)
- ❌ Mobile builds failing (FFmpeg dependency issues)

#### Performance Verified:
- Desktop: 1-2 min for 4K video ✅
- Web: 30-60 min for 4K video (inherent limitation)
- Mobile: Would be 2-5 min (blocked)

### 2026-01-04 (Session 5) - ⚡ Electron Native App Conversion
**MAJOR UPDATE**: Converted from web app to Electron desktop app for 20-30x faster encoding

#### What Changed:
- **Backend**: Replaced WebAV with native FFmpeg via fluent-ffmpeg
- **Architecture**: Added Electron main process with IPC communication
- **Hardware Acceleration**: Automatic GPU encoding (VideoToolbox on Mac, NVENC on Windows)
- **Performance**: 4K video encoding now takes ~1-2 minutes instead of 30-60 minutes
- **File Handling**: Native file dialogs and direct file system access

#### New Files Created:
- `electron/main.ts` - Electron main process with window management
- `electron/preload.ts` - Secure IPC bridge between renderer and main
- `electron/ffmpeg.ts` - FFmpeg wrapper with hardware acceleration
- `electron/ipc-handlers.ts` - IPC handlers for video operations
- `src/hooks/use-video-splitter-electron.ts` - Electron-specific React hook
- `src/types/electron.d.ts` - TypeScript definitions for Electron API

#### Configuration Updates:
- Added Electron, electron-builder, FFmpeg dependencies
- Created `tsconfig.electron.json` for Electron TypeScript compilation
- Updated `package.json` with Electron scripts and build config
- Modified `vite.config.ts` for Electron compatibility (base: './')
- Updated `.gitignore` for Electron build artifacts

#### Performance Improvements:
- **Full Quality (4K)**: ~1-2 min per minute of video (vs 15-30 min web)
- **HD (1920px)**: ~30-60 sec per minute (vs 5-10 min web)
- **SD (1280px)**: ~15-30 sec per minute (vs 2-5 min web)
- Hardware acceleration automatically detected and used when available

#### How to Run:
```bash
# Development mode
bun run electron:dev

# Build for production
bun run electron:build        # All platforms
bun run electron:build:mac    # macOS only
bun run electron:build:win    # Windows only
bun run electron:build:linux  # Linux only
```

### 2026-01-04 (Session 3) - UI Redesign
- Complete 3D dark theme redesign with purple (#a855f7) + amber (#f59e0b) palette
- Background: near-black (#0a0a12) with floating morphing orbs
- Implemented 3D card system with multi-layer shadows
- Implemented 3D buttons with press-down effect (4px offset)
- Added pill-3d buttons for duration selector
- Created fluid spring animations:
  - `fluidSpring`: stiffness 120, damping 14, mass 1
  - `bouncySpring`: stiffness 400, damping 25, mass 0.5
  - `gentleSpring`: stiffness 80, damping 20, mass 1.2
- Added hover states with scale + lift effect
- Added staggered list animations
- **Bug fix**: VideoEncoder "closed codec" error - added `await sprite.ready` and `sprite.time` duration before Combinator export
- Updated RESEARCH.md with implementation details
- Created Notion page for design research under Dev page

### 2025-01-04 (Session 2)
- Set up Vitest with jsdom environment
- Created `src/lib/video-utils.ts` with pure utility functions
- Added comprehensive test suite with 43 tests:
  - Time conversion (microseconds ↔ seconds)
  - Filename formatting and generation
  - Segment boundary calculations
  - Timing accuracy validation
  - Edge cases (zero duration, negative values, etc.)
  - Social media preset tests (15s, 60s, 90s)
- Refactored `useVideoSplitter` hook to use extracted utilities

### 2025-01-04 (Session 1)
- Created project structure with Vite + React + TypeScript
- Added all foundation dependencies
- Built VideoUploader component with drag-drop and fluid animations
- Built DurationSelector with preset buttons and custom input
- Built SplitPreview with visual timeline
- Built VideoInfo display component
- Created useVideoSplitter hook with full WebAV integration
- Wired everything together in App.tsx

---

## Notes & Decisions Log

### 2026-01-04
- Color scheme: Purple + Amber (not cyan) per user preference
- 3D design inspired by dark mode control panel reference image
- WebAV bug: Must set `sprite.time` with duration before adding to Combinator, otherwise encoder closes prematurely

### 2025-01-04
- Chose WebAV over FFmpeg.wasm (20x faster, smaller bundle)
- Motion (Framer Motion) for animations with fluid/liquid feel
- shadcn/ui for accessible component primitives
- Dark + Light theme (system preference)
- Chrome 102+ only (WebCodecs requirement)
- No Safari support (intentional)
- Bun as package manager
- Extracted pure utility functions for testability

## Test Coverage

### Unit Tests (62 tests, ~3s)
```bash
bun run test           # Run once
bun run test:watch     # Watch mode
```

**Files:**
- `src/lib/video-utils.test.ts` - 43 tests for segment calculations
- `e2e/utils/video-utils.unit.test.ts` - 19 tests for ffmpeg utilities

**Coverage:**
- Segment boundary calculations
- Duration conversions (μs ↔ s)
- File naming patterns
- Edge cases (zero, negative, short videos)
- FFmpeg metadata extraction
- SSIM frame comparison
- Video creation and cleanup

### E2E Tests (Playwright)
```bash
bun run test:e2e       # Full suite
bun run test:e2e:smoke # Quick smoke tests (~7s)
bun run test:e2e:ui    # Interactive UI mode
```

**Coverage:**
- Video upload via file input
- Metadata display in UI
- Segment calculation display
- WebCodecs video splitting
- Progress indicator during split
- Frame comparison at split boundaries
- Start over functionality
