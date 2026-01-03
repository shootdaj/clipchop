# Clipchop

Video splitter app that cuts videos into smaller durations. Single purpose: take a video, split it into chunks of predefined or custom lengths. Primary use case is breaking up videos for posting on Instagram, TikTok, etc.

## Core Features

- **Predefined durations**: 15s, 30s, 60s, 90s (common social media limits)
- **Custom durations**: User can specify any length
- **Saveable presets**: Save custom duration configs for reuse
- **Batch output**: Split one video into multiple clips automatically

## Tech Stack Decisions Needed

Before building, decide on:
1. **Platform**: Desktop app (Electron/Tauri), CLI tool, or web app?
2. **Video processing**: FFmpeg (proven) vs browser-native APIs?
3. **Language**: TypeScript, Swift, Rust?

## Implementation Notes

- FFmpeg is the most reliable for video splitting without re-encoding
- For lossless splits, use `-c copy` flag (keyframe-dependent)
- Consider showing preview thumbnails at split points

## Status

Project just created. No code yet.
