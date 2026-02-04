import express from 'express';
import {
  createAnnouncement,
  getTeacherAnnouncements,
  getStudentAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  submitAssignment,
  gradeSubmission,
  getAnnouncementSubmissions,
  getChildGrades,
  upload,
  uploadSubmission,

} from '../controllers/announcmentController.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protectRoute, upload.array('attachments', 5), createAnnouncement);
router.get('/teacher', protectRoute, getTeacherAnnouncements);
router.put('/:id', protectRoute, upload.array('attachments', 5), updateAnnouncement);
router.delete('/:id', protectRoute, deleteAnnouncement);
router.get('/:announcementId/submissions', protectRoute, getAnnouncementSubmissions);
router.post('/:submissionId/grade', protectRoute, gradeSubmission);
router.post('/:announcementId/submit', protectRoute, uploadSubmission.array('files', 5), submitAssignment);


router.get('/student', protectRoute, getStudentAnnouncements);

router.get('/:id', protectRoute, getAnnouncementById);
router.get('/parent/child/:childId/grades', protectRoute, getChildGrades);

export default router;