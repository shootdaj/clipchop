import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';
import 'card_3d.dart';
import 'button_3d.dart';

/// Duration selector with preset buttons and custom input
class DurationSelector extends StatefulWidget {
  final int? value;
  final ValueChanged<int> onChanged;
  final bool disabled;

  const DurationSelector({
    super.key,
    this.value,
    required this.onChanged,
    this.disabled = false,
  });

  @override
  State<DurationSelector> createState() => _DurationSelectorState();
}

class _DurationSelectorState extends State<DurationSelector> {
  static const _presets = [15, 30, 60, 90];
  bool _showCustomInput = false;
  final _customController = TextEditingController();
  final _focusNode = FocusNode();

  @override
  void dispose() {
    _customController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  String _formatDuration(int seconds) {
    if (seconds < 60) return '${seconds}s';
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return secs == 0 ? '${mins}m' : '${mins}m ${secs}s';
  }

  bool get _isCustomValue =>
      widget.value != null && !_presets.contains(widget.value);

  void _handleCustomSubmit() {
    final value = int.tryParse(_customController.text);
    if (value != null && value > 0) {
      widget.onChanged(value);
      setState(() {
        _showCustomInput = false;
        _customController.clear();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card3D(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'SPLIT DURATION',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted,
                  letterSpacing: 1,
                ),
              ),
              if (widget.value != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_formatDuration(widget.value!)} clips',
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

          // Preset buttons
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              // Preset buttons
              ..._presets.asMap().entries.map((entry) {
                final preset = entry.value;
                final isSelected = widget.value == preset;
                return Pill3D(
                  text: _formatDuration(preset),
                  isSelected: isSelected,
                  onTap: widget.disabled
                      ? null
                      : () {
                          widget.onChanged(preset);
                          setState(() => _showCustomInput = false);
                        },
                )
                    .animate(delay: Duration(milliseconds: entry.key * 50))
                    .fadeIn(duration: 200.ms)
                    .slideY(begin: 0.2, end: 0, duration: 200.ms);
              }),

              // Custom button
              Pill3D(
                text: _isCustomValue
                    ? _formatDuration(widget.value!)
                    : 'Custom',
                isSelected: _isCustomValue || _showCustomInput,
                isDashed: !_isCustomValue && !_showCustomInput,
                onTap: widget.disabled
                    ? null
                    : () => setState(() => _showCustomInput = true),
              )
                  .animate(delay: 200.ms)
                  .fadeIn(duration: 200.ms)
                  .slideY(begin: 0.2, end: 0, duration: 200.ms),
            ],
          ),

          // Custom input
          if (_showCustomInput) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: AppGradients.cardInset,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.border,
                        width: 1,
                      ),
                    ),
                    child: TextField(
                      controller: _customController,
                      focusNode: _focusNode,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(4),
                      ],
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Enter seconds...',
                        hintStyle: TextStyle(
                          color: AppColors.textMuted.withValues(alpha: 0.5),
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                      ),
                      onSubmitted: (_) => _handleCustomSubmit(),
                    ),
                  ),
                )
                    .animate()
                    .fadeIn(duration: 200.ms)
                    .slideX(begin: -0.1, end: 0, duration: 200.ms),
                const SizedBox(width: 12),
                Button3D(
                  text: 'Set',
                  onPressed: _handleCustomSubmit,
                )
                    .animate(delay: 50.ms)
                    .fadeIn(duration: 200.ms)
                    .scale(begin: const Offset(0.8, 0.8), duration: 200.ms),
                const SizedBox(width: 8),
                Button3DSecondary(
                  text: 'Cancel',
                  onPressed: () {
                    setState(() {
                      _showCustomInput = false;
                      _customController.clear();
                    });
                  },
                )
                    .animate(delay: 100.ms)
                    .fadeIn(duration: 200.ms)
                    .scale(begin: const Offset(0.8, 0.8), duration: 200.ms),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
