import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:clipchop_flutter/services/ffmpeg_service.dart';

/// Focused E2E test for video splitting functionality
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  const testVideoPath = '/storage/emulated/0/Android/data/com.clipchop.clipchop_flutter/files/test-video.mp4';

  group('Video Split E2E', () {
    testWidgets('Full video split operation', (tester) async {
      print('');
      print('═══════════════════════════════════════════════════════════');
      print('  ClipChop Flutter - Full E2E Split Test');
      print('═══════════════════════════════════════════════════════════');
      print('');

      // Step 1: Check test video exists
      print('📁 Step 1: Checking test video...');
      final testFile = File(testVideoPath);
      final exists = await testFile.exists();

      if (!exists) {
        print('❌ Test video not found at $testVideoPath');
        print('   Run: adb push video.mp4 /sdcard/Download/test-video.mp4');
        fail('Test video not found');
      }
      print('   ✅ Found test video');

      // Step 2: Get video metadata
      print('');
      print('📊 Step 2: Reading video metadata...');
      final metadata = await FFmpegService.getVideoMetadata(testVideoPath);

      expect(metadata, isNotNull, reason: 'Should read metadata');
      print('   ✅ Video: ${metadata!.filename}');
      print('   ✅ Resolution: ${metadata.width}x${metadata.height}');
      print('   ✅ Duration: ${(metadata.durationMs / 1000).toStringAsFixed(1)}s');
      print('   ✅ Size: ${(metadata.size / 1024 / 1024).toStringAsFixed(2)} MB');

      // Step 3: Calculate segments
      print('');
      print('🔢 Step 3: Calculating segments...');
      final durationSec = metadata.durationMs / 1000.0;
      final segmentDuration = durationSec > 30 ? 15.0 : durationSec / 2;

      final segments = FFmpegService.calculateSegments(
        totalDuration: durationSec,
        segmentDuration: segmentDuration,
        originalFilename: metadata.filename,
      );

      expect(segments.isNotEmpty, true, reason: 'Should create segments');
      print('   ✅ Will create ${segments.length} segments of ${segmentDuration.toStringAsFixed(1)}s each');

      for (var i = 0; i < segments.length; i++) {
        print('      Segment ${i + 1}: ${segments[i].startTime.toStringAsFixed(1)}s - ${segments[i].endTime.toStringAsFixed(1)}s');
      }

      // Step 4: Split video
      print('');
      print('🎬 Step 4: Splitting video with FFmpeg...');
      final stopwatch = Stopwatch()..start();
      var lastPrintedProgress = -10.0;

      final outputPaths = await FFmpegService.splitVideo(
        inputPath: testVideoPath,
        segments: segments,
        maxResolution: 720, // SD for faster test
        onProgress: (current, percent) {
          if (percent - lastPrintedProgress >= 20) {
            print('   📈 Progress: ${percent.toStringAsFixed(0)}%');
            lastPrintedProgress = percent;
          }
        },
        onSegmentStatus: (index, status) {
          final statusStr = status.toString().split('.').last;
          if (statusStr == 'complete') {
            print('   ✅ Segment ${index + 1}/${segments.length} complete');
          }
        },
      );

      stopwatch.stop();
      final elapsedSec = stopwatch.elapsedMilliseconds / 1000;

      // Step 5: Verify output
      print('');
      print('✅ Step 5: Verifying output...');
      expect(outputPaths.length, equals(segments.length), reason: 'Should create all segments');

      var totalOutputSize = 0;
      for (var i = 0; i < outputPaths.length; i++) {
        final outputFile = File(outputPaths[i]);
        final fileExists = await outputFile.exists();
        expect(fileExists, true, reason: 'Output file $i should exist');

        final size = await outputFile.length();
        totalOutputSize += size;
        print('   📁 ${outputPaths[i].split('/').last}: ${(size / 1024 / 1024).toStringAsFixed(2)} MB');
      }

      // Step 6: Summary
      print('');
      print('═══════════════════════════════════════════════════════════');
      print('  TEST PASSED!');
      print('═══════════════════════════════════════════════════════════');
      print('   ⏱️  Time: ${elapsedSec.toStringAsFixed(1)}s');
      print('   📊 Speed: ${(durationSec / elapsedSec).toStringAsFixed(1)}x realtime');
      print('   📁 Output: ${outputPaths.length} files');
      print('   💾 Total size: ${(totalOutputSize / 1024 / 1024).toStringAsFixed(2)} MB');
      print('═══════════════════════════════════════════════════════════');
      print('');

      // Cleanup
      print('🧹 Cleaning up output files...');
      for (final path in outputPaths) {
        final file = File(path);
        if (await file.exists()) {
          await file.delete();
        }
      }
      print('   ✅ Cleanup complete');
    });
  });
}
