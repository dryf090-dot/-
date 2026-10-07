// Background refresh: re-plans the reminder queue while the app is closed so
// notifications never run out (iOS keeps max 64 pending). Native builds only.
import { Platform } from "react-native";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

import { formatApiDate, type PrayerData } from "./prayer";
import { setupChannels, syncReminders } from "./reminders";
import { loadSettings } from "./settings";
import { storage } from "./utils/storage";

export const SYNC_TASK = "tidhkar-reminder-sync";
export const PRAYER_CACHE_KEY = "tidhkar.prayerCache";

export async function cachePrayerData(data: PrayerData) {
  await storage.setItem(PRAYER_CACHE_KEY, JSON.stringify(data));
}

async function loadPrayerData(lat: number, lng: number): Promise<PrayerData | undefined> {
  const date = formatApiDate(new Date());
  try {
    const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/prayer-times?lat=${lat}&lng=${lng}&date=${date}`);
    if (res.ok) {
      const data = (await res.json()) as PrayerData;
      await cachePrayerData(data);
      return data;
    }
  } catch {}
  const raw = await storage.getItem(PRAYER_CACHE_KEY, "");
  return raw ? (JSON.parse(String(raw)) as PrayerData) : undefined;
}

if (Platform.OS !== "web") {
  TaskManager.defineTask(SYNC_TASK, async () => {
    try {
      const s = await loadSettings();
      await setupChannels();
      await syncReminders(s, await loadPrayerData(s.lat, s.lng));
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (e) {
      console.warn("[bg] sync failed", e);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerBackgroundSync() {
  if (Platform.OS === "web") return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (!(await TaskManager.isTaskRegisteredAsync(SYNC_TASK))) {
      await BackgroundTask.registerTaskAsync(SYNC_TASK, { minimumInterval: 60 });
    }
  } catch (e) {
    console.warn("[bg] register failed (expected in Expo Go)", e);
  }
}
