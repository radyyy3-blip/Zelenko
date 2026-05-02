export function parsePdfText(text) {
  const LOC_BG = {
    "50": "50 - HomeMax \u0421\u043e\u0444\u0438\u044f '\u0412\u043b.\u0412\u0430\u0437\u043e\u0432'",
    "51": "51 - HomeMax \u0421\u043e\u0444\u0438\u044f '\u041b\u044e\u043b\u0438\u043d'",
    "53": "53 - HomeMax \u0412\u0430\u0440\u043d\u0430",
    "56": "56 - HomeMax \u0420\u0443\u0441\u0435",
    "58": "58 - HomeMax \u041f\u043b\u0435\u0432\u0435\u043d",
    "62": "62 - HomeMax \u041f\u043b\u043e\u0432\u0434\u0438\u0432",
    "64": "64 - HomeMax \u0421\u0442\u0430\u0440\u0430 \u0417\u0430\u0433\u043e\u0440\u0430",
    "66": "66 - HomeMax \u0411\u0443\u0440\u0433\u0430\u0441",
  };
  const CITIES = {
    "50": "\u0421\u043e\u0444\u0438\u044f", "51": "\u0421\u043e\u0444\u0438\u044f",
    "53": "\u0412\u0430\u0440\u043d\u0430", "56": "\u0420\u0443\u0441\u0435",
    "58": "\u041f\u043b\u0435\u0432\u0435\u043d", "62": "\u041f\u043b\u043e\u0432\u0434\u0438\u0432",
    "64": "\u0421\u0442\u0430\u0440\u0430 \u0417\u0430\u0433\u043e\u0440\u0430", "66": "\u0411\u0443\u0440\u0433\u0430\u0441",
  };

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const full = lines.join(" ");

  let orderNo = "", orderDate = "";
  const om = full.match(/(\d{10})\s+(\d{2}\.\d{2}\.\d{4})/);
  if (om) { orderNo = om[1]; orderDate = om[2]; }

  let locCode = "";
  for (const line of lines) {
    const m = line.match(/^(\d{2})\s*-\s*HomeMax/);
    if (m) { locCode = m[1]; break; }
  }

  const items = [];
  let no = 1;

  lines.forEach((line, i) => {
    const eanMatch = line.match(/\b(38\d{11})\b/);
    if (!eanMatch) return;
    const ean = eanMatch[1];

    let kod = "";
    let artStart = i;
    for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
      const km = lines[j].match(/\b(09\d{6})\b/);
      if (km) { kod = km[1]; artStart = j + 1; break; }
    }
    if (!kod) return;

    const artLines = lines.slice(artStart, i);
    const artickul = artLines.join(" ").replace(/\s+/g, " ").trim();

    let qty = "";
    const qm = line.match(/38\d{11}\s+(\d+)\s+/) || line.match(/38\d{11}\s+(\d+)$/);
    if (qm) {
      qty = qm[1];
    } else {
      for (let j = i + 1; j <= Math.min(lines.length - 1, i + 5); j++) {
        const nm = lines[j].match(/^(\d+)\s+/) || (lines[j].match(/^\d+$/) && parseInt(lines[j]) < 5000 ? lines[j].match(/^(\d+)$/) : null);
        if (nm && parseInt(nm[1]) < 5000 && parseInt(nm[1]) > 0) { qty = nm[1]; break; }
      }
    }

    if (qty) {
      items.push({ no: String(no++), kod, artickul: artickul || kod, ean, qty, marka: "\u0431\u0440." });
    }
  });

  return { orderNo, orderDate, locCode, location: LOC_BG[locCode] || "", city: CITIES[locCode] || "", items };
}
