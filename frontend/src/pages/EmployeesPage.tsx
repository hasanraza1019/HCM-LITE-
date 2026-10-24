import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Search, Download, Upload, Filter, Eye, Edit2,
  Trash2, CheckCircle2, AlertCircle, X, ChevronLeft, ChevronRight,
  Briefcase, Mail, Phone, MapPin, DollarSign, RefreshCw, FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import confetti from 'canvas-confetti';

export function EmployeesPage() {
  const { user } = useAuth();
  const isHRorAdmin = user?.role === 'HR' || user?.role === 'Admin';

  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmps, setTotalEmps] = useState(0);

  // Modals
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [drawerEmployeeId, setDrawerEmployeeId] = useState<number | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // Register Form State
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('Male');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().substring(0, 10));
  const [deptId, setDeptId] = useState('');
  const [desigId, setDesigId] = useState('');
  const [basicSalary, setBasicSalary] = useState(60000);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  // 360 Profile State
  const [profile360, setProfile360] = useState<any>(null);
  const [loading360, setLoading360] = useState(false);

  // CSV Dry Run State
  const [csvInput, setCsvInput] = useState('');
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [importingCsv, setImportingCsv] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        ...(selectedDept && { department_id: selectedDept })
      });

      const res = await api.get(`/employees?${params.toString()}`);
      setEmployees(res.employees || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalEmps(res.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [dRes, desRes] = await Promise.all([
        api.get('/org/departments'),
        api.get('/org/designations')
      ]);
      setDepartments(dRes.departments || []);
      setDesignations(desRes.designations || []);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [page, selectedDept]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg(null);

    try {
      await api.post('/employees', {
        code,
        full_name: fullName,
        email,
        phone,
        address,
        gender,
        joining_date: joiningDate,
        department_id: Number(deptId),
        designation_id: Number(desigId),
        basic_salary: Number(basicSalary)
      });

      confetti({ particleCount: 50, spread: 50 });
      setRegisterModalOpen(false);
      resetForm();
      fetchEmployees();
    } catch (err: any) {
      setFormMsg(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCode('');
    setFullName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setGender('Male');
    setDeptId('');
    setDesigId('');
    setBasicSalary(60000);
    setFormMsg(null);
  };

  const open360Profile = async (id: number) => {
    setDrawerEmployeeId(id);
    setLoading360(true);
    try {
      const res = await api.get(`/employees/${id}`);
      setProfile360(res);
    } catch (err) {
      console.error('Failed to fetch 360 profile:', err);
    } finally {
      setLoading360(false);
    }
  };

  const handleDryRunCSV = async () => {
    if (!csvInput.trim()) return;
    setImportingCsv(true);
    try {
      // Parse CSV lines into objects
      const lines = csvInput.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h] = values[i] || '';
        });
        return obj;
      });

      const res = await api.post('/employees/csv/dry-run', { rows });
      setDryRunResult(res);
    } catch (err: any) {
      alert(err.message || 'CSV dry run failed');
    } finally {
      setImportingCsv(false);
    }
  };

  const handleConfirmCSVImport = async () => {
    if (!dryRunResult?.validRows?.length) return;
    setImportingCsv(true);
    try {
      const res = await api.post('/employees/csv/confirm', { validRows: dryRunResult.validRows });
      alert(res.message);
      confetti({ particleCount: 70, spread: 60 });
      setCsvModalOpen(false);
      setDryRunResult(null);
      setCsvInput('');
      fetchEmployees();
    } catch (err: any) {
      alert(err.message || 'Import failed');
    } finally {
      setImportingCsv(false);
    }
  };

  const sampleCsvData = `code,full_name,email,department,designation,basic_salary,joining_date
EMP-101,Ali Khan,ali.khan@saylaniit.com,Engineering,Software Engineer,75000,2026-01-15
EMP-102,Fatima Zahra,fatima.zahra@saylaniit.com,HR,HR Specialist,65000,2026-02-01
EMP-103,Hamza Tariq,hamza.tariq@saylaniit.com,Sales,Account Executive,55000,2026-03-10`;

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Employee Directory ({totalEmps})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personnel registry, Employee 360 profiles, salary setup, and bulk CSV onboarding.
          </p>
        </div>

        {isHRorAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCsvModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>CSV Import</span>
            </button>

            <button
              type="button"
              onClick={() =>
                api.download('/employees/export-csv', 'employees.csv').catch(err =>
                  alert(err.message || 'CSV export failed')
                )
              }
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV Export</span>
            </button>

            <button
              onClick={() => setRegisterModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Employee</span>
            </button>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, code, email..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={selectedDept}
            onChange={e => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 w-full sm:w-auto"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department & Role</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Salary Structure (Gross)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading directory records...</span>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No employee records found matching your filters.
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{emp.full_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{emp.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">{emp.designation_name || 'Staff'}</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400">{emp.department_name || 'General'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-slate-600 dark:text-slate-400 block">{emp.email}</span>
                        <span className="text-[10px] text-slate-400">{emp.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {emp.salary_structure ? (
                        <div>
                          <span className="font-bold text-emerald-600 block">
                            Rs. {emp.salary_structure.gross?.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Basic: {emp.salary_structure.basic?.toLocaleString()} (1.5× formula)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Confidential</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40">
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => open360Profile(emp.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-bold hover:bg-blue-100 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>360 Profile</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center space-x-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Register Employee Modal */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Register New Employee</h3>
                <p className="text-xs text-blue-100">Automatically creates login account with temporary password.</p>
              </div>
              <button onClick={() => setRegisterModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formMsg && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">
                  {formMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Employee Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="e.g. EMP-001"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Muhammad Zeeshan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Work Email (Login) *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. zeeshan@saylaniit.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Department *</label>
                  <select
                    required
                    value={deptId}
                    onChange={e => setDeptId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white dark:bg-slate-800"
                  >
                    <option value="">Select Department...</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Designation *</label>
                  <select
                    required
                    value={desigId}
                    onChange={e => setDesigId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white dark:bg-slate-800"
                  >
                    <option value="">Select Designation...</option>
                    {designations
                      .filter(des => !deptId || des.department_id === Number(deptId))
                      .map(des => (
                        <option key={des.id} value={des.id}>{des.name}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Base Salary (PKR) *</label>
                  <input
                    type="number"
                    required
                    value={basicSalary}
                    onChange={e => setBasicSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-emerald-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Gross Salary: Rs. {(Number(basicSalary) * 1.5).toLocaleString()} (Base + 40% HRA + 10% Medical)
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Joining Date</label>
                  <input
                    type="date"
                    required
                    value={joiningDate}
                    onChange={e => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Street, City, Postal Code"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-[11px]">
                <b>Note:</b> A temporary login password (<code>Password@123</code>) is automatically generated with <code>must_change_password=true</code>. The employee will be forced to change it on their first sign-in.
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import with Dry-Run Modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="max-w-3xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span>Bulk Employee CSV Import with Dry Run</span>
                </h3>
                <p className="text-xs text-slate-400">Checks required fields, emails, unique codes, and departments before committing.</p>
              </div>
              <button onClick={() => setCsvModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Paste CSV Content (or use sample)
                  </label>
                  <button
                    type="button"
                    onClick={() => setCsvInput(sampleCsvData)}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Insert Demo CSV Template
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={csvInput}
                  onChange={e => setCsvInput(e.target.value)}
                  placeholder="code,full_name,email,department,designation,basic_salary,joining_date&#10;EMP-01,John Doe,john@company.com,Engineering,Developer,70000,2026-01-01"
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleDryRunCSV}
                  disabled={importingCsv || !csvInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-40"
                >
                  {importingCsv ? 'Analyzing...' : 'Run Dry-Run Verification'}
                </button>
              </div>

              {/* Dry Run Results */}
              {dryRunResult && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase text-slate-700 dark:text-slate-200">
                      Dry-Run Verification Report
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        {dryRunResult.validCount} Valid
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                        {dryRunResult.errorCount} Errors
                      </span>
                    </div>
                  </div>

                  {dryRunResult.errors?.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {dryRunResult.errors.map((err: any, i: number) => (
                        <div key={i} className="p-2 rounded-lg bg-rose-50 text-rose-700 text-[11px] flex items-center justify-between">
                          <span>Row {err.row} [Field: <b>{err.field}</b>]: {err.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {dryRunResult.valid && (
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs text-emerald-600 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>All rows passed strict validation rules. Ready for import!</span>
                      </span>

                      <button
                        onClick={handleConfirmCSVImport}
                        disabled={importingCsv}
                        className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                      >
                        Confirm & Import {dryRunResult.validCount} Employees
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee 360 Profile Drawer */}
      {drawerEmployeeId && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex justify-end"
          onClick={() => setDrawerEmployeeId(null)}
        >
          <div
            className="w-full sm:w-[540px] bg-white dark:bg-slate-900 h-full p-6 shadow-2xl overflow-y-auto border-l border-slate-200 dark:border-slate-800 space-y-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Employee 360 Profile</h2>
              <button onClick={() => setDrawerEmployeeId(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading360 || !profile360 ? (
              <div className="py-20 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                <span>Loading 360 data...</span>
              </div>
            ) : (
              <>
                {/* Header card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white space-y-1">
                  <span className="text-xs font-mono text-blue-200 font-bold">{profile360.employee.code}</span>
                  <h3 className="text-xl font-black">{profile360.employee.full_name}</h3>
                  <p className="text-xs text-blue-100">{profile360.employee.designation_name} · {profile360.employee.department_name}</p>
                </div>

                {/* Salary Structure Breakdown */}
                {profile360.salary_structure && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-xs font-bold uppercase text-slate-500">Official Salary Structure</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Basic:</span>
                        <span className="font-bold">Rs. {profile360.salary_structure.basic.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">HRA (40%):</span>
                        <span className="font-bold">Rs. {profile360.salary_structure.hra.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Medical (10%):</span>
                        <span className="font-bold">Rs. {profile360.salary_structure.medical.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-emerald-600 block text-[10px] font-bold">Gross (1.5×):</span>
                        <span className="font-bold text-emerald-600">Rs. {profile360.salary_structure.gross.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Leave Balances */}
                <div>
                  <span className="text-xs font-bold uppercase text-slate-500 block mb-2">Leave Balances</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {profile360.leave_balances?.map((lb: any) => (
                      <div key={lb.name} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] text-slate-400">{lb.name}</span>
                        <div className="font-bold text-base mt-0.5">{lb.remaining} Days</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact & Personal */}
                <div className="space-y-2 text-xs">
                  <span className="text-xs font-bold uppercase text-slate-500 block">Personal Details</span>
                  <p>Email: <b className="font-mono">{profile360.employee.email}</b></p>
                  <p>Phone: <b>{profile360.employee.phone || 'N/A'}</b></p>
                  <p>Address: <b>{profile360.employee.address || 'N/A'}</b></p>
                  <p>Joined: <b>{profile360.employee.joining_date}</b></p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

