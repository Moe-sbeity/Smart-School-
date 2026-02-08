import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import UserModel from './models/UserModels.js';
import CounterModel from './models/counter.js';
import ClassGradeModel from './models/classGrade.js';
import Schedule from './models/schedual.js';
import Announcement from './models/Announcement.js';
import Submission from './models/submission.js';
import Attendance from './models/attendance.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/SchoolSystem';
const PASSWORD = 'password123';

// ════════════════════════════════════════════════════════════════════
// TEACHERS  –  emails: t.mansour@teacher.com  etc.
// ════════════════════════════════════════════════════════════════════
const TEACHERS = [
  { name: 'Dr. Ahmed Mansour',      email: 't.mansour@teacher.com',       gender: 'male',   subjects: ['Math'],             dob: '1980-03-12' },
  { name: 'Dr. Heba Youssef',       email: 't.youssef@teacher.com',       gender: 'female', subjects: ['Physics'],           dob: '1982-07-25' },
  { name: 'Dr. Tarek Ismail',       email: 't.ismail@teacher.com',        gender: 'male',   subjects: ['Chemistry'],         dob: '1978-11-08' },
  { name: 'Dr. Mona Abdel-Rahman',  email: 't.abdelrahman@teacher.com',   gender: 'female', subjects: ['Biology'],           dob: '1983-01-19' },
  { name: 'Ms. Sarah Williams',     email: 't.williams@teacher.com',      gender: 'female', subjects: ['English'],           dob: '1985-09-30' },
  { name: 'Mr. Mahmoud Fahmy',      email: 't.fahmy@teacher.com',         gender: 'male',   subjects: ['Arabic'],            dob: '1979-05-14' },
  { name: 'Dr. Karim Helal',        email: 't.helal@teacher.com',         gender: 'male',   subjects: ['Computer Science'],  dob: '1986-02-22' },
];

// ════════════════════════════════════════════════════════════════════
// STUDENTS  –  Grade 12, Sections A & B
// Emails auto-generated via Counter: 10000001@student.com ...
// Parents auto-generated:            10000001@parent.com  ...
// ════════════════════════════════════════════════════════════════════
const STUDENTS = [
  // ── Section A (15) ──
  { name: 'Ahmad Hassan',     gender: 'male',   sec: 'A', dob: '2008-03-15' },
  { name: 'Sara Ahmed',       gender: 'female', sec: 'A', dob: '2008-05-22' },
  { name: 'Mohammed Ali',     gender: 'male',   sec: 'A', dob: '2008-01-10' },
  { name: 'Fatima Khalil',    gender: 'female', sec: 'A', dob: '2008-07-08' },
  { name: 'Omar Ibrahim',     gender: 'male',   sec: 'A', dob: '2008-09-25' },
  { name: 'Layla Mahmoud',    gender: 'female', sec: 'A', dob: '2008-11-14' },
  { name: 'Youssef Karim',    gender: 'male',   sec: 'A', dob: '2008-02-28' },
  { name: 'Nour Hassan',      gender: 'female', sec: 'A', dob: '2008-04-17' },
  { name: 'Khaled Saleh',     gender: 'male',   sec: 'A', dob: '2008-06-03' },
  { name: 'Mariam Adel',      gender: 'female', sec: 'A', dob: '2008-08-19' },
  { name: 'Ali Mostafa',      gender: 'male',   sec: 'A', dob: '2008-10-30' },
  { name: 'Hana Faisal',      gender: 'female', sec: 'A', dob: '2008-12-05' },
  { name: 'Tamer Nabil',      gender: 'male',   sec: 'A', dob: '2008-01-22' },
  { name: 'Dina Samir',       gender: 'female', sec: 'A', dob: '2008-03-09' },
  { name: 'Rami Fouad',       gender: 'male',   sec: 'A', dob: '2008-05-27' },
  // ── Section B (15) ──
  { name: 'Yasmine Tarek',    gender: 'female', sec: 'B', dob: '2008-02-11' },
  { name: 'Hassan Amr',       gender: 'male',   sec: 'B', dob: '2008-04-28' },
  { name: 'Salma Walid',      gender: 'female', sec: 'B', dob: '2008-06-15' },
  { name: 'Karim Hossam',     gender: 'male',   sec: 'B', dob: '2008-08-02' },
  { name: 'Aya Mohamed',      gender: 'female', sec: 'B', dob: '2008-10-19' },
  { name: 'Mahmoud Sayed',    gender: 'male',   sec: 'B', dob: '2008-12-06' },
  { name: 'Rania Essam',      gender: 'female', sec: 'B', dob: '2008-01-23' },
  { name: 'Ahmed Sherif',     gender: 'male',   sec: 'B', dob: '2008-03-12' },
  { name: 'Lina Ashraf',      gender: 'female', sec: 'B', dob: '2008-05-29' },
  { name: 'Mostafa Ayman',    gender: 'male',   sec: 'B', dob: '2008-07-16' },
  { name: 'Jana Hazem',       gender: 'female', sec: 'B', dob: '2008-09-03' },
  { name: 'Ziad Tamer',       gender: 'male',   sec: 'B', dob: '2008-11-20' },
  { name: 'Malak Hesham',     gender: 'female', sec: 'B', dob: '2008-02-07' },
  { name: 'Adham Ramy',       gender: 'male',   sec: 'B', dob: '2008-04-24' },
  { name: 'Nada Saeed',       gender: 'female', sec: 'B', dob: '2008-06-11' },
];

