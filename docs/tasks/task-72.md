---
title: Show which topics you can filter before you've read anything
---
# Show which topics you can filter before you've read anything

  ## What & Why
  The topics chip row in the More tab only appears when the user has browsed history or bookmarks — categories are derived from those local records. Brand-new users or users who cleared their history see nothing, making the feature invisible until after exploration.

  ## Done looks like
  - Topics for notification filtering are fetched from the API (e.g. a new GET /notifications/categories endpoint that returns a deduplicated list of all category strings from recent RSS posts)
  - The chip row shows these server-side categories on first install, even with an empty history
  - Local history/bookmarks categories are still merged in so newly-seen categories appear immediately

  ## Relevant files
  - `artifacts/api-server/src/routes/notifications.ts` — add GET /categories endpoint, build list from knownPostSlugs metadata or a cached RSS parse
  - `artifacts/mobile/app/(tabs)/more.tsx` — merge server categories into allKnownCategories memo
  - `artifacts/mobile/context/NotificationsContext.tsx` — optionally fetch and cache available categories