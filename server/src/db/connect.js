import mongoose from 'mongoose';
import { env } from '../config/env.js';

export async function connectDatabase() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: true,
  });

  console.log('MongoDB connected');
}