// ════════════════════════════════════════════════════════════════════
// WEEKLY TIMETABLE
// ════════════════════════════════════════════════════════════════════
const SLOTS = [
  { start: '08:00', end: '08:45' },
  { start: '08:50', end: '09:35' },
  { start: '09:45', end: '10:30' },
  { start: '10:35', end: '11:20' },
  { start: '11:30', end: '12:15' },
  { start: '12:20', end: '13:05' },
];
const TIMETABLE = {
  Monday:    ['Math','Physics','Chemistry','English','Arabic','Computer Science'],
  Tuesday:   ['Biology','Math','English','Physics','Computer Science','Arabic'],
  Wednesday: ['Chemistry','Biology','Math','Arabic','English','Physics'],
  Thursday:  ['Computer Science','Chemistry','Biology','Math','Arabic','English'],
  Friday:    ['Physics','English','Arabic','Computer Science','Math'],
};

// ════════════════════════════════════════════════════════════════════
// FULL YEAR CURRICULUM
// ════════════════════════════════════════════════════════════════════
const CURRICULUM = {
  'Math': {
    semester1: [
      { title: 'Limits and Continuity Homework',          desc: 'Solve exercises 1-20 from Chapter 1 on limits, one-sided limits, and continuity tests.', type: 'assignment', pts: 100, week: 2 },
      { title: 'Chapter 1 Quiz: Limits',                  desc: 'In-class quiz covering limits, squeeze theorem, and L\'Hôpital\'s rule.', type: 'quiz', pts: 40, week: 4 },
      { title: 'Derivatives and Applications',            desc: 'Complete differentiation problems including chain rule, product rule, and related rates.', type: 'assignment', pts: 100, week: 6 },
      { title: 'Integration Techniques Worksheet',        desc: 'Solve integration by substitution and by parts problems (exercises 1-15).', type: 'assignment', pts: 100, week: 9 },
      { title: 'Mid-Semester Exam: Calculus Foundations',  desc: 'Comprehensive exam on limits, derivatives, and basic integration.', type: 'quiz', pts: 80, week: 11 },
      { title: 'Definite Integrals & Area Under Curves',  desc: 'Calculate areas between curves using definite integrals.', type: 'assignment', pts: 100, week: 14 },
    ],
    semester2: [
      { title: 'Matrices and Systems of Equations',       desc: 'Solve systems of linear equations using matrix methods and Gaussian elimination.', type: 'assignment', pts: 100, week: 20 },
      { title: 'Chapter 5 Quiz: Linear Algebra',          desc: 'Quiz on matrix operations, determinants, and inverse matrices.', type: 'quiz', pts: 40, week: 22 },
      { title: 'Probability and Combinatorics',           desc: 'Solve problems on permutations, combinations, and probability distributions.', type: 'assignment', pts: 100, week: 25 },
      { title: 'Statistics Data Analysis Project',        desc: 'Collect real-world data, compute mean, median, standard deviation, and present findings.', type: 'assignment', pts: 120, week: 28 },
      { title: 'Semester 2 Quiz: Probability & Stats',    desc: 'Quiz covering probability rules, Bayes theorem, and descriptive statistics.', type: 'quiz', pts: 80, week: 31 },
      { title: 'Final Review Problem Set',                desc: 'Comprehensive problem set covering the entire year\'s curriculum.', type: 'assignment', pts: 100, week: 35 },
    ]
  },
  'Physics': {
    semester1: [
      { title: 'Kinematics Problem Set',                  desc: 'Solve motion problems using equations of uniformly accelerated motion and projectile motion.', type: 'assignment', pts: 100, week: 2 },
      { title: 'Quiz: Newton\'s Laws of Motion',          desc: 'Short quiz on force diagrams, Newton\'s three laws, and friction.', type: 'quiz', pts: 40, week: 5 },
      { title: 'Work, Energy, and Power Assignment',      desc: 'Calculate work done, kinetic/potential energy, and power in various scenarios.', type: 'assignment', pts: 100, week: 7 },
      { title: 'Momentum and Collisions Lab Report',      desc: 'Write a lab report analyzing elastic and inelastic collisions from the lab experiment.', type: 'assignment', pts: 100, week: 10 },
      { title: 'Mid-Semester Exam: Mechanics',            desc: 'Exam covering kinematics, dynamics, work-energy theorem, and momentum.', type: 'quiz', pts: 80, week: 12 },
      { title: 'Rotational Motion Assignment',            desc: 'Solve problems on torque, angular momentum, and rotational kinetic energy.', type: 'assignment', pts: 100, week: 15 },
    ],
    semester2: [
      { title: 'Wave Motion and Sound',                   desc: 'Analyze wave properties including wavelength, frequency, interference, and resonance.', type: 'assignment', pts: 100, week: 20 },
      { title: 'Quiz: Waves and Optics',                  desc: 'Quiz on wave equations, reflection, refraction, and lens formula.', type: 'quiz', pts: 40, week: 23 },
      { title: 'Electricity and Circuits',                desc: 'Design and analyze DC circuits using Ohm\'s law and Kirchhoff\'s rules.', type: 'assignment', pts: 100, week: 26 },
      { title: 'Magnetism and Electromagnetism',          desc: 'Solve problems on magnetic fields, electromagnetic induction, and Faraday\'s law.', type: 'assignment', pts: 100, week: 29 },
      { title: 'Semester 2 Exam: Waves & Electricity',    desc: 'Comprehensive exam on wave motion, optics, circuits, and magnetism.', type: 'quiz', pts: 80, week: 32 },
      { title: 'Modern Physics Research Paper',           desc: 'Write a 1000-word research paper on a topic in quantum mechanics or relativity.', type: 'assignment', pts: 120, week: 35 },
    ]
  },
  'Chemistry': {
    semester1: [
      { title: 'Atomic Structure Worksheet',              desc: 'Draw electron configurations and orbital diagrams for elements 1-36.', type: 'assignment', pts: 100, week: 2 },
      { title: 'Quiz: Periodic Table Trends',             desc: 'Quiz on electronegativity, ionization energy, atomic radius, and electron affinity.', type: 'quiz', pts: 40, week: 4 },
      { title: 'Chemical Bonding Assignment',             desc: 'Draw Lewis structures, predict molecular geometry using VSEPR theory.', type: 'assignment', pts: 100, week: 7 },
      { title: 'Stoichiometry Problem Set',               desc: 'Balance chemical equations and perform mole-to-mole, mass-to-mass calculations.', type: 'assignment', pts: 100, week: 10 },
      { title: 'Mid-Semester Exam: Structure & Bonding',  desc: 'Exam on atomic structure, periodic trends, bonding, and stoichiometry.', type: 'quiz', pts: 80, week: 12 },
      { title: 'Acid-Base Titration Lab Report',          desc: 'Write a complete lab report for the acid-base titration experiment including error analysis.', type: 'assignment', pts: 100, week: 15 },
    ],
    semester2: [
      { title: 'Thermochemistry Calculations',            desc: 'Calculate enthalpy changes using Hess\'s law and calorimetry data.', type: 'assignment', pts: 100, week: 21 },
      { title: 'Quiz: Reaction Kinetics',                 desc: 'Quiz on rate laws, activation energy, and factors affecting reaction rates.', type: 'quiz', pts: 40, week: 24 },
      { title: 'Organic Chemistry: Naming Compounds',     desc: 'Name and draw structural formulas for alkanes, alkenes, alkynes, and functional groups.', type: 'assignment', pts: 100, week: 26 },
      { title: 'Organic Reactions Mechanisms',             desc: 'Explain addition, substitution, and elimination reaction mechanisms with examples.', type: 'assignment', pts: 100, week: 29 },
      { title: 'Semester 2 Exam: Thermo & Organic',       desc: 'Comprehensive exam on thermochemistry, kinetics, and organic chemistry.', type: 'quiz', pts: 80, week: 32 },
      { title: 'Environmental Chemistry Project',         desc: 'Research project on a topic like acid rain, ozone depletion, or water pollution.', type: 'assignment', pts: 120, week: 36 },
    ]
  },
  'Biology': {
    semester1: [
      { title: 'Cell Structure and Organelles',           desc: 'Label cell diagrams, compare prokaryotic/eukaryotic cells, and explain organelle functions.', type: 'assignment', pts: 100, week: 2 },
      { title: 'Quiz: Cell Biology',                      desc: 'Quiz on cell membrane, transport mechanisms, and cell organelles.', type: 'quiz', pts: 40, week: 5 },
      { title: 'Mendelian Genetics Problems',             desc: 'Solve genetics problems using Punnett squares, including dihybrid crosses.', type: 'assignment', pts: 100, week: 7 },
      { title: 'DNA Replication & Protein Synthesis',     desc: 'Describe the processes of replication, transcription, and translation with diagrams.', type: 'assignment', pts: 100, week: 10 },
      { title: 'Mid-Semester Exam: Cells & Genetics',     desc: 'Exam covering cell biology, Mendelian genetics, and molecular biology.', type: 'quiz', pts: 80, week: 12 },
      { title: 'Mitosis & Meiosis Comparison',            desc: 'Create a detailed comparison chart and diagram of mitosis and meiosis stages.', type: 'assignment', pts: 100, week: 15 },
    ],
    semester2: [
      { title: 'Human Body Systems Overview',             desc: 'Describe the structure and function of the circulatory, respiratory, and digestive systems.', type: 'assignment', pts: 100, week: 20 },
      { title: 'Quiz: Physiology',                        desc: 'Quiz on human body systems, homeostasis, and the nervous system.', type: 'quiz', pts: 40, week: 23 },
      { title: 'Evolution Evidence Essay',                desc: 'Write an essay discussing fossil evidence, comparative anatomy, and DNA evidence for evolution.', type: 'assignment', pts: 100, week: 26 },
      { title: 'Ecology Field Study Report',              desc: 'Conduct an ecological study of a local habitat and report on biodiversity and food webs.', type: 'assignment', pts: 120, week: 29 },
      { title: 'Semester 2 Exam: Physiology & Ecology',   desc: 'Exam on human systems, evolution, and ecology.', type: 'quiz', pts: 80, week: 32 },
      { title: 'Biotechnology Research Presentation',     desc: 'Research and present on a biotechnology topic: GMOs, gene therapy, or CRISPR.', type: 'assignment', pts: 120, week: 35 },
    ]
  },
  'English': {
    semester1: [
      { title: 'Argumentative Essay: Technology in Education', desc: 'Write a 500-word argumentative essay on whether technology improves or hinders education.', type: 'assignment', pts: 100, week: 3 },
      { title: 'Vocabulary Quiz: Units 1-3',              desc: 'Quiz covering vocabulary words, definitions, and usage from Units 1-3.', type: 'quiz', pts: 40, week: 5 },
      { title: 'Shakespeare: Hamlet Analysis',            desc: 'Analyze the theme of revenge in Hamlet, citing specific scenes and quotes.', type: 'assignment', pts: 100, week: 8 },
      { title: 'Creative Writing: Short Story',           desc: 'Write an original short story (800-1000 words) with clear plot structure.', type: 'assignment', pts: 100, week: 11 },
      { title: 'Mid-Semester Exam: Grammar & Literature', desc: 'Exam on grammar rules, reading comprehension, and literary analysis.', type: 'quiz', pts: 80, week: 13 },
      { title: 'Poetry Analysis: Figurative Language',    desc: 'Analyze 3 assigned poems identifying metaphor, simile, imagery, and symbolism.', type: 'assignment', pts: 100, week: 15 },
    ],
    semester2: [
      { title: 'Research Paper: Outline & Sources',       desc: 'Submit a detailed outline and annotated bibliography for your research paper topic.', type: 'assignment', pts: 80, week: 20 },
      { title: 'Vocabulary Quiz: Units 4-6',              desc: 'Quiz on vocabulary, idioms, and phrasal verbs from Units 4-6.', type: 'quiz', pts: 40, week: 23 },
      { title: 'Research Paper: First Draft',             desc: 'Submit the complete first draft of your research paper (1500-2000 words).', type: 'assignment', pts: 100, week: 26 },
      { title: 'Oral Presentation: Current Events',       desc: 'Deliver a 5-minute presentation on a current global issue with visual aids.', type: 'assignment', pts: 100, week: 29 },
      { title: 'Semester 2 Exam: Comp. & Reading',        desc: 'Final exam on composition, reading comprehension, and vocabulary.', type: 'quiz', pts: 80, week: 32 },
      { title: 'Research Paper: Final Submission',        desc: 'Submit the polished final draft with proper MLA citations and formatting.', type: 'assignment', pts: 150, week: 36 },
    ]
  },
  'Arabic': {
    semester1: [
      { title: 'تمارين النحو - المبتدأ والخبر',           desc: 'حل تمارين النحو على أنواع الخبر والمبتدأ مع الإعراب الكامل.', type: 'assignment', pts: 100, week: 2 },
      { title: 'اختبار قصير: النحو الأساسي',              desc: 'اختبار على المرفوعات والمنصوبات في الجملة العربية.', type: 'quiz', pts: 40, week: 4 },
      { title: 'تحليل قصيدة من العصر الجاهلي',           desc: 'تحليل معلقة امرئ القيس من حيث المعنى والصور البلاغية والأسلوب.', type: 'assignment', pts: 100, week: 7 },
      { title: 'مقال إنشائي: دور الشباب',                desc: 'كتابة مقال من 400 كلمة عن دور الشباب في بناء المجتمع.', type: 'assignment', pts: 100, week: 10 },
      { title: 'اختبار منتصف الفصل: النحو والأدب',       desc: 'اختبار شامل على قواعد النحو والنصوص الأدبية المقررة.', type: 'quiz', pts: 80, week: 12 },
      { title: 'البلاغة: التشبيه والاستعارة',             desc: 'تحديد وشرح الصور البلاغية في النصوص المختارة مع أمثلة.', type: 'assignment', pts: 100, week: 15 },
    ],
    semester2: [
      { title: 'الأدب في العصر العباسي',                  desc: 'دراسة نماذج شعرية من العصر العباسي وتحليل خصائصها الفنية.', type: 'assignment', pts: 100, week: 21 },
      { title: 'اختبار: البلاغة والصرف',                  desc: 'اختبار على علم البيان والمعاني والصرف.', type: 'quiz', pts: 40, week: 24 },
      { title: 'بحث عن شاعر عربي معاصر',                 desc: 'إعداد بحث عن حياة وأعمال شاعر عربي معاصر من اختيارك.', type: 'assignment', pts: 120, week: 27 },
      { title: 'الخطابة: إلقاء خطبة',                     desc: 'إعداد وإلقاء خطبة مدتها 5 دقائق حول قضية اجتماعية معاصرة.', type: 'assignment', pts: 100, week: 30 },
      { title: 'اختبار الفصل الثاني: الأدب والبلاغة',     desc: 'اختبار شامل على أدب العصر العباسي والبلاغة والنصوص.', type: 'quiz', pts: 80, week: 33 },
      { title: 'مشروع نهائي: مجلة أدبية',                desc: 'إنشاء مجلة أدبية تحتوي على قصيدة ومقال وقصة قصيرة من تأليفك.', type: 'assignment', pts: 120, week: 36 },
    ]
  },
  'Computer Science': {
    semester1: [
      { title: 'Python Fundamentals Lab',                 desc: 'Write Python programs using variables, data types, conditionals, and loops.', type: 'assignment', pts: 100, week: 2 },
      { title: 'Quiz: Python Basics',                     desc: 'Quiz on Python syntax, data types, control flow, and functions.', type: 'quiz', pts: 40, week: 4 },
      { title: 'Functions and Modules Project',           desc: 'Create a calculator application using functions and modular design.', type: 'assignment', pts: 100, week: 7 },
      { title: 'Data Structures: Lists and Dictionaries', desc: 'Implement stack, queue, and linked list data structures in Python.', type: 'assignment', pts: 100, week: 10 },
      { title: 'Mid-Semester Exam: Programming',          desc: 'Practical exam: solve programming problems using Python fundamentals.', type: 'quiz', pts: 80, week: 13 },
      { title: 'Sorting Algorithms Implementation',       desc: 'Implement bubble sort, selection sort, and merge sort; compare their time complexity.', type: 'assignment', pts: 100, week: 15 },
    ],
    semester2: [
      { title: 'SQL Database Fundamentals',               desc: 'Create a database, write SELECT, INSERT, UPDATE, DELETE queries for a school database.', type: 'assignment', pts: 100, week: 20 },
      { title: 'Quiz: Databases and SQL',                 desc: 'Quiz on database design, normalization, and SQL query writing.', type: 'quiz', pts: 40, week: 23 },
      { title: 'Web Development: HTML/CSS Website',       desc: 'Build a personal portfolio website with HTML5, CSS3, and responsive design.', type: 'assignment', pts: 120, week: 26 },
      { title: 'JavaScript Interactive Features',         desc: 'Add JavaScript interactivity to your website: form validation, dynamic content.', type: 'assignment', pts: 100, week: 29 },
      { title: 'Semester 2 Exam: DB & Web Dev',           desc: 'Exam on database concepts, SQL, HTML/CSS, and JavaScript fundamentals.', type: 'quiz', pts: 80, week: 32 },
      { title: 'Final Project: Full-Stack Application',   desc: 'Build a complete web application with frontend, backend, and database integration.', type: 'assignment', pts: 200, week: 36 },
    ]
  }
};

