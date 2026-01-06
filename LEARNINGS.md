# Clipchop - Technical Learnings

Lessons learned from debugging mobile video splitting issues.

**Date**: 2026-01-06 (Session 9)

---

## The Problem

**VFR (Variable Frame Rate) phone videos came out choppy when split on mobile browsers.**

- Desktop browser: Worked fine
- Desktop Electron: Worked fine
- Mobile browser: Choppy, broken
- Capacitor app: Choppy, broken

---

## What We Tried (And Why It Failed)

### Attempt 1: WebCodecs with 60fps

**Idea**: Force higher frame rate to smooth things out

**Result**: Still choppy

**Why it failed**: The issue wasn't frame rate - it was timing. VFR videos have variable gaps between frames. WebCodecs on mobile couldn't handle the inconsistent timing.

---

### Attempt 2: WebCodecs with aggressive mobile optimizations

**Idea**: Lower resolution (720p), lower fps (24), throttle encoding with delays

**Code**:
```typescript
// Tried these optimizations
const settings = {
  maxResolution: 1280,  // Force 720p
  fps: 24,              // Lower fps
  bitrate: 1500000,     // Lower bitrate
  throttleDelay: 50     // Add delays between frames
}
```

**Result**: Still choppy

**Why it failed**: Same root cause - WebCodecs fundamentally struggles with VFR on mobile hardware. The optimizations just made it faster, not smoother.

---

### Attempt 3: MediaRecorder approach

**Idea**: Use browser's native recording API to capture video playback to canvas

**Code**:
```typescript
const canvas = document.createElement('canvas')
const stream = canvas.captureStream(30)
const recorder = new MediaRecorder(stream)
// Play video, draw to canvas, record output
```

