---
title: Reset the progress bar when the reader opens a new article
---
# Reset the progress bar when the reader opens a new article

  ## What & Why
  progressAnim is a single ref-stable Animated.Value. When navigating from one article to another, the bar may briefly show the previous article's progress before the new scroll handler fires its first update. Resetting progressAnim to 0 when the slug/post changes would prevent this flash.

  ## Done looks like
  - Progress bar starts at 0% every time a new article is opened
  - No leftover progress from the previous article is shown

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — progressAnim declaration and the useEffect blocks that depend on post/slug