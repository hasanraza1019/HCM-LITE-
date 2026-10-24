import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { LeaveType, Settings, User, getNextId, ensureCounterAtLeast } from './models.js';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  initialized: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.__mongooseCache || {
  conn: null,
  promise: null,
  initialized: false
};
globalThis.__mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn && mongoose.connection.readyState === 1) {
    if (!cached.initialized) {
      await initializeDefaultData();
      cached.initialized = true;
    }
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<db_password>')) {
    throw new Error(
      'MONGODB_URI is missing or still contains <db_password>. Please set your real MongoDB Atlas connection string in environment variables.'
    );
  }

  if (!cached.promise) {
    const hasDbName = /^mongodb(\+srv)?:\/\/[^/]+\/[^?]+/.test(uri);
    cached.promise = mongoose
      .connect(uri, {
        ...(hasDbName ? {} : { dbName: process.env.MONGODB_DB_NAME || 'hcm_lite' }),
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000
      })
      .then(m => {
        console.log('✅ Connected to MongoDB Atlas');
        return m;
      })
      .catch(err => {
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;

  if (!cached.initialized) {
    await initializeDefaultData();
    cached.initialized = true;
  }

  return cached.conn;
}

async function initializeDefaultData(): Promise<void> {
  // 1. Ensure default leave types exist if empty
  const count = await LeaveType.countDocuments();
  if (count === 0) {
    const defaults = [
      { id: 1, name: 'Annual', quota: 14, is_paid: 1 },
      { id: 2, name: 'Sick', quota: 8, is_paid: 1 },
      { id: 3, name: 'Casual', quota: 10, is_paid: 1 },
      { id: 4, name: 'Unpaid', quota: -1, is_paid: 0 }
    ];
    for (const lt of defaults) {
      await LeaveType.updateOne({ name: lt.name }, { $setOnInsert: lt }, { upsert: true });
    }
    await ensureCounterAtLeast('leave_types', 4);
  }

  // 2. Auto-seed Admin from environment if explicitly provided and no Admin exists yet
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (adminEmail && adminPassword) {
    const existingAdmin = await User.findOne({ role: 'Admin' }).lean();
    if (!existingAdmin) {
      console.log('Seeding initial Admin account from environment variables...');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(adminPassword, salt);
      const now = new Date().toISOString();

      const existingSettings = await Settings.findOne({ id: 1 }).lean();
      if (!existingSettings) {
        await Settings.create({
          id: 1,
          company_name: 'Saylani HCM Enterprise',
          office_start_time: '09:00',
          grace_time_minutes: 15,
          half_day_hours: 5.0,
          weekend_days: ['Saturday', 'Sunday'],
          office_latitude: 24.8607,
          office_longitude: 67.0011,
          office_radius_meters: 150.0,
          late_penalty_enabled: 1,
          created_at: now,
          updated_at: now
        });
      }

      const newUserId = await getNextId('users');
      await User.create({
        id: newUserId,
        email: adminEmail.toLowerCase(),
        password_hash: hash,
        role: 'Admin',
        employee_id: null,
        must_change_password: 0,
        is_active: 1,
        created_at: now,
        updated_at: now
      });

      console.log(`Initial Admin account created: ${adminEmail}`);
    }
  }
}
