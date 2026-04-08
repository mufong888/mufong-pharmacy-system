"use client";

import { useMemo, useState } from "react";
import { parseMonthlySummaryCsv } from "@/lib/parseMonthlySummaryCsv";
import { importMonthlySummaryCsvFile } from "@/lib/importMonthlySummaryCsv";

type PreviewSummary = {
  total: number;
  totalRevenue: number;
  totalCustomers: number;
  totalGrossProfit: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function MonthlyImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setPreviewRows([]);
    setMessage("");

    if (!file) return;

    try {
      setLoadingPreview(true);

      const text = await file.text();
      const parsed = parseMonthlySummaryCsv(text);

      if (!parsed.length) {
        setMessage("沒有解析到任何有效月份資料，請確認您上傳的是『門市年度銷售總表.csv』");
        return;
      }

      setPreviewRows(parsed);
    } catch (error: any) {
      setMessage(`預覽失敗：${error.message || "未知錯誤"}`);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleImport() {
    if (!selectedFile) {
      alert("請先選擇 CSV 檔案");
      return;
    }

    try {
      setImporting(true);
      setMessage("");

      const result = await importMonthlySummaryCsvFile(selectedFile);

      setMessage(`匯入成功：共 ${result.parsedCount} 個月份資料已寫入 monthly_sales_summary`);
    } catch (error: any) {
      setMessage(`匯入失敗：${error.message || "未知錯誤"}`);
    } finally {
      setImporting(false);
    }
  }

  const previewSummary = useMemo<PreviewSummary | null>(() => {
    if (!previewRows.length) return null;

    return {
      total: previewRows.length,
      totalRevenue: previewRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0),
      totalCustomers: previewRows.reduce((sum, row) => sum + Number(row.customer_count || 0), 0),
      totalGrossProfit: previewRows.reduce((sum, row) => sum + Number(row.gross_profit || 0), 0),
    };
  }, [previewRows]);

  return (
    <div style={{ padding: "32px" }}>
      <h1 style={pageTitleStyle}>📊 每月彙總匯入</h1>
      <p style={pageDescStyle}>
        上傳「門市年度銷售總表 CSV」，系統會先預覽每月資料，再匯入 Supabase。
      </p>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>上傳 CSV</h2>

        <div style={uploadBoxStyle}>
          <input type="file" accept=".csv" onChange={handleFileChange} />
        </div>

        {loadingPreview && <p style={infoTextStyle}>預覽解析中...</p>}

        {previewSummary && (
          <div style={summaryGridStyle}>
            <div style={cardStyle}>
              <p style={labelStyle}>月份數</p>
              <h2 style={valueStyle}>{previewSummary.total}</h2>
            </div>
            <div style={cardStyle}>
              <p style={labelStyle}>營業額合計</p>
              <h2 style={valueStyle}>{formatCurrency(previewSummary.totalRevenue)}</h2>
            </div>
            <div style={cardStyle}>
              <p style={labelStyle}>來客數合計</p>
              <h2 style={valueStyle}>{formatNumber(previewSummary.totalCustomers)}</h2>
            </div>
            <div style={cardStyle}>
              <p style={labelStyle}>毛利合計</p>
              <h2 style={valueStyle}>{formatCurrency(previewSummary.totalGrossProfit)}</h2>
            </div>
          </div>
        )}

        <div style={{ marginTop: "16px" }}>
          <button
            style={buttonStyle}
            onClick={handleImport}
            disabled={!selectedFile || importing}
          >
            {importing ? "匯入中..." : "確認匯入"}
          </button>
        </div>

        {message && <p style={messageStyle}>{message}</p>}
      </div>

      <div style={{ ...sectionStyle, marginTop: "24px" }}>
        <h2 style={sectionTitleStyle}>預覽月份資料</h2>

        {!previewRows.length ? (
          <div style={emptyBoxStyle}>尚未選擇檔案，或尚未解析出可預覽資料。</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>年月</th>
                  <th style={thStyle}>營業額</th>
                  <th style={thStyle}>來客數</th>
                  <th style={thStyle}>客單價</th>
                  <th style={thStyle}>毛利</th>
                  <th style={thStyle}>刷卡金額</th>
                  <th style={thStyle}>禮券金額</th>
                  <th style={thStyle}>實收現金</th>
                  <th style={thStyle}>現金盈虧</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={`${row.year}-${row.month}`}>
                    <td style={tdStyle}>
                      {row.year} 年 {String(row.month).padStart(2, "0")} 月
                    </td>
                    <td style={tdStyle}>{formatCurrency(Number(row.revenue || 0))}</td>
                    <td style={tdStyle}>{formatNumber(Number(row.customer_count || 0))}</td>
                    <td style={tdStyle}>{formatNumber(Number(row.avg_order_value || 0))}</td>
                    <td style={tdStyle}>{formatCurrency(Number(row.gross_profit || 0))}</td>
                    <td style={tdStyle}>{formatCurrency(Number(row.card_amount || 0))}</td>
                    <td style={tdStyle}>{formatCurrency(Number(row.voucher_amount || 0))}</td>
                    <td style={tdStyle}>{formatCurrency(Number(row.cash_received || 0))}</td>
                    <td style={tdStyle}>{formatNumber(Number(row.cash_diff || 0))}</td>
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

const uploadBoxStyle = {
  padding: "16px",
  background: "#f8fafc",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "20px",
  marginTop: "20px",
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
  fontSize: "28px",
  fontWeight: "bold" as const,
  color: "#1f3b4d",
};

const buttonStyle = {
  background: "#84a59d",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  padding: "12px 20px",
  fontSize: "16px",
  cursor: "pointer",
};

const infoTextStyle = {
  color: "#64748b",
  marginTop: "12px",
};

const messageStyle = {
  marginTop: "16px",
  color: "#334155",
  whiteSpace: "pre-wrap" as const,
};

const emptyBoxStyle = {
  padding: "24px",
  background: "#f8fafc",
  borderRadius: "16px",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.8,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: "1200px",
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