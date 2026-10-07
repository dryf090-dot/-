import { useSyncExternalStore } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

import { SOUNDS, type SoundId } from "./adhkar";

// One module-level player: only one dhikr plays at a time.
let player: AudioPlayer | null = null;
let playingId: string | null = null;
let loading = false;
let paused = false;
const listeners = new Set<() => void>();

function setPlaying(id: string | null, isLoading = false) {
  playingId = id;
  loading = isLoading;
  paused = false;
  listeners.forEach((l) => l());
}

export function stopSound() {
  if (player) {
    try {
      player.pause();
      player.remove();
    } catch {}
    player = null;
  }
  setPlaying(null);
}

async function playSource(key: string, source: number | { uri: string }, background: boolean, onFinish?: () => void) {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: background });
    stopSound();
    const p = createAudioPlayer(source);
    player = p;
    setPlaying(key, typeof source !== "number");
    p.addListener("playbackStatusUpdate", (s) => {
      if (player !== p) return;
      if (loading && s.playing) setPlaying(key, false);
      if (s.didJustFinish) {
        stopSound();
        onFinish?.();
      }
    });
    p.play();
    return true;
  } catch (e) {
    console.warn("[audio] playback failed", key, e);
    setPlaying(null);
    return false;
  }
}

export function playSound(id: SoundId) {
  return playSource(id, SOUNDS[id], false);
}

// Streamed recitation (Quran); keeps playing with the screen locked in native builds.
export function playUri(key: string, uri: string, onFinish?: () => void) {
  return playSource(key, { uri }, true, onFinish);
}

export function togglePause() {
  if (!player) return;
  if (paused) player.play();
  else player.pause();
  paused = !paused;
  listeners.forEach((l) => l());
}

export function usePaused() {
  return useSyncExternalStore(subscribe, () => paused, () => paused);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function usePlayingId() {
  return useSyncExternalStore(subscribe, () => playingId, () => playingId);
}

export function useAudioLoading() {
  return useSyncExternalStore(subscribe, () => loading, () => loading);
}
