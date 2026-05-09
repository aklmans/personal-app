---
title: Show a brief status message when notification registration updates after a language switch
---
# Show a brief status message when notification registration updates after a language switch

  ## What & Why
  When a reader switches language and is opted in to notifications, the app silently re-registers in the background. A short toast (e.g. "Notifications updated for English") would reassure users their preference took effect.

  ## Done looks like
  - A toast or snackbar appears briefly after a successful locale-change re-registration
  - It is dismissible and disappears automatically
  - No toast appears if the registration fails silently

  ## Relevant files
  - `artifacts/mobile/context/NotificationsContext.tsx` — locale-change `useEffect`
  - Any existing toast/snackbar utility in `artifacts/mobile/`