---
title: Add a search bar to the history section so users can filter past reads by title
---
# Add a search bar to the history section so readers can filter past reads by title

  ## What & Why
  The bookmark section already has a `searchQuery` input that highlights matching titles via HighlightedTitle. History entries now also use HighlightedTitle, but they share the same `searchQuery` state rather than having their own. Adding a dedicated history search input lets users quickly find a past article without scrolling through potentially hundreds of entries.

  ## Done looks like
  - A text input appears above the history list (matching the bookmark search bar in style)
  - Typing filters history entries to only those whose title contains the query (case-insensitive)
  - HighlightedTitle in each history entry shows the match highlighted in `colors.primary`
  - Clearing the input restores the full history list
  - The search state is local (no persistence needed)

  ## Relevant files
  - `artifacts/mobile/app/(tabs)/more.tsx` — history list rendering, bookmarkSearch bar for reference (~line 130 for state, ~line 570 for history list)
  - `artifacts/mobile/components/HighlightedTitle.tsx` — already imported and used on history entry titles