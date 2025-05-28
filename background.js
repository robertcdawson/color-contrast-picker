// Manifest V3 Service Worker for WCAG Color Contrast Checker
// This service worker handles communication between the popup and content scripts

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Service worker received message:', request);

  // Handle popup height adjustment (legacy support)
  if (request.action === "setPopupHeight") {
    // Note: This is deprecated in MV3, but kept for compatibility
    chrome.action.setPopup({ popup: `dist/index.html#height=${request.height}` });
    sendResponse({ success: true });
    return;
  }

  // Get active tab information
  if (request.action === "getActiveTab") {
    chrome.tabs.query({ active: true, currentWindow: true })
      .then((tabs) => {
        if (tabs && tabs.length > 0) {
          sendResponse({ tabId: tabs[0].id, url: tabs[0].url });
        } else {
          sendResponse({ error: "No active tab found" });
        }
      })
      .catch((error) => {
        console.error('Error getting active tab:', error);
        sendResponse({ error: error.message });
      });
    return true; // Keep the message channel open for async response
  }

  // Relay messages to content scripts
  if (request.action === "relayToContentScript") {
    chrome.tabs.sendMessage(request.tabId, request.message)
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        console.error('Error relaying message to content script:', error);
        sendResponse({ error: error.message });
      });
    return true; // Keep the message channel open for async response
  }

  // Handle extension installation/update
  if (request.action === "checkExtensionStatus") {
    sendResponse({ 
      version: chrome.runtime.getManifest().version,
      manifestVersion: chrome.runtime.getManifest().manifest_version
    });
    return;
  }
});

// Handle extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details);
  
  if (details.reason === 'install') {
    console.log('Extension installed for the first time');
    // Could open a welcome page or show onboarding
  } else if (details.reason === 'update') {
    console.log('Extension updated from version:', details.previousVersion);
    // Could show update notes or migrate settings
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
});

// Handle tab updates for potential real-time monitoring (future feature)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process when page is completely loaded
  if (changeInfo.status === 'complete' && tab.url) {
    // Future: Could trigger automatic contrast analysis
    console.log('Page loaded:', tab.url);
  }
});

// Error handling for unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in service worker:', event.reason);
});

// Handle runtime connections (for popup/content script communication)
chrome.runtime.onConnect.addListener((port) => {
  console.log('Port connected:', port.name);
  
  port.onMessage.addListener((message) => {
    console.log('Message received on port:', message);
    // Handle port messages if needed
  });
  
  port.onDisconnect.addListener(() => {
    console.log('Port disconnected:', port.name);
    // Clean up any port-specific resources
  });
});

// Keep service worker alive during active operations (simplified approach)
let isActive = false;

function keepAlive() {
  if (isActive) {
    // Lightweight operation to prevent service worker termination
    chrome.runtime.getPlatformInfo(() => {
      // This keeps the service worker active
    });
    setTimeout(keepAlive, 20000); // Check again in 20 seconds
  }
}

// Start keep-alive when extension becomes active
function startKeepAlive() {
  if (!isActive) {
    isActive = true;
    keepAlive();
  }
}

// Stop keep-alive when extension becomes inactive
function stopKeepAlive() {
  isActive = false;
}

// Monitor extension activity
chrome.runtime.onMessage.addListener(() => {
  startKeepAlive();
});

// Auto-stop keep-alive after period of inactivity
setTimeout(() => {
  stopKeepAlive();
}, 300000); // Stop after 5 minutes of inactivity
