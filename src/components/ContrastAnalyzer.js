import { calculateContrastRatio, getWCAGLevel, suggestBetterColor, suggestBetterBackgroundColor } from '../utils/contrast';

export class ContrastAnalyzer {
  constructor() {
    this.foregroundColor = '#000000';
    this.backgroundColor = '#FFFFFF';
    this.complianceLevel = 'AA';
    this.isLargeText = false;

    // DOM elements - updated for new UI structure
    this.contrastBar = document.getElementById('contrastBar');
    this.ratioValue = document.querySelector('.ratio-value');
    this.complianceStatus = document.getElementById('complianceStatus');
    this.sampleNormal = document.getElementById('sampleNormal');
    this.sampleLarge = document.getElementById('sampleLarge');
    this.copyButton = document.getElementById('copyColors');
    this.shareLinkButton = document.getElementById('shareLink');
    this.exportDesignButton = document.getElementById('exportDesign');
    this.suggestionsContainer = document.getElementById('suggestionsContainer');

    console.log('ContrastAnalyzer: Found elements:', {
      contrastBar: !!this.contrastBar,
      ratioValue: !!this.ratioValue,
      complianceStatus: !!this.complianceStatus,
      sampleNormal: !!this.sampleNormal,
      sampleLarge: !!this.sampleLarge,
      suggestionsContainer: !!this.suggestionsContainer
    });

    this.setupEventListeners();
    this.updateUI();
  }

  setupEventListeners() {
    // Listen for color changes from the ColorPicker (updated event name)
    document.addEventListener('colorsUpdated', (e) => {
      const { foreground, background } = e.detail;
      this.foregroundColor = foreground;
      this.backgroundColor = background;
      this.updateUI();
    });

    // Use event delegation for radio buttons to avoid timing issues
    document.addEventListener('change', (e) => {
      if (e.target.name === 'complianceLevel') {
        this.complianceLevel = e.target.value;
        this.updateUI();
      } else if (e.target.name === 'textSize') {
        this.isLargeText = e.target.value === 'large';
        this.updateUI();
      }
    });

    // Copy colors
    if (this.copyButton) {
      this.copyButton.addEventListener('click', () => {
        const text = `Foreground: ${this.foregroundColor}\nBackground: ${this.backgroundColor}\nContrast Ratio: ${this.getContrastRatio()}:1`;
        navigator.clipboard.writeText(text).then(() => {
          this.showToast('Colors copied to clipboard!', 'success');
        }).catch(() => {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = text;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          this.showToast('Colors copied to clipboard!', 'success');
        });
      });
    }

    // Share functionality
    if (this.shareLinkButton) {
      this.shareLinkButton.addEventListener('click', () => {
        const url = this.generateShareUrl();
        navigator.clipboard.writeText(url).then(() => {
          this.showToast('Share link copied to clipboard!', 'success');
        }).catch(() => {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = url;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          this.showToast('Share link copied to clipboard!', 'success');
        });
      });
    }

    if (this.exportDesignButton) {
      this.exportDesignButton.addEventListener('click', () => {
        this.exportToDesignTools();
      });
    }
  }

  updateUI() {
    // Calculate contrast ratio
    const ratio = calculateContrastRatio(this.foregroundColor, this.backgroundColor);
    const formattedRatio = ratio.toFixed(2);

    // Update ratio display
    if (this.ratioValue) {
      this.ratioValue.textContent = formattedRatio;
    }

    // Update contrast bar
    if (this.contrastBar) {
      const percentage = Math.min(ratio / 21 * 100, 100); // Scale to 0-100%
      this.contrastBar.style.width = `${percentage}%`;
    }

    // Determine compliance status
    const complianceStatus = getWCAGLevel(ratio, this.complianceLevel, this.isLargeText ? 'large' : 'normal');
    const isPassing = complianceStatus.includes('Pass');

    // Update compliance status badge
    if (this.complianceStatus) {
      const icon = this.complianceStatus.querySelector('i');
      const text = this.complianceStatus.querySelector('span');

      // Remove existing status classes
      this.complianceStatus.classList.remove('status-pass', 'status-fail', 'status-warning');

      if (isPassing) {
        this.complianceStatus.classList.add('status-pass');
        if (icon) icon.className = 'fas fa-check';
        if (text) text.textContent = `WCAG ${this.complianceLevel}`;
      } else {
        this.complianceStatus.classList.add('status-fail');
        if (icon) icon.className = 'fas fa-times';
        if (text) text.textContent = `Fails ${this.complianceLevel}`;
      }
    }

    // Generate color suggestions
    this.generateColorSuggestions(isPassing, ratio);

    // Dispatch contrast analyzed event
    const event = new CustomEvent('contrastAnalyzed', {
      detail: {
        ratio: ratio,
        passes: {
          AA: ratio >= (this.isLargeText ? 3 : 4.5),
          AAA: ratio >= (this.isLargeText ? 4.5 : 7)
        },
        foreground: this.foregroundColor,
        background: this.backgroundColor
      }
    });
    document.dispatchEvent(event);
  }

