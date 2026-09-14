import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { usePlayer } from '../contexts/PlayerContext';
import { Track } from '../types';
import { getSpotifyNewReleases, getSpotifyCategories, getSpotifyCategoryPlaylists } from '../services/spotify';
import { getTrendingMusic } from '../services/youtube';

export default function HomeScreen() {
  const { playTracks, state } = usePlayer();
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; icon: string }>>([]);
  const [categoryTracks, setCategoryTracks] = useState<Record<string, Track[]>>({});
  const [trending, setTrending] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [releases, cats, trendingData] = await Promise.all([
        getSpotifyNewReleases().catch(() => []),
        getSpotifyCategories().catch(() => []),
        getTrendingMusic().catch(() => []),
      ]);
      setNewReleases(releases);
      setCategories(cats);
      setTrending(trendingData);
    } catch (err) {
      console.log('Home load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategory = async (categoryId: string) => {
    if (categoryTracks[categoryId]) {
      setSelectedCategory(categoryId);
      return;
    }
    try {
      const tracks = await getSpotifyCategoryPlaylists(categoryId);
      setCategoryTracks(prev => ({ ...prev, [categoryId]: tracks }));
      setSelectedCategory(categoryId);
    } catch (err) {
      console.log('Category load error:', err);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => playTracks([item])}
    >
      <Image source={{ uri: item.albumArt || 'https://via.placeholder.com/60' }} style={styles.trackArt} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
      <Text style={styles.sourceBadge}>{item.source === 'spotify' ? '🎧' : '📺'}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Carregando músicas...</Text>
      </View>
    );
  }

  const displayTracks = selectedCategory && categoryTracks[selectedCategory]
    ? categoryTracks[selectedCategory]
    : newReleases.length > 0 ? newReleases : trending;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LumiMusic</Text>
        <Text style={styles.headerSubtitle}>Música sem parar</Text>
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1DB954" />}
      >
        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Explorar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryCard, selectedCategory === cat.id && styles.categoryCardActive]}
                  onPress={() => loadCategory(cat.id)}
                >
                  <Image source={{ uri: cat.icon }} style={styles.categoryIcon} />
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Track list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedCategory ? 'Nesta Categoria' : 'Lançamentos'}
          </Text>
          {displayTracks.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma faixa encontrada</Text>
          ) : (
            <FlatList
              data={displayTracks.slice(0, 20)}
              renderItem={renderTrackItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Now playing indicator */}
      {state.currentTrack && (
        <TouchableOpacity style={styles.nowPlayingBar}>
          <Text style={styles.nowPlayingText}>
            Tocando: {state.currentTrack.title}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  loadingText: { color: '#AAA', marginTop: 12, fontSize: 14 },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#1A1A1A' },
  headerTitle: { color: '#1DB954', fontSize: 28, fontWeight: '800' },
  headerSubtitle: { color: '#AAA', fontSize: 14, marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  emptyText: { color: '#AAA', fontSize: 14, textAlign: 'center', marginTop: 20 },
  categoryCard: {
    marginRight: 12,
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    minWidth: 80,
  },
  categoryCardActive: { backgroundColor: '#1DB95433', borderColor: '#1DB954', borderWidth: 1 },
  categoryIcon: { width: 60, height: 60, borderRadius: 30 },
  categoryName: { color: '#FFF', fontSize: 11, marginTop: 6, textAlign: 'center' },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  trackArt: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#333' },
  trackInfo: { flex: 1, marginLeft: 12 },
  trackTitle: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  trackArtist: { color: '#AAA', fontSize: 13, marginTop: 2 },
  sourceBadge: { fontSize: 16, marginLeft: 8 },
  nowPlayingBar: {
    backgroundColor: '#1DB954',
    padding: 10,
    marginBottom: 60,
  },
  nowPlayingText: { color: '#000', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
