import { handleColorSquareClick, handleInstructionsToggle, handleDocumentationLinkClick } from './eventHandlers';
import { getContrast, colorContrastRating, getWCAGCompliance, suggestImprovement } from './utils';

// Array to store chosen colors
export let chosenColors = ['#FFFFFF', '#000000'];

export function showStatus(message, isError = false) {
  const statusEl = document.getElementById('statusMessage');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = isError ? 'red' : 'inherit';
  setTimeout(() => {
    statusEl.textContent = '';
  }, 2000);
}

// Function to get DOM elements
const getDOMElements = () => ({
  resultElement: document.getElementById('result'),
  color1Element: document.getElementById('color1'),
  color2Element: document.getElementById('color2'),
  resultBar: document.createElement('div'),
  resultTextElement: document.getElementById('resultText'),
  suggestionTextElement: document.getElementById('suggestionText')
});

// Initialize the UI components and event listeners
export function initializeUI() {
  const elements = {
    color1Container: document.getElementById('color1Container'),
    color2Container: document.getElementById('color2Container'),
    resultElement: document.getElementById('result'),
    instructionsToggle: document.getElementById('instructionsHideShow'),
    howItWorksLink: document.getElementById('howItWorksLink1'),
    textContrastModeToggle: document.getElementById('textContrastMode'),
    colorInstructions: document.getElementById('colorInstructions')
  };

  if (!elements.color1Container || !elements.color2Container || !elements.resultElement) {
    console.error('One or more required elements are missing from the DOM');
    return;
  }

  // Set initial colors
  const color1Element = document.getElementById('color1');
  const color2Element = document.getElementById('color2');
  const color1Input = document.getElementById('color1Input');
  const color2Input = document.getElementById('color2Input');

  if (color1Element && color2Element && color1Input && color2Input) {
    color1Element.style.backgroundColor = '#FFFFFF';
    color2Element.style.backgroundColor = '#000000';
    color1Input.value = '#FFFFFF';
    color2Input.value = '#000000';

    chosenColors[0] = '#FFFFFF';
    chosenColors[1] = '#000000';

    // Move this to the end of the function
    // updateContrastResult();
  } else {
    console.error('One or more color elements are missing from the DOM');
  }

  // Set up event listeners
  if (elements.color1Container) elements.color1Container.addEventListener('click', (e) => handleColorSquareClick(e, 1));
  if (elements.color2Container) elements.color2Container.addEventListener('click', (e) => handleColorSquareClick(e, 2));
  if (elements.instructionsToggle) elements.instructionsToggle.addEventListener('click', handleInstructionsToggle);
  if (elements.howItWorksLink) elements.howItWorksLink.addEventListener('click', handleDocumentationLinkClick);

  // Create result bar
  if (elements.resultElement) {
    const resultBarParent = document.createElement('div');
    resultBarParent.classList.add('result-bar-parent');
    const { resultBar } = getDOMElements();
    resultBar.classList.add('result-bar');
    resultBarParent.appendChild(resultBar);
    elements.resultElement.appendChild(resultBarParent);
  }

  // Set initial popup height
  setPopupHeight();

  // Add a MutationObserver to detect content changes
  const observer = new MutationObserver(() => {
    try {
      setPopupHeight();
    } catch (error) {
      console.error('Error in MutationObserver callback:', error);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  if (elements.textContrastModeToggle && elements.colorInstructions) {
    elements.textContrastModeToggle.addEventListener('change', (event) => {
      elements.colorInstructions.textContent = event.target.checked ? "Select the text color first" : "";
    });
  }

  // Initialize color input fields
  const colorInputs = document.querySelectorAll('.color-input');
  colorInputs.forEach((input, index) => {
    input.value = chosenColors[index];
    input.addEventListener('change', (e) => {
      const color = e.target.value.trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        chosenColors[index] = color;
        updateColorSquare(index, color);
        updateContrastResult();
      } else {
        showStatus('Please enter a valid hex color (e.g., #FF0000)', true);
      }
    });
  });

  document.querySelectorAll('input[name="complianceLevel"]').forEach((radio) => {
    radio.addEventListener('change', updateContrastResult);
  });

  const largeTextCheckbox = document.getElementById('largeText');
  if (largeTextCheckbox) {
    largeTextCheckbox.addEventListener('change', updateContrastResult);
  }

  loadColorPairs();
  updateRecentPairs();

  // Delay the initial contrast result update to ensure all elements are loaded
  setTimeout(() => {
    updateContrastResult();
  }, 0);
}

// Load saved color pairs from localStorage
export function loadColorPairs() {
  const savedColors = JSON.parse(localStorage.getItem('colorPairs'));
  const { color1Element, color2Element } = getDOMElements();
  if (savedColors && Array.isArray(savedColors) && savedColors.length === 2) {
    chosenColors.push(...savedColors);
    color1Element.style.backgroundColor = chosenColors[0];
    color2Element.style.backgroundColor = chosenColors[1];
  }
}

// Clear the selected colors and reset the UI
export function clearColors() {
  const { color1Element, color2Element, resultBar, resultElement } = getDOMElements();
  chosenColors.length = 0;
  color1Element.style.backgroundColor = '';
  color2Element.style.backgroundColor = '';
  resultBar.style.width = '0%';
  resultBar.style.backgroundColor = '#ffffff';
  resultElement.querySelector('.result-description')?.remove();
}

// Export handleColorSelection
export function handleColorSelection(color, index) {
  chosenColors[index] = color;
  updateColorSquare(index, color);
  updateColorInput(index, color);
  updateContrastResult();
}

function updateColorSquare(index, color) {
  const colorSquare = document.getElementById(`color${index + 1}`);
  if (colorSquare) {
    colorSquare.style.backgroundColor = color;
  }
}

function updateColorInput(index, color) {
  const colorInput = document.getElementById(`color${index + 1}Input`);
  if (colorInput) {
    colorInput.value = color;
  }
}

export function updateContrastResult() {
  const resultSection = document.getElementById('result');
  const resultText = document.getElementById('resultText');

  if (chosenColors.length !== 2) {
    console.warn('Two colors have not been chosen yet');
    return;
  }

  const ratio = getContrast(chosenColors[0], chosenColors[1]);
  const rating = colorContrastRating(ratio);

  const complianceLevelElement = document.querySelector('input[name="complianceLevel"]:checked');
  const complianceLevel = complianceLevelElement ? complianceLevelElement.value : 'AA';

  const largeTextElement = document.getElementById('largeText');
  const isLargeText = largeTextElement ? largeTextElement.checked : false;

  const complianceResult = getWCAGCompliance(ratio, complianceLevel, isLargeText);
  const complianceText = complianceResult ? 'Pass' : 'Fail';

  // Make sure the result section is visible
  resultSection.style.display = 'block';

  // Update the result text
  resultText.textContent = `Contrast ratio: ${ratio.toFixed(2)}:1 - ${rating} - ${complianceText}`;

  // Update the result bar
  const { resultBar } = getDOMElements();
  resultBar.style.width = `${Math.min(ratio / 21 * 100, 100)}%`;
  resultBar.style.backgroundColor = rating === 'Fail' ? '#ff4e42' : '#0cce6b';

  saveColorPairs();
}

// Toggle the visibility of the instructions
export function toggleInstructions() {
  const instructionsArrow = document.getElementById('instructionsArrow');
  const instructionsList = document.getElementById('instructionsList');
  const howItWorks = document.getElementById('howItWorks');

  instructionsArrow?.classList.toggle('down');
  instructionsArrow?.classList.toggle('right');
  instructionsList?.classList.toggle('visible');
  howItWorks?.classList.toggle('visible');
}

// Open the documentation link in a new tab
export function openDocumentationLink() {
  const howItWorksLink1 = document.getElementById('howItWorksLink1');
  if (howItWorksLink1 && chrome.tabs) {
    chrome.tabs.create({ active: true, url: `${howItWorksLink1.href}#rationale-for-the-ratios-chosen` });
  }
}

// Save the selected color pairs to localStorage
export function saveColorPairs() {
  if (chosenColors.length === 2) {
    localStorage.setItem('colorPairs', JSON.stringify(chosenColors));
    updateRecentPairs();
  }
}

export function updateRecentPairs() {
  const container = document.getElementById('recentPairs');
  if (!container) return;
  const colors = JSON.parse(localStorage.getItem('colorPairs'));
  if (!colors || !Array.isArray(colors)) return;
  container.innerHTML = '';
  const pair = document.createElement('div');
  pair.className = 'recent-pair';
  pair.innerHTML = `<span style="background:${colors[0]}" class="pair-color"></span>`+
                   `<span style="background:${colors[1]}" class="pair-color"></span>`;
  container.appendChild(pair);
}

function setPopupHeight() {
  const body = document.body;
  const height = Math.max(body.scrollHeight, 300); // Set a minimum height of 300px

  // Send a message to the background script to update the popup height
  if (chrome.runtime) {
    chrome.runtime.sendMessage({ action: "setPopupHeight", height: height });
  }
}
