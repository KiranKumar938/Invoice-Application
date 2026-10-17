import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface InvoiceStatusDonutProps {
  total: number;
  paid: { count: number; percentage: number };
  pending: { count: number; percentage: number };
  overdue: { count: number; percentage: number };
}

export const InvoiceStatusDonut: React.FC<InvoiceStatusDonutProps> = ({
  total,
  paid,
  pending,
  overdue,
}) => {
  const data = [
    { name: 'Paid', value: paid.count, color: '#10b981' },
    { name: 'Pending', value: pending.count, color: '#f59e0b' },
    { name: 'Overdue', value: overdue.count, color: '#f43f5e' },
  ];

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
      {/* Donut Chart with Center Text */}
      <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(val: any, name: any) => [`${val} Invoices`, name]}
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
              }}
            />
            <Pie
              data={data}
              innerRadius={55}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Counter */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[11px] font-medium text-slate-400">Total Invoices</span>
          <span className="text-2xl font-extrabold text-slate-800 tracking-tight">{total}</span>
        </div>
      </div>

      {/* Legend with matching breakdown stats */}
      <div className="flex-1 w-full space-y-3">
        <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-medium text-slate-700">Paid</span>
          </div>
          <span className="font-semibold text-slate-800">
            {paid.count} <span className="text-slate-400 font-normal">({paid.percentage}%)</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span className="font-medium text-slate-700">Pending</span>
          </div>
          <span className="font-semibold text-slate-800">
            {pending.count} <span className="text-slate-400 font-normal">({pending.percentage}%)</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-xs py-1.5">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <span className="font-medium text-slate-700">Overdue</span>
          </div>
          <span className="font-semibold text-slate-800">
            {overdue.count} <span className="text-slate-400 font-normal">({overdue.percentage}%)</span>
          </span>
        </div>
      </div>
    </div>
  );
};
