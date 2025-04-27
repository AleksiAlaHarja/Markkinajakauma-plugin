export async function haeOVV(cityId, cityName) {
  try {
    const staticNonce = "6861048ec6"; // 🔵 Staattinen nonce

    const url = "https://www.ovv.com/wp-admin/admin-ajax.php";

    console.log(`🔵 Lähetetään OVV-pyyntö: officeId ${cityId}, kaupunki ${cityName}`);

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

    // 🔥 Näytetään koko serverin vastaus
    console.log("📦 Koko serverin vastaus:", JSON.stringify(data, null, 2));

    const items = data?.realties || [];

    // 🔵 Suodatetaan vain oikeat kaupungit
    const filteredItems = items.filter(item => 
      item.city?.toLowerCase() === cityName.toLowerCase()
    );

    const count = filteredItems.length;

    console.log(`✅ OVV: Löytyi ${count} kohdetta kaupungista ${cityName}`);
    return count;
  } catch (error) {
    console.error(`❌ Virhe haettaessa OVV-dataa kaupungille ${cityName}:`, error);
    return "⚠️";
  }
}
