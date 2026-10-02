#!/usr/bin/env node

/**
 * CI WCAG AA Theme Contrast Reporter
 * Audits theme color tokens across background surfaces and generates
 * a detailed breakdown of passing and failing pairs.
 */

function srgbToLinear(c) {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex) {
  const cleanHex = hex.replace("#", "");
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
  };
}

function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rLin = srgbToLinear(r);
  const gLin = srgbToLinear(g);
  const bLin = srgbToLinear(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

function getContrastRatio(fgHex, bgHex) {
  const l1 = getRelativeLuminance(fgHex);
  const l2 = getRelativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

const THEME_BACKGROUNDS = {
  "Deep Navy": "#0A1931",
  "Dark Navy Alt": "#0F2140",
  "Card Gradient Top": "#142850",
  "Card Gradient Bottom": "#1B2F5E",
};

const TEXT_TOKENS = {
  "Primary Gold": { hex: "#D4AF37", minRatio: 4.5, type: "Normal Text" },
  "Bright Gold": { hex: "#E8C874", minRatio: 4.5, type: "Normal Text" },
  "Accent Gold": { hex: "#F5C445", minRatio: 4.5, type: "Normal Text" },
  "Secondary Champagne": { hex: "#A8B0C5", minRatio: 4.5, type: "Normal Text" },
  "Off-White Body": { hex: "#F5F7FA", minRatio: 4.5, type: "Normal Text" },
  "Pure White": { hex: "#FFFFFF", minRatio: 4.5, type: "Normal Text" },
  "Success Emerald": { hex: "#2ED573", minRatio: 4.5, type: "Normal Text" },
  "Error Crimson": { hex: "#F87171", minRatio: 4.5, type: "Normal Text" },
  "Pending Amber": { hex: "#F59E0B", minRatio: 4.5, type: "Normal Text" },
};

const UI_CONTROL_TOKENS = {
  "Focus Ring Gold": { hex: "#D4AF37", minRatio: 3.0, type: "UI Control" },
  "Focus Ring Bright Gold": { hex: "#E8C874", minRatio: 3.0, type: "UI Control" },
  "Focus Ring Amber": { hex: "#F5C445", minRatio: 3.0, type: "UI Control" },
  "Focus Ring White": { hex: "#FFFFFF", minRatio: 3.0, type: "UI Control" },
  "Active Input Border": { hex: "#D4AF37", minRatio: 3.0, type: "UI Control" },
  "Danger Input Border": { hex: "#F87171", minRatio: 3.0, type: "UI Control" },
  "Success Input Border": { hex: "#2ED573", minRatio: 3.0, type: "UI Control" },
};

console.log("================================================================================");
console.log("            SWIFTMART THEME WCAG AA CONTRAST CI AUDIT REPORT                    ");
console.log("================================================================================\n");

const allTokens = { ...TEXT_TOKENS, ...UI_CONTROL_TOKENS };
const failures = [];
let totalPairs = 0;
let passedPairs = 0;

for (const [bgName, bgHex] of Object.entries(THEME_BACKGROUNDS)) {
  console.log(`Surface: ${bgName} (${bgHex})`);
  console.log("--------------------------------------------------------------------------------");

  for (const [tokenName, tokenData] of Object.entries(allTokens)) {
    totalPairs++;
    const ratio = getContrastRatio(tokenData.hex, bgHex);
    const passed = ratio >= tokenData.minRatio;

    if (passed) {
      passedPairs++;
      console.log(`  [PASS] ${tokenName.padEnd(24)} (${tokenData.hex}) -> Ratio: ${ratio.toFixed(2).padStart(5)}:1 (Min: ${tokenData.minRatio.toFixed(1)}:1)`);
    } else {
      failures.push({
        tokenName,
        tokenHex: tokenData.hex,
        tokenType: tokenData.type,
        bgName,
        bgHex,
        ratio,
        requiredRatio: tokenData.minRatio,
      });
      console.log(`  [FAIL] ${tokenName.padEnd(24)} (${tokenData.hex}) -> Ratio: ${ratio.toFixed(2).padStart(5)}:1 (Min: ${tokenData.minRatio.toFixed(1)}:1) [FAILED]`);
    }
  }
  console.log("");
}

console.log("================================================================================");
console.log(`Summary: ${passedPairs}/${totalPairs} color pairs pass WCAG AA.`);
console.log("================================================================================\n");

if (failures.length > 0) {
  console.error(`🚨 ${failures.length} CONTRAST FAILURE(S) DETECTED IN THEME TOKENS:\n`);
  failures.forEach((f, idx) => {
    console.error(
      `${idx + 1}. Pair: "${f.tokenName}" (${f.tokenHex}) on "${f.bgName}" (${f.bgHex})\n` +
      `   Element Type : ${f.tokenType}\n` +
      `   Actual Ratio : ${f.ratio.toFixed(2)}:1\n` +
      `   Required Min : ${f.requiredRatio.toFixed(1)}:1 (WCAG AA)\n` +
      `   Deficit      : ${(f.requiredRatio - f.ratio).toFixed(2)}:1 below threshold\n`
    );
  });
  process.exit(1);
} else {
  console.log("✅ All theme color pairs comply with WCAG AA specifications.");
  process.exit(0);
}
