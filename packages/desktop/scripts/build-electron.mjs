import * as esbuild from 'esbuild'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { execSync } from 'child_process'
import os from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// Copy ffmpeg binaries (resolve symlinks and copy platform packages)
function copyFfmpegBinaries() {
  const platform = os.platform() + '-' + os.arch()
  console.log(`Building for platform: ${platform}`)

  // Define all packages we need
  const packages = [
    { scope: '@ffmpeg-installer', name: 'ffmpeg' },
    { scope: '@ffmpeg-installer', name: platform },
    { scope: '@ffprobe-installer', name: 'ffprobe' },
    { scope: '@ffprobe-installer', name: platform },
  ]

  // Find bun cache root (monorepo root's node_modules/.bun)
  const bunCacheRoot = resolve(root, '../../node_modules/.bun')

  for (const pkg of packages) {
    const targetPath = resolve(root, 'node_modules', pkg.scope, pkg.name)
    const targetScopeDir = resolve(root, 'node_modules', pkg.scope)

    // Ensure scope directory exists
    if (!fs.existsSync(targetScopeDir)) {
      fs.mkdirSync(targetScopeDir, { recursive: true })
    }

    // Check if target exists
    if (fs.existsSync(targetPath)) {
      const stat = fs.lstatSync(targetPath)
      if (stat.isSymbolicLink()) {
        // Resolve symlink (bun development)
        const realPath = fs.realpathSync(targetPath)
        fs.rmSync(targetPath, { recursive: true })
        execSync(`cp -r "${realPath}" "${targetPath}"`, { stdio: 'inherit' })
        console.log(`Resolved symlink: ${pkg.scope}/${pkg.name}`)
      } else {
        console.log(`Already exists: ${pkg.scope}/${pkg.name}`)
      }
    } else {
      // Package doesn't exist in local node_modules, try bun cache
      // Bun cache format: @scope+name@version/node_modules/@scope/name
      const cachePattern = `${pkg.scope}+${pkg.name}@`

      try {
        if (fs.existsSync(bunCacheRoot)) {
          const bunCacheEntries = fs.readdirSync(bunCacheRoot)
          const matchingEntry = bunCacheEntries.find(e => e.startsWith(cachePattern))

          if (matchingEntry) {
            const sourcePath = resolve(bunCacheRoot, matchingEntry, 'node_modules', pkg.scope, pkg.name)
            if (fs.existsSync(sourcePath)) {
              execSync(`cp -r "${sourcePath}" "${targetPath}"`, { stdio: 'inherit' })
              console.log(`Copied from bun cache: ${pkg.scope}/${pkg.name}`)
            }
          } else {
            console.log(`Not found in bun cache: ${pkg.scope}/${pkg.name}`)
          }
        } else {
          console.log(`No bun cache found, skipping: ${pkg.scope}/${pkg.name}`)
        }
      } catch (e) {
        console.log(`Could not access bun cache for ${pkg.scope}/${pkg.name}:`, e.message)
      }
    }
  }
}

copyFfmpegBinaries()

// Common config
const commonConfig = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  external: [
    'electron',
  ],
}

// Build main process
await esbuild.build({
  ...commonConfig,
  entryPoints: [resolve(root, 'electron/main.ts')],
  outfile: resolve(root, 'dist-electron/main.js'),
  format: 'cjs',
})

// Build preload script
await esbuild.build({
  ...commonConfig,
  entryPoints: [resolve(root, 'electron/preload.ts')],
  outfile: resolve(root, 'dist-electron/preload.js'),
  format: 'cjs',
})

// Create package.json for CommonJS
fs.writeFileSync(
  resolve(root, 'dist-electron/package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2)
)

console.log('Electron build complete!')
