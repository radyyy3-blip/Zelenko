 export function parsePdfText(text) {
  const LOC_BG = {
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
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const full = lines.join(" ");
  // Order number (10 digits) and date
  let orderNo = "", orderDate = "";
  const om = full.match(/(\d{10})\s+(\d{2}\.\d{2}\.\d{4})/);
  if (om) { orderNo = om[1]; orderDate = om[2]; }
  // Location code
  let locCode = "";
  for (const line of lines) {
    const m = line.match(/^(\d{2})\s*-\s*HomeMax/);
    if (m) { locCode = m[1]; break; }
  }
  // Parse items by finding EAN codes and working outward
  const items = [];
  let no = 1;
  lines.forEach((line, i) => {
    // Find lines containing EAN (13-digit starting with 38)
    const eanMatch = line.match(/\b(38\d{11})\b/);
    if (!eanMatch) return;
    const ean = eanMatch[1];
    // Find item code (09XXXXXX) looking back
    let kod = "";
    let artStart = i;

     for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
      const km = lines[j].match(/\b(09\d{6})\b/);
      if (km) {
        kod = km[1];
        artStart = j + 1;
        break;
} }
    if (!kod) return;
    // Artickul = lines between kod and EAN line
    const artLines = lines.slice(artStart, i);
    const artickul = artLines.join(" ").replace(/\s+/g, " ").trim();
    // Quantity - on EAN line or next lines
    let qty = "";
    const qm = line.match(/38\d{11}\s+(\d+)\s+бр/) ||
               line.match(/38\d{11}\s+(\d+)$/);
    if (qm) {
      qty = qm[1];
    } else {
      for (let j = i + 1; j <= Math.min(lines.length - 1, i + 5); j++) {
        const nm = lines[j].match(/^(\d+)\s+бр/) ||
                   (lines[j].match(/^\d+$/) && parseInt(lines[j]) < 5000 ? lines[j].ma
        if (nm) { qty = nm[1]; break; }
      }
}
    if (qty) {
      items.push({ no: String(no++), kod, artickul: artickul || kod, ean, qty, marka:
} });
  return {
    orderNo,
    orderDate,
    locCode,
    location: LOC_BG[locCode] || "",
    city: CITIES[locCode] || "",
    items,
}; }
tch(/^(
"бр." }
