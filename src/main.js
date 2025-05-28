import { ColorPicker } from './components/ColorPicker';
import { ContrastAnalyzer } from './components/ContrastAnalyzer';
import { ThemeManager } from './components/ThemeManager';
import { PageScanner } from './components/PageScanner';

// Import contrast calculation utilities
import { calculateContrastRatio, getWCAGLevel } from './utils/contrast';

// Collapsible section manager
class CollapsibleManager {
  constructor() {
    this.sections = new Map();
    this.init();
  }

  init() {
    // Find all collapsible sections
    const toggles = document.querySelectorAll('.section-toggle');
    
    toggles.forEach(toggle => {
      if (!toggle) return; // Skip if toggle is null
      
      const contentId = toggle.id.replace('Toggle', 'Content');
      const content = document.getElementById(contentId);
      
      if (content && toggle.addEventListener) {
        this.sections.set(toggle.id, {
          toggle,
          content,
          isExpanded: false
        });

        // Add click handler with error handling
        try {
          toggle.addEventListener('click', () => {
            this.toggleSection(toggle.id);
          });

          // Add keyboard handler with error handling
          toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              this.toggleSection(toggle.id);
            }
          });
        } catch (error) {
          console.error('Error adding event listeners to toggle:', toggle.id, error);
        }
      }
    });
  }

  toggleSection(toggleId) {
    const section = this.sections.get(toggleId);
    if (!section) return;

    const { toggle, content, isExpanded } = section;
    const newState = !isExpanded;

    // Update state
    this.sections.set(toggleId, { ...section, isExpanded: newState });

    // Update UI
    toggle.setAttribute('aria-expanded', newState.toString());
    
    if (newState) {
      content.classList.add('expanded');
    } else {
      content.classList.remove('expanded');
    }

    // Rotate chevron icon
    const icon = toggle.querySelector('i');
    if (icon) {
      icon.style.transform = newState ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }

  expandSection(toggleId) {
    const section = this.sections.get(toggleId);
    if (!section || section.isExpanded) return;
    this.toggleSection(toggleId);
  }

  collapseSection(toggleId) {
    const section = this.sections.get(toggleId);
    if (!section || !section.isExpanded) return;
    this.toggleSection(toggleId);
  }
}

// Color history manager
class ColorHistoryManager {
  constructor() {
    this.maxHistory = 10;
    this.history = this.loadHistory();
    this.init();
  }

  init() {
    this.updateHistoryDisplay();
  }

  loadHistory() {
    try {
      const stored = localStorage.getItem('colorContrastHistory');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveHistory() {
    try {
      localStorage.setItem('colorContrastHistory', JSON.stringify(this.history));
    } catch {
      // Ignore storage errors
    }
  }

  addColorPair(foreground, background) {
    const pair = { foreground, background, timestamp: Date.now() };
    
    // Remove existing identical pair
    this.history = this.history.filter(
      item => !(item.foreground === foreground && item.background === background)
    );
    
    // Add to beginning
    this.history.unshift(pair);
    
    // Limit size
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }
    
    this.saveHistory();
    this.updateHistoryDisplay();
  }

  updateHistoryDisplay() {
    const container = document.getElementById('colorHistory');
    if (!container) return;

    if (this.history.length === 0) {
      container.innerHTML = '<div class="no-history">No recent colors</div>';
      return;
    }

    const historyHTML = this.history.map(pair => `
      <div class="history-item" data-fg="${pair.foreground}" data-bg="${pair.background}">
        <div class="history-colors">
          <div class="history-color" style="background-color: ${pair.foreground}" title="${pair.foreground}"></div>
          <div class="history-color" style="background-color: ${pair.background}" title="${pair.background}"></div>
        </div>
        <div class="history-info">
          <div class="history-values">${pair.foreground} / ${pair.background}</div>
        </div>
        <button class="history-apply" title="Apply these colors">
          <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    `).join('');

    container.innerHTML = historyHTML;

    // Add click handlers
    container.querySelectorAll('.history-apply').forEach((button, index) => {
      button.addEventListener('click', () => {
        const pair = this.history[index];
        if (pair && window.colorPicker) {
          window.colorPicker.setForegroundColor(pair.foreground);
          window.colorPicker.setBackgroundColor(pair.background);
        }
      });
    });
  }
}

// Enhanced hex input handler
class HexInputManager {
  constructor() {
    this.init();
  }

