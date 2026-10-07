import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { playSound, stopSound } from "../audio";
import type { SoundId } from "../adhkar";
import { usePrayerTimes } from "../prayer";
import { nextDhikrSlots, setupChannels, syncReminders } from "../reminders";
import { useSettings } from "../settings";
import { showToast } from "../toast";

// Keeps scheduled notifications in sync with settings and plays the voice while the app is open.
export function ReminderSync() {
  const { settings, ready } = useSettings();
  const { data } = usePrayerTimes();

  useEffect(() => {
    if (!ready || Platform.OS === "web") return;
    let cancelled = false;
    const run = async () => {
      await setupChannels();
      if (!cancelled) await syncReminders(settings, data);
    };
    run().catch((e) => console.warn("[reminders] sync failed", e));
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") run().catch(() => {});
      if (s === "background") stopSound();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [settings, data, ready]);

  // Foreground notification -> play the Arabic voice + toast.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationReceivedListener((n) => {
      const d = n.request.content.data as { soundId?: SoundId; title?: string };
      if (d?.soundId) playSound(d.soundId);
      showToast(d?.title ?? n.request.content.title ?? "تذكير", n.request.content.body ?? undefined);
    });
    return () => sub.remove();
  }, []);

  // Web preview has no local notifications: fire the reminder in-app at each slot.
  useEffect(() => {
    if (Platform.OS !== "web" || !ready || !settings.master) return;
    let t: ReturnType<typeof setTimeout>;
    const arm = () => {
      const [slot] = nextDhikrSlots(settings, 1);
      if (!slot) return;
      t = setTimeout(() => {
        playSound(slot.dhikr.id);
        showToast(slot.dhikr.text, `تذكير · ${slot.dhikr.title}`);
        arm();
      }, slot.date.getTime() - Date.now());
    };
    arm();
    return () => clearTimeout(t);
  }, [settings, ready]);

  return null;
}
