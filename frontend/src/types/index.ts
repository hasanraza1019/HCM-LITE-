export type Role = 'Admin' | 'HR' | 'Employee';

export interface User {
  id: number;
  email: string;
  role: Role;
  employeeId?: number | null;
  mustChangePassword?: boolean;
}

export interface Employee {
  id: number;
  code: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  gender: string;
  joining_date: string;
  exit_date?: string | null;
  status: string;
  department_id: number;
  department_name?: string;
  designation_id: number;
  designation_name?: string;
  basic_salary: number;
  salary_structure?: {
    basic: number;
    hra: number;
    medical: number;
    gross: number;
  };
  user_id?: number;
  user_active?: number;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  date: string;
  check_in: string;
  check_out?: string | null;
  status: 'present' | 'late' | 'half_day' | 'absent' | 'missing_checkout' | 'on_leave';
  work_hours: number;
  source: string;
  latitude?: number | null;
  longitude?: number | null;
  distance_meters?: number | null;
  face_verified: number;
}

export interface LeaveType {
  id: number;
  name: string;
  quota: number;
  is_paid: number;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_code?: string;
  employee_name?: string;
  department_name?: string;
  leave_type_id: number;
  leave_type_name?: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  hr_comment?: string | null;
  reviewer_email?: string | null;
  created_at: string;
}

export interface PayrollRun {
  id: number;
  month: string;
  working_days: number;
  total_gross: number;
  total_tax: number;
  total_deductions: number;
  total_net: number;
  status: 'draft' | 'finalized';
  created_by_email?: string;
  finalized_by_email?: string;
  finalized_at?: string;
  payslip_count?: number;
  created_at: string;
}

export interface Payslip {
  id: number;
  payroll_run_id: number;
  employee_id: number;
  month?: string;
  run_status?: string;
  employee_code?: string;
  employee_name?: string;
  department_name?: string;
  designation_name?: string;
  basic_salary: number;
  hra: number;
  medical: number;
  gross_salary: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  unpaid_leave_days: number;
  half_days: number;
  late_penalty_days: number;
  deductions: number;
  annual_gross: number;
  annual_tax: number;
  income_tax: number;
  net_salary: number;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: 'normal' | 'high' | 'urgent';
  target_role: string;
  author_email?: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  link?: string | null;
  is_read: number;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_id?: number | null;
  actor_email?: string | null;
  actor_role?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  before_json?: string | null;
  after_json?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface CompanySettings {
  id: number;
  company_name: string;
  office_start_time: string;
  grace_time_minutes: number;
  half_day_hours: number;
  weekend_days: string[];
  office_latitude: number;
  office_longitude: number;
  office_radius_meters: number;
  late_penalty_enabled: number;
}

