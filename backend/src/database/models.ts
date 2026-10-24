import mongoose, { Schema, Model, InferSchemaType } from 'mongoose';

function getOrCreateModel<TSchema extends Schema>(
  name: string,
  schema: TSchema
): Model<InferSchemaType<TSchema>> {
  return (mongoose.models[name] as Model<InferSchemaType<TSchema>>) || mongoose.model(name, schema);
}

// Counter schema for sequential numeric IDs (preserves 100% frontend/API compatibility)
const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  },
  { versionKey: false, collection: 'counters' }
);

export const Counter = getOrCreateModel('Counter', counterSchema);

export async function getNextId(sequenceName: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

export async function ensureCounterAtLeast(sequenceName: string, minVal: number): Promise<void> {
  await Counter.findByIdAndUpdate(
    sequenceName,
    { $max: { seq: minVal } },
    { new: true, upsert: true }
  );
}

// 1. Settings
const settingsSchema = new Schema(
  {
    id: { type: Number, default: 1, unique: true },
    company_name: { type: String, required: true },
    office_start_time: { type: String, default: '09:00' },
    grace_time_minutes: { type: Number, default: 15 },
    half_day_hours: { type: Number, default: 5.0 },
    weekend_days: { type: [String], default: ['Saturday', 'Sunday'] },
    office_latitude: { type: Number, default: 24.8607 },
    office_longitude: { type: Number, default: 67.0011 },
    office_radius_meters: { type: Number, default: 150.0 },
    late_penalty_enabled: { type: Number, default: 1 },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true }
  },
  { versionKey: false, collection: 'settings' }
);
export const Settings = getOrCreateModel('Settings', settingsSchema);

// 2. Departments
const departmentSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' }
  },
  { versionKey: false, collection: 'departments' }
);
export const Department = getOrCreateModel('Department', departmentSchema);

// 3. Designations
const designationSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    department_id: { type: Number, required: true }
  },
  { versionKey: false, collection: 'designations' }
);
designationSchema.index({ name: 1, department_id: 1 }, { unique: true });
export const Designation = getOrCreateModel('Designation', designationSchema);

// 4. Leave Types
const leaveTypeSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    quota: { type: Number, required: true },
    is_paid: { type: Number, default: 1 }
  },
  { versionKey: false, collection: 'leave_types' }
);
export const LeaveType = getOrCreateModel('LeaveType', leaveTypeSchema);

// 5. Holidays
const holidaySchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    date: { type: String, required: true, unique: true }
  },
  { versionKey: false, collection: 'holidays' }
);
export const Holiday = getOrCreateModel('Holiday', holidaySchema);

// 6. Employees
const employeeSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    gender: { type: String, default: 'Other' },
    joining_date: { type: String, required: true },
    exit_date: { type: String, default: null },
    status: { type: String, default: 'Active' },
    department_id: { type: Number, required: true },
    designation_id: { type: Number, required: true },
    basic_salary: { type: Number, default: 0 },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true }
  },
  { versionKey: false, collection: 'employees' }
);
export const Employee = getOrCreateModel('Employee', employeeSchema);

// 7. Users
const userSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'HR', 'Employee'], required: true },
    employee_id: { type: Number, default: null },
    must_change_password: { type: Number, default: 0 },
    is_active: { type: Number, default: 1 },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true }
  },
  { versionKey: false, collection: 'users' }
);
export const User = getOrCreateModel('User', userSchema);

// 8. Attendance
const attendanceSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    employee_id: { type: Number, required: true },
    date: { type: String, required: true },
    check_in: { type: String, required: true },
    check_out: { type: String, default: null },
    status: { type: String, required: true },
    work_hours: { type: Number, default: 0 },
    source: { type: String, default: 'web' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    distance_meters: { type: Number, default: null },
    face_verified: { type: Number, default: 0 },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true }
  },
  { versionKey: false, collection: 'attendance' }
);
attendanceSchema.index({ employee_id: 1, date: 1 }, { unique: true });
export const Attendance = getOrCreateModel('Attendance', attendanceSchema);

