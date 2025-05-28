import { calculateContrastRatio, getWCAGLevel } from '../utils/contrast';

export class PageScanner {
  constructor() {
    this.isScanning = false;
    this.scanResults = [];
    this.overlaysActive = false;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateUI();
  }

  setupEventListeners() {
    const scanButton = document.getElementById('scanPageButton');
    const toggleOverlaysButton = document.getElementById('toggleOverlaysButton');
    const clearOverlaysButton = document.getElementById('clearOverlaysButton');

    if (scanButton) {
      scanButton.addEventListener('click', () => this.scanPage());
    }

    if (toggleOverlaysButton) {
      toggleOverlaysButton.addEventListener('click', () => this.toggleOverlays());
    }

    if (clearOverlaysButton) {
      clearOverlaysButton.addEventListener('click', () => this.clearOverlays());
    }
  }

  async scanPage() {
    if (this.isScanning) return;

    this.isScanning = true;
    this.updateUI();

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Inject and execute the page scanning script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: this.scanPageElements,
      });

      if (results && results[0] && results[0].result) {
        this.scanResults = results[0].result;
        this.displayScanResults();
      } else {
        throw new Error('Failed to scan page elements');
      }
    } catch (error) {
      console.error('Error scanning page:', error);
      this.showError('Failed to scan page. Please try again.');
    } finally {
      this.isScanning = false;
      this.updateUI();
    }
  }

  // This function will be injected into the page
  scanPageElements() {
    // Helper function to get effective background color
    const getEffectiveBackgroundColor = (element) => {
      let current = element;
      
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        const bgColor = style.backgroundColor;
        
        if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
          return bgColor;
        }
        
        current = current.parentElement;
      }
      
      // Default to white if no background found
      return 'rgb(255, 255, 255)';
    };

    // Helper function to convert RGB to hex
    const rgbToHex = (rgb) => {
      if (!rgb) return null;
      
      const match = rgb.match(/\d+/g);
      if (!match || match.length < 3) return null;
      
      return '#' + match.slice(0, 3).map(x => {
        const hex = parseInt(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('').toUpperCase();
    };

    // Helper function to calculate contrast ratio
    const calculateContrastRatio = (color1, color2) => {
      const getLuminance = (hex) => {
        const rgb = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255);
        const [r, g, b] = rgb.map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      const lum1 = getLuminance(color1);
      const lum2 = getLuminance(color2);
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      
      return (brightest + 0.05) / (darkest + 0.05);
    };

    // Helper function to generate CSS selector
    const generateSelector = (element) => {
      if (element.id) {
        return `#${element.id}`;
      }
      
      if (element.className) {
        const classes = element.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          return `${element.tagName.toLowerCase()}.${classes[0]}`;
        }
      }
      
      return element.tagName.toLowerCase();
    };

    const results = [];
    const textElements = document.querySelectorAll('*');
    const processedElements = new Set();

    textElements.forEach((element, index) => {
      // Skip if already processed or if element has no text content
      if (processedElements.has(element) || !element.textContent.trim()) {
        return;
      }

      // Skip script, style, and other non-visual elements
      const tagName = element.tagName.toLowerCase();
      if (['script', 'style', 'meta', 'link', 'title', 'head'].includes(tagName)) {
        return;
      }

      // Check if element has visible text (not just whitespace)
      const hasVisibleText = element.childNodes.some(node => 
        node.nodeType === Node.TEXT_NODE && node.textContent.trim()
      );

      if (!hasVisibleText) return;

      try {
        const computedStyle = window.getComputedStyle(element);
        
        // Skip invisible elements
        if (computedStyle.display === 'none' || 
            computedStyle.visibility === 'hidden' || 
            computedStyle.opacity === '0') {
          return;
        }

        const textColor = computedStyle.color;
        const backgroundColor = getEffectiveBackgroundColor(element);
        
        if (!textColor || !backgroundColor) return;

        // Convert colors to hex
        const textHex = rgbToHex(textColor);
        const bgHex = rgbToHex(backgroundColor);
        
        if (!textHex || !bgHex) return;

        // Calculate contrast ratio
        const contrastRatio = calculateContrastRatio(textHex, bgHex);
        
        // Determine text size category
        const fontSize = parseFloat(computedStyle.fontSize);
        const fontWeight = computedStyle.fontWeight;
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
        
        // Check WCAG compliance
        const minRatio = isLargeText ? 3 : 4.5; // AA standard
        const minRatioAAA = isLargeText ? 4.5 : 7; // AAA standard
        
        const passesAA = contrastRatio >= minRatio;
        const passesAAA = contrastRatio >= minRatioAAA;

        // Get element position and size for overlay
        const rect = element.getBoundingClientRect();
        
        const result = {
          id: `element-${index}`,
          element: {
            tagName: element.tagName,
            textContent: element.textContent.trim().substring(0, 100),
            selector: generateSelector(element)
          },
          colors: {
            text: textHex,
            background: bgHex
          },
          contrast: {
            ratio: contrastRatio,
            passesAA,
            passesAAA,
            isLargeText
          },
          position: {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height
          }
        };

        results.push(result);
        processedElements.add(element);
      } catch (error) {
        console.warn('Error analyzing element:', error);
      }
    });

    return results;
  }

  displayScanResults() {
    const container = document.getElementById('scanResultsContainer');
    if (!container) return;

    const violations = this.scanResults.filter(result => !result.contrast.passesAA);
    const warnings = this.scanResults.filter(result => result.contrast.passesAA && !result.contrast.passesAAA);
    const passed = this.scanResults.filter(result => result.contrast.passesAAA);

    const summaryHTML = `
      <div class="scan-summary">
        <div class="summary-stats">
          <div class="stat-item stat-error">
            <span class="stat-number">${violations.length}</span>
            <span class="stat-label">Violations</span>
          </div>
          <div class="stat-item stat-warning">
            <span class="stat-number">${warnings.length}</span>
            <span class="stat-label">Warnings</span>
          </div>
          <div class="stat-item stat-success">
            <span class="stat-number">${passed.length}</span>
            <span class="stat-label">Passed</span>
          </div>
        </div>
      </div>
    `;

    let resultsHTML = '';
    
    if (violations.length > 0) {
      resultsHTML += `
        <div class="results-section">
          <h4 class="results-title error">
            <i class="fas fa-exclamation-triangle"></i>
            Contrast Violations (${violations.length})
          </h4>
          <div class="results-list">
            ${violations.map(result => this.createResultItem(result, 'error')).join('')}
          </div>
        </div>
      `;
    }

    if (warnings.length > 0) {
      resultsHTML += `
        <div class="results-section">
          <h4 class="results-title warning">
            <i class="fas fa-exclamation-circle"></i>
            AAA Warnings (${warnings.length})
          </h4>
          <div class="results-list">
            ${warnings.map(result => this.createResultItem(result, 'warning')).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = summaryHTML + resultsHTML;
    
    // Add click handlers for result items
    this.setupResultItemHandlers();
  }

  createResultItem(result, type) {
    const ratio = result.contrast.ratio.toFixed(2);
    const textPreview = result.element.textContent.length > 50 
      ? result.element.textContent.substring(0, 50) + '...'
      : result.element.textContent;

    return `
      <div class="result-item ${type}" data-element-id="${result.id}">
        <div class="result-colors">
          <div class="result-color" style="background-color: ${result.colors.text}" title="Text: ${result.colors.text}"></div>
          <div class="result-color" style="background-color: ${result.colors.background}" title="Background: ${result.colors.background}"></div>
        </div>
        <div class="result-info">
          <div class="result-ratio">${ratio}:1</div>
          <div class="result-element">${result.element.tagName.toLowerCase()}</div>
          <div class="result-text">${textPreview}</div>
        </div>
        <div class="result-actions">
          <button class="result-action highlight-btn" title="Highlight on page">
            <i class="fas fa-search"></i>
          </button>
          <button class="result-action fix-btn" title="Use these colors">
            <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;
  }

  setupResultItemHandlers() {
    const container = document.getElementById('scanResultsContainer');
    if (!container) return;

    // Highlight buttons
    container.querySelectorAll('.highlight-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const resultItem = e.target.closest('.result-item');
        const elementId = resultItem.dataset.elementId;
        this.highlightElement(elementId);
      });
    });

    // Fix buttons
    container.querySelectorAll('.fix-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const resultItem = e.target.closest('.result-item');
        const elementId = resultItem.dataset.elementId;
        this.useColorsFromResult(elementId);
      });
    });
  }

  async highlightElement(elementId) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (id) => {
          // Remove existing highlights
          document.querySelectorAll('.contrast-highlight').forEach(el => el.remove());
          
          // Find the result for this element
          const elementIndex = parseInt(id.replace('element-', ''));
          const elements = document.querySelectorAll('*');
          const targetElement = elements[elementIndex];
          
          if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const highlight = document.createElement('div');
            highlight.className = 'contrast-highlight';
            highlight.style.cssText = `
              position: fixed;
              top: ${rect.top}px;
              left: ${rect.left}px;
              width: ${rect.width}px;
              height: ${rect.height}px;
              border: 3px solid #ef4444;
              background: rgba(239, 68, 68, 0.1);
              pointer-events: none;
              z-index: 2147483647;
              border-radius: 4px;
              animation: pulse 2s infinite;
            `;
            
            // Add pulse animation
            const style = document.createElement('style');
            style.textContent = `
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(highlight);
            
            // Remove highlight after 5 seconds
            setTimeout(() => {
              highlight.remove();
              style.remove();
            }, 5000);
            
            // Scroll element into view
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },
        args: [elementId]
      });
    } catch (error) {
      console.error('Error highlighting element:', error);
    }
  }

  useColorsFromResult(elementId) {
    const result = this.scanResults.find(r => r.id === elementId);
    if (result && window.colorPicker) {
      window.colorPicker.setForegroundColor(result.colors.text);
      window.colorPicker.setBackgroundColor(result.colors.background);
    }
  }

  async toggleOverlays() {
    if (this.overlaysActive) {
      await this.clearOverlays();
    } else {
      await this.showOverlays();
    }
  }

  async showOverlays() {
    if (this.scanResults.length === 0) {
      this.showError('Please scan the page first');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (results) => {
          // Remove existing overlays
          document.querySelectorAll('.contrast-overlay').forEach(el => el.remove());
          
          // Add overlays for violations
          const violations = results.filter(r => !r.contrast.passesAA);
          
          violations.forEach((result, index) => {
            const overlay = document.createElement('div');
            overlay.className = 'contrast-overlay';
            overlay.style.cssText = `
              position: absolute;
              top: ${result.position.top}px;
              left: ${result.position.left}px;
              width: ${result.position.width}px;
              height: ${result.position.height}px;
              border: 2px solid #ef4444;
              background: rgba(239, 68, 68, 0.1);
              pointer-events: none;
              z-index: 2147483646;
              border-radius: 2px;
            `;
            
            // Add tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'contrast-tooltip';
            tooltip.style.cssText = `
              position: absolute;
              top: -30px;
              left: 0;
              background: #1e293b;
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              white-space: nowrap;
              z-index: 2147483647;
            `;
            tooltip.textContent = `${result.contrast.ratio.toFixed(2)}:1 (Fails AA)`;
            
            overlay.appendChild(tooltip);
            document.body.appendChild(overlay);
          });
        },
        args: [this.scanResults]
      });

      this.overlaysActive = true;
      this.updateUI();
    } catch (error) {
      console.error('Error showing overlays:', error);
      this.showError('Failed to show overlays');
    }
  }

  async clearOverlays() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          document.querySelectorAll('.contrast-overlay, .contrast-highlight').forEach(el => el.remove());
        }
      });

      this.overlaysActive = false;
      this.updateUI();
    } catch (error) {
      console.error('Error clearing overlays:', error);
    }
  }

  updateUI() {
    const scanButton = document.getElementById('scanPageButton');
    const toggleOverlaysButton = document.getElementById('toggleOverlaysButton');
    const clearOverlaysButton = document.getElementById('clearOverlaysButton');

    if (scanButton) {
      scanButton.disabled = this.isScanning;
      scanButton.innerHTML = this.isScanning 
        ? '<i class="fas fa-spinner fa-spin"></i> Scanning...'
        : '<i class="fas fa-search"></i> Scan Page';
    }

    if (toggleOverlaysButton) {
      toggleOverlaysButton.disabled = this.scanResults.length === 0;
      toggleOverlaysButton.innerHTML = this.overlaysActive
        ? '<i class="fas fa-eye-slash"></i> Hide Overlays'
        : '<i class="fas fa-eye"></i> Show Overlays';
    }

    if (clearOverlaysButton) {
      clearOverlaysButton.disabled = !this.overlaysActive;
    }
  }

  showError(message) {
    const container = document.getElementById('scanResultsContainer');
    if (container) {
      container.innerHTML = `
        <div class="scan-error">
          <i class="fas fa-exclamation-triangle"></i>
          <span>${message}</span>
        </div>
      `;
    }
  }
} 