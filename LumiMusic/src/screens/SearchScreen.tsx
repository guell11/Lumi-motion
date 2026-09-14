import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Keyboard,
} from 'react-native';
import { usePlayer } from '../contexts/PlayerContext';
import { Track, Playlist } from '../types';
import { searchSpotifyTrack, searchSpotifyPlaylists } from '../services/spotify';
import { searchYouTubeMusic } from '../services/youtube';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

export default function SearchScreen() {
  const { playTracks } = usePlayer();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setHasSearched(true);

    try {
      const [spotifyTracks, spotifyPlaylists, youtubeTracks] = await Promise.all([
        searchSpotifyTrack(query).catch(() => []),
        searchSpotifyPlaylists(query).catch(() => []),
        searchYouTubeMusic(query).catch(() => []),
      ]);

      // Merge and deduplicate
      const seen = new Set<string>();
      const all: Track[] = [...spotifyTracks, ...youtubeTracks].filter(t => {
        const key = `${t.title}:${t.artist}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setTracks(all);
      setPlaylists(spotifyPlaylists);
    } catch (err) {
      console.log('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const renderTrack = ({ item }: { item: Track }) => (
    <TouchableOpacity style={styles.trackItem} onPress={() => playTracks([item])}>
      <Image source={{ uri: item.albumArt || 'https://via.placeholder.com/50' }} style={styles.trackArt} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
        <Text style={styles.trackSource}>{item.source === 'spotify' ? 'Spotify' : 'YouTube'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={styles.playlistItem}
      onPress={() => navigation.navigate('PlaylistDetail', {
        playlistId: item.id,
        playlistName: item.name,
      })}
    >
      <Image source={{ uri: item.images[0]?.url || 'https://via.placeholder.com/60' }} style={styles.playlistArt} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.trackArtist} numberOfLines={2}>{item.description || 'Playlist do Spotify'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Buscar</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar músicas, artistas..."
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={search}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      ) : hasSearched && tracks.length === 0 && playlists.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.noResults}>Nenhum resultado encontrado</Text>
          <Text style={styles.noResultsSub}>Tente outro termo de busca</Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          renderItem={renderTrack}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            playlists.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Playlists</Text>
                {playlists.map(pl => (
                  <View key={pl.id}>{renderPlaylist({ item: pl })}</View>
                ))}
                {tracks.length > 0 && <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Músicas</Text>}
              </View>
            ) : null
          }
        />
      )}

      {!hasSearched && (
        <View style={styles.centered}>
          <Text style={styles.hint}>Busque por músicas, artistas ou playlists</Text>
          <Text style={styles.hintSub}>Spotify + YouTube</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#1A1A1A' },
  headerTitle: { color: '#FFF', fontSize: 28, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    padding: 14,
    fontSize: 16,
  },
  searchBtn: {
    padding: 12,
  },
  searchBtnText: { fontSize: 20 },
  section: { paddingHorizontal: 16 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  trackArt: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#333' },
  trackInfo: { flex: 1, marginLeft: 12 },
  trackTitle: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  trackArtist: { color: '#AAA', fontSize: 13, marginTop: 2 },
  trackSource: { color: '#1DB954', fontSize: 11, marginTop: 2 },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  playlistArt: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#333' },
  noResults: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  noResultsSub: { color: '#AAA', fontSize: 14, marginTop: 8 },
  hint: { color: '#FFF', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  hintSub: { color: '#1DB954', fontSize: 14, marginTop: 8, textAlign: 'center' },
});
