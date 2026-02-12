import express from 'express';
import AcademicYearSettings from '../models/academicYearSettings.js';
import AnnouncementModel from '../models/Announcement.js';
import AttendanceModel from '../models/attendance.js';
import UserModel from '../models/UserModels.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// GET CURRENT ACADEMIC YEAR SETTINGS
// ============================================================================
router.get('/current', async (req, res) => {
  try {
    const settings = await AcademicYearSettings.getCurrentSettings();
    
    // Calculate statistics on the fly
    const stats = await calculateStatistics(settings.academicYear);
    
    res.status(200).json({
      success: true,
      settings: {
        ...settings.toObject(),
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Error fetching academic year settings:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// GET ALL ACADEMIC YEARS
// ============================================================================
router.get('/all', async (req, res) => {
  try {
    const years = await AcademicYearSettings.find()
      .sort({ academicYear: -1 });
    
    res.status(200).json({
      success: true,
      years,
      count: years.length
    });
  } catch (error) {
    console.error('Error fetching academic years:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// GET SPECIFIC ACADEMIC YEAR
// ============================================================================
router.get('/:academicYear', async (req, res) => {
  try {
    const { academicYear } = req.params;
    
    let settings = await AcademicYearSettings.findOne({ academicYear });
    
    if (!settings) {
      return res.status(404).json({ message: 'Academic year not found' });
    }
    
    // Calculate statistics
    const stats = await calculateStatistics(academicYear);
    
    res.status(200).json({
      success: true,
      settings: {
        ...settings.toObject(),
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Error fetching academic year:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// CREATE NEW ACADEMIC YEAR
// ============================================================================
router.post('/', protectRoute, async (req, res) => {
  try {
    const { 
      academicYear, 
      startDate, 
      endDate, 
      terms, 
      numberOfTerms,
      assessmentSettings,
      isCurrent 
    } = req.body;
    
    // Check if academic year already exists
    const existing = await AcademicYearSettings.findOne({ academicYear });
    if (existing) {
      return res.status(400).json({ message: 'Academic year already exists' });
    }
    
    // If setting as current, unset any existing current year
    if (isCurrent) {
      await AcademicYearSettings.updateMany({}, { isCurrent: false });
    }
    
    const settings = new AcademicYearSettings({
      academicYear,
      startDate,
      endDate,
      terms,
      numberOfTerms,
      assessmentSettings,
      isCurrent,
      updatedBy: req.userId
    });
    
    await settings.save();
    
    res.status(201).json({
      success: true,
      message: 'Academic year created successfully',
      settings
    });
  } catch (error) {
    console.error('Error creating academic year:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// UPDATE ACADEMIC YEAR SETTINGS
// ============================================================================
router.put('/:academicYear', protectRoute, async (req, res) => {
  try {
    const { academicYear } = req.params;
    const updates = req.body;
    
    // If setting as current, unset any existing current year
    if (updates.isCurrent) {
      await AcademicYearSettings.updateMany(
        { academicYear: { $ne: academicYear } }, 
        { isCurrent: false }
      );
    }
    
    const settings = await AcademicYearSettings.findOneAndUpdate(
      { academicYear },
      { 
        ...updates, 
        updatedBy: req.userId,
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Academic year settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating academic year:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// UPDATE TERMS
// ============================================================================
router.put('/:academicYear/terms', protectRoute, async (req, res) => {
  try {
    const { academicYear } = req.params;
    const { terms, currentTerm, numberOfTerms } = req.body;
    
    const settings = await AcademicYearSettings.findOne({ academicYear });
    
    if (!settings) {
      return res.status(404).json({ message: 'Academic year not found' });
    }
    
    if (terms) settings.terms = terms;
    if (currentTerm) settings.currentTerm = currentTerm;
    if (numberOfTerms) settings.numberOfTerms = numberOfTerms;
    settings.updatedBy = req.userId;
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: 'Terms updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating terms:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// UPDATE ASSESSMENT SETTINGS
// ============================================================================
router.put('/:academicYear/assessment', protectRoute, async (req, res) => {
  try {
    const { academicYear } = req.params;
    const { assessmentSettings } = req.body;
    
    const settings = await AcademicYearSettings.findOneAndUpdate(
      { academicYear },
      { 
        assessmentSettings,
        updatedBy: req.userId
      },
      { new: true }
    );
    
    if (!settings) {
      return res.status(404).json({ message: 'Academic year not found' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Assessment settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating assessment settings:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// SET CURRENT TERM
// ============================================================================
router.put('/:academicYear/current-term', protectRoute, async (req, res) => {
  try {
    const { academicYear } = req.params;
    const { termNumber } = req.body;
    
    const settings = await AcademicYearSettings.findOne({ academicYear });
    
    if (!settings) {
      return res.status(404).json({ message: 'Academic year not found' });
    }
    
    // Update current term
    settings.currentTerm = termNumber;
    
    // Update isActive flag in terms array
    settings.terms = settings.terms.map(term => ({
      ...term.toObject(),
      isActive: term.termNumber === termNumber
    }));
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: 'Current term updated successfully',
      currentTerm: termNumber
    });
  } catch (error) {
    console.error('Error setting current term:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// GET STATISTICS BY GRADE
// ============================================================================
router.get('/:academicYear/stats/by-grade', async (req, res) => {
  try {
    const { academicYear } = req.params;
    const { grade } = req.query;
    
    const gradeStats = await calculateGradeStatistics(academicYear, grade);
    
    res.status(200).json({
      success: true,
      stats: gradeStats
    });
  } catch (error) {
    console.error('Error fetching grade statistics:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// DELETE ACADEMIC YEAR
// ============================================================================
router.delete('/:academicYear', protectRoute, async (req, res) => {
  try {
    const { academicYear } = req.params;
    
    const settings = await AcademicYearSettings.findOne({ academicYear });
    
    if (!settings) {
      return res.status(404).json({ message: 'Academic year not found' });
    }
    
    if (settings.isCurrent) {
      return res.status(400).json({ message: 'Cannot delete the current academic year' });
    }
    
    await AcademicYearSettings.deleteOne({ academicYear });
    
    res.status(200).json({
      success: true,
      message: 'Academic year deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting academic year:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function calculateStatistics(academicYear) {
  try {
    // Parse academic year to get date range
    const [startYear, endYear] = academicYear.split('-').map(Number);
    const yearStart = new Date(startYear, 8, 1); // September 1
    const yearEnd = new Date(endYear, 7, 31); // August 31
    
    // Count announcements by type within date range
    const announcements = await AnnouncementModel.aggregate([
      {
        $match: {
          createdAt: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    let totalExams = 0;
    let totalQuizzes = 0;
    let totalAssignments = 0;
    
    announcements.forEach(item => {
      if (item._id === 'quiz') totalQuizzes = item.count;
      if (item._id === 'assignment') totalAssignments = item.count;
      // Note: 'exam' might not exist, using quiz or a separate type check
    });
    
    // Count exams separately if they exist
    // For now, we'll use quizzes as a base since there's no separate exam type
    // The admin can configure how assignments/quizzes are categorized as exams
    totalExams = totalQuizzes; // Will be adjusted based on actual exam tracking
    
    // Calculate average attendance
    const attendanceStats = await AttendanceModel.aggregate([
      {
        $match: {
          date: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalPresent: { 
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          },
          totalRecords: { $sum: 1 }
        }
      }
    ]);
    
    let avgAttendance = 0;
    if (attendanceStats.length > 0 && attendanceStats[0].totalRecords > 0) {
      avgAttendance = Math.round((attendanceStats[0].totalPresent / attendanceStats[0].totalRecords) * 100);
    }
    
    return {
      totalExams,
      totalQuizzes,
      totalAssignments,
      avgAttendance,
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error calculating statistics:', error);
    return {
      totalExams: 0,
      totalQuizzes: 0,
      totalAssignments: 0,
      avgAttendance: 0,
      lastUpdated: new Date()
    };
  }
}

async function calculateGradeStatistics(academicYear, filterGrade = null) {
  try {
    const [startYear, endYear] = academicYear.split('-').map(Number);
    const yearStart = new Date(startYear, 8, 1);
    const yearEnd = new Date(endYear, 7, 31);
    
    const gradeOrder = ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6', 
                        'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'];
    
    // Get grades to process
    const grades = filterGrade ? [filterGrade] : gradeOrder;
    
    const gradeStats = [];
    
    for (const grade of grades) {
      // Count announcements for this grade
      const announcements = await AnnouncementModel.aggregate([
        {
          $match: {
            createdAt: { $gte: yearStart, $lte: yearEnd },
            targetGrades: grade
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]);
      
      let exams = 0;
      let quizzes = 0;
      let tasks = 0;
      
      announcements.forEach(item => {
        if (item._id === 'quiz') quizzes = item.count;
        if (item._id === 'assignment') tasks = item.count;
      });
      
      // Use quizzes as exams count (since system tracks quizzes)
      exams = quizzes;
      
      // Only add if there's data
      if (exams > 0 || quizzes > 0 || tasks > 0) {
        gradeStats.push({
          grade,
          exams,
          quizzes,
          tasks
        });
      }
    }
    
    return gradeStats;
  } catch (error) {
    console.error('Error calculating grade statistics:', error);
    return [];
  }
}

export default router;
