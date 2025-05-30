/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color code
 * @returns {Object} RGB color object
 */
function hexToRgb(hex) {
  // Remove the hash if present
  hex = hex.replace(/^#/, '');

  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return { r, g, b };
}

/**
 * Convert RGB color to relative luminance
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {number} Relative luminance value
 */
function getRelativeLuminance(r, g, b) {
  // Convert to sRGB
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928
      ? val / 12.92
      : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  // Calculate relative luminance
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * @param {string} color1 - First hex color code
 * @param {string} color2 - Second hex color code
 * @returns {number} Contrast ratio
 */
export function calculateContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  // Calculate contrast ratio
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return ratio;
}

/**
 * Determine WCAG compliance level
 * @param {number} contrastRatio - Calculated contrast ratio
 * @param {string} complianceLevel - Selected compliance level (AA or AAA)
 * @param {string} textSize - Text size (normal or large)
 * @returns {string} Compliance status
 */
export function getWCAGLevel(contrastRatio, complianceLevel, textSize) {
  let requiredRatio;

  if (complianceLevel === 'AA') {
    requiredRatio = textSize === 'normal' ? 4.5 : 3;
  } else {
    requiredRatio = textSize === 'normal' ? 7 : 4.5;
  }

  if (contrastRatio >= requiredRatio) {
    return `Pass (${complianceLevel})`;
  } else {
    return `Fail (${complianceLevel})`;
  }
}

/**
 * Suggest a better foreground color to meet WCAG compliance
 * @param {string} foregroundColor - Foreground color to adjust
 * @param {string} backgroundColor - Background color (reference)
 * @param {string} complianceLevel - Target compliance level
 * @param {string} textSize - Text size
 * @returns {string|null} Suggested color or null if no suggestion
 */
export function suggestBetterColor(foregroundColor, backgroundColor, complianceLevel, textSize) {
  const currentRatio = calculateContrastRatio(foregroundColor, backgroundColor);
  const requiredRatio = complianceLevel === 'AA'
    ? (textSize === 'normal' ? 4.5 : 3)
    : (textSize === 'normal' ? 7 : 4.5);

  // Add significant safety margin to ensure reliable compliance
  const targetRatio = requiredRatio * 1.15; // 15% above minimum

  if (currentRatio >= requiredRatio) {
    return null; // Already compliant
  }

  const fgRgb = hexToRgb(foregroundColor);
  const bgRgb = hexToRgb(backgroundColor);
  
  const fgLuminance = getRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  let bestColor = null;
  let bestRatio = 0;

  // Strategy 1: Try pure black and white first (most reliable)
  const blackRatio = calculateContrastRatio('#000000', backgroundColor);
  const whiteRatio = calculateContrastRatio('#FFFFFF', backgroundColor);
  
  if (blackRatio >= targetRatio && blackRatio > bestRatio) {
    bestColor = '#000000';
    bestRatio = blackRatio;
  }
  
  if (whiteRatio >= targetRatio && whiteRatio > bestRatio) {
    bestColor = '#FFFFFF';
    bestRatio = whiteRatio;
  }

  // Strategy 2: Try high-contrast grays
  const grayLevels = [0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255];
  for (const level of grayLevels) {
    const grayColor = `#${level.toString(16).padStart(2, '0').repeat(3)}`;
    const ratio = calculateContrastRatio(grayColor, backgroundColor);
    
    if (ratio >= targetRatio && ratio > bestRatio) {
      bestColor = grayColor;
      bestRatio = ratio;
    }
  }

  // Strategy 3: Preserve hue but adjust lightness
  if (!bestColor || bestRatio < targetRatio) {
    const hsl = rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);
    
    // Try different lightness values while preserving hue and saturation
    for (let lightness = 0; lightness <= 100; lightness += 5) {
      const rgb = hslToRgb(hsl.h, hsl.s, lightness);
      const testColor = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
      const ratio = calculateContrastRatio(testColor, backgroundColor);
      
      if (ratio >= targetRatio && ratio > bestRatio) {
        bestColor = testColor;
        bestRatio = ratio;
      }
    }
  }

  // Strategy 4: Mathematical approach - calculate exact luminance needed
  if (!bestColor || bestRatio < targetRatio) {
    const targetLuminance = calculateTargetLuminance(bgLuminance, targetRatio);
    if (targetLuminance !== null) {
      const targetColor = luminanceToGray(targetLuminance);
      const ratio = calculateContrastRatio(targetColor, backgroundColor);
      
      if (ratio >= targetRatio) {
        bestColor = targetColor;
        bestRatio = ratio;
      }
    }
  }

  return bestColor && bestRatio >= requiredRatio ? bestColor : null;
}

