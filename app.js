// ref: https://stackoverflow.com/a/9733420/1376091
function luminance(r, g, b) {
  const a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928
      ? v / 12.92
      : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrast(rgb1, rgb2) {
  const lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return ((brightest + 0.05) / (darkest + 0.05)).toFixed(2);
}

// Return color contrast grade based on contrast ratio
// Ref: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
function colorContrastRating(ratio) {
  let rating = "";
  switch (true) {
    case (ratio >= 7):
      rating = "great";
      break;
    case (ratio >= 4.5) && (ratio < 7):
      rating = "good";
      break;
    case (ratio >= 3) && (ratio < 4.5):
      rating = "okay";
      break;
    case (ratio < 3):
      rating = "poor";
      break;
    default:
      break;
  }
  return rating;
}

// Convert HEX to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ]
    : null;
}

// function setPageBackgroundColor() {
//   document.body.style.backgroundColor = "yellow";
// }

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

  // chrome.scripting.executeScript({
  //   target: { tabId: tab.id },
  //   function: setPageBackgroundColor,
  // });

  const eyeDropper = new EyeDropper();

  eyeDropper.open().then(result => {
    // Reset resultElement and re-add result bar
    // resultElement.innerHTML = '';
    // resultElement.appendChild(resultBarParent);
    
    if (chosenColors.length <= 1) {
      chosenColors.push(result.sRGBHex);
      console.log("chosenColors", chosenColors);
      console.log("chosenColors.length", chosenColors.length);
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
