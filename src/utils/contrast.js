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

  // Add safety margin to ensure we exceed the requirement
  const targetRatio = requiredRatio + 0.1;

  if (currentRatio >= requiredRatio) {
    return null; // Already compliant
  }

  const fgRgb = hexToRgb(foregroundColor);
  const bgRgb = hexToRgb(backgroundColor);
  
  const fgLuminance = getRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  // Determine if we need to make foreground lighter or darker
  const needsLighter = fgLuminance < bgLuminance;
  
  // Try multiple approaches to find the best color
  let bestColor = foregroundColor;
  let bestRatio = currentRatio;

  // Approach 1: Binary search with fine-grained control
  for (let intensity = 0.1; intensity <= 1.0; intensity += 0.05) {
    let testR, testG, testB;
    
    if (needsLighter) {
      // Make lighter by interpolating towards white
      testR = Math.round(fgRgb.r + (255 - fgRgb.r) * intensity);
      testG = Math.round(fgRgb.g + (255 - fgRgb.g) * intensity);
      testB = Math.round(fgRgb.b + (255 - fgRgb.b) * intensity);
    } else {
      // Make darker by interpolating towards black
      testR = Math.round(fgRgb.r * (1 - intensity));
      testG = Math.round(fgRgb.g * (1 - intensity));
      testB = Math.round(fgRgb.b * (1 - intensity));
    }

    // Ensure values are within valid range
    testR = Math.max(0, Math.min(255, testR));
    testG = Math.max(0, Math.min(255, testG));
    testB = Math.max(0, Math.min(255, testB));

    const testColor = '#' + [testR, testG, testB]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('').toUpperCase();

    const testRatio = calculateContrastRatio(testColor, backgroundColor);

    if (testRatio >= targetRatio && testRatio > bestRatio) {
      bestColor = testColor;
      bestRatio = testRatio;
    }
  }

  // Approach 2: Try pure black or white if interpolation didn't work
  if (bestRatio < targetRatio) {
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
  }

  return bestRatio >= requiredRatio ? bestColor : null;
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

  // Add safety margin to ensure we exceed the requirement
  const targetRatio = requiredRatio + 0.1;

  if (currentRatio >= requiredRatio) {
    return null; // Already compliant
  }

  const fgRgb = hexToRgb(foregroundColor);
  const bgRgb = hexToRgb(backgroundColor);
  
  const fgLuminance = getRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  // For background, we want to move away from the foreground luminance
  // If fg is dark, make bg lighter; if fg is light, make bg darker
  const needsLighter = fgLuminance < 0.5;
  
  let bestColor = backgroundColor;
  let bestRatio = currentRatio;

  // Approach 1: Fine-grained intensity adjustment
  for (let intensity = 0.1; intensity <= 1.0; intensity += 0.05) {
    let testR, testG, testB;
    
    if (needsLighter) {
      // Make background lighter by interpolating towards white
      testR = Math.round(bgRgb.r + (255 - bgRgb.r) * intensity);
      testG = Math.round(bgRgb.g + (255 - bgRgb.g) * intensity);
      testB = Math.round(bgRgb.b + (255 - bgRgb.b) * intensity);
    } else {
      // Make background darker by interpolating towards black
      testR = Math.round(bgRgb.r * (1 - intensity));
      testG = Math.round(bgRgb.g * (1 - intensity));
      testB = Math.round(bgRgb.b * (1 - intensity));
    }

    // Ensure values are within valid range
    testR = Math.max(0, Math.min(255, testR));
    testG = Math.max(0, Math.min(255, testG));
    testB = Math.max(0, Math.min(255, testB));

    const testColor = '#' + [testR, testG, testB]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('').toUpperCase();

    const testRatio = calculateContrastRatio(foregroundColor, testColor);

    if (testRatio >= targetRatio && testRatio > bestRatio) {
      bestColor = testColor;
      bestRatio = testRatio;
    }
  }

  // Approach 2: Try pure black or white backgrounds if interpolation didn't work
  if (bestRatio < targetRatio) {
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
  }

  // Approach 3: Try common high-contrast colors
  if (bestRatio < targetRatio) {
    const commonBgColors = [
      '#F8F9FA', '#E9ECEF', '#DEE2E6', '#CED4DA', '#ADB5BD', '#6C757D',
      '#495057', '#343A40', '#212529', '#000000', '#FFFFFF'
    ];
    
    for (const testBg of commonBgColors) {
      if (testBg === backgroundColor) continue;
      
      const testRatio = calculateContrastRatio(foregroundColor, testBg);
      if (testRatio >= targetRatio && testRatio > bestRatio) {
        bestColor = testBg;
        bestRatio = testRatio;
      }
    }
  }

  return bestRatio >= requiredRatio ? bestColor : null;
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