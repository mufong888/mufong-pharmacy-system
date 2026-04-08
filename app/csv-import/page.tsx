"use client";

import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";

export default function CsvImportPage() {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  function addLog(text: string) {
    setLog((prev) => [...prev, text]);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLog([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];

        for (const row of rows) {
          try {
            // 👉 依你CSV欄位調整（這裡是常見格式）
            const date = row["營業日期"] || row["日期"];
            if (!date) continue;

            const d = new Date(date);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;

            const revenue = Number(row["營業額"] || 0);
            const customer_count = Number(row["來客數"] || 0);
            const avg_order_value = Number(row["客單價"] || 0);
            const gross_profit = Number(row["毛利"] || 0);
            const card_amount = Number(row["刷卡金額"] || 0);
            const cash_received = Number(row["實收現金"] || 0);
            const cash_diff = Number(row["現金盈虧"] || 0);

            // 👉 upsert（同年月會覆蓋）
            const { error } = await supabase
              .from("monthly_sales_summary")
              .upsert({
                year,
                month,
                revenue,
                customer_count,
                avg_order_value,
                gross_profit,
                card_amount,
                cash_received,
                cash_diff,
              });

            if (error) {
              addLog(`❌ ${year}-${month} 失敗`);
            } else {
              addLog(`✅ ${year}-${month} 成功`);
            }
          } catch (err) {
            addLog("❌ 解析錯誤");
          }
        }

        setLoading(false);
      },
    });
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28 }}>CSV 匯入（月銷售）</h1>

      <input type="file" accept=".csv" onChange={handleFileUpload} />

      {loading && <p>匯入中...</p>}

      <div style={{ marginTop: 20 }}>
        {log.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}