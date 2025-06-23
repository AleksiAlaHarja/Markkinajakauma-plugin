// background.js (Manifest V3)

export async function haeYksityisetOikotie(cityId, cityName) {
  console.log(`  ➡️ [haeYksityisetOikotie] ${cityName}...`);

  // 1) Kokoa URL (huom. cityId vakiintuneesti 64)
  const url = `https://asunnot.oikotie.fi/vuokra-asunnot?pagination=1`
    + `&locations=[[64,6,"${encodeURIComponent(cityName)}"]]`
    + `&cardType=101&vendorType[]=private`;

  // 2) Avaa taustatab
  const tab = await chrome.tabs.create({ url, active: false });

  // 3) Injektoi skripti, joka pollaa <search-count>-tagin sisällä kunnes löytyy numero
  const [injectionResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (cityName) => {
      return new Promise((resolve) => {
        const checkCount = () => {
          const el = document.querySelector(
            'search-count[search-params="$ctrl.searchParams"]'
          );
          if (el) {
            // Poista kaikki ei-numeraaliset merkit (välilyönnit, tuhaterottimet ym.)
            const digits = el.textContent.trim().replace(/\D+/g, '');
            if (digits.length > 0) {
              const value = parseInt(digits, 10);
              resolve(value);
              return;
            }
          }
          // Jatketaan 100 ms välein kunnes löytyy
          setTimeout(checkCount, 100);
        };
        checkCount();
      });
    },
    args: [cityName],  // välitetään nimi lokia varten
  });

  // 4) Sulje tab (jos et tarvitse näkyvyyttä)
  await chrome.tabs.remove(tab.id);

  // 5) Palauta löydetty luku
  console.log(`  ⬅️ [haeYksityisetOikotie] ${cityName}: ${injectionResult.result}`);
  return injectionResult.result;
}
