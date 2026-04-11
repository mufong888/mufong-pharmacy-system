"use client";

import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";

type CsvRow = (string | number | null | undefined)[];

type ParsedLine = {
  sale_date: string;
  sale_time: string | null;
  sale_datetime?: string | null;
  order_no: string | null;
  line_no: number;
  emp_code: string | null;
  emp_name: string | null;
  product_code: string;
  product_name: string;
  unit: string | null;
  qty: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
  gross_profit: number;
  note: string | null;
  line_type: "sale" | "gift" | "points";
  raw_header_text?: string | null;
  raw_product_text?: string | null;
};

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseSaleInfo(text: string) {
  const raw = normalizeText(text);

  const dateMatch = raw.match(/日期:(\d{8})-(\d{2}:\d{2})/);
  const orderMatch = raw.match(/單號:(\d+)/);
  const empMatch = raw.match(/Emp:(\d+)([^\s]+)?/);

  const yyyymmdd = dateMatch?.[1] ?? "";
  const hhmm = dateMatch?.[2] ?? "";

  const saleDate =
    yyyymmdd.length === 8
      ? `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
      : "";

  return {
    sale_date: saleDate,
    sale_time: hhmm || null,
    sale_datetime: saleDate && hhmm ? `${saleDate} ${hhmm}:00` : null,
    order_no: orderMatch?.[1] ?? null,
    emp_code: empMatch?.[1] ?? null,
    emp_name: empMatch?.[2] ?? null,
  };
}

function parseProductInfo(text: string, fallbackLineNo: number) {
  const raw = normalizeText(text);

  const match = raw.match(/^([A-Za-z0-9]+)\s+(.*)$/);

  if (!match) {
    return {
      product_code: `NO_CODE_${fallbackLineNo}`,
      product_name: raw || "未命名商品",
    };
  }

  return {
    product_code: match[1]?.trim() || `NO_CODE_${fallbackLineNo}`,
    product_name: match[2]?.trim() || "未命名商品",
  };
}

function detectLineType(
  productCode: string,
  productName: string,
  note: string
) {
  const name = normalizeText(productName);
  const code = normalizeText(productCode);
  const remark = normalizeText(note);

  if (code.startsWith("FZZ") || name.includes("集點") || remark.includes("集點")) {
    return "points" as const;
  }

  if (remark.includes("贈品")) {
    return "gift" as const;
  }

  return "sale" as const;
}

function chunkArray<T>(array: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function dedupeLines(lines: ParsedLine[]) {
  const map = new Map<string, ParsedLine>();

  for (const line of lines) {
    const key = `${line.sale_date}__${line.order_no ?? ""}__${line.line_no}`;
    map.set(key, line);
  }

  return Array.from(map.values());
}

export default function DailyImportPage() {
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [summary, setSummary] = useState({
    raw: 0,
    valid: 0,
    deduped: 0,
    inserted: 0,
    failed: 0,
    skipped: 0,
  });

  function addLog(text: string) {
    setLogs((prev) => [...prev, text]);
  }

  async function handleFileUpload(file: File) {
    setLoading(true);
    setMessage("");
    setLogs([]);
    setFileName(file.name);
    setSummary({
      raw: 0,
      valid: 0,
      deduped: 0,
      inserted: 0,
      failed: 0,
      skipped: 0,
    });

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = (results.data ?? []) as CsvRow[];
          const parsedRows: ParsedLine[] = [];
          let skipped = 0;

          setSummary((prev) => ({ ...prev, raw: rows.length }));
          addLog(`開始解析，共 ${rows.length} 列`);

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            const saleInfoRaw = normalizeText(row[9]);
            const rawLineNo = normalizeNumber(row[10]);
            const productInfoRaw = normalizeText(row[11]);

            if (!saleInfoRaw || !productInfoRaw) {
              skipped++;
              continue;
            }

            const saleInfo = parseSaleInfo(saleInfoRaw);

            if (!saleInfo.sale_date) {
              skipped++;
              continue;
            }

            const lineNo = rawLineNo > 0 ? rawLineNo : i + 1;
            const productInfo = parseProductInfo(productInfoRaw, lineNo);
            const note = normalizeText(row[18]);

            const lineType = detectLineType(
              productInfo.product_code,
              productInfo.product_name,
              note
            );

            parsedRows.push({
              sale_date: saleInfo.sale_date,
              sale_time: saleInfo.sale_time,
              sale_datetime: saleInfo.sale_datetime,
              order_no: saleInfo.order_no,
              line_no: lineNo,
              emp_code: saleInfo.emp_code,
              emp_name: saleInfo.emp_name,
              product_code: productInfo.product_code,
              product_name: productInfo.product_name,
              unit: normalizeText(row[12]) || null,
              qty: normalizeNumber(row[13]),
              unit_price: normalizeNumber(row[14]),
              unit_cost: normalizeNumber(row[15]),
              subtotal: normalizeNumber(row[16]),
              gross_profit: normalizeNumber(row[17]),
              note: note || null,
              line_type: lineType,
              raw_header_text: saleInfoRaw,
              raw_product_text: productInfoRaw,
            });
          }

          const dedupedRows = dedupeLines(parsedRows);

          setSummary((prev) => ({
            ...prev,
            valid: parsedRows.length,
            deduped: dedupedRows.length,
            skipped,
          }));

          addLog(`有效資料 ${parsedRows.length} 筆，去重後 ${dedupedRows.length} 筆，跳過 ${skipped} 筆`);

          if (!dedupedRows.length) {
            setMessage("沒有可匯入的有效資料");
            setLoading(false);
            return;
          }

          const chunks = chunkArray(dedupedRows, 300);
          let inserted = 0;
          let failed = 0;

          for (let i = 0; i < chunks.length; i++) {
            const batch = chunks[i];

            const { error } = await supabase
              .from("pos_sales_lines")
              .upsert(batch, {
                onConflict: "sale_date,order_no,line_no",
              });

            if (error) {
              failed += batch.length;
              addLog(`❌ 第 ${i + 1} 批失敗：${error.message}`);
            } else {
              inserted += batch.length;
              addLog(`✅ 第 ${i + 1} 批成功：${batch.length} 筆`);
            }
          }

          setSummary((prev) => ({
            ...prev,
            inserted,
            failed,
          }));

          if (failed > 0) {
            setMessage("商品明細匯入完成，但有部分批次失敗");
          } else {
            setMessage("商品明細匯入完成 ✅");
          }
        } catch (err: any) {
          setMessage(`匯入失敗：${err.message || "未知錯誤"}`);
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        setMessage(`CSV 解析失敗：${error.message}`);
        setLoading(false);
      },
    });
  }

  return (
    <div style={{ padding: "24px", background: "#f7fbfa", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "28px", color: "#2f3e3e" }}>
        📦 每日商品明細匯入
      </h1>

      <div
        style={{
          marginTop: "20px",
          background: "#ffffff",
          border: "1px solid #d8ece8",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        {fileName && (
          <div style={{ marginTop: "10px", color: "#607070" }}>
            檔案：{fileName}
          </div>
        )}

        {loading && <div style={{ marginTop: "10px" }}>處理中...</div>}

        {message && (
          <div style={{ marginTop: "10px", color: "#2f3e3e" }}>{message}</div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "12px",
            marginTop: "20px",
          }}
        >
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>原始列數</div>
            <div style={summaryValueStyle}>{summary.raw}</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>有效筆數</div>
            <div style={summaryValueStyle}>{summary.valid}</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>去重後</div>
            <div style={summaryValueStyle}>{summary.deduped}</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>成功寫入</div>
            <div style={summaryValueStyle}>{summary.inserted}</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>失敗</div>
            <div style={summaryValueStyle}>{summary.failed}</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>跳過</div>
            <div style={summaryValueStyle}>{summary.skipped}</div>
          </div>
        </div>

        <div style={{ marginTop: "20px" }}>
          {logs.map((log, index) => (
            <div
              key={index}
              style={{
                marginBottom: "8px",
                padding: "10px 12px",
                background: "#f8fafc",
                borderRadius: "10px",
                color: "#475569",
                fontSize: "14px",
              }}
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const summaryCardStyle = {
  background: "#f8fafc",
  borderRadius: "12px",
  padding: "14px 16px",
};

const summaryLabelStyle = {
  fontSize: "14px",
  color: "#64748b",
  marginBottom: "6px",
};

const summaryValueStyle = {
  fontSize: "22px",
  fontWeight: "bold" as const,
  color: "#1f3b4d",
};