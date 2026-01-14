(function () {
  if (window.ccpToggle) {
    window.ccpToggle();
    return;
  }

  // Lazy load: define toggle after init
  let isOpen = false;
  let root, panel, overlays = [];

  // Utilities (imported via bundler)
  // These will be bundled by webpack from utils/contrast
  const { calculateContrastRatio, getWCAGLevel } = require('./utils/contrast');

  function injectStyles() {
    if (document.getElementById('ccp-style')) return;
    const style = document.createElement('style');
    style.id = 'ccp-style';
    style.textContent = `
      .ccp-root { position: fixed; top: 16px; right: 16px; z-index: 2147483646; font-family: Inter, system-ui, sans-serif; }
      .ccp-panel { width: 320px; background: #fff; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 12px 30px rgba(0,0,0,.18); overflow: hidden; }
      .ccp-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; background: #0b1220; color: #fff; cursor: move; }
      .ccp-title { font-size: 14px; font-weight: 600; }
      .ccp-btn { border: none; background: #334155; color: #fff; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 12px; }
      .ccp-btn:hover { background: #475569; }
      .ccp-body { padding: 12px; display: grid; gap: 10px; }
      .ccp-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
      .ccp-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
      .ccp-swatch { width: 24px; height: 24px; border-radius: 6px; border: 1px solid #cbd5e1; }
      .ccp-contrast { display: flex; align-items: center; justify-content: space-between; }
      .ccp-ratio { font-weight: 700; }
      .ccp-badge { padding: 2px 6px; border-radius: 999px; font-size: 11px; border: 1px solid #e2e8f0; }
      .ccp-badge.pass { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
      .ccp-badge.fail { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
      .ccp-actions { display: flex; gap: 8px; }
      .ccp-overlay { position: absolute; pointer-events: none; border: 2px solid #ef4444; background: rgba(239,68,68,.12); border-radius: 3px; z-index: 2147483645; }
      .ccp-footer { padding: 8px 12px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569; }
      .ccp-link { color: #2563eb; text-decoration: none; }
    `;
    document.head.appendChild(style);
  }

  function createPanel() {
    injectStyles();

    root = document.createElement('div');
    root.className = 'ccp-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Color Contrast Panel');

    panel = document.createElement('div');
    panel.className = 'ccp-panel';

    panel.innerHTML = `
      <div class="ccp-header" id="ccp-header">
        <div class="ccp-title">Color Contrast</div>
        <div>
          <button class="ccp-btn" id="ccp-scan">Scan</button>
          <button class="ccp-btn" id="ccp-close">Close</button>
        </div>
      </div>
      <div class="ccp-body">
        <div class="ccp-row">
          <input id="ccp-fg" class="ccp-input" placeholder="#000000" value="#000000" aria-label="Text color hex" />
          <div id="ccp-fg-swatch" class="ccp-swatch" style="background:#000000"></div>
        </div>
        <div class="ccp-row">
          <input id="ccp-bg" class="ccp-input" placeholder="#FFFFFF" value="#FFFFFF" aria-label="Background color hex" />
          <div id="ccp-bg-swatch" class="ccp-swatch" style="background:#FFFFFF"></div>
        </div>
        <div class="ccp-contrast">
          <div>Ratio: <span id="ccp-ratio" class="ccp-ratio">21.00:1</span></div>
          <div id="ccp-status" class="ccp-badge pass">Pass (AA)</div>
        </div>
        <div class="ccp-actions">
          <button class="ccp-btn" id="ccp-swap">Swap</button>
          <button class="ccp-btn" id="ccp-clear">Clear Overlays</button>
        </div>
      </div>
      <div class="ccp-footer">
        Bookmarklet mode. <a class="ccp-link" href="https://www.w3.org/TR/WCAG21/#contrast-minimum" target="_blank" rel="noopener noreferrer">WCAG</a>
      </div>
    `;

    root.appendChild(panel);
    document.body.appendChild(root);

    makeDraggable(document.getElementById('ccp-header'), root);

    document.getElementById('ccp-close').addEventListener('click', removePanel);
    document.getElementById('ccp-swap').addEventListener('click', swapColors);
    document.getElementById('ccp-clear').addEventListener('click', clearOverlays);
    document.getElementById('ccp-scan').addEventListener('click', scanPage);

    const fg = document.getElementById('ccp-fg');
    const bg = document.getElementById('ccp-bg');

    const apply = () => updateContrast(fg.value, bg.value);
    fg.addEventListener('input', apply);
    bg.addEventListener('input', apply);

    updateContrast(fg.value, bg.value);

    // Focus management
    setTimeout(() => fg.focus(), 0);
  }

  function hex(input) {
    if (!input) return null;
    let v = input.trim().toUpperCase();
    if (!v.startsWith('#')) v = '#' + v;
    if (!/^#[0-9A-F]{6}$/.test(v)) return null;
    return v;
  }

  function updateContrast(fg, bg) {
    const fgHex = hex(fg);
    const bgHex = hex(bg);
    const ratioEl = document.getElementById('ccp-ratio');
    const statusEl = document.getElementById('ccp-status');
    const fgSw = document.getElementById('ccp-fg-swatch');
    const bgSw = document.getElementById('ccp-bg-swatch');

    if (fgSw && fgHex) fgSw.style.background = fgHex;
    if (bgSw && bgHex) bgSw.style.background = bgHex;

    if (!fgHex || !bgHex) return;

    const ratio = calculateContrastRatio(fgHex, bgHex);
    ratioEl.textContent = `${ratio.toFixed(2)}:1`;

    const status = getWCAGLevel(ratio, 'AA', 'normal');
    const isPass = status.startsWith('Pass');
    statusEl.textContent = status;
    statusEl.classList.toggle('pass', isPass);
    statusEl.classList.toggle('fail', !isPass);
  }

  function swapColors() {
    const fg = document.getElementById('ccp-fg');
    const bg = document.getElementById('ccp-bg');
    const tmp = fg.value;
    fg.value = bg.value;
    bg.value = tmp;
    updateContrast(fg.value, bg.value);
  }

  function clearOverlays() {
    overlays.forEach((o) => o.remove());
    overlays = [];
  }

  function scanPage() {
    clearOverlays();
    const elements = document.querySelectorAll('*');
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const viewportW = window.innerWidth || document.documentElement.clientWidth;

    let count = 0;
    elements.forEach((el) => {
      if (!el || !el.textContent) return;
      const text = el.textContent.trim();
      if (!text) return;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

      const rect = el.getBoundingClientRect();
      const inViewport = rect.bottom >= 0 && rect.right >= 0 && rect.top <= viewportH && rect.left <= viewportW;
      if (!inViewport) return;

      const fg = style.color;
      const bg = resolveBg(el);
      const fgHex = cssRgbToHex(fg);
      const bgHex = cssRgbToHex(bg);
      if (!fgHex || !bgHex) return;

      const ratio = calculateContrastRatio(fgHex, bgHex);
      const fontSizePx = parseFloat(style.fontSize);
      const bold = style.fontWeight === 'bold' || parseInt(style.fontWeight, 10) >= 700;
      const large = fontSizePx >= 24 || (fontSizePx >= 18.66 && bold);
      const minAA = large ? 3 : 4.5;
      if (ratio < minAA) {
        const overlay = document.createElement('div');
        overlay.className = 'ccp-overlay';
        overlay.style.top = `${rect.top + window.scrollY}px`;
        overlay.style.left = `${rect.left + window.scrollX}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        document.body.appendChild(overlay);
        overlays.push(overlay);
        count++;
      }
    });

    // Simple feedback
    if (count === 0) {
      // no-op
    }
  }

  function cssRgbToHex(rgbCss) {
    const match = rgbCss && rgbCss.match(/\d+/g);
    if (!match || match.length < 3) return null;
    const nums = match.slice(0,3).map((x) => Math.min(255, Math.max(0, parseInt(x,10))));
    return '#' + nums.map(n => n.toString(16).padStart(2,'0')).join('').toUpperCase();
  }

  function resolveBg(el) {
    let cur = el;
    let acc = [0,0,0,0];
    const def = [255,255,255,1];
    while (cur && cur !== document.documentElement) {
      const cs = window.getComputedStyle(cur);
      const img = cs.backgroundImage && cs.backgroundImage !== 'none';
      const col = parseRgba(cs.backgroundColor);
      if (col) {
        acc = blend(col, acc);
        if (acc[3] >= 0.999) break;
      }
      if (img) { acc = blend(def, acc); break; }
      cur = cur.parentElement;
    }
    if (acc[3] < 0.999) acc = blend(def, acc);
    return `rgb(${acc[0]}, ${acc[1]}, ${acc[2]})`;
  }

  function parseRgba(css) {
    if (!css) return null;
    const m = css.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d*\.?\d+))?\)/i);
    if (!m) return null;
    const r = Math.min(255, Math.max(0, parseInt(m[1],10)));
    const g = Math.min(255, Math.max(0, parseInt(m[2],10)));
    const b = Math.min(255, Math.max(0, parseInt(m[3],10)));
    const a = m[4] !== undefined ? Math.min(1, Math.max(0, parseFloat(m[4]))) : 1;
    return [r,g,b,a];
  }

  function blend(top, bottom) {
    const [r1,g1,b1,a1] = top;
    const [r2,g2,b2,a2] = bottom;
    const outA = a1 + a2 * (1 - a1);
    const outR = Math.round((r1 * a1 + r2 * a2 * (1 - a1)) / (outA || 1));
    const outG = Math.round((g1 * a1 + g2 * a2 * (1 - a1)) / (outA || 1));
    const outB = Math.round((b1 * a1 + b2 * a2 * (1 - a1)) / (outA || 1));
    return [outR, outG, outB, outA];
  }

  function makeDraggable(handle, target) {
    let startX = 0, startY = 0, baseX = 0, baseY = 0, dragging = false;
    const onDown = (e) => {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = target.getBoundingClientRect();
      baseX = rect.left; baseY = rect.top;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      target.style.top = `${baseY + dy}px`;
      target.style.left = `${baseX + dx}px`;
      target.style.right = 'auto';
    };
    const onUp = () => {
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    handle.addEventListener('mousedown', onDown);
  }

  function removePanel() {
    clearOverlays();
    if (root && root.parentNode) root.parentNode.removeChild(root);
    isOpen = false;
  }

  function toggle() {
    if (isOpen) {
      removePanel();
    } else {
      createPanel();
      isOpen = true;
    }
  }

  window.ccpToggle = toggle;
  toggle();
})();
