/// Video metadata information
class VideoMetadata {
  final String filePath;
  final String filename;
  final int durationMs;
  final int width;
  final int height;
  final int size; // bytes

  // Alias for compatibility
  int get sizeBytes => size;

  VideoMetadata({
    required this.filePath,
    required this.filename,
    required this.durationMs,
    required this.width,
    required this.height,
    required this.size,
  });

  double get durationSeconds => durationMs / 1000.0;

  String get formattedDuration {
    final totalSeconds = durationSeconds.round();
    final mins = totalSeconds ~/ 60;
    final secs = totalSeconds % 60;
    return '${mins}:${secs.toString().padLeft(2, '0')}';
  }

  String get formattedSize {
    if (size >= 1024 * 1024 * 1024) {
      return '${(size / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    } else if (size >= 1024 * 1024) {
      return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
    } else if (size >= 1024) {
      return '${(size / 1024).toStringAsFixed(1)} KB';
    }
    return '$size B';
  }

  String get resolution => '${width}x$height';
}

/// Segment status during splitting
enum SegmentStatus {
  pending,
  processing,
  complete,
  error,
}

/// A single video segment
class SplitSegment {
  final int index;
  final double startTime; // seconds
  final double endTime; // seconds
  final double duration; // seconds
  final String filename;
  String? outputPath;
  SegmentStatus status;
  String? error;

  SplitSegment({
    required this.index,
    required this.startTime,
    required this.endTime,
    required this.duration,
    required this.filename,
    this.outputPath,
    this.status = SegmentStatus.pending,
    this.error,
  });

  String get formattedStartTime => _formatTime(startTime);
  String get formattedEndTime => _formatTime(endTime);
  String get formattedDuration => _formatTime(duration);

  // Millisecond aliases for compatibility
  int get startTimeMs => (startTime * 1000).round();
  int get endTimeMs => (endTime * 1000).round();
  int get durationMs => (duration * 1000).round();

  String _formatTime(double seconds) {
    final totalSeconds = seconds.round();
    final mins = totalSeconds ~/ 60;
    final secs = totalSeconds % 60;
    return '${mins}:${secs.toString().padLeft(2, '0')}';
  }

  SplitSegment copyWith({
    int? index,
    double? startTime,
    double? endTime,
    double? duration,
    String? filename,
    String? outputPath,
    SegmentStatus? status,
    String? error,
  }) {
    return SplitSegment(
      index: index ?? this.index,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      duration: duration ?? this.duration,
      filename: filename ?? this.filename,
      outputPath: outputPath ?? this.outputPath,
      status: status ?? this.status,
      error: error ?? this.error,
    );
  }
}

/// Split progress information
class SplitProgress {
  final int currentSegment;
  final int totalSegments;
  final double percent;
  final SplitStatus status;
  final String? error;
  final String? loadingMessage;

  const SplitProgress({
    this.currentSegment = 0,
    this.totalSegments = 0,
    this.percent = 0,
    this.status = SplitStatus.idle,
    this.error,
    this.loadingMessage,
  });

  SplitProgress copyWith({
    int? currentSegment,
    int? totalSegments,
    double? percent,
    SplitStatus? status,
    String? error,
    String? loadingMessage,
  }) {
    return SplitProgress(
      currentSegment: currentSegment ?? this.currentSegment,
      totalSegments: totalSegments ?? this.totalSegments,
      percent: percent ?? this.percent,
      status: status ?? this.status,
      error: error ?? this.error,
      loadingMessage: loadingMessage ?? this.loadingMessage,
    );
  }
}

/// Split status
enum SplitStatus {
  idle,
  loading,
  splitting,
  complete,
  error,
}

/// Output quality options
enum OutputQuality {
  full,
  hd1920,
  sd1280,
}

extension OutputQualityExtension on OutputQuality {
  int? get maxResolution {
    switch (this) {
      case OutputQuality.full:
        return null;
      case OutputQuality.hd1920:
        return 1920;
      case OutputQuality.sd1280:
        return 1280;
    }
  }

  String get label {
    switch (this) {
      case OutputQuality.full:
        return 'Full Quality';
      case OutputQuality.hd1920:
        return 'HD (1920px)';
      case OutputQuality.sd1280:
        return 'SD (1280px)';
    }
  }
}
