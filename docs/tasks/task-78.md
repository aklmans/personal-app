---
title: Tint action bar icons to match the reading theme
---
# Tint action bar icons to match the reading theme

  ## What & Why
  The headerTintColor now correctly tints the back button and navigation title in the article header when Sepia or High Contrast is active. However, the custom header-right icons (bookmark, share, font-size A/A, and reading-prefs sliders) are rendered as independent Pressable components with hardcoded `colors.mutedForeground` / `colors.primary` colors. In High Contrast mode these icons become nearly invisible against the black header.

  ## Done looks like
  - The bookmark, share, sliders, and font-size icons in the article header right use `themeColors.text` (or an appropriately tinted value) instead of the raw app palette colors when a non-default color theme is active
  - The icon tint updates instantly when the reader switches theme from the prefs sheet

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — `headerRight` in the `navigation.setOptions` call (lines ~1068–1135); `PostHeaderTitle` component; `FontSizeControls` component