import { useState, useCallback, useEffect } from "react";
import { generateDocx } from "../lib/generateDocx";
import { saveAs } from "file-saver";

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

const todayStr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
};

async function extractTextFromPdf(arrayBuffer) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join("\n");
    fullText += pageText + "\n";
  }
  return fullText;
}

function parseText(text) {
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

    let kod = "", artStart = i;
    for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
      const km = lines[j].match(/\b(09\d{6})\b/);
      if (km) { kod = km[1]; artStart = j + 1; break; }
    }
    if (!kod) return;

    const artickul = lines.slice(artStart, i).join(" ").replace(/\s+/g, " ").trim();

    let qty = "";
    const qm = line.match(/38\d{11}\s+(\d+)/);
    if (qm && parseInt(qm[1]) < 5000) {
      qty = qm[1];
    } else {
      for (let j = i + 1; j <= Math.min(lines.length - 1, i + 5); j++) {
        const nm = lines[j].match(/^(\d+)/);
        if (nm && parseInt(nm[1]) < 5000 && parseInt(nm[1]) > 0) { qty = nm[1]; break; }
      }
    }

    if (qty) items.push({ no: String(no++), kod, artickul: artickul || kod, ean, qty, marka: "бр." });
  });

  return {
    orderNo, orderDate, locCode,
    location: LOC_BG[locCode] || "",
    city: CITIES[locCode] || "",
    items,
  };
}

