import express from 'express';
import {
  // Teacher Schedule Management
  createTeacherSchedule,
  getAllSchedules,
  updateSchedule,
  
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

const router = express.Router();

// ============================================================================
// TEACHER SCHEDULE ROUTES (Public for admin use)
// ============================================================================
router.post('/teacher', createTeacherSchedule);
router.get('/all', getAllSchedules);

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

export default router;