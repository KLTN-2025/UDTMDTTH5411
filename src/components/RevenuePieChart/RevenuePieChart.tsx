import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import './RevenuePieChart.css';

interface ShopRevenueData {
  shop_id: string;
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  total_orders: number;
  percentage: number;
  [key: string]: string | number; // Index signature để tương thích với recharts
}

interface RevenueResponse {
  data: ShopRevenueData[];
  summary: {
    total_revenue: number;
    total_cost: number;
    total_profit: number;
    total_orders: number;
  };
}

// Màu sắc cho biểu đồ (theo palette đã định nghĩa)
const COLORS = [
  '#FF8FAB', // Rose
  '#73D13D', // Green
  '#40A9FF', // Blue
  '#A3A3A3', // Zinc
  '#FFCF33', // Light Yellow
  '#FFC53D', // Amber
  '#36CFC9', // Cyan
  '#FFB3C6', // Rose light
  '#B7EB8F', // Green light
  '#91D5FF', // Blue light
];

const RevenuePieChart: React.FC = () => {
  const [revenueData, setRevenueData] = useState<ShopRevenueData[]>([]);
  const [summary, setSummary] = useState<RevenueResponse['summary'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:8000/orders/analytics/revenue-by-shop');
      
      if (!response.ok) {
        throw new Error('Không thể tải dữ liệu doanh thu');
      }
      
      const result: RevenueResponse = await response.json();
      setRevenueData(result.data);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu');
      console.error('Error fetching revenue data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="revenue-tooltip">
          <p className="tooltip-label">{data.name}</p>
          <p className="tooltip-value">
            Doanh thu: {formatCurrency(data.revenue)}
          </p>
          <p className="tooltip-cost">
            Tiền gốc: {formatCurrency(data.cost)}
          </p>
          <p className="tooltip-profit">
            Lợi nhuận: {formatCurrency(data.profit)}
          </p>
          <p className="tooltip-percentage">
            Tỷ lệ: {data.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Chỉ hiển thị label nếu phần trăm >= 5%
    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <div className="revenue-chart-container">
        <div className="chart-loading">Đang tải dữ liệu doanh thu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="revenue-chart-container">
        <div className="chart-error">
          <p>{error}</p>
          <button onClick={fetchRevenueData} className="retry-btn">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (revenueData.length === 0) {
    return (
      <div className="revenue-chart-container">
        <div className="chart-empty">
          <p>Chưa có dữ liệu doanh thu</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="revenue-chart-container">
      <div className="chart-header">
        <h2 className="chart-title">Phân tích doanh thu theo shop</h2>
        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-label">Tổng doanh thu:</span>
            <span className="stat-value revenue">{formatCurrency(summary.total_revenue)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Tổng tiền gốc:</span>
            <span className="stat-value cost">{formatCurrency(summary.total_cost)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Tổng lợi nhuận:</span>
            <span className="stat-value profit">{formatCurrency(summary.total_profit)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Tổng đơn hàng:</span>
            <span className="stat-value">{summary.total_orders}</span>
          </div>
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={revenueData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="revenue"
            >
              {revenueData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span style={{ color: entry.color }}>
                  {value} ({entry.payload.percentage}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-details">
        <h3 className="details-title">Chi tiết doanh thu theo shop</h3>
        <div className="details-table">
          <div className="details-header">
            <div className="header-cell shop-name">Tên shop</div>
            <div className="header-cell">Doanh thu</div>
            <div className="header-cell">Tiền gốc</div>
            <div className="header-cell">Lợi nhuận</div>
            <div className="header-cell">Tỷ lệ</div>
            <div className="header-cell">Đơn hàng</div>
          </div>
          <div className="details-list">
            {revenueData.map((item, index) => (
              <div key={item.shop_id} className="detail-item">
                <div className="detail-color" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <div className="detail-shop-name">{item.name}</div>
                <div className="detail-revenue">{formatCurrency(item.revenue)}</div>
                <div className="detail-cost">{formatCurrency(item.cost)}</div>
                <div className={`detail-profit ${item.profit >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(item.profit)}
                </div>
                <div className="detail-percentage">{item.percentage}%</div>
                <div className="detail-orders">{item.total_orders}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenuePieChart;