// ════════════════════════════════════════════════════════════════════
// STUDENT PERFORMANCE PROFILES
// ════════════════════════════════════════════════════════════════════
function studentProfile(idx) {
  const profiles = [
    { min: 88, max: 100, sub: 0.95, att: 0.97 },
    { min: 82, max: 96,  sub: 0.93, att: 0.95 },
    { min: 75, max: 92,  sub: 0.90, att: 0.93 },
    { min: 70, max: 88,  sub: 0.88, att: 0.92 },
    { min: 78, max: 95,  sub: 0.92, att: 0.94 },
    { min: 85, max: 98,  sub: 0.95, att: 0.96 },
    { min: 60, max: 80,  sub: 0.80, att: 0.85 },
    { min: 72, max: 90,  sub: 0.87, att: 0.91 },
    { min: 80, max: 94,  sub: 0.91, att: 0.93 },
    { min: 65, max: 85,  sub: 0.83, att: 0.88 },
    { min: 90, max: 100, sub: 0.97, att: 0.98 },
    { min: 68, max: 86,  sub: 0.85, att: 0.90 },
    { min: 76, max: 93,  sub: 0.90, att: 0.92 },
    { min: 82, max: 97,  sub: 0.94, att: 0.96 },
    { min: 73, max: 89,  sub: 0.88, att: 0.91 },
  ];
  return profiles[idx % profiles.length];
}

