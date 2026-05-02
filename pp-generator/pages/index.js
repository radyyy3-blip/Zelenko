import { useState, useCallback } from "react";
import { generateDocx } from "../lib/generateDocx";
import { saveAs } from "file-saver";

const todayStr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
};

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
      const base64 = await new Promise(res => {
        const r = new FileReader();
        r.onload = e => res(e.target.result.split(",")[1]);
        r.readAsDataURL(file);
      });
      try {
        const resp = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, filename: file.name }),
        });
        const data = await resp.json();
        parsed.push({ ...data, deliveryDate: globalDate });
      } catch (e) {
        console.error(e);
      }
    }
    setOrders(prev => [...prev, ...parsed]);
    setActiveIdx(0);
    setLoading(false);
  }, [globalDate]);

  const onDrop = e => {
    e.preventDefault();
    setDragOver(false);
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
    setGenerating(false);
  };

  const order = orders[activeIdx];

  const S = {
    page: { minHeight:"100vh", background:"#0f0f0f", color:"#e8e0d0", fontFamily:"Georgia, serif", margin:0 },
    header: { background:"#141414", borderBottom:"1px solid #2a2a2a", padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between" },
    main: { padding:"28px", maxWidth:1000, margin:"0 auto" },
    card: { background:"#1a1a1a", borderRadius:10, overflow:"hidden", marginBottom:14 },
    cardHead: { padding:"10px 14px", background:"#111", fontSize:10, color:"#555", letterSpacing:3, textTransform:"uppercase" },
    btn: (primary) => ({
      background: primary ? "#c8a96e" : "transparent",
      border: primary ? "none" : "1px solid #333",
      borderRadius:7, color: primary ? "#000" : "#888",
      cursor:"pointer", padding:"9px 22px", fontSize:13,
      fontWeight: primary ? "bold" : "normal",
      fontFamily:"Georgia, serif",
    }),
    input: (gold) => ({
      background:"#0f0f0f", border:"1px solid #2a2a2a", borderRadius:5,
      padding:"6px 10px", color: gold ? "#c8a96e" : "#ddd",
      fontSize:13, fontFamily:"Georgia, serif",
    }),
    tableInput: (mono, gold) => ({
      background:"transparent", border:"none", borderBottom:"1px solid #222",
      color: gold ? "#c8a96e" : mono ? "#aaa" : "#ddd",
      fontSize:12, padding:"3px 4px", width:"100%", boxSizing:"border-box",
      fontFamily: mono ? "monospace" : "Georgia, serif", outline:"none",
    }),
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={{ fontSize:10, letterSpacing:4, color:"#555", textTransform:"uppercase" }}>Бизнес Груп-11 ЕООД</div>
          <div style={{ fontSize:20, letterSpacing:1, marginTop:2 }}>ПП Генератор</div>
        </div>
        <div style={{ fontSize:12, color:"#555" }}>
          {orders.length > 0 && `${orders.length} поръчк${orders.length===1?"а":"и"} заредени`}
        </div>
      </div>

      <div style={S.main}>

        {/* Date + upload bar */}
        <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:20, background:"#1a1a1a", borderRadius:10, padding:"14px 18px" }}>
          <span style={{ fontSize:13, color:"#888", whiteSpace:"nowrap" }}>Дата на доставка:</span>
          <input
            value={globalDate}
            onChange={e => setGlobalDate(e.target.value)}
            style={{ ...S.input(true), width:120 }}
          />
          <button onClick={applyDateAll} style={{ ...S.btn(false), fontSize:12, padding:"6px 14px" }}>
            Приложи към всички
          </button>
          <div style={{ flex:1 }} />
          <label style={{ ...S.btn(true), cursor:"pointer", display:"inline-block" }}>
            {loading ? "Зареждам..." : "+ Качи PDF поръчки"}
            <input type="file" accept=".pdf" multiple hidden onChange={e => readFiles(Array.from(e.target.files))} />
          </label>
        </div>

        {/* Drop zone (when no orders) */}
        {orders.length === 0 && (
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => document.querySelector('input[type=file]').click()}
            style={{
              border:`2px dashed ${dragOver ? "#c8a96e" : "#2a2a2a"}`,
              borderRadius:12, padding:"60px 32px", textAlign:"center",
              cursor:"pointer", transition:"border-color 0.2s",
              background: dragOver ? "#1a1510" : "transparent", marginBottom:20,
            }}
          >
            <div style={{ fontSize:40, marginBottom:14 }}>📄</div>
            <div style={{ fontSize:15, color:"#aaa", marginBottom:6 }}>Провлачи PDF поръчките тук</div>
            <div style={{ fontSize:12, color:"#555" }}>или натисни „Качи PDF поръчки" горе вдясно</div>
          </div>
        )}

        {/* Orders */}
        {orders.length > 0 && (
          <>
            {/* Tabs */}
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
                </button>
              ))}
            </div>

            {order && (
              <>
                {/* Meta */}
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

                {/* Items */}
                <div style={S.card}>
                  <div style={S.cardHead}>Артикули</div>
                  <div style={{ display:"grid", gridTemplateColumns:"32px 95px 1fr 135px 72px 62px 28px", padding:"7px 12px", background:"#0d0d0d", fontSize:9, color:"#444", letterSpacing:2, textTransform:"uppercase" }}>
                    <div>No</div><div>Код</div><div>Артикул</div><div>EAN</div><div>Кол.</div><div>Мярка</div><div></div>
                  </div>
                  {order.items.map((it, j) => (
                    <div key={j} style={{ display:"grid", gridTemplateColumns:"32px 95px 1fr 135px 72px 62px 28px", padding:"5px 12px", borderTop:"1px solid #1a1a1a", alignItems:"center" }}>
                      <div style={{ fontSize:11, color:"#444" }}>{it.no}</div>
                      <input value={it.kod||""} onChange={e => updateItem(activeIdx,j,"kod",e.target.value)} style={S.tableInput(true,false)} />
                      <input value={it.artickul||""} onChange={e => updateItem(activeIdx,j,"artickul",e.target.value)} style={S.tableInput(false,false)} />
                      <input value={it.ean||""} onChange={e => updateItem(activeIdx,j,"ean",e.target.value)} style={S.tableInput(true,false)} />
                      <input value={it.qty||""} onChange={e => updateItem(activeIdx,j,"qty",e.target.value)} style={S.tableInput(false,true)} />
                      <input value={it.marka||""} onChange={e => updateItem(activeIdx,j,"marka",e.target.value)} style={S.tableInput(false,false)} />
                      <button onClick={() => removeItem(activeIdx,j)} style={{ background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:16, padding:0 }}>×</button>
                    </div>
                  ))}
                  <div style={{ padding:"8px 12px", borderTop:"1px solid #1a1a1a", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <button onClick={() => addItem(activeIdx)} style={{ ...S.btn(false), fontSize:11, padding:"3px 10px" }}>+ Добави ред</button>
                    <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                      <span style={{ fontSize:12, color:"#888" }}>Общо: <span style={{ color:"#c8a96e", fontWeight:"bold" }}>{totalQty(order.items)} бр.</span></span>
                      <button onClick={() => removeOrder(activeIdx)} style={{ ...S.btn(false), fontSize:11, padding:"3px 10px", color:"#8b3030", borderColor:"#8b3030" }}>Изтрий поръчката</button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Generate button */}
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginTop:8 }}>
              <button onClick={generateAll} disabled={generating} style={{
                ...S.btn(true),
                opacity: generating ? 0.6 : 1,
                cursor: generating ? "not-allowed" : "pointer",
                padding:"11px 32px", fontSize:15,
              }}>
                {generating ? "Генерирам..." : `⬇ Генерирай ${orders.length} ПП`}
              </button>
            </div>
          </>
        )}

        {/* Done log */}
        {done.length > 0 && (
          <div style={{ marginTop:28 }}>
            <div style={{ fontSize:10, letterSpacing:3, color:"#555", textTransform:"uppercase", marginBottom:12 }}>Генерирани файлове</div>
            {done.map((d, i) => (
              <div key={i} style={{ background:"#1a1a1a", borderRadius:6, padding:"9px 14px", marginBottom:5, display:"flex", justifyContent:"space-between", fontSize:12 }}>
                <span style={{ color:"#888", fontFamily:"monospace" }}>{d.orderNo}</span>
                <span style={{ color:"#ccc" }}>{d.location}</span>
                <span style={{ color:"#666" }}>{d.date}</span>
                <span style={{ color: d.ok ? "#c8a96e" : "#c83030" }}>{d.ok ? `${d.total} бр. ✓` : `Грешка: ${d.error}`}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
