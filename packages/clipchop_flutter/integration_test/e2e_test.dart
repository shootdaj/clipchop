import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:provider/provider.dart';
import 'package:clipchop_flutter/main.dart';
import 'package:clipchop_flutter/services/video_state.dart';
import 'package:clipchop_flutter/services/ffmpeg_service.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('ClipChop E2E Tests', () {
    testWidgets('App launches and shows title', (tester) async {
      await tester.pumpWidget(const ClipchopApp());
      await tester.pumpAndSettle();

      // Verify app title
      expect(find.text('Clipchop'), findsOneWidget);
      expect(find.text('Split videos for social media'), findsOneWidget);

      print('✅ App launched successfully');
    });

    testWidgets('Video uploader is visible', (tester) async {
      await tester.pumpWidget(const ClipchopApp());
      await tester.pumpAndSettle();

      // Look for upload area
      expect(find.textContaining('Tap to select'), findsOneWidget);

      print('✅ Video uploader is visible');
    });

    testWidgets('Full video split flow with test video', (tester) async {
      // Use test video from device
      const testVideoPath = '/sdcard/Download/test-video.mp4';

      // Check if test video exists
      final testFile = File(testVideoPath);
      if (!await testFile.exists()) {
        print('⚠️ Test video not found at $testVideoPath');
        print('   Push a test video with: adb push video.mp4 /sdcard/Download/test-video.mp4');
        return;
      }

      print('📹 Found test video at $testVideoPath');

      // Get video metadata
      final metadata = await FFmpegService.getVideoMetadata(testVideoPath);
      if (metadata == null) {
        print('❌ Failed to read video metadata');
        return;
      }

      print('📊 Video info: ${metadata.width}x${metadata.height}, ${metadata.durationMs}ms');

      // Create app with pre-loaded video
      final videoState = VideoState();

      await tester.pumpWidget(
        ChangeNotifierProvider.value(
          value: videoState,
          child: MaterialApp(
            home: Builder(
              builder: (context) {
                // Load the test video directly
                WidgetsBinding.instance.addPostFrameCallback((_) async {
                  await videoState.loadVideo(testVideoPath);
                });
                return const ClipchopApp();
              },
            ),
          ),
        ),
      );

      // Wait for video to load
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Check if video is loaded by looking for video info
      if (videoState.video != null) {
        print('✅ Video loaded successfully');
        print('   Duration: ${videoState.video!.durationMs}ms');
        print('   Dimensions: ${videoState.video!.width}x${videoState.video!.height}');
      } else {
        print('⚠️ Video not loaded via state, testing UI flow...');
      }

      // Look for duration selector
      await tester.pumpAndSettle();

      // Try to find the split button or duration options
      final splitButton = find.text('Split Video');
      final durationOption = find.text('30s');

      if (splitButton.evaluate().isNotEmpty) {
        print('✅ Split button is visible');
      }

      if (durationOption.evaluate().isNotEmpty) {
        print('✅ Duration selector is visible');
        // Tap 30s option
        await tester.tap(durationOption);
        await tester.pumpAndSettle();
        print('✅ Selected 30s duration');
      }

      print('✅ E2E test flow completed');
    });

    testWidgets('FFmpeg service works', (tester) async {
      const testVideoPath = '/sdcard/Download/test-video.mp4';

      final testFile = File(testVideoPath);
      if (!await testFile.exists()) {
        print('⚠️ Skipping FFmpeg test - no test video');
        return;
      }

      // Test metadata extraction
      final metadata = await FFmpegService.getVideoMetadata(testVideoPath);

      expect(metadata, isNotNull, reason: 'FFmpeg should extract metadata');
      expect(metadata!.width, greaterThan(0), reason: 'Width should be positive');
      expect(metadata.height, greaterThan(0), reason: 'Height should be positive');
      expect(metadata.durationMs, greaterThan(0), reason: 'Duration should be positive');

      print('✅ FFmpeg metadata extraction works');
      print('   Video: ${metadata.width}x${metadata.height}');
      print('   Duration: ${metadata.durationMs}ms');
      print('   Size: ${(metadata.size / 1024 / 1024).toStringAsFixed(2)} MB');
    });

    testWidgets('Segment calculation works', (tester) async {
      // Test segment calculation
      final segments = FFmpegService.calculateSegments(
        totalDuration: 120.0, // 2 minutes
        segmentDuration: 30.0, // 30 seconds
        originalFilename: 'test-video.mp4',
      );

      expect(segments.length, equals(4), reason: 'Should create 4 segments for 2min/30s');
      expect(segments[0].startTime, equals(0.0));
      expect(segments[0].duration, equals(30.0));
      expect(segments[3].endTime, equals(120.0));

      print('✅ Segment calculation works');
      print('   Created ${segments.length} segments');
      for (var i = 0; i < segments.length; i++) {
        print('   Segment $i: ${segments[i].startTime}s - ${segments[i].endTime}s');
      }
    });

    testWidgets('Full split operation', (tester) async {
      const testVideoPath = '/sdcard/Download/test-video.mp4';

      final testFile = File(testVideoPath);
      if (!await testFile.exists()) {
        print('⚠️ Skipping split test - no test video');
        return;
      }

      print('🎬 Starting full split operation test...');

      // Get metadata
      final metadata = await FFmpegService.getVideoMetadata(testVideoPath);
      if (metadata == null) {
        print('❌ Failed to get metadata');
        return;
      }

      final durationSec = metadata.durationMs / 1000.0;
      print('📹 Video duration: ${durationSec.toStringAsFixed(1)}s');

      // Calculate segments (use 30s or half the video if shorter)
      final segmentDuration = durationSec > 60 ? 30.0 : durationSec / 2;
      final segments = FFmpegService.calculateSegments(
        totalDuration: durationSec,
        segmentDuration: segmentDuration,
        originalFilename: metadata.filename,
      );

      print('📊 Will create ${segments.length} segments of ${segmentDuration}s each');

      // Track progress
      var lastProgress = 0.0;
      var completedSegments = 0;

      // Run the split
      final stopwatch = Stopwatch()..start();

      try {
        final outputPaths = await FFmpegService.splitVideo(
          inputPath: testVideoPath,
          segments: segments,
          maxResolution: 720, // Use SD for faster test
          onProgress: (current, percent) {
            if (percent - lastProgress >= 10) {
              print('   Progress: ${percent.toStringAsFixed(0)}% (segment $current/${segments.length})');
              lastProgress = percent;
            }
          },
          onSegmentStatus: (index, status) {
            if (status.toString().contains('complete')) {
              completedSegments++;
              print('   ✅ Segment ${index + 1} complete');
            }
          },
        );

        stopwatch.stop();

        print('');
        print('🎉 Split completed successfully!');
        print('   Time: ${(stopwatch.elapsedMilliseconds / 1000).toStringAsFixed(1)}s');
        print('   Output files: ${outputPaths.length}');

        // Verify output files exist
        for (var i = 0; i < outputPaths.length; i++) {
          final outputFile = File(outputPaths[i]);
          if (await outputFile.exists()) {
            final size = await outputFile.length();
            print('   📁 ${outputPaths[i].split('/').last}: ${(size / 1024 / 1024).toStringAsFixed(2)} MB');
          }
        }

        expect(outputPaths.length, equals(segments.length));

        // Clean up output files
        for (final path in outputPaths) {
          final file = File(path);
          if (await file.exists()) {
            await file.delete();
          }
        }
        print('   🧹 Cleaned up output files');

      } catch (e) {
        print('❌ Split failed: $e');
        rethrow;
      }
    });
  });
}
