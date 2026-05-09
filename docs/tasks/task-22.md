---
title: Show your reading stats — articles read and time spent
---
# Show your reading stats — articles read and time spent

  ## What & Why
  The app now records every article the user reads. Surfacing those stats (total articles read, estimated total reading time) in the More tab gives readers a sense of accomplishment and makes the history feature feel more purposeful.

  ## Done looks like
  - A "Reading Stats" row in the More tab (above or below RECENTLY READ) shows:
    - Total number of unique articles read (from HistoryContext length)
    - Estimated total reading time in minutes (sum of readingTime fields)
  - Updates automatically as new articles are read
  - Bilingual EN / 中文 labels

  ## Relevant files
  - `artifacts/mobile/app/(tabs)/more.tsx` — More tab UI
  - `artifacts/mobile/context/HistoryContext.tsx` — history array with readingTime per entry