const FEEDBACK = [
  { min: 90, msgs: ['Excellent work! Outstanding performance.','Great job! Keep up the excellent work.','Perfect! Very impressive.','Well done! You clearly understand the material.'] },
  { min: 80, msgs: ['Good job! Solid understanding shown.','Well done, keep it up!','Nice work. A few minor areas to polish.','Good effort! Almost there.'] },
  { min: 70, msgs: ['Satisfactory work. Review the weak areas.','Fair effort, but more practice needed.','Acceptable, but you can do better.','Decent work. Focus on the concepts you missed.'] },
  { min: 0,  msgs: ['Needs significant improvement.','Please review the material and seek help.','Below expectations. Let\'s discuss after class.','You need to put in more effort. See me for extra help.'] },
];

function getFeedback(pct) {
  for (const f of FEEDBACK) {
    if (pct >= f.min) return f.msgs[Math.floor(Math.random() * f.msgs.length)];
  }
  return 'Please try harder.';
}

const SUBMISSION_CONTENT = {
  'assignment': [
    'Here is my completed assignment. I have solved all the problems as instructed.',
    'Please find my work attached. I followed the instructions carefully.',
    'I have completed all the required exercises. Looking forward to your feedback.',
    'My assignment is ready for review. I double-checked my work.',
    'Submitting my completed work. I spent considerable time on this.',
  ],
  'quiz': [
    'Submitting my quiz answers.',
    'Here are my quiz responses.',
    'My answers for the quiz are submitted.',
    'Quiz completed and submitted.',
  ]
};

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const weekToDate = (week) => {
  const d = new Date(2025, 8, 1);
  d.setDate(d.getDate() + (week - 1) * 7);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
};

