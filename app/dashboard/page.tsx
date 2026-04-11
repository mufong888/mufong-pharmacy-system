"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type MonthlyRow = {
  year: number;
  month: number;
  revenue: number;
  customer_count: number;
  avg_order_value: number;
  gross_profit: number;
};

type PosRow = {
  sale_date: string;
  product_name: string;
  qty: number;
  subtotal: number;
  gross_profit: number;
  line_type: string | null;
  note: string | null;
};

type ProductSummary = {
  name: string;
  qty: number;
  sales: number;
  profit: number;
};

type GrowthDisplay = {
  text: string;
  color: string;
  background: string;
  border: string;
  tone: "up" | "down" | "flat";
};

function formatCurrency(value: number) {
  return `NT$ ${Number(value || 0).toLocaleString()}`;
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString();
}

function getPreviousMonth(year: number, month: number) {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  return { start, end };
}

function growthDisplay(current: number, previous: number): GrowthDisplay {
  if (!previous) {
    return {
      text: "-",
      color: "#64748b",
      background: "#f8fafc",
      border: "#e5e7eb",
      tone: "flat",
    };
  }

  const diff = ((current - previous) / previous) * 100;

  // 台灣習慣：紅漲綠跌
  if (diff > 0) {
    return {
      text: `↑ ${diff.toFixed(1)}%`,
      color: "#dc2626",
      background: "#fef2f2",
      border: "#fecaca",
      tone: "up",
    };
  }

  if (diff < 0) {
    return {
      text: `↓ ${Math.abs(diff).toFixed(1)}%`,
      color: "#15803d",
      background: "#f0fdf4",
      border: "#bbf7d0",
      tone: "down",
    };
  }

  return {
    text: "→ 0%",
    color: "#64748b",
    background: "#f8fafc",
    border: "#e5e7eb",
    tone: "flat",
  };
}

function isPickupOnlyRow(row: PosRow) {
  return String(row.note || "").includes("寄庫提貨");
}

function shouldIncludeInProductStats(row: PosRow) {
  if (row.line_type === "points") return false;
  if (isPickupOnlyRow(row)) return false;
  return row.line_type === "sale" || row.line_type === "gift";
}

