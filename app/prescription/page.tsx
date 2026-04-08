"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type PrescriptionRow = {
  id?: number;
  year: number;
  month: number;
  general_rx: number;
  chronic_rx: number;
  note: string;
};

const monthLabels = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  border: "1px solid #e8eeee",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #d9e4e4",
  outline: "none",
  fontSize: "14px",
  background: "#fff",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #d9e4e4",
  outline: "none",
  fontSize: "14px",
  background: "#fff",
  minHeight: "44px",
  resize: "vertical",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13px",
  color: "#4e5d5d",
  fontWeight: 600,
};

const buttonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "10px",
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "14px",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 12px",
  fontSize: "14px",
  color: "#405454",
  borderBottom: "1px solid #e7efef",
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  verticalAlign: "top",
};

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildDefaultRows(year: number): PrescriptionRow[] {
  return Array.from({ length: 12 }, (_, i) => ({
    year,
    month: i + 1,
    general_rx: 0,
    chronic_rx: 0,
    note: "",
  }));
}

export default function PrescriptionPage() {
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [rows, setRows] = useState<PrescriptionRow[]>(buildDefaultRows(currentYear));
  const [loading, setLoading] = useState(true);
  const [savingMonth, setSavingMonth] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function loadYearData(year: number) {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("monthly_prescriptions")
      .select("*")
      .eq("year", year)
      .order("month", { ascending: true });

    if (error) {
      console.error("讀取 monthly_prescriptions 失敗：", error);
      setRows(buildDefaultRows(year));
      setMessage("讀取資料失敗，請檢查 Supabase 設定");
      setLoading(false);
      return;
    }

    const defaults = buildDefaultRows(year);

    if (!data || data.length === 0) {
      setRows(defaults);
      setLoading(false);
      return;
    }

    const merged = defaults.map((base) => {
      const found = data.find((item) => item.month === base.month);
      return found
        ? {
            id: found.id,
            year: found.year,
            month: found.month,
            general_rx: Number(found.general_rx ?? 0),
            chronic_rx: Number(found.chronic_rx ?? 0),
            note: found.note ?? "",
          }
        : base;
    });

    setRows(merged);
    setLoading(false);
  }

  useEffect(() => {
    loadYearData(selectedYear);
  }, [selectedYear]);

  function updateRow(
    month: number,
    field: keyof Omit<PrescriptionRow, "id" | "year" | "month">,
    value: string
  ) {
    setRows((prev) =>
      prev.map((row) =>
        row.month === month
          ? {
              ...row,
              [field]:
                field === "note"
                  ? value
                  : toNumber(value),
            }
          : row
      )
    );
  }

  async function syncMonthlyMetricsPrescription(
    year: number,
    month: number,
    totalRx: number
  ) {
    const { error } = await supabase
      .from("monthly_metrics")
      .upsert(
        {
          year,
          month,
          prescriptions: totalRx,
        },
        { onConflict: "year,month" }
      );

    if (error) {
      throw error;
    }
  }

  async function saveMonth(row: PrescriptionRow) {
    setSavingMonth(row.month);
    setMessage("");

    const payload = {
      year: row.year,
      month: row.month,
      general_rx: row.general_rx || 0,
      chronic_rx: row.chronic_rx || 0,
      note: row.note || "",
    };

    const totalRx = (row.general_rx || 0) + (row.chronic_rx || 0);

    const { error } = await supabase
      .from("monthly_prescriptions")
      .upsert(payload, { onConflict: "year,month" });

    if (error) {
      console.error("儲存 monthly_prescriptions 失敗：", error);
      setMessage(`${row.year} 年 ${row.month} 月儲存失敗`);
      setSavingMonth(null);
      return;
    }

    try {
      await syncMonthlyMetricsPrescription(row.year, row.month, totalRx);
    } catch (err) {
      console.error("同步 monthly_metrics 失敗：", err);
      setMessage(`${row.year} 年 ${row.month} 月處方已存，但同步 Trends 失敗`);
      setSavingMonth(null);
      return;
    }

    setMessage(`${row.year} 年 ${row.month} 月處方已儲存`);
    await loadYearData(selectedYear);
    setSavingMonth(null);
  }

  async function saveAll() {
    setMessage("全部儲存中...");

    const prescriptionPayload = rows.map((row) => ({
      year: row.year,
      month: row.month,
      general_rx: row.general_rx || 0,
      chronic_rx: row.chronic_rx || 0,
      note: row.note || "",
    }));

    const metricsPayload = rows.map((row) => ({
      year: row.year,
      month: row.month,
      prescriptions: (row.general_rx || 0) + (row.chronic_rx || 0),
    }));

    const { error: prescriptionError } = await supabase
      .from("monthly_prescriptions")
      .upsert(prescriptionPayload, { onConflict: "year,month" });

    if (prescriptionError) {
      console.error("全部儲存 monthly_prescriptions 失敗：", prescriptionError);
      setMessage("全部儲存失敗，請檢查處方資料表設定");
      return;
    }

    const { error: metricsError } = await supabase
      .from("monthly_metrics")
      .upsert(metricsPayload, { onConflict: "year,month" });

    if (metricsError) {
      console.error("全部同步 monthly_metrics 失敗：", metricsError);
      setMessage("處方已存，但同步 Trends 失敗");
      return;
    }

    setMessage(`${selectedYear} 年處方資料已全部儲存`);
    await loadYearData(selectedYear);
  }

  const chartData = useMemo(() => {
    return rows.map((row) => ({
      month: `${row.month}月`,
      一般處方: row.general_rx,
      慢箋: row.chronic_rx,
      總處方: (row.general_rx || 0) + (row.chronic_rx || 0),
    }));
  }, [rows]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.general += row.general_rx || 0;
        acc.chronic += row.chronic_rx || 0;
        acc.total += (row.general_rx || 0) + (row.chronic_rx || 0);
        return acc;
      },
      {
        general: 0,
        chronic: 0,
        total: 0,
      }
    );
  }, [rows]);

  return (
    <main style={{ padding: "24px", background: "#f7fbfb", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1500px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", color: "#2f3e3e" }}>
              處方輸入
            </h1>
            <p style={{ margin: "8px 0 0", color: "#5f7272", fontSize: "14px" }}>
              可獨立輸入每月一般處方、慢箋與備註，並同步到 Trends
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                ...inputStyle,
                width: "140px",
                fontWeight: 700,
              }}
            >
              {[2024, 2025, 2026, 2027, 2028].map((year) => (
                <option key={year} value={year}>
                  {year} 年
                </option>
              ))}
            </select>

            <button
              onClick={saveAll}
              style={{
                ...buttonStyle,
                background: "#84A59D",
                color: "#fff",
              }}
            >
              全部儲存
            </button>
          </div>
        </div>

        {message ? (
          <div
            style={{
              marginBottom: "16px",
              background: "#eef7f6",
              border: "1px solid #d8ebe8",
              color: "#3f5f5f",
              padding: "12px 14px",
              borderRadius: "12px",
              fontSize: "14px",
            }}
          >
            {message}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div style={cardStyle}>
            <div style={{ color: "#6b7a7a", fontSize: "13px", marginBottom: "8px" }}>
              年度一般處方
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#2f3e3e" }}>
              {totals.general.toLocaleString()}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ color: "#6b7a7a", fontSize: "13px", marginBottom: "8px" }}>
              年度慢箋
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#2f3e3e" }}>
              {totals.chronic.toLocaleString()}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ color: "#6b7a7a", fontSize: "13px", marginBottom: "8px" }}>
              年度總處方
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#2f3e3e" }}>
              {totals.total.toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: "20px" }}>
          <h2 style={{ marginTop: 0, marginBottom: "16px", color: "#2f3e3e", fontSize: "20px" }}>
            {selectedYear} 年處方趨勢
          </h2>

          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="一般處方" stroke="#84A59D" strokeWidth={3} />
                <Line type="monotone" dataKey="慢箋" stroke="#F6BD60" strokeWidth={3} />
                <Line type="monotone" dataKey="總處方" stroke="#F28482" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, marginBottom: "16px", color: "#2f3e3e", fontSize: "20px" }}>
            {selectedYear} 年每月處方輸入
          </h2>

          {loading ? (
            <div style={{ color: "#607070" }}>讀取中...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "1300px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f3f8f8" }}>
                    <th style={thStyle}>月份</th>
                    <th style={thStyle}>一般處方</th>
                    <th style={thStyle}>慢箋</th>
                    <th style={thStyle}>總處方</th>
                    <th style={thStyle}>備註</th>
                    <th style={thStyle}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const totalRx = (row.general_rx || 0) + (row.chronic_rx || 0);

                    return (
                      <tr key={`${row.year}-${row.month}`} style={{ borderBottom: "1px solid #edf2f2" }}>
                        <td style={tdStyle}>
                          {row.year} 年 {monthLabels[row.month - 1]}
                        </td>

                        <td style={tdStyle}>
                          <label style={labelStyle}>一般處方</label>
                          <input
                            type="number"
                            value={row.general_rx}
                            onChange={(e) => updateRow(row.month, "general_rx", e.target.value)}
                            style={inputStyle}
                          />
                        </td>

                        <td style={tdStyle}>
                          <label style={labelStyle}>慢箋</label>
                          <input
                            type="number"
                            value={row.chronic_rx}
                            onChange={(e) => updateRow(row.month, "chronic_rx", e.target.value)}
                            style={inputStyle}
                          />
                        </td>

                        <td style={tdStyle}>
                          <label style={labelStyle}>總處方</label>
                          <input
                            type="text"
                            value={totalRx}
                            readOnly
                            style={{
                              ...inputStyle,
                              background: "#f6fbfb",
                              color: "#2f3e3e",
                              fontWeight: 700,
                            }}
                          />
                        </td>

                        <td style={tdStyle}>
                          <label style={labelStyle}>備註</label>
                          <textarea
                            value={row.note}
                            onChange={(e) => updateRow(row.month, "note", e.target.value)}
                            style={textareaStyle}
                            placeholder="例如：春節、缺藥、流感季、活動檔期..."
                          />
                        </td>

                        <td style={tdStyle}>
                          <button
                            onClick={() => saveMonth(row)}
                            disabled={savingMonth === row.month}
                            style={{
                              ...buttonStyle,
                              background: savingMonth === row.month ? "#c7d7d4" : "#BEE9E8",
                              color: "#2f3e3e",
                              width: "100%",
                            }}
                          >
                            {savingMonth === row.month ? "儲存中..." : "儲存本月"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}