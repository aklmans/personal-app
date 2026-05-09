/**
 * useCopyToast
 *
 * Encapsulates the state, animation, and timer logic for a brief "copied"
 * confirmation toast. Any screen that copies text to the clipboard can use
 * this hook instead of duplicating the same boilerplate.
 *
 * Usage:
 *   const { showCopyToast, copyToastVisible, copyToastAnim, copyToastMessage } = useCopyToast();
 *
 *   // Trigger the toast after a successful copy (optionally pass a label):
 *   await Clipboard.setStringAsync(url);
 *   showCopyToast();               // uses the default message
 *   showCopyToast("Quote copied"); // uses a custom message
 *
 *   // Render the toast in JSX (see [slug].tsx for a full example):
 *   {copyToastVisible && (
 *     <Animated.View style={[toastStyle, { opacity: copyToastAnim }]}>
 *       <Text>{copyToastMessage}</Text>
 *     </Animated.View>
 *   )}
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated } from "react-native";

const TOAST_VISIBLE_MS = 2000;
const TOAST_FADE_MS = 220;

export function useCopyToast(visibleDuration = TOAST_VISIBLE_MS) {
  const [copyToastVisible, setCopyToastVisible] = useState(false);
  const [copyToastMessage, setCopyToastMessage] = useState("");
  const copyToastAnim = useRef(new Animated.Value(0)).current;
  const copyToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCopyToast = useCallback((message = "") => {
    if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
    copyToastAnim.stopAnimation();
    copyToastAnim.setValue(1);
    setCopyToastMessage(message);
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

  return { showCopyToast, copyToastVisible, copyToastAnim, copyToastMessage };
}
