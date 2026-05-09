---
title: Update the 'Top Category' tile label to 'Top Categories' when multiple are shown
---
# Update the 'Top Category' tile label to 'Top Categories' when multiple are shown

  ## What & Why
  The tile now shows up to three categories joined by " · " (Task #110), but the
  label still reads "Top Category" / "最多分类" in the singular. When two or three
  categories are displayed, pluralising the label ("Top Categories" / "最多分类")
  would be more accurate and less confusing to the reader.

  ## Done looks like
  - When topCategories.length > 1: label shows "Top Categories" / "最多分类"
  - When topCategories.length <= 1: label remains "Top Category" / "最多分类"
  - No layout or logic changes beyond the conditional label string

  ## Relevant files
  - artifacts/mobile/app/(tabs)/more.tsx — stats tile label (~line 570)