package com.clipchop.app

import android.app.Activity
import android.content.Intent
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Log
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer

@CapacitorPlugin(name = "VideoSplitter")
class VideoSplitterPlugin : Plugin() {

    companion object {
        private const val TAG = "VideoSplitter"
        private const val REQUEST_VIDEO_PICK = 1001
    }

    @PluginMethod
    fun pickVideo(call: PluginCall) {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "video/*"
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        startActivityForResult(call, intent, "handleVideoPickResult")
    }

    @ActivityCallback
    fun handleVideoPickResult(call: PluginCall, result: ActivityResult) {
        if (result.resultCode == Activity.RESULT_OK) {
            val uri = result.data?.data
            if (uri != null) {
                try {
                    // Copy file to cache for processing
                    val fileName = getFileName(uri)
                    val cacheFile = File(context.cacheDir, fileName)

                    context.contentResolver.openInputStream(uri)?.use { input ->
                        FileOutputStream(cacheFile).use { output ->
                            input.copyTo(output)
                        }
                    }

                    val ret = JSObject().apply {
                        put("filePath", cacheFile.absolutePath)
                        put("fileName", fileName)
                    }
                    call.resolve(ret)
                } catch (e: Exception) {
                    call.reject("Failed to process video: ${e.message}")
                }
            } else {
                call.reject("No video selected")
            }
        } else {
            call.reject("Video selection cancelled")
        }
    }

