---
title: Apply the chosen color theme to the article header and footer bar too
---
# Apply the chosen color theme to the article header and footer bar too

  ## What & Why
  Choosing Sepia or High Contrast changes only the WebView content area. The surrounding native header and "Open on aklman.com" footer still show the app's default background, creating a visible mismatch. Tinting those native surfaces would make the reading experience feel fully immersive.

  ## Done looks like
  - The native `backgroundColor` of the root View and footer bar reacts to `colorTheme`
  - Sepia uses `#f5ede0`, High Contrast uses `#000000`, Default uses `colors.background`

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — root View style, footer View style
  - `artifacts/mobile/hooks/useReadingPrefs.ts` — `resolveThemeColors` is already defined in slug.tsx and could be moved to the hook or a shared util