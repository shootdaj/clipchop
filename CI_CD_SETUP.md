# CI/CD Pipeline Setup

## Overview

Clipchop uses a **hybrid deployment strategy**:
- **Web Version** → Vercel (demo/try before download)
- **Desktop App** → GitHub Releases (production use)

---

## 1. Vercel Setup (Web Version)

### Prerequisites
- Vercel account connected to GitHub repo
- Required secrets in GitHub

### Vercel Configuration

Already configured in `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

These headers are **required** for WebCodecs (SharedArrayBuffer support).

### GitHub Secrets Needed

Add these in GitHub repo settings → Secrets and variables → Actions:

1. `VERCEL_TOKEN` - Get from https://vercel.com/account/tokens
2. `VERCEL_ORG_ID` - Run `vercel link` locally, copy from `.vercel/project.json`
3. `VERCEL_PROJECT_ID` - Same file as above

### Manual Setup Steps

```bash
# 1. Install Vercel CLI
bun add -g vercel

# 2. Link project
cd /Users/anshul/Anshul/Code/clipchop
vercel link

# 3. Get project details
cat .vercel/project.json
# Copy "orgId" → VERCEL_ORG_ID
# Copy "projectId" → VERCEL_PROJECT_ID

# 4. Get token
# Visit https://vercel.com/account/tokens
# Create new token → VERCEL_TOKEN
```

### Workflow Trigger

- **Automatic**: Pushes to `main` or `master`
- **Manual**: GitHub Actions → Run workflow

---

## 2. GitHub Actions (Electron Releases)

### Prerequisites
- GitHub repository
- No additional secrets needed (uses automatic GITHUB_TOKEN)

### Workflow Trigger

- **Automatic**: Push git tag (e.g., `v1.0.0`)
- **Manual**: GitHub Actions → Run workflow

### Creating a Release

```bash
# Tag a release
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will automatically:
# 1. Build for macOS, Windows, Linux
# 2. Create GitHub Release
# 3. Upload installers (.dmg, .exe, .AppImage, etc.)
```

### Build Artifacts

Each platform creates:

**macOS**:
- `.dmg` - Installer
- `.zip` - Portable app

**Windows**:
- `.exe` - NSIS installer
- Portable executable

**Linux**:
- `.AppImage` - Universal app
- `.deb` - Debian package

---

## 3. Testing CI/CD Pipelines

### Test Vercel Deployment

```bash
# Build locally
bun run build

# Test with Vercel CLI
vercel --prod

# Or push to trigger GitHub Action
git push origin main
```

### Test Electron Build

```bash
# Local build (your platform only)
bun run electron:build

# Test the built app
open release/*.dmg  # macOS
# or
start release/*.exe  # Windows

# Trigger GitHub Action
git tag v1.0.0-test
git push origin v1.0.0-test
```

---

## 4. Deployment Checklist

### Before First Deploy

- [ ] Vercel account created and linked
- [ ] GitHub secrets configured (VERCEL_TOKEN, ORG_ID, PROJECT_ID)
- [ ] Test web build locally: `bun run build`
- [ ] Test Electron build locally: `bun run electron:build`
- [ ] Update README with correct GitHub repo URL
- [ ] Update `desktop-app-banner.tsx` with correct download link

### Vercel Deploy

- [ ] Push to main/master branch
- [ ] Check GitHub Actions tab for workflow status
- [ ] Verify deployment on Vercel dashboard
- [ ] Test deployed site works
- [ ] Verify COOP/COEP headers are present
- [ ] Test video upload and splitting on live site

### Electron Release

- [ ] Create and push version tag: `git tag v1.0.0 && git push origin v1.0.0`
- [ ] Check GitHub Actions tab for build progress
- [ ] Verify all 3 platforms build successfully
- [ ] Check GitHub Releases page for new release
- [ ] Download and test each platform's installer
- [ ] Verify hardware acceleration works on each platform

---

## 5. Post-Deployment

### Monitoring

**Vercel**:
- Dashboard: https://vercel.com/dashboard
- Logs: Check function logs and edge network
- Analytics: Monitor usage and performance

**GitHub Releases**:
- Release page: Check download counts
- Issues: Monitor for platform-specific bugs
- Actions: Review build logs if failures occur

### Updates

**Web Version** (auto-deploys):
```bash
git add .
git commit -m "feat: your changes"
git push origin main
```

**Desktop App** (create new release):
```bash
# Update version in package.json
# Then:
git add package.json
git commit -m "chore: bump version to 1.1.0"
git tag v1.1.0
git push origin main v1.1.0
```

---

## 6. Environment Detection

The app automatically detects and adapts:

**Electron Mode**:
- Uses native FFmpeg
- Shows "Desktop App - GPU Accelerated" in footer
- File selection uses native dialog
- No desktop app banner shown

**Web Mode**:
- Uses WebCodecs (browser)
- Shows "All processing happens in your browser"
- File selection uses drag-drop + file input
- Shows banner promoting desktop app

Code: `use-video-splitter-hybrid.ts`

---

## 7. Performance Comparison

| Feature | Web (Vercel) | Desktop (Electron) |
|---------|--------------|-------------------|
| **4K Encoding** | 30-60 min | 1-2 min |
| **1080p Encoding** | 4-8 min | 10-20 sec |
| **Install Required** | No | Yes (~100MB) |
| **Works Offline** | No | Yes |
| **File Size Limit** | ~2GB | Unlimited |
| **GPU Acceleration** | No | Yes |

---

## 8. Troubleshooting

### Vercel Deploy Fails

**Issue**: COOP/COEP headers missing
- **Fix**: Ensure `vercel.json` is committed

**Issue**: Build fails
- **Fix**: Run `bun run build` locally to debug

### Electron Build Fails

**Issue**: FFmpeg binaries not included
- **Fix**: Check `package.json` `extraResources` config

**Issue**: macOS signing fails
- **Fix**: Remove signing requirement or add Apple Developer certificate

### Both Modes Not Working

**Issue**: TypeScript errors
- **Fix**: `bun x tsc -b --noEmit` to find errors

**Issue**: Hybrid hook not switching
- **Fix**: Check `window.electron` is defined in Electron mode

---

## 9. Next Steps

### Recommended Enhancements

1. **Auto-updates** (Electron)
   - Add electron-updater
   - Configure update server

2. **Analytics**
   - Vercel Analytics for web version
   - Telemetry for desktop app usage

3. **Error Reporting**
   - Sentry for both web and desktop
   - Track encoding failures

4. **Code Signing**
   - Apple Developer ($99/year) for macOS
   - Code signing cert for Windows

---

## Status

✅ **Web Build**: Working  
✅ **Electron Build**: Working  
✅ **Hybrid Mode**: Working  
✅ **GitHub Actions**: Configured  
✅ **Vercel Config**: Ready  

**Ready to deploy!**

