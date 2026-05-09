---
title: Show a reading history of recently visited articles
---
# Show a reading history of recently visited articles

  ## What & Why
  Users have bookmarks to save articles for later, but no way to see what they've already read. A reading history section would let users quickly get back to articles they browsed recently, complementing the bookmarks feature.

  ## Done looks like
  - Visiting a post detail screen automatically records it in local history (AsyncStorage)
  - A "Recently Read" section appears in the More tab (or a dedicated screen), listing the last N visited articles
  - History entries show title, category, and date visited
  - Users can clear their history

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` (record visit on load)
  - `artifacts/mobile/context/` (new HistoryContext.tsx)
  - `artifacts/mobile/app/(tabs)/more.tsx` (display history section)
  - `artifacts/mobile/app/_layout.tsx` (wire in HistoryProvider)