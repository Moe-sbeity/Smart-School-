import express from 'express';
import {
  createAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementsByCategory,
  getUserAnnouncements,
  getAnnouncementsForStudent,
  getAdminAnnouncementsForStudent,
  getAdminAnnouncementsForTeacher,
  markAnnouncementAsViewed
} from '../controllers/adminAnnouncmentController.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllAnnouncements);
router.get('/category/:category', getAnnouncementsByCategory);
router.get('/:id', getAnnouncementById);

// NEW: Get admin announcements for logged-in student
router.get('/student/my-announcements', protectRoute, getAdminAnnouncementsForStudent);

// NEW: Get admin announcements for logged-in teacher
router.get('/teacher/my-announcements', protectRoute, getAdminAnnouncementsForTeacher);

// Mark announcement as viewed
router.post('/:id/view', protectRoute, markAnnouncementAsViewed);

// Get announcements for a specific student (by ID)
router.get('/student/:studentId', protectRoute, getAnnouncementsForStudent);

// Protected routes
router.post('/', protectRoute, createAnnouncement);
router.put('/:id', protectRoute, updateAnnouncement);
router.delete('/:id', protectRoute, deleteAnnouncement);
router.get('/user/my-announcements', protectRoute, getUserAnnouncements);

export default router;