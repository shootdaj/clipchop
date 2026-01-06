import 'dart:io';
import 'package:ffmpeg_kit_flutter_new/ffmpeg_kit.dart';
import 'package:ffmpeg_kit_flutter_new/ffmpeg_kit_config.dart';
import 'package:ffmpeg_kit_flutter_new/ffprobe_kit.dart';
import 'package:ffmpeg_kit_flutter_new/return_code.dart';
import 'package:ffmpeg_kit_flutter_new/statistics.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:permission_handler/permission_handler.dart';
import '../models/video_models.dart';

/// Platform channel for media scanning
const _mediaScannerChannel = MethodChannel('com.clipchop/media_scanner');

/// Service for FFmpeg video operations
class FFmpegService {
  /// Get video metadata using FFprobe
  static Future<VideoMetadata?> getVideoMetadata(String filePath) async {
    try {
      final session = await FFprobeKit.getMediaInformation(filePath);
      final info = session.getMediaInformation();

      if (info == null) return null;

      final streams = info.getStreams();
      if (streams == null || streams.isEmpty) return null;

      final videoStream = streams.firstWhere(
        (s) => s.getType() == 'video',
        orElse: () => streams.first,
      );

      final durationStr = info.getDuration();
      final duration = durationStr != null
          ? (double.tryParse(durationStr) ?? 0) * 1000
          : 0.0;

      final width = videoStream?.getWidth() ?? 0;
      final height = videoStream?.getHeight() ?? 0;

      final file = File(filePath);
      final size = await file.length();

      return VideoMetadata(
        filePath: filePath,
        filename: p.basename(filePath),
        durationMs: duration.round(),
        width: width,
        height: height,
        size: size,
      );
    } catch (e) {
      print('Error getting video metadata: $e');
      return null;
    }
  }

  /// Calculate segment boundaries
  static List<SplitSegment> calculateSegments({
    required double totalDuration,
    required double segmentDuration,
    required String originalFilename,
    String namingPattern = 'sequential',
  }) {
    if (totalDuration <= 0 || segmentDuration <= 0) {
      return [];
    }

    final segments = <SplitSegment>[];
    double currentTime = 0;
    int index = 0;

    while (currentTime < totalDuration) {
      final endTime = (currentTime + segmentDuration).clamp(0.0, totalDuration);
      final actualDuration = endTime - currentTime;

      final filename = _generateFilename(
        originalFilename,
        index,
        currentTime,
        endTime,
        namingPattern,
      );

      segments.add(SplitSegment(
        index: index,
        startTime: currentTime,
        endTime: endTime,
        duration: actualDuration,
        filename: filename,
      ));

      currentTime = endTime;
      index++;
    }

    return segments;
  }

  static String _generateFilename(
    String originalName,
    int index,
    double startTime,
    double endTime,
    String pattern,
  ) {
    final baseName = p.basenameWithoutExtension(originalName);

    if (pattern == 'timestamp') {
      final startStr = _formatTimeForFilename(startTime);
      final endStr = _formatTimeForFilename(endTime);
      return '${baseName}_$startStr-$endStr.mp4';
    }

    // Sequential pattern
    final paddedIndex = (index + 1).toString().padLeft(3, '0');
    return '${baseName}_$paddedIndex.mp4';
  }

  static String _formatTimeForFilename(double seconds) {
    final mins = seconds ~/ 60;
    final secs = (seconds % 60).round();
    return '${mins}m${secs.toString().padLeft(2, '0')}s';
  }

