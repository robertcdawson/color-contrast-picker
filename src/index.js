import {
  getContrast,
  colorContrastRating,
  hexToRgb
} from './utils';

const chosenColors = [];
const resultElement = document.getElementById('result');
const color1Element = document.getElementById('color1');
const color2Element = document.getElementById('color2');
const eyedropperButton = document.getElementById('eyedropperButton');

const resultBarParent = document.createElement('div');
resultBarParent.classList.add('result-bar-parent');
const resultBar = document.createElement('div');
resultBar.classList.add('result-bar');
resultBarParent.appendChild(resultBar);
resultElement.appendChild(resultBarParent);

eyedropperButton.addEventListener('click', async (event) => {
  if (!window.EyeDropper) {
    resultElement.textContent = 'Your browser does not support the EyeDropper API';
    return;
  }

  if (eyedropperButton.textContent === 'Clear Colors') {
    chosenColors.length = 0;
    color1Element.removeAttribute("style");
    color2Element.removeAttribute("style");
    eyedropperButton.textContent = 'Select Color 1';
    resultBar.style.width = '0%';
    resultBar.style.backgroundColor = '#ffffff';
    const resultDescription = resultElement.querySelector('.result-description');
    if (resultDescription) {
      resultElement.removeChild(resultDescription);
    }
    return;
  }

  const eyeDropper = new EyeDropper();

  eyeDropper.open().then(result => {
    if (chosenColors.length <= 1) {
      chosenColors.push(result.sRGBHex);

      // Remove X background effect before adding color
      if (chosenColors.length === 1) {
        color1Element.style.background = 'transparent';
      } else {
        color2Element.style.background = 'transparent';
      }
    } else {
      chosenColors.shift();
      chosenColors.push(result.sRGBHex);
    }

    color1Element.style.backgroundColor = chosenColors[0];
    color2Element.style.backgroundColor = chosenColors[1];

    // Change button text per number of colors selected
    if (chosenColors.length === 1) {
      eyedropperButton.textContent = 'Select Color 2';
    } else if (chosenColors.length === 2) {
      eyedropperButton.textContent = 'Clear Colors';
    }

    if (chosenColors.length === 2) {
      const chosenColor1 = hexToRgb(chosenColors[0]);
      const chosenColor2 = hexToRgb(chosenColors[1]);
      const contrastRatio = getContrast(chosenColor1, chosenColor2);
      const rating = colorContrastRating(contrastRatio);
      const contrastRatioInPercent = (contrastRatio === 1) ? 0 : Math.round(contrastRatio / 21 * 100);

      resultBar.style.width = `${contrastRatioInPercent}%`;
      resultBar.style.backgroundColor = (rating === 'great') ? '#00ff00' : (rating === 'good') ? '#ffff00' : (rating === 'okay') ? '#ffa500' : '#ff0000';

      const result = `<p class="result-description">${chosenColors[0]} and ${chosenColors[1]} have a contrast ratio of ${contrastRatio}, which is <strong>${rating}</strong>.</p>`;
      const resultDescription = resultElement.querySelector('.result-description');

      // Remove old result description
      if (resultDescription) {
        resultElement.removeChild(resultDescription);
      }

      // Add new result description
      resultElement.insertAdjacentHTML('beforeend', result);
    }
  }).catch(e => {
    resultElement.textContent = e;
  });
});

// Show instructions when clicking arrow
document.getElementById('instructionsHideShow').addEventListener('click', (event) => {
  event.preventDefault();

  const instructionsArrow = document.getElementById('instructionsArrow');
  const instructionsList = document.getElementById('instructionsList');
  const howItWorks = document.getElementById('howItWorks');

  if (instructionsArrow.classList.contains('down')) {
    instructionsArrow.classList.remove('down');
    instructionsArrow.classList.add('right');
  } else {
    instructionsArrow.classList.remove('right');
    instructionsArrow.classList.add('down');
  }

  instructionsList.classList.toggle('visible');
  howItWorks.classList.toggle('visible');
});

// Open new tab when clicking documentation link
document.getElementById('howItWorksLink1').addEventListener('click', (event) => {
  event.preventDefault();

  const howItWorksLink1 = document.getElementById('howItWorksLink1');
  chrome.tabs.create({ active: true, url: `${howItWorksLink1.href}#rationale-for-the-ratios-chosen` });
});
