import React, { useState, useEffect } from 'react';
import { UserCheck, Phone, MapPin, Mail, Briefcase, DollarSign, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import confetti from 'canvas-confetti';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProfile = async () => {
    if (!user?.employeeId) return;
    try {
      setLoading(true);
      const res = await api.get(`/employees/${user.employeeId}`);
      setProfile(res.employee);
      setPhone(res.employee.phone || '');
      setAddress(res.employee.address || '');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employeeId) return;
    setSaving(true);
    setMsg(null);

    try {
      await api.put(`/employees/${user.employeeId}`, {
        phone,
        address
      });

      confetti({ particleCount: 40, spread: 45 });
      setMsg({ type: 'success', text: 'Contact information updated successfully.' });
      await refreshUser();
      await fetchProfile();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
        <span>Loading personal profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        No employee profile linked to current account.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          My Personal Profile
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Self-service employee profile. You can review your job details and update your contact information below.
        </p>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center space-x-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 border border-rose-200'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Identity Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
            {profile.full_name?.charAt(0)}
          </div>
          <div>
            <span className="text-xs font-mono text-blue-600 font-bold">{profile.code}</span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">{profile.full_name}</h2>
            <p className="text-xs text-slate-400">{profile.designation_name} · {profile.department_name}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Work Email:</span>
            <span className="font-semibold">{profile.email}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Joining Date:</span>
            <span className="font-semibold">{profile.joining_date}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Basic Salary:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Rs. {Number(profile.basic_salary).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-emerald-600 block text-[11px] font-bold">Gross Salary:</span>
            <span className="font-bold text-emerald-600">
              Rs. {(Number(profile.basic_salary) * 1.5).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Contact Form */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          Editable Contact Details
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0300-1234567"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Residential Address</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Street, City, Country"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Update Contact Information'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

