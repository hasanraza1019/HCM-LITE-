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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 sm:p-8 text-white relative">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-blue-200">Enterprise Onboarding Wizard</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">HCM Lite Initial Setup</h1>
            </div>
          </div>
          <p className="text-sm text-blue-100 max-w-lg">
            Initialize your organization parameters, attendance rules, geofence radius, and the first master Admin account.
          </p>

          {/* Stepper indicators */}
          <div className="flex items-center space-x-3 mt-6">
            <div className={`flex items-center space-x-2 text-xs font-semibold px-3 py-1 rounded-full ${step === 1 ? 'bg-white text-blue-900' : 'bg-white/20 text-white'}`}>
              <Building2 className="w-3.5 h-3.5" />
              <span>1. Company & Rules</span>
            </div>
            <div className={`flex items-center space-x-2 text-xs font-semibold px-3 py-1 rounded-full ${step === 2 ? 'bg-white text-blue-900' : 'bg-white/20 text-white'}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>2. Master Admin Account</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNext} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                  Company Name *
                </label>
                <div className="relative">
                  <Building2 className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. Saylani IT Training"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Office Start Time
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="time"
                      value={officeStartTime}
                      onChange={e => setOfficeStartTime(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Grace Minutes
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={graceMinutes}
                    onChange={e => setGraceMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Half-Day (Hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    max={12}
                    value={halfDayHours}
                    onChange={e => setHalfDayHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                  Official Weekend Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Saturday', 'Sunday', 'Friday', 'Monday'].map(day => (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleWeekend(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        weekendDays.includes(day)
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {day} {weekendDays.includes(day) && '✓'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Camera Geofence Location (Zaitoon Ashraf Park)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Use My GPS
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={officeLatitude}
                      onChange={e => setOfficeLatitude(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={officeLongitude}
                      onChange={e => setOfficeLongitude(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Radius (Meters)</label>
                    <input
                      type="number"
                      value={officeRadius}
                      onChange={e => setOfficeRadius(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition"
                >
                  <span>Continue to Admin Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                  Admin Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  placeholder="admin@saylaniit.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Admin Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Minimum 6 characters</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-1">Account Governance Note:</p>
                <p>This master Admin account will possess complete company governance. Once initialized, the Admin can create HR logins, manage organizational settings, and finalize monthly payroll runs.</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center space-x-2 px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition disabled:opacity-50"
                >
                  {loading ? (
                    <span>Initializing System...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
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

