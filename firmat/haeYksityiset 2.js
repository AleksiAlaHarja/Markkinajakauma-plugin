// firmat/haeYksityiset.js
export async function haeYksityiset(cityId, cityName) {
  const vuokraoviYksityiset = await haeVuokraoviYksityiset(cityId, cityName);
  const oikotieYksityiset = await haeOikotieYksityiset(cityId, cityName);
  return Math.max(vuokraoviYksityiset, oikotieYksityiset);
}

async function haeOikotieYksityiset(cityId, cityName) {
  console.log(`Palautetaan placeholder 1 Oikotieltä kaupungille ${cityName}`);
  return 1;
}

async function haeVuokraoviYksityiset(cityId, cityName) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url: "https://www.vuokraovi.com/haku/vuokra-asunnot", active: false }, (tab) => {
      const uusiTabId = tab.id;

      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === uusiTabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);

          chrome.scripting.executeScript({
            target: { tabId: uusiTabId },
            world: "MAIN",
            func: () => {
              const checkbox = document.getElementById('building.livingType1');
              if (checkbox && !checkbox.checked) {
                checkbox.scrollIntoView();
                checkbox.click();
              }
              return "✅ Checkbox klikattu";
            }
          }, (results) => {
            resolve(1);
          });
        }
      });
    });
  });
}
