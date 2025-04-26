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

          const log = (msg, data) => console.log("🔍 OVV DEBUG:", msg, data ?? "");

          // 1. Etsi label
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

          // 2. Odota että kohteet ehtivät ilmestyä
          await delay(3000);

          const wrapper = document.getElementById("ovv-plugin-realty-list-wrapper");
          if (!wrapper) {
            log("⚠️ Wrapperia ei löytynyt");
            return 0;
          }

          // 3. Testataan eri valitsimia
          const selectors = [
            "li.ovv-realty-plugin-list-item",
            "div.ovv-realty-plugin-list-item",
            "li.styled-list-item",
            "div.styled-list-item"
          ];

          let max = 0;
          let bestSelector = "";
          for (const sel of selectors) {
            const found = wrapper.querySelectorAll(sel).length;
            log(`🧪 ${sel}`, found);
            if (found > max) {
              max = found;
              bestSelector = sel;
            }
          }

          log("✅ Käytetty valitsin:", bestSelector);
          log("📊 Palautettava määrä:", max);
          return max;
        },
        args: [cityName],
      }, (results) => {
        const count = results?.[0]?.result || 0;
        //chrome.tabs.remove(tab.id);
        resolve(count);
      });
    });
  });
}
