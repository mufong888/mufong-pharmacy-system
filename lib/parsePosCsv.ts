export type PosSaleLine = {
  sale_date: string;
  sale_time: string | null;
  sale_datetime: string | null;

  order_no: string;
  terminal_no: string | null;
  shift_name: string | null;

  emp_code: string | null;
  emp_name: string | null;

  customer_code: string | null;
  customer_name: string | null;

  payment_method: string | null;
  order_amount: number | null;

  line_no: string | null;
  product_code: string;
  product_name: string;
  unit: string | null;

  qty: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
  gross_profit: number;

  note: string | null;
  line_type: "sale" | "points" | "gift" | "expense" | "other";
  exclude_from_sales: boolean;
  is_gift: boolean;

  raw_header_text: string;
  raw_product_text: string;
};

function parseNumber(value: string | number | undefined | null): number {
  if (value === null || value === undefined) return 0;
  const str = String(value).replace(/,/g, "").trim();
  if (!str) return 0;
  const num = Number(str);
  return Number.isFinite(num) ? num : 0;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((s) => s.trim());
}

function parseHeaderText(headerText: string) {
  const clean = headerText.replace(/\s+/g, " ").trim();

  const dateTimeMatch = clean.match(/日期:(\d{8})-(\d{2}:\d{2})/);
  const orderNoMatch = clean.match(/單號:(\d+)/);
  const terminalMatch = clean.match(/台號:(\d+)/);
  const shiftMatch = clean.match(/(\d+班)/);
  const empMatch = clean.match(/Emp:(\d+)([^\s]+)/);
  const custMatch = clean.match(/Cust:(\d+)([^\s]+)/);
  const amountMatch = clean.match(/金額：\s*([0-9,]+(?:\.\d+)?)/);
  const paymentMatch = clean.match(
    /(現金|刷卡|Line Pay|LINE Pay|Apple Pay|Google Pay|轉帳|支付寶|微信支付)/
  );

  let saleDate: string | null = null;
  let saleTime: string | null = null;
  let saleDatetime: string | null = null;

  if (dateTimeMatch) {
    const y = dateTimeMatch[1].slice(0, 4);
    const m = dateTimeMatch[1].slice(4, 6);
    const d = dateTimeMatch[1].slice(6, 8);
    saleDate = `${y}-${m}-${d}`;
    saleTime = dateTimeMatch[2];
    saleDatetime = `${saleDate}T${saleTime}:00`;
  }

  return {
    sale_date: saleDate,
    sale_time: saleTime,
    sale_datetime: saleDatetime,
    order_no: orderNoMatch?.[1] ?? null,
    terminal_no: terminalMatch?.[1] ?? null,
    shift_name: shiftMatch?.[1] ?? null,
    emp_code: empMatch?.[1] ?? null,
    emp_name: empMatch?.[2] ?? null,
    customer_code: custMatch?.[1] ?? null,
    customer_name: custMatch?.[2] ?? null,
    payment_method: paymentMatch?.[1] ?? null,
    order_amount: amountMatch ? parseNumber(amountMatch[1]) : null,
    raw_header_text: headerText,
  };
}

function parseProductField(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  const match = clean.match(/^([A-Z0-9]+)\s+(.+)$/);

  if (match) {
    return {
      product_code: match[1].trim(),
      product_name: match[2].trim(),
    };
  }

  return {
    product_code: clean,
    product_name: clean,
  };
}

function getLineType(
  productCode: string,
  productName: string,
  note: string | null
) {
  if (productCode === "FZZ120" || productName.includes("集點")) {
    return {
      line_type: "points" as const,
      exclude_from_sales: true,
      is_gift: false,
    };
  }

  if (productCode === "FZZ995" || productName.includes("櫃外支出")) {
    return {
      line_type: "expense" as const,
      exclude_from_sales: true,
      is_gift: false,
    };
  }

  if ((note || "").includes("贈品")) {
    return {
      line_type: "gift" as const,
      exclude_from_sales: true,
      is_gift: true,
    };
  }

  return {
    line_type: "sale" as const,
    exclude_from_sales: false,
    is_gift: false,
  };
}

export function parsePosCsv(csvText: string): PosSaleLine[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const result: PosSaleLine[] = [];

  for (const line of lines) {
    const cols = parseCsvLine(line);

    if (cols.length < 19) continue;

    const headerText = cols[9] || "";
    const lineNo = cols[10] || null;
    const productField = cols[11] || "";
    const unit = cols[12] || null;
    const qty = parseNumber(cols[13]);
    const unitPrice = parseNumber(cols[14]);
    const unitCost = parseNumber(cols[15]);
    const subtotal = parseNumber(cols[16]);
    const grossProfit = parseNumber(cols[17]);
    const note = cols[18] || null;

    if (!headerText.includes("日期:") || !headerText.includes("單號:")) continue;
    if (!productField) continue;

    const header = parseHeaderText(headerText);
    const product = parseProductField(productField);
    const lineFlags = getLineType(product.product_code, product.product_name, note);

    if (!header.sale_date || !header.order_no) continue;

    result.push({
      sale_date: header.sale_date,
      sale_time: header.sale_time,
      sale_datetime: header.sale_datetime,

      order_no: header.order_no,
      terminal_no: header.terminal_no,
      shift_name: header.shift_name,

      emp_code: header.emp_code,
      emp_name: header.emp_name,

      customer_code: header.customer_code,
      customer_name: header.customer_name,

      payment_method: header.payment_method,
      order_amount: header.order_amount,

      line_no: lineNo,
      product_code: product.product_code,
      product_name: product.product_name,
      unit,

      qty,
      unit_price: unitPrice,
      unit_cost: unitCost,
      subtotal,
      gross_profit: grossProfit,

      note,
      line_type: lineFlags.line_type,
      exclude_from_sales: lineFlags.exclude_from_sales,
      is_gift: lineFlags.is_gift,

      raw_header_text: header.raw_header_text,
      raw_product_text: productField,
    });
  }

  return result;
}