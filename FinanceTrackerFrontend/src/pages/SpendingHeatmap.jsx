import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import Card from '../components/Card';
import api from '../services/api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getColor(amount, max, isDark) {
  if (!amount || amount === 0) return isDark ? 'bg-slate-800' : 'bg-slate-100';
  const ratio = Math.min(amount / max, 1);
  if (ratio < 0.25) return isDark ? 'bg-emerald-900/60' : 'bg-emerald-200';
  if (ratio < 0.5) return isDark ? 'bg-emerald-700/70' : 'bg-emerald-400';
  if (ratio < 0.75) return isDark ? 'bg-amber-700/70' : 'bg-amber-400';
  return isDark ? 'bg-rose-700/70' : 'bg-rose-500';
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Mon=0
}

const SpendingHeatmap = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/transactions/daily-spending');
        setData(res.data);
      } catch (err) {
        console.error('Error fetching heatmap data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isDark = document.documentElement.classList.contains('dark');

  const { grid, maxAmount, monthTotal, activeDays } = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const grid = [];
    let max = 0;
    let total = 0;
    let active = 0;

    const dailyMap = {};
    data.forEach(d => { dailyMap[d.date] = d.amount; });

    // Empty cells for alignment
    for (let i = 0; i < firstDay; i++) grid.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const amount = dailyMap[dateStr] || 0;
      if (amount > max) max = amount;
      total += amount;
      if (amount > 0) active++;
      grid.push({ day: d, date: dateStr, amount });
    }
    return { grid, maxAmount: max, monthTotal: total, activeDays: active };
  }, [data, year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Spending Heatmap</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Visualize your daily spending patterns at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Month Total</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{monthTotal.toFixed(2)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Active Days</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeDays}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Peak Day</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{maxAmount.toFixed(2)}</p>
        </Card>
      </div>

      <Card className="p-6">
        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500">Loading heatmap...</div>
        ) : (
          <>
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">{d}</div>
              ))}
            </div>

            {/* Heatmap Grid */}
            <div className="grid grid-cols-7 gap-2 relative">
              {grid.map((cell, i) => (
                <div key={i} className="aspect-square relative">
                  {cell ? (
                    <div
                      className={`w-full h-full rounded-lg ${getColor(cell.amount, maxAmount, isDark)} flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:ring-2 hover:ring-primary-400 relative group`}
                      onMouseEnter={() => setTooltip(cell)}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{cell.day}</span>
                      {/* Tooltip */}
                      {tooltip?.date === cell.date && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
                          <p className="font-bold">{cell.date}</p>
                          <p>₹{cell.amount.toFixed(2)} spent</p>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45"></div>
                        </div>
                      )}
                    </div>
                  ) : <div className="w-full h-full"></div>}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-3 mt-6 text-xs text-slate-500 dark:text-slate-400">
              <span>Less</span>
              <div className={`w-4 h-4 rounded ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
              <div className={`w-4 h-4 rounded ${isDark ? 'bg-emerald-900/60' : 'bg-emerald-200'}`}></div>
              <div className={`w-4 h-4 rounded ${isDark ? 'bg-emerald-700/70' : 'bg-emerald-400'}`}></div>
              <div className={`w-4 h-4 rounded ${isDark ? 'bg-amber-700/70' : 'bg-amber-400'}`}></div>
              <div className={`w-4 h-4 rounded ${isDark ? 'bg-rose-700/70' : 'bg-rose-500'}`}></div>
              <span>More</span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default SpendingHeatmap;
