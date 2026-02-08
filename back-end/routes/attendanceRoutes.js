import express from 'express';
import AttendanceModel from '../models/attendance.js';
import UserModel from '../models/UserModels.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

// Mark attendance for a single student
router.post('/mark', protectRoute, async (req, res) => {
    try {
        const { studentId, subject, status, notes, classTime } = req.body;
        const teacherId = req.userId;
        // Verify teacher
        const teacher = await UserModel.findById(teacherId);
        if (!teacher || teacher.role !== 'teacher') {
            return res.status(403).json({ message: 'Only teachers can mark attendance' });
        }

        // Verify teacher teaches this subject
        if (!teacher.subjects.includes(subject)) {
            return res.status(403).json({ message: 'You do not teach this subject' });
        }

        // Verify student exists
        const student = await UserModel.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Get today's date at midnight for consistent date comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if attendance already exists for this student, subject, and date
        let attendance = await AttendanceModel.findOne({
            student: studentId,
            subject: subject,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (attendance) {
            // Update existing attendance
            attendance.status = status;
            attendance.notes = notes || '';
            attendance.teacher = teacherId;
            if (status === 'present' || status === 'late') {
                attendance.checkInTime = new Date();
            }
            if (classTime) {
                attendance.classTime = classTime;
            }
            await attendance.save();
        } else {
            // Create new attendance record
            attendance = new AttendanceModel({
                teacher: teacherId,
                student: studentId,
                subject,
                date: today,
                status,
                notes: notes || '',
                checkInTime: (status === 'present' || status === 'late') ? new Date() : null,
                classTime: classTime || {}
            });
            await attendance.save();
        }

        await attendance.populate('student', 'name email');
        await attendance.populate('teacher', 'name');

        res.status(201).json({
            message: 'Attendance marked successfully',
            attendance
        });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ message: 'Error marking attendance', error: error.message });
    }
});

// Mark attendance for multiple students (bulk)
router.post('/mark-bulk', protectRoute, async (req, res) => {
    try {
        const { attendanceRecords, subject, classTime } = req.body;
        // attendanceRecords: [{ studentId, status, notes }]
        const teacherId = req.userId;

        const teacher = await UserModel.findById(teacherId);
        if (!teacher || teacher.role !== 'teacher') {
            return res.status(403).json({ message: 'Only teachers can mark attendance' });
        }

        if (!teacher.subjects.includes(subject)) {
            return res.status(403).json({ message: 'You do not teach this subject' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const results = [];
        const errors = [];

        for (const record of attendanceRecords) {
            try {
                const { studentId, status, notes } = record;

                // Check if attendance already exists
                let attendance = await AttendanceModel.findOne({
                    student: studentId,
                    subject: subject,
                    date: {
                        $gte: today,
                        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                    }
                });

                if (attendance) {
                    attendance.status = status;
                    attendance.notes = notes || '';
                    attendance.teacher = teacherId;
                    if (status === 'present' || status === 'late') {
                        attendance.checkInTime = new Date();
                    }
                    if (classTime) {
                        attendance.classTime = classTime;
                    }
                    await attendance.save();
                } else {
                    attendance = new AttendanceModel({
                        teacher: teacherId,
                        student: studentId,
                        subject,
                        date: today,
                        status,
                        notes: notes || '',
                        checkInTime: (status === 'present' || status === 'late') ? new Date() : null,
                        classTime: classTime || {}
                    });
                    await attendance.save();
                }

                await attendance.populate('student', 'name email');
                results.push(attendance);
            } catch (error) {
                errors.push({ studentId: record.studentId, error: error.message });
            }
        }

        res.status(201).json({
            message: `Attendance marked for ${results.length} students`,
            results,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Error marking bulk attendance:', error);
        res.status(500).json({ message: 'Error marking bulk attendance', error: error.message });
    }
});

// Get weekly attendance statistics (for admin dashboard)
router.get('/weekly-stats', protectRoute, async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Get the start of the current week (Monday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);

        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const weeklyData = [];

        for (let i = 0; i < 5; i++) {
            const dayStart = new Date(monday);
            dayStart.setDate(monday.getDate() + i);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayStart.getDate() + 1);

            const presentCount = await AttendanceModel.countDocuments({
                date: { $gte: dayStart, $lt: dayEnd },
                status: { $in: ['present', 'late'] }
            });

            const absentCount = await AttendanceModel.countDocuments({
                date: { $gte: dayStart, $lt: dayEnd },
                status: { $in: ['absent', 'excused'] }
            });

            weeklyData.push({
                day: dayNames[i],
                present: presentCount,
                absent: absentCount
            });
        }

        res.json({ data: weeklyData });
    } catch (error) {
        console.error('Error fetching weekly stats:', error);
        res.status(500).json({ message: 'Error fetching weekly stats', error: error.message });
    }
});

// Get attendance status statistics (for admin dashboard)
router.get('/status-stats', protectRoute, async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const stats = {
            present: await AttendanceModel.countDocuments({ status: 'present' }),
            absent: await AttendanceModel.countDocuments({ status: 'absent' }),
            late: await AttendanceModel.countDocuments({ status: 'late' }),
            excused: await AttendanceModel.countDocuments({ status: 'excused' })
        };

        res.json({ stats });
    } catch (error) {
        console.error('Error fetching attendance status stats:', error);
        res.status(500).json({ message: 'Error fetching attendance stats', error: error.message });
    }
});

