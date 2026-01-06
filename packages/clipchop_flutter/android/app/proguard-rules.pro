# Flutter wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Ignore missing Play Core classes (not using deferred components)
-dontwarn com.google.android.play.core.**

# File Picker Plugin
-keep class com.mr.flutter.plugin.filepicker.** { *; }
-keepclassmembers class com.mr.flutter.plugin.filepicker.** { *; }

# FFmpeg Kit
-keep class com.antonkarpenko.ffmpegkit.** { *; }
-keep class com.arthenica.** { *; }

# Share Plus
-keep class dev.fluttercommunity.plus.share.** { *; }

# Video Thumbnail
-keep class xyz.justsoft.video_thumbnail.** { *; }

# Permission Handler
-keep class com.baseflow.permissionhandler.** { *; }

# Video Player
-keep class io.flutter.plugins.videoplayer.** { *; }

# Path Provider
-keep class io.flutter.plugins.pathprovider.** { *; }

# Keep native methods
-keepclasseswithmembers class * {
    native <methods>;
}
