/**
 * FinCalcHub — fix_contrast.js
 * Accessibility: WCAG 2.1 AA Contrast Enforcement & Visual Theme Corrections
 * 
 * Ensures all interactive elements meet minimum contrast ratios:
 * - Normal text: 4.5:1 (AA)
 * - Large text (≥18pt or ≥14pt bold): 3:1 (AA)
 * - UI components & graphical objects: 3:1 (AA)
 * 
 * Runs on DOMContentLoaded and re-evaluates on theme/state changes.
 * Zero dependencies. ~2KB uncompressed.
 */

(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────
  var CONFIG = {
    normalTextRatio: 4.5,
    largeTextRatio: 3.0,
    uiComponentRatio: 3.0,
    focusOutlineColor: '#818cf8',    // Indigo-400
    focusOutlineWidth: '2px',
    focusOutlineOffset: '2px',
    skipElements: ['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS'],
    debug: false                      // Set true to log contrast failures
  };

  // ── Color Parsing ──────────────────────────────────────────
  function parseColor(str) {
    if (!str || str === 'transparent' || str === 'rgba(0, 0, 0, 0)') return null;
    // Handle rgba
    var m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
    if (m) {
      var a = m[4] !== undefined ? parseFloat(m[4]) : 1;
      if (a < 0.1) return null; // Near-transparent, treat as no color
      return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]), a: a };
    }
    // Handle hex
    m = str.match(/^#([0-9a-f]{3,8})$/i);
    if (m) {
      var hex = m[1];
      if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      return {
        r: parseInt(hex.substr(0,2), 16),
        g: parseInt(hex.substr(2,2), 16),
        b: parseInt(hex.substr(4,2), 16),
        a: 1
      };
    }
    return null;
  }

  // ── Relative Luminance (WCAG 2.1) ─────────────────────────
  function luminance(color) {
    var rsRGB = color.r / 255;
    var gsRGB = color.g / 255;
    var bsRGB = color.b / 255;
    var r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    var g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    var b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // ── Contrast Ratio ─────────────────────────────────────────
  function contrastRatio(fg, bg) {
    var l1 = luminance(fg);
    var l2 = luminance(bg);
    var lighter = Math.max(l1, l2);
    var darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // ── Get Effective Background (walk up DOM) ─────────────────
  function getEffectiveBg(el) {
    var current = el;
    while (current && current !== document.documentElement) {
      var bg = getComputedStyle(current).backgroundColor;
      var parsed = parseColor(bg);
      if (parsed) return parsed;
      current = current.parentElement;
    }
    // Default dark theme background: #0f172a (slate-900)
    return { r: 15, g: 23, b: 42, a: 1 };
  }

  // ── Check & Fix Element ────────────────────────────────────
  function checkAndFix(el) {
    if (CONFIG.skipElements.indexOf(el.tagName) !== -1) return;

    var style = getComputedStyle(el);
    var fgColor = parseColor(style.color);
    var bgColor = getEffectiveBg(el);

    if (!fgColor || !bgColor) return;

    var ratio = contrastRatio(fgColor, bgColor);
    var fontSize = parseFloat(style.fontSize);
    var fontWeight = parseInt(style.fontWeight) || 400;
    var isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
    var requiredRatio = isLargeText ? CONFIG.largeTextRatio : CONFIG.normalTextRatio;

    if (ratio < requiredRatio) {
      if (CONFIG.debug) {
        console.warn('[Contrast Fix]', el.tagName, el.className || el.id || '',
          'ratio:', ratio.toFixed(2), 'required:', requiredRatio,
          'fg:', style.color, 'bg:', style.backgroundColor);
      }

      // Auto-fix: lighten or darken foreground to meet threshold
      var fixedColor = adjustForContrast(fgColor, bgColor, requiredRatio);
      if (fixedColor) {
        el.style.color = 'rgb(' + fixedColor.r + ',' + fixedColor.g + ',' + fixedColor.b + ')';
      }
    }
  }

  // ── Adjust Color for Minimum Contrast ──────────────────────
  function adjustForContrast(fg, bg, target) {
    var bgLum = luminance(bg);
    var step = bgLum > 0.5 ? -1 : 1; // Darken on light bg, lighten on dark bg

    var r = fg.r, g = fg.g, b = fg.b;
    for (var i = 0; i < 80; i++) {
      r = Math.max(0, Math.min(255, r + step * 3));
      g = Math.max(0, Math.min(255, g + step * 3));
      b = Math.max(0, Math.min(255, b + step * 3));
      var adjusted = { r: r, g: g, b: b };
      if (contrastRatio(adjusted, bg) >= target) return adjusted;
    }
    // Fallback: pure white or black
    return bgLum > 0.5 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  }

  // ── Focus Visibility Enforcement ───────────────────────────
  function enforceFocusVisibility() {
    var style = document.getElementById('fch-focus-fix');
    if (style) return; // Already injected

    style = document.createElement('style');
    style.id = 'fch-focus-fix';
    style.textContent = [
      /* Visible focus rings for all interactive elements */
      'a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, [tabindex]:focus-visible {',
      '  outline: ' + CONFIG.focusOutlineWidth + ' solid ' + CONFIG.focusOutlineColor + ' !important;',
      '  outline-offset: ' + CONFIG.focusOutlineOffset + ' !important;',
      '  border-radius: 4px;',
      '}',
      /* Ensure input labels are readable */
      'label { color: #cbd5e1 !important; }',
      /* Result card text minimum contrast */
      '.result-card p { color: #94a3b8 !important; }',
      '.result-card .text-emerald-400, .result-card .text-indigo-400, .result-card .text-amber-400 { opacity: 1 !important; }',
      /* Status indicator contrast */
      '#roas-status-card { font-size: 0.9rem !important; }',
      /* SEO content readability */
      '.seo-content p, .seo-content li { color: #94a3b8 !important; }',
      '.seo-content h2, .seo-content h3 { color: #fff !important; }',
      '.seo-content code { color: #c7d2fe !important; }',
      /* Formula block contrast */
      '.bg-slate-900\\/80 code { color: #e2e8f0 !important; }',
      /* Tool description text */
      '.tool-desc p { color: #94a3b8 !important; }',
      '.tool-desc b { color: #e2e8f0 !important; }',
      /* Footer contrast */
      '.footer-disclaimer { color: #94a3b8 !important; }',
      '.footer-copy { color: #94a3b8 !important; }',
      '.footer-nav a { color: #94a3b8 !important; }',
      '.footer-nav a:hover { color: #fff !important; }',
      /* Tab inactive state */
      '.tab-btn.text-slate-400 { color: #94a3b8 !important; }',
      /* Chart container label */
      '.chart-container p { color: #94a3b8 !important; }',
      /* Calculator toolbar buttons */
      '.calc-toolbar button { color: #fff !important; font-weight: 600; }',
      /* Sidebar text */
      '#tips p, .text-\\[11px\\] { color: #94a3b8 !important; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ── Run Contrast Check ─────────────────────────────────────
  function runContrastCheck() {
    var elements = document.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, p, span, a, button, label, li, td, th, code, .text-white, .text-slate-300, .text-slate-400, .text-emerald-400, .text-indigo-400, .text-amber-400, .text-rose-400, .text-purple-400, .text-cyan-400'
    );

    for (var i = 0; i < elements.length; i++) {
      checkAndFix(elements[i]);
    }
  }

  // ── Initialize ─────────────────────────────────────────────
  function init() {
    enforceFocusVisibility();
    runContrastCheck();

    // Re-check when tab content changes (calculator switch)
    if (typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(function (mutations) {
        var needsRecheck = false;
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].type === 'attributes' &&
              (mutations[i].attributeName === 'class' || mutations[i].attributeName === 'style')) {
            needsRecheck = true;
            break;
          }
        }
        if (needsRecheck) {
          clearTimeout(init._timer);
          init._timer = setTimeout(runContrastCheck, 100);
        }
      });
      observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] });
    }

    // Re-check on window resize (responsive layout changes)
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(runContrastCheck, 250);
    });

    if (CONFIG.debug) {
      console.info('[FinCalcHub Contrast Fix] Initialized — monitoring', document.querySelectorAll('h1,h2,h3,p,span,a,button,label').length, 'elements');
    }
  }

  // ── Launch ─────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
