import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { ADHKAR, type Dhikr } from "./adhkar";
import { upcomingPrayers, type PrayerData } from "./prayer";
import type { Settings } from "./settings";

const isWeb = Platform.OS === "web";
// iOS keeps at most 64 pending local notifications; stay under it. The app reschedules on every open.
const MAX_SCHEDULED = 60;

if (!isWeb) {
  // In the foreground we play the dhikr voice ourselves (see ReminderSync), so no system sound.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function setupChannels() {
  if (Platform.OS !== "android") return;
  for (const d of ADHKAR) {
    await Notifications.setNotificationChannelAsync(`dhikr-${d.id}`, {
      name: d.title,
      importance: Notifications.AndroidImportance.HIGH,
      sound: `${d.id}.wav`,
      vibrationPattern: [0, 200, 100, 200],
    });
  }
  await Notifications.setNotificationChannelAsync("adhan", {
    name: "الأذان",
    importance: Notifications.AndroidImportance.MAX,
    sound: "adhan.wav",
  });
}

export function enabledAdhkar(s: Settings): Dhikr[] {
  return ADHKAR.filter((d) => s.enabledIds.includes(d.id));
}

// Slot-based rotation: every interval boundary picks the next enabled dhikr in order.
export function nextDhikrSlots(s: Settings, count: number, now = Date.now()) {
  const list = enabledAdhkar(s);
  if (!list.length) return [];
  const ms = s.interval * 60_000;
  let t = Math.ceil(now / ms) * ms;
  if (t - now < 5_000) t += ms;
  const out: { date: Date; dhikr: Dhikr }[] = [];
  for (let i = 0; i < count; i++, t += ms) {
    out.push({ date: new Date(t), dhikr: list[Math.floor(t / ms) % list.length] });
  }
  return out;
}

export type PermState = "granted" | "undetermined" | "denied" | "blocked" | "unsupported";

export async function getNotifPermission(): Promise<PermState> {
  if (isWeb) return "unsupported";
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return "granted";
  if (p.status === "undetermined") return "undetermined";
  return p.canAskAgain ? "denied" : "blocked";
}

export async function requestNotifPermission(): Promise<PermState> {
  if (isWeb) return "unsupported";
  const current = await getNotifPermission();
  if (current === "granted" || current === "blocked") return current;
  const p = await Notifications.requestPermissionsAsync();
  if (p.granted) return "granted";
  return p.canAskAgain ? "denied" : "blocked";
}

export function useNotifPermission() {
  const [state, setState] = useState<PermState>(isWeb ? "unsupported" : "undetermined");
  const refresh = useCallback(async () => setState(await getNotifPermission()), []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener("change", (s) => s === "active" && refresh());
    return () => sub.remove();
  }, [refresh]);
  const request = useCallback(async () => {
    const r = await requestNotifPermission();
    setState(r);
    return r;
  }, []);
  return { state, refresh, request };
}

export async function syncReminders(s: Settings, prayers?: PrayerData) {
  if (isWeb) return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if ((await getNotifPermission()) !== "granted") return 0;

  const DATE = Notifications.SchedulableTriggerInputTypes.DATE;
  let count = 0;
  const prayerDates: number[] = [];

  if (s.adhan && prayers) {
    for (const p of upcomingPrayers(prayers)) {
      prayerDates.push(p.date.getTime());
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `حان الآن موعد صلاة ${p.name}`,
          body: "حيّ على الصلاة، حيّ على الفلاح",
          sound: "adhan.wav",
          data: { kind: "adhan", soundId: "adhan", title: `صلاة ${p.name}` },
        },
        trigger: { type: DATE, date: p.date, channelId: "adhan" },
      });
      count++;
    }
  }

  if (s.master) {
    for (const slot of nextDhikrSlots(s, MAX_SCHEDULED - count)) {
      // Skip a dhikr that would collide (±3 min) with an adhan.
      if (prayerDates.some((t) => Math.abs(t - slot.date.getTime()) < 3 * 60_000)) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: slot.dhikr.text,
          body: `تذكير · ${slot.dhikr.title}`,
          sound: `${slot.dhikr.id}.wav`,
          data: { kind: "dhikr", soundId: slot.dhikr.id, title: slot.dhikr.text },
        },
        trigger: { type: DATE, date: slot.date, channelId: `dhikr-${slot.dhikr.id}` },
      });
      count++;
    }
  }
  return count;
}

export async function sendTestReminder(d: Dhikr) {
  if (isWeb) return false;
  if ((await getNotifPermission()) !== "granted") return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: d.text,
      body: `تذكير تجريبي · ${d.title}`,
      sound: `${d.id}.wav`,
      data: { kind: "dhikr", soundId: d.id, title: d.text },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: `dhikr-${d.id}`,
    },
  });
  return true;
}
