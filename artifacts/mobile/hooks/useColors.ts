import { useTheme } from "@/context/ThemeContext";
import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current theme (respects user override).
 * Falls back to light palette on first render before AsyncStorage loads.
 */
export function useColors() {
  const { resolved } = useTheme();
  const palette = resolved === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
