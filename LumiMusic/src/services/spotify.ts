// src/services/spotify.ts
// Spotify API service - search, recommendations, auth
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track, Playlist } from '../types';

const SPOTIFY_CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID';
const SPOTIFY_CLIENT_SECRET = 'YOUR_SPOTIFY_CLIENT_SECRET';
const SPOTIFY_TOKEN_KEY = '@spotify_token';
const SPOTIFY_TOKEN_EXPIRY_KEY = '@spotify_token_expiry';
const BASE_URL = 'https://api.spotify.com/v1';

let cachedToken: string | null = null;
let cachedTokenExpiry: number | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedTokenExpiry && now < cachedTokenExpiry - 60000) {
    return cachedToken;
  }

  const stored = await AsyncStorage.getItem(SPOTIFY_TOKEN_KEY);
  const storedExpiry = await AsyncStorage.getItem(SPOTIFY_TOKEN_EXPIRY_KEY);
  if (stored && storedExpiry && now < parseInt(storedExpiry) - 60000) {
    cachedToken = stored;
    cachedTokenExpiry = parseInt(storedExpiry);
    return stored;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET) as string,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  if (data.access_token) {
    cachedToken = data.access_token as string;
    cachedTokenExpiry = now + (data.expires_in || 3600) * 1000;
    await AsyncStorage.setItem(SPOTIFY_TOKEN_KEY, cachedToken);
    await AsyncStorage.setItem(SPOTIFY_TOKEN_EXPIRY_KEY, cachedTokenExpiry.toString());
    return cachedToken;
  }
  throw new Error('Failed to get Spotify token');
}

function spotifyTrackToTrack(item: any): Track {
  return {
    id: 'spotify:' + item.id,
    title: item.name,
    artist: item.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
    album: item.album?.name || 'Unknown',
    albumArt: item.album?.images?.[0]?.url || '',
    duration: Math.round((item.duration_ms || 0) / 1000),
    source: 'spotify',
    spotifyId: item.id,
    previewUrl: item.preview_url,
  };
}

export async function searchSpotifyTrack(query: string): Promise<Track[]> {
  const token = await getAccessToken();
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: '20',
    market: 'BR',
  });

  const response = await fetch(BASE_URL + '/search?' + params.toString(), {
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await response.json();
  return (data.tracks?.items || []).map(spotifyTrackToTrack);
}

export async function searchSpotifyPlaylists(query: string): Promise<Playlist[]> {
  const token = await getAccessToken();
  const params = new URLSearchParams({
    q: query,
    type: 'playlist',
    limit: '10',
    market: 'BR',
  });

  const response = await fetch(BASE_URL + '/search?' + params.toString(), {
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await response.json();
  return (data.playlists?.items || []).map((p: any) => ({
    id: 'spotify:playlist:' + p.id,
    name: p.name,
    description: p.description || '',
    images: p.images || [],
    tracks: [],
    source: 'spotify' as const,
  }));
}

export async function getSpotifyRecommendations(
  seedTracks: string[],
  seedArtists: string[],
  limit: number = 20
): Promise<Track[]> {
  const token = await getAccessToken();
  const params = new URLSearchParams({
    limit: limit.toString(),
    market: 'BR',
  });

  if (seedTracks.length > 0) params.append('seed_tracks', seedTracks.slice(0, 5).join(','));
  if (seedArtists.length > 0) params.append('seed_artists', seedArtists.slice(0, 5).join(','));

  if (seedTracks.length === 0 && seedArtists.length === 0) {
    params.append('seed_genres', 'pop,rock,electronic,brazilian');
  }

  const response = await fetch(BASE_URL + '/recommendations?' + params.toString(), {
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await response.json();
  return (data.tracks || []).map(spotifyTrackToTrack);
}

export async function getSpotifyTrack(id: string): Promise<Track | null> {
  const token = await getAccessToken();
  const response = await fetch(BASE_URL + '/tracks/' + id, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!response.ok) return null;
  return spotifyTrackToTrack(await response.json());
}

export async function getSpotifyPlaylistTracks(playlistId: string): Promise<Track[]> {
  const token = await getAccessToken();
  const response = await fetch(BASE_URL + '/playlists/' + playlistId + '/tracks?limit=50', {
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await response.json();
  return (data.items || []).map((item: any) => spotifyTrackToTrack(item.track));
}

export async function getSpotifyNewReleases(): Promise<Track[]> {
  const token = await getAccessToken();
  const response = await fetch(BASE_URL + '/browse/new-releases?limit=20', {
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await response.json();
  const tracks: Track[] = [];
  for (const album of data.albums?.items || []) {
    const albumTracks = await fetch(BASE_URL + '/albums/' + album.id + '/tracks?limit=20', {
      headers: { Authorization: 'Bearer ' + token },
    });
    const trackData = await albumTracks.json();
    for (const track of trackData.items || []) {
      tracks.push({
        ...spotifyTrackToTrack(track),
        album: album.name,
        albumArt: album.images?.[0]?.url || '',
      });
    }
  }
  return tracks.slice(0, 30);
}

export async function getSpotifyCategories(): Promise<Array<{ id: string; name: string; icon: string }>> {
  const token = await getAccessToken();
  const response = await fetch(BASE_URL + '/browse/categories?limit=20', {
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await response.json();
  return (data.categories?.items || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    icon: c.icons?.[0]?.url || '',
  }));
}

export async function getSpotifyCategoryPlaylists(categoryId: string): Promise<Track[]> {
  const token = await getAccessToken();
  const response = await fetch(BASE_URL + '/browse/categories/' + categoryId + '/playlists?limit=5', {
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await response.json();
  const tracks: Track[] = [];
  for (const pl of data.playlists?.items || []) {
    const plTracks = await getSpotifyPlaylistTracks(pl.id);
    tracks.push(...plTracks);
  }
  return tracks.slice(0, 30);
}
