export function haeRentsi(cityId, cityName) {
    return new Promise((resolve, reject) => {
      const normalizedName = cityName
        .toLowerCase()
        .replace(/ä/g, "a")
        .replace(/ö/g, "o")
        .replace(/å/g, "a");
  
      const url = `https://www.vuokraovi.com/vuokra-asunnot/${normalizedName}?haku=${cityId}`;
  
      chrome.tabs.create({ url, active: false }, (tab) => {
        const tabId = tab.id;
        if (!tabId) return reject("Tabia ei saatu luotua");
  
        chrome.scripting.executeScript(
          {
            target: { tabId },
            func: () => {
                return new Promise((resolveReady) => {
                  const check = () => {
                    const el = document.querySelector("#searchResultCount");
                    if (el && el.textContent.match(/^\d+$/)) {
                      resolveReady(el.textContent);
                    } else {
                      setTimeout(check, 100); // odota ja yritä uudelleen
                    }
                  };
                  check();
                });
            }
              
          },
          (results) => {
            const result = results?.[0]?.result;
            chrome.tabs.remove(tabId);
            if (result) resolve(parseInt(result));
            else reject("Kohteiden määrä ei löytynyt.");
          }
        );
      });
    });
  }
  