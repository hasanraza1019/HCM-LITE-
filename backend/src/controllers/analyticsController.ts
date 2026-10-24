import { Request, Response } from 'express';
import {
  Employee,
  Department,
  PayrollRun,
  Payslip,
  AuditLog,
  Attendance,
  AttendanceCorrection,
  LeaveRequest,
  LeaveType,
  Announcement,
  User
} from '../database/models.js';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripMongoFields<T extends Record<string, any>>(doc: T): Omit<T, '_id' | '__v'> {
  const { _id, __v, ...rest } = doc;
  return rest;
}

export async function getAdminDashboard(req: Request, res: Response): Promise<void> {
  try {
    const { department_id } = req.query;

    const empFilter: Record<string, any> = { status: 'Active' };
    if (department_id) {
      empFilter.department_id = Number(department_id);
    }

    const [activeEmps, exits, latestPayroll, departments, allActiveEmps, rawAuditFeed] = await Promise.all([
      Employee.find(empFilter).lean(),
      Employee.countDocuments({ status: { $in: ['Terminated', 'Resigned'] } }),
      PayrollRun.findOne().sort({ month: -1 }).lean(),
      Department.find().lean(),
      Employee.find({ status: 'Active' }).lean(),
      AuditLog.find().sort({ id: -1 }).limit(8).lean()
    ]);

    // 1. Headcount & Attrition
    const headcount = activeEmps.length;
    const avgHeadcount = headcount > 0 ? (headcount + (headcount - exits)) / 2 : 1;
    const attritionRate = avgHeadcount > 0 ? Math.round((exits / avgHeadcount) * 100 * 10) / 10 : 0;

    // 2. Payroll Cost & Average Salary
    let totalPayrollCost = 0;
    let avgSalary = 0;

    if (latestPayroll) {
      totalPayrollCost = Number(latestPayroll.total_gross || 0);
      const payslipCount = await Payslip.countDocuments({ payroll_run_id: latestPayroll.id });
      if (payslipCount > 0) {
        avgSalary = Math.round(totalPayrollCost / payslipCount);
      }
    } else if (activeEmps.length > 0) {
      const sumGross = activeEmps.reduce((sum, e) => sum + Number(e.basic_salary || 0) * 1.5, 0);
      totalPayrollCost = Math.round(sumGross);
      avgSalary = Math.round(sumGross / activeEmps.length);
    }

    // 3. Headcount by Department
    const deptHeadcount = departments
      .map(d => ({
        department: d.name,
        count: allActiveEmps.filter(e => e.department_id === d.id).length
      }))
      .sort((a, b) => b.count - a.count);

    // 4. Payroll Cost by Department
    const deptPayroll = departments
      .map(d => ({
        department: d.name,
        total_cost: Math.round(
          allActiveEmps
            .filter(e => e.department_id === d.id)
            .reduce((sum, e) => sum + Number(e.basic_salary || 0) * 1.5, 0)
        )
      }))
      .sort((a, b) => b.total_cost - a.total_cost);

    // 5. Gender Distribution
    const genderCounts = new Map<string, number>();
    for (const e of activeEmps) {
      const g = e.gender || 'Other';
      genderCounts.set(g, (genderCounts.get(g) || 0) + 1);
    }
    const genderDist = Array.from(genderCounts.entries()).map(([gender, count]) => ({ gender, count }));

    // 6. Tenure Distribution (<1 yr, 1-3 yrs, 3+ yrs)
    let tenureUnder1 = 0;
    let tenure1to3 = 0;
    let tenure3plus = 0;
    const now = new Date();

    for (const e of activeEmps) {
      if (!e.joining_date) continue;
      const join = new Date(e.joining_date);
      const diffYears = (now.getTime() - join.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (diffYears < 1) tenureUnder1++;
      else if (diffYears <= 3) tenure1to3++;
      else tenure3plus++;
    }

    // 7. Recent Audit Feed (top 8)
    const auditFeed = rawAuditFeed.map(stripMongoFields);

    res.json({
      kpis: {
        headcount,
        attritionRate,
        totalPayrollCost,
        avgSalary,
        lastPayrollMonth: latestPayroll?.month || 'N/A'
      },
      headcountByDepartment: deptHeadcount,
      payrollCostByDepartment: deptPayroll,
      genderDistribution: genderDist,
      tenureDistribution: [
        { label: '< 1 Year', count: tenureUnder1 },
        { label: '1 - 3 Years', count: tenure1to3 },
        { label: '3+ Years', count: tenure3plus }
      ],
      auditFeed
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getHRDashboard(req: Request, res: Response): Promise<void> {
  try {
    const { department_id, month } = req.query;
    const todayStr = new Date().toISOString().substring(0, 10);
    const monthPrefix = (month as string) || todayStr.substring(0, 7);

    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    const sixDaysAgoStr = sixDaysAgo.toISOString().substring(0, 10);

    const [
      allEmployees,
      departments,
      leaveTypes,
      pendingLeaves,
      pendingCorrections,
      todayAttendances,
      approvedLeavesToday,
      monthAttendances,
      monthApprovedLeaves,
      past7Attendances
    ] = await Promise.all([
      Employee.find().lean(),
      Department.find().lean(),
      LeaveType.find().lean(),
      LeaveRequest.countDocuments({ status: 'pending' }),
      AttendanceCorrection.countDocuments({ status: 'pending' }),
      Attendance.find({ date: todayStr }).lean(),
      LeaveRequest.find({
        status: 'approved',
        start_date: { $lte: todayStr },
        end_date: { $gte: todayStr }
      }).lean(),
      Attendance.find({ date: { $regex: `^${escapeRegex(monthPrefix)}` } }).lean(),
      LeaveRequest.find({
        status: 'approved',
        start_date: { $regex: `^${escapeRegex(monthPrefix)}` }
      }).lean(),
      Attendance.find({ date: { $gte: sixDaysAgoStr, $lte: todayStr } }).lean()
    ]);

    const empMap = new Map<number, any>(allEmployees.map(e => [e.id, e]));
    const deptMap = new Map<number, string>(departments.map(d => [d.id, d.name]));
    const targetDeptId = department_id ? Number(department_id) : null;

    // Active headcount
    const activeEmployees = allEmployees.filter(
      e => e.status === 'Active' && (targetDeptId === null || e.department_id === targetDeptId)
    );
    const headcount = activeEmployees.length;

    // Today's attendance stats
    let presentToday = 0;
    let lateToday = 0;
    let halfDayToday = 0;

    for (const a of todayAttendances) {
      const emp = empMap.get(a.employee_id);
      if (!emp) continue;
      if (targetDeptId !== null && emp.department_id !== targetDeptId) continue;

      if (a.status === 'present') presentToday++;
      else if (a.status === 'late') lateToday++;
      else if (a.status === 'half_day') halfDayToday++;
    }

    // Today on leave
    let onLeaveToday = 0;
    for (const lr of approvedLeavesToday) {
      const emp = empMap.get(lr.employee_id);
      if (!emp) continue;
      if (targetDeptId !== null && emp.department_id !== targetDeptId) continue;
      onLeaveToday++;
    }

    const pendingApprovals = pendingLeaves + pendingCorrections;

    // Attendance Trend (past 7 days)
    const trend: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().substring(0, 10);

      let attended = 0;
      let late = 0;
      for (const a of past7Attendances) {
        if (a.date !== dStr) continue;
        if (a.status === 'present' || a.status === 'late' || a.status === 'half_day') attended++;
        if (a.status === 'late') late++;
      }

      trend.push({
        date: dStr.substring(5), // MM-DD
        attended,
        late
      });
    }

    // Late counts by employee for this month
    const lateCountByEmp = new Map<number, number>();
    for (const a of monthAttendances) {
      if (a.status === 'late') {
        lateCountByEmp.set(a.employee_id, (lateCountByEmp.get(a.employee_id) || 0) + 1);
      }
    }

    // Top 5 Late-comers this month
    const topLateComers = Array.from(lateCountByEmp.entries())
      .map(([empId, late_count]) => {
        const emp = empMap.get(empId);
        if (!emp) return null;
        return {
          id: emp.id,
          code: emp.code,
          full_name: emp.full_name,
          department: deptMap.get(emp.department_id) || null,
          late_count
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.late_count - a.late_count)
      .slice(0, 5);

    // Leave Utilization by Type
    const leaveUtilization = leaveTypes.map(lt => {
      const days = monthApprovedLeaves
        .filter(lr => lr.leave_type_id === lt.id)
        .reduce((sum, lr) => sum + Number(lr.days_count || 0), 0);

      return {
        type: lt.name,
        days,
        quota: lt.quota
      };
    });

    // Absenteeism / Late stats by Department
    const allActiveEmps = allEmployees.filter(e => e.status === 'Active');
    const deptAbsenteeism = departments.map(d => {
      const deptEmps = allActiveEmps.filter(e => e.department_id === d.id);
      const deptEmpIds = new Set(deptEmps.map(e => e.id));
      const deptLateCount = monthAttendances.filter(
        a => deptEmpIds.has(a.employee_id) && a.status === 'late'
      ).length;

      return {
        department: d.name,
        late_count: deptLateCount,
        employee_count: deptEmps.length
      };
    });

    // Bonus: Absence anomaly flags & Attrition risk score
    const anomalyFlags = allActiveEmps
      .map(emp => {
        const late_count = lateCountByEmp.get(emp.id) || 0;
        return {
          id: emp.id,
          code: emp.code,
          full_name: emp.full_name,
          department: deptMap.get(emp.department_id) || null,
          late_count
        };
      })
      .filter(item => item.late_count >= 3)
      .sort((a, b) => b.late_count - a.late_count)
      .slice(0, 5)
      .map(item => ({
        ...item,
        riskLevel: item.late_count >= 5 ? 'High' : 'Medium',
        reason: `${item.late_count} late arrivals this month`
      }));

    res.json({
      kpis: {
        headcount,
        presentToday,
        lateToday,
        halfDayToday,
        onLeaveToday,
        pendingApprovals
      },
      attendanceTrend: trend,
      topLateComers,
      leaveUtilization,
      departmentStats: deptAbsenteeism,
      anomalyFlags
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getEmployeeDashboard(req: Request, res: Response): Promise<void> {
  try {
    const employeeId = req.user!.employeeId;
    if (!employeeId) {
      res.status(400).json({ error: 'No associated employee record found' });
      return;
    }

    const todayStr = new Date().toISOString().substring(0, 10);
    const monthPrefix = todayStr.substring(0, 7);

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    const mondayStr = monday.toISOString().substring(0, 10);

    const [
      todayAtt,
      weekAttendances,
      lateCount,
      leaveTypes,
      approvedLeaves,
      empPayslips,
      rawAnnouncements
    ] = await Promise.all([
      Attendance.findOne({ employee_id: employeeId, date: todayStr }).lean(),
      Attendance.find({
        employee_id: employeeId,
        date: { $gte: mondayStr, $lte: todayStr }
      }).lean(),
      Attendance.countDocuments({
        employee_id: employeeId,
        status: 'late',
        date: { $regex: `^${escapeRegex(monthPrefix)}` }
      }),
      LeaveType.find().sort({ id: 1 }).lean(),
      LeaveRequest.find({ employee_id: employeeId, status: 'approved' }).lean(),
      Payslip.find({ employee_id: employeeId }).lean(),
      Announcement.find({ target_role: { $in: ['all', 'Employee'] } })
        .sort({ id: -1 })
        .limit(5)
        .lean()
    ]);

    const totalWeekHours = weekAttendances.reduce((sum, a) => sum + Number(a.work_hours || 0), 0);
    const hoursThisWeek = Math.round(totalWeekHours * 10) / 10;

    // Leave balances
    const leaveBalances = leaveTypes.map(lt => {
      const used = approvedLeaves
        .filter(lr => lr.leave_type_id === lt.id)
        .reduce((sum, lr) => sum + Number(lr.days_count || 0), 0);
      const quota = lt.quota;
      return {
        name: lt.name,
        quota,
        used,
        remaining: quota === -1 ? 'Unlimited' : Math.max(0, quota - used)
      };
    });

    // Last payslip
    let lastPayslip: any = null;
    if (empPayslips.length > 0) {
      const runIds = Array.from(new Set(empPayslips.map(p => p.payroll_run_id)));
      const runs = await PayrollRun.find({ id: { $in: runIds } }).lean();
      const runMap = new Map<number, any>(runs.map(r => [r.id, r]));

      const joinedPayslips = empPayslips
        .map(p => {
          const run = runMap.get(p.payroll_run_id);
          if (!run) return null;
          return {
            ...stripMongoFields(p),
            month: run.month,
            run_status: run.status
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .sort((a, b) => b.month.localeCompare(a.month));

      lastPayslip = joinedPayslips[0] || null;
    }

    // Announcements with creator_email
    const creatorIds = Array.from(new Set(rawAnnouncements.map(a => a.created_by)));
    const creators = creatorIds.length > 0 ? await User.find({ id: { $in: creatorIds } }).lean() : [];
    const creatorMap = new Map<number, string>(creators.map(u => [u.id, u.email]));

    const announcements = rawAnnouncements.map(a => ({
      ...stripMongoFields(a),
      creator_email: creatorMap.get(a.created_by) || 'admin'
    }));

    res.json({
      todayAttendance: todayAtt ? stripMongoFields(todayAtt) : null,
      hoursThisWeek,
      weeklyTargetHours: 40,
      lateCountThisMonth: lateCount,
      leaveBalances,
      lastPayslip,
      announcements
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
