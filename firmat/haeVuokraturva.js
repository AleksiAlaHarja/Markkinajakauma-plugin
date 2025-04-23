// firmat/haeVuokraturva.js
export async function haeVuokraturva(cityId, cityName) {
  const baseUrl = "https://portaali.vuokraturva.fi/vuokralainen/asuntohaku?query=";

  const queryObj = {
    locations: [
      { city_id: cityId },
    ],
    page: 1
  };

  const encodedQuery = encodeURIComponent(JSON.stringify(queryObj));
  const url = baseUrl + encodedQuery;

  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url: url, active: false }, (tab) => {
      const uusiTabId = tab.id;

      const listener = (tabId, changeInfo, tab) => {
        if (tabId === uusiTabId && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);

          chrome.scripting.executeScript({
            target: { tabId: uusiTabId },
            func: () => {
              const teksti = document.body.innerText;

              // 1. Etsi kohdemäärä
              const match = teksti.match(/\((\d+)\s+kohdetta\)/);
              if (match) {
                return parseInt(match[1]);
              }

              // 2. Tarkista löytyykö tieto ettei ole kohteita
              if (teksti.includes("Ei hakuehtoja vastaavia asuntoja")) {
                return 0;
              }

              // 3. Jos kumpikaan ei löydy, palauta varoitusmerkki
              return "⚠️";
            }
          }, (results) => {
            const resultValue = results[0].result;
            chrome.tabs.remove(uusiTabId, () => {
              if (resultValue === "⚠️") {
                console.warn(`Vuokraturva: ei voitu tulkita tulosta kaupungille ${cityName} (${cityId})`);
              }
              resolve(resultValue);
            });
          });
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}
