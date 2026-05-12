import type { ColorTheme, ContentWidth, FontFamily } from "@/hooks/useReadingPrefs";

interface PostHtmlColors {
  background: string;
  text: string;
  mutedForeground: string;
  primary: string;
  border: string;
}

export function resolveThemeColors(
  colorTheme: ColorTheme,
  defaultBg: string,
  defaultText: string
): { bg: string; text: string } {
  if (colorTheme === "sepia") return { bg: "#f5ede0", text: "#3b2314" };
  if (colorTheme === "high-contrast") return { bg: "#000000", text: "#ffffff" };
  return { bg: defaultBg, text: defaultText };
}

function hexToHighlight(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.35)`;
}

export function resolveHighlightColor(colorTheme: ColorTheme, accentColor: string | null = null): string {
  if (accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor)) return hexToHighlight(accentColor);
  if (colorTheme === "sepia") return "rgba(160,100,40,0.38)";
  if (colorTheme === "high-contrast") return "rgba(255,220,0,0.45)";
  return "rgba(218,119,86,0.35)";
}

export function resolveLinkColor(colorTheme: ColorTheme, accentColor: string | null, defaultPrimary: string): string {
  if (accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor)) return accentColor;
  return defaultPrimary;
}

export function buildInjectedJS(
  fontSize: number,
  lineSpacing: number,
  contentWidth: ContentWidth,
  fontFamily: FontFamily,
  colorTheme: ColorTheme,
  defaultBg: string,
  defaultText: string,
  accentColor: string | null = null
): string {
  const maxW = contentWidth === "narrow" ? "680px" : "100%";
  const padH = contentWidth === "narrow" ? "24px" : "20px";
  const fontStack = fontFamily === "sans"
    ? "'Inter', system-ui, sans-serif"
    : "'Lora', Georgia, 'Times New Roman', serif";
  const fontStackJs = JSON.stringify(fontStack);
  const { bg, text } = resolveThemeColors(colorTheme, defaultBg, defaultText);
  const highlightColor = resolveHighlightColor(colorTheme, accentColor);
  return `(function() {
  document.documentElement.style.setProperty('font-size', '${fontSize}px', 'important');
  document.body.style.lineHeight = '${lineSpacing}';
  document.body.style.maxWidth = '${maxW}';
  document.body.style.paddingLeft = '${padH}';
  document.body.style.paddingRight = '${padH}';
  document.body.style.marginLeft = 'auto';
  document.body.style.marginRight = 'auto';
  document.body.style.fontFamily = ${fontStackJs};
  document.body.style.backgroundColor = '${bg}';
  document.body.style.color = '${text}';
  document.documentElement.style.backgroundColor = '${bg}';
  document.documentElement.style.setProperty('--highlight-color', '${highlightColor}');
  document.documentElement.style.setProperty('--theme-bg', '${bg}');
  function send() {
    var el = document.documentElement;
    var top = el.scrollTop || document.body.scrollTop || 0;
    var total = (el.scrollHeight || document.body.scrollHeight) - (el.clientHeight || window.innerHeight);
    var p = total <= 0 ? 1 : top / total;
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ t: 'scroll', p: Math.min(1, Math.max(0, p)) }));
    }
  }
  window.addEventListener('scroll', send, { passive: true });
  window.addEventListener('load', send);
  send();
  var selTimer;
  document.addEventListener('selectionchange', function() {
    clearTimeout(selTimer);
    selTimer = setTimeout(function() {
      var sel = window.getSelection ? window.getSelection().toString().trim() : '';
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ t: 'selection', text: sel }));
      }
    }, 300);
  });
})();
true;`;
}

export function buildHtml(
  content: string,
  colors: PostHtmlColors,
  isDark: boolean,
  fontSize = 17,
  lineSpacing = 1.85,
  contentWidth: ContentWidth = "full",
  fontFamily: FontFamily = "serif",
  colorTheme: ColorTheme = "default",
  accentColor: string | null = null
): string {
  const { bg, text } = resolveThemeColors(colorTheme, colors.background, colors.text);
  const highlightColor = resolveHighlightColor(colorTheme, accentColor);
  const primary = resolveLinkColor(colorTheme, accentColor, colors.primary);
  const muted = colors.mutedForeground;
  const codeBg = isDark ? "#2e2825" : "#ede8e0";
  const border = colors.border;
  const bodyMaxWidth = contentWidth === "narrow" ? "680px" : "100%";
  const padH = contentWidth === "narrow" ? "24px" : "20px";

  const prismCssUrl = isDark
    ? "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css"
    : "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css";

  const highlightScript = `(function() {
  function detectLang(pre, code) {
    var dl = pre.getAttribute('data-language');
    if (dl) return dl;
    var cls = (code ? code.className : '') || pre.className || '';
    var m = cls.match(/(?:^|\\s)language-(\\S+)/);
    if (m) return m[1];
    return 'text';
  }
  function addLangBadge(pre, lang) {
    if (!lang || lang === 'text' || lang === 'plaintext' || lang === 'none') return;
    if (pre.querySelector('.lang-badge')) return;
    var badge = document.createElement('span');
    badge.className = 'lang-badge';
    badge.textContent = lang;
    badge.dataset.langLabel = lang;
    badge.addEventListener('click', function() {
      if (badge.dataset.copying === '1') return;
      var code = pre.querySelector('code');
      var text = code ? (code.textContent || '') : (pre.textContent || '');
      if (!navigator.clipboard) return;
      badge.dataset.copying = '1';
      navigator.clipboard.writeText(text).then(function() {
        badge.textContent = 'Copied \u2713';
        badge.style.color = '#22c55e';
        badge.style.borderColor = '#22c55e';
        setTimeout(function() {
          badge.textContent = badge.dataset.langLabel || '';
          badge.style.color = '';
          badge.style.borderColor = '';
          badge.dataset.copying = '';
        }, 1500);
      }).catch(function() {
        badge.dataset.copying = '';
      });
    });
    pre.appendChild(badge);
  }
  function wrapCode(pre) {
    if (!pre.parentNode || pre.parentNode.classList && pre.parentNode.classList.contains('code-wrapper')) return pre.parentNode;
    var wrapper = document.createElement('div');
    wrapper.className = 'code-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    return wrapper;
  }
  function addLineNumbers(wrapper, lineCount) {
    if (!wrapper || lineCount <= 1) return;
    if (wrapper.querySelector('.line-gutter')) return;
    wrapper.classList.add('has-gutter');
    var gutter = document.createElement('div');
    gutter.className = 'line-gutter';
    var html = '';
    for (var n = 1; n <= lineCount; n++) { html += '<span>' + n + '</span>'; }
    gutter.innerHTML = html;
    wrapper.insertBefore(gutter, wrapper.querySelector('pre'));
  }
  function updateScrollable(wrapper) {
    if (!wrapper || !wrapper.classList || !wrapper.classList.contains('code-wrapper')) return;
    var pre = wrapper.querySelector('pre');
    if (!pre) return;
    if (pre.scrollWidth > pre.clientWidth) {
      wrapper.classList.add('scrollable');
    } else {
      wrapper.classList.remove('scrollable');
    }
  }
  var pres = document.querySelectorAll('pre.astro-code, pre.shiki');
  for (var i = 0; i < pres.length; i++) {
    var pre = pres[i];
    var code = pre.querySelector('code');
    var lang = detectLang(pre, code);
    if (!code) continue;
    var lineEls = code.querySelectorAll('.line');
    var rawText;
    if (lineEls.length > 0) {
      var parts = [];
      for (var j = 0; j < lineEls.length; j++) {
        parts.push(lineEls[j].textContent || '');
      }
      rawText = parts.join('\n').replace(/\n$/, '');
    } else {
      rawText = (code.textContent || '').replace(/^\n/, '').replace(/\n$/, '');
    }
    pre.removeAttribute('style');
    pre.className = 'language-' + lang;
    code.className = 'language-' + lang;
    code.textContent = rawText;
    addLangBadge(pre, lang);
    var wrapper = wrapCode(pre);
    var lineCount = rawText ? rawText.split('\n').length : 1;
    addLineNumbers(wrapper, lineCount);
    updateScrollable(wrapper);
    pre.addEventListener('scroll', function() {
      var w = this.parentNode;
      if (!w || !w.classList.contains('code-wrapper')) return;
      if (this.scrollLeft + this.clientWidth >= this.scrollWidth - 4) {
        w.classList.remove('scrollable');
      } else if (this.scrollWidth > this.clientWidth) {
        w.classList.add('scrollable');
      }
    }, { passive: true });
  }
  window.addEventListener('resize', function() {
    var wrappers = document.querySelectorAll('.code-wrapper');
    for (var w = 0; w < wrappers.length; w++) {
      updateScrollable(wrappers[w]);
    }
  }, { passive: true });
  if (window.Prism) {
    window.Prism.hooks.add('complete', function(env) {
      if (env.element && env.element.parentNode && env.element.parentNode.tagName === 'PRE') {
        var pre = env.element.parentNode;
        addLangBadge(pre, env.language);
        var wrapper = wrapCode(pre);
        var prismText = env.element ? (env.element.textContent || '') : '';
        addLineNumbers(wrapper, prismText ? prismText.split('\n').length : 1);
        updateScrollable(wrapper);
      }
    });
    if (window.Prism.plugins && window.Prism.plugins.autoloader) {
      window.Prism.plugins.autoloader.languages_path =
        'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/';
    }
    window.Prism.highlightAll();
  }
})();`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=4.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${prismCssUrl}">
  <style>
    :root { --highlight-color: ${highlightColor}; --theme-bg: ${bg}; }
    * { box-sizing: border-box; }
    html { font-size: ${fontSize}px; -webkit-text-size-adjust: 100%; }
    body {
      margin: 0 auto; padding: 0 ${padH} 48px;
      background-color: ${bg};
      color: ${text};
      font-family: ${fontFamily === "sans" ? "'Inter', system-ui, sans-serif" : "'Lora', Georgia, 'Times New Roman', serif"};
      line-height: ${lineSpacing};
      max-width: ${bodyMaxWidth};
      word-wrap: break-word;
      overflow-x: hidden;
      transition: background-color 0.25s, color 0.25s;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: ${fontFamily === "sans" ? "'Inter', system-ui, sans-serif" : "'Lora', Georgia, serif"};
      font-weight: 700;
      color: ${text};
      line-height: 1.3;
      margin-top: 1.8em;
      margin-bottom: 0.5em;
      transition: color 0.25s;
    }
    h1 { font-size: 1.6em; }
    h2 { font-size: 1.35em; border-bottom: 1px solid ${border}; padding-bottom: 0.25em; }
    h3 { font-size: 1.15em; }
    a { color: ${primary}; text-decoration: none; transition: color 0.25s; }
    a:hover { text-decoration: underline; }
    p { margin: 0 0 1.25em; }
    img { max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 1.2em auto; }
    figure { margin: 1.5em 0; }
    figcaption {
      font-size: 0.82em;
      font-family: 'Inter', system-ui, sans-serif;
      color: ${muted};
      text-align: center;
      margin-top: 0.4em;
    }
    /* Prism overrides — palette-matched backgrounds, keep Prism token colors */
    .code-wrapper {
      position: relative;
      margin: 1.4em 0;
    }
    .code-wrapper.has-gutter {
      display: flex;
      align-items: stretch;
    }
    .line-gutter {
      flex-shrink: 0;
      width: 36px;
      padding: 16px 0 16px 0;
      display: flex;
      flex-direction: column;
      background: ${codeBg};
      border-right: 1px solid ${border};
      border-radius: 10px 0 0 10px;
      user-select: none;
      -webkit-user-select: none;
      box-sizing: border-box;
    }
    .line-gutter span {
      display: block;
      text-align: right;
      padding-right: 8px;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 11px;
      color: ${muted};
      opacity: 0.5;
      line-height: ${14 * 1.6}px;
    }
    .code-wrapper.has-gutter > pre,
    .code-wrapper.has-gutter > pre[class*="language-"] {
      flex: 1;
      min-width: 0;
      border-radius: 0 10px 10px 0;
      padding-left: 12px;
    }
    .code-wrapper::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 48px;
      background: linear-gradient(to right, transparent, ${codeBg});
      border-radius: 0 10px 10px 0;
      pointer-events: none;
      z-index: 1;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .code-wrapper.scrollable::after {
      opacity: 1;
    }
    pre, pre[class*="language-"] {
      position: relative;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      background: ${codeBg} !important;
      border-radius: 10px;
      padding: 16px 18px;
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
      min-height: 3.5em;
    }
    .lang-badge {
      position: absolute;
      top: 8px;
      right: 10px;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 10px;
      color: ${muted};
      background: ${bg};
      border: 1px solid ${border};
      border-radius: 4px;
      padding: 2px 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      user-select: none;
      line-height: 1.4;
      opacity: 0.85;
      z-index: 2;
      transition: color 0.15s, border-color 0.15s;
    }
    code[class*="language-"], pre[class*="language-"] > code {
      background: transparent !important;
      font-family: 'Menlo', 'SF Mono', 'Courier New', monospace;
      font-size: 14px;
    }
    code {
      font-family: 'Menlo', 'SF Mono', 'Courier New', monospace;
      font-size: 14px;
    }
    pre code {
      background: none;
      padding: 0;
      font-size: inherit;
      line-height: inherit;
    }
    :not(pre) > code {
      background: ${codeBg};
      padding: 2px 7px;
      border-radius: 5px;
      font-size: 0.87em;
    }
    blockquote {
      border-left: 3px solid ${primary};
      margin: 1.4em 0;
      padding: 6px 0 6px 18px;
      color: ${muted};
      font-style: italic;
      transition: color 0.25s, border-color 0.25s;
    }
    blockquote p { margin: 0; }
    hr {
      border: 0;
      border-top: 1px solid ${border};
      margin: 2.2em 0;
    }
    table {
      width: 100%;
      overflow-x: auto;
      display: block;
      border-collapse: collapse;
      margin: 1.4em 0;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 0.9em;
    }
    th, td {
      padding: 8px 12px;
      border: 1px solid ${border};
      text-align: left;
    }
    th { background: ${codeBg}; font-weight: 600; }
    ul, ol { padding-left: 1.7em; margin: 0.8em 0 1.25em; }
    li { margin-bottom: 0.45em; }
    strong { font-weight: 700; }
    em { font-style: italic; }
    mark { background: rgba(218,119,86,0.18); padding: 1px 3px; border-radius: 3px; }
    sup, sub { font-size: 0.75em; }
  </style>
</head>
<body>${content || "<p>No content available for this article. Tap the button below to read it in full.</p>"}
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js" data-manual></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
<script>${highlightScript}</script>
<script>(function(){var selTimer;document.addEventListener('selectionchange',function(){clearTimeout(selTimer);selTimer=setTimeout(function(){var sel=window.getSelection?window.getSelection().toString().trim():'';window.parent.postMessage(JSON.stringify({t:'selection',text:sel}),'*');},300);});})()</script>
<script>(function(){window.addEventListener('message',function(e){if(e.source!==window.parent)return;try{var d=JSON.parse(e.data);}catch(err){return;}if(d.t!=='highlight')return;var hc=getComputedStyle(document.documentElement).getPropertyValue('--highlight-color').trim()||'rgba(218,119,86,0.35)';var tbg=getComputedStyle(document.documentElement).getPropertyValue('--theme-bg').trim()||'transparent';var sel=window.getSelection();if(!sel||sel.rangeCount===0)return;var range=sel.getRangeAt(0);var mark=document.createElement('span');mark.style.cssText='background:'+hc+';border-radius:2px;transition:background 1.5s ease-out';try{var frag=range.extractContents();mark.appendChild(frag);range.insertNode(mark);sel.removeAllRanges();setTimeout(function(){mark.style.background=tbg;setTimeout(function(){var p=mark.parentNode;if(p){while(mark.firstChild)p.insertBefore(mark.firstChild,mark);p.removeChild(mark);}},1500);},50);}catch(err){document.body.style.transition='background 0.3s ease';document.body.style.background=hc;setTimeout(function(){document.body.style.background=tbg;},700);}});})()</script>
</body>
</html>`;
}