// 9. Attendance Corrections
const attendanceCorrectionSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    employee_id: { type: Number, required: true },
    attendance_id: { type: Number, default: null },
    date: { type: String, required: true },
    requested_check_in: { type: String, required: true },
    requested_check_out: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, default: 'pending' },
    hr_comment: { type: String, default: null },
    reviewed_by: { type: Number, default: null },
    reviewed_at: { type: String, default: null },
    created_at: { type: String, required: true }
  },
  { versionKey: false, collection: 'attendance_corrections' }
);
export const AttendanceCorrection = getOrCreateModel('AttendanceCorrection', attendanceCorrectionSchema);

// 10. Leave Requests
const leaveRequestSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    employee_id: { type: Number, required: true },
    leave_type_id: { type: Number, required: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    days_count: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, default: 'pending' },
    hr_comment: { type: String, default: null },
    reviewed_by: { type: Number, default: null },
    reviewed_at: { type: String, default: null },
    created_at: { type: String, required: true }
  },
  { versionKey: false, collection: 'leave_requests' }
);
export const LeaveRequest = getOrCreateModel('LeaveRequest', leaveRequestSchema);

// 11. Payroll Runs
const payrollRunSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    month: { type: String, required: true, unique: true },
    working_days: { type: Number, required: true },
    total_gross: { type: Number, default: 0 },
    total_tax: { type: Number, default: 0 },
    total_deductions: { type: Number, default: 0 },
    total_net: { type: Number, default: 0 },
    status: { type: String, default: 'draft' },
    created_by: { type: Number, required: true },
    finalized_by: { type: Number, default: null },
    finalized_at: { type: String, default: null },
    created_at: { type: String, required: true }
  },
  { versionKey: false, collection: 'payroll_runs' }
);
export const PayrollRun = getOrCreateModel('PayrollRun', payrollRunSchema);

// 12. Payslips
const payslipSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    payroll_run_id: { type: Number, required: true },
    employee_id: { type: Number, required: true },
    basic_salary: { type: Number, required: true },
    hra: { type: Number, required: true },
    medical: { type: Number, required: true },
    gross_salary: { type: Number, required: true },
    working_days: { type: Number, required: true },
    present_days: { type: Number, required: true },
    absent_days: { type: Number, required: true },
    unpaid_leave_days: { type: Number, required: true },
    half_days: { type: Number, required: true },
    late_penalty_days: { type: Number, default: 0 },
    deductions: { type: Number, required: true },
    annual_gross: { type: Number, required: true },
    annual_tax: { type: Number, required: true },
    income_tax: { type: Number, required: true },
    net_salary: { type: Number, required: true },
    created_at: { type: String, required: true }
  },
  { versionKey: false, collection: 'payslips' }
);
payslipSchema.index({ payroll_run_id: 1, employee_id: 1 }, { unique: true });
export const Payslip = getOrCreateModel('Payslip', payslipSchema);

// 13. Announcements
const announcementSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    priority: { type: String, default: 'normal' },
    target_role: { type: String, default: 'all' },
    created_by: { type: Number, required: true },
    created_at: { type: String, required: true }
  },
  { versionKey: false, collection: 'announcements' }
);
export const Announcement = getOrCreateModel('Announcement', announcementSchema);

// 14. Notifications
const notificationSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    user_id: { type: Number, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: null },
    is_read: { type: Number, default: 0 },
    created_at: { type: String, required: true }
  },
  { versionKey: false, collection: 'notifications' }
);
export const Notification = getOrCreateModel('Notification', notificationSchema);

// 15. Audit Logs
const auditLogSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    actor_id: { type: Number, default: null },
    actor_email: { type: String, default: null },
    actor_role: { type: String, default: null },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entity_id: { type: String, default: null },
    before_json: { type: String, default: null },
    after_json: { type: String, default: null },
    ip_address: { type: String, default: null },
    created_at: { type: String, required: true }
  },
  { versionKey: false, collection: 'audit_logs' }
);
export const AuditLog = getOrCreateModel('AuditLog', auditLogSchema);

// 16. AI Logs
const aiLogSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    user_id: { type: Number, default: null },
    role: { type: String, default: null },
    prompt: { type: String, required: true },
    tool_called: { type: String, default: null },
    response: { type: String, required: true },
    latency_ms: { type: Number, default: 0 },
    created_at: { type: String, required: true }
  },
  { versionKey: false, collection: 'ai_logs' }
);
export const AiLog = getOrCreateModel('AiLog', aiLogSchema);

