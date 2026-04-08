export type MonthlySummaryRow = {
  year: number;
  month: number;
  revenue: number;
  customer_count: number;
  avg_order_value: number;
  gross_profit: number;
  card_amount: number;
  voucher_amount: number;
  cash_received: number;
  cash_diff: number;
};

function toNumber(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = String(value).replace(/,/g, "").replace(/"/g, "").trim();
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

function stripQuotes(value: string | undefined): string {
  return String(value ?? "").replace(/^"+|"+$/g, "").trim();
}

export function parseMonthlySummaryCsv(csvText: string): MonthlySummaryRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const results: MonthlySummaryRow[] = [];

  for (const line of lines) {
    // 這份報表每行其實都帶了一整串固定欄位
    // 我們直接抓出所有雙引號內容與數字欄位
    const matches = line.match(/"[^"]*"|[^,]+/g);
    if (!matches) continue;

    const cols = matches.map((x) => stripQuotes(x));

    // 尋找像 202601 這種月份欄位
    const ymIndex = cols.findIndex((c) => /^\d{6}$/.test(c));
    if (ymIndex === -1) continue;

    const ym = cols[ymIndex];
    const year = Number(ym.slice(0, 4));
    const month = Number(ym.slice(4, 6));

    // 年報表欄位順序：
    // 202601, 營業額, 來客數, 客單價, 毛利, 刷卡金額, 禮券金額, 實收現金, 現金盈虧
    const revenue = toNumber(cols[ymIndex + 1]);
    const customer_count = Math.round(toNumber(cols[ymIndex + 2]));
    const avg_order_value = toNumber(cols[ymIndex + 3]);
    const gross_profit = toNumber(cols[ymIndex + 4]);
    const card_amount = toNumber(cols[ymIndex + 5]);
    const voucher_amount = toNumber(cols[ymIndex + 6]);
    const cash_received = toNumber(cols[ymIndex + 7]);
    const cash_diff = toNumber(cols[ymIndex + 8]);

    if (!year || !month) continue;
    if (month < 1 || month > 12) continue;

    const exists = results.some((r) => r.year === year && r.month === month);
    if (exists) continue;

    results.push({
      year,
      month,
      revenue,
      customer_count,
      avg_order_value,
      gross_profit,
      card_amount,
      voucher_amount,
      cash_received,
      cash_diff,
    });
  }

  return results.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}