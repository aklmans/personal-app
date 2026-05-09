---
title: Let readers control which topics trigger a notification
---
# Let readers control which topics trigger a notification

  ## What & Why
  Right now, opting in means getting notified about every new post. Readers with specific interests (e.g. only "Programming" or "Travel") will get noise for posts outside their interests. Per-category notification preferences give readers control and improve engagement.

  ## Done looks like
  - More tab lets readers choose categories/tags they want notifications for (multi-select list, shown after enabling notifications)
  - Selected categories are stored in AsyncStorage and sent to the server with each token registration
  - Server filters new posts by category before sending push messages to a given token
  - Empty selection = notify for all (current behavior, default)

  ## Relevant files
  - `artifacts/mobile/context/NotificationsContext.tsx` — `enable`, `registerToken`
  - `artifacts/mobile/app/(tabs)/more.tsx` — notification settings UI
  - `artifacts/api-server/src/routes/notifications.ts` — token store, `pollAndNotify`