// src/services/youtube.ts
// YouTube Data API v3 service - search for music videos
import { Track } from '../types';

const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

function youtubeItemToTrack(item: any): Track {
  return {
    id: 'youtube:' + (item.id?.videoId || item.id),
    title: item.snippet?.title || 'Unknown',
    artist: item.snippet?.channelTitle || 'Unknown',
    album: 'YouTube',
    albumArt: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
    duration: 0,
    source: 'youtube',
    youtubeId: item.id?.videoId || item.id,
    youtubeUrl: 'https://www.youtube.com/watch?v=' + (item.id?.videoId || item.id),
  };
}

export async function searchYouTubeMusic(query: string): Promise<Track[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query + ' official music',
    type: 'video',
    videoCategoryId: '10',
    maxResults: '20',
    videoEmbeddable: 'true',
    key: YOUTUBE_API_KEY,
  });

  const response = await fetch(BASE_URL + '/search?' + params.toString());
  const data = await response.json();
  return (data.items || []).map(youtubeItemToTrack);
}

export async function getYouTubeRecommendations(
  searchQuery: string,
  limit: number = 20
): Promise<Track[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    q: searchQuery + ' music mix',
    type: 'video',
    videoCategoryId: '10',
    maxResults: limit.toString(),
    videoEmbeddable: 'true',
    key: YOUTUBE_API_KEY,
  });

  const response = await fetch(BASE_URL + '/search?' + params.toString());
  const data = await response.json();
  return (data.items || []).map(youtubeItemToTrack);
}

export async function getYouTubeVideoDetails(videoId: string): Promise<{ duration: number } | null> {
  const params = new URLSearchParams({
    part: 'contentDetails',
    id: videoId,
    key: YOUTUBE_API_KEY,
  });

  const response = await fetch(BASE_URL + '/videos?' + params.toString());
  const data = await response.json();
  if (data.items?.[0]) {
    const duration = data.items[0].contentDetails?.duration || 'PT0S';
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match?.[1] || '0');
    const minutes = parseInt(match?.[2] || '0');
    const seconds = parseInt(match?.[3] || '0');
    return { duration: hours * 3600 + minutes * 60 + seconds };
  }
  return null;
}

export async function getTrendingMusic(): Promise<Track[]> {
  const queries = [
    'top hits 2024 official music video',
    'popular songs official music',
    'chart hits music',
  ];
  const randomQuery = queries[Math.floor(Math.random() * queries.length)];

  const params = new URLSearchParams({
    part: 'snippet',
    q: randomQuery,
    type: 'video',
    videoCategoryId: '10',
    maxResults: '20',
    videoEmbeddable: 'true',
    key: YOUTUBE_API_KEY,
    order: 'viewCount',
  });

  const response = await fetch(BASE_URL + '/search?' + params.toString());
  const data = await response.json();
  return (data.items || []).map(youtubeItemToTrack);
}
