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
      chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
        if (updatedTabId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);

          // Suorita script
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
function analyzePage() {
  // 2. Etsi pages lista
  const pagesContainer = document.querySelector('li.pages > ul');
  const pages = pagesContainer ? pagesContainer.querySelectorAll('li').length : 0;

  // 3. Jos alle 2 sivua, lasketaan vain ensimmäisen sivun properties
  const getPropertiesCount = () => document.querySelectorAll('div.property_div.property.clearfix').length;

  if (pages < 2) {
    return getPropertiesCount();
  }

  // 4. Klikkaa viimeistä sivua
  const lastBtn = pagesContainer.querySelector('li.last-page-btn');
  if (lastBtn) lastBtn.click();

  // 5. Odota DOM-muutosten loppumista
  return new Promise((resolve) => {
    let timeout;
    const observer = new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        observer.disconnect();
        // 6. Laske properties viimeisellä sivulla
        const propertiesInLast = getPropertiesCount();
        // 7. Laske kokonaismäärä
        resolve((pages - 1) * 10 + propertiesInLast);
      }, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
