import { Feather } from "@expo/vector-icons";
import type { RelatedPost } from "@aklman/api-client";
import { Pressable, ScrollView, Text, View } from "react-native";

import { fonts } from "@/constants/fonts";
import { styles } from "@/features/post-detail/postDetail.styles";

interface PostMetaColors {
  border: string;
  secondary: string;
  primary: string;
  mutedForeground: string;
  card: string;
  text: string;
}

export function PostMetaSection({
  tags,
  related,
  colors,
  themeBg,
  isZh,
  onTagPress,
  onRelatedPress,
}: {
  tags: string[];
  related: RelatedPost[];
  colors: PostMetaColors;
  themeBg: string;
  isZh: boolean;
  onTagPress: (tag: string) => void;
  onRelatedPress: (slug: string) => void;
}) {
  if (tags.length === 0 && related.length === 0) return null;

  return (
    <View
      style={[
        styles.metaSection,
        { backgroundColor: themeBg, borderTopColor: colors.border },
      ]}
    >
      {tags.length > 0 && (
        <View style={styles.tagsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsScroll}
          >
            {tags.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => onTagPress(tag)}
                style={[
                  styles.tagChip,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.tagChipText,
                    { color: colors.primary, fontFamily: fonts.sans.medium },
                  ]}
                >
                  #{tag}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {related.length > 0 && (
        <View style={[styles.relatedSection, { borderTopColor: colors.border }]}>
          <Text
            style={[
              styles.relatedLabel,
              { color: colors.mutedForeground, fontFamily: fonts.sans.semiBold },
            ]}
          >
            {isZh ? "相关文章" : "RELATED POSTS"}
          </Text>
          {related.map((rp) => (
            <Pressable
              key={rp.slug}
              onPress={() => onRelatedPress(rp.slug)}
              style={({ pressed }) => [
                styles.relatedRow,
                {
                  backgroundColor: pressed ? colors.secondary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.relatedContent}>
                <Text
                  style={[
                    styles.relatedTitle,
                    { color: colors.text, fontFamily: fonts.serif.regular },
                  ]}
                  numberOfLines={2}
                >
                  {rp.title}
                </Text>
                {rp.categories.length > 0 && (
                  <Text
                    style={[
                      styles.relatedCat,
                      { color: colors.primary, fontFamily: fonts.sans.regular },
                    ]}
                  >
                    {rp.categories[0]}
                  </Text>
                )}
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