  init() {
    const foregroundHex = document.getElementById('foregroundHex');
    const backgroundHex = document.getElementById('backgroundHex');

    if (foregroundHex) {
      this.setupHexInput(foregroundHex, 'foreground');
    }
    
    if (backgroundHex) {
      this.setupHexInput(backgroundHex, 'background');
    }
  }

  setupHexInput(input, type) {
    // Format input as user types
    input.addEventListener('input', (e) => {
      let value = e.target.value.replace(/[^0-9a-fA-F]/g, '');
      
      if (value.length > 6) {
        value = value.slice(0, 6);
      }
      
      if (value.length > 0 && !value.startsWith('#')) {
        value = '#' + value;
      }
      
      e.target.value = value;
    });

    // Apply color on Enter or blur
    const applyColor = () => {
      const value = input.value.trim();
      if (this.isValidHex(value)) {
        if (window.colorPicker) {
          if (type === 'foreground') {
            window.colorPicker.setForegroundColor(value);
          } else {
            window.colorPicker.setBackgroundColor(value);
          }
        }
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        applyColor();
        input.blur();
      }
    });

    input.addEventListener('blur', applyColor);
  }

  isValidHex(hex) {
    return /^#[0-9A-Fa-f]{6}$/.test(hex);
  }

  updateHexInput(type, color) {
    const input = document.getElementById(`${type}Hex`);
    if (input && input.value !== color) {
      input.value = color;
    }
  }
}

