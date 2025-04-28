// firmat/contentOikotie.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.tyyppi === "haeOikotieYksityiset") {
      const cityName = message.cityName;
      console.log(`📨 Vastaanotettiin pyyntö hakea Oikotieltä kaupungille: ${cityName}`);
  
      try {
        // Etsi lukumäärä DOMista
        const asunnotElement = document.querySelector('[data-test-id="result-count"]');
  
        if (asunnotElement) {
          const rawText = asunnotElement.textContent || "";
          const numberMatch = rawText.replace(/\s/g, '').match(/\d+/); // Poistaa välilyönnit ja etsii numeron
  
          if (numberMatch && numberMatch[0]) {
            const count = parseInt(numberMatch[0], 10);
            console.log(`✅ Löydettiin ${count} asuntoa Oikotieltä kaupungille ${cityName}`);
            sendResponse({ lukumäärä: count });
          } else {
            console.warn(`⚠️ Ei löydetty numeroa Oikotien result-count-elementistä.`);
            sendResponse({ lukumäärä: 0 });
          }
        } else {
          console.warn(`⚠️ Oikotien result-count-elementtiä ei löydetty.`);
          sendResponse({ lukumäärä: 0 });
        }
      } catch (error) {
        console.error(`❌ Virhe asuntomäärän hakemisessa Oikotieltä:`, error);
        sendResponse({ lukumäärä: 0 });
      }
  
      return true; // 🔥 Vaaditaan että vastaus on asynkroninen
    }
  });
  