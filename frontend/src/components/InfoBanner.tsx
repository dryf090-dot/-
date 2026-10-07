import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";

import { colors } from "../theme";
import { fonts, radius, ROW, rtlText, spacing } from "../ui";

type Props = {
  icon: "bell" | "map-pin" | "alert-circle";
  title: string;
  body: string;
  action?: string;
  onPress?: () => void;
  testID: string;
};

export function InfoBanner({ icon, title, body, action, onPress, testID }: Props) {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Feather name={icon} size={18} color={colors.brandPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
      </View>
      {action ? (
        <Pressable
          onPress={onPress}
          testID={`${testID}-action`}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
        >
          <Text style={styles.btnText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: ROW, gap: spacing.md, alignItems: "flex-start" },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...rtlText, fontFamily: fonts.textBold, fontSize: 15, color: colors.onSurface },
  body: { ...rtlText, fontFamily: fonts.text, fontSize: 13, lineHeight: 20, color: colors.onSurfaceTertiary, marginTop: 2 },
  btn: {
    alignSelf: "flex-end",
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontFamily: fonts.textBold, fontSize: 14, color: colors.onBrandPrimary },
});
