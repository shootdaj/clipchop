import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';
import '../models/video_models.dart';
import 'card_3d.dart';

/// Video info card with metadata badges
class VideoInfoCard extends StatelessWidget {
  final VideoMetadata metadata;
  final VoidCallback onRemove;

  const VideoInfoCard({
    super.key,
    required this.metadata,
    required this.onRemove,
  });

  String _formatDuration(int milliseconds) {
    final seconds = milliseconds ~/ 1000;
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    if (mins == 0) return '${secs}s';
    return secs == 0 ? '${mins}m' : '${mins}m ${secs}s';
  }

  String _formatSize(int bytes) {
    if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    }
    return '${(bytes / 1024 / 1024).toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    final infoBadges = [
      {'label': _formatDuration(metadata.durationMs), 'icon': '⏱'},
      {'label': '${metadata.width}×${metadata.height}', 'icon': '📐'},
      {'label': _formatSize(metadata.sizeBytes), 'icon': '💾'},
    ];

    return Card3D(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          // Video icon with 3D effect
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppColors.primary.withValues(alpha: 0.3),
                  AppColors.accent.withValues(alpha: 0.2),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.3),
                  blurRadius: 15,
                  offset: const Offset(0, 4),
                ),
                BoxShadow(
                  color: Colors.white.withValues(alpha: 0.1),
                  blurRadius: 0,
                  offset: const Offset(0, -1),
                ),
              ],
            ),
            child: Icon(
              Icons.videocam_outlined,
              size: 28,
              color: AppColors.primary,
            ),
          )
              .animate()
              .scale(
                begin: const Offset(0, 0),
                end: const Offset(1, 1),
                duration: 300.ms,
                curve: Curves.elasticOut,
              )
              .rotate(begin: -0.1, end: 0, duration: 300.ms),

          const SizedBox(width: 16),

          // Info column
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Filename
                Text(
                  metadata.filename,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                  overflow: TextOverflow.ellipsis,
                )
                    .animate(delay: 100.ms)
                    .fadeIn(duration: 200.ms)
                    .slideX(begin: -0.1, end: 0, duration: 200.ms),

                const SizedBox(height: 10),

                // Info badges
                Wrap(
                  spacing: 10,
                  runSpacing: 8,
                  children: infoBadges.asMap().entries.map((entry) {
                    final index = entry.key;
                    final badge = entry.value;
                    return Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.cardSurface.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            badge['icon']!,
                            style: const TextStyle(fontSize: 10),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            badge['label']!,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    )
                        .animate(delay: Duration(milliseconds: 200 + index * 50))
                        .fadeIn(duration: 200.ms)
                        .scale(
                          begin: const Offset(0.8, 0.8),
                          end: const Offset(1, 1),
                          duration: 200.ms,
                        );
                  }).toList(),
                ),
              ],
            ),
          ),

          // Remove button
          GestureDetector(
            onTap: onRemove,
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF2A2A40),
                    Color(0xFF1E1E32),
                  ],
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  const BoxShadow(
                    color: Color(0xFF0A0A12),
                    offset: Offset(0, 2),
                  ),
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.2),
                    offset: const Offset(0, 4),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Icon(
                Icons.close,
                size: 20,
                color: AppColors.textMuted,
              ),
            ),
          )
              .animate(delay: 250.ms)
              .fadeIn(duration: 200.ms)
              .scale(begin: const Offset(0, 0), duration: 200.ms),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 300.ms)
        .slideY(begin: 0.1, end: 0, duration: 300.ms)
        .scale(begin: const Offset(0.95, 0.95), duration: 300.ms);
  }
}
