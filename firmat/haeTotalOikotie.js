export async function haeTotalOikotie(cityId, cityName) {
    console.log(`🔎 Avataan Oikotie ja haetaan kaupungille: ${cityName}...`);
  
    return new Promise((resolve) => {
      chrome.tabs.create({ url: "https://asunnot.oikotie.fi/vuokra-asunnot", active: false }, (tab) => {
        if (!tab.id) {
          console.error("❗ Ei saatu luotua uutta välilehteä Oikotielle.");
          return resolve(0);
        }
  
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === tab.id && changeInfo.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
  
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: async (cityName) => {
                const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
                const waitForElement = async (selector, timeout = 10000) => {
                  const start = Date.now();
                  while (Date.now() - start < timeout) {
                    const el = document.querySelector(selector);
                    if (el) return el;
                    await sleep(100);
                  }
                  return null;
                };
  
                const simulateClickCenter = (element) => {
                  const rect = element.getBoundingClientRect();
                  const x = rect.left + rect.width / 2;
                  const y = rect.top + rect.height / 2;
  
                  ["mousedown", "mouseup", "click"].forEach(eventType => {
                    const event = new MouseEvent(eventType, {
                      view: window,
                      bubbles: true,
                      cancelable: true,
                      clientX: x,
                      clientY: y
                    });
                    element.dispatchEvent(event);
                  });
                };
  
                const typeTextWithKeyboardEvents = async (element, text) => {
                  element.focus();
                  for (const char of text) {
                    const keydown = new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true });
                    const keypress = new KeyboardEvent('keypress', { key: char, bubbles: true, cancelable: true });
                    const inputEvent = new InputEvent('input', { data: char, bubbles: true, cancelable: true });
                    const keyup = new KeyboardEvent('keyup', { key: char, bubbles: true, cancelable: true });
  
                    element.dispatchEvent(keydown);
                    element.dispatchEvent(keypress);
                    element.dispatchEvent(inputEvent);
                    element.dispatchEvent(keyup);
  
                    await sleep(100); // 100 ms per kirjain
                  }
                };

                const typeTextRealistically = async (element, text) => {
                    console.log("➡️ cityName:", text);
                    console.log("➡️ text length:", text.length);
                    console.log("➡️ 1 funktiossa typeTextRealistically");
                    element.focus();
                    console.log("➡️ 2 element.focus()");
                    for (const char of text) {
                      console.log("➡️ 3 for (const char of text)");
                      const keydown = new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true });
                      element.dispatchEvent(keydown);
                      console.log("➡️ 4 element.dispatchEvent(keydown)");
                      element.value += char;
                      console.log("➡️ 5 element.value += char");
                      const inputEvent = new Event('input', { bubbles: true });
                      element.dispatchEvent(inputEvent);
                      console.log("➡️ 6 element.dispatchEvent(inputEvent)");
                      const keyup = new KeyboardEvent('keyup', { key: char, bubbles: true, cancelable: true });
                      element.dispatchEvent(keyup);
                      console.log("➡️ 7 element.dispatchEvent(keyup)");
                      await new Promise(resolve => setTimeout(resolve, 150)); // 150 ms per kirjain (vähän luonnollisempaa)
                    }
                  };
  
                console.log("cityName: ", cityName);

                // 1. Tyhjennä hakutiedot
                const clearButton = await waitForElement('button[analytics-click="search_click_clear"]');
                if (clearButton) {
                  clearButton.click();
                  await sleep(500);
                }
  
                // 2. Avaa kaikki hakuehdot
                const allFiltersButton = Array.from(document.querySelectorAll('span.button__text'))
                  .find(el => el.textContent.includes("Kaikki hakuehdot"));
                if (allFiltersButton) {
                  allFiltersButton.click();
                  await sleep(500);
                }

                const countElementBefore = await waitForElement('search-count');
                const oldCount = countElementBefore ? parseInt(countElementBefore.textContent.replace(/\D/g, ''), 10) : 0;
                console.log("➡️ oldCount: ", oldCount);
  
                // 4. Kirjoita cityName hakukenttään kirjain kerrallaan
                const searchModal = await waitForElement('div.search-modal');
                if (searchModal) {
                  const input = searchModal.querySelector('input[id^="autocomplete"][id$="-input"]');
                  if (input) {
                    simulateClickCenter(input);
                    await sleep(100);
                    await typeTextSmart(input, cityName);
                    await sleep(1000);
                
                    const suggestion = await waitForElement('ul[role="listbox"] li[role="option"]');
                    if (suggestion) {
                      suggestion.click();
                      await sleep(1000);
                    } else {
                      console.warn("⚠️ Autocomplete-vaihtoehtoa ei löytynyt!");
                    }
                  } else {
                    console.warn("⚠️ Autocomplete-inputia ei löytynyt search-modalista!");
                  }
                } else {
                  console.warn("⚠️ Search-modal ei löytynyt!");
                }


                // Odotetaan että uusi lukumäärä tulee näkyviin
                const waitForUpdatedCount = async (oldCount, timeout = 15000) => {
                    console.log("➡️ 1 funktiossa waitForUpdatedCount");
                    const start = Date.now();
                    console.log("➡️ 2 start:", start);
                  
                    while (Date.now() - start < timeout) {
                      console.log("➡️ 3 while (Date.now() - start < timeout)");
                  
                      const buttons = Array.from(document.querySelectorAll('span.button__text'))
                        .filter(el => el.textContent.includes("Hae kohteet (") && el.querySelector('search-count'));
                      console.log("➡️ 4 löydetyt painikkeet:", buttons.length);
                  
                      const counts = buttons.map(button => {
                        const searchCountElement = button.querySelector('search-count');
                        if (searchCountElement) {
                          const countText = searchCountElement.textContent;
                          const count = parseInt(countText.replace(/\D/g, ''), 10);
                          return isNaN(count) ? null : count;
                        }
                        return null;
                      }).filter(c => c !== null);
                  
                      console.log("➡️ 5 löydetyt lukumäärät:", counts);
                  
                      if (counts.length > 0) {
                        const newCount = Math.min(...counts);
                        console.log("➡️ 6 pienin lukumäärä:", newCount);
                  
                        if (newCount !== oldCount) {
                          console.log("✅ Uusi lukumäärä havaittu:", newCount);
                          return newCount;
                        }
                      }
                  
                      await sleep(100);
                    }
                  
                    console.warn("⚠️ Lukumäärä ei päivittynyt timeoutissa, palautetaan vanha luku:", oldCount);
                    return oldCount;
                  };
                  
                
  
                // 6. Odota että hakutulosten määrä päivittyy
                const updatedCount = await waitForUpdatedCount(oldCount);
                console.log("✅ Päivitetty asuntojen määrä:", updatedCount);
  
                return updatedCount;
              },
              args: [cityName]
            }, (results) => {
              if (chrome.runtime.lastError) {
                console.error("❗ Virhe skriptin suorittamisessa:", chrome.runtime.lastError.message);
                chrome.tabs.remove(tab.id);
                return resolve(0);
              }
  
              const result = results && results[0] && typeof results[0].result === "number" ? results[0].result : 0;
              console.log(`✅ Oikotieltä haettu ${result} asuntoa kaupungille ${cityName}.`);
  
              chrome.tabs.remove(tab.id); // 🔥 jätetty kommentoiduksi kehityksen ajan
              return resolve(result);
            });
          }
        });
      });
    });
  }
  