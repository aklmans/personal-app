---
title: Show 'Quote copied' instead of 'Link copied' on the native fallback too
---
# Show 'Quote copied' instead of 'Link copied' on the native fallback too

  ## What & Why
  On native, when Share.share() succeeds the user sees the OS share sheet, so no toast is needed. But if Share.share() throws (e.g. user cancels or share is unavailable), the app silently falls back to clipboard and shows a generic toast. Now that the web path shows "Quote copied", the native fallback path should also say "Quote copied" — the message parameter support was already added to useCopyToast in Task #109.

  ## Done looks like
  - The catch block fallback inside handleShareQuote on native passes the correct "Quote copied" label the same way the web path does

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — handleShareQuote, around line 1082-1089