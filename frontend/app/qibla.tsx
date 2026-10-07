import { useEffect, useRef, useState } from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@react-native-vector-icons/feather";

import { InfoBanner } from "@/src/components/InfoBanner";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useSettings, type LocationResult } from "@/src/settings";
import { colors } from "@/src/theme";
import { alpha, fonts, radius, spacing, toArabicDigits } from "@/src/ui";

const KAABA = { lat: 21.422487, lng: 39.826206 };
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function qiblaBearing(lat: number, lng: number) {
  const φ1 = rad(lat);
  const φ2 = rad(KAABA.lat);
  const Δλ = rad(KAABA.lng - lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

function distanceKm(lat: number, lng: number) {
  const dφ = rad(KAABA.lat - lat);
  const dλ = rad(KAABA.lng - lng);
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(KAABA.lat)) * Math.sin(dλ / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const DIAL = 290;

export default function QiblaScreen() {
  const insets = useSafeAreaInsets();
  const { settings, requestLocation } = useSettings();
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number>(3);
  const [loc, setLoc] = useState<LocationResult | "loading" | null>(null);
  const rotation = useSharedValue(0);
  const lastRot = useRef(0);
  const wasAligned = useRef(false);

  const bearing = qiblaBearing(settings.lat, settings.lng);

  // Ask for a precise position once when entering the screen.
  useEffect(() => {
    (async () => {
      setLoc("loading");
      setLoc(await requestLocation());
    })();
  }, [requestLocation]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let sub: Location.LocationSubscription | null = null;
    Location.getForegroundPermissionsAsync().then(async (p) => {
      if (p.status !== "granted") return;
      sub = await Location.watchHeadingAsync((h) => {
        setHeading(h.trueHeading >= 0 ? h.trueHeading : h.magHeading);
        setAccuracy(h.accuracy);
      });
    });
    return () => sub?.remove();
  }, [loc]);

  // Dial rotates opposite to the phone heading; unwrap to avoid 359°→0° spins.
  useEffect(() => {
    if (heading == null) return;
    const target = -heading;
    let delta = ((target - lastRot.current + 540) % 360) - 180;
    lastRot.current += delta;
    rotation.value = withTiming(lastRot.current, { duration: 200 });
  }, [heading, rotation]);

  const diff = heading == null ? null : Math.abs((((bearing - heading) % 360) + 540) % 360 - 180);
  const aligned = diff != null && diff <= 5;

  useEffect(() => {
    if (aligned && !wasAligned.current && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasAligned.current = aligned;
  }, [aligned]);

  const dialStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <View style={styles.screen} testID="qibla-screen">
      <ScreenHeader title="اتجاه القبلة" subtitle={settings.locLabel} />
      <View style={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}>
        {loc === "denied" || loc === "blocked" ? (
          <InfoBanner
            testID="qibla-location-banner"
            icon="map-pin"
            title="نحتاج موقعك لتحديد القبلة بدقة"
            body={`نعرض الآن الاتجاه من ${settings.locLabel}. اسمح بالموقع لتحديد القبلة من مكانك الحالي.`}
            action={loc === "blocked" ? "فتح الإعدادات" : "السماح بالموقع"}
            onPress={async () => (loc === "blocked" ? Linking.openSettings() : setLoc(await requestLocation()))}
          />
        ) : null}

        <Text style={[styles.status, aligned && { color: colors.brandPrimary }]} testID="qibla-status">
          {Platform.OS === "web"
            ? "البوصلة متاحة على الجوال فقط"
            : heading == null
              ? "جارٍ تشغيل البوصلة..."
              : aligned
                ? "أنت باتجاه القبلة ✓"
                : "أدر الجوال حتى تصل الكعبة للأعلى"}
        </Text>

        <View style={styles.dialWrap}>
          <View style={[styles.pointer, aligned && { borderBottomColor: colors.brandPrimary }]} />
          <Animated.View style={[styles.dial, aligned && styles.dialAligned, dialStyle]} testID="qibla-dial">
            {["ش", "ق", "ج", "غ"].map((l, i) => (
              <View key={l} style={[styles.cardinalWrap, { transform: [{ rotate: `${i * 90}deg` }] }]}>
                <Text style={[styles.cardinal, i === 0 && { color: colors.error }]}>{l}</Text>
              </View>
            ))}
            {Array.from({ length: 72 }).map((_, i) => (
              <View key={i} style={[styles.tickWrap, { transform: [{ rotate: `${i * 5}deg` }] }]}>
                <View style={[styles.tick, i % 6 === 0 && styles.tickMajor]} />
              </View>
            ))}
            <View style={[styles.kaabaWrap, { transform: [{ rotate: `${bearing}deg` }] }]}>
              <View style={styles.kaabaLine} />
              <View style={[styles.kaaba, { transform: [{ rotate: `${-bearing}deg` }] }]}>
                <View style={styles.kaabaBand} />
              </View>
            </View>
          </Animated.View>
          <View style={styles.center} />
        </View>

        <View style={styles.stats}>
          <Stat label="زاوية القبلة" value={`${toArabicDigits(bearing.toFixed(0))}°`} testID="qibla-bearing" />
          <Stat label="المسافة إلى مكة" value={`${toArabicDigits(Math.round(distanceKm(settings.lat, settings.lng)).toLocaleString("en"))} كم`} testID="qibla-distance" />
          <Stat label="اتجاه الجوال" value={heading == null ? "—" : `${toArabicDigits(heading.toFixed(0))}°`} testID="qibla-heading" />
        </View>

        {Platform.OS !== "web" && accuracy < 2 ? (
          <View style={styles.calib} testID="qibla-calibrate-hint">
            <Feather name="refresh-cw" size={16} color={colors.warning} />
            <Text style={styles.calibText}>دقة البوصلة منخفضة: حرّك الجوال على شكل الرقم 8 وابتعد عن المعادن والمغناطيس.</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Stat({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} testID={testID}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, padding: spacing.lg, gap: spacing.lg, alignItems: "stretch" },
  status: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.onSurface, textAlign: "center", marginTop: spacing.sm },
  dialWrap: { alignSelf: "center", width: DIAL, height: DIAL + 24, alignItems: "center", justifyContent: "flex-end" },
  pointer: {
    position: "absolute",
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 20,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: colors.onSurfaceTertiary,
  },
  dial: {
    width: DIAL,
    height: DIAL,
    borderRadius: DIAL / 2,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSecondary,
  },
  dialAligned: { borderColor: colors.brandPrimary, backgroundColor: alpha(colors.brandSecondary, 0.4) },
  cardinalWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", paddingTop: 22 },
  cardinal: { fontFamily: fonts.textBold, fontSize: 18, color: colors.onSurfaceSecondary },
  tickWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center" },
  tick: { width: 1, height: 8, backgroundColor: colors.borderStrong, marginTop: 4 },
  tickMajor: { height: 14, width: 2, backgroundColor: colors.muted },
  kaabaWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center" },
  kaabaLine: { position: "absolute", top: 60, height: DIAL / 2 - 60, width: 2, backgroundColor: colors.brandPrimary },
  kaaba: {
    marginTop: 22,
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: colors.onSurfaceInverse,
    borderWidth: 1.5,
    borderColor: colors.brandPrimary,
    overflow: "hidden",
  },
  kaabaBand: { marginTop: 8, height: 5, backgroundColor: colors.brandPrimary },
  center: {
    position: "absolute",
    bottom: DIAL / 2 - 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brandPrimary,
  },
  stats: { flexDirection: "row-reverse", gap: spacing.sm },
  stat: {
    flex: 1,
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.brandPrimary },
  statLabel: { fontFamily: fonts.text, fontSize: 12, color: colors.muted },
  calib: { flexDirection: "row-reverse", gap: spacing.sm, alignItems: "center" },
  calibText: { flex: 1, fontFamily: fonts.text, fontSize: 12, color: colors.warning, textAlign: "right" },
});
