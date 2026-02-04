import express from 'express';
import {
    assignStudentClassGrade,
    getStudentClassGrade,
    assignTeacherClassGrade,
    getTeacherClassGrades,
    removeTeacherClassGrade,
    getAllAvailableGrades,
    getAllAvailableSections,
    getStudentsByClassStats
} from '../controllers/classGradeController.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

// IMPORTANT: Specific routes MUST come before dynamic parameter routes
// Available options (must be first) - public for admin use
router.get('/available-grades', getAllAvailableGrades);
router.get('/available-sections', getAllAvailableSections);
router.get('/students-by-class', protectRoute, getStudentsByClassStats);

// Teacher routes (specific paths first)
router.post('/assign-teacherclass', protectRoute, assignTeacherClassGrade);
router.delete('/remove-teacherclass', protectRoute, removeTeacherClassGrade);
router.get('/teacher-grade/:teacherId', protectRoute, getTeacherClassGrades);

// Student routes - public for admin use
router.post('/assign-studentclass', assignStudentClassGrade);

// Dynamic parameter routes MUST be last
router.get('/:studentId', getStudentClassGrade);

export default router;