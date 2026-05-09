---
title: Show a toast confirmation when a link is copied in the share quote flow
---
# Show a toast confirmation when a link is copied in the share quote flow

  ## What & Why
  The share quote bar (available on native) lets readers share a highlighted quote. If clipboard access is used there in the future, it should also use the same in-app toast pattern instead of any blocking dialog, for consistency.

  ## Done looks like
  - Any clipboard copy in the share-quote flow triggers the same toast pill used in handleShare
  - No alert() calls remain anywhere in the post screen

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — `handleShareQuote` function