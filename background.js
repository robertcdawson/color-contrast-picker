chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setPopupHeight") {
    chrome.action.setPopup({ popup: `index.html#height=${request.height}` });
  }
});