  generateColorSuggestions(isPassing, ratio) {
    if (!this.suggestionsContainer) return;

    // Clear existing suggestions
    this.suggestionsContainer.innerHTML = '';

    if (isPassing) {
      this.suggestionsContainer.innerHTML = `
        <div class="no-suggestions success" role="status" aria-live="polite">
          <i class="fas fa-check-circle"></i>
          <span>These colors pass WCAG ${this.complianceLevel} standards</span>
        </div>
      `;
      return;
    }

    // Get suggested colors
    const minRatio = this.complianceLevel === 'AAA'
      ? (this.isLargeText ? 4.5 : 7)
      : (this.isLargeText ? 3 : 4.5);

    // Try to suggest a better foreground color
    const suggestedFg = suggestBetterColor(
      this.foregroundColor,
      this.backgroundColor,
      this.complianceLevel,
      this.isLargeText ? 'large' : 'normal'
    );

    // Try to suggest a better background color
    const suggestedBg = suggestBetterBackgroundColor(
      this.foregroundColor,
      this.backgroundColor,
      this.complianceLevel,
      this.isLargeText ? 'large' : 'normal'
    );

    let hasValidSuggestions = false;

    // Create suggestions list with proper ARIA structure
    const suggestionsList = document.createElement('ul');
    suggestionsList.className = 'suggestions-list';
    suggestionsList.setAttribute('role', 'list');
    suggestionsList.setAttribute('aria-label', 'Color contrast improvement suggestions');

    if (suggestedFg && suggestedFg !== this.foregroundColor) {
      const suggestionItem = this.createSuggestion('foreground', suggestedFg, this.backgroundColor, 'Suggested Text Color');
      suggestionsList.appendChild(suggestionItem);
      hasValidSuggestions = true;
    }

    if (suggestedBg && suggestedBg !== this.backgroundColor) {
      const suggestionItem = this.createSuggestion('background', this.foregroundColor, suggestedBg, 'Suggested Background');
      suggestionsList.appendChild(suggestionItem);
      hasValidSuggestions = true;
    }

    if (hasValidSuggestions) {
      // Add heading for suggestions
      const heading = document.createElement('h3');
      heading.className = 'suggestions-heading';
      heading.textContent = 'Accessibility Improvements';
      heading.id = 'suggestions-heading';

      // Add live region for announcements
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.textContent = `${suggestionsList.children.length} color suggestions available to improve accessibility`;

      this.suggestionsContainer.appendChild(heading);
      this.suggestionsContainer.appendChild(liveRegion);
      this.suggestionsContainer.appendChild(suggestionsList);

      // Focus management - move focus to first suggestion for keyboard users
      setTimeout(() => {
        const firstSuggestion = suggestionsList.querySelector('.suggestion-apply');
        if (firstSuggestion && document.activeElement && document.activeElement.matches('input, button')) {
          // Only move focus if user was interacting with form elements
          firstSuggestion.focus();
        }
      }, 100);
    } else {
      this.suggestionsContainer.innerHTML = `
        <div class="suggestion-message" role="status" aria-live="polite">
          <h3 class="suggestions-heading">Contrast Information</h3>
          <p>Current ratio: <strong>${ratio.toFixed(2)}:1</strong></p>
          <p>Required: <strong>${minRatio}:1</strong> for ${this.complianceLevel} ${this.isLargeText ? 'large text' : 'normal text'}</p>
          <p>Try adjusting colors manually for better contrast.</p>
        </div>
      `;
    }
  }

