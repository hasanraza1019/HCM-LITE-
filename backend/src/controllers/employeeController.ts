import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  Employee,
  Department,
  Designation,
  User,
  LeaveType,
  LeaveRequest,
  Attendance,
  Payslip,
  PayrollRun,
  getNextId
} from '../database/models.js';
import { logAudit } from '../utils/audit.js';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripMongoFields<T extends Record<string, any>>(doc: T): Omit<T, '_id' | '__v'> {
  const { _id, __v, ...rest } = doc;
  return rest;
}

export async function listEmployees(req: Request, res: Response): Promise<void> {
  try {
    const {
      search = '',
      department_id,
      designation_id,
      status,
      page = '1',
      limit = '10'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};

    // If Employee role, restrict to own record
    if (req.user!.role === 'Employee') {
      filter.id = req.user!.employeeId ?? -1;
    }

    if (search && String(search).trim()) {
      const regex = new RegExp(escapeRegex(String(search).trim()), 'i');
      filter.$or = [{ full_name: regex }, { code: regex }, { email: regex }];
    }

    if (department_id) {
      filter.department_id = Number(department_id);
    }

    if (designation_id) {
      filter.designation_id = Number(designation_id);
    }

    if (status) {
      filter.status = String(status);
    }

    const [total, rawEmployees, departments, designations] = await Promise.all([
      Employee.countDocuments(filter),
      Employee.find(filter).sort({ id: -1 }).skip(offset).limit(limitNum).lean(),
      Department.find().lean(),
      Designation.find().lean()
    ]);

    const empIds = rawEmployees.map(e => e.id);
    const users = empIds.length > 0 ? await User.find({ employee_id: { $in: empIds } }).lean() : [];

    const deptMap = new Map<number, string>(departments.map(d => [d.id, d.name]));
    const desigMap = new Map<number, string>(designations.map(d => [d.id, d.name]));
    const userMap = new Map<number, any>();
    users.forEach(u => {
      if (u.employee_id !== null && u.employee_id !== undefined) {
        userMap.set(u.employee_id, u);
      }
    });

    // If Employee role, mask salary for safety unless requested by Admin, HR, or own record
    const formatted = rawEmployees.map((emp: any) => {
      const cleanEmp = stripMongoFields(emp);
      const userDoc = userMap.get(emp.id);
      const basic = Number(emp.basic_salary);
      const hra = basic * 0.4;
      const medical = basic * 0.1;
      const gross = basic * 1.5;

      return {
        ...cleanEmp,
        department_name: deptMap.get(emp.department_id) || null,
        designation_name: desigMap.get(emp.designation_id) || null,
        user_id: userDoc ? userDoc.id : null,
        user_active: userDoc ? userDoc.is_active : null,
        must_change_password: userDoc ? userDoc.must_change_password : null,
        salary_structure:
          req.user!.role === 'Admin' || req.user!.role === 'HR' || req.user!.employeeId === emp.id
            ? {
                basic,
                hra,
                medical,
                gross
              }
            : undefined
      };
    });

    res.json({
      employees: formatted,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getEmployee360(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const empId = Number(id);

    // Scope check: Employee role can only see their own profile
    if (req.user!.role === 'Employee' && req.user!.employeeId !== empId) {
      res.status(403).json({ error: 'Access denied: You can only view your own profile' });
      return;
    }

    const empDoc = await Employee.findOne({ id: empId }).lean();
    if (!empDoc) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const currentMonthPrefix = new Date().toISOString().substring(0, 7);

    const [
      dept,
      desig,
      userDoc,
      leaveTypes,
      approvedLeaves,
      monthAttendances,
      empPayslips,
      recentLeaveDocs
    ] = await Promise.all([
      Department.findOne({ id: empDoc.department_id }).lean(),
      Designation.findOne({ id: empDoc.designation_id }).lean(),
      User.findOne({ employee_id: empId }).lean(),
      LeaveType.find().sort({ id: 1 }).lean(),
      LeaveRequest.find({ employee_id: empId, status: 'approved' }).lean(),
      Attendance.find({
        employee_id: empId,
        date: { $regex: `^${escapeRegex(currentMonthPrefix)}` }
      }).lean(),
      Payslip.find({ employee_id: empId }).lean(),
      LeaveRequest.find({ employee_id: empId }).sort({ id: -1 }).limit(5).lean()
    ]);

    const employee = {
      ...stripMongoFields(empDoc),
      department_name: dept?.name || null,
      designation_name: desig?.name || null,
      user_id: userDoc?.id ?? null,
      user_active: userDoc?.is_active ?? null,
      must_change_password: userDoc?.must_change_password ?? null
    };

    // Salary Structure
    const basic = Number(employee.basic_salary);
    const hra = basic * 0.4;
    const medical = basic * 0.1;
    const gross = basic * 1.5;

    // Leave Balances calculation
    const ltNameMap = new Map<number, string>();
    const leaveBalances = leaveTypes.map(lt => {
      ltNameMap.set(lt.id, lt.name);
      const used = approvedLeaves
        .filter(lr => lr.leave_type_id === lt.id)
        .reduce((sum, lr) => sum + Number(lr.days_count || 0), 0);
      const quota = lt.quota;
      const remaining = quota === -1 ? 'Unlimited' : Math.max(0, quota - used);

      return {
        id: lt.id,
        name: lt.name,
        quota,
        used,
        remaining
      };
    });

    // Attendance stats for current month
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let totalWorkHours = 0;

    for (const att of monthAttendances) {
      if (att.status === 'present') presentCount++;
      else if (att.status === 'late') lateCount++;
      else if (att.status === 'half_day') halfDayCount++;
      else if (att.status === 'absent') absentCount++;
      totalWorkHours += Number(att.work_hours || 0);
    }

    const attendanceStats = {
      present_count: presentCount,
      late_count: lateCount,
      half_day_count: halfDayCount,
      absent_count: absentCount,
      total_work_hours: Math.round(totalWorkHours * 100) / 100
    };

    // Recent 5 payslips joined with payroll_runs
    const runIds = Array.from(new Set(empPayslips.map(p => p.payroll_run_id)));
    const runs = runIds.length > 0 ? await PayrollRun.find({ id: { $in: runIds } }).lean() : [];
    const runMap = new Map<number, any>(runs.map(r => [r.id, r]));

    const payslips = empPayslips
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
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 5);

    // Recent 5 leave requests
    const recentLeaves = recentLeaveDocs.map(lr => ({
      ...stripMongoFields(lr),
      leave_type_name: ltNameMap.get(lr.leave_type_id) || 'Leave'
    }));

    res.json({
      employee,
      salary_structure: {
        basic,
        hra,
        medical,
        gross
      },
      leave_balances: leaveBalances,
      attendance_stats: attendanceStats,
      recent_payslips: payslips,
      recent_leaves: recentLeaves
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function createEmployee(req: Request, res: Response): Promise<void> {
  try {
    const {
      code,
      full_name,
      email,
      phone,
      address,
      gender = 'Other',
      joining_date,
      department_id,
      designation_id,
      basic_salary,
      temporary_password = 'Password@123'
    } = req.body;

    if (!code || !full_name || !email || !department_id || !designation_id || basic_salary === undefined) {
      res.status(400).json({ error: 'Code, full name, email, department, designation, and basic salary are required' });
      return;
    }

    const trimmedCode = String(code).trim();
    const normalizedEmail = String(email).toLowerCase().trim();

    // Check unique code & email
    const [existingCode, existingEmail, existingUser] = await Promise.all([
      Employee.findOne({ code: new RegExp(`^${escapeRegex(trimmedCode)}$`, 'i') }).lean(),
      Employee.findOne({ email: normalizedEmail }).lean(),
      User.findOne({ email: normalizedEmail }).lean()
    ]);

    if (existingCode) {
      res.status(400).json({ error: `Employee code '${trimmedCode}' is already registered` });
      return;
    }

    if (existingEmail) {
      res.status(400).json({ error: `Email '${email}' is already registered in employees` });
      return;
    }

    if (existingUser) {
      res.status(400).json({ error: `A user account with email '${email}' already exists` });
      return;
    }

    const now = new Date().toISOString();
    const empId = await getNextId('employees');

    // 1. Create employee
    await Employee.create({
      id: empId,
      code: trimmedCode,
      full_name: String(full_name).trim(),
      email: normalizedEmail,
      phone: phone || '',
      address: address || '',
      gender,
      joining_date: joining_date || now.substring(0, 10),
      exit_date: null,
      department_id: Number(department_id),
      designation_id: Number(designation_id),
      basic_salary: Number(basic_salary),
      status: 'Active',
      created_at: now,
      updated_at: now
    });

    // 2. Create user login with temporary password and must_change_password = 1
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(temporary_password, salt);
    const userId = await getNextId('users');

    await User.create({
      id: userId,
      email: normalizedEmail,
      password_hash: passwordHash,
      role: 'Employee',
      employee_id: empId,
      must_change_password: 1,
      is_active: 1,
      created_at: now,
      updated_at: now
    });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'REGISTER_EMPLOYEE',
      entity: 'Employee',
      entityId: empId,
      after: { code: trimmedCode, full_name, email: normalizedEmail, department_id, designation_id, basic_salary, userId },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: 'Employee registered successfully with temporary login',
      employee: {
        id: empId,
        code: trimmedCode,
        full_name: String(full_name).trim(),
        email: normalizedEmail,
        basic_salary: Number(basic_salary)
      },
      temporary_password
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateEmployee(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const empId = Number(id);

    const current = await Employee.findOne({ id: empId }).lean();
    if (!current) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    // Role check: Employee can only edit phone and address on their own profile
    if (req.user!.role === 'Employee') {
      if (req.user!.employeeId !== empId) {
        res.status(403).json({ error: 'Forbidden: You can only edit your own details' });
        return;
      }

      const { phone, address } = req.body;
      const now = new Date().toISOString();

      await Employee.updateOne(
        { id: empId },
        {
          $set: {
            phone: phone !== undefined ? phone : current.phone,
            address: address !== undefined ? address : current.address,
            updated_at: now
          }
        }
      );

      await logAudit({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'UPDATE_OWN_PROFILE',
        entity: 'Employee',
        entityId: empId,
        before: { phone: current.phone, address: current.address },
        after: { phone, address },
        ipAddress: req.ip
      });

      res.json({ message: 'Profile updated successfully' });
      return;
    }

    // HR or Admin updating employee
    const {
      full_name,
      phone,
      address,
      gender,
      joining_date,
      exit_date,
      status,
      department_id,
      designation_id,
      basic_salary
    } = req.body;

    const now = new Date().toISOString();
    const updateSet: Record<string, any> = { updated_at: now };

    if (full_name !== undefined && full_name !== null) updateSet.full_name = full_name;
    if (phone !== undefined && phone !== null) updateSet.phone = phone;
    if (address !== undefined && address !== null) updateSet.address = address;
    if (gender !== undefined && gender !== null) updateSet.gender = gender;
    if (joining_date !== undefined && joining_date !== null) updateSet.joining_date = joining_date;
    if (exit_date !== undefined) updateSet.exit_date = exit_date;
    if (status !== undefined && status !== null) updateSet.status = status;
    if (department_id !== undefined && department_id !== null) updateSet.department_id = Number(department_id);
    if (designation_id !== undefined && designation_id !== null) updateSet.designation_id = Number(designation_id);
    if (basic_salary !== undefined && basic_salary !== null) updateSet.basic_salary = Number(basic_salary);

    await Employee.updateOne({ id: empId }, { $set: updateSet });

    const updated = await Employee.findOne({ id: empId }).lean();

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'UPDATE_EMPLOYEE',
      entity: 'Employee',
      entityId: empId,
      before: current,
      after: updated,
      ipAddress: req.ip
    });

    res.json({ message: 'Employee updated successfully', employee: updated ? stripMongoFields(updated) : null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// CSV Dry Run & Import
export async function dryRunCSV(req: Request, res: Response): Promise<void> {
  try {
    const { rows } = req.body; // array of employee row objects
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'CSV data is empty or invalid format' });
      return;
    }

    const errors: Array<{ row: number; field: string; reason: string }> = [];
    const validRows: any[] = [];

    const [existingEmps, existingUsers, departments] = await Promise.all([
      Employee.find({}, { code: 1, email: 1 }).lean(),
      User.find({}, { email: 1 }).lean(),
      Department.find().lean()
    ]);

    const existingCodes = new Set(existingEmps.map(r => r.code.toUpperCase()));
    const existingEmails = new Set([
      ...existingEmps.map(r => r.email.toLowerCase()),
      ...existingUsers.map(u => u.email.toLowerCase())
    ]);

    const deptMap = new Map<string, number>();
    departments.forEach(d => deptMap.set(d.name.toLowerCase().trim(), d.id));

    const seenCodes = new Set<string>();
    const seenEmails = new Set<string>();

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const code = (row.code || '').trim();
      const fullName = (row.full_name || row.name || '').trim();
      const email = (row.email || '').trim().toLowerCase();
      const department = (row.department || '').trim();
      const designation = (row.designation || '').trim();
      const joiningDate = (row.joining_date || '').trim();
      const basicSalary = parseFloat(row.basic_salary);

      // 1. Required fields
      if (!code) errors.push({ row: rowNum, field: 'code', reason: 'Employee code is required' });
      if (!fullName) errors.push({ row: rowNum, field: 'full_name', reason: 'Full name is required' });
      if (!email) errors.push({ row: rowNum, field: 'email', reason: 'Email is required' });
      if (!department) errors.push({ row: rowNum, field: 'department', reason: 'Department is required' });
      if (!designation) errors.push({ row: rowNum, field: 'designation', reason: 'Designation is required' });

      // 2. Email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        errors.push({ row: rowNum, field: 'email', reason: 'Invalid email format' });
      }

      // 3. Unique code check
      if (code) {
        const upperCode = code.toUpperCase();
        if (existingCodes.has(upperCode) || seenCodes.has(upperCode)) {
          errors.push({ row: rowNum, field: 'code', reason: `Employee code '${code}' already exists` });
        }
        seenCodes.add(upperCode);
      }

      // 4. Unique email check
      if (email) {
        if (existingEmails.has(email) || seenEmails.has(email)) {
          errors.push({ row: rowNum, field: 'email', reason: `Email '${email}' already exists` });
        }
        seenEmails.add(email);
      }

      // 5. Known department check
      let deptId: number | undefined;
      if (department) {
        deptId = deptMap.get(department.toLowerCase());
        if (!deptId) {
          errors.push({ row: rowNum, field: 'department', reason: `Department '${department}' does not exist` });
        }
      }

      // 6. ISO date check (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (joiningDate && !dateRegex.test(joiningDate)) {
        errors.push({ row: rowNum, field: 'joining_date', reason: 'Joining date must be in ISO format (YYYY-MM-DD)' });
      }

      // 7. Salary > 0
      if (isNaN(basicSalary) || basicSalary <= 0) {
        errors.push({ row: rowNum, field: 'basic_salary', reason: 'Basic salary must be a positive number greater than 0' });
      }

      if (errors.filter(e => e.row === rowNum).length === 0) {
        validRows.push({
          code,
          full_name: fullName,
          email,
          phone: row.phone || '',
          address: row.address || '',
          gender: row.gender || 'Other',
          joining_date: joiningDate || new Date().toISOString().substring(0, 10),
          department_id: deptId,
          designation_name: designation,
          basic_salary: basicSalary
        });
      }
    });

    res.json({
      valid: errors.length === 0,
      totalRows: rows.length,
      validCount: validRows.length,
      errorCount: errors.length,
      errors,
      validRows: errors.length === 0 ? validRows : []
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function confirmCSVImport(req: Request, res: Response): Promise<void> {
  try {
    const { validRows } = req.body;
    if (!Array.isArray(validRows) || validRows.length === 0) {
      res.status(400).json({ error: 'No validated rows provided for import' });
      return;
    }

    const now = new Date().toISOString();
    const createdList: any[] = [];

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('Password@123', salt);

    for (const r of validRows) {
      const trimmedDesigName = String(r.designation_name).trim();
      const deptId = Number(r.department_id);

      // Find or create designation
      let desig = await Designation.findOne({
        name: new RegExp(`^${escapeRegex(trimmedDesigName)}$`, 'i'),
        department_id: deptId
      }).lean();

      let desigId = desig ? desig.id : null;
      if (!desigId) {
        desigId = await getNextId('designations');
        await Designation.create({
          id: desigId,
          name: trimmedDesigName,
          department_id: deptId
        });
      }

      // Insert employee
      const empId = await getNextId('employees');
      await Employee.create({
        id: empId,
        code: r.code,
        full_name: r.full_name,
        email: String(r.email).toLowerCase().trim(),
        phone: r.phone || '',
        address: r.address || '',
        gender: r.gender || 'Other',
        joining_date: r.joining_date,
        exit_date: null,
        department_id: deptId,
        designation_id: desigId,
        basic_salary: Number(r.basic_salary),
        status: 'Active',
        created_at: now,
        updated_at: now
      });

      // Create login account
      const userId = await getNextId('users');
      await User.create({
        id: userId,
        email: String(r.email).toLowerCase().trim(),
        password_hash: defaultPasswordHash,
        role: 'Employee',
        employee_id: empId,
        must_change_password: 1,
        is_active: 1,
        created_at: now,
        updated_at: now
      });

      createdList.push({ id: empId, code: r.code, name: r.full_name });
    }

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CSV_IMPORT_EMPLOYEES',
      entity: 'Employee',
      after: { count: createdList.length },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: `Successfully imported ${createdList.length} employees`,
      count: createdList.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// CSV Export
export async function exportCSV(req: Request, res: Response): Promise<void> {
  try {
    const [employees, departments, designations] = await Promise.all([
      Employee.find().sort({ id: 1 }).lean(),
      Department.find().lean(),
      Designation.find().lean()
    ]);

    const deptMap = new Map<number, string>(departments.map(d => [d.id, d.name]));
    const desigMap = new Map<number, string>(designations.map(d => [d.id, d.name]));

    const headers = [
      'code',
      'full_name',
      'email',
      'phone',
      'address',
      'gender',
      'joining_date',
      'status',
      'department',
      'designation',
      'basic_salary'
    ];
    const csvLines = [headers.join(',')];

    for (const emp of employees) {
      const deptName = deptMap.get(emp.department_id) || '';
      const desigName = desigMap.get(emp.designation_id) || '';
      const line = [
        `"${emp.code || ''}"`,
        `"${emp.full_name || ''}"`,
        `"${emp.email || ''}"`,
        `"${emp.phone || ''}"`,
        `"${emp.address || ''}"`,
        `"${emp.gender || ''}"`,
        `"${emp.joining_date || ''}"`,
        `"${emp.status || ''}"`,
        `"${deptName}"`,
        `"${desigName}"`,
        emp.basic_salary || 0
      ].join(',');
      csvLines.push(line);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');
    res.send(csvLines.join('\n'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
