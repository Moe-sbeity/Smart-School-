import Announcement from '../models/Announcement.js';
import Submission from '../models/submission.js';
import Schedule from '../models/schedual.js';
import UserModel from '../models/UserModels.js';
import { getPaginationParams, paginateArray } from '../utils/pagination.js';
import { notifySubmissionUploaded } from '../utils/notificationService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/announcements';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|txt|ppt|pptx|xls|xlsx|zip/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, documents, and archives are allowed.'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 
  },
  fileFilter: fileFilter
});
const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/submissions';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const uploadSubmission = multer({
  storage: submissionStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 
  },
  fileFilter: fileFilter
});

export const submitAssignment = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const studentId = req.userId;
    const { content, answers } = req.body;

    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (!announcement.targetStudents.includes(studentId)) {
      return res.status(403).json({ message: 'You are not assigned to this task' });
    }

    const existing = await Submission.findOne({
      announcement: announcementId,
      student: studentId
    });

    if (existing) {
      return res.status(400).json({ message: 'You have already submitted this assignment' });
    }

    const isLate = announcement.dueDate && new Date() > new Date(announcement.dueDate);

    // Process uploaded files
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          fileName: file.originalname,
          fileUrl: `/uploads/submissions/${file.filename}`,
          fileType: file.mimetype,
          fileSize: file.size
        });
      });
    }

    let totalPoints = 0;
    let processedAnswers = answers;

    // Parse answers if it's a string (from FormData)
    if (typeof answers === 'string') {
      try {
        processedAnswers = JSON.parse(answers);
      } catch (e) {
        processedAnswers = null;
      }
    }

    // Check if quiz can be auto-graded (only MCQ and true-false questions)
    const isQuiz = announcement.type === 'quiz';
    let hasManualQuestions = false;
    
    if (isQuiz && announcement.questions) {
      hasManualQuestions = announcement.questions.some(q => 
        q.type === 'short-answer' || q.type === 'essay'
      );
    }

    if (isQuiz && processedAnswers) {
      processedAnswers = processedAnswers.map((ans, index) => {
        const question = announcement.questions[index];
        
        if (!question) {
          return {
            questionId: ans.questionId,
            answer: ans.answer,
            isCorrect: false,
            pointsEarned: 0
          };
        }
        
        // Only auto-grade MCQ and true-false questions
        if (question.type === 'multiple-choice' || question.type === 'true-false') {
          const isCorrect = question.correctAnswer === ans.answer;
          const pointsEarned = isCorrect ? question.points : 0;
          totalPoints += pointsEarned;
          
          return {
            questionId: question._id,
            answer: ans.answer,
            isCorrect,
            pointsEarned
          };
        } else {
          // Short-answer and essay need manual grading
          return {
            questionId: question._id,
            answer: ans.answer,
            isCorrect: null, // Null means not yet graded
            pointsEarned: 0 // Will be set by teacher
          };
        }
      });
    }

    // Determine status: auto-grade only pure MCQ quizzes, otherwise needs manual grading
    let submissionStatus = 'submitted';
    let submissionGrade = undefined;
    let gradedAt = undefined;
    
    if (isQuiz && !hasManualQuestions) {
      // Pure MCQ/true-false quiz - auto-grade
      submissionStatus = 'graded';
      submissionGrade = totalPoints;
      gradedAt = new Date();
    }

    const submission = new Submission({
      announcement: announcementId,
      student: studentId,
      content,
      answers: processedAnswers,
      attachments: attachments,
      isLate,
      status: submissionStatus,
      grade: submissionGrade,
      gradedAt: gradedAt
    });

    await submission.save();

    const populated = await Submission.findById(submission._id)
      .populate('student', 'name email')
      .populate('announcement', 'title type totalPoints');

    // Notify teacher about the submission
    try {
      if (announcement.teacher) {
        const student = await UserModel.findById(studentId).select('name classGrade classSection');
        await notifySubmissionUploaded(announcement.teacher, {
          submissionId: submission._id,
          studentName: student?.name || 'A student',
          assignmentTitle: announcement.title,
          className: `Grade ${student?.classGrade || ''} ${student?.classSection || ''}`.trim(),
          submittedAt: new Date()
        });
      }
    } catch (notifError) {
      console.error('Notification failed:', notifError.message);
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      message: 'Submitted successfully',
      submission: populated
    });

  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ message: error.message });
  }
};
export const createAnnouncement = async (req, res) => {
  try {
    const {
      subject,
      type,
      title,
      description,
      dueDate,
      totalPoints,
      questions,
      priority,
      targetStudents,
      targetGrades,
      targetSections
    } = req.body;

    const teacherId = req.userId;

    const teacher = await UserModel.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can create announcements' });
    }

    if (!teacher.subjects.includes(subject)) {
      return res.status(400).json({ 
        message: `You don't teach ${subject}. Your subjects: ${teacher.subjects.join(', ')}` 
      });
    }

    // Parse targetGrades and targetSections if they're strings
    let parsedGrades = targetGrades;
    let parsedSections = targetSections;
    
    if (typeof targetGrades === 'string') {
      try {
        parsedGrades = JSON.parse(targetGrades);
      } catch (e) {
        parsedGrades = [];
      }
    }
    
    if (typeof targetSections === 'string') {
      try {
        parsedSections = JSON.parse(targetSections);
      } catch (e) {
        parsedSections = [];
      }
    }

    let students = targetStudents || [];
    
    // If specific grades/sections are selected, find matching students
    if ((parsedGrades && parsedGrades.length > 0) || (parsedSections && parsedSections.length > 0)) {
      // Build query to find students matching grade/section criteria
      const studentQuery = { role: 'student' };
      
      if (parsedGrades && parsedGrades.length > 0) {
        studentQuery.classGrade = { $in: parsedGrades };
      }
      
      if (parsedSections && parsedSections.length > 0) {
        studentQuery.classSection = { $in: parsedSections };
      }
      
      // Find matching students
      const matchingStudents = await UserModel.find(studentQuery).select('_id');
      students = matchingStudents.map(s => s._id.toString());
      
      if (students.length === 0) {
        return res.status(400).json({ 
          message: `No students found matching the selected grades and sections.` 
        });
      }
    } else if (!targetStudents || targetStudents.length === 0) {
      // No grades/sections specified, fall back to schedule-based targeting
      const schedules = await Schedule.find({
        teacher: teacherId,
        subject: subject
      });

      const studentSet = new Set();
      
      schedules.forEach(schedule => {
        if (schedule.student && Array.isArray(schedule.student)) {
          schedule.student.forEach(studentId => {
            if (studentId) {
              studentSet.add(studentId.toString());
            }
          });
        }
      });

      students = Array.from(studentSet);

      if (students.length === 0) {
        return res.status(400).json({ 
          message: `No students enrolled in your ${subject} classes yet.` 
        });
      }
    }

    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          fileName: file.originalname,
          fileUrl: `/uploads/announcements/${file.filename}`,
          fileType: file.mimetype
        });
      });
    }

    let parsedQuestions = questions;
    if (typeof questions === 'string') {
      try {
        parsedQuestions = JSON.parse(questions);
      } catch (e) {
        parsedQuestions = [];
      }
    }

    const announcement = new Announcement({
      teacher: teacherId,
      subject,
      type,
      title,
      description,
      dueDate,
      totalPoints,
      questions: parsedQuestions,
      priority: priority || 'medium',
      targetStudents: students,
      targetGrades: parsedGrades || [],
      targetSections: parsedSections || [],
      attachments: attachments,
      status: 'published'
    });

    await announcement.save();

    const populated = await Announcement.findById(announcement._id)
      .populate('teacher', 'name email')
      .populate('targetStudents', 'name email');

    res.status(201).json({
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`,
      announcement: populated,
      studentsCount: students.length
    });

  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteFile = (filePath) => {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

export const getTeacherAnnouncements = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { subject, type, status } = req.query;
    const { page, limit } = getPaginationParams(req.query, { page: 1, limit: 10 });

    const filter = { teacher: teacherId };
    if (subject) filter.subject = subject;
    if (type) filter.type = type;
    if (status) filter.status = status;

    // Get total count for pagination
    const totalItems = await Announcement.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;

    const announcements = await Announcement.find(filter)
      .populate('teacher', 'name email')
      .populate('targetStudents', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const announcementsWithStats = await Promise.all(
      announcements.map(async (announcement) => {
        const submissionCount = await Submission.countDocuments({
          announcement: announcement._id
        });

        const gradedCount = await Submission.countDocuments({
          announcement: announcement._id,
          status: 'graded'
        });

        return {
          ...announcement.toObject(),
          submissionCount,
          gradedCount,
          totalStudents: announcement.targetStudents.length
        };
      })
    );

    res.status(200).json({
      announcements: announcementsWithStats,
      count: announcementsWithStats.length,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching teacher announcements:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getStudentAnnouncements = async (req, res) => {
  try {
    const studentId = req.userId;
    const { subject, type } = req.query;
    const { page, limit } = getPaginationParams(req.query, { page: 1, limit: 10 });

    const filter = {
      targetStudents: studentId,
      status: 'published'
    };
    if (subject) filter.subject = subject;
    if (type) filter.type = type;

    // Get total count for pagination
    const totalItems = await Announcement.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;

    const announcements = await Announcement.find(filter)
      .populate('teacher', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const announcementsWithStatus = await Promise.all(
      announcements.map(async (announcement) => {
        const submission = await Submission.findOne({
          announcement: announcement._id,
          student: studentId
        });

        const hasViewed = announcement.viewedBy.some(
          v => v.student.toString() === studentId
        );

        return {
          ...announcement.toObject(),
          hasSubmitted: !!submission,
          submission: submission,
          hasViewed: hasViewed,
          isOverdue: announcement.dueDate && new Date() > new Date(announcement.dueDate)
        };
      })
    );

    res.status(200).json({
      announcements: announcementsWithStatus,
      count: announcementsWithStatus.length,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching student announcements:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const announcement = await Announcement.findById(id)
      .populate('teacher', 'name email subjects')
      .populate('targetStudents', 'name email');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    const isTeacher = announcement.teacher._id.toString() === userId;
    const isStudent = announcement.targetStudents.some(
      s => s._id.toString() === userId
    );

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (isStudent) {
      const hasViewed = announcement.viewedBy.some(
        v => v.student.toString() === userId
      );

      if (!hasViewed) {
        announcement.viewedBy.push({ student: userId });
        await announcement.save();
      }
    }

    let submissions = [];
    if (isTeacher) {
      submissions = await Submission.find({ announcement: id })
        .populate('student', 'name email')
        .sort({ submittedAt: -1 });
    }

    let mySubmission = null;
    if (isStudent) {
      mySubmission = await Submission.findOne({
        announcement: id,
        student: userId
      });
    }

    res.status(200).json({
      announcement,
      submissions: isTeacher ? submissions : undefined,
      mySubmission: isStudent ? mySubmission : undefined,
      submissionCount: submissions.length
    });

  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.userId;
    const updates = req.body;

    const announcement = await Announcement.findOne({
      _id: id,
      teacher: teacherId
    });

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found or access denied' });
    }

    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        fileName: file.originalname,
        fileUrl: `/uploads/announcements/${file.filename}`,
        fileType: file.mimetype
      }));
      
      updates.attachments = [...(announcement.attachments || []), ...newAttachments];
    }

    // Handle questions if it's a string
    if (typeof updates.questions === 'string') {
      try {
        updates.questions = JSON.parse(updates.questions);
      } catch (e) {
        delete updates.questions;
      }
    }

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        announcement[key] = updates[key];
      }
    });

    await announcement.save();

    const updated = await Announcement.findById(id)
      .populate('teacher', 'name email')
      .populate('targetStudents', 'name email');

    res.status(200).json({
      message: 'Announcement updated successfully',
      announcement: updated
    });

  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.userId;

    const announcement = await Announcement.findOneAndDelete({
      _id: id,
      teacher: teacherId
    });

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found or access denied' });
    }

    if (announcement.attachments && announcement.attachments.length > 0) {
      announcement.attachments.forEach(attachment => {
        deleteFile(attachment.fileUrl);
      });
    }

    await Submission.deleteMany({ announcement: id });

    res.status(200).json({ message: 'Announcement deleted successfully' });

  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ message: error.message });
  }
};


export const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const teacherId = req.userId;
    const { grade, feedback } = req.body;

    const submission = await Submission.findById(submissionId)
      .populate('announcement');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    if (submission.announcement.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    submission.grade = grade;
    submission.feedback = feedback;
    submission.gradedBy = teacherId;
    submission.gradedAt = new Date();
    submission.status = 'graded';

    await submission.save();

    const updated = await Submission.findById(submissionId)
      .populate('student', 'name email')
      .populate('announcement', 'title type totalPoints');

    res.status(200).json({
      message: 'Submission graded successfully',
      submission: updated
    });

  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getAnnouncementSubmissions = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const teacherId = req.userId;
    const { page, limit } = getPaginationParams(req.query, { page: 1, limit: 20 });

    const announcement = await Announcement.findOne({
      _id: announcementId,
      teacher: teacherId
    });

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found or access denied' });
    }

    // Get total count for pagination
    const totalItems = await Submission.countDocuments({ announcement: announcementId });
    const totalPages = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;

    const submissions = await Submission.find({ announcement: announcementId })
      .populate('student', 'name email')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      submissions,
      count: submissions.length,
      totalStudents: announcement.targetStudents.length,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: error.message });
  }
};
export const getChildGrades = async (req, res) => {
  try {
    const parentId = req.userId;
    const { childId } = req.params;

    // Verify parent-child relationship
    const parent = await UserModel.findById(parentId);
    if (!parent || parent.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied. Parents only.' });
    }

    const isParentOfChild = parent.children.some(
      child => child.toString() === childId
    );

    if (!isParentOfChild) {
      return res.status(403).json({ message: 'You can only view your own children\'s grades' });
    }

    // Get all graded submissions for the child
    const submissions = await Submission.find({
      student: childId,
      status: 'graded'
    })
      .populate({
        path: 'announcement',
        select: 'title subject type totalPoints dueDate',
        populate: {
          path: 'teacher',
          select: 'name'
        }
      })
      .sort({ gradedAt: -1 });

    // Calculate statistics by subject
    const gradesBySubject = {};
    
    submissions.forEach(submission => {
      const subject = submission.announcement.subject;
      
      if (!gradesBySubject[subject]) {
        gradesBySubject[subject] = {
          subject,
          assignments: [],
          totalPoints: 0,
          earnedPoints: 0,
          count: 0,
          average: 0
        };
      }

      gradesBySubject[subject].assignments.push({
        title: submission.announcement.title,
        type: submission.announcement.type,
        grade: submission.grade,
        totalPoints: submission.announcement.totalPoints,
        percentage: submission.announcement.totalPoints > 0 
          ? ((submission.grade / submission.announcement.totalPoints) * 100).toFixed(1)
          : 0,
        gradedAt: submission.gradedAt,
        feedback: submission.feedback,
        teacher: submission.announcement.teacher.name,
        isLate: submission.isLate
      });

      gradesBySubject[subject].totalPoints += submission.announcement.totalPoints || 0;
      gradesBySubject[subject].earnedPoints += submission.grade || 0;
      gradesBySubject[subject].count += 1;
    });

    // Calculate averages
    Object.values(gradesBySubject).forEach(subjectData => {
      if (subjectData.totalPoints > 0) {
        subjectData.average = (
          (subjectData.earnedPoints / subjectData.totalPoints) * 100
        ).toFixed(1);
      }
    });

    // Calculate overall statistics
    const totalEarned = submissions.reduce((sum, s) => sum + (s.grade || 0), 0);
    const totalPossible = submissions.reduce(
      (sum, s) => sum + (s.announcement.totalPoints || 0), 
      0
    );
    const overallAverage = totalPossible > 0 
      ? ((totalEarned / totalPossible) * 100).toFixed(1)
      : 0;

    res.status(200).json({
      bySubject: gradesBySubject,
      overallStatistics: {
        totalAssignments: submissions.length,
        totalEarned,
        totalPossible,
        overallAverage,
        gradedCount: submissions.length
      },
      recentGrades: submissions.slice(0, 10) // Last 10 grades
    });
  } catch (error) {
    console.error('Error fetching child grades:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get child's teacher announcements (for parent dashboard)
export const getChildAnnouncements = async (req, res) => {
  try {
    const parentId = req.userId;
    const { childId } = req.params;

    // Verify parent-child relationship
    const parent = await UserModel.findById(parentId);
    if (!parent || parent.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied. Parents only.' });
    }

    const isParentOfChild = parent.children.some(
      child => child.toString() === childId
    );

    if (!isParentOfChild) {
      return res.status(403).json({ message: 'You can only view your own children\'s announcements' });
    }

    const announcements = await Announcement.find({
      targetStudents: childId,
      status: 'published'
    })
      .populate('teacher', 'name email')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      announcements: announcements,
      count: announcements.length
    });
  } catch (error) {
    console.error('Error fetching child announcements:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all school-wide announcements for year schedule (teacher view)
export const getYearScheduleData = async (req, res) => {
  try {
    const { academicYear } = req.query;
    const teacherId = req.userId;
    
    // Parse academic year to get date range (e.g., "2025-2026" -> Sep 2025 to Aug 2026)
    let startYear = 2025;
    let endYear = 2026;
    if (academicYear) {
      const parts = academicYear.split('-');
      startYear = parseInt(parts[0]);
      endYear = parseInt(parts[1]);
    }
    
    const yearStart = new Date(`${startYear}-09-01`);
    const yearEnd = new Date(`${endYear}-08-31`);
    
    // Build query — filter by teacher if the user is a teacher
    const user = await UserModel.findById(teacherId);
    const query = {
      status: 'published',
      $or: [
        { dueDate: { $gte: yearStart, $lte: yearEnd } },
        { createdAt: { $gte: yearStart, $lte: yearEnd } }
      ]
    };
    
    // Teachers only see their own announcements; admins see all
    if (user && user.role === 'teacher') {
      query.teacher = teacherId;
    }
    
    // Get announcements for the academic year
    const announcements = await Announcement.find(query)
      .populate('teacher', 'name email subjects')
      .populate('targetStudents', 'name classGrade classSection')
      .sort({ dueDate: 1 });
    
    // Get submission stats for each announcement (including grade averages)
    const announcementsWithStats = await Promise.all(
      announcements.map(async (announcement) => {
        const submissionCount = await Submission.countDocuments({
          announcement: announcement._id
        });
        const gradedCount = await Submission.countDocuments({
          announcement: announcement._id,
          status: 'graded'
        });
        
        // Get grade statistics from graded submissions
        const gradeStats = await Submission.aggregate([
          { $match: { announcement: announcement._id, status: 'graded', grade: { $exists: true, $ne: null } } },
          { $group: {
            _id: null,
            avgGrade: { $avg: '$grade' },
            highestGrade: { $max: '$grade' },
            lowestGrade: { $min: '$grade' },
            totalGraded: { $sum: 1 }
          }}
        ]);
        
        const stats = gradeStats[0] || { avgGrade: null, highestGrade: null, lowestGrade: null, totalGraded: 0 };
        const avgPercentage = stats.avgGrade !== null && announcement.totalPoints > 0
          ? Math.round((stats.avgGrade / announcement.totalPoints) * 100)
          : null;
        const highestPercentage = stats.highestGrade !== null && announcement.totalPoints > 0
          ? Math.round((stats.highestGrade / announcement.totalPoints) * 100)
          : null;
        const lowestPercentage = stats.lowestGrade !== null && announcement.totalPoints > 0
          ? Math.round((stats.lowestGrade / announcement.totalPoints) * 100)
          : null;
        
        // Use targetGrades from the model first; fall back to extracting from students
        let grades = announcement.targetGrades || [];
        if (grades.length === 0) {
          grades = [...new Set(
            announcement.targetStudents
              .map(s => s.classGrade)
              .filter(g => g)
          )];
        }
        
        return {
          _id: announcement._id,
          title: announcement.title,
          description: announcement.description,
          type: announcement.type,
          subject: announcement.subject,
          dueDate: announcement.dueDate,
          createdAt: announcement.createdAt,
          totalPoints: announcement.totalPoints,
          priority: announcement.priority,
          status: announcement.status,
          teacher: announcement.teacher,
          targetGrades: grades,
          submissionCount,
          gradedCount,
          totalStudents: announcement.targetStudents.length,
          avgGrade: stats.avgGrade !== null ? Math.round(stats.avgGrade * 10) / 10 : null,
          avgPercentage,
          highestGrade: stats.highestGrade,
          highestPercentage,
          lowestGrade: stats.lowestGrade,
          lowestPercentage,
          submissionRate: announcement.targetStudents.length > 0
            ? Math.round((submissionCount / announcement.targetStudents.length) * 100)
            : 0
        };
      })
    );
    
    // Group by grade
    const byGrade = {};
    announcementsWithStats.forEach(a => {
      const grades = a.targetGrades && a.targetGrades.length > 0 ? a.targetGrades : ['unassigned'];
      grades.forEach(grade => {
        if (!byGrade[grade]) {
          byGrade[grade] = {
            exams: [],
            quizzes: [],
            assignments: []
          };
        }
        if (a.type === 'quiz' && a.totalPoints > 50) {
          byGrade[grade].exams.push(a);
        } else if (a.type === 'quiz') {
          byGrade[grade].quizzes.push(a);
        } else if (a.type === 'assignment') {
          byGrade[grade].assignments.push(a);
        }
      });
    });
    
    // Group by subject
    const bySubject = {};
    announcementsWithStats.forEach(a => {
      if (!bySubject[a.subject]) {
        bySubject[a.subject] = { exams: 0, quizzes: 0, assignments: 0 };
      }
      if (a.type === 'quiz' && a.totalPoints > 50) {
        bySubject[a.subject].exams++;
      } else if (a.type === 'quiz') {
        bySubject[a.subject].quizzes++;
      } else if (a.type === 'assignment') {
        bySubject[a.subject].assignments++;
      }
    });
    
    // Count totals
    const exams = announcementsWithStats.filter(a => a.type === 'quiz' && a.totalPoints > 50);
    const quizzes = announcementsWithStats.filter(a => a.type === 'quiz' && a.totalPoints <= 50);
    const assignments = announcementsWithStats.filter(a => a.type === 'assignment');
    
    res.status(200).json({
      academicYear: `${startYear}-${endYear}`,
      totals: {
        exams: exams.length,
        quizzes: quizzes.length,
        assignments: assignments.length,
        total: announcementsWithStats.length
      },
      byGrade,
      bySubject,
      announcements: announcementsWithStats
    });
  } catch (error) {
    console.error('Error fetching year schedule data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
