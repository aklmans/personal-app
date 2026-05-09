import React from "react";
import { Text } from "react-native";
import type { StyleProp, TextStyle } from "react-native";

interface HighlightedTitleProps {
  text: string;
  query: string;
  style: StyleProp<TextStyle>;
  highlightColor: string;
  numberOfLines?: number;
}

/**
 * Renders a title string with the first occurrence of `query` tinted in
 * `highlightColor`. Falls back to a plain <Text> when query is empty or not
 * found in `text`.
 *
 * Usage:
 *   <HighlightedTitle
 *     text={post.title}
 *     query={searchQuery}
 *     style={styles.title}
 *     highlightColor={colors.primary}
 *     numberOfLines={2}
 *   />
 */
export default function HighlightedTitle({
  text,
  query,
  style,
  highlightColor,
  numberOfLines,
}: HighlightedTitleProps) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {before}
      <Text style={{ color: highlightColor }}>{match}</Text>
      {after}
    </Text>
  );
}
