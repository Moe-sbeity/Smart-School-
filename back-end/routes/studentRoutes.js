import express from 'express';
import {
  getStudentSchedule,
  getStudentGrades,
  
  getStudentQuizzes,
  startQuizAttempt,
  submitQuizAttempt,
  getStudentDashboard,
} from '../controllers/studentController.js';
import { protectRoute, isStudent } from '../middleware/auth.js';

const router = express.Router();

router.use(protectRoute);

router.get('/dashboard', getStudentDashboard);

router.get('/schedule', getStudentSchedule);

router.get('/grades', getStudentGrades);


router.get('/quizzes', getStudentQuizzes);
router.post('/quizzes/:quizId/start', startQuizAttempt);
router.post('/quiz-attempts/:attemptId/submit', submitQuizAttempt);

export default router;