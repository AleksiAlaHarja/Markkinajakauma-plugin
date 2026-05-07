// contentScript.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_OVV_NONCE") {
    try {
      const input = document.querySelector('input[name="ovv_plugin_nonce"]');
      const nonce = input?.value || null;

      if (nonce) {
        console.log(`🔵 ContentScript löysi nonce: ${nonce}`);
        sendResponse({ nonce });
      } else {
        console.error("❌ ContentScript: Noncea ei löytynyt DOMista.");
        sendResponse({ nonce: null });
      }
    } catch (error) {
      console.error("❌ ContentScript: Virhe noncea haettaessa:", error);
      sendResponse({ nonce: null });
    }
  }
  return true;
});
