import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Animated gradient text widget
class GradientText extends StatefulWidget {
  final String text;
  final TextStyle? style;
  final TextAlign? textAlign;

  const GradientText({
    super.key,
    required this.text,
    this.style,
    this.textAlign,
  });

  @override
  State<GradientText> createState() => _GradientTextState();
}

class _GradientTextState extends State<GradientText>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 4),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          shaderCallback: (bounds) {
            return LinearGradient(
              colors: const [
                AppColors.primary,
                AppColors.primaryLight,
                AppColors.accent,
                AppColors.primaryLight,
                AppColors.primary,
              ],
              stops: const [0.0, 0.25, 0.5, 0.75, 1.0],
              begin: Alignment(-1.0 + _controller.value * 4, 0),
              end: Alignment(1.0 + _controller.value * 4, 0),
            ).createShader(bounds);
          },
          blendMode: BlendMode.srcIn,
          child: Text(
            widget.text,
            style: widget.style,
            textAlign: widget.textAlign,
          ),
        );
      },
    );
  }
}
