import 'package:flutter/material.dart';

/// ClipChop theme colors - dark purple/amber theme matching web app
class AppColors {
  // Background colors
  static const Color background = Color(0xFF0A0A12);
  static const Color surface = Color(0xFF14142A);
  static const Color card = Color(0xFF1E1E32);
  static const Color cardHover = Color(0xFF252540);

  // Primary colors (purple)
  static const Color primary = Color(0xFFA855F7);
  static const Color primaryLight = Color(0xFFC084FC);
  static const Color primaryDark = Color(0xFF7C3AED);
  static const Color primaryMuted = Color(0xFF8B5CF6);

  // Accent colors (amber)
  static const Color accent = Color(0xFFF59E0B);
  static const Color accentLight = Color(0xFFFBBF24);

  // Text colors
  static const Color textPrimary = Color(0xFFF0F0F5);
  static const Color textSecondary = Color(0xFF71717A);
  static const Color textMuted = Color(0xFF52525B);

  // Surface colors
  static const Color cardSurface = Color(0xFF232337);

  // Border colors
  static const Color border = Color(0xFF3F3F5A);
  static const Color borderLight = Color(0xFF525270);

  // Status colors
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);

  // Gradient colors for segments
  static const List<Color> segmentColors = [
    Color(0xFF8B5CF6), // violet
    Color(0xFFA855F7), // purple
    Color(0xFFD946EF), // fuchsia
    Color(0xFFEC4899), // pink
    Color(0xFF6366F1), // indigo
    Color(0xFFF59E0B), // amber
  ];
}

/// App gradients
class AppGradients {
  static const LinearGradient primaryButton = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFFA855F7),
      Color(0xFF8B5CF6),
      Color(0xFF7C3AED),
    ],
  );

  static const LinearGradient card = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF1E1E32),
      Color(0xFF141423),
    ],
  );

  static const LinearGradient cardInset = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF0A0A12),
      Color(0xFF0F0F19),
    ],
  );

  static const LinearGradient progressBar = LinearGradient(
    colors: [
      Color(0xFF7C3AED),
      Color(0xFFA855F7),
      Color(0xFFC084FC),
      Color(0xFFA855F7),
      Color(0xFF7C3AED),
    ],
  );

  // Alias for progress_card.dart
  static const LinearGradient progress = progressBar;

  static const LinearGradient textGradient = LinearGradient(
    colors: [
      Color(0xFFA855F7),
      Color(0xFFC084FC),
      Color(0xFFF59E0B),
      Color(0xFFC084FC),
      Color(0xFFA855F7),
    ],
  );
}

/// App shadows for 3D effects
class AppShadows {
  static List<BoxShadow> card = [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.3),
      offset: const Offset(0, 4),
      blurRadius: 6,
    ),
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.4),
      offset: const Offset(0, 10),
      blurRadius: 20,
    ),
    BoxShadow(
      color: AppColors.primary.withValues(alpha: 0.3),
      offset: const Offset(0, 0),
      blurRadius: 40,
      spreadRadius: -10,
    ),
  ];

  static List<BoxShadow> cardHover = [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.35),
      offset: const Offset(0, 6),
      blurRadius: 10,
    ),
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.45),
      offset: const Offset(0, 15),
      blurRadius: 30,
    ),
    BoxShadow(
      color: AppColors.primary.withValues(alpha: 0.4),
      offset: const Offset(0, 0),
      blurRadius: 60,
      spreadRadius: -10,
    ),
  ];

  static List<BoxShadow> button = [
    const BoxShadow(
      color: Color(0xFF581C87),
      offset: Offset(0, 4),
    ),
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.3),
      offset: const Offset(0, 6),
      blurRadius: 10,
    ),
    BoxShadow(
      color: AppColors.primary.withValues(alpha: 0.2),
      offset: const Offset(0, 10),
      blurRadius: 20,
    ),
  ];

  static List<BoxShadow> buttonPressed = [
    const BoxShadow(
      color: Color(0xFF581C87),
      offset: Offset(0, 2),
    ),
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.25),
      offset: const Offset(0, 3),
      blurRadius: 6,
    ),
  ];

  static List<BoxShadow> pill = [
    const BoxShadow(
      color: Color(0xFF0A0A12),
      offset: Offset(0, 3),
    ),
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.3),
      offset: const Offset(0, 4),
      blurRadius: 8,
    ),
  ];

  static List<BoxShadow> pillActive = [
    BoxShadow(
      color: const Color(0xFF581C87).withValues(alpha: 0.8),
      offset: const Offset(0, 3),
    ),
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.3),
      offset: const Offset(0, 4),
      blurRadius: 8,
    ),
    BoxShadow(
      color: AppColors.primary.withValues(alpha: 0.4),
      offset: const Offset(0, 0),
      blurRadius: 30,
    ),
  ];

  static List<BoxShadow> glow = [
    BoxShadow(
      color: AppColors.primary.withValues(alpha: 0.4),
      blurRadius: 20,
    ),
    BoxShadow(
      color: AppColors.primary.withValues(alpha: 0.2),
      blurRadius: 40,
    ),
  ];
}

/// App theme data
class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.surface,
        error: AppColors.error,
        onPrimary: Colors.white,
        onSecondary: Colors.black,
        onSurface: AppColors.textPrimary,
        onError: Colors.white,
      ),
      fontFamily: 'Inter',
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          fontSize: 56,
          fontWeight: FontWeight.bold,
          color: AppColors.textPrimary,
          letterSpacing: -1.5,
        ),
        displayMedium: TextStyle(
          fontSize: 45,
          fontWeight: FontWeight.bold,
          color: AppColors.textPrimary,
          letterSpacing: -0.5,
        ),
        headlineLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: AppColors.textPrimary,
        ),
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
        titleLarge: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: AppColors.textPrimary,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          color: AppColors.textPrimary,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          color: AppColors.textSecondary,
        ),
        labelLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
        labelSmall: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppColors.textMuted,
          letterSpacing: 0.5,
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: AppColors.textPrimary,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
