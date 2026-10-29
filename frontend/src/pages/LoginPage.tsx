import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Building2, Lock, Mail, Eye, EyeOff, Sparkles, Shield, User, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

export function LoginPage() {
  const navigate = useNavigate();
  const { user, login, isInitialized, companyName } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized === false) {
      navigate('/setup');
    }
    if (user) {
      if (user.role === 'Admin') navigate('/admin');
      else if (user.role === 'HR') navigate('/hr');
      else navigate('/employee');
    }
  }, [isInitialized, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.token, res.user, res.employee);

      if (res.user.mustChangePassword) {
        navigate('/change-password');
      } else if (res.user.role === 'Admin') {
        navigate('/admin');
      } else if (res.user.role === 'HR') {
        navigate('/hr');
      } else {
        navigate('/employee');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
  };

  const handleSeedDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/seed-demo', {});
      alert('Demo accounts & company data successfully seeded into MongoDB Atlas!');
      handleDemoFill('admin@saylaniit.com', 'Admin@123');
    } catch (err: any) {
      setError(err.message || 'Failed to seed demo data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh-dark relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-500/30 mb-4 animate-float">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            {companyName || 'HCM Lite'}
          </h1>
          <p className="text-xs uppercase tracking-widest text-indigo-400 font-extrabold mt-1.5 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI-Powered Human Capital Management</span>
          </p>
        </div>

        {/* Glass Card */}
        <div className="glass-panel rounded-3xl shadow-2xl border border-white/10 p-6 sm:p-8 backdrop-blur-xl">
          <div className="mb-6 text-center sm:text-left">
            <h2 className="text-xl font-extrabold text-white">Welcome Back</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your credentials to access your organization portal.
            </p>
          </div>

          {/* Quick Demo Login Switcher */}
          <div className="mb-6 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center sm:text-left">
              1-Click Demo Credentials:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('admin@saylaniit.com', 'Admin@123')}
                className="py-1.5 px-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-bold text-[11px] transition text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('hr@saylaniit.com', 'Hr@123')}
                className="py-1.5 px-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold text-[11px] transition text-center"
              >
                HR Portal
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('ali.khan@saylaniit.com', 'Employee@123')}
                className="py-1.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] transition text-center"
              >
                Employee
              </button>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">First time or empty DB?</span>
              <button
                type="button"
                onClick={handleSeedDemo}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline transition"
              >
                ⚡ Initialize Demo Data in Atlas
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            </button>
          </form>

          {/* First run prompt if not setup */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Need fresh system installation?{' '}
              <Link to="/setup" className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline">
                Run Setup Wizard →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
