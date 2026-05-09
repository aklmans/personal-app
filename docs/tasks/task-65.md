---
title: Add your top-read category to the reading stats card
---
# Add your top-read category to the reading stats card

  ## What & Why
  The reading stats card currently shows articles read and estimated minutes. Adding the reader's most-visited category (e.g. "Tech", "Travel") as a third stat tile gives a quick personality snapshot and makes the stats feel more personal.

  ## Done looks like
  - A third tile appears in the stats card showing the category name the reader has visited most
  - Computed from `history` array: count occurrences of `entry.categories[0]` across all entries
  - Shows "—" when all entries have no categories
  - Bilingual label: "Top Category" / "最多分类"

  ## Relevant files
  - `artifacts/mobile/app/(tabs)/more.tsx` — `readingStats` useMemo and stats card JSX (~lines 116–443)