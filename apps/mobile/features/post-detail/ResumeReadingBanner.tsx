import { Feather } from "@expo/vector-icons";
import type { GestureResponderHandlers } from "react-native";
import { Animated, Pressable, Text, View } from "react-native";

import { fonts } from "@/constants/fonts";
import { styles } from "@/features/post-detail/postDetail.styles";

interface ResumeBannerColors {
  bg: string;
  text: string;
}

export function ResumeReadingBanner({
  panHandlers,
  themeColors,
  bannerAnim,
  bannerSwipeDx,
  bannerSwipeDy,
  showSwipeHint,
  swipeHintAnim,
  isZh,
  onResume,
  onDismiss,
}: {
  panHandlers: GestureResponderHandlers;
  themeColors: ResumeBannerColors;
  bannerAnim: Animated.Value;
  bannerSwipeDx: Animated.Value;
  bannerSwipeDy: Animated.Value;
  showSwipeHint: boolean;
  swipeHintAnim: Animated.Value;
  isZh: boolean;
  onResume: () => void;
  onDismiss: () => void;
}) {
  return (
    <Animated.View
      {...panHandlers}
      style={[
        styles.resumeBanner,
        {
          backgroundColor: themeColors.bg,
          borderColor: `${themeColors.text}30`,
          marginHorizontal: 16,
          marginBottom: 8,
          opacity: bannerAnim,
          transform: [
            { translateX: bannerSwipeDx },
            {
              translateY: Animated.add(
                bannerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 0],
                }),
                bannerSwipeDy,
              ),
            },
          ],
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable
          onPress={onResume}
          accessibilityRole="button"
          accessibilityLabel={isZh ? "从上次阅读处继续" : "Resume from where you left off"}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", flex: 1, opacity: pressed ? 0.75 : 1 })}
        >
          <Feather name="bookmark" size={14} color={themeColors.text} style={{ marginRight: 6 }} />
          <Text style={[styles.resumeBannerText, { fontFamily: fonts.sans.semiBold, color: themeColors.text }]}>
            {isZh ? "从上次阅读处继续" : "Resume from where you left off"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={isZh ? "关闭" : "Dismiss"}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginLeft: 8 })}
        >
          <Feather name="x" size={14} color={`${themeColors.text}CC`} />
        </Pressable>
      </View>
      {showSwipeHint && (
        <Animated.View style={[styles.swipeHintHandle, { backgroundColor: `${themeColors.text}30`, opacity: swipeHintAnim }]} />
      )}
    </Animated.View>
  );
}
