import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';
import '../models/video_models.dart';
import 'card_3d.dart';

/// Progress card showing splitting progress with animated bar
class ProgressCard extends StatelessWidget {
  final SplitProgress progress;
  final String? estimatedTimeRemaining;

  const ProgressCard({
    super.key,
    required this.progress,
    this.estimatedTimeRemaining,
  });

  @override
  Widget build(BuildContext context) {
    return Card3D(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Processing clip ${progress.currentSegment} of ${progress.totalSegments}',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),
              // Percentage with gradient
              ShaderMask(
                shaderCallback: (bounds) {
                  return LinearGradient(
                    colors: [
                      AppColors.primary,
                      AppColors.primaryLight,
                      AppColors.accent,
                    ],
                  ).createShader(bounds);
                },
                blendMode: BlendMode.srcIn,
                child: Text(
                  '${progress.percent.round()}%',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ),
            ],
          ),

          // Estimated time
          if (estimatedTimeRemaining != null) ...[
            const SizedBox(height: 8),
            Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('⏱️', style: TextStyle(fontSize: 14)),
                  const SizedBox(width: 6),
                  Text(
                    estimatedTimeRemaining!,
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              )
                  .animate()
                  .fadeIn(duration: 200.ms)
                  .slideY(begin: -0.2, end: 0, duration: 200.ms),
            ),
          ],

          const SizedBox(height: 16),

          // Progress bar with 3D effect
          Container(
            height: 16,
            decoration: BoxDecoration(
              gradient: AppGradients.cardInset,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: Colors.black.withValues(alpha: 0.3),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.4),
                  offset: const Offset(0, 2),
                  blurRadius: 4,
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(7),
              child: Stack(
                children: [
                  // Progress fill
                  AnimatedFractionallySizedBox(
                    duration: const Duration(milliseconds: 300),
                    widthFactor: progress.percent / 100,
                    alignment: Alignment.centerLeft,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: AppGradients.progress,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.5),
                            blurRadius: 8,
                            spreadRadius: -2,
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Shimmer overlay
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.white.withValues(alpha: 0.2),
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.1),
                          ],
                          stops: const [0.0, 0.5, 1.0],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Loading message if available
          if (progress.loadingMessage != null) ...[
            const SizedBox(height: 12),
            Center(
              child: Text(
                progress.loadingMessage!,
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textMuted,
                ),
              ),
            ),
          ],
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 300.ms)
        .slideY(begin: 0.1, end: 0, duration: 300.ms)
        .scale(begin: const Offset(0.95, 0.95), duration: 300.ms);
  }
}

/// Animated fractionally sized box for smooth progress transitions
class AnimatedFractionallySizedBox extends StatelessWidget {
  final Duration duration;
  final double widthFactor;
  final Alignment alignment;
  final Widget child;

  const AnimatedFractionallySizedBox({
    super.key,
    required this.duration,
    required this.widthFactor,
    required this.alignment,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: widthFactor),
      duration: duration,
      curve: Curves.easeOut,
      builder: (context, value, child) {
        return FractionallySizedBox(
          widthFactor: value.clamp(0.0, 1.0),
          alignment: alignment,
          child: child,
        );
      },
      child: child,
    );
  }
}
