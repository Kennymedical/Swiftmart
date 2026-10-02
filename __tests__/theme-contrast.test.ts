import { describe, it, expect } from "vitest";

/**
 * WCAG 2.1 Contrast Calculation Utilities
 * Standard: relative luminance and contrast ratio per W3C specifications.
 */
function srgbToLinear(c: number): number {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace("#", "");
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
  };
}

function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const rLin = srgbToLinear(r);
  const gLin = srgbToLinear(g);
  const bLin = srgbToLinear(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

export function getContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const l1 = getRelativeLuminance(foregroundHex);
  const l2 = getRelativeLuminance(backgroundHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

/**
 * Calculates blended RGB when an RGBA color is overlaid on a solid background
 */
export function blendRgbaOverHex(fgR: number, fgG: number, fgB: number, alpha: number, bgHex: string): string {
  const bg = hexToRgb(bgHex);
  const r = Math.round(fgR * alpha + bg.r * (1 - alpha));
  const g = Math.round(fgG * alpha + bg.g * (1 - alpha));
  const b = Math.round(fgB * alpha + bg.b * (1 - alpha));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Swiftmart Private Banking Navy & Gold Design Tokens
export const THEME_BACKGROUNDS = {
  deepNavy: "#0A1931",
  darkNavyAlt: "#0F2140",
  cardGradientTop: "#142850",
  cardGradientBottom: "#1B2F5E",
} as const;

export const THEME_FOREGROUNDS = {
  primaryGold: "#D4AF37",
  brightGold: "#E8C874",
  accentGold: "#F5C445",
  champagneSecondary: "#A8B0C5",
  offWhiteBody: "#F5F7FA",
  pureWhite: "#FFFFFF",
  successEmerald: "#2ED573",
  errorCrimson: "#F87171",
  pendingAmber: "#F59E0B",
} as const;

export const INTERACTIVE_TOKENS = {
  focusRingGold: "#D4AF37",
  focusRingBrightGold: "#E8C874",
  focusRingAmber: "#F5C445",
  focusRingWhite: "#FFFFFF",
  activeInputBorder: "#D4AF37",
  dangerInputBorder: "#F87171",
  successInputBorder: "#2ED573",
} as const;

describe("Navy & Gold Theme WCAG 2.1 Contrast Compliance", () => {
  const backgroundEntries = Object.entries(THEME_BACKGROUNDS);

  describe("Body & Headings Contrast (WCAG AA Normal Text >= 4.5:1)", () => {
    backgroundEntries.forEach(([bgName, bgHex]) => {
      it(`primary gold (#D4AF37) meets AA normal text standard on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(THEME_FOREGROUNDS.primaryGold, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it(`bright gold (#E8C874) meets AA normal text standard on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(THEME_FOREGROUNDS.brightGold, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it(`warm accent gold (#F5C445) meets AA normal text standard on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(THEME_FOREGROUNDS.accentGold, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it(`champagne secondary (#A8B0C5) meets AA normal text standard on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(THEME_FOREGROUNDS.champagneSecondary, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it(`off-white body (#F5F7FA) meets AAA normal text standard (>= 7.0:1) on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(THEME_FOREGROUNDS.offWhiteBody, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(7.0);
      });
    });
  });

  describe("Status & Feedback Colors (WCAG AA Normal Text >= 4.5:1)", () => {
    backgroundEntries.forEach(([bgName, bgHex]) => {
      it(`success emerald (#2ED573) meets AA normal text standard on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(THEME_FOREGROUNDS.successEmerald, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it(`error crimson (#F87171) meets AA normal text standard on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(THEME_FOREGROUNDS.errorCrimson, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it(`pending amber (#F59E0B) meets AA normal text standard on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(THEME_FOREGROUNDS.pendingAmber, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe("WCAG 2.1 SC 1.4.11 Non-text Contrast: Keyboard Focus Rings & Control Borders (>= 3.0:1)", () => {
    backgroundEntries.forEach(([bgName, bgHex]) => {
      it(`primary gold focus ring (#D4AF37) meets non-text contrast (>= 3.0:1) on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(INTERACTIVE_TOKENS.focusRingGold, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      });

      it(`bright gold focus ring (#E8C874) meets non-text contrast (>= 3.0:1) on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(INTERACTIVE_TOKENS.focusRingBrightGold, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      });

      it(`amber focus ring (#F5C445) meets non-text contrast (>= 3.0:1) on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(INTERACTIVE_TOKENS.focusRingAmber, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      });

      it(`white focus ring (#FFFFFF) meets non-text contrast (>= 3.0:1) on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(INTERACTIVE_TOKENS.focusRingWhite, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      });

      it(`active input border (#D4AF37) meets non-text contrast (>= 3.0:1) on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(INTERACTIVE_TOKENS.activeInputBorder, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      });

      it(`danger input border (#F87171) meets non-text contrast (>= 3.0:1) on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(INTERACTIVE_TOKENS.dangerInputBorder, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      });

      it(`success input border (#2ED573) meets non-text contrast (>= 3.0:1) on ${bgName} (${bgHex})`, () => {
        const ratio = getContrastRatio(INTERACTIVE_TOKENS.successInputBorder, bgHex);
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      });
    });

    describe("Interactive control boundary contrast checks", () => {
      it("verifies focused control borders are distinctly identifiable against input container background", () => {
        const inputBg = THEME_BACKGROUNDS.darkNavyAlt; // #0F2140
        const focusRing = INTERACTIVE_TOKENS.focusRingGold; // #D4AF37
        const ratio = getContrastRatio(focusRing, inputBg);
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      });

      it("catches subtle un-focused border opacity if it falls below 3.0:1 so developers know to rely on focus rings for keyboard navigation", () => {
        // Gold rgba(212, 175, 55, 0.25)
        const blended = blendRgbaOverHex(212, 175, 55, 0.25, THEME_BACKGROUNDS.deepNavy);
        const ratio = getContrastRatio(blended, THEME_BACKGROUNDS.deepNavy);
        // Confirms that resting subtle borders alone do not satisfy focus indicators, proving explicit focus rings (focus:ring-2) are required
        expect(ratio).toBeLessThan(3.0);
      });
    });
  });

  describe("Regression prevention against unreadable colors", () => {
    it("catches low-contrast dark red (#DC2626) which violates AA normal text on dark backgrounds", () => {
      const darkRedHex = "#DC2626";
      const ratioOnCard = getContrastRatio(darkRedHex, THEME_BACKGROUNDS.cardGradientBottom);
      expect(ratioOnCard).toBeLessThan(4.5);
    });

    it("catches low-contrast dark gray (#6B7280) which violates AA normal text on dark backgrounds", () => {
      const darkGrayHex = "#6B7280";
      const ratioOnNavy = getContrastRatio(darkGrayHex, THEME_BACKGROUNDS.deepNavy);
      expect(ratioOnNavy).toBeLessThan(4.5);
    });
  });
});
