import React, { useState, useEffect } from 'react';
import { Shield, TrendingUp, Wallet, Activity, Target } from 'lucide-react';
import Card from '../components/Card';
import api from '../services/api';

const GRADE_COLORS = {
  Excellent: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', ring: 'ring-emerald-400' },
  Good: { text: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-500', ring: 'ring-primary-400' },
  Fair: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', ring: 'ring-amber-400' },
  'Needs Work': { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500', ring: 'ring-orange-400' },
  Critical: { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500', ring: 'ring-rose-400' },
};

const ScoreGauge = ({ score, maxScore, grade }) => {
  const percentage = (score / maxScore) * 100;
  const colors = GRADE_COLORS[grade] || GRADE_COLORS.Fair;
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-56 h-56">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-100 dark:text-slate-800" />
          <circle
            cx="100" cy="100" r="90" fill="none"
            strokeWidth="12" strokeLinecap="round"
            className={colors.text}
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black text-slate-900 dark:text-white">{score}</span>
          <span className={`text-lg font-bold ${colors.text}`}>{grade}</span>
          <span className="text-xs text-slate-400 mt-1">out of {maxScore}</span>
        </div>
      </div>
    </div>
  );
};

const ScoreBreakdown = ({ label, icon: Icon, score, maxScore, description }) => {
  const percent = Math.min((score / maxScore) * 100, 100);
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{label}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <span className="text-lg font-bold text-slate-800 dark:text-white">{score}<span className="text-sm text-slate-400">/{maxScore}</span></span>
      </div>
      <div className="overflow-hidden h-2 text-xs flex rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          style={{ width: `${percent}%` }}
          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500 transition-all duration-1000 ease-out rounded-full"
        ></div>
      </div>
    </Card>
  );
};

const HealthScore = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/transactions/health-score');
        setData(res.data);
      } catch (err) {
        console.error('Error fetching health score:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-500 dark:text-slate-400 animate-pulse">Calculating your financial health...</div>
    );
  }

  if (!data) {
    return <div className="text-center py-20 text-slate-500">Unable to calculate health score.</div>;
  }

  const tips = [];
  if (data.savingsRate < 20) tips.push('Try to save at least 20% of your income each month.');
  if (data.budgetScore < 200) tips.push('You\'re exceeding some of your budgets. Consider adjusting limits or reducing spending.');
  if (data.consistencyScore < 150) tips.push('Your spending varies a lot month to month. Try to maintain a consistent budget.');
  if (data.activityScore < 100) tips.push('Track more transactions regularly to build better financial awareness.');
  if (tips.length === 0) tips.push('Great job! Keep maintaining your excellent financial habits.');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Financial Health</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Your personalized financial wellness score.</p>
      </div>

      {/* Main Score */}
      <Card className="p-10 text-center">
        <ScoreGauge score={data.score} maxScore={data.maxScore} grade={data.grade} />

        <div className="mt-6 max-w-md mx-auto">
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            Your savings rate is <span className="font-bold text-slate-800 dark:text-white">{data.savingsRate}%</span>
          </p>
        </div>
      </Card>

      {/* Score Breakdown */}
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">Score Breakdown</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScoreBreakdown label="Savings" icon={TrendingUp} score={data.savingsScore} maxScore={250} description="Income vs expenses ratio" />
        <ScoreBreakdown label="Budget Adherence" icon={Target} score={data.budgetScore} maxScore={250} description="Staying within set budgets" />
        <ScoreBreakdown label="Consistency" icon={Activity} score={data.consistencyScore} maxScore={200} description="Monthly spending stability" />
        <ScoreBreakdown label="Activity" icon={Wallet} score={data.activityScore} maxScore={150} description="Regular transaction tracking" />
      </div>

      {/* Tips */}
      <Card className="p-6 bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20 border-primary-100 dark:border-primary-800/30">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <h3 className="font-bold text-slate-800 dark:text-white">Improvement Tips</h3>
        </div>
        <ul className="space-y-2">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0"></span>
              {tip}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

export default HealthScore;