// Get student's own attendance statistics (for student dashboard)
router.get('/my-stats', protectRoute, async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId);
        if (!user || user.role !== 'student') {
            return res.status(403).json({ message: 'Student access required' });
        }

        const stats = {
            present: await AttendanceModel.countDocuments({ student: req.userId, status: 'present' }),
            absent: await AttendanceModel.countDocuments({ student: req.userId, status: 'absent' }),
            late: await AttendanceModel.countDocuments({ student: req.userId, status: 'late' }),
            excused: await AttendanceModel.countDocuments({ student: req.userId, status: 'excused' })
        };

        res.json({ stats });
    } catch (error) {
        console.error('Error fetching student attendance stats:', error);
        res.status(500).json({ message: 'Error fetching attendance stats', error: error.message });
    }
});

// Get attendance for a specific date and subject (for teachers)
router.get('/by-date', protectRoute, async (req, res) => {
    try {
        const { date, subject } = req.query;
        const teacherId = req.userId;
        const teacher = await UserModel.findById(teacherId);
        if (!teacher || teacher.role !== 'teacher') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const query = {
            teacher: teacherId,
            date: {
                $gte: targetDate,
                $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
            }
        };

        if (subject) {
            query.subject = subject;
        }

        const attendance = await AttendanceModel.find(query)
            .populate('student', 'name email')
            .sort({ createdAt: -1 });

        res.json({ attendance });
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ message: 'Error fetching attendance', error: error.message });
    }
});

// Get attendance history for a student
router.get('/student/:studentId', protectRoute, async (req, res) => {
    try {
        const { studentId } = req.params;
        const { subject, startDate, endDate } = req.query;

        const query = { student: studentId };

        if (subject) {
            query.subject = subject;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                query.date.$lte = new Date(endDate);
            }
        }

        const attendance = await AttendanceModel.find(query)
            .populate('teacher', 'name')
            .sort({ date: -1 });

        // Calculate statistics
        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'present').length;
        const absent = attendance.filter(a => a.status === 'absent').length;
        const late = attendance.filter(a => a.status === 'late').length;
        const excused = attendance.filter(a => a.status === 'excused').length;
        const attendanceRate = total > 0 ? ((present + late) / total * 100).toFixed(2) : 0;

        res.json({
            attendance,
            statistics: {
                total,
                present,
                absent,
                late,
                excused,
                attendanceRate: `${attendanceRate}%`
            }
        });
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).json({ message: 'Error fetching student attendance', error: error.message });
    }
});

// Get attendance statistics for teacher's classes
router.get('/statistics', protectRoute, async (req, res) => {
    try {
        const teacherId = req.userId; 
        const { subject, startDate, endDate } = req.query;

        const teacher = await UserModel.findById(teacherId);
        if (!teacher || teacher.role !== 'teacher') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const query = { teacher: teacherId };

        if (subject) {
            query.subject = subject;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                query.date.$lte = new Date(endDate);
            }
        }

        const attendance = await AttendanceModel.find(query);

        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'present').length;
        const absent = attendance.filter(a => a.status === 'absent').length;
        const late = attendance.filter(a => a.status === 'late').length;
        const excused = attendance.filter(a => a.status === 'excused').length;

        // Group by subject
        const bySubject = {};
        attendance.forEach(att => {
            if (!bySubject[att.subject]) {
                bySubject[att.subject] = {
                    total: 0,
                    present: 0,
                    absent: 0,
                    late: 0,
                    excused: 0
                };
            }
            bySubject[att.subject].total++;
            bySubject[att.subject][att.status]++;
        });

        res.json({
            overall: {
                total,
                present,
                absent,
                late,
                excused,
                attendanceRate: total > 0 ? ((present + late) / total * 100).toFixed(2) + '%' : '0%'
            },
            bySubject
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ message: 'Error fetching statistics', error: error.message });
    }
});

