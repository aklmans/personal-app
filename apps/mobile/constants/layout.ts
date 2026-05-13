import { Platform } from "react-native";

const FLOATING_TAB_BAR_CLEARANCE =
  Platform.OS === "ios" ? 96 : Platform.OS === "web" ? 84 : 64;

export function getTabScreenBottomPadding(bottomInset: number, extra = 16) {
  return bottomInset + FLOATING_TAB_BAR_CLEARANCE + extra;
}
