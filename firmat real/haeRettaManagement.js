export async function haeRettaManagement(cityId, cityName) {
  const url = "https://vuokraus.rettamanagement.fi/_next/data/fU4gcvpjXM9mavu5MDKSE/fi/asunnot.json";
  try {
    const response = await fetch(url);
    const data = await response.json();

    const items = data?.pageProps?.items || [];
    const count = items.filter(item => item.cityDistrict?.city === cityName).length;

    return count;
  } catch (error) {
    console.error(`Virhe haettaessa Rettamanagement JSON-dataa:`, error);
    return 0;
  }
}
