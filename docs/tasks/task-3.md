---
title: Polish the reading experience with in-app article rendering
---
# Polish the reading experience with in-app article rendering

  ## What & Why
  Currently tapping a post opens the full article in the system browser via expo-web-browser. Rendering the article content natively inside the app (using react-native-webview or a markdown renderer) keeps users in the app and allows custom theming (cream background, serif font, dark mode).

  ## Done looks like
  - Post detail screen renders the full article content inside a styled WebView or Markdown view
  - Applies the app's cream/dark theme and Lora/Inter typography
  - Reading progress indicator shown in the header

  ## Relevant files
  - `artifacts/mobile/app/post/[slug].tsx` — post detail screen (add WebView)
  - `artifacts/api-server/src/routes/blog.ts` — ensure content:encoded is returned in post detail response