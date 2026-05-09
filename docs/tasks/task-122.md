---
title: Persist the history search query across tab switches
---
# Persist the history search query across tab switches

  ## What & Why
  The historyQuery state is currently cleared whenever the More tab loses focus (in useFocusEffect cleanup). For longer search sessions — especially on devices where switching tabs is common — it would be better to preserve the query so the user can switch to an article and return to the same filtered list.

  ## Done looks like
  - historyQuery is NOT cleared when the tab loses focus (remove setHistoryQuery("") from the cleanup)
  - A visible "clear" button or the existing X button reliably resets it when the user is done
  - Optionally: clear historyQuery only when the user explicitly clears it or pulls to refresh

  ## Relevant files
  - `artifacts/mobile/app/(tabs)/more.tsx` — useFocusEffect cleanup (~line 144), historyQuery state