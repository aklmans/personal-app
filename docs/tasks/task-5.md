---
title: Add syntax highlighting to code blocks in articles
---
# Add syntax highlighting to code blocks in articles

  ## What & Why
  Code blocks in articles are currently rendered in monospace font with a plain background but no language-aware color highlighting. For a developer-focused blog like aklman.com this is a significant readability gap. Adding a lightweight highlighter (e.g. Prism.js or highlight.js loaded via CDN in the WebView) would make Go, JavaScript, Python and other snippets much easier to scan.

  ## Done looks like
  - Code blocks detect the language class (e.g. `language-go`) added by the RSS/HTML content
  - Tokens are colored appropriately (keywords, strings, comments, etc.)
  - A dark theme is used in dark mode, light theme in light mode — both matching the app's palette
  - Performance: library loaded from CDN, zero impact on React Native bundle

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — buildHtml() function adds the CDN script + link tags and triggers Prism.highlightAll() after load