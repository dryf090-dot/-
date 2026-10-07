import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@react-native-vector-icons/feather";

import { ADHKAR } from "@/src/adhkar";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors } from "@/src/theme";
import { storage } from "@/src/utils/storage";
import { alpha, fonts, radius, ROW, spacing, toArabicDigits } from "@/src/ui";

const TARGETS = [33, 99, 100];
const todayKey = () => `tidhkar.tasbih.${new Date().toDateString()}`;

export default function TasbihScreen() {
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const [target, setTarget] = useState(33);
  const [count, setCount] = useState(0);
  const [today, setToday] = useState(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    storage.getItem(todayKey(), 0).then((v) => setToday(Number(v) || 0));
  }, []);

  const tap = () => {
    const next = count + 1;
    setCount(next);
    const t = today + 1;
    setToday(t);
    storage.setItem(todayKey(), t);
    scale.value = withSequence(withTiming(0.94, { duration: 60 }), withTiming(1, { duration: 120 }));
    if (Platform.OS !== "web") {
      if (next % target === 0) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const bead = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const done = count > 0 && count % target === 0;
  const progress = (count % target) / target;

  return (
    <View style={styles.screen} testID="tasbih-screen">
      <ScreenHeader title="المسبحة" subtitle={`تسبيحات اليوم: ${toArabicDigits(String(today))}`} />
      <View style={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0 }}>
          {ADHKAR.map((d, i) => (
            <Pressable
              key={d.id}
              onPress={() => {
                setIdx(i);
                setCount(0);
              }}
              style={[styles.chip, i === idx && styles.chipSel]}
              testID={`tasbih-dhikr-${d.id}`}
            >
              <Text style={[styles.chipText, i === idx && { color: colors.onBrandPrimary }]}>{d.title}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.dhikr} testID="tasbih-dhikr-text">{ADHKAR[idx].text}</Text>

        <Pressable onPress={tap} testID="tasbih-tap-button" style={styles.tapArea}>
          <Animated.View style={[styles.bead, done && styles.beadDone, bead]}>
            <Text style={styles.count} testID="tasbih-count">{toArabicDigits(String(count))}</Text>
            <Text style={styles.of}>من {toArabicDigits(String(target))}</Text>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${(done ? 1 : progress) * 100}%` }]} />
            </View>
          </Animated.View>
        </Pressable>
        <Text style={styles.hint}>{done ? "أحسنت! أكملت العدد، تقبّل الله" : "اضغط على الدائرة للتسبيح"}</Text>

        <View style={styles.footer}>
          {TARGETS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTarget(t)}
              style={[styles.target, t === target && styles.chipSel]}
              testID={`tasbih-target-${t}`}
            >
              <Text style={[styles.chipText, t === target && { color: colors.onBrandPrimary }]}>{toArabicDigits(String(t))}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setCount(0)} style={styles.reset} testID="tasbih-reset-button">
            <Feather name="rotate-ccw" size={18} color={colors.brandPrimary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, paddingTop: spacing.lg, gap: spacing.lg, alignItems: "center" },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, flexDirection: ROW, height: 56, alignItems: "center" },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSel: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontFamily: fonts.textMedium, fontSize: 13, color: colors.onSurfaceSecondary },
  dhikr: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 52,
    color: colors.onSurface,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    minHeight: 104,
  },
  tapArea: { borderRadius: 140 },
  bead: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.brandPrimary,
    gap: spacing.xs,
  },
  beadDone: { backgroundColor: alpha(colors.brandSecondary, 0.6) },
  count: { fontFamily: fonts.displayBold, fontSize: 64, lineHeight: 96, color: colors.brandPrimary },
  of: { fontFamily: fonts.text, fontSize: 14, color: colors.muted },
  bar: { width: 120, height: 4, borderRadius: 2, backgroundColor: colors.surfaceTertiary, overflow: "hidden", marginTop: spacing.sm },
  barFill: { height: 4, backgroundColor: colors.brandPrimary },
  hint: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceTertiary },
  footer: { flexDirection: ROW, gap: spacing.sm, alignItems: "center", marginTop: "auto" },
  target: {
    height: 44,
    minWidth: 64,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  reset: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
});
