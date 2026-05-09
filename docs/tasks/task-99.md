---
title: Extend title search highlighting to history entries on the More tab
---
# Extend title search highlighting to history entries on the More tab

  ## What & Why
  The HighlightedTitle component added in Task #86 is only used in the bookmarks list. The reading history section on the More tab also shows article titles. If a future search feature is added to history entries, the same component could be reused there without any additional work.

  ## Done looks like
  - HighlightedTitle is used to render history entry titles when a history search query is active (if one is added)
  - Alternatively, HighlightedTitle is moved to a shared components file so it can be imported by any screen

  ## Relevant files
  - `artifacts/mobile/app/(tabs)/more.tsx` — HighlightedTitle definition and history entry rendering
  - Optionally: `artifacts/mobile/components/HighlightedTitle.tsx` — new shared component file