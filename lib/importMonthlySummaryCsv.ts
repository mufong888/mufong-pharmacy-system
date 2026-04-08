import { supabase } from "@/lib/supabase";
import {
  parseMonthlySummaryCsv,
  type MonthlySummaryRow,
} from "@/lib/parseMonthlySummaryCsv";

export async function importMonthlySummaryCsvFile(file: File) {
  const text = await file.text();
  const parsed = parseMonthlySummaryCsv(text);

  if (!parsed.length) {
    throw new Error("沒有解析到任何有效月份資料，請確認您上傳的是正確的年度銷售總表 CSV");
  }

  const rows = parsed.map((row: MonthlySummaryRow) => ({
    ...row,
    source_file_name: file.name,
  }));

  const { error } = await supabase.from("monthly_sales_summary").upsert(rows, {
    onConflict: "year,month",
  });

  if (error) {
    throw new Error(`寫入 monthly_sales_summary 失敗：${error.message}`);
  }

  return {
    parsedCount: parsed.length,
    rows: parsed,
  };
}