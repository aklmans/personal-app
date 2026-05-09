---
title: Notify readers only in their preferred language
---
# Notify readers only in their preferred language

  ## What & Why
  Push notifications are currently sent to all registered tokens for every new post, regardless of language. A user who reads in English will get notified about new Chinese-language posts and vice versa. Pairing each token with the user's locale preference means notifications are only sent when a new post appears in the language the reader actually uses.

  ## Done looks like
  - Token registration payload includes a `locale` field ("en" or "zh-cn")
  - Server stores tokens as `{ token, locale }` pairs instead of a flat string set
  - `pollAndNotify` only sends to tokens whose stored locale matches the new post's locale
  - Existing tokens without a locale default to "en" for backwards compatibility

  ## Relevant files
  - `artifacts/api-server/src/routes/notifications.ts` — token store, `sendExpoPushNotifications`, `pollAndNotify`
  - `artifacts/mobile/context/NotificationsContext.tsx` — `registerToken`, `enable` (token registration payload)
  - `artifacts/api-server/data/push-tokens.json` — persisted token file (schema change needed)