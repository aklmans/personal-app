import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function SkeletonCard() {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const bg = colors.muted;

  return (
    <Animated.View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.card, opacity }]}>
      <View style={[styles.image, { backgroundColor: bg }]} />
      <View style={styles.body}>
        <View style={[styles.line, styles.lineShort, { backgroundColor: bg }]} />
        <View style={[styles.line, styles.lineLong, { backgroundColor: bg }]} />
        <View style={[styles.line, styles.lineMid, { backgroundColor: bg }]} />
        <View style={[styles.line, styles.lineShort, { backgroundColor: bg, width: 80 }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  image: {
    width: "100%",
    height: 120,
  },
  body: {
    padding: 16,
    gap: 8,
  },
  line: {
    height: 12,
    borderRadius: 6,
  },
  lineShort: {
    width: 80,
    height: 10,
  },
  lineLong: {
    width: "100%",
    height: 18,
  },
  lineMid: {
    width: "75%",
  },
});
