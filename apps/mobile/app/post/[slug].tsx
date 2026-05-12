import { Feather } from "@expo/vector-icons";
import { useGetBlogPost, queryOpts } from "@aklman/api-client";
import type { RelatedPost } from "@aklman/api-client";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  PanResponder,
  Platform,
  Share,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";

import { fonts } from "@/constants/fonts";
import { useBookmarks } from "@/context/BookmarksContext";
import { useHistory } from "@/context/HistoryContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useReadingPrefs } from "@/hooks/useReadingPrefs";
import { useCopyToast } from "@/hooks/useCopyToast";
import {
  buildHtml,
  buildInjectedJS,
  resolveHighlightColor,
  resolveLinkColor,
  resolveThemeColors,
} from "@/features/post-detail/postHtml";
import { CopyToast } from "@/features/post-detail/CopyToast";
import { OpenOnSiteFooter } from "@/features/post-detail/OpenOnSiteFooter";
import { styles } from "@/features/post-detail/postDetail.styles";
import { PostHeaderActions } from "@/features/post-detail/PostHeaderActions";
import { PostHeaderTitle } from "@/features/post-detail/PostHeaderTitle";
import { PostMetaSection } from "@/features/post-detail/PostMetaSection";
import { QuoteShareBar } from "@/features/post-detail/QuoteShareBar";
import { ReadingPrefsSheet } from "@/features/post-detail/ReadingPrefsSheet";
import { ResumeReadingBanner } from "@/features/post-detail/ResumeReadingBanner";
import {
  SCROLL_KEY_PREFIX,
  SWIPE_HINT_KEY,
  clearScrollPos,
  loadScrollPos,
  saveScrollPos,
} from "@/features/post-detail/scrollPosition";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PostWithContent {
  slug: string;
  title: string;
  description: string;
  pubDate: string;
  link: string;
  coverImage?: string | null;
  categories: string[];
  tags: string[];
  readingTime?: number | null;
  content?: string | null;
  locale: string;
  series?: string | null;
  seriesSlug?: string | null;
  related?: RelatedPost[];
}

const QUOTE_MAX_LENGTH = 300;
const QUOTE_MIN_AUTO_COPY_LENGTH = 20;

