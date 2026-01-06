import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';
import '../models/video_models.dart';
import 'card_3d.dart';

/// Split preview with timeline visualization
class SplitPreview extends StatelessWidget {
  final List<SplitSegment> segments;
  final int totalDurationMs;

  const SplitPreview({
    super.key,
    required this.segments,
    required this.totalDurationMs,
  });

  String _formatTime(int milliseconds) {
    final seconds = milliseconds ~/ 1000;
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '$mins:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    if (segments.isEmpty) return const SizedBox.shrink();

    // Purple-based gradient colors for segments
    final colors = [
      [const Color(0xE68B5CF6), const Color(0xE67C3AED)], // violet
      [const Color(0xE6A855F7), const Color(0xE69333EA)], // purple
      [const Color(0xE6D946EF), const Color(0xE6C026D3)], // fuchsia
      [const Color(0xE6EC4899), const Color(0xE6DB2777)], // pink
      [const Color(0xE66366F1), const Color(0xE64F46E5)], // indigo
      [const Color(0xE6F59E0B), const Color(0xE6D97706)], // amber
    ];

    return Card3D(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'SPLIT PREVIEW',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted,
                  letterSpacing: 1,
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${segments.length} clip${segments.length != 1 ? 's' : ''}',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              )
                  .animate()
                  .fadeIn(duration: 200.ms)
                  .scale(begin: const Offset(0.8, 0.8), duration: 200.ms),
            ],
          ),

          const SizedBox(height: 20),

          // Visual timeline with 3D inset
          Container(
            height: 48,
            decoration: BoxDecoration(
              gradient: AppGradients.cardInset,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.black.withValues(alpha: 0.3),
                width: 1,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(11),
              child: Row(
                children: segments.asMap().entries.map((entry) {
                  final index = entry.key;
                  final segment = entry.value;
                  final widthPercent = segment.durationMs / totalDurationMs;
                  final colorPair = colors[index % colors.length];

                  return Expanded(
                    flex: (widthPercent * 1000).round(),
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: colorPair,
                        ),
                        border: index < segments.length - 1
                            ? Border(
                                right: BorderSide(
                                  color:
                                      AppColors.background.withValues(alpha: 0.3),
                                  width: 1,
                                ),
                              )
                            : null,
                      ),
                      child: Center(
                        child: widthPercent > 0.06
                            ? Text(
                                '${index + 1}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  shadows: [
                                    Shadow(
                                      color: Colors.black45,
                                      blurRadius: 2,
                                      offset: Offset(0, 1),
                                    ),
                                  ],
                                ),
                              )
                                  .animate(
                                      delay:
                                          Duration(milliseconds: 300 + index * 50))
                                  .fadeIn(duration: 200.ms)
                            : null,
                      ),
                    ),
                  )
                      .animate(delay: Duration(milliseconds: index * 30))
                      .scaleX(begin: 0, end: 1, duration: 300.ms)
                      .fadeIn(duration: 200.ms);
                }).toList(),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Segment list
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 180),
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: segments.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final segment = segments[index];
                return Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: [
                        AppColors.cardSurface.withValues(alpha: 0.3),
                        Colors.transparent,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.border.withValues(alpha: 0.5),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      // Index badge
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              AppColors.primary.withValues(alpha: 0.3),
                              AppColors.accent.withValues(alpha: 0.2),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            '${index + 1}',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Time range
                      Expanded(
                        child: RichText(
                          text: TextSpan(
                            style: TextStyle(
                              fontSize: 14,
                              color: AppColors.textSecondary,
                            ),
                            children: [
                              TextSpan(
                                text: _formatTime(segment.startTimeMs),
                                style: TextStyle(color: AppColors.textMuted),
                              ),
                              TextSpan(
                                text: ' → ',
                                style: TextStyle(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              TextSpan(
                                text: _formatTime(segment.endTimeMs),
                                style: TextStyle(color: AppColors.textMuted),
                              ),
                            ],
                          ),
                        ),
                      ),
                      // Filename
                      Text(
                        segment.filename,
                        style: TextStyle(
                          fontSize: 12,
                          fontFamily: 'monospace',
                          color: AppColors.textMuted.withValues(alpha: 0.7),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                )
                    .animate(delay: Duration(milliseconds: index * 20))
                    .fadeIn(duration: 150.ms)
                    .slideX(begin: -0.05, end: 0, duration: 150.ms);
              },
            ),
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 250.ms)
        .slideY(begin: 0.1, end: 0, duration: 250.ms);
  }
}