/**
 * Suggest a better background color to meet WCAG compliance
 * @param {string} foregroundColor - Foreground color (reference)
 * @param {string} backgroundColor - Background color to adjust
 * @param {string} complianceLevel - Target compliance level
 * @param {string} textSize - Text size
 * @returns {string|null} Suggested color or null if no suggestion
 */
export function suggestBetterBackgroundColor(foregroundColor, backgroundColor, complianceLevel, textSize) {
  const currentRatio = calculateContrastRatio(foregroundColor, backgroundColor);
  const requiredRatio = complianceLevel === 'AA'
    ? (textSize === 'normal' ? 4.5 : 3)
    : (textSize === 'normal' ? 7 : 4.5);

  // Add significant safety margin to ensure reliable compliance
  const targetRatio = requiredRatio * 1.15; // 15% above minimum

  if (currentRatio >= requiredRatio) {
    return null; // Already compliant
  }

  const fgRgb = hexToRgb(foregroundColor);
  const bgRgb = hexToRgb(backgroundColor);
  
  const fgLuminance = getRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  let bestColor = null;
  let bestRatio = 0;

  // Strategy 1: Try pure black and white first (most reliable)
  const blackBgRatio = calculateContrastRatio(foregroundColor, '#000000');
  const whiteBgRatio = calculateContrastRatio(foregroundColor, '#FFFFFF');
  
  if (blackBgRatio >= targetRatio && blackBgRatio > bestRatio) {
    bestColor = '#000000';
    bestRatio = blackBgRatio;
  }
  
  if (whiteBgRatio >= targetRatio && whiteBgRatio > bestRatio) {
    bestColor = '#FFFFFF';
    bestRatio = whiteBgRatio;
  }

  // Strategy 2: Try high-contrast grays
  const grayLevels = [0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255];
  for (const level of grayLevels) {
    const grayColor = `#${level.toString(16).padStart(2, '0').repeat(3)}`;
    const ratio = calculateContrastRatio(foregroundColor, grayColor);
    
    if (ratio >= targetRatio && ratio > bestRatio) {
      bestColor = grayColor;
      bestRatio = ratio;
    }
  }

  // Strategy 3: Try common accessible background colors
  const accessibleBackgrounds = [
    '#FFFFFF', '#F8F9FA', '#E9ECEF', '#DEE2E6', '#CED4DA', '#ADB5BD',
    '#6C757D', '#495057', '#343A40', '#212529', '#000000',
    // Light tints
    '#FFF5F5', '#F0FFF4', '#F0F8FF', '#FFFAF0', '#F5F5DC',
    // Dark backgrounds
    '#1A1A1A', '#2D2D2D', '#404040', '#1E1E1E', '#0D1117'
  ];
  
  for (const testBg of accessibleBackgrounds) {
    if (testBg === backgroundColor) continue;
    
    const ratio = calculateContrastRatio(foregroundColor, testBg);
    if (ratio >= targetRatio && ratio > bestRatio) {
      bestColor = testBg;
      bestRatio = ratio;
    }
  }

  // Strategy 4: Preserve hue but adjust lightness
  if (!bestColor || bestRatio < targetRatio) {
    const hsl = rgbToHsl(bgRgb.r, bgRgb.g, bgRgb.b);
    
    // Try different lightness values while preserving hue and saturation
    for (let lightness = 0; lightness <= 100; lightness += 5) {
      const rgb = hslToRgb(hsl.h, hsl.s, lightness);
      const testColor = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
      const ratio = calculateContrastRatio(foregroundColor, testColor);
      
      if (ratio >= targetRatio && ratio > bestRatio) {
        bestColor = testColor;
        bestRatio = ratio;
      }
    }
  }

  // Strategy 5: Mathematical approach - calculate exact luminance needed
  if (!bestColor || bestRatio < targetRatio) {
    const targetLuminance = calculateTargetLuminance(fgLuminance, targetRatio);
    if (targetLuminance !== null) {
      const targetColor = luminanceToGray(targetLuminance);
      const ratio = calculateContrastRatio(foregroundColor, targetColor);
      
      if (ratio >= targetRatio) {
        bestColor = targetColor;
        bestRatio = ratio;
      }
    }
  }

  return bestColor && bestRatio >= requiredRatio ? bestColor : null;
}

