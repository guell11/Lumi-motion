import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator,
} from 'react-native';
import { usePlayer } from '../contexts/PlayerContext';
import { Track } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@lumi_history';
const FAVORITES_KEY = '@lumi_favorites';

export default function LibraryScreen() {
  const { playTracks, state } = usePlayer();
  const [history, setHistory] = useState<Track[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'favorites'>('queue');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const [histData, favData] = await Promise.all([
        AsyncStorage.getItem(HISTORY_KEY),
        AsyncStorage.getItem(FAVORITES_KEY),
      ]);
      if (histData) setHistory(JSON.parse(histData));
      if (favData) setFavorites(JSON.parse(favData));
    } catch (err) {
      console.log('Library load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    setHistory([]);
    await AsyncStorage.removeItem(HISTORY_KEY);
  };

  const renderTrack = ({ item }: { item: Track }, list: 'queue' | 'history' | 'favorites') => (
    <TouchableOpacity style={styles.trackItem} onPress={() => playTracks([item])}>
      <Image source={{ uri: item.albumArt || 'https://via.placeholder.com/50' }} style={styles.trackArt} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
        <Text style={styles.trackAlbum} numberOfLines={1}>{item.album}</Text>
      </View>
      <Text style={styles.trackDuration}>
        {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
      </Text>
    </TouchableOpacity>
  );

  const tabs: Array<{ key: 'queue' | 'history' | 'favorites'; label: string }> = [
    { key: 'queue', label: 'Fila' },
    { key: 'history', label: 'Histórico' },
    { key: 'favorites', label: 'Favoritos' },
  ];

  const currentList = activeTab === 'queue' ? state.queue
    : activeTab === 'history' ? history
    : favorites;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Biblioteca</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      ) : (
        <>
          {activeTab === 'history' && history.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearHistory}>
              <Text style={styles.clearBtnText}>Limpar histórico</Text>
            </TouchableOpacity>
          )}

          {currentList.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>
                {activeTab === 'queue' ? '🎵' : activeTab === 'history' ? '🕐' : '❤️'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'queue'
                  ? 'Sua fila está vazia'
                  : activeTab === 'history'
                  ? 'Nenhum histórico ainda'
                  : 'Nenhum favorito salvo'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'queue'
                  ? 'Toque uma música para começar'
                  : activeTab === 'history'
                  ? 'As músicas tocadas aparecerão aqui'
                  : 'Adicione músicas aos favoritos'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={currentList}
              renderItem={({ item }) => renderTrack({ item }, activeTab)}
              keyExtractor={(item, index) => `${item.id}-${index}`}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#1A1A1A' },
  headerTitle: { color: '#FFF', fontSize: 28, fontWeight: '800' },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: { backgroundColor: '#1DB954' },
  tabText: { color: '#888', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#000' },
  clearBtn: {
    alignSelf: 'flex-end',
    marginRight: 16,
    marginTop: 8,
    padding: 6,
  },
  clearBtnText: { color: '#FF4444', fontSize: 13 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  emptySub: { color: '#AAA', fontSize: 14, marginTop: 6, textAlign: 'center' },
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
  trackAlbum: { color: '#666', fontSize: 12, marginTop: 2 },
  trackDuration: { color: '#888', fontSize: 13, marginLeft: 8 },
});
