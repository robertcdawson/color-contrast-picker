# Color Contrast Picker

## Description

This picker works like a color picker (e.g., ColorZilla) but lets you choose two colors to determine color contrast.

## Instructions

### For Chrome

1. Clone this repo
1. Go to chrome://extensions/
1. Click the "Load Unpacked" button
1. Select the color-contrast-picker folder
1. Go to any web page
1. Click the Extensions icon in the toolbar (looks like a puzzle piece)
1. Click the pin icon next to the Color Contrast Picker extension (optional, for convenience)
1. Click the "Select a Color" button to select the first color (first color slot highlights)
1. Click the "Select a Color" button to select the second color (second color slot highlights)
1. View result!

## Under the Hood

This code leverages the [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API) to allow a user to select two colors and see the contrast ratio.