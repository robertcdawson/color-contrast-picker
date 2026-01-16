import { calculateContrastRatio, getWCAGLevel, suggestBetterColor } from '../utils/contrast.js';

export class ColorPicker {
  constructor() {
    console.log('ColorPicker: Initializing...');

    // Color square elements
    this.foregroundSquare = document.getElementById('foregroundSquare');
    this.backgroundSquare = document.getElementById('backgroundSquare');

    // Hex input elements
    this.foregroundHex = document.getElementById('foregroundHex');
    this.backgroundHex = document.getElementById('backgroundHex');

    console.log('ColorPicker: Found elements:', {
      foregroundSquare: !!this.foregroundSquare,
      backgroundSquare: !!this.backgroundSquare,
      foregroundHex: !!this.foregroundHex,
      backgroundHex: !!this.backgroundHex
    });

    // Current colors
    this.foregroundColor = '#000000';
    this.backgroundColor = '#ffffff';

    this.setupEventListeners();
    this.updateUI();

    console.log('ColorPicker: Initialization complete');
  }

  setupEventListeners() {
    console.log('ColorPicker: Setting up event listeners...');

    // Listen for color swap requests
    document.addEventListener('swapColorsRequested', () => {
      console.log('ColorPicker: Swap colors requested');
      this.swapColors();
    });

    // Listen for color updates from suggestions
    document.addEventListener('colorUpdate', (e) => {
      console.log('ColorPicker: Color update received', e.detail);
      const { foreground, background } = e.detail;
      if (foreground) this.foregroundColor = foreground;
      if (background) this.backgroundColor = background;
      this.updateUI();
    });

    // Foreground color square events
    if (this.foregroundSquare) {
      this.foregroundSquare.addEventListener('click', () => {
        console.log('ColorPicker: Foreground square clicked');
        this.activateEyedropper('foreground');
      });

      this.foregroundSquare.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          console.log('ColorPicker: Foreground square activated via keyboard');
          this.activateEyedropper('foreground');
        }
      });
    }

    // Background color square events
    if (this.backgroundSquare) {
      this.backgroundSquare.addEventListener('click', () => {
        console.log('ColorPicker: Background square clicked');
        this.activateEyedropper('background');
      });

      this.backgroundSquare.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          console.log('ColorPicker: Background square activated via keyboard');
          this.activateEyedropper('background');
        }
      });
    }

    // Swap button event
    const swapButton = document.getElementById('swapColors');
    if (swapButton) {
      swapButton.addEventListener('click', () => {
        console.log('ColorPicker: Swap button clicked');
        this.swapColors();
      });
    }
  }

  setLoadingState(type, isLoading) {
    const square = document.getElementById(`${type}Square`);

    if (square) {
      square.classList.toggle('loading', isLoading);
    }
  }

  async activateEyedropper(colorType) {
    console.log(`ColorPicker: Activating eyedropper for ${colorType}`);
    this.setLoadingState(colorType, true);

    try {
      // First try the modern EyeDropper API
      if (window.EyeDropper) {
        console.log('ColorPicker: Using native EyeDropper API');
        const eyeDropper = new EyeDropper();
        const result = await eyeDropper.open();
        const color = result.sRGBHex.toUpperCase();

        console.log(`ColorPicker: EyeDropper selected color: ${color}`);
        this.setColor(colorType, color);
        this.setLoadingState(colorType, false);
        return;
      }

      // Fall back to content script method
      console.log('ColorPicker: Falling back to content script method');
      this.fallbackEyedropper(colorType);
    } catch (error) {
      console.log('ColorPicker: Eyedropper cancelled or failed:', error);
      this.setLoadingState(colorType, false);
    }
  }

  fallbackEyedropper(colorType) {
    console.log(`ColorPicker: Using fallback eyedropper for ${colorType}`);
    this.setLoadingState(colorType, true);

    // First get the active tab ID through the background script
    chrome.runtime.sendMessage({ action: "getActiveTab" }, (response) => {
      console.log('ColorPicker: getActiveTab response:', response);

      if (response.error) {
        console.error('Failed to get active tab:', response.error);
        this.setLoadingState(colorType, false);
        this.showError(colorType, 'Failed to access page for color picking');
        return;
      }

      // Now activate the color picker in the content script
      chrome.runtime.sendMessage(
        {
          action: "relayToContentScript",
          tabId: response.tabId,
          message: { action: "activateColorPicker" }
        },
        (colorResponse) => {
          console.log('ColorPicker: Content script response:', colorResponse);
          this.setLoadingState(colorType, false);

          if (chrome.runtime.lastError) {
            console.error('Error relaying to content script:', chrome.runtime.lastError);
            this.showError(colorType, 'Failed to activate color picker');
            return;
          }

          if (colorResponse && colorResponse.canceled) {
            console.log('Color picking was canceled');
            return;
          }

          if (colorResponse && colorResponse.color) {
            console.log(`ColorPicker: Received color from content script: ${colorResponse.color}`);
            this.setColor(colorType, colorResponse.color);
          } else {
            console.error('No color received from content script');
            this.showError(colorType, 'No color was selected');
          }
        }
      );
    });
  }

  setColor(colorType, color) {
    const validColor = this.validateAndFormatColor(color);
    if (!validColor) {
      console.error(`Invalid color: ${color}`);
      return;
    }

    if (colorType === 'foreground') {
      this.foregroundColor = validColor;
    } else {
      this.backgroundColor = validColor;
    }

    this.updateUI();
    this.dispatchColorChangeEvent();
  }

  updateForegroundUI() {
    if (this.foregroundSquare) {
      this.foregroundSquare.style.backgroundColor = this.foregroundColor;
    }
    if (this.foregroundHex) {
      this.foregroundHex.value = this.foregroundColor;
    }
  }

  updateBackgroundUI() {
    if (this.backgroundSquare) {
      this.backgroundSquare.style.backgroundColor = this.backgroundColor;
    }
    if (this.backgroundHex) {
      this.backgroundHex.value = this.backgroundColor;
    }
  }

  updateUI() {
    this.updateForegroundUI();
    this.updateBackgroundUI();
    this.updatePreview();
  }

  updatePreview() {
    // Update preview text samples
    const sampleNormal = document.getElementById('sampleNormal');
    const sampleLarge = document.getElementById('sampleLarge');

    if (sampleNormal) {
      sampleNormal.style.color = this.foregroundColor;
      sampleNormal.style.backgroundColor = this.backgroundColor;
    }

    if (sampleLarge) {
      sampleLarge.style.color = this.foregroundColor;
      sampleLarge.style.backgroundColor = this.backgroundColor;
    }
  }

  dispatchColorChangeEvent() {
    const event = new CustomEvent('colorChanged', {
      detail: {
        foreground: this.foregroundColor,
        background: this.backgroundColor
      }
    });
    document.dispatchEvent(event);

    // Also dispatch to contrast analyzer
    const contrastEvent = new CustomEvent('colorsUpdated', {
      detail: {
        foreground: this.foregroundColor,
        background: this.backgroundColor
      }
    });
    document.dispatchEvent(contrastEvent);
  }

  getForegroundColor() {
    return this.foregroundColor;
  }

  getBackgroundColor() {
    return this.backgroundColor;
  }

  setForegroundColor(color) {
    const validColor = this.validateAndFormatColor(color);
    if (validColor) {
      this.foregroundColor = validColor;
      this.updateUI();
      this.dispatchColorChangeEvent();
    }
  }

  setBackgroundColor(color) {
    const validColor = this.validateAndFormatColor(color);
    if (validColor) {
      this.backgroundColor = validColor;
      this.updateUI();
      this.dispatchColorChangeEvent();
    }
  }

  swapColors() {
    const temp = this.foregroundColor;
    this.foregroundColor = this.backgroundColor;
    this.backgroundColor = temp;

    this.updateUI();
    this.dispatchColorChangeEvent();

    // Show feedback
    if (window.showToast) {
      window.showToast('Colors swapped!', 'success', 1500);
    }
  }

  validateAndFormatColor(input) {
    if (!input) return null;

    // Remove whitespace and convert to uppercase
    let color = input.trim().toUpperCase();

    // Add # if missing
    if (!color.startsWith('#')) {
      color = '#' + color;
    }

    // Validate hex format
    if (!/^#[0-9A-F]{6}$/.test(color)) {
      return null;
    }

    return color;
  }

  showError(type, message) {
    console.error(`ColorPicker error (${type}):`, message);

    // Show toast notification if available
    if (window.showToast) {
      window.showToast(message, 'error');
    }
  }
} 