import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import UserModel from './models/UserModels.js';
import Schedule from './models/schedual.js';
import Announcement from './models/Announcement.js';
import Submission from './models/submission.js';
import Attendance from './models/attendance.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/SchoolSystem';

// ============================================================================
// CONFIGURATION
// ============================================================================
const DEFAULT_PASSWORD = 'password123';
const SCHOOL_YEAR_START = new Date('2025-09-01');
const SCHOOL_YEAR_END = new Date('2026-06-30');

// Grade 12 Subjects
const GRADE_12_SUBJECTS = ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'Arabic', 'Computer Science'];

// Time slots for schedule
const TIME_SLOTS = [
  { startTime: '08:00', endTime: '08:45' },
  { startTime: '08:50', endTime: '09:35' },
  { startTime: '09:45', endTime: '10:30' },
  { startTime: '10:35', endTime: '11:20' },
  { startTime: '11:30', endTime: '12:15' },
  { startTime: '12:20', endTime: '13:05' },
  { startTime: '13:15', endTime: '14:00' }
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ============================================================================
// STUDENT DATA - Grade 12 Sections A & B
// ============================================================================
const STUDENTS_DATA = [
  // Section A - 15 students
  { name: 'Ahmad Hassan', email: 'ahmad.hassan@student.com', gender: 'male', classSection: 'A', dob: '2008-03-15' },
  { name: 'Sara Ahmed', email: 'sara.ahmed@student.com', gender: 'female', classSection: 'A', dob: '2008-05-22' },
  { name: 'Mohammed Ali', email: 'mohammed.ali@student.com', gender: 'male', classSection: 'A', dob: '2008-01-10' },
  { name: 'Fatima Khalil', email: 'fatima.khalil@student.com', gender: 'female', classSection: 'A', dob: '2008-07-08' },
  { name: 'Omar Ibrahim', email: 'omar.ibrahim@student.com', gender: 'male', classSection: 'A', dob: '2008-09-25' },
  { name: 'Layla Mahmoud', email: 'layla.mahmoud@student.com', gender: 'female', classSection: 'A', dob: '2008-11-14' },
  { name: 'Youssef Karim', email: 'youssef.karim@student.com', gender: 'male', classSection: 'A', dob: '2008-02-28' },
  { name: 'Nour Hassan', email: 'nour.hassan@student.com', gender: 'female', classSection: 'A', dob: '2008-04-17' },
  { name: 'Khaled Saleh', email: 'khaled.saleh@student.com', gender: 'male', classSection: 'A', dob: '2008-06-03' },
  { name: 'Mariam Adel', email: 'mariam.adel@student.com', gender: 'female', classSection: 'A', dob: '2008-08-19' },
  { name: 'Ali Mostafa', email: 'ali.mostafa@student.com', gender: 'male', classSection: 'A', dob: '2008-10-30' },
  { name: 'Hana Faisal', email: 'hana.faisal@student.com', gender: 'female', classSection: 'A', dob: '2008-12-05' },
  { name: 'Tamer Nabil', email: 'tamer.nabil@student.com', gender: 'male', classSection: 'A', dob: '2008-01-22' },
  { name: 'Dina Samir', email: 'dina.samir@student.com', gender: 'female', classSection: 'A', dob: '2008-03-09' },
  { name: 'Rami Fouad', email: 'rami.fouad@student.com', gender: 'male', classSection: 'A', dob: '2008-05-27' },
  
  // Section B - 15 students
  { name: 'Yasmine Tarek', email: 'yasmine.tarek@student.com', gender: 'female', classSection: 'B', dob: '2008-02-11' },
  { name: 'Hassan Amr', email: 'hassan.amr@student.com', gender: 'male', classSection: 'B', dob: '2008-04-28' },
  { name: 'Salma Walid', email: 'salma.walid@student.com', gender: 'female', classSection: 'B', dob: '2008-06-15' },
  { name: 'Karim Hossam', email: 'karim.hossam@student.com', gender: 'male', classSection: 'B', dob: '2008-08-02' },
  { name: 'Aya Mohamed', email: 'aya.mohamed@student.com', gender: 'female', classSection: 'B', dob: '2008-10-19' },
  { name: 'Mahmoud Sayed', email: 'mahmoud.sayed@student.com', gender: 'male', classSection: 'B', dob: '2008-12-06' },
  { name: 'Rania Essam', email: 'rania.essam@student.com', gender: 'female', classSection: 'B', dob: '2008-01-23' },
  { name: 'Ahmed Sherif', email: 'ahmed.sherif@student.com', gender: 'male', classSection: 'B', dob: '2008-03-12' },
  { name: 'Lina Ashraf', email: 'lina.ashraf@student.com', gender: 'female', classSection: 'B', dob: '2008-05-29' },
  { name: 'Mostafa Ayman', email: 'mostafa.ayman@student.com', gender: 'male', classSection: 'B', dob: '2008-07-16' },
  { name: 'Jana Hazem', email: 'jana.hazem@student.com', gender: 'female', classSection: 'B', dob: '2008-09-03' },
  { name: 'Ziad Tamer', email: 'ziad.tamer@student.com', gender: 'male', classSection: 'B', dob: '2008-11-20' },
  { name: 'Malak Hesham', email: 'malak.hesham@student.com', gender: 'female', classSection: 'B', dob: '2008-02-07' },
  { name: 'Adham Ramy', email: 'adham.ramy@student.com', gender: 'male', classSection: 'B', dob: '2008-04-24' },
  { name: 'Nada Saeed', email: 'nada.saeed@student.com', gender: 'female', classSection: 'B', dob: '2008-06-11' }
];

// ============================================================================
// TEACHER DATA
// ============================================================================
const TEACHERS_DATA = [
  { name: 'Dr. Ahmed Mansour', email: 't.mansour@teacher.com', gender: 'male', subjects: ['Math'] },
  { name: 'Dr. Heba Youssef', email: 't.youssef@teacher.com', gender: 'female', subjects: ['Physics'] },
  { name: 'Dr. Tarek Ismail', email: 't.ismail@teacher.com', gender: 'male', subjects: ['Chemistry'] },
  { name: 'Dr. Mona Abdel-Rahman', email: 't.abdelrahman@teacher.com', gender: 'female', subjects: ['Biology'] },
  { name: 'Ms. Sarah Williams', email: 't.williams@teacher.com', gender: 'female', subjects: ['English'] },
  { name: 'Mr. Mahmoud Fahmy', email: 't.fahmy@teacher.com', gender: 'male', subjects: ['Arabic'] },
  { name: 'Dr. Karim Helal', email: 't.helal@teacher.com', gender: 'male', subjects: ['Computer Science'] }
];

// ============================================================================
// ASSIGNMENTS AND QUIZZES DATA PER SUBJECT
// ============================================================================
const ASSIGNMENTS_TEMPLATES = {
  'Math': [
    { title: 'Calculus Basics', description: 'Complete exercises on limits and derivatives from Chapter 1', type: 'assignment', points: 100 },
    { title: 'Integration Techniques', description: 'Solve integration problems using substitution and parts methods', type: 'assignment', points: 100 },
    { title: 'Chapter 1 Quiz', description: 'Quiz covering limits, continuity, and basic derivatives', type: 'quiz', points: 50 },
    { title: 'Differential Equations', description: 'Solve first and second order differential equations', type: 'assignment', points: 100 },
    { title: 'Matrices and Determinants', description: 'Complete matrix operations and find determinants', type: 'assignment', points: 100 },
    { title: 'Mid-term Quiz', description: 'Comprehensive quiz on all topics covered', type: 'quiz', points: 100 },
    { title: 'Probability Theory', description: 'Calculate probabilities and expected values', type: 'assignment', points: 100 },
    { title: 'Statistics Project', description: 'Analyze real-world data using statistical methods', type: 'assignment', points: 150 },
    { title: 'Chapter 5 Quiz', description: 'Quiz on probability and statistics', type: 'quiz', points: 50 },
    { title: 'Final Review Assignment', description: 'Comprehensive review of all math topics', type: 'assignment', points: 100 }
  ],
  'Physics': [
    { title: 'Mechanics Problem Set', description: 'Solve problems on motion, forces, and energy', type: 'assignment', points: 100 },
    { title: 'Wave Motion Analysis', description: 'Analyze wave properties and solve related problems', type: 'assignment', points: 100 },
    { title: 'Mechanics Quiz', description: 'Quiz on Newton\'s laws and motion equations', type: 'quiz', points: 50 },
    { title: 'Thermodynamics Lab Report', description: 'Write lab report on heat transfer experiment', type: 'assignment', points: 100 },
    { title: 'Electricity and Magnetism', description: 'Complete circuit analysis problems', type: 'assignment', points: 100 },
    { title: 'Mid-term Quiz', description: 'Quiz covering mechanics and waves', type: 'quiz', points: 100 },
    { title: 'Modern Physics Introduction', description: 'Research paper on quantum mechanics basics', type: 'assignment', points: 100 },
    { title: 'Optics Experiments', description: 'Lab work on light refraction and reflection', type: 'assignment', points: 100 },
    { title: 'Electromagnetism Quiz', description: 'Quiz on electromagnetic waves', type: 'quiz', points: 50 },
    { title: 'Physics Final Project', description: 'Design and explain a physics experiment', type: 'assignment', points: 150 }
  ],
  'Chemistry': [
    { title: 'Atomic Structure Review', description: 'Complete worksheets on electron configurations', type: 'assignment', points: 100 },
    { title: 'Chemical Bonding', description: 'Identify bond types and draw Lewis structures', type: 'assignment', points: 100 },
    { title: 'Chapter 1-2 Quiz', description: 'Quiz on atomic structure and bonding', type: 'quiz', points: 50 },
    { title: 'Stoichiometry Problems', description: 'Balance equations and calculate quantities', type: 'assignment', points: 100 },
    { title: 'Lab Report: Titration', description: 'Complete acid-base titration lab report', type: 'assignment', points: 100 },
    { title: 'Mid-term Quiz', description: 'Comprehensive chemistry quiz', type: 'quiz', points: 100 },
    { title: 'Organic Chemistry Basics', description: 'Name and draw organic compounds', type: 'assignment', points: 100 },
    { title: 'Reaction Mechanisms', description: 'Explain mechanisms of organic reactions', type: 'assignment', points: 100 },
    { title: 'Organic Chemistry Quiz', description: 'Quiz on organic compounds', type: 'quiz', points: 50 },
    { title: 'Chemistry Research Project', description: 'Research on environmental chemistry topic', type: 'assignment', points: 150 }
  ],
  'Biology': [
    { title: 'Cell Structure and Function', description: 'Label cell diagrams and explain organelle functions', type: 'assignment', points: 100 },
    { title: 'Genetics Worksheet', description: 'Solve genetics problems using Punnett squares', type: 'assignment', points: 100 },
    { title: 'Cell Biology Quiz', description: 'Quiz on cell structure and processes', type: 'quiz', points: 50 },
    { title: 'DNA and Protein Synthesis', description: 'Explain transcription and translation processes', type: 'assignment', points: 100 },
    { title: 'Evolution Case Study', description: 'Analyze evidence for evolution', type: 'assignment', points: 100 },
    { title: 'Mid-term Quiz', description: 'Quiz on genetics and molecular biology', type: 'quiz', points: 100 },
    { title: 'Ecology Project', description: 'Study local ecosystem and write report', type: 'assignment', points: 150 },
    { title: 'Human Physiology', description: 'Explain major body systems', type: 'assignment', points: 100 },
    { title: 'Physiology Quiz', description: 'Quiz on human body systems', type: 'quiz', points: 50 },
    { title: 'Biology Final Research', description: 'Research paper on current biology topic', type: 'assignment', points: 150 }
  ],
  'English': [
    { title: 'Essay Writing: Argumentative', description: 'Write a 500-word argumentative essay', type: 'assignment', points: 100 },
    { title: 'Literature Analysis', description: 'Analyze themes in assigned novel chapter', type: 'assignment', points: 100 },
    { title: 'Vocabulary Quiz 1', description: 'Quiz on vocabulary from Unit 1-2', type: 'quiz', points: 50 },
    { title: 'Creative Writing', description: 'Write a short story (minimum 800 words)', type: 'assignment', points: 100 },
    { title: 'Poetry Analysis', description: 'Analyze literary devices in assigned poems', type: 'assignment', points: 100 },
    { title: 'Mid-term Quiz', description: 'Grammar and reading comprehension quiz', type: 'quiz', points: 100 },
    { title: 'Research Paper Draft', description: 'Submit first draft of research paper', type: 'assignment', points: 100 },
    { title: 'Presentation Skills', description: 'Prepare oral presentation on chosen topic', type: 'assignment', points: 100 },
    { title: 'Vocabulary Quiz 2', description: 'Quiz on vocabulary from Unit 3-4', type: 'quiz', points: 50 },
    { title: 'Final Research Paper', description: 'Complete research paper with citations', type: 'assignment', points: 150 }
  ],
  'Arabic': [
    { title: 'النحو والصرف', description: 'تمارين على قواعد النحو والصرف', type: 'assignment', points: 100 },
    { title: 'تحليل نص أدبي', description: 'تحليل قصيدة من العصر الجاهلي', type: 'assignment', points: 100 },
    { title: 'اختبار النحو', description: 'اختبار قصير على قواعد النحو', type: 'quiz', points: 50 },
    { title: 'الإنشاء والتعبير', description: 'كتابة مقال عن موضوع اجتماعي', type: 'assignment', points: 100 },
    { title: 'البلاغة العربية', description: 'تحديد الصور البلاغية في النص', type: 'assignment', points: 100 },
    { title: 'اختبار منتصف الفصل', description: 'اختبار شامل على المنهج', type: 'quiz', points: 100 },
    { title: 'الأدب الحديث', description: 'دراسة نماذج من الأدب الحديث', type: 'assignment', points: 100 },
    { title: 'الخطابة والإلقاء', description: 'إعداد خطبة وإلقائها', type: 'assignment', points: 100 },
    { title: 'اختبار البلاغة', description: 'اختبار على الصور البلاغية', type: 'quiz', points: 50 },
    { title: 'مشروع البحث', description: 'بحث عن شاعر عربي معاصر', type: 'assignment', points: 150 }
  ],
  'Computer Science': [
    { title: 'Python Basics', description: 'Write programs using Python fundamentals', type: 'assignment', points: 100 },
    { title: 'Data Structures', description: 'Implement lists, stacks, and queues', type: 'assignment', points: 100 },
    { title: 'Programming Quiz 1', description: 'Quiz on Python syntax and basics', type: 'quiz', points: 50 },
    { title: 'Algorithm Design', description: 'Design and analyze sorting algorithms', type: 'assignment', points: 100 },
    { title: 'Database Project', description: 'Create and query a database', type: 'assignment', points: 150 },
    { title: 'Mid-term Quiz', description: 'Quiz on programming and algorithms', type: 'quiz', points: 100 },
    { title: 'Web Development', description: 'Create a simple website with HTML/CSS/JS', type: 'assignment', points: 150 },
    { title: 'Object-Oriented Programming', description: 'Implement OOP concepts in Python', type: 'assignment', points: 100 },
    { title: 'Database Quiz', description: 'Quiz on SQL and database concepts', type: 'quiz', points: 50 },
    { title: 'Final Programming Project', description: 'Build a complete application', type: 'assignment', points: 200 }
  ]
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getSchoolDates() {
  const dates = [];
  let currentDate = new Date(SCHOOL_YEAR_START);
  
  while (currentDate <= SCHOOL_YEAR_END) {
    const dayOfWeek = currentDate.getDay();
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(new Date(currentDate));
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return dates;
}

// ============================================================================
// MAIN SEEDING FUNCTIONS
// ============================================================================

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');
  
  // Only clear test data, preserve admin users
  await Submission.deleteMany({});
  await Attendance.deleteMany({});
  await Announcement.deleteMany({});
  await Schedule.deleteMany({});
  
  // Delete students, teachers, and parents (keep admins)
  await UserModel.deleteMany({ role: { $in: ['student', 'teacher', 'parent'] } });
  
  console.log('✅ Database cleared (admin users preserved)');
}

async function createTeachers() {
  console.log('👨‍🏫 Creating teachers...');
  
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const teachers = [];
  
  for (const teacherData of TEACHERS_DATA) {
    const teacher = new UserModel({
      name: teacherData.name,
      email: teacherData.email,
      password: hashedPassword,
      gender: teacherData.gender,
      role: 'teacher',
      subjects: teacherData.subjects,
      dateOfBirth: new Date('1985-01-15')
    });
    
    await teacher.save();
    teachers.push(teacher);
    console.log(`   ✓ Created teacher: ${teacher.name} (${teacherData.subjects.join(', ')})`);
  }
  
  console.log(`✅ Created ${teachers.length} teachers`);
  return teachers;
}

async function createStudentsAndParents() {
  console.log('👨‍👩‍👧‍👦 Creating students and parents...');
  
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const students = [];
  const parents = [];
  
  for (const studentData of STUDENTS_DATA) {
    // Create parent first
    const parentName = studentData.name.split(' ')[1] + ' Family';
    const parentEmail = studentData.email.replace('@student.com', '.parent@parent.com');
    
    const parent = new UserModel({
      name: parentName,
      email: parentEmail,
      password: hashedPassword,
      gender: getRandomElement(['male', 'female']),
      role: 'parent',
      dateOfBirth: new Date('1978-05-20'),
      mustChangePassword: true,
      children: []
    });
    
    await parent.save();
    
    // Create student
    const student = new UserModel({
      name: studentData.name,
      email: studentData.email,
      password: hashedPassword,
      gender: studentData.gender,
      role: 'student',
      classGrade: 'grade12',
      classSection: studentData.classSection,
      dateOfBirth: new Date(studentData.dob),
      parent: parent._id
    });
    
    await student.save();
    
    // Update parent with child reference
    parent.children = [student._id];
    await parent.save();
    
    students.push(student);
    parents.push(parent);
  }
  
  console.log(`✅ Created ${students.length} students and ${parents.length} parents`);
  return { students, parents };
}

async function createSchedules(teachers, students) {
  console.log('📅 Creating schedules...');
  
  const schedules = [];
  const teacherBySubject = {};
  
  // Map teachers to subjects
  for (const teacher of teachers) {
    for (const subject of teacher.subjects) {
      teacherBySubject[subject] = teacher;
    }
  }
  
  // Create schedule for each section
  for (const section of ['A', 'B']) {
    const sectionStudents = students.filter(s => s.classSection === section);
    const studentIds = sectionStudents.map(s => s._id);
    
    let slotIndex = 0;
    
    for (const day of DAYS) {
      // 5-6 subjects per day
      const subjectsPerDay = day === 'Friday' ? 5 : 6;
      const dailySubjects = [...GRADE_12_SUBJECTS].sort(() => Math.random() - 0.5).slice(0, subjectsPerDay);
      
      for (let i = 0; i < dailySubjects.length; i++) {
        const subject = dailySubjects[i];
        const teacher = teacherBySubject[subject];
        const timeSlot = TIME_SLOTS[i % TIME_SLOTS.length];
        
        const schedule = new Schedule({
          teacher: teacher._id,
          subject: subject,
          dayOfWeek: day,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          classGrade: 'grade12',
          classSection: section,
          student: studentIds
        });
        
        await schedule.save();
        schedules.push(schedule);
      }
    }
    
    console.log(`   ✓ Created schedule for Grade 12 Section ${section}`);
  }
  
  console.log(`✅ Created ${schedules.length} schedule entries`);
  return schedules;
}

async function createAssignmentsAndQuizzes(teachers, students) {
  console.log('📝 Creating assignments and quizzes for the school year...');
  
  const announcements = [];
  const teacherBySubject = {};
  
  // Map teachers to subjects
  for (const teacher of teachers) {
    for (const subject of teacher.subjects) {
      teacherBySubject[subject] = teacher;
    }
  }
  
  // Get all students by section
  const sectionAStudents = students.filter(s => s.classSection === 'A');
  const sectionBStudents = students.filter(s => s.classSection === 'B');
  
  // Create assignments spread throughout the school year
  const schoolMonths = [
    { month: 9, year: 2025 },  // September
    { month: 10, year: 2025 }, // October
    { month: 11, year: 2025 }, // November
    { month: 12, year: 2025 }, // December
    { month: 1, year: 2026 },  // January
    { month: 2, year: 2026 },  // February (current)
    { month: 3, year: 2026 },  // March
    { month: 4, year: 2026 },  // April
    { month: 5, year: 2026 },  // May
    { month: 6, year: 2026 }   // June
  ];
  
  for (const subject of GRADE_12_SUBJECTS) {
    const teacher = teacherBySubject[subject];
    const templates = ASSIGNMENTS_TEMPLATES[subject];
    
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      const monthData = schoolMonths[i % schoolMonths.length];
      
      // Random day in the month (between 5-25)
      const dueDate = new Date(monthData.year, monthData.month - 1, getRandomInt(5, 25));
      
      // Create for both sections
      for (const section of ['A', 'B']) {
        const targetStudents = section === 'A' ? sectionAStudents : sectionBStudents;
        
        const announcement = new Announcement({
          teacher: teacher._id,
          subject: subject,
          type: template.type,
          title: `${template.title} - Section ${section}`,
          description: template.description,
          dueDate: dueDate,
          totalPoints: template.points,
          targetStudents: targetStudents.map(s => s._id),
          status: 'published',
          priority: template.type === 'quiz' ? 'high' : 'medium'
        });
        
        await announcement.save();
        announcements.push({ announcement, targetStudents, dueDate });
      }
    }
    
    console.log(`   ✓ Created ${templates.length * 2} items for ${subject}`);
  }
  
  console.log(`✅ Created ${announcements.length} assignments and quizzes`);
  return announcements;
}

async function createSubmissions(announcementsData, teachers) {
  console.log('📤 Creating student submissions...');
  
  let submissionCount = 0;
  const now = new Date();
  const teacherBySubject = {};
  
  for (const teacher of teachers) {
    for (const subject of teacher.subjects) {
      teacherBySubject[subject] = teacher;
    }
  }
  
  for (const { announcement, targetStudents, dueDate } of announcementsData) {
    // Only create submissions for past due dates
    if (dueDate > now) continue;
    
    const teacher = teacherBySubject[announcement.subject];
    
    for (const student of targetStudents) {
      // 85% submission rate
      if (Math.random() > 0.85) continue;
      
      const isLate = Math.random() < 0.1; // 10% late submissions
      const submittedAt = isLate 
        ? addDays(dueDate, getRandomInt(1, 3))
        : addDays(dueDate, -getRandomInt(1, 5));
      
      // Generate grade (60-100 range, weighted towards higher grades)
      const baseGrade = getRandomInt(60, 100);
      const grade = Math.min(announcement.totalPoints, Math.round((baseGrade / 100) * announcement.totalPoints));
      
      const submission = new Submission({
        announcement: announcement._id,
        student: student._id,
        content: `Submission for ${announcement.title}`,
        submittedAt: submittedAt,
        grade: grade,
        totalPoints: announcement.totalPoints,
        feedback: grade >= 90 ? 'Excellent work!' : 
                  grade >= 80 ? 'Good job!' : 
                  grade >= 70 ? 'Satisfactory work.' : 'Needs improvement.',
        gradedBy: teacher._id,
        gradedAt: addDays(dueDate, getRandomInt(2, 7)),
        status: 'graded',
        isLate: isLate
      });
      
      await submission.save();
      submissionCount++;
    }
  }
  
  console.log(`✅ Created ${submissionCount} submissions`);
  return submissionCount;
}

async function createAttendance(teachers, students, schedules) {
  console.log('📋 Creating attendance records...');
  
  let attendanceCount = 0;
  const now = new Date();
  const schoolDates = getSchoolDates().filter(d => d <= now);
  
  // Limit to last 3 months to avoid too many records
  const threeMonthsAgo = addDays(now, -90);
  const recentDates = schoolDates.filter(d => d >= threeMonthsAgo);
  
  const teacherBySubject = {};
  for (const teacher of teachers) {
    for (const subject of teacher.subjects) {
      teacherBySubject[subject] = teacher;
    }
  }
  
  // Get unique subject-section combinations
  const subjectSections = {};
  for (const schedule of schedules) {
    const key = `${schedule.subject}-${schedule.classSection}`;
    if (!subjectSections[key]) {
      subjectSections[key] = {
        subject: schedule.subject,
        section: schedule.classSection,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      };
    }
  }
  
  for (const date of recentDates) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    for (const key of Object.keys(subjectSections)) {
      const { subject, section, dayOfWeek, startTime, endTime } = subjectSections[key];
      
      // Skip if not the right day
      if (dayOfWeek !== dayName) continue;
      
      const teacher = teacherBySubject[subject];
      const sectionStudents = students.filter(s => s.classSection === section);
      
      for (const student of sectionStudents) {
        // Attendance status distribution: 90% present, 5% late, 3% absent, 2% excused
        const rand = Math.random();
        let status;
        if (rand < 0.90) status = 'present';
        else if (rand < 0.95) status = 'late';
        else if (rand < 0.98) status = 'absent';
        else status = 'excused';
        
        try {
          const attendance = new Attendance({
            teacher: teacher._id,
            student: student._id,
            subject: subject,
            date: date,
            status: status,
            checkInTime: status === 'present' || status === 'late' ? date : null,
            classTime: { startTime, endTime }
          });
          
          await attendance.save();
          attendanceCount++;
        } catch (err) {
          // Skip duplicates
          if (err.code !== 11000) throw err;
        }
      }
    }
  }
  
  console.log(`✅ Created ${attendanceCount} attendance records`);
  return attendanceCount;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function seedDatabase() {
  try {
    console.log('\n🚀 Starting database seeding...\n');
    console.log('=' .repeat(60));
    
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('📦 Connected to MongoDB\n');
    
    // Clear existing data
    await clearDatabase();
    console.log('');
    
    // Create users
    const teachers = await createTeachers();
    console.log('');
    
    const { students, parents } = await createStudentsAndParents();
    console.log('');
    
    // Create schedules
    const schedules = await createSchedules(teachers, students);
    console.log('');
    
    // Create assignments and quizzes
    const announcementsData = await createAssignmentsAndQuizzes(teachers, students);
    console.log('');
    
    // Create submissions
    await createSubmissions(announcementsData, teachers);
    console.log('');
    
    // Create attendance
    await createAttendance(teachers, students, schedules);
    console.log('');
    
    // Summary
    console.log('=' .repeat(60));
    console.log('\n📊 SEEDING COMPLETE - SUMMARY:\n');
    console.log(`   👨‍🏫 Teachers: ${teachers.length}`);
    console.log(`   👨‍🎓 Students: ${students.length}`);
    console.log(`   👨‍👩‍👧 Parents: ${parents.length}`);
    console.log(`   📅 Schedules: ${schedules.length}`);
    console.log(`   📝 Assignments/Quizzes: ${announcementsData.length}`);
    console.log('\n');
    console.log('=' .repeat(60));
    console.log('\n🔐 LOGIN CREDENTIALS:\n');
    console.log('   All accounts use password: ' + DEFAULT_PASSWORD);
    console.log('\n   Sample accounts:');
    console.log('   ─────────────────────────────────────────');
    console.log('   TEACHER:  ahmed.mansour@teacher.school.com (Math)');
    console.log('   STUDENT:  ahmad.hassan@student.school.com (Grade 12-A)');
    console.log('   PARENT:   ahmad.hassan.parent@student.school.com');
    console.log('   ─────────────────────────────────────────');
    console.log('\n✅ Database seeding completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB\n');
  }
}

// Run the seeder
seedDatabase();
