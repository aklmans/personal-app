---
title: Use the shared copy toast in the bookmarks and tag screens
---
# Use the shared copy toast in the bookmarks and tag screens

  ## What & Why
  The `useCopyToast` hook was extracted so future screens can adopt it without duplicating code. The bookmarks screen and tag/series screens are likely candidates for sharing links — they should use `useCopyToast` if/when they add clipboard copy actions.

  ## Done looks like
  - Any screen that copies to the clipboard (bookmarks, tag, series, profile, etc.) imports `useCopyToast` instead of re-implementing toast state
  - No screen duplicates the animation/timer boilerplate

  ## Relevant files
  - `artifacts/mobile/hooks/useCopyToast.ts`
  - `artifacts/mobile/app/bookmarks/index.tsx`
  - `artifacts/mobile/app/tag/[tag].tsx` (if it exists)