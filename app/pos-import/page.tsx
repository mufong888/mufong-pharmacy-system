"use client";

import { useMemo, useState } from "react";
import { parsePosCsv } from "@/lib/parsePosCsv";
import { importPosCsvFile } from "@/lib/importPosCsv";

type PreviewSummary = {
  total: number;
  sale: number;
  gift: number;
  points: number;
  expense: number;
};

export default function PosImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewSummary, setPreviewSummary] = useState<PreviewSummary | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setPreviewSummary(null);
    setPreviewRows([]);
    setMessage("");

    if (!file) return;

    try {
      setLoadingPreview(true);

      const text = await file.text();
      const parsed = parsePosCsv(text);

      if (!parsed.length) {
        setMessage("沒有解析到任何有效資料，請確認您上傳的是正確的 POS CSV");
        return;
      }

      setPreviewSummary({
        total: parsed.length,
        sale: parsed.filter((x) => x.line_type === "sale").length,
        gift: parsed.filter((x) => x.line_type === "gift").length,
        points: parsed.filter((x) => x.line_type === "points").length,
        expense: parsed.filter((x) => x.line_type === "expense").length,
      });

      setPreviewRows(parsed.slice(0, 20));
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

      const result = await importPosCsvFile(selectedFile);

      setMessage(
        `匯入成功：共 ${result.parsedCount} 筆，正常銷售 ${result.saleCount} 筆，贈品 ${result.giftCount} 筆，集點 ${result.pointsCount} 筆，櫃外支出 ${result.expenseCount} 筆`
      );
    } catch (error: any) {
      setMessage(`匯入失敗：${error.message || "未知錯誤"}`);
    } finally {
      setImporting(false);
    }
  }

  const hasPreview = useMemo(() => previewRows.length > 0, [previewRows]);

  return (
    <div style={{ padding: "32px" }}>
      <h1 style={pageTitleStyle}>📥 POS 匯入</h1>
      <p style={pageDescStyle}>
        上傳每日門市銷售明細 CSV，系統會先預覽，再匯入 Supabase。
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
              <p style={labelStyle}>總筆數</p>
              <h2 style={valueStyle}>{previewSummary.total}</h2>
            </div>
            <div style={cardStyle}>
              <p style={labelStyle}>正常銷售</p>
              <h2 style={valueStyle}>{previewSummary.sale}</h2>
            </div>
            <div style={cardStyle}>
              <p style={labelStyle}>贈品</p>
              <h2 style={valueStyle}>{previewSummary.gift}</h2>
            </div>
            <div style={cardStyle}>
              <p style={labelStyle}>集點 / 櫃外支出</p>
              <h2 style={valueStyle}>
                {previewSummary.points + previewSummary.expense}
              </h2>
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
        <h2 style={sectionTitleStyle}>預覽前 20 筆</h2>

        {!hasPreview ? (
          <div style={emptyBoxStyle}>尚未選擇檔案，或尚未解析出可預覽資料。</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>日期</th>
                  <th style={thStyle}>單號</th>
                  <th style={thStyle}>員工</th>
                  <th style={thStyle}>商品代碼</th>
                  <th style={thStyle}>商品名稱</th>
                  <th style={thStyle}>數量</th>
                  <th style={thStyle}>小計</th>
                  <th style={thStyle}>毛利</th>
                  <th style={thStyle}>類型</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={`${row.order_no}-${row.line_no}-${index}`}>
                    <td style={tdStyle}>{row.sale_date}</td>
                    <td style={tdStyle}>{row.order_no}</td>
                    <td style={tdStyle}>
                      {row.emp_code} {row.emp_name}
                    </td>
                    <td style={tdStyle}>{row.product_code}</td>
                    <td style={tdStyle}>{row.product_name}</td>
                    <td style={tdStyle}>{row.qty}</td>
                    <td style={tdStyle}>{Number(row.subtotal || 0).toLocaleString()}</td>
                    <td style={tdStyle}>
                      {Number(row.gross_profit || 0).toLocaleString()}
                    </td>
                    <td style={tdStyle}>{row.line_type}</td>
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
  minWidth: "1100px",
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