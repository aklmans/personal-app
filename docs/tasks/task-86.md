---
title: Highlight matched text in bookmark titles when searching
---
# Highlight matched text in bookmark titles when searching

  ## What & Why
  The search box filters bookmarks by title, but the matching substring is not highlighted in the results. Bolding or colour-tinting the matched portion helps readers quickly spot why each result was returned, especially with partial queries.

  ## Done looks like
  - When searchQuery is non-empty, each bookmark title in the list renders the matched substring in a distinct color (e.g. colors.primary) or bold weight while surrounding text stays at normal weight/color
  - The highlight updates live as the reader types
  - Falls back to plain title rendering when searchQuery is empty (no extra work)

  ## Relevant files
  - `artifacts/mobile/app/(tabs)/more.tsx` — bookmark list rendering (the `displayedBookmarks.map` block), bookmark title Text element