---
title: Show a notification badge or count on the app icon for unread posts
---
# Show a notification badge or count on the app icon for unread posts

  ## What & Why
  Readers currently receive push notification banners but the app icon shows no badge, so it's easy to miss new content once the banner is dismissed.

  ## Done looks like
  - The app icon badge count increments when a new-post notification arrives
  - Tapping the notification or opening the app clears the badge

  ## Relevant files
  - `artifacts/mobile/context/NotificationsContext.tsx` — notification handler (shouldSetBadge is currently false)
  - `artifacts/api-server/src/routes/notifications.ts` — push message payload