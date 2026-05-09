---
title: Let readers adjust article font size to their preference
---
# Let readers adjust article font size to their preference

  ## What & Why
  Readers have different screen sizes and eyesight preferences. A simple font-size slider or +/− buttons in the reading screen would make the app more accessible and comfortable for everyone. The preference should persist across sessions.

  ## Done looks like
  - A small A-/A+ control appears in the post detail header or a floating action
  - Tapping adjusts the WebView's root font-size (17px default, range ~14–22px)
  - Selected size is saved to AsyncStorage and restored on next open
  - Works in both light and dark mode

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — WebView source HTML, header options
  - New hook: `artifacts/mobile/hooks/useReadingPrefs.ts`