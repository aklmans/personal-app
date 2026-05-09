---
title: Show your reading stats — articles read and time spent
---
# Show your reading stats — articles read and time spent

  ## What & Why
  Readers now have a history of every article they've opened. Surfacing a simple stats summary (total articles read, estimated total reading time, top categories) gives the app a personal feel and rewards regular readers.

  ## Done looks like
  - A stats row or card appears in the More tab above or below the RECENTLY READ section
  - Shows: total unique articles read, estimated total reading time (sum of readingTime from history entries), and the most-read category
  - All computed from the `history` array in `HistoryContext` — no new storage needed
  - Bilingual (EN/zh-cn) labels

  ## Relevant files
  - `artifacts/mobile/app/(tabs)/more.tsx` — where stats UI should appear
  - `artifacts/mobile/context/HistoryContext.tsx` — `history` array with `readingTime` and `categories` per entry