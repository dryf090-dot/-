// Shared tokens: fonts, spacing, radius, RTL helpers.
export const fonts = {
  display: "Amiri",
  displayBold: "Amiri-Bold",
  ruqaa: "ArefRuqaa",
  text: "Tajawal",
  textMedium: "Tajawal-Medium",
  textBold: "Tajawal-Bold",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

// Expo apps run LTR by default, so we lay out Arabic UI explicitly right-to-left.
export const ROW = "row-reverse" as const;
export const rtlText = { textAlign: "right" as const, writingDirection: "rtl" as const };

// Hex alpha helper for theme colors (e.g. alpha(colors.surface, 0.75)).
export function alpha(hex: string, a: number) {
  const v = Math.round(a * 255).toString(16).padStart(2, "0");
  return `${hex}${v}`;
}

export const toArabicDigits = (s: string) => s.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
