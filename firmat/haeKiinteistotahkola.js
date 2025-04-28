// firmat/haeKiinteistotahkola.js
export async function haeKiinteistotahkola(cityId, cityName) {
  const url = `https://kiinteistotahkola.fi/wp-json/v1/locations?locationType=14&location=${cityName}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(data);
    return data.found ?? 0;
  } catch (e) {
    console.error("Kiinteistötahkola virhe:", e);
    return 0;
  }
}
