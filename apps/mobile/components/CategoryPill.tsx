import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

interface CategoryPillProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function CategoryPill({ label, active = false, onPress }: CategoryPillProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: active ? colors.primary : colors.secondary,
          borderColor: active ? colors.primary : colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: active ? colors.primaryForeground : colors.text,
            fontFamily: fonts.sans.medium,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  label: {
    fontSize: 13,
  },
});
