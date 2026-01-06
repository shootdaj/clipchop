import 'package:flutter/foundation.dart';
import 'package:file_picker/file_picker.dart';
import '../models/video_models.dart';
import 'ffmpeg_service.dart';

/// State management for video splitting operations
class VideoState extends ChangeNotifier {
  VideoMetadata? _metadata;
  List<SplitSegment> _segments = [];
  SplitProgress _progress = const SplitProgress();
  int? _selectedDuration;
  OutputQuality _quality = OutputQuality.full;
  DateTime? _startTime;
  String _estimatedTimeRemaining = '';
  String _elapsedTime = '';

  // Getters
  VideoMetadata? get metadata => _metadata;
  VideoMetadata? get video => _metadata; // Alias for home_screen compatibility
  List<SplitSegment> get segments => _segments;
  SplitProgress get progress => _progress;
  int? get selectedDuration => _selectedDuration;
  int? get duration => _selectedDuration; // Alias for home_screen compatibility
  OutputQuality get quality => _quality;
  String get estimatedTimeRemaining => _estimatedTimeRemaining;
  String get elapsedTime => _elapsedTime;
  String? get error => _progress.error;

  // Get output paths from completed segments
  List<String> get outputPaths => _segments
      .where((s) => s.outputPath != null)
      .map((s) => s.outputPath!)
      .toList();

  bool get hasVideo => _metadata != null;
  bool get isSplitting => _progress.status == SplitStatus.splitting;
  bool get isComplete => _progress.status == SplitStatus.complete;
  bool get isLoading => _progress.status == SplitStatus.loading;
  bool get hasError => _progress.status == SplitStatus.error;

  bool get canSplit =>
      _metadata != null &&
      _selectedDuration != null &&
      _segments.isNotEmpty &&
      !isSplitting;

  /// Pick and load a video file
  Future<void> pickVideo() async {
    try {
      _progress = _progress.copyWith(
        status: SplitStatus.loading,
        loadingMessage: 'Selecting video...',
      );
      notifyListeners();

      final result = await FilePicker.platform.pickFiles(
        type: FileType.video,
        allowMultiple: false,
      );

      if (result == null || result.files.isEmpty) {
        _progress = const SplitProgress(status: SplitStatus.idle);
        notifyListeners();
        return;
      }

      final filePath = result.files.first.path;
      if (filePath == null) {
        throw Exception('Could not get file path');
      }

      await loadVideo(filePath);
    } catch (e) {
      _progress = SplitProgress(
        status: SplitStatus.error,
        error: e.toString(),
      );
      notifyListeners();
    }
  }

  /// Load a video from path
  Future<void> loadVideo(String filePath) async {
    try {
      _progress = _progress.copyWith(
        status: SplitStatus.loading,
        loadingMessage: 'Analyzing video...',
      );
      notifyListeners();

      final metadata = await FFmpegService.getVideoMetadata(filePath);

      if (metadata == null) {
        throw Exception('Could not read video metadata');
      }

      _metadata = metadata;
      _segments = [];
      _selectedDuration = null;
      _progress = const SplitProgress(status: SplitStatus.idle);
      notifyListeners();
    } catch (e) {
      _progress = SplitProgress(
        status: SplitStatus.error,
        error: e.toString(),
      );
      notifyListeners();
    }
  }

  /// Set the split duration and calculate segments
  void setDuration(int seconds) {
    if (_metadata == null) return;

    _selectedDuration = seconds;
    _segments = FFmpegService.calculateSegments(
      totalDuration: _metadata!.durationSeconds,
      segmentDuration: seconds.toDouble(),
      originalFilename: _metadata!.filename,
    );
    notifyListeners();
  }

  /// Set output quality
  void setQuality(OutputQuality quality) {
    _quality = quality;
    notifyListeners();
  }

  /// Split the video
  Future<void> splitVideo() async {
    if (!canSplit) return;

    try {
      _progress = SplitProgress(
        status: SplitStatus.splitting,
        currentSegment: 0,
        totalSegments: _segments.length,
        percent: 0,
      );
      _startTime = DateTime.now();
      notifyListeners();

      await FFmpegService.splitVideo(
        inputPath: _metadata!.filePath,
        segments: _segments,
        maxResolution: _quality.maxResolution,
        onProgress: (currentSegment, percent) {
          _progress = _progress.copyWith(
            currentSegment: currentSegment,
            percent: percent,
          );
          _updateEstimatedTime();
          notifyListeners();
        },
        onSegmentStatus: (index, status) {
          if (index < _segments.length) {
            _segments[index] = _segments[index].copyWith(status: status);
            notifyListeners();
          }
        },
      );

      // Update segments with output paths
      final outputDir = await FFmpegService.getOutputDirectoryPath();
      final outputPaths = <String>[];
      for (int i = 0; i < _segments.length; i++) {
        final outputPath = '$outputDir/${_segments[i].filename}';
        outputPaths.add(outputPath);
        _segments[i] = _segments[i].copyWith(
          outputPath: outputPath,
          status: SegmentStatus.complete,
        );
      }

      // Scan files so they appear in Files app Recents
      await FFmpegService.scanMediaFiles(outputPaths);

      // Calculate total elapsed time
      if (_startTime != null) {
        final elapsed = DateTime.now().difference(_startTime!);
        if (elapsed.inMinutes >= 1) {
          final mins = elapsed.inMinutes;
          final secs = elapsed.inSeconds % 60;
          _elapsedTime = '${mins}m ${secs}s';
        } else {
          _elapsedTime = '${elapsed.inSeconds}s';
        }
      }

      _progress = _progress.copyWith(
        status: SplitStatus.complete,
        percent: 100,
      );
      _estimatedTimeRemaining = '';
      notifyListeners();
    } catch (e) {
      _progress = SplitProgress(
        status: SplitStatus.error,
        error: e.toString(),
        currentSegment: _progress.currentSegment,
        totalSegments: _progress.totalSegments,
        percent: _progress.percent,
      );
      notifyListeners();
    }
  }

  void _updateEstimatedTime() {
    if (_startTime == null || _progress.percent <= 0) return;

    final elapsed = DateTime.now().difference(_startTime!).inSeconds;
    final estimatedTotal = (elapsed / _progress.percent) * 100;
    final remaining = estimatedTotal - elapsed;

    if (remaining > 60) {
      final mins = remaining ~/ 60;
      final secs = (remaining % 60).round();
      _estimatedTimeRemaining = '${mins}m ${secs}s remaining';
    } else {
      _estimatedTimeRemaining = '${remaining.round()}s remaining';
    }
  }

  /// Reset all state
  void reset() {
    _metadata = null;
    _segments = [];
    _progress = const SplitProgress();
    _selectedDuration = null;
    _quality = OutputQuality.full;
    _startTime = null;
    _estimatedTimeRemaining = '';
    _elapsedTime = '';
    notifyListeners();
  }

  /// Cancel ongoing split
  Future<void> cancel() async {
    await FFmpegService.cancelAll();
    _progress = const SplitProgress(status: SplitStatus.idle);
    notifyListeners();
  }
}
