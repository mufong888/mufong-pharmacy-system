import Link from "next/link";

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #d8ece8",
  borderRadius: "16px",
  padding: "24px",
  textDecoration: "none",
  color: "#2f3e3e",
  display: "block",
  boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
};

export default function PosImportHomePage() {
  return (
    <div style={{ padding: "24px", background: "#f7fbfa", minHeight: "100vh" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "30px", margin: 0, color: "#2f3e3e", fontWeight: 700 }}>
          POS 匯入
        </h1>
        <p style={{ marginTop: "8px", color: "#5b6b6b", fontSize: "15px" }}>
          請選擇您要匯入的資料類型
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        <Link href="/pos-import/daily" style={cardStyle}>
          <div style={{ fontSize: "22px", marginBottom: "10px" }}>📅 每日銷售匯入</div>
          <div style={{ fontSize: "14px", color: "#607070", lineHeight: 1.8 }}>
            上傳每日 POS 銷售 CSV，
            <br />
            用來彙整每日營業額、來客數、毛利等資料。
          </div>
        </Link>

        <Link href="/monthly-import" style={cardStyle}>
          <div style={{ fontSize: "22px", marginBottom: "10px" }}>🗓️ 年度彙總匯入</div>
          <div style={{ fontSize: "14px", color: "#607070", lineHeight: 1.8 }}>
            上傳已整理好的年度彙總檔案，
            <br />
            直接匯入整體月份資料。
          </div>
        </Link>
      </div>
    </div>
  );
}