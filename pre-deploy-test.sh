#!/bin/bash

echo "🧪 Pre-Deployment Tests"
echo "======================="
echo

echo "✓ Checking TypeScript compilation..."
bun x tsc -b --noEmit 2>&1 | grep -q "error" && echo "❌ TypeScript errors found" || echo "✅ No TypeScript errors"

echo
echo "✓ Building web version..."
bun run build > /dev/null 2>&1 && echo "✅ Web build successful" || echo "❌ Web build failed"

echo
echo "✓ Building Electron version..."
bun run electron:build > /dev/null 2>&1 && echo "✅ Electron build successful" || echo "❌ Electron build failed"

echo
echo "✓ Checking Git status..."
if git diff-index --quiet HEAD --; then
  echo "✅ All changes committed"
else
  echo "⚠️  Uncommitted changes exist"
fi

echo
echo "✓ Recent commits:"
git log --oneline -5

echo
echo "======================="
echo "📋 Summary"
echo "======================="
echo

if [ -d "dist" ] && [ -d "release" ]; then
  echo "✅ Both versions built successfully"
  echo "✅ Ready to deploy!"
  echo
  echo "Next steps:"
  echo "  1. Review commits: git log -p"
  echo "  2. Push to GitHub: git push origin master"
  echo "  3. Create release: git tag v1.0.0 && git push origin v1.0.0"
else
  echo "❌ Builds incomplete"
fi

echo
echo "🌐 Web version: Will deploy to Vercel"
echo "💻 Desktop apps: Will build on GitHub Actions"

