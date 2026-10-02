import { describe, it, expect } from "vitest";

function srgbToLinear(c: number): number {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

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
