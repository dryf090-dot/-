// Design tokens for this app (dark "Luxe" palette from design_guidelines.json).
import { useMemo } from "react";
import { Appearance, StyleSheet } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  surface: "#0D110D",
  onSurface: "#F2F4F0",
  surfaceSecondary: "#182118",
  onSurfaceSecondary: "#D8DED5",
  surfaceTertiary: "#212C21",
  onSurfaceTertiary: "#B6C2B2",
  surfaceInverse: "#F2F4F0",
  onSurfaceInverse: "#0D110D",
  muted: "#889985",

  brand: "#C5A861",
  onBrand: "#0D110D",
  brandPrimary: "#C5A861",
  onBrandPrimary: "#0D110D",
  brandSecondary: "#34523B",
  onBrandSecondary: "#F2F4F0",
  brandTertiary: "#34523B",
  onBrandTertiary: "#C5A861",

  success: "#4CAF50",
  onSuccess: "#FFFFFF",
  warning: "#D99B41",
  onWarning: "#FFFFFF",
  error: "#CF5353",
  onError: "#FFFFFF",
  info: "#4B7A99",
  onInfo: "#FFFFFF",

  border: "#2E3D2E",
  borderStrong: "#455945",
  divider: "#1E291E",
};

export type ThemeColors = typeof dark;

export const defaultScheme = "dark" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light: dark, dark };

export const colors = dark;

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.("dark");

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  return { scheme: "dark", colors: dark };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
