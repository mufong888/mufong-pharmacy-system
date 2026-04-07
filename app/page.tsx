"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>📊 管理系統</h1>

      <div style={gridStyle}>
        {/* 薪資獎金 */}
        <Link href="/bonus" style={cardStyle}>
          <h2 style={cardTitleStyle}>💰 薪資獎金</h2>
          <p style={cardDescStyle}>
            查看員工底薪、毛利、獎金與排名
          </p>
        </Link>

        {/* POS 匯入 */}
        <Link href="/pos-import" style={cardStyle}>
          <h2 style={cardTitleStyle}>📥 POS 匯入</h2>
          <p style={cardDescStyle}>
            上傳門市銷售 CSV，自動計算毛利
          </p>
        </Link>
      </div>
    </div>
  );
}

const containerStyle = {
  padding: "40px",
};

const titleStyle = {
  fontSize: "36px",
  fontWeight: "bold" as const,
  marginBottom: "30px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "20px",
};

const cardStyle = {
  display: "block",
  padding: "24px",
  borderRadius: "20px",
  background: "#ffffff",
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  textDecoration: "none",
  color: "#1f3b4d",
};

const cardTitleStyle = {
  fontSize: "20px",
  fontWeight: "bold" as const,
  marginBottom: "10px",
};

const cardDescStyle = {
  color: "#6b7280",
  fontSize: "14px",
};