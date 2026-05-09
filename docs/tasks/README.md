# Task archive

These markdown files are a historical record of the discrete tasks that shaped
this app. **They are not a TODO list.** Every task represented here has already
been implemented in the codebase — the files are kept as decision/intent
documentation: each one captures the *what* and *why* behind a change so you
can read back the reasoning later without spelunking through commits.

The canonical project overview lives in `aklman-mobile-blog.md` — the rest are
individual `task-<N>.md` files keyed by the original task number assigned when
the work was planned.

## Status verification

As of the most recent audit, all 53 individual tasks plus the project ToC are
implemented:

- **47 tasks** have an explicit `Task #<N>:` (or `task-<N>` / `(task #<N>)`)
  reference in the git log. Run `git log --reflog --grep '<task-number>'` to
  see the corresponding commits.
- **6 tasks** were implemented but the commits did not reference the task
  number directly. They were verified by inspecting the "Done looks like"
  criteria against the current source:

  | Task | Verified by |
  | ---- | ----------- |
  | #3   | `react-native-webview` is imported and rendered in `artifacts/mobile/app/post/[slug].tsx` (no longer routes through `expo-web-browser`) |
  | #31  | `artifacts/api-server/src/routes/blog.ts` reconciles disk-cache entries against the live sitemap on each refresh |
  | #39  | `TokenRecord` carries a `locale` field and `pollAndNotify` filters by locale (landed under the renumbered `Task #26` commit) |
  | #72  | `GET /categories` exists in both `artifacts/api-server/src/routes/notifications.ts` and `artifacts/api-server/src/routes/blog.ts` |
  | #88  | `artifacts/mobile/hooks/useCopyToast.ts` exists and is consumed across screens |
  | #140 | `handleShareQuote` in `artifacts/mobile/app/post/[slug].tsx` shows "Quote copied" on the native fallback path |

- **1 task (#111)** is a conditional follow-up: "use `useCopyToast` *if/when*
  bookmarks or tag screens add clipboard copy actions." Those screens currently
  don't perform clipboard operations, so the task is not actionable. It will
  apply automatically the next time someone adds a copy action to those
  screens.

## Conventions in each file

```yaml
---
title: <one-line summary>
---
# <heading>
## What & Why     ← motivation
## Done looks like ← acceptance criteria
## Relevant files ← code paths touched / reviewed
```

Some older files omit the frontmatter; the body sections are consistent
throughout.
