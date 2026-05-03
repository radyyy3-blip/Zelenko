import pdf from "pdf-parse";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

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

function parseText(text) {
  // Split into lines and clean
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const full = lines.join(" ");

  // Order number (10 digits) and date
  let orderNo = "", orderDate = "";
  const om = full.match(/(\d{10})\s+(\d{2}\.\d{2}\.\d{4})/);
  if (om) { orderNo = om[1]; orderDate = om[2]; }

  // Location code
  let locCode = "";
  for (const line of lines) {
    const m = line.match(/(\d{2})\s*-\s*HomeMax/);
    if (m) { locCode = m[1]; break; }
  }

  // Parse items - find EAN codes (13 digits starting with 38)
  const items = [];
  let no = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line contains EAN
    const eanMatch = line.match(/\b(38\d{11})\b/);
    if (!eanMatch) continue;
    const ean = eanMatch[1];

    // Look back for item code (09XXXXXX)
    let kod = "";
    let artStart = i;
    for (let j = i - 1; j >= Math.max(0, i - 12); j--) {
      const km = lines[j].match(/\b(09\d{6})\b/);
      if (km) {
        kod = km[1];
        artStart = j + 1;
        break;
      }
    }
    if (!kod) continue;

    // Artickul = lines between kod line and EAN line
    const artLines = lines.slice(artStart, i);
    const artickul = artLines
      .filter(l => !l.match(/^\d+$/) && !l.match(/^09\d{6}$/))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    // Find quantity - on same line as EAN or next lines
    let qty = "";
    
    // Check same line as EAN
    const sameLineQty = line.match(/38\d{11}\s+(\d+)\s+/);
    if (sameLineQty && parseInt(sameLineQty[1]) < 5000) {
      qty = sameLineQty[1];
    } else {
      // Check next lines
      for (let j = i + 1; j <= Math.min(lines.length - 1, i + 6); j++) {
        const nextLine = lines[j];
        // Skip lines that look like prices (contain decimal)
        if (nextLine.match(/\d+\.\d{2}/)) continue;
        const qm = nextLine.match(/^(\d+)(?:\s+бр)?/);
        if (qm && parseInt(qm[1]) > 0 && parseInt(qm[1]) < 5000) {
          qty = qm[1];
          break;
        }
      }
    }

    if (qty && kod) {
      items.push({
        no: String(no++),
        kod,
        artickul: artickul || kod,
        ean,
        qty,
        marka: "бр.",
      });
    }
  }

  return {
    orderNo,
    orderDate,
    locCode,
    location: LOC_BG[locCode] || "",
    city: CITIES[locCode] || "",
    items,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { base64, filename } = req.body;
    const buffer = Buffer.from(base64, "base64");
    
    // Parse PDF
    const data = await pdf(buffer);
    const parsed = parseText(data.text);
    
    // Debug: send raw text too
    console.log("PDF text sample:", data.text.substring(0, 500));
    console.log("Found items:", parsed.items.length);
    
    res.json({ ...parsed, fileName: filename, rawText: data.text.substring(0, 1000) });
  } catch (e) {
    console.error("Parse error:", e);
    res.status(500).json({ error: e.message });
  }
}
