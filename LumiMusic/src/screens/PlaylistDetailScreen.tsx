import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { usePlayer } from '../contexts/PlayerContext';
import { Track, RootStackParamList } from '../types';
import { getSpotifyPlaylistTracks } from '../services/spotify';
import { RouteProp } from '@react-navigation/native';

type PlaylistDetailRouteProp = RouteProp<RootStackParamList, 'PlaylistDetail'>;

export default function PlaylistDetailScreen() {
  const route = useRoute<PlaylistDetailRouteProp>();
  const { playTracks } = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const { playlistId } = route.params;

  useEffect(() => {
    loadPlaylist();
  }, [playlistId]);

  const loadPlaylist = async () => {
    try {
      const spotifyId = playlistId.replace('spotify:playlist:', '');
      const data = await getSpotifyPlaylistTracks(spotifyId);
      setTracks(data);
    } catch (err) {
      console.log('Playlist load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderTrack = ({ item, index }: { item: Track; index: number }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => playTracks(tracks, index)}
    >
      <Text style={styles.trackIndex}>{index + 1}</Text>
      <Image source={{ uri: item.albumArt || 'https://via.placeholder.com/50' }} style={styles.trackArt} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
      <Text style={styles.trackDuration}>
        {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {tracks.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Playlist vazia ou não disponível</Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          renderItem={renderTrack}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListHeaderComponent={
            <View style={styles.playlistHeader}>
              <TouchableOpacity
                style={styles.playAllBtn}
                onPress={() => playTracks(tracks, 0)}
              >
                <Text style={styles.playAllText}>▶️ Tocar tudo</Text>
              </TouchableOpacity>
              <Text style={styles.trackCount}>{tracks.length} faixas</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#AAA', fontSize: 16 },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  playAllBtn: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  playAllText: { color: '#000', fontSize: 15, fontWeight: '700' },
  trackCount: { color: '#888', fontSize: 14 },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  trackIndex: { color: '#666', fontSize: 14, width: 30, textAlign: 'center' },
  trackArt: { width: 44, height: 44, borderRadius: 4, backgroundColor: '#333' },
  trackInfo: { flex: 1, marginLeft: 12 },
  trackTitle: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  trackArtist: { color: '#AAA', fontSize: 13, marginTop: 2 },
  trackDuration: { color: '#888', fontSize: 13, marginLeft: 8 },
});
