import { luminance, calculateContrastRatio, adjustLuminance, rgbToHex, suggestAlternativeColors, colorContrastRating, hexToRgb, getWCAGCompliance, getContrast, suggestImprovement } from '../utils';

describe('utils', () => {
  test('luminance calculation', () => {
    expect(luminance(255, 255, 255)).toBeCloseTo(1);
    expect(luminance(0, 0, 0)).toBe(0);
  });

  test('calculateContrastRatio', () => {
    expect(calculateContrastRatio([255, 255, 255], [0, 0, 0])).toBe("21.00");
    expect(calculateContrastRatio([255, 255, 255], [255, 255, 255])).toBe("1.00");
  });

  test('adjustLuminance', () => {
    const result1 = adjustLuminance([128, 128, 128], 0.1);
    expect(result1[0]).toBeGreaterThanOrEqual(153);
    expect(result1[0]).toBeLessThanOrEqual(154);
    expect(result1[1]).toBeGreaterThanOrEqual(153);
    expect(result1[1]).toBeLessThanOrEqual(154);
    expect(result1[2]).toBeGreaterThanOrEqual(153);
    expect(result1[2]).toBeLessThanOrEqual(154);

    const result2 = adjustLuminance([255, 255, 255], -0.1);
    expect(result2[0]).toBeGreaterThanOrEqual(204);
    expect(result2[0]).toBeLessThanOrEqual(230);
    expect(result2[1]).toBeGreaterThanOrEqual(204);
    expect(result2[1]).toBeLessThanOrEqual(230);
    expect(result2[2]).toBeGreaterThanOrEqual(204);
    expect(result2[2]).toBeLessThanOrEqual(230);
  });

  test('rgbToHex conversion', () => {
    expect(rgbToHex([255, 255, 255])).toBe('#ffffff');
    expect(rgbToHex([0, 0, 0])).toBe('#000000');
  });

  test('suggestAlternativeColors', () => {
    const [color1, color2] = suggestAlternativeColors([255, 255, 255], [240, 240, 240]);
    expect(color1).not.toBe('#ffffff');
    expect(color2).not.toBe('#f0f0f0');
  });

  test('colorContrastRating', () => {
    expect(colorContrastRating(21)).toBe("great");
    expect(colorContrastRating(5)).toBe("good");
    expect(colorContrastRating(3.5)).toBe("okay");
    expect(colorContrastRating(2)).toBe("poor");
  });

  test('hexToRgb conversion', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
  });

  test('getWCAGCompliance', () => {
    expect(getWCAGCompliance(7, false)).toBe('AAA');
    expect(getWCAGCompliance(5, false)).toBe('AA');
    expect(getWCAGCompliance(3, true)).toBe('AA');
    expect(getWCAGCompliance(2, false)).toBe('Fail');
  });

  test('getContrast', () => {
    expect(getContrast('#ffffff', '#000000')).toBeCloseTo(21);
    expect(getContrast('#ffffff', '#ffffff')).toBe(1);
  });

  test('suggestImprovement', () => {
    const suggestion = suggestImprovement('#ffffff', '#eeeeee', false, 'AA');
    expect(typeof suggestion).toBe('string');
    expect(suggestion.length).toBeGreaterThan(0);
  });
});