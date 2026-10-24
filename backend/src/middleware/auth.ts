import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../database/models.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'hcm_lite_super_secret_jwt_key_2026';

export interface AuthUser {
  id: number;
  email: string;
  role: 'Admin' | 'HR' | 'Employee';
  employeeId?: number | null;
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;

    // Check if user is still active in MongoDB
    const user = (await User.findOne({ id: Number(payload.id) }).lean()) as any;
    if (!user || user.is_active === 0) {
      res.status(401).json({ error: 'User is inactive or not found' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee_id,
      mustChangePassword: Boolean(user.must_change_password)
    };

    // If user must change password, restrict access except for change-password and logout
    if (req.user.mustChangePassword && !req.path.includes('/change-password') && !req.path.includes('/logout')) {
      res.status(403).json({
        error: 'Password change required before accessing the system',
        mustChangePassword: true
      });
      return;
    }

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Access denied. Requires one of roles: ${roles.join(', ')}` });
      return;
    }

    next();
  };
}

export function requireEmployeeDataScope(getParamEmployeeId?: (req: Request) => number | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.user.role === 'Admin' || req.user.role === 'HR') {
      return next();
    }

    // Role is Employee: must match req.user.employeeId
    const targetEmpId = getParamEmployeeId
      ? getParamEmployeeId(req)
      : Number(req.params.employeeId || req.body.employee_id || req.query.employee_id);

    if (targetEmpId && targetEmpId !== req.user.employeeId) {
      res.status(403).json({ error: 'Forbidden: You cannot access or modify records of another employee' });
      return;
    }

    next();
  };
}
