import { Animated, StyleSheet, Text, View } from "react-native";

export function PostHeaderTitle({
  title,
  progressAnim,
  primaryColor,
  borderColor,
  textColor,
}: {
  title: string;
  progressAnim: Animated.Value;
  primaryColor: string;
  borderColor: string;
  textColor: string;
}) {
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  return (
    <View style={headerTitleStyles.wrap}>
      <Text numberOfLines={1} style={[headerTitleStyles.title, { color: textColor }]}>
        {title}
      </Text>
      <View style={[headerTitleStyles.track, { backgroundColor: borderColor }]}>
        <Animated.View
          style={[headerTitleStyles.fill, { backgroundColor: primaryColor, width: progressWidth }]}
        />
      </View>
    </View>
  );
}

const headerTitleStyles = StyleSheet.create({
  wrap: { alignItems: "center", width: "100%" },
  title: { fontSize: 16, letterSpacing: -0.2, fontFamily: "Lora_400Regular" },
  track: { height: 2, width: "80%", borderRadius: 1, marginTop: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 1 },
});
