import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:flutter_sharing_intent/flutter_sharing_intent.dart';
import 'package:flutter_sharing_intent/model/sharing_file.dart';
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
  StreamSubscription<List<SharedFile>>? _sharingSubscription;

  @override
  void initState() {
    super.initState();
    _initSharingIntent();
  }

  Future<void> _initSharingIntent() async {
    // Handle initial shared media (app was launched via share)
    final initialMedia = await FlutterSharingIntent.instance.getInitialSharing();
    _handleSharedFiles(initialMedia);

    // Listen for shared media while app is running
    _sharingSubscription = FlutterSharingIntent.instance.getMediaStream().listen(_handleSharedFiles);
  }

  void _handleSharedFiles(List<SharedFile> files) {
    if (files.isEmpty) return;

    // Find the first video file
    for (final file in files) {
      if (file.value != null) {
        final path = file.value!;
        // Check if it's a video
        if (file.type == SharedMediaType.VIDEO ||
            path.toLowerCase().endsWith('.mp4') ||
            path.toLowerCase().endsWith('.mov') ||
            path.toLowerCase().endsWith('.avi') ||
            path.toLowerCase().endsWith('.mkv') ||
            path.toLowerCase().endsWith('.webm')) {
          debugPrint('Received shared video: $path');
          _videoState.loadVideo(path);
          break;
        }
      }
    }
  }

  @override
  void dispose() {
    _sharingSubscription?.cancel();
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
