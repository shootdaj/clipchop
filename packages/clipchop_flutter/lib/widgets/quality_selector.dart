import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';
import '../models/video_models.dart';
import 'card_3d.dart';
import 'button_3d.dart';

/// Quality selector for output resolution
class QualitySelector extends StatelessWidget {
  final OutputQuality value;
  final ValueChanged<OutputQuality> onChanged;
  final int? sourceWidth;
  final int? sourceHeight;
  final bool disabled;

  const QualitySelector({
    super.key,
    required this.value,
    required this.onChanged,
    this.sourceWidth,
    this.sourceHeight,
    this.disabled = false,
  });

  String _getQualityLabel(OutputQuality quality) {
    switch (quality) {
      case OutputQuality.full:
        if (sourceWidth != null && sourceHeight != null) {
          return 'Full Quality (${sourceWidth}x$sourceHeight)';
        }
        return 'Full Quality';
      case OutputQuality.hd1920:
        return 'HD (1920px)';
      case OutputQuality.sd1280:
        return 'SD (1280px)';
    }
  }

  String _getEstimatedTime(OutputQuality quality) {
    switch (quality) {
      case OutputQuality.full:
        return '~15-30 min';
      case OutputQuality.hd1920:
        return '~5-10 min';
      case OutputQuality.sd1280:
        return '~2-5 min';
    }
  }

  @override
  Widget build(BuildContext context) {
    final is4K = (sourceWidth ?? 0) > 1920 || (sourceHeight ?? 0) > 1920;

    return Card3D(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Text(
            'OUTPUT QUALITY',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textMuted,
              letterSpacing: 1,
            ),
          ),

          const SizedBox(height: 16),

          // Quality options
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: OutputQuality.values.asMap().entries.map((entry) {
              final index = entry.key;
              final quality = entry.value;
              final isSelected = value == quality;

              return Pill3D(
                text: _getQualityLabel(quality),
                isSelected: isSelected,
                onTap: disabled ? null : () => onChanged(quality),
              )
                  .animate(delay: Duration(milliseconds: index * 50))
                  .fadeIn(duration: 200.ms)
                  .slideY(begin: 0.2, end: 0, duration: 200.ms);
            }).toList(),
          ),

          // Info text
          if (sourceWidth != null) ...[
            const SizedBox(height: 16),

            // Downscaling info
            if (value != OutputQuality.full)
              Row(
                children: [
                  const Text('⚡', style: TextStyle(fontSize: 12)),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      'Downscaling speeds up encoding',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              )
                  .animate()
                  .fadeIn(duration: 200.ms),

            // 4K warning
            if (value == OutputQuality.full && is4K)
              Container(
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: AppColors.accent.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Row(
                  children: [
                    Text(
                      '⚠️',
                      style: TextStyle(fontSize: 14),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '4K encoding can be slow. Consider using HD or SD for faster results.',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.accent,
                        ),
                      ),
                    ),
                  ],
                ),
              )
                  .animate()
                  .fadeIn(duration: 200.ms)
                  .slideY(begin: 0.1, end: 0, duration: 200.ms),

            // Estimated time
            const SizedBox(height: 12),
            Text(
              'Estimated time: ${_getEstimatedTime(value)} per minute of video',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textMuted.withValues(alpha: 0.7),
              ),
            )
                .animate()
                .fadeIn(duration: 200.ms),
          ],
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 250.ms)
        .slideY(begin: 0.1, end: 0, duration: 250.ms);
  }
}
