---
title: Sort and filter bookmarks by category or date
---
# Sort and filter bookmarks by category or date

  ## What & Why
  As users collect more bookmarks, the flat list in the More tab becomes hard to navigate. Letting users sort by date added or filter by category would help them find saved articles quickly.

  ## Done looks like
  - A sort control (newest first / oldest first) above the bookmarks list
  - Optional category filter chips to show only bookmarks of a given category
  - Works entirely on the existing bookmarks array stored in BookmarksContext

  ## Relevant files
  - `artifacts/mobile/app/(tabs)/more.tsx`
  - `artifacts/mobile/context/BookmarksContext.tsx`