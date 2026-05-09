---
title: Show your top two or three categories, not just the first
---
# Show your top two or three categories, not just the first

  ## What & Why
  The Top Category tile currently shows only the single most-read category. Readers who read evenly across a few topics get little value from one category alone. Showing a compact ranked list (e.g. "Tech · Travel · Food") or a small podium of the top 3 would give a richer picture without needing more space.

  ## Done looks like
  - The Top Category tile value shows the top 1–3 categories separated by a middot or newline
  - If only one category exists it shows just that one (no change in appearance)
  - Still shows "—" when no entries have categories
  - Bilingual label unchanged: "Top Category" / "最多分类"

  ## Relevant files
  - `artifacts/mobile/app/(tabs)/more.tsx` — readingStats useMemo (~line 195), stats card tile (~line 554)