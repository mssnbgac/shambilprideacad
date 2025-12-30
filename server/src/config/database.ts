import mongoose from 'mongoose';
import { seedDatabase } from './seed';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shambil_academy');
    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
    
    // Seed database with demo data
    await seedDatabase();
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
    console.log('💡 Make sure MongoDB is running on localhost:27017 or update MONGODB_URI in .env file');
    console.log('💡 You can install MongoDB from: https://www.mongodb.com/try/download/community');
    // Don't exit in development to allow for easier debugging
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default connectDB;