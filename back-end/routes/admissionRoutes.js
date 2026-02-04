import express from 'express';
const router = express.Router();
import {
    submitAdmission,
    getAllAdmissions,
    getAdmissionById,
    updateAdmissionStatus,
    deleteAdmission,
    getAdmissionStats
} from '../controllers/admisiionController.js';
import { protectRoute } from '../middleware/auth.js';
router.post('/submit', submitAdmission);

router.get('/', protectRoute ,getAllAdmissions);
router.get('/stats', protectRoute,  getAdmissionStats);
router.get('/:id', protectRoute, getAdmissionById);
router.put('/:id', protectRoute,  updateAdmissionStatus);
router.delete('/:id', protectRoute, deleteAdmission);

export default router;