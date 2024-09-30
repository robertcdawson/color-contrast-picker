# Color Contrast Checker - A Chrome Extension

![Status: Not Functioning](https://img.shields.io/badge/Status-Not%20Functioning-red)

A simple web application to check color contrast ratios for accessibility compliance.

## Project Status

:warning: **Warning:** The project builds successfully, but core functionality is currently not working as expected. We are actively investigating. And by "we" I mean myself and our future overlords. And by "actively" I mean when time allows, which isn't often these days.

🚀 <span style="color: #4CAF50;">All advice welcome!</span>

## Description

This Chrome extension allows users to select two colors using an eyedropper tool or manual input, and then calculates the contrast ratio between the colors, offering helpful WCAG information as a result. The goal of this tool is to help designers and developers meet WCAG accessibility standards for color contrast.

## Local Usage

1. To run the extension locally:
   - Clone this repository: `git clone https://github.com/robertcdawson/color-contrast-checker.git`
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked" and select the cloned project directory
2. Click the extension icon in your Chrome browser to open the color picker.
3. Use the eyedropper tool to select colors from your current web page:
   - Click the first color square to pick the foreground color.
   - Click the second color square to pick the background color.
4. The contrast ratio will be calculated and displayed automatically.
5. For manual input, use the hex color input fields below each color square.
6. The extension will indicate whether the selected colors meet WCAG accessibility standards.

## Features

- Eyedropper tool for easy color selection (with fallback for unsupported browsers)
- Manual hex color input
- Real-time contrast ratio calculation
- WCAG compliance indicator

## Development

To set up the project for development:

1. Clone the repository
2. Open the project folder in your preferred code editor
3. Ensure you have Node.js installed on your system
4. Open a terminal and navigate to the project directory
5. Install the project dependencies by running:
   ```
   npm install
   ```
6. Build the project using:
   ```
   npm run build
   ```
   This will use webpack to bundle the project according to the configuration in `webpack.config.js`

To run tests:

1. After setting up the project (steps 1-5 above), run the tests using:
   ```
   npm test
   ```

This will execute all test files in the `src/__tests__` directory using Jest.

## Documentation Resources

For more information about Chrome Extensions and the EyeDropper API, refer to these helpful resources:

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [EyeDropper API GitHub Repository](https://github.com/WICG/eyedropper-api)
- [EyeDropper API Explanation](https://developer.chrome.com/docs/capabilities/web-apis/eyedropper)

These resources provide comprehensive information about developing Chrome extensions and using the EyeDropper API, which are key components of this project.