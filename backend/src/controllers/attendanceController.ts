import { Request, Response } from 'express';
import {
  Attendance,
  AttendanceCorrection,
  Settings,
  Employee,
  Department,
  Designation,
  LeaveRequest,
  LeaveType,
  User,
  getNextId
} from '../database/models.js';
import { calculateHaversineDistance } from '../utils/haversine.js';
import { logAudit } from '../utils/audit.js';
import { createNotification } from '../utils/notifications.js';
import { isWorkingDay, getWeekendDays, getHolidays } from '../utils/dateUtils.js';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripMongoFields<T extends Record<string, any>>(doc: T): Omit<T, '_id' | '__v'> {
  const { _id, __v, ...rest } = doc;
  return rest;
}

export async function checkIn(req: Request, res: Response): Promise<void> {
  try {
    const employeeId = req.user!.employeeId;
    if (!employeeId) {
      res.status(400).json({ error: 'Current user has no associated employee profile' });
      return;
    }

    // Server stamps date and time
    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10); // 'YYYY-MM-DD'
    const currentTimeStr = now.toTimeString().substring(0, 8); // 'HH:mm:ss'
    const currentISO = now.toISOString();

    // Check if employee already checked in today -> 409 Conflict
    const existing = await Attendance.findOne({ employee_id: employeeId, date: todayStr }).lean();
    if (existing) {
      res.status(409).json({
        error: 'Already checked in today',
        record: {
          id: existing.id,
          check_in: existing.check_in,
          check_out: existing.check_out,
          status: existing.status
        }
      });
      return;
    }

    // Fetch settings for office start time, grace time, location
    const settings = await Settings.findOne({ id: 1 }).lean();
    const officeStartTime = settings?.office_start_time || '09:00';
    const graceMinutes = settings?.grace_time_minutes ?? 15;

    // Determine status (present vs late)
    const [startHour, startMin] = officeStartTime.split(':').map(Number);
    const cutoffMinutes = startHour * 60 + startMin + graceMinutes;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const isLate = currentMinutes > cutoffMinutes;
    const initialStatus = isLate ? 'late' : 'present';

    // Camera + Location verification (if supplied)
    const { source = 'web', face_detected, latitude, longitude, accuracy } = req.body;
    let distanceMeters: number | null = null;
    let faceVerified = 0;

    if (source === 'camera') {
      if (!face_detected) {
        res.status(400).json({ error: 'Check-in rejected: Exactly one face must be detected in camera preview' });
        return;
      }
      faceVerified = 1;

      if (latitude === undefined || longitude === undefined) {
        res.status(400).json({ error: 'Check-in rejected: GPS location is required for camera check-in' });
        return;
      }

      if (accuracy !== undefined && accuracy > 100) {
        res.status(400).json({ error: `Check-in rejected: GPS accuracy is too low (${Math.round(accuracy)}m > 100m)` });
        return;
      }

      const officeLat = settings?.office_latitude || 24.8607;
      const officeLon = settings?.office_longitude || 67.0011;
      const allowedRadius = settings?.office_radius_meters || 150.0;

      distanceMeters = calculateHaversineDistance(latitude, longitude, officeLat, officeLon);

      if (distanceMeters > allowedRadius) {
        res.status(400).json({
          error: `Check-in rejected: You are outside the office perimeter (${Math.round(distanceMeters)}m from office, allowed radius is ${allowedRadius}m)`
        });
        return;
      }
    }

    const recordId = await getNextId('attendance');
    const roundedDist = distanceMeters !== null ? Math.round(distanceMeters) : null;

    await Attendance.create({
      id: recordId,
      employee_id: employeeId,
      date: todayStr,
      check_in: currentTimeStr,
      check_out: null,
      status: initialStatus,
      work_hours: 0,
      source,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      distance_meters: roundedDist,
      face_verified: faceVerified,
      created_at: currentISO,
      updated_at: currentISO
    });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CHECK_IN',
      entity: 'Attendance',
      entityId: recordId,
      after: { date: todayStr, check_in: currentTimeStr, status: initialStatus, source },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: `Check-in recorded successfully (${initialStatus === 'late' ? 'Late' : 'On Time'})`,
      record: {
        id: recordId,
        employee_id: employeeId,
        date: todayStr,
        check_in: currentTimeStr,
        status: initialStatus,
        source,
        distance_meters: roundedDist
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function checkOut(req: Request, res: Response): Promise<void> {
  try {
    const employeeId = req.user!.employeeId;
    if (!employeeId) {
      res.status(400).json({ error: 'Current user has no associated employee profile' });
      return;
    }

    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);
    const currentTimeStr = now.toTimeString().substring(0, 8);
    const currentISO = now.toISOString();

    const record = await Attendance.findOne({ employee_id: employeeId, date: todayStr }).lean();
    if (!record) {
      res.status(400).json({ error: 'No check-in record found for today. Please check in first.' });
      return;
    }

    if (record.check_out) {
      res.status(400).json({ error: 'You have already checked out today', record: stripMongoFields(record) });
      return;
    }

    // Calculate worked hours
    const checkInDate = new Date(`${todayStr}T${record.check_in}`);
    const checkOutDate = new Date(`${todayStr}T${currentTimeStr}`);
    const diffMs = checkOutDate.getTime() - checkInDate.getTime();
    const workHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);

    const settings = await Settings.findOne({ id: 1 }).lean();
    const halfDayThreshold = settings?.half_day_hours ?? 5.0;

    let finalStatus = record.status;
    if (workHours < halfDayThreshold) {
      finalStatus = 'half_day';
    }

    await Attendance.updateOne(
      { id: record.id },
      {
        $set: {
          check_out: currentTimeStr,
          work_hours: workHours,
          status: finalStatus,
          updated_at: currentISO
        }
      }
    );

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CHECK_OUT',
      entity: 'Attendance',
      entityId: record.id,
      before: { check_out: null, status: record.status },
      after: { check_out: currentTimeStr, work_hours: workHours, status: finalStatus },
      ipAddress: req.ip
    });

    res.json({
      message: 'Check-out recorded successfully',
      record: {
        id: record.id,
        check_in: record.check_in,
        check_out: currentTimeStr,
        work_hours: workHours,
        status: finalStatus
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getTodayAttendanceStatus(req: Request, res: Response): Promise<void> {
  try {
    const employeeId = req.user!.employeeId;
    if (!employeeId) {
      res.json({ record: null });
      return;
    }

    const todayStr = new Date().toISOString().substring(0, 10);
    const record = await Attendance.findOne({ employee_id: employeeId, date: todayStr }).lean();
    res.json({ record: record ? stripMongoFields(record) : null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Daily Attendance Board for HR/Admin
export async function getDailyAttendanceBoard(req: Request, res: Response): Promise<void> {
  try {
    const { date, department_id } = req.query;
    const targetDate = (date as string) || new Date().toISOString().substring(0, 10);

    const [weekendDays, holidays] = await Promise.all([getWeekendDays(), getHolidays()]);
    const isWorkDay = isWorkingDay(targetDate, weekendDays, holidays);

    const empFilter: Record<string, any> = { status: 'Active' };
    if (department_id) {
      empFilter.department_id = Number(department_id);
    }

    const [employees, departments, designations, attendanceRecords, approvedLeaves, leaveTypes] = await Promise.all([
      Employee.find(empFilter).sort({ id: 1 }).lean(),
      Department.find().lean(),
      Designation.find().lean(),
      Attendance.find({ date: targetDate }).lean(),
      LeaveRequest.find({
        status: 'approved',
        start_date: { $lte: targetDate },
        end_date: { $gte: targetDate }
      }).lean(),
      LeaveType.find().lean()
    ]);

    const deptMap = new Map<number, string>(departments.map(d => [d.id, d.name]));
    const desigMap = new Map<number, string>(designations.map(d => [d.id, d.name]));
    const ltMap = new Map<number, string>(leaveTypes.map(lt => [lt.id, lt.name]));

    const attMap = new Map<number, any>();
    attendanceRecords.forEach(a => attMap.set(a.employee_id, a));

    const leaveMap = new Map<number, any>();
    approvedLeaves.forEach(l =>
      leaveMap.set(l.employee_id, {
        ...l,
        leave_type_name: ltMap.get(l.leave_type_id) || 'Leave'
      })
    );

    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let onLeaveCount = 0;
    let absentCount = 0;
    let missingCheckoutCount = 0;
    const today = new Date().toISOString().substring(0, 10);

    const board = employees.map(emp => {
      const att = attMap.get(emp.id);
      const leave = leaveMap.get(emp.id);

      let status = 'absent';
      let checkIn = null;
      let checkOut = null;
      let workHours = 0;
      let source = null;

      if (leave) {
        status = 'on_leave';
        onLeaveCount++;
      } else if (att) {
        checkIn = att.check_in;
        checkOut = att.check_out;
        workHours = att.work_hours;
        source = att.source;
        status = att.status;

        if (!att.check_out && att.status !== 'half_day') {
          if (targetDate < today) {
            status = 'missing_checkout';
            missingCheckoutCount++;
          }
        }

        if (status === 'present') presentCount++;
        else if (status === 'late') lateCount++;
        else if (status === 'half_day') halfDayCount++;
      } else {
        if (isWorkDay) {
          status = 'absent';
          absentCount++;
        } else {
          status = 'holiday_weekend';
        }
      }

      return {
        employee_id: emp.id,
        code: emp.code,
        full_name: emp.full_name,
        department: deptMap.get(emp.department_id) || null,
        designation: desigMap.get(emp.designation_id) || null,
        date: targetDate,
        check_in: checkIn,
        check_out: checkOut,
        work_hours: workHours,
        status,
        source,
        leave_info: leave ? { type: leave.leave_type_name, reason: leave.reason } : null
      };
    });

    res.json({
      date: targetDate,
      isWorkingDay: isWorkDay,
      summary: {
        totalEmployees: employees.length,
        present: presentCount,
        late: lateCount,
        halfDay: halfDayCount,
        onLeave: onLeaveCount,
        absent: absentCount,
        missingCheckout: missingCheckoutCount
      },
      board
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Employee Attendance History
export async function getEmployeeAttendance(req: Request, res: Response): Promise<void> {
  try {
    const { employeeId } = req.params;
    const empId = Number(employeeId);
    const { month } = req.query; // YYYY-MM

    const monthPrefix = (month as string) || new Date().toISOString().substring(0, 7);

    const records = await Attendance.find({
      employee_id: empId,
      date: { $regex: `^${escapeRegex(monthPrefix)}` }
    })
      .sort({ date: -1 })
      .lean();

    res.json({ records: records.map(stripMongoFields), month: monthPrefix });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Attendance Corrections
export async function requestCorrection(req: Request, res: Response): Promise<void> {
  try {
    const employeeId = req.user!.employeeId;
    if (!employeeId) {
      res.status(400).json({ error: 'User has no employee profile' });
      return;
    }

    const { date, requested_check_in, requested_check_out, reason } = req.body;
    if (!date || !requested_check_in || !requested_check_out || !reason) {
      res.status(400).json({ error: 'Date, requested check-in, check-out, and reason are required' });
      return;
    }

    const existingAtt = await Attendance.findOne({ employee_id: employeeId, date }).lean();
    const correctionId = await getNextId('attendance_corrections');

    await AttendanceCorrection.create({
      id: correctionId,
      employee_id: employeeId,
      attendance_id: existingAtt ? existingAtt.id : null,
      date,
      requested_check_in,
      requested_check_out,
      reason,
      status: 'pending',
      hr_comment: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date().toISOString()
    });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'REQUEST_ATTENDANCE_CORRECTION',
      entity: 'AttendanceCorrection',
      entityId: correctionId,
      after: { date, requested_check_in, requested_check_out, reason },
      ipAddress: req.ip
    });

    res.status(201).json({ message: 'Attendance correction request submitted for review', id: correctionId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function listCorrections(req: Request, res: Response): Promise<void> {
  try {
    const { status } = req.query;
    const filter: Record<string, any> = {};

    if (req.user!.role === 'Employee') {
      filter.employee_id = req.user!.employeeId ?? -1;
    }

    if (status) {
      filter.status = String(status);
    }

    const [rawCorrections, employees, departments, users] = await Promise.all([
      AttendanceCorrection.find(filter).sort({ id: -1 }).lean(),
      Employee.find().lean(),
      Department.find().lean(),
      User.find().lean()
    ]);

    const empMap = new Map<number, any>(employees.map(e => [e.id, e]));
    const deptMap = new Map<number, string>(departments.map(d => [d.id, d.name]));
    const userMap = new Map<number, string>(users.map(u => [u.id, u.email]));

    const corrections = rawCorrections.map(ac => {
      const emp = empMap.get(ac.employee_id);
      return {
        ...stripMongoFields(ac),
        employee_code: emp?.code || 'N/A',
        employee_name: emp?.full_name || 'Unknown',
        department_name: emp ? deptMap.get(emp.department_id) || null : null,
        reviewer_email: ac.reviewed_by ? userMap.get(ac.reviewed_by) || null : null
      };
    });

    res.json({ corrections });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function reviewCorrection(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const corrId = Number(id);
    const { action, hr_comment } = req.body; // action: 'approve' | 'reject'

    if (action !== 'approve' && action !== 'reject') {
      res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
      return;
    }

    const correction = await AttendanceCorrection.findOne({ id: corrId }).lean();
    if (!correction) {
      res.status(404).json({ error: 'Correction request not found' });
      return;
    }

    if (correction.status !== 'pending') {
      res.status(400).json({ error: `Request already ${correction.status}` });
      return;
    }

    const empUser = await User.findOne({ employee_id: correction.employee_id }).lean();

    const now = new Date().toISOString();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await AttendanceCorrection.updateOne(
      { id: corrId },
      {
        $set: {
          status: newStatus,
          hr_comment: hr_comment || null,
          reviewed_by: req.user!.id,
          reviewed_at: now
        }
      }
    );

    if (action === 'approve') {
      // Calculate work hours
      const checkInDate = new Date(`${correction.date}T${correction.requested_check_in}`);
      const checkOutDate = new Date(`${correction.date}T${correction.requested_check_out}`);
      const diffMs = checkOutDate.getTime() - checkInDate.getTime();
      const workHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);

      const settings = await Settings.findOne({ id: 1 }).lean();
      const officeStartTime = settings?.office_start_time || '09:00';
      const graceMinutes = settings?.grace_time_minutes ?? 15;
      const halfDayHours = settings?.half_day_hours ?? 5.0;

      const [startHour, startMin] = officeStartTime.split(':').map(Number);
      const cutoffMinutes = startHour * 60 + startMin + graceMinutes;
      const [reqHour, reqMin] = correction.requested_check_in.split(':').map(Number);
      const reqMinutes = reqHour * 60 + reqMin;

      let attStatus = reqMinutes > cutoffMinutes ? 'late' : 'present';
      if (workHours < halfDayHours) {
        attStatus = 'half_day';
      }

      // Upsert attendance record
      const existing = await Attendance.findOne({
        employee_id: correction.employee_id,
        date: correction.date
      }).lean();

      if (existing) {
        await Attendance.updateOne(
          { id: existing.id },
          {
            $set: {
              check_in: correction.requested_check_in,
              check_out: correction.requested_check_out,
              work_hours: workHours,
              status: attStatus,
              updated_at: now
            }
          }
        );
      } else {
        const newAttId = await getNextId('attendance');
        await Attendance.create({
          id: newAttId,
          employee_id: correction.employee_id,
          date: correction.date,
          check_in: correction.requested_check_in,
          check_out: correction.requested_check_out,
          work_hours: workHours,
          status: attStatus,
          source: 'correction',
          latitude: null,
          longitude: null,
          distance_meters: null,
          face_verified: 0,
          created_at: now,
          updated_at: now
        });
      }
    }

    // In-app notification for the employee
    if (empUser) {
      await createNotification(
        empUser.id,
        `Attendance Correction ${newStatus.toUpperCase()}`,
        `Your attendance correction for ${correction.date} was ${newStatus}. ${hr_comment ? `Comment: ${hr_comment}` : ''}`,
        '/attendance/my'
      );
    }

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: action === 'approve' ? 'APPROVE_ATTENDANCE_CORRECTION' : 'REJECT_ATTENDANCE_CORRECTION',
      entity: 'AttendanceCorrection',
      entityId: corrId,
      after: { status: newStatus, hr_comment },
      ipAddress: req.ip
    });

    res.json({ message: `Correction request ${newStatus} successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
