---
title: Remember notification preferences after reinstalling the app
---
# Remember notification preferences after reinstalling the app

  ## What & Why
  Push tokens are stored in-memory on the API server and are lost every time the server restarts. This means users who opted in to notifications will stop receiving them silently after any deploy or server restart.

  ## Done looks like
  - Push tokens are persisted to a lightweight file or database so they survive server restarts
  - The mobile app re-registers its token on launch when already opted in (to handle token rotation)
  - Stale or invalid tokens are cleaned up automatically when Expo's push API reports them as invalid

  ## Relevant files
  - `artifacts/api-server/src/routes/notifications.ts` — in-memory token store
  - `artifacts/mobile/context/NotificationsContext.tsx` — token registration on opt-in