function getSchoolDays(untilDate) {
  const days = [];
  let d = new Date(2025, 8, 1);
  while (d <= untilDate) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

const DOW_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════
async function seed() {
  console.log('\n🚀  FULL YEAR DATA SEEDING\n' + '═'.repeat(60));

  await mongoose.connect(MONGO_URI);
  console.log('📦  Connected to MongoDB:', MONGO_URI.split('/').pop());

  // ── CLEAN ─────────────────────────────────────────
  console.log('\n🗑️   Clearing old data (preserving admins)...');
  await Promise.all([
    Submission.deleteMany({}),
    Attendance.deleteMany({}),
    Announcement.deleteMany({}),
    Schedule.deleteMany({}),
    ClassGradeModel.deleteMany({}),
    UserModel.deleteMany({ role: { $in: ['student','teacher','parent'] } }),
  ]);

  // Reset the studentId counter so IDs start fresh from 10000001
  await CounterModel.findByIdAndUpdate(
    'studentId',
    { sequenceValue: 10000000 },
    { upsert: true }
  );
  console.log('   ✓ Counter reset to 10000000');

  // ── TEACHERS ──────────────────────────────────────
  console.log('\n👨‍🏫  Creating 7 teachers...');
  const hash = await bcrypt.hash(PASSWORD, 10);
  const teacherDocs = [];
  const teacherBySubject = {};
  for (const t of TEACHERS) {
    const doc = await UserModel.create({
      name: t.name, email: t.email, password: hash,
      gender: t.gender, role: 'teacher', subjects: t.subjects,
      dateOfBirth: new Date(t.dob),
    });
    teacherDocs.push(doc);
    t.subjects.forEach(s => teacherBySubject[s] = doc);
    console.log(`   ✓ ${doc.name}  →  ${t.email}`);
  }

  // ── STUDENTS + PARENTS  (sequential IDs via Counter) ──────────
  console.log('\n👨‍🎓  Creating 30 students + 30 parents (sequential IDs)...');
  const studentDocs = [];
  const parentDocs = [];
  const emailMap = [];

  for (const s of STUDENTS) {
    const studentId = await CounterModel.getNextSequence('studentId');
    const studentEmail = `${studentId}@student.com`;
    const parentEmail  = `${studentId}@parent.com`;

    // Create parent first
    const parent = await UserModel.create({
      name: `${s.name}'s Parent`, email: parentEmail, password: hash,
      gender: s.gender === 'male' ? 'male' : 'female',
      role: 'parent',
      dateOfBirth: new Date('1978-06-15'),
      mustChangePassword: false, children: [],
    });

    // Create student
    const student = await UserModel.create({
      name: s.name, email: studentEmail, password: hash,
      gender: s.gender, role: 'student',
      classGrade: 'grade12', classSection: s.sec,
      dateOfBirth: new Date(s.dob), parent: parent._id,
    });

    // Link parent ← child
    parent.children = [student._id];
    await parent.save();

    // Create ClassGrade record
    await ClassGradeModel.create({
      student: student._id,
      classGrade: 'grade12',
      classSection: s.sec,
    });

    studentDocs.push(student);
    parentDocs.push(parent);
    emailMap.push({ name: s.name, sec: s.sec, studentEmail, parentEmail });
  }

  const secA = studentDocs.filter(s => s.classSection === 'A');
  const secB = studentDocs.filter(s => s.classSection === 'B');
  console.log(`   ✓ Section A: ${secA.length} students   Section B: ${secB.length} students`);

  // ── SCHEDULES ─────────────────────────────────────
  console.log('\n📅  Creating weekly timetable...');
  let schedCount = 0;
  for (const [day, subjects] of Object.entries(TIMETABLE)) {
    for (let i = 0; i < subjects.length; i++) {
      const subj = subjects[i];
      const slot = SLOTS[i];
      const teacher = teacherBySubject[subj];
      for (const sec of ['A','B']) {
        const studs = sec === 'A' ? secA : secB;
        await Schedule.create({
          teacher: teacher._id, subject: subj, dayOfWeek: day,
          startTime: slot.start, endTime: slot.end,
          classGrade: 'grade12', classSection: sec,
          student: studs.map(s => s._id),
        });
        schedCount++;
      }
    }
  }
  console.log(`   ✓ ${schedCount} schedule slots created`);

  // ── ASSIGNMENTS & QUIZZES ─────────────────────────
  console.log('\n📝  Creating assignments & quizzes...');
  const allAnnouncements = [];
  let annCount = 0;
  const NOW = new Date();

  for (const [subject, semesters] of Object.entries(CURRICULUM)) {
    const teacher = teacherBySubject[subject];
    const items = [...semesters.semester1, ...semesters.semester2];

    for (const item of items) {
      const dueDate = weekToDate(item.week);
      const createdAt = new Date(dueDate);
      createdAt.setDate(createdAt.getDate() - rand(5, 10));

      for (const sec of ['A','B']) {
        const targets = sec === 'A' ? secA : secB;
        const doc = await Announcement.create({
          teacher: teacher._id, subject, type: item.type,
          title: item.title, description: item.desc,
          dueDate, totalPoints: item.pts,
          targetStudents: targets.map(s => s._id),
          status: 'published',
          priority: item.type === 'quiz' ? 'high' : 'medium',
          createdAt, updatedAt: createdAt,
        });
        allAnnouncements.push({ doc, section: sec, dueDate, subject });
        annCount++;
      }
    }
    console.log(`   ✓ ${subject}: ${items.length * 2} items`);
  }
  console.log(`   Total: ${annCount} announcements`);

  // ── SUBMISSIONS ───────────────────────────────────
  console.log('\n📤  Creating student submissions...');
  let subCount = 0, pendingCount = 0;

  for (const { doc: ann, section, dueDate, subject } of allAnnouncements) {
    if (dueDate > NOW) {
      pendingCount += (section === 'A' ? secA.length : secB.length);
      continue;
    }
    const students = section === 'A' ? secA : secB;
    const teacher = teacherBySubject[subject];

    for (let si = 0; si < students.length; si++) {
      const stu = students[si];
      const prof = studentProfile(si);
      if (Math.random() > prof.sub) continue;

      const isLate = Math.random() < 0.08;
      const submittedAt = new Date(dueDate);
      if (isLate) submittedAt.setDate(submittedAt.getDate() + rand(1, 3));
      else submittedAt.setDate(submittedAt.getDate() - rand(0, 4));

      let pct = rand(prof.min, prof.max);
      if (isLate) pct = Math.max(40, pct - rand(5, 15));
      const grade = Math.round((pct / 100) * ann.totalPoints);
      const content = pick(SUBMISSION_CONTENT[ann.type] || SUBMISSION_CONTENT['assignment']);
      const gradedAt = new Date(dueDate);
      gradedAt.setDate(gradedAt.getDate() + rand(2, 7));

      try {
        await Submission.create({
          announcement: ann._id, student: stu._id,
          content, submittedAt,
          grade, feedback: getFeedback(pct),
          gradedBy: teacher._id, gradedAt,
          status: 'graded', isLate,
        });
        subCount++;
      } catch (e) {
        if (e.code !== 11000) console.error(e.message);
      }
    }
  }
  console.log(`   ✓ ${subCount} graded submissions`);
  console.log(`   ⏳ ${pendingCount} pending (future)`);

  // ── ATTENDANCE ────────────────────────────────────
  console.log('\n📋  Creating attendance records (Sep 2025 → today)...');
  const schoolDays = getSchoolDays(NOW);
  let attCount = 0;
  let batchOps = [];

  for (const day of schoolDays) {
    const dowName = DOW_NAMES[day.getDay()];
    const daySubjects = TIMETABLE[dowName];
    if (!daySubjects) continue;

    for (const subj of daySubjects) {
      const teacher = teacherBySubject[subj];
      const slot = SLOTS[daySubjects.indexOf(subj)];

      for (const sec of ['A','B']) {
        const students = sec === 'A' ? secA : secB;
        for (let si = 0; si < students.length; si++) {
          const stu = students[si];
          const prof = studentProfile(si);

          let status;
          const r = Math.random();
          if (r < prof.att)             status = 'present';
          else if (r < prof.att + 0.03) status = 'late';
          else if (r < prof.att + 0.05) status = 'excused';
          else                          status = 'absent';

          batchOps.push({
            insertOne: {
              document: {
                teacher: teacher._id, student: stu._id,
                subject: subj, date: new Date(day),
                status,
                checkInTime: (status === 'present' || status === 'late') ? new Date(day) : null,
                classTime: { startTime: slot.start, endTime: slot.end },
              }
            }
          });
        }
      }
    }

    if (batchOps.length >= 5000) {
      try {
        const result = await Attendance.bulkWrite(batchOps, { ordered: false });
        attCount += result.insertedCount;
      } catch (e) {
        if (e.insertedCount) attCount += e.insertedCount;
      }
      batchOps = [];
      process.stdout.write(`   ... ${attCount} records so far\r`);
    }
  }
  if (batchOps.length > 0) {
    try {
      const result = await Attendance.bulkWrite(batchOps, { ordered: false });
      attCount += result.insertedCount;
    } catch (e) {
      if (e.insertedCount) attCount += e.insertedCount;
    }
  }
  console.log(`   ✓ ${attCount} attendance records                    `);

  // ════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('📊  SEEDING COMPLETE\n');
  console.log(`   👨‍🏫  Teachers:        ${teacherDocs.length}`);
  console.log(`   👨‍🎓  Students:        ${studentDocs.length}  (15 × 2 sections)`);
  console.log(`   👨‍👩‍👧  Parents:         ${parentDocs.length}`);
  console.log(`   📅  Schedule slots:  ${schedCount}`);
  console.log(`   📝  Assignments:     ${annCount}`);
  console.log(`   📤  Submissions:     ${subCount}`);
  console.log(`   📋  Attendance:      ${attCount}`);
  console.log(`   ⏳  Pending work:    ${pendingCount} (future due dates)`);

  console.log('\n' + '═'.repeat(70));
  console.log('🔐  ALL PASSWORDS: ' + PASSWORD);
  console.log('═'.repeat(70));

  // ── TEACHER TABLE ──
  console.log('\n   ┌─ TEACHERS ──────────────────────────────────────────────────────┐');
  console.log('   │  Name                      │ Email                    │ Subject          │');
  console.log('   ├────────────────────────────┼──────────────────────────┼──────────────────┤');
  for (const t of TEACHERS) {
    console.log(`   │  ${t.name.padEnd(26)}│ ${t.email.padEnd(24)} │ ${t.subjects[0].padEnd(16)} │`);
  }
  console.log('   └────────────────────────────┴──────────────────────────┴──────────────────┘');

  // ── STUDENT & PARENT TABLE ──
  console.log('\n   ┌─ STUDENTS & PARENTS ─────────────────────────────────────────────────────────┐');
  console.log('   │  Name                  │ Student Email          │ Parent Email           │ Sec │');
  console.log('   ├────────────────────────┼────────────────────────┼────────────────────────┼─────┤');
  for (const e of emailMap) {
    console.log(`   │  ${e.name.padEnd(22)}│ ${e.studentEmail.padEnd(22)} │ ${e.parentEmail.padEnd(22)} │  ${e.sec}  │`);
  }
  console.log('   └────────────────────────┴────────────────────────┴────────────────────────┴─────┘');

  await mongoose.disconnect();
  console.log('\n📦  Disconnected.\n');
}

seed().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
