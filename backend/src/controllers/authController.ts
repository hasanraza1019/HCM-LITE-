import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  User,
  Settings,
  Employee,
  Department,
  Designation,
  getNextId
} from '../database/models.js';
import { JWT_SECRET } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { runDemoSeed } from '../database/seedDemo.js';

async function getPopulatedEmployee(employeeId?: number | null) {
  if (!employeeId) return null;
  const emp = (await Employee.findOne({ id: employeeId }).lean()) as any;
  if (!emp) return null;

  const [dept, desig] = await Promise.all([
    Department.findOne({ id: emp.department_id }).lean() as Promise<any>,
    Designation.findOne({ id: emp.designation_id }).lean() as Promise<any>
  ]);

  return {
    ...emp,
    department_name: dept?.name || null,
    designation_name: desig?.name || null
  };
}

export async function getSystemStatus(_req: Request, res: Response): Promise<void> {
  try {
    const [adminUser, settings] = await Promise.all([
      User.findOne({ role: 'Admin' }).lean() as Promise<any>,
      Settings.findOne({ id: 1 }).lean() as Promise<any>
    ]);

    const initialized = Boolean(adminUser && settings);
    res.json({
      initialized,
      companyName: settings?.company_name || null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function firstRunSetup(req: Request, res: Response): Promise<void> {
  try {
    const existingAdmin = await User.findOne({ role: 'Admin' }).lean();
    if (existingAdmin) {
      res.status(400).json({ error: 'System is already initialized with an Admin account' });
      return;
    }

    const {
      companyName,
      officeStartTime = '09:00',
      graceMinutes = 15,
      halfDayHours = 5.0,
      weekendDays = ['Saturday', 'Sunday'],
      officeLatitude = 24.8607,
      officeLongitude = 67.0011,
      officeRadius = 150.0,
      adminEmail,
      adminPassword
    } = req.body;

    if (!companyName || !adminEmail || !adminPassword) {
      res.status(400).json({ error: 'Company name, admin email, and admin password are required' });
      return;
    }

    const now = new Date().toISOString();

    await Settings.findOneAndUpdate(
      { id: 1 },
      {
        $set: {
          id: 1,
          company_name: companyName,
          office_start_time: officeStartTime,
          grace_time_minutes: Number(graceMinutes),
          half_day_hours: Number(halfDayHours),
          weekend_days: Array.isArray(weekendDays) ? weekendDays : ['Saturday', 'Sunday'],
          office_latitude: Number(officeLatitude),
          office_longitude: Number(officeLongitude),
          office_radius_meters: Number(officeRadius),
          late_penalty_enabled: 1,
          updated_at: now
        },
        $setOnInsert: { created_at: now }
      },
      { upsert: true }
    );

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);
    const userId = await getNextId('users');

    await User.create({
      id: userId,
      email: adminEmail.toLowerCase().trim(),
      password_hash: passwordHash,
      role: 'Admin',
      employee_id: null,
      must_change_password: 0,
      is_active: 1,
      created_at: now,
      updated_at: now
    });

    await logAudit({
      actorId: userId,
      actorEmail: adminEmail,
      actorRole: 'Admin',
      action: 'FIRST_RUN_SETUP',
      entity: 'Company & Admin',
      entityId: userId,
      after: { companyName, adminEmail },
      ipAddress: req.ip
    });

    const token = jwt.sign(
      { id: userId, email: adminEmail.toLowerCase().trim(), role: 'Admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'System successfully initialized',
      token,
      user: {
        id: userId,
        email: adminEmail.toLowerCase().trim(),
        role: 'Admin',
        mustChangePassword: false
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function seedDemoData(_req: Request, res: Response): Promise<void> {
  try {
    await runDemoSeed(false);
    res.json({
      message: 'Demo dataset successfully seeded into MongoDB Atlas!',
      credentials: {
        admin: { email: 'admin@saylaniit.com', password: 'Admin@123' },
        hr: { email: 'hr@saylaniit.com', password: 'Hr@123' },
        employee: { email: 'ali.khan@saylaniit.com', password: 'Employee@123' }
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to seed demo data' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = (await User.findOne({ email: normalizedEmail }).lean()) as any;

    // Auto-heal / on-demand seed for official demo accounts if not yet initialized in MongoDB
    if (!user && ['admin@saylaniit.com', 'hr@saylaniit.com', 'ali.khan@saylaniit.com', 'sara.ahmed@saylaniit.com', 'usman.tariq@saylaniit.com'].includes(normalizedEmail)) {
      console.log(`Demo account ${normalizedEmail} requested but not present. Auto-seeding MongoDB Atlas...`);
      try {
        await runDemoSeed(false);
        user = (await User.findOne({ email: normalizedEmail }).lean()) as any;
      } catch (seedErr: any) {
        console.error('Auto-seed error:', seedErr);
      }
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (user.is_active === 0) {
      res.status(403).json({ error: 'Your account has been deactivated. Contact Admin.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const employee = await getPopulatedEmployee(user.employee_id);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, employeeId: user.employee_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'LOGIN',
      entity: 'Session',
      entityId: user.id,
      ipAddress: req.ip
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employee_id,
        mustChangePassword: Boolean(user.must_change_password)
      },
      employee
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long' });
      return;
    }

    const user = (await User.findOne({ id: req.user!.id }).lean()) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.must_change_password) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required' });
        return;
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        res.status(400).json({ error: 'Incorrect current password' });
        return;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    const now = new Date().toISOString();

    await User.updateOne(
      { id: user.id },
      { $set: { password_hash: newHash, must_change_password: 0, updated_at: now } }
    );

    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    const user = (await User.findOne(
      { id: req.user!.id },
      { password_hash: 0 }
    ).lean()) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const [employee, settings] = await Promise.all([
      getPopulatedEmployee(user.employee_id),
      Settings.findOne({ id: 1 }).lean() as Promise<any>
    ]);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employee_id,
        mustChangePassword: Boolean(user.must_change_password)
      },
      employee,
      companyName: settings?.company_name || 'HCM Lite'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Admin only: list all system users
export async function listUsers(_req: Request, res: Response): Promise<void> {
  try {
    const [users, employees] = await Promise.all([
      User.find({}, { password_hash: 0 }).sort({ id: 1 }).lean() as Promise<any[]>,
      Employee.find({}, { id: 1, full_name: 1, code: 1 }).lean() as Promise<any[]>
    ]);

    const empMap = new Map(employees.map(e => [e.id, e]));
    const formatted = users.map(u => {
      const emp = u.employee_id ? empMap.get(u.employee_id) : null;
      return {
        ...u,
        employee_name: emp?.full_name || null,
        employee_code: emp?.code || null
      };
    });

    res.json({ users: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Admin only: create HR user login
export async function createHRUser(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      res.status(400).json({ error: 'A user with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const now = new Date().toISOString();
    const newId = await getNextId('users');

    await User.create({
      id: newId,
      email: normalizedEmail,
      password_hash: passwordHash,
      role: 'HR',
      employee_id: null,
      must_change_password: 0,
      is_active: 1,
      created_at: now,
      updated_at: now
    });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_HR_USER',
      entity: 'User',
      entityId: newId,
      after: { email: normalizedEmail, role: 'HR' },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: 'HR user created successfully',
      user: { id: newId, email: normalizedEmail, role: 'HR', is_active: 1 }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Admin only: deactivate / activate user
export async function toggleUserStatus(req: Request, res: Response): Promise<void> {
  try {
    const targetId = Number(req.params.id);
    const user = (await User.findOne({ id: targetId }).lean()) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.id === req.user!.id) {
      res.status(400).json({ error: 'You cannot deactivate your own account' });
      return;
    }

    const newStatus = user.is_active === 1 ? 0 : 1;
    const now = new Date().toISOString();

    await User.updateOne({ id: targetId }, { $set: { is_active: newStatus, updated_at: now } });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: newStatus === 1 ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      entity: 'User',
      entityId: targetId,
      before: { is_active: user.is_active },
      after: { is_active: newStatus },
      ipAddress: req.ip
    });

    res.json({
      message: `User ${newStatus === 1 ? 'activated' : 'deactivated'} successfully`,
      is_active: newStatus
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Admin only: reset any user's password with a temporary password
export async function resetUserPassword(req: Request, res: Response): Promise<void> {
  try {
    const targetId = Number(req.params.id);
    const { temporaryPassword } = req.body;

    if (!temporaryPassword || temporaryPassword.length < 6) {
      res.status(400).json({ error: 'Temporary password must be at least 6 characters' });
      return;
    }

    const user = (await User.findOne({ id: targetId }).lean()) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(temporaryPassword, salt);
    const now = new Date().toISOString();

    await User.updateOne(
      { id: targetId },
      { $set: { password_hash: passwordHash, must_change_password: 1, updated_at: now } }
    );

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'RESET_PASSWORD',
      entity: 'User',
      entityId: targetId,
      after: { must_change_password: 1 },
      ipAddress: req.ip
    });

    res.json({ message: 'Password reset successfully. User must change password on next login.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
