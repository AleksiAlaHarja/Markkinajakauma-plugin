export async function haeKlikAsuntovuokraus(cityName, cityId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create(
      { url: "https://www.klikasuntovuokraus.fi/vuokralaiset/vuokralaiset-etusivu", active: false },
      async (tab) => {
        const tabId = tab.id;
        let lastValue = null;
        let stableCount = 0;

        const intervalId = setInterval(() => {
          chrome.scripting.executeScript(
            {
              target: { tabId },
              func: () => {
                if (document.readyState !== "complete") return null;

                const targetText = "Tälläkin hetkellä kauttamme on vuokrattavissa";
                const html = document.body.innerHTML;
                const index = html.indexOf(targetText);
                if (index === -1) return null;

                const snippet = html.slice(index, index + 200);
                const match = snippet.match(/<strong[^>]*>(\d+)<\/strong>/);
                return match ? match[1] : null;
              },
            },
            (results) => {
              const value = results?.[0]?.result;

              if (value === null) return;

              if (value === lastValue) {
                stableCount++;
              } else {
                stableCount = 1;
                lastValue = value;
              }

              if (stableCount >= 2) {
                clearInterval(intervalId);
                clearTimeout(timeoutId);
                chrome.tabs.remove(tabId);
                resolve(value);
              }
            }
          );
        }, 500);

        const timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          chrome.tabs.remove(tabId);
          reject("Aikakatkaisu: Lukemaa ei saatu vakaana 10 sekunnissa.");
        }, 10000);
      }
    );
  });
}
