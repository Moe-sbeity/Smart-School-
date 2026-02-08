import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from './models/UserModels.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/SchoolSystem';

async function checkData() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB\n');
  
  // Check counts
  const teachers = await UserModel.countDocuments({ role: 'teacher' });
  const students = await UserModel.countDocuments({ role: 'student' });
  const parents = await UserModel.countDocuments({ role: 'parent' });
  
  console.log('📊 User Counts:');
  console.log(`   Teachers: ${teachers}`);
  console.log(`   Students: ${students}`);
  console.log(`   Parents: ${parents}`);
  
  // Check a sample parent with children
  const sampleParent = await UserModel.findOne({ role: 'parent' }).populate('children', 'name classGrade classSection');
  console.log('\n👨‍👩‍👧 Sample Parent:');
  console.log(`   Name: ${sampleParent?.name}`);
  console.log(`   Email: ${sampleParent?.email}`);
  console.log(`   Children: ${sampleParent?.children?.map(c => `${c.name} (${c.classGrade}-${c.classSection})`).join(', ')}`);
  
  // Check a sample student with parent
  const sampleStudent = await UserModel.findOne({ role: 'student' }).populate('parent', 'name email');
  console.log('\n👨‍🎓 Sample Student:');
  console.log(`   Name: ${sampleStudent?.name}`);
  console.log(`   Email: ${sampleStudent?.email}`);
  console.log(`   Grade: ${sampleStudent?.classGrade}-${sampleStudent?.classSection}`);
  console.log(`   Parent: ${sampleStudent?.parent?.name} (${sampleStudent?.parent?.email})`);
  
  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

checkData().catch(console.error);
