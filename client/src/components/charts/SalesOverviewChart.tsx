import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatINR } from '../../utils/currency.js';

interface SalesOverviewChartProps {
  data: Array<{ month: string; sales?: number; revenue?: number; collections?: number }>;
}

export const SalesOverviewChart: React.FC<SalesOverviewChartProps> = ({ data }) => {
  // Normalize data so both revenue and collections exist
  const chartData = data.map((d) => ({
    month: d.month,
    revenue: d.revenue ?? d.sales ?? 0,
    collections: d.collections ?? Math.round((d.revenue ?? d.sales ?? 0) * 0.85),
  }));

  return (
    <div className="w-full">
      <div className="flex items-center justify-end gap-4 mb-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
          <span className="text-slate-600 font-medium">Invoiced Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
          <span className="text-slate-600 font-medium">Collections</span>
        </div>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="collectionsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹ ${value >= 1000 ? `${value / 1000}k` : value}`}
            />
            <Tooltip
              formatter={(value: any, name: any) => [
                formatINR(value),
                name === 'revenue' ? 'Invoiced Revenue' : 'Collections',
              ]}
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="revenue"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#1d4ed8' }}
              fill="url(#revenueGrad)"
            />
            <Area
              type="monotone"
              dataKey="collections"
              name="collections"
              stroke="#10b981"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: '#10b981', stroke: '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: '#059669' }}
              fill="url(#collectionsGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
