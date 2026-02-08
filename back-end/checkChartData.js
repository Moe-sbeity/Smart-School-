import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const Schedule = mongoose.model('Schedule', new mongoose.Schema({
  student: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  subject: String, dayOfWeek: String, classGrade: String, classSection: String,
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startTime: String, endTime: String
}));

const User = mongoose.model('User', new mongoose.Schema({
  name: String, email: String, role: String, subjects: [String],
  classGrade: String, classSection: String
}));

const teacher = await User.findOne({ role: 'teacher' });
console.log('Teacher:', teacher.name);

// Raw schedule data
const rawSchedules = await Schedule.find({ teacher: teacher._id }).limit(2);
rawSchedules.forEach(s => {
  console.log(`\nSchedule: ${s.subject} ${s.dayOfWeek} ${s.classGrade}-${s.classSection}`);
  console.log('  student array length:', s.student.length);
  if (s.student.length > 0) {
    console.log('  first student ID:', s.student[0].toString());
  }
});

// Populated schedule data (same as API does)
const popSchedules = await Schedule.find({ teacher: teacher._id })
  .populate('student', 'name email classGrade classSection')
  .limit(2);
popSchedules.forEach(s => {
  console.log(`\nPopulated: ${s.subject} ${s.dayOfWeek}`);
  console.log('  student count:', s.student.length);
  if (s.student.length > 0) {
    console.log('  first student:', s.student[0].name, s.student[0].email, s.student[0].classGrade);
  }
});

// Total unique students across all schedules for this teacher
const allScheds = await Schedule.find({ teacher: teacher._id }).populate('student', 'name email classGrade classSection');
const uniqueStudents = new Set();
const gradeMap = {};
allScheds.forEach(s => {
  s.student.forEach(st => {
    uniqueStudents.add(st._id.toString());
    const g = st.classGrade || s.classGrade || 'unknown';
    if (!gradeMap[g]) gradeMap[g] = new Set();
    gradeMap[g].add(st._id.toString());
  });
});
console.log('\nTotal unique students:', uniqueStudents.size);
console.log('By grade:', Object.entries(gradeMap).map(([g, s]) => `${g}=${s.size}`).join(', '));

// Check attendance records count
const Attendance = mongoose.model('Attendance', new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subject: String, date: Date, status: String
}));

const attByStatus = await Attendance.aggregate([
  { $match: { teacher: teacher._id } },
  { $group: { _id: '$status', count: { $sum: 1 } } }
]);
console.log('\nAttendance by status:', attByStatus.map(a => `${a._id}=${a.count}`).join(', '));

await mongoose.disconnect();
