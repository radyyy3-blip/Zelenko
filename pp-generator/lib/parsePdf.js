export function parsePdfText(text) {
  // Order number and date
  const orderMatch = text.match(/Поръчка\s*No[:\s]*(\d+)\s+Дата[:\s]*([\d.]+)/);
  const locCodeMatch = text.match(/(\d{2})\s*-\s*HomeMax/);
  const locCode = locCodeMatch?.[1] || "";

  const LOCATIONS = {
    "50": "50 - HomeMax София 'Вл.Вазов'",
    "51": "51 - HomeMax София 'Люлин'",
    "53": "53 - HomeMax Варна",
    "56": "56 - HomeMax Русе",
    "58": "58 - HomeMax Плевен",
    "62": "62 - HomeMax Пловдив",
    "64": "64 - HomeMax Стара Загора",
    "66": "66 - HomeMax Бургас",
  };
  const CITIES = {
    "50": "София", "51": "София", "53": "Варна", "56": "Русе",
    "58": "Плевен", "62": "Пловдив", "64": "Стара Загора", "66": "Бургас",
  };

  // Parse items
  const itemPattern = /(\d+)\s+(09\d{6})\s+(.+?)\s+(38\d{10})\s+(\d+)\s+бр/g;
  const items = [];
  let m;
  let no = 1;
  while ((m = itemPattern.exec(text)) !== null) {
    items.push({
      no: String(no++),
      kod: m[2],
      artickul: m[3].replace(/\s+/g, " ").trim(),
      ean: m[4],
      qty: m[5],
      marka: "бр.",
    });
  }

  return {
    orderNo: orderMatch?.[1] || "",
    orderDate: orderMatch?.[2] || "",
    locCode,
    location: LOCATIONS[locCode] || "",
    city: CITIES[locCode] || "",
    items,
  };
}
