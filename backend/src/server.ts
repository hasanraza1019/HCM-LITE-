import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './database/db.js';

import authRoutes from './routes/authRoutes.js';
import orgRoutes from './routes/orgRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import commsRoutes from './routes/commsRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root welcome route (helpful when visiting backend Vercel URL directly)
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'HCM Lite Backend API (MongoDB)',
    health: '/api/health'
  });
});

// Health check
app.get('/api/health', async (_req: Request, res: Response) => {
  let dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  let dbError: string | undefined;

  if (dbStatus !== 'connected' && process.env.MONGODB_URI) {
    try {
      await connectDB();
      dbStatus = 'connected';
    } catch (err: any) {
      dbError = err.message;
    }
  }

  res.json({
    status: 'ok',
    app: 'HCM Lite API',
    database: 'MongoDB',
    dbStatus,
    ...(dbError ? { dbError } : {}),
    version: '1.0.0',
    time: new Date().toISOString()
  });
});

// Ensure MongoDB connection before all API routes (essential for Vercel Serverless cold starts)
app.use('/api', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await connectDB();
    next();
  } catch (err: any) {
    console.error('MongoDB connection error:', err.message);
    res.status(500).json({
      error: err.message || 'Database connection failed. Check MONGODB_URI and MongoDB Atlas Network Access.'
    });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/comms', commsRoutes);
app.use('/api/expenses', expenseRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Not Found - ${req.method} ${req.originalUrl}` });
});

// Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start HTTP listener only when running locally / non-Vercel environment
if (!process.env.VERCEL) {
  connectDB().catch(err => {
    console.warn('⚠️ MongoDB initial connect warning:', err.message);
  });

  app.listen(PORT, () => {
    console.log(`🚀 HCM Lite Backend Server running on http://localhost:${PORT}`);
  });
}

export default app;
