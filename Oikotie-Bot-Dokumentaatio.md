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
9. [Koodiesimerkit](#koodiesimerkit)

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
│   └── haeOikotie*.js    # Oikotie-spesifiset funktiot
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

### Sivutuksen Käsittely
Oikotie ei vaadi sivutukseen klikkailua, koska haku näyttää kaikki tulokset yhdellä sivulla. Search-count elementti sisältää suoraan kokonaismäärän.

### Content Script ja Messaging
Jos Oikotie tulevaisuudessa vaatisi monimutkaista autentikointia, voitaisiin käyttää content script -lähestymistapaa:

```javascript
// contentScript.js - Injektoidaan sivulle tarvittaessa
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_OIKOTIE_DATA") {
    try {
      const element = document.querySelector(
        'search-count[search-params="$ctrl.searchParams"]'
      );
      const count = element ? parseInt(element.textContent.replace(/\D+/g, ''), 10) : 0;
      sendResponse({ count });
    } catch (error) {
      sendResponse({ count: null });
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

### JSON Response Parsing 
Oikotie ei käytä JSON API:a, vaan DOM-elementtien lukemista. Jos tulevaisuudessa Oikotie siirtyy API-pohjaiseen hakuun:

```javascript
export async function fetchOikotieAPI(cityName) {
  // Hypoteettinen API-endpoint
  const url = `https://api.oikotie.fi/search?city=${encodeURIComponent(cityName)}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const json = await response.json();
    
    // Turvallinen property access chaining
    return json?.results?.count ?? -1;
  } catch (error) {
    console.error("Oikotie API error:", error);
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

### 5. Oikotie-spesifiset Erityispiirteet
- **AngularJS custom elementit**: search-count komponentti
- **Dynaaminen sisällön lataus**: JavaScript-pohjainen hakutulossivutus
- **URL-parametrien monimutkaisuus**: locations-array ja vendorType-suodattimet

---

## Yhteenveto

Tämä dokumentaatio sisältää kaikki keskeiset tekniikat Oikotie-sivuston automaattiseen navigointiin Chrome-laajennuksella. Tekniikat on optimoitu erityisesti Oikotie.fi-sivuston arkkitehtuurille:

1. **Chrome Extension API:t** vaativat oikotie.fi permissions
2. **DOM-selektorit** ovat Oikotie-spesifisiä (search-count elementti)
3. **URL-parametrit** noudattavat Oikotien locations-array rakennetta
4. **Polling-strategia** 100ms on optimoitu Oikotien latausnopeudelle
5. **Virheenkäsittely** huomioi Oikotien erityispiirteet

Koodi on modulaarinen ja voidaan helposti laajentaa Oikotien uusille ominaisuuksille noudattamalla samoja periaatteita.