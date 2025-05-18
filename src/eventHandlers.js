import { handleColorSelection, toggleInstructions, openDocumentationLink, updateContrastResult, showStatus } from './ui';
import { chosenColors } from './ui';

// Handle the click event for the color squares
export async function handleColorSquareClick(event, index) {
  event.preventDefault();

  if (window.EyeDropper) {
    const eyeDropper = new EyeDropper();
    try {
      const result = await eyeDropper.open();
      handleColorSelection(result.sRGBHex, index - 1);
      updateContrastResult();
      showStatus('Color selected');
    } catch (err) {
      console.error(`Error using EyeDropper: ${err.message}. Using fallback.`);
      showStatus('EyeDropper failed, using fallback', true);
      fallbackColorPicker(index);
    }
  } else {
    console.warn("Your browser does not support the EyeDropper API. Using fallback.");
    showStatus('EyeDropper not supported, using fallback');
    fallbackColorPicker(index);
  }
}

// Helper function to update color square
function updateColorSquare(index, color) {
  const colorSquare = document.getElementById(`color${index + 1}`);
  if (colorSquare) {
    colorSquare.style.backgroundColor = color;
  }
}

// Handle the toggle event for the instructions
export function handleInstructionsToggle(event) {
  event.preventDefault();
  toggleInstructions();
}

// Handle the click event for the documentation link
export function handleDocumentationLinkClick(event) {
  event.preventDefault();
  openDocumentationLink();
}

// Handle manual color input
export function handleManualColorInput(event) {
  const input = event.target;
  const colorIndex = input.id === 'color1Input' ? 0 : 1;
  const hexValue = input.value.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
    chosenColors[colorIndex] = hexValue;
    updateColorSquare(colorIndex, hexValue);
    updateContrastResult();
  } else {
    showStatus('Please enter a valid hex color value (e.g., #FF0000)', true);
  }
}

export function setupEventListeners() {
  const colorSquares = document.querySelectorAll('.color-square');
  colorSquares.forEach((square, index) => {
    square.addEventListener('click', (event) => handleColorSquareClick(event, index + 1));
  });
}

function fallbackColorPicker(index) {
  const input = document.createElement('input');
  input.type = 'color';
  input.addEventListener('change', (event) => {
    const color = event.target.value;
    handleColorSelection(color, index - 1);
    updateContrastResult();
    showStatus('Color selected');
  });
  input.click();
}