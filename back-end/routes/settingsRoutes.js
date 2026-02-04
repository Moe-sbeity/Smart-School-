import express from 'express';
import {
    getSettings,
    updateSettings,
    updateSection,
    getSection,
    addFAQ,
    updateFAQ,
    deleteFAQ,
    addRequirement,
    deleteRequirement,
    resetToDefaults
} from '../controllers/settingsController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public routes (for frontend to load settings)
router.get('/', getSettings);
router.get('/section/:section', getSection);

// Admin only routes
router.put('/', protect, adminOnly, updateSettings);
router.put('/section/:section', protect, adminOnly, updateSection);

// FAQ management
router.post('/faqs', protect, adminOnly, addFAQ);
router.put('/faqs/:faqId', protect, adminOnly, updateFAQ);
router.delete('/faqs/:faqId', protect, adminOnly, deleteFAQ);

// Requirements management
router.post('/requirements', protect, adminOnly, addRequirement);
router.delete('/requirements/:index', protect, adminOnly, deleteRequirement);

// Reset to defaults
router.post('/reset', protect, adminOnly, resetToDefaults);

export default router;
