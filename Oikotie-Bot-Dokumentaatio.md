# Oikotie-sivuston Bot Navigointi - Tekninen Dokumentaatio

## Sisällysluettelo
1. [Yleiset Tiedot](#yleiset-tiedot)
2. [Chrome Extension Arkkitehtuuri](#chrome-extension-arkkitehtuuri)
3. [Oikotie-spesifiset Tekniikat](#oikotie-spesifiset-tekniikat)
4. [URL Muodostaminen ja Parametrit](#url-muodostaminen-ja-parametrit)
5. [DOM Elementtien Tunnistaminen](#dom-elementtien-tunnistaminen)
6. [Odotteluperiaatteet](#odotteluperiaatteet)
7. [Tiedon Kerääminen ja Käsittely](#tiedon-kerääminen-ja-käsittely)
8. [Virheenkäsittely ja Varmuuskopiointi](#virheenkäsittely-ja-varmuuskopiointi)
9. [Eri Skrapeaustekniikat](#eri-skrapeaustekniikat)
10. [Muut Sivustot ja Vertailu](#muut-sivustot-ja-vertailu)
11. [Koodiesimerkit](#koodiesimerkit)

---

## Yleiset Tiedot

Tämä dokumentaatio kuvaa Markkinajakauma-plugin Chrome-laajennuksen käyttämät tekniikat Oikotie.fi-sivuston automaattiseen navigointiin ja tiedon keräämiseen.

### Projektin Rakenne
```
Markkinajakauma-plugin/
├── manifest.json          # Chrome extension konfiguraatio
├── main.js                # Päälogiikka ja UI
├── contentScript.js       # DOM-manipulaatio injektoitu sivuille
├── firmat/               # Yrityskohtaiset skriptit
│   ├── haeOikotie*.js    # Oikotie-spesifiset funktiot
│   ├── haeVuokraovi*.js  # Vuokraovi-spesifiset funktiot
│   └── ...
└── index.html            # Käyttöliittymä
```

---

## Chrome Extension Arkkitehtuuri

### Manifest V3 Konfiguraatio
```json
{
  "manifest_version": 3,
  "name": "Markkinajakauma",
  "background": {
    "service_worker": "main.js",
    "type": "module"
  },
  "permissions": [
    "tabs",
    "scripting",
    "https://asunnot.oikotie.fi/"
  ],
  "host_permissions": [
    "https://oikotie.fi/*",
    "https://asunnot.oikotie.fi/*"
  ]
}
```

### Keskeiset API:t
- **chrome.tabs**: Välilehtien hallinta
- **chrome.scripting**: Skriptien injektointi sivuille
- **chrome.runtime**: Viestintä background scriptin ja content scriptin välillä

---

## Oikotie-spesifiset Tekniikat

### 1. Taustavälilehden Luominen
```javascript
const tab = await chrome.tabs.create({ 
  url: constructedOikotieUrl, 
  active: false  // Ei näy käyttäjälle
});
```

### 2. Skriptin Injektointi
```javascript
const [injectionResult] = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: analysisFunction,
  args: [cityName]
});
```

### 3. Välilehden Sulkeminen
```javascript
await chrome.tabs.remove(tab.id);
```

---

## URL Muodostaminen ja Parametrit

### Oikotie URL Rakenne
Perus Oikotie-haku rakentuu seuraavasti:

```javascript
const url = `https://asunnot.oikotie.fi/vuokra-asunnot?pagination=1`
  + `&locations=[[64,6,"${encodeURIComponent(cityName)}"]]`
  + `&cardType=101`
  + `&vendorType[]=private`;  // Vain yksityisille
```

### URL Parametrien Selitykset
- **pagination=1**: Hakutuloksien sivutus (aina 1)
- **locations**: Kaupunkisuodatin
  - `64`: Kiinteä location type ID
  - `6`: Kiinteä sub-type ID  
  - `cityName`: Kaupungin nimi (URL-encoded)
- **cardType=101**: Vuokra-asunnot (kiinteä arvo)
- **vendorType[]=private**: Yksityisten ilmoittajien suodatin

### Eri Hakutyypit
1. **Kaikki vuokra-asunnot**: Ilman `vendorType` parametria
2. **Vain yksityiset**: `&vendorType[]=private`
3. **Kaupalliset**: `&vendorType[]=commercial`

---

## DOM Elementtien Tunnistaminen

### Pääelementti: Search Count
Oikotie käyttää custom elementtiä hakutulosten määrän näyttämiseen:

```javascript
const element = document.querySelector(
  'search-count[search-params="$ctrl.searchParams"]'
);
```

### Elementin Ominaisuudet
- **Tag**: `search-count`
- **Attribuutti**: `search-params="$ctrl.searchParams"`
- **Sisältö**: Numeerinen arvo (esim. "1 234" tai "5")
- **Sijainti**: Hakutulosten yläpuolella

### Vaihtoehtoisia Selektoreita
Jos pääelementti ei löydy, voidaan kokeilla:
```javascript
// Varaskriptit voivat kokeilla myös näitä
document.querySelector('.search-result-count')
document.querySelector('[data-search-count]')
document.querySelector('.results-summary')
```

---

## Odotteluperiaatteet

### Polling-strategia
Oikotie lataa sisältöä asynkronisesti, joten elementtien odottaminen on kriittistä:

```javascript
const checkCount = () => {
  const el = document.querySelector(
    'search-count[search-params="$ctrl.searchParams"]'
  );
  
  if (el) {
    const digits = el.textContent.trim().replace(/\D+/g, '');
    if (digits.length > 0) {
      const value = parseInt(digits, 10);
      resolve(value);
      return;
    }
  }
  
  // Yritä uudelleen 100ms kuluttua
  setTimeout(checkCount, 100);
};
```

### Odotusaika ja Parametrit
- **Polling-väli**: 100ms
- **Maksimi odotusaika**: Ei rajattu (luottaa browser timeoutiin)
- **Ehto**: Elementti löytyy JA sisältää numeraalisia merkkejä

### Promise-pohjainen Toteutus
```javascript
return new Promise((resolve) => {
  const checkCount = () => {
    // ... polling logic ...
  };
  checkCount(); // Aloita heti
});
```

---

## Tiedon Kerääminen ja Käsittely

### Tekstin Puhdistaminen
Oikotie voi näyttää numeroita eri formaateissa:

```javascript
// Poista kaikki ei-numeraaliset merkit
const digits = element.textContent.trim().replace(/\D+/g, '');

// Esimerkkejä:
// "1 234 kpl" → "1234"
// "5" → "5"  
// "Ei tuloksia" → ""
// "123 kohti" → "123"
```

### Numeron Validointi
```javascript
if (digits.length > 0) {
  const value = parseInt(digits, 10);
  if (!isNaN(value) && value >= 0) {
    return value;
  }
}
```

### Erikoistapaukset
- **Ei tuloksia**: Palautetaan 0
- **Latausvirhe**: Palautetaan null tai reject Promise
- **Timeout**: Browser keskeyttää automaattisesti

---

## Virheenkäsittely ja Varmuuskopiointi

### Try-Catch Rakenne
```javascript
export async function haeOikotieData(cityId, cityName) {
  try {
    const tab = await chrome.tabs.create({ url, active: false });
    const result = await executeAnalysisScript(tab.id);
    await chrome.tabs.remove(tab.id);
    return result;
  } catch (error) {
    console.error(`❌ Virhe Oikotie-dataa haettaessa: ${cityName}`, error);
    return "⚠️"; // Virhemerki
  }
}
```

### Välimuistitus ja Nonce-käsittely
Jotkut sivustot (kuten OVV) vaativat erityiskäsittelyä:

```javascript
let cachedNonce = null;
let cachedTimestamp = 0;

// Tarkista onko nonce vielä voimassa (60s)
if (cachedNonce && (Date.now() - cachedTimestamp) < 60000) {
}
```

---

## Eri Skrapeaustekniikat

Projekti käyttää useita erilaisia tekniikoita tiedon keräämiseen riippuen sivuston arkkitehtuurista:

### 1. Chrome Extension + DOM Polling (Oikotie, Vuokraovi)
**Käyttötarkoitus**: Sivustot jotka lataavat sisältöä JavaScript:llä  
**Tekniikka**: Background tab + script injection + element polling

```javascript
// Avaa taustavälilehti
const tab = await chrome.tabs.create({ url, active: false });

// Injektoi polling-skripti
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => {
    return new Promise(resolve => {
      const poll = () => {
        const element = document.querySelector('#target');
        if (element) resolve(element.textContent);
        else setTimeout(poll, 100);
      };
      poll();
    });
  }
});
```

### 2. DOM Manipulation + MutationObserver (Vuokramestarit)
**Käyttötarkoitus**: Sivustot joissa tarvitaan navigointia (sivutus)  
**Tekniikka**: Klikkaa elementtejä + odota DOM-muutoksia

```javascript
function analyzePage() {
  // Klikkaa viimeistä sivua
  const lastBtn = document.querySelector('li.last-page-btn');
  if (lastBtn) lastBtn.click();

  // Odota DOM:n muuttumista
  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        observer.disconnect();
        // Laske elementit muutosten jälkeen
        resolve(document.querySelectorAll('.property').length);
      }, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
```

### 3. Suora REST API -kutsu (Kiinteistömaailma)
**Käyttötarkoitus**: Sivustot joissa on julkinen API  
**Tekniikka**: fetch() suoraan JSON-endpointiin

```javascript
export async function haeKiinteistomaailma(cityId, cityName) {
  const query = JSON.stringify({ municipality: cityName });
  const url = `https://www.kiinteistomaailma.fi/api/km/KM/?rental=true&query[]=${encodeURIComponent(query)}`;
  
  const response = await fetch(url);
  const json = await response.json();
  return json?.data?.matches ?? -1;
}
```

### 4. HTML Scraping + DOMParser (Asuntopehtoori)
**Käyttötarkoitus**: Sivustot jotka palauttavat HTML:ää AJAX:lla  
**Tekniikka**: fetch() + DOMParser + data-attribute lukeminen

```javascript
export async function haeAsuntopehtoori(cityId, cityName) {
  const url = `https://www.asuntopehtoori.fi/?sfid=13401&sf_action=get_data&...`;
  
  const response = await fetch(url);
  const json = await response.json();
  const html = json.form.replace(/\\"/g, '"'); // Unescape JSON
  
  // Parse HTML stringistä DOM:iksi
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  // Etsi kaupunkikohtainen option data-attributella
  const option = [...doc.querySelectorAll("option")]
    .find(o => normalize(o.value) === normalize(cityName));
  
  return parseInt(option.getAttribute("data-sf-count"), 10);
}
```

### 5. AJAX API + Nonce Authentication (OVV)
**Käyttötarkoitus**: Sivustot joissa on CSRF-suojaus  
**Tekniikka**: Content script + message passing + form data

```javascript
// 1. Hae nonce content scriptillä
const tab = await chrome.tabs.create({ url: "https://www.ovv.com/vuokrattavat-kohteet/" });
const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_OVV_NONCE" });

// 2. Käytä noncea API-kutsussa
const formData = new URLSearchParams();
formData.append("ovv_plugin_nonce", response.nonce);
formData.append("office[]", cityId);
formData.append("action", "ovv_plugin_get_realties");

const apiResponse = await fetch("https://www.ovv.com/wp-admin/admin-ajax.php", {
  method: "POST",
  body: formData
});
```

### Tekniikkojen Vertailu

| Tekniikka | Nopeus | Luotettavuus | Monimutkaisuus | Käyttötarkoitus |
|-----------|--------|--------------|----------------|-----------------|
| REST API | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | Julkiset API:t |
| HTML Fetch | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | AJAX endpoints |
| DOM Polling | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | SPA sovellukset |
| DOM Navigation | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | Navigointi vaativat |
| Nonce Auth | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | CSRF-suojatut |

---

## Muut Sivustot ja Vertailu

### Vuokraovi.com
```javascript
// URL: https://www.vuokraovi.com/vuokra-asunnot/{city}?haku={cityId}
// Elementti: #searchResultCount
// Odotus: 100ms polling
// Tekniikka: Chrome tabs + scripting injection
```

### Vuokramestarit.net
```javascript
// URL: https://www.vuokramestarit.net/kohteet/vuokra-asunnot-{city}/
// Elementti: div.property_div.property.clearfix (lukumäärä)
// Erikoisuus: Sivutus + viimeisen sivun klikkaus
// Tekniikka: MutationObserver + DOM manipulation
```

### OVV.com
```javascript
// Erikoisuus: AJAX API + nonce-autentikointi
// URL: https://www.ovv.com/wp-admin/admin-ajax.php
// Metodi: POST FormData
// Tekniikka: Content script messaging + cached nonce
```

### Kiinteistömaailma.fi
```javascript
// URL: https://www.kiinteistomaailma.fi/api/km/KM/?rental=true&query[]=...
// Tekniikka: Suora REST API -kutsu fetch()-funktiolla
// Palautus: JSON response.data.matches
```

### Asuntopehtoori.fi
```javascript
// URL: https://www.asuntopehtoori.fi/?sfid=13401&sf_action=get_data...
// Tekniikka: HTML scraping + DOMParser + data-attribute
// Elementti: option[data-sf-count] kaupungin mukaan
```

---

## Koodiesimerkit

### Täydellinen Oikotie-haku Funktio
```javascript
export async function haeYksityisetOikotie(cityId, cityName) {
  console.log(`  ➡️ [haeYksityisetOikotie] ${cityName}...`);

  // 1) URL muodostaminen
  const url = `https://asunnot.oikotie.fi/vuokra-asunnot?pagination=1`
    + `&locations=[[64,6,"${encodeURIComponent(cityName)}"]]`
    + `&cardType=101&vendorType[]=private`;

  // 2) Taustavälilehden avaaminen
  const tab = await chrome.tabs.create({ url, active: false });

  // 3) Analyysi-skriptin injektointi
  const [injectionResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (cityName) => {
      return new Promise((resolve) => {
        const checkCount = () => {
          const el = document.querySelector(
            'search-count[search-params="$ctrl.searchParams"]'
          );
          if (el) {
            const digits = el.textContent.trim().replace(/\D+/g, '');
            if (digits.length > 0) {
              const value = parseInt(digits, 10);
              resolve(value);
              return;
            }
          }
          setTimeout(checkCount, 100);
        };
        checkCount();
      });
    },
    args: [cityName]
  });

  // 4) Välilehden sulkeminen
  await chrome.tabs.remove(tab.id);

  // 5) Tuloksen palautus
  console.log(`  ⬅️ [haeYksityisetOikotie] ${cityName}: ${injectionResult.result}`);
  return injectionResult.result;
}
```

### Sivutuksen Käsittely (Vuokramestarit-esimerkki)
```javascript
function analyzePage() {
  // Sivumäärän laskeminen
  const pagesContainer = document.querySelector('li.pages > ul');
  const pages = pagesContainer ? pagesContainer.querySelectorAll('li').length : 0;

  // Kohteiden laskeminen per sivu
  const getPropertiesCount = () => 
    document.querySelectorAll('div.property_div.property.clearfix').length;

  if (pages < 2) {
    return getPropertiesCount();
  }

  // Viimeisen sivun klikkaus
  const lastBtn = pagesContainer.querySelector('li.last-page-btn');
  if (lastBtn) lastBtn.click();

  // DOM-muutosten odotus
  return new Promise((resolve) => {
    let timeout;
    const observer = new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        observer.disconnect();
        const propertiesInLast = getPropertiesCount();
        resolve((pages - 1) * 10 + propertiesInLast);
      }, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
```

### Content Script ja Messaging
```javascript
// contentScript.js - Injektoidaan sivulle
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_OVV_NONCE") {
    try {
      const input = document.querySelector('input[name="ovv_plugin_nonce"]');
      const nonce = input?.value || null;
      sendResponse({ nonce });
    } catch (error) {
      sendResponse({ nonce: null });
    }
  }
  return true; // Asynkroninen vastaus
});
```

### String Normalization ja Kaupunkinimien Käsittely
```javascript
// Ääkkösten ja erikoismerkkien normalisointi URL:eja varten
function normalizeString(str) {
  return str
    .toLowerCase()
    .normalize('NFD')            // jaa ääkköset ja perusmerkit
    .replace(/\p{Diacritic}/gu, '') // poista diakriitikset (ä→a, ö→o)
    .replace(/\s+/g, '')           // poista välilyönnit
    .replace(/[^a-z0-9-]/g, '');    // salli vain a-z, 0-9 ja -
}

// Esimerkki: "Hämeenlinna" → "hameenlinna"
const urlSafeCity = normalizeString(cityName);
```

### JSON Response Parsing (Kiinteistömaailma-tyylinen)
```javascript
export async function fetchDataFromAPI(cityName) {
  const query = JSON.stringify({ municipality: cityName });
  const url = `https://api.example.com/search?query=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const json = await response.json();
    
    // Turvallinen property access chaining
    return json?.data?.matches ?? -1;
  } catch (error) {
    console.error("API error:", error);
    return -1; // Virhekoodi
  }
}
```

---

## Tärkeät Huomiot Toteutukseen

### 1. Chrome Extension Käytännöt
- Käytä Manifest V3:a (uusimmat standardit)
- Background script on Service Worker
- Content Scripts injektoidaan vain tarvittaessa
- Permissions minimoitu tarvittaviin

### 2. Asynchronous Operations
- Kaikki tab-operaatiot ovat asynkronisia
- Promise-based pattern suositeltu
- Timeout-hallinta välttämätön

### 3. Error Handling
- Tab-luonti voi epäonnistua
- Script injection voi epäonnistua  
- DOM-elementit voivat puuttua
- Network-virheet mahdollisia

### 4. Performance
- Taustavälilehdet eivät kuluta visuaalisia resursseja
- Polling 100ms riittävän nopea mutta ei kuormita
- Välilehdet suljetaan aina lopuksi

### 5. Sivusto-spesifiset Erityispiirteet
- Oikotie: AngularJS custom elementit
- Vuokraovi: Traditional DOM + ID selectors
- Vuokramestarit: Pagination navigation
- OVV: AJAX API + CSRF nonce

---

## Yhteenveto

Tämä dokumentaatio sisältää kaikki keskeiset tekniikat Oikotie-sivuston automaattiseen navigointiin Chrome-laajennuksella. Tekniikat ovat siirrettävissä muihin projekteihin huomioiden seuraavat asiat:

1. **Chrome Extension API:t** vaativat sopivat permissions
2. **DOM-selektorit** ovat sivustokohtaisia
3. **URL-parametrit** voivat muuttua sivuston päivitysten myötä
4. **Odotteluperiaatteet** riippuvat sivuston latausnopeudesta
5. **Virheenkäsittely** on kriittistä luotettavuuden kannalta

Koodi on modulaarinen ja helposti laajennettavissa uusille sivustoille noudattamalla samoja periaatteita.