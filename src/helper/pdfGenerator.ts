import PDFDocument from "pdfkit";
import path from "path";

interface PdfOrderItem {
  name: string;
  qty: number;
  mrp: number;
  taxPercent: number;
  netAmount: number;
  discountAmount: number;
}

interface PdfOrder {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  customerName: string;
  customerPhone: string;
  orderNo: string;
  createdAt: string;
  items: PdfOrderItem[];
  additionalCharges: { name: string; amount: number }[];
  totalDiscount: number;
  redeemCreditAmount: number;
  redeemCreditType: string;
  flatDiscountAmount: number;
  roundOff: number;
  totalAmount: number;
  totalTaxAmount: number;
}

export const generatePosBillPdf = async (order: PdfOrder): Promise<string> => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const fileName = `pos_bill_${order.orderNo.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`;
  const outputDir = path.join(__dirname, "..", "..", "..", "public", "invoices");
  const fs = await import("fs");

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filePath = path.join(outputDir, fileName);
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  const leftMargin = 40;
  let y = 40;

  const addLine = (text: string, opts: any = {}) => {
    const fontSize = opts.fontSize || 10;
    doc.fontSize(fontSize).font(opts.bold ? "Helvetica-Bold" : "Helvetica");
    if (opts.color) doc.fillColor(opts.color);
    else doc.fillColor("#000");
    
    const textWidth = 520;
    if (opts.align === "center") {
      doc.text(text, leftMargin, y, { width: textWidth, align: "center" });
    } else if (opts.align === "right") {
      doc.text(text, leftMargin, y, { width: textWidth, align: "right" });
    } else {
      doc.text(text, leftMargin, y, { width: textWidth });
    }
    
    const textHeight = doc.heightOfString(text, { width: textWidth });
    y += textHeight + (opts.marginBottom || 4);
  };

  const addDivider = () => {
    y += 6;
    doc.moveTo(leftMargin, y).lineTo(leftMargin + 520, y).strokeColor("#ccc").stroke();
    y += 12;
  };

  if (order.companyName) {
    addLine(order.companyName, { fontSize: 16, bold: true, align: "center", marginBottom: 6 });
  }
  if (order.companyAddress) {
    addLine(order.companyAddress, { fontSize: 9, align: "center", marginBottom: 4 });
  }
  if (order.companyPhone) {
    addLine(`Ph: ${order.companyPhone}`, { fontSize: 9, align: "center", marginBottom: 10 });
  }

  addDivider();

  addLine("TAX INVOICE", { fontSize: 14, bold: true, align: "center", marginBottom: 12 });

  addDivider();

  addLine(`Customer: ${order.customerName}${order.customerPhone ? `  |  ${order.customerPhone}` : ""}`, { fontSize: 10, marginBottom: 6 });
  addLine(`Invoice No: ${order.orderNo}     Date: ${order.createdAt}`, { fontSize: 10, marginBottom: 8 });

  addDivider();

  addLine("Items:", { fontSize: 11, bold: true, marginBottom: 8 });

  const colX = [leftMargin, leftMargin + 180, leftMargin + 280, leftMargin + 350, leftMargin + 420];
  const colW = [170, 90, 60, 60, 90];
  const headers = ["Product", "Qty", "MRP", "GST", "Net Amt"];

  doc.fontSize(8).font("Helvetica-Bold");
  headers.forEach((h, i) => doc.text(h, colX[i], y, { width: colW[i], align: i >= 2 ? "right" : "left" }));
  y += 14;

  doc.font("Helvetica").fontSize(8);
  for (const item of order.items) {
    if (y > 720) { doc.addPage(); y = 40; }
    doc.text(item.name || "", colX[0], y, { width: colW[0] });
    doc.text(String(item.qty || 0), colX[1], y, { width: colW[1], align: "right" });
    doc.text(String(item.mrp || 0), colX[2], y, { width: colW[2], align: "right" });
    doc.text(`${item.taxPercent || 0}%`, colX[3], y, { width: colW[3], align: "right" });
    doc.text(String(item.netAmount || 0), colX[4], y, { width: colW[4], align: "right" });
    y += 14;
  }

  addDivider();

  const totals: { label: string; value: string }[] = [];
  if (order.totalTaxAmount > 0) totals.push({ label: "Total GST", value: order.totalTaxAmount.toFixed(2) });
  if (order.additionalCharges?.length) {
    for (const ac of order.additionalCharges) totals.push({ label: ac.name, value: ac.amount.toFixed(2) });
  }
  if (order.totalDiscount > 0) totals.push({ label: "Discount", value: `-${order.totalDiscount.toFixed(2)}` });
  if (order.flatDiscountAmount > 0) totals.push({ label: "Flat Discount", value: `-${order.flatDiscountAmount.toFixed(2)}` });
  if (order.redeemCreditAmount > 0) {
    totals.push({ label: order.redeemCreditType === "CREDIT_NOTE" ? "Credit Discount" : "Advance Payment", value: `-${order.redeemCreditAmount.toFixed(2)}` });
  }
  if (order.roundOff > 0) totals.push({ label: "Round Off", value: order.roundOff.toFixed(2) });
  totals.push({ label: "TOTAL", value: `₹${order.totalAmount.toFixed(0)}` });

  doc.fontSize(9);
  for (const t of totals) {
    doc.font(t.label === "TOTAL" ? "Helvetica-Bold" : "Helvetica");
    doc.text(t.label, leftMargin, y, { width: 400 });
    doc.text(t.value, leftMargin + 400, y, { width: 120, align: "right" });
    y += 16;
  }

  y += 10;
  addDivider();
  addLine("Thank You For Shopping!", { fontSize: 11, bold: true, align: "center", marginBottom: 4 });

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on("finish", () => resolve(fileName));
    writeStream.on("error", reject);
  });
};