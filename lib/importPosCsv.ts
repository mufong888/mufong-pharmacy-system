import { supabase } from "@/lib/supabase";
import { parsePosCsv } from "@/lib/parsePosCsv";

export async function importPosCsvFile(file: File) {
  const text = await file.text();
  const parsed = parsePosCsv(text);

  if (!parsed.length) {
    throw new Error("沒有解析到任何有效資料，請確認 CSV 格式是否正確");
  }

  const sourceDate = parsed[0]?.sale_date ?? null;

  const { data: batch, error: batchError } = await supabase
    .from("pos_import_batches")
    .insert({
      file_name: file.name,
      source_date: sourceDate,
      raw_row_count: text.split(/\r?\n/).filter(Boolean).length,
      parsed_row_count: parsed.length,
    })
    .select()
    .single();

  if (batchError) {
    throw new Error(`建立匯入批次失敗：${batchError.message}`);
  }

  const rows = parsed.map((row) => ({
    ...row,
    import_batch_id: batch.id,
  }));

  const chunkSize = 500;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    const { error } = await supabase.from("pos_sales_lines").upsert(chunk, {
      onConflict: "sale_date,order_no,line_no,product_code,emp_code",
    });

    if (error) {
      throw new Error(`寫入 POS 明細失敗：${error.message}`);
    }
  }

  return {
    batch,
    parsedCount: parsed.length,
    saleCount: parsed.filter((x) => x.line_type === "sale").length,
    giftCount: parsed.filter((x) => x.line_type === "gift").length,
    pointsCount: parsed.filter((x) => x.line_type === "points").length,
    expenseCount: parsed.filter((x) => x.line_type === "expense").length,
  };
}