export type ThemeName = "default" | "high-contrast";

export interface ColorTokens {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  link: string;
  controlBg: string;
  controlText: string;
  controlBorder: string;
  focusRing: string;
  errorText: string;
  badgeBg: string;
  badgeText: string;
  accent: string;
  accentText: string;
}

export const THEMES: Readonly<Record<ThemeName, ColorTokens>> = {
  default: {
    bg: "#1a102e",
    surface: "#26183f",
    text: "#f5efff",
    muted: "#cdbdea",
    link: "#ffb66b",
    controlBg: "#3b2766",
    controlText: "#ffffff",
    controlBorder: "#c9b4f5",
    focusRing: "#ffd24d",
    errorText: "#ffb3a3",
    badgeBg: "#ffb66b",
    badgeText: "#1a102e",
    accent: "#ff9a3c",
    accentText: "#1a102e",
  },
  "high-contrast": {
    bg: "#000000",
    surface: "#000000",
    text: "#ffffff",
    muted: "#f0f0f0",
    link: "#66ffff",
    controlBg: "#000000",
    controlText: "#ffffff",
    controlBorder: "#ffffff",
    focusRing: "#ffff00",
    errorText: "#ff9d9d",
    badgeBg: "#ffff00",
    badgeText: "#000000",
    accent: "#ffff00",
    accentText: "#000000",
  },
};

export const SPACING = { 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem", 5: "1.5rem", 6: "2rem" } as const;

export const TYPE = {
  body: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  base: "1.125rem",
  small: "1rem",
  heading: "1.5rem",
  title: "2rem",
} as const;

export type PairKind = "text" | "large-or-control";

export interface TokenPair {
  fg: keyof ColorTokens;
  bg: keyof ColorTokens;
  kind: PairKind;
}

/**
 * Every foreground and background combination the stylesheet uses. The focus ring sits
 * 2 px outside the control, so it is checked against the surfaces around it and the control fill.
 */
export const TOKEN_PAIRS: readonly TokenPair[] = [
  { fg: "text", bg: "bg", kind: "text" },
  { fg: "text", bg: "surface", kind: "text" },
  { fg: "muted", bg: "bg", kind: "text" },
  { fg: "muted", bg: "surface", kind: "text" },
  { fg: "link", bg: "bg", kind: "text" },
  { fg: "link", bg: "surface", kind: "text" },
  { fg: "controlText", bg: "controlBg", kind: "text" },
  { fg: "errorText", bg: "bg", kind: "text" },
  { fg: "errorText", bg: "surface", kind: "text" },
  { fg: "badgeText", bg: "badgeBg", kind: "text" },
  { fg: "accentText", bg: "accent", kind: "text" },
  { fg: "controlBorder", bg: "bg", kind: "large-or-control" },
  { fg: "controlBorder", bg: "surface", kind: "large-or-control" },
  { fg: "focusRing", bg: "bg", kind: "large-or-control" },
  { fg: "focusRing", bg: "surface", kind: "large-or-control" },
  { fg: "focusRing", bg: "controlBg", kind: "large-or-control" },
];

export function minimumContrast(kind: PairKind): number {
  return kind === "text" ? 4.5 : 3;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio of two `#rrggbb` colors. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function colorVars(colors: ColorTokens): string {
  return Object.entries(colors)
    .map(([name, value]) => `--color-${kebab(name)}: ${value};`)
    .join(" ");
}

/** The one source of the custom properties; styles.css only reads them. */
export function tokensCss(): string {
  const shared = [
    ...Object.entries(SPACING).map(([k, v]) => `--space-${k}: ${v};`),
    ...Object.entries(TYPE).map(([k, v]) => `--type-${k}: ${v};`),
  ].join(" ");
  const focus = "--focus-ring: var(--color-focus-ring);";
  return [
    `:root { ${shared} ${colorVars(THEMES.default)} ${focus} }`,
    `:root[data-theme="high-contrast"] { ${colorVars(THEMES["high-contrast"])} }`,
  ].join("\n");
}

export function installTokens(doc: Document = document): void {
  if (doc.getElementById("sd-tokens")) return;
  const style = doc.createElement("style");
  style.id = "sd-tokens";
  style.textContent = tokensCss();
  doc.head.prepend(style);
}
