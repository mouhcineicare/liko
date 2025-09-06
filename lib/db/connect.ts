// lib/db/connect.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/therapy-app';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

// For development - enable transactions without replica set
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', false);
}

declare global {
  var mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
    cronStarted: boolean;
  };
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { 
    conn: null, 
    promise: null, 
    cronStarted: false 
  };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // For development - allow transactions without replica set
      ...(process.env.NODE_ENV === 'development' && {
        retryWrites: false
      })
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export async function withTransaction<T>(fn: (session: mongoose.ClientSession) => Promise<T>) {
  const conn = await connectDB();
  
  // For development - skip transactions if not supported
  if (process.env.NODE_ENV === 'development' && !conn.connection.transaction.isActive) {
    return fn(null as any);
  }

  const session = await conn.startSession();
  
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export default connectDB;