/**
 * Calculate the target luminance needed to achieve a specific contrast ratio
 * @param {number} referenceLuminance - Luminance of the reference color
 * @param {number} targetRatio - Desired contrast ratio
 * @returns {number|null} Target luminance or null if impossible
 */
function calculateTargetLuminance(referenceLuminance, targetRatio) {
  // For contrast ratio = (L1 + 0.05) / (L2 + 0.05) where L1 > L2
  // We can solve for the unknown luminance
  
  // Try both possibilities: target being lighter or darker
  const lighterLuminance = (referenceLuminance + 0.05) * targetRatio - 0.05;
  const darkerLuminance = (referenceLuminance + 0.05) / targetRatio - 0.05;
  
  // Return the valid luminance value (between 0 and 1)
  if (lighterLuminance >= 0 && lighterLuminance <= 1) {
    return lighterLuminance;
  }
  if (darkerLuminance >= 0 && darkerLuminance <= 1) {
    return darkerLuminance;
  }
  
  return null;
}

/**
 * Convert a luminance value to a gray color
 * @param {number} luminance - Target luminance (0-1)
 * @returns {string} Hex color string
 */
function luminanceToGray(luminance) {
  // Inverse of the luminance calculation for gray (R=G=B)
  // L = 0.2126 * Rs + 0.7152 * Gs + 0.0722 * Bs
  // For gray: L = Rs (since Rs = Gs = Bs)
  // Rs = L <= 0.03928 ? L * 12.92 : Math.pow((L + 0.055) / 1.055, 1/2.4)
  
  let srgb;
  if (luminance <= 0.03928) {
    srgb = luminance * 12.92;
  } else {
    srgb = Math.pow((luminance + 0.055) / 1.055, 1 / 2.4);
  }
  
  const value = Math.round(srgb * 255);
  const clampedValue = Math.max(0, Math.min(255, value));
  const hex = clampedValue.toString(16).padStart(2, '0');
  
  return `#${hex}${hex}${hex}`;
}

/**
 * Convert RGB to HSL
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {Object} HSL object with h, s, l properties
 */
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {Object} RGB object with r, g, b properties
 */
function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Get multiple color suggestions for both foreground and background
 * @param {string} foregroundColor - Current foreground color
 * @param {string} backgroundColor - Current background color
 * @param {string} complianceLevel - Target compliance level
 * @param {string} textSize - Text size
 * @returns {Object} Object with foreground and background suggestions
 */
export function getColorSuggestions(foregroundColor, backgroundColor, complianceLevel, textSize) {
  const suggestions = {
    foreground: null,
    background: null,
    alternatives: []
  };

  // Try to suggest better foreground color
  suggestions.foreground = suggestBetterColor(foregroundColor, backgroundColor, complianceLevel, textSize);
  
  // Try to suggest better background color
  suggestions.background = suggestBetterBackgroundColor(foregroundColor, backgroundColor, complianceLevel, textSize);

  // Generate some alternative combinations
  const commonColors = [
    '#000000', '#FFFFFF', '#333333', '#666666', '#999999', '#CCCCCC',
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'
  ];

  for (const altBg of commonColors) {
    if (altBg === backgroundColor) continue;
    
    const ratio = calculateContrastRatio(foregroundColor, altBg);
    const requiredRatio = complianceLevel === 'AA'
      ? (textSize === 'normal' ? 4.5 : 3)
      : (textSize === 'normal' ? 7 : 4.5);
    
    if (ratio >= requiredRatio) {
      suggestions.alternatives.push({
        foreground: foregroundColor,
        background: altBg,
        ratio: ratio
      });
    }
  }

  // Limit alternatives to top 3
  suggestions.alternatives = suggestions.alternatives
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3);

  return suggestions;
} 