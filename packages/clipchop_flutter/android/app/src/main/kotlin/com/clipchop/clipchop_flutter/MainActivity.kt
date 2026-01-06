package com.clipchop.clipchop_flutter

import android.media.MediaScannerConnection
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.clipchop/media_scanner"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

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
