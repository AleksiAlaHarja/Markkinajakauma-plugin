export async function haeRettaManagement(cityId, cityName) {
  try {
    const buildId = await haeBuildId();
    const url = `https://vuokraus.rettamanagement.fi/_next/data/${buildId}/fi/asunnot.json`;

    console.log(`🔵 Haetaan kaikki asunnot: ${url}`);
    const data = await (await fetch(url)).json();
    const items = data?.pageProps?.items || [];

    const count = items.filter(item => item.cityDistrict?.city === cityName).length;

    console.log(`✅ Löytyi ${count} asuntoa kaupungista ${cityName}`);
    return count;
  } catch (error) {
    console.error("❌ Virhe haettaessa Rettamanagement-dataa:", error);
    return "⚠️";
  }
}

async function haeBuildId() {
  const html = await (await fetch("https://vuokraus.rettamanagement.fi/fi/asunnot")).text();
  const match = html.match(/"buildId":"(.*?)"/);
  if (!match) throw new Error("Build ID:tä ei löytynyt.");
  console.log(`ℹ️  Build ID haettu: ${match[1]}`);
  return match[1];
}
