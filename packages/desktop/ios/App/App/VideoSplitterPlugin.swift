import Foundation
import Capacitor
import AVFoundation
import UIKit
import UniformTypeIdentifiers
import Photos

@objc(VideoSplitterPlugin)
public class VideoSplitterPlugin: CAPPlugin, UIDocumentPickerDelegate, CAPBridgedPlugin {
    public let identifier = "VideoSplitterPlugin"
    public let jsName = "VideoSplitter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pickVideo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getMetadata", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "splitVideo", returnType: CAPPluginReturnPromise)
    ]

    private var pickVideoCall: CAPPluginCall?

    @objc func pickVideo(_ call: CAPPluginCall) {
        self.pickVideoCall = call

        DispatchQueue.main.async {
            let documentPicker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.movie, UTType.video])
            documentPicker.delegate = self
            documentPicker.allowsMultipleSelection = false

            self.bridge?.viewController?.present(documentPicker, animated: true)
        }
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let url = urls.first, let call = pickVideoCall else {
            pickVideoCall?.reject("No video selected")
            pickVideoCall = nil
            return
        }

        // Copy to temp directory for processing
        let tempDir = FileManager.default.temporaryDirectory
        let fileName = url.lastPathComponent
        let destURL = tempDir.appendingPathComponent(fileName)

        do {
            // Start accessing security-scoped resource
            guard url.startAccessingSecurityScopedResource() else {
                call.reject("Cannot access file")
                pickVideoCall = nil
                return
            }
            defer { url.stopAccessingSecurityScopedResource() }

            // Remove existing file if present
            if FileManager.default.fileExists(atPath: destURL.path) {
                try FileManager.default.removeItem(at: destURL)
            }

            try FileManager.default.copyItem(at: url, to: destURL)

            call.resolve([
                "filePath": destURL.path,
                "fileName": fileName
            ])
        } catch {
            call.reject("Failed to copy video: \(error.localizedDescription)")
        }

        pickVideoCall = nil
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pickVideoCall?.reject("Video selection cancelled")
        pickVideoCall = nil
    }

    @objc func getMetadata(_ call: CAPPluginCall) {
        guard let filePath = call.getString("filePath") else {
            call.reject("filePath is required")
            return
        }

        let url = URL(fileURLWithPath: filePath)
        let asset = AVAsset(url: url)

        Task {
            do {
                let duration = try await asset.load(.duration)
                let tracks = try await asset.loadTracks(withMediaType: .video)

                var width = 0
                var height = 0
                var rotation = 0

                if let videoTrack = tracks.first {
                    let size = try await videoTrack.load(.naturalSize)
                    let transform = try await videoTrack.load(.preferredTransform)

                    // Calculate rotation from transform
                    let angle = atan2(transform.b, transform.a)
                    rotation = Int(angle * 180 / .pi)

                    // Handle rotated videos
                    if abs(rotation) == 90 || abs(rotation) == 270 {
                        width = Int(size.height)
                        height = Int(size.width)
                    } else {
                        width = Int(size.width)
                        height = Int(size.height)
                    }
                }

                call.resolve([
                    "duration": CMTimeGetSeconds(duration),
                    "width": width,
                    "height": height,
                    "rotation": rotation
                ])
            } catch {
                call.reject("Failed to get metadata: \(error.localizedDescription)")
            }
        }
    }

    @objc func splitVideo(_ call: CAPPluginCall) {
        guard let filePath = call.getString("filePath") else {
            call.reject("filePath is required")
            return
        }

        let segmentDuration = call.getDouble("segmentDuration") ?? 30.0
        let outputDir = call.getString("outputDir") ?? FileManager.default.temporaryDirectory.path

        Task {
            do {
                let segments = try await splitVideoInternal(
                    inputPath: filePath,
                    segmentDuration: segmentDuration,
                    outputDir: outputDir
                )

                let url = URL(fileURLWithPath: filePath)
                let asset = AVAsset(url: url)
                let duration = try await asset.load(.duration)

                call.resolve([
                    "segments": segments,
                    "totalDuration": CMTimeGetSeconds(duration)
                ])
            } catch {
                call.reject("Failed to split video: \(error.localizedDescription)")
            }
        }
    }

    private func splitVideoInternal(inputPath: String, segmentDuration: Double, outputDir: String) async throws -> [[String: Any]] {
        let inputURL = URL(fileURLWithPath: inputPath)
        let asset = AVAsset(url: inputURL)
        let duration = try await asset.load(.duration)
        let totalDuration = CMTimeGetSeconds(duration)

        var segments: [[String: Any]] = []
        var segmentIndex = 0
        var startTime: Double = 0

        let baseName = inputURL.deletingPathExtension().lastPathComponent

        while startTime < totalDuration {
            let endTime = min(startTime + segmentDuration, totalDuration)
            let outputFileName = "\(baseName)_\(String(format: "%03d", segmentIndex + 1)).mp4"
            let outputURL = URL(fileURLWithPath: outputDir).appendingPathComponent(outputFileName)

            // Remove existing file if present
            if FileManager.default.fileExists(atPath: outputURL.path) {
                try FileManager.default.removeItem(at: outputURL)
            }

            print("Creating segment \(segmentIndex): \(startTime)s - \(endTime)s")

            try await exportSegment(
                asset: asset,
                startTime: startTime,
                endTime: endTime,
                outputURL: outputURL
            )

            let segment: [String: Any] = [
                "index": segmentIndex,
                "path": outputURL.path,
                "startTime": startTime,
                "endTime": endTime,
                "duration": endTime - startTime
            ]
            segments.append(segment)

            startTime = endTime
            segmentIndex += 1
        }

        return segments
    }

    private func exportSegment(asset: AVAsset, startTime: Double, endTime: Double, outputURL: URL) async throws {
        let startCMTime = CMTime(seconds: startTime, preferredTimescale: 600)
        let endCMTime = CMTime(seconds: endTime, preferredTimescale: 600)
        let timeRange = CMTimeRange(start: startCMTime, end: endCMTime)

        // Use AVAssetExportSession for hardware-accelerated export
        guard let exportSession = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetHighestQuality) else {
            throw NSError(domain: "VideoSplitter", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to create export session"])
        }

        exportSession.outputURL = outputURL
        exportSession.outputFileType = .mp4
        exportSession.timeRange = timeRange
        exportSession.shouldOptimizeForNetworkUse = true

        await exportSession.export()

        switch exportSession.status {
        case .completed:
            print("Segment exported: \(outputURL.path)")
        case .failed:
            throw exportSession.error ?? NSError(domain: "VideoSplitter", code: 2, userInfo: [NSLocalizedDescriptionKey: "Export failed"])
        case .cancelled:
            throw NSError(domain: "VideoSplitter", code: 3, userInfo: [NSLocalizedDescriptionKey: "Export cancelled"])
        default:
            throw NSError(domain: "VideoSplitter", code: 4, userInfo: [NSLocalizedDescriptionKey: "Unknown export status"])
        }
    }
}
