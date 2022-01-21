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

function contrast(rgb1, rgb2) {
  const lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05)
    / (darkest + 0.05);
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

document.getElementById('eyedropper').addEventListener('click', async (event) => {
  // let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // chrome.scripting.executeScript({
  //   target: { tabId: tab.id },
  //   function: setPageBackgroundColor,
  // });

  if (!window.EyeDropper) {
    resultElement.textContent = 'Your browser does not support the EyeDropper API';
    return;
  }

  const eyeDropper = new EyeDropper();

  eyeDropper.open().then(result => {
    resultElement.textContent = result.sRGBHex;
    if (chosenColors.length <= 1) {
      chosenColors.push(result.sRGBHex);
    } else {
      chosenColors.shift();
      chosenColors.push(result.sRGBHex);
    }
    console.log(chosenColors);
    color1Element.style.backgroundColor = chosenColors[0];
    color2Element.style.backgroundColor = chosenColors[1];

    if (chosenColors.length === 2) {
      const chosenColor1 = hexToRgb(chosenColors[0]);
      const chosenColor2 = hexToRgb(chosenColors[1]);
      const contrastRatio = contrast(chosenColor1, chosenColor2);
      resultElement.textContent = `Contrast ratio: ${contrastRatio}`;
    }
  }).catch(e => {
    resultElement.textContent = e;
  });
});