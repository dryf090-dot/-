import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";

import { colors } from "../theme";
import { alpha, fonts, ROW, spacing } from "../ui";

// App mark: gold crescent seal + "تذكار" in Ruq'ah calligraphy.
export function Emblem() {
  return (
    <View style={styles.row} testID="app-emblem">
      <View style={styles.seal}>
        <View style={styles.sealInner}>
          <Feather name="moon" size={18} color={colors.brandPrimary} />
        </View>
      </View>
      <Text style={styles.name}>تذكار</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: ROW, alignItems: "center", gap: spacing.sm },
  seal: {
    width: 44,
    height: 44,
    borderRadius: 12,
    transform: [{ rotate: "45deg" }],
    borderWidth: 1.5,
    borderColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: alpha(colors.surface, 0.5),
  },
  sealInner: { transform: [{ rotate: "-45deg" }] },
  name: { fontFamily: fonts.ruqaa, fontSize: 30, color: colors.brandPrimary, lineHeight: 52 },
});
