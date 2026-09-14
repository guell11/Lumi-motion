import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { usePlayer } from '../contexts/PlayerContext';
import { RootStackParamList } from '../types';

export default function MiniPlayer() {
  const { state, pauseTrack, resumeTrack, skipNext } = usePlayer();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!state.currentTrack) return null;

  const progress = state.duration > 0 ? (state.position / state.duration) * 100 : 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('NowPlaying')}
      activeOpacity={0.9}
    >
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.content}>
        <Image
          source={{ uri: state.currentTrack.albumArt || 'https://via.placeholder.com/48' }}
          style={styles.albumArt}
        />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {state.currentTrack.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {state.currentTrack.artist}
          </Text>
        </View>
        <View style={styles.controls}>
          {state.isPlaying ? (
            <TouchableOpacity onPress={pauseTrack} style={styles.controlBtn}>
              <Text style={styles.controlIcon}>⏸</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={resumeTrack} style={styles.controlBtn}>
              <Text style={styles.controlIcon}>▶️</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={skipNext} style={styles.controlBtn}>
            <Text style={styles.controlIcon}>⏭</Text>
          </TouchableOpacity>
        </View>
      </View>
      {state.isBuffering && (
        <View style={styles.buffering}>
          <Text style={styles.bufferingText}>Carregando...</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  progressBar: {
    height: 2,
    backgroundColor: '#444',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1DB954',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingBottom: 12,
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlBtn: {
    padding: 8,
  },
  controlIcon: {
    fontSize: 20,
  },
  buffering: {
    position: 'absolute',
    top: 2,
    right: 8,
  },
  bufferingText: {
    color: '#1DB954',
    fontSize: 10,
  },
});