  /// Split video into segments
  static Future<List<String>> splitVideo({
    required String inputPath,
    required List<SplitSegment> segments,
    required int? maxResolution,
    required Function(int currentSegment, double percent) onProgress,
    required Function(int segmentIndex, SegmentStatus status) onSegmentStatus,
  }) async {
    final outputDir = await _getOutputDirectory();
    final outputPaths = <String>[];

    // Get video info for scaling calculations
    final metadata = await getVideoMetadata(inputPath);
    final videoWidth = metadata?.width ?? 1920;
    final videoHeight = metadata?.height ?? 1080;

    for (int i = 0; i < segments.length; i++) {
      final segment = segments[i];
      onSegmentStatus(i, SegmentStatus.processing);
      onProgress(i + 1, (i / segments.length) * 100);

      final outputPath = p.join(outputDir, segment.filename);

      // Build FFmpeg command
      final args = <String>[];

      // Seek first (faster)
      args.addAll(['-ss', segment.startTime.toStringAsFixed(3)]);

      // Input
      args.addAll(['-i', inputPath]);

      // Duration
      args.addAll(['-t', segment.duration.toStringAsFixed(3)]);

      // Video codec - use hardware encoding if available
      args.addAll(['-c:v', 'libx264']);
      args.addAll(['-preset', 'fast']);
      args.addAll(['-crf', '23']);

      // Scale if needed - preserve aspect ratio using -1 for auto-calculation
      if (maxResolution != null) {
        final maxDim = videoWidth > videoHeight ? videoWidth : videoHeight;
        if (maxDim > maxResolution) {
          // Use -2 to ensure even dimensions (required by some codecs)
          // FFmpeg will automatically calculate the other dimension to preserve aspect ratio
          if (videoWidth > videoHeight) {
            // Landscape: constrain width
            args.addAll(['-vf', 'scale=$maxResolution:-2']);
          } else {
            // Portrait: constrain height
            args.addAll(['-vf', 'scale=-2:$maxResolution']);
          }
        }
      }

      // Audio codec
      args.addAll(['-c:a', 'aac']);
      args.addAll(['-b:a', '128k']);

      // Clear rotation metadata
      args.addAll(['-metadata:s:v', 'rotate=0']);

      // Overwrite output
      args.add('-y');

      // Output path
      args.add(outputPath);

      final command = args.join(' ');
      print('FFmpeg command: $command');

      // Enable statistics callback for progress
      FFmpegKitConfig.enableStatisticsCallback((Statistics stats) {
        final time = stats.getTime();
        if (time > 0 && segment.duration > 0) {
          final segmentProgress = (time / 1000) / segment.duration;
          final totalProgress = ((i + segmentProgress) / segments.length) * 100;
          onProgress(i + 1, totalProgress.clamp(0, 100));
        }
      });

      // Execute FFmpeg
      final session = await FFmpegKit.execute(command);
      final returnCode = await session.getReturnCode();

      if (ReturnCode.isSuccess(returnCode)) {
        outputPaths.add(outputPath);
        onSegmentStatus(i, SegmentStatus.complete);
      } else {
        final logs = await session.getLogsAsString();
        print('FFmpeg error for segment $i: $logs');
        onSegmentStatus(i, SegmentStatus.error);
        throw Exception('Failed to split segment ${i + 1}');
      }
    }

    onProgress(segments.length, 100);
    return outputPaths;
  }

  /// Get output directory for split videos (public Downloads folder)
  static Future<String> _getOutputDirectory() async {
    // Try to use public Download folder first (accessible via Files app)
    final downloadDir = Directory('/storage/emulated/0/Download/ClipChop');

    try {
      // Check/request storage permission
      final status = await Permission.manageExternalStorage.request();
      if (!status.isGranted) {
        // Fall back to app-specific storage if permission denied
        final appDir = await getApplicationDocumentsDirectory();
        final fallbackDir = Directory(p.join(appDir.path, 'ClipChop'));
        if (!await fallbackDir.exists()) {
          await fallbackDir.create(recursive: true);
        }
        return fallbackDir.path;
      }

      if (!await downloadDir.exists()) {
        await downloadDir.create(recursive: true);
      }
      return downloadDir.path;
    } catch (e) {
      print('Error accessing Download folder: $e');
      // Fallback to app documents directory
      final appDir = await getApplicationDocumentsDirectory();
      final fallbackDir = Directory(p.join(appDir.path, 'ClipChop'));
      if (!await fallbackDir.exists()) {
        await fallbackDir.create(recursive: true);
      }
      return fallbackDir.path;
    }
  }

  /// Get the output directory path (public)
  static Future<String> getOutputDirectoryPath() async {
    return _getOutputDirectory();
  }

  /// Notify media scanner about new files (makes them visible in gallery/files/recents)
  static Future<void> scanMediaFiles(List<String> paths) async {
    try {
      // Use platform channel to trigger Android MediaScanner
      await _mediaScannerChannel.invokeMethod('scanFiles', {'paths': paths});
      print('Media scanner triggered for ${paths.length} files');
    } catch (e) {
      print('Error scanning media files: $e');
      // Fallback: just verify files exist
      for (final path in paths) {
        final file = File(path);
        if (await file.exists()) {
          print('File ready: $path');
        }
      }
    }
  }

  /// Cancel any running FFmpeg operations
  static Future<void> cancelAll() async {
    await FFmpegKit.cancel();
  }
}
