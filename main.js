// main.js

const DEBUG = 0;

// Tarkistetaan onko kyseessä taustaskripti vai UI
if (typeof document === 'undefined') {
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: "index.html" });
  });
} else {
  // UI:n alustus


////////////////////////// DEBUG ALKAA
  if (DEBUG) {
    const debugBox = document.createElement("div");
    debugBox.style.border = "2px dashed #ccc";
    debugBox.style.padding = "10px";
    debugBox.style.marginBottom = "20px";
    debugBox.style.background = "#f9f9f9";

    debugBox.innerHTML = `
      <h3>🔧 Debug</h3>
      <label>cityId: <input id="debug-cityId" type="number" value="1" /></label><br/>
      <label>cityName: <input id="debug-cityName" type="text" value="Helsinki" /></label><br/>
      <label>Firma:
        <select id="debug-firma">
          <option value="Vuokraturva">Vuokraturva</option>
          <option value="Kiinteistomaailma">Kiinteistomaailma</option>
        </select>
      </label><br/>
      <button id="debug-submit">Suorita</button><br/>
      <div id="debug-tulos" style="margin-top:8px;font-weight:bold;"></div>
    `;

    document.body.insertBefore(debugBox, document.body.firstChild);

    document.getElementById("debug-submit").addEventListener("click", async () => {
      const cityId = parseInt(document.getElementById("debug-cityId").value);
      const cityName = document.getElementById("debug-cityName").value;
      const firma = document.getElementById("debug-firma").value;

      const functionName = `hae${firma.replace(/\s/g, "")}`;
      const modulePath = `./firmat/${functionName}.js`;

      try {
        const mod = await import(modulePath);
        const result = await mod[functionName](cityId, cityName);
        document.getElementById("debug-tulos").textContent = `Palautettu arvo: ${result}`;
      } catch (err) {
        document.getElementById("debug-tulos").textContent = `Virhe: ${err.message}`;
      }
    });
  }
////////////////////////// DEBUG PÄÄTTYY


  const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcfub_Sd4ByB_JMQS_Jcc2c8BZ6rfDX6lHcmovVDH3Kw1d18EX_60dKow-uQnNzgimBDfhqju_dYsc/pub?gid=1413979988&single=true&output=csv";

  let companies = [];
  let cities = [];
  let cityIdMap = {};

  const table = document.getElementById("marketShareTable");

  async function lataaDataTaulukosta() {
    const res = await fetch(SHEET_URL);
    const text = await res.text();
    const rows = text.trim().split("\n").slice(1); // ohita otsikkorivi

    const uniqueCompanies = new Set();
    const uniqueCities = new Set();
    const map = {};

    for (const row of rows) {
      const [cityIdStr, city, company] = row.split(",");
      const cityId = parseInt(cityIdStr);
      if (!map[company]) map[company] = {};
      map[company][city] = isNaN(cityId) ? null : cityId;

      uniqueCompanies.add(company);
      uniqueCities.add(city);
    }

    companies = [...uniqueCompanies];
    cities = [...uniqueCities];
    cityIdMap = map;
  }

  function addCompanyWithCities(company) {
    const companyRow = document.createElement("tr");
    companyRow.className = "company-row";
    const companyCell = document.createElement("td");
    companyCell.textContent = company;
    companyCell.colSpan = 2;
    companyRow.appendChild(companyCell);
    table.appendChild(companyRow);

    cities.forEach(function(city) {
      const cityRow = document.createElement("tr");
      cityRow.className = "city-row";
      const cityNameCell = document.createElement("td");
      cityNameCell.textContent = city;
      cityNameCell.className = "city-name";
      const shareCell = document.createElement("td");
      shareCell.textContent = "-";
      cityRow.appendChild(cityNameCell);
      cityRow.appendChild(shareCell);
      table.appendChild(cityRow);
    });

    companyRow.addEventListener("click", function () {
      let nextRow = companyRow.nextElementSibling;
      while (nextRow && nextRow.classList.contains("city-row")) {
        nextRow.style.display = nextRow.style.display === "none" ? "" : "none";
        nextRow = nextRow.nextElementSibling;
      }
    });
  }

  async function haeUusimmatTiedot() {
    const companyRows = Array.from(document.querySelectorAll("tr.company-row"));

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
const functionName = `hae${company.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s/g, "")}`;
      const modulePath = `./firmat/${functionName}.js`;

      let haeFunktio = null;
      try {
        const mod = await import(modulePath);
        haeFunktio = mod[functionName];
      } catch (e) {
        console.warn(`Moduulia ei löytynyt: ${functionName}`);
        continue;
      }

      let cityRow = companyRows[i].nextElementSibling;
      for (const cityName of cities) {
        console.log("main.js: Seuraavaksi " + company + " " +cityName +"...");
        if (cityRow && cityRow.classList.contains("city-row")) {
          const cityId = cityIdMap[company]?.[cityName];

          if (!cityId) {
            cityRow.cells[1].textContent = 0;
          } else {
            const value = await haeFunktio(cityId, cityName);
            console.log("main.js: taulukkoon:  " + value);
            cityRow.cells[1].textContent = value;
          }

          cityRow = cityRow.nextElementSibling;
        }
      }
    }
  }

  document.getElementById("toggleAllButton").addEventListener("click", function () {
    const companyRows = document.querySelectorAll("tr.company-row");
    allExpanded = !allExpanded;
    companyRows.forEach(companyRow => {
      let nextRow = companyRow.nextElementSibling;
      while (nextRow && nextRow.classList.contains("city-row")) {
        nextRow.style.display = allExpanded ? "" : "none";
        nextRow = nextRow.nextElementSibling;
      }
    });
  });

  document.getElementById("fetchDataButton").addEventListener("click", haeUusimmatTiedot);

  document.getElementById("copyButton").addEventListener("click", function () {
    const rows = Array.from(table.rows);
    let html = '<table>';
    rows.slice(1)
      .filter(row => row.style.display !== "none")
      .forEach(row => {
        html += '<tr>';
        Array.from(row.cells).forEach(cell => {
          let cellContent = cell.textContent.trim();
          if (row.classList.contains("company-row")) {
            cellContent = '<strong>' + cellContent + '</strong>';
          }
          html += '<td>' + cellContent + '</td>';
        });
        html += '</tr>';
      });
    html += '</table>';

    const blob = new Blob([html], { type: 'text/html' });
    const clipboardItem = new ClipboardItem({ 'text/html': blob });
    navigator.clipboard.write([clipboardItem]).catch(err => {
      console.error("Error copying to clipboard: ", err);
    });
  });

  document.getElementById("exportButton").addEventListener("click", function () {
    alert("Siirretään GoogleSheetsiin... (dummy)");
  });

  let allExpanded = true;

  // Ladataan data ja alustetaan taulukko sivun käynnistyessä
  (async () => {
    await lataaDataTaulukosta();
    companies.forEach(company => addCompanyWithCities(company));
    await haeUusimmatTiedot();
  })();
}
