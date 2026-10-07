import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, FlatList, Pressable, ScrollView, StyleSheet, Text, View, type ViewToken } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@react-native-vector-icons/feather";

import { playUri, stopSound, togglePause, useAudioLoading, usePaused, usePlayingId } from "@/src/audio";
import { Ornament } from "@/src/components/Ornament";
import { getReciterId, getSurah, RECITERS, saveLastRead, saveReciterId, surahAudioUrl } from "@/src/quran";
import { colors } from "@/src/theme";
import { alpha, fonts, radius, ROW, spacing, toArabicDigits } from "@/src/ui";

export default function SurahReader() {
  const { id, ayah } = useLocalSearchParams<{ id: string; ayah?: string }>();
  const n = Math.min(114, Math.max(1, Number(id) || 1));
  const surah = getSurah(n);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [reciterId, setReciterId] = useState("sudais");
  const playingId = usePlayingId();
  const loading = useAudioLoading();
  const key = `quran-${n}-${reciterId}`;
  const isMine = playingId === key;
  const pausedState = usePaused();
  const paused = isMine && pausedState;

  useEffect(() => {
    getReciterId().then(setReciterId);
    saveLastRead(n, Number(ayah) || 1);
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      stopSound();
      return false;
    });
    return () => {
      sub.remove();
      stopSound();
    };
  }, [n, ayah]);

  useEffect(() => {
    const target = Number(ayah) - 1;
    if (target > 0) {
      const t = setTimeout(() => listRef.current?.scrollToIndex({ index: target, animated: false, viewPosition: 0 }), 300);
      return () => clearTimeout(t);
    }
  }, [ayah]);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable && v.index != null);
    if (first?.index != null) saveLastRead(n, first.index + 1);
  }).current;

  const reciter = RECITERS.find((r) => r.id === reciterId) ?? RECITERS[0];
  const onPlay = () => {
    if (isMine) return togglePause();
    playUri(key, surahAudioUrl(reciter, n));
  };
  const chooseReciter = (rid: string) => {
    setReciterId(rid);
    saveReciterId(rid);
    if (playingId?.startsWith(`quran-${n}-`)) {
      const r = RECITERS.find((x) => x.id === rid)!;
      playUri(`quran-${n}-${rid}`, surahAudioUrl(r, n));
    }
  };

  return (
    <View style={styles.screen} testID="surah-reader">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="surah-back-button" hitSlop={8}>
          <Feather name="chevron-right" size={26} color={colors.brandPrimary} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.title} testID="surah-title">سُورَةُ {surah.name}</Text>
          <Text style={styles.sub}>
            {surah.type} · {toArabicDigits(String(surah.ayahs.length))} آية
          </Text>
        </View>
        <View style={styles.back} />
      </View>

      <FlatList
        ref={listRef}
        data={surah.ayahs}
        keyExtractor={(_, i) => String(i)}
        initialNumToRender={15}
        windowSize={11}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        onScrollToIndexFailed={(info) =>
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 250)
        }
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 190 + insets.bottom }}
        ListHeaderComponent={
          <View style={styles.banner}>
            <Ornament width={160} />
            {surah.basmala ? (
              <Text style={styles.basmala} testID="surah-basmala">{surah.basmala}</Text>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.ayahRow} testID={`ayah-${index + 1}`}>
            <Text style={styles.ayah}>
              {item}
              <Text style={styles.marker}>{` ﴿${toArabicDigits(String(index + 1))}﴾`}</Text>
            </Text>
          </View>
        )}
      />

      <View style={[styles.player, { paddingBottom: insets.bottom + spacing.md }]} testID="quran-player">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {RECITERS.map((r) => {
            const sel = r.id === reciterId;
            return (
              <Pressable
                key={r.id}
                onPress={() => chooseReciter(r.id)}
                style={[styles.chip, sel && styles.chipSel]}
                testID={`reciter-chip-${r.id}`}
              >
                <Text style={[styles.chipText, sel && { color: colors.onBrandPrimary }]}>{r.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.playerRow}>
          <Pressable onPress={onPlay} style={styles.playBtn} testID="quran-play-button">
            {isMine && loading ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <Feather name={isMine && !paused ? "pause" : "play"} size={24} color={colors.onBrandPrimary} />
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.playerTitle}>{isMine ? (loading ? "جارٍ التحميل..." : paused ? "متوقف مؤقتًا" : "يتلو الآن") : "استمع للسورة"}</Text>
            <Text style={styles.playerSub}>بصوت الشيخ {reciter.name}</Text>
          </View>
          {isMine ? (
            <Pressable onPress={stopSound} style={styles.stopBtn} testID="quran-stop-button" hitSlop={8}>
              <Feather name="square" size={18} color={colors.brandPrimary} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
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
  title: { fontFamily: fonts.quran, fontSize: 24, lineHeight: 44, color: colors.brandPrimary },
  sub: { fontFamily: fonts.text, fontSize: 12, color: colors.muted },
  banner: { paddingVertical: spacing.xl, gap: spacing.md, alignItems: "center" },
  basmala: { fontFamily: fonts.quran, fontSize: 26, lineHeight: 56, color: colors.brandPrimary, textAlign: "center" },
  ayahRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  ayah: {
    fontFamily: fonts.quran,
    fontSize: 26,
    lineHeight: 60,
    color: colors.onSurface,
    textAlign: "right",
    writingDirection: "rtl",
  },
  marker: { fontFamily: fonts.quran, color: colors.brandPrimary, fontSize: 22 },
  player: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    gap: spacing.md,
    backgroundColor: alpha(colors.surfaceSecondary, 0.98),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, flexDirection: ROW },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSel: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontFamily: fonts.textMedium, fontSize: 13, color: colors.onSurfaceSecondary },
  playerRow: { flexDirection: ROW, alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  playerTitle: { fontFamily: fonts.textBold, fontSize: 15, color: colors.onSurface, textAlign: "right" },
  playerSub: { fontFamily: fonts.text, fontSize: 12, color: colors.muted, textAlign: "right" },
});
