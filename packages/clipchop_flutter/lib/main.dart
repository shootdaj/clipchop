import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:share_handler/share_handler.dart';
import 'theme/app_theme.dart';
import 'services/video_state.dart';
import 'screens/home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Set preferred orientations
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Set system UI overlay style for dark theme
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppColors.background,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const ClipchopApp());
}

class ClipchopApp extends StatefulWidget {
  const ClipchopApp({super.key});

  @override
  State<ClipchopApp> createState() => _ClipchopAppState();
}

class _ClipchopAppState extends State<ClipchopApp> {
  final VideoState _videoState = VideoState();
  StreamSubscription<SharedMedia>? _sharedMediaSubscription;

  @override
  void initState() {
    super.initState();
    _initShareHandler();
  }

  Future<void> _initShareHandler() async {
    final handler = ShareHandlerPlatform.instance;

    // Handle initial shared media (app was launched via share)
    final initialMedia = await handler.getInitialSharedMedia();
    if (initialMedia != null) {
      _handleSharedMedia(initialMedia);
    }

    // Listen for shared media while app is running
    _sharedMediaSubscription = handler.sharedMediaStream.listen(_handleSharedMedia);
  }

  void _handleSharedMedia(SharedMedia media) {
    // Get video files from shared content
    final attachments = media.attachments;
    if (attachments != null && attachments.isNotEmpty) {
      // Find the first video file
      for (final attachment in attachments) {
        if (attachment?.path != null) {
          final path = attachment!.path;
          // Check if it's a video based on extension or just load it
          if (path.toLowerCase().endsWith('.mp4') ||
              path.toLowerCase().endsWith('.mov') ||
              path.toLowerCase().endsWith('.avi') ||
              path.toLowerCase().endsWith('.mkv') ||
              path.toLowerCase().endsWith('.webm') ||
              path.toLowerCase().contains('video')) {
            _videoState.loadVideo(path);
            break;
          }
        }
      }
      // If no video extension found but we have attachments, try the first one
      if (!_videoState.hasVideo && attachments.first?.path != null) {
        _videoState.loadVideo(attachments.first!.path);
      }
    }
  }

  @override
  void dispose() {
    _sharedMediaSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: _videoState,
      child: MaterialApp(
        title: 'Clipchop',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const HomeScreen(),
      ),
    );
  }
}
