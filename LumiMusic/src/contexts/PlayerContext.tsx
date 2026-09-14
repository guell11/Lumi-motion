// src/contexts/PlayerContext.tsx
// Global music player state - non-stop playback with smart queue
import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from "react";
import { Audio } from "expo-av";
import { Track, PlayerState } from "../types";
import { getSpotifyRecommendations } from "../services/spotify";
import { getYouTubeRecommendations, searchYouTubeMusic } from "../services/youtube";

type PlayerAction =
  | { type: "SET_TRACK"; track: Track }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "TOGGLE_PLAY" }
  | { type: "SET_POSITION"; position: number }
  | { type: "SET_DURATION"; duration: number }
  | { type: "SET_BUFFERING"; buffering: boolean }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "ADD_TO_QUEUE"; tracks: Track[] }
  | { type: "ADD_TO_QUEUE_NEXT"; tracks: Track[] }
  | { type: "REMOVE_FROM_QUEUE"; id: string }
  | { type: "CLEAR_QUEUE" }
  | { type: "NEXT_TRACK" }
  | { type: "PREV_TRACK" }
  | { type: "SET_QUEUE"; tracks: Track[] }
  | { type: "TOGGLE_SHUFFLE" }
  | { type: "SET_REPEAT"; repeat: "off" | "one" | "all" };

const initialState: PlayerState = {
  currentTrack: null,
  queue: [],
  isPlaying: false,
  isBuffering: false,
  position: 0,
  duration: 0,
  volume: 1.0,
  shuffle: false,
  repeat: "off",
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "SET_TRACK":
      return {
        ...state,
        currentTrack: action.track,
        position: 0,
        duration: action.track.duration,
        isPlaying: true,
        isBuffering: false,
      };
    case "PLAY":
      return { ...state, isPlaying: true };
    case "PAUSE":
      return { ...state, isPlaying: false };
    case "TOGGLE_PLAY":
      return { ...state, isPlaying: !state.isPlaying };
    case "SET_POSITION":
      return { ...state, position: action.position };
    case "SET_DURATION":
      return { ...state, duration: action.duration };
    case "SET_BUFFERING":
      return { ...state, isBuffering: action.buffering };
    case "SET_VOLUME":
      return { ...state, volume: action.volume };
    case "ADD_TO_QUEUE":
      return { ...state, queue: [...state.queue, ...action.tracks] };
    case "ADD_TO_QUEUE_NEXT":
      return { ...state, queue: [...action.tracks, ...state.queue] };
    case "REMOVE_FROM_QUEUE":
      return { ...state, queue: state.queue.filter(t => t.id !== action.id) };
    case "CLEAR_QUEUE":
      return { ...state, queue: [] };
    case "NEXT_TRACK": {
      if (state.queue.length === 0) {
        if (state.repeat === "one" && state.currentTrack) {
          return { ...state, position: 0 };
        }
        return { ...state, isPlaying: false };
      }
      const next = state.queue[0];
      return {
        ...state,
        currentTrack: next,
        queue: state.queue.slice(1),
        position: 0,
        duration: next.duration,
        isPlaying: true,
        isBuffering: false,
      };
    }
    case "PREV_TRACK":
      return { ...state, position: 0 };
    case "SET_QUEUE":
      return { ...state, queue: state.shuffle ? shuffleArray(action.tracks) : action.tracks };
    case "TOGGLE_SHUFFLE": {
      const newShuffle = !state.shuffle;
      return {
        ...state,
        shuffle: newShuffle,
        queue: newShuffle ? shuffleArray(state.queue) : state.queue,
      };
    }
    case "SET_REPEAT":
      return { ...state, repeat: action.repeat };
    default:
      return state;
  }
}

interface PlayerContextType {
  state: PlayerState;
  dispatch: React.Dispatch<PlayerAction>;
  playTrack: (track: Track) => Promise<void>;
  playTracks: (tracks: Track[], startIndex?: number) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  skipNext: () => void;
  skipPrev: () => void;
  setVolume: (volume: number) => Promise<void>;
  fetchRecommendations: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isSeekingRef = useRef(false);
  const recommendationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTrackIdRef = useRef<string | null>(null);

  const ensureQueueMinimum = useCallback(async () => {
    if (state.queue.length >= 4) return;

    const currentTrack = state.currentTrack;
    if (!currentTrack) return;

    try {
      let newTracks: Track[] = [];
      const artistName = currentTrack.artist.split(",")[0].trim();

      try {
        const spotifyRecs = await getSpotifyRecommendations(
          currentTrack.spotifyId ? [currentTrack.spotifyId] : [],
          [artistName],
          10
        );
        newTracks = spotifyRecs.filter(t => t.id !== currentTrack.id);
      } catch {
        // Spotify failed, try YouTube
      }

      if (newTracks.length < 6) {
        try {
          const ytRecs = await getYouTubeRecommendations(
            currentTrack.title + " " + artistName,
            10
          );
          const ytFiltered = ytRecs.filter(t => t.id !== currentTrack.id);
          newTracks = [...newTracks, ...ytFiltered];
        } catch {
          // Both failed
        }
      }

      const existingIds = new Set([
        currentTrack.id,
        ...state.queue.map(t => t.id),
      ]);
      const unique = newTracks.filter(t => !existingIds.has(t.id));

      if (unique.length > 0) {
        dispatch({ type: "ADD_TO_QUEUE", tracks: unique.slice(0, 10) });
      }
    } catch (err) {
      console.log("Queue top-up failed, will retry");
    }
  }, [state.queue.length, state.currentTrack]);

