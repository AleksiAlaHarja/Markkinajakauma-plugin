export async function haeTotalVuokraovi(cityId, cityName) {
  console.log(`➡️➡️ [haeTotalVuokraovi] ${cityName}...`);
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
                if (el) {
                  // Poistetaan kaikki whitespace-merkit (myös NBSP)
                  const raw = el.textContent.trim();
                  const digitsOnly = raw.replace(/\s/g, "");
                  if (/^\d+$/.test(digitsOnly)) {
                    resolveReady(digitsOnly);
                    return;
                  }
                }
                setTimeout(check, 100); // odota ja yritä uudelleen
              };
              check();
            });
          },
        },
        (results) => {
          const result = results?.[0]?.result;
          chrome.tabs.remove(tabId);
          if (result) {
            console.log(`⬅️⬅️ [haeTotalVuokraovi] ${cityName}:  ${result}`);
            resolve(parseInt(result, 10));
          } else {
            reject("Kohteiden määrä ei löytynyt.");
          }
        }
      );
    });
  });
}
