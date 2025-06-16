// haeVuokramestarit.js

export async function haeVuokramestarit(cityName, cityId) {
    return new Promise((resolve, reject) => {
      chrome.tabs.create(
        {
          url: "https://www.vuokramestarit.net/kohteet/",
          active: false,
        },
        (tab) => {
          const tabId = tab.id;
  
          setTimeout(() => {
            chrome.scripting.executeScript(
              {
                target: { tabId },
                func: () => {
                  const key = Object.keys(window.wpp_query || {})[0];
                  return window.wpp_query?.[key]?.properties?.total ?? null;
                },
              },
              (results) => {
                chrome.tabs.remove(tabId);
                const tulos = results?.[0]?.result;
                if (typeof tulos === "number") {
                  resolve(tulos);
                } else {
                  reject("❌ Kohteiden määrä ei löytynyt.");
                }
              }
            );
          }, 2000);
        }
      );
    });
  }
  