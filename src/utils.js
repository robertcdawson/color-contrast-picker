// Calculate a pixel's luminance.
function luminance(r, g, b) {
  const a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928
      ? v / 12.92
      : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// Calculate the contrast ratio between two colors.
export function getContrast(rgb1, rgb2) {
  const lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return ((brightest + 0.05) / (darkest + 0.05)).toFixed(2);
}

// Return color contrast grade based on contrast ratio
// Reference: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
export function colorContrastRating(ratio) {
  let rating = "";
  switch (true) {
    case (ratio >= 7):
      rating = "great";
      break;
    case (ratio >= 4.5) && (ratio < 7):
      rating = "good";
      break;
    case (ratio >= 3) && (ratio < 4.5):
      rating = "okay";
      break;
    case (ratio < 3):
      rating = "poor";
      break;
    default:
      break;
  }
  return rating;
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
