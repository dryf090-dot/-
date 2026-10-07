import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";

import { formatTime12, type PrayerKey } from "../prayer";
import { colors } from "../theme";
import { alpha, fonts, radius, ROW, spacing } from "../ui";

type Props = { prayer: { key: PrayerKey; name: string; icon: "sunrise" | "sun" | "cloud" | "sunset" | "moon" }; time: string; active: boolean };

export function PrayerRow({ prayer, time, active }: Props) {
  return (
    <View style={[styles.row, active && styles.active]} testID={`prayer-row-${prayer.key.toLowerCase()}`}>
      <View style={[styles.icon, active && { backgroundColor: colors.brandPrimary }]}>
        <Feather name={prayer.icon} size={18} color={active ? colors.onBrandPrimary : colors.brandPrimary} />
      </View>
      <Text style={[styles.name, active && { color: colors.brandPrimary }]}>{prayer.name}</Text>
      {active ? <Text style={styles.badge}>القادمة</Text> : null}
      <Text style={[styles.time, active && { color: colors.brandPrimary }]} testID={`prayer-time-${prayer.key.toLowerCase()}`}>
        {formatTime12(time)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: ROW,
    alignItems: "center",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  active: {
    borderColor: colors.brandPrimary,
    backgroundColor: alpha(colors.brandSecondary, 0.35),
    shadowColor: colors.brandPrimary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { flex: 1, textAlign: "right", fontFamily: fonts.displayBold, fontSize: 22, color: colors.onSurface },
  badge: {
    fontFamily: fonts.textBold,
    fontSize: 11,
    color: colors.onBrandPrimary,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  time: { fontFamily: fonts.textBold, fontSize: 17, color: colors.onSurfaceSecondary, minWidth: 80, textAlign: "left" },
});
