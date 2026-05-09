---
title: Expand reading preferences: line spacing and text width controls
---
# Expand reading preferences: line spacing and text width controls

  ## What & Why
  Font size (Task #6) is the first reading preference. Readers also benefit from control over line height (comfortable vs. compact) and content width (narrow column for long-form reading vs. full width). These are the next logical steps in a reader customization panel and should reuse the `useReadingPrefs` hook.

  ## Done looks like
  - A gear/sliders icon in the post header opens a bottom sheet with controls:
    - Line spacing: 3 presets (compact 1.6 / default 1.85 / relaxed 2.1)
    - Content width: 2 presets (narrow 680px max-width / full width)
  - Both preferences are saved to AsyncStorage and injected into the WebView via injectJavaScript (same pattern as font size, no reload)
  - Preferences persist across sessions

  ## Relevant files
  - `artifacts/mobile/hooks/useReadingPrefs.ts` — extend with lineSpacing and contentWidth fields
  - `artifacts/mobile/app/post/[slug].tsx` — inject CSS via webViewRef.injectJavaScript on prefs change