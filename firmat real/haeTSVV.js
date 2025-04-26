export async function haeTSVV(cityId, cityName) {
  const response = await fetch("https://www.tsvv.fi/vuokra-asunnot");
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  //console.log(doc);

  // Oletetaan, että jokainen kohde on div-tägissä, jolla on luokka "item" (korjataan tarvittaessa)
  const items = doc.querySelectorAll(".item");
  //console.log(items);
  return items.length;
}
