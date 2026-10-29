import React, { useState } from 'react';
import { FileText, Printer, Download, X, Building2, CheckCircle2, ShieldCheck, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface LetterGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeData: {
    fullName: string;
    code: string;
    designation: string;
    department: string;
    joiningDate: string;
    grossSalary?: number;
    email?: string;
  };
}

export function LetterGeneratorModal({ isOpen, onClose, employeeData }: LetterGeneratorModalProps) {
  const { companyName } = useAuth();
  const [letterType, setLetterType] = useState<'experience' | 'salary' | 'bonafide'>('experience');

  if (!isOpen) return null;

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedJoining = employeeData.joiningDate
    ? new Date(employeeData.joiningDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '15th January 2026';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="max-w-4xl w-full bg-slate-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-purple-600/20 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 font-mono">Official Document Engine</span>
              <h3 className="font-black text-white text-base">Certified Corporate Letter Generator</h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center space-x-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Letter Type Switcher */}
        <div className="p-4 bg-slate-950/40 border-b border-white/10 flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setLetterType('experience')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              letterType === 'experience'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Experience & Service Certificate
          </button>
          <button
            type="button"
            onClick={() => setLetterType('salary')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              letterType === 'salary'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Salary & Compensation Certificate
          </button>
          <button
            type="button"
            onClick={() => setLetterType('bonafide')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              letterType === 'bonafide'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Bonafide Employment Letter
          </button>
        </div>

        {/* Printable Official Letterhead Canvas */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-950/80 flex justify-center">
          <div
            id="certified-letterhead"
            className="w-full max-w-2xl bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-2xl relative font-serif leading-relaxed text-xs sm:text-sm select-text border border-slate-200"
          >
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
              <Building2 className="w-96 h-96 text-slate-900" />
            </div>

            {/* Letterhead Header */}
            <div className="flex items-center justify-between pb-6 border-b-2 border-slate-900 mb-8">
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900 font-sans">
                  {companyName || 'Saylani IT Training'}
                </h1>
                <p className="text-[11px] text-slate-600 font-sans">
                  Headquarters: Zaitoon Ashraf IT Park, University Road, Karachi
                </p>
                <p className="text-[10px] text-slate-500 font-sans">
                  Reg No: SECP-HR-98442 · www.saylaniit.com · contact@saylaniit.com
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg font-sans shadow-md">
                <Building2 className="w-6 h-6" />
              </div>
            </div>

            {/* Meta Dates & Reference */}
            <div className="flex justify-between items-center mb-8 font-sans text-xs text-slate-600">
              <span><b>Ref:</b> {companyName?.substring(0, 3).toUpperCase() || 'SAY'}/HR/{new Date().getFullYear()}/{employeeData.code}</span>
              <span><b>Date:</b> {today}</span>
            </div>

            {/* Recipient */}
            <div className="mb-6 font-sans">
              <p className="font-bold text-slate-900 uppercase tracking-wider text-xs">TO WHOM IT MAY CONCERN</p>
            </div>

            {/* Dynamic Body Content */}
            <div className="space-y-4 text-justify font-sans text-xs sm:text-[13px] text-slate-800 leading-relaxed mb-12">
              {letterType === 'experience' && (
                <>
                  <p>
                    This is to formally certify that <b>{employeeData.fullName}</b> (Employee ID: <b>{employeeData.code}</b>) has been bona fide employed with <b>{companyName || 'Saylani IT Training'}</b> since <b>{formattedJoining}</b>.
                  </p>
                  <p>
                    During tenure with our organization, they served in the role of <b>{employeeData.designation}</b> in the <b>{employeeData.department}</b> department. Their duties involved core operational deliverables, system engineering, and cross-functional project management.
                  </p>
                  <p>
                    We found them to be diligent, self-motivated, and an exceptional team contributor with impeccable integrity and professional ethics.
                  </p>
                  <p>
                    We wish <b>{employeeData.fullName}</b> continued success and prosperity in all future career undertakings.
                  </p>
                </>
              )}

              {letterType === 'salary' && (
                <>
                  <p>
                    This is to certify that <b>{employeeData.fullName}</b> (Employee ID: <b>{employeeData.code}</b>) is a full-time, permanent employee of <b>{companyName || 'Saylani IT Training'}</b>, currently serving as <b>{employeeData.designation}</b> in the <b>{employeeData.department}</b> division.
                  </p>
                  <p>
                    As per certified payroll registers, their current monthly gross compensation structure is as follows:
                  </p>
                  <div className="my-4 p-4 rounded-xl bg-slate-100 border border-slate-300 font-mono text-xs">
                    <div className="flex justify-between py-1">
                      <span>Base Gross Monthly Salary:</span>
                      <b>PKR {Number(employeeData.grossSalary || 80000).toLocaleString()}/-</b>
                    </div>
                    <div className="flex justify-between py-1 text-slate-600">
                      <span>Annualized Cost to Company (CTC):</span>
                      <b>PKR {Number((employeeData.grossSalary || 80000) * 12).toLocaleString()}/-</b>
                    </div>
                    <div className="flex justify-between py-1 text-emerald-700">
                      <span>Employment Status:</span>
                      <b>Active & Confirmed</b>
                    </div>
                  </div>
                  <p>
                    This certificate is issued at the specific request of the employee for banking, loan, or official consular requirements.
                  </p>
                </>
              )}

              {letterType === 'bonafide' && (
                <>
                  <p>
                    This letter serves to confirm that <b>{employeeData.fullName}</b> (Employee Code: <b>{employeeData.code}</b>) is a registered, bona fide employee of <b>{companyName || 'Saylani IT Training'}</b>.
                  </p>
                  <p>
                    They joined our organization on <b>{formattedJoining}</b> and continue to actively render services as <b>{employeeData.designation}</b>.
                  </p>
                  <p>
                    This verification document is provided without any financial liability on the part of the company.
                  </p>
                </>
              )}
            </div>

            {/* Signature & Seal Area */}
            <div className="pt-8 border-t border-slate-200 flex justify-between items-end font-sans">
              <div className="space-y-1">
                <div className="w-32 h-10 border-b border-slate-400 mb-1 flex items-end">
                  <span className="font-serif italic text-blue-900 text-lg opacity-80">H. Raza</span>
                </div>
                <p className="font-bold text-xs text-slate-900">Head of People & Culture</p>
                <p className="text-[11px] text-slate-500">Human Capital Management Division</p>
                <p className="text-[10px] text-slate-400">{companyName || 'Saylani IT Training'}</p>
              </div>

              {/* Official Stamp */}
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-blue-900/40 p-2 flex flex-col items-center justify-center text-center text-[8px] text-blue-900 font-bold uppercase select-none opacity-85">
                <ShieldCheck className="w-6 h-6 text-blue-900 mb-0.5" />
                <span>CERTIFIED SEAL</span>
                <span>HCM LITE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
