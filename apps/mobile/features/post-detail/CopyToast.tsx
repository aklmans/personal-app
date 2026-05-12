import { Feather } from "@expo/vector-icons";
import { Animated, Text } from "react-native";

import { fonts } from "@/constants/fonts";
import { styles } from "@/features/post-detail/postDetail.styles";

export function CopyToast({
  visible,
  anim,
  message,
  isZh,
}: {
  visible: boolean;
  anim: Animated.Value;
  message?: string;
  isZh: boolean;
}) {
  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.copyToast,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
      ]}
    >
      <Feather name="check" size={14} color="#ffffff" />
      <Text style={[styles.copyToastText, { fontFamily: fonts.sans.semiBold }]}>
        {message || (isZh ? "链接已复制" : "Link copied")}
      </Text>
    </Animated.View>
  );
}