async function fetchAllPosRows(start: string, end: string) {
  const pageSize = 1000;
  let from = 0;
  let allRows: PosRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("pos_sales_lines")
      .select("sale_date, product_name, qty, subtotal, gross_profit, line_type, note")
      .gte("sale_date", start)
      .lt("sale_date", end)
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const batch = (data ?? []) as PosRow[];
    allRows = [...allRows, ...batch];

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

export default function DashboardPage() {
  const [latestMonth, setLatestMonth] = useState<MonthlyRow | null>(null);
  const [previousMonth, setPreviousMonth] = useState<MonthlyRow | null>(null);
  const [rows, setRows] = useState<PosRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      const { data: latestList, error: latestError } = await supabase
        .from("monthly_sales_summary")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1);

      if (latestError) throw latestError;

      const latest = (latestList && latestList[0]) as MonthlyRow | undefined;

      if (!latest) {
        setLatestMonth(null);
        setPreviousMonth(null);
        setRows([]);
        return;
      }

      setLatestMonth(latest);

      const prev = getPreviousMonth(latest.year, latest.month);

      const { data: prevData, error: prevError } = await supabase
        .from("monthly_sales_summary")
        .select("*")
        .eq("year", prev.year)
        .eq("month", prev.month)
        .maybeSingle();

      if (prevError) throw prevError;

      setPreviousMonth((prevData as MonthlyRow | null) ?? null);

      const { start, end } = getMonthRange(latest.year, latest.month);
      const posRows = await fetchAllPosRows(start, end);
      setRows(posRows);
    } catch (error: any) {
      alert(`Dashboard 讀取失敗：${error.message}`);
      setLatestMonth(null);
      setPreviousMonth(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const productSummary = useMemo<ProductSummary[]>(() => {
    const grouped = new Map<string, ProductSummary>();

    rows
      .filter(shouldIncludeInProductStats)
      .forEach((row) => {
        const key = row.product_name || "未命名商品";
        const qty = Number(row.qty || 0);
        const sales = Number(row.subtotal || 0);
        const profit = Number(row.gross_profit || 0);

        const existing = grouped.get(key);

        if (existing) {
          existing.qty += qty;
          existing.sales += sales;
          existing.profit += profit;
        } else {
          grouped.set(key, {
            name: key,
            qty,
            sales,
            profit,
          });
        }
      });

    return Array.from(grouped.values());
  }, [rows]);

  const topProfit = useMemo(() => {
    return [...productSummary].sort((a, b) => b.profit - a.profit).slice(0, 5);
  }, [productSummary]);

  const topQty = useMemo(() => {
    return [...productSummary].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [productSummary]);

  const lowProfitHighSales = useMemo(() => {
    return [...productSummary]
      .filter((item) => item.sales > 0)
      .map((item) => ({
        ...item,
        marginRate: item.sales > 0 ? (item.profit / item.sales) * 100 : 0,
      }))
      .filter((item) => item.sales >= 3000 && item.marginRate < 15)
      .sort((a, b) => a.marginRate - b.marginRate)
      .slice(0, 5);
  }, [productSummary]);

  const giftImpactProducts = useMemo(() => {
    const giftMap = new Map<string, number>();

    rows
      .filter((row) => row.line_type === "gift" && !isPickupOnlyRow(row))
      .forEach((row) => {
        const key = row.product_name || "未命名商品";
        giftMap.set(key, (giftMap.get(key) || 0) + Number(row.gross_profit || 0));
      });

    return Array.from(giftMap.entries())
      .map(([name, profit]) => ({ name, profit }))
      .sort((a, b) => a.profit - b.profit)
      .slice(0, 5);
  }, [rows]);

  const lastDate = useMemo(() => {
    if (!rows.length) return "-";
    return [...rows].map((r) => r.sale_date).sort().pop() || "-";
  }, [rows]);

  const monthTitle = latestMonth
    ? `${latestMonth.year} 年 ${latestMonth.month} 月經營總覽`
    : "經營總覽";

  const revenueGrowth = latestMonth
    ? growthDisplay(latestMonth.revenue, previousMonth?.revenue || 0)
    : null;

  const profitGrowth = latestMonth
    ? growthDisplay(latestMonth.gross_profit, previousMonth?.gross_profit || 0)
    : null;

  const customerGrowth = latestMonth
    ? growthDisplay(latestMonth.customer_count, previousMonth?.customer_count || 0)
    : null;

  const aovGrowth = latestMonth
    ? growthDisplay(latestMonth.avg_order_value, previousMonth?.avg_order_value || 0)
    : null;

  const kpiAlerts = useMemo(() => {
    if (!latestMonth || !previousMonth) return [];

    const alerts: string[] = [];

    const revenueDiff =
      previousMonth.revenue > 0
        ? ((latestMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100
        : 0;

    const profitDiff =
      previousMonth.gross_profit > 0
        ? ((latestMonth.gross_profit - previousMonth.gross_profit) / previousMonth.gross_profit) * 100
        : 0;

    const customerDiff =
      previousMonth.customer_count > 0
        ? ((latestMonth.customer_count - previousMonth.customer_count) / previousMonth.customer_count) * 100
        : 0;

    const aovDiff =
      previousMonth.avg_order_value > 0
        ? ((latestMonth.avg_order_value - previousMonth.avg_order_value) / previousMonth.avg_order_value) * 100
        : 0;

    if (revenueDiff <= -10) {
      alerts.push(`營業額較前月下降 ${Math.abs(revenueDiff).toFixed(1)}%，需要留意整體銷售動能。`);
    }

    if (profitDiff <= -10) {
      alerts.push(`毛利較前月下降 ${Math.abs(profitDiff).toFixed(1)}%，建議優先檢查贈品與低毛利商品。`);
    }

    if (customerDiff <= -10) {
      alerts.push(`來客數較前月下降 ${Math.abs(customerDiff).toFixed(1)}%，可留意來店動能是否轉弱。`);
    }

    if (aovDiff <= -10) {
      alerts.push(`客單價較前月下降 ${Math.abs(aovDiff).toFixed(1)}%，可觀察是否高單價商品占比下降。`);
    }

    if (giftImpactProducts.length > 0 && giftImpactProducts[0].profit < -3000) {
      alerts.push(`本月贈品對毛利影響較大，${giftImpactProducts[0].name} 影響最明顯。`);
    }

    return alerts;
  }, [latestMonth, previousMonth, giftImpactProducts]);

  return (
    <div style={{ padding: "32px" }}>
      <h1 style={pageTitleStyle}>📊 {monthTitle}</h1>
      <p style={pageDescStyle}>
        首頁固定顯示最近完成匯入的月份，不使用尚未結束的當月資料。
      </p>

      {loading ? (
        <div style={sectionStyle}>資料載入中...</div>
      ) : !latestMonth ? (
        <div style={sectionStyle}>目前尚無 monthly_sales_summary 資料。</div>
      ) : (
        <>
          <div style={infoBoxStyle}>
            目前 Dashboard 資料月份：{latestMonth.year} 年 {latestMonth.month} 月 ｜ 商品明細統計至：{lastDate}
          </div>

          {kpiAlerts.length > 0 && (
            <div style={alertSectionStyle}>
              <h2 style={alertTitleStyle}>🚨 KPI 異常提醒</h2>
              <div style={alertListStyle}>
                {kpiAlerts.map((alert, index) => (
                  <div key={index} style={alertItemStyle}>
                    {alert}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={summaryGridStyle}>
            <Card title="營業額" value={formatCurrency(latestMonth.revenue)} />
            <Card title="毛利" value={formatCurrency(latestMonth.gross_profit)} />
            <Card title="來客數" value={formatNumber(latestMonth.customer_count)} />
            <Card title="客單價" value={formatCurrency(latestMonth.avg_order_value)} />
          </div>

          <div style={{ ...sectionStyle, marginTop: "24px" }}>
            <h2 style={sectionTitleStyle}>📈 與前一月份比較</h2>
            <div style={compareGridStyle}>
              <CompareCard
                title="營業額"
                current={latestMonth.revenue}
                previous={previousMonth?.revenue || 0}
                display={revenueGrowth}
              />
              <CompareCard
                title="毛利"
                current={latestMonth.gross_profit}
                previous={previousMonth?.gross_profit || 0}
                display={profitGrowth}
              />
              <CompareCard
                title="來客數"
                current={latestMonth.customer_count}
                previous={previousMonth?.customer_count || 0}
                display={customerGrowth}
                isCurrency={false}
              />
              <CompareCard
                title="客單價"
                current={latestMonth.avg_order_value}
                previous={previousMonth?.avg_order_value || 0}
                display={aovGrowth}
              />
            </div>
          </div>

          <div style={dualGridStyle}>
            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>🔥 毛利 Top 5 商品</h2>
              {topProfit.length === 0 ? (
                <div style={emptyBoxStyle}>目前此月份尚無商品資料。</div>
              ) : (
                <RankList rows={topProfit} mode="profit" />
              )}
            </div>

            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>📦 銷售數量 Top 5 商品</h2>
              {topQty.length === 0 ? (
                <div style={emptyBoxStyle}>目前此月份尚無商品資料。</div>
              ) : (
                <RankList rows={topQty} mode="qty" />
              )}
            </div>
          </div>

          <div style={dualGridStyle}>
            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>⚠ 低毛利高銷售商品</h2>
              {lowProfitHighSales.length === 0 ? (
                <div style={emptyBoxStyle}>目前沒有明顯低毛利高銷售商品。</div>
              ) : (
                <div style={rankListStyle}>
                  {lowProfitHighSales.map((item, index) => (
                    <div key={`${item.name}-${index}`} style={warningItemStyle}>
                      <div>
                        <div style={rankNameStyle}>{item.name}</div>
                        <div style={rankSubStyle}>
                          銷售金額 {formatCurrency(item.sales)} ｜ 毛利 {formatCurrency(item.profit)}
                        </div>
                      </div>
                      <div style={warningValueStyle}>
                        毛利率 {item.marginRate.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>🎁 贈品影響毛利 Top 5</h2>
              {giftImpactProducts.length === 0 ? (
                <div style={emptyBoxStyle}>目前沒有贈品毛利影響資料。</div>
              ) : (
                <div style={rankListStyle}>
                  {giftImpactProducts.map((item, index) => (
                    <div key={`${item.name}-${index}`} style={warningItemStyle}>
                      <div>
                        <div style={rankNameStyle}>{item.name}</div>
                        <div style={rankSubStyle}>贈品造成的毛利影響</div>
                      </div>
                      <div style={dangerValueStyle}>
                        {formatCurrency(item.profit)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div style={cardStyle}>
      <p style={labelStyle}>{title}</p>
      <h2 style={valueStyle}>{value}</h2>
    </div>
  );
}

function CompareCard({
  title,
  current,
  previous,
  display,
  isCurrency = true,
}: {
  title: string;
  current: number;
  previous: number;
  display: GrowthDisplay | null;
  isCurrency?: boolean;
}) {
  const currentText = isCurrency ? formatCurrency(current) : formatNumber(current);
  const previousText = isCurrency ? formatCurrency(previous) : formatNumber(previous);

  return (
    <div
      style={{
        ...compareCardStyle,
        background: display?.background || "#f8fafc",
        border: `1px solid ${display?.border || "#e5e7eb"}`,
      }}
    >
      <div style={compareTitleStyle}>{title}</div>
      <div style={compareValueStyle}>{currentText}</div>
      <div style={compareSubStyle}>
        前月：{previousText} ｜{" "}
        <span style={{ color: display?.color || "#64748b", fontWeight: "bold" }}>
          {display?.text || "-"}
        </span>
      </div>
    </div>
  );
}

function RankList({
  rows,
  mode,
}: {
  rows: ProductSummary[];
  mode: "profit" | "qty";
}) {
  return (
    <div style={rankListStyle}>
      {rows.map((row, index) => (
        <div key={`${row.name}-${index}`} style={rankItemStyle}>
          <div style={rankLeftStyle}>
            <span style={rankBadgeStyle}>{index + 1}</span>
            <div>
              <div style={rankNameStyle}>{row.name}</div>
              <div style={rankSubStyle}>
                銷售金額 {formatCurrency(row.sales)} ｜ 毛利 {formatCurrency(row.profit)}
              </div>
            </div>
          </div>

          <div style={rankRightStyle}>
            {mode === "profit" ? formatCurrency(row.profit) : formatNumber(row.qty)}
          </div>
        </div>
      ))}
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

const alertSectionStyle = {
  background: "#fff7ed",
  border: "1px solid #fdba74",
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "20px",
};

const alertTitleStyle = {
  fontSize: "22px",
  fontWeight: "bold" as const,
  color: "#9a3412",
  marginBottom: "14px",
};

const alertListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "10px",
};

const alertItemStyle = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "12px 14px",
  color: "#7c2d12",
  lineHeight: 1.7,
};

const sectionStyle = {
  background: "#ffffff",
  borderRadius: "24px",
  padding: "28px",
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "20px",
};

const compareGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "16px",
};

const dualGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginTop: "24px",
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

const sectionTitleStyle = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  marginBottom: "20px",
  color: "#1f3b4d",
};

const compareCardStyle = {
  borderRadius: "16px",
  padding: "18px",
};

const compareTitleStyle = {
  fontSize: "15px",
  color: "#64748b",
  marginBottom: "8px",
};

const compareValueStyle = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#1f3b4d",
};

const compareSubStyle = {
  fontSize: "14px",
  color: "#64748b",
  marginTop: "8px",
};

const emptyBoxStyle = {
  padding: "24px",
  background: "#f8fafc",
  borderRadius: "16px",
  color: "#64748b",
  fontSize: "15px",
};

const rankListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "12px",
};

const rankItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 18px",
  background: "#f8fafc",
  borderRadius: "16px",
};

const warningItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 18px",
  background: "#f8fafc",
  borderRadius: "16px",
  gap: "16px",
};

const rankLeftStyle = {
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

const rankNameStyle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#1f3b4d",
};

const rankSubStyle = {
  fontSize: "14px",
  color: "#6b7280",
  marginTop: "4px",
};

const rankRightStyle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#84a59d",
};

const warningValueStyle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#b45309",
  whiteSpace: "nowrap" as const,
};

const dangerValueStyle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#dc2626",
  whiteSpace: "nowrap" as const,
};