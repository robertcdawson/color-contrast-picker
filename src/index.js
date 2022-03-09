import { 
  getContrast,
  colorContrastRating,
  hexToRgb
} from './utils';

const chosenColors = [];
const resultElement = document.getElementById('result');
const color1Element = document.getElementById('color1');
const color2Element = document.getElementById('color2');

const resultBarParent = document.createElement('div');
resultBarParent.classList.add('result-bar-parent');
const resultBar = document.createElement('div');
resultBar.classList.add('result-bar');
resultBarParent.appendChild(resultBar);
resultElement.appendChild(resultBarParent);

document.getElementById('eyedropper').addEventListener('click', async (event) => {
  if (!window.EyeDropper) {
    resultElement.textContent = 'Your browser does not support the EyeDropper API';
    return;
  }

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const eyeDropper = new EyeDropper();

  if (chosenColors.length === 0) {
    color2Element.classList.remove('colorHighlight');
    color1Element.classList.add('colorHighlight');
  } else {
    color1Element.classList.remove('colorHighlight');
    color2Element.classList.add('colorHighlight');
  }

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

      if (resultDescription) {
        resultElement.removeChild(resultDescription);
      }

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

  if (instructionsArrow.classList.contains('down')) {
    instructionsArrow.classList.remove('down');
    instructionsArrow.classList.add('right');
  } else {
    instructionsArrow.classList.remove('right');
    instructionsArrow.classList.add('down');
  }

  console.log("instructionsList.classList", instructionsList.classList);

  // if (instructionsList.classList.contains('visible')) {
  //   instructionsList.classList.remove('visible');
  // } else {
  //   instructionsList.classList.add('visible');
  // }

  instructionsList.classList.toggle('visible');
});
