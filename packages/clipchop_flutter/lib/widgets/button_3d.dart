import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// 3D primary button with press animation
class Button3D extends StatefulWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool showGlow;
  final IconData? icon;

  const Button3D({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.showGlow = false,
    this.icon,
  });

  @override
  State<Button3D> createState() => _Button3DState();
}

class _Button3DState extends State<Button3D> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final isDisabled = widget.onPressed == null;

    return GestureDetector(
      onTapDown: isDisabled ? null : (_) => setState(() => _isPressed = true),
      onTapUp: isDisabled ? null : (_) => setState(() => _isPressed = false),
      onTapCancel: isDisabled ? null : () => setState(() => _isPressed = false),
      onTap: widget.onPressed,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 100),
        transform: Matrix4.translationValues(0, _isPressed ? 2 : 0, 0),
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 200),
          opacity: isDisabled ? 0.4 : 1.0,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            decoration: BoxDecoration(
              gradient: AppGradients.primaryButton,
              borderRadius: BorderRadius.circular(16),
              boxShadow: _isPressed
                  ? AppShadows.buttonPressed
                  : [
                      ...AppShadows.button,
                      if (widget.showGlow && !isDisabled)
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.5),
                          blurRadius: 20,
                          spreadRadius: -5,
                        ),
                    ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (widget.isLoading) ...[
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                  const SizedBox(width: 12),
                ],
                if (widget.icon != null && !widget.isLoading) ...[
                  Icon(widget.icon, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                ],
                Text(
                  widget.text,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Secondary 3D button
class Button3DSecondary extends StatefulWidget {
  final String text;
  final VoidCallback? onPressed;
  final IconData? icon;

  const Button3DSecondary({
    super.key,
    required this.text,
    this.onPressed,
    this.icon,
  });

  @override
  State<Button3DSecondary> createState() => _Button3DSecondaryState();
}

class _Button3DSecondaryState extends State<Button3DSecondary> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final isDisabled = widget.onPressed == null;

    return GestureDetector(
      onTapDown: isDisabled ? null : (_) => setState(() => _isPressed = true),
      onTapUp: isDisabled ? null : (_) => setState(() => _isPressed = false),
      onTapCancel: isDisabled ? null : () => setState(() => _isPressed = false),
      onTap: widget.onPressed,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 100),
        transform: Matrix4.translationValues(0, _isPressed ? 2 : 0, 0),
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 200),
          opacity: isDisabled ? 0.4 : 1.0,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF28283C),
                  Color(0xFF1E1E32),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppColors.primary.withValues(alpha: 0.2),
                width: 1,
              ),
              boxShadow: _isPressed
                  ? [
                      const BoxShadow(
                        color: Color(0xFF0F0F19),
                        offset: Offset(0, 2),
                      ),
                    ]
                  : [
                      const BoxShadow(
                        color: Color(0xFF0F0F19),
                        offset: Offset(0, 4),
                      ),
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        offset: const Offset(0, 6),
                        blurRadius: 10,
                      ),
                    ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (widget.icon != null) ...[
                  Icon(widget.icon, color: AppColors.textPrimary, size: 18),
                  const SizedBox(width: 8),
                ],
                Text(
                  widget.text,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 3D Pill button (for duration selector)
class Pill3D extends StatefulWidget {
  final String text;
  final bool isSelected;
  final VoidCallback? onTap;
  final bool isDashed;

  const Pill3D({
    super.key,
    required this.text,
    this.isSelected = false,
    this.onTap,
    this.isDashed = false,
  });

  @override
  State<Pill3D> createState() => _Pill3DState();
}

class _Pill3DState extends State<Pill3D> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        transform: Matrix4.translationValues(
          0,
          _isPressed ? 2 : (widget.isSelected ? 0 : 0),
          0,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        decoration: BoxDecoration(
          gradient: widget.isSelected
              ? const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xE6A855F7),
                    Color(0xF28B5CF6),
                  ],
                )
              : const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF232337),
                    Color(0xFF19192A),
                  ],
                ),
          borderRadius: BorderRadius.circular(9999),
          border: widget.isDashed
              ? Border.all(
                  color: widget.isSelected
                      ? AppColors.primary.withValues(alpha: 0.5)
                      : AppColors.border,
                  width: 2,
                )
              : Border.all(
                  color: widget.isSelected
                      ? AppColors.primary.withValues(alpha: 0.5)
                      : Colors.white.withValues(alpha: 0.05),
                  width: 1,
                ),
          boxShadow: widget.isSelected ? AppShadows.pillActive : AppShadows.pill,
        ),
        child: Text(
          widget.text,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: widget.isSelected ? Colors.white : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}
