---
title: Show a 'copied' confirmation when sharing a quote on web too
---
# Show a 'copied' confirmation when sharing a quote on web too

  ## What & Why
  The share-quote flow (long-press selected text) also copies to clipboard on web, but it uses a separate toast path. Unifying both flows ensures the "Link copied!" / quote-copied toast appears consistently everywhere clipboard writes happen.

  ## Done looks like
  - Copying a selected quote on web triggers the same in-app toast (or an equivalent one saying "Quote copied!")
  - No silent clipboard writes remain on web

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — `handleShareQuote` around line 980
  - The existing `showCopyToast` / `copyToast` infrastructure can be reused directly