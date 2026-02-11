import Announcement from '../models/Announcement.js';
import Submission from '../models/submission.js';
import Schedule from '../models/schedual.js';
import UserModel from '../models/UserModels.js';

// Get student dashboard data
export const getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.userId;

    // Get student info
    const student = await UserModel.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get all announcements for this student
    const announcements = await Announcement.find({
      targetStudents: studentId
    }).populate('teacher', 'name').sort({ createdAt: -1 });

    // Get all submissions by this student
    const submissions = await Submission.find({
      student: studentId
    }).populate('announcement', 'title type totalPoints');

    // Calculate stats
    const totalAssignments = announcements.filter(a => a.type === 'assignment').length;
    const totalQuizzes = announcements.filter(a => a.type === 'quiz').length;
    const pendingTasks = announcements.filter(a => 
      !submissions.some(s => s.announcement._id.toString() === a._id.toString())
    ).length;

    // Calculate grades
    const gradedSubmissions = submissions.filter(s => s.status === 'graded' && s.grade !== undefined);
    let averageGrade = 0;
    if (gradedSubmissions.length > 0) {
      const totalPercentage = gradedSubmissions.reduce((sum, s) => {
        const percentage = (s.grade / (s.announcement?.totalPoints || 100)) * 100;
        return sum + percentage;
      }, 0);
      averageGrade = totalPercentage / gradedSubmissions.length;
    }

    // Get upcoming due dates
    const upcomingDeadlines = announcements
      .filter(a => a.dueDate && new Date(a.dueDate) > new Date())
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);

    // Get recent grades
    const recentGrades = submissions
      .filter(s => s.status === 'graded')
      .sort((a, b) => new Date(b.gradedAt) - new Date(a.gradedAt))
      .slice(0, 5);

    res.status(200).json({
      student: {
        name: student.name,
        email: student.email,
        classGrade: student.classGrade,
        classSection: student.classSection
      },
      stats: {
        totalAssignments,
        totalQuizzes,
        pendingTasks,
        averageGrade: averageGrade.toFixed(1),
        totalGraded: gradedSubmissions.length
      },
      upcomingDeadlines,
      recentGrades
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get student schedule
export const getStudentSchedule = async (req, res) => {
  try {
    const studentId = req.userId;

    const schedules = await Schedule.find({ student: studentId })
      .populate('teacher', 'name email subjects')
      .sort({ dayOfWeek: 1, startTime: 1 });

    // Group by day of week
    const scheduleByDay = schedules.reduce((acc, schedule) => {
      if (!acc[schedule.dayOfWeek]) {
        acc[schedule.dayOfWeek] = [];
      }
      acc[schedule.dayOfWeek].push({
        _id: schedule._id,
        subject: schedule.subject,
        teacher: schedule.teacher,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        classGrade: schedule.classGrade,
        classSection: schedule.classSection
      });
      return acc;
    }, {});

    res.status(200).json({
      schedules: scheduleByDay,
      totalClasses: schedules.length
    });
  } catch (error) {
    console.error('Error fetching student schedule:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get student grades
export const getStudentGrades = async (req, res) => {
  try {
    const studentId = req.userId;

    // Get all submissions with grades
    const submissions = await Submission.find({
      student: studentId
    }).populate({
      path: 'announcement',
      select: 'title type subject totalPoints teacher dueDate',
      populate: {
        path: 'teacher',
        select: 'name'
      }
    }).sort({ gradedAt: -1 });

    // Separate graded and pending
    const graded = submissions.filter(s => s.status === 'graded');
    const pending = submissions.filter(s => s.status === 'submitted');

    // Calculate statistics
    let totalPoints = 0;
    let earnedPoints = 0;
    let highestGrade = 0;
    let lowestGrade = 100;

    graded.forEach(s => {
      const maxPoints = s.announcement?.totalPoints || 100;
      const percentage = (s.grade / maxPoints) * 100;
      totalPoints += maxPoints;
      earnedPoints += s.grade;
      if (percentage > highestGrade) highestGrade = percentage;
      if (percentage < lowestGrade) lowestGrade = percentage;
    });

    const averageGrade = graded.length > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    // Group by subject
    const gradesBySubject = {};
    graded.forEach(s => {
      const subject = s.announcement?.subject || 'Unknown';
      if (!gradesBySubject[subject]) {
        gradesBySubject[subject] = {
          submissions: [],
          totalPoints: 0,
          earnedPoints: 0
        };
      }
      gradesBySubject[subject].submissions.push(s);
      gradesBySubject[subject].totalPoints += s.announcement?.totalPoints || 100;
      gradesBySubject[subject].earnedPoints += s.grade;
    });

    res.status(200).json({
      graded,
      pending,
      stats: {
        totalGraded: graded.length,
        averageGrade: averageGrade.toFixed(1),
        highestGrade: graded.length > 0 ? highestGrade.toFixed(1) : 0,
        lowestGrade: graded.length > 0 ? lowestGrade.toFixed(1) : 0,
        pendingCount: pending.length
      },
      gradesBySubject
    });
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get quizzes for student
export const getStudentQuizzes = async (req, res) => {
  try {
    const studentId = req.userId;

    const quizzes = await Announcement.find({
      type: 'quiz',
      targetStudents: studentId
    }).populate('teacher', 'name').sort({ createdAt: -1 });

    // Get submissions for these quizzes
    const submissions = await Submission.find({
      student: studentId,
      announcement: { $in: quizzes.map(q => q._id) }
    });

    const quizzesWithStatus = quizzes.map(quiz => {
      const submission = submissions.find(
        s => s.announcement.toString() === quiz._id.toString()
      );
      return {
        ...quiz.toObject(),
        submitted: !!submission,
        submission: submission || null
      };
    });

    res.status(200).json({ quizzes: quizzesWithStatus });
  } catch (error) {
    console.error('Error fetching student quizzes:', error);
    res.status(500).json({ message: error.message });
  }
};

// Start a quiz attempt
export const startQuizAttempt = async (req, res) => {
  try {
    const studentId = req.userId;
    const { quizId } = req.params;

    const quiz = await Announcement.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.type !== 'quiz') {
      return res.status(400).json({ message: 'This is not a quiz' });
    }

    if (!quiz.targetStudents.includes(studentId)) {
      return res.status(403).json({ message: 'You are not assigned to this quiz' });
    }

    // Check if already submitted
    const existingSubmission = await Submission.findOne({
      announcement: quizId,
      student: studentId
    });

    if (existingSubmission) {
      return res.status(400).json({ message: 'You have already submitted this quiz' });
    }

    // Return quiz questions (without correct answers for non-essay questions)
    const questionsForStudent = quiz.questions.map(q => ({
      _id: q._id,
      question: q.question,
      type: q.type,
      options: q.options,
      points: q.points
      // correctAnswer is intentionally omitted
    }));

    res.status(200).json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        subject: quiz.subject,
        totalPoints: quiz.totalPoints,
        dueDate: quiz.dueDate,
        questions: questionsForStudent
      }
    });
  } catch (error) {
    console.error('Error starting quiz:', error);
    res.status(500).json({ message: error.message });
  }
};

// Submit quiz attempt
export const submitQuizAttempt = async (req, res) => {
  try {
    const studentId = req.userId;
    const { attemptId } = req.params; // This is actually the quiz ID
    const { answers } = req.body;

    const quiz = await Announcement.findById(attemptId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if already submitted
    const existingSubmission = await Submission.findOne({
      announcement: attemptId,
      student: studentId
    });

    if (existingSubmission) {
      return res.status(400).json({ message: 'You have already submitted this quiz' });
    }

    const isLate = quiz.dueDate && new Date() > new Date(quiz.dueDate);

    // Check if quiz can be auto-graded (only MCQ and true-false)
    const hasManualQuestions = quiz.questions.some(q => 
      q.type === 'short-answer' || q.type === 'essay'
    );

    let totalPoints = 0;
    const processedAnswers = answers.map((ans, index) => {
      const question = quiz.questions.find(q => q._id.toString() === ans.questionId) 
        || quiz.questions[index];
      
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

    const submission = new Submission({
      announcement: attemptId,
      student: studentId,
      answers: processedAnswers,
      isLate,
      // If quiz has manual questions, status is 'submitted', else 'graded'
      status: hasManualQuestions ? 'submitted' : 'graded',
      grade: hasManualQuestions ? undefined : totalPoints,
      gradedAt: hasManualQuestions ? undefined : new Date()
    });

    await submission.save();

    const populated = await Submission.findById(submission._id)
      .populate('student', 'name email')
      .populate('announcement', 'title type totalPoints');

    res.status(201).json({
      message: 'Quiz submitted successfully',
      submission: populated,
      autoGraded: !hasManualQuestions,
      score: hasManualQuestions ? null : totalPoints,
      totalPoints: quiz.totalPoints
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: error.message });
  }
};
