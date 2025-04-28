// firmat/haeYksityiset.js
export async function haeYksityiset(cityId, cityName) {
  const vuokraoviYksityiset = await haeVuokraoviYksityiset(cityId, cityName);
  const oikotieYksityiset = await haeOikotieYksityiset(cityId, cityName);
  return Math.max(vuokraoviYksityiset, oikotieYksityiset);
}

async function haeOikotieYksityiset(cityId, cityName) {
  console.log(`Palautetaan placeholder 1 Oikotieltä kaupungille ${cityName}`);
  return 1;
}

async function haeVuokraoviYksityiset(cityId, cityName) {
  console.log(`Palautetaan placeholder 1 Vuokraovelta kaupungille ${cityName}`);
  return 1;
}
