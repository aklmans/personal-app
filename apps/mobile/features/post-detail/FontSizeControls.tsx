import { Pressable, StyleSheet, Text, View } from "react-native";

export function FontSizeControls({
  onDecrease,
  onIncrease,
  canDecrease,
  canIncrease,
  primaryColor,
  mutedColor,
}: {
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease: boolean;
  canIncrease: boolean;
  primaryColor: string;
  mutedColor: string;
}) {
  return (
    <View style={fontCtrlStyles.row}>
      <Pressable
        onPress={onDecrease}
        disabled={!canDecrease}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        style={({ pressed }) => [
          fontCtrlStyles.btn,
          { opacity: pressed ? 0.5 : 1 },
        ]}
        accessibilityLabel="Decrease font size"
        accessibilityRole="button"
      >
        <Text style={[fontCtrlStyles.aSmall, { color: canDecrease ? primaryColor : mutedColor }]}>
          A
        </Text>
      </Pressable>
      <Pressable
        onPress={onIncrease}
        disabled={!canIncrease}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        style={({ pressed }) => [
          fontCtrlStyles.btn,
          { opacity: pressed ? 0.5 : 1 },
        ]}
        accessibilityLabel="Increase font size"
        accessibilityRole="button"
      >
        <Text style={[fontCtrlStyles.aLarge, { color: canIncrease ? primaryColor : mutedColor }]}>
          A
        </Text>
      </Pressable>
    </View>
  );
}

const fontCtrlStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 2, marginRight: 4 },
  btn: { paddingHorizontal: 6, paddingVertical: 4 },
  aSmall: { fontSize: 13, fontFamily: "Lora_400Regular", fontWeight: "600" },
  aLarge: { fontSize: 19, fontFamily: "Lora_700Bold", fontWeight: "700", lineHeight: 22 },
});
