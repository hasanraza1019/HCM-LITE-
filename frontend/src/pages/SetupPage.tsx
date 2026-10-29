import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, MapPin, Clock, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import confetti from 'canvas-confetti';

export function SetupPage() {
  const navigate = useNavigate();
  const { login, checkSystemStatus } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState('Saylani IT Training');
  const [officeStartTime, setOfficeStartTime] = useState('09:00');
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [halfDayHours, setHalfDayHours] = useState(5.0);
  const [weekendDays, setWeekendDays] = useState<string[]>(['Saturday', 'Sunday']);
  const [officeLatitude, setOfficeLatitude] = useState(24.8607);
  const [officeLongitude, setOfficeLongitude] = useState(67.0011);
  const [officeRadius, setOfficeRadius] = useState(150.0);

  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const toggleWeekend = (day: string) => {
    if (weekendDays.includes(day)) {
      setWeekendDays(weekendDays.filter(d => d !== day));
    } else {
      setWeekendDays([...weekendDays, day]);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setOfficeLatitude(pos.coords.latitude);
          setOfficeLongitude(pos.coords.longitude);
        },
        err => {
          setError('Could not access current location: ' + err.message);
        }
      );
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Please provide a company name');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adminEmail || !adminPassword) {
      setError('Admin email and password are required');
      return;
    }

    if (adminPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (adminPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/setup', {
        companyName,
        officeStartTime,
        graceMinutes,
        halfDayHours,
        weekendDays,
        officeLatitude,
        officeLongitude,
        officeRadius,
        adminEmail,
        adminPassword
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      login(res.token, res.user, null);
      await checkSystemStatus();
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh-dark text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="max-w-2xl w-full glass-panel rounded-3xl shadow-2xl border border-white/10 overflow-hidden relative z-10 transition-all duration-300">
        {/* Header Banner */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-purple-600/20 border-b border-white/10 backdrop-blur-md">
          <div className="flex items-center space-x-3.5 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/30 flex items-center justify-center font-bold text-white">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                Enterprise Setup Wizard
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                HCM Lite Initial Setup
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-lg leading-relaxed">
            Configure your enterprise attendance geofencing, working hours, and create the root Master Administrator account.
          </p>

          {/* Stepper indicators */}
          <div className="flex items-center space-x-3 mt-6">
            <div className={`flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm ${
              step === 1
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/30 border border-blue-400/40'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}>
              <Building2 className="w-3.5 h-3.5" />
              <span>1. Company & Rules</span>
            </div>
            <div className="w-6 h-0.5 bg-white/10" />
            <div className={`flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm ${
              step === 2
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/30 border border-blue-400/40'
                : 'bg-white/5 text-slate-400 border border-white/10'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>2. Master Admin Account</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 bg-slate-900/60 backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3 shadow-lg shadow-rose-950/40 animate-shake">
              <span className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNext} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Company Name <span className="text-blue-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-5 h-5 absolute left-3.5 top-3.5 text-blue-400/80" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. Saylani IT Training"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent font-medium transition shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Office Start Time
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3.5 top-3.5 text-blue-400/80" />
                    <input
                      type="time"
                      value={officeStartTime}
                      onChange={e => setOfficeStartTime(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Grace Minutes
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={graceMinutes}
                    onChange={e => setGraceMinutes(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Half-Day (Hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    max={12}
                    value={halfDayHours}
                    onChange={e => setHalfDayHours(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Official Weekend Days
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {['Saturday', 'Sunday', 'Friday', 'Monday'].map(day => (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleWeekend(day)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                        weekendDays.includes(day)
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/30 border border-blue-400/40 scale-102'
                          : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-slate-200'
                      }`}
                    >
                      {day} {weekendDays.includes(day) ? '✓' : '+'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-md">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Camera Geofence Location (Zaitoon Ashraf Park)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className="px-3 py-1 rounded-lg text-xs font-semibold text-blue-300 bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 transition flex items-center gap-1 shadow-sm"
                  >
                    <span>Use My GPS</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold uppercase">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={officeLatitude}
                      onChange={e => setOfficeLatitude(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-950/60 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold uppercase">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={officeLongitude}
                      onChange={e => setOfficeLongitude(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-950/60 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold uppercase">Radius (Meters)</label>
                    <input
                      type="number"
                      value={officeRadius}
                      onChange={e => setOfficeRadius(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-950/60 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center space-x-2 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Continue to Admin Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Admin Email Address <span className="text-blue-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  placeholder="admin@saylaniit.com"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 font-medium transition shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Admin Password <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 font-medium transition shadow-inner"
                  />
                  <span className="text-[11px] text-slate-400 mt-1.5 block">Minimum 6 characters</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Confirm Password <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 font-medium transition shadow-inner"
                  />
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 backdrop-blur-md">
                <p className="font-bold text-white mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  Account Governance Note:
                </p>
                <p className="leading-relaxed">This master Admin account will possess complete company governance. Once initialized, the Admin can create HR logins, manage organizational settings, and finalize monthly payroll runs.</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-300 font-semibold text-sm hover:bg-white/10 hover:text-white transition"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center space-x-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Initializing System...
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Complete Setup & Launch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

