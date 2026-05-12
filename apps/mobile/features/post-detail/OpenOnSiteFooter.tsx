import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { fonts } from "@/constants/fonts";
import { styles } from "@/features/post-detail/postDetail.styles";

export function OpenOnSiteFooter({
  bottomPad,
  backgroundColor,
  borderColor,
  primaryColor,
  isZh,
  onOpen,
}: {
  bottomPad: number;
  backgroundColor: string;
  borderColor: string;
  primaryColor: string;
  isZh: boolean;
  onOpen: () => void;
}) {
  return (
    <View
      style={[
        styles.footer,
        {
          paddingBottom: bottomPad,
          backgroundColor,
          borderTopColor: borderColor,
        },
      ]}
    >
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [
          styles.openBtn,
          { backgroundColor: pressed ? "#c05540" : primaryColor },
        ]}
      >
        <Text style={[styles.openBtnText, { fontFamily: fonts.sans.semiBold }]}>
          {isZh ? "在 aklman.com 上阅读" : "Open on aklman.com"}
        </Text>
        <Feather name="external-link" size={15} color="#ffffff" />
      </Pressable>
    </View>
  );
}