**Result**: Multiple issues in sequence:
1. No audio (couldn't capture audio track)
2. Added audio via `video.captureStream()` → audio played before video
3. Tried direct `video.captureStream()` → video chopped every 0.5s
4. Tried AudioContext delay compensation → completely broken, second segment was one frame

**Why it failed**: MediaRecorder records in real-time from a canvas. We were fighting against:
- Timing issues between video playback and canvas drawing
- Audio stream capture limitations on mobile
- Browser differences in MediaRecorder timing
- Synchronization between video decode, canvas draw, and MediaRecorder

---

### Attempt 4: FFmpeg.wasm (first attempt)

**Idea**: Use the same FFmpeg engine as desktop, just in WebAssembly

**Result**: "Failed to load video" errors

**Why it failed**:
- Wrong package path (`@ffmpeg/core-st` doesn't exist)
- 30MB download timing out silently
- No progress indicator - users thought it was broken
- Loading during video selection = frustrating wait

---

## What Finally Worked

### FFmpeg.wasm with proper implementation

**Key changes**:

#### 1. Background Pre-loading
```typescript
// Start download immediately when app loads on mobile
useEffect(() => {
  if (isMobile && !globalFFmpeg && !globalLoadPromise) {
    preloadFFmpeg((percent, message) => {
      console.log(`FFmpeg load: ${percent}% - ${message}`)
    })
  }
}, [])
```

Instead of waiting for user to select a video, start downloading the 30MB wasm file as soon as the app loads.

#### 2. Progress Tracking with Streaming Fetch
```typescript
const downloadWithProgress = async (url: string, type: string): Promise<string> => {
  const response = await fetch(url)
  const contentLength = response.headers.get('content-length')
  const total = contentLength ? parseInt(contentLength, 10) : 0

  const reader = response.body?.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length

    const mb = (received / 1024 / 1024).toFixed(1)
    const totalMb = (total / 1024 / 1024).toFixed(1)
    onProgress?.(percent, `Downloading: ${mb}/${totalMb} MB`)
  }

  const blob = new Blob(chunks, { type })
  return URL.createObjectURL(blob)
}
```

Users see "Downloading: 15.2/30.6 MB" - they know something is happening.

#### 3. Global State (Load Once)
```typescript
// Shared across all hook instances
let globalFFmpeg: FFmpeg | null = null
let globalLoadPromise: Promise<void> | null = null
let globalLoadError: string | null = null
```

FFmpeg loads once and is reused. No duplicate downloads.

#### 4. Mobile-Optimized FFmpeg Arguments
```typescript
const args = [
  '-ss', startTime,           // Seek first (fast)
  '-i', 'input.mp4',
  '-t', duration,
  '-c:v', 'libx264',
  '-preset', 'ultrafast',     // Fastest encoding
  '-crf', '28',               // Lower quality = faster
  '-tune', 'fastdecode',      // Optimize for playback
  '-c:a', 'aac',
  '-b:a', '96k',              // Lower audio bitrate
]

// Force 720p max on mobile
if (maxDim > 1280) {
  args.push('-vf', `scale=${newWidth}:${newHeight}`)
}
```

---

## Why FFmpeg.wasm Works When Others Failed

### The Core Insight

FFmpeg properly handles VFR videos because it:

1. **Reads timestamps correctly** - FFmpeg's demuxer understands variable frame timing from the container
2. **Re-encodes with consistent timing** - Output is CFR (Constant Frame Rate)
3. **Same engine as desktop** - Literally the same C code compiled to WebAssembly

### Why WebCodecs Failed on Mobile

- Lower-level API that expects you to handle timing yourself
- Mobile browsers have different WebCodecs implementations
- VFR handling isn't standardized across browsers
- Desktop Chrome has better WebCodecs implementation than mobile Chrome

### Why MediaRecorder Failed

- Real-time recording can't match frame-accurate timing
- Audio/video sync depends on browser implementation
- Canvas drawing introduces timing jitter
- No way to control exact frame timing

---

## Key Lessons

### 1. Understand the root cause before trying fixes

We tried many surface-level fixes (fps, resolution, throttling) before understanding that the real issue was **VFR timing handling**.

**Lesson**: Spend time diagnosing before coding solutions.

### 2. The 30MB file wasn't the problem - silent failure was

FFmpeg.wasm was always the right solution. The early attempts failed because of implementation issues, not the technology:
- No progress indicator = users thought it was broken
- Silent timeout = no error message
- Loading at wrong time = bad UX

**Lesson**: Good error handling and user feedback are as important as the core logic.

### 3. Pre-loading is crucial for large dependencies

Starting the 30MB download in the background changed the UX completely. By the time users select a video, FFmpeg is ready.

**Lesson**: For large assets, start loading before they're needed.

### 4. Use the same engine across platforms when possible

| Platform | Engine | Result |
|----------|--------|--------|
| Desktop Electron | Native FFmpeg | ✅ Works |
| Desktop Browser | WebCodecs | ✅ Works |
| Mobile Browser | WebCodecs | ❌ Choppy |
| Mobile Browser | FFmpeg.wasm | ✅ Works |

FFmpeg handles VFR correctly everywhere. WebCodecs only works on desktop.

**Lesson**: Consistency > cleverness. Use proven tools.

### 5. Document failed attempts

Recording what didn't work and why is just as valuable as documenting what worked. It prevents:
- Future you from trying the same failed approaches
- Other developers from wasting time
- AI agents from repeating mistakes

**Lesson**: Write down failures, not just successes.

---

## The Pattern

```
Problem
  → Quick fix attempt
  → Still broken
  → Deeper investigation
  → Understand root cause
  → Choose right tool
  → Proper implementation
  → Document everything
```

The difference between failed FFmpeg.wasm and working FFmpeg.wasm wasn't the technology - it was **implementation quality**:
- Error handling
- Progress tracking
- Pre-loading
- Proper configuration
- User feedback

---

## Technical Details

### VFR vs CFR

**CFR (Constant Frame Rate)**: Every frame is exactly 1/30th of a second apart (for 30fps)
```
Frame 1: 0.000s
Frame 2: 0.033s
Frame 3: 0.066s
Frame 4: 0.100s
```

**VFR (Variable Frame Rate)**: Frames have different gaps (common on phones)
```
Frame 1: 0.000s
Frame 2: 0.028s  (phone was still)
Frame 3: 0.095s  (phone moved, dropped frames)
Frame 4: 0.130s
```

WebCodecs on mobile couldn't handle VFR → choppy output
FFmpeg re-encodes to CFR → smooth output

### Why Desktop WebCodecs Works

Desktop Chrome has:
- More CPU/GPU power
- Better WebCodecs implementation
- More memory for buffering
- Better frame timing handling

Mobile Chrome has:
- Limited resources
- Simpler WebCodecs implementation
- Stricter memory limits
- VFR handling issues

---

## Files Changed

- `src/hooks/use-video-splitter-ffmpeg-wasm.ts` - Complete rewrite
- `src/hooks/use-video-splitter-hybrid.ts` - Platform detection
- `src/hooks/use-video-splitter.ts` - Interface update
- `src/hooks/use-video-splitter-electron.ts` - Interface update
- `src/App.tsx` - Dynamic loading message

---

## What Is FFmpeg and Why Is It Special?

### FFmpeg.wasm = Exact Same Code

```
FFmpeg (C source code, 1M+ lines)
              ↓
      Emscripten compiler
              ↓
FFmpeg.wasm (WebAssembly binary)
```

FFmpeg.wasm is literally FFmpeg's C source code compiled to WebAssembly. Same algorithms, same logic, same 24 years of bug fixes. Just slower because WebAssembly can't access:
- CPU-specific optimizations (SSE, AVX, NEON assembly)
- GPU hardware encoders
- Direct memory management

---

### Why Is FFmpeg So Successful?

**1. It's old (started 2000)**

24 years of:
- Bug fixes for every edge case
- Support for every format ever created
- Performance optimizations
- Contributions from thousands of developers

**2. Created by a genius**

Fabrice Bellard started FFmpeg. He also created:
- QEMU (powers Docker, Android Emulator)
- JSLinux (Linux running in JavaScript)
- Computed world-record digits of Pi

**3. Handles everything**

| Category | Count | Examples |
|----------|-------|----------|
| Container formats | 100+ | MP4, MKV, AVI, MOV, WebM, FLV |
| Video codecs | 100+ | H.264, H.265, VP9, AV1, MPEG-2 |
| Audio codecs | 100+ | AAC, MP3, Opus, FLAC, AC3 |

Plus: broken files, non-standard streams, partial downloads, VFR, HDR, 10-bit color, every edge case imaginable.

**4. Battle-tested at scale**

Used by YouTube, Netflix, Facebook, Instagram, Twitch, Spotify for processing billions of videos. When that many files flow through your code, you find and fix every bug.

---

### Do Professional Tools Use FFmpeg?

**Big commercial tools: Mostly no**

| Software | Uses FFmpeg? | Instead Uses |
|----------|--------------|--------------|
| DaVinci Resolve | ❌ | Blackmagic proprietary engine |
| Premiere Pro | ❌ | Adobe Mercury Playback Engine |
| Final Cut Pro | ❌ | Apple AVFoundation |
| After Effects | ❌ | Adobe Media Core |
| Avid Media Composer | ❌ | Avid DNxHD engine |

**Open source and backend: Yes**

| Software | Uses FFmpeg? |
|----------|--------------|
| VLC Player | ✅ |
| HandBrake | ✅ |
| OBS Studio | ✅ |
| Kdenlive | ✅ |
| Shotcut | ✅ |
| YouTube (backend) | ✅ |
| Netflix (encoding) | ✅ |
| Twitch | ✅ |

**Why don't the big tools use FFmpeg?**

1. **Deep GPU integration** - Resolve, Premiere need real-time playback with effects. FFmpeg is batch-processing focused.

2. **Licensing** - FFmpeg is LGPL/GPL. Companies want full proprietary control.

3. **Specialized features** - Pro tools need timelines, color grading, plugins. FFmpeg is just transcode.

4. **Custom optimization** - Apple, Adobe, Blackmagic optimize for their specific hardware.

**Why DO backend services use FFmpeg?**

1. Free and open source
2. Handles every possible user-uploaded format
3. Easy to script (CLI-based)
4. 24 years of reliability
5. Good enough performance with GPU flags

---

## Why Video Tooling Is So Fragmented

### "Video is video, right?" - Not quite.

A video file isn't just video. It's multiple complex layers stacked together:

```
┌─────────────────────────────────────┐
│         Container (MP4, MKV)        │  ← "The box"
├─────────────────────────────────────┤
│  Video Stream    │   Audio Stream   │
│  (H.264 codec)   │   (AAC codec)    │
├──────────────────┴──────────────────┤
│            Timestamps               │  ← VFR vs CFR lives here
├─────────────────────────────────────┤
│    Metadata (rotation, HDR, etc)    │
└─────────────────────────────────────┘
```

Each layer has its own format, standards, and quirks.

---

### WebCodecs vs FFmpeg: Not the Same Thing

**WebCodecs** is like having access to an engine:
```
WebCodecs = Encode/Decode ONLY

Raw Frame ←→ Compressed Data
```

It does ONE thing: compress/decompress video frames. That's it.

It does NOT handle:
- Reading MP4 files (container parsing)
- Writing MP4 files (muxing)
- Audio/video sync
- Timestamp management
- Frame rate conversion
- Rotation metadata

**FFmpeg** is like having a complete car factory:
```
FFmpeg = Demux → Decode → Filter → Encode → Mux

input.mp4 → [Parse Container] → [Decode Frames] → [Process] → [Encode] → [Write Container] → output.mp4
```

FFmpeg handles the ENTIRE pipeline. It's been doing this since 2000.

---

### The Real Difference

When splitting a VFR video:

**FFmpeg approach**:
1. Parse MP4 container → Extract timestamps
2. Decode video → Raw frames with timing
3. Handle VFR → Normalize to CFR
4. Encode → Proper frame timing
5. Write MP4 → Correct timestamps

**WebCodecs approach** (simplified):
1. Parse MP4 (external library)
2. Decode frames (WebCodecs)
3. Handle timing (your problem)
4. Encode frames (WebCodecs)
5. Write MP4 (external library)

WebCodecs expects YOU to handle steps 1, 3, and 5. The libraries that do this (@webav/av-cliper) are newer and less battle-tested than FFmpeg's 24 years of development.

---

### Why The Fragmentation Exists

**Historical timeline**:

| Year | Tool | Purpose |
|------|------|---------|
| 2000 | FFmpeg | Server/desktop video processing |
| 2010 | HTML5 `<video>` | Browser playback (no editing) |
| 2015 | MediaRecorder | Browser recording (real-time only) |
| 2021 | WebCodecs | Low-level codec access |

The browser never got an "FFmpeg equivalent" because:
1. Video processing is CPU/GPU intensive
2. Browsers prioritize security sandboxing
3. Building a complete solution takes decades

**Why not just put FFmpeg in the browser?**
- FFmpeg is 1+ million lines of C code
- Uses CPU-specific assembly (SSE, NEON) for speed
- WebAssembly strips these hardware optimizations
- Result: FFmpeg.wasm runs 12-15x slower than native

---

### FFmpeg.wasm Speed Limitations

Current reality for a 1-minute 1080p video:

| Method | Time | Why |
|--------|------|-----|
| Native FFmpeg (GPU) | ~5 seconds | Hardware encoding |
| Native FFmpeg (CPU) | ~20 seconds | Optimized assembly |
| FFmpeg.wasm (multi-thread) | ~2 minutes | WASM overhead |
| FFmpeg.wasm (single-thread) | ~4 minutes | No parallelism |
| WebCodecs (desktop) | ~3 minutes | Software encoding |
| WebCodecs (mobile) | ~5+ min | Limited resources |

**Can FFmpeg.wasm be faster?**

1. **Multi-threaded version** (`@ffmpeg/core-mt`): 2x faster, but requires SharedArrayBuffer (COOP/COEP headers)
2. **SIMD optimizations**: In development, not production-ready
3. **GPU access from WASM**: Not possible yet
4. **Better**: Nothing on the horizon

**The hard truth**: Browser-based video processing will always be slower than native apps. FFmpeg.wasm is as good as it gets for now.

---

### The Trade-Off Matrix

| Need | Best Tool | Trade-off |
|------|-----------|-----------|
| Speed | Native FFmpeg | Requires app install |
| VFR handling | FFmpeg (any form) | Slower if WASM |
| No install | WebCodecs | Desktop only, no VFR |
| Mobile browser | FFmpeg.wasm | Slow but works |
| Real-time | MediaRecorder | No frame accuracy |

---

### Lessons for Video App Development

1. **Don't assume "video is simple"** - Each layer (container, codec, timing) can break independently

2. **Browser ≠ Desktop** - APIs that seem equivalent have different implementations and capabilities

3. **VFR is everywhere** - Every phone records VFR. Any video app must handle it.

4. **Proven > Clever** - FFmpeg has 24 years of edge cases solved. New tools haven't.

5. **Performance has limits** - Browser sandboxing prevents hardware access. Accept slower speeds or go native.

---

## References

- [FFmpeg.wasm GitHub](https://github.com/ffmpegwasm/ffmpeg.wasm)
- [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [VFR vs CFR explained](https://handbrake.fr/docs/en/latest/technical/video-encoding-performance.html)
- [WebCodecs vs MediaRecorder](https://web.dev/webcodecs/)
- [FFmpeg.wasm Performance Discussion](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/538)

---

**Remember**: The best solution is often the boring, proven one with good implementation - not the clever hack.

**And remember**: Video isn't just "video" - it's containers, codecs, timing, metadata, and 24 years of edge cases.
