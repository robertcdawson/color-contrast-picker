import { setupEventListeners, handleColorSquareClick, handleManualColorInput } from '../eventHandlers';
import { initializeUI } from '../ui';

// Mock the modules
jest.mock('../eventHandlers', () => ({
  setupEventListeners: jest.fn(),
  handleColorSquareClick: jest.fn(),
  handleManualColorInput: jest.fn(),
}));

jest.mock('../ui', () => ({
  initializeUI: jest.fn(),
}));

describe('index.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock DOM elements
    document.body.innerHTML = `
      <div class="color-square"></div>
      <div class="color-square"></div>
      <input class="color-input" />
      <input class="color-input" />
    `;
  });

  it('should set up event listeners correctly and initialize UI', () => {
    // Import index.js to execute its code
    require('../index');

    // Simulate DOMContentLoaded event
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);

    // Check if setupEventListeners and initializeUI were called
    expect(setupEventListeners).toHaveBeenCalled();
    expect(initializeUI).toHaveBeenCalled();

    // Check if event listeners were added to color squares
    const colorSquares = document.querySelectorAll('.color-square');
    colorSquares.forEach((square) => {
      square.click();
    });
    expect(handleColorSquareClick).toHaveBeenCalledTimes(2);

    // Check if event listeners were added to color inputs
    const colorInputs = document.querySelectorAll('.color-input');
    colorInputs.forEach((input) => {
      input.dispatchEvent(new Event('change'));
    });
    expect(handleManualColorInput).toHaveBeenCalledTimes(2);
  });
});