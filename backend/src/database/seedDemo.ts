import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from './db.js';
import {
  Settings,
  Department,
  Designation,
  LeaveType,
  Employee,
  User,
  Attendance,
  LeaveRequest,
  Announcement,
  getNextId,
  ensureCounterAtLeast
} from './models.js';

dotenv.config();

async function upsertDepartment(name: string, description: string): Promise<number> {
  const existing = (await Department.findOne({ name }).lean()) as any;
  if (existing) return existing.id;
  const id = await getNextId('departments');
  await Department.create({ id, name, description });
  return id;
}

async function upsertDesignation(name: string, department_id: number): Promise<number> {
  const existing = (await Designation.findOne({ name, department_id }).lean()) as any;
  if (existing) return existing.id;
  const id = await getNextId('designations');
  await Designation.create({ id, name, department_id });
  return id;
}

async function seed() {
  console.log('--- Seeding HCM Lite Demo Dataset into MongoDB (Saylani Hackathon) ---');
  await connectDB();

  const now = new Date().toISOString();
  const todayStr = now.substring(0, 10);

  // 1. Settings
  await Settings.findOneAndUpdate(
    { id: 1 },
    {
      $set: {
        id: 1,
        company_name: 'Saylani IT Training',
        office_start_time: '09:00',
        grace_time_minutes: 15,
        half_day_hours: 5.0,
        weekend_days: ['Saturday', 'Sunday'],
        office_latitude: 24.8607,
        office_longitude: 67.0011,
        office_radius_meters: 150.0,
        late_penalty_enabled: 1,
        updated_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  );

  // 2. Departments
  const deptEng = await upsertDepartment('Engineering', 'Software engineering and product development');
  const deptHR = await upsertDepartment('HR', 'Human resources and people operations');
  const deptSales = await upsertDepartment('Sales', 'Business development and client accounts');
  await upsertDepartment('Finance', 'Financial accounting and compliance');

  // 3. Designations
  const desigDev = await upsertDesignation('Senior Software Engineer', deptEng);
  await upsertDesignation('Frontend Developer', deptEng);
  const desigHR = await upsertDesignation('HR Specialist', deptHR);
  const desigSales = await upsertDesignation('Account Executive', deptSales);

  // 4. Users & Employees
  const salt = await bcrypt.genSalt(10);
  const adminPass = await bcrypt.hash('Admin@123', salt);
  const hrPass = await bcrypt.hash('Hr@123', salt);
  const empPass = await bcrypt.hash('Employee@123', salt);

  await User.findOneAndUpdate(
    { id: 1 },
    {
      $set: {
        id: 1,
        email: 'admin@saylaniit.com',
        password_hash: adminPass,
        role: 'Admin',
        employee_id: null,
        must_change_password: 0,
        is_active: 1,
        updated_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  );

  await User.findOneAndUpdate(
    { id: 2 },
    {
      $set: {
        id: 2,
        email: 'hr@saylaniit.com',
        password_hash: hrPass,
        role: 'HR',
        employee_id: null,
        must_change_password: 0,
        is_active: 1,
        updated_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  );

  // Employee 1: Ali Khan
  await Employee.findOneAndUpdate(
    { id: 1 },
    {
      $set: {
        id: 1,
        code: 'EMP-001',
        full_name: 'Ali Khan',
        email: 'ali.khan@saylaniit.com',
        phone: '0300-1112233',
        address: 'Gulshan-e-Iqbal, Karachi',
        gender: 'Male',
        joining_date: '2026-01-10',
        status: 'Active',
        department_id: deptEng,
        designation_id: desigDev,
        basic_salary: 80000,
        updated_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  );

  await User.findOneAndUpdate(
    { id: 3 },
    {
      $set: {
        id: 3,
        email: 'ali.khan@saylaniit.com',
        password_hash: empPass,
        role: 'Employee',
        employee_id: 1,
        must_change_password: 0,
        is_active: 1,
        updated_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  );

  // Employee 2: Sara Ahmed
  await Employee.findOneAndUpdate(
    { id: 2 },
    {
      $set: {
        id: 2,
        code: 'EMP-002',
        full_name: 'Sara Ahmed',
        email: 'sara.ahmed@saylaniit.com',
        phone: '0321-4445566',
        address: 'Clifton, Karachi',
        gender: 'Female',
        joining_date: '2026-02-01',
        status: 'Active',
        department_id: deptHR,
        designation_id: desigHR,
        basic_salary: 65000,
        updated_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  );

  await User.findOneAndUpdate(
    { id: 4 },
    {
      $set: {
        id: 4,
        email: 'sara.ahmed@saylaniit.com',
        password_hash: empPass,
        role: 'Employee',
        employee_id: 2,
        must_change_password: 0,
        is_active: 1,
        updated_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  );

  // Employee 3: Usman Tariq
  await Employee.findOneAndUpdate(
    { id: 3 },
    {
      $set: {
        id: 3,
        code: 'EMP-003',
        full_name: 'Usman Tariq',
        email: 'usman.tariq@saylaniit.com',
        phone: '0333-7778899',
        address: 'Nazimabad, Karachi',
        gender: 'Male',
        joining_date: '2026-03-15',
        status: 'Active',
        department_id: deptSales,
        designation_id: desigSales,
        basic_salary: 60000,
        updated_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  );

  await User.findOneAndUpdate(
    { id: 5 },
    {
      $set: {
        id: 5,
        email: 'usman.tariq@saylaniit.com',
        password_hash: empPass,
        role: 'Employee',
        employee_id: 3,
        must_change_password: 0,
        is_active: 1,
        updated_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  );

  await ensureCounterAtLeast('employees', 3);
  await ensureCounterAtLeast('users', 5);

  // 7. Today's Attendance Records
  const att1Existing = (await Attendance.findOne({ employee_id: 1, date: todayStr }).lean()) as any;
  const att1Id = att1Existing ? att1Existing.id : await getNextId('attendance');
  await Attendance.findOneAndUpdate(
    { employee_id: 1, date: todayStr },
    {
      $set: {
        id: att1Id,
        employee_id: 1,
        date: todayStr,
        check_in: '09:05:00',
        check_out: '17:30:00',
        status: 'present',
        work_hours: 8.4,
        source: 'camera',
        latitude: 24.8607,
        longitude: 67.0011,
        distance_meters: 25,
        face_verified: 1,
        updated_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  );

  const att2Existing = (await Attendance.findOne({ employee_id: 2, date: todayStr }).lean()) as any;
  const att2Id = att2Existing ? att2Existing.id : await getNextId('attendance');
  await Attendance.findOneAndUpdate(
    { employee_id: 2, date: todayStr },
    {
      $set: {
        id: att2Id,
        employee_id: 2,
        date: todayStr,
        check_in: '09:22:00',
        check_out: '17:15:00',
        status: 'late',
        work_hours: 7.8,
        source: 'web',
        updated_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  );

  // 8. Approved Casual Leave for Employee 3
  const casualLT = (await LeaveType.findOne({ name: 'Casual' }).lean()) as any;
  const casualLeaveTypeId = casualLT ? casualLT.id : 3;

  await LeaveRequest.findOneAndUpdate(
    { id: 1 },
    {
      $set: {
        id: 1,
        employee_id: 3,
        leave_type_id: casualLeaveTypeId,
        start_date: todayStr,
        end_date: todayStr,
        days_count: 1,
        reason: 'Sister wedding ceremony',
        status: 'approved',
        hr_comment: 'Approved. Enjoy the celebrations!',
        reviewed_by: 2,
        reviewed_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  );
  await ensureCounterAtLeast('leave_requests', 1);

  // 9. Announcement
  await Announcement.findOneAndUpdate(
    { id: 1 },
    {
      $set: {
        id: 1,
        title: 'Saylani Hackathon 2026 Kickoff',
        content:
          'Welcome to the Saylani Hackathon HCM Lite live demo at Zaitoon Ashraf IT Park. All systems operational on MongoDB Atlas.',
        priority: 'high',
        target_role: 'all',
        created_by: 1
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  );
  await ensureCounterAtLeast('announcements', 1);

  console.log('✅ Demo dataset seeded into MongoDB successfully!');
  console.log('---------------------------------------------------------');
  console.log('Demo Credentials for Judges:');
  console.log('1. Admin:    admin@saylaniit.com     /  Admin@123');
  console.log('2. HR:       hr@saylaniit.com        /  Hr@123');
  console.log('3. Employee: ali.khan@saylaniit.com  /  Employee@123');
  console.log('---------------------------------------------------------');

  await mongoose.disconnect();
}

seed().catch(async err => {
  console.error('Seed error:', err);
  await mongoose.disconnect();
  process.exit(1);
});