export default function PostDetailScreen() {
  const colors = useColors();
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const { slug, locale } = useLocalSearchParams<{
    slug: string;
    locale: string;
  }>();
  const { isZh } = useLanguage();
  const {
    fontSize, canIncrease, canDecrease, increase, decrease,
    lineSpacing, setLineSpacing, contentWidth, setContentWidth,
    fontFamily, setFontFamily, hydrated,
    colorTheme, setColorTheme,
    accentColor, setAccentColor,
  } = useReadingPrefs();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [resumeBannerPos, setResumeBannerPos] = useState<number | null>(null);
  const [selectedQuote, setSelectedQuote] = useState("");
  const [bannerVisible, setBannerVisible] = useState(false);
  const { showCopyToast, copyToastVisible, copyToastAnim, copyToastMessage } = useCopyToast();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { recordVisit } = useHistory();
  const { clearBadge } = useNotifications();

  useFocusEffect(useCallback(() => { clearBadge(); }, [clearBadge]));

  const safeLocale = (locale === "zh-cn" ? "zh-cn" : "en") as "en" | "zh-cn";

  const progressAnim = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeScrollHandlerRef = useRef<(() => void) | null>(null);
  const iframeContentWindowRef = useRef<Window | null>(null);
  const recordedKeyRef = useRef<string | null>(null);
  const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredKeyRef = useRef<string | null>(null);
  const lastScrollPosRef = useRef<number>(0);
  const isRestoringRef = useRef(false);
  const resumeBannerPosRef = useRef<number | null>(null);
  const dismissBannerRef = useRef<() => void>(() => {});
  const markHintSeenRef = useRef<() => void>(() => {});
  const isDismissingBannerRef = useRef(false);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerSwipeDy = useRef(new Animated.Value(0)).current;
  const bannerSwipeDx = useRef(new Animated.Value(0)).current;
  const bannerSwipeDirectionRef = useRef<"h" | "v" | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const swipeHintAnim = useRef(new Animated.Value(0)).current;
  const bannerPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => {
        return Math.abs(gs.dx) > 5 || gs.dy > 5;
      },
      onPanResponderGrant: () => {
        bannerSwipeDirectionRef.current = null;
      },
      onPanResponderMove: (_, gs) => {
        const adx = Math.abs(gs.dx);
        const ady = Math.abs(gs.dy);
        if (!bannerSwipeDirectionRef.current && (adx > 5 || ady > 5)) {
          bannerSwipeDirectionRef.current = adx > ady ? "h" : "v";
        }
        if (bannerSwipeDirectionRef.current === "h") {
          bannerSwipeDx.setValue(gs.dx);
          bannerSwipeDy.setValue(0);
        } else if (bannerSwipeDirectionRef.current === "v") {
          bannerSwipeDy.setValue(Math.max(0, gs.dy));
          bannerSwipeDx.setValue(0);
        }
      },
      onPanResponderRelease: (_, gs) => {
        const dir = bannerSwipeDirectionRef.current;
        bannerSwipeDirectionRef.current = null;
        if (dir === "h" && Math.abs(gs.dx) >= 80) {
          markHintSeenRef.current();
          dismissBannerRef.current();
        } else if (dir === "v" && gs.dy >= 60) {
          markHintSeenRef.current();
          dismissBannerRef.current();
        } else {
          Animated.parallel([
            Animated.spring(bannerSwipeDy, {
              toValue: 0,
              useNativeDriver: true,
              tension: 80,
              friction: 10,
            }),
            Animated.spring(bannerSwipeDx, {
              toValue: 0,
              useNativeDriver: true,
              tension: 80,
              friction: 10,
            }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        bannerSwipeDirectionRef.current = null;
        Animated.parallel([
          Animated.spring(bannerSwipeDy, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }),
          Animated.spring(bannerSwipeDx, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }),
        ]).start();
      },
    })
  ).current;

  const { data, isLoading, isError } = useGetBlogPost(
    slug ?? "",
    { locale: safeLocale },
    { query: queryOpts({ enabled: !!slug, refetchOnWindowFocus: false }) }
  );

  const post = data as PostWithContent | undefined;

  const handleShareQuote = useCallback(async () => {
    if (!post || !selectedQuote) return;
    const message = `"${selectedQuote}"\n\n— ${post.title}\n${post.link}`;
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard.writeText(message);
        showCopyToast(isZh ? "引用已复制" : "Quote copied");
      } catch {}
      setSelectedQuote("");
      return;
    }
    const injectQuoteHighlight = `(function(){var hc=getComputedStyle(document.documentElement).getPropertyValue('--highlight-color').trim()||'rgba(218,119,86,0.35)';var tbg=getComputedStyle(document.documentElement).getPropertyValue('--theme-bg').trim()||'transparent';var sel=window.getSelection();if(!sel||sel.rangeCount===0)return;var range=sel.getRangeAt(0);var mark=document.createElement('span');mark.style.cssText='background:'+hc+';border-radius:2px;transition:background 1.5s ease-out';try{var frag=range.extractContents();mark.appendChild(frag);range.insertNode(mark);sel.removeAllRanges();setTimeout(function(){mark.style.background=tbg;setTimeout(function(){var p=mark.parentNode;if(p){while(mark.firstChild)p.insertBefore(mark.firstChild,mark);p.removeChild(mark);}},1500);},50);}catch(err){document.body.style.transition='background 0.3s ease';document.body.style.background=hc;setTimeout(function(){document.body.style.background=tbg;},700);}})();true;`;
    try {
      const result = await Share.share(
        Platform.OS === "ios"
          ? { message, url: post.link }
          : { message }
      );
      // sharedAction fires for both visible sheet shares and silent
      // direct-share targets — no API exists to distinguish them,
      // so we show feedback in both cases.
      if (result.action === Share.sharedAction) {
        showCopyToast(isZh ? "已分享" : "Shared!");
        webViewRef.current?.injectJavaScript(injectQuoteHighlight);
      } else {
        // dismissedAction on iPhone; on iPad the popover may resolve without
        // dismissedAction, so treat any non-share result as a dismissal.
        showCopyToast(isZh ? "选段已保存" : "Selection saved");
        webViewRef.current?.injectJavaScript(injectQuoteHighlight);
      }
    } catch {
      try {
        await Clipboard.setStringAsync(message);
        showCopyToast(isZh ? "引用已复制" : "Quote copied");
        webViewRef.current?.injectJavaScript(injectQuoteHighlight);
      } catch {}
    }
    setSelectedQuote("");
  }, [post, selectedQuote, showCopyToast, isZh]);

  const themeColors = useMemo(
    () => resolveThemeColors(colorTheme, colors.background, colors.text),
    [colorTheme, colors.background, colors.text]
  );

  const themeIconMuted = colorTheme === "default"
    ? colors.mutedForeground
    : `${themeColors.text}70`;

  useEffect(() => {
    progressAnim.setValue(0);
  }, [slug, progressAnim]);

  const handleShare = useCallback(async () => {
    if (!post) return;
    const url = post.link;
    const title = post.title;
    if (Platform.OS === "web") {
      if (navigator.share) {
        try {
          await navigator.share({ title, url });
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          try {
            await navigator.clipboard.writeText(url);
            showCopyToast();
          } catch {}
        }
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        showCopyToast();
      } catch {}
      return;
    }
    try {
      await Share.share(
        Platform.OS === "ios"
          ? { url, message: title }
          : { message: `${title}\n${url}` }
      );
    } catch {}
  }, [post, showCopyToast]);

  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: themeColors.bg },
      headerTintColor: themeColors.text,
      ...(post?.title
        ? {
            headerTitle: () => (
              <PostHeaderTitle
                title={post.title}
                progressAnim={progressAnim}
                primaryColor={colors.primary}
                borderColor={colors.border}
                textColor={themeColors.text}
              />
            ),
          }
        : {}),
      headerRight: () => {
        return (
          <PostHeaderActions
            post={post ?? null}
            isBookmarked={isBookmarked}
            toggleBookmark={toggleBookmark}
            onOpenReadingPrefs={() => setSheetVisible(true)}
            onShare={handleShare}
            decrease={decrease}
            increase={increase}
            canDecrease={canDecrease}
            canIncrease={canIncrease}
            primaryColor={colorTheme === "default" ? colors.primary : themeColors.text}
            textColor={themeColors.text}
            mutedColor={themeIconMuted}
          />
        );
      },
    });
  }, [
    post,
    navigation,
    progressAnim,
    colors,
    themeColors,
    decrease,
    increase,
    canDecrease,
    canIncrease,
    isBookmarked,
    toggleBookmark,
    setSheetVisible,
    handleShare,
  ]);

  useEffect(() => {
    if (!post) return;
    const key = `${post.locale}:${post.slug}`;
    if (recordedKeyRef.current === key) return;
    recordedKeyRef.current = key;
    recordVisit({
      slug: post.slug,
      title: post.title,
      description: post.description,
      pubDate: post.pubDate,
      link: post.link,
      coverImage: post.coverImage,
      categories: post.categories,
      readingTime: post.readingTime,
      locale: post.locale,
    });
  }, [post, recordVisit]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.t === "selection" && typeof msg.text === "string") {
          setSelectedQuote(msg.text);
          if (msg.text && msg.text.length >= QUOTE_MIN_AUTO_COPY_LENGTH && msg.text.length <= QUOTE_MAX_LENGTH && post) {
            const message = `"${msg.text}"\n\n— ${post.title}\n${post.link}`;
            navigator.clipboard.writeText(message).then(() => {
              showCopyToast(isZh ? "引用已复制" : "Quote copied");
              iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ t: "highlight" }), "*");
            }).catch(() => {});
          }
        }
      } catch {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [post, isZh, showCopyToast]);

  useEffect(() => {
    if (Platform.OS !== "web" && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `document.documentElement.style.setProperty('font-size','${fontSize}px','important');true;`
      );
    }
  }, [fontSize]);

  useEffect(() => {
    if (Platform.OS !== "web" && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `document.body.style.lineHeight='${lineSpacing}';true;`
      );
    }
  }, [lineSpacing]);

  useEffect(() => {
    if (Platform.OS !== "web" && webViewRef.current) {
      const maxW = contentWidth === "narrow" ? "680px" : "100%";
      const padH = contentWidth === "narrow" ? "24px" : "20px";
      webViewRef.current.injectJavaScript(
        `document.body.style.maxWidth='${maxW}';document.body.style.paddingLeft='${padH}';document.body.style.paddingRight='${padH}';document.body.style.marginLeft='auto';document.body.style.marginRight='auto';true;`
      );
    }
  }, [contentWidth]);

  useEffect(() => {
    return () => {
      if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
      if (iframeScrollHandlerRef.current && iframeContentWindowRef.current) {
        iframeContentWindowRef.current.removeEventListener("scroll", iframeScrollHandlerRef.current);
        iframeScrollHandlerRef.current = null;
        iframeContentWindowRef.current = null;
      }
    };
  }, []);

  const scrollStorageKey = useMemo(
    () => (post ? `${SCROLL_KEY_PREFIX}${post.locale}:${post.slug}` : null),
    [post]
  );

  useEffect(() => {
    if (!scrollStorageKey) return;
    let cancelled = false;
    setResumeBannerPos(null);
    loadScrollPos(scrollStorageKey).then((pos) => {
      if (!cancelled && pos !== null && pos > 0.05 && pos < 0.95) {
        setResumeBannerPos(pos);
      }
    });
    return () => { cancelled = true; };
  }, [scrollStorageKey]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      if (!scrollStorageKey) return;
      const p = lastScrollPosRef.current;
      if (scrollSaveTimerRef.current) {
        clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = null;
        if (p > 0.05 && p < 0.95) {
          saveScrollPos(scrollStorageKey, p);
        }
      }
    });
    return unsubscribe;
  }, [navigation, scrollStorageKey]);

  useEffect(() => {
    if (Platform.OS !== "web" && webViewRef.current) {
      const fontStack = fontFamily === "sans"
        ? "'Inter', system-ui, sans-serif"
        : "'Lora', Georgia, 'Times New Roman', serif";
      webViewRef.current.injectJavaScript(
        `document.body.style.fontFamily=${JSON.stringify(fontStack)};true;`
      );
    }
  }, [fontFamily]);

  useEffect(() => {
    if (Platform.OS !== "web" && webViewRef.current) {
      const { bg, text } = resolveThemeColors(colorTheme, colors.background, colors.text);
      const primary = resolveLinkColor(colorTheme, accentColor, colors.primary);
      const muted = colors.mutedForeground;
      const highlightColor = resolveHighlightColor(colorTheme, accentColor);
      webViewRef.current.injectJavaScript(
        `(function(){` +
        `document.body.style.transition='background-color 0.25s, color 0.25s';` +
        `document.body.style.backgroundColor='${bg}';` +
        `document.body.style.color='${text}';` +
        `document.documentElement.style.backgroundColor='${bg}';` +
        `document.documentElement.style.setProperty('--highlight-color','${highlightColor}');` +
        `document.documentElement.style.setProperty('--theme-bg','${bg}');` +
        `var headings=document.querySelectorAll('h1,h2,h3,h4,h5,h6');` +
        `for(var i=0;i<headings.length;i++){headings[i].style.transition='color 0.25s';headings[i].style.color='${text}';}` +
        `var links=document.querySelectorAll('a');` +
        `for(var i=0;i<links.length;i++){links[i].style.transition='color 0.25s';links[i].style.color='${primary}';}` +
        `var bqs=document.querySelectorAll('blockquote');` +
        `for(var i=0;i<bqs.length;i++){bqs[i].style.transition='color 0.25s, border-color 0.25s';bqs[i].style.color='${muted}';bqs[i].style.borderLeftColor='${primary}';}` +
        `})();true;`
      );
    }
  }, [colorTheme, accentColor, colors.background, colors.text, colors.primary, colors.mutedForeground]);

  const htmlContent = useMemo(
    () => (post ? buildHtml(post.content ?? "", colors, isDark, 17, 1.85, "full", "serif", colorTheme, accentColor) : ""),
    [post, colors, isDark, colorTheme, accentColor]
  );

  const webHtmlContent = useMemo(
    () =>
      post
        ? buildHtml(post.content ?? "", colors, isDark, fontSize, lineSpacing, contentWidth, fontFamily, colorTheme, accentColor)
        : "",
    [post, colors, isDark, fontSize, lineSpacing, contentWidth, fontFamily, colorTheme, accentColor]
  );

  const onWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.t === "selection" && typeof msg.text === "string") {
          setSelectedQuote(msg.text);
          return;
        }
        if (msg.t === "scroll" && typeof msg.p === "number") {
          Animated.timing(progressAnim, {
            toValue: msg.p,
            duration: 80,
            useNativeDriver: false,
          }).start();
          lastScrollPosRef.current = msg.p;
          if (scrollStorageKey) {
            if (msg.p >= 0.95) {
              if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
              clearScrollPos(scrollStorageKey);
            } else if (msg.p > 0.05) {
              if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
              scrollSaveTimerRef.current = setTimeout(() => {
                saveScrollPos(scrollStorageKey, msg.p);
              }, 500);
            }
          }
          if (
            resumeBannerPosRef.current !== null &&
            !isRestoringRef.current &&
            msg.p > resumeBannerPosRef.current + 0.02
          ) {
            dismissBannerRef.current();
          }
        }
      } catch {}
    },
    [progressAnim, scrollStorageKey]
  );

  const injectScrollToPos = useCallback((position: number, delay = 0) => {
    if (!webViewRef.current) return;
    isRestoringRef.current = true;
    const script = delay > 0
      ? `setTimeout(function(){var p=${position};var el=document.documentElement;var total=(el.scrollHeight||document.body.scrollHeight)-(el.clientHeight||window.innerHeight);if(total>0){window.scrollTo(0,Math.round(p*total));}},${delay});true;`
      : `(function(){var p=${position};var el=document.documentElement;var total=(el.scrollHeight||document.body.scrollHeight)-(el.clientHeight||window.innerHeight);if(total>0){window.scrollTo(0,Math.round(p*total));}})();true;`;
    webViewRef.current.injectJavaScript(script);
    setTimeout(() => { isRestoringRef.current = false; }, delay + 1200);
  }, []);

  const webScrollToPos = useCallback((position: number, delay = 0) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doScroll = () => {
      const cw = iframe.contentWindow;
      if (!cw) return;
      const doc = cw.document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      if (total > 0) cw.scrollTo({ top: Math.round(position * total) });
    };
    if (delay > 0) setTimeout(doScroll, delay);
    else doScroll();
  }, []);

  useEffect(() => {
    resumeBannerPosRef.current = resumeBannerPos;
    if (resumeBannerPos !== null) {
      isDismissingBannerRef.current = false;
      bannerSwipeDy.setValue(0);
      bannerSwipeDx.setValue(0);
      setBannerVisible(true);
      bannerAnim.setValue(0);
      Animated.spring(bannerAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 55,
        friction: 9,
      }).start();
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => {
        dismissBannerRef.current();
      }, 5000);
    } else {
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = null;
      }
      bannerAnim.setValue(0);
      setBannerVisible(false);
    }
    return () => {
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = null;
      }
    };
  }, [resumeBannerPos, bannerAnim]);

  const dismissBanner = useCallback(() => {
    if (isDismissingBannerRef.current) return;
    isDismissingBannerRef.current = true;
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
    Animated.timing(bannerAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      isDismissingBannerRef.current = false;
      setResumeBannerPos(null);
    });
  }, [bannerAnim]);

  dismissBannerRef.current = dismissBanner;

  const markHintSeen = useCallback(() => {
    Animated.timing(swipeHintAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      setShowSwipeHint(false);
    });
    AsyncStorage.setItem(SWIPE_HINT_KEY, "1").catch(() => {});
  }, [swipeHintAnim]);
  markHintSeenRef.current = markHintSeen;

  useEffect(() => {
    AsyncStorage.getItem(SWIPE_HINT_KEY).then(val => {
      if (val === null) {
        setShowSwipeHint(true);
        swipeHintAnim.setValue(1);
      }
    }).catch(() => {});
  }, [swipeHintAnim]);

  const handleResumeTap = useCallback(() => {
    if (resumeBannerPos === null) return;
    if (Platform.OS === "web") {
      webScrollToPos(resumeBannerPos);
    } else {
      if (!webViewRef.current) return;
      injectScrollToPos(resumeBannerPos);
    }
    dismissBanner();
  }, [resumeBannerPos, injectScrollToPos, webScrollToPos, dismissBanner]);

  const onIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    // Remove any previous scroll listener before attaching a new one
    if (iframeScrollHandlerRef.current && iframeContentWindowRef.current) {
      iframeContentWindowRef.current.removeEventListener("scroll", iframeScrollHandlerRef.current);
      iframeScrollHandlerRef.current = null;
      iframeContentWindowRef.current = null;
    }
    const cw = iframe.contentWindow;
    if (scrollStorageKey && restoredKeyRef.current !== scrollStorageKey) {
      restoredKeyRef.current = scrollStorageKey;
      loadScrollPos(scrollStorageKey).then((position) => {
        if (position == null || position <= 0.05) return;
        webScrollToPos(position, 400);
      });
    }
    const handleScroll = () => {
      const doc = cw.document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      if (total <= 0) return;
      const p = Math.min(1, Math.max(0, doc.scrollTop / total));
      lastScrollPosRef.current = p;
      Animated.timing(progressAnim, { toValue: p, duration: 80, useNativeDriver: false }).start();
      if (!scrollStorageKey) return;
      if (p >= 0.95) {
        if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = null;
        clearScrollPos(scrollStorageKey);
        dismissBannerRef.current();
        return;
      }
      if (p > 0.05) {
        if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = setTimeout(() => {
          saveScrollPos(scrollStorageKey, p);
        }, 500);
      }
      if (resumeBannerPosRef.current !== null && p > resumeBannerPosRef.current + 0.02) {
        dismissBannerRef.current();
      }
    };
    cw.addEventListener("scroll", handleScroll, { passive: true });
    iframeScrollHandlerRef.current = handleScroll;
    iframeContentWindowRef.current = cw;
  }, [scrollStorageKey, webScrollToPos, progressAnim]);

  const restoreScrollPosition = useCallback(async () => {
    if (Platform.OS === "web" || !webViewRef.current || !scrollStorageKey) return;
    if (restoredKeyRef.current === scrollStorageKey) return;
    restoredKeyRef.current = scrollStorageKey;
    const position = await loadScrollPos(scrollStorageKey);
    if (position == null || position <= 0.05) return;
    injectScrollToPos(position, 400);
  }, [scrollStorageKey, injectScrollToPos]);

  const openInBrowser = async () => {
    if (!post?.link) return;
    await WebBrowser.openBrowserAsync(post.link);
  };

  const bottomPad = insets.bottom + 16 + (Platform.OS === "web" ? 34 : 0);

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !post) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text
          style={[
            styles.errorText,
            { color: colors.mutedForeground, fontFamily: fonts.sans.regular },
          ]}
        >
          Post not found
        </Text>
      </View>
    );
  }

  const tags = post.tags ?? [];
  const related = post.related ?? [];

  return (
    <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
      {Platform.OS === "web" ? (
        <>
          <View style={{ height: 3, backgroundColor: colors.border, overflow: "hidden" }}>
            <Animated.View
              style={[
                {
                  height: "100%",
                  backgroundColor: colors.primary,
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                },
                { transition: "width 80ms linear" } as any,
              ]}
            />
          </View>
          {hydrated ? (
            <iframe
              ref={iframeRef}
              srcDoc={webHtmlContent}
              onLoad={onIframeLoad}
              style={{
                flex: 1,
                border: "none",
                width: "100%",
                height: "100%",
                backgroundColor: themeColors.bg,
              } as React.CSSProperties}
              title={post.title}
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: themeColors.bg }} />
          )}
        </>
      ) : hydrated ? (
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent, baseUrl: post.link }}
          style={[styles.webview, { backgroundColor: themeColors.bg }]}
          originWhitelist={["*"]}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          javaScriptEnabled
          domStorageEnabled={false}
          allowsInlineMediaPlayback={false}
          injectedJavaScript={buildInjectedJS(fontSize, lineSpacing, contentWidth, fontFamily, colorTheme, colors.background, colors.text, accentColor)}
          onMessage={onWebViewMessage}
          onLoadEnd={() => { restoreScrollPosition(); }}
        />
      ) : (
        <View style={[styles.webview, { backgroundColor: themeColors.bg }]} />
      )}

      <PostMetaSection
        tags={tags}
        related={related}
        colors={colors}
        themeBg={themeColors.bg}
        isZh={isZh}
        onTagPress={(tag) =>
          router.push({
            pathname: "/tag/[slug]",
            params: {
              slug: tag.toLowerCase().replace(/\s+/g, "-"),
              locale: safeLocale,
            },
          })
        }
        onRelatedPress={(relatedSlug) =>
          router.push({
            pathname: "/post/[slug]",
            params: { slug: relatedSlug, locale: safeLocale },
          })
        }
      />

      {selectedQuote.length > 0 && (
        <QuoteShareBar
          selectedQuote={selectedQuote}
          quoteMaxLength={QUOTE_MAX_LENGTH}
          colors={colors}
          isZh={isZh}
          onShareQuote={handleShareQuote}
          onDismiss={() => setSelectedQuote("")}
        />
      )}

      {bannerVisible && Platform.OS !== "web" && (
        <ResumeReadingBanner
          panHandlers={bannerPanResponder.panHandlers}
          themeColors={themeColors}
          bannerAnim={bannerAnim}
          bannerSwipeDx={bannerSwipeDx}
          bannerSwipeDy={bannerSwipeDy}
          showSwipeHint={showSwipeHint}
          swipeHintAnim={swipeHintAnim}
          isZh={isZh}
          onResume={handleResumeTap}
          onDismiss={dismissBanner}
        />
      )}

      <OpenOnSiteFooter
        bottomPad={bottomPad}
        backgroundColor={themeColors.bg}
        borderColor={colors.border}
        primaryColor={colors.primary}
        isZh={isZh}
        onOpen={openInBrowser}
      />

      <ReadingPrefsSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        lineSpacing={lineSpacing}
        setLineSpacing={setLineSpacing}
        contentWidth={contentWidth}
        setContentWidth={setContentWidth}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        colorTheme={colorTheme}
        setColorTheme={setColorTheme}
        accentColor={accentColor}
        setAccentColor={setAccentColor}
        isZh={isZh}
      />

      <CopyToast
        visible={copyToastVisible}
        anim={copyToastAnim}
        message={copyToastMessage}
        isZh={isZh}
      />
    </View>
  );
}
