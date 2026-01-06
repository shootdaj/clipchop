import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// 3D card widget with glass morphism effect
class Card3D extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final bool isHovered;
  final VoidCallback? onTap;

  const Card3D({
    super.key,
    required this.child,
    this.padding,
    this.isHovered = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: padding ?? const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: AppGradients.card,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: isHovered
                ? AppColors.primary.withValues(alpha: 0.4)
                : AppColors.primary.withValues(alpha: 0.15),
            width: 1,
          ),
          boxShadow: isHovered ? AppShadows.cardHover : AppShadows.card,
        ),
        child: child,
      ),
    );
  }
}

/// Inset 3D card (pressed effect)
/// Note: Flutter doesn't support inset box shadows natively,
/// so we simulate the effect using gradient and border
class Card3DInset extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;

  const Card3DInset({
    super.key,
    required this.child,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AppGradients.cardInset,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.black.withValues(alpha: 0.3),
          width: 1,
        ),
        // Simulating inset shadow with outer shadow + gradient
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            offset: const Offset(0, 1),
            blurRadius: 2,
          ),
        ],
      ),
      child: child,
    );
  }
}
