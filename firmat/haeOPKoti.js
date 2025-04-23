export async function haeOPKoti(cityId, cityName) {
  const url = `https://op-koti.fi/vuokrattavat/asunnot?cityId=${cityId}`;

  try {
    const response = await fetch(url);
    const html = await response.text();

    const match = html.match(/<span class="large-text listings-count">(\d+)<\/span>/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    } else {
      console.warn("Listings count not found");
      return null;
    }
  } catch (error) {
    console.error("Virhe haettaessa OP Kodin tietoja:", error);
    return null;
  }
}
