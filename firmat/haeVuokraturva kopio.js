// firmat/haeVuokraturva.js
export async function haeVuokraturva(cityId, cityName) {
  // Määritellään perus-URL, josta haku alkaa
  const baseUrl = "https://portaali.vuokraturva.fi/vuokralainen/asuntohaku?query=";
  
  // Rakennetaan yksinkertainen query-objekti, joka sisältää vain "locations"-kentän
  // ja käytetään ainoastaan muuttujaa cityId tässä objektissa.
  // page: 1 lisätään, jotta haku näyttää vain ensimmäisen sivun eikä lataa koko listausta.
  // Koko listauksen lkm on kuitenkin saatavilla jo ensimmäiseltä sivulta.
  const queryObj = {
    locations: [
      { city_id: cityId },
    ],
    page: 1
  };

  // Muunnetaan query-objekti JSON-merkkijonoksi ja koodataan se URL:lle sopivaksi.
  const encodedQuery = encodeURIComponent(JSON.stringify(queryObj));

  // Yhdistetään baseUrl ja koodattu query-string, jolloin muodostuu lopullinen URL.
  const url = baseUrl + encodedQuery;

  // Luodaan uusi Promise, joka hoitaa seuraavat vaiheet:
  // 1. Avataan uusi välilehti hakusivulla taustalla.
  // 2. Odotetaan, että välilehti latautuu kokonaan.
  // 3. Suoritetaan DOM-haulla sivun tekstin etsintä.
  // 4. Poimitaan haluttu numero (tai viiva "-" jos tietoa ei löydy).
  // 5. Suljetaan välilehti ja palautetaan haettu arvo.
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url: url, active: false }, (tab) => {
      const uusiTabId = tab.id;

      // Lisätään kuuntelija, joka tarkistaa kun uusi välilehti on latautunut.
      const listener = (tabId, changeInfo, tab) => {
        if (tabId === uusiTabId && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          // Suoritetaan skripti, joka hakee sivun tekstin ja etsii sieltä kaavan "(123 kohdetta)"
          chrome.scripting.executeScript({
            target: { tabId: uusiTabId },
            func: () => {
              const teksti = document.body.innerText;
              // Etsitään tekstistä numero, joka on sulkeissa ja jota seuraa sana "kohdetta"
              const match = teksti.match(/\((\d+)\s+kohdetta\)/);
              // Jos numeroa ei löydy, palautetaan viiva "-", muuten numero.
              const luku = match ? parseInt(match[1]) : "-";
              return luku;
            }
          }, (results) => {
            const resultValue = results[0].result;
            // Suljetaan välilehti, kun tieto on saatu.
            chrome.tabs.remove(uusiTabId, () => {
              // Palautetaan haettu arvo kutsuneelle funktiolle.
              resolve(resultValue);
            });
          });
        }
      };

      // Rekisteröidään kuuntelija välilehden tilan muutoksille.
      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}
