"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type EmployeeRow = {
  id: string;
  employee_code: string; // 001
  name: string;
  base_salary: number;
  created_at?: string;
};

type ProfitSummaryRow = {
  emp_code: string;
  total_profit: number;
};

type SalaryRow = EmployeeRow & {
  profit: number;
  personalBonus: number;
  storeBonus: number;
  totalSalary: number;
};

function calculatePersonalBonus(profit: number) {
  if (profit < 70000) return 0;
  return (Math.floor((profit - 70000) / 10000) + 1) * 1000;
}

function getNextEmployeeCode(employees: EmployeeRow[]) {
  const numbers = employees
    .map((employee) => Number(employee.employee_code))
    .filter((num) => Number.isFinite(num));

  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNumber = maxNumber + 1;

  return String(nextNumber).padStart(3, "0");
}

function getRankIcon(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return "🏅";
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const startDate = `${start.getFullYear()}-${String(
    start.getMonth() + 1
  ).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;

  const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(end.getDate()).padStart(2, "0")}`;

  return { startDate, endDate };
}

export default function BonusPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [profitMap, setProfitMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newBaseSalary, setNewBaseSalary] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBaseSalary, setEditBaseSalary] = useState("");

  async function fetchEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("employee_code", { ascending: true });

    if (error) {
      console.error("讀取員工資料失敗：", error.message);
      throw new Error(error.message);
    }

    setEmployees((data ?? []) as EmployeeRow[]);
  }

  async function fetchCurrentMonthProfits() {
    const { startDate, endDate } = getCurrentMonthRange();

    const { data, error } = await supabase
      .from("pos_sales_lines")
      .select("emp_code,gross_profit,sale_date,line_type");

    if (error) {
      console.error("讀取 POS 毛利失敗：", error.message);
      throw new Error(error.message);
    }

    const filtered = (data ?? []).filter((row: any) => {
      if (!row?.emp_code) return false;
      if (row?.line_type !== "sale") return false;
      if (!row?.sale_date) return false;
      return row.sale_date >= startDate && row.sale_date < endDate;
    });

    const grouped: Record<string, number> = {};

    filtered.forEach((row: any) => {
      const code = String(row.emp_code);
      const profit = Number(row.gross_profit || 0);
      grouped[code] = (grouped[code] || 0) + profit;
    });

    setProfitMap(grouped);
  }

  async function fetchAll() {
    try {
      setLoading(true);
      await Promise.all([fetchEmployees(), fetchCurrentMonthProfits()]);
    } catch (error: any) {
      alert(error.message || "讀取資料失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const salaryData: SalaryRow[] = useMemo(() => {
    return employees.map((employee) => {
      const profit = Number(profitMap[employee.employee_code] || 0);
      const personalBonus = calculatePersonalBonus(profit);
      const storeBonus = 0;
      const totalSalary =
        Number(employee.base_salary || 0) + personalBonus + storeBonus;

      return {
        ...employee,
        profit,
        personalBonus,
        storeBonus,
        totalSalary,
      };
    });
  }, [employees, profitMap]);

  const totalBaseSalary = salaryData.reduce(
    (sum, employee) => sum + Number(employee.base_salary || 0),
    0
  );

  const totalPersonalBonus = salaryData.reduce(
    (sum, employee) => sum + Number(employee.personalBonus || 0),
    0
  );

  const totalStoreBonus = 0;

  const totalSalary = salaryData.reduce(
    (sum, employee) => sum + Number(employee.totalSalary || 0),
    0
  );

  const totalProfit = salaryData.reduce(
    (sum, employee) => sum + Number(employee.profit || 0),
    0
  );

  const rankedEmployees = [...salaryData].sort((a, b) => b.profit - a.profit);

  async function handleAddEmployee() {
    if (!newName.trim() || !newBaseSalary.trim()) {
      alert("請完整填寫員工姓名與底薪");
      return;
    }

    const nextCode = getNextEmployeeCode(employees);

    const { error } = await supabase.from("employees").insert([
      {
        employee_code: nextCode,
        name: newName.trim(),
        base_salary: Number(newBaseSalary),
      },
    ]);

    if (error) {
      console.error("新增員工失敗：", error.message);
      alert(`新增員工失敗：${error.message}`);
      return;
    }

    setNewName("");
    setNewBaseSalary("");
    fetchAll();
  }

  async function handleDeleteEmployee(id: string) {
    const confirmed = window.confirm("確定要刪除這位員工嗎？");
    if (!confirmed) return;

    const { error } = await supabase.from("employees").delete().eq("id", id);

    if (error) {
      console.error("刪除失敗：", error.message);
      alert(`刪除失敗：${error.message}`);
      return;
    }

    if (editingId === id) {
      handleCancelEdit();
    }

    fetchAll();
  }

  function handleStartEdit(employee: EmployeeRow) {
    setEditingId(employee.id);
    setEditName(employee.name);
    setEditBaseSalary(String(employee.base_salary));
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditBaseSalary("");
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim() || !editBaseSalary.trim()) {
      alert("請完整填寫編輯欄位");
      return;
    }

    const { error } = await supabase
      .from("employees")
      .update({
        name: editName.trim(),
        base_salary: Number(editBaseSalary),
      })
      .eq("id", id);

    if (error) {
      console.error("儲存失敗：", error.message);
      alert(`儲存失敗：${error.message}`);
      return;
    }

    handleCancelEdit();
    fetchAll();
  }

  return (
    <div style={{ padding: "32px" }}>
      <h1 style={pageTitleStyle}>💰 薪資獎金</h1>
      <p style={pageDescStyle}>
        目前已完成：員工底薪、當月毛利、個人獎金、總薪資、績效排名。店級獎金暫時固定為 0。
      </p>

      <div style={summaryGridStyle}>
        <div style={cardStyle}>
          <p style={labelStyle}>員工人數</p>
          <h2 style={valueStyle}>{employees.length}</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>本月總底薪</p>
          <h2 style={valueStyle}>NT$ {totalBaseSalary.toLocaleString()}</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>本月個人獎金</p>
          <h2 style={valueStyle}>NT$ {totalPersonalBonus.toLocaleString()}</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>本月總薪資</p>
          <h2 style={valueStyle}>NT$ {totalSalary.toLocaleString()}</h2>
        </div>
      </div>

      <div style={{ ...sectionStyle, marginBottom: "28px" }}>
        <h2 style={sectionTitleStyle}>新增員工</h2>

        <div style={formGridStyle}>
          <input
            style={inputStyle}
            placeholder="員工姓名"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="底薪"
            type="number"
            value={newBaseSalary}
            onChange={(e) => setNewBaseSalary(e.target.value)}
          />
        </div>

        <button style={buttonStyle} onClick={handleAddEmployee}>
          新增員工
        </button>
      </div>

      <div style={rankingGridStyle}>
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>🏆 員工績效排名</h2>
          <div style={rankingListStyle}>
            {rankedEmployees.map((employee, index) => (
              <div key={employee.id} style={rankingItemStyle}>
                <div style={rankingLeftStyle}>
                  <span style={rankIconStyle}>{getRankIcon(index)}</span>
                  <div>
                    <div style={rankingNameStyle}>
                      {employee.name}
                      <span style={rankingIdStyle}> {employee.employee_code}</span>
                    </div>
                    <div style={rankingSubStyle}>
                      本月毛利 NT$ {employee.profit.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={rankingRightStyle}>
                  {(totalProfit > 0
                    ? (employee.profit / totalProfit) * 100
                    : 0
                  ).toFixed(1)}
                  %
                </div>
              </div>
            ))}

            {rankedEmployees.length === 0 && (
              <div style={emptyBoxStyle}>目前尚無員工資料</div>
            )}
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>📊 毛利佔比</h2>
          <div style={rankingListStyle}>
            {rankedEmployees.map((employee) => {
              const ratio =
                totalProfit > 0 ? (employee.profit / totalProfit) * 100 : 0;

              return (
                <div key={employee.id} style={{ marginBottom: "18px" }}>
                  <div style={barLabelRowStyle}>
                    <span style={barNameStyle}>
                      {employee.name} ({employee.employee_code})
                    </span>
                    <span style={barValueStyle}>{ratio.toFixed(1)}%</span>
                  </div>
                  <div style={barTrackStyle}>
                    <div
                      style={{
                        ...barFillStyle,
                        width: `${ratio}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {rankedEmployees.length === 0 && (
              <div style={emptyBoxStyle}>目前尚無毛利資料</div>
            )}
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>員工薪資明細</h2>

        {loading ? (
          <p style={{ color: "#6b7280" }}>資料載入中...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>員工編號</th>
                  <th style={thStyle}>員工</th>
                  <th style={thStyle}>底薪</th>
                  <th style={thStyle}>本月毛利</th>
                  <th style={thStyle}>個人獎金</th>
                  <th style={thStyle}>店級獎金</th>
                  <th style={thStyle}>總薪資</th>
                  <th style={thStyle}>操作</th>
                </tr>
              </thead>
              <tbody>
                {salaryData.map((employee) => {
                  const isEditing = editingId === employee.id;

                  return (
                    <tr key={employee.id}>
                      <td style={tdStyle}>{employee.employee_code}</td>

                      <td style={tdStyle}>
                        {isEditing ? (
                          <input
                            style={tableInputStyle}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        ) : (
                          employee.name
                        )}
                      </td>

                      <td style={tdStyle}>
                        {isEditing ? (
                          <input
                            style={tableInputStyle}
                            type="number"
                            value={editBaseSalary}
                            onChange={(e) => setEditBaseSalary(e.target.value)}
                          />
                        ) : (
                          Number(employee.base_salary || 0).toLocaleString()
                        )}
                      </td>

                      <td style={tdStyle}>
                        {employee.profit.toLocaleString()}
                      </td>

                      <td style={tdStyle}>
                        {employee.personalBonus.toLocaleString()}
                      </td>

                      <td style={tdStyle}>0</td>

                      <td style={tdHighlightStyle}>
                        {isEditing
                          ? (
                              Number(editBaseSalary || 0) +
                              calculatePersonalBonus(employee.profit)
                            ).toLocaleString()
                          : employee.totalSalary.toLocaleString()}
                      </td>

                      <td style={tdStyle}>
                        <div style={actionGroupStyle}>
                          {isEditing ? (
                            <>
                              <button
                                style={saveButtonStyle}
                                onClick={() => handleSaveEdit(employee.id)}
                              >
                                儲存
                              </button>
                              <button
                                style={cancelButtonStyle}
                                onClick={handleCancelEdit}
                              >
                                取消
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                style={editButtonStyle}
                                onClick={() => handleStartEdit(employee)}
                              >
                                編輯
                              </button>
                              <button
                                style={deleteButtonStyle}
                                onClick={() => handleDeleteEmployee(employee.id)}
                              >
                                刪除
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {salaryData.length === 0 && (
                  <tr>
                    <td style={emptyTableStyle} colSpan={8}>
                      目前尚無員工資料
                    </td>
                  </tr>
                )}
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

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "20px",
  marginBottom: "32px",
};

const rankingGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginBottom: "28px",
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
  fontSize: "32px",
  fontWeight: "bold" as const,
  color: "#1f3b4d",
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

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "12px",
  marginBottom: "16px",
  maxWidth: "600px",
};

const inputStyle = {
  padding: "12px 14px",
  border: "1px solid #dbe4e8",
  borderRadius: "12px",
  fontSize: "15px",
  outline: "none",
  width: "100%",
  background: "#fff",
};

const tableInputStyle = {
  padding: "8px 10px",
  border: "1px solid #dbe4e8",
  borderRadius: "8px",
  fontSize: "14px",
  width: "100%",
  outline: "none",
  background: "#fff",
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

const editButtonStyle = {
  background: "#84a59d",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "8px 14px",
  fontSize: "14px",
  cursor: "pointer",
};

const saveButtonStyle = {
  background: "#6fa58f",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "8px 14px",
  fontSize: "14px",
  cursor: "pointer",
};

const cancelButtonStyle = {
  background: "#94a3b8",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "8px 14px",
  fontSize: "14px",
  cursor: "pointer",
};

const deleteButtonStyle = {
  background: "#f28482",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "8px 14px",
  fontSize: "14px",
  cursor: "pointer",
};

const actionGroupStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
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

const tdHighlightStyle = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#1f3b4d",
  fontWeight: "bold" as const,
  verticalAlign: "middle" as const,
};

const rankingListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "14px",
};

const rankingItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 18px",
  background: "#f8fafc",
  borderRadius: "16px",
};

const rankingLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const rankIconStyle = {
  fontSize: "28px",
};

const rankingNameStyle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#1f3b4d",
};

const rankingIdStyle = {
  fontSize: "14px",
  fontWeight: "normal" as const,
  color: "#7b9aa5",
};

const rankingSubStyle = {
  fontSize: "14px",
  color: "#6b7280",
  marginTop: "4px",
};

const rankingRightStyle = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#84a59d",
};

const barLabelRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "8px",
};

const barNameStyle = {
  fontSize: "15px",
  color: "#334155",
};

const barValueStyle = {
  fontSize: "15px",
  fontWeight: "bold" as const,
  color: "#1f3b4d",
};

const barTrackStyle = {
  width: "100%",
  height: "12px",
  background: "#e5eef0",
  borderRadius: "999px",
  overflow: "hidden",
};

const barFillStyle = {
  height: "100%",
  background: "#84a59d",
  borderRadius: "999px",
};

const emptyBoxStyle = {
  padding: "24px",
  background: "#f8fafc",
  borderRadius: "16px",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.8,
};

const emptyTableStyle = {
  padding: "24px 10px",
  textAlign: "center" as const,
  color: "#94a3b8",
};