import { useSyncExternalStore } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

import { SOUNDS, type SoundId } from "./adhkar";

// One module-level player: only one dhikr plays at a time.
let player: AudioPlayer | null = null;
let playingId: SoundId | null = null;
const listeners = new Set<() => void>();

function setPlaying(id: SoundId | null) {
  playingId = id;
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

export async function playSound(id: SoundId): Promise<boolean> {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    stopSound();
    const p = createAudioPlayer(SOUNDS[id]);
    player = p;
    p.addListener("playbackStatusUpdate", (s) => {
      if (s.didJustFinish && player === p) stopSound();
    });
    p.play();
    setPlaying(id);
    return true;
  } catch (e) {
    console.warn("[audio] playback failed", e);
    setPlaying(null);
    return false;
  }
}

export function usePlayingId() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => playingId,
    () => playingId,
  );
}
