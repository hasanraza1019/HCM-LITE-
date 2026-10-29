import { Request, Response } from 'express';
import { ExpenseClaim, getNextId, Employee } from '../database/models.js';
import { logAudit } from '../utils/audit.js';

export async function submitExpense(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { title, category, amount, date, description, receipt_url } = req.body;

    if (!title || !category || !amount || !date) {
      return res.status(400).json({ error: 'Title, category, amount, and date are required.' });
    }

    let empName = user.email;
    if (user.employeeId) {
      const emp = await Employee.findOne({ id: user.employeeId });
      if (emp) empName = emp.full_name;
    }

    const nextId = await getNextId('expense_claim_id');
    const claim = await ExpenseClaim.create({
      id: nextId,
      employee_id: user.employeeId || 0,
      employee_name: empName,
      title,
      category,
      amount: Number(amount),
      date,
      description: description || '',
      receipt_url: receipt_url || null,
      status: 'pending',
      reviewer_comment: '',
      reviewed_by: null,
      created_at: new Date().toISOString()
    });

    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'SUBMIT_EXPENSE',
      entity: 'ExpenseClaim',
      entityId: claim.id,
      before: null,
      after: claim.toObject(),
      ipAddress: req.ip
    });

    res.status(201).json({ message: 'Expense claim submitted successfully', claim });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMyExpenses(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const claims = await ExpenseClaim.find({ employee_id: user.employeeId }).sort({ id: -1 });
    res.json({ claims });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAllExpenses(req: Request, res: Response) {
  try {
    const claims = await ExpenseClaim.find().sort({ id: -1 });
    res.json({ claims });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function reviewExpense(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { action, reviewer_comment } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    const claim = await ExpenseClaim.findOne({ id: Number(id) });
    if (!claim) {
      return res.status(404).json({ error: 'Expense claim not found' });
    }

    const before = claim.toObject();
    claim.status = action === 'approve' ? 'approved' : 'rejected';
    claim.reviewer_comment = reviewer_comment || '';
    claim.reviewed_by = user.email;
    await claim.save();

    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: `${action.toUpperCase()}_EXPENSE`,
      entity: 'ExpenseClaim',
      entityId: claim.id,
      before,
      after: claim.toObject(),
      ipAddress: req.ip
    });

    res.json({ message: `Expense claim ${claim.status} successfully`, claim });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