// Initialize components when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Initialize managers
    const collapsibleManager = new CollapsibleManager();
    const colorHistoryManager = new ColorHistoryManager();
    const hexInputManager = new HexInputManager();

    // Initialize color picker
    const colorPicker = new ColorPicker();
    window.colorPicker = colorPicker; // Make globally accessible

    // Initialize contrast analyzer
    const contrastAnalyzer = new ContrastAnalyzer();

    // Initialize theme manager
    const themeManager = new ThemeManager();
    themeManager.setupAccessibility();

    // Initialize page scanner
    const pageScanner = new PageScanner();
    window.pageScanner = pageScanner; // Make globally accessible

    // Handle URL parameters for sharing
    const params = new URLSearchParams(window.location.search);
    const fg = params.get('fg');
    const bg = params.get('bg');
    const level = params.get('level');
    const large = params.get('large');

    if (fg && bg) {
      // Update colors from URL parameters
      colorPicker.setForegroundColor(fg);
      colorPicker.setBackgroundColor(bg);
      contrastAnalyzer.setColors(fg, bg);

      // Update compliance level if specified
      if (level) {
        const radio = document.querySelector(`input[name="complianceLevel"][value="${level}"]`);
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change'));
        }
      }

      // Update text size if specified
      if (large) {
        const radio = document.querySelector(`input[name="textSize"][value="${large === 'true' ? 'large' : 'normal'}"]`);
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change'));
        }
      }
    }

    // Listen for color changes to update history and hex inputs
    document.addEventListener('colorChanged', (e) => {
      const { foreground, background } = e.detail;
      
      // Update hex inputs
      hexInputManager.updateHexInput('foreground', foreground);
      hexInputManager.updateHexInput('background', background);
      
      // Add to history
      colorHistoryManager.addColorPair(foreground, background);
    });

    // Help button handler - show simple alert instead of opening non-existent help page
    const helpButton = document.getElementById('helpButton');
    if (helpButton) {
      helpButton.addEventListener('click', () => {
        // Show help information in a simple alert
        alert(`WCAG Color Contrast Checker v1.1.0

Key Features:
• Pick colors with eyedropper tools
• Check WCAG AA/AAA compliance
• Scan entire pages for contrast issues
• Visual overlays highlight problems
• Get color suggestions for fixes

Keyboard Shortcuts:
• Alt+1: Toggle Page Scanner
• Ctrl+Shift+P: Scan current page
• Ctrl+Shift+O: Toggle overlays
• Ctrl+C: Copy colors
• Ctrl+S: Share link
• Esc: Close popup

For more information, visit the Chrome Web Store page.`);
      });
    }

    // Add enhanced styles for new components
    const style = document.createElement('style');
    style.textContent = `
      /* History item styles */
      .history-item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2);
        border-radius: var(--radius-md);
        background-color: var(--bg-secondary);
        margin-bottom: var(--space-2);
        transition: all var(--transition-fast);
      }

      .history-item:hover {
        background-color: var(--bg-tertiary);
      }

      .history-colors {
        display: flex;
        gap: var(--space-1);
      }

      .history-color {
        width: 20px;
        height: 20px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-light);
      }

      .history-info {
        flex: 1;
        min-width: 0;
      }

      .history-values {
        font-family: 'SF Mono', 'Monaco', monospace;
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .history-apply {
        width: 24px;
        height: 24px;
        border: none;
        border-radius: var(--radius-sm);
        background-color: var(--accent-primary);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-xs);
        transition: all var(--transition-fast);
      }

      .history-apply:hover {
        background-color: var(--accent-hover);
        transform: scale(1.1);
      }

      /* Toast notification styles */
      .toast {
        position: fixed;
        bottom: var(--space-4);
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background-color: var(--bg-primary);
        color: var(--text-primary);
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--border-light);
        z-index: 1000;
        opacity: 0;
        transition: all var(--transition-normal);
        font-size: var(--font-size-sm);
        max-width: 300px;
        text-align: center;
      }

      .toast.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }

      .toast.success {
        border-color: var(--success);
        background-color: rgb(16 185 129 / 0.1);
      }

      .toast.error {
        border-color: var(--error);
        background-color: rgb(239 68 68 / 0.1);
      }
    `;
    document.head.appendChild(style);

    // Enhanced keyboard accessibility
    document.addEventListener('keydown', (e) => {
      // ESC key to close popup
      if (e.key === 'Escape') {
        window.close();
      }

      // CTRL+C to copy colors
      if (e.ctrlKey && e.key === 'c') {
        const copyButton = document.getElementById('copyColors');
        if (copyButton) copyButton.click();
      }

      // CTRL+S to save/share
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const shareButton = document.getElementById('shareLink');
        if (shareButton) shareButton.click();
      }

      // CTRL+SHIFT+S to swap colors
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        const swapButton = document.getElementById('swapColors');
        if (swapButton) swapButton.click();
      }

      // Number keys to toggle sections
      if (e.altKey && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const sections = ['pageScannerToggle', 'optionsToggle', 'suggestionsToggle', 'actionsToggle', 'historyToggle'];
        const sectionId = sections[parseInt(e.key) - 1];
        if (sectionId && collapsibleManager) {
          collapsibleManager.toggleSection(sectionId);
        }
      }

      // CTRL+SHIFT+P to scan page
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        const scanButton = document.getElementById('scanPageButton');
        if (scanButton) scanButton.click();
      }

      // CTRL+SHIFT+O to toggle overlays
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        const overlayButton = document.getElementById('toggleOverlaysButton');
        if (overlayButton) overlayButton.click();
      }
    });

    // Show toast notification
    window.showToast = (message, type = 'info', duration = 3000) => {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);

      // Show toast
      setTimeout(() => toast.classList.add('show'), 100);

      // Hide and remove toast
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, duration);
    };

    // Auto-expand suggestions section when colors fail WCAG
    document.addEventListener('contrastAnalyzed', (e) => {
      const { ratio, passes } = e.detail;
      
      if (!passes.AA && collapsibleManager) {
        // Auto-expand suggestions if colors fail
        collapsibleManager.expandSection('suggestionsToggle');
      }
    });

    console.log('Color Contrast Picker: Enhanced UI initialized');
    
  } catch (error) {
    console.error('Error initializing Color Contrast Picker:', error);
    // Show a simple error message to the user
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding: 20px; text-align: center; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 10px;';
    errorDiv.innerHTML = `
      <h3>Extension Error</h3>
      <p>There was an error loading the extension. Please try:</p>
      <ul style="text-align: left; margin: 10px 0;">
        <li>Refreshing the page</li>
        <li>Reloading the extension</li>
        <li>Checking the browser console for details</li>
      </ul>
    `;
    document.body.insertBefore(errorDiv, document.body.firstChild);
  }
}); 