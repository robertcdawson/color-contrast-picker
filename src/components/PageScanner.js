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

      // Check if the current page allows script injection
      const url = tab.url;
      
      // Only block browser internal pages, but allow file:// URLs for local development
      if (url.startsWith('chrome://') || 
          url.startsWith('chrome-extension://') || 
          url.startsWith('edge://') || 
          url.startsWith('about:') ||
          url.startsWith('moz-extension://')) {
        throw new Error('Cannot scan this page. Page scanning is not allowed on browser internal pages.');
      }

      // Special handling for new tab pages and empty URLs
      if (url === 'chrome://newtab/' || 
          url === 'edge://newtab/' || 
          url === 'about:blank' ||
          !url || url === '') {
        throw new Error('Cannot scan this page. Please navigate to a website or local HTML file first.');
      }

      // Inject and execute the page scanning script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scanPageElements,
      });

      if (results && results[0]) {
        if (results[0].result && Array.isArray(results[0].result)) {
          this.scanResults = results[0].result;
          this.displayScanResults();
        } else if (results[0].result === null || results[0].result === undefined) {
          // Script executed but returned no results
          this.scanResults = [];
          this.displayScanResults();
        } else {
          throw new Error('Script execution returned unexpected result format');
        }
      } else {
        throw new Error('Script injection failed - no results returned');
      }
    } catch (error) {
      console.error('Error scanning page:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to scan page. Please try again.';
      
      if (error.message.includes('Cannot access')) {
        errorMessage = 'Cannot access this page. The page may have security restrictions.';
      } else if (error.message.includes('not allowed')) {
        errorMessage = error.message;
      } else if (error.message.includes('navigate to a website')) {
        errorMessage = error.message;
      } else if (error.message.includes('Extension context invalidated')) {
        errorMessage = 'Extension needs to be reloaded. Please refresh the page and try again.';
      } else if (error.message.includes('Script injection failed')) {
        errorMessage = 'Cannot inject script into this page. The page may have Content Security Policy restrictions.';
      } else if (error.message.includes('Cannot access a chrome')) {
        errorMessage = 'Cannot scan Chrome internal pages. Please navigate to a regular website.';
      } else if (error.message.includes('activeTab')) {
        errorMessage = 'Permission denied. Please make sure the extension has access to this page.';
      }
      
      this.showError(errorMessage);
    } finally {
      this.isScanning = false;
      this.updateUI();
    }
  }

  displayScanResults() {
    const container = document.getElementById('scanResultsContainer');
    if (!container) return;

    // Handle case where no results were found
    if (!this.scanResults || this.scanResults.length === 0) {
      container.innerHTML = `
        <div class="scan-summary">
          <div class="summary-stats">
            <div class="stat-item stat-info">
              <span class="stat-number">0</span>
              <span class="stat-label">Elements Found</span>
            </div>
          </div>
        </div>
        <div class="no-results">
          <i class="fas fa-info-circle"></i>
          <span>No text elements found to analyze on this page</span>
        </div>
      `;
      return;
    }

    const violations = this.scanResults.filter(result => !result.contrast.passesAA);
    const warnings = this.scanResults.filter(result => result.contrast.passesAA && !result.contrast.passesAAA);
    const passed = this.scanResults.filter(result => result.contrast.passesAAA);

    const summaryHTML = `
      <div class="scan-summary">
        <div class="summary-stats">
          <div class="stat-item stat-error" data-target="violationsSection" tabindex="0" role="button">
            <span class="stat-number">${violations.length}</span>
            <span class="stat-label">Violations</span>
          </div>
          <div class="stat-item stat-warning" data-target="warningsSection" tabindex="0" role="button">
            <span class="stat-number">${warnings.length}</span>
            <span class="stat-label">Warnings</span>
          </div>
          <div class="stat-item stat-success" data-target="passedSection" tabindex="0" role="button">
            <span class="stat-number">${passed.length}</span>
            <span class="stat-label">Passed</span>
          </div>
        </div>
      </div>
    `;

    let resultsHTML = '';
    
    if (violations.length > 0) {
      resultsHTML += `
        <div class="results-section" id="violationsSection">
          <h4 class="results-title error" data-collapsed="true" aria-expanded="false" role="button" tabindex="0">
            <i class="fas fa-exclamation-triangle"></i>
            Contrast Violations (${violations.length})
          </h4>
          <div class="results-list" style="display:none;">
            ${violations.map(result => this.createResultItem(result, 'error')).join('')}
          </div>
        </div>
      `;
    }

    if (warnings.length > 0) {
      resultsHTML += `
        <div class="results-section" id="warningsSection">
          <h4 class="results-title warning" data-collapsed="true" aria-expanded="false" role="button" tabindex="0">
            <i class="fas fa-exclamation-circle"></i>
            AAA Warnings (${warnings.length})
          </h4>
          <div class="results-list" style="display:none;">
            ${warnings.map(result => this.createResultItem(result, 'warning')).join('')}
          </div>
        </div>
      `;
    }

    // Show success message if all elements pass
    if (violations.length === 0 && warnings.length === 0 && passed.length > 0) {
      resultsHTML += `
        <div class="results-section" id="passedSection">
          <h4 class="results-title success" data-collapsed="true" aria-expanded="false" role="button" tabindex="0">
            <i class="fas fa-check-circle"></i>
            All Elements Pass WCAG AAA (${passed.length})
          </h4>
          <div class="results-list" style="display:none;">
            ${passed.map(result => this.createResultItem(result, 'success')).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = summaryHTML + resultsHTML;
    
    // Add click handlers for result items
    this.setupResultItemHandlers();

    // Add category toggle handlers
    this.setupCategoryToggleHandlers();

    // Add summary stat anchor handlers
    this.setupSummaryStatHandlers();
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

  setupCategoryToggleHandlers() {
    const container = document.getElementById('scanResultsContainer');
    if (!container) return;

    container.querySelectorAll('.results-title').forEach(title => {
      title.addEventListener('click', () => {
        const list = title.nextElementSibling;
        if (!list) return;
        const collapsed = title.getAttribute('data-collapsed') === 'true';
        if (collapsed) {
          list.style.display = '';
        } else {
          list.style.display = 'none';
        }
        title.setAttribute('data-collapsed', (!collapsed).toString());
        title.setAttribute('aria-expanded', (!collapsed).toString());
      });

      // keyboard accessibility
      title.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          title.click();
        }
      });
    });
  }

  setupSummaryStatHandlers() {
    const container = document.getElementById('scanResultsContainer');
    if (!container) return;
    container.querySelectorAll('.stat-item').forEach(item => {
      item.addEventListener('click', () => {
        const targetId = item.dataset.target;
        const targetHeading = document.getElementById(targetId)?.querySelector('.results-title');
        if (targetHeading) {
          // Ensure section is expanded
          if (targetHeading.getAttribute('data-collapsed') === 'true') {
            targetHeading.click();
          }
          targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      // keyboard accessibility
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.click();
        }
      });
    });
  }
}

// -----------------------------------------------------------------------------
// Stand-alone function injected into the inspected page
// NOTE: Functions passed to chrome.scripting.executeScript **must** be plain
// functions (not class methods) so that Chrome can serialise them correctly.
// -----------------------------------------------------------------------------

function scanPageElements() {
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

  // Helper function to check if element has meaningful text content
  const hasTextContent = (element) => {
    const text = element.textContent.trim();
    return text.length > 0 && text !== '' && !/^\s*$/.test(text);
  };

  // Helper function to check if element is a leaf text element
  const isLeafTextElement = (element) => {
    // Check if this element has text content
    if (!hasTextContent(element)) return false;
    
    // Check if any child elements also have text content
    const childrenWithText = Array.from(element.children).filter(child => hasTextContent(child));
    
    // If no children have text, this is a leaf text element
    // OR if this element has significantly more text than its children combined
    if (childrenWithText.length === 0) return true;
    
    const elementText = element.textContent.trim().length;
    const childrenText = childrenWithText.reduce((sum, child) => sum + child.textContent.trim().length, 0);
    
    // If this element has more than 50% more text than its children, consider it a text element
    return elementText > childrenText * 1.5;
  };

  console.log('Page Scanner: Starting element analysis...');
  
  const results = [];
  const allElements = document.querySelectorAll('*');
  const processedElements = new Set();
  
  console.log(`Page Scanner: Found ${allElements.length} total elements`);

  // Focus on common text-containing elements first
  const textSelectors = [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'a', 'li', 'td', 'th', 
    'label', 'button', 'strong', 'em', 'b', 'i', 'small', 'mark', 'del', 'ins', 'sub', 'sup'
  ];
  
  let candidateElements = [];
  
  // First pass: get elements by common text selectors
  textSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    candidateElements.push(...elements);
  });
  
  // Second pass: add any other elements with text content
  allElements.forEach(element => {
    if (hasTextContent(element) && !candidateElements.includes(element)) {
      candidateElements.push(element);
    }
  });
  
  console.log(`Page Scanner: Found ${candidateElements.length} candidate text elements`);

  candidateElements.forEach((element, index) => {
    // Skip if already processed
    if (processedElements.has(element)) {
      return;
    }

    // Skip script, style, and other non-visual elements
    const tagName = element.tagName.toLowerCase();
    if (['script', 'style', 'meta', 'link', 'title', 'head', 'noscript'].includes(tagName)) {
      return;
    }

    // Check if this is a meaningful text element
    if (!isLeafTextElement(element)) {
      return;
    }

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
      
      if (!textColor || !backgroundColor) {
        console.log('Page Scanner: Skipping element - no color info', element);
        return;
      }

      // Convert colors to hex
      const textHex = rgbToHex(textColor);
      const bgHex = rgbToHex(backgroundColor);
      
      if (!textHex || !bgHex) {
        console.log('Page Scanner: Skipping element - color conversion failed', textColor, backgroundColor);
        return;
      }

      // Calculate contrast ratio
      const contrastRatio = calculateContrastRatio(textHex, bgHex);
      
      if (isNaN(contrastRatio) || contrastRatio <= 0) {
        console.log('Page Scanner: Skipping element - invalid contrast ratio', contrastRatio);
        return;
      }
      
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
      console.warn('Page Scanner: Error analyzing element:', error, element);
    }
  });

  console.log(`Page Scanner: Analysis complete. Found ${results.length} text elements to analyze`);
  return results;
} 