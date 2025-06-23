import { haeTotalOikotie } from './haeTotalOikotie.js';
import { haeTotalVuokraovi } from './haeTotalVuokraovi.js';

export async function haeTotal(cityId, cityName) {
  const totalVuokraovi = await haeTotalVuokraovi(cityId, cityName);
  const totalOikotie = await haeTotalOikotie(cityId, cityName);

  const valittu = Math.max(totalVuokraovi, totalOikotie);
  const lähde = valittu === totalVuokraovi ? "Vuokraovi" : "Oikotie";

  console.log(`⬅️ [haeTotal] Valittu arvo ${cityName}: ${valittu} (${lähde})`);

  return valittu;
}