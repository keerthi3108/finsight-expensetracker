import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

function getMongoUri() {
  let uri = process.env.MONGODB_URI;
  if (!uri || !String(uri).trim()) {
    throw new Error("Missing MONGODB_URI environment variable");
  }
  uri = String(uri).trim().replace(/^["']|["']$/g, "");
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }
  return uri;
}

/** Reuse connection across Vercel serverless invocations. */
export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = getMongoUri();
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 20000,
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
