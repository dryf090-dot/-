import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";

import { storage } from "./utils/storage";
import { ADHKAR } from "./adhkar";

export type Interval = 15 | 30 | 60;

export type Settings = {
  master: boolean;
  interval: Interval;
  adhan: boolean;
  enabledIds: string[];
  lat: number;
  lng: number;
  locLabel: string;
  hasLocation: boolean;
};

// Default: Makkah until the user shares their location.
const DEFAULTS: Settings = {
  master: true,
  interval: 30,
  adhan: true,
  enabledIds: ADHKAR.map((d) => d.id),
  lat: 21.4225,
  lng: 39.8262,
  locLabel: "مكة المكرمة",
  hasLocation: false,
};

export type LocationResult = "granted" | "denied" | "blocked" | "error";

type Ctx = {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
  toggleDhikr: (id: string) => void;
  requestLocation: () => Promise<LocationResult>;
};

const SettingsContext = createContext<Ctx | null>(null);
const K = "tidhkar.";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [master, interval, adhan, ids, lat, lng, label, has] = await Promise.all([
        storage.getItem(K + "master", DEFAULTS.master),
        storage.getItem(K + "interval", DEFAULTS.interval),
        storage.getItem(K + "adhan", DEFAULTS.adhan),
        storage.getItem(K + "enabledIds", DEFAULTS.enabledIds.join(",")),
        storage.getItem(K + "lat", DEFAULTS.lat),
        storage.getItem(K + "lng", DEFAULTS.lng),
        storage.getItem(K + "locLabel", DEFAULTS.locLabel),
        storage.getItem(K + "hasLocation", DEFAULTS.hasLocation),
      ]);
      setSettings({
        master: !!master,
        interval: ([15, 30, 60].includes(Number(interval)) ? Number(interval) : 30) as Interval,
        adhan: !!adhan,
        enabledIds: String(ids ?? "").split(",").filter(Boolean),
        lat: Number(lat),
        lng: Number(lng),
        locLabel: String(label),
        hasLocation: !!has,
      });
      setReady(true);
    })();
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    Object.entries(patch).forEach(([k, v]) => {
      storage.setItem(K + k, Array.isArray(v) ? v.join(",") : (v as string | number | boolean));
    });
  }, []);

  const toggleDhikr = useCallback(
    (id: string) => {
      const ids = settings.enabledIds.includes(id)
        ? settings.enabledIds.filter((x) => x !== id)
        : ADHKAR.map((d) => d.id).filter((x) => x === id || settings.enabledIds.includes(x));
      update({ enabledIds: ids });
    },
    [settings.enabledIds, update],
  );

  const requestLocation = useCallback(async (): Promise<LocationResult> => {
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== "granted" && perm.canAskAgain) {
        perm = await Location.requestForegroundPermissionsAsync();
      }
      if (perm.status !== "granted") return perm.canAskAgain ? "denied" : "blocked";
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let label = "موقعي الحالي";
      if (Platform.OS !== "web") {
        try {
          const [place] = await Location.reverseGeocodeAsync(pos.coords);
          label = place?.city || place?.subregion || place?.region || label;
        } catch {}
      }
      update({ lat: pos.coords.latitude, lng: pos.coords.longitude, locLabel: label, hasLocation: true });
      return "granted";
    } catch (e) {
      console.warn("[location] failed", e);
      return "error";
    }
  }, [update]);

  const value = useMemo(
    () => ({ settings, ready, update, toggleDhikr, requestLocation }),
    [settings, ready, update, toggleDhikr, requestLocation],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings outside provider");
  return ctx;
}
