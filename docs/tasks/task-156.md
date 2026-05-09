---
title: Make the quote highlight fade match the reading theme on all platforms
---
# Make the quote highlight fade match the reading theme on all platforms

  ## What & Why
  The quote highlight animation fades out using a hardcoded transparent color. In sepia or high-contrast themes the fade-out transition still targets 'transparent', which can cause a visible flash as the intermediate color doesn't match the page background. Using the theme background color for the fade-out endpoint would make the animation seamless in all themes.

  ## Done looks like
  - The highlight span's fade-out transition end color matches the active reading theme background
  - No visible color artifacts during the fade in sepia or high-contrast mode

  ## Relevant files
  - artifacts/mobile/app/post/[slug].tsx — buildHtml() highlight message handler (~line 944)
  - artifacts/mobile/app/post/[slug].tsx — injectQuoteHighlight (~line 1086)