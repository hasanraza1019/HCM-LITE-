import { Request, Response } from 'express';
import {
  LeaveType,
  LeaveRequest,
  Employee,
  Department,
  User,
  getNextId
} from '../database/models.js';
import { calculateWorkingDays } from '../utils/dateUtils.js';
import { logAudit } from '../utils/audit.js';
import { createNotification } from '../utils/notifications.js';

export async function getLeaveBalances(req: Request, res: Response): Promise<void> {
  try {
    const employeeId =
      req.user!.role === 'Employee'
        ? req.user!.employeeId
        : Number(req.params.employeeId || req.user!.employeeId);

    if (!employeeId) {
      res.status(400).json({ error: 'Employee ID is required' });
      return;
    }

    const [leaveTypes, approvedLeaves] = await Promise.all([
      LeaveType.find().sort({ id: 1 }).lean() as Promise<any[]>,
      LeaveRequest.find({ employee_id: employeeId, status: 'approved' }).lean() as Promise<any[]>
    ]);

    const balances = leaveTypes.map(lt => {
      const used = approvedLeaves
        .filter(lr => lr.leave_type_id === lt.id)
        .reduce((sum, lr) => sum + (Number(lr.days_count) || 0), 0);
      const quota = lt.quota;
      const remaining = quota === -1 ? 'Unlimited' : Math.max(0, quota - used);

      return {
        id: lt.id,
        name: lt.name,
        quota,
        used,
        remaining,
        is_paid: lt.is_paid
      };
    });

    res.json({ balances });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function applyLeave(req: Request, res: Response): Promise<void> {
  try {
    const employeeId = req.user!.employeeId;
    if (!employeeId) {
      res.status(400).json({ error: 'User has no employee profile' });
      return;
    }

    const { leave_type_id, start_date, end_date, reason } = req.body;
    if (!leave_type_id || !start_date || !end_date || !reason) {
      res.status(400).json({ error: 'Leave type, start date, end date, and reason are required' });
      return;
    }

    if (start_date > end_date) {
      res.status(400).json({ error: 'Start date cannot be after end date' });
      return;
    }

    const leaveType = (await LeaveType.findOne({ id: Number(leave_type_id) }).lean()) as any;
    if (!leaveType) {
      res.status(404).json({ error: 'Leave type not found' });
      return;
    }

    // 1. Calculate working days (skipping weekends and public holidays)
    const { workingDays } = await calculateWorkingDays(start_date, end_date);
    if (workingDays === 0) {
      res.status(400).json({
        error: 'The selected date range contains no working days (all weekends or public holidays)'
      });
      return;
    }

    // 2. Check for overlapping requests (pending or approved) -> 422
    const overlapping = (await LeaveRequest.findOne({
      employee_id: employeeId,
      status: { $in: ['pending', 'approved'] },
      start_date: { $lte: end_date },
      end_date: { $gte: start_date }
    }).lean()) as any;

    if (overlapping) {
      res.status(422).json({
        error: `Leave dates overlap with an existing ${overlapping.status} leave request (${overlapping.start_date} to ${overlapping.end_date})`
      });
      return;
    }

    // 3. Over-balance check for quota leave types -> 422
    if (leaveType.quota !== -1) {
      const approvedLeaves = (await LeaveRequest.find({
        employee_id: employeeId,
        leave_type_id: Number(leave_type_id),
        status: 'approved'
      }).lean()) as any[];

      const used = approvedLeaves.reduce((sum, lr) => sum + (Number(lr.days_count) || 0), 0);
      const remaining = Math.max(0, leaveType.quota - used);

      if (workingDays > remaining) {
        res.status(422).json({
          error: `Insufficient leave balance: You requested ${workingDays} working day(s), but only have ${remaining} day(s) remaining for ${leaveType.name} leave.`
        });
        return;
      }
    }

    const now = new Date().toISOString();
    const leaveId = await getNextId('leave_requests');

    await LeaveRequest.create({
      id: leaveId,
      employee_id: employeeId,
      leave_type_id: Number(leave_type_id),
      start_date,
      end_date,
      days_count: workingDays,
      reason: reason.trim(),
      status: 'pending',
      created_at: now
    });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'APPLY_LEAVE',
      entity: 'LeaveRequest',
      entityId: leaveId,
      after: { leave_type_id: Number(leave_type_id), start_date, end_date, workingDays, reason: reason.trim() },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: 'Leave application submitted successfully',
      leave: {
        id: leaveId,
        leave_type_name: leaveType.name,
        start_date,
        end_date,
        days_count: workingDays,
        status: 'pending'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function cancelLeave(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const employeeId = req.user!.employeeId;

    const leave = (await LeaveRequest.findOne({ id }).lean()) as any;
    if (!leave) {
      res.status(404).json({ error: 'Leave request not found' });
      return;
    }

    if (leave.employee_id !== employeeId && req.user!.role !== 'Admin') {
      res.status(403).json({ error: 'You can only cancel your own leave request' });
      return;
    }

    if (leave.status !== 'pending') {
      res.status(400).json({ error: `Cannot cancel a leave request that is already ${leave.status}` });
      return;
    }

    await LeaveRequest.updateOne({ id }, { $set: { status: 'cancelled' } });

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CANCEL_LEAVE',
      entity: 'LeaveRequest',
      entityId: id,
      ipAddress: req.ip
    });

    res.json({ message: 'Leave request cancelled successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function listLeaveRequests(req: Request, res: Response): Promise<void> {
  try {
    const { status, employee_id, department_id } = req.query;

    const filter: any = {};
    if (req.user!.role === 'Employee') {
      filter.employee_id = req.user!.employeeId;
    } else if (employee_id) {
      filter.employee_id = Number(employee_id);
    }

    if (department_id) {
      const deptEmps = (await Employee.find(
        { department_id: Number(department_id) },
        { id: 1 }
      ).lean()) as any[];
      const deptEmpIds = deptEmps.map(e => e.id);
      if (filter.employee_id) {
        if (!deptEmpIds.includes(filter.employee_id)) {
          res.json({ leaves: [] });
          return;
        }
      } else {
        filter.employee_id = { $in: deptEmpIds };
      }
    }

    if (status) {
      filter.status = status;
    }

    const [rawLeaves, leaveTypes, employees, departments, users] = await Promise.all([
      LeaveRequest.find(filter).sort({ id: -1 }).lean() as Promise<any[]>,
      LeaveType.find().lean() as Promise<any[]>,
      Employee.find().lean() as Promise<any[]>,
      Department.find().lean() as Promise<any[]>,
      User.find({}, { id: 1, email: 1 }).lean() as Promise<any[]>
    ]);

    const ltMap = new Map(leaveTypes.map(lt => [lt.id, lt]));
    const empMap = new Map(employees.map(e => [e.id, e]));
    const deptMap = new Map(departments.map(d => [d.id, d.name]));
    const userMap = new Map(users.map(u => [u.id, u.email]));

    const leaves = rawLeaves.map(lr => {
      const lt = ltMap.get(lr.leave_type_id);
      const emp = empMap.get(lr.employee_id);
      return {
        ...lr,
        leave_type_name: lt?.name || 'Leave',
        is_paid: lt?.is_paid ?? 1,
        employee_code: emp?.code || null,
        employee_name: emp?.full_name || null,
        department_name: emp ? deptMap.get(emp.department_id) || null : null,
        reviewer_email: lr.reviewed_by ? userMap.get(lr.reviewed_by) || null : null
      };
    });

    res.json({ leaves });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function reviewLeave(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { action, hr_comment } = req.body;

    if (action !== 'approve' && action !== 'reject') {
      res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
      return;
    }

    const leave = (await LeaveRequest.findOne({ id }).lean()) as any;
    if (!leave) {
      res.status(404).json({ error: 'Leave request not found' });
      return;
    }

    if (leave.status !== 'pending') {
      res.status(400).json({ error: `Leave request is already ${leave.status}` });
      return;
    }

    const [lt, empUser] = await Promise.all([
      LeaveType.findOne({ id: leave.leave_type_id }).lean() as Promise<any>,
      User.findOne({ employee_id: leave.employee_id }).lean() as Promise<any>
    ]);

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const now = new Date().toISOString();

    await LeaveRequest.updateOne(
      { id },
      {
        $set: {
          status: newStatus,
          hr_comment: hr_comment || null,
          reviewed_by: req.user!.id,
          reviewed_at: now
        }
      }
    );

    if (empUser) {
      await createNotification(
        empUser.id,
        `Leave Request ${newStatus.toUpperCase()}`,
        `Your ${lt?.name || 'Leave'} leave from ${leave.start_date} to ${leave.end_date} has been ${newStatus}. ${
          hr_comment ? `Comment: ${hr_comment}` : ''
        }`,
        '/leave/my'
      );
    }

    await logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: action === 'approve' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE',
      entity: 'LeaveRequest',
      entityId: id,
      after: { status: newStatus, hr_comment },
      ipAddress: req.ip
    });

    res.json({ message: `Leave request ${newStatus} successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