  createSuggestion(type, foreground, background, label) {
    const ratio = calculateContrastRatio(foreground, background);
    const suggestionItem = document.createElement('li');
    suggestionItem.className = 'suggestion-item';
    suggestionItem.setAttribute('role', 'listitem');

    // Create unique IDs for accessibility
    const suggestionId = `suggestion-${type}-${Date.now()}`;
    const previewId = `preview-${type}-${Date.now()}`;
    const applyButtonId = `apply-${type}-${Date.now()}`;

    suggestionItem.innerHTML = `
      <div class="suggestion-content" id="${suggestionId}">
        <div class="suggestion-colors" role="img" aria-label="Color preview: ${foreground} text on ${background} background">
          <div class="suggestion-color suggestion-color--foreground" 
               style="background-color: ${foreground}" 
               title="Foreground color: ${foreground}"
               aria-label="Foreground color ${foreground}"></div>
          <div class="suggestion-color suggestion-color--background" 
               style="background-color: ${background}" 
               title="Background color: ${background}"
               aria-label="Background color ${background}"></div>
        </div>
        <div class="suggestion-info">
          <div class="suggestion-label">
            <span class="suggestion-type">${label}</span>
            <span class="suggestion-ratio" aria-label="Contrast ratio ${ratio.toFixed(2)} to 1">
              ${ratio.toFixed(2)}:1
            </span>
          </div>
          <div class="suggestion-preview" 
               id="${previewId}"
               style="color: ${foreground}; background-color: ${background};"
               role="img"
               aria-label="Preview of suggested colors">
            Sample Text
          </div>
          <div class="suggestion-details">
            <span class="color-values">
              Text: ${foreground} | Background: ${background}
            </span>
          </div>
        </div>
      </div>
      <button class="suggestion-apply" 
              id="${applyButtonId}"
              data-fg="${foreground}" 
              data-bg="${background}"
              aria-describedby="${suggestionId}"
              aria-label="Apply ${label.toLowerCase()}: ${foreground} on ${background}, contrast ratio ${ratio.toFixed(2)}:1">
        <span class="button-text">Apply</span>
        <span class="sr-only">this color combination</span>
      </button>
    `;

    // Add click and keyboard handlers for apply button
    const applyButton = suggestionItem.querySelector('.suggestion-apply');

    const applyColors = () => {
      const fg = applyButton.dataset.fg;
      const bg = applyButton.dataset.bg;

      // Dispatch event to update colors
      document.dispatchEvent(new CustomEvent('colorUpdate', {
        detail: { foreground: fg, background: bg }
      }));

      // Announce the change to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'assertive');
      announcement.className = 'sr-only';
      announcement.textContent = `Colors applied: ${fg} text on ${bg} background with ${ratio.toFixed(2)}:1 contrast ratio`;
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);

      this.showToast('Colors applied successfully!', 'success');
    };

    applyButton.addEventListener('click', applyColors);
    applyButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        applyColors();
      }
    });

    return suggestionItem;
  }

  getContrastRatio() {
    return calculateContrastRatio(this.foregroundColor, this.backgroundColor).toFixed(2);
  }

  generateShareUrl() {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
      fg: this.foregroundColor.substring(1), // Remove #
      bg: this.backgroundColor.substring(1), // Remove #
      level: this.complianceLevel,
      large: this.isLargeText.toString()
    });
    return `${baseUrl}?${params.toString()}`;
  }

  exportToDesignTools() {
    const data = {
      foreground: this.foregroundColor,
      background: this.backgroundColor,
      contrastRatio: this.getContrastRatio(),
      wcagLevel: this.complianceLevel,
      isLargeText: this.isLargeText,
      passes: {
        AA: calculateContrastRatio(this.foregroundColor, this.backgroundColor) >= (this.isLargeText ? 3 : 4.5),
        AAA: calculateContrastRatio(this.foregroundColor, this.backgroundColor) >= (this.isLargeText ? 4.5 : 7)
      },
      exportedAt: new Date().toISOString()
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `color-contrast-${this.foregroundColor.substring(1)}-${this.backgroundColor.substring(1)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast('Color data exported!', 'success');
  }

  showToast(message, type = 'info') {
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      console.log(`Toast: ${message}`);
    }
  }

  setColors(foreground, background) {
    this.foregroundColor = foreground;
    this.backgroundColor = background;
    this.updateUI();
  }
} 