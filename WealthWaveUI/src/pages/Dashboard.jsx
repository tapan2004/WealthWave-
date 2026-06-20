import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, CreditCard } from 'lucide-react';
import Card from '../components/Card';
import api from '../services/api';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatCurrency = (amount) => {
  const isNegative = amount < 0;
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${isNegative ? '-' : ''}₹${formatted}`;
};

const formatYAxis = (value) => {
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  if (value === 0) return '₹0';
  return `₹${value}`;
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ balance: 0, income: 0, expenses: 0 });
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [summaryRes, chartRes, categoriesRes, recentRes] = await Promise.all([
          api.get('/transactions/summary'),
          api.get('/transactions/chart/monthly-expense'),
          api.get('/categories'),
          api.get('/transactions/recent')
        ]);
        
        // Stats
        setStats({
          balance: summaryRes.data.balance || 0,
          income: summaryRes.data.totalIncome || 0,
          expenses: summaryRes.data.totalExpense || 0
        });

        // Area Chart (mapping month numbers to names and providing default 0s if only expenses exist)
        const formattedChart = (chartRes.data || []).map(item => ({
          name: MONTHS[item.month - 1] || 'Unknown',
          expense: item.total || 0,
          income: 0 // Backend currently only provides monthly expenses out of the box
        }));
        setChartData(formattedChart);

        // Pie Chart
        const expenseCategories = categoriesRes.data
          .filter(c => c.type === 'EXPENSE' && c.totalAmount > 0)
          .map((c, i) => ({
            name: c.name,
            value: c.totalAmount,
            color: PIE_COLORS[i % PIE_COLORS.length]
          }));
        setPieData(expenseCategories);

        // Recent
        setRecentTransactions(recentRes.data || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-slate-500">Loading your financial overview...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Here's your financial overview for this month.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`rounded-2xl p-6 text-white shadow-lg relative overflow-hidden transition-all duration-500 ${
          stats.balance < 0 
            ? 'bg-gradient-to-br from-rose-600 to-orange-700 shadow-rose-500/30' 
            : 'bg-gradient-to-br from-primary-600 to-indigo-700 shadow-primary-500/30'
        }`}>
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/80 font-medium mb-1">Total Balance</p>
                <h2 className="text-4xl font-bold tracking-tight">{formatCurrency(stats.balance)}</h2>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Wallet className="text-white w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        <Card className="hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Total Income</p>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(stats.income)}</h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowUpRight className="text-emerald-500 w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Total Expenses</p>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(stats.expenses)}</h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowDownRight className="text-rose-500 w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Monthly Expenses Overview</h3>
          <div className="h-[200px] sm:h-[300px] w-full">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-400">No expense data to display yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}} 
                    tickFormatter={formatYAxis}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Expenses by Category</h3>
          <div className="h-[200px] sm:h-[250px] w-full flex items-center justify-center relative">
            {pieData.length === 0 ? (
              <div className="text-slate-400 text-sm">No expenses categorised</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">Total</span>
                  <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(stats.expenses)}</span>
                </div>
              </>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {pieData.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">₹{item.value.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Recent Transactions</h3>
          <button className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium text-sm transition-colors">View All</button>
        </div>
        <div className="space-y-4">
          {recentTransactions.length === 0 ? (
            <div className="text-center text-slate-500 py-8">No recent transactions.</div>
          ) : recentTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                  {tx.type === 'INCOME' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">{tx.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{tx.categoryName || 'General'}</p>
                </div>
              </div>
              <div className={`font-bold ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                {tx.type === 'INCOME' ? '+' : '-'}₹{Math.abs(tx.amount).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
