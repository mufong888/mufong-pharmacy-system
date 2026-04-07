"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const yearlySalesData = [
    { month: "1月", sales: 120000 },
    { month: "2月", sales: 98000 },
    { month: "3月", sales: 135000 },
    { month: "4月", sales: 142000 },
    { month: "5月", sales: 128000 },
    { month: "6月", sales: 155000 },
    { month: "7月", sales: 168000 },
    { month: "8月", sales: 172000 },
    { month: "9月", sales: 160000 },
    { month: "10月", sales: 181000 },
    { month: "11月", sales: 190000 },
    { month: "12月", sales: 205000 },
  ];

  const monthlyRxData = [
    { month: "1月", general: 320, chronic: 210 },
    { month: "2月", general: 280, chronic: 190 },
    { month: "3月", general: 350, chronic: 240 },
    { month: "4月", general: 370, chronic: 250 },
    { month: "5月", general: 340, chronic: 230 },
    { month: "6月", general: 390, chronic: 260 },
    { month: "7月", general: 410, chronic: 280 },
    { month: "8月", general: 420, chronic: 300 },
    { month: "9月", general: 395, chronic: 275 },
    { month: "10月", general: 430, chronic: 310 },
    { month: "11月", general: 450, chronic: 320 },
    { month: "12月", general: 480, chronic: 350 },
  ];

  const todaySales = 12800;
  const monthlySales = 181000;
  const monthlyGrossProfit = 63200;
  const yearlySales = yearlySalesData.reduce((sum, item) => sum + item.sales, 0);

  const lastYearSales = 1680000;
  const lastMonthSales = 165000;
  const sameMonthLastYearSales = 158000;

  const monthlyGeneralRx = 420;
  const monthlyChronicRx = 310;
  const monthlyTotalRx = monthlyGeneralRx + monthlyChronicRx;

  const yearlyGeneralRx = 4620;
  const yearlyChronicRx = 3380;
  const yearlyTotalRx = yearlyGeneralRx + yearlyChronicRx;

  const sameMonthLastYearRx = 680;

  const yearlyGrowthRate =
    lastYearSales === 0 ? 0 : ((yearlySales - lastYearSales) / lastYearSales) * 100;

  const monthlyGrowthRate =
    lastMonthSales === 0 ? 0 : ((monthlySales - lastMonthSales) / lastMonthSales) * 100;

  const samePeriodGrowthRate =
    sameMonthLastYearSales === 0
      ? 0
      : ((monthlySales - sameMonthLastYearSales) / sameMonthLastYearSales) * 100;

  const rxSamePeriodGrowthRate =
    sameMonthLastYearRx === 0
      ? 0
      : ((monthlyTotalRx - sameMonthLastYearRx) / sameMonthLastYearRx) * 100;

  const cardStyle = {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    minWidth: "220px",
    flex: "1 1 220px",
  } as const;

  const titleStyle = {
    fontSize: "14px",
    color: "#84A59D",
    marginBottom: "10px",
  } as const;

  const valueStyle = {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#2f3e3e",
  } as const;

  const panelStyle = {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    marginTop: "10px",
  } as const;

  const formatCurrency = (num: number) => {
    return `NT$ ${num.toLocaleString("zh-TW")}`;
  };

  const formatPercent = (num: number) => {
    return `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
  };

  const percentColor = (num: number) => {
    return num >= 0 ? "#84A59D" : "#F28482";
  };

  return (
    <div>
      <h1 style={{ marginBottom: "8px", color: "#2f3e3e" }}>📊 業績總覽</h1>
      <p style={{ color: "#6b7280", marginBottom: "24px" }}>
        這裡之後會放業績、毛利、年度趨勢、成長率與處方箋統計。
      </p>

      <div
        style={{
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
          marginBottom: "30px",
        }}
      >
        <div style={cardStyle}>
          <div style={titleStyle}>今日業績</div>
          <div style={valueStyle}>{formatCurrency(todaySales)}</div>
        </div>

        <div style={cardStyle}>
          <div style={titleStyle}>本月業績</div>
          <div style={valueStyle}>{formatCurrency(monthlySales)}</div>
        </div>

        <div style={cardStyle}>
          <div style={titleStyle}>本月毛利</div>
          <div style={valueStyle}>{formatCurrency(monthlyGrossProfit)}</div>
        </div>

        <div style={cardStyle}>
          <div style={titleStyle}>年度業績</div>
          <div style={valueStyle}>{formatCurrency(yearlySales)}</div>
        </div>

        <div style={cardStyle}>
          <div style={titleStyle}>年度成長率</div>
          <div style={{ ...valueStyle, color: percentColor(yearlyGrowthRate) }}>
            {formatPercent(yearlyGrowthRate)}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={titleStyle}>本月成長率</div>
          <div style={{ ...valueStyle, color: percentColor(monthlyGrowthRate) }}>
            {formatPercent(monthlyGrowthRate)}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={titleStyle}>去年同期比較</div>
          <div style={{ ...valueStyle, color: percentColor(samePeriodGrowthRate) }}>
            {formatPercent(samePeriodGrowthRate)}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={titleStyle}>本月一般箋</div>
          <div style={valueStyle}>{monthlyGeneralRx.toLocaleString("zh-TW")} 張</div>
        </div>

        <div style={cardStyle}>
          <div style={titleStyle}>本月慢性處方箋</div>
          <div style={valueStyle}>{monthlyChronicRx.toLocaleString("zh-TW")} 張</div>
        </div>

        <div style={cardStyle}>
          <div style={titleStyle}>本月處方總數</div>
          <div style={valueStyle}>{monthlyTotalRx.toLocaleString("zh-TW")} 張</div>
        </div>

        <div style={cardStyle}>
          <div style={titleStyle}>年度處方總數</div>
          <div style={valueStyle}>{yearlyTotalRx.toLocaleString("zh-TW")} 張</div>
        </div>

        <div style={cardStyle}>
          <div style={titleStyle}>處方去年同期比較</div>
          <div style={{ ...valueStyle, color: percentColor(rxSamePeriodGrowthRate) }}>
            {formatPercent(rxSamePeriodGrowthRate)}
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <h2 style={{ marginTop: 0, marginBottom: "18px", color: "#2f3e3e" }}>
          📈 年度業績趨勢
        </h2>

        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <LineChart data={yearlySalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value) => `${Number(value).toLocaleString("zh-TW")}`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `${label}`}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#84A59D"
                strokeWidth={3}
                dot={{ r: 4 }}
                name="年度業績"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={panelStyle}>
        <h2 style={{ marginTop: 0, marginBottom: "18px", color: "#2f3e3e" }}>
          🧾 處方箋月趨勢
        </h2>

        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <LineChart data={monthlyRxData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "一般箋") return [`${value} 張`, "一般箋"];
                  if (name === "慢性處方箋") return [`${value} 張`, "慢性處方箋"];
                  return [`${value} 張`, name];
                }}
              />
              <Line
                type="monotone"
                dataKey="general"
                stroke="#84A59D"
                strokeWidth={3}
                name="一般箋"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="chronic"
                stroke="#F28482"
                strokeWidth={3}
                name="慢性處方箋"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}