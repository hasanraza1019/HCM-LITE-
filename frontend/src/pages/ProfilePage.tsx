import React, { useState, useEffect } from 'react';
import { UserCheck, Phone, MapPin, Mail, Briefcase, DollarSign, Save, CheckCircle2, AlertCircle, RefreshCw, Award, FileText } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { LetterGeneratorModal } from '../components/LetterGeneratorModal.js';
import confetti from 'canvas-confetti';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [letterModalOpen, setLetterModalOpen] = useState(false);

  const fetchProfile = async () => {
    if (!user?.employeeId) return;
    try {
      setLoading(true);
      const res = await api.get(`/employees/${user.employeeId}`);
      setProfile(res.employee);
      setPhone(res.employee.phone || '');
      setAddress(res.employee.address || '');
    } catch (err: any) {
      toast.error(err.message || 'Failed to load profile');
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

    try {
      await api.put(`/employees/${user.employeeId}`, {
        phone,
        address
      });

      confetti({ particleCount: 50, spread: 50 });
      toast.success('Your contact details have been updated successfully!', 'Profile Saved');
      await refreshUser();
      await fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Update failed', 'Save Error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
        <span className="text-sm font-semibold">Loading personal profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs glass-card rounded-3xl max-w-md mx-auto">
        No employee profile linked to current account.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-7 pb-10">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-36 bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            Personnel Identity File
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            My Personal Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Self-service employee profile. You can review job parameters and request certified letters.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setLetterModalOpen(true)}
          className="relative z-10 inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <Award className="w-4 h-4 text-slate-950" />
          <span>Generate Official HR Letter</span>
        </button>
      </div>

      {/* Identity Card */}
      <div className="p-6 rounded-3xl glass-card space-y-5">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/30">
            {profile.full_name?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20 font-bold">
                {profile.code}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Active Confirmed
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">{profile.full_name}</h2>
            <p className="text-xs text-slate-400 font-medium">{profile.designation_name} · <span className="text-blue-400">{profile.department_name}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs">
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Work Email</span>
            <span className="font-semibold text-white mt-1 block truncate">{profile.email}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Joining Date</span>
            <span className="font-semibold text-white mt-1 block">{profile.joining_date}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Basic Salary</span>
            <span className="font-semibold text-white mt-1 block">
              Rs. {Number(profile.basic_salary).toLocaleString()}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <span className="text-emerald-400 block text-[10px] uppercase font-bold tracking-wider">Gross CTC</span>
            <span className="font-black text-emerald-400 mt-1 block text-sm">
              Rs. {(Number(profile.basic_salary) * 1.5).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Contact Form */}
      <div className="p-6 rounded-3xl glass-card space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Editable Contact Details
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0300-1234567"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Residential Address</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Street, City, Country"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Updating...' : 'Update Contact Information'}</span>
          </button>
        </form>
      </div>

      {/* Official Letterhead Generator Modal */}
      <LetterGeneratorModal
        isOpen={letterModalOpen}
        onClose={() => setLetterModalOpen(false)}
        employeeData={{
          fullName: profile.full_name,
          code: profile.code,
          designation: profile.designation_name || 'Staff Member',
          department: profile.department_name || 'General Operations',
          joiningDate: profile.joining_date,
          grossSalary: Number(profile.basic_salary) * 1.5,
          email: profile.email
        }}
      />
    </div>
  );
}

