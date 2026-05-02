import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
} from "docx";

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
const thinBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

const boldCell = (text, width, shade, span, align) => new TableCell({
  borders: thinBorders,
  width: { size: width, type: WidthType.DXA },
  shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
  margins: { top: 40, bottom: 40, left: 80, right: 80 },
  columnSpan: span || 1,
  verticalAlign: VerticalAlign.CENTER,
  children: [new Paragraph({ alignment: align || AlignmentType.LEFT, children: [new TextRun({ text, bold: true, font: "Arial", size: 16 })] })]
});

const cell = (text, width, bold, align) => new TableCell({
  borders: thinBorders,
  width: { size: width, type: WidthType.DXA },
  margins: { top: 40, bottom: 40, left: 80, right: 80 },
  verticalAlign: VerticalAlign.CENTER,
  children: [new Paragraph({ alignment: align || AlignmentType.LEFT, children: [new TextRun({ text, bold: !!bold, font: "Arial", size: 16 })] })]
});

export async function generateDocx(order) {
  const { deliveryDate, orderNo, orderDate, location, city, items } = order;

  const totalWidth = 9026;
  const cNo = 380, cKod = 980, cKodDost = 650, cEan = 1500, cQty = 880, cMarka = 620;
  const cArt = totalWidth - cNo - cKod - cKodDost - cEan - cQty - cMarka;

  const itemRows = items.map(it => new TableRow({
    children: [
      cell(it.no, cNo, true, AlignmentType.CENTER),
      cell(it.kod, cKod, true),
      cell("", cKodDost),
      cell(it.artickul, cArt, true),
      cell(it.ean, cEan),
      cell(it.qty, cQty, true, AlignmentType.CENTER),
      cell(it.marka, cMarka, false, AlignmentType.CENTER),
    ]
  }));

  const doc = new Document({
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 640, right: 640, bottom: 640, left: 640 } }
      },
      children: [
        new Table({ width: { size: totalWidth, type: WidthType.DXA }, columnWidths: [totalWidth], rows: [
          new TableRow({ children: [new TableCell({ borders: thinBorders, width: { size: totalWidth, type: WidthType.DXA }, shading: { fill: "D9D9D9", type: ShadingType.CLEAR }, margins: { top: 50, bottom: 50, left: 80, right: 80 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Приемо-Предавателен Протокол", bold: true, font: "Arial", size: 22 })] })] })] }),
          new TableRow({ children: [new TableCell({ borders: thinBorders, width: { size: totalWidth, type: WidthType.DXA }, margins: { top: 35, bottom: 35, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: `Днес, ${deliveryDate} год. в гр.${city} , между страните:`, font: "Arial", size: 16 })] })] })] }),
        ]}),
        new Paragraph({ spacing: { before: 60 }, children: [] }),
        new Table({ width: { size: totalWidth, type: WidthType.DXA }, columnWidths: [1300, 3863, 3863], rows: [
          new TableRow({ children: [boldCell("фирма:", 1300, "D9D9D9"), boldCell("БИЗНЕС ГРУП-11 ЕООД", 3863), boldCell("БАУМАКС БЪЛГАРИЯ ООД", 3863)] }),
          new TableRow({ children: [boldCell("адрес:", 1300, "D9D9D9"), cell("ПАВЛИКЕНИ", 3863), cell("СОФИЯ", 3863)] }),
          new TableRow({ children: [boldCell("ЕИК:", 1300, "D9D9D9"), cell("201561045", 3863), cell("131313550", 3863)] }),
          new TableRow({ children: [boldCell("представляващ:", 1300, "D9D9D9"), cell("РАДОСЛАВ ХРИСТОВ", 3863), cell("", 3863)] }),
          new TableRow({ children: [boldCell("наричан:", 1300, "D9D9D9"), boldCell("Предаваща Страна", 3863), boldCell("Приемаща Страна", 3863)] }),
        ]}),
        new Paragraph({ spacing: { before: 60 }, children: [] }),
        new Table({ width: { size: totalWidth, type: WidthType.DXA }, columnWidths: [totalWidth], rows: [new TableRow({ children: [new TableCell({ borders: thinBorders, width: { size: totalWidth, type: WidthType.DXA }, margins: { top: 35, bottom: 35, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "се подписа настоящият Приемо-Предавателен Протокол, наричан по-нататък за краткост Протокола, при следните условия: ", font: "Arial", size: 16 }), new TextRun({ text: "чл.1.", bold: true, font: "Arial", size: 16 }), new TextRun({ text: " Предаващата Страна предаде, а Приемащата Страна прие, както следва:", font: "Arial", size: 16 })] })] })] })] }),
        new Paragraph({ spacing: { before: 60 }, children: [] }),
        new Table({ width: { size: totalWidth, type: WidthType.DXA }, columnWidths: [1200, 2608, 2608, 2610], rows: [new TableRow({ children: [
          boldCell("Поръчка", 1200, "D9D9D9"),
          new TableCell({ borders: thinBorders, width: { size: 2608, type: WidthType.DXA }, margins: { top: 35, bottom: 35, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "No: ", bold: true, font: "Arial", size: 16 }), new TextRun({ text: orderNo, bold: true, italics: true, font: "Arial", size: 16 })] })] }),
          new TableCell({ borders: thinBorders, width: { size: 2608, type: WidthType.DXA }, margins: { top: 35, bottom: 35, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "Дата: ", bold: true, font: "Arial", size: 16 }), new TextRun({ text: orderDate, bold: true, italics: true, font: "Arial", size: 16 })] })] }),
          boldCell(location, 2610),
        ]})] }),
        new Paragraph({ spacing: { before: 60 }, children: [] }),
        new Table({ width: { size: totalWidth, type: WidthType.DXA }, columnWidths: [cNo, cKod, cKodDost, cArt, cEan, cQty, cMarka], rows: [
          new TableRow({ children: [boldCell("No", cNo, "D9D9D9", 1, AlignmentType.CENTER), boldCell("Код", cKod, "D9D9D9"), boldCell("Код дост.", cKodDost, "D9D9D9"), boldCell("Артикул", cArt, "D9D9D9"), boldCell("EAN", cEan, "D9D9D9"), boldCell("Поръчано количество", cQty, "D9D9D9", 1, AlignmentType.CENTER), boldCell("Мярка", cMarka, "D9D9D9", 1, AlignmentType.CENTER)] }),
          ...itemRows,
        ]}),
        new Paragraph({ spacing: { before: 60 }, children: [] }),
        new Paragraph({ children: [new TextRun({ text: "чл.2.\t", bold: true, font: "Arial", size: 16 }), new TextRun({ text: "Приемащата Страна прие предаденото от Предаващата Страна без възражения по отношение на количество и качество.", font: "Arial", size: 16 })] }),
        new Paragraph({ children: [new TextRun({ text: "чл.3.\t", bold: true, font: "Arial", size: 16 }), new TextRun({ text: "Протоколът се подписа в два еднакви екземпляра – по един за всяка от страните.", font: "Arial", size: 16 })] }),
        new Paragraph({ spacing: { before: 120 }, children: [] }),
        new Table({ width: { size: totalWidth, type: WidthType.DXA }, columnWidths: [4513, 4513], rows: [new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: 4513, type: WidthType.DXA }, margins: { top: 50, bottom: 50, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "За предаваща страна (подпис):", bold: true, font: "Arial", size: 16 })] })] }),
          new TableCell({ borders: noBorders, width: { size: 4513, type: WidthType.DXA }, margins: { top: 50, bottom: 50, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "За приемаща страна (подпис):", bold: true, font: "Arial", size: 16 })] })] }),
        ]})] }),
      ]
    }]
  });

  return await Packer.toBlob(doc);
}
