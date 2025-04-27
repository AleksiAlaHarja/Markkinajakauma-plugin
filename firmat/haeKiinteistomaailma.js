export async function haeKiinteistomaailma(cityId, cityName) {
  const url = `https://www.kiinteistomaailma.fi/api/km/KM/?rental=true&query[]=${encodeURIComponent(JSON.stringify({ municipality: cityName }))}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Verkkovirhe");
    const json = await response.json();
    return json?.data?.matches ?? -1;
  } catch (err) {
    console.error("haeKiinteistomaailma virhe:", err);
    return -1;
  }
}
