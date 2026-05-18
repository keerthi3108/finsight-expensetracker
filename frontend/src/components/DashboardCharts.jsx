import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatINR } from "../utils/format.js";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label || payload[0]?.name}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatINR(p.value)}
        </p>
      ))}
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="chart-empty">
      <p>{message}</p>
    </div>
  );
}

export default function DashboardCharts({ pieData, barData, lineData }) {
  return (
    <div className="charts-grid">
      <article className="chart-card glass">
        <div className="chart-head">
          <h3>Category Split</h3>
          <span className="chart-badge">Pie</span>
        </div>
        {pieData.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="Upload bills to see category breakdown" />
        )}
      </article>

      <article className="chart-card glass">
        <div className="chart-head">
          <h3>Monthly Expenses</h3>
          <span className="chart-badge">Bar</span>
        </div>
        {barData.some((d) => d.total > 0) ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="total" name="Spend" fill="#22d3ee" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="Monthly bars appear after you add expenses" />
        )}
      </article>

      <article className="chart-card glass">
        <div className="chart-head">
          <h3>Spending Trend</h3>
          <span className="chart-badge">Line</span>
        </div>
        {lineData.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Cumulative"
                stroke="#a78bfa"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#a78bfa" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="Trend line builds as you add more bills" />
        )}
      </article>
    </div>
  );
}
