import Schedule from '../models/schedual.js';
import UserModel from '../models/UserModels.js';
import WeeklyScheduleTemplate from '../models/weaklyschedual.js';
import ClassGradeModel from '../models/classGrade.js';
import ScheduleSettings from '../models/scheduleSettings.js';
import { getPaginationParams } from '../utils/pagination.js';

// ============================================================================
// CREATE TEACHER SCHEDULE (for weekly template)
// ============================================================================
export const createTeacherSchedule = async (req, res) => {
  try {
    const { teacherId, subject, dayOfWeek, startTime, endTime, classGrade, classSection } = req.body;

    // Validate required fields
    if (!teacherId || !subject || !dayOfWeek || !startTime || !endTime || !classGrade || !classSection) {
      return res.status(400).json({ 
        message: 'All fields are required: teacherId, subject, dayOfWeek, startTime, endTime, classGrade, classSection' 
      });
    }

    // Verify teacher exists and teaches this subject
    const teacher = await UserModel.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (!teacher.subjects || !teacher.subjects.includes(subject)) {
      return res.status(400).json({ 
        message: `Teacher ${teacher.name} does not teach ${subject}` 
      });
    }

    // Check for time conflicts for this teacher
    const existingSchedule = await Schedule.findOne({
      teacher: teacherId,
      dayOfWeek,
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });

    if (existingSchedule) {
      return res.status(400).json({ 
        message: `Time conflict: Teacher already has a schedule on ${dayOfWeek} from ${existingSchedule.startTime} to ${existingSchedule.endTime}` 
      });
    }

    // Create the schedule
    const schedule = new Schedule({
      teacher: teacherId,
      subject,
      dayOfWeek,
      startTime,
      endTime,
      classGrade,
      classSection,
      student: [] // Will be populated when students enroll
    });

    await schedule.save();

    // Update or create ClassGrade record for this teacher
    const existingClassGrade = await ClassGradeModel.findOne({
      teacher: teacherId,
      classGrade,
      classSection
    });

    if (!existingClassGrade) {
      await ClassGradeModel.create({
        teacher: teacherId,
        classGrade,
        classSection
      });
    }

    const populated = await Schedule.findById(schedule._id)
      .populate('teacher', 'name email subjects');

    res.status(201).json({
      message: 'Teacher schedule created successfully',
      schedule: populated
    });

  } catch (error) {
    console.error('Error creating teacher schedule:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================================================
// GET ALL SCHEDULES
// ============================================================================
export const getAllSchedules = async (req, res) => {
  try {
    const { classGrade, classSection, teacherId } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query, { page: 1, limit: 50 });
    
    const filter = {};
    if (classGrade) filter.classGrade = classGrade;
    if (classSection) filter.classSection = classSection;
    if (teacherId) filter.teacher = teacherId;

    // Get total count for pagination
    const totalItems = await Schedule.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const schedules = await Schedule.find(filter)
      .populate('teacher', 'name email subjects')
      .populate('student', 'name email')
      .sort({ classGrade: 1, classSection: 1, dayOfWeek: 1, startTime: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      schedules,
      count: schedules.length,
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
    console.error('Error fetching all schedules:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================================================
// GET TEACHER'S ASSIGNED CLASSES (unique grades and sections)
// ============================================================================
export const getTeacherAssignedClasses = async (req, res) => {
  try {
    const teacherId = req.userId;

    // Get all schedules for this teacher
    const schedules = await Schedule.find({ teacher: teacherId });

    // Extract unique grades and sections
    const gradesSet = new Set();
    const sectionsSet = new Set();
    const classesSet = new Set();

    schedules.forEach(schedule => {
      gradesSet.add(schedule.classGrade);
      sectionsSet.add(schedule.classSection);
      classesSet.add(`${schedule.classGrade}-${schedule.classSection}`);
    });

    // Convert to sorted arrays
    const gradeOrder = ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'];
    const sectionOrder = ['A', 'B', 'C', 'D', 'E', 'F'];

    const grades = Array.from(gradesSet).sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));
    const sections = Array.from(sectionsSet).sort((a, b) => sectionOrder.indexOf(a) - sectionOrder.indexOf(b));
    const classes = Array.from(classesSet).map(c => {
      const [grade, section] = c.split('-');
      return { grade, section };
    });

    res.status(200).json({
      grades,
      sections,
      classes,
      totalClasses: classes.length
    });
  } catch (error) {
    console.error('Error fetching teacher assigned classes:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================================================
// WEEKLY SCHEDULE TEMPLATE MANAGEMENT
// ============================================================================

export const createWeeklyScheduleTemplate = async (req, res) => {
  try {
    const { classGrade, classSection, schedule, academicYear } = req.body;

    if (!classGrade || !classSection || !schedule || !Array.isArray(schedule)) {
      return res.status(400).json({ 
        message: 'classGrade, classSection, and schedule array are required' 
      });
    }

    for (const day of schedule) {
      for (const period of day.periods) {
        const teacher = await UserModel.findById(period.teacher);
        
        if (!teacher || teacher.role !== 'teacher') {
          return res.status(400).json({ 
            message: `Invalid teacher for ${period.subject} on ${day.dayOfWeek}` 
          });
        }

        if (!teacher.subjects.includes(period.subject)) {
          return res.status(400).json({ 
            message: `Teacher ${teacher.name} does not teach ${period.subject}` 
          });
        }
      }
    }

    let template = await WeeklyScheduleTemplate.findOne({
      classGrade,
      classSection,
      academicYear: academicYear || new Date().getFullYear()
    });

    if (template) {
      // Update existing template
      template.schedule = schedule;
      template.isActive = true;
      await template.save();
    } else {
      // Create new template
      template = new WeeklyScheduleTemplate({
        classGrade,
        classSection,
        academicYear: academicYear || new Date().getFullYear(),
        schedule
      });
      await template.save();
    }

    // Update ClassGrade records for all teachers in the schedule
    const teacherIds = new Set();
    schedule.forEach(day => {
      day.periods.forEach(period => {
        teacherIds.add(period.teacher.toString());
      });
    });

    for (const teacherId of teacherIds) {
      const existingRecord = await ClassGradeModel.findOne({
        teacher: teacherId,
        classGrade,
        classSection
      });

      if (!existingRecord) {
        await ClassGradeModel.create({
          teacher: teacherId,
          classGrade,
          classSection
        });
      }
    }

    // ⭐ Also create/update individual Schedule entries so they appear in "All Classes"
    // First, remove old schedule entries for this grade-section that have no students
    // (template-generated ones), then recreate from template
    await Schedule.deleteMany({
      classGrade,
      classSection,
      $or: [{ student: { $exists: false } }, { student: { $size: 0 } }]
    });

    // Collect existing student enrollments for this grade-section
    const existingSchedules = await Schedule.find({ classGrade, classSection });
    const enrolledStudentIds = new Set();
    existingSchedules.forEach(s => {
      (s.student || []).forEach(sid => enrolledStudentIds.add(sid.toString()));
    });
    const studentIds = [...enrolledStudentIds];

    // Now delete remaining schedules for this grade-section (they'll be recreated with students)
    await Schedule.deleteMany({ classGrade, classSection });

    // Create individual Schedule entries from the template
    for (const day of schedule) {
      for (const period of day.periods) {
        await Schedule.create({
          teacher: period.teacher,
          subject: period.subject,
          dayOfWeek: day.dayOfWeek,
          startTime: period.startTime,
          endTime: period.endTime,
          classGrade,
          classSection,
          student: studentIds
        });
      }
    }

    const populated = await WeeklyScheduleTemplate.findById(template._id)
      .populate('schedule.periods.teacher', 'name email subjects');

    res.status(201).json({
      message: 'Weekly schedule template created successfully',
      template: populated
    });

  } catch (error) {
    console.error('Error creating weekly schedule template:', error);
    res.status(500).json({ message: error.message });
  }
};


export const getWeeklyScheduleTemplate = async (req, res) => {
  try {
    const { classGrade, classSection } = req.params;

    const template = await WeeklyScheduleTemplate.findOne({
      classGrade,
      classSection,
      isActive: true
    }).populate('schedule.periods.teacher', 'name email subjects');

    if (!template) {
      return res.status(404).json({ 
        message: 'No schedule template found for this grade and section' 
      });
    }

    res.status(200).json({ template });

  } catch (error) {
    console.error('Error fetching weekly schedule template:', error);
    res.status(500).json({ message: error.message });
  }
};


export const getAllWeeklyScheduleTemplates = async (req, res) => {
  try {
    const { academicYear } = req.query;
    
    const filter = { isActive: true };
    if (academicYear) {
      filter.academicYear = academicYear;
    }

    const templates = await WeeklyScheduleTemplate.find(filter)
      .populate('schedule.periods.teacher', 'name email subjects')
      .sort({ classGrade: 1, classSection: 1 });

    res.status(200).json({ 
      templates,
      count: templates.length 
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: error.message });
  }
};


export const deleteWeeklyScheduleTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await WeeklyScheduleTemplate.findByIdAndDelete(id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Also delete all individual schedules for this grade-section
    await Schedule.deleteMany({
      classGrade: template.classGrade,
      classSection: template.classSection
    });

    res.status(200).json({ 
      message: 'Template and associated schedules deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: error.message });
  }
};


export const enrollStudentInGradeSection = async (req, res) => {
  try {
    const { studentId, classGrade, classSection } = req.body;

    if (!studentId || !classGrade || !classSection) {
      return res.status(400).json({ 
        message: 'studentId, classGrade, and classSection are required' 
      });
    }

    // Verify student exists
    const student = await UserModel.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Invalid student' });
    }

    // Get the weekly schedule template
    const template = await WeeklyScheduleTemplate.findOne({
      classGrade,
      classSection,
      isActive: true
    });

    // Remove student from any existing schedule entries (don't delete the schedule documents)
    await Schedule.updateMany(
      { student: studentId },
      { $pull: { student: studentId } }
    );

    let enrolledCount = 0;

    if (template) {
      // === PATH 1: Use template to create schedules ===
      for (const day of template.schedule) {
        for (const period of day.periods) {
          let schedule = await Schedule.findOne({
            teacher: period.teacher,
            subject: period.subject,
            dayOfWeek: day.dayOfWeek,
            startTime: period.startTime,
            endTime: period.endTime,
            classGrade,
            classSection
          });

          if (schedule) {
            if (!schedule.student.includes(studentId)) {
              schedule.student.push(studentId);
              await schedule.save();
              enrolledCount++;
            }
          } else {
            schedule = new Schedule({
              student: [studentId],
              teacher: period.teacher,
              subject: period.subject,
              dayOfWeek: day.dayOfWeek,
              startTime: period.startTime,
              endTime: period.endTime,
              classGrade,
              classSection
            });
            await schedule.save();
            enrolledCount++;
          }
        }
      }
    } else {
      // === PATH 2: No template - enroll using existing schedule entries for this section ===
      const existingSchedules = await Schedule.find({ classGrade, classSection });
      
      for (const schedule of existingSchedules) {
        if (!schedule.student.includes(studentId)) {
          schedule.student.push(studentId);
          await schedule.save();
          enrolledCount++;
        }
      }
    }

    // Update student's classGrade and classSection in User model
    student.classGrade = classGrade;
    student.classSection = classSection;
    await student.save();

    // Update or create ClassGrade record
    let studentGradeRecord = await ClassGradeModel.findOne({ student: studentId });
    if (studentGradeRecord) {
      studentGradeRecord.classGrade = classGrade;
      studentGradeRecord.classSection = classSection;
      await studentGradeRecord.save();
    } else {
      await ClassGradeModel.create({
        student: studentId,
        classGrade,
        classSection
      });
    }

    res.status(200).json({
      message: `Student enrolled in ${classGrade} Section ${classSection} successfully`,
      enrolledSubjects: enrolledCount,
      student: {
        name: student.name,
        classGrade,
        classSection
      }
    });

  } catch (error) {
    console.error('Error enrolling student:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Bulk enroll multiple students in a grade-section
 */
export const bulkEnrollStudents = async (req, res) => {
  try {
    const { studentIds, classGrade, classSection } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array is required' });
    }

    if (!classGrade || !classSection) {
      return res.status(400).json({ 
        message: 'classGrade and classSection are required' 
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const studentId of studentIds) {
      try {
        const student = await UserModel.findById(studentId);
        if (!student || student.role !== 'student') {
          results.failed.push({ studentId, reason: 'Invalid student' });
          continue;
        }

        // Use the single enrollment function logic
        const template = await WeeklyScheduleTemplate.findOne({
          classGrade,
          classSection,
          isActive: true
        });

        if (!template) {
          results.failed.push({ 
            studentId, 
            reason: 'No template found' 
          });
          continue;
        }

        await Schedule.deleteMany({ student: studentId });

        for (const day of template.schedule) {
          for (const period of day.periods) {
            let schedule = await Schedule.findOne({
              teacher: period.teacher,
              subject: period.subject,
              dayOfWeek: day.dayOfWeek,
              startTime: period.startTime,
              endTime: period.endTime,
              classGrade,
              classSection
            });

            if (schedule) {
              if (!schedule.student.includes(studentId)) {
                schedule.student.push(studentId);
                await schedule.save();
              }
            } else {
              schedule = new Schedule({
                student: [studentId],
                teacher: period.teacher,
                subject: period.subject,
                dayOfWeek: day.dayOfWeek,
                startTime: period.startTime,
                endTime: period.endTime,
                classGrade,
                classSection
              });
              await schedule.save();
            }
          }
        }

        student.classGrade = classGrade;
        student.classSection = classSection;
        await student.save();

        let studentGradeRecord = await ClassGradeModel.findOne({ student: studentId });
        if (studentGradeRecord) {
          studentGradeRecord.classGrade = classGrade;
          studentGradeRecord.classSection = classSection;
          await studentGradeRecord.save();
        } else {
          await ClassGradeModel.create({
            student: studentId,
            classGrade,
            classSection
          });
        }

        results.success.push({ 
          studentId, 
          name: student.name 
        });

      } catch (error) {
        results.failed.push({ 
          studentId, 
          reason: error.message 
        });
      }
    }

    res.status(200).json({
      message: `Bulk enrollment completed`,
      summary: {
        total: studentIds.length,
        successful: results.success.length,
        failed: results.failed.length
      },
      results
    });

  } catch (error) {
    console.error('Error in bulk enrollment:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================================================
// EXISTING FUNCTIONS (Updated)
// ============================================================================

export const getStudentSchedule = async (req, res) => {
  try {
    const { studentId } = req.params;

    const schedules = await Schedule.find({ student: studentId })
      .populate('teacher', 'name email subjects')
      .sort({ dayOfWeek: 1, startTime: 1 });

    // Group by day of week
    const scheduleByDay = schedules.reduce((acc, schedule) => {
      if (!acc[schedule.dayOfWeek]) {
        acc[schedule.dayOfWeek] = [];
      }
      acc[schedule.dayOfWeek].push({
        _id: schedule._id,
        subject: schedule.subject,
        teacher: schedule.teacher,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        classGrade: schedule.classGrade,
        classSection: schedule.classSection
      });
      return acc;
    }, {});

    res.status(200).json({
      schedules: scheduleByDay,
      totalClasses: schedules.length
    });
  } catch (error) {
    console.error('Error fetching student schedule:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getTeacherSchedule = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const schedules = await Schedule.find({ teacher: teacherId })
      .populate('student', 'name email classGrade classSection')
      .sort({ dayOfWeek: 1, startTime: 1 });

    // Group by day and class
    const scheduleByDay = schedules.reduce((acc, schedule) => {
      const key = schedule.dayOfWeek;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        _id: schedule._id,
        subject: schedule.subject,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        classGrade: schedule.classGrade,
        classSection: schedule.classSection,
        studentCount: schedule.student.length,
        students: schedule.student
      });
      return acc;
    }, {});

    res.status(200).json({
      schedules: scheduleByDay,
      totalClasses: schedules.length
    });
  } catch (error) {
    console.error('Error fetching teacher schedule:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getGradeSectionSchedule = async (req, res) => {
  try {
    const { classGrade, classSection } = req.params;

    const schedules = await Schedule.find({ 
      classGrade, 
      classSection 
    })
      .populate('teacher', 'name email subjects')
      .populate('student', 'name email')
      .sort({ dayOfWeek: 1, startTime: 1 });

    // Group by day
    const scheduleByDay = schedules.reduce((acc, schedule) => {
      if (!acc[schedule.dayOfWeek]) {
        acc[schedule.dayOfWeek] = [];
      }
      acc[schedule.dayOfWeek].push(schedule);
      return acc;
    }, {});

    res.status(200).json({
      classGrade,
      classSection,
      schedules: scheduleByDay,
      totalStudents: new Set(schedules.flatMap(s => s.student.map(st => st._id.toString()))).size
    });
  } catch (error) {
    console.error('Error fetching grade section schedule:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================================================
// UPDATE SCHEDULE
// ============================================================================
export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, dayOfWeek, startTime, endTime, classGrade, classSection } = req.body;

    // Find the schedule
    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // If subject is being changed, verify teacher teaches it
    if (subject && subject !== schedule.subject) {
      const teacher = await UserModel.findById(schedule.teacher);
      if (!teacher.subjects || !teacher.subjects.includes(subject)) {
        return res.status(400).json({ 
          message: `Teacher does not teach ${subject}` 
        });
      }
    }

    // Check for time conflicts if time is being changed
    if (dayOfWeek || startTime || endTime) {
      const newDay = dayOfWeek || schedule.dayOfWeek;
      const newStart = startTime || schedule.startTime;
      const newEnd = endTime || schedule.endTime;

      const conflict = await Schedule.findOne({
        _id: { $ne: id },
        teacher: schedule.teacher,
        dayOfWeek: newDay,
        $or: [
          { startTime: { $lt: newEnd }, endTime: { $gt: newStart } }
        ]
      });

      if (conflict) {
        return res.status(400).json({ 
          message: `Time conflict: Teacher already has a schedule on ${newDay} from ${conflict.startTime} to ${conflict.endTime}` 
        });
      }
    }

    // Update the schedule
    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      {
        subject: subject || schedule.subject,
        dayOfWeek: dayOfWeek || schedule.dayOfWeek,
        startTime: startTime || schedule.startTime,
        endTime: endTime || schedule.endTime,
        classGrade: classGrade || schedule.classGrade,
        classSection: classSection || schedule.classSection
      },
      { new: true }
    ).populate('teacher', 'name email subjects');

    res.status(200).json({
      message: 'Schedule updated successfully',
      schedule: updatedSchedule
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findByIdAndDelete(id);

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    res.status(200).json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ message: error.message });
  }
};

export const removeStudentFromSchedule = async (req, res) => {
  try {
    const { scheduleId, studentId } = req.params;

    const schedule = await Schedule.findById(scheduleId);

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    schedule.student = schedule.student.filter(
      id => id.toString() !== studentId
    );

    await schedule.save();

    res.status(200).json({ 
      message: 'Student removed from schedule successfully',
      schedule 
    });
  } catch (error) {
    console.error('Error removing student from schedule:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================================================
// SCHEDULE SETTINGS MANAGEMENT
// ============================================================================

// Get current schedule settings (time slots, session duration, etc.)
export const getScheduleSettings = async (req, res) => {
  try {
    const settings = await ScheduleSettings.getSettings();
    res.status(200).json({
      success: true,
      settings: {
        sessionsPerDay: settings.sessionsPerDay,
        sessionDuration: settings.sessionDuration,
        breakDuration: settings.breakDuration,
        breakAfterSession: settings.breakAfterSession,
        dayStartTime: settings.dayStartTime,
        timeSlots: settings.timeSlots,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('Error getting schedule settings:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update schedule settings (admin only)
export const updateScheduleSettings = async (req, res) => {
  try {
    const { 
      sessionsPerDay, 
      sessionDuration, 
      breakDuration, 
      breakAfterSession,
      dayStartTime 
    } = req.body;

    // Validation
    if (sessionsPerDay !== undefined && (sessionsPerDay < 1 || sessionsPerDay > 12)) {
      return res.status(400).json({ message: 'Sessions per day must be between 1 and 12' });
    }
    if (sessionDuration !== undefined && (sessionDuration < 20 || sessionDuration > 120)) {
      return res.status(400).json({ message: 'Session duration must be between 20 and 120 minutes' });
    }
    if (breakDuration !== undefined && (breakDuration < 5 || breakDuration > 60)) {
      return res.status(400).json({ message: 'Break duration must be between 5 and 60 minutes' });
    }
    if (breakAfterSession !== undefined && (breakAfterSession < 1 || breakAfterSession > 11)) {
      return res.status(400).json({ message: 'Break after session must be between 1 and 11' });
    }

    // Validate dayStartTime format
    if (dayStartTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(dayStartTime)) {
      return res.status(400).json({ message: 'Invalid start time format. Use HH:MM' });
    }

    let settings = await ScheduleSettings.findOne({ settingsId: 'default' });
    
    if (!settings) {
      settings = new ScheduleSettings({ settingsId: 'default' });
    }

    // Update only provided fields
    if (sessionsPerDay !== undefined) settings.sessionsPerDay = sessionsPerDay;
    if (sessionDuration !== undefined) settings.sessionDuration = sessionDuration;
    if (breakDuration !== undefined) settings.breakDuration = breakDuration;
    if (breakAfterSession !== undefined) settings.breakAfterSession = breakAfterSession;
    if (dayStartTime !== undefined) settings.dayStartTime = dayStartTime;
    
    // Set updatedBy if user is authenticated
    if (req.user) {
      settings.updatedBy = req.user._id;
    }

    await settings.save();

    // === Update ALL existing schedules with new time slots ===
    const sessionSlots = settings.timeSlots.filter(s => !s.isBreak);
    
    // Get all unique grade-section-day combinations
    const uniqueCombos = await Schedule.aggregate([
      { $group: { _id: { classGrade: '$classGrade', classSection: '$classSection', dayOfWeek: '$dayOfWeek' } } }
    ]);
    
    let updatedCount = 0;
    for (const combo of uniqueCombos) {
      const { classGrade, classSection, dayOfWeek } = combo._id;
      
      // Get all schedules for this combo, sorted by startTime
      const daySchedules = await Schedule.find({ classGrade, classSection, dayOfWeek }).sort({ startTime: 1 });
      
      // Reassign times based on session order
      for (let i = 0; i < daySchedules.length; i++) {
        if (i < sessionSlots.length) {
          daySchedules[i].startTime = sessionSlots[i].startTime;
          daySchedules[i].endTime = sessionSlots[i].endTime;
          await daySchedules[i].save();
          updatedCount++;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Schedule settings updated. ${updatedCount} existing schedule entries updated with new times.`,
      settings: {
        sessionsPerDay: settings.sessionsPerDay,
        sessionDuration: settings.sessionDuration,
        breakDuration: settings.breakDuration,
        breakAfterSession: settings.breakAfterSession,
        dayStartTime: settings.dayStartTime,
        timeSlots: settings.timeSlots,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating schedule settings:', error);
    res.status(500).json({ message: error.message });
  }
};

// Reset schedule settings to defaults
export const resetScheduleSettings = async (req, res) => {
  try {
    await ScheduleSettings.findOneAndDelete({ settingsId: 'default' });
    const settings = await ScheduleSettings.getSettings(); // Creates new with defaults
    
    res.status(200).json({
      success: true,
      message: 'Schedule settings reset to defaults',
      settings: {
        sessionsPerDay: settings.sessionsPerDay,
        sessionDuration: settings.sessionDuration,
        breakDuration: settings.breakDuration,
        breakAfterSession: settings.breakAfterSession,
        dayStartTime: settings.dayStartTime,
        timeSlots: settings.timeSlots
      }
    });
  } catch (error) {
    console.error('Error resetting schedule settings:', error);
    res.status(500).json({ message: error.message });
  }
};