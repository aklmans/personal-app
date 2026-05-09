---
title: Add a search box to quickly find a bookmarked article by title
---
# Add a search box to quickly find a bookmarked article by title

  ## What & Why
  With many bookmarks and a category filter in place, a simple text search within bookmarks would let readers jump straight to the article they're thinking of without scrolling through the list.

  ## Done looks like
  - A small search input appears above the bookmarks list (visible only when bookmarks.length > 0)
  - Typing filters `displayedBookmarks` by title (case-insensitive substring match)
  - Search works in combination with the existing category chips and sort order
  - Clears automatically when the user navigates away

  ## Relevant files
  - `artifacts/mobile/app/(tabs)/more.tsx` — add `searchQuery` state and filter logic inside `displayedBookmarks` useMemo