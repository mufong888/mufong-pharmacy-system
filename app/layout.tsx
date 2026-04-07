import Link from "next/link";

const linkStyle = {
  display: "block",
  padding: "10px 12px",
  borderRadius: "10px",
  color: "#2f3e3e",
  textDecoration: "none",
  marginBottom: "8px",
};

export const metadata = {
  title: "牧風藥局內部管理系統",
  description: "MuFong Pharmacy Internal System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#F7FBFB" }}>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <aside
            style={{
              width: "220px",
              background: "#BEE9E8",
              color: "#2f3e3e",
              padding: "24px 16px",
            }}
          >
            <h2 style={{ marginBottom: "24px" }}>牧風系統</h2>

            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li>
                <Link href="/dashboard" style={linkStyle}>
                  📊 業績總覽
                </Link>
              </li>

              <li>
                <Link href="/bonus" style={linkStyle}>
                  💰 薪資獎金
                </Link>
              </li>

              <li>
                <Link href="/performance" style={linkStyle}>
                  👨‍⚕️ 員工績效
                </Link>
              </li>

              <li>
                <Link href="/trends" style={linkStyle}>
                  📈 趨勢分析
                </Link>
              </li>

              {/* ✅ 新增這一段 */}
              <li>
                <Link href="/pos-import" style={linkStyle}>
                  📥 POS 匯入
                </Link>
              </li>
            </ul>
          </aside>

          <main style={{ flex: 1, padding: "32px" }}>{children}</main>
        </div>
      </body>
    </html>
  );
}