export async function haeYksityisetOikotie(cityId, cityName) {
  console.log(`🔎 Avataan Oikotie ja haetaan kaupungille: ${cityName}...`);

  return new Promise((resolve) => {
    chrome.tabs.create({ url: "https://asunnot.oikotie.fi/vuokra-asunnot", active: false }, (tab) => {
      if (!tab.id) {
        console.error("❗ Ei saatu luotua uutta välilehteä Oikotielle.");
        return resolve(0);
      }

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          Object.defineProperty(navigator, 'userAgent', {
            get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
          });
        }
      });

      const checkClearButtonInterval = setInterval(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => !!document.querySelector('button[analytics-click="search_click_clear"]')
        }, (results) => {
          if (chrome.runtime.lastError || !results || !results[0].result) return;

          clearInterval(checkClearButtonInterval);

          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.stop()
          }, () => {

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

                const typeTextSmart = async (element, text) => {
                  element.focus();
                  const almostFullText = text.slice(0, -1);
                  const lastChar = text.slice(-1);
                  element.value = almostFullText;
                  element.dispatchEvent(new Event('input', { bubbles: true }));
                  await new Promise(resolve => setTimeout(resolve, 50));
                  const keyup = new KeyboardEvent('keyup', { key: lastChar, bubbles: true, cancelable: true });
                  element.dispatchEvent(keyup);
                };

                console.log("cityName: ", cityName);

                const clearButton = await waitForElement('button[analytics-click="search_click_clear"]');
                if (clearButton) {
                  clearButton.click();
                }

                // 2. Avaa kaikki hakuehdot
                const allFiltersButton = Array.from(document.querySelectorAll('span.button__text'))
                  .find(el => el.textContent.includes("Kaikki hakuehdot"));
                if (allFiltersButton) {
                  allFiltersButton.click();
                  await sleep(500);
                }
  
                // 3. Valitse "Yksityinen" -checkbox heti tässä vaiheessa
                const privateCheckbox = await waitForElement('input[name="searchInputsearch-form2vendorTypeprivate"]');
                if (privateCheckbox && !privateCheckbox.checked) {
                  privateCheckbox.click();
                  await sleep(500);
                }

                const countElementBefore = await waitForElement('search-count');
                const oldCount = countElementBefore ? parseInt(countElementBefore.textContent.replace(/\D/g, ''), 10) : 0;

                const input = await waitForElement('input[id="autocomplete3-input"]');
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
                }

                const waitForUpdatedCount = async (oldCount, timeout = 15000) => {
                  const start = Date.now();
                  while (Date.now() - start < timeout) {
                    const buttons = Array.from(document.querySelectorAll('span.button__text'))
                      .filter(el => el.textContent.includes("Hae kohteet (") && el.querySelector('search-count'));

                    const counts = buttons.map(button => {
                      const searchCountElement = button.querySelector('search-count');
                      if (searchCountElement) {
                        const countText = searchCountElement.textContent;
                        const count = parseInt(countText.replace(/\D/g, ''), 10);
                        return isNaN(count) ? null : count;
                      }
                      return null;
                    }).filter(c => c !== null);

                    if (counts.length > 0) {
                      const newCount = Math.min(...counts);
                      if (newCount !== oldCount) {
                        return newCount;
                      }
                    }
                    await sleep(100);
                  }
                  return oldCount;
                };

                const updatedCount = await waitForUpdatedCount(oldCount);
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

              //await new Promise(resolve => setTimeout(resolve, 200)); // Odota 200 ms ennen tabin sulkemista
              chrome.tabs.remove(tab.id);
              return resolve(result);
              
            });

          });
        });
      }, 300);
    });
  });
}
