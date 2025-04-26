export async function haeOVV(cityId, cityName) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create(
      { url: "https://www.ovv.com/vuokrattavat-kohteet/", active: true },
      (tab) => {
        const tabId = tab.id;

        chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
          if (updatedTabId === tabId && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);

            chrome.scripting.executeScript({
              target: { tabId },
              files: ["ovv-content.js"]
            }).then(() => {
              // Odota 5 sekuntia ennen viestin lähetystä
              setTimeout(() => {
                chrome.tabs.sendMessage(
                  tabId,
                  { tyyppi: "hae_ovv", city: cityName },
                  (response) => {
                    if (chrome.runtime.lastError) {
                      console.error("Viestivirhe:", chrome.runtime.lastError.message);
                      resolve(0);
                    } else {
                      resolve(response?.määrä ?? 0);
                    }

                    chrome.tabs.remove(tabId);
                  }
                );
              }, 5000);
            }).catch((e) => {
              console.error("Scriptin injektointi epäonnistui:", e.message);
              resolve(0);
              chrome.tabs.remove(tabId);
            });
          }
        });
      }
    );
  });
}
