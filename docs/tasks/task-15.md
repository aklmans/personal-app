---
title: Make code blocks easier to read on small screens
---
# Make code blocks easier to read on small screens

  ## What & Why
  Long code lines in article WebViews currently overflow horizontally. The current CSS uses `overflow-x: auto` but on mobile WebViews momentum-scrolling inside a code block can be awkward. Adding horizontal scroll momentum, a subtle gradient fade on the right edge, and a minimum touch target height would improve the reading experience on phones.

  ## Done looks like
  - Horizontal code block scroll uses `-webkit-overflow-scrolling: touch` (already present) AND a visible right-edge fade gradient so users know the block is scrollable
  - Code blocks have a minimum comfortable touch height
  - Prism's wrapping/overflow styles don't conflict with the gradient approach

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — `buildHtml()` CSS section, particularly the `pre[class*="language-"]` rules