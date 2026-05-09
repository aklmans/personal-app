---
title: Show which part of an article was quoted after copying
---
# Show which part of an article was quoted after copying

  ## What & Why
  After auto-copying a selection, there is no visual highlight or marking on the article text to indicate what was just copied. A transient highlight on the selected passage would give the reader clear confirmation of exactly what landed on their clipboard.

  ## Done looks like
  - After a selection is copied, the selected text in the iframe is briefly highlighted (e.g. a yellow/amber background that fades out over ~1.5 s)
  - The highlight is injected via postMessage into the article iframe from the parent page
  - Works on web only (no native changes needed)

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — web selection message handler (~line 1260)
  - The iframe HTML template that renders article content