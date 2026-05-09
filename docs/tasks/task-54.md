---
title: Keep the 'Resume reading' banner from covering content while scrolling
---
# Keep the 'Resume reading' banner from covering content while scrolling

  ## What & Why
  The resume banner is fixed in the layout and may visually overlap or crowd the WebView content area on smaller screens. Auto-hiding the banner after a few seconds (with the same fade/slide-down exit animation already in place) would keep the reading experience uncluttered without requiring the reader to manually dismiss it.

  ## Done looks like
  - Banner auto-dismisses after ~5 seconds using the existing dismissBanner animation
  - Timer is cancelled immediately if the user taps "Resume" or the X button first
  - Optional: briefly pause the timer while the app is backgrounded

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — dismissBanner, bannerVisible, useEffect