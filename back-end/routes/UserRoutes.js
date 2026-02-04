import express from 'express';

import {LoginUser,DeleteUser,getSubjects,checkAuth, register,getUserInfo,getUsers,getStudents,getTeachers,getMe,logoutUser,updateProfile,changePassword,getParents,getNextStudentId,updateChildDob,updateUserById} from '../controllers/UserController.js';
import {protectRoute} from '../middleware/auth.js';

const router=express.Router()

router.post('/login', LoginUser);
router.post('/register', register);
router.post('/logout', logoutUser);
router.get('/getUser',protectRoute, getUserInfo);
router.get('/checkAuth', protectRoute, checkAuth);
router.get('/all', protectRoute, getUsers);
router.get('/students', getStudents); // Allow without auth for admin registration/schedule
router.get('/teachers', getTeachers); // Allow without auth for admin schedule
router.get('/parents', protectRoute, getParents);
router.get('/me', protectRoute, getMe);
router.get('/subjects', getSubjects); // Allow without auth for registration form
router.get('/next-student-id', getNextStudentId); // Allow without auth for registration form
router.put('/profile', protectRoute, updateProfile);
router.put('/update-profile', protectRoute, updateProfile);
router.put('/change-password', protectRoute, changePassword);
router.put('/update-child-dob/:childId', protectRoute, updateChildDob);
router.put('/:id', protectRoute, updateUserById);
router.delete('/:id', protectRoute, DeleteUser);



export default router;