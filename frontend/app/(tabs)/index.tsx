import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@react-native-vector-icons/feather";

import { Emblem } from "@/src/components/Emblem";
import { InfoBanner } from "@/src/components/InfoBanner";
import { Ornament } from "@/src/components/Ornament";
import { NextDhikrCard } from "@/src/components/NextDhikrCard";
import { PrayerRow } from "@/src/components/PrayerRow";
import { usesNativeTabs } from "@/src/navigation";
import { formatCountdown, PRAYERS, upcomingPrayers, useNow, usePrayerTimes, timeOf } from "@/src/prayer";
import { useNotifPermission } from "@/src/reminders";
import { useSettings, type LocationResult } from "@/src/settings";
import { colors } from "@/src/theme";
import { alpha, fonts, radius, ROW, rtlText, spacing } from "@/src/ui";

const HERO =
  "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80";

export default function Home() {
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { settings, requestLocation } = useSettings();
  const { data, isLoading, isError, refetch, isRefetching } = usePrayerTimes();
  const notif = useNotifPermission();
  const now = useNow();
  const [locState, setLocState] = useState<LocationResult | "loading" | null>(null);

  const next = data ? upcomingPrayers(data, now)[0] : undefined;
  const nextKey = next && data && next.date.getDate() === now.getDate() ? next.key : undefined;

  const onLocate = async () => {
    if (locState === "blocked") return Linking.openSettings();
    setLocState("loading");
    setLocState(await requestLocation());
  };

  return (
    <View style={styles.screen} testID="home-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomChrome + spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
      >
        <View style={styles.hero}>
          <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
          <LinearGradient
            colors={[alpha(colors.surface, 0.55), alpha(colors.surface, 0.15), alpha(colors.surface, 0.6), colors.surface]}
            locations={[0, 0.35, 0.75, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
            <Emblem />
            <Pressable style={styles.locChip} onPress={onLocate} testID="home-location-chip">
              <Feather name="map-pin" size={14} color={colors.brandPrimary} />
              <Text style={styles.locText} numberOfLines={1} testID="home-location-label">
                {settings.locLabel}
              </Text>
            </Pressable>
          </View>

          <Animated.View entering={FadeInDown.duration(600)} style={styles.glassWrap}>
            <BlurView intensity={40} tint="dark" style={styles.glass} testID="next-prayer-card">
              <Text style={styles.glassLabel}>الصلاة القادمة</Text>
              {isLoading ? (
                <ActivityIndicator color={colors.brandPrimary} style={{ marginVertical: spacing.xl }} />
              ) : next ? (
                <>
                  <Text style={styles.prayerName} testID="next-prayer-name">{next.name}</Text>
                  <Text style={styles.countdown} testID="next-prayer-countdown">
                    {formatCountdown(next.date.getTime() - now.getTime())}
                  </Text>
                  <Ornament />
                  <Text style={styles.glassMeta} testID="next-prayer-time">
                    {timeOf(next.date)} · {data?.today.hijri}
                  </Text>
                </>
              ) : (
                <Text style={styles.glassMeta}>تعذر حساب الصلاة القادمة</Text>
              )}
            </BlurView>
          </Animated.View>
        </View>

        <View style={styles.body}>
          {(notif.state === "undetermined" || notif.state === "denied" || notif.state === "blocked") && (
            <InfoBanner
              testID="notif-permission-banner"
              icon="bell"
              title="فعّل التنبيهات لتصلك الأذكار"
              body="نذكّرك بالصلاة على النبي ﷺ ولا إله إلا الله بصوت عربي، ونرسل تنبيه الأذان حتى والتطبيق مغلق."
              action={notif.state === "blocked" ? "فتح الإعدادات" : "تفعيل التنبيهات"}
              onPress={() => (notif.state === "blocked" ? Linking.openSettings() : notif.request())}
            />
          )}
          {!settings.hasLocation && (
            <InfoBanner
              testID="location-banner"
              icon="map-pin"
              title="مواقيت دقيقة لمدينتك"
              body={
                locState === "blocked"
                  ? "إذن الموقع مرفوض. افتح الإعدادات للسماح بالوصول. نعرض الآن مواقيت مكة المكرمة."
                  : locState === "error"
                    ? "تعذر تحديد الموقع، حاول مرة أخرى."
                    : "نستخدم موقعك فقط لحساب مواقيت الصلاة. نعرض الآن مواقيت مكة المكرمة."
              }
              action={locState === "loading" ? "جارٍ التحديد..." : locState === "blocked" ? "فتح الإعدادات" : "تحديد موقعي"}
              onPress={onLocate}
            />
          )}

          <NextDhikrCard />

          <View style={[styles.sectionHead]}>
            <Text style={styles.sectionTitle}>مواقيت اليوم</Text>
            <Text style={styles.sectionMeta}>أم القرى</Text>
          </View>

          {isError ? (
            <InfoBanner
              testID="prayer-error"
              icon="alert-circle"
              title="تعذر جلب المواقيت"
              body="تحقق من الاتصال بالإنترنت ثم أعد المحاولة."
              action="إعادة المحاولة"
              onPress={() => refetch()}
            />
          ) : isLoading || !data ? (
            <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} />
          ) : (
            <View style={{ gap: spacing.sm }} testID="prayer-list">
              {PRAYERS.map((p, i) => (
                <Animated.View key={p.key} entering={FadeInDown.delay(80 * i).duration(400)}>
                  <PrayerRow prayer={p} time={data.today.timings[p.key]} active={p.key === nextKey} />
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 470, justifyContent: "space-between", overflow: "hidden" },
  topBar: {
    flexDirection: ROW,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  locChip: {
    flexDirection: ROW,
    alignItems: "center",
    gap: spacing.xs,
    maxWidth: 160,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: alpha(colors.surface, 0.6),
    borderWidth: 1,
    borderColor: colors.border,
  },
  locText: { fontFamily: fonts.textMedium, fontSize: 13, color: colors.onSurface },
  glassWrap: { marginHorizontal: spacing.xl, marginBottom: spacing.xl, borderRadius: radius.lg, overflow: "hidden" },
  glass: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    backgroundColor: alpha(colors.surfaceSecondary, 0.75),
    borderWidth: 1,
    borderColor: alpha(colors.brandPrimary, 0.35),
    borderRadius: radius.lg,
  },
  glassLabel: { fontFamily: fonts.textMedium, fontSize: 14, color: colors.onSurfaceTertiary },
  prayerName: { fontFamily: fonts.displayBold, fontSize: 48, lineHeight: 84, color: colors.brandPrimary },
  countdown: {
    fontFamily: fonts.displayBold,
    fontSize: 34,
    color: colors.onSurface,
    letterSpacing: 2,
    marginBottom: spacing.md,
    fontVariant: ["tabular-nums"],
  },
  glassMeta: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceSecondary, marginTop: spacing.md },
  body: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  sectionHead: { flexDirection: ROW, justifyContent: "space-between", alignItems: "baseline", marginTop: spacing.sm },
  sectionTitle: { ...rtlText, fontFamily: fonts.displayBold, fontSize: 24, color: colors.onSurface },
  sectionMeta: { fontFamily: fonts.text, fontSize: 12, color: colors.muted },
});
