import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Animated,
  Dimensions, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePlayer } from '../contexts/PlayerContext';

const { width } = Dimensions.get('window');

export default function NowPlayingScreen() {
  const navigation = useNavigation();
  const { state, pauseTrack, resumeTrack, skipNext, skipPrev, seekTo, setVolume } = usePlayer();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (state.isPlaying) {
      spinRef.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: true,
        })
      );
      spinRef.current.start();
    } else {
      spinRef.current?.stop();
    }
    return () => spinRef.current?.stop();
  }, [state.isPlaying]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!state.currentTrack) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Nenhuma música tocando</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const track = state.currentTrack;
  const progress = state.duration > 0 ? (state.position / state.duration) * 100 : 0;
  const positionMin = Math.floor(state.position / 60);
  const positionSec = String(Math.floor(state.position % 60)).padStart(2, '0');
  const durationMin = Math.floor(state.duration / 60);
  const durationSec = String(Math.floor(state.duration % 60)).padStart(2, '0');

  const repeatIcon = state.repeat === 'one' ? '🔂' : state.repeat === 'all' ? '🔁' : '➡️';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.downArrow}>▼</Text>
        </TouchableOpacity>
        <Text style={styles.headerLabel}>Tocando Agora</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Album Art */}
      <View style={styles.artContainer}>
        <Animated.Image
          source={{ uri: track.albumArt || 'https://via.placeholder.com/300' }}
          style={[styles.albumArt, state.isPlaying && { transform: [{ rotate: spin }] }]}
        />
        {!state.isPlaying && (
          <Image
            source={{ uri: track.albumArt || 'https://via.placeholder.com/300' }}
            style={[styles.albumArt, styles.albumArtStatic]}
          />
        )}
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={2}>{track.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
        <Text style={styles.trackAlbum} numberOfLines={1}>{track.album}</Text>
        <Text style={styles.trackSource}>
          {track.source === 'spotify' ? 'Spotify' : 'YouTube'}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.progressTime}>
          <Text style={styles.timeText}>{positionMin}:{positionSec}</Text>
          <Text style={styles.timeText}>{durationMin}:{durationSec}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn}>
          <Text style={styles.controlIconSec}>🔀</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={skipPrev}>
          <Text style={styles.controlIconMain}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={state.isPlaying ? pauseTrack : resumeTrack}
        >
          <Text style={styles.playIcon}>
            {state.isPlaying ? '⏸' : '▶️'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={skipNext}>
          <Text style={styles.controlIconMain}>⏭</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn}>
          <Text style={styles.controlIconSec}>{repeatIcon}</Text>
        </TouchableOpacity>
      </View>

      {/* Queue preview */}
      {state.queue.length > 0 && (
        <View style={styles.queuePreview}>
          <Text style={styles.queueTitle}>Próximas músicas</Text>
          {state.queue.slice(0, 3).map((t, i) => (
            <View key={t.id} style={styles.queueItem}>
              <Image source={{ uri: t.albumArt || 'https://via.placeholder.com/30' }} style={styles.queueArt} />
              <View style={styles.queueInfo}>
                <Text style={styles.queueTrack} numberOfLines={1}>{t.title}</Text>
                <Text style={styles.queueArtist} numberOfLines={1}>{t.artist}</Text>
              </View>
              <Text style={styles.queueIndex}>{i + 1}</Text>
            </View>
          ))}
          {state.queue.length > 3 && (
            <Text style={styles.queueMore}>+{state.queue.length - 3} mais na fila</Text>
          )}
        </View>
      )}

      {/* Non-stop indicator */}
      <View style={styles.nonStopBar}>
        <Text style={styles.nonStopText}>🎵 Música sem parar ativada</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#FFF', fontSize: 18, marginBottom: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  downArrow: { color: '#FFF', fontSize: 24 },
  headerLabel: { color: '#AAA', fontSize: 14, fontWeight: '600' },
  backBtn: { padding: 12, backgroundColor: '#1DB954', borderRadius: 8 },
  backBtnText: { color: '#000', fontWeight: '700' },
  artContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    height: width * 0.75,
  },
  albumArt: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 16,
    position: 'absolute',
  },
  albumArtStatic: {
    opacity: 0.6,
  },
  trackInfo: {
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: 20,
  },
  trackTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  trackArtist: { color: '#AAA', fontSize: 16, marginTop: 6 },
  trackAlbum: { color: '#666', fontSize: 13, marginTop: 4 },
  trackSource: { color: '#1DB954', fontSize: 12, marginTop: 4, fontWeight: '600' },
  progressContainer: { paddingHorizontal: 30, marginTop: 20 },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1DB954',
    borderRadius: 2,
  },
  progressTime: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: { color: '#888', fontSize: 12 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 20,
  },
  controlBtn: { padding: 8 },
  controlIconSec: { fontSize: 20 },
  controlIconMain: { fontSize: 28 },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 28 },
  queuePreview: {
    marginTop: 20,
    paddingHorizontal: 20,
    flex: 1,
  },
  queueTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  queueArt: { width: 36, height: 36, borderRadius: 4, backgroundColor: '#333' },
  queueInfo: { flex: 1, marginLeft: 10 },
  queueTrack: { color: '#FFF', fontSize: 13 },
  queueArtist: { color: '#888', fontSize: 11, marginTop: 2 },
  queueIndex: { color: '#666', fontSize: 14, marginLeft: 8 },
  queueMore: { color: '#1DB954', fontSize: 12, marginTop: 8, textAlign: 'center' },
  nonStopBar: {
    backgroundColor: '#1DB95422',
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  nonStopText: { color: '#1DB954', fontSize: 12, fontWeight: '600' },
});
