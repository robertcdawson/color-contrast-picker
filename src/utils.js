// Calculate a pixel's luminance.
export const luminance = (r, g, b) => {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

// Calculate the contrast ratio between two colors.
export function calculateContrastRatio(rgb1, rgb2) {
  const lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return ((brightest + 0.05) / (darkest + 0.05)).toFixed(2);
}

// Adjust the luminance of a color to improve contrast.
export function adjustLuminance(rgb, amount) {
  const adjustedRGB = rgb.map(channel => {
    const adjusted = channel + (channel * amount * 2);
    return Math.min(255, Math.max(0, Math.round(adjusted)));
  });
  return adjustedRGB;
}

// Convert RGB to HEX.
export const rgbToHex = rgb => `#${rgb.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;

// Suggest alternative colors for better contrast.
export function suggestAlternativeColors(rgb1, rgb2) {
  const hex1 = rgbToHex(rgb1);
  const hex2 = rgbToHex(rgb2);

  if (calculateContrastRatio(rgb1, rgb2) < 4.5) {
    const adjustedRGB1 = adjustLuminance(rgb1, -0.2);
    const adjustedRGB2 = adjustLuminance(rgb2, 0.2);
    return [rgbToHex(adjustedRGB1), rgbToHex(adjustedRGB2)];
  }

  return [hex1, hex2];
}

// Return color contrast grade based on contrast ratio
export function colorContrastRating(ratio) {
  const numericRatio = parseFloat(ratio);
  if (numericRatio >= 7) {
    return "great";
  } else if (numericRatio >= 4.5) {
    return "good";
  } else if (numericRatio >= 3) {
    return "okay";
  } else {
    return "poor";
  }
}

// Convert HEX to RGB.
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ]
    : null;
}

// Determine WCAG compliance level
export function getWCAGCompliance(ratio, isLargeText = false) {
  const numericRatio = parseFloat(ratio);

  if (isNaN(numericRatio)) {
    return 'Invalid input';
  }

  if (isLargeText) {
    if (numericRatio >= 4.5) {
      return 'AAA';
    } else if (numericRatio >= 3) {
      return 'AA';
    } else {
      return 'Fail';
    }
  } else {
    if (numericRatio >= 7) {
      return 'AAA';
    } else if (numericRatio >= 4.5) {
      return 'AA';
    } else {
      return 'Fail';
    }
  }
}

export function getContrast(color1, color2) {
  const lum1 = luminance(...hexToRgb(color1));
  const lum2 = luminance(...hexToRgb(color2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function suggestImprovement(color1, color2, isLargeText, complianceLevel) {
  // Implement logic to suggest color improvements
  // This is a placeholder and should be replaced with actual logic
  return "Try increasing the lightness of the lighter color or decreasing the lightness of the darker color.";
}