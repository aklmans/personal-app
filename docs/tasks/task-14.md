---
title: Add a language label badge to each code block
---
# Add a language label badge to each code block

  ## What & Why
  After adding Prism.js syntax highlighting, code blocks now have proper token colors but no visual indicator of which language they show. A small pill/badge in the top-right corner (e.g. "go", "bash", "typescript") helps readers quickly orient to the snippet type — common in modern documentation sites.

  ## Done looks like
  - Each `pre[class*="language-"]` block shows a small language label in the top-right corner
  - The label uses the Inter sans-serif font at ~11px, muted color on our codeBg
  - Injected via the same inline script that handles Prism re-highlighting
  - Works in both light and dark mode

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — `buildHtml()` and `highlightScript` constant
  - The badge element should be injected in the same loop that rewrites Shiki blocks for Prism