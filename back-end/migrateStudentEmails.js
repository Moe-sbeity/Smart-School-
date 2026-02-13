import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from './models/UserModels.js';
import CounterModel from './models/counter.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/SchoolSystem';

async function migrateStudentEmails() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all students sorted by name
    const students = await UserModel.find({ role: 'student' }).sort('name');
    console.log(`📊 Found ${students.length} students\n`);

    // Reset counter to start from 10000001
    await CounterModel.findByIdAndUpdate(
      'studentId',
      { sequenceValue: 10000000 },
      { upsert: true }
    );

    for (const student of students) {
      const nextId = await CounterModel.getNextSequence('studentId');
      const newEmail = `${nextId}@student.com`;
      const oldEmail = student.email;

      student.email = newEmail;
      await student.save();
      console.log(`   ✓ ${student.name.padEnd(20)} ${oldEmail.padEnd(35)} → ${newEmail}`);
    }

    console.log(`\n✅ Migrated ${students.length} student emails to numeric format`);
    console.log(`   Next student ID will be: ${10000000 + students.length + 1}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrateStudentEmails();
