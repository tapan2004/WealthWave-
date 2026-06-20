import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Mail, Lock, User, ArrowRight, Loader2, TrendingUp, CheckCircle2, PieChart, Wallet, Bell } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Signup() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    if (formData.password.length < 8) {
      return setError('Password must be at least 8 characters long');
    }

    setLoading(true);
    setError('');
    
    try {
      await api.post('/signup', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: "USER"
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data || 'Failed to create an account. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { strength: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 3) return { strength: 2, label: 'Fair', color: 'bg-amber-500' };
    return { strength: 3, label: 'Strong', color: 'bg-emerald-500' };
  };
  const pwStrength = getPasswordStrength(formData.password);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center animate-in fade-in zoom-in duration-500 max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl border border-slate-100">
          <div className="w-24 h-24 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Mail className="w-12 h-12 text-primary-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Verification Required</h2>
          <p className="text-slate-600 text-lg mb-8 leading-relaxed">
            We've sent a verification link to <span className="text-primary-600 font-semibold">{formData.email}</span>. Please click the link in your email to activate your account.
          </p>
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-sm flex items-start gap-3 text-left">
              <Bell className="w-5 h-5 flex-shrink-0 text-amber-600" />
              <p>Don't see it? Check your <b>spam folder</b> or wait a few minutes before trying to log in.</p>
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-primary-900 to-slate-900 relative overflow-hidden">
        {/* Animated orbs */}
        <div className="absolute top-32 right-20 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 left-20 w-96 h-96 bg-primary-500/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/3 left-1/3 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
        
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 overflow-hidden">
              <img src={logo} alt="WealthWave Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-2xl text-white tracking-tight">WealthWave</span>
          </div>

          {/* Hero */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
                Start your<br />
                <span className="bg-gradient-to-r from-indigo-400 to-primary-400 bg-clip-text text-transparent">financial journey</span>
              </h2>
              <p className="text-lg text-slate-300 mt-4 max-w-md leading-relaxed">
                Join thousands of users who trust WealthWave to manage their finances smarter.
              </p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: PieChart, value: '50K+', label: 'Active Users' },
                { icon: Wallet, value: '$2.4M', label: 'Tracked Monthly' },
                { icon: Bell, value: '99.9%', label: 'Uptime' },
                { icon: TrendingUp, value: '4.9★', label: 'User Rating' },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
                  <stat.icon className="w-5 h-5 text-primary-400 mb-2" />
                  <p className="text-white font-bold text-lg">{stat.value}</p>
                  <p className="text-slate-400 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom note */}
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Free forever. No credit card required.</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 relative overflow-hidden px-4 py-12">
        {/* Mobile background blobs */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 lg:hidden"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 lg:hidden"></div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/30 overflow-hidden">
              <img src={logo} alt="WealthWave Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">WealthWave</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create your account</h1>
            <p className="text-slate-500 mt-2">Start tracking your finances in under 60 seconds.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-rose-600 text-xs font-bold">!</span>
              </div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  name="username"
                  required
                  minLength={4}
                  maxLength={20}
                  value={formData.username}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm text-slate-800 placeholder:text-slate-400"
                  placeholder="johndoe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm text-slate-800 placeholder:text-slate-400"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm text-slate-800 placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
              {/* Password strength bar */}
              {formData.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3].map(level => (
                      <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${pwStrength.strength >= level ? pwStrength.color : 'bg-slate-200'}`}></div>
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${pwStrength.color.replace('bg-', 'text-')}`}>{pwStrength.label}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm text-slate-800 placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1.5 text-xs text-rose-500 font-medium">Passwords don't match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3.5 px-4 mt-2 rounded-xl text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Create Account'}
              {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
