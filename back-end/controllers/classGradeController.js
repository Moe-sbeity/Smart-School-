import ClassGradeModel from "../models/classGrade.js";
import UserModel from "../models/UserModels.js";
import Schedule from '../models/schedual.js';


export const assignStudentClassGrade = async (req, res) => {
  try {
    const { studentId, classGrade, classSection } = req.body;

    if (!studentId || !classGrade || !classSection) {
      return res.status(400).json({ message: "studentId, classGrade and classSection are required" });
    }

    // Only check admin role if req.user exists (route may be public)
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can assign class grade' });
    }

    const student = await UserModel.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: "Student not found" });
    }

    // ⭐ Delete all old schedules
    await Schedule.deleteMany({ student: studentId });

    // ⭐ Update or create ClassGrade record
    let gradeRecord = await ClassGradeModel.findOne({ student: studentId });

    if (gradeRecord) {
      gradeRecord.classGrade = classGrade;
      gradeRecord.classSection = classSection;
      await gradeRecord.save();
    } else {
      gradeRecord = await ClassGradeModel.create({
        student: studentId,
        classGrade,
        classSection,
      });
    }

    // ⭐ Update user record
    student.classGrade = classGrade;
    student.classSection = classSection;
    await student.save();

    res.status(200).json({
      message: "Student class assigned successfully. Previous subjects removed.",
      data: gradeRecord,
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getStudentClassGrade = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    const gradeRecord = await ClassGradeModel.findOne({
      student: studentId
    }).populate('student', 'firstName lastName').populate('teacher', 'firstName lastName');

    if (!gradeRecord) {
      return res.status(404).json({ message: "Class grade record not found for the student" });
    }

    res.status(200).json({
      message: "Class grade record fetched successfully",
      data: gradeRecord,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
}

// UPDATED: Assign teacher to a specific grade/section (can have multiple)
export const assignTeacherClassGrade = async (req, res) => {
  try {
    const { teacherId, classGrade, classSection } = req.body;

    if (!teacherId || !classGrade || !classSection) {
      return res.status(400).json({ message: "teacherId, classGrade, and classSection are required" });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only admins can assign teacher classes'
      });
    }

    const teacher = await UserModel.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Check if this specific grade-section combination already exists for this teacher
    let gradeRecord = await ClassGradeModel.findOne({
      teacher: teacherId,
      classGrade: classGrade,
      classSection: classSection
    });

    if (gradeRecord) {
      return res.status(200).json({
        message: "Teacher already assigned to this grade and section",
        data: gradeRecord,
      });
    }

    // Create new record for this grade-section combination
    gradeRecord = new ClassGradeModel({
      teacher: teacherId,
      classGrade,
      classSection
    });

    await gradeRecord.save();

    res.status(201).json({
      message: "Teacher class assigned successfully",
      data: gradeRecord,
    });

  } catch (error) {
    // Handle unique constraint violation
    if (error.code === 11000) {
      return res.status(400).json({
        message: "This teacher is already assigned to this grade and section"
      });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
}

// UPDATED: Get all grades/sections for a teacher
export const getTeacherClassGrades = async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!teacherId) {
      return res.status(400).json({ message: "teacherId is required" });
    }

    const gradeRecords = await ClassGradeModel.find({
      teacher: teacherId
    }).sort({ classGrade: 1, classSection: 1 });

    if (!gradeRecords || gradeRecords.length === 0) {
      return res.status(404).json({ message: "No class grade records found for the teacher" });
    }

    res.status(200).json({
      message: "Class grade records fetched successfully",
      data: gradeRecords,
      count: gradeRecords.length
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
}

// Keep old function name for backward compatibility
export const getTeacherClassGrade = getTeacherClassGrades;

// NEW: Remove a specific grade/section from a teacher
export const removeTeacherClassGrade = async (req, res) => {
  try {
    const { teacherId, classGrade, classSection } = req.body;

    if (!teacherId || !classGrade || !classSection) {
      return res.status(400).json({
        message: "teacherId, classGrade, and classSection are required"
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only admins can remove teacher class assignments'
      });
    }

    const gradeRecord = await ClassGradeModel.findOneAndDelete({
      teacher: teacherId,
      classGrade: classGrade,
      classSection: classSection
    });

    if (!gradeRecord) {
      return res.status(404).json({
        message: "Teacher assignment not found for this grade and section"
      });
    }

    res.status(200).json({
      message: "Teacher class assignment removed successfully",
      data: gradeRecord
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
}

// Get all available grades
export const getAllAvailableGrades = async (req, res) => {
  try {
    const grades = ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4',
      'grade5', 'grade6', 'grade7', 'grade8', 'grade9',
      'grade10', 'grade11', 'grade12'];

    res.status(200).json({
      message: "Available grades fetched successfully",
      data: grades
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
}

// Get all available sections
export const getAllAvailableSections = async (req, res) => {
  try {
    const sections = ['A', 'B', 'C', 'D', 'E', 'F'];

    res.status(200).json({
      message: "Available sections fetched successfully",
      data: sections
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
}

// Get student count by class grade for dashboard chart
export const getStudentsByClassStats = async (req, res) => {
  try {
    const grades = ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4',
      'grade5', 'grade6', 'grade7', 'grade8', 'grade9',
      'grade10', 'grade11', 'grade12'];

    // Aggregate student count per class grade
    const stats = await ClassGradeModel.aggregate([
      {
        $match: { student: { $exists: true, $ne: null } }
      },
      {
        $group: {
          _id: '$classGrade',
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map for quick lookup
    const statsMap = {};
    stats.forEach(item => {
      statsMap[item._id] = item.count;
    });

    // Build result with all grades (0 for empty grades)
    const result = grades.map(grade => ({
      grade: grade,
      label: grade.replace('kg', 'KG').replace('grade', 'Grade '),
      count: statsMap[grade] || 0
    }));

    res.status(200).json({
      message: "Student stats by class fetched successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
}