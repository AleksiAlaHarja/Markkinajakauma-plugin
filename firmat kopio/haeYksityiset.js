import { haeYksityisetOikotie } from './haeYksityisetOikotie.js';
import { haeYksityisetVuokraovi } from './haeYksityisetVuokraovi.js';

export async function haeYksityiset(cityId, cityName) {
  const yksityisetVuokraovi = await haeYksityisetVuokraovi(cityId, cityName);
  const yksityisetOikotie = await haeYksityisetOikotie(cityId, cityName);

  console.log(`[haeYksityiset] Vuokraovi: ${yksityisetVuokraovi}, Oikotie: ${yksityisetOikotie}`);

  const valittu = Math.max(yksityisetVuokraovi, yksityisetOikotie);
  const lähde = valittu === yksityisetVuokraovi ? "Vuokraovi" : "Oikotie";

  console.log(`[haeYksityiset] Valittu arvo: ${valittu} (${lähde})`);

  return valittu;
}