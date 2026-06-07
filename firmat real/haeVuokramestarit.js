export async function haeVuokramestarit(cityId, cityName) {
  // Muodosta URL: pienet kirjaimet, poista välilyönnit ja ääkköset
  const normalizedCityName = cityName
    .toLowerCase()
    .normalize('NFD')            // jaa ääkköset ja perusmerkit
    .replace(/\p{Diacritic}/gu, '') // poista diakriitikset
    .replace(/\s+/g, '')           // poista välilyönnit
    .replace(/[^a-z0-9-]/g, '');    // salli vain a-z, 0-9 ja -

  const url = `https://www.vuokramestarit.net/kohteet/vuokra-asunnot-${normalizedCityName}/`;

  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      const tabId = tab.id;

      // Odota latausta
      console.log(`Odota latausta`);
      chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
        if (updatedTabId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);

          // Suorita script
          console.log(`Suorita script`);
          chrome.scripting.executeScript(
            { target: { tabId }, func: analyzePage },
            (results) => {
              chrome.tabs.remove(tabId);
              const result = results?.[0]?.result;
              if (typeof result === 'number') {
                resolve(result);
              } else {
                reject('❌ Kohteiden määrä ei löytynyt tai virhe laski määrää.');
              }
            }
          );
        }
      });
    });
  });
}

// Tämä funktio suoritetaan sivulla
// Tämä funktio suoritetaan sivulla
function analyzePage() {
  // 2. Etsi pages lista
  console.log(`Vuokramestarit.analyzePage 2`);
  const pagesContainer = document.querySelector('li.pages > ul');
  const pages = pagesContainer ? pagesContainer.querySelectorAll('li').length : 0;

  // 3. Jos alle 2 sivua, lasketaan vain ensimmäisen sivun properties
  console.log(`Vuokramestarit.analyzePage 3`);
  const getPropertiesCount = () => document.querySelectorAll('div.property_div.property.clearfix').length;

  if (pages < 2) {
    return getPropertiesCount();
  }

  // 4. Klikkaa viimeistä sivua (KORJATTU VERSIO)
  console.log(`Vuokramestarit.analyzePage 4`);
  // Etsitään koko dokumentista ja kohdistetaan a-linkkiin
  const lastBtn = document.querySelector('li.last-page-btn a');
  if (lastBtn) {
    lastBtn.click();
  }

  // 5. Odota DOM-muutosten loppumista
  console.log(`Vuokramestarit.analyzePage 5`);
  return new Promise((resolve) => {
    let debounceTimeout;
    let maxTimeout;
    let logInterval;
    let secondsPassed = 0;

    const finish = (reason) => {
      observer.disconnect();
      clearTimeout(debounceTimeout);
      clearTimeout(maxTimeout);
      clearInterval(logInterval);

      // 6. Laske properties viimeisellä sivulla
      console.log(`Vuokramestarit.analyzePage 6 (${reason})`);
      const propertiesInLast = getPropertiesCount();
      
      // 7. Laske kokonaismäärä
      console.log(`Vuokramestarit.analyzePage 7`);
      resolve((pages - 1) * 10 + propertiesInLast);
    };

    // Aloita sekuntien tulostus
    logInterval = setInterval(() => {
      secondsPassed++;
      console.log(`Vuokramestarit.analyzePage 5.1 - Odotettu ${secondsPassed} sekuntia...`);
    }, 1000);

    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimeout);
      // Nollataan debounce-ajastin aina kun DOM muuttuu (1500ms hiljaisuus riittää)
      debounceTimeout = setTimeout(() => finish('DOM asettui 1500ms'), 1500);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Käynnistetään ajastimet
    debounceTimeout = setTimeout(() => finish('Ei DOM-muutoksia 1500ms'), 1500);
    maxTimeout = setTimeout(() => finish('Maksimiaika 5s saavutettu'), 5000);
  });
}
