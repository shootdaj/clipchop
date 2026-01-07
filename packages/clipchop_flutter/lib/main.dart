import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:receive_sharing_intent/receive_sharing_intent.dart';
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
  late StreamSubscription _intentSubscription;
  final _videoState = VideoState();

  @override
  void initState() {
    super.initState();
    _initReceiveSharingIntent();
  }

  void _initReceiveSharingIntent() {
    // Handle shared files when app is opened from share
    ReceiveSharingIntent.instance.getInitialMedia().then((List<SharedMediaFile> value) {
      if (value.isNotEmpty) {
        _handleSharedFiles(value);
      }
    });

    // Handle shared files when app is already running
    _intentSubscription = ReceiveSharingIntent.instance.getMediaStream().listen(
      (List<SharedMediaFile> value) {
        if (value.isNotEmpty) {
          _handleSharedFiles(value);
        }
      },
      onError: (err) {
        debugPrint('Error receiving shared file: $err');
      },
    );
  }

  void _handleSharedFiles(List<SharedMediaFile> files) {
    // Get the first video file
    final videoFile = files.firstWhere(
      (file) => file.type == SharedMediaType.video,
      orElse: () => files.first,
    );

    if (videoFile.path.isNotEmpty) {
      // Load the video in the app
      _videoState.loadVideo(videoFile.path);
    }
  }

  @override
  void dispose() {
    _intentSubscription.cancel();
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
