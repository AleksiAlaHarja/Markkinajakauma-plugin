function muodostaClassifiedLocation(cityName) {
    const mappings = {
      "Helsinki": "FI_UUSIMAA_HELSINKI",
      "Hyvinkää": "FI_UUSIMAA_HYVINKAA",
      "Joensuu": "FI_PKARJALA_JOENSUU",
      "Jyväskylä": "FI_KSUOMI_JYVASKYLA",
      "Kouvola": "FI_KYMENLAAKSO_KOUVOLA",
      "Kuopio": "FI_PSAVO_KUOPIO",
      "Lahti": "FI_PHAME_LAHTI",
      "Lappeenranta": "FI_EKARJALA_LAPPEENRANTA",
      "Oulu": "FI_PPOHJANMAA_OULU",
      "Pori": "FI_SATAKUNTA_PORI",
      "Tampere": "FI_PIRKANMAA_TAMPERE",
      "Turku": "FI_VSUOMI_TURKU"
    };
  
    const code = mappings[cityName];
    if (!code) {
      console.error(`❗ Vuokraoven ClassifiedLocation-koodia ei löydy kaupungille: ${cityName}. Lisää se funktioon muodostaClassifiedLocation() tiedostossa haeTotalVuokraovi.js.`);
      return null;
    }
    return `i:0|c:${code}|t:MUNICIPALITY|n:${cityName}`;
  }
  
  export async function haeTotalVuokraovi(cityId, cityName) {
    //console.log(`Haetaan Vuokraovelta total kaupungille ${cityName}...`);
    
    
    try {
      const classifiedLocation = muodostaClassifiedLocation(cityName);
      if (!classifiedLocation) {
        console.warn(`Vuokraovi-haku peruttu: kaupungille ${cityName} ei löytynyt classifiedLocation-koodia.`);
        return 0;
      }
  
      const params = new URLSearchParams();
      params.append("method", "count");
      params.append("type", "full");
      params.append("location.classifiedLocation", classifiedLocation);
      params.append("location.hiddenLocation", "");
      params.append("location.country", "finland");
      params.append("building.showRightOfOccupancyApartments", "NOT_RIGHT_OF_OCCUPANCY_PROPERTIES");
      params.append("building.livingType", "1");
      params.append("extra.showOnlyPrivate", "false");
  
      const response = await fetch("https://www.vuokraovi.com/haku/vuokra-asunnot", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params
      });
  
      const html = await response.text();
      //console.log(`Vuokraovi palautti kaupungille ${cityName} HTML:`);
      //console.log(html);
  
      const hakuehdotIndex = html.indexOf("Hakuehdoilla löytyy");
      if (hakuehdotIndex !== -1) {
        const substring = html.substring(hakuehdotIndex, hakuehdotIndex + 300);
        //console.log(`Poimittu substring:`, substring);
  
        const numberMatch = substring.match(/(\d[\d\s]*)/);
        if (numberMatch && numberMatch[1]) {
          const rawNumber = numberMatch[1].replace(/\s/g, '');
          const count = parseInt(rawNumber, 10);
          //console.log(`Poimittu asuntomäärä: ${count}`);
          return count;
        }
      }
  
      console.warn(`Vuokraovelta ei löytynyt asuntojen määrää kaupungille ${cityName}.`);
      return 0;
  
    } catch (error) {
      console.error(`Virhe Vuokraoven haussa kaupungille ${cityName}:`, error);
      return 0;
    }
  }