import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@react-native-vector-icons/feather";

import { PatternHeader } from "@/src/components/PatternHeader";
import { usesNativeTabs } from "@/src/navigation";
import { getLastRead, getSurahs, normalizeArabic, TANZIL_CREDIT, type Surah } from "@/src/quran";
import { colors } from "@/src/theme";
import { fonts, radius, ROW, rtlText, spacing, toArabicDigits } from "@/src/ui";

export default function QuranScreen() {
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const router = useRouter();
  const [q, setQ] = useState("");
  const [last, setLast] = useState<{ surah: number; ayah: number } | null>(null);
  const surahs = getSurahs();

  useFocusEffect(
    useCallback(() => {
      getLastRead().then(setLast);
    }, []),
  );

  const list = useMemo(() => {
    const nq = normalizeArabic(q);
    if (!nq) return surahs;
    return surahs.filter((s) => normalizeArabic(s.name).includes(nq) || String(s.n) === nq || s.en.toLowerCase().includes(nq.toLowerCase()));
  }, [q, surahs]);

  const open = (n: number, ayah?: number) =>
    router.push({ pathname: "/surah/[id]", params: { id: String(n), ...(ayah ? { ayah: String(ayah) } : {}) } });

  return (
    <View style={styles.screen} testID="quran-screen">
      <PatternHeader title="القرآن الكريم" subtitle="١١٤ سورة · ٦٢٣٦ آية · برواية حفص عن عاصم" />
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="ابحث باسم السورة أو رقمها"
            placeholderTextColor={colors.muted}
            style={styles.input}
            testID="quran-search-input"
            returnKeyType="search"
          />
          {q ? (
            <Pressable onPress={() => setQ("")} hitSlop={12} testID="quran-search-clear">
              <Feather name="x" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <FlatList
        data={list}
        keyExtractor={(s) => String(s.n)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={20}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: bottomChrome + spacing.xl }}
        ListHeaderComponent={
          last && !q ? (
            <Pressable onPress={() => open(last.surah, last.ayah)} style={styles.resume} testID="quran-continue-reading">
              <Feather name="bookmark" size={20} color={colors.onBrandPrimary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.resumeLabel}>متابعة القراءة</Text>
                <Text style={styles.resumeName}>
                  سورة {surahs[last.surah - 1]?.name} · الآية {toArabicDigits(String(last.ayah))}
                </Text>
              </View>
              <Feather name="chevron-left" size={22} color={colors.onBrandPrimary} />
            </Pressable>
          ) : null
        }
        ListEmptyComponent={<Text style={styles.empty}>لا توجد سورة بهذا الاسم</Text>}
        ListFooterComponent={<Text style={styles.credit}>{TANZIL_CREDIT}</Text>}
        renderItem={({ item }) => <SurahRow s={item} onPress={() => open(item.n)} />}
      />
    </View>
  );
}

function SurahRow({ s, onPress }: { s: Surah; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceTertiary }]}
      testID={`surah-row-${s.n}`}
    >
      <View style={styles.num}>
        <Text style={styles.numText}>{toArabicDigits(String(s.n))}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>سُورَةُ {s.name}</Text>
        <Text style={styles.meta}>
          {s.type} · {toArabicDigits(String(s.ayahs.length))} آية
        </Text>
      </View>
      <Text style={styles.en}>{s.en}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  search: {
    flexDirection: ROW,
    alignItems: "center",
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { ...rtlText, flex: 1, height: 48, fontFamily: fonts.text, fontSize: 15, color: colors.onSurface },
  resume: {
    flexDirection: ROW,
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPrimary,
    marginBottom: spacing.sm,
  },
  resumeLabel: { ...rtlText, fontFamily: fonts.textMedium, fontSize: 12, color: colors.onBrandPrimary },
  resumeName: { ...rtlText, fontFamily: fonts.displayBold, fontSize: 20, color: colors.onBrandPrimary },
  row: {
    flexDirection: ROW,
    alignItems: "center",
    gap: spacing.md,
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  num: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
    borderRadius: 8,
    transform: [{ rotate: "45deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { transform: [{ rotate: "-45deg" }], fontFamily: fonts.textBold, fontSize: 14, color: colors.brandPrimary },
  name: { ...rtlText, fontFamily: fonts.quran, fontSize: 22, lineHeight: 40, color: colors.onSurface },
  meta: { ...rtlText, fontFamily: fonts.text, fontSize: 12, color: colors.muted },
  en: { fontFamily: fonts.text, fontSize: 12, color: colors.muted },
  empty: { ...rtlText, fontFamily: fonts.text, fontSize: 14, color: colors.muted, padding: spacing.xl, textAlign: "center" },
  credit: { fontFamily: fonts.text, fontSize: 11, color: colors.muted, textAlign: "center", marginTop: spacing.lg, lineHeight: 18 },
});
