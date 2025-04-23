export async function haeRettamanagement(cityId, cityName) {
  const url = `https://vuokraus.rettamanagement.fi/asunnot?cities=${cityName}`;
  try {
    const response = await fetch(url);
    const html = await response.text();

    const match = html.match(/\/ (\d+)</);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    } else {
      console.warn(`Rettamanagement: ei löytynyt tulosmäärää kaupungille ${cityName}`);
      return 0;
    }
  } catch (error) {
    console.error(`Virhe haettaessa Rettamanagement-sivua:`, error);
    return 0;
  }
}