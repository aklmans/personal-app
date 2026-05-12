import { Feather } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import type { PostData } from "@/components/PostCard";
import { FontSizeControls } from "@/features/post-detail/FontSizeControls";

export function PostHeaderActions({
  post,
  isBookmarked,
  toggleBookmark,
  onOpenReadingPrefs,
  onShare,
  decrease,
  increase,
  canDecrease,
  canIncrease,
  primaryColor,
  textColor,
  mutedColor,
}: {
  post: PostData | null;
  isBookmarked: (slug: string, locale: string) => boolean;
  toggleBookmark: (post: PostData) => void;
  onOpenReadingPrefs: () => void;
  onShare: () => void;
  decrease: () => void;
  increase: () => void;
  canDecrease: boolean;
  canIncrease: boolean;
  primaryColor: string;
  textColor: string;
  mutedColor: string;
}) {
  const bookmarked = post ? isBookmarked(post.slug, post.locale) : false;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Pressable
        onPress={onOpenReadingPrefs}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        style={({ pressed }) => ({
          opacity: pressed ? 0.5 : 1,
          paddingHorizontal: 6,
          paddingVertical: 4,
        })}
        accessibilityLabel="Reading preferences"
        accessibilityRole="button"
      >
        <Feather name="sliders" size={18} color={textColor} />
      </Pressable>
      {post && (
        <Pressable
          onPress={() => {
            if (!post) return;
            toggleBookmark({
              slug: post.slug,
              title: post.title,
              description: post.description,
              pubDate: post.pubDate,
              link: post.link,
              coverImage: post.coverImage,
              categories: post.categories,
              readingTime: post.readingTime,
              locale: post.locale,
            });
          }}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: 6, paddingVertical: 4 })}
          accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark article"}
          accessibilityRole="button"
        >
          <Feather
            name="bookmark"
            size={20}
            color={bookmarked ? primaryColor : mutedColor}
          />
        </Pressable>
      )}
      <FontSizeControls
        onDecrease={decrease}
        onIncrease={increase}
        canDecrease={canDecrease}
        canIncrease={canIncrease}
        primaryColor={primaryColor}
        mutedColor={mutedColor}
      />
      {post && (
        <Pressable
          onPress={onShare}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: 6, paddingVertical: 4 })}
          accessibilityLabel="Share article"
          accessibilityRole="button"
        >
          <Feather name="share-2" size={20} color={textColor} />
        </Pressable>
      )}
    </View>
  );
}
