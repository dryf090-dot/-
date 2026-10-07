import { StyleSheet, View } from "react-native";

import { colors } from "../theme";
import { spacing } from "../ui";

// Small gold divider: line ◆ line
export function Ornament({ width = 120 }: { width?: number }) {
  return (
    <View style={[styles.row, { width }]}>
      <View style={styles.line} />
      <View style={styles.diamond} />
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "center" },
  line: { flex: 1, height: 1, backgroundColor: colors.brandPrimary, opacity: 0.6 },
  diamond: { width: 8, height: 8, backgroundColor: colors.brandPrimary, transform: [{ rotate: "45deg" }] },
});
