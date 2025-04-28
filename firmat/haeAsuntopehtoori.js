export async function haeAsuntopehtoori(cityId, cityName) {

  const DEBUG = 0;

  const url = `https://www.asuntopehtoori.fi/?sfid=13401&sf_action=get_data&sf_data=form&_sft_status-code=for_rent&_sfm_living_area_m2=0+10000&_sfm_myyntihinta=0+10000000&_sfm_rakennusvuosi=1900+2030&lang=fi&_sft_municipality=${cityName}`;

  function normalize(str) {
    return str
      .toLowerCase()
      .replace(/ä/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/å/g, 'a');
  }

  try {
    if (DEBUG) console.log(`📡 Haetaan Asuntopehtoori-tiedot kaupungille: ${cityName}`);
    const response = await fetch(url);
    const json = await response.json();
    const html = json.form.replace(/\\"/g, '"');
    if (DEBUG) console.log("✅ Saatiin HTML:", html.slice(0, 500), "...");

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if (DEBUG) console.log("📄 Parsed DOM:", doc);

    const normCity = normalize(cityName);
    const option = [...doc.querySelectorAll("option")].find(o => normalize(o.value) === normCity);
    if (DEBUG) console.log("🔍 Etsitty option-elementti:", option);

    if (option && option.hasAttribute("data-sf-count")) {
      const count = parseInt(option.getAttribute("data-sf-count"), 10);
      if (DEBUG) console.log(`✅ Löytyi: ${count} kohdetta kaupungille ${cityName}`);
      return count;
    } else {
      throw new Error(`data-sf-count ei löytynyt kaupungille ${cityName}`);
    }
  } catch (error) {
    console.error("❌ Virhe haettaessa Asuntopehtoori-tietoja:", error);
    return null;
  }
}
