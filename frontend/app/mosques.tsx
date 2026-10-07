import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@react-native-vector-icons/feather";

import { InfoBanner } from "@/src/components/InfoBanner";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useSettings, type LocationResult } from "@/src/settings";
import { colors } from "@/src/theme";
import { fonts, radius, ROW, rtlText, spacing, toArabicDigits } from "@/src/ui";

type Mosque = { id: string; name: string; lat: number; lng: number; distance_m: number };

const fmtDistance = (m: number) =>
  m < 1000 ? `${toArabicDigits(String(m))} م` : `${toArabicDigits((m / 1000).toFixed(1))} كم`;

async function openDirections(m: Mosque) {
  const web = `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}&travelmode=walking`;
  const native = Platform.select({
    ios: `maps://?daddr=${m.lat},${m.lng}&dirflg=w`,
    android: `google.navigation:q=${m.lat},${m.lng}&mode=w`,
  });
  try {
    if (native) return await Linking.openURL(native);
  } catch {}
  Linking.openURL(web);
}

export default function MosquesScreen() {
  const insets = useSafeAreaInsets();
  const { settings, requestLocation } = useSettings();
  const [loc, setLoc] = useState<LocationResult | "loading">("loading");

  // Always take a fresh GPS fix here so results are around where the user stands now.
  useEffect(() => {
    requestLocation().then(setLoc);
  }, [requestLocation]);

  const located = loc === "granted";
  const q = useQuery<{ items: Mosque[] }>({
    queryKey: ["mosques", settings.lat.toFixed(3), settings.lng.toFixed(3)],
    enabled: located,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/mosques?lat=${settings.lat}&lng=${settings.lng}`);
      if (!res.ok) throw new Error(`mosques ${res.status}`);
      return res.json();
    },
  });

  const retryLocation = async () => {
    if (loc === "blocked") return Linking.openSettings();
    setLoc("loading");
    setLoc(await requestLocation());
  };

  return (
    <View style={styles.screen} testID="mosques-screen">
      <ScreenHeader title="أقرب مسجد" subtitle={located ? `حول ${settings.locLabel}` : undefined} />
      {loc === "loading" || (located && q.isLoading) ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} size="large" />
          <Text style={styles.centerText}>{loc === "loading" ? "جارٍ تحديد موقعك بدقة..." : "جارٍ البحث عن المساجد القريبة..."}</Text>
        </View>
      ) : !located ? (
        <View style={styles.pad}>
          <InfoBanner
            testID="mosques-location-banner"
            icon="map-pin"
            title="نحتاج موقعك للعثور على أقرب مسجد"
            body={
              loc === "blocked"
                ? "إذن الموقع مرفوض. افتح الإعدادات واسمح للتطبيق بالوصول إلى الموقع."
                : loc === "error"
                  ? "تعذر تحديد الموقع. تأكد من تشغيل GPS ثم أعد المحاولة."
                  : "نستخدم موقعك الحالي فقط للبحث عن المساجد حولك."
            }
            action={loc === "blocked" ? "فتح الإعدادات" : "إعادة المحاولة"}
            onPress={retryLocation}
          />
        </View>
      ) : q.isError ? (
        <View style={styles.pad}>
          <InfoBanner
            testID="mosques-error"
            icon="alert-circle"
            title="تعذر البحث عن المساجد"
            body="تحقق من الاتصال بالإنترنت ثم أعد المحاولة."
            action="إعادة المحاولة"
            onPress={() => q.refetch()}
          />
        </View>
      ) : (
        <FlatList
          data={q.data?.items ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: insets.bottom + spacing.xl }}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={retryLocation} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={
            <InfoBanner
              testID="mosques-empty"
              icon="map-pin"
              title="لم نعثر على مساجد قريبة"
              body="لا توجد مساجد مسجلة في الخريطة ضمن ١٥ كم من موقعك."
            />
          }
          ListFooterComponent={<Text style={styles.credit}>بيانات الخرائط © OpenStreetMap</Text>}
          renderItem={({ item, index }) => <MosqueRow m={item} nearest={index === 0} />}
        />
      )}
    </View>
  );
}

function MosqueRow({ m, nearest }: { m: Mosque; nearest: boolean }) {
  return (
    <View style={[styles.row, nearest && styles.nearest]} testID={`mosque-row-${m.id}`}>
      <View style={styles.icon}>
        <Feather name="moon" size={18} color={nearest ? colors.onBrandPrimary : colors.brandPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={2}>{m.name}</Text>
        <Text style={styles.meta}>
          {nearest ? "الأقرب إليك · " : ""}
          {fmtDistance(m.distance_m)} · مشيًا {toArabicDigits(String(Math.max(1, Math.round(m.distance_m / 80))))} د
        </Text>
      </View>
      <Pressable
        onPress={() => openDirections(m)}
        style={({ pressed }) => [styles.go, pressed && { opacity: 0.8 }]}
        testID={`mosque-directions-${m.id}`}
      >
        <Feather name="navigation" size={16} color={colors.onBrandPrimary} />
        <Text style={styles.goText}>اتجاهات</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  centerText: { fontFamily: fonts.text, fontSize: 14, color: colors.muted },
  pad: { padding: spacing.lg },
  row: {
    flexDirection: ROW,
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  nearest: { borderColor: colors.brandPrimary },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { ...rtlText, fontFamily: fonts.displayBold, fontSize: 18, color: colors.onSurface },
  meta: { ...rtlText, fontFamily: fonts.text, fontSize: 12, color: colors.muted },
  go: {
    flexDirection: ROW,
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
  },
  goText: { fontFamily: fonts.textBold, fontSize: 13, color: colors.onBrandPrimary },
  credit: { fontFamily: fonts.text, fontSize: 11, color: colors.muted, textAlign: "center", marginTop: spacing.md },
});
