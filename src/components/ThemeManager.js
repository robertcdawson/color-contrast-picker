export class ThemeManager {
  constructor() {
    this.themeToggle = document.getElementById('themeToggle');
    this.compactModeToggle = document.getElementById('compactMode');
    this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.isCompactMode = false;

    this.setupEventListeners();
    this.initializeTheme();
  }

  setupEventListeners() {
    // Theme toggle
    if (this.themeToggle) {
      this.themeToggle.addEventListener('click', () => {
        this.isDarkMode = !this.isDarkMode;
        this.updateTheme();
      });
    }

    // Compact mode toggle (only if element exists)
    if (this.compactModeToggle) {
      this.compactModeToggle.addEventListener('click', () => {
        this.isCompactMode = !this.isCompactMode;
        this.updateCompactMode();
      });
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!this.isDarkMode !== e.matches) {
        this.isDarkMode = e.matches;
        this.updateTheme();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Toggle dark mode with Alt+D
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        this.isDarkMode = !this.isDarkMode;
        this.updateTheme();
      }
      // Toggle compact mode with Alt+C (only if element exists)
      if (e.altKey && e.key.toLowerCase() === 'c' && this.compactModeToggle) {
        e.preventDefault();
        this.isCompactMode = !this.isCompactMode;
        this.updateCompactMode();
      }
    });
  }

  initializeTheme() {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDarkMode = savedTheme === 'dark';
    }

    // Load saved compact mode preference
    const savedCompactMode = localStorage.getItem('compactMode');
    if (savedCompactMode) {
      this.isCompactMode = savedCompactMode === 'true';
    }

    this.updateTheme();
    this.updateCompactMode();
  }

  updateTheme() {
    document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.updateThemeIcon();
  }

  updateCompactMode() {
    document.body.classList.toggle('compact-mode', this.isCompactMode);
    localStorage.setItem('compactMode', this.isCompactMode);
    this.updateCompactIcon();
  }

  updateThemeIcon() {
    if (!this.themeToggle) return;
    
    const icon = this.themeToggle.querySelector('i');
    if (icon) {
      icon.className = this.isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
    }
    this.themeToggle.setAttribute('aria-label', `Switch to ${this.isDarkMode ? 'light' : 'dark'} mode`);
  }

  updateCompactIcon() {
    if (!this.compactModeToggle) return;
    
    const icon = this.compactModeToggle.querySelector('i');
    if (icon) {
      icon.className = this.isCompactMode ? 'fas fa-expand' : 'fas fa-compress';
    }
    this.compactModeToggle.setAttribute('aria-label', `Switch to ${this.isCompactMode ? 'normal' : 'compact'} mode`);
  }

  // Accessibility features
  setupAccessibility() {
    // Add ARIA labels to interactive elements
    this.addAriaLabels();

    // Add keyboard navigation
    this.setupKeyboardNavigation();

    // Add focus management
    this.setupFocusManagement();

    // Add screen reader announcements
    this.setupScreenReaderAnnouncements();
  }

  addAriaLabels() {
    // Add ARIA labels to color inputs
    document.querySelectorAll('.color-inputs input').forEach(input => {
      input.setAttribute('aria-label', `${input.id} color value`);
    });

    // Add ARIA labels to sliders
    document.querySelectorAll('input[type="range"]').forEach(slider => {
      slider.setAttribute('aria-label', `${slider.id} value`);
      slider.setAttribute('aria-valuemin', slider.min);
      slider.setAttribute('aria-valuemax', slider.max);
      slider.setAttribute('aria-valuenow', slider.value);
    });

    // Add ARIA labels to buttons
    document.querySelectorAll('button').forEach(button => {
      if (!button.hasAttribute('aria-label')) {
        button.setAttribute('aria-label', button.textContent.trim());
      }
    });
  }

  setupKeyboardNavigation() {
    // Add keyboard navigation to color history
    const colorHistory = document.querySelector('.color-history-grid');
    if (colorHistory) {
      colorHistory.setAttribute('role', 'grid');
      colorHistory.setAttribute('aria-label', 'Recent colors');
      colorHistory.querySelectorAll('.color-history-item').forEach((item, index) => {
        item.setAttribute('role', 'gridcell');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-label', `Color ${index + 1}`);
      });
    }

    // Add keyboard navigation to options
    document.querySelectorAll('.option-group').forEach(group => {
      group.setAttribute('role', 'radiogroup');
      group.setAttribute('aria-label', group.querySelector('h3')?.textContent || 'Options');
      group.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.setAttribute('role', 'radio');
      });
    });
  }

  setupFocusManagement() {
    // Add focus trap for modals
    document.querySelectorAll('[role="dialog"]').forEach(dialog => {
      const focusableElements = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
              e.preventDefault();
              lastFocusable.focus();
            }
          } else {
            if (document.activeElement === lastFocusable) {
              e.preventDefault();
              firstFocusable.focus();
            }
          }
        }
        if (e.key === 'Escape') {
          dialog.setAttribute('aria-hidden', 'true');
          dialog.style.display = 'none';
        }
      });
    });
  }

  setupScreenReaderAnnouncements() {
    // Create a live region for announcements
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.padding = '0';
    announcement.style.margin = '-1px';
    announcement.style.overflow = 'hidden';
    announcement.style.clip = 'rect(0, 0, 0, 0)';
    announcement.style.whiteSpace = 'nowrap';
    announcement.style.border = '0';
    document.body.appendChild(announcement);

    // Function to announce changes
    this.announce = (message) => {
      announcement.textContent = message;
    };
  }
} 