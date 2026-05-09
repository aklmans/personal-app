---
title: Make the 'Link copied' toast work across all screens that copy to clipboard
---
# Make the 'Link copied' toast work across all screens that copy to clipboard

  ## What & Why
  The copy-confirmation toast is currently implemented inline inside the post detail screen. Other screens (e.g. bookmark lists, search results) may also copy links or text without any feedback. A shared toast component or hook would give every screen the same polished experience without duplicating code.

  ## Done looks like
  - A reusable toast hook or component exists (e.g. `hooks/useCopyToast.ts` or `components/CopyToast.tsx`)
  - All screens that write to clipboard call this shared utility instead of implementing their own
  - The post detail screen is refactored to use the shared version

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — current inline implementation (lines ~949–1012, 1742–1754, styles ~1862–1882)
  - Any other screen files that call `navigator.clipboard.writeText` or similar