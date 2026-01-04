# [1.1.0](https://github.com/shootdaj/clipchop/compare/v1.0.1...v1.1.0) (2026-01-04)


### Features

* Add new video editor app icon ([d3f63ee](https://github.com/shootdaj/clipchop/commit/d3f63ee6900b8a3b0aa1095a6861fcb341ac05b9))

## [1.0.1](https://github.com/shootdaj/clipchop/compare/v1.0.0...v1.0.1) (2026-01-04)


### Bug Fixes

* Update release config for monorepo version sync ([fcf531c](https://github.com/shootdaj/clipchop/commit/fcf531c9a5fbbb89f8497bd19e5aaa1f3bc47a6c))

# 1.0.0 (2026-01-04)


### Bug Fixes

* Add .npmrc to disable workspaces in mobile package ([c19c91d](https://github.com/shootdaj/clipchop/commit/c19c91d6c59ce22f94afbe0c0d2250a60e044ebc))
* Build mobile in isolated temp dir to avoid workspace issues ([53c6406](https://github.com/shootdaj/clipchop/commit/53c640660b956f58358f9c2640bf4143423dd7fe))
* Configure Vercel to use Bun ([a5f4db0](https://github.com/shootdaj/clipchop/commit/a5f4db0f049ff9c298e318f7673938539cc01216))
* Create proper-sized PWA icons (192x192, 512x512) ([16241f4](https://github.com/shootdaj/clipchop/commit/16241f4bfb946fb50adffab7a24609115c71dc47))
* PWA manifest for proper standalone mode on Android ([1c1e147](https://github.com/shootdaj/clipchop/commit/1c1e14717e2c3b80f6b76744707c967c9a46cea4))
* Remove bun.lock from mobile for npm compatibility ([d87bb98](https://github.com/shootdaj/clipchop/commit/d87bb98299f762e14d60ee164edb56dcebfc167a))
* Remove desktop app banner, show compatibility warning instead ([1dcf39e](https://github.com/shootdaj/clipchop/commit/1dcf39e29877d3df197d1f3b9a4256ede7495f55))
* Remove npm lockfile with workspace refs from mobile ([44deb43](https://github.com/shootdaj/clipchop/commit/44deb430fce3c759ce909cbb047476ab84b5e0b8))
* Remove root package.json during mobile CI build ([1bc0d8e](https://github.com/shootdaj/clipchop/commit/1bc0d8e9257ac89fc82a1d1a86b23df009ae5991))
* Remove workspace dependency from desktop for Vercel ([8570176](https://github.com/shootdaj/clipchop/commit/85701768b8edc7c37f00c763a5988044cf815dbe))
* Switch to react-native-ffmpeg (maintained fork) ([c4edac8](https://github.com/shootdaj/clipchop/commit/c4edac88bf9939b5e7a0e1334c881a5853fa2870))
* Update Vercel workflow to build from desktop package ([b165dc6](https://github.com/shootdaj/clipchop/commit/b165dc6907715ad9bbf55d680d703280143f4532))
* Use npm for Vercel build (Bun not available) ([a5a1cfb](https://github.com/shootdaj/clipchop/commit/a5a1cfb9d146ed05de9478ad42f2b778dee8596d))


### Features

* Add GitHub Pages deployment (simpler than Vercel) ([3981efb](https://github.com/shootdaj/clipchop/commit/3981efb97174e8b663a1749b006e10001d77f518))
* Add hybrid mode and CI/CD pipelines ([3ea4e1b](https://github.com/shootdaj/clipchop/commit/3ea4e1b07c389cdf2e8fd4ba7be6c1111bf5ce5e))
* Add PWA install prompt for mobile ([1d21d4d](https://github.com/shootdaj/clipchop/commit/1d21d4d42529113d9e048a38709109581371be16))
* Add PWA support and fix Vercel deployment ([8621915](https://github.com/shootdaj/clipchop/commit/86219154c2fc2b3b59afef2ffe3e9893c2fe1733))
* Add React Native mobile app for Android/iOS ([8e0fefb](https://github.com/shootdaj/clipchop/commit/8e0fefb9536bed600c285afd79362dd032ae097b))
* Add semantic versioning CI/CD with commit SHA tracking ([818cb29](https://github.com/shootdaj/clipchop/commit/818cb2923f8351543b47f4ba134acaee4421a124))
* Add version number to footer (v0.2.0) ([0ec7b76](https://github.com/shootdaj/clipchop/commit/0ec7b76d30d116681af2fc3fd839afc83646c2c8))
* Add visible Install button for Android PWA ([1719fcd](https://github.com/shootdaj/clipchop/commit/1719fcdc7193723c2602ebcfd9974cbc878e1ea9))
* Add WebCodecs browser compatibility check ([90ced47](https://github.com/shootdaj/clipchop/commit/90ced47e7b5deb5b03f0b518080532e8f70c6dae))
* Convert to Electron native app with FFmpeg ([d0b8849](https://github.com/shootdaj/clipchop/commit/d0b8849b36e659266bfeef537e4ea0a91b9a7a4c))
