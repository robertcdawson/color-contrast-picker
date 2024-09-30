import { handleColorSquareClick, handleManualColorInput, setupEventListeners } from './eventHandlers.js';
import { initializeUI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  initializeUI();
  setupEventListeners();

  // Set up event listeners for color squares
  const colorSquares = document.querySelectorAll('.color-square');
  colorSquares.forEach((square, index) => {
    square.addEventListener('click', (event) => handleColorSquareClick(event, index + 1));
  });

  // Set up event listeners for manual color inputs
  const colorInputs = document.querySelectorAll('.color-input');
  colorInputs.forEach(input => {
    input.addEventListener('change', handleManualColorInput);
  });
});

// ... existing code ...
