import pdf from "pdf-parse";
import { parsePdfText } from "../../lib/parsePdf";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { base64, filename } = req.body;
    const buffer = Buffer.from(base64, "base64");
    const data = await pdf(buffer);
    const parsed = parsePdfText(data.text);
    res.json({ ...parsed, fileName: filename });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
