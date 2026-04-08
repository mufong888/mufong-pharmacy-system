"use client";

import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";

export default function DailyImportPage() {
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleFileUpload(file: File) {
    setLoading(true);
    setMessage("");
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];

          // 🔹 轉換格式（依你CSV欄位調整）
          const formatted = rows.map((row) => ({
            date: row["日期"], // yyyy-mm-dd
            revenue: Number(row["營業額"] || 0),
            customer_count: Number(row["來客數"] || 0),
            gross_profit: Number(row["毛利"] || 0),
          }));

          // 🔹 寫入 daily_sales
          const { error } = await supabase
            .from("daily_sales")
            .insert(formatted);

          if (error) throw error;

          // 🔥 自動更新 monthly_sales_summary
          await rebuildMonthlySummary();

          setMessage("匯入成功 ✅");
        } catch (err: any) {
          setMessage("匯入失敗：" + err.message);
        } finally {
          setLoading(false);
        }
      },
    });
  }

  async function rebuildMonthlySummary() {
    // 抓全部 daily_sales
    const { data, error } = await supabase
      .from("daily_sales")
      .select("*");

    if (error) throw error;

    const map = new Map();

    data?.forEach((row: any) => {
      const date = new Date(row.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const key = `${year}-${month}`;

      if (!map.has(key)) {
        map.set(key, {
          year,
          month,
          revenue: 0,
          customer_count: 0,
          gross_profit: 0,
        });
      }

      const item = map.get(key);

      item.revenue += Number(row.revenue || 0);
      item.customer_count += Number(row.customer_count || 0);
      item.gross_profit += Number(row.gross_profit || 0);
    });

    const summary = Array.from(map.values()).map((item: any) => ({
      ...item,
      avg_order_value:
        item.customer_count > 0
          ? item.revenue / item.customer_count
          : 0,
    }));

    const { error: upsertError } = await supabase
      .from("monthly_sales_summary")
      .upsert(summary, { onConflict: "year,month" });

    if (upsertError) throw upsertError;
  }

  return (
    <div style={{ padding: "24px", background: "#f7fbfa", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "28px", color: "#2f3e3e" }}>
        📅 每日銷售匯入
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

        {loading && (
          <div style={{ marginTop: "10px" }}>處理中...</div>
        )}

        {message && (
          <div style={{ marginTop: "10px", color: "#2f3e3e" }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}