    private fun getFileName(uri: Uri): String {
        var name = "video_${System.currentTimeMillis()}.mp4"
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (cursor.moveToFirst() && nameIndex >= 0) {
                name = cursor.getString(nameIndex)
            }
        }
        return name
    }

    @PluginMethod
    fun getMetadata(call: PluginCall) {
        val filePath = call.getString("filePath")
        if (filePath == null) {
            call.reject("filePath is required")
            return
        }

        try {
            val retriever = MediaMetadataRetriever()
            retriever.setDataSource(filePath)

            val duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
            val width = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull() ?: 0
            val height = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull() ?: 0
            val rotation = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0

            retriever.release()

            val ret = JSObject().apply {
                put("duration", duration / 1000.0) // Convert ms to seconds
                put("width", width)
                put("height", height)
                put("rotation", rotation)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get metadata", e)
            call.reject("Failed to get metadata: ${e.message}")
        }
    }

    @PluginMethod
    fun splitVideo(call: PluginCall) {
        val filePath = call.getString("filePath")
        val segmentDuration = call.getDouble("segmentDuration") ?: 30.0
        val outputDir = call.getString("outputDir") ?: context.cacheDir.absolutePath

        if (filePath == null) {
            call.reject("filePath is required")
            return
        }

        Thread {
            try {
                val segments = splitVideoInternal(filePath, segmentDuration, outputDir)

                val segmentsArray = JSArray()
                segments.forEach { segment ->
                    segmentsArray.put(segment)
                }

                val retriever = MediaMetadataRetriever()
                retriever.setDataSource(filePath)
                val totalDuration = (retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L) / 1000.0
                retriever.release()

                val ret = JSObject().apply {
                    put("segments", segmentsArray)
                    put("totalDuration", totalDuration)
                }

                activity.runOnUiThread {
                    call.resolve(ret)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to split video", e)
                activity.runOnUiThread {
                    call.reject("Failed to split video: ${e.message}")
                }
            }
        }.start()
    }

    private fun splitVideoInternal(inputPath: String, segmentDurationSec: Double, outputDir: String): List<JSObject> {
        val segments = mutableListOf<JSObject>()
        val extractor = MediaExtractor()
        extractor.setDataSource(inputPath)

        // Get video duration
        val retriever = MediaMetadataRetriever()
        retriever.setDataSource(inputPath)
        val totalDurationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
        retriever.release()

        val totalDurationUs = totalDurationMs * 1000L
        val segmentDurationUs = (segmentDurationSec * 1_000_000).toLong()

        // Find video and audio tracks
        var videoTrackIndex = -1
        var audioTrackIndex = -1
        var videoFormat: MediaFormat? = null
        var audioFormat: MediaFormat? = null

        for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME) ?: continue

            when {
                mime.startsWith("video/") && videoTrackIndex == -1 -> {
                    videoTrackIndex = i
                    videoFormat = format
                }
                mime.startsWith("audio/") && audioTrackIndex == -1 -> {
                    audioTrackIndex = i
                    audioFormat = format
                }
            }
        }

        if (videoTrackIndex == -1) {
            throw Exception("No video track found")
        }

        // Calculate segments
        var segmentIndex = 0
        var startTimeUs = 0L
        val inputFile = File(inputPath)
        val baseName = inputFile.nameWithoutExtension

        while (startTimeUs < totalDurationUs) {
            val endTimeUs = minOf(startTimeUs + segmentDurationUs, totalDurationUs)

            val outputFileName = "${baseName}_${String.format("%03d", segmentIndex + 1)}.mp4"
            val outputPath = File(outputDir, outputFileName).absolutePath

            Log.d(TAG, "Creating segment $segmentIndex: ${startTimeUs/1000000.0}s - ${endTimeUs/1000000.0}s")

            // Create segment using MediaMuxer
            createSegment(
                inputPath,
                outputPath,
                startTimeUs,
                endTimeUs,
                videoTrackIndex,
                audioTrackIndex,
                videoFormat!!,
                audioFormat
            )

            val segment = JSObject().apply {
                put("index", segmentIndex)
                put("path", outputPath)
                put("startTime", startTimeUs / 1_000_000.0)
                put("endTime", endTimeUs / 1_000_000.0)
                put("duration", (endTimeUs - startTimeUs) / 1_000_000.0)
            }
            segments.add(segment)

            startTimeUs = endTimeUs
            segmentIndex++
        }

        extractor.release()
        return segments
    }

    private fun createSegment(
        inputPath: String,
        outputPath: String,
        startTimeUs: Long,
        endTimeUs: Long,
        videoTrackIndex: Int,
        audioTrackIndex: Int,
        videoFormat: MediaFormat,
        audioFormat: MediaFormat?
    ) {
        val extractor = MediaExtractor()
        extractor.setDataSource(inputPath)

        val muxer = MediaMuxer(outputPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

        // Add tracks to muxer
        val muxerVideoTrack = muxer.addTrack(videoFormat)
        val muxerAudioTrack = if (audioFormat != null && audioTrackIndex != -1) {
            muxer.addTrack(audioFormat)
        } else -1

        muxer.start()

        val bufferSize = 1024 * 1024 // 1MB buffer
        val buffer = ByteBuffer.allocate(bufferSize)
        val bufferInfo = MediaCodec.BufferInfo()

        // Process video track
        extractor.selectTrack(videoTrackIndex)
        extractor.seekTo(startTimeUs, MediaExtractor.SEEK_TO_PREVIOUS_SYNC)

        while (true) {
            val sampleTime = extractor.sampleTime
            if (sampleTime < 0 || sampleTime >= endTimeUs) break

            if (sampleTime >= startTimeUs) {
                bufferInfo.offset = 0
                bufferInfo.size = extractor.readSampleData(buffer, 0)
                if (bufferInfo.size < 0) break

                bufferInfo.presentationTimeUs = sampleTime - startTimeUs
                bufferInfo.flags = if (extractor.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0) {
                    MediaCodec.BUFFER_FLAG_KEY_FRAME
                } else 0

                muxer.writeSampleData(muxerVideoTrack, buffer, bufferInfo)
            }

            if (!extractor.advance()) break
        }

        // Process audio track
        if (muxerAudioTrack != -1 && audioTrackIndex != -1) {
            extractor.unselectTrack(videoTrackIndex)
            extractor.selectTrack(audioTrackIndex)
            extractor.seekTo(startTimeUs, MediaExtractor.SEEK_TO_CLOSEST_SYNC)

            while (true) {
                val sampleTime = extractor.sampleTime
                if (sampleTime < 0 || sampleTime >= endTimeUs) break

                if (sampleTime >= startTimeUs) {
                    bufferInfo.offset = 0
                    bufferInfo.size = extractor.readSampleData(buffer, 0)
                    if (bufferInfo.size < 0) break

                    bufferInfo.presentationTimeUs = sampleTime - startTimeUs
                    bufferInfo.flags = 0

                    muxer.writeSampleData(muxerAudioTrack, buffer, bufferInfo)
                }

                if (!extractor.advance()) break
            }
        }

        muxer.stop()
        muxer.release()
        extractor.release()

        Log.d(TAG, "Segment created: $outputPath")
    }
}
