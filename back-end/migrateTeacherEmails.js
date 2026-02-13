import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from './models/UserModels.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/SchoolSystem';

// Map teachers to t.lastname@teacher.com format
const TEACHER_EMAIL_MAP = {
  'ahmed.mansour@teacher.com': 't.mansour@teacher.com',
  'heba.youssef@teacher.com': 't.youssef@teacher.com',
  'tarek.ismail@teacher.com': 't.ismail@teacher.com',
  'mona.abdelrahman@teacher.com': 't.abdelrahman@teacher.com',
  'sarah.williams@teacher.com': 't.williams@teacher.com',
  'mahmoud.fahmy@teacher.com': 't.fahmy@teacher.com',
  'karim.helal@teacher.com': 't.helal@teacher.com',
  't.abdullah.abbas@teacher.com': 't.abbas@teacher.com',
};

async function migrateTeacherEmails() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const teachers = await UserModel.find({ role: 'teacher' });
    console.log(`📊 Found ${teachers.length} teachers\n`);

    let updated = 0;

    for (const teacher of teachers) {
      const newEmail = TEACHER_EMAIL_MAP[teacher.email];
      if (newEmail) {
        const oldEmail = teacher.email;
        teacher.email = newEmail;
        await teacher.save();
        console.log(`   ✓ ${teacher.name.padEnd(25)} ${oldEmail.padEnd(40)} → ${newEmail}`);
        updated++;
      } else {
        console.log(`   ○ ${teacher.name.padEnd(25)} ${teacher.email} (no mapping)`);
      }
    }

    console.log(`\n✅ Updated ${updated} teacher emails`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrateTeacherEmails();