// Update attendance record
router.put('/:attendanceId', protectRoute, async (req, res) => {
    try {
        const { attendanceId } = req.params;
        const { status, notes } = req.body;
        const teacherId = req.userId;
        const attendance = await AttendanceModel.findById(attendanceId);
        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        // Verify teacher owns this record
        if (attendance.teacher.toString() !== teacherId) {
            return res.status(403).json({ message: 'You can only update your own attendance records' });
        }

        if (status) attendance.status = status;
        if (notes !== undefined) attendance.notes = notes;

        if (status === 'present' || status === 'late') {
            attendance.checkInTime = new Date();
        }

        await attendance.save();
        await attendance.populate('student', 'name email');

        res.json({
            message: 'Attendance updated successfully',
            attendance
        });
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ message: 'Error updating attendance', error: error.message });
    }
});

// Delete attendance record
router.delete('/:attendanceId', protectRoute, async (req, res) => {
    try {
        const { attendanceId } = req.params;
        const teacherId = req.userId;
        const attendance = await AttendanceModel.findById(attendanceId);
        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        if (attendance.teacher.toString() !== teacherId) {
            return res.status(403).json({ message: 'You can only delete your own attendance records' });
        }

        await attendance.deleteOne();

        res.json({ message: 'Attendance record deleted successfully' });
    } catch (error) {
        console.error('Error deleting attendance:', error);
        res.status(500).json({ message: 'Error deleting attendance', error: error.message });
    }
});
router.get('/parent/overview', protectRoute, async (req, res) => {
    try {
        const parentId = req.userId;
        
        // Verify parent - include dateOfBirth in populated children
        const parent = await UserModel.findById(parentId).populate('children', 'name email dateOfBirth classGrade classSection');
        if (!parent || parent.role !== 'parent') {
            return res.status(403).json({ message: 'Access denied. Parents only.' });
        }

        if (!parent.children || parent.children.length === 0) {
            return res.status(404).json({ message: 'No children found' });
        }

        const childrenData = [];

        // Get attendance data for each child
        for (const child of parent.children) {
            // Get last 30 days attendance
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const attendance = await AttendanceModel.find({
                student: child._id,
                date: { $gte: thirtyDaysAgo }
            }).populate('teacher', 'name').sort({ date: -1 });

            // Calculate statistics
            const total = attendance.length;
            const present = attendance.filter(a => a.status === 'present').length;
            const absent = attendance.filter(a => a.status === 'absent').length;
            const late = attendance.filter(a => a.status === 'late').length;
            const excused = attendance.filter(a => a.status === 'excused').length;
            const attendanceRate = total > 0 ? ((present + late) / total * 100).toFixed(2) : 0;

            // Group by subject
            const bySubject = {};
            attendance.forEach(att => {
                if (!bySubject[att.subject]) {
                    bySubject[att.subject] = {
                        total: 0,
                        present: 0,
                        absent: 0,
                        late: 0,
                        excused: 0
                    };
                }
                bySubject[att.subject].total++;
                bySubject[att.subject][att.status]++;
            });

            childrenData.push({
                student: {
                    _id: child._id,
                    name: child.name,
                    email: child.email,
                    dateOfBirth: child.dateOfBirth,
                    classGrade: child.classGrade,
                    classSection: child.classSection
                },
                statistics: {
                    total,
                    present,
                    absent,
                    late,
                    excused,
                    attendanceRate: `${attendanceRate}%`
                },
                bySubject,
                recentAttendance: attendance.slice(0, 10) // Last 10 records
            });
        }

        res.json({
            children: childrenData,
            totalChildren: parent.children.length
        });
    } catch (error) {
        console.error('Error fetching parent overview:', error);
        res.status(500).json({ message: 'Error fetching attendance overview', error: error.message });
    }
});

// Get attendance stats for a specific child (for parent dashboard charts)
router.get('/parent/child/:childId/stats', protectRoute, async (req, res) => {
    try {
        const parentId = req.userId;
        const { childId } = req.params;

        // Verify parent
        const parent = await UserModel.findById(parentId);
        if (!parent || parent.role !== 'parent') {
            return res.status(403).json({ message: 'Access denied. Parents only.' });
        }

        // Verify child belongs to parent
        const isParentChild = parent.children.some(
            child => child.toString() === childId
        );
        
        if (!isParentChild) {
            return res.status(403).json({ message: 'Access denied. This is not your child.' });
        }

        const stats = {
            present: await AttendanceModel.countDocuments({ student: childId, status: 'present' }),
            absent: await AttendanceModel.countDocuments({ student: childId, status: 'absent' }),
            late: await AttendanceModel.countDocuments({ student: childId, status: 'late' }),
            excused: await AttendanceModel.countDocuments({ student: childId, status: 'excused' })
        };

        res.json({ stats });
    } catch (error) {
        console.error('Error fetching child attendance stats:', error);
        res.status(500).json({ message: 'Error fetching attendance stats', error: error.message });
    }
});

