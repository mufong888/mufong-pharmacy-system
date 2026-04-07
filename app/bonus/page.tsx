"use client";

import { useEffect, useState } from "react";

type Employee = {
  id: string;
  name: string;
  baseSalary: number;
  profit: number;
  storeBonus: number;
};

function calculatePersonalBonus(profit: number) {
  if (profit < 70000) return 0;
  return (Math.floor((profit - 70000) / 10000) + 1) * 1000;
}

function getNextEmployeeId(employees: Employee[]) {
  const numbers = employees.map((employee) =>
    Number(employee.id.replace("E", ""))
  );
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNumber = maxNumber + 1;

  return `E${String(nextNumber).padStart(3, "0")}`;
}

export default function BonusPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [newName, setNewName] = useState("");
  const [newBaseSalary, setNewBaseSalary] = useState("");
  const [newProfit, setNewProfit] = useState("");
  const [newStoreBonus, setNewStoreBonus] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBaseSalary, setEditBaseSalary] = useState("");
  const [editProfit, setEditProfit] = useState("");
  const [editStoreBonus, setEditStoreBonus] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("employees");

    if (stored) {
      setEmployees(JSON.parse(stored));
    } else {
      setEmployees([
        { id: "E001", name: "王小明", baseSalary: 35000, profit: 90000, storeBonus: 1000 },
        { id: "E002", name: "林小美", baseSalary: 35000, profit: 80000, storeBonus: 1000 },
        { id: "E003", name: "陳阿華", baseSalary: 35000, profit: 70000, storeBonus: 1000 },
      ]);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("employees", JSON.stringify(employees));
    }
  }, [employees, isLoaded]);

  const salaryData = employees.map((employee) => {
    const personalBonus = calculatePersonalBonus(employee.profit);
    const totalSalary =
      employee.baseSalary + personalBonus + employee.storeBonus;

    return {
      ...employee,
      personalBonus,
      totalSalary,
    };
  });

  const totalBaseSalary = salaryData.reduce(
    (sum, employee) => sum + employee.baseSalary,
    0
  );

  const totalPersonalBonus = salaryData.reduce(
    (sum, employee) => sum + employee.personalBonus,
    0
  );

  const totalStoreBonus = salaryData.reduce(
    (sum, employee) => sum + employee.storeBonus,
    0
  );

  const totalSalary = salaryData.reduce(
    (sum, employee) => sum + employee.totalSalary,
    0
  );

  function handleAddEmployee() {
    if (!newName || !newBaseSalary || !newProfit || !newStoreBonus) {
      alert("請完整填寫所有欄位");
      return;
    }

    const nextId = getNextEmployeeId(employees);

    const newEmployee: Employee = {
      id: nextId,
      name: newName,
      baseSalary: Number(newBaseSalary),
      profit: Number(newProfit),
      storeBonus: Number(newStoreBonus),
    };

    setEmployees([...employees, newEmployee]);

    setNewName("");
    setNewBaseSalary("");
    setNewProfit("");
    setNewStoreBonus("");
  }

  function handleDeleteEmployee(id: string) {
    const confirmed = window.confirm("確定要刪除這位員工嗎？");
    if (!confirmed) return;

    setEmployees(employees.filter((employee) => employee.id !== id));

    if (editingId === id) {
      handleCancelEdit();
    }
  }

  function handleStartEdit(employee: Employee) {
    setEditingId(employee.id);
    setEditName(employee.name);
    setEditBaseSalary(String(employee.baseSalary));
    setEditProfit(String(employee.profit));
    setEditStoreBonus(String(employee.storeBonus));
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditBaseSalary("");
    setEditProfit("");
    setEditStoreBonus("");
  }

  function handleSaveEdit(id: string) {
    if (!editName || !editBaseSalary || !editProfit || !editStoreBonus) {
      alert("請完整填寫編輯欄位");
      return;
    }

    const updatedEmployees = employees.map((employee) =>
      employee.id === id
        ? {
            ...employee,
            name: editName,
            baseSalary: Number(editBaseSalary),
            profit: Number(editProfit),
            storeBonus: Number(editStoreBonus),
          }
        : employee
    );

    setEmployees(updatedEmployees);
    handleCancelEdit();
  }

  return (
    <div style={{ padding: "32px" }}>
      <h1 style={pageTitleStyle}>💰 薪資獎金</h1>
      <p style={pageDescStyle}>
        這裡會顯示員工底薪、個人獎金、店級獎金與總薪資。
      </p>

      <div style={summaryGridStyle}>
        <div style={cardStyle}>
          <p style={labelStyle}>本月總底薪</p>
          <h2 style={valueStyle}>NT$ {totalBaseSalary.toLocaleString()}</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>本月個人獎金</p>
          <h2 style={valueStyle}>NT$ {totalPersonalBonus.toLocaleString()}</h2>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>本月店級獎金</p>
          <h2 style={valueStyle}>NT$ {totalStoreBonus.toLocaleString()}</h2>
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
          <input
            style={inputStyle}
            placeholder="本月毛利"
            type="number"
            value={newProfit}
            onChange={(e) => setNewProfit(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="店級獎金"
            type="number"
            value={newStoreBonus}
            onChange={(e) => setNewStoreBonus(e.target.value)}
          />
        </div>

        <button style={buttonStyle} onClick={handleAddEmployee}>
          新增員工
        </button>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>員工薪資明細</h2>

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
                    <td style={tdStyle}>{employee.id}</td>

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
                        employee.baseSalary.toLocaleString()
                      )}
                    </td>

                    <td style={tdStyle}>
                      {isEditing ? (
                        <input
                          style={tableInputStyle}
                          type="number"
                          value={editProfit}
                          onChange={(e) => setEditProfit(e.target.value)}
                        />
                      ) : (
                        employee.profit.toLocaleString()
                      )}
                    </td>

                    <td style={tdStyle}>
                      {isEditing
                        ? calculatePersonalBonus(Number(editProfit || 0)).toLocaleString()
                        : employee.personalBonus.toLocaleString()}
                    </td>

                    <td style={tdStyle}>
                      {isEditing ? (
                        <input
                          style={tableInputStyle}
                          type="number"
                          value={editStoreBonus}
                          onChange={(e) => setEditStoreBonus(e.target.value)}
                        />
                      ) : (
                        employee.storeBonus.toLocaleString()
                      )}
                    </td>

                    <td style={tdHighlightStyle}>
                      {isEditing
                        ? (
                            Number(editBaseSalary || 0) +
                            calculatePersonalBonus(Number(editProfit || 0)) +
                            Number(editStoreBonus || 0)
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
            </tbody>
          </table>
        </div>
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
  fontSize: "36px",
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
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "12px",
  marginBottom: "16px",
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