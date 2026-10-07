import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";

import { playSound, stopSound, usePlayingId } from "../audio";
import { timeOf, useNow } from "../prayer";
import { nextDhikrSlots } from "../reminders";
import { useSettings } from "../settings";
import { colors } from "../theme";
import { fonts, radius, ROW, rtlText, spacing } from "../ui";

export function NextDhikrCard() {
  const { settings } = useSettings();
  const now = useNow(15000);
  const playing = usePlayingId();
  const [slot] = nextDhikrSlots(settings, 1, now.getTime());

  if (!settings.master || !slot) {
    return (
      <View style={styles.card} testID="next-dhikr-card">
        <Text style={styles.label}>التذكير بالأذكار متوقف</Text>
        <Text style={styles.meta}>فعّله من الإعدادات واختر الأذكار من تبويب الأذكار</Text>
      </View>
    );
  }
  const isPlaying = playing === slot.dhikr.id;
  return (
    <View style={styles.card} testID="next-dhikr-card">
      <View style={styles.head}>
        <Text style={styles.label}>الذكر القادم</Text>
        <Text style={styles.meta} testID="next-dhikr-time">
          {timeOf(slot.date)} · كل {settings.interval} دقيقة
        </Text>
      </View>
      <View style={styles.bodyRow}>
        <Text style={styles.text} testID="next-dhikr-text">{slot.dhikr.text}</Text>
        <Pressable
          onPress={() => (isPlaying ? stopSound() : playSound(slot.dhikr.id))}
          style={({ pressed }) => [styles.play, pressed && { transform: [{ scale: 0.94 }] }]}
          testID="next-dhikr-play-button"
          accessibilityLabel="استمع للذكر"
        >
          <Feather name={isPlaying ? "pause" : "play"} size={20} color={colors.onBrandPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  head: { flexDirection: ROW, justifyContent: "space-between", alignItems: "center" },
  label: { ...rtlText, fontFamily: fonts.textBold, fontSize: 14, color: colors.brandPrimary },
  meta: { ...rtlText, fontFamily: fonts.text, fontSize: 12, color: colors.muted },
  bodyRow: { flexDirection: ROW, alignItems: "center", gap: spacing.md },
  text: { ...rtlText, flex: 1, fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 44, color: colors.onSurface },
  play: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
});
