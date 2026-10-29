import React, { useState, useEffect } from 'react';
import {
  Building2, Clock, MapPin, Calendar, Briefcase, Plus, Trash2,
  CheckCircle2, AlertCircle, Save, ShieldCheck, RefreshCw, Settings2
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import confetti from 'canvas-confetti';

export function OrgSetupPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'Admin';

  const [activeTab, setActiveTab] = useState<'settings' | 'departments' | 'designations' | 'leaves' | 'holidays'>('settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings State
  const [settings, setSettings] = useState<any>({
    company_name: '',
    office_start_time: '09:00',
    grace_time_minutes: 15,
    half_day_hours: 5.0,
    weekend_days: ['Saturday', 'Sunday'],
    office_latitude: 24.8607,
    office_longitude: 67.0011,
    office_radius_meters: 150.0,
    late_penalty_enabled: 1
  });

  // Master Lists
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);

  // Add Forms
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  const [newDesigName, setNewDesigName] = useState('');
  const [newDesigDeptId, setNewDesigDeptId] = useState('');

  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  const loadAll = async () => {
    try {
      setLoading(true);
      const [sRes, dRes, desRes, lRes, hRes] = await Promise.all([
        api.get('/org/settings'),
        api.get('/org/departments'),
        api.get('/org/designations'),
        api.get('/org/leave-types'),
        api.get('/org/holidays')
      ]);

      if (sRes.settings) setSettings(sRes.settings);
      setDepartments(dRes.departments || []);
      setDesignations(desRes.designations || []);
      setLeaveTypes(lRes.leaveTypes || []);
      setHolidays(hRes.holidays || []);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setMsg(null);

    try {
      const res = await api.put('/org/settings', settings);
      setSettings(res.settings);
      setMsg({ type: 'success', text: 'Company rules and settings saved successfully.' });
      showToast('Company configuration and geofence parameters saved.', 'success');
      confetti({ particleCount: 40, spread: 45 });
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to save settings';
      setMsg({ type: 'error', text: errorMsg });
      showToast(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !isAdmin) return;
    try {
      await api.post('/org/departments', { name: newDeptName, description: newDeptDesc });
      setNewDeptName('');
      setNewDeptDesc('');
      loadAll();
      showToast('Department registered successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add department', 'error');
    }
  };

  const handleDeleteDept = async (id: number) => {
    if (!isAdmin || !confirm('Are you sure you want to delete this department?')) return;
    try {
      await api.delete(`/org/departments/${id}`);
      loadAll();
      showToast('Department removed.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete department', 'error');
    }
  };

  const handleAddDesig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesigName.trim() || !newDesigDeptId || !isAdmin) return;
    try {
      await api.post('/org/designations', { name: newDesigName, department_id: Number(newDesigDeptId) });
      setNewDesigName('');
      loadAll();
      showToast('Designation role created.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create designation', 'error');
    }
  };

  const handleDeleteDesig = async (id: number) => {
    if (!isAdmin || !confirm('Are you sure you want to delete this designation?')) return;
    try {
      await api.delete(`/org/designations/${id}`);
      loadAll();
      showToast('Designation removed.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete designation', 'error');
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate || !isAdmin) return;
    try {
      await api.post('/org/holidays', { name: newHolidayName, date: newHolidayDate });
      setNewHolidayName('');
      setNewHolidayDate('');
      loadAll();
      showToast('Public holiday scheduled.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add holiday', 'error');
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!isAdmin || !confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await api.delete(`/org/holidays/${id}`);
      loadAll();
      showToast('Holiday removed.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete holiday', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span>Loading Organization Configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Organization Setup & Master Data
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Company rules, office location geofence, departments, designations, and leave quotas.
          </p>
        </div>

        {!isAdmin && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            HR Mode: View Only
          </span>
        )}
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center space-x-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'settings', label: 'Company & Rules', icon: Building2 },
          { id: 'departments', label: `Departments (${departments.length})`, icon: Briefcase },
          { id: 'designations', label: `Designations (${designations.length})`, icon: ShieldCheck },
          { id: 'leaves', label: `Leave Quotas (${leaveTypes.length})`, icon: Calendar },
          { id: 'holidays', label: `Holidays (${holidays.length})`, icon: Clock }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Company Name
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={settings.company_name}
                onChange={e => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Office Start Time (09:00 AM)
              </label>
              <input
                type="time"
                disabled={!isAdmin}
                value={settings.office_start_time}
                onChange={e => setSettings({ ...settings, office_start_time: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Grace Period (15 Minutes)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={settings.grace_time_minutes}
                onChange={e => setSettings({ ...settings, grace_time_minutes: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Half-Day Threshold (Under 5.0 Hours)
              </label>
              <input
                type="number"
                step="0.5"
                disabled={!isAdmin}
                value={settings.half_day_hours}
                onChange={e => setSettings({ ...settings, half_day_hours: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Late Penalty Rule Toggle */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">Automated Late Arrival Policy</span>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                Every 3 late arrivals deduct 0.5 day's pay automatically during monthly payroll run.
              </p>
            </div>
            <input
              type="checkbox"
              disabled={!isAdmin}
              checked={Boolean(settings.late_penalty_enabled)}
              onChange={e => setSettings({ ...settings, late_penalty_enabled: e.target.checked ? 1 : 0 })}
              className="w-5 h-5 accent-blue-600 rounded"
            />
          </div>

          {/* Location & Radius Geofence */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span>Office Geofence Perimeter for Camera Attendance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Office Latitude</label>
                <input
                  type="number"
                  step="any"
                  disabled={!isAdmin}
                  value={settings.office_latitude}
                  onChange={e => setSettings({ ...settings, office_latitude: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Office Longitude</label>
                <input
                  type="number"
                  step="any"
                  disabled={!isAdmin}
                  value={settings.office_longitude}
                  onChange={e => setSettings({ ...settings, office_longitude: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Geofence Radius (Meters)</label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={settings.office_radius_meters}
                  onChange={e => setSettings({ ...settings, office_radius_meters: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Company Rules'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* Tab 2: Departments */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          {isAdmin && (
            <form onSubmit={handleAddDept} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={newDeptName}
                onChange={e => setNewDeptName(e.target.value)}
                placeholder="Department Name (e.g. Engineering, Sales, HR)"
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
              />
              <input
                type="text"
                value={newDeptDesc}
                onChange={e => setNewDeptDesc(e.target.value)}
                placeholder="Description (Optional)"
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
              />
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
              >
                Add Dept
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {departments.map(d => (
              <div
                key={d.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{d.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{d.employee_count || 0} active employees</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteDept(d.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                    title="Delete Department"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Designations */}
      {activeTab === 'designations' && (
        <div className="space-y-4">
          {isAdmin && (
            <form onSubmit={handleAddDesig} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={newDesigName}
                onChange={e => setNewDesigName(e.target.value)}
                placeholder="Designation Name (e.g. Lead Engineer, HR Officer)"
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
              />
              <select
                required
                value={newDesigDeptId}
                onChange={e => setNewDesigDeptId(e.target.value)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
              >
                <option value="">Select Department...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
              >
                Add Designation
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {designations.map(des => (
              <div
                key={des.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{des.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-semibold">
                    {des.department_name}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteDesig(des.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Leave Types */}
      {activeTab === 'leaves' && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {leaveTypes.map(lt => (
            <div
              key={lt.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
            >
              <h3 className="font-bold text-base text-slate-900 dark:text-white">{lt.name} Leave</h3>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
                {lt.quota === -1 ? 'Unlimited' : `${lt.quota} Days`}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {lt.is_paid ? 'Paid Time Off' : 'Unpaid Leave (Deducts from salary)'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tab 5: Holidays */}
      {activeTab === 'holidays' && (
        <div className="space-y-4">
          {isAdmin && (
            <form onSubmit={handleAddHoliday} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={newHolidayName}
                onChange={e => setNewHolidayName(e.target.value)}
                placeholder="Holiday Name (e.g. Independence Day, Eid)"
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
              />
              <input
                type="date"
                required
                value={newHolidayDate}
                onChange={e => setNewHolidayDate(e.target.value)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
              />
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
              >
                Add Holiday
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {holidays.map(h => (
              <div
                key={h.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{h.name}</h3>
                  <p className="text-xs text-blue-600 font-mono mt-0.5">{h.date}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteHoliday(h.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

