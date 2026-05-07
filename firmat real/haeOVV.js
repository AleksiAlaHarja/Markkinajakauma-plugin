// haeOVV.js

let cachedNonce = null;
let cachedTimestamp = 0;

export async function haeOvvNonce() {
  const now = Date.now();

  // Tarkistetaan onko nonce tallessa ja vielä tuore
  if (cachedNonce && (now - cachedTimestamp) < 60000) { // 60000 ms = 60 sekuntia
    console.log("🔵 Käytetään välimuistissa olevaa noncea");
    return cachedNonce;
  }

  try {
    // Avaa uusi välilehti OVV:n kohdesivulle
    const tab = await new Promise((resolve, reject) => {
      chrome.tabs.create({ url: "https://www.ovv.com/vuokrattavat-kohteet/", active: false }, resolve);
    });

    // Odota hetki että sivu latautuu
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Lähetä viesti välilehdelle
    const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_OVV_NONCE" });

    // Sulje välilehti
    await chrome.tabs.remove(tab.id);

    if (response?.nonce) {
      console.log(`🔵 haeOvvNonce: Haettiin uusi nonce: ${response.nonce}`);
      cachedNonce = response.nonce;
      cachedTimestamp = now;
      return cachedNonce;
    } else {
      console.error("❌ haeOvvNonce: Noncea ei saatu.");
      return null;
    }
  } catch (error) {
    console.error("❌ haeOvvNonce: Virhe noncea haettaessa:", error);
    return null;
  }
}



// True = suodata kaupungin mukaan, False = kaikki kohteet
// Ilman suodatusta esim Hyvinkäällä näkyy Riihimäen ja Nurmijärven kohteet.
const SUODATA_KAUPUNKI_TARKASTI = 0; 

export async function haeOVV(cityId, cityName) {
  try {
    const staticNonce = await haeOvvNonce();
    if (!staticNonce) return "⚠️";

    const url = "https://www.ovv.com/wp-admin/admin-ajax.php";

    const formData = new URLSearchParams();
    formData.append("realty_type", "rental");
    formData.append("ovv_plugin_nonce", staticNonce);
    formData.append("office[]", cityId);
    formData.append("postcode", "");
    formData.append("action", "ovv_plugin_get_realties");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await response.json();
    const items = data?.realties || [];

    const count = SUODATA_KAUPUNKI_TARKASTI
      ? items.filter(item => item.city?.toLowerCase() === cityName.toLowerCase()).length
      : items.length;

    console.log(`✅ OVV: Löytyi ${count} kohdetta ${SUODATA_KAUPUNKI_TARKASTI ? "kaupungista" : "toimistolta"} ${cityName}`);
    return count;
  } catch (error) {
    console.error(`❌ Virhe haettaessa OVV-dataa kaupungille ${cityName}:`, error);
    return "⚠️";
  }
}
