import * as debug from "./debug.js";
import * as config from "./config.js";


// Tarkistetaan onko kyseessä taustaskripti vai UI
if (typeof document === 'undefined') {
  console.log("Service worker is alive");

  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: "index.html" });
  });
} else {
  // UI:n alustus
  debug.initRandomizeButton();

  let companies = [];
  let cities = [];
  let cityIdMap = {};

  const table = document.getElementById("marketShareTable");

  async function lataaDataTaulukosta() {
    const res = await fetch(config.SHEET_CSV_URL);
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
            cityRow.cells[1].textContent = "";
          } else {
            // Näytä käyttäjälle että haku on käynnissä
            cityRow.cells[1].textContent += " ⬅️";

            const value = await haeFunktio(cityId, cityName);
            console.log("main.js: taulukkoon:  " + value);

            // Päivitä lopullinen arvo ja poista merkki
            cityRow.cells[1].textContent = value;

            totalForCompany += parseInt(value) || 0;
            console.log(`main.js: Updated total for ${company}: ${totalForCompany}`);
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
      const response = await fetch(config.WEBAPP_GET_URL);
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

    // Muutetaan 0-arvot tyhjiksi merkkijonoiksi
    for (const company in data) {
      for (const city in data[company]) {
        if (data[company][city] === 0) {
          data[company][city] = "";
        }
      }
    }

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
      const res = await fetch(config.WEBAPP_POST_URL, {
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

  document.getElementById("openSheetsButton").addEventListener("click", async function () {
    window.open(config.SHEET_VIEW_URL, "_blank");
  });

  document.getElementById("editSheetsButton").addEventListener("click", async function () {
    window.open(config.SHEET_EDIT_URL, "_blank");
  });

  // Päivitetään arvoja kun klikataan kaupungin nimeä
  document.addEventListener("click", async function (e) {
    if (e.target.classList.contains("city-name")) {
      const cityCell = e.target;
      const cityRow = cityCell.parentElement;
      const companyRow = findCompanyRowAbove(cityRow);
  
      if (!companyRow) return;
  
      const companyName = companyRow.cells[0].textContent.trim();
      const cityName = cityCell.textContent.trim();
      const cityId = cityIdMap[companyName]?.[cityName];
  
      if (!cityId) {
        console.warn(`City ID not found for ${companyName} - ${cityName}`);
        return;
      }
  
      // Lisää näkyviin että haku käynnistyy
      cityRow.cells[1].textContent += " ⬅️";
  
      const functionName = `hae${companyName.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s/g, "")}`;
      const modulePath = `./firmat/${functionName}.js`;
  
      try {
        const mod = await import(modulePath);
        const haeFunktio = mod[functionName];
        const value = await haeFunktio(cityId, cityName);
  
        // Päivitä arvo ja poista merkki
        cityRow.cells[1].textContent = value;
  
        // Päivitä samalla yhtiön kokonaissumma
        updateCompanyTotal(companyRow);
      } catch (err) {
        console.error(`Error loading module for ${companyName}:`, err);
      }
    }
  });
  
  function findCompanyRowAbove(cityRow) {
    let prev = cityRow.previousElementSibling;
    while (prev) {
      if (prev.classList.contains("company-row")) {
        return prev;
      }
      prev = prev.previousElementSibling;
    }
    return null;
  }
  
  function updateCompanyTotal(companyRow) {
    let nextRow = companyRow.nextElementSibling;
    let sum = 0;
    while (nextRow && nextRow.classList.contains("city-row")) {
      const value = parseInt(nextRow.cells[1].textContent) || 0;
      sum += value;
      nextRow = nextRow.nextElementSibling;
    }
    companyRow.cells[1].textContent = sum;
  }
  

  let allExpanded = true;

  // Ladataan data ja alustetaan taulukko sivun käynnistyessä
  (async () => {
    await lataaDataTaulukosta();
    companies.forEach(company => addCompanyWithCities(company));
    await haeUusimmatTiedot();
  })();
}
