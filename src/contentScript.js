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

        // Get computed style
        const computedStyle = window.getComputedStyle(element);
        const color = computedStyle.backgroundColor || computedStyle.color;

        // Convert to hex
        let hex = '#CCCCCC'; // Default fallback

        if (color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') {
          // Parse RGB/RGBA values
          const rgb = color.match(/\d+/g);
          if (rgb && rgb.length >= 3) {
            hex = '#' + [rgb[0], rgb[1], rgb[2]].map(x => {
              const hex = parseInt(x).toString(16);
              return hex.length === 1 ? '0' + hex : hex;
            }).join('');
          }
        }

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

        // Get computed style
        const computedStyle = window.getComputedStyle(element);

        // Try to get background color first
        let targetColor = computedStyle.backgroundColor;

        // If background is transparent, try color (text color)
        if (targetColor === 'transparent' || targetColor === 'rgba(0, 0, 0, 0)') {
          targetColor = computedStyle.color;
        }

        // Convert to hex
        let hex = '#CCCCCC'; // Default fallback

        if (targetColor) {
          // Parse RGB/RGBA values
          const rgb = targetColor.match(/\d+/g);
          if (rgb && rgb.length >= 3) {
            hex = '#' + [rgb[0], rgb[1], rgb[2]].map(x => {
              const hex = parseInt(x).toString(16);
              return hex.length === 1 ? '0' + hex : hex;
            }).join('').toUpperCase();
          }
        }

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