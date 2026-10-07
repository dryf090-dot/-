import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@react-native-vector-icons/feather";

import { colors } from "../theme";
import { fonts, ROW, spacing } from "../ui";

// Header for stack screens (outside tabs): back on the right for RTL.
export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        style={styles.back}
        testID="screen-back-button"
        hitSlop={8}
      >
        <Feather name="chevron-right" size={26} color={colors.brandPrimary} />
      </Pressable>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: ROW,
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.ruqaa, fontSize: 26, lineHeight: 46, color: colors.brandPrimary },
  sub: { fontFamily: fonts.text, fontSize: 12, color: colors.muted },
});
