import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import RNFS from 'react-native-fs';
import { calculateSegmentBoundaries, formatDuration } from './src/lib/video-utils';

interface VideoMetadata {
  uri: string;
  name: string;
  duration: number;
  width: number;
  height: number;
}

const DURATIONS = [15, 30, 60, 90];

function App(): React.JSX.Element {
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [progress, setProgress] = useState(0);
  const [isSplitting, setIsSplitting] = useState(false);

  const selectVideo = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.video],
      });
      
      const metadata = await getVideoMetadata(result.uri);
      
      setVideo({
        uri: result.uri,
        name: result.name || 'video.mp4',
        ...metadata,
      });
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Failed to select video');
      }
    }
  };

  const getVideoMetadata = async (uri: string): Promise<{duration: number, width: number, height: number}> => {
    const session = await FFmpegKit.execute(`-i "${uri}"`);
    const output = await session.getOutput();
    
    const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    const videoMatch = output.match(/Video:.* (\d+)x(\d+)/);
    
    const hours = parseInt(durationMatch?.[1] || '0');
    const minutes = parseInt(durationMatch?.[2] || '0');
    const seconds = parseFloat(durationMatch?.[3] || '0');
    const duration = hours * 3600 + minutes * 60 + seconds;
    
    const width = parseInt(videoMatch?.[1] || '0');
    const height = parseInt(videoMatch?.[2] || '0');
    
    return { duration, width, height };
  };

  const splitVideo = async () => {
    if (!video) return;
    
    setIsSplitting(true);
    setProgress(0);

    try {
      const segments = calculateSegmentBoundaries(
        video.duration,
        selectedDuration,
        video.name,
        'sequential'
      );

      const outputDir = `${RNFS.DocumentDirectoryPath}/clipchop-output`;
      
      if (await RNFS.exists(outputDir)) {
        await RNFS.unlink(outputDir);
      }
      await RNFS.mkdir(outputDir);

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const outputPath = `${outputDir}/${seg.filename}`;

        const command = `-i "${video.uri}" -ss ${seg.startTime} -t ${seg.duration} -c:v h264_mediacodec -b:v 2M -c:a aac -metadata:s:v rotate=0 -y "${outputPath}"`;

        const session = await FFmpegKit.execute(command);
        const returnCode = await session.getReturnCode();

        if (!ReturnCode.isSuccess(returnCode)) {
          const session2 = await FFmpegKit.execute(`-i "${video.uri}" -ss ${seg.startTime} -t ${seg.duration} -c:v libx264 -preset ultrafast -c:a aac -metadata:s:v rotate=0 -y "${outputPath}"`);
          const rc2 = await session2.getReturnCode();
          if (!ReturnCode.isSuccess(rc2)) {
            throw new Error(`Segment ${i + 1} failed`);
          }
        }

        setProgress(((i + 1) / segments.length) * 100);
      }

      Alert.alert(
        'Success!',
        `Created ${segments.length} clips\nSaved to device storage`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', String(error));
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a12" />
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Clipchop</Text>
          <Text style={styles.subtitle}>Split videos for social media</Text>
        </View>

        {!video ? (
          <TouchableOpacity style={styles.uploadCard} onPress={selectVideo}>
            <Text style={styles.uploadIcon}>🎥</Text>
            <Text style={styles.uploadText}>Select Video</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <View style={styles.card}>
              <Text style={styles.videoName}>{video.name}</Text>
              <Text style={styles.videoInfo}>
                {formatDuration(video.duration)} • {video.width}x{video.height}
              </Text>
              <TouchableOpacity onPress={() => setVideo(null)}>
                <Text style={styles.removeButton}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Clip Duration</Text>
              <View style={styles.durationButtons}>
                {DURATIONS.map((dur) => (
                  <TouchableOpacity
                    key={dur}
                    style={[
                      styles.durationButton,
                      selectedDuration === dur && styles.durationButtonActive,
                    ]}
                    onPress={() => setSelectedDuration(dur)}
                    disabled={isSplitting}>
                    <Text
                      style={[
                        styles.durationText,
                        selectedDuration === dur && styles.durationTextActive,
                      ]}>
                      {dur < 60 ? `${dur}s` : `${dur / 60}m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {isSplitting ? (
              <View style={styles.card}>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressLabel}>Encoding...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.splitButton} onPress={splitVideo}>
                <Text style={styles.splitButtonText}>Split Video</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a12',
  },
  scrollView: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#a855f7',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#71717a',
  },
  uploadCard: {
    backgroundColor: 'rgba(20, 20, 35, 0.8)',
    borderRadius: 24,
    padding: 60,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  uploadIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 20,
    color: '#f0f0f5',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(20, 20, 35, 0.8)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  videoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f0f0f5',
    marginBottom: 4,
  },
  videoInfo: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 8,
  },
  removeButton: {
    fontSize: 14,
    color: '#a855f7',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  durationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationButton: {
    backgroundColor: 'rgba(35, 35, 55, 1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  durationButtonActive: {
    backgroundColor: '#a855f7',
    borderColor: '#a855f7',
  },
  durationText: {
    color: '#f0f0f5',
    fontWeight: '600',
    fontSize: 14,
  },
  durationTextActive: {
    color: '#ffffff',
  },
  splitButton: {
    backgroundColor: '#a855f7',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  splitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#a855f7',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 16,
    backgroundColor: 'rgba(10, 10, 18, 0.9)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#a855f7',
    borderRadius: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default App;

