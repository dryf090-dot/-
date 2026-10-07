import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useSettings } from "./settings";

export type PrayerKey = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
export type Day = { date: string; timings: Record<PrayerKey, string>; hijri: string };
export type PrayerData = { today: Day; tomorrow: Day; timezone: string };

export const PRAYERS: { key: PrayerKey; name: string; icon: "sunrise" | "sun" | "cloud" | "sunset" | "moon" | "sunrise" }[] = [
  { key: "Fajr", name: "الفجر", icon: "sunrise" },
  { key: "Sunrise", name: "الشروق", icon: "sun" },
  { key: "Dhuhr", name: "الظهر", icon: "sun" },
  { key: "Asr", name: "العصر", icon: "cloud" },
  { key: "Maghrib", name: "المغرب", icon: "sunset" },
  { key: "Isha", name: "العشاء", icon: "moon" },
];
export const ADHAN_KEYS: PrayerKey[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

const pad = (n: number) => String(n).padStart(2, "0");
export const formatApiDate = (d: Date) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;

export function toDate(day: string, hhmm: string) {
  const [dd, mm, yyyy] = day.split("-").map(Number);
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(yyyy, mm - 1, dd, h, m, 0, 0);
}

export function upcomingPrayers(data: PrayerData, now = new Date()) {
  const list: { key: PrayerKey; name: string; date: Date }[] = [];
  for (const day of [data.today, data.tomorrow]) {
    for (const p of PRAYERS) {
      if (!ADHAN_KEYS.includes(p.key)) continue;
      const date = toDate(day.date, day.timings[p.key]);
      if (date > now) list.push({ key: p.key, name: p.name, date });
    }
  }
  return list;
}

export function usePrayerTimes() {
  const { settings, ready } = useSettings();
  const date = formatApiDate(new Date());
  return useQuery<PrayerData>({
    queryKey: ["prayer", settings.lat.toFixed(3), settings.lng.toFixed(3), date],
    enabled: ready,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const url = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/prayer-times?lat=${settings.lat}&lng=${settings.lng}&date=${date}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`prayer-times ${res.status}`);
      return res.json();
    },
  });
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function formatCountdown(diffMs: number) {
  const s = Math.max(0, Math.floor(diffMs / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function formatTime12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h < 12 ? "ص" : "م";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

export const timeOf = (d: Date) => formatTime12(`${d.getHours()}:${d.getMinutes()}`);
