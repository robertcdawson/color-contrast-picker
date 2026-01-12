import { blendColors, parseCssColor, toHex } from './utils/color';

let isPickingColor = false;
let originalCursor = '';

// Log that the content script has loaded
console.log('WCAG Color Contrast Checker: Content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  if (request.action === "activateColorPicker") {
    isPickingColor = true;
    originalCursor = document.body.style.cursor;
    document.body.style.cursor = 'crosshair';

    const handleMouseMove = (e) => {
      if (!isPickingColor) return;

      try {
        // Get element under cursor
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element) return;

        const computedStyle = window.getComputedStyle(element);
        const backgroundColor = parseCssColor(computedStyle.backgroundColor);
        const textColor = parseCssColor(computedStyle.color);
        const effectiveBackground = getEffectiveBackgroundColor(element);
        const effectiveText = textColor && textColor.a < 1
          ? blendColors(textColor, effectiveBackground)
          : textColor;
        const pickedColor = backgroundColor && backgroundColor.a > 0
          ? backgroundColor
          : effectiveText;
        const hex = toHex(pickedColor) || '#CCCCCC';

        // Show preview tooltip
        showColorPreview(e.clientX, e.clientY, hex, element.tagName.toLowerCase());
      } catch (error) {
        console.error('Error getting element color:', error);
        showColorPreview(e.clientX, e.clientY, '#CCCCCC', 'unknown');
      }
    };

    const handleClick = (e) => {
      if (!isPickingColor) return;

      e.preventDefault();
      e.stopPropagation();

      try {
        // Get element under cursor
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element) {
          cleanup();
          sendResponse({ color: '#CCCCCC' });
          return;
        }

        const computedStyle = window.getComputedStyle(element);
        const backgroundColor = parseCssColor(computedStyle.backgroundColor);
        const textColor = parseCssColor(computedStyle.color);
        const effectiveBackground = getEffectiveBackgroundColor(element);
        const effectiveText = textColor && textColor.a < 1
          ? blendColors(textColor, effectiveBackground)
          : textColor;
        const pickedColor = backgroundColor && backgroundColor.a > 0
          ? backgroundColor
          : effectiveText;
        const hex = toHex(pickedColor) || '#CCCCCC';

        cleanup();
        sendResponse({ color: hex });
      } catch (error) {
        console.error('Error picking color:', error);
        cleanup();
        sendResponse({ color: '#CCCCCC' });
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        sendResponse({ canceled: true });
      }
    };

    const cleanup = () => {
      isPickingColor = false;
      document.body.style.cursor = originalCursor;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      removeColorPreview();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return true; // Keep the message channel open for the response
  }
});

function showColorPreview(x, y, color, elementType) {
  removeColorPreview();

  const preview = document.createElement('div');
  preview.id = 'color-picker-preview';
  preview.style.cssText = `
    position: fixed;
    left: ${x + 20}px;
    top: ${y + 20}px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    font-family: sans-serif;
    font-size: 12px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
  `;

  const swatch = document.createElement('div');
  swatch.style.cssText = `
    width: 20px;
    height: 20px;
    border: 1px solid #ccc;
    background-color: ${color};
  `;

  const text = document.createElement('span');
  text.textContent = color.toUpperCase();
  text.style.fontWeight = 'bold';

  const info = document.createElement('div');
  info.textContent = `Element: ${elementType}`;
  info.style.fontSize = '10px';
  info.style.color = '#666';

  const hint = document.createElement('div');
  hint.textContent = 'Click to select this color';
  hint.style.fontSize = '10px';
  hint.style.fontStyle = 'italic';
  hint.style.color = '#666';

  header.appendChild(swatch);
  header.appendChild(text);
  preview.appendChild(header);
  preview.appendChild(info);
  preview.appendChild(hint);

  document.body.appendChild(preview);
}

function removeColorPreview() {
  const preview = document.getElementById('color-picker-preview');
  if (preview) {
    preview.remove();
  }
}

function getEffectiveBackgroundColor(element) {
  const layers = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const computedStyle = window.getComputedStyle(current);
    const background = parseCssColor(computedStyle.backgroundColor);
    if (background) {
      layers.unshift(background);
    }
    current = current.parentElement;
  }

  let composite = { r: 255, g: 255, b: 255, a: 1 };
  layers.forEach(layer => {
    if (layer.a === 0) return;
    composite = blendColors(layer, composite);
  });

  return composite;
}
