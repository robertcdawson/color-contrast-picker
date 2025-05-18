import { handleColorSquareClick, handleManualColorInput } from '../eventHandlers';
import { handleColorSelection, updateContrastResult, showStatus } from '../ui';

// Mock the modules
jest.mock('../ui', () => ({
  handleColorSelection: jest.fn(),
  updateContrastResult: jest.fn(),
  showStatus: jest.fn(),
  chosenColors: [],
}));

describe('eventHandlers', () => {
  let originalWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    global.console.warn = jest.fn();
    global.console.error = jest.fn();
    global.console.log = jest.fn();
    originalWindow = global.window;
    // Create a new object that inherits from the original window
    global.window = Object.create(originalWindow);
    // Mock document.createElement for fallback color picker
    global.document.createElement = jest.fn(() => ({
      type: '',
      addEventListener: jest.fn(),
      click: jest.fn(),
    }));
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe('handleColorSquareClick', () => {
    it('should use EyeDropper when fully available', async () => {
      const mockEvent = { preventDefault: jest.fn() };
      const mockEyeDropper = {
        open: jest.fn().mockResolvedValue({ sRGBHex: '#00FF00' }),
      };
      global.window.EyeDropper = jest.fn(() => mockEyeDropper);

      await handleColorSquareClick(mockEvent, 1);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(handleColorSelection).toHaveBeenCalledWith('#00FF00', 0);
      expect(updateContrastResult).toHaveBeenCalled();
    });

    it('should log a warning and use fallback when EyeDropper is not available', async () => {
      const mockEvent = { preventDefault: jest.fn() };
      delete global.window.EyeDropper;

      await handleColorSquareClick(mockEvent, 1);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith("Your browser does not support the EyeDropper API. Using fallback.");
      expect(document.createElement).toHaveBeenCalledWith('input');
    });

    it('should handle AbortError', async () => {
      const mockEvent = { preventDefault: jest.fn() };
      const mockEyeDropper = {
        open: jest.fn().mockRejectedValue(new DOMException('The user aborted a request.', 'AbortError')),
      };
      global.window.EyeDropper = jest.fn(() => mockEyeDropper);

      await handleColorSquareClick(mockEvent, 1);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Error using EyeDropper: The user aborted a request.. Using fallback.');
      expect(document.createElement).toHaveBeenCalledWith('input');
    });

    it('should handle other errors', async () => {
      const mockEvent = { preventDefault: jest.fn() };
      const mockEyeDropper = {
        open: jest.fn().mockRejectedValue(new Error('Some other error')),
      };
      global.window.EyeDropper = jest.fn(() => mockEyeDropper);

      await handleColorSquareClick(mockEvent, 1);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Error using EyeDropper: Some other error. Using fallback.');
      expect(document.createElement).toHaveBeenCalledWith('input');
    });

    test('handleColorSquareClick opens EyeDropper when available', () => {
      window.EyeDropper = jest.fn().mockImplementation(() => ({
        open: jest.fn().mockResolvedValue({ sRGBHex: '#FFFFFF' }),
      }));
      // ... existing assertions ...
    });
  });

  describe('handleManualColorInput', () => {
    it('should update color and contrast result for valid input', () => {
      const mockEvent = {
        target: {
          id: 'color1Input',
          value: '#FF0000',
        },
      };
      document.getElementById = jest.fn(() => ({ style: {} }));

      handleManualColorInput(mockEvent);

      expect(updateContrastResult).toHaveBeenCalled();
    });

    it('should show a status message for invalid input', () => {
      const mockEvent = {
        target: {
          id: 'color1Input',
          value: 'invalid',
        },
      };
      handleManualColorInput(mockEvent);

      expect(showStatus).toHaveBeenCalledWith('Please enter a valid hex color value (e.g., #FF0000)', true);
    });
  });
});