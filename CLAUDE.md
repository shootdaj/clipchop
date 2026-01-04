# Clipchop

Video splitter app that cuts videos into smaller durations. Single purpose: take a video, split it into chunks of predefined or custom lengths. Primary use case is breaking up videos for posting on Instagram, TikTok, etc.

## Agent Handoff Protocol

**IMPORTANT**: This project assumes NO memory between sessions. Always:
1. Check `PROGRESS.md` for current implementation status before starting work
2. Update `PROGRESS.md` after completing any task
3. Reference the detailed plan at `.claude/plans/deep-stirring-hammock.md`
4. Use TodoWrite tool to track in-session progress

## Core Features

- **Predefined durations**: 15s, 30s, 60s, 90s (common social media limits)
- **Custom durations**: User can specify any length
- **Saveable presets**: Save custom duration configs for reuse (localStorage)
- **Batch output**: Split one video into multiple clips automatically
- **File naming**: User-configurable pattern (sequential or timestamps)

## Tech Stack (Finalized)

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript |
| Build | Vite (with Bun as package manager) |
| Video Processing | WebAV (`@webav/av-cliper`) - WebCodecs-based, 20x faster than FFmpeg.wasm |
| Animation | Motion (Framer Motion) - fluid/liquid feel with custom springs |
| Components | shadcn/ui base + custom Motion animations |
| Styling | Tailwind CSS |
| Hosting | Vercel |

## Browser Support

- **Chrome 102+** required (WebCodecs dependency)
- No Safari support (intentional)
- Mobile-critical (Android Chrome focus)

## Key Technical Details

- WebAV uses `clip.split(time)` for segmentation (time in microseconds)
- Requires COOP/COEP headers for SharedArrayBuffer (see `vercel.json`)
- Theme: Both dark/light (system preference)
- Motion MCP server configured for spring/curve tuning

## Project Links

- **Detailed Plan**: `.claude/plans/deep-stirring-hammock.md`
- **Progress Tracking**: `PROGRESS.md`
- **MCP Config**: `.mcp.json` (Motion Studio MCP)
