import { DEBUG } from "./config.js";

export function randomizeTableValues() {
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
  
  export function initRandomizeButton() {
    if (typeof document === 'undefined') return; // Estä service workerissa
  
    if (DEBUG) {
      document.addEventListener("DOMContentLoaded", () => {
        const randomBtn = document.createElement("button");
        randomBtn.id = "debugRandomizeButton";
        randomBtn.textContent = "🔀";
        randomBtn.className = "action-button button";
  
        const fetchBtn = document.getElementById("fetchDataButton");
        if (!fetchBtn) {
          console.error("fetchDataButton not found!");
          return;
        }
        fetchBtn.parentNode.insertBefore(randomBtn, fetchBtn);
  
        randomBtn.addEventListener("click", randomizeTableValues);
      });
    }
  }
  