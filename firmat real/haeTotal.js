import { haeTotalOikotie } from './haeTotalOikotie.js';
import { haeTotalVuokraovi } from './haeTotalVuokraovi.js';

export async function haeTotal(cityId, cityName) {
  const totalVuokraovi = await haeTotalVuokraovi(cityId, cityName);
  const totalOikotie = await haeTotalOikotie(cityId, cityName);

  console.log(`[haeTotal] Vuokraovi: ${totalVuokraovi}, Oikotie: ${totalOikotie}`);

  const valittu = Math.max(totalVuokraovi, totalOikotie);
  const lähde = valittu === totalVuokraovi ? "Vuokraovi" : "Oikotie";

  console.log(`[haeTotal] Valittu arvo: ${valittu} (${lähde})`);

  return valittu;
}