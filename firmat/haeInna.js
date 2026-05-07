export async function haeInna(cityId, cityName) {
  const url = `https://asunnot.inna.fi/asunnot?cities=${encodeURIComponent(cityName)}`;

  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      const tabId = tab.id;

      chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
        if (updatedTabId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);

          chrome.scripting.executeScript(
            { target: { tabId }, func: analyzeInnaPage },
            (results) => {
              chrome.tabs.remove(tabId);
              const result = results?.[0]?.result;
              resolve(typeof result === 'number' ? result : 0);
            }
          );
        }
      });
    });
  });
}

// Tämä funktio suoritetaan avatulla sivulla
async function analyzeInnaPage() {
  return new Promise((resolve) => {
    // Apufunktio tuloksen etsimiseen
    const etsiTulos = () => {
      for (const h2 of document.querySelectorAll('h2')) {
        if (h2.textContent.includes('Näytetään tulokset')) {
          const parts = h2.textContent.split('/');
          if (parts.length > 1) {
            return parseInt(parts[1].trim(), 10);
          }
        }
      }
      return null;
    };

    // 1. Kokeillaan heti, jos sivu on jo valmis
    const hetiValmis = etsiTulos();
    if (hetiValmis !== null) return resolve(hetiValmis);

    // 2. Jäädään odottamaan dynaamisen sisällön renderöitymistä
    let timeout;
    const observer = new MutationObserver(() => {
      const tulos = etsiTulos();
      if (tulos !== null) {
        clearTimeout(timeout);
        observer.disconnect();
        resolve(tulos);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 3. Aikakatkaisu (esim. 5s), ettei välilehti jää roikkumaan loputtomiin, jos kaupungissa ei ole asuntoja
    timeout = setTimeout(() => {
      observer.disconnect();
      resolve(0);
    }, 5000);
  });
}