  const playTrack = useCallback(async (track: Track) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const sourceUri = track.source === "youtube"
        ? "https://www.youtube.com/watch?v=" + track.youtubeId
        : track.previewUrl
          ? track.previewUrl
          : "https://open.spotify.com/track/" + track.spotifyId;

      const { sound } = await Audio.Sound.createAsync(
        { uri: sourceUri },
        { shouldPlay: true, volume: state.volume },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      dispatch({ type: "SET_TRACK", track });
      lastTrackIdRef.current = track.id;
    } catch (err) {
      if (track.source === "spotify") {
        try {
          const ytResults = await searchYouTubeMusic(track.title + " " + track.artist);
          if (ytResults.length > 0) {
            const ytTrack = { ...ytResults[0], albumArt: track.albumArt };
            await playTrack(ytTrack);
            return;
          }
        } catch { /* fallback failed */ }
      }
      console.log("Playback failed for:", track.title);
    }
  }, [state.volume]);

  const playTracks = useCallback(async (tracks: Track[], startIndex: number = 0) => {
    if (tracks.length === 0) return;

    const startTrack = tracks[startIndex];
    const rest = [...tracks.slice(startIndex + 1), ...tracks.slice(0, startIndex)];

    dispatch({ type: "SET_QUEUE", tracks: rest });
    await playTrack(startTrack);
  }, [playTrack]);

  const pauseTrack = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
      dispatch({ type: "PAUSE" });
    }
  }, []);

  const resumeTrack = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.playAsync();
      dispatch({ type: "PLAY" });
    }
  }, []);

  const seekTo = useCallback(async (position: number) => {
    if (soundRef.current) {
      isSeekingRef.current = true;
      await soundRef.current.setPositionAsync(position * 1000);
      dispatch({ type: "SET_POSITION", position });
      setTimeout(() => { isSeekingRef.current = false; }, 500);
    }
  }, []);

  const skipNext = useCallback(() => {
    dispatch({ type: "NEXT_TRACK" });
  }, []);

  const skipPrev = useCallback(() => {
    if (state.position > 3) {
      dispatch({ type: "PREV_TRACK" });
    }
  }, [state.position]);

  const setVolumeFn = useCallback(async (volume: number) => {
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(volume);
      dispatch({ type: "SET_VOLUME", volume });
    }
  }, []);

  const fetchRecommendations = useCallback(async () => {
    if (!state.currentTrack) return;
    await ensureQueueMinimum();
  }, [state.currentTrack, ensureQueueMinimum]);

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (!status.isLoaded) return;

    if (status.isPlaying !== state.isPlaying) {
      dispatch({ type: status.isPlaying ? "PLAY" : "PAUSE" });
    }

    if (status.isBuffering !== state.isBuffering) {
      dispatch({ type: "SET_BUFFERING", buffering: status.isBuffering });
    }

    if (!isSeekingRef.current && status.positionMillis !== undefined) {
      dispatch({ type: "SET_POSITION", position: Math.floor(status.positionMillis / 1000) });
    }

    if (status.durationMillis !== undefined && status.durationMillis !== state.duration * 1000) {
      dispatch({ type: "SET_DURATION", duration: Math.floor(status.durationMillis / 1000) });
    }

    if (status.didJustFinish) {
      dispatch({ type: "NEXT_TRACK" });
    }
  }, [state.isPlaying, state.isBuffering, state.duration]);

  useEffect(() => {
    if (state.currentTrack && state.currentTrack.id !== lastTrackIdRef.current) {
      playTrack(state.currentTrack);
    }
  }, [state.currentTrack?.id]);

  useEffect(() => {
    if (state.currentTrack && state.queue.length < 3) {
      ensureQueueMinimum();
    }
  }, [state.queue.length]);

  useEffect(() => {
    if (state.isPlaying && state.currentTrack) {
      recommendationTimerRef.current = setInterval(() => {
        ensureQueueMinimum();
      }, 30000);
    }
    return () => {
      if (recommendationTimerRef.current) {
        clearInterval(recommendationTimerRef.current);
      }
    };
  }, [state.isPlaying, state.currentTrack]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const value: PlayerContextType = {
    state,
    dispatch,
    playTrack,
    playTracks,
    pauseTrack,
    resumeTrack,
    seekTo,
    skipNext,
    skipPrev,
    setVolume: setVolumeFn,
    fetchRecommendations,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextType {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return context;
}
