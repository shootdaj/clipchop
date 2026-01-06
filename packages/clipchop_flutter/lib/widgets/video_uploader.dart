import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';
import 'card_3d.dart';

/// Video uploader widget with animated floating elements
class VideoUploader extends StatefulWidget {
  final VoidCallback onTap;
  final bool isLoading;

  const VideoUploader({
    super.key,
    required this.onTap,
    this.isLoading = false,
  });

  @override
  State<VideoUploader> createState() => _VideoUploaderState();
}

class _VideoUploaderState extends State<VideoUploader>
    with TickerProviderStateMixin {
  late AnimationController _floatController;
  late AnimationController _glowController;

  @override
  void initState() {
    super.initState();
    _floatController = AnimationController(
      duration: const Duration(seconds: 4),
      vsync: this,
    )..repeat(reverse: true);

    _glowController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _floatController.dispose();
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.isLoading ? null : widget.onTap,
      child: Card3D(
        padding: EdgeInsets.zero,
        child: Container(
          height: 300,
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
          ),
          child: Stack(
            children: [
              // Animated background orbs
              _buildBackgroundOrbs(),

              // Content
              Center(
                child: widget.isLoading
                    ? _buildLoadingState()
                    : _buildUploadState(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBackgroundOrbs() {
    return AnimatedBuilder(
      animation: _floatController,
      builder: (context, child) {
        final offset = _floatController.value * 20;
        return Stack(
          children: [
            // Purple orb top-left
            Positioned(
              top: -40 + offset,
              left: -40 - offset * 0.5,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppColors.primary.withValues(alpha: 0.2),
                      AppColors.primary.withValues(alpha: 0),
                    ],
                  ),
                ),
              ),
            ),
            // Amber orb bottom-right
            Positioned(
              bottom: -50 - offset * 0.7,
              right: -50 + offset * 0.5,
              child: Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppColors.accent.withValues(alpha: 0.15),
                      AppColors.accent.withValues(alpha: 0),
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildLoadingState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        SizedBox(
          width: 48,
          height: 48,
          child: CircularProgressIndicator(
            strokeWidth: 3,
            color: AppColors.primary,
            backgroundColor: AppColors.primary.withValues(alpha: 0.2),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Processing...',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildUploadState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Floating icon with glow
        AnimatedBuilder(
          animation: Listenable.merge([_floatController, _glowController]),
          builder: (context, child) {
            final floatOffset = _floatController.value * 8;
            final glowIntensity = 0.2 + (_glowController.value * 0.2);

            return Transform.translate(
              offset: Offset(0, -floatOffset),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppColors.primary.withValues(alpha: 0.2),
                      AppColors.accent.withValues(alpha: 0.1),
                    ],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: glowIntensity),
                      blurRadius: 30,
                      spreadRadius: -5,
                    ),
                  ],
                ),
                child: Icon(
                  Icons.videocam_outlined,
                  size: 48,
                  color: AppColors.textSecondary,
                ),
              ),
            );
          },
        ),

        const SizedBox(height: 32),

        // Title
        Text(
          'Select your video',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        )
            .animate()
            .fadeIn(duration: 400.ms)
            .slideY(begin: 0.2, end: 0, duration: 400.ms),

        const SizedBox(height: 8),

        // Subtitle
        RichText(
          text: TextSpan(
            text: 'Tap to ',
            style: TextStyle(
              fontSize: 16,
              color: AppColors.textSecondary,
            ),
            children: [
              TextSpan(
                text: 'browse files',
                style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        )
            .animate(delay: 100.ms)
            .fadeIn(duration: 400.ms)
            .slideY(begin: 0.2, end: 0, duration: 400.ms),

        const SizedBox(height: 24),

        // Format badges
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: ['MP4', 'WebM', 'MOV'].asMap().entries.map((entry) {
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppColors.primary.withValues(alpha: 0.15),
                      AppColors.primary.withValues(alpha: 0.1),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.2),
                    width: 1,
                  ),
                  boxShadow: [
                    const BoxShadow(
                      color: Color(0xFF0A0A12),
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Text(
                  entry.value,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryLight,
                  ),
                ),
              ),
            )
                .animate(delay: Duration(milliseconds: 200 + entry.key * 100))
                .fadeIn(duration: 300.ms)
                .slideY(begin: 0.5, end: 0, duration: 300.ms)
                .scale(begin: const Offset(0.8, 0.8), duration: 300.ms);
          }).toList(),
        ),
      ],
    );
  }
}
