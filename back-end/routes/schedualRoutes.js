import express from 'express';
import {
  // Teacher Schedule Management
  createTeacherSchedule,
  getAllSchedules,
  updateSchedule,
  getTeacherAssignedClasses,
  
  // Weekly Template Management
  createWeeklyScheduleTemplate,
  getWeeklyScheduleTemplate,
  getAllWeeklyScheduleTemplates,
  deleteWeeklyScheduleTemplate,
  
  // Student Enrollment
  enrollStudentInGradeSection,
  bulkEnrollStudents,
  
  // Schedule Viewing
  getStudentSchedule,
  getTeacherSchedule,
  getGradeSectionSchedule,
  
  // Schedule Management
  deleteSchedule,
  removeStudentFromSchedule,
  
  // Schedule Settings
  getScheduleSettings,
  updateScheduleSettings,
  resetScheduleSettings
} from '../controllers/schedualController.js';
import { protectRoute } from '../middleware/auth.js';
import UserModel from '../models/UserModels.js';
import Schedule from '../models/schedual.js';
import AnnouncementModel from '../models/Announcement.js';
import SubmissionModel from '../models/submission.js';

const router = express.Router();

// ============================================================================
// TEACHER SCHEDULE ROUTES (Protected - Admin only)
// ============================================================================
router.post('/teacher', protectRoute, createTeacherSchedule);
router.get('/all', protectRoute, getAllSchedules);
router.get('/my-classes', protectRoute, getTeacherAssignedClasses);

// ============================================================================
// WEEKLY TEMPLATE ROUTES
// ============================================================================
router.post('/template', protectRoute, createWeeklyScheduleTemplate);
router.get('/templates', getAllWeeklyScheduleTemplates);
router.get('/template/:classGrade/:classSection', getWeeklyScheduleTemplate);
router.delete('/template/:id', protectRoute, deleteWeeklyScheduleTemplate);

// ============================================================================
// STUDENT ENROLLMENT ROUTES
// ============================================================================
router.post('/enroll-student', protectRoute, enrollStudentInGradeSection);
router.post('/enroll-students-bulk', protectRoute, bulkEnrollStudents);

// ============================================================================
// SCHEDULE VIEWING ROUTES
// ============================================================================
router.get('/student/:studentId', getStudentSchedule);
router.get('/teacher/:teacherId', getTeacherSchedule);
router.get('/grade/:classGrade/:classSection', getGradeSectionSchedule);

// ============================================================================
// SCHEDULE MANAGEMENT ROUTES
// ============================================================================
router.put('/:id', updateSchedule);
router.delete('/:id', deleteSchedule);
router.delete('/:scheduleId/student/:studentId', protectRoute, removeStudentFromSchedule);

// ============================================================================
// SCHEDULE SETTINGS ROUTES (Admin only for update/reset)
// ============================================================================
router.get('/settings', getScheduleSettings);
router.put('/settings', protectRoute, updateScheduleSettings);
router.post('/settings/reset', protectRoute, resetScheduleSettings);

// ============================================================================
// PARENT ROUTES
// ============================================================================

// Get child summary for parent dashboard
router.get('/parent/child/:childId/summary', protectRoute, async (req, res) => {
  try {
    const parentId = req.userId;
    const { childId } = req.params;

    // Verify parent
    const parent = await UserModel.findById(parentId);
    if (!parent || parent.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied. Parents only.' });
    }

    // Verify child belongs to parent
    const isChildOfParent = parent.children?.some(c => c.toString() === childId);
    if (!isChildOfParent) {
      return res.status(403).json({ message: 'Access denied. This is not your child.' });
    }

    // Get child info
    const child = await UserModel.findById(childId);
    if (!child || child.role !== 'student') {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Get schedule count
    const schedules = await Schedule.find({ student: childId });
    const scheduleCount = schedules.length;

    // Get subject list from schedules
    const subjects = [...new Set(schedules.map(s => s.subject))];

    // Get announcements and calculate grades
    // Use targetStudents to find assignments for this child (same as student endpoint)
    const announcements = await AnnouncementModel.find({
      targetStudents: childId,
      type: { $in: ['assignment', 'quiz'] },
      status: 'published'
    });

    // Get submissions for this student (with populated announcement for totalPoints)
    const submissions = await SubmissionModel.find({
      student: childId
    }).populate('announcement', 'totalPoints subject');

    // Calculate grades
    let totalGrades = 0;
    let gradesCount = 0;
    
    submissions.forEach(sub => {
      if (sub.grade !== undefined && sub.grade !== null) {
        const totalPoints = sub.announcement?.totalPoints || 100;
        const percentage = (sub.grade / totalPoints) * 100;
        totalGrades += percentage;
        gradesCount++;
      }
    });

    const overallAverage = gradesCount > 0 ? Math.round(totalGrades / gradesCount) : 0;
    const totalSubmissions = submissions.length;
    
    // Count pending assignments (not yet submitted, and not past due)
    const submittedAnnouncementIds = submissions.map(s => s.announcement?._id?.toString() || s.announcement?.toString());
    const pendingAssignments = announcements.filter(a => {
      const isSubmitted = submittedAnnouncementIds.includes(a._id.toString());
      if (isSubmitted) return false;
      // If no due date, it's still pending
      if (!a.dueDate) return true;
      // If due date is in the future, it's still pending
      return new Date(a.dueDate) >= new Date();
    }).length;

    res.json({
      success: true,
      summary: {
        scheduleCount,
        subjects,
        overallAverage,
        gradesCount,
        totalSubmissions,
        pendingAssignments
      }
    });
  } catch (error) {
    console.error('Error fetching child summary:', error);
    res.status(500).json({ message: 'Error fetching child summary', error: error.message });
  }
});

// Get child schedule for parent
router.get('/parent/child/:childId/schedule', protectRoute, async (req, res) => {
  try {
    const parentId = req.userId;
    const { childId } = req.params;

    // Verify parent
    const parent = await UserModel.findById(parentId);
    if (!parent || parent.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied. Parents only.' });
    }

    // Verify child belongs to parent
    const isChildOfParent = parent.children?.some(c => c.toString() === childId);
    if (!isChildOfParent) {
      return res.status(403).json({ message: 'Access denied. This is not your child.' });
    }

    // Get schedules for this child
    const schedules = await Schedule.find({ student: childId })
      .populate('teacher', 'name email')
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.json({
      success: true,
      schedules
    });
  } catch (error) {
    console.error('Error fetching child schedule:', error);
    res.status(500).json({ message: 'Error fetching child schedule', error: error.message });
  }
});

export default router;