import {
  Employee,
  Department,
  Designation,
  Attendance,
  LeaveType,
  LeaveRequest,
  PayrollRun
} from '../database/models.js';

export interface UserContext {
  id: number;
  email: string;
  role: 'Admin' | 'HR' | 'Employee';
  employeeId?: number | null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Standard organizational policy guidelines for LLM context
export const SYSTEM_RULES_PROMPT = `
You are HCM Lite AI, an intelligent, professional HR assistant for the HCM Lite application.
You strictly answer based on real company data via tools and the following verified company policies:

COMPANY POLICIES & BUSINESS RULES:
1. AUTH & ROLES:
   - Admin: Has company-wide access, configures company settings, office hours & location, departments, designations, holidays, manages logins, and finalizes payroll (locks it). Cannot edit finalized payroll or delete audit logs.
   - HR: Registers employees, sets salary structures, manages daily attendance, approves/rejects attendance corrections, approves/rejects leaves with comments, drafts monthly payroll. Cannot change company settings/location, cannot create Admin users or finalize payroll, and cannot view audit logs.
   - Employee: Self-service access only. Can web check-in/out (and camera check-in with GPS), view own attendance, request corrections with reasons, apply/cancel leave, download own payslips, view own profile, and edit only phone and address. CANNOT see any other employee's salary or personal data, cannot approve anything, and cannot edit own salary, role, or attendance directly.

2. ATTENDANCE RULES:
   - Server stamps the time.
   - One check-in per employee per day (second check-in results in 409 Conflict).
   - Office start time is 09:00 with a 15-minute grace period. Check-in after 09:15 is marked "late".
   - Under 5 hours worked on check-out is marked "half_day".
   - Missing checkout: checked in but never checked out.
   - Absent: working day with no attendance record and no approved leave.
   - Geofence rule: Camera check-in requires exactly 1 detected face, GPS accuracy < 100m, and location within office radius (default 150m) verified by Haversine formula.

3. LEAVE RULES:
   - Working days only: weekends and public holidays are excluded from leave deductions.
   - Quotas: Annual 14 days, Sick 8 days, Casual 10 days, Unpaid unlimited.
   - Overlap with existing pending/approved requests or exceeding quota returns 422 error.

4. PAYROLL RULES:
   - Basic salary is base.
   - Gross = 1.5 * Basic (House Rent Allowance HRA is 40%, Medical Allowance is 10%).
   - Daily rate = Gross / Working Days in the month.
   - Deductions = (absent_days + unpaid_leave_days + 0.5 * half_days) * Daily rate.
   - Late penalty: 3 late arrivals = 0.5 day deduction.
   - Tax slabs on Annual Gross (Gross * 12):
     * Up to 600k: 0%
     * 600k to 1.2M: 5% on excess over 600k
     * 1.2M to 2.4M: 30,000 + 15% on excess over 1.2M
     * 2.4M to 3.6M: 210,000 + 25% on excess over 2.4M
     * Above 3.6M: 510,000 + 35% on excess over 3.6M
   - Monthly tax = Annual tax / 12.
   - Net Salary = Gross - Deductions - Monthly Tax.
   - Finalized payroll is locked and cannot be edited.

5. STRICT SECURITY & PERMISSION RULES:
   - If an Employee asks for another employee's or colleague's salary or compensation, YOU MUST POLITELY AND FIRMLY REFUSE. Example: "I cannot disclose salary or personal compensation details of other employees."
   - Never expose salary data to Employee role.
   - Only answer from known tool data and the policies above. If information is not available, state clearly that you do not know.
   - You understand both English and Roman Urdu (e.g. "Bhai ki shadi hai", "Kitni chuttiyan baki hain").
`;

// Tool Implementations (MongoDB / Mongoose)
export const aiTools = {
  get_headcount: async (_ctx: UserContext, args: { department?: string }) => {
    const filter: any = { status: 'Active' };
    if (args.department) {
      const matchingDepts = (await Department.find({
        name: { $regex: escapeRegex(args.department), $options: 'i' }
      }).lean()) as any[];
      filter.department_id = { $in: matchingDepts.map(d => d.id) };
    }
    const count = await Employee.countDocuments(filter);
    return {
      active_headcount: count,
      filter_department: args.department || 'All'
    };
  },

  get_attendance_summary: async (_ctx: UserContext, args: { date?: string; department?: string }) => {
    const today = new Date().toISOString().substring(0, 10);
    const targetDate = args.date || today;

    const empFilter: any = { status: 'Active' };
    if (args.department) {
      const matchingDepts = (await Department.find({
        name: { $regex: escapeRegex(args.department), $options: 'i' }
      }).lean()) as any[];
      empFilter.department_id = { $in: matchingDepts.map(d => d.id) };
    }

    const activeEmps = (await Employee.find(empFilter, { id: 1 }).lean()) as any[];
    const empIds = activeEmps.map(e => e.id);
    const totalHeadcount = await Employee.countDocuments({ status: 'Active' });

    const records = (await Attendance.find({
      date: targetDate,
      ...(args.department ? { employee_id: { $in: empIds } } : {})
    }).lean()) as any[];

    let present = 0;
    let late = 0;
    let halfDay = 0;
    for (const r of records) {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'half_day') halfDay++;
    }

    const attended = present + late + halfDay;
    const rate = totalHeadcount > 0 ? Math.round((attended / totalHeadcount) * 100) : 0;

    return {
      date: targetDate,
      present,
      late,
      half_day: halfDay,
      total_attended: attended,
      total_employees: totalHeadcount,
      attendance_rate: `${rate}%`
    };
  },

