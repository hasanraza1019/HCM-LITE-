import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import {
  PayrollRun,
  Payslip,
  Settings,
  Employee,
  Department,
  Designation,
  Attendance,
  LeaveRequest,
  LeaveType,
  User,
  getNextId
} from '../database/models.js';
import { getMonthWorkingDays } from '../utils/dateUtils.js';
import { calculateIncomeTax } from '../utils/taxCalculator.js';
import { logAudit } from '../utils/audit.js';
import { createNotification } from '../utils/notifications.js';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripMongoFields<T extends Record<string, any>>(doc: T): Omit<T, '_id' | '__v'> {
  const { _id, __v, ...rest } = doc;
  return rest;
}

export async function createPayrollDraft(req: Request, res: Response): Promise<void> {
  try {
    const { month } = req.body; // 'YYYY-MM', e.g. '2026-10'
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({ error: 'Valid month in format YYYY-MM is required' });
      return;
    }

    // Check if payroll already exists for this month
    const existingRun = await PayrollRun.findOne({ month }).lean();
    if (existingRun) {
      if (existingRun.status === 'finalized') {
        res.status(400).json({ error: `Payroll for ${month} is already finalized and cannot be recreated or modified.` });
        return;
      }
      // If it's a draft, delete existing draft and its payslips to recalculate freshly
      await Payslip.deleteMany({ payroll_run_id: existingRun.id });
      await PayrollRun.deleteOne({ id: existingRun.id });
    }

    const { totalWorkingDays, dates: monthWorkingDates } = await getMonthWorkingDays(month);
    if (totalWorkingDays === 0) {
      res.status(400).json({ error: 'No working days found in the selected month' });
      return;
    }

    const [settings, employees, leaveTypes] = await Promise.all([
      Settings.findOne({ id: 1 }).lean(),
      Employee.find({ basic_salary: { $gt: 0 } }).sort({ id: 1 }).lean(),
      LeaveType.find().lean()
    ]);

    if (employees.length === 0) {
      res.status(400).json({ error: 'No employees with basic salary found to run payroll' });
      return;
    }

    const latePenaltyEnabled = Boolean(settings?.late_penalty_enabled ?? 1);
    const ltMap = new Map<number, any>(leaveTypes.map(lt => [lt.id, lt]));

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const mNum = parseInt(monthStr, 10);
    const lastDayOfMonth = new Date(year, mNum, 0).getDate();
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const [monthAttendances, overlappingLeaves] = await Promise.all([
      Attendance.find({ date: { $regex: `^${escapeRegex(month)}` } }).lean(),
      LeaveRequest.find({
        status: 'approved',
        end_date: { $gte: monthStart },
        start_date: { $lte: monthEnd }
      }).lean()
    ]);

    const attByEmp = new Map<number, any[]>();
    for (const att of monthAttendances) {
      const list = attByEmp.get(att.employee_id) || [];
      list.push(att);
      attByEmp.set(att.employee_id, list);
    }

    const leavesByEmp = new Map<number, any[]>();
    for (const lr of overlappingLeaves) {
      const lt = ltMap.get(lr.leave_type_id);
      const list = leavesByEmp.get(lr.employee_id) || [];
      list.push({
        ...lr,
        is_paid: lt ? lt.is_paid : 1,
        leave_type_name: lt ? lt.name : 'Leave'
      });
      leavesByEmp.set(lr.employee_id, list);
    }

    const now = new Date().toISOString();
    const runId = await getNextId('payroll_runs');

    // Create payroll run draft
    await PayrollRun.create({
      id: runId,
      month,
      working_days: totalWorkingDays,
      total_gross: 0,
      total_tax: 0,
      total_deductions: 0,
      total_net: 0,
      status: 'draft',
      created_by: req.user!.id,
      finalized_by: null,
      finalized_at: null,
      created_at: now
    });

    let runTotalGross = 0;
    let runTotalTax = 0;
    let runTotalDeductions = 0;
    let runTotalNet = 0;

    const payslipDocs: any[] = [];

    for (const emp of employees) {
      const basic = Number(emp.basic_salary);
      const hra = basic * 0.4;
      const medical = basic * 0.1;
      const gross = basic * 1.5;

      // Check joining and exit date proration
      const joiningDate = emp.joining_date;
      const exitDate = emp.exit_date;

      const eligibleDates: string[] = [];
      for (const d of monthWorkingDates) {
        if (joiningDate && d < joiningDate) continue;
        if (exitDate && d > exitDate) continue;
        eligibleDates.push(d);
      }

      const perDayRate = totalWorkingDays > 0 ? gross / totalWorkingDays : 0;

      // Attendance records for this employee in this month
      const attendances = attByEmp.get(emp.id) || [];
      const attByDate = new Map<string, any>();
      let lateCount = 0;
      let halfDayCount = 0;
      let presentCount = 0;

      for (const att of attendances) {
        attByDate.set(att.date, att);
        if (att.status === 'present') presentCount++;
        else if (att.status === 'late') {
          lateCount++;
          presentCount++;
        } else if (att.status === 'half_day') {
          halfDayCount++;
        }
      }

      // Approved leaves in this month
      const leaves = leavesByEmp.get(emp.id) || [];
      const paidLeaveDates = new Set<string>();
      const unpaidLeaveDates = new Set<string>();

      for (const l of leaves) {
        for (const d of eligibleDates) {
          if (d >= l.start_date && d <= l.end_date) {
            if (l.is_paid === 1) {
              paidLeaveDates.add(d);
            } else {
              unpaidLeaveDates.add(d);
            }
          }
        }
      }

      // Calculate absent days
      let absentDays = 0;
      for (const d of eligibleDates) {
        const hasAtt = attByDate.has(d);
        const onPaidLeave = paidLeaveDates.has(d);
        const onUnpaidLeave = unpaidLeaveDates.has(d);

        if (!hasAtt && !onPaidLeave && !onUnpaidLeave) {
          absentDays++;
        }
      }

      const unpaidLeaveDays = unpaidLeaveDates.size;

      // Late penalty: 3 lates = 0.5 day
      let latePenaltyDays = 0;
      if (latePenaltyEnabled && lateCount >= 3) {
        latePenaltyDays = Math.floor(lateCount / 3) * 0.5;
      }

      // Total Deductions
      const deductionsDays = absentDays + unpaidLeaveDays + halfDayCount * 0.5 + latePenaltyDays;
      const deductions = Math.round(deductionsDays * perDayRate * 100) / 100;

      // Tax
      const { annualGross, annualTax, monthlyTax } = calculateIncomeTax(gross);

      // Net Salary
      const netSalary = Math.max(0, Math.round((gross - deductions - monthlyTax) * 100) / 100);

      const payslipId = await getNextId('payslips');
      payslipDocs.push({
        id: payslipId,
        payroll_run_id: runId,
        employee_id: emp.id,
        basic_salary: basic,
        hra,
        medical,
        gross_salary: gross,
        working_days: totalWorkingDays,
        present_days: presentCount,
        absent_days: absentDays,
        unpaid_leave_days: unpaidLeaveDays,
        half_days: halfDayCount,
        late_penalty_days: latePenaltyDays,
        deductions,
        annual_gross: annualGross,
        annual_tax: annualTax,
        income_tax: monthlyTax,
        net_salary: netSalary,
        created_at: now
      });

      runTotalGross += gross;
      runTotalTax += monthlyTax;
      runTotalDeductions += deductions;
      runTotalNet += netSalary;
    }

    if (payslipDocs.length > 0) {
      await Payslip.insertMany(payslipDocs);
    }

    // Update payroll run totals
    await PayrollRun.updateOne(
      { id: runId },
      {
        $set: {
          total_gross: Math.round(runTotalGross * 100) / 100,
          total_tax: Math.round(runTotalTax * 100) / 100,
          total_deductions: Math.round(runTotalDeductions * 100) / 100,
          total_net: Math.round(runTotalNet * 100) / 100
        }
      }
    );

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_PAYROLL_DRAFT',
      entity: 'PayrollRun',
      entityId: runId,
      after: { month, totalEmployees: employees.length, totalGross: runTotalGross },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: `Payroll draft for ${month} created successfully with ${employees.length} payslips`,
      payrollRunId: runId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function listPayrollRuns(req: Request, res: Response): Promise<void> {
  try {
    const [rawRuns, users, payslips] = await Promise.all([
      PayrollRun.find().sort({ month: -1 }).lean(),
      User.find({}, { id: 1, email: 1 }).lean(),
      Payslip.find({}, { id: 1, payroll_run_id: 1 }).lean()
    ]);

    const userMap = new Map<number, string>(users.map(u => [u.id, u.email]));
    const countMap = new Map<number, number>();
    for (const p of payslips) {
      countMap.set(p.payroll_run_id, (countMap.get(p.payroll_run_id) || 0) + 1);
    }

    const runs = rawRuns.map(pr => ({
      ...stripMongoFields(pr),
      created_by_email: userMap.get(pr.created_by) || null,
      finalized_by_email: pr.finalized_by ? userMap.get(pr.finalized_by) || null : null,
      payslip_count: countMap.get(pr.id) || 0
    }));

    res.json({ payrollRuns: runs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getPayrollRunDetails(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const runId = Number(id);

    const runDoc = await PayrollRun.findOne({ id: runId }).lean();
    if (!runDoc) {
      res.status(404).json({ error: 'Payroll run not found' });
      return;
    }

    const payslipFilter: Record<string, any> = { payroll_run_id: runId };
    if (req.user!.role === 'Employee') {
      payslipFilter.employee_id = req.user!.employeeId ?? -1;
    }

    const [users, rawPayslips, employees, departments, designations] = await Promise.all([
      User.find({}, { id: 1, email: 1 }).lean(),
      Payslip.find(payslipFilter).sort({ employee_id: 1 }).lean(),
      Employee.find().lean(),
      Department.find().lean(),
      Designation.find().lean()
    ]);

    const userMap = new Map<number, string>(users.map(u => [u.id, u.email]));
    const empMap = new Map<number, any>(employees.map(e => [e.id, e]));
    const deptMap = new Map<number, string>(departments.map(d => [d.id, d.name]));
    const desigMap = new Map<number, string>(designations.map(d => [d.id, d.name]));

    const run = {
      ...stripMongoFields(runDoc),
      created_by_email: userMap.get(runDoc.created_by) || null,
      finalized_by_email: runDoc.finalized_by ? userMap.get(runDoc.finalized_by) || null : null
    };

    const payslips = rawPayslips.map(p => {
      const emp = empMap.get(p.employee_id);
      return {
        ...stripMongoFields(p),
        employee_code: emp?.code || 'N/A',
        employee_name: emp?.full_name || 'Unknown',
        department_name: emp ? deptMap.get(emp.department_id) || null : null,
        designation_name: emp ? desigMap.get(emp.designation_id) || null : null
      };
    });

    res.json({ run, payslips });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Admin only: finalize payroll run
export async function finalizePayroll(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const runId = Number(id);

    const run = await PayrollRun.findOne({ id: runId }).lean();
    if (!run) {
      res.status(404).json({ error: 'Payroll run not found' });
      return;
    }

    if (run.status === 'finalized') {
      res.status(400).json({ error: 'Payroll run is already finalized and locked' });
      return;
    }

    const now = new Date().toISOString();
    await PayrollRun.updateOne(
      { id: runId },
      {
        $set: {
          status: 'finalized',
          finalized_by: req.user!.id,
          finalized_at: now
        }
      }
    );

    // Notify all employees that their payslip is available
    const payslips = await Payslip.find({ payroll_run_id: runId }).lean();
    const empIds = payslips.map(p => p.employee_id);
    const users = empIds.length > 0 ? await User.find({ employee_id: { $in: empIds } }).lean() : [];
    const userByEmp = new Map<number, number>();
    users.forEach(u => {
      if (u.employee_id !== null && u.employee_id !== undefined) {
        userByEmp.set(u.employee_id, u.id);
      }
    });

    for (const p of payslips) {
      const userId = userByEmp.get(p.employee_id);
      if (userId) {
        await createNotification(
          userId,
          `Payslip Available for ${run.month}`,
          `Your payslip for ${run.month} is ready for download. Net Pay: Rs. ${Number(p.net_salary).toLocaleString()}`,
          '/payslips'
        );
      }
    }

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'FINALIZE_PAYROLL',
      entity: 'PayrollRun',
      entityId: runId,
      after: { month: run.month, status: 'finalized', finalized_at: now },
      ipAddress: req.ip
    });

    res.json({ message: `Payroll run for ${run.month} finalized and locked successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Download Payslip PDF
export async function downloadPayslipPDF(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const payslipId = Number(id);

    const pDoc = await Payslip.findOne({ id: payslipId }).lean();
    if (!pDoc) {
      res.status(404).json({ error: 'Payslip not found' });
      return;
    }

    // Role scope check
    if (req.user!.role === 'Employee' && pDoc.employee_id !== req.user!.employeeId) {
      res.status(403).json({ error: 'Access denied: You can only download your own payslip' });
      return;
    }

    const [runDoc, empDoc, settings] = await Promise.all([
      PayrollRun.findOne({ id: pDoc.payroll_run_id }).lean(),
      Employee.findOne({ id: pDoc.employee_id }).lean(),
      Settings.findOne({ id: 1 }).lean()
    ]);

    if (!runDoc || !empDoc) {
      res.status(404).json({ error: 'Associated payroll run or employee record not found' });
      return;
    }

    const [deptDoc, desigDoc] = await Promise.all([
      Department.findOne({ id: empDoc.department_id }).lean(),
      Designation.findOne({ id: empDoc.designation_id }).lean()
    ]);

    const payslip = {
      ...pDoc,
      month: runDoc.month,
      run_status: runDoc.status,
      employee_code: empDoc.code,
      full_name: empDoc.full_name,
      email: empDoc.email,
      phone: empDoc.phone,
      joining_date: empDoc.joining_date,
      department_name: deptDoc?.name || null,
      designation_name: desigDoc?.name || null
    };

    const companyName = settings?.company_name || 'HCM Lite Inc.';

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payslip_${payslip.employee_code}_${payslip.month}.pdf"`);

    doc.pipe(res);

    // Header styling
    doc.rect(40, 40, 515, 65).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text(companyName, 55, 52);
    doc.fontSize(10).font('Helvetica').text(`OFFICIAL SALARY PAYSLIP - ${payslip.month}`, 55, 78);

    doc.fillColor('#10b981').fontSize(11).font('Helvetica-Bold')
       .text(payslip.run_status.toUpperCase(), 470, 65, { align: 'right' });

    doc.moveDown(3);

    // Employee Info Box
    const startY = 120;
    doc.rect(40, startY, 515, 80).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#334155').fontSize(9).font('Helvetica');

    doc.text(`Employee Code:`, 55, startY + 12);
    doc.font('Helvetica-Bold').text(payslip.employee_code, 150, startY + 12);

    doc.font('Helvetica').text(`Employee Name:`, 55, startY + 30);
    doc.font('Helvetica-Bold').text(payslip.full_name, 150, startY + 30);

    doc.font('Helvetica').text(`Designation:`, 55, startY + 48);
    doc.font('Helvetica-Bold').text(payslip.designation_name || 'N/A', 150, startY + 48);

    doc.font('Helvetica').text(`Department:`, 320, startY + 12);
    doc.font('Helvetica-Bold').text(payslip.department_name || 'N/A', 410, startY + 12);

    doc.font('Helvetica').text(`Joining Date:`, 320, startY + 30);
    doc.font('Helvetica-Bold').text(payslip.joining_date || 'N/A', 410, startY + 30);

    doc.font('Helvetica').text(`Pay Period:`, 320, startY + 48);
    doc.font('Helvetica-Bold').text(payslip.month, 410, startY + 48);

    // Attendance Summary Bar
    const attY = 215;
    doc.rect(40, attY, 515, 45).fill('#f1f5f9').stroke('#cbd5e1');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9);
    doc.text(`Working Days: ${payslip.working_days}`, 55, attY + 16);
    doc.text(`Present: ${payslip.present_days}`, 160, attY + 16);
    doc.text(`Absent: ${payslip.absent_days}`, 250, attY + 16);
    doc.text(`Half Days: ${payslip.half_days}`, 330, attY + 16);
    doc.text(`Unpaid Leave: ${payslip.unpaid_leave_days}`, 425, attY + 16);

    // Earnings & Deductions Table
    const tableY = 275;
    // Earnings Column Header
    doc.rect(40, tableY, 250, 25).fill('#3b82f6');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text('EARNINGS', 55, tableY + 7);
    doc.text('AMOUNT (PKR)', 190, tableY + 7);

    // Deductions Column Header
    doc.rect(305, tableY, 250, 25).fill('#ef4444');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text('DEDUCTIONS & TAX', 320, tableY + 7);
    doc.text('AMOUNT (PKR)', 455, tableY + 7);

    // Line items
    let curRowY = tableY + 35;
    doc.fillColor('#1e293b').font('Helvetica').fontSize(9);

    // Row 1: Basic & Attendance Deductions
    doc.text('Basic Salary', 55, curRowY);
    doc.text(`Rs. ${payslip.basic_salary.toLocaleString()}`, 190, curRowY);
    doc.text('Attendance Deductions', 320, curRowY);
    doc.text(`Rs. ${payslip.deductions.toLocaleString()}`, 455, curRowY);

    curRowY += 22;
    // Row 2: HRA & Income Tax
    doc.text('House Rent Allowance (HRA 40%)', 55, curRowY);
    doc.text(`Rs. ${payslip.hra.toLocaleString()}`, 190, curRowY);
    doc.text('Income Tax (Monthly Slab)', 320, curRowY);
    doc.text(`Rs. ${payslip.income_tax.toLocaleString()}`, 455, curRowY);

    curRowY += 22;
    // Row 3: Medical Allowance & Late Penalty
    doc.text('Medical Allowance (10%)', 55, curRowY);
    doc.text(`Rs. ${payslip.medical.toLocaleString()}`, 190, curRowY);
    if (payslip.late_penalty_days > 0) {
      doc.text(`Late Penalty (${payslip.late_penalty_days} day)`, 320, curRowY);
      doc.text(`(Included in ded.)`, 455, curRowY);
    }

    curRowY += 30;
    // Total Gross vs Total Deductions
    doc.rect(40, curRowY, 250, 25).fill('#e2e8f0');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text('Gross Salary:', 55, curRowY + 7);
    doc.text(`Rs. ${payslip.gross_salary.toLocaleString()}`, 190, curRowY + 7);

    const totalDed = payslip.deductions + payslip.income_tax;
    doc.rect(305, curRowY, 250, 25).fill('#fee2e2');
    doc.fillColor('#991b1b').font('Helvetica-Bold').fontSize(9).text('Total Deductions:', 320, curRowY + 7);
    doc.text(`Rs. ${totalDed.toLocaleString()}`, 455, curRowY + 7);

    curRowY += 45;
    // Net Pay Callout
    doc.rect(40, curRowY, 515, 50).fill('#ecfdf5').stroke('#10b981');
    doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(12).text('NET TAKE-HOME SALARY:', 55, curRowY + 18);
    doc.fontSize(16).text(`PKR ${payslip.net_salary.toLocaleString()}`, 350, curRowY + 16, { align: 'right' });

    // Footer
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
       .text('This is a computer-generated payslip from HCM Lite and does not require a physical signature.', 40, 750, { align: 'center', width: 515 });

    doc.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
