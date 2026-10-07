import { useSyncExternalStore } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@react-native-vector-icons/feather";

import { colors } from "./theme";
import { alpha, fonts, radius, ROW, rtlText, spacing } from "./ui";

type Toast = { key: number; title: string; body?: string };
let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showToast(title: string, body?: string) {
  current = { key: Date.now(), title, body };
  emit();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, 5000);
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const toast = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + spacing.sm }]}>
      <Animated.View key={toast.key} entering={FadeInUp} exiting={FadeOutUp} style={styles.toast} testID="app-toast">
        <View style={styles.icon}>
          <Feather name="bell" size={18} color={colors.onBrandPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} testID="app-toast-title">{toast.title}</Text>
          {toast.body ? <Text style={styles.body}>{toast.body}</Text> : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: spacing.lg, right: spacing.lg, zIndex: 100 },
  toast: {
    flexDirection: ROW,
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: alpha(colors.surfaceSecondary, 0.97),
    borderWidth: 1,
    borderColor: colors.brandPrimary,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...rtlText, fontFamily: fonts.displayBold, fontSize: 20, color: colors.brandPrimary },
  body: { ...rtlText, fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary },
});
