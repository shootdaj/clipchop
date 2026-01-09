package com.clipchop.clipchop_flutter

import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Bundle
import android.util.Log
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.FileOutputStream

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.clipchop/media_scanner"
    private val SHARE_CHANNEL = "com.clipchop/share_intent"
    private var sharedFilePath: String? = null
    private var eventSink: EventChannel.EventSink? = null
    private val TAG = "ClipchopShare"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        if (intent == null) return

        when (intent.action) {
            Intent.ACTION_SEND -> {
                if (intent.type?.startsWith("video/") == true) {
                    val uri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
                    Log.d(TAG, "Received video share: $uri")
                    if (uri != null) {
                        copyUriToCache(uri)?.let { path ->
                            sharedFilePath = path
                            Log.d(TAG, "Copied to cache: $path")
                            // Send to Flutter if event sink is ready
                            eventSink?.success(path)
                        }
                    }
                }
            }
        }
    }

    private fun copyUriToCache(uri: Uri): String? {
        return try {
            val inputStream = contentResolver.openInputStream(uri) ?: return null
            val cacheDir = File(cacheDir, "shared_videos")
            if (!cacheDir.exists()) cacheDir.mkdirs()

            // Generate unique filename
            val fileName = "shared_video_${System.currentTimeMillis()}.mp4"
            val outputFile = File(cacheDir, fileName)

            FileOutputStream(outputFile).use { output ->
                inputStream.copyTo(output)
            }
            inputStream.close()

            outputFile.absolutePath
        } catch (e: Exception) {
            Log.e(TAG, "Error copying file: ${e.message}")
            null
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Event channel for streaming shared files to Flutter
        EventChannel(flutterEngine.dartExecutor.binaryMessenger, SHARE_CHANNEL).setStreamHandler(
            object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                    eventSink = events
                    // Send any pending shared file
                    sharedFilePath?.let { path ->
                        Log.d(TAG, "Sending pending shared file: $path")
                        events?.success(path)
                        sharedFilePath = null
                    }
                }

                override fun onCancel(arguments: Any?) {
                    eventSink = null
                }
            }
        )

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "scanFile" -> {
                    val path = call.argument<String>("path")
                    if (path != null) {
                        MediaScannerConnection.scanFile(
                            this,
                            arrayOf(path),
                            arrayOf("video/mp4")
                        ) { scannedPath, uri ->
                            runOnUiThread {
                                if (uri != null) {
                                    result.success(uri.toString())
                                } else {
                                    result.error("SCAN_FAILED", "Failed to scan file", null)
                                }
                            }
                        }
                    } else {
                        result.error("INVALID_PATH", "Path is null", null)
                    }
                }
                "scanFiles" -> {
                    val paths = call.argument<List<String>>("paths")
                    if (paths != null && paths.isNotEmpty()) {
                        MediaScannerConnection.scanFile(
                            this,
                            paths.toTypedArray(),
                            paths.map { "video/mp4" }.toTypedArray()
                        ) { _, _ ->
                            // Called for each file
                        }
                        result.success(true)
                    } else {
                        result.error("INVALID_PATHS", "Paths list is empty or null", null)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }
}
