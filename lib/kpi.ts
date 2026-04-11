import { supabase } from "@/lib/supabase";

export async function upsertKPI(data: {
  year: number;
  month: number;
  revenue?: number;
  profit?: number;
  customers?: number;
  prescriptions?: number;
}) {
  const { error } = await supabase
    .from("store_kpi")
    .upsert([data], {
      onConflict: "year,month",
    });

  if (error) throw error;
}

export async function fetchKPI(year?: number) {
  let query = supabase
    .from("store_kpi")
    .select("*")
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  if (year) {
    query = query.eq("year", year);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data;
}