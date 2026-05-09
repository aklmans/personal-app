---
title: Show 'Quote copied' on the native path when Share succeeds silently (no sheet shown)
---
# Show 'Quote copied' on the native path when Share succeeds silently

  ## What & Why
  On some Android configurations, Share.share() resolves without the OS sharing
  sheet appearing (e.g. direct-share targets). In this case the quote is shared
  but no feedback is given to the user. A brief toast would close the gap.

  ## Done looks like
  - handleShareQuote on native: after a successful Share.share(), show a
    "Shared!" / "已分享" toast (or reuse "Quote copied" if clipboard was used)
  - The OS sheet case (user sees native UI) may not need a toast — detect via
    Share.share() result.action if available
  - No change to the web or catch fallback paths

  ## Relevant files
  - artifacts/mobile/app/post/[slug].tsx — handleShareQuote (~line 1076)