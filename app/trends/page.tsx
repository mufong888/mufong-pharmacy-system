"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type MonthlySalesSummaryRow = {
  id: string;
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
  rx_general_count: number;
  rx_chronic_count: number;
  source_file_name?: string | null;
  imported_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type MonthlyPrescriptionRow = {
  year: number;
  month: number;
  general_rx: number;
  chronic_rx: number;
  note?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDecimal(value: number, digits = 2) {
  return new Intl.NumberFormat("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value || 0);
}

function getPercentChange(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function getDiffText(current: number, previous?: number) {
  if (previous === undefined || previous === null) return "—";

  const diff = current - previous;
  const percent = getPercentChange(current, previous);

  const sign = diff > 0 ? "+" : diff < 0 ? "" : "";
  const percentText = percent === null ? "—" : `${sign}${percent.toFixed(1)}%`;

  return `${sign}${formatNumber(diff)}（${percentText}）`;
}

function getDiffColor(current: number, previous?: number) {
  if (previous === undefined || previous === null) return "#607d8b";

  const diff = current - previous;
  if (diff > 0) return "#2e7d32";
  if (diff < 0) return "#c62828";
  return "#607d8b";
}

function getMonthLabel(month: number) {
  return `${String(month).padStart(2, "0")} 月`;
}

function buildPrescriptionMap(rows: MonthlyPrescriptionRow[]) {
  const map = new Map<string, MonthlyPrescriptionRow>();

  rows.forEach((row) => {
    map.set(`${row.year}-${row.month}`, {
      year: row.year,
      month: row.month,
      general_rx: Number(row.general_rx || 0),
      chronic_rx: Number(row.chronic_rx || 0),
      note: row.note ?? "",
    });
  });

  return map;
}

export default function TrendsPage() {
  const [rows, setRows] = useState<MonthlySalesSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  useEffect(() => {
    fetchMonthlySalesSummary();
  }, []);

  async function fetchMonthlySalesSummary() {
    setLoading(true);

    const [summaryRes, prescriptionRes] = await Promise.all([
      supabase
        .from("monthly_sales_summary")
        .select("*")
        .order("year", { ascending: true })
        .order("month", { ascending: true }),
      supabase
        .from("monthly_prescriptions")
        .select("year, month, general_rx, chronic_rx, note"),
    ]);

    if (summaryRes.error) {
      console.error("讀取 monthly_sales_summary 失敗：", summaryRes.error);
      setRows([]);
      setLoading(false);
      return;
    }

    if (prescriptionRes.error) {
      console.error("讀取 monthly_prescriptions 失敗：", prescriptionRes.error);
    }

    const prescriptionMap = buildPrescriptionMap(
      (prescriptionRes.data || []) as MonthlyPrescriptionRow[]
    );

    const result = (summaryRes.data || []).map((row: any) => {
      const key = `${row.year}-${row.month}`;
      const prescription = prescriptionMap.get(key);

      const mergedGeneral = prescription
        ? Number(prescription.general_rx || 0)
        : Number(row.rx_general_count || 0);

      const mergedChronic = prescription
        ? Number(prescription.chronic_rx || 0)
        : Number(row.rx_chronic_count || 0);

      return {
        ...row,
        revenue: Number(row.revenue || 0),
        customer_count: Number(row.customer_count || 0),
        avg_order_value: Number(row.avg_order_value || 0),
        gross_profit: Number(row.gross_profit || 0),
        card_amount: Number(row.card_amount || 0),
        voucher_amount: Number(row.voucher_amount || 0),
        cash_received: Number(row.cash_received || 0),
        cash_diff: Number(row.cash_diff || 0),
        rx_general_count: mergedGeneral,
        rx_chronic_count: mergedChronic,
      };
    }) as MonthlySalesSummaryRow[];

    setRows(result);

    if (result.length > 0) {
      const latest = result[result.length - 1];
      setSelectedYear(latest.year);
      setSelectedMonth(latest.month);
    }

    setLoading(false);
  }

  const allYears = useMemo(() => {
    return [...new Set(rows.map((row) => row.year))].sort((a, b) => a - b);
  }, [rows]);

  const currentYearRows = useMemo(() => {
    return rows
      .filter((row) => row.year === selectedYear)
      .sort((a, b) => a.month - b.month);
  }, [rows, selectedYear]);

  const currentData = useMemo(() => {
    return rows.find((row) => row.year === selectedYear && row.month === selectedMonth);
  }, [rows, selectedYear, selectedMonth]);

  const previousMonthData = useMemo(() => {
    let prevYear = selectedYear;
    let prevMonth = selectedMonth - 1;

    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }

    return rows.find((row) => row.year === prevYear && row.month === prevMonth);
  }, [rows, selectedYear, selectedMonth]);

  const sameMonthLastYearData = useMemo(() => {
    return rows.find(
      (row) => row.year === selectedYear - 1 && row.month === selectedMonth
    );
  }, [rows, selectedYear, selectedMonth]);

  const yearlySummary = useMemo(() => {
    const totalRevenue = currentYearRows.reduce((sum, row) => sum + row.revenue, 0);
    const totalCustomers = currentYearRows.reduce((sum, row) => sum + row.customer_count, 0);
    const totalGrossProfit = currentYearRows.reduce((sum, row) => sum + row.gross_profit, 0);
    const totalRxGeneral = currentYearRows.reduce((sum, row) => sum + row.rx_general_count, 0);
    const totalRxChronic = currentYearRows.reduce((sum, row) => sum + row.rx_chronic_count, 0);
    const totalRx = totalRxGeneral + totalRxChronic;

    return {
      totalRevenue,
      totalCustomers,
      totalGrossProfit,
      totalRxGeneral,
      totalRxChronic,
      totalRx,
      avgRevenue: currentYearRows.length ? totalRevenue / currentYearRows.length : 0,
      avgCustomers: currentYearRows.length ? totalCustomers / currentYearRows.length : 0,
      avgGrossProfit: currentYearRows.length ? totalGrossProfit / currentYearRows.length : 0,
    };
  }, [currentYearRows]);

  if (loading) {
    return (
      <div style={{ padding: "24px", background: "#f7fbfa", minHeight: "100vh" }}>
        <h1 style={{ fontSize: "30px", margin: 0, color: "#2f3e3e", fontWeight: 700 }}>
          趨勢分析
        </h1>
        <div style={panelStyle}>載入中...</div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div style={{ padding: "24px", background: "#f7fbfa", minHeight: "100vh" }}>
        <h1 style={{ fontSize: "30px", margin: 0, color: "#2f3e3e", fontWeight: 700 }}>
          趨勢分析
        </h1>
        <div style={panelStyle}>
          目前沒有 monthly_sales_summary 資料，請先到「每月彙總匯入」匯入 CSV。
        </div>
      </div>
    );
  }

  if (!currentData) {
    return (
      <div style={{ padding: "24px", background: "#f7fbfa", minHeight: "100vh" }}>
        <h1 style={{ fontSize: "30px", margin: 0, color: "#2f3e3e", fontWeight: 700 }}>
          趨勢分析
        </h1>
        <div style={panelStyle}>找不到所選月份資料。</div>
      </div>
    );
  }

  const currentRxTotal =
    Number(currentData.rx_general_count || 0) + Number(currentData.rx_chronic_count || 0);

  const prevRxTotal =
    Number(previousMonthData?.rx_general_count || 0) +
    Number(previousMonthData?.rx_chronic_count || 0);

  const lastYearRxTotal =
    Number(sameMonthLastYearData?.rx_general_count || 0) +
    Number(sameMonthLastYearData?.rx_chronic_count || 0);

  const margin =
    currentData.revenue > 0 ? (currentData.gross_profit / currentData.revenue) * 100 : 0;

  const revenueChartData = currentYearRows.map((row) => ({
    label: getMonthLabel(row.month),
    value: row.revenue,
  }));

  const grossProfitChartData = currentYearRows.map((row) => ({
    label: getMonthLabel(row.month),
    value: row.gross_profit,
  }));

  const customerChartData = currentYearRows.map((row) => ({
    label: getMonthLabel(row.month),
    value: row.customer_count,
  }));

  const rxChartData = currentYearRows.map((row) => ({
    label: getMonthLabel(row.month),
    value: Number(row.rx_general_count || 0) + Number(row.rx_chronic_count || 0),
  }));

  return (
    <div style={{ padding: "24px", background: "#f7fbfa", minHeight: "100vh" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "30px", margin: 0, color: "#2f3e3e", fontWeight: 700 }}>
          趨勢分析
        </h1>
        <p style={{ marginTop: "8px", color: "#5b6b6b", fontSize: "15px" }}>
          以整間店為單位，查看每月營業額、毛利、來客數與處方變化
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "20px",
          background: "#ffffff",
          border: "1px solid #d8ece8",
          borderRadius: "16px",
          padding: "16px",
        }}
      >
        <div>
          <div style={{ fontSize: "13px", color: "#6c7a7a", marginBottom: "6px" }}>年份</div>
          <select
            value={selectedYear}
            onChange={(e) => {
              const year = Number(e.target.value);
              setSelectedYear(year);

              const targetRows = rows
                .filter((row) => row.year === year)
                .sort((a, b) => a.month - b.month);

              if (!targetRows.find((row) => row.month === selectedMonth) && targetRows.length > 0) {
                setSelectedMonth(targetRows[targetRows.length - 1].month);
              }
            }}
            style={selectStyle}
          >
            {allYears.map((year) => (
              <option key={year} value={year}>
                {year} 年
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: "13px", color: "#6c7a7a", marginBottom: "6px" }}>月份</div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={selectStyle}
          >
            {currentYearRows.map((row) => (
              <option key={`${row.year}-${row.month}`} value={row.month}>
                {row.year} 年 {String(row.month).padStart(2, "0")} 月
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "end",
            color: "#2f3e3e",
            fontWeight: 600,
            fontSize: "18px",
            paddingBottom: "10px",
          }}
        >
          目前查看：{selectedYear} 年 {String(selectedMonth).padStart(2, "0")} 月
        </div>
      </div>

      <div style={rxPanelStyle}>
        <div style={{ marginBottom: "14px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", color: "#2f3e3e" }}>本月處方資料</h2>
          <p style={{ margin: "6px 0 0 0", color: "#6a7a7a", fontSize: "14px" }}>
            此頁僅顯示處方資料，請到「處方輸入」頁進行修改
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            alignItems: "end",
          }}
        >
          <div>
            <div style={inputLabelStyle}>一般箋</div>
            <div style={readonlyStatStyle}>{formatNumber(currentData.rx_general_count)} 張</div>
          </div>

          <div>
            <div style={inputLabelStyle}>慢性箋</div>
            <div style={readonlyStatStyle}>{formatNumber(currentData.rx_chronic_count)} 張</div>
          </div>

          <div>
            <div style={inputLabelStyle}>處方總數</div>
            <div style={readonlyStatStyle}>{formatNumber(currentRxTotal)} 張</div>
          </div>

          <div>
            <div style={inputLabelStyle}>資料來源</div>
            <div style={readonlyStatStyle}>處方輸入頁</div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <SummaryCard
          title="本月營業額"
          value={formatCurrency(currentData.revenue)}
          compare1={`較上月：${getDiffText(currentData.revenue, previousMonthData?.revenue)}`}
          compare2={`較去年同月：${getDiffText(
            currentData.revenue,
            sameMonthLastYearData?.revenue
          )}`}
          compare1Color={getDiffColor(currentData.revenue, previousMonthData?.revenue)}
          compare2Color={getDiffColor(currentData.revenue, sameMonthLastYearData?.revenue)}
        />

        <SummaryCard
          title="本月毛利"
          value={formatCurrency(currentData.gross_profit)}
          compare1={`較上月：${getDiffText(
            currentData.gross_profit,
            previousMonthData?.gross_profit
          )}`}
          compare2={`較去年同月：${getDiffText(
            currentData.gross_profit,
            sameMonthLastYearData?.gross_profit
          )}`}
          compare1Color={getDiffColor(
            currentData.gross_profit,
            previousMonthData?.gross_profit
          )}
          compare2Color={getDiffColor(
            currentData.gross_profit,
            sameMonthLastYearData?.gross_profit
          )}
        />

        <SummaryCard
          title="本月來客數"
          value={formatNumber(currentData.customer_count)}
          compare1={`較上月：${getDiffText(
            currentData.customer_count,
            previousMonthData?.customer_count
          )}`}
          compare2={`較去年同月：${getDiffText(
            currentData.customer_count,
            sameMonthLastYearData?.customer_count
          )}`}
          compare1Color={getDiffColor(
            currentData.customer_count,
            previousMonthData?.customer_count
          )}
          compare2Color={getDiffColor(
            currentData.customer_count,
            sameMonthLastYearData?.customer_count
          )}
        />

        <SummaryCard
          title="本月一般箋"
          value={`${formatNumber(currentData.rx_general_count)} 張`}
          compare1={`較上月：${getDiffText(
            currentData.rx_general_count,
            previousMonthData?.rx_general_count
          )}`}
          compare2={`較去年同月：${getDiffText(
            currentData.rx_general_count,
            sameMonthLastYearData?.rx_general_count
          )}`}
          compare1Color={getDiffColor(
            currentData.rx_general_count,
            previousMonthData?.rx_general_count
          )}
          compare2Color={getDiffColor(
            currentData.rx_general_count,
            sameMonthLastYearData?.rx_general_count
          )}
        />

        <SummaryCard
          title="本月慢性箋"
          value={`${formatNumber(currentData.rx_chronic_count)} 張`}
          compare1={`較上月：${getDiffText(
            currentData.rx_chronic_count,
            previousMonthData?.rx_chronic_count
          )}`}
          compare2={`較去年同月：${getDiffText(
            currentData.rx_chronic_count,
            sameMonthLastYearData?.rx_chronic_count
          )}`}
          compare1Color={getDiffColor(
            currentData.rx_chronic_count,
            previousMonthData?.rx_chronic_count
          )}
          compare2Color={getDiffColor(
            currentData.rx_chronic_count,
            sameMonthLastYearData?.rx_chronic_count
          )}
        />

        <SummaryCard
          title="本月處方總數"
          value={`${formatNumber(currentRxTotal)} 張`}
          compare1={`較上月：${getDiffText(currentRxTotal, previousMonthData ? prevRxTotal : undefined)}`}
          compare2={`較去年同月：${getDiffText(
            currentRxTotal,
            sameMonthLastYearData ? lastYearRxTotal : undefined
          )}`}
          compare1Color={getDiffColor(
            currentRxTotal,
            previousMonthData ? prevRxTotal : undefined
          )}
          compare2Color={getDiffColor(
            currentRxTotal,
            sameMonthLastYearData ? lastYearRxTotal : undefined
          )}
        />

        <SummaryCard
          title="本月毛利率"
          value={`${margin.toFixed(1)}%`}
          compare1="經營品質指標"
          compare2="毛利 ÷ 營業額"
          compare1Color="#607d8b"
          compare2Color="#607d8b"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <LineChartCard
          title={`${selectedYear} 年營業額趨勢`}
          data={revenueChartData}
          valueFormatter={(value) => formatCurrency(value)}
        />

        <LineChartCard
          title={`${selectedYear} 年毛利趨勢`}
          data={grossProfitChartData}
          valueFormatter={(value) => formatCurrency(value)}
        />

        <LineChartCard
          title={`${selectedYear} 年來客數趨勢`}
          data={customerChartData}
          valueFormatter={(value) => formatNumber(value)}
        />

        <LineChartCard
          title={`${selectedYear} 年處方總數趨勢`}
          data={rxChartData}
          valueFormatter={(value) => `${formatNumber(value)} 張`}
        />
      </div>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #d8ece8",
          borderRadius: "16px",
          padding: "18px",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: "0 0 14px 0", fontSize: "20px", color: "#2f3e3e" }}>
          {selectedYear} 年累計摘要
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
          }}
        >
          <MiniStat title="累計營業額" value={formatCurrency(yearlySummary.totalRevenue)} />
          <MiniStat title="累計毛利" value={formatCurrency(yearlySummary.totalGrossProfit)} />
          <MiniStat title="累計來客數" value={formatNumber(yearlySummary.totalCustomers)} />
          <MiniStat title="累計一般箋" value={`${formatNumber(yearlySummary.totalRxGeneral)} 張`} />
          <MiniStat title="累計慢性箋" value={`${formatNumber(yearlySummary.totalRxChronic)} 張`} />
          <MiniStat title="累計處方總數" value={`${formatNumber(yearlySummary.totalRx)} 張`} />
          <MiniStat title="月均營業額" value={formatCurrency(yearlySummary.avgRevenue)} />
          <MiniStat title="月均毛利" value={formatCurrency(yearlySummary.avgGrossProfit)} />
          <MiniStat title="月均來客數" value={formatDecimal(yearlySummary.avgCustomers, 0)} />
        </div>
      </div>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #d8ece8",
          borderRadius: "16px",
          padding: "18px",
          overflowX: "auto",
        }}
      >
        <h2 style={{ margin: "0 0 14px 0", fontSize: "20px", color: "#2f3e3e" }}>
          {selectedYear} 年每月明細
        </h2>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
            minWidth: "1100px",
          }}
        >
          <thead>
            <tr style={{ background: "#f3fbf9", color: "#415252" }}>
              <th style={thStyle}>月份</th>
              <th style={thStyle}>營業額</th>
              <th style={thStyle}>毛利</th>
              <th style={thStyle}>來客數</th>
              <th style={thStyle}>一般箋</th>
              <th style={thStyle}>慢性箋</th>
              <th style={thStyle}>處方總數</th>
              <th style={thStyle}>毛利率</th>
              <th style={thStyle}>客單價</th>
            </tr>
          </thead>
          <tbody>
            {currentYearRows.map((row) => {
              const rowRxTotal =
                Number(row.rx_general_count || 0) + Number(row.rx_chronic_count || 0);

              const rowMargin = row.revenue > 0 ? (row.gross_profit / row.revenue) * 100 : 0;

              return (
                <tr key={`${row.year}-${row.month}`} style={{ borderTop: "1px solid #edf4f2" }}>
                  <td style={tdStyle}>
                    {row.year} 年 {String(row.month).padStart(2, "0")} 月
                  </td>
                  <td style={tdStyle}>{formatCurrency(row.revenue)}</td>
                  <td style={tdStyle}>{formatCurrency(row.gross_profit)}</td>
                  <td style={tdStyle}>{formatNumber(row.customer_count)}</td>
                  <td style={tdStyle}>{formatNumber(row.rx_general_count)} 張</td>
                  <td style={tdStyle}>{formatNumber(row.rx_chronic_count)} 張</td>
                  <td style={tdStyle}>{formatNumber(rowRxTotal)} 張</td>
                  <td style={tdStyle}>{rowMargin.toFixed(1)}%</td>
                  <td style={tdStyle}>{formatDecimal(row.avg_order_value)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  compare1,
  compare2,
  compare1Color,
  compare2Color,
}: {
  title: string;
  value: string;
  compare1: string;
  compare2: string;
  compare1Color?: string;
  compare2Color?: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #d8ece8",
        borderRadius: "16px",
        padding: "18px",
      }}
    >
      <div style={{ fontSize: "14px", color: "#6a7a7a", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "28px", fontWeight: 700, color: "#2f3e3e", marginBottom: "12px" }}>
        {value}
      </div>
      <div style={{ fontSize: "13px", color: compare1Color || "#567" }}>{compare1}</div>
      <div style={{ fontSize: "13px", color: compare2Color || "#567", marginTop: "6px" }}>
        {compare2}
      </div>
    </div>
  );
}

function MiniStat({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#f8fcfb",
        border: "1px solid #e3f1ee",
        borderRadius: "14px",
        padding: "14px",
      }}
    >
      <div style={{ fontSize: "13px", color: "#6a7a7a", marginBottom: "6px" }}>{title}</div>
      <div style={{ fontSize: "20px", fontWeight: 700, color: "#2f3e3e" }}>{value}</div>
    </div>
  );
}