  get_late_comers: async (_ctx: UserContext, args: { month?: string; limit?: number }) => {
    const monthPrefix = args.month || new Date().toISOString().substring(0, 7);
    const limit = args.limit || 5;

    const lateRecords = (await Attendance.find({
      status: 'late',
      date: { $regex: `^${escapeRegex(monthPrefix)}` }
    }).lean()) as any[];

    const countsByEmp = new Map<number, number>();
    for (const r of lateRecords) {
      countsByEmp.set(r.employee_id, (countsByEmp.get(r.employee_id) || 0) + 1);
    }

    const sortedEmpIds = Array.from(countsByEmp.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    if (sortedEmpIds.length === 0) {
      return { month: monthPrefix, late_comers: [] };
    }

    const [emps, depts] = await Promise.all([
      Employee.find({ id: { $in: sortedEmpIds.map(([id]) => id) } }).lean() as Promise<any[]>,
      Department.find().lean() as Promise<any[]>
    ]);
    const empMap = new Map(emps.map(e => [e.id, e]));
    const deptMap = new Map(depts.map(d => [d.id, d.name]));

    const rows = sortedEmpIds
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
      .filter(Boolean);

    return {
      month: monthPrefix,
      late_comers: rows
    };
  },

  get_leave_summary: async (_ctx: UserContext, args: { date?: string; department?: string }) => {
    const targetDate = args.date || new Date().toISOString().substring(0, 10);

    const leaves = (await LeaveRequest.find({
      status: 'approved',
      start_date: { $lte: targetDate },
      end_date: { $gte: targetDate }
    }).lean()) as any[];

    if (leaves.length === 0) {
      return { date: targetDate, total_on_leave: 0, employees_on_leave: [] };
    }

    const [leaveTypes, emps, depts] = await Promise.all([
      LeaveType.find().lean() as Promise<any[]>,
      Employee.find({ id: { $in: leaves.map(l => l.employee_id) } }).lean() as Promise<any[]>,
      Department.find().lean() as Promise<any[]>
    ]);

    const ltMap = new Map(leaveTypes.map(lt => [lt.id, lt.name]));
    const empMap = new Map(emps.map(e => [e.id, e]));
    const deptMap = new Map(depts.map(d => [d.id, d.name]));

    const rows = leaves
      .map(lr => {
        const emp = empMap.get(lr.employee_id);
        if (!emp) return null;
        const deptName = deptMap.get(emp.department_id) || null;
        if (args.department && (!deptName || !deptName.toLowerCase().includes(args.department.toLowerCase()))) {
          return null;
        }
        return {
          id: lr.id,
          start_date: lr.start_date,
          end_date: lr.end_date,
          reason: lr.reason,
          leave_type: ltMap.get(lr.leave_type_id) || 'Leave',
          employee_code: emp.code,
          full_name: emp.full_name,
          department: deptName
        };
      })
      .filter(Boolean);

    return {
      date: targetDate,
      total_on_leave: rows.length,
      employees_on_leave: rows
    };
  },

  get_my_leave_balance: async (ctx: UserContext) => {
    if (!ctx.employeeId) {
      return { balances: [] };
    }

    const [leaveTypes, approvedLeaves] = await Promise.all([
      LeaveType.find().sort({ id: 1 }).lean() as Promise<any[]>,
      LeaveRequest.find({ employee_id: ctx.employeeId, status: 'approved' }).lean() as Promise<any[]>
    ]);

    const balances = leaveTypes.map(lt => {
      const used = approvedLeaves
        .filter(lr => lr.leave_type_id === lt.id)
        .reduce((sum, lr) => sum + (Number(lr.days_count) || 0), 0);
      const remaining = lt.quota === -1 ? 'Unlimited' : Math.max(0, lt.quota - used);

      return {
        type: lt.name,
        quota: lt.quota,
        used,
        remaining
      };
    });

    return { employee_id: ctx.employeeId, balances };
  },

  get_payroll_summary: async (ctx: UserContext, args: { month?: string }) => {
    if (ctx.role === 'Employee') {
      return { error: 'Access denied: Employees cannot access company payroll summaries.' };
    }

    const monthPrefix = args.month || new Date().toISOString().substring(0, 7);
    const run = (await PayrollRun.findOne({ month: monthPrefix }).lean()) as any;

    if (run) {
      return {
        month: monthPrefix,
        status: run.status,
        total_gross_cost: run.total_gross,
        total_tax_deducted: run.total_tax,
        total_deductions: run.total_deductions,
        total_net_payout: run.total_net,
        working_days: run.working_days
      };
    }

    const activeEmps = (await Employee.find({ status: 'Active' }, { basic_salary: 1 }).lean()) as any[];
    const empCount = activeEmps.length;
    const estimatedGross = activeEmps.reduce((sum, e) => sum + Number(e.basic_salary || 0) * 1.5, 0);
    const avgGross = empCount > 0 ? Math.round(estimatedGross / empCount) : 0;

    return {
      month: monthPrefix,
      status: 'not_run_yet',
      active_employees: empCount,
      estimated_gross_payroll: estimatedGross,
      average_salary: avgGross
    };
  },

  search_employees: async (ctx: UserContext, args: { query: string; department?: string }) => {
    const regex = new RegExp(escapeRegex(args.query || ''), 'i');
    const filter: any = {
      $or: [{ full_name: regex }, { code: regex }, { email: regex }]
    };

    const [depts, desigs] = await Promise.all([
      Department.find().lean() as Promise<any[]>,
      Designation.find().lean() as Promise<any[]>
    ]);
    const deptMap = new Map(depts.map(d => [d.id, d.name]));
    const desigMap = new Map(desigs.map(des => [des.id, des.name]));

    if (args.department) {
      const matchingDeptIds = depts
        .filter(d => d.name.toLowerCase().includes(args.department!.toLowerCase()))
        .map(d => d.id);
      filter.department_id = { $in: matchingDeptIds };
    }

    const emps = (await Employee.find(filter).limit(10).lean()) as any[];
    const results = emps.map(e => {
      const base: any = {
        id: e.id,
        code: e.code,
        full_name: e.full_name,
        email: e.email,
        phone: e.phone,
        gender: e.gender,
        joining_date: e.joining_date,
        status: e.status,
        department: deptMap.get(e.department_id) || null,
        designation: desigMap.get(e.designation_id) || null
      };
      if (ctx.role !== 'Employee') {
        base.basic_salary = e.basic_salary;
        base.gross_salary = Number(e.basic_salary || 0) * 1.5;
      }
      return base;
    });

    return { results };
  }
};
