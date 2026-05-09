---
title: Limit quote length to keep shares readable
---
# Limit quote length to keep shares readable

  ## What & Why
  The Share Quote bar appears for any selected text including very long passages. Sharing a 2000-character excerpt creates an ugly, wall-of-text share message. Capping quote length and showing a hint when the selection is too long would guide readers toward sharing meaningful snippets.

  ## Done looks like
  - If the selected text exceeds ~300 characters, the Share Quote bar shows a "Selection too long — try a shorter quote" hint instead of the share button
  - OR: the quote is automatically truncated to 300 chars with an ellipsis before sharing
  - Threshold is a named constant so it's easy to tune

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — `selectedQuote` state, Share Quote bar JSX (around line 1539)