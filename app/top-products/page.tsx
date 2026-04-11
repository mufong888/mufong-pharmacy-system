"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type PosSalesLine = {
  sale_date: string;
  product_code: string | null;
  product_name: string;
  qty: number;
  subtotal: number;
  gross_profit: number;
  line_type: string | null;
  note?: string | null;
};

type ProductSummaryRow = {
  rank: number;
  productCode: string | null;
  productName: string;
  quantity: number;
  salesAmount: number;
  grossProfit: number;
};

type Mode = "monthly" | "yearly";

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => currentYear - 3 + i);
}

function isPickupOnlyRow(row: PosSalesLine) {
  const note = String(row.note || "");
  return note.includes("寄庫提貨");
}

function shouldIncludeInRanking(row: PosSalesLine) {
  if (row.line_type === "points") return false;
  if (isPickupOnlyRow(row)) return false;
  return row.line_type === "sale" || row.line_type === "gift";
}

export default function TopProductsPage() {
  const now = new Date();

  const [mode, setMode] = useState<Mode>("monthly");
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [allRows, setAllRows] = useState<PosSalesLine[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPagedRows(startDate: string, endDate: string) {
    const pageSize = 1000;
    let from = 0;
    let rows: PosSalesLine[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("pos_sales_lines")
        .select(
          "sale_date, product_code, product_name, qty, subtotal, gross_profit, line_type, note"
        )
        .gte("sale_date", startDate)
        .lt("sale_date", endDate)
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const batch = (data ?? []) as PosSalesLine[];
      rows = [...rows, ...batch];

      if (batch.length < pageSize) break;
      from += pageSize;
    }

    return rows;
  }

  async function fetchRows() {
    try {
      setLoading(true);

      const startDate =
        mode === "monthly"
          ? `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
          : `${selectedYear}-01-01`;

      const endDate =
        mode === "monthly"
          ? selectedMonth === 12
            ? `${selectedYear + 1}-01-01`
            : `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`
          : `${selectedYear + 1}-01-01`;

      const data = await fetchPagedRows(startDate, endDate);
      setAllRows(data);
    } catch (error: any) {
      alert(`讀取商品排行資料失敗：${error.message}`);
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
  }, [mode, selectedYear, selectedMonth]);

  const rankingRows = useMemo(() => {
    return allRows.filter(shouldIncludeInRanking);
  }, [allRows]);

  const summary = useMemo<ProductSummaryRow[]>(() => {
    const grouped = new Map<
      string,
      {
        productCode: string | null;
        productName: string;
        quantity: number;
        salesAmount: number;
        grossProfit: number;
      }
    >();

    rankingRows.forEach((row) => {
      const key = `${row.product_code ?? ""}__${row.product_name}`;
      const quantity = Number(row.qty || 0);
      const salesAmount = Number(row.subtotal || 0);
      const grossProfit = Number(row.gross_profit || 0);

      const existing = grouped.get(key);

      if (existing) {
        existing.quantity += quantity;
        existing.salesAmount += salesAmount;
        existing.grossProfit += grossProfit;
      } else {
        grouped.set(key, {
          productCode: row.product_code ?? null,
          productName: row.product_name,
          quantity,
          salesAmount,
          grossProfit,
        });
      }
    });

    return Array.from(grouped.values())
      .sort((a, b) => {
        if (b.grossProfit !== a.grossProfit) {
          return b.grossProfit - a.grossProfit;
        }

        if (b.salesAmount !== a.salesAmount) {
          return b.salesAmount - a.salesAmount;
        }

        return b.quantity - a.quantity;
      })
      .map((item, index) => ({
        rank: index + 1,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        salesAmount: item.salesAmount,
        grossProfit: item.grossProfit,
      }));
  }, [rankingRows]);

  const top10 = summary.slice(0, 10);

  const totalProducts = summary.length;
  const totalQuantity = summary.reduce((sum, item) => sum + item.quantity, 0);
  const totalSalesAmount = summary.reduce(
    (sum, item) => sum + item.salesAmount,
    0
  );

  const totalGrossProfit = allRows.reduce(
    (sum, row) => sum + Number(row.gross_profit || 0),
    0
  );

  const saleGiftGrossProfit = rankingRows.reduce(
    (sum, row) => sum + Number(row.gross_profit || 0),
    0
  );

  const giftGrossProfit = allRows
    .filter((row) => row.line_type === "gift" && !isPickupOnlyRow(row))
    .reduce((sum, row) => sum + Number(row.gross_profit || 0), 0);

  const title =
    mode === "monthly"
      ? `📦 ${selectedYear} 年 ${selectedMonth} 月商品毛利排行`
      : `📦 ${selectedYear} 年度商品毛利排行`;

  const desc =
    mode === "monthly"
      ? "排行已納入 sale + gift，排除集點與寄庫提貨。贈品會算數量，也會扣毛利。"
      : "排行已納入 sale + gift，排除集點與寄庫提貨。贈品會算數量，也會扣毛利。";

  return (
    <div style={{ padding: "32px" }}>
      <h1 style={pageTitleStyle}>{title}</h1>
      <p style={pageDescStyle}>{desc}</p>

      <div style={filterBarStyle}>
        <div style={filterItemStyle}>
          <label style={filterLabelStyle}>模式</label>
          <select
            style={selectStyle}
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="monthly">月排行</option>
            <option value="yearly">年排行</option>
          </select>
        </div>

        <div style={filterItemStyle}>
          <label style={filterLabelStyle}>年份</label>
          <select
            style={selectStyle}
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {getYearOptions().map((year) => (
              <option key={year} value={year}>
                {year} 年
              </option>
            ))}
          </select>
        </div>

        {mode === "monthly" && (
          <div style={filterItemStyle}>
            <label style={filterLabelStyle}>月份</label>
            <select
              style={selectStyle}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {month} 月
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={infoBoxStyle}>
        全部明細毛利：NT$ {totalGrossProfit.toLocaleString()} ｜ 排行統計毛利（sale + gift）：NT${" "}
        {saleGiftGrossProfit.toLocaleString()} ｜ 贈品毛利影響：NT${" "}
        {giftGrossProfit.toLocaleString()}
      </div>

      <div style={summaryGridStyle}>
        <div style={cardStyle}>
          <p style={labelStyle}>商品總數</p>
          <h2 style={valueStyle}>{totalProducts}</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>總銷售數量</p>
          <h2 style={valueStyle}>{totalQuantity.toLocaleString()}</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>總銷售金額</p>
          <h2 style={valueStyle}>NT$ {totalSalesAmount.toLocaleString()}</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>總毛利</p>
          <h2 style={valueStyle}>NT$ {totalGrossProfit.toLocaleString()}</h2>
        </div>
      </div>

      <div style={grid2Style}>
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>🔥 Top 10 毛利商品</h2>

          {loading ? (
            <p style={loadingTextStyle}>資料載入中...</p>
          ) : top10.length === 0 ? (
            <div style={emptyBoxStyle}>目前此區間尚無商品銷售資料</div>
          ) : (
            <div style={rankingListStyle}>
              {top10.map((item) => (
                <div
                  key={`${item.productCode ?? "no-code"}-${item.productName}-${item.rank}`}
                  style={rankingItemStyle}
                >
                  <div style={rankingLeftStyle}>
                    <span style={rankBadgeStyle}>{item.rank}</span>
                    <div>
                      <div style={rankingNameStyle}>{item.productName}</div>
                      <div style={rankingSubStyle}>
                        {item.productCode ? `商品編號 ${item.productCode} ｜ ` : ""}
                        銷售數量 {item.quantity.toLocaleString()} ｜ 銷售金額 NT${" "}
                        {item.salesAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div style={rankingRightStyle}>
                    NT$ {item.grossProfit.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>📊 Top 10 毛利佔比</h2>

          {loading ? (
            <p style={loadingTextStyle}>資料載入中...</p>
          ) : top10.length === 0 ? (
            <div style={emptyBoxStyle}>目前此區間尚無商品毛利資料</div>
          ) : (
            <div style={rankingListStyle}>
              {top10.map((item) => {
                const ratio =
                  totalGrossProfit > 0
                    ? (item.grossProfit / totalGrossProfit) * 100
                    : 0;

                return (
                  <div
                    key={`${item.productCode ?? "no-code"}-${item.productName}-bar`}
                    style={{ marginBottom: "18px" }}
                  >
                    <div style={barLabelRowStyle}>
                      <span style={barNameStyle}>{item.productName}</span>
                      <span style={barValueStyle}>{ratio.toFixed(1)}%</span>
                    </div>
                    <div style={barTrackStyle}>
                      <div
                        style={{
                          ...barFillStyle,
                          width: `${Math.min(ratio, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>商品銷售完整排行</h2>

        {loading ? (
          <p style={loadingTextStyle}>資料載入中...</p>
        ) : summary.length === 0 ? (
          <div style={emptyBoxStyle}>目前此區間尚無商品銷售資料</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>排名</th>
                  <th style={thStyle}>商品編號</th>
                  <th style={thStyle}>商品名稱</th>
                  <th style={thStyle}>銷售數量</th>
                  <th style={thStyle}>銷售金額</th>
                  <th style={thStyle}>毛利</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((item) => (
                  <tr
                    key={`${item.productCode ?? "no-code"}-${item.productName}-row`}
                  >
                    <td style={tdStyle}>{item.rank}</td>
                    <td style={tdStyle}>{item.productCode || "-"}</td>
                    <td style={tdStyle}>{item.productName}</td>
                    <td style={tdStyle}>{item.quantity.toLocaleString()}</td>
                    <td style={tdStyle}>NT$ {item.salesAmount.toLocaleString()}</td>
                    <td style={tdHighlightStyle}>
                      NT$ {item.grossProfit.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const pageTitleStyle = {
  fontSize: "36px",
  fontWeight: "bold" as const,
  marginBottom: "12px",
  color: "#1f3b4d",
};

const pageDescStyle = {
  fontSize: "18px",
  color: "#6b7280",
  marginBottom: "24px",
};

const infoBoxStyle = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px 16px",
  marginBottom: "20px",
  color: "#334155",
};

const filterBarStyle = {
  display: "flex",
  gap: "16px",
  marginBottom: "24px",
  flexWrap: "wrap" as const,
};

const filterItemStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const filterLabelStyle = {
  fontSize: "14px",
  color: "#6b7280",
  fontWeight: "bold" as const,
};

const selectStyle = {
  padding: "12px 14px",
  border: "1px solid #dbe4e8",
  borderRadius: "12px",
  fontSize: "15px",
  outline: "none",
  background: "#fff",
  minWidth: "140px",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "20px",
  marginBottom: "32px",
};

const grid2Style = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginBottom: "28px",
};

const cardStyle = {
  background: "#ffffff",
  borderRadius: "20px",
  padding: "24px",
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
};

const labelStyle = {
  fontSize: "16px",
  color: "#7b9aa5",
  marginBottom: "12px",
};

const valueStyle = {
  fontSize: "32px",
  fontWeight: "bold" as const,
  color: "#1f3b4d",
};

const sectionStyle = {
  background: "#ffffff",
  borderRadius: "24px",
  padding: "28px",
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
};

const sectionTitleStyle = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  marginBottom: "20px",
  color: "#1f3b4d",
};

const loadingTextStyle = {
  color: "#6b7280",
  fontSize: "15px",
};

const emptyBoxStyle = {
  padding: "24px",
  background: "#f8fafc",
  borderRadius: "16px",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.8,
};

const rankingListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "14px",
};

const rankingItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 18px",
  background: "#f8fafc",
  borderRadius: "16px",
};

const rankingLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const rankBadgeStyle = {
  minWidth: "34px",
  height: "34px",
  borderRadius: "999px",
  background: "#84a59d",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold" as const,
  fontSize: "14px",
};

const rankingNameStyle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#1f3b4d",
};

const rankingSubStyle = {
  fontSize: "14px",
  color: "#6b7280",
  marginTop: "4px",
};

const rankingRightStyle = {
  fontSize: "20px",
  fontWeight: "bold" as const,
  color: "#84a59d",
};

const barLabelRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "8px",
  gap: "12px",
};

const barNameStyle = {
  fontSize: "15px",
  color: "#334155",
};

const barValueStyle = {
  fontSize: "15px",
  fontWeight: "bold" as const,
  color: "#1f3b4d",
};

const barTrackStyle = {
  width: "100%",
  height: "12px",
  background: "#e5eef0",
  borderRadius: "999px",
  overflow: "hidden",
};

const barFillStyle = {
  height: "100%",
  background: "#84a59d",
  borderRadius: "999px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: "1000px",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "14px 10px",
  borderBottom: "1px solid #e5e7eb",
  color: "#6b7280",
  fontWeight: "bold" as const,
  background: "#f8fafc",
};

const tdStyle = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#334155",
  verticalAlign: "middle" as const,
};

const tdHighlightStyle = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#1f3b4d",
  fontWeight: "bold" as const,
  verticalAlign: "middle" as const,
};