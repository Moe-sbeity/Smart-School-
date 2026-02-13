import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const Announcement = mongoose.model('Announcement', new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subject: String, type: String, title: String, description: String,
  dueDate: Date, totalPoints: Number, status: String, priority: String,
  targetStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  targetGrades: [String], targetSections: [String],
  questions: [mongoose.Schema.Types.Mixed]
}, { timestamps: true }));

const Submission = mongoose.model('Submission', new mongoose.Schema({
  announcement: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement' },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  grade: Number, status: String, isLate: Boolean
}, { timestamps: true }));

const User = mongoose.model('User', new mongoose.Schema({
  name: String, email: String, role: String, subjects: [String],
  classGrade: String, classSection: String
}));

// Find the teacher
const teacher = await User.findOne({ role: 'teacher', name: /Ahmed/i });
console.log('Teacher:', teacher?.name, teacher?._id);

// Get all announcements by this teacher
const announcements = await Announcement.find({ teacher: teacher._id, status: 'published' }).sort({ dueDate: 1 });
console.log(`\n=== Total announcements: ${announcements.length} ===\n`);

// Break down by type
const byType = {};
announcements.forEach(a => {
  const key = a.type;
  if (!byType[key]) byType[key] = [];
  byType[key].push(a);
});

Object.entries(byType).forEach(([type, items]) => {
  console.log(`--- ${type.toUpperCase()} (${items.length}) ---`);
  items.forEach(a => {
    console.log(`  "${a.title}" | pts:${a.totalPoints} | grades:${a.targetGrades?.join(',')||'none'} | students:${a.targetStudents?.length} | due:${a.dueDate?.toISOString()?.slice(0,10)||'N/A'}`);
  });
});

// Check submissions
const announcementIds = announcements.map(a => a._id);
const submissions = await Submission.find({ announcement: { $in: announcementIds } });
console.log(`\n=== Total submissions: ${submissions.length} ===`);

const gradedSubs = submissions.filter(s => s.status === 'graded');
console.log(`Graded: ${gradedSubs.length}`);

// Check by announcement
for (const a of announcements.filter(a => a.type === 'quiz' || a.type === 'assignment')) {
  const subs = submissions.filter(s => s.announcement.toString() === a._id.toString());
  const graded = subs.filter(s => s.status === 'graded');
  const avgGrade = graded.length > 0 
    ? (graded.reduce((sum, s) => sum + (s.grade || 0), 0) / graded.length).toFixed(1)
    : 'N/A';
  console.log(`  "${a.title}" (${a.type}, ${a.totalPoints}pts): ${subs.length} subs, ${graded.length} graded, avg=${avgGrade}`);
}

// Check academic year settings
const AcademicYear = mongoose.model('AcademicYearSettings', new mongoose.Schema({}, { strict: false }));
const settings = await AcademicYear.findOne({}).lean();
if (settings) {
  console.log('\n=== Academic Year Settings ===');
  console.log('Year:', settings.academicYear);
  console.log('Current Term:', settings.currentTerm);
  if (settings.terms) {
    settings.terms.forEach(t => {
      console.log(`  Term ${t.termNumber}: ${t.name} | ${t.startMonth}-${t.endMonth} | start:${t.startDate} end:${t.endDate}`);
    });
  }
}

await mongoose.disconnect();
