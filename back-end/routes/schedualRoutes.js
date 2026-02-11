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
// TEACHER SCHEDULE ROUTES (Public for admin use)
// ============================================================================
router.post('/teacher', createTeacherSchedule);
router.get('/all', getAllSchedules);
router.get('/my-classes', protectRoute, getTeacherAssignedClasses);

// ============================================================================
// WEEKLY TEMPLATE ROUTES
// ============================================================================
router.post('/template', createWeeklyScheduleTemplate);
router.get('/templates', getAllWeeklyScheduleTemplates);
router.get('/template/:classGrade/:classSection', getWeeklyScheduleTemplate);
router.delete('/template/:id', protectRoute, deleteWeeklyScheduleTemplate);

// ============================================================================
// STUDENT ENROLLMENT ROUTES
// ============================================================================
router.post('/enroll-student', enrollStudentInGradeSection);
router.post('/enroll-students-bulk', bulkEnrollStudents);

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
    const isChildOfParent = parent.children?.some(c => c.student?.toString() === childId);
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
    const announcements = await AnnouncementModel.find({
      targetGrade: child.classGrade,
      targetSection: child.classSection,
      announcementType: 'assignment'
    });

    // Get submissions for this student
    const submissions = await SubmissionModel.find({
      student: childId
    });

    // Calculate grades
    let totalGrades = 0;
    let gradesCount = 0;
    
    submissions.forEach(sub => {
      if (sub.grade !== undefined && sub.grade !== null) {
        const percentage = (sub.grade / (sub.totalPoints || 100)) * 100;
        totalGrades += percentage;
        gradesCount++;
      }
    });

    const overallAverage = gradesCount > 0 ? Math.round(totalGrades / gradesCount) : 0;
    const totalSubmissions = submissions.length;
    
    // Count pending assignments
    const submittedAnnouncementIds = submissions.map(s => s.announcement?.toString());
    const pendingAssignments = announcements.filter(a => {
      const dueDate = new Date(a.dueDate);
      return !submittedAnnouncementIds.includes(a._id.toString()) && dueDate >= new Date();
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
    const isChildOfParent = parent.children?.some(c => c.student?.toString() === childId);
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