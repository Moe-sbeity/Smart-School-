import Announcement from '../models/adminAnnouncment.js';
import UserModel from '../models/UserModels.js';
import { getPaginationParams } from '../utils/pagination.js';

export const createAnnouncement = async (req, res) => {
  try {
    const { title, content, category, targetGrades, targetSections, targetStudents, 
            isForAllGrades, isForAllSections, isForSpecificStudents } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({
        message: 'Please provide title, content, and category'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only admins can create announcements'
      });
    }

    // Validate targetStudents if provided
    if (targetStudents && targetStudents.length > 0) {
      const students = await UserModel.find({
        _id: { $in: targetStudents },
        role: 'student'
      });
      
      if (students.length !== targetStudents.length) {
        return res.status(400).json({
          message: 'One or more student IDs are invalid'
        });
      }
    }

    // Determine targeting logic
    const announcementData = {
      title,
      content,
      category,
      author: req.userId,
      isForSpecificStudents: isForSpecificStudents === true,
      isForAllGrades: isForAllGrades !== false,
      isForAllSections: isForAllSections !== false,
      targetGrades: [],
      targetSections: [],
      targetStudents: []
    };

    // If targeting specific students, ignore grade/section targeting
    if (announcementData.isForSpecificStudents && targetStudents && targetStudents.length > 0) {
      announcementData.targetStudents = targetStudents;
      announcementData.isForAllGrades = false;
      announcementData.isForAllSections = false;
    } else {
      // Set target grades
      if (!announcementData.isForAllGrades && targetGrades && targetGrades.length > 0) {
        announcementData.targetGrades = targetGrades;
      }

      // Set target sections
      if (!announcementData.isForAllSections && targetSections && targetSections.length > 0) {
        announcementData.targetSections = targetSections;
      }
    }

    const announcement = new Announcement(announcementData);
    await announcement.save();

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('author', 'name email role')
      .populate('targetStudents', 'name email classGrade classSection');

    res.status(201).json({
      message: 'Announcement created successfully',
      announcement: populatedAnnouncement
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getAllAnnouncements = async (req, res) => {
  try {
    const { category, search } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query, { page: 1, limit: 20 });

    const filter = { isActive: true };
    if (category) {
      filter.category = category;
    }
    
    // Add search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const totalItems = await Announcement.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const announcements = await Announcement.find(filter)
      .populate('author', 'name email')
      .populate('targetStudents', 'name email classGrade classSection')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      announcements,
      count: announcements.length,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get announcements for a specific student based on their grade/section OR if they're targeted
export const getAnnouncementsForStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get student's grade and section
    const student = await UserModel.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentGrade = {
      classGrade: student.classGrade,
      classSection: student.classSection
    };

    // Build query to find relevant announcements
    const query = {
      isActive: true,
      $or: [
        // Announcements for specific students (where this student is in the list)
        { isForSpecificStudents: true, targetStudents: studentId },
        // Announcements for all grades and sections
        { isForSpecificStudents: false, isForAllGrades: true, isForAllSections: true }
      ]
    };

    // Add grade/section based filtering only if student has grade/section assigned
    if (studentGrade.classGrade && studentGrade.classSection) {
      query.$or.push(
        // Announcements for all grades but specific sections
        { 
          isForSpecificStudents: false,
          isForAllGrades: true, 
          isForAllSections: false, 
          targetSections: studentGrade.classSection 
        },
        // Announcements for specific grades and all sections
        { 
          isForSpecificStudents: false,
          isForAllGrades: false, 
          isForAllSections: true, 
          targetGrades: studentGrade.classGrade 
        },
        // Announcements for specific grades and specific sections
        {
          isForSpecificStudents: false,
          isForAllGrades: false,
          isForAllSections: false,
          targetGrades: studentGrade.classGrade,
          targetSections: studentGrade.classSection
        }
      );
    }

    const announcements = await Announcement.find(query)
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      announcements,
      count: announcements.length,
      studentGrade: {
        grade: studentGrade.classGrade,
        section: studentGrade.classSection
      }
    });
  } catch (error) {
    console.error('Error fetching student announcements:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id)
      .populate('author', 'name email role')
      .populate('targetStudents', 'name email classGrade classSection');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.status(200).json({ announcement });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, isActive, targetGrades, targetSections, 
            targetStudents, isForAllGrades, isForAllSections, isForSpecificStudents } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only admins can update announcements'
      });
    }

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Validate targetStudents if provided
    if (targetStudents && targetStudents.length > 0) {
      const students = await UserModel.find({
        _id: { $in: targetStudents },
        role: 'student'
      });
      
      if (students.length !== targetStudents.length) {
        return res.status(400).json({
          message: 'One or more student IDs are invalid'
        });
      }
    }

    if (title) announcement.title = title;
    if (content) announcement.content = content;
    if (category) announcement.category = category;
    if (typeof isActive !== 'undefined') announcement.isActive = isActive;

    // Update specific student targeting
    if (typeof isForSpecificStudents !== 'undefined') {
      announcement.isForSpecificStudents = isForSpecificStudents;
      
      if (isForSpecificStudents) {
        announcement.targetStudents = targetStudents || announcement.targetStudents;
        announcement.isForAllGrades = false;
        announcement.isForAllSections = false;
        announcement.targetGrades = [];
        announcement.targetSections = [];
      } else {
        announcement.targetStudents = [];
      }
    }

    // Update grade/section targeting only if not targeting specific students
    if (!announcement.isForSpecificStudents) {
      if (typeof isForAllGrades !== 'undefined') {
        announcement.isForAllGrades = isForAllGrades;
        announcement.targetGrades = isForAllGrades ? [] : (targetGrades || announcement.targetGrades);
      }

      if (typeof isForAllSections !== 'undefined') {
        announcement.isForAllSections = isForAllSections;
        announcement.targetSections = isForAllSections ? [] : (targetSections || announcement.targetSections);
      }
    }

    await announcement.save();

    const updatedAnnouncement = await Announcement.findById(id)
      .populate('author', 'name email role')
      .populate('targetStudents', 'name email classGrade classSection');

    res.status(200).json({
      message: 'Announcement updated successfully',
      announcement: updatedAnnouncement
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only admins can delete announcements'
      });
    }

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.status(200).json({
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getAnnouncementsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const announcements = await Announcement.find({
      category,
      isActive: true
    })
      .populate('author', 'name email')
      .populate('targetStudents', 'name email classGrade classSection')
      .sort({ createdAt: -1 });

    res.status(200).json({
      category,
      announcements,
      count: announcements.length
    });
  } catch (error) {
    console.error('Error fetching announcements by category:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getUserAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({
      author: req.userId
    })
      .populate('author', 'name email')
      .populate('targetStudents', 'name email classGrade classSection')
      .sort({ createdAt: -1 });

    res.status(200).json({
      announcements,
      count: announcements.length
    });
  } catch (error) {
    console.error('Error fetching user announcements:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get admin announcements for logged-in student based on their grade/section OR if they're targeted
export const getAdminAnnouncementsForStudent = async (req, res) => {
  try {
    const studentId = req.userId; // From auth middleware

    // Get student's grade and section
    const student = await UserModel.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentGrade = {
      classGrade: student.classGrade,
      classSection: student.classSection
    };

    // Build query to find relevant announcements
    const query = {
      isActive: true,
      $or: [
        // Announcements for specific students (where this student is in the list)
        { isForSpecificStudents: true, targetStudents: studentId },
        // Announcements for all grades and sections
        { isForSpecificStudents: false, isForAllGrades: true, isForAllSections: true }
      ]
    };

    if (studentGrade.classGrade && studentGrade.classSection) {
      query.$or.push(
        { 
          isForSpecificStudents: false,
          isForAllGrades: true, 
          isForAllSections: false, 
          targetSections: studentGrade.classSection 
        },
        { 
          isForSpecificStudents: false,
          isForAllGrades: false, 
          isForAllSections: true, 
          targetGrades: studentGrade.classGrade 
        },
        {
          isForSpecificStudents: false,
          isForAllGrades: false,
          isForAllSections: false,
          targetGrades: studentGrade.classGrade,
          targetSections: studentGrade.classSection
        }
      );
    }

    const announcements = await Announcement.find(query)
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    // Add isViewed field to each announcement
    const announcementsWithViewStatus = announcements.map(announcement => {
      const announcementObj = announcement.toObject();
      announcementObj.isViewed = announcement.viewedBy && announcement.viewedBy.some(
        id => id.toString() === studentId.toString()
      );
      return announcementObj;
    });

    res.status(200).json({
      announcements: announcementsWithViewStatus,
      count: announcementsWithViewStatus.length,
      studentGrade: {
        grade: studentGrade.classGrade,
        section: studentGrade.classSection
      }
    });
  } catch (error) {
    console.error('Error fetching admin announcements for student:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get admin announcements for teacher
export const getAdminAnnouncementsForTeacher = async (req, res) => {
  try {
    const teacherId = req.userId;

    // Get teacher info
    const teacher = await UserModel.findById(teacherId);

    if (!teacher || teacher.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied. Teachers only.' });
    }

    // Find all active announcements for teachers (announcements where targetAudience includes teachers or is for all)
    const announcements = await Announcement.find({
      isActive: true,
      $or: [
        { targetAudience: 'all' },
        { targetAudience: 'teachers' },
        { targetAudience: { $in: ['teachers', 'all'] } }
      ]
    })
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    // If no targetAudience filter, get all active announcements for now
    let result = announcements;
    
    // If no announcements found with targetAudience, get all announcements
    if (announcements.length === 0) {
      result = await Announcement.find({ isActive: true })
        .populate('author', 'name email')
        .sort({ createdAt: -1 });
    }

    // Add isViewed field
    const announcementsWithViewStatus = result.map(announcement => {
      const announcementObj = announcement.toObject();
      announcementObj.isViewed = announcement.viewedBy && announcement.viewedBy.some(
        id => id.toString() === teacherId.toString()
      );
      return announcementObj;
    });

    res.status(200).json({
      announcements: announcementsWithViewStatus,
      count: announcementsWithViewStatus.length
    });
  } catch (error) {
    console.error('Error fetching admin announcements for teacher:', error);
    res.status(500).json({ message: error.message });
  }
};

// Mark admin announcement as viewed by student
export const markAnnouncementAsViewed = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.userId;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check if already viewed
    if (announcement.viewedBy && announcement.viewedBy.some(vid => vid.toString() === studentId.toString())) {
      return res.status(200).json({ message: 'Already marked as viewed' });
    }

    // Add student to viewedBy array
    if (!announcement.viewedBy) {
      announcement.viewedBy = [];
    }
    announcement.viewedBy.push(studentId);
    await announcement.save();

    res.status(200).json({ message: 'Announcement marked as viewed' });
  } catch (error) {
    console.error('Error marking announcement as viewed:', error);
    res.status(500).json({ message: error.message });
  }
};