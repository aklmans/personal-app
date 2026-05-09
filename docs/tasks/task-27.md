---
title: Add line numbers to code blocks so readers can reference specific lines
---
# Add line numbers to code blocks so readers can reference specific lines

  ## What & Why
  Code blocks now have language badges and scroll gracefully. Line numbers are the next natural reading aid for longer snippets — they let readers follow explanations like "see line 12" in the article text.

  ## Done looks like
  - Each `.code-wrapper` shows a left gutter with sequential line numbers
  - Numbers use the same Inter font at 11–12px, muted color, right-aligned in the gutter
  - Line count is derived from the raw code text (split by \n) in the same `highlightScript` loop
  - Gutter uses a fixed-width column (e.g. 36px) with a subtle right border matching ${border}
  - Single-line code blocks (no newlines) get no gutter — handled via JS check

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — `highlightScript` (JS loop), `buildHtml()` CSS section