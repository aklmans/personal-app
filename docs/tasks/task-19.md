---
title: Save reading position so articles open where you left off
---
# Save reading position so articles open where you left off

  ## What & Why
  Readers often leave an article mid-way and return later. Currently every re-open starts at the top. Saving the scroll position per article (keyed by slug+locale) and restoring it on re-open would make the app feel significantly more polished.

  ## Done looks like
  - Scroll position (0–1 float) is saved to AsyncStorage on scroll (debounced, keyed `@aklman/scroll/<locale>:<slug>`)
  - On article open, the saved position is injected after the WebView loads via `injectJavaScript`
  - Position is cleared from storage when the reader reaches the end (progress >= 0.95) or after 30 days
  - Works in tandem with the existing scroll-tracking postMessage mechanism

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — onWebViewMessage handler, injectedJavaScript, useEffect for restore
  - `artifacts/mobile/hooks/useReadingPrefs.ts` — optional: could add a helper here or keep it local