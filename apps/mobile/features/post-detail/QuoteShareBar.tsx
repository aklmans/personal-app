import { Feather } from "@expo/vector-icons";
import { Platform, Pressable, Text, View } from "react-native";

import { fonts } from "@/constants/fonts";
import { styles } from "@/features/post-detail/postDetail.styles";

interface QuoteShareColors {
  card: string;
  border: string;
  mutedForeground: string;
  primary: string;
}

export function QuoteShareBar({
  selectedQuote,
  quoteMaxLength,
  colors,
  isZh,
  onShareQuote,
  onDismiss,
}: {
  selectedQuote: string;
  quoteMaxLength: number;
  colors: QuoteShareColors;
  isZh: boolean;
  onShareQuote: () => void;
  onDismiss: () => void;
}) {
  return (
    <View
      style={[
        styles.shareQuoteBar,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {selectedQuote.length > quoteMaxLength ? (
        <View style={styles.shareQuoteTooLong}>
          <Feather name="alert-circle" size={13} color={colors.mutedForeground} />
          <Text style={[styles.shareQuoteTooLongText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
            {isZh ? "引用过长，请选择较短的片段" : "Selection too long — try a shorter quote"}
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={onShareQuote}
          accessibilityRole="button"
          accessibilityLabel={isZh ? (Platform.OS === "web" ? "复制引用" : "分享引用") : (Platform.OS === "web" ? "Copy quote" : "Share quote")}
          style={({ pressed }) => [
            styles.shareQuoteBtn,
            { backgroundColor: pressed ? "#c05540" : colors.primary },
          ]}
        >
          <Feather name={Platform.OS === "web" ? "copy" : "share-2"} size={13} color="#ffffff" />
          <Text style={[styles.shareQuoteBtnText, { fontFamily: fonts.sans.semiBold }]}>
            {isZh ? (Platform.OS === "web" ? "复制引用" : "分享引用") : (Platform.OS === "web" ? "Copy quote" : "Share quote")}
          </Text>
        </Pressable>
      )}
      <Text
        style={[styles.shareQuotePreview, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}
        numberOfLines={1}
      >
        {selectedQuote}
      </Text>
      <Pressable
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={isZh ? "取消" : "Dismiss"}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
      >
        <Feather name="x" size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}
