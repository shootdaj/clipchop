import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Animated floating orbs background
class FloatingOrbs extends StatefulWidget {
  const FloatingOrbs({super.key});

  @override
  State<FloatingOrbs> createState() => _FloatingOrbsState();
}

class _FloatingOrbsState extends State<FloatingOrbs>
    with TickerProviderStateMixin {
  late AnimationController _slowController;
  late AnimationController _mediumController;
  late AnimationController _fastController;

  @override
  void initState() {
    super.initState();

    _slowController = AnimationController(
      duration: const Duration(seconds: 8),
      vsync: this,
    )..repeat(reverse: true);

    _mediumController = AnimationController(
      duration: const Duration(seconds: 6),
      vsync: this,
    )..repeat(reverse: true);

    _fastController = AnimationController(
      duration: const Duration(seconds: 4),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _slowController.dispose();
    _mediumController.dispose();
    _fastController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Stack(
        children: [
          // Large purple orb - top left
          AnimatedBuilder(
            animation: _slowController,
            builder: (context, child) {
              final offset = _slowController.value * 30;
              return Positioned(
                top: -200 + offset,
                left: -200 - offset * 0.5,
                child: Container(
                  width: 600,
                  height: 600,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        AppColors.primary.withValues(alpha: 0.15),
                        AppColors.primary.withValues(alpha: 0.05),
                        AppColors.primary.withValues(alpha: 0),
                      ],
                      stops: const [0.0, 0.5, 1.0],
                    ),
                  ),
                ),
              );
            },
          ),

          // Amber orb - bottom right
          AnimatedBuilder(
            animation: _mediumController,
            builder: (context, child) {
              final offset = _mediumController.value * 25;
              return Positioned(
                bottom: -150 - offset,
                right: -150 + offset * 0.5,
                child: Container(
                  width: 500,
                  height: 500,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        AppColors.accent.withValues(alpha: 0.12),
                        AppColors.accent.withValues(alpha: 0.04),
                        AppColors.accent.withValues(alpha: 0),
                      ],
                      stops: const [0.0, 0.5, 1.0],
                    ),
                  ),
                ),
              );
            },
          ),

          // Small purple orb - center right
          AnimatedBuilder(
            animation: _fastController,
            builder: (context, child) {
              final offset = _fastController.value * 20;
              return Positioned(
                top: MediaQuery.of(context).size.height * 0.33,
                right: -100 + offset,
                child: Container(
                  width: 300,
                  height: 300,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        AppColors.primary.withValues(alpha: 0.08),
                        AppColors.primary.withValues(alpha: 0.02),
                        AppColors.primary.withValues(alpha: 0),
                      ],
                      stops: const [0.0, 0.5, 1.0],
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
