import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:video_player/video_player.dart';
import 'package:share_plus/share_plus.dart';
import '../theme/app_theme.dart';
import 'card_3d.dart';

/// Video preview with native player controls
class VideoPreview extends StatefulWidget {
  final String filePath;
  final String? title;
  final VoidCallback? onDownload;
  final VoidCallback? onShare;
  final bool showDownload;
  final bool showShare;
  final bool compact;

  const VideoPreview({
    super.key,
    required this.filePath,
    this.title,
    this.onDownload,
    this.onShare,
    this.showDownload = true,
    this.showShare = false,
    this.compact = false,
  });

  @override
  State<VideoPreview> createState() => _VideoPreviewState();
}

class _VideoPreviewState extends State<VideoPreview> {
  late VideoPlayerController _controller;
  bool _isInitialized = false;
  bool _hasError = false;
  final bool _showControls = true;

  @override
  void initState() {
    super.initState();
    _initializePlayer();
  }

  Future<void> _initializePlayer() async {
    try {
      _controller = VideoPlayerController.file(File(widget.filePath));
      await _controller.initialize();
      setState(() {
        _isInitialized = true;
      });
    } catch (e) {
      setState(() {
        _hasError = true;
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  Future<void> _shareVideo() async {
    try {
      final file = XFile(widget.filePath);
      await Share.shareXFiles(
        [file],
        text: widget.title,
      );
    } catch (e) {
      debugPrint('Error sharing video: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    // Use smaller heights for compact mode to fit in grid cells
    final height = widget.compact ? 100.0 : 192.0;

    return Card3D(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Video container
          GestureDetector(
            onTap: () {
              if (_isInitialized) {
                setState(() {
                  if (_controller.value.isPlaying) {
                    _controller.pause();
                  } else {
                    _controller.play();
                  }
                });
              }
            },
            child: Container(
              height: height,
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.5),
                borderRadius: widget.title != null
                    ? const BorderRadius.vertical(top: Radius.circular(24))
                    : BorderRadius.circular(24),
              ),
              child: ClipRRect(
                borderRadius: widget.title != null
                    ? const BorderRadius.vertical(top: Radius.circular(24))
                    : BorderRadius.circular(24),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Video or placeholder
                    if (_hasError)
                      Center(
                        child: Text(
                          'Failed to load video',
                          style: TextStyle(
                            color: AppColors.error,
                            fontSize: 14,
                          ),
                        ),
                      )
                    else if (!_isInitialized)
                      Center(
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      )
                    else
                      AspectRatio(
                        aspectRatio: _controller.value.aspectRatio,
                        child: VideoPlayer(_controller),
                      ),

                    // Play/pause overlay
                    if (_isInitialized && _showControls)
                      AnimatedOpacity(
                        opacity: _controller.value.isPlaying ? 0.0 : 1.0,
                        duration: const Duration(milliseconds: 200),
                        child: Container(
                          width: widget.compact ? 40 : 64,
                          height: widget.compact ? 40 : 64,
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.6),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            _controller.value.isPlaying
                                ? Icons.pause
                                : Icons.play_arrow,
                            color: Colors.white,
                            size: widget.compact ? 20 : 32,
                          ),
                        ),
                      ),

                    // Action buttons (share + download)
                    if (!_hasError)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Share button
                            if (widget.showShare)
                              GestureDetector(
                                onTap: widget.onShare ?? () => _shareVideo(),
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.6),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(
                                    Icons.share,
                                    color: Colors.white,
                                    size: 16,
                                  ),
                                ),
                              ),
                            if (widget.showShare && widget.showDownload && widget.onDownload != null)
                              const SizedBox(width: 6),
                            // Download button
                            if (widget.showDownload && widget.onDownload != null)
                              GestureDetector(
                                onTap: widget.onDownload,
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.6),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(
                                    Icons.download,
                                    color: Colors.white,
                                    size: 16,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),

                    // Progress bar (only for non-compact mode)
                    if (_isInitialized && !widget.compact)
                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 0,
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                              colors: [
                                Colors.black.withValues(alpha: 0.7),
                                Colors.transparent,
                              ],
                            ),
                          ),
                          child: Column(
                            children: [
                              // Seek bar
                              VideoProgressIndicator(
                                _controller,
                                allowScrubbing: true,
                                colors: VideoProgressColors(
                                  playedColor: AppColors.primary,
                                  bufferedColor: AppColors.primary.withValues(alpha: 0.3),
                                  backgroundColor: Colors.white.withValues(alpha: 0.2),
                                ),
                              ),
                              const SizedBox(height: 4),
                              // Time display
                              ValueListenableBuilder<VideoPlayerValue>(
                                valueListenable: _controller,
                                builder: (context, value, child) {
                                  return Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        _formatDuration(value.position),
                                        style: const TextStyle(
                                          color: Colors.white70,
                                          fontSize: 10,
                                        ),
                                      ),
                                      Text(
                                        _formatDuration(value.duration),
                                        style: const TextStyle(
                                          color: Colors.white70,
                                          fontSize: 10,
                                        ),
                                      ),
                                    ],
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),

          // Title bar
          if (widget.title != null)
            Container(
              padding: EdgeInsets.symmetric(
                horizontal: widget.compact ? 8 : 16,
                vertical: widget.compact ? 4 : 10,
              ),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: AppColors.border.withValues(alpha: 0.5),
                    width: 1,
                  ),
                ),
              ),
              child: Text(
                widget.title!,
                style: TextStyle(
                  fontSize: widget.compact ? 11 : 14,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary.withValues(alpha: 0.8),
                ),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
            ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 250.ms)
        .slideY(begin: 0.05, end: 0, duration: 250.ms);
  }
}

/// Grid of video previews for output clips
class VideoPreviewGrid extends StatelessWidget {
  final List<String> filePaths;
  final List<String>? titles;
  final Function(int index)? onDownload;
  final Function(int index)? onShare;
  final VoidCallback? onDownloadAll;

  const VideoPreviewGrid({
    super.key,
    required this.filePaths,
    this.titles,
    this.onDownload,
    this.onShare,
    this.onDownloadAll,
  });

  @override
  Widget build(BuildContext context) {
    return Card3D(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'OUTPUT CLIPS',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted,
                  letterSpacing: 1,
                ),
              ),
              if (onDownloadAll != null)
                GestureDetector(
                  onTap: onDownloadAll,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      gradient: AppGradients.primaryButton,
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: AppShadows.buttonPressed,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.download,
                          color: Colors.white,
                          size: 16,
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'Download All',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),

          const SizedBox(height: 16),

          // Grid - use aspect ratio that fits compact video preview
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.95, // Adjusted for compact video height
            ),
            itemCount: filePaths.length,
            itemBuilder: (context, index) {
              return VideoPreview(
                filePath: filePaths[index],
                title: titles != null && index < titles!.length
                    ? titles![index]
                    : 'Clip ${index + 1}',
                compact: true,
                showShare: true,
                onShare: onShare != null ? () => onShare!(index) : null,
                onDownload: onDownload != null ? () => onDownload!(index) : null,
              )
                  .animate(delay: Duration(milliseconds: index * 50))
                  .fadeIn(duration: 200.ms)
                  .scale(
                    begin: const Offset(0.9, 0.9),
                    end: const Offset(1, 1),
                    duration: 200.ms,
                  );
            },
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 300.ms)
        .slideY(begin: 0.05, end: 0, duration: 300.ms);
  }
}
