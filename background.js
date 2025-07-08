chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Code Explainer installed.");
  chrome.contextMenus.create({
    id: "explainCode",
    title: "Explain this code with AI",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "explainCode" && info.selectionText) {
    // Store the selected text so the popup can retrieve it
    chrome.storage.local.set({ selectedCode: info.selectionText }, () => {
      // Open the popup window
      chrome.action.openPopup();
    });
  }
});
