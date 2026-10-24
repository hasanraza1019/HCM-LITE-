import { Request, Response } from 'express';
import {
  Settings,
  Department,
  Designation,
  LeaveType,
  Holiday,
  Employee,
  getNextId
} from '../database/models.js';
import { logAudit } from '../utils/audit.js';

// Settings
export async function getSettings(_req: Request, res: Response): Promise<void> {
  try {
    const settings = (await Settings.findOne({ id: 1 }).lean()) as any;
    if (settings && typeof settings.weekend_days === 'string') {
      try {
        settings.weekend_days = JSON.parse(settings.weekend_days);
      } catch {
        settings.weekend_days = ['Saturday', 'Sunday'];
      }
    }
    res.json({ settings: settings || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const {
      company_name,
      office_start_time,
      grace_time_minutes,
      half_day_hours,
      weekend_days,
      office_latitude,
      office_longitude,
      office_radius_meters,
      late_penalty_enabled
    } = req.body;

    const current = (await Settings.findOne({ id: 1 }).lean()) as any;
    const now = new Date().toISOString();

    const updateFields: Record<string, any> = { updated_at: now };
    if (company_name !== undefined) updateFields.company_name = company_name;
    if (office_start_time !== undefined) updateFields.office_start_time = office_start_time;
    if (grace_time_minutes !== undefined) updateFields.grace_time_minutes = Number(grace_time_minutes);
    if (half_day_hours !== undefined) updateFields.half_day_hours = Number(half_day_hours);
    if (weekend_days !== undefined) {
      updateFields.weekend_days = Array.isArray(weekend_days) ? weekend_days : JSON.parse(weekend_days);
    }
    if (office_latitude !== undefined) updateFields.office_latitude = Number(office_latitude);
    if (office_longitude !== undefined) updateFields.office_longitude = Number(office_longitude);
    if (office_radius_meters !== undefined) updateFields.office_radius_meters = Number(office_radius_meters);
    if (late_penalty_enabled !== undefined) updateFields.late_penalty_enabled = Number(late_penalty_enabled);

    const updated = (await Settings.findOneAndUpdate(
      { id: 1 },
      {
        $set: updateFields,
        $setOnInsert: { id: 1, created_at: now }
      },
      { new: true, upsert: true }
    ).lean()) as any;

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'UPDATE_SETTINGS',
      entity: 'Settings',
      entityId: 1,
      before: current,
      after: updated,
      ipAddress: req.ip
    });

    res.json({ message: 'Settings updated successfully', settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Departments
export async function getDepartments(_req: Request, res: Response): Promise<void> {
  try {
    const [depts, activeEmps] = await Promise.all([
      Department.find().sort({ name: 1 }).lean() as Promise<any[]>,
      Employee.find({ status: 'Active' }, { department_id: 1 }).lean() as Promise<any[]>
    ]);

    const countMap = new Map<number, number>();
    for (const e of activeEmps) {
      countMap.set(e.department_id, (countMap.get(e.department_id) || 0) + 1);
    }

    const departments = depts.map(d => ({
      ...d,
      employee_count: countMap.get(d.id) || 0
    }));

    res.json({ departments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function createDepartment(req: Request, res: Response): Promise<void> {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Department name is required' });
      return;
    }

    const trimmed = name.trim();
    const existing = await Department.findOne({
      name: { $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    }).lean();
    if (existing) {
      res.status(400).json({ error: `Department '${trimmed}' already exists` });
      return;
    }

    const id = await getNextId('departments');
    await Department.create({ id, name: trimmed, description: description || '' });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_DEPARTMENT',
      entity: 'Department',
      entityId: id,
      after: { name: trimmed, description },
      ipAddress: req.ip
    });

    res.status(201).json({ department: { id, name: trimmed, description: description || '' } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateDepartment(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { name, description } = req.body;
    await Department.updateOne({ id }, { $set: { name: name.trim(), description: description || '' } });
    res.json({ message: 'Department updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteDepartment(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const empCount = await Employee.countDocuments({ department_id: id });
    if (empCount > 0) {
      res.status(400).json({ error: `Cannot delete department with ${empCount} assigned employees.` });
      return;
    }

    await Designation.deleteMany({ department_id: id });
    await Department.deleteOne({ id });
    res.json({ message: 'Department deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Designations
export async function getDesignations(_req: Request, res: Response): Promise<void> {
  try {
    const [desigs, depts, activeEmps] = await Promise.all([
      Designation.find().sort({ name: 1 }).lean() as Promise<any[]>,
      Department.find().lean() as Promise<any[]>,
      Employee.find({ status: 'Active' }, { designation_id: 1 }).lean() as Promise<any[]>
    ]);

    const deptMap = new Map(depts.map(d => [d.id, d.name]));
    const countMap = new Map<number, number>();
    for (const e of activeEmps) {
      countMap.set(e.designation_id, (countMap.get(e.designation_id) || 0) + 1);
    }

    const designations = desigs.map(des => ({
      ...des,
      department_name: deptMap.get(des.department_id) || 'General',
      employee_count: countMap.get(des.id) || 0
    }));

    res.json({ designations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function createDesignation(req: Request, res: Response): Promise<void> {
  try {
    const { name, department_id } = req.body;
    if (!name || !department_id) {
      res.status(400).json({ error: 'Designation name and department are required' });
      return;
    }

    const trimmed = name.trim();
    const deptNum = Number(department_id);
    const existing = await Designation.findOne({ name: trimmed, department_id: deptNum }).lean();
    if (existing) {
      res.status(400).json({ error: `Designation '${trimmed}' already exists in this department` });
      return;
    }

    const id = await getNextId('designations');
    await Designation.create({ id, name: trimmed, department_id: deptNum });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_DESIGNATION',
      entity: 'Designation',
      entityId: id,
      after: { name: trimmed, department_id: deptNum },
      ipAddress: req.ip
    });

    res.status(201).json({ designation: { id, name: trimmed, department_id: deptNum } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteDesignation(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const empCount = await Employee.countDocuments({ designation_id: id });
    if (empCount > 0) {
      res.status(400).json({ error: `Cannot delete designation with ${empCount} assigned employees.` });
      return;
    }

    await Designation.deleteOne({ id });
    res.json({ message: 'Designation deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Leave Types
export async function getLeaveTypes(_req: Request, res: Response): Promise<void> {
  try {
    const leaveTypes = await LeaveType.find().sort({ id: 1 }).lean();
    res.json({ leaveTypes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateLeaveTypeQuota(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { quota, is_paid } = req.body;
    await LeaveType.updateOne(
      { id },
      { $set: { quota: Number(quota), is_paid: is_paid !== undefined ? Number(is_paid) : 1 } }
    );
    res.json({ message: 'Leave type updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Holidays
export async function getHolidays(_req: Request, res: Response): Promise<void> {
  try {
    const holidays = await Holiday.find().sort({ date: 1 }).lean();
    res.json({ holidays });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function createHoliday(req: Request, res: Response): Promise<void> {
  try {
    const { name, date } = req.body;
    if (!name || !date) {
      res.status(400).json({ error: 'Holiday name and date are required' });
      return;
    }

    const existing = await Holiday.findOne({ date }).lean();
    if (existing) {
      res.status(400).json({ error: `A holiday is already registered for ${date}` });
      return;
    }

    const id = await getNextId('holidays');
    await Holiday.create({ id, name: name.trim(), date });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_HOLIDAY',
      entity: 'Holiday',
      entityId: id,
      after: { name: name.trim(), date },
      ipAddress: req.ip
    });

    res.status(201).json({ holiday: { id, name: name.trim(), date } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteHoliday(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    await Holiday.deleteOne({ id });
    res.json({ message: 'Holiday deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
