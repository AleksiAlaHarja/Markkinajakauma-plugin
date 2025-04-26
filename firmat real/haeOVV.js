export async function haeOVV(cityId, cityName) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url: "https://www.ovv.com/vuokrattavat-kohteet/", active: true }, (tab) => {
      const tabId = tab.id;

      chrome.scripting.executeScript({
        target: { tabId },
        func: async (cityName) => {
          function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
          }

          function log(msg, data) {
            console.log("🔍 OVV DEBUG:", msg, data ?? "");
          }

          // Etsi oikea checkbox
          const labels = Array.from(document.querySelectorAll(".ovv-realty-search-label"));
          const label = labels.find(l => l.textContent.trim().startsWith(cityName));
          if (!label) {
            log("❌ Kaupunkia ei löytynyt:", cityName);
            return 0;
          }

          const checkbox = label.querySelector("input[type=checkbox]");
          checkbox.scrollIntoView({ behavior: "smooth", block: "center" });
          await delay(600 + Math.random() * 400);
          checkbox.click();

          // Odota DOMin päivittymistä
          await delay(3000);

          const wrapper = document.getElementById("ovv-plugin-realty-list-wrapper");
          if (!wrapper) {
            log("⚠️ Wrapperia ei löytynyt");
            return 0;
          }

          // Testataan useita valitsimia
          const selectors = [
            "li.ovv-realty-plugin-list-item",
            "div.ovv-realty-plugin-list-item",
            "li.styled-list-item",
            "div.styled-list-item"
          ];

          const counts = selectors.map(sel => {
            const found = wrapper.querySelectorAll(sel);
            log(`🧪 ${sel}`, found.length);
            return found.length;
          });

          const maxCount = Math.max(...counts);
          log("📊 Suurin löytynyt määrä:", maxCount);
          return maxCount;
        },
        args: [cityName],
      }, (results) => {
        const count = results?.[0]?.result || 0;
        chrome.tabs.remove(tab.id);
        resolve(count);
      });
    });
  });
}
