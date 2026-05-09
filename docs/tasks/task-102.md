---
title: Add a small handle or hint so readers know the banner can be swiped
---
# Add a small handle or hint so readers know the banner can be swiped

  ## What & Why
  The swipe-to-dismiss gesture is now available but invisible — there's nothing to signal it to the reader. A subtle grip handle or a tiny "swipe to dismiss" label would make the interaction discoverable.

  ## Done looks like
  - A visual affordance (e.g. three small dots or a drag handle) is shown on the banner
  - It fades away after the first successful swipe-dismiss (stored in AsyncStorage)
  - Does not clutter the banner layout

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — resumeBanner styles, bannerPanResponder