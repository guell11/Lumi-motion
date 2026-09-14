// src/types/index.ts
// All type definitions for LumiMusic

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number; // seconds
  source: 'spotify' | 'youtube';
  spotifyId?: string;
  youtubeId?: string;
  previewUrl?: string;
  youtubeUrl?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks: Track[];
  source: 'spotify';
}

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
}

export interface SearchResult {
  tracks: Track[];
  playlists: Playlist[];
  total: number;
}

export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  token: string | null;
  tokenExpiry: number | null;
}

export interface YouTubeConfig {
  apiKey: string;
}

export type RootStackParamList = {
  MainTabs: undefined;
  NowPlaying: undefined;
  PlaylistDetail: { playlistId: string; playlistName: string };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Library: undefined;
};