export default function Home() {
  const [orders, setOrders] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [globalDate, setGlobalDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [done, setDone] = useState([]);

  const readFiles = useCallback(async (files) => {
    setLoading(true);
    const parsed = [];
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf")) continue;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractTextFromPdf(arrayBuffer);
        const data = parseText(text);
        parsed.push({ ...data, deliveryDate: globalDate, fileName: file.name });
      } catch (e) {
        console.error("Parse error:", e);
      }
    }
    if (parsed.length > 0) {
      setOrders(prev => [...prev, ...parsed]);
      setActiveIdx(0);
    }
    setLoading(false);
  }, [globalDate]);

  const onDrop = e => {
    e.preventDefault(); setDragOver(false);
    readFiles(Array.from(e.dataTransfer.files));
  };

  const updateItem = (oi, ji, field, val) =>
    setOrders(prev => prev.map((o, i) => i !== oi ? o : {
      ...o, items: o.items.map((it, j) => j !== ji ? it : { ...it, [field]: val })
    }));

  const removeItem = (oi, ji) =>
    setOrders(prev => prev.map((o, i) => i !== oi ? o : {
      ...o, items: o.items.filter((_, j) => j !== ji).map((it, j) => ({ ...it, no: String(j+1) }))
    }));

  const addItem = (oi) =>
    setOrders(prev => prev.map((o, i) => i !== oi ? o : {
      ...o, items: [...o.items, { no: String(o.items.length+1), kod:"", artickul:"", ean:"", qty:"", marka:"бр." }]
    }));

  const updateOrder = (oi, field, val) =>
    setOrders(prev => prev.map((o, i) => i !== oi ? o : { ...o, [field]: val }));

  const applyDateAll = () =>
    setOrders(prev => prev.map(o => ({ ...o, deliveryDate: globalDate })));

  const removeOrder = (oi) => {
    setOrders(prev => prev.filter((_, i) => i !== oi));
    setActiveIdx(0);
  };

  const totalQty = items => items.reduce((s, it) => s + (parseInt(it.qty)||0), 0);

  const generateAll = async () => {
    setGenerating(true);
    const results = [];
    for (const order of orders) {
      try {
        const blob = await generateDocx(order);
        const name = `PP_${order.orderNo}_${order.city}.docx`;
        saveAs(blob, name);
        results.push({ orderNo: order.orderNo, location: order.location, date: order.deliveryDate, total: totalQty(order.items), ok: true });
      } catch (e) {
        results.push({ orderNo: order.orderNo, ok: false, error: e.message });
      }
    }
    setDone(prev => [...prev, ...results]);
    setOrders([]);
    setGenerating(false);
  };

  const order = orders[activeIdx];

  const S = {
    page: { minHeight:"100vh", background:"#0f0f0f", color:"#e8e0d0", fontFamily:"Georgia, serif", margin:0 },
    header: { background:"#141414", borderBottom:"1px solid #2a2a2a", padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between" },
    main: { padding:"24px", maxWidth:1000, margin:"0 auto" },
    card: { background:"#1a1a1a", borderRadius:10, overflow:"hidden", marginBottom:14 },
    cardHead: { padding:"10px 14px", background:"#111", fontSize:10, color:"#555", letterSpacing:3, textTransform:"uppercase" },
    btn: (primary) => ({
      background: primary ? "#c8a96e" : "transparent",
      border: primary ? "none" : "1px solid #333",
      borderRadius:7, color: primary ? "#000" : "#888",
      cursor:"pointer", padding:"9px 22px", fontSize:13,
      fontWeight: primary ? "bold" : "normal", fontFamily:"Georgia, serif",
    }),
    input: (gold) => ({
      background:"#0f0f0f", border:"1px solid #2a2a2a", borderRadius:5,
      padding:"6px 10px", color: gold ? "#c8a96e" : "#ddd", fontSize:13, fontFamily:"Georgia, serif",
    }),
    tInput: (mono, gold) => ({
      background:"transparent", border:"none", borderBottom:"1px solid #222",
      color: gold ? "#c8a96e" : mono ? "#aaa" : "#ddd",
      fontSize:12, padding:"3px 4px", width:"100%", boxSizing:"border-box",
      fontFamily: mono ? "monospace" : "Georgia, serif", outline:"none",
    }),
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={{ fontSize:10, letterSpacing:4, color:"#555", textTransform:"uppercase" }}>Бизнес Груп-11 ЕООД</div>
          <div style={{ fontSize:20, letterSpacing:1, marginTop:2 }}>ПП Генератор</div>
        </div>
        <div style={{ fontSize:12, color:"#555" }}>
          {loading ? "⏳ Зареждам..." : orders.length > 0 ? `${orders.length} поръчк${orders.length===1?"а":"и"}` : ""}
        </div>
      </div>

      <div style={S.main}>
        {/* Date + upload */}
        <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:20, background:"#1a1a1a", borderRadius:10, padding:"14px 18px", flexWrap:"wrap" }}>
          <span style={{ fontSize:13, color:"#888", whiteSpace:"nowrap" }}>Дата на доставка:</span>
          <input value={globalDate} onChange={e => setGlobalDate(e.target.value)}
            style={{ ...S.input(true), width:110 }} />
          <button onClick={applyDateAll} style={{ ...S.btn(false), fontSize:12, padding:"6px 14px" }}>Приложи към всички</button>
          <div style={{ flex:1 }} />
          <label style={{ ...S.btn(true), cursor:"pointer", display:"inline-block" }}>
            {loading ? "Зареждам..." : "+ Качи PDF поръчки"}
            <input type="file" accept=".pdf" multiple hidden onChange={e => readFiles(Array.from(e.target.files))} />
          </label>
        </div>

        {/* Drop zone */}
        {orders.length === 0 && !loading && (
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => document.querySelector('input[type=file]').click()}
            style={{
              border:`2px dashed ${dragOver ? "#c8a96e" : "#2a2a2a"}`,
              borderRadius:12, padding:"60px 32px", textAlign:"center",
              cursor:"pointer", transition:"all 0.2s",
              background: dragOver ? "#1a1510" : "transparent", marginBottom:20,
            }}
          >
            <div style={{ fontSize:40, marginBottom:14 }}>📄</div>
            <div style={{ fontSize:15, color:"#aaa", marginBottom:6 }}>Провлачи PDF поръчките тук</div>
            <div style={{ fontSize:12, color:"#555" }}>или натисни „Качи PDF поръчки" горе вдясно</div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign:"center", padding:"60px", color:"#888" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
            <div>Четa PDF файловете...</div>
          </div>
        )}

        {/* Orders */}
        {orders.length > 0 && !loading && (
          <>
            <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
              {orders.map((o, i) => (
                <button key={i} onClick={() => setActiveIdx(i)} style={{
                  background: activeIdx===i ? "#c8a96e" : "#1a1a1a",
                  border:"1px solid " + (activeIdx===i ? "#c8a96e" : "#2a2a2a"),
                  borderRadius:6, padding:"5px 14px",
                  color: activeIdx===i ? "#000" : "#888",
                  cursor:"pointer", fontSize:12, fontFamily:"monospace",
                }}>
                  {o.orderNo || `#${i+1}`} · {o.city || "?"}
                  {o.items.length === 0 && <span style={{ color:"#c83030", marginLeft:6 }}>⚠</span>}
                </button>
              ))}
            </div>

            {order && (
              <>
                <div style={S.card}>
                  <div style={S.cardHead}>Данни на поръчката</div>
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:12 }}>
                      {[["Поръчка No","orderNo"],["Дата поръчка","orderDate"],["Дата доставка","deliveryDate"],["Град","city"]].map(([label,field]) => (
                        <div key={field}>
                          <div style={{ fontSize:9, letterSpacing:2, color:"#555", textTransform:"uppercase", marginBottom:4 }}>{label}</div>
                          <input value={order[field]||""} onChange={e => updateOrder(activeIdx,field,e.target.value)}
                            style={{ ...S.input(field==="deliveryDate"), width:"100%", boxSizing:"border-box" }} />
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize:9, letterSpacing:2, color:"#555", textTransform:"uppercase", marginBottom:4 }}>Локация</div>
                      <input value={order.location||""} onChange={e => updateOrder(activeIdx,"location",e.target.value)}
                        style={{ ...S.input(false), width:"100%", boxSizing:"border-box" }} />
                    </div>
                  </div>
                </div>

                <div style={S.card}>
                  <div style={S.cardHead}>Артикули ({order.items.length} бр.)</div>
                  <div style={{ display:"grid", gridTemplateColumns:"32px 95px 1fr 135px 72px 62px 28px", padding:"7px 12px", background:"#0d0d0d", fontSize:9, color:"#444", letterSpacing:2, textTransform:"uppercase" }}>
                    <div>No</div><div>Код</div><div>Артикул</div><div>EAN</div><div>Кол.</div><div>Мярка</div><div></div>
                  </div>
                  {order.items.length === 0 && (
                    <div style={{ padding:"20px", textAlign:"center", color:"#c83030", fontSize:13 }}>
                      ⚠ Не са намерени артикули — добави ги ръчно или провери PDF файла
                    </div>
                  )}
                  {order.items.map((it, j) => (
                    <div key={j} style={{ display:"grid", gridTemplateColumns:"32px 95px 1fr 135px 72px 62px 28px", padding:"5px 12px", borderTop:"1px solid #1a1a1a", alignItems:"center" }}>
                      <div style={{ fontSize:11, color:"#444" }}>{it.no}</div>
                      <input value={it.kod||""} onChange={e => updateItem(activeIdx,j,"kod",e.target.value)} style={S.tInput(true,false)} />
                      <input value={it.artickul||""} onChange={e => updateItem(activeIdx,j,"artickul",e.target.value)} style={S.tInput(false,false)} />
                      <input value={it.ean||""} onChange={e => updateItem(activeIdx,j,"ean",e.target.value)} style={S.tInput(true,false)} />
                      <input value={it.qty||""} onChange={e => updateItem(activeIdx,j,"qty",e.target.value)} style={S.tInput(false,true)} />
                      <input value={it.marka||""} onChange={e => updateItem(activeIdx,j,"marka",e.target.value)} style={S.tInput(false,false)} />
                      <button onClick={() => removeItem(activeIdx,j)} style={{ background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:16, padding:0 }}>×</button>
                    </div>
                  ))}
                  <div style={{ padding:"8px 12px", borderTop:"1px solid #1a1a1a", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <button onClick={() => addItem(activeIdx)} style={{ ...S.btn(false), fontSize:11, padding:"3px 10px" }}>+ Добави ред</button>
                    <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                      <span style={{ fontSize:12, color:"#888" }}>Общо: <span style={{ color:"#c8a96e", fontWeight:"bold" }}>{totalQty(order.items)} бр.</span></span>
                      <button onClick={() => removeOrder(activeIdx)} style={{ ...S.btn(false), fontSize:11, padding:"3px 10px", color:"#8b3030", borderColor:"#8b3030" }}>Изтрий</button>
                    </div>
                  </div>
                </div>

                <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginTop:8 }}>
                  <button onClick={generateAll} disabled={generating} style={{
                    ...S.btn(true), opacity:generating?0.6:1,
                    cursor:generating?"not-allowed":"pointer", padding:"11px 32px", fontSize:15,
                  }}>
                    {generating ? "Генерирам..." : `⬇ Генерирай ${orders.length} ПП`}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Done log */}
        {done.length > 0 && (
          <div style={{ marginTop:28 }}>
            <div style={{ fontSize:10, letterSpacing:3, color:"#555", textTransform:"uppercase", marginBottom:12 }}>Генерирани</div>
            {done.map((d, i) => (
              <div key={i} style={{ background:"#1a1a1a", borderRadius:6, padding:"9px 14px", marginBottom:5, display:"flex", justifyContent:"space-between", fontSize:12 }}>
                <span style={{ color:"#888", fontFamily:"monospace" }}>{d.orderNo}</span>
                <span style={{ color:"#ccc" }}>{d.location}</span>
                <span style={{ color:"#666" }}>{d.date}</span>
                <span style={{ color: d.ok ? "#c8a96e" : "#c83030" }}>{d.ok ? `${d.total} бр. ✓` : `Грешка`}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
