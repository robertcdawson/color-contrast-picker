export function parseCssColor(color) {
  if (!color) return null;

  const normalized = color.trim().toLowerCase();
  if (normalized === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      if ([r, g, b].some(value => Number.isNaN(value))) return null;
      return { r, g, b, a: 1 };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if ([r, g, b].some(value => Number.isNaN(value))) return null;
      return { r, g, b, a: 1 };
    }
  }

  const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map(value => value.trim());
    if (parts.length < 3) return null;
    const [r, g, b] = parts.slice(0, 3).map(value => parseFloat(value));
    const a = parts.length === 4 ? parseFloat(parts[3]) : 1;
    if ([r, g, b, a].some(value => Number.isNaN(value))) return null;
    return { r: clampChannel(r), g: clampChannel(g), b: clampChannel(b), a: clampAlpha(a) };
  }

  return null;
}

export function blendColors(foreground, background) {
  const fgAlpha = clampAlpha(foreground.a ?? 1);
  const bgAlpha = clampAlpha(background.a ?? 1);
  const outAlpha = fgAlpha + bgAlpha * (1 - fgAlpha);

  if (outAlpha === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const r = Math.round((foreground.r * fgAlpha + background.r * bgAlpha * (1 - fgAlpha)) / outAlpha);
  const g = Math.round((foreground.g * fgAlpha + background.g * bgAlpha * (1 - fgAlpha)) / outAlpha);
  const b = Math.round((foreground.b * fgAlpha + background.b * bgAlpha * (1 - fgAlpha)) / outAlpha);

  return { r, g, b, a: outAlpha };
}

export function toHex(color) {
  if (!color) return null;
  const r = clampChannel(color.r);
  const g = clampChannel(color.g);
  const b = clampChannel(color.b);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

export function clampChannel(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.min(255, Math.max(0, Math.round(num)));
}

export function clampAlpha(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 1;
  return Math.min(1, Math.max(0, num));
}

