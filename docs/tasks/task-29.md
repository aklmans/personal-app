---
title: Remember reading preferences across articles and app restarts
---
# Remember reading preferences across articles and app restarts

  ## What & Why
  Reading preferences (font size, line spacing, content width, font family) are stored per-session in AsyncStorage and loaded on mount of the post detail screen. If the user opens a new article before preferences have loaded from AsyncStorage, the WebView may flash with default settings. A shared context or singleton hook would ensure preferences are loaded once at app startup and available immediately on any article screen.

  ## Done looks like
  - `useReadingPrefs` is lifted into a React context provider mounted at the root layout level (`artifacts/mobile/app/_layout.tsx`)
  - The post screen consumes the context rather than re-loading preferences from AsyncStorage on every article
  - No flicker of default settings when opening articles

  ## Relevant files
  - `artifacts/mobile/hooks/useReadingPrefs.ts`
  - `artifacts/mobile/app/post/[slug].tsx`
  - `artifacts/mobile/app/_layout.tsx`