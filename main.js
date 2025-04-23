// main.js

const DEBUG = 1;
const WEBAPP_POST_URL = "https://script.google.com/macros/s/AKfycbyLTRaESQhgqic0znZE-DqgbaMQ2y8ImQEdcOZdA6-0dwiQ-8xe-dFVvC4cnKzkINYoAQ/exec";
const WEBAPP_GET_URL = "https://script.google.com/macros/s/AKfycbyLTRaESQhgqic0znZE-DqgbaMQ2y8ImQEdcOZdA6-0dwiQ-8xe-dFVvC4cnKzkINYoAQ/exec";

// Tarkistetaan onko kyseessä taustaskripti vai UI
if (typeof document === 'undefined') {
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: "index.html" });
  });
} else {
  // UI:n alustus


////////////////////////// DEBUG ALKAA
function randomizeTableValues() {
  const rows = document.querySelectorAll("#marketShareTable tr.city-row");

  rows.forEach(row => {
    const cell = row.cells[1];
    const val = parseFloat(cell.textContent);
    if (!isNaN(val)) {
      const changePercent = (Math.random() * 0.2 - 0.1); // -10% ... +10%
      const newVal = Math.round(val * (1 + changePercent));
      cell.textContent = newVal;
    }
  });

  // Päivitä yhtiörivien summat
  const companyRows = document.querySelectorAll("#marketShareTable tr.company-row");
  companyRows.forEach(row => {
    let next = row.nextElementSibling;
    let total = 0;
    while (next && next.classList.contains("city-row")) {
      total += parseInt(next.cells[1].textContent) || 0;
      next = next.nextElementSibling;
    }
    row.cells[1].textContent = total;
  });
}

// PAINIKE
if (DEBUG) {
  document.addEventListener("DOMContentLoaded", () => {
    // Luo nappi
    const randomBtn = document.createElement("button");
    randomBtn.id = "debugRandomizeButton";
    randomBtn.textContent = "🔀";
    randomBtn.className = "button";

    // Etsi toggleAllButton ja lisää vasemmalle
    const fetchBtn = document.getElementById("fetchDataButton");
    fetchBtn.parentNode.insertBefore(randomBtn, fetchBtn);

    // Lisää toiminnallisuus
    randomBtn.addEventListener("click", randomizeTableValues);
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
    cities = [...uniqueCities].slice(1);
    cityIdMap = map;
  }

  function addCompanyWithCities(company) {
    const companyRow = document.createElement("tr");
    companyRow.className = "company-row";
    
    const companyCell = document.createElement("td");
    companyCell.textContent = company;

    const sumCell = document.createElement("td");
    sumCell.textContent = "-";
    
    companyRow.appendChild(companyCell);
    companyRow.appendChild(sumCell);
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
      let totalForCompany = 0;
      console.log(`Processing company: ${company}, row index: ${i}`);
      for (const cityName of cities) {
        console.log("main.js: Seuraavaksi " + company + " " +cityName +"...");
        if (cityRow && cityRow.classList.contains("city-row")) {
          const cityId = cityIdMap[company]?.[cityName];

          if (!cityId) {
            cityRow.cells[1].textContent = 0;
          } else {
            // Näytä käyttäjälle että haku on käynnissä
            cityRow.cells[1].textContent += " ⬅️";

            const value = await haeFunktio(cityId, cityName);
            console.log("main.js: taulukkoon:  " + value);

            // Päivitä lopullinen arvo ja poista merkki
            cityRow.cells[1].textContent = value;

            totalForCompany += parseInt(value) || 0;
            console.log(`Updated total for ${company}: ${totalForCompany}`);
          }

          cityRow = cityRow.nextElementSibling;
        }
      }
      console.log(`Final total for ${company}: ${totalForCompany}`);
      if (companyRows[i] && companyRows[i].cells && companyRows[i].cells[1]) {
        companyRows[i].cells[1].textContent = totalForCompany;
        console.log(`Updated header row for ${company}`);
      } else {
        console.error(`Could not find cells for company row ${i}`);
      }
    }
  }

  function collectTableData() {
    console.log("Starting to collect table data...");
    const data = {};
    const rows = Array.from(document.querySelectorAll("#marketShareTable tr"));
    console.log(`Found ${rows.length} rows in total`);
  
    let currentCompany = null;
  
    rows.forEach((row, index) => {
      console.log(`Processing row ${index}:`, row);
      
      if (row.classList.contains("company-row")) {
        // Uusi yhtiö alkaa
        currentCompany = row.cells[0].textContent;
        const totalText = row.cells[1].textContent || "";
        console.log(`Found company row: ${currentCompany}, total text: "${totalText}"`);
        
        const match = totalText.match(/(\d+)/);
        const totalValue = match ? parseInt(match[1]) : 0;
        console.log(`Extracted total value: ${totalValue}`);
  
        data[currentCompany] = {};
        data[currentCompany]["Total"] = totalValue;
        console.log(`Added company ${currentCompany} to data with total ${totalValue}`);
      } else if (row.classList.contains("city-row")) {
        const city = row.cells[0].textContent;
        const value = parseInt(row.cells[1].textContent) || 0;
        console.log(`Found city row: ${city} = ${value} for company ${currentCompany}`);
        
        if (!currentCompany) {
          console.warn("Found city row without current company!");
          return;
        }
        
        data[currentCompany][city] = value;
        console.log(`Added city ${city} with value ${value} to company ${currentCompany}`);
      } else {
        console.log(`Skipping row ${index} - not a company or city row`);
      }
    });
  
    console.log("Final collected data:", data);
    return data;
  }

  async function checkIfDateColumnExists(dateStr) {
    try {
      const response = await fetch(WEBAPP_GET_URL);
      const headers = await response.json();
  
      return headers.some(header => {
        // Yritetään käsitellä sekä string, number että mahdollinen date
        const asDate = new Date(header);
        const formatted = asDate instanceof Date && !isNaN(asDate)
          ? `${asDate.getDate()}.${asDate.getMonth() + 1}.${asDate.getFullYear()}`
          : String(header).trim();
  
        return formatted === dateStr;
      });
  
    } catch (e) {
      console.error("Virhe tarkistaessa päivämääräsaraketta:", e);
      return false;
    }
  }
  
  
  function showDatePrompt(dateStr) {
    return new Promise(resolve => {
      const prompt = document.getElementById("datePrompt");
      const text = document.getElementById("datePromptText");
      text.textContent = `Sarake ${dateStr} on jo olemassa. Mitä haluat tehdä?`;
  
      prompt.style.display = "block";
  
      document.getElementById("btnReplace").onclick = () => {
        prompt.style.display = "none";
        resolve("replace");
      };
  
      document.getElementById("btnKeepBoth").onclick = () => {
        prompt.style.display = "none";
        resolve("new");
      };
  
      document.getElementById("btnCancel").onclick = () => {
        prompt.style.display = "none";
        resolve("cancel");
      };
    });
  }
  
  const fetchBtn = document.getElementById("fetchDataButton");
  fetchBtn.addEventListener("click", async () => {
    // Lisää spinner
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    spinner.id = "loadingSpinner";
    fetchBtn.appendChild(spinner);

    await haeUusimmatTiedot();

    // Poista spinner
    const s = document.getElementById("loadingSpinner");
    if (s) fetchBtn.removeChild(s);
  });

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

  document.getElementById("exportButton").addEventListener("click", async function () {
    const data = collectTableData();

    const today = new Date();
    const dateStr = `${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear()}`;
    const exists = await checkIfDateColumnExists(dateStr);

    let mode = "new";

    if (exists) {
      const userChoice = await showDatePrompt(dateStr);
      if (userChoice === "cancel") return;
      mode = userChoice; // "replace" tai "new"
    }

    try {
      const res = await fetch(WEBAPP_POST_URL, {
        method: "POST",
        body: JSON.stringify({ mode, data }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        alert("✅ Tiedot siirretty Google Sheetsiin!");
      } else {
        alert("❌ Siirrossa tapahtui virhe: " + res.status);
      }
    } catch (err) {
      console.error(err);
      alert("⚠️ Siirrossa tapahtui virhe: " + err.message);
    }
  });



  let allExpanded = true;

  // Ladataan data ja alustetaan taulukko sivun käynnistyessä
  (async () => {
    await lataaDataTaulukosta();
    companies.forEach(company => addCompanyWithCities(company));
    await haeUusimmatTiedot();
  })();
}
