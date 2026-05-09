---
title: Add reading progress and bookmarks so readers can pick up where they left off
---
# Add reading progress and bookmarks so readers can pick up where they left off

  ## What & Why
  Right now there's no way for a reader to mark posts as read or save them for later. Adding bookmarks and reading history would make the app much stickier and more useful for regular readers.

  ## Done looks like
  - Users can bookmark a post from the post detail screen
  - A "Reading List" section appears in the More tab showing bookmarked posts
  - Recently read posts are tracked locally (AsyncStorage) and shown on the Home screen
  - Bookmarks persist across app restarts

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — post detail screen
  - `artifacts/mobile/app/(tabs)/index.tsx` — home screen
  - `artifacts/mobile/app/(tabs)/more.tsx` (if exists) or `_layout.tsx`