// Get detailed attendance for a specific child
router.get('/parent/child/:childId', protectRoute, async (req, res) => {
    try {
        const parentId = req.userId;
        const { childId } = req.params;
        const { subject, startDate, endDate } = req.query;

        // Verify parent
        const parent = await UserModel.findById(parentId);
        if (!parent || parent.role !== 'parent') {
            return res.status(403).json({ message: 'Access denied. Parents only.' });
        }

        // Verify child belongs to parent
        const isParentChild = parent.children.some(
            child => child.toString() === childId
        );
        
        if (!isParentChild) {
            return res.status(403).json({ message: 'Access denied. This is not your child.' });
        }

        // Get student info
        const student = await UserModel.findById(childId).select('-password');

        // Build query
        const query = { student: childId };

        if (subject) {
            query.subject = subject;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                query.date.$lte = new Date(endDate);
            }
        }

        const attendance = await AttendanceModel.find(query)
            .populate('teacher', 'name')
            .sort({ date: -1 });

        // Calculate statistics
        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'present').length;
        const absent = attendance.filter(a => a.status === 'absent').length;
        const late = attendance.filter(a => a.status === 'late').length;
        const excused = attendance.filter(a => a.status === 'excused').length;
        const attendanceRate = total > 0 ? ((present + late) / total * 100).toFixed(2) : 0;

        // Group by subject
        const bySubject = {};
        attendance.forEach(att => {
            if (!bySubject[att.subject]) {
                bySubject[att.subject] = {
                    total: 0,
                    present: 0,
                    absent: 0,
                    late: 0,
                    excused: 0
                };
            }
            bySubject[att.subject].total++;
            bySubject[att.subject][att.status]++;
        });

        // Calculate attendance rate by subject
        Object.keys(bySubject).forEach(subj => {
            const subjectData = bySubject[subj];
            subjectData.attendanceRate = subjectData.total > 0 
                ? ((subjectData.present + subjectData.late) / subjectData.total * 100).toFixed(2) + '%'
                : '0%';
        });

        res.json({
            student,
            attendance,
            statistics: {
                total,
                present,
                absent,
                late,
                excused,
                attendanceRate: `${attendanceRate}%`
            },
            bySubject
        });
    } catch (error) {
        console.error('Error fetching child attendance:', error);
        res.status(500).json({ message: 'Error fetching child attendance', error: error.message });
    }
});

// Get attendance summary for all children (monthly view)
router.get('/parent/monthly-summary', protectRoute, async (req, res) => {
    try {
        const parentId = req.userId;
        const { month, year } = req.query;

        // Verify parent
        const parent = await UserModel.findById(parentId).populate('children', 'name');
        if (!parent || parent.role !== 'parent') {
            return res.status(403).json({ message: 'Access denied. Parents only.' });
        }

        // Set date range for the month
        const targetMonth = month ? parseInt(month) : new Date().getMonth();
        const targetYear = year ? parseInt(year) : new Date().getFullYear();
        
        const startDate = new Date(targetYear, targetMonth, 1);
        const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

        const summaryData = [];

        for (const child of parent.children) {
            const attendance = await AttendanceModel.find({
                student: child._id,
                date: { $gte: startDate, $lte: endDate }
            });

            const total = attendance.length;
            const present = attendance.filter(a => a.status === 'present').length;
            const absent = attendance.filter(a => a.status === 'absent').length;
            const late = attendance.filter(a => a.status === 'late').length;
            const excused = attendance.filter(a => a.status === 'excused').length;

            summaryData.push({
                student: {
                    _id: child._id,
                    name: child.name
                },
                month: startDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
                statistics: {
                    total,
                    present,
                    absent,
                    late,
                    excused,
                    attendanceRate: total > 0 ? ((present + late) / total * 100).toFixed(2) + '%' : '0%'
                }
            });
        }

        res.json({
            month: startDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
            summary: summaryData
        });
    } catch (error) {
        console.error('Error fetching monthly summary:', error);
        res.status(500).json({ message: 'Error fetching monthly summary', error: error.message });
    }
});

export default router;
