import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
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
  static const _shareChannel = EventChannel('com.clipchop/share_intent');
  StreamSubscription<dynamic>? _shareSubscription;

  @override
  void initState() {
    super.initState();
    _initShareListener();
  }

  void _initShareListener() {
    _shareSubscription = _shareChannel.receiveBroadcastStream().listen(
      (dynamic path) {
        if (path != null && path is String && path.isNotEmpty) {
          debugPrint('Received shared video: $path');
          _videoState.loadVideo(path);
        }
      },
      onError: (dynamic error) {
        debugPrint('Share intent error: $error');
      },
    );
  }

  @override
  void dispose() {
    _shareSubscription?.cancel();
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
