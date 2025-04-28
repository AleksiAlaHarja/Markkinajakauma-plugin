import { haeYksityisetOikotie } from './haeYksityisetOikotie.js';
import { haeYksityisetVuokraovi } from './haeYksityisetVuokraovi.js';

export async function haeYksityiset(cityId, cityName) {
  const yksityisetVuokraovi = await haeYksityisetVuokraovi(cityId, cityName);
  const yksityisetOikotie = await haeYksityisetOikotie(cityId, cityName);
  return Math.max(yksityisetVuokraovi, yksityisetOikotie);
}