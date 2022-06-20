chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.onUpdated.addListener((tabId) => {
    chrome.tabs.get(tabId, (tab) => {
      console.log(tab);
    });
  });
});
