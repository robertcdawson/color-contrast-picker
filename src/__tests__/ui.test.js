// Mock the chrome API
global.chrome = {
  runtime: { sendMessage: jest.fn() },
  tabs: { create: jest.fn() },
};

// Mock the EyeDropper API
global.EyeDropper = class {
  open() {
    return Promise.resolve({ sRGBHex: '#FF0000' });
  }
};

jest.mock('../eventHandlers', () => ({
  handleColorSquareClick: jest.fn(),
  handleInstructionsToggle: jest.fn(),
  handleDocumentationLinkClick: jest.fn(),
}));

describe('initializeUI', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="color1Container"><div id="color1" class="color-square"></div><input id="color1Input" class="color-input" /></div>
      <div id="color2Container"><div id="color2" class="color-square"></div><input id="color2Input" class="color-input" /></div>
      <div id="result"></div>
    `;
    jest.clearAllMocks();
  });

  it('attaches click handlers with event object', () => {
    const { initializeUI } = require('../ui');
    initializeUI();
    const square = document.querySelector('#color1Container');
    const clickEvent = new Event('click');
    square.dispatchEvent(clickEvent);
    expect(require('../eventHandlers').handleColorSquareClick).toHaveBeenCalledWith(clickEvent, 1);
  });
});

import { updateContrastResult, chosenColors } from '../ui';
import { getContrast, colorContrastRating, getWCAGCompliance } from '../utils';

jest.mock('../utils');

describe('updateContrastResult', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="result" style="display: none;">
        <div id="resultText"></div>
        <div class="result-bar-parent">
          <div class="result-bar"></div>
        </div>
      </div>
      <input type="radio" name="complianceLevel" value="AA" checked>
      <input type="checkbox" id="largeText">
    `;

    // Reset chosenColors before each test
    chosenColors.length = 0;
    chosenColors.push('#FFFFFF', '#000000');
  });

  it('should update the result text and bar correctly', () => {
    getContrast.mockReturnValue(4.5);
    colorContrastRating.mockReturnValue('Pass');
    getWCAGCompliance.mockReturnValue(true);

    updateContrastResult();

    const resultText = document.getElementById('resultText');

    expect(resultText.textContent).toBe('Contrast ratio: 4.50:1 - Pass - Pass');
  });

  it('should handle failing contrast', () => {
    getContrast.mockReturnValue(2.5);
    colorContrastRating.mockReturnValue('Fail');
    getWCAGCompliance.mockReturnValue(false);

    chosenColors[0] = '#FFFFFF';
    chosenColors[1] = '#CCCCCC';
    updateContrastResult();

    const resultText = document.getElementById('resultText');

    expect(resultText.textContent).toBe('Contrast ratio: 2.50:1 - Fail - Fail');
  });
});

test('initializeColorPicker sets up EyeDropper correctly', () => {
  // Updated test to reflect removal of color picker
  // ... existing assertions ...
});

// Removed tests related to the unwanted color picker
// ... existing code ...