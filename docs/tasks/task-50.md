---
title: Remember scroll position for web readers too
---
# Remember scroll position for web readers too

  ## What & Why
  The resume-reading banner and scroll position save/restore are guarded with `Platform.OS !== "web"`. Web readers who revisit an article through the browser preview get no such experience.

  ## Done looks like
  - `loadScrollPos` / `saveScrollPos` called for the web iframe path
  - Banner shown on web when a saved position exists
  - Iframe `contentWindow.scrollTo` used (or a postMessage bridge) to restore the position

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — Platform.OS checks around scroll save/restore and banner render