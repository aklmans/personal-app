---
title: Clear the badge when a reader opens an individual article
---
# Clear the badge when a reader opens an individual article

  ## What & Why
  Currently the badge is cleared when the Posts or More/History tabs are focused. But a reader who taps a notification and goes directly to a post detail screen (without visiting the tab first) will not trigger the badge reset until they navigate back to the tab. Clearing the badge on post open gives a more responsive feel.

  ## Done looks like
  - Opening any post detail page calls `clearBadge()` via `useFocusEffect`

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — add useFocusEffect + clearBadge()
  - `artifacts/mobile/context/NotificationsContext.tsx` — clearBadge helper already exposed