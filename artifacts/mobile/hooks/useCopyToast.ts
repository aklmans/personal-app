/**
 * useCopyToast
 *
 * Encapsulates the state, animation, and timer logic for a brief "copied"
 * confirmation toast. Any screen that copies text to the clipboard can use
 * this hook instead of duplicating the same boilerplate.
 *
 * Usage:
 *   const { showCopyToast, copyToastVisible, copyToastAnim } = useCopyToast();
 *
 *   // Trigger the toast after a successful copy:
 *   await Clipboard.setStringAsync(url);
 *   showCopyToast();
 *
 *   // Render the toast in JSX (see [slug].tsx for a full example):
 *   {copyToastVisible && (
 *     <Animated.View style={[toastStyle, { opacity: copyToastAnim }]}>
 *       <Text>Link copied</Text>
 *     </Animated.View>
 *   )}
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated } from "react-native";

const TOAST_VISIBLE_MS = 2000;
const TOAST_FADE_MS = 220;

export function useCopyToast(visibleDuration = TOAST_VISIBLE_MS) {
  const [copyToastVisible, setCopyToastVisible] = useState(false);
  const copyToastAnim = useRef(new Animated.Value(0)).current;
  const copyToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCopyToast = useCallback(() => {
    if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
    copyToastAnim.stopAnimation();
    copyToastAnim.setValue(1);
    setCopyToastVisible(true);
    copyToastTimerRef.current = setTimeout(() => {
      Animated.timing(copyToastAnim, {
        toValue: 0,
        duration: TOAST_FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setCopyToastVisible(false);
      });
    }, visibleDuration);
  }, [copyToastAnim, visibleDuration]);

  useEffect(() => {
    return () => {
      if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
      copyToastAnim.stopAnimation();
    };
  }, [copyToastAnim]);

  return { showCopyToast, copyToastVisible, copyToastAnim };
}