function LineChartCard({
  title,
  data,
  valueFormatter,
}: {
  title: string;
  data: { label: string; value: number }[];
  valueFormatter: (value: number) => string;
}) {
  const width = 640;
  const height = 240;
  const padding = 40;

  const values = data.map((d) => d.value);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
    const y = padding + ((max - d.value) / range) * (height - padding * 2);

    return { ...d, x, y };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const latest = data[data.length - 1];

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #d8ece8",
        borderRadius: "16px",
        padding: "18px",
      }}
    >
      <div style={{ marginBottom: "10px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", color: "#2f3e3e" }}>{title}</h2>
        <div style={{ fontSize: "13px", color: "#6a7a7a", marginTop: "4px" }}>
          {latest ? `最新：${latest.label} / ${valueFormatter(latest.value)}` : "—"}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%" }}>
          {[0, 0.5, 1].map((ratio, i) => {
            const y = padding + ratio * (height - padding * 2);
            return (
              <line
                key={i}
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
                stroke="#e5eeee"
              />
            );
          })}

          <path d={path} fill="none" stroke="#84A59D" strokeWidth="3" />

          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="#F28482">
                <title>
                  {p.label}：{valueFormatter(p.value)}
                </title>
              </circle>
            </g>
          ))}

          {points.map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={height - 10}
              fontSize="12"
              textAnchor="middle"
              fill="#6a7a7a"
            >
              {p.label}
            </text>
          ))}

          <text x={5} y={padding} fontSize="11" fill="#6a7a7a">
            {valueFormatter(max)}
          </text>
          <text x={5} y={height - padding} fontSize="11" fill="#6a7a7a">
            {valueFormatter(min)}
          </text>
        </svg>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  marginTop: "20px",
  background: "#ffffff",
  border: "1px solid #d8ece8",
  borderRadius: "16px",
  padding: "24px",
  color: "#5b6b6b",
};

const rxPanelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #d8ece8",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cfe5e1",
  minWidth: "140px",
  background: "#fff",
};

const inputLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6c7a7a",
  marginBottom: "6px",
};

const readonlyStatStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: "10px",
  border: "1px solid #e3f1ee",
  background: "#f8fcfb",
  fontSize: "16px",
  color: "#2f3e3e",
  boxSizing: "border-box",
  minHeight: "46px",
  display: "flex",
  alignItems: "center",
  fontWeight: 600,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 10px",
  color: "#334444",
};