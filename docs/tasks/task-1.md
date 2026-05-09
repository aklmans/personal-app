---
title: aklman Mobile Blog App
---
# aklman Mobile Blog App (Expo)

## What & Why
Build a native mobile reading app for the aklman.com personal blog using Expo. The app recreates the warm, editorial, and calm aesthetic of the original Astro site in a native mobile experience — optimized for reading on phones (360–430px). Content is fetched from the live aklman.com blog (RSS feed + public APIs or static JSON). This is a companion mobile reader, not a rebuild of the Astro site.

## Done looks like
- App opens to a home feed of recent posts with warm cream/terra-cotta branding
- Users can browse posts by category, tag, series, and archive
- Individual post pages render markdown/HTML content cleanly with proper code block scrolling
- Bilingual support: English and Chinese (zh-CN) content accessible via language toggle
- Search screen lets users find posts by keyword
- Navigation screen (About, Showcases, etc.) is accessible from a bottom tab or hamburger menu
- Dark/light theme toggle works correctly on mobile
- No horizontal overflow or layout breakage at any screen width
- Smooth transitions between screens

## Out of scope
- CMS / admin / content authoring
- Comments (read-only viewer only)
- Offline caching beyond React Query default caching
- Push notifications

## Steps
1. **Scaffold Expo artifact** — Create the Expo artifact and set up the project structure with tab-based navigation (Home, Posts, Search, Navigation/About).
2. **Data layer** — Fetch post data from the aklman.com RSS feed or JSON endpoints. Define TypeScript types for Post, Category, Tag, Series. Use React Query for data fetching and caching.
3. **Design tokens & theme** — Set up color tokens (warm cream background `#f7f3ed`, terra-cotta accent `#da7756`, text `#1d1b18`) for both light and dark mode. Configure serif and CJK-compatible font stack.
4. **Home screen** — Editorial hero-style layout showing recent posts. Card list with thumbnail, title, excerpt, and meta. Feels like a curated personal blog, not a news feed.
5. **Post list screens** — Screens for `/posts`, `/categories`, `/tags`, `/series`, `/archives` — single-column card list, stable thumbnail aspect ratios, natural text wrapping.
6. **Post detail screen** — Full article reading experience: title, meta, cover image, body text rendered from HTML/Markdown. Code blocks scroll horizontally. Tags, related posts at the bottom.
7. **Bilingual support** — Language toggle (EN / 中文) that switches the active locale. Fetch zh-CN post variants when available.
8. **Search screen** — Keyword input that filters posts client-side or calls a search endpoint.
9. **Static pages** — About, Showcases screens rendered from fetched content.
10. **Polish** — Smooth screen transitions, readable typography, sticky headers, theme toggle in settings or header.

## Relevant files
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/api-server/src/app.ts`