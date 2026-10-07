import { useState, type ReactNode } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@react-native-vector-icons/feather";

import { playSound } from "@/src/audio";
import { PatternHeader } from "@/src/components/PatternHeader";
import { usesNativeTabs } from "@/src/navigation";
import { enabledAdhkar, sendTestReminder, useNotifPermission } from "@/src/reminders";
import { useSettings, type Interval, type LocationResult } from "@/src/settings";
import { colors } from "@/src/theme";
import { showToast } from "@/src/toast";
import { fonts, radius, ROW, rtlText, spacing } from "@/src/ui";
import { ADHKAR } from "@/src/adhkar";

const INTERVALS: Interval[] = [15, 30, 60];

const PERM_LABEL = {
  granted: "مفعّلة",
  undetermined: "غير مفعّلة",
  denied: "مرفوضة",
  blocked: "مرفوضة من الإعدادات",
  unsupported: "غير متاحة في نسخة الويب",
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { settings, update, requestLocation } = useSettings();
  const notif = useNotifPermission();
  const [loc, setLoc] = useState<LocationResult | "loading" | null>(null);

  const toggleMaster = async (v: boolean) => {
    update({ master: v });
    if (v && (notif.state === "undetermined" || notif.state === "denied")) await notif.request();
  };

  const onLocate = async () => {
    if (loc === "blocked") return Linking.openSettings();
    setLoc("loading");
    const r = await requestLocation();
    setLoc(r);
    if (r === "granted") showToast("تم تحديث الموقع", "تم تحديث مواقيت الصلاة لمدينتك");
  };

  const onTest = async () => {
    const d = enabledAdhkar(settings)[0] ?? ADHKAR[0];
    playSound(d.id);
    const sent = await sendTestReminder(d);
    showToast(d.text, sent ? "سيصلك إشعار تجريبي خلال 5 ثوانٍ" : "تشغيل الصوت داخل التطبيق");
  };

  return (
    <View style={styles.screen} testID="settings-screen">
      <PatternHeader title="الإعدادات" subtitle="خصّص التذكير بما يناسبك" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: bottomChrome + spacing.xl }}>
        <Section title="التذكير بالأذكار">
          <Row icon="bell" title="تفعيل التذكير الدوري" sub="صوت عربي يذكّرك بالذكر بالتناوب">
            <Switch
              value={settings.master}
              onValueChange={toggleMaster}
              trackColor={{ false: colors.surfaceTertiary, true: colors.brandSecondary }}
              thumbColor={settings.master ? colors.brandPrimary : colors.muted}
              testID="settings-master-switch"
            />
          </Row>
          <View style={styles.divider} />
          <Text style={styles.label}>الفاصل الزمني</Text>
          <View style={styles.chips}>
            {INTERVALS.map((m) => {
              const sel = settings.interval === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => update({ interval: m })}
                  style={[styles.chip, sel && styles.chipSel]}
                  testID={`interval-chip-${m}`}
                >
                  <Text style={[styles.chipText, sel && { color: colors.onBrandPrimary }]}>كل {m} دقيقة</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.divider} />
          <Row icon="moon" title="إيقاف الأذكار ليلًا" sub="لا تذكير من ١١ مساءً حتى ٥ فجرًا (الأذان يبقى مفعّلًا)">
            <Switch
              value={settings.quiet}
              onValueChange={(v) => update({ quiet: v })}
              trackColor={{ false: colors.surfaceTertiary, true: colors.brandSecondary }}
              thumbColor={settings.quiet ? colors.brandPrimary : colors.muted}
              testID="settings-quiet-switch"
            />
          </Row>
        </Section>

        <Section title="الصلاة">
          <Row icon="volume-2" title="تنبيه الأذان" sub="إشعار بصوت عند دخول وقت كل صلاة">
            <Switch
              value={settings.adhan}
              onValueChange={(v) => update({ adhan: v })}
              trackColor={{ false: colors.surfaceTertiary, true: colors.brandSecondary }}
              thumbColor={settings.adhan ? colors.brandPrimary : colors.muted}
              testID="settings-adhan-switch"
            />
          </Row>
          <View style={styles.divider} />
          <Row
            icon="map-pin"
            title="الموقع"
            sub={
              loc === "blocked"
                ? "الإذن مرفوض، اسمح بالموقع من الإعدادات"
                : loc === "error"
                  ? "تعذر تحديد الموقع، حاول مجددًا"
                  : settings.locLabel
            }
          >
            <SmallBtn
              label={loc === "loading" ? "..." : loc === "blocked" ? "الإعدادات" : "تحديث"}
              onPress={onLocate}
              testID="settings-location-button"
            />
          </Row>
        </Section>

        <Section title="التنبيهات">
          <Row icon="shield" title="إذن الإشعارات" sub={PERM_LABEL[notif.state]}>
            {notif.state === "blocked" ? (
              <SmallBtn label="الإعدادات" onPress={() => Linking.openSettings()} testID="settings-notif-open-settings" />
            ) : notif.state === "undetermined" || notif.state === "denied" ? (
              <SmallBtn label="تفعيل" onPress={notif.request} testID="settings-notif-request" />
            ) : null}
          </Row>
          <View style={styles.divider} />
          <Pressable
            onPress={onTest}
            style={({ pressed }) => [styles.testBtn, pressed && { opacity: 0.85 }]}
            testID="settings-test-reminder"
          >
            <Feather name="play-circle" size={18} color={colors.onBrandPrimary} />
            <Text style={styles.testText}>تجربة التذكير الآن</Text>
          </Pressable>
        </Section>

        <View style={styles.note} testID="settings-note">
          <Feather name="info" size={16} color={colors.muted} />
          <Text style={styles.noteText}>
            {Platform.OS === "web"
              ? "في نسخة الويب يعمل التذكير والصوت فقط أثناء فتح الصفحة."
              : "يُجدَّد جدول التذكير تلقائيًا كلما فتحت التطبيق. الصوت العربي المخصص في الخلفية يعمل بعد بناء التطبيق (Build)؛ في Expo Go يُستخدم صوت الإشعار الافتراضي."}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ icon, title, sub, children }: { icon: "bell" | "volume-2" | "map-pin" | "shield" | "moon"; title: string; sub: string; children?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Feather name={icon} size={18} color={colors.brandPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub} numberOfLines={2}>{sub}</Text>
      </View>
      {children}
    </View>
  );
}

function SmallBtn({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.8 }]} testID={testID}>
      <Text style={styles.smallBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  sectionTitle: { ...rtlText, fontFamily: fonts.displayBold, fontSize: 20, color: colors.brandPrimary },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: ROW, alignItems: "center", gap: spacing.md, minHeight: 48 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { ...rtlText, fontFamily: fonts.textBold, fontSize: 15, color: colors.onSurface },
  rowSub: { ...rtlText, fontFamily: fonts.text, fontSize: 12, color: colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider },
  label: { ...rtlText, fontFamily: fonts.textMedium, fontSize: 13, color: colors.onSurfaceTertiary },
  chips: { gap: spacing.sm, flexDirection: ROW },
  chip: {
    flex: 1,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceTertiary,
  },
  chipSel: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontFamily: fonts.textMedium, fontSize: 14, color: colors.onSurfaceSecondary },
  smallBtn: {
    minHeight: 40,
    minWidth: 72,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnText: { fontFamily: fonts.textBold, fontSize: 13, color: colors.brandPrimary },
  testBtn: {
    flexDirection: ROW,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
  },
  testText: { fontFamily: fonts.textBold, fontSize: 15, color: colors.onBrandPrimary },
  note: { flexDirection: ROW, gap: spacing.sm, paddingHorizontal: spacing.sm },
  noteText: { ...rtlText, flex: 1, fontFamily: fonts.text, fontSize: 12, lineHeight: 19, color: colors.muted },
});
