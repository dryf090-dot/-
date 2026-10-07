import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme";
import { alpha, fonts, rtlText, spacing } from "../ui";

const PATTERN =
  "https://images.unsplash.com/photo-1773903181852-78d3fdf1aa81?crop=entropy&cs=srgb&fm=jpg&w=1000&q=80";

export function PatternHeader({ title, subtitle, testID }: { title: string; subtitle?: string; testID?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.lg }]} testID={testID}>
      <Image source={{ uri: PATTERN }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
      <LinearGradient
        colors={[alpha(colors.surface, 0.55), alpha(colors.surface, 0.8), colors.surface]}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, overflow: "hidden" },
  title: { ...rtlText, fontFamily: fonts.ruqaa, fontSize: 36, lineHeight: 60, color: colors.brandPrimary },
  subtitle: { ...rtlText, fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceTertiary },
});
