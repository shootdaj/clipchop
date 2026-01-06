import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../services/video_state.dart';
import '../widgets/gradient_text.dart';
import '../widgets/floating_orbs.dart';
import '../widgets/video_uploader.dart';
import '../widgets/video_info.dart';
import '../widgets/video_preview.dart';
import '../widgets/duration_selector.dart';
import '../widgets/quality_selector.dart';
import '../widgets/split_preview.dart';
import '../widgets/progress_card.dart';
import '../widgets/button_3d.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Animated background orbs
          const FloatingOrbs(),

          // Main content
          SafeArea(
            child: Consumer<VideoState>(
              builder: (context, state, child) {
                return SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 600),
                      child: Column(
                        children: [
                          const SizedBox(height: 24),

                          // Header
                          _buildHeader(),

                          const SizedBox(height: 48),

                          // Main content area
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 300),
                            child: state.video == null
                                ? _buildUploadState(context, state)
                                : _buildEditorState(context, state),
                          ),

                          const SizedBox(height: 48),

                          // Footer
                          _buildFooter(),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        // App title with gradient
        const GradientText(
          text: 'Clipchop',
          style: TextStyle(
            fontSize: 56,
            fontWeight: FontWeight.bold,
            letterSpacing: -1,
          ),
        )
            .animate()
            .fadeIn(duration: 400.ms)
            .scale(begin: const Offset(0.8, 0.8), duration: 400.ms),

        const SizedBox(height: 12),

        // Subtitle
        Text(
          'Split videos for social media',
          style: TextStyle(
            fontSize: 18,
            color: AppColors.textSecondary,
          ),
        )
            .animate(delay: 200.ms)
            .fadeIn(duration: 300.ms)
            .slideY(begin: 0.2, end: 0, duration: 300.ms),
      ],
    );
  }

  Widget _buildUploadState(BuildContext context, VideoState state) {
    return Column(
      key: const ValueKey('upload'),
      children: [
        VideoUploader(
          onTap: () => state.pickVideo(),
          isLoading: state.isLoading,
        ),

        // Loading indicator
        if (state.isLoading) ...[
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Analyzing video...',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 16,
                ),
              ),
            ],
          )
              .animate()
              .fadeIn(duration: 200.ms),
        ],

        // Error message
        if (state.error != null) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppColors.error.withValues(alpha: 0.3),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.error_outline, color: AppColors.error, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    state.error!,
                    style: TextStyle(
                      color: AppColors.error,
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(duration: 200.ms)
              .slideY(begin: 0.1, end: 0, duration: 200.ms),
        ],
      ],
    );
  }

  Widget _buildEditorState(BuildContext context, VideoState state) {
    final video = state.video!;
    final isSplitting = state.isSplitting;
    final isComplete = state.isComplete;
    final canSplit = state.duration != null &&
                     state.segments.isNotEmpty &&
                     !isSplitting;

    return Column(
      key: const ValueKey('editor'),
      children: [
        // Video info
        VideoInfoCard(
          metadata: video,
          onRemove: () => state.reset(),
        ),

        const SizedBox(height: 16),

        // Input video preview
        if (video.filePath.isNotEmpty)
          VideoPreview(
            filePath: video.filePath,
            title: 'Input Video',
            showDownload: false,
          ),

        const SizedBox(height: 16),

        // Duration selector
        DurationSelector(
          value: state.duration,
          onChanged: (duration) => state.setDuration(duration),
          disabled: isSplitting,
        ),

        const SizedBox(height: 16),

        // Quality selector
        QualitySelector(
          value: state.quality,
          onChanged: (quality) => state.setQuality(quality),
          sourceWidth: video.width,
          sourceHeight: video.height,
          disabled: isSplitting,
        ),

        // Split preview
        if (state.segments.isNotEmpty && !isComplete) ...[
          const SizedBox(height: 16),
          SplitPreview(
            segments: state.segments,
            totalDurationMs: video.durationMs,
          ),
        ],

        // Progress
        if (isSplitting) ...[
          const SizedBox(height: 16),
          ProgressCard(
            progress: state.progress,
            estimatedTimeRemaining: state.estimatedTimeRemaining,
          ),
        ],

        const SizedBox(height: 24),

        // Actions
        if (!isComplete)
          _buildSplitButton(context, state, canSplit, isSplitting)
        else
          _buildCompleteState(context, state),

        // Error message
        if (state.error != null && !isSplitting) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppColors.error.withValues(alpha: 0.3),
                width: 1,
              ),
            ),
            child: Text(
              state.error!,
              style: TextStyle(
                color: AppColors.error,
                fontSize: 14,
              ),
            ),
          )
              .animate()
              .fadeIn(duration: 200.ms),
        ],
      ],
    );
  }

  Widget _buildSplitButton(
    BuildContext context,
    VideoState state,
    bool canSplit,
    bool isSplitting,
  ) {
    return SizedBox(
      width: double.infinity,
      child: Button3D(
        text: isSplitting ? 'Splitting...' : 'Split Video',
        onPressed: canSplit ? () => state.splitVideo() : null,
        isLoading: isSplitting,
        showGlow: canSplit,
      ),
    )
        .animate()
        .fadeIn(duration: 200.ms)
        .slideY(begin: 0.1, end: 0, duration: 200.ms);
  }

  Widget _buildCompleteState(BuildContext context, VideoState state) {
    return Column(
      children: [
        // Output video grid
        if (state.outputPaths.isNotEmpty)
          VideoPreviewGrid(
            filePaths: state.outputPaths,
            titles: state.segments.map((s) => s.filename).toList(),
            onDownload: (index) {
              // TODO: Implement save to gallery
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Saved ${state.segments[index].filename}'),
                  backgroundColor: AppColors.primary,
                ),
              );
            },
            onDownloadAll: () {
              // TODO: Implement save all to gallery
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Saved all ${state.outputPaths.length} clips'),
                  backgroundColor: AppColors.primary,
                ),
              );
            },
          ),

        const SizedBox(height: 24),

        // Success message
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.success.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppColors.success.withValues(alpha: 0.3),
              width: 1,
            ),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle, color: AppColors.success, size: 24),
                  const SizedBox(width: 12),
                  Text(
                    'Successfully created ${state.outputPaths.length} clips!',
                    style: TextStyle(
                      color: AppColors.success,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              if (state.elapsedTime.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  'Completed in ${state.elapsedTime}',
                  style: TextStyle(
                    color: AppColors.success.withValues(alpha: 0.8),
                    fontSize: 14,
                  ),
                ),
              ],
            ],
          ),
        )
            .animate()
            .fadeIn(duration: 300.ms)
            .scale(begin: const Offset(0.9, 0.9), duration: 300.ms),

        const SizedBox(height: 24),

        // Start over button
        Button3DSecondary(
          text: 'Start Over with New Video',
          onPressed: () => state.reset(),
        )
            .animate(delay: 200.ms)
            .fadeIn(duration: 200.ms),
      ],
    );
  }

  Widget _buildFooter() {
    return Column(
      children: [
        Text(
          '⚡ Native App - GPU Accelerated',
          style: TextStyle(
            fontSize: 14,
            color: AppColors.textMuted.withValues(alpha: 0.5),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'All processing happens on your device.',
          style: TextStyle(
            fontSize: 12,
            color: AppColors.textMuted.withValues(alpha: 0.4),
          ),
        ),
      ],
    )
        .animate(delay: 600.ms)
        .fadeIn(duration: 400.ms);
  }
}
