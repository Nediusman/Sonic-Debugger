---
inclusion: always
---

# Accessibility rules (apply to every change)

The user is blind or low-vision. These rules are requirements, not polish.

1. Every action works with the keyboard alone. Tab order follows the visual
   and logical order. Visible focus indicator on every control, at least 3:1
   contrast against its background.
2. Use native elements first (button, textarea, label). Add ARIA only where
   no native element exists. The structure tree follows the ARIA tree pattern:
   role="tree", role="treeitem", aria-level, aria-setsize, aria-posinset, aria-
   expanded, and a roving tabindex.
3. One polite live region for status and results. Use assertive only for run
   errors. Announce state changes (running, finished, error found) in plain
   words.
4. Never use color alone and never use sound alone. Every sound has a text
   equivalent and every state has a text label.
5. Audio starts only after a user gesture. Escape and the S key stop all
   audio at once.
6. Text-to-speech is optional and off by default so it never competes with
   the user's screen reader.
7. Contrast at least 4.5 to 1 for text, 3 to 1 for large text and controls.
   Provide a high-contrast theme. The page works at 200 percent zoom and
   respects prefers-reduced-motion.
8. Keys reserved by browsers and screen readers are never bound: F6, Alt plus
   a letter, Ctrl plus Alt plus anything, Insert, CapsLock. App shortcuts are
   single letters that work only while the structure tree has focus, and each
   action is also a labeled button reachable with Tab. Ctrl plus Enter runs the
   code from the editor.
9. Use event.code for shortcuts so they work across keyboard layouts.
10. The Halloween theme is decoration only. It never reduces contrast, adds
    motion that cannot be turned off, or changes announcements.
11. Every release is checked with a screen reader (NVDA on Windows or
    VoiceOver on Mac) and with axe. Record what was